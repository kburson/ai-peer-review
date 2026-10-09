// @story #190
// Actual hosted installed operations. Public reports are data, never capabilities.
import { execFileSync, spawn } from 'node:child_process';
import { mkdir, writeFile, realpath, lstat } from 'node:fs/promises';
import { userInfo, release, arch } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';
const fail = (reason) => {
  throw Error(reason);
};
export function installedJourneyComplete(value) {
  return (
    value?.broker === 'complete' &&
    value.originalPidAbsent === true &&
    value.originalBudgetRenewed === false &&
    value.manual === 'complete' &&
    value.protection === 'complete' &&
    value.cleanup === 'complete' &&
    ['elevated', 'non-elevated'].includes(value.privilege)
  );
}
function host() {
  if (
    process.env.GITHUB_ACTIONS !== 'true' ||
    process.env.RUNNER_ENVIRONMENT !== 'github-hosted' ||
    process.env.GITHUB_REPOSITORY !== 'kburson/ai-peer-review' ||
    process.env.GITHUB_WORKFLOW !== 'Installed portable journeys' ||
    process.env.GITHUB_REF_NAME !== 'codex/190-installed-journeys' ||
    !/^[0-9]+$/u.test(process.env.GITHUB_RUN_ID ?? '') ||
    process.env.NODE_OPTIONS ||
    Object.keys(process.env).some((key) => key.startsWith('APR_FIXTURE_'))
  )
    fail('journey-host-unavailable');
}
async function physical(value) {
  if (
    typeof value !== 'string' ||
    !path.isAbsolute(value) ||
    path.normalize(value) !== value ||
    (await realpath(value)) !== value ||
    !(await lstat(value)).isDirectory()
  )
    fail('journey-physical-root-unavailable');
  return value;
}
function execute(file, args, cwd) {
  return execFileSync(file, args, {
    cwd,
    encoding: 'utf8',
    shell: false,
    stdio: ['ignore', 'pipe', 'pipe'],
    timeout: 120000,
    maxBuffer: 1048576,
  });
}
function privilege() {
  if (process.platform !== 'win32') {
    if (process.getuid() !== process.geteuid()) fail('journey-effective-principal-unavailable');
    return process.geteuid() === 0 ? 'elevated' : 'non-elevated';
  }
  const value = execute(
    'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe',
    [
      '-NoLogo',
      '-NoProfile',
      '-NonInteractive',
      '-Command',
      '$i=[Security.Principal.WindowsIdentity]::GetCurrent(); $p=[Security.Principal.WindowsPrincipal]::new($i); [Console]::Out.Write((@{sid=$i.User.Value; elevated=$p.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)} | ConvertTo-Json -Compress))',
    ],
    undefined
  );
  const token = JSON.parse(value);
  if (!/^S-1-(?:[0-9]+-)+[0-9]+$/u.test(token.sid ?? '') || typeof token.elevated !== 'boolean')
    fail('journey-effective-principal-unavailable');
  return token.elevated ? 'elevated' : 'non-elevated';
}
const checked = (context) => {
  if (context.signal.aborted || performance.now() >= context.deadline)
    fail('journey-original-budget-expired');
};
export async function runInstalledPortableJourney(options = {}) {
  if (
    !options ||
    Object.getPrototypeOf(options) !== Object.prototype ||
    Object.keys(options).sort().join(',') !== 'installed,output,projectRoot' ||
    Object.values(options).some((value) => typeof value !== 'string' || !path.isAbsolute(value))
  )
    fail('journey-options');
  host();
  const installed = await physical(options.installed),
    root = await physical(options.projectRoot);
  const load = (file) => import(pathToFileURL(path.join(installed, file)).href);
  // Do not enroll a source capture or alter a user's account. CI supplies a real fresh account.
  const home = await realpath(userInfo().homedir);
  if (
    (process.platform === 'win32' ? process.env.USERPROFILE : process.env.HOME) !==
    userInfo().homedir
  )
    fail('journey-account-profile-mismatch');
  const report = {
    schema: 'ai-peer-review.installed-portable-journey/v1',
    verified: false,
    platform: process.platform,
    osBuild: release(),
    architecture: arch(),
    node: process.versions.node,
    runId: process.env.GITHUB_RUN_ID,
    runAttempt: process.env.GITHUB_RUN_ATTEMPT,
    broker: 'incomplete',
    manual: 'incomplete',
    protection: 'incomplete',
    cleanup: 'uncertain',
    originalPidAbsent: false,
    originalBudgetRenewed: false,
    privilege: privilege(),
    obligations: [],
  };
  let child, childExited, locator, client, paths, fence, bootstrap, project, image;
  const obligations = report.obligations;
  try {
    for (const name of [
      process.platform === 'win32'
        ? 'AppData/Local/ai-peer-review/runtime-selection.json'
        : '.config/ai-peer-review/runtime-selection.json',
    ]) {
      try {
        await lstat(path.join(home, name));
        fail('journey-account-already-registered');
      } catch (error) {
        if (error.code !== 'ENOENT') throw error;
      }
    }
    const { bootstrapPortableInventory } = await load('src/installed/portable-inventory.mjs');
    await bootstrapPortableInventory();
    const cli = (args) =>
      execute(process.execPath, [path.join(installed, 'bin/peer-review.mjs'), ...args], root);
    cli(['register-runtime', '--json']);
    const { loadProcessSourceAssurance, isInstalledProcessSourceAssurance } = await load(
      'src/protocol/process-source-assurance.mjs'
    );
    const sourceContext = {
      signal: new AbortController().signal,
      deadline: performance.now() + 30000,
    };
    const source = await loadProcessSourceAssurance(sourceContext);
    if (!isInstalledProcessSourceAssurance(source) || source.absence.status !== 'available')
      fail('journey-source-class-unavailable');
    report.source = {
      contractDigest: source.absence.contractDigest,
      classId: source.absence.classId,
      approvalDigest: source.absence.approvalDigest,
    };
    const git = (args) => execute('git', args, root);
    git(['init', '-b', 'trunk']);
    git(['config', 'user.name', 'Installed Journey']);
    git(['config', 'user.email', 'installed-journey@example.invalid']);
    await mkdir(path.join(root, 'docs'));
    await writeFile(path.join(root, 'docs/artifact.md'), '# Actual installed journey\n', {
      flag: 'wx',
    });
    git(['add', '.']);
    git(['commit', '-m', 'Initialize disposable installed journey']);
    for (const args of [
      ['primary', 'register', '--json'],
      ['setup', '--agent', 'codex', '--scope', 'user', '--json'],
      ['setup', '--agent', 'codex', '--scope', 'project', '--confirm-scratch-exclude', '--json'],
    ])
      cli(args);
    git(['add', '.']);
    git(['commit', '-m', 'Activate actual primary policy']);
    cli(['primary', 'activate', '--json']);
    fence = await load('src/startup/authority-fence.mjs');
    client = await load('src/broker/client.mjs');
    const projectApi = await load('src/broker/portable-project.mjs');
    const imageApi = await load('src/broker/runtime-image.mjs');
    const bootstrapApi = await load('src/broker/portable-bootstrap.mjs');
    paths = await load('src/broker/portable-paths.mjs');
    await fence.withOperationAuthority({ operation: 'broker.start', cwd: root }, async () => {
      const context = await fence.currentOperationAuthorityContext();
      project = await projectApi.observePortableProject({ cwd: root });
      image = imageApi.pinRuntimeImage({
        packageRoot: installed,
        nodeExecutable: await realpath(process.execPath),
        destination: path.join(root, '.scratch', 'peer-review', 'journey-image'),
      });
      bootstrap = await bootstrapApi.writePortableBrokerBootstrap({ project, runtimeImage: image });
      await fence.performCurrentOperationEffect(() => {
        // Actual public entry, fixed real Node; this handle owns only this child.
        child = spawn(
          process.execPath,
          [path.join(installed, 'bin/peer-review-broker.mjs'), bootstrap.file],
          { cwd: root, shell: false, stdio: 'ignore' }
        );
        childExited = new Promise((resolve, reject) => {
          child.once('error', reject);
          child.once('exit', (code, signal) => resolve({ code, signal }));
        });
        childExited.catch(() => {});
      });
      locator = await client.connectPortableBroker({ cwd: root });
      const ownedPaths = await paths.portableBrokerPaths({ worktree: root });
      while (true) {
        checked(context);
        if (child.exitCode !== null || child.signalCode !== null)
          fail('journey-broker-exited-before-ready');
        try {
          await lstat(ownedPaths.endpoint);
          break;
        } catch (error) {
          if (error.code !== 'ENOENT') throw error;
        }
        await delay(25, undefined, { signal: context.signal });
      }
      // File presence is waiting data only. Actual production authentication supplies readiness.
      const status = await client.requestBroker(locator, 'status');
      if (status.status !== 'running' || status.reviews !== 0)
        fail('journey-authenticated-status-unavailable');
      if ((await fence.currentOperationAuthorityContext()) !== context)
        fail('journey-original-budget-renewed');
      checked(context);
      report.protection = 'complete';
    });
    const originalPid = child.pid;
    if (!child.kill('SIGKILL')) fail('journey-owned-crash-unavailable');
    await childExited;
    const processApi = await load('src/protocol/process-identity.mjs');
    await fence.withOperationAuthority({ operation: 'broker.reconcile', cwd: root }, async () => {
      const context = await fence.currentOperationAuthorityContext();
      const absent = await processApi.observeOriginalProcess({ pid: originalPid, ...context });
      if (absent.status !== 'absent' || absent.verified !== true)
        fail('journey-original-pid-absence-unavailable');
      report.originalPidAbsent = true;
      locator = await client.ensureBroker({ project, runtimeImage: image });
      if ((await fence.currentOperationAuthorityContext()) !== context)
        fail('journey-original-budget-renewed');
      checked(context);
      const status = await client.requestBroker(locator, 'status');
      if (status.status !== 'running' || status.reviews !== 0)
        fail('journey-reclaim-status-unavailable');
      report.broker = 'complete';
    });
    const stopped = await client.requestBroker(locator, 'stop');
    if (stopped.status !== 'stopping') fail('journey-authenticated-stop-unavailable');
    const ownedPaths = await paths.portableBrokerPaths({ worktree: root });
    const end = performance.now() + 30000;
    while (true) {
      let present = false;
      for (const file of [
        path.join(ownedPaths.privateRoot, 'owner.json'),
        ownedPaths.credential,
        ownedPaths.endpoint,
      ]) {
        try {
          await lstat(file);
          present = true;
        } catch (error) {
          if (error.code !== 'ENOENT') throw error;
        }
      }
      if (!present) break;
      if (performance.now() >= end) fail('journey-exact-release-unavailable');
      await delay(25);
    }
    report.cleanup = 'complete';
    // Provider identity/journal input must come from a normal review, never a seeded fixture.
    obligations.push('actual-manual-review-input-required');
  } catch (error) {
    report.failure = {
      code: error.code ?? 'JOURNEY_INCOMPLETE',
      reason: error.details?.reason ?? error.message,
    };
    if (child && child.exitCode === null && child.signalCode === null) {
      child.kill('SIGTERM');
      obligations.push('owned-child-termination-and-exact-release-unproved');
    }
    if (locator && report.cleanup !== 'complete')
      obligations.push('authenticated-owner-cleanup-unproved');
  } finally {
    if (locator) await locator.close();
    report.status = installedJourneyComplete(report) ? 'complete' : 'incomplete';
    await writeFile(options.output, JSON.stringify(report, null, 2) + '\n', {
      flag: 'wx',
      mode: 0o600,
    });
  }
  return report;
}
