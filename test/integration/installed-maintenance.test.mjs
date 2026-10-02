// @story #137
import assert from 'node:assert/strict';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { actualInstalledAuthority } from '../helpers/actual-installed-authority.mjs';

test('installed Git observations and transactions ignore foreign Git redirects', (t) => {
  const f = actualInstalledAuthority(t);
  writeFileSync(path.join(f.root, 'docs/artifact.md'), '# Foreign primary edit\n');
  writeFileSync(path.join(f.linked, 'docs/artifact.md'), '# Assigned edit\n');
  const index = path.join(f.root, '.git/index');
  const before = readFileSync(index);
  const head = f.git('rev-parse', 'HEAD');
  const result = f.execute(
    'import {createGitRepository} from ' +
      f.module('src/git/repository.mjs') +
      ';' +
      'import {createGitTransactionRepository} from ' +
      f.module('src/git/transaction.mjs') +
      ';' +
      'import {withOperationAuthority,performCurrentOperationEffect} from ' +
      f.module('src/startup/authority-fence.mjs') +
      ';' +
      'await withOperationAuthority({operation:"start",cwd:process.cwd()},async()=>{' +
      'const observed=createGitRepository().root(process.cwd());' +
      'const tx=createGitTransactionRepository(process.cwd());' +
      'performCurrentOperationEffect(()=>tx.addPaths(["docs/artifact.md"]));' +
      'console.log(JSON.stringify({observed,transaction:tx.root}));});',
    {
      cwd: f.linked,
      extraEnv: {
        GIT_DIR: path.join(f.root, '.git'),
        GIT_WORK_TREE: f.root,
        GIT_INDEX_FILE: index,
      },
    }
  );
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(JSON.parse(result.stdout), { observed: f.linked, transaction: f.linked });
  assert.deepEqual(readFileSync(index), before);
  assert.equal(f.git('rev-parse', 'HEAD'), head);
});

test('nested installed operation cannot switch physical worktrees', (t) => {
  const f = actualInstalledAuthority(t);
  const journal = path.join(f.root, '.scratch/peer-review/redirected/events.jsonl');
  const result = f.execute(
    'import {mkdirSync,writeFileSync} from "node:fs"; import path from "node:path";' +
      'import {withOperationAuthority,performOperationEffect} from ' +
      f.module('src/startup/authority-fence.mjs') +
      '; let code=null; try {' +
      'await withOperationAuthority({operation:"start",cwd:process.cwd()},()=> ' +
      'withOperationAuthority({operation:"start",cwd:' +
      JSON.stringify(f.root) +
      '},fence=>' +
      'performOperationEffect(fence,()=>{const file=' +
      JSON.stringify(journal) +
      ';' +
      'mkdirSync(path.dirname(file),{recursive:true});writeFileSync(file,"unauthorized");})));' +
      '}catch(error){code=error.code;}console.log(JSON.stringify({code}));',
    { cwd: f.linked }
  );
  assert.equal(result.status, 0, result.stderr);
  assert.equal(JSON.parse(result.stdout).code, 'APR_OPERATION_AUTHORITY_UNAVAILABLE');
  assert.equal(existsSync(journal), false);
});

test('primary maintenance preserves multiple complete installed runtime images', (t) => {
  const f = actualInstalledAuthority(t);
  const result = f.execute(
    'import {pinRuntimeImage} from ' +
      f.module('src/broker/runtime-image.mjs') +
      ';' +
      'import {inspectPrimaryReviewInventory} from ' +
      f.module('src/config/primary-inventory.mjs') +
      ';' +
      'import {existsSync,readFileSync} from "node:fs";import path from "node:path";' +
      'const base=path.join(process.cwd(),".scratch/peer-review/runtimes");' +
      'const images=[1,2].map(n=>pinRuntimeImage({packageRoot:' +
      JSON.stringify(f.installed) +
      ',nodeExecutable:process.execPath,destination:path.join(base,"image-"+n)}));' +
      'const before=images.map(image=>readFileSync(image.nodeExecutable));' +
      'inspectPrimaryReviewInventory(path.join(process.cwd(),".git"),process.cwd());' +
      'if(images.some((image,index)=>!existsSync(image.nodeExecutable)||!readFileSync(image.nodeExecutable).equals(before[index])))throw Error("image evidence changed");' +
      'console.log("preserved");'
  );
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout.trim(), 'preserved');
  const activated = f.cli(['primary', 'activate', '--json']);
  assert.equal(activated.status, 0, activated.stderr);
});

