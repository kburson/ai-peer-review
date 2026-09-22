// cspell:words nodedir DACL pwsh LiteralPath AccessRuleProtection
import assert from 'node:assert/strict';
import { execFile, execFileSync, spawn } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  renameSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { promisify } from 'node:util';
import { once } from 'node:events';
import { protectWindowsRuntime } from '../helpers/windows-offline.mjs';
import { parseNpmPackOutput, runNpm } from '../helpers/npm-command.mjs';
import { fixtureStartupDeps, loadLegacyAuthority } from '../helpers/internal-api.mjs';
import { identity, NOW } from '../helpers/intervention-fixture.mjs';

const root = fileURLToPath(new URL('../..', import.meta.url));

async function verifyWindowsBootstrapSecurity(scratch, platform, readBootstrap) {
  const projectRoot = path.join(scratch, 'bootstrap-security');
  const parent = path.join(projectRoot, '.scratch/peer-review');
  mkdirSync(parent, { recursive: true });
  const directoryRoot = path.join(parent, 'broker');
  const directory = platform.openPrivateDirectory(directoryRoot);
  const record = {
    schema: 'ai-peer-review.broker-bootstrap/v1',
    project: {
      digest: 'a'.repeat(64),
      physicalRoot: projectRoot,
      tuple: ['ai-peer-review.broker-root/v1', projectRoot, null, platform.userId()],
    },
    versions: {
      package_version: '0.3.0',
      broker_protocol_version: 1,
      node_major: Number(process.versions.node.split('.')[0]),
    },
    runtimeImage: {
      root: path.join(scratch, 'image'),
      nodeExecutable: process.execPath,
      digest: `sha256:${'b'.repeat(64)}`,
    },
  };
  const file = path.join(directoryRoot, 'bootstrap-a1.json');
  try {
    directory.create(path.basename(file), JSON.stringify(record));
  } finally {
    directory.close();
  }
  assert.deepEqual(readBootstrap(file), record);
  const holderScript = path.join(scratch, 'hold-discovery.ps1');
  writeFileSync(
    holderScript,
    `param([string]$Target)
$stream = [System.IO.File]::Open($Target, 'Open', 'Read', 'None')
try { [Console]::Out.WriteLine('held'); [Console]::Out.Flush(); [Console]::ReadLine() | Out-Null }
finally { $stream.Dispose() }
`
  );
  const holder = spawn('pwsh', ['-NoProfile', '-File', holderScript, '-Target', file], {
    stdio: ['pipe', 'pipe', 'pipe'],
  });
  const exited = once(holder, 'close');
  try {
    const [ready] = await Promise.race([
      once(holder.stdout, 'data'),
      exited.then(() => {
        throw new Error('Exclusive file holder exited before readiness');
      }),
    ]);
    assert.match(ready.toString(), /held/);
    const heldDirectory = platform.openPrivateDirectory(directoryRoot);
    try {
      assert.throws(() => heldDirectory.read(path.basename(file)), { code: 'EBUSY' });
    } finally {
      heldDirectory.close();
    }
  } finally {
    holder.stdin.end('\n');
    await exited;
  }
  assert.deepEqual(readBootstrap(file), record);
  const link = path.join(directoryRoot, 'bootstrap-a2.json');
  symlinkSync(file, link, 'file');
  assert.throws(() => readBootstrap(link), { code: 'APR_BROKER_START_FAILED' });
  const reopened = platform.openPrivateDirectory(directoryRoot);
  try {
    assert.throws(() => reopened.read(path.basename(link)), { code: 'APR_BROKER_STALE' });
  } finally {
    reopened.close();
  }
  // The same safe regular file becomes untrusted when its DACL inherits.
  const script = path.join(scratch, 'weaken-fixture-acl.ps1');
  writeFileSync(
    script,
    'param([string]$Target)\n$acl = Get-Acl -LiteralPath $Target\n$acl.SetAccessRuleProtection($false, $true)\nSet-Acl -LiteralPath $Target -AclObject $acl\n'
  );
  execFileSync('pwsh', ['-NoProfile', '-File', script, '-Target', file], { stdio: 'pipe' });
  assert.throws(() => readBootstrap(file), { code: 'APR_BROKER_STALE' });
}

