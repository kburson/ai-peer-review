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
    (value.manual === 'complete' ||
      (value.platform === 'linux' && value.manual === 'excluded-by-user-linux')) &&
    value.protection === 'complete' &&
    value.cleanup === 'complete' &&
    ['elevated', 'non-elevated'].includes(value.privilege)
  );
}
// Public failure projection is data only; unknown/private fields never enter collateral.
export function installedJourneyFailure(error) {
  let observed = error;
  const stderr = error?.stderr?.toString() ?? '';
  if (stderr.length <= 1048576)
    for (const line of stderr.split(/\r?\n/u)) {
      try {
        const value = JSON.parse(line);
        if (
          value?.schema === 'ai-peer-review.error/v1' &&
          /^APR_[A-Z_]+$/u.test(value.code ?? '') &&
          typeof value.message === 'string'
        ) {
          observed = value;
        }
      } catch {
        /* Non-JSON diagnostic lines supply no error authority. */
      }
    }
  const obligations = [];
  for (const value of observed?.details?.obligations ??
    observed?.details?.outstandingObligations ??
    []) {
    if (!value || typeof value !== 'object') continue;
    const projected = {};
    for (const key of [
      'name',
      'identity',
      'fileVersion',
      'rootIdentity',
      'outcome',
      'root',
      'contenderId',
      'resourceKey',
      'version',
      'reason',
    ]) {
      if (typeof value[key] === 'string' && value[key].length <= 4096) projected[key] = value[key];
    }
    if (Object.keys(projected).length) obligations.push(projected);
  }
  return {
    failure: {
      code: observed?.code ?? 'JOURNEY_INCOMPLETE',
      reason: observed?.details?.reason ?? observed?.message ?? 'journey-failure-unavailable',
    },
    obligations,
  };
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
    manual: process.platform === 'linux' ? 'excluded-by-user-linux' : 'incomplete',
    protection: 'incomplete',
    cleanup: 'uncertain',
    originalPidAbsent: false,
    originalBudgetRenewed: false,
    privilege: privilege(),
    obligations: [],
    steps: [],
  };
  let child, childExited, locator, client, paths, fence, bootstrap, project, image;
  const step = async (stage, operation) => {
    report.stage = stage;
    const started = performance.now();
    try {
      return await operation();
    } finally {
      report.steps.push({ stage, elapsedMs: Math.round(performance.now() - started) });
    }
  };
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
    const cli = (args) => {
      report.stage = 'cli:' + args.slice(0, 2).join(' ');
      const started = performance.now();
      try {
        return execute(
          process.execPath,
          [path.join(installed, 'bin/peer-review.mjs'), ...args],
          root
        );
      } finally {
        report.steps.push({
          stage: report.stage,
          elapsedMs: Math.round(performance.now() - started),
        });
      }
    };
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
    report.stage = 'broker-bootstrap-and-start';
    fence = await load('src/startup/authority-fence.mjs');
    client = await load('src/broker/client.mjs');
    const projectApi = await load('src/broker/portable-project.mjs');
    const imageApi = await load('src/broker/runtime-image.mjs');
    const bootstrapApi = await load('src/broker/portable-bootstrap.mjs');
    paths = await load('src/broker/portable-paths.mjs');
    await fence.withOperationAuthority({ operation: 'broker.start', cwd: root }, async () => {
      const context = await step('broker-admitted-context', () =>
        fence.currentOperationAuthorityContext()
      );
      project = await step('broker-project-observation', () =>
        projectApi.observePortableProject({ cwd: root })
      );
      image = await step('broker-image-pin', async () =>
        imageApi.pinRuntimeImage({
          packageRoot: installed,
          nodeExecutable: await realpath(process.execPath),
          destination: path.join(root, '.scratch', 'peer-review', 'journey-image'),
        })
      );
      bootstrap = await step('broker-bootstrap-publication', () =>
        bootstrapApi.writePortableBrokerBootstrap({ project, runtimeImage: image })
      );
      await step('broker-owned-spawn', () =>
        fence.performCurrentOperationEffect(() => {
          // Actual public entry, fixed real Node; this handle owns only this child.
          child = spawn(
            process.execPath,
            [path.join(installed, 'bin/peer-review-broker.mjs'), bootstrap.file],
            { cwd: root, shell: false, stdio: ['ignore', 'ignore', 'pipe'] }
          );
          let diagnosticBytes = 0;
          child.stderr.on('data', (bytes) => {
            diagnosticBytes += bytes.length;
            if (diagnosticBytes > 65536) return;
            for (const line of bytes.toString('utf8').split(/\r?\n/u)) {
              const match = /^(APR_[A-Z_]+): Portable broker startup or cleanup failed\.$/u.exec(
                line
              );
              if (match) report.brokerChildFailureCode = match[1];
            }
          });
          childExited = new Promise((resolve, reject) => {
            child.once('error', reject);
            child.once('exit', (code, signal) => resolve({ code, signal }));
          });
          childExited.catch(() => {});
        })
      );
      report.stage = 'broker-endpoint-wait';
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
      const status = await step('broker-authenticated-status', () =>
        client.requestBroker(locator, 'status')
      );
      if (status.status !== 'running' || status.reviews !== 0)
        fail('journey-authenticated-status-unavailable');
      if ((await fence.currentOperationAuthorityContext()) !== context)
        fail('journey-original-budget-renewed');
      checked(context);
      report.protection = 'complete';
    });
    report.stage = 'broker-crash-and-reclaim';
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
    report.stage = 'broker-stop-and-release';
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
    if (process.platform !== 'linux') obligations.push('actual-manual-review-input-required');
  } catch (error) {
    const failed = installedJourneyFailure(error);
    report.failure = failed.failure;
    obligations.push(...failed.obligations);
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