for (const provider of ['codex', 'claude']) {
  test('primary maintenance retains real installed ' + provider + ' hook observations', (t) => {
    const f = actualInstalledAuthority(t);
    const input = {
      event: {
        hook_event_name: 'PreToolUse',
        tool_name: 'Bash',
        cwd: f.root,
        model: 'test-model',
        session_id:
          provider === 'claude' ? '12345678-1234-1234-1234-123456789abc' : 'codex-session',
        turn_id: 'turn-1',
        tool_use_id: 'tool-1',
        tool_input: { command: 'peer-review start docs/artifact.md' },
      },
      sourceVersion: '1.0.0',
      token: 'a'.repeat(32),
    };
    if (provider === 'claude') {
      const transcript = path.join(f.directory, input.event.session_id + '.jsonl');
      input.event.transcript_path = transcript;
      writeFileSync(
        transcript,
        JSON.stringify({
          type: 'assistant',
          sessionId: input.event.session_id,
          version: input.sourceVersion,
          timestamp: new Date().toISOString(),
          message: {
            model: 'test-model',
            content: [
              { type: 'tool_use', id: 'tool-1', name: 'Bash', input: input.event.tool_input },
            ],
          },
        }) + '\n',
        { mode: 0o600 }
      );
    }
    const capture = provider === 'codex' ? 'captureCodexStartHook' : 'captureClaudeStartHook';
    const result = f.execute(
      'import {' +
        capture +
        '} from ' +
        f.module('src/providers/' + provider + '-hook.mjs') +
        '; await ' +
        capture +
        '(' +
        JSON.stringify(input) +
        ');console.log("captured");'
    );
    assert.equal(result.status, 0, result.stderr);
    const record = path.join(
      f.root,
      '.scratch/peer-review/' + provider + '-hooks',
      input.token + '.json'
    );
    const before = readFileSync(record);
    const activation = f.cli(['primary', 'activate', '--json']);
    assert.equal(activation.status, 0, activation.stderr);
    assert.deepEqual(readFileSync(record), before);
    writeFileSync(record, '{}\n', { mode: 0o600 });
    const malformed = f.cli(['primary', 'activate', '--json']);
    assert.equal(malformed.status, 1);
    assert.match(malformed.stderr, /APR_PRIMARY_AUTHORITY_UNAVAILABLE/);
  });
}

for (const scenario of ['dirty primary', 'policy changed during registration load']) {
  test('standalone installed broker has no ownership effects with ' + scenario, (t) => {
    const f = actualInstalledAuthority(t);
    const setup = f.execute(
      'import {mkdirSync,writeFileSync,readFileSync} from "node:fs";import path from "node:path";' +
        'import {platformSecurity} from ' +
        f.module('src/broker/platform.mjs') +
        ';' +
        'import {canonicalProjectIdentity} from ' +
        f.module('src/broker/identity.mjs') +
        ';' +
        'import {createGitRepository} from ' +
        f.module('src/git/repository.mjs') +
        ';' +
        'import {pinRuntimeImage} from ' +
        f.module('src/broker/runtime-image.mjs') +
        ';' +
        'import {bootstrapRecord} from ' +
        f.module('src/broker/client.mjs') +
        ';' +
        'import {brokerPaths} from ' +
        f.module('src/broker/paths.mjs') +
        ';' +
        'const platform={...platformSecurity({root:' +
        JSON.stringify(f.installed) +
        '}),repository:createGitRepository()};' +
        'const project=canonicalProjectIdentity({cwd:process.cwd(),platform});' +
        'const runtimeImage=pinRuntimeImage({packageRoot:' +
        JSON.stringify(f.installed) +
        ',nodeExecutable:process.execPath,destination:' +
        JSON.stringify(path.join(f.directory, 'broker image')) +
        '});' +
        'const versions={broker_protocol_version:1,node_major:Number(process.versions.node.split(".")[0]),' +
        'package_version:JSON.parse(readFileSync(' +
        JSON.stringify(path.join(f.installed, 'package.json')) +
        ')).version};' +
        'const directory=path.join(process.cwd(),".scratch/peer-review/broker");' +
        'mkdirSync(path.join(directory,"registrations"),{recursive:true,mode:448});' +
        'const bootstrap=path.join(directory,"bootstrap-a1.json");' +
        'writeFileSync(bootstrap,JSON.stringify(bootstrapRecord({project,versions,runtimeImage})),{mode:384});' +
        'const paths=brokerPaths({identity:project,platform,env:process.env,home:process.env.HOME});' +
        'console.log(JSON.stringify({bootstrap,paths}));'
    );
    assert.equal(setup.status, 0, setup.stderr);
    const { bootstrap, paths } = JSON.parse(setup.stdout);
    const policy = path.join(f.root, '.ai-peer-review/config.json');
    let race = '';
    if (scenario === 'dirty primary') writeFileSync(policy, readFileSync(policy, 'utf8') + ' ');
    else
      race =
        'import fs from "node:fs";import {syncBuiltinESMExports} from "node:module";' +
        'const original=fs.readdirSync;fs.readdirSync=(file,...args)=>{' +
        'const result=original(file,...args);if(file===' +
        JSON.stringify(path.join(f.root, '.scratch/peer-review/broker/registrations')) +
        '){fs.readdirSync=original;syncBuiltinESMExports();queueMicrotask(()=>fs.writeFileSync(' +
        JSON.stringify(policy) +
        ',fs.readFileSync(' +
        JSON.stringify(policy) +
        ',"utf8")+" "));}return result;};syncBuiltinESMExports();';
    const result = f.execute(
      race +
        'const {runBrokerEntrypoint}=await import(' +
        f.module('bin/peer-review-broker.mjs') +
        ');let code=null;try{await runBrokerEntrypoint(' +
        JSON.stringify(bootstrap) +
        ');}catch(error){code=error.code;}console.log(JSON.stringify({code}));'
    );
    assert.equal(result.status, 0, result.stderr);
    for (const file of [
      ...paths.authorityDirectories,
      ...paths.endpointDirectories,
      paths.endpoint,
      paths.lock,
      paths.metadata,
    ])
      assert.equal(existsSync(file), false, 'ownership effect: ' + file);
    assert.equal(JSON.parse(result.stdout).code, 'APR_PRIMARY_AUTHORITY_UNAVAILABLE');
  });
}