function projectFixture(scratch) {
  const projectRoot = mkdtempSync(path.join(scratch, 'project-'));
  const git = (...args) => execFileSync('git', args, { cwd: projectRoot, stdio: 'pipe' });
  git('init', '-b', 'trunk');
  git('config', 'user.email', 'test@example.invalid');
  git('config', 'user.name', 'Test');
  mkdirSync(path.join(projectRoot, 'docs'));
  writeFileSync(path.join(projectRoot, 'docs/artifact.md'), '# Artifact\n');
  writeFileSync(path.join(projectRoot, '.git/info/exclude'), '.scratch/peer-review/\n');
  git('add', 'docs/artifact.md');
  git('commit', '-m', 'fixture');
  return { root: projectRoot, cleanup() {} };
}

test('installed release preserves legacy recovery, isolated brokers and pinned runtime closure', async (t) => {
  if (!process.env.APR_RELEASE_TEST_ROOT) {
    mkdirSync(path.join(root, '.scratch/test'), { recursive: true });
    const scratch = realpathSync(mkdtempSync(path.join(root, '.scratch/test/apr-release-')));
    t.after(() =>
      rmSync(scratch, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 })
    );
    // A process cannot delete its own loaded native addon on Windows. Keep
    // installation and all native imports in a child that exits before cleanup.
    const env = { ...process.env, APR_RELEASE_TEST_ROOT: scratch };
    delete env.NODE_TEST_CONTEXT;
    try {
      const result = await promisify(execFile)(
        process.execPath,
        ['--test', fileURLToPath(import.meta.url)],
        {
          cwd: root,
          env,
          timeout: 180_000,
          maxBuffer: 4 * 1024 * 1024,
        }
      );
      t.diagnostic(result.stdout);
    } catch (error) {
      t.diagnostic(error.stdout ?? 'Installed child produced no test output.');
      t.diagnostic(error.stderr ?? '');
      throw error;
    }
    return;
  }
  const scratch = realpathSync(process.env.APR_RELEASE_TEST_ROOT);
  const live = [];
  const projects = [];
  const children = [];
  let stopBrokers = async () => {};
  t.after(async () => {
    try {
      await stopBrokers();
      for (const child of children) {
        let timer;
        try {
          await Promise.race([
            child.exited,
            new Promise((_, reject) => {
              timer = setTimeout(
                () => reject(new Error('Owned test broker did not exit after stop.')),
                10_000
              );
            }),
          ]);
        } finally {
          clearTimeout(timer);
        }
      }
    } finally {
      for (const child of children) {
        if (child.process.exitCode === null && child.process.signalCode === null)
          child.process.kill();
      }
      await Promise.all(children.map((child) => child.exited));
      for (const project of projects) project.cleanup();
    }
  });
  const host = path.join(scratch, 'host');
  mkdirSync(host);
  writeFileSync(path.join(host, 'package.json'), '{"private":true}\n');
  const packed = parseNpmPackOutput(
    runNpm('npm', ['pack', '--ignore-scripts', '--json', '--pack-destination', scratch], {
      cwd: root,
      encoding: 'utf8',
    }),
    { expectedPackageName: '@kburson/ai-peer-review', requireFilename: true }
  );
  runNpm(
    'npm',
    [
      'install',
      '--offline',
      '--omit=dev',
      '--ignore-scripts',
      '--no-audit',
      '--no-fund',
      path.join(scratch, packed.filename),
    ],
    { cwd: host, stdio: 'pipe' }
  );
  const installed = path.join(host, 'node_modules/@kburson/ai-peer-review');
  const manifest = JSON.parse(readFileSync(path.join(installed, 'package.json')));
  assert.equal(manifest.version, '0.3.0');
  assert.equal(existsSync(path.join(host, 'node_modules/eslint')), false);
  const load = (file) => import(pathToFileURL(path.join(installed, file)));
  const api = await load('src/cli/run.mjs');
  const protocol = await load('src/protocol/service.mjs');
  const securityApi = await load('src/broker/platform.mjs');
  const clientApi = await load('src/broker/client.mjs');
  const { canonicalProjectIdentity } = await load('src/broker/identity.mjs');
  const { createGitRepository } = await load('src/git/repository.mjs');
  const { brokerPaths } = await load('src/broker/paths.mjs');
  const { connectBroker } = await load('src/broker/ipc.mjs');
  const { pinRuntimeImage, verifyRuntimeImage } = await load('src/broker/runtime-image.mjs');
  const publicApi = await load('src/public-api.mjs');
  assert.ok(!Object.keys(publicApi).some((key) => /coordinator|broker/i.test(key)));
  const help = execFileSync(
    process.execPath,
    [path.join(installed, 'bin/peer-review.mjs'), 'help', '--all'],
    { encoding: 'utf8' }
  );
  assert.doesNotMatch(help, /peer-review coordinator/);
  projects.push(projectFixture(scratch), projectFixture(scratch));
  const legacy = await loadLegacyAuthority({
    cwd: projects[0].root,
    identity: identity('author', 'legacy-release'),
    reviewId: 'legacy-release',
    now: NOW,
  });
  const recovered = await api.resumeReview(legacy.paths.workspace);
  assert.ok(recovered);
  assert.equal(securityApi.inspectPlatformSecurity().healthy, false);
  assert.throws(() => securityApi.platformSecurity(), { code: 'APR_BROKER_START_FAILED' });

  const developmentRoot = [
    process.env.APR_NODEDIR_BASE && path.join(process.env.APR_NODEDIR_BASE, process.versions.node),
    path.dirname(process.execPath),
    path.dirname(path.dirname(process.execPath)),
  ].find((candidate) => candidate && existsSync(path.join(candidate, 'include/node/node_api.h')));
  assert.ok(
    developmentRoot,
    'provision matching full Node development files before the offline test'
  );
  const reported = securityApi.inspectPlatformSecurity().build_command;
  assert.equal(
    reported,
    `npm --prefix '${installed}' run build:broker-security -- --nodedir /absolute/local/node-development-tree`
  );
  runNpm(
    'npm',
    ['--prefix', installed, 'run', 'build:broker-security', '--', '--nodedir', developmentRoot],
    { cwd: host, stdio: 'pipe' }
  );
  assert.equal(securityApi.inspectPlatformSecurity().healthy, true);
  const platform = {
    ...securityApi.platformSecurity(),
    repository: createGitRepository(),
    spawn(...args) {
      const process = spawn(...args);
      const exited = new Promise((resolve) => {
        process.once('exit', resolve);
        process.once('error', resolve);
      });
      children.push({ process, exited });
      return process;
    },
  };
  if (process.platform === 'win32') {
    const { readBrokerBootstrap } = await load('bin/peer-review-broker.mjs');
    await verifyWindowsBootstrapSecurity(scratch, platform, readBrokerBootstrap);
  }
  const idleIdentity = canonicalProjectIdentity({ cwd: projects[0].root, platform });
  const idlePaths = brokerPaths({
    identity: idleIdentity,
    platform,
    env: process.env,
    home: os.homedir(),
  });
  for (const directory of idlePaths.endpointDirectories)
    platform.openPrivateDirectory(directory).close();
  const idleEndpoint = platform.listenPrivate(idlePaths.endpoint);
  try {
    const before = performance.now();
    assert.throws(() => idleEndpoint.accept(), { code: 'APR_BROKER_START_FAILED' });
    assert.ok(
      performance.now() - before < 500,
      'idle native accept must yield for provider stream processing'
    );
  } finally {
    idleEndpoint.close();
  }
  const image = pinRuntimeImage({
    packageRoot: installed,
    nodeExecutable: realpathSync(process.execPath),
    destination: path.join(scratch, 'image'),
  });
  protectWindowsRuntime(image.nodeExecutable);
  const versions = {
    package_version: manifest.version,
    broker_protocol_version: 1,
    node_major: Number(process.versions.node.split('.')[0]),
  };
  const fixtureHome = path.join(scratch, 'provider-home');
  mkdirSync(path.join(fixtureHome, 'Library/Caches'), { recursive: true });
  mkdirSync(path.join(fixtureHome, '.cache'), { recursive: true });
  const preload = pathToFileURL(
    path.join(root, 'test/helpers/installed-provider/preload.mjs')
  ).href;
  const scenarioEnv = {
    ...process.env,
    HOME: fixtureHome,
    AI_PEER_REVIEW_ENDPOINT_ROOT: brokerPaths({
      identity: { digest: 'a'.repeat(64) },
      platform,
      env: process.env,
      home: os.homedir(),
    }).endpointRoot,
    USERPROFILE: fixtureHome,
    CODEX_THREAD_ID: 'parent-session-must-not-leak',
    CODEX_MODEL_ID: 'parent-model-must-not-leak',
    APR_CODEX_HOOK_TOKEN: 'parent-hook-must-not-leak',
    NODE_OPTIONS: `${process.env.NODE_OPTIONS ?? ''} --import=${preload}`,
    APR_FIXTURE_PACKAGE: installed,
    APR_FIXTURE_IMAGE: JSON.stringify({
      root: image.root,
      nodeExecutable: image.nodeExecutable,
      digest: image.digest,
    }),
    APR_FIXTURE_CALLS: path.join(scratch, 'provider-calls.txt'),
    APR_FIXTURE_BROKER_LOG: path.join(scratch, 'automatic-broker.log'),
    APR_OFFLINE_WINDOWS_NODES: JSON.stringify([process.execPath, image.nodeExecutable]),
    APR_PROVIDER_DEADLINE_MS: String(Date.now() + 90_000),
  };
  assert.ok(
    Buffer.byteLength(scenarioEnv.APR_FIXTURE_IMAGE) < 4096,
    'subprocess environment carries only the compact runtime descriptor'
  );
  try {
    const automatic = await promisify(execFile)(
      process.execPath,
      [path.join(root, 'test/helpers/installed-provider/scenario.mjs')],
      {
        cwd: host,
        env: scenarioEnv,
        timeout: 100_000,
        maxBuffer: 4 * 1024 * 1024,
      }
    );
    t.diagnostic(automatic.stdout);
  } catch (error) {
    t.diagnostic(error.stderr ?? 'Installed automatic fixture failed without stderr.');
    throw error;
  }
  stopBrokers = async () => {
    for (const { project, paths, workspace } of live) {
      if (workspace) {
        const state = protocol.inspectReview(workspace);
        await protocol.mutateReview(
          workspace,
          {
            reviewId: state.protocol.review_id,
            revision: state.protocol.revision,
            sequence: state.protocol.sequence,
            actor: state.protocol.current_actor,
          },
          (current) => ({
            schema: 'ai-peer-review.event/v1',
            review_id: current.protocol.review_id,
            sequence: current.protocol.sequence + 1,
            revision: current.protocol.revision + 1,
            type: 'intervention-entered',
            actor: 'system',
            at: NOW,
            payload: {
              intervention_id: 'release-cleanup',
              reason: 'participant-loss',
              interrupted_state: current.protocol.state,
            },
          })
        );
        await api.abandonReview({
          workspace,
          cwd: project.physicalRoot,
          identity: identity('author', 'release-xpr'),
          reason: 'Disposable release verification complete.',
          now: NOW,
        });
      }
      const client = await connectBroker({ identity: project, paths, versions }, platform);
      await clientApi.requestBroker(client, 'stop');
      client.connection?.close();
    }
  };
  for (let index = 0; index < projects.length; index++) {
    const project = canonicalProjectIdentity({ cwd: projects[index].root, platform });
    const paths = brokerPaths({
      identity: project,
      platform,
      env: process.env,
      home: os.homedir(),
    });
    const client = await clientApi.ensureBroker({
      project,
      versions,
      runtimeImage: image,
      platform,
    });
    live.push({ project, paths });
    const status = await clientApi.requestBroker(client, 'status');
    assert.equal(status.package_version, '0.3.0');
    // Startup sends register then launch through one client. Each command
    // needs a fresh authenticated native connection after the previous closes.
    const repeated = await clientApi.requestBroker(client, 'status');
    assert.equal(repeated.project_digest, project.digest);
    client.connection?.close();
    for (const mismatch of [
      { ...versions, package_version: '0.4.0' },
      { ...versions, node_major: versions.node_major + 1 },
    ]) {
      await assert.rejects(
        connectBroker({ identity: project, paths, versions: mismatch }, platform),
        { code: 'APR_BROKER_INCOMPATIBLE' }
      );
    }
  }
  assert.notEqual(live[0].project.digest, live[1].project.digest);
  assert.notEqual(live[0].paths.endpoint, live[1].paths.endpoint);
  const started = await api.startReview(
    {
      cwd: projects[0].root,
      artifact: 'docs/artifact.md',
      artifactKind: 'spec',
      identity: identity('author', 'release-xpr'),
      reviewerProvider: 'claude',
      reviewerModel: 'claude-opus-5',
      reviewerEffort: 'medium',
      transportMode: 'manual',
      reviewId: 'release-xpr',
      now: NOW,
    },
    { adapters: fixtureStartupDeps.adapters, pinRuntimeImage: () => image }
  );
  assert.equal(started.state, 'awaiting-reviewer');
  live[0].workspace = started.paths.workspace;
  const { participantIdentity } = await load('src/identity/registry.mjs');
  await api.joinReview({
    cwd: projects[0].root,
    invitation: started.paths.reviewer_invitation,
    now: NOW,
    identity: participantIdentity({
      role: 'reviewer',
      host: 'claude-code',
      provider: 'anthropic',
      modelId: 'claude-opus-5',
      modelDisplay: 'Claude Opus 5',
      sessionId: 'release-reviewer',
      source: 'runtime',
      joinedAt: NOW,
    }),
    runtimeObservation: {
      provider: 'anthropic',
      host: 'claude-code',
      model_id: 'claude-opus-5',
      effort: 'medium',
      adapter_version: 'fixture-v1',
      assurance: 'runtime',
    },
  });
  renameSync(path.join(host, 'node_modules'), path.join(host, 'replaced-node_modules'));
  assert.equal(verifyRuntimeImage(image), true);
  const execution = `
    import { createRequire } from 'node:module';
    import { realpathSync } from 'node:fs';
    import path from 'node:path';
    const imagePackage = realpathSync(process.cwd());
    function resolveInside(consumer, specifier) {
      const resolved = realpathSync(createRequire(consumer).resolve(specifier));
      const relative = path.relative(imagePackage, resolved);
      if (relative === '..' || relative.startsWith('..' + path.sep) || path.isAbsolute(relative))
        throw new Error('APR_TEST_RUNTIME_DEPENDENCY_ESCAPE: ' + specifier + ' -> ' + resolved);
      return resolved;
    }
    const sdk = resolveInside(new URL('./src/mcp/server.mjs', import.meta.url), '@modelcontextprotocol/sdk/server/mcp.js');
    const zod = resolveInside(sdk, 'zod');
    await import('./src/mcp/server.mjs');
    const { platformSecurity } = await import('./src/broker/platform.mjs');
    console.log(JSON.stringify({ sdk, zod, user: platformSecurity().userId() }));
  `;
  const observed = JSON.parse(
    execFileSync(image.nodeExecutable, ['--input-type=module', '--eval', execution], {
      cwd: path.join(image.root, 'package'),
      encoding: 'utf8',
    })
  );
  assert.ok(observed.user);
  for (const [name, directory] of [
    ['sdk', '@modelcontextprotocol/sdk'],
    ['zod', 'zod'],
  ]) {
    const dependencyRoot = path.join(image.root, 'package/node_modules', directory);
    const relative = path.relative(realpathSync(dependencyRoot), observed[name]);
    assert.ok(relative && !relative.startsWith('..') && !path.isAbsolute(relative), name);
    const withheld = path.join(scratch, `withheld-image-${name}`);
    renameSync(dependencyRoot, withheld);
    try {
      assert.throws(
        () =>
          execFileSync(image.nodeExecutable, ['--input-type=module', '--eval', execution], {
            cwd: path.join(image.root, 'package'),
            encoding: 'utf8',
            stdio: 'pipe',
          }),
        (error) => error.status !== 0 && /APR_TEST_RUNTIME_DEPENDENCY_ESCAPE/.test(error.stderr),
        `missing image ${name} must reject checkout fallback`
      );
    } finally {
      renameSync(withheld, dependencyRoot);
    }
  }
  assert.equal(verifyRuntimeImage(image), true);
  const stillLive = await connectBroker(
    { identity: live[1].project, paths: live[1].paths, versions },
    platform
  );
  assert.equal((await clientApi.requestBroker(stillLive, 'status')).package_version, '0.3.0');
  stillLive.connection?.close();
});
