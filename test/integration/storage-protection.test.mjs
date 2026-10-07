// @story #166
// cspell:words readback hardlink showtrustlevels trustlevel nonadministrator
import test from 'node:test';
import { constants } from 'node:fs';
import assert from 'node:assert/strict';
import path from 'node:path';
import {
  mkdtemp,
  realpath,
  rm,
  mkdir,
  rename,
  link,
  symlink,
  readFile,
  chmod,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { execFileSync } from 'node:child_process';
const storage = await import('../../src/broker/storage-protection.mjs').catch((error) => {
  if (
    error.code === 'ERR_MODULE_NOT_FOUND' &&
    error.url?.endsWith('/src/broker/storage-protection.mjs')
  )
    return {};
  throw error;
});
async function temporary(t) {
  const root = await realpath(await mkdtemp(path.join(tmpdir(), 'apr-storage-real-166-')));
  t.after(() => rm(root, { recursive: true, force: true }));
  return root;
}
test('[#166] actual stock-OS provision/readback supports exclusive protected create/read/replace/remove', async (t) => {
  const root = await temporary(t);
  const receipt = await storage.provisionProtectedRoot({ root });
  assert.equal(receipt.verified, true, JSON.stringify(receipt.reasons));
  const guard = await storage.openProtectedRoot({ receipt });
  t.after(() => guard.close());
  await guard.writeExclusive('owner.json', Buffer.from('first'));
  await assert.rejects(guard.writeExclusive('owner.json', Buffer.from('collision')));
  assert.equal((await guard.read('owner.json')).toString(), 'first');
  await assert.rejects(guard.replace('owner.json', Buffer.from('foreign'), Buffer.from('new')), {
    code: 'APR_BROKER_STALE',
  });
  await guard.replace('owner.json', Buffer.from('first'), Buffer.from('new'));
  assert.equal((await guard.read('owner.json')).toString(), 'new');
  await assert.rejects(guard.remove('owner.json', Buffer.from('foreign')), {
    code: 'APR_BROKER_STALE',
  });
  assert.equal((await guard.read('owner.json')).toString(), 'new');
  await guard.remove('owner.json', Buffer.from('new'));
  await assert.rejects(guard.read('owner.json'));
  await assert.rejects(guard.writeExclusive('../outside', Buffer.from('secret')), {
    code: 'APR_BROKER_PATH_INVALID',
  });
  await guard.close();
  await assert.rejects(guard.writeExclusive('after-close', Buffer.from('no')), {
    code: 'APR_BROKER_STALE',
  });
});
test('[#166] retained root identity refuses replacement before any file effect', async (t) => {
  const parent = await temporary(t),
    root = path.join(parent, 'private');
  const receipt = await storage.provisionProtectedRoot({ root });
  const guard = await storage.openProtectedRoot({ receipt });
  t.after(() => guard.close());
  await rename(root, path.join(parent, 'previous'));
  await mkdir(root, { mode: 0o700 });
  await assert.rejects(guard.writeExclusive('credential', Buffer.from('never written')), {
    code: 'APR_BROKER_STALE',
  });
  await assert.rejects(readFile(path.join(root, 'credential')), { code: 'ENOENT' });
});
test('[#166] live hardlink/symlink substitution refuses protected reads and removal', async (t) => {
  const parent = await temporary(t),
    root = path.join(parent, 'private');
  const receipt = await storage.provisionProtectedRoot({ root });
  const guard = await storage.openProtectedRoot({ receipt });
  t.after(() => guard.close());
  await guard.writeExclusive('owner.json', Buffer.from('retained'));
  await link(path.join(root, 'owner.json'), path.join(parent, 'second-link'));
  await assert.rejects(guard.read('owner.json'), { code: 'APR_BROKER_STALE' });
  await assert.rejects(guard.remove('owner.json', Buffer.from('retained')), {
    code: 'APR_BROKER_STALE',
  });
  await rm(path.join(parent, 'second-link'));
  await rm(path.join(root, 'owner.json'));
  await symlink(path.join(parent, 'outside'), path.join(root, 'owner.json'));
  await assert.rejects(guard.read('owner.json'), { code: 'APR_BROKER_STALE' });
});
test(
  '[#166] actual POSIX permission change fences already-held effects',
  { skip: process.platform === 'win32' },
  async (t) => {
    const root = await temporary(t);
    const receipt = await storage.provisionProtectedRoot({ root });
    const guard = await storage.openProtectedRoot({ receipt });
    t.after(() => guard.close());
    await chmod(root, 0o755);
    await assert.rejects(guard.writeExclusive('credential', Buffer.from('must stay private')), {
      code: 'APR_BROKER_STALE',
    });
    await assert.rejects(readFile(path.join(root, 'credential')), { code: 'ENOENT' });
  }
);
test(
  '[#166] actual macOS foreign ACL grant defeats0700 and restored protection rereads',
  { skip: process.platform !== 'darwin' },
  async (t) => {
    const root = await temporary(t);
    const receipt = await storage.provisionProtectedRoot({ root });
    const guard = await storage.openProtectedRoot({ receipt });
    t.after(() => guard.close());
    execFileSync('/bin/chmod', ['+a', 'everyone allow read,list,search', root]);
    try {
      assert.equal((await storage.observeStorageProtection({ root })).verified, false);
      await assert.rejects(guard.writeExclusive('credential', Buffer.from('secret')), {
        code: 'APR_BROKER_STALE',
      });
    } finally {
      execFileSync('/bin/chmod', ['-N', root]);
    }
    assert.equal((await storage.observeStorageProtection({ root })).verified, true);
  }
);

test(
  '[#166] provisioning refuses writable ancestry before changing existing private-root protection',
  { skip: process.platform === 'win32' },
  async (t) => {
    const parent = await temporary(t),
      unsafe = path.join(parent, 'unsafe'),
      root = path.join(unsafe, 'private');
    await mkdir(unsafe, { mode: 0o777 });
    await chmod(unsafe, 0o777);
    await mkdir(root, { mode: 0o755 });
    await chmod(root, 0o755);
    await assert.rejects(storage.provisionProtectedRoot({ root }), {
      code: 'APR_BROKER_START_FAILED',
    });
    const { stat } = await import('node:fs/promises');
    assert.equal(
      (await stat(root)).mode & 0o777,
      0o755,
      'refused setup must not have modified the leaf'
    );
  }
);

test('[#166] aborted protection effects never create a file or start a fresh budget', async (t) => {
  const root = await temporary(t),
    controller = new AbortController();
  const receipt = await storage.provisionProtectedRoot({ root });
  const guard = await storage.openProtectedRoot({ receipt, signal: controller.signal });
  t.after(() => guard.close());
  controller.abort();
  await assert.rejects(guard.writeExclusive('credential', Buffer.from('never written')), {
    code: 'APR_BROKER_STALE',
  });
  await assert.rejects(readFile(path.join(root, 'credential')), { code: 'ENOENT' });
});

// cspell:words DACL SID runas
async function alterWindowsDescriptor(target, action) {
  const script = String.raw`
$ErrorActionPreference='Stop'
$p=[Console]::In.ReadToEnd()|ConvertFrom-Json
$a=Get-Acl -LiteralPath $p.path -ErrorAction Stop
if($p.action -eq 'foreign-read') {
  $r=[System.Security.AccessControl.FileSystemAccessRule]::new(
    [System.Security.Principal.SecurityIdentifier]::new('S-1-1-0'),
    [System.Security.AccessControl.FileSystemRights]::ReadAndExecute,
    [System.Security.AccessControl.InheritanceFlags]'ContainerInherit,ObjectInherit',
    [System.Security.AccessControl.PropagationFlags]::None,
    [System.Security.AccessControl.AccessControlType]::Allow)
  $a.AddAccessRule($r)
} elseif($p.action -eq 'administrator-owner') {
  $a.SetOwner([System.Security.Principal.SecurityIdentifier]::new('S-1-5-32-544'))
} else {throw 'Unknown owned-test action'}
Set-Acl -LiteralPath $p.path -AclObject $a -ErrorAction Stop
`;
  execFileSync(
    'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe',
    [
      '-NoLogo',
      '-NoProfile',
      '-NonInteractive',
      '-EncodedCommand',
      Buffer.from(script, 'utf16le').toString('base64'),
    ],
    {
      input: JSON.stringify({ path: target, action }),
      encoding: 'utf8',
      timeout: 15000,
      env: {
        ...process.env,
        PSModulePath: 'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\Modules',
      },
    }
  );
}
test(
  '[#166] actual Windows foreign explicit and inherited ACE controls fail closed and restore',
  { skip: process.platform !== 'win32' },
  async (t) => {
    const root = await temporary(t),
      receipt = await storage.provisionProtectedRoot({ root });
    const guard = await storage.openProtectedRoot({ receipt });
    t.after(() => guard.close());
    await alterWindowsDescriptor(root, 'foreign-read');
    try {
      assert.equal((await storage.observeStorageProtection({ root })).verified, false);
      await assert.rejects(guard.writeExclusive('credential', Buffer.from('must remain absent')), {
        code: 'APR_BROKER_STALE',
      });
      const child = path.join(root, 'inherited');
      await mkdir(child);
      assert.equal((await storage.observeStorageProtection({ root: child })).verified, false);
      const restored = await storage.provisionProtectedRoot({ root: child });
      assert.equal(restored.verified, true, JSON.stringify(restored.reasons));
    } finally {
      await storage.provisionProtectedRoot({ root });
    }
    assert.equal((await storage.observeStorageProtection({ root })).verified, true);
  }
);
test(
  '[#166] actual elevated Windows Administrators ownership retains verified user membership and effective rights',
  { skip: process.platform !== 'win32' },
  async (t) => {
    const root = await temporary(t),
      receipt = await storage.provisionProtectedRoot({ root });
    assert.equal(
      receipt.acl.administratorEffective,
      true,
      'real elevated token is required for this advertised control'
    );
    await alterWindowsDescriptor(root, 'administrator-owner');
    try {
      const observed = await storage.observeStorageProtection({ root });
      assert.equal(observed.verified, true, JSON.stringify(observed.reasons));
      assert.equal(observed.acl.ownerSid, 'S-1-5-32-544');
      assert.equal(observed.acl.administratorMember, true);
      const guard = await storage.openProtectedRoot({ receipt: observed });
      t.after(() => guard.close());
      await guard.writeExclusive('owner.json', Buffer.from('owned elevated control'));
      assert.equal((await guard.read('owner.json')).toString(), 'owned elevated control');
    } finally {
      await storage.provisionProtectedRoot({ root });
    }
  }
);
test(
  '[#166] actual Windows restricted basic-user process creates and verifies private storage without administrator role',
  { skip: process.platform !== 'win32' },
  async (t) => {
    const root = await temporary(t);
    await storage.provisionProtectedRoot({ root });
    const { writeFile } = await import('node:fs/promises');
    const { randomUUID } = await import('node:crypto');
    const { setTimeout: delay } = await import('node:timers/promises');
    const nonce = randomUUID(),
      script = path.join(root, 'basic-control.mjs'),
      output = path.join(root, 'basic-result.json');
    const sourceUrl = new URL('../../src/broker/storage-protection.mjs', import.meta.url).href;
    const program =
      "import{writeFileSync}from'node:fs';import{provisionProtectedRoot,openProtectedRoot}from " +
      JSON.stringify(sourceUrl) +
      ";const[root,output,nonce]=process.argv.slice(2);try{const receipt=await provisionProtectedRoot({root});const guard=await openProtectedRoot({receipt});await guard.writeExclusive('control.json',Buffer.from('actual basic token'));const bytes=await guard.read('control.json');await guard.close();writeFileSync(output,JSON.stringify({nonce,pid:process.pid,verified:receipt.verified,administratorEffective:receipt.acl.administratorEffective,principal:receipt.principal,control:bytes.toString()}));}catch(error){writeFileSync(output,JSON.stringify({nonce,pid:process.pid,error:{code:error.code,reason:error.details?.reason}}));process.exitCode=1;}";
    await writeFile(script, program);
    const quote = (value) =>
      '"' +
      value
        .replace(/(\\*)"/g, (_, slashes) => slashes + slashes + '\\"')
        .replace(/(\\+)$/g, '$1$1') +
      '"';
    const command = [process.execPath, script, path.join(root, 'basic-private'), output, nonce]
      .map(quote)
      .join(' ');
    const available = execFileSync('C:\\Windows\\System32\\runas.exe', ['/showtrustlevels'], {
      encoding: 'utf8',
      timeout: 15000,
    });
    assert.match(available, /0x20000/, 'stock basic-user trust level must be available');
    execFileSync('C:\\Windows\\System32\\runas.exe', ['/trustlevel:0x20000', command], {
      encoding: 'utf8',
      timeout: 15000,
    });
    let result;
    const stop = Date.now() + 30000;
    while (Date.now() < stop) {
      try {
        result = JSON.parse(await readFile(output, 'utf8'));
        break;
      } catch (error) {
        if (error.code !== 'ENOENT' && !(error instanceof SyntaxError)) throw error;
      }
      await delay(100);
    }
    assert.ok(result, 'missing real child receipt is inconclusive, never a passed control');
    assert.equal(result.nonce, nonce);
    assert.equal(result.error, undefined, JSON.stringify(result.error));
    assert.equal(result.verified, true);
    assert.equal(
      result.administratorEffective,
      false,
      'the actual stock probe must prove a nonadministrator token'
    );
    assert.equal(result.control, 'actual basic token');
  }
);

async function interceptFilesystem(t, name, implementation) {
  const fs = (await import('node:fs/promises')).default;
  const { syncBuiltinESMExports } = await import('node:module');
  const original = fs[name];
  const mock = t.mock.method(fs, name, (...args) => implementation(original, ...args));
  syncBuiltinESMExports();
  t.after(() => {
    mock.mock.restore();
    syncBuiltinESMExports();
  });
}
for (const operation of ['remove', 'replace']) {
  for (const generation of ['substituted', 'updated']) {
    test(
      '[#166] ' +
        operation +
        ' retains the generation supplying expected bytes after it is ' +
        generation,
      async (t) => {
        const root = await temporary(t),
          target = path.join(root, 'owner.json');
        const receipt = await storage.provisionProtectedRoot({ root });
        const guard = await storage.openProtectedRoot({ receipt });
        t.after(() => guard.close());
        await guard.writeExclusive('owner.json', Buffer.from('first'));
        let reads = 0,
          changed = false;
        const { writeFileSync, renameSync } = await import('node:fs');
        await interceptFilesystem(t, 'lstat', async (original, value, options) => {
          if (value === target) reads++;
          if (value === root && reads >= 2 && !changed) {
            changed = true;
            if (generation === 'substituted') {
              const incoming = path.join(root, 'incoming');
              writeFileSync(incoming, 'newer-generation', { mode: 0o600 });
              renameSync(incoming, target);
            } else writeFileSync(target, 'newer-generation');
          }
          return original(value, options);
        });
        await assert.rejects(
          operation === 'remove'
            ? guard.remove('owner.json', Buffer.from('first'))
            : guard.replace('owner.json', Buffer.from('first'), Buffer.from('replacement')),
          { code: 'APR_BROKER_STALE' }
        );
        assert.equal(
          changed,
          true,
          'real filesystem generation changed at the read/effect boundary'
        );
        assert.equal(await readFile(target, 'utf8'), 'newer-generation');
      }
    );
  }
}
test('[#166] failed publication reports the exact outstanding private temporary generation without secret bytes', async (t) => {
  const root = await temporary(t),
    receipt = await storage.provisionProtectedRoot({ root });
  const guard = await storage.openProtectedRoot({ receipt });
  t.after(() => guard.close());
  await guard.writeExclusive('owner.json', Buffer.from('first'));
  await interceptFilesystem(t, 'rename', async () => {
    throw Object.assign(new Error('controlled rename failure'), { code: 'EIO' });
  });
  let caught;
  try {
    await guard.replace(
      'owner.json',
      Buffer.from('first'),
      Buffer.from('private-unpublished-secret')
    );
  } catch (error) {
    caught = error;
  }
  assert.ok(caught);
  assert.equal(await readFile(path.join(root, 'owner.json'), 'utf8'), 'first');
  const obligation = caught.details?.obligations?.find((x) => x.name.startsWith('publish-'));
  assert.ok(obligation, 'failure must retain the identity of its created temporary');
  const { lstat } = await import('node:fs/promises');
  const stat = await lstat(path.join(root, obligation.name), { bigint: true });
  assert.equal(obligation.identity, [stat.dev, stat.ino].map(String).join(':'));
  assert.equal(obligation.outcome, 'unpublished');
  assert.equal(JSON.stringify(caught).includes('private-unpublished-secret'), false);
});
test('[#166] abort after file creation reports an exact owned cleanup obligation', async (t) => {
  const root = await temporary(t),
    receipt = await storage.provisionProtectedRoot({ root });
  const controller = new AbortController();
  const guard = await storage.openProtectedRoot({ receipt, signal: controller.signal });
  t.after(() => guard.close());
  await interceptFilesystem(t, 'open', async (original, value, ...options) => {
    const handle = await original(value, ...options);
    if (value === path.join(root, 'credential') && Number(options[0]) & constants.O_CREAT) {
      const write = handle.writeFile.bind(handle);
      handle.writeFile = async (...args) => {
        await write(...args);
        controller.abort();
      };
    }
    return handle;
  });
  let caught;
  try {
    await guard.writeExclusive('credential', Buffer.from('unpublished-secret'));
  } catch (error) {
    caught = error;
  }
  assert.equal(caught?.code, 'APR_BROKER_STALE');
  assert.ok(caught.details?.obligations?.some((x) => x.name === 'credential' && x.identity));
  assert.equal(JSON.stringify(caught).includes('unpublished-secret'), false);
});
test('[#166] a retained mutation lease refuses a concurrent guarded removal across guard instances', async (t) => {
  const root = await temporary(t),
    receipt = await storage.provisionProtectedRoot({ root });
  const first = await storage.openProtectedRoot({ receipt }),
    second = await storage.openProtectedRoot({ receipt });
  t.after(async () => {
    await first.close();
    await second.close();
  });
  await first.writeExclusive('owner.json', Buffer.from('retained'));
  let entered, release;
  const ready = new Promise((resolve) => (entered = resolve)),
    barrier = new Promise((resolve) => (release = resolve));
  await interceptFilesystem(t, 'open', async (original, value, ...options) => {
    const handle = await original(value, ...options);
    if (value === path.join(root, 'lease.json') && Number(options[0]) & constants.O_CREAT) {
      const write = handle.writeFile.bind(handle);
      handle.writeFile = async (...args) => {
        entered();
        await barrier;
        return write(...args);
      };
    }
    return handle;
  });
  const pending = first.writeExclusive('lease.json', Buffer.from('held'));
  await ready;
  try {
    await assert.rejects(second.remove('owner.json', Buffer.from('retained')), {
      code: 'APR_BROKER_STALE',
    });
    assert.equal(await readFile(path.join(root, 'owner.json'), 'utf8'), 'retained');
  } finally {
    release();
    await pending;
  }
});

test(
  '[#166] Windows stock probe ignores inherited module discovery paths',
  { skip: process.platform !== 'win32' },
  async (t) => {
    const root = await temporary(t),
      previous = process.env.PSModulePath;
    try {
      process.env.PSModulePath = path.join(root, 'untrusted-modules');
      const receipt = await storage.provisionProtectedRoot({ root });
      assert.equal(receipt.verified, true, JSON.stringify(receipt.reasons));
      const guard = await storage.openProtectedRoot({ receipt });
      t.after(() => guard.close());
      await guard.writeExclusive('control.json', Buffer.from('fixed stock module discovery'));
      assert.equal((await guard.read('control.json')).toString(), 'fixed stock module discovery');
    } finally {
      if (previous === undefined) delete process.env.PSModulePath;
      else process.env.PSModulePath = previous;
    }
  }
);
