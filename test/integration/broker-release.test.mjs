// cspell:words nodedir DACL pwsh LiteralPath AccessRuleProtection
import assert from 'node:assert/strict';
import { execFile, execFileSync, spawn } from 'node:child_process';
import {
  existsSync,
  appendFileSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
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
import { parseNpmPackOutput, runNpm, runRuntimePack } from '../helpers/npm-command.mjs';
import { fixtureStartupDeps, loadLegacyAuthority } from '../helpers/internal-api.mjs';
import { identity, NOW } from '../helpers/intervention-fixture.mjs';

const root = fileURLToPath(new URL('../..', import.meta.url));
const currentPackageVersion = JSON.parse(
  readFileSync(path.join(root, 'package.json'), 'utf8')
).version;

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

test('installed release preserves legacy evidence, current broker execution and runtime closure', async (t) => {
  if (!process.env.APR_RELEASE_TEST_ROOT) {
    mkdirSync(path.join(root, '.scratch/test'), { recursive: true });
    const scratch = realpathSync(mkdtempSync(path.join(root, '.scratch/test/apr-release-')));
    t.after(() =>
      rmSync(scratch, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 })
    );
    // A process cannot delete its own loaded native addon on Windows. Keep
    // installation and all native imports in a child that exits before cleanup.
    const endpointRoot =
      process.platform === 'win32'
        ? null
        : realpathSync(
            mkdtempSync(
              path.join(process.platform === 'darwin' ? '/private/tmp' : '/tmp', 'apr-ep-')
            )
          );
    if (endpointRoot) t.after(() => rmSync(endpointRoot, { recursive: true, force: true }));
    const externalPrefix =
      process.platform === 'win32'
        ? realpathSync(mkdtempSync(path.join(os.tmpdir(), 'apr global runtime ')))
        : null;
    if (externalPrefix)
      t.after(() =>
        rmSync(externalPrefix, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 })
      );
    const accountHome = path.join(scratch, 'account-home');
    mkdirSync(accountHome, { mode: 0o700 });
    for (const relative of ['.config', 'AppData/Roaming', 'AppData/Local'])
      mkdirSync(path.join(accountHome, relative), { recursive: true, mode: 0o700 });
    const accountPreload = pathToFileURL(
      path.join(root, 'test/helpers/installed-provider/preload.mjs')
    ).href;
    const env = {
      ...process.env,
      APR_RELEASE_TEST_ROOT: scratch,
      ...(externalPrefix ? { APR_RELEASE_GLOBAL_PREFIX: externalPrefix } : {}),
      ...(process.platform === 'win32' && process.env.APR_OFFLINE_WINDOWS_GROUP
        ? { APR_OFFLINE_WINDOWS_NODES: JSON.stringify([realpathSync(process.execPath)]) }
        : {}),
      ...(endpointRoot ? { AI_PEER_REVIEW_ENDPOINT_ROOT: endpointRoot } : {}),
      APR_FIXTURE_ACCOUNT_HOME: accountHome,
      HOME: accountHome,
      USERPROFILE: accountHome,
      APPDATA: path.join(accountHome, 'AppData/Roaming'),
      LOCALAPPDATA: path.join(accountHome, 'AppData/Local'),
      XDG_CONFIG_HOME: path.join(accountHome, '.config'),
      npm_config_cache: runNpm('npm', ['config', 'get', 'cache'], { encoding: 'utf8' }).trim(),
      NODE_OPTIONS: `${process.env.NODE_OPTIONS ?? ''} --import=${accountPreload}`,
    };
    delete env.NODE_TEST_CONTEXT;
    try {
      const execution = promisify(execFile)(
        process.execPath,
        ['--test', fileURLToPath(import.meta.url)],
        {
          cwd: root,
          env,
          timeout: 1_140_000,
          maxBuffer: 4 * 1024 * 1024,
        }
      );
      for (const stream of [execution.child.stdout, execution.child.stderr]) {
        let pending = '';
        stream.on('data', (chunk) => {
          pending += chunk.toString();
          const lines = pending.split(/\r?\n/);
          pending = lines.pop();
          for (const line of lines)
            if (line.includes('[installed-release]')) process.stderr.write(line + '\n');
        });
      }
      const result = await execution;
      t.diagnostic(result.stdout);
    } catch (error) {
      const progressFile = path.join(scratch, 'stage-progress.log');
      if (existsSync(progressFile)) t.diagnostic(readFileSync(progressFile, 'utf8').slice(-8192));
      t.diagnostic(error.stdout ?? 'Installed child produced no test output.');
      t.diagnostic(error.stderr ?? '');
      throw error;
    }
    return;
  }
  const phaseStart = Date.now();
  const phase = (name) => {
    const message = '[installed-release] ' + name + ' elapsed_ms=' + (Date.now() - phaseStart);
    appendFileSync(
      path.join(process.env.APR_RELEASE_TEST_ROOT, 'stage-progress.log'),
      message + '\n'
    );
    console.error(message);
  };
  phase('child-start');
  const scratch = realpathSync(process.env.APR_RELEASE_TEST_ROOT);
  const live = [];
  const projects = [];
  const children = [];
  let stopBrokers = async () => {};
  t.after(async () => {
    try {
      phase('cleanup-start');
      await stopBrokers();
      phase('cleanup-stopped');
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
  const globalPrefix =
    process.env.APR_RELEASE_GLOBAL_PREFIX ?? path.join(scratch, 'global runtime prefix');
  mkdirSync(host);
  writeFileSync(path.join(host, 'package.json'), '{"private":true}\n');
  const packed = parseNpmPackOutput(
    runRuntimePack(['--ignore-scripts', '--json', '--pack-destination', scratch], {
      cwd: root,
      encoding: 'utf8',
    }),
    { expectedPackageName: '@kburson/ai-peer-review', requireFilename: true }
  );
  runNpm(
    'npm',
    [
      'install',
      '--global',
      '--prefix',
      globalPrefix,
      '--offline',
      '--omit=dev',
      '--ignore-scripts',
      '--no-audit',
      '--no-fund',
      path.join(scratch, packed.filename),
    ],
    { cwd: host, stdio: 'pipe' }
  );
  const installed = path.join(
    globalPrefix,
    ...(process.platform === 'win32' ? [] : ['lib']),
    'node_modules/@kburson/ai-peer-review'
  );
  phase('packed-installed');
  const manifest = JSON.parse(readFileSync(path.join(installed, 'package.json')));
  assert.equal(manifest.version, currentPackageVersion);
  assert.equal(existsSync(path.join(host, 'node_modules/eslint')), false);
  const load = (file) => import(pathToFileURL(path.join(installed, file)));
  const securityApi = await load('src/broker/platform.mjs');
  const { canonicalProjectIdentity } = await load('src/broker/identity.mjs');
  const { createGitRepository } = await load('src/git/repository.mjs');
  const { brokerPaths } = await load('src/broker/paths.mjs');
  const { connectBroker } = await load('src/broker/ipc.mjs');
  const { pinRuntimeImage, verifyRuntimeImage } = await load('src/broker/runtime-image.mjs');
  const help = execFileSync(
    process.execPath,
    [path.join(installed, 'bin/peer-review.mjs'), 'help', '--all'],
    { encoding: 'utf8' }
  );
  assert.doesNotMatch(help, /peer-review coordinator/);
  projects.push(projectFixture(scratch), projectFixture(scratch), projectFixture(scratch));

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
  assert.equal(reported, 'ai-peer-review build broker-security');
  try {
    runNpm(
      'npm',
      ['--prefix', installed, 'run', 'build:broker-security', '--', '--nodedir', developmentRoot],
      { cwd: host, stdio: 'pipe' }
    );
  } catch (error) {
    t.diagnostic(
      'Installed compiler stdout: ' + (error.stdout?.toString().slice(-8192) ?? 'absent')
    );
    throw error;
  }
  assert.equal(securityApi.inspectPlatformSecurity().healthy, true);
  const platform = {
    ...securityApi.platformSecurity(),
    repository: createGitRepository(),
    spawn(file, args, options) {
      const process = spawn(file, args, { ...options, stdio: ['ignore', 'ignore', 'pipe'] });
      const diagnostics = { stderr: '', startedAt: Date.now() };
      process.stderr.on('data', (bytes) => {
        diagnostics.stderr = (diagnostics.stderr + bytes.toString()).slice(-8192);
      });
      const exited = new Promise((resolve) => {
        process.once('exit', resolve);
        process.once('error', (error) => {
          diagnostics.spawnError = error.code ?? error.message;
          resolve();
        });
      });
      children.push({ process, exited, diagnostics });
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
  assert.throws(() => platform.connectPrivate(idlePaths.endpoint), { code: 'ENOENT' });
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
  const api = await load('src/cli/run.mjs');
  const protocol = await load('src/protocol/service.mjs');
  const clientApi = await load('src/broker/client.mjs');
  const publicApi = await load('src/public-api.mjs');
  assert.ok(!Object.keys(publicApi).some((key) => /coordinator|broker/i.test(key)));
  execFileSync(
    process.execPath,
    [
      '--input-type=module',
      '-e',
      'const {registerRuntimeSelection}=await import(process.argv[1]); await registerRuntimeSelection();',
      pathToFileURL(path.join(installed, 'src/config/runtime-selection.mjs')).href,
    ],
    { env: process.env, stdio: 'pipe' }
  );
  const { registerPrimary, activatePrimaryPolicy } = await load(
    'src/config/primary-operations.mjs'
  );
  const { setup } = await load('src/config/setup.mjs');
  for (const project of projects) {
    await registerPrimary({ cwd: project.root });
    await setup({
      scope: 'project',
      agents: ['codex'],
      cwd: project.root,
      confirmScratchExclude: true,
    });
    execFileSync('git', ['add', '.'], { cwd: project.root, stdio: 'pipe' });
    execFileSync('git', ['commit', '-m', 'activate installed fixture primary'], {
      cwd: project.root,
      stdio: 'pipe',
    });
    await activatePrimaryPolicy({ cwd: project.root });
  }
  const legacy = await loadLegacyAuthority({
    cwd: projects[0].root,
    identity: identity('author', 'legacy-release'),
    reviewId: 'legacy-release',
    now: NOW,
  });
  assert.ok(publicApi.statusReview(legacy.paths.workspace));
  const verifyUnsupportedPreservation = (workspace) => {
    const names = ['events.jsonl', 'protocol.json', 'participants.json'];
    const before = names.map((name) =>
      existsSync(path.join(workspace, name)) ? readFileSync(path.join(workspace, name)) : null
    );
    const events = before[0].toString().trim().split('\n').map(JSON.parse);
    events[0].schema = 'ai-peer-review.event/v99';
    const unsupportedBytes = events.map(JSON.stringify).join('\n') + '\n';
    writeFileSync(path.join(workspace, 'events.jsonl'), unsupportedBytes);
    try {
      assert.throws(() => publicApi.statusReview(workspace), {
        code: 'APR_REVIEW_RUNTIME_UNSUPPORTED',
      });
      assert.equal(readFileSync(path.join(workspace, 'events.jsonl'), 'utf8'), unsupportedBytes);
      for (let i = 1; i < names.length; i++)
        assert.deepEqual(
          existsSync(path.join(workspace, names[i]))
            ? readFileSync(path.join(workspace, names[i]))
            : null,
          before[i]
        );
    } finally {
      writeFileSync(path.join(workspace, 'events.jsonl'), before[0]);
    }
  };
  verifyUnsupportedPreservation(legacy.paths.workspace);
  await api.resumeReview(legacy.paths.workspace);
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
  const fixtureHome = process.env.APR_FIXTURE_ACCOUNT_HOME;
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
    ...(process.platform === 'win32'
      ? {
          npm_execpath:
            process.env.npm_execpath ??
            path.join(path.dirname(process.execPath), 'node_modules/npm/bin/npm-cli.js'),
        }
      : {}),
    APR_FIXTURE_PACKAGE: installed,
    APR_FIXTURE_ACCOUNT_HOME: fixtureHome,
    APR_FIXTURE_IMAGE: JSON.stringify({
      root: image.root,
      nodeExecutable: image.nodeExecutable,
      digest: image.digest,
    }),
    APR_FIXTURE_CALLS: path.join(scratch, 'provider-calls.txt'),
    APR_FIXTURE_BROKER_LOG: path.join(scratch, 'automatic-broker.log'),
    APR_FIXTURE_TIMING_LOG: path.join(scratch, 'runtime-timing.jsonl'),
    APR_FIXTURE_RESTART_SIMULATION: '1',
    APR_OFFLINE_WINDOWS_NODES: JSON.stringify([process.execPath, image.nodeExecutable]),
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
        timeout: 1_020_000,
        maxBuffer: 4 * 1024 * 1024,
      }
    );
    t.diagnostic(automatic.stdout);
  } catch (error) {
    t.diagnostic(error.stderr ?? 'Installed automatic fixture failed without stderr.');
    for (const name of ['provider-calls.txt', 'automatic-broker.log', 'runtime-timing.jsonl']) {
      const file = path.join(scratch, name);
      if (existsSync(file)) t.diagnostic(name + ': ' + readFileSync(file, 'utf8').slice(-4000));
    }
    const traceFile = path.join(scratch, 'runtime-timing.jsonl');
    if (existsSync(traceFile)) {
      const traces = readFileSync(traceFile, 'utf8').trim().split('\n').map(JSON.parse);
      const processes = new Map();
      for (const trace of traces) {
        const summary = processes.get(trace.pid) ?? {
          pid: trace.pid,
          first: trace.at,
          last: trace.at,
          calls: 0,
          subprocessMs: 0,
          lastCalls: [],
        };
        summary.last = trace.at;
        if (trace.phase === 'returned') {
          summary.calls++;
          summary.subprocessMs += trace.elapsed;
        }
        summary.lastCalls = [...summary.lastCalls.slice(-5), trace];
        processes.set(trace.pid, summary);
      }
      t.diagnostic('Subprocess timing summary: ' + JSON.stringify([...processes.values()]));
    }
    const reviewRoot = path.join(host, '.scratch/peer-review');
    if (existsSync(reviewRoot)) {
      for (const name of readdirSync(reviewRoot)) {
        const directory = path.join(reviewRoot, name);
        const journal = path.join(directory, 'startup-request.json');
        if (existsSync(journal)) {
          const value = JSON.parse(readFileSync(journal, 'utf8'));
          t.diagnostic('startup stage ' + name + ': ' + value.stage);
        }
        const events = path.join(directory, 'events.jsonl');
        if (existsSync(events)) {
          const retained = readFileSync(events, 'utf8')
            .trim()
            .split('\n')
            .slice(-8)
            .map((line) => {
              const value = JSON.parse(line);
              return { type: value.type, sequence: value.sequence };
            });
          t.diagnostic('last events ' + name + ': ' + JSON.stringify(retained));
        }
      }
    }
    throw error;
  }
  phase('automatic-accepted');
  const automaticWorkspace = readdirSync(path.join(host, '.scratch/peer-review'))
    .map((name) => path.join(host, '.scratch/peer-review', name))
    .find((directory) => existsSync(path.join(directory, 'events.jsonl')));
  assert.equal(publicApi.statusReview(automaticWorkspace).state, 'accepted');
  verifyUnsupportedPreservation(automaticWorkspace);
  stopBrokers = async () => {
    // Stop empty clones before lengthy active-review abandonment can put their
    // ordinary idle retirement between readiness and command authentication.
    const emptyFirst = [...live].sort((a, b) => Boolean(a.workspace) - Boolean(b.workspace));
    for (const { project, workspace } of emptyFirst) {
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
      phase('cleanup-reacquire-' + project.digest.slice(0, 8));
      const client = await clientApi.ensureBroker({
        project,
        versions,
        runtimeImage: image,
        platform,
      });
      phase('cleanup-stop-' + project.digest.slice(0, 8));
      await clientApi.requestBroker(client, 'stop');
      client.connection?.close();
    }
  };
  phase('isolated-clones-start');
  for (let index = 0; index < projects.length; index++) {
    const project = canonicalProjectIdentity({ cwd: projects[index].root, platform });
    const paths = brokerPaths({
      identity: project,
      platform,
      env: process.env,
      home: os.homedir(),
    });
    let client;
    try {
      client = await clientApi.ensureBroker({
        project,
        versions,
        runtimeImage: image,
        platform,
      });
    } catch (error) {
      t.diagnostic(
        `Isolated broker startup: ${JSON.stringify({
          projectIndex: index,
          bootstrapExists: Boolean(error.details?.bootstrap && existsSync(error.details.bootstrap)),
          discoveryExists: existsSync(paths.metadata),
          lockExists: existsSync(paths.lock),
          children: children.map(({ process, diagnostics }) => ({
            elapsedMs: Date.now() - diagnostics.startedAt,
            exitCode: process.exitCode,
            signal: process.signalCode,
            stderr: diagnostics.stderr,
            spawnError: diagnostics.spawnError ?? null,
          })),
        })}`
      );
      throw error;
    }
    live.push({ project, paths });
    phase('clone-status-' + index);
    const status = await clientApi.requestBroker(client, 'status');
    assert.equal(status.package_version, currentPackageVersion);
    // Startup sends register then launch through one client. Each command
    // needs a fresh authenticated native connection after the previous closes.
    const repeated = await clientApi.requestBroker(client, 'status');
    assert.equal(repeated.project_digest, project.digest);
    client.connection?.close();
    for (const mismatch of [
      { ...versions, package_version: '99.99.99' },
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
      issue: 117,
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
  // The runner is global. A foreign consumer dependency tree remains irrelevant
  // to the immutable broker image, including when the consumer replaces it.
  mkdirSync(path.join(host, 'node_modules'), { recursive: true });
  writeFileSync(path.join(host, 'node_modules', 'foreign.txt'), 'consumer dependency');
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
  // An empty broker legitimately idles out while the other clone's installed
  // operations run. Reacquire through the normal lifecycle after long checks.
  phase('empty-clone-reacquire');
  const currentBroker = await clientApi.ensureBroker({
    project: live[1].project,
    versions,
    runtimeImage: image,
    platform,
  });
  phase('empty-clone-status');
  const currentStatus = await clientApi.requestBroker(currentBroker, 'status');
  assert.equal(currentStatus.package_version, currentPackageVersion);
  assert.equal(currentStatus.project_digest, live[1].project.digest);
  phase('selected-dependency-fence-start');
  // This authenticated client has already proved the current empty clone.
  // Inventory admission must refuse the effect before another IPC operation;
  // a second readiness check would race this idle broker's normal retirement.
  const fencedStop = currentBroker;
  // Replacing consumer dependencies above must remain irrelevant. Replacing
  // the selected global dependency closure must fence a command with effects.
  const selectedDependencies = path.join(installed, 'node_modules');
  const withheldSelectedDependencies = path.join(installed, 'replaced-node_modules');
  renameSync(selectedDependencies, withheldSelectedDependencies);
  try {
    await assert.rejects(clientApi.requestBroker(fencedStop, 'stop'), {
      code: 'APR_RUNTIME_INVENTORY_INVALID',
    });
  } finally {
    fencedStop.connection?.close();
    renameSync(withheldSelectedDependencies, selectedDependencies);
  }
  renameSync(path.join(host, 'replaced-node_modules'), path.join(host, 'node_modules'));
  phase('assertions-complete');
});
