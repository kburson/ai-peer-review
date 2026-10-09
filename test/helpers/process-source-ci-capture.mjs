// @story #170
// @story #190
// Public pre-capture artifacts and signed controls on disposable hosted workers only.
import { execFileSync, spawn } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync, realpathSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';
import { initializeCiClockHost } from './process-source-ci-host.mjs';
import { captureProducerFiles, assertCaptureProducerFiles } from './capture-producer-freeze.mjs';
import { runProcessSourceConformance } from '../live/process-source-conformance.mjs';
import { readApprovedProcessSourceIndex } from '../live/process-source/authority.mjs';
import {
  processSourceRecordDigest,
  validateProcessSourceRegistration,
} from '../live/process-source/records.mjs';
const ROOT = realpathSync(fileURLToPath(new URL('../../', import.meta.url)));
const DRIVER = 'test/live/process-source-conformance.mjs';
const CAPTURE_BRANCH = 'codex/190-installed-journeys';
const fail = (code) => {
  throw Error(code);
};
function host() {
  if (
    process.env.GITHUB_ACTIONS !== 'true' ||
    process.env.RUNNER_ENVIRONMENT !== 'github-hosted' ||
    process.env.GITHUB_REPOSITORY !== 'kburson/ai-peer-review' ||
    process.env.GITHUB_WORKFLOW !== 'Process source conformance capture' ||
    !/^[0-9]+$/u.test(process.env.GITHUB_RUN_ID ?? '') ||
    !/^[0-9]+$/u.test(process.env.GITHUB_RUN_ATTEMPT ?? '') ||
    !['Linux', 'macOS', 'Windows'].includes(process.env.RUNNER_OS)
  )
    fail('ci-capture-host-unavailable');
  if (process.env.GITHUB_REF_NAME !== CAPTURE_BRANCH) fail('ci-capture-branch-unavailable');
}
const gitRaw = (args) =>
  execFileSync('git', ['-C', ROOT, ...args], {
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'pipe'],
    timeout: 30000,
  });
const git = (args) => gitRaw(args).trim();
const paths = (output) => output.split('\0').filter(Boolean);
const producerFiles = () => captureProducerFiles(paths(gitRaw(['ls-files', '-z'])));
const assertProducers = (state) => {
  const current = producerFiles();
  const changed = paths(gitRaw(['diff', '--name-only', '-z', state.codeCommit, '--']));
  assertCaptureProducerFiles(state.producerFiles, current, changed);
  const untracked = paths(gitRaw(['ls-files', '--others', '--exclude-standard', '-z']));
  if (untracked.length && captureProducerFiles(untracked).length)
    fail('ci-capture-untracked-producer');
};
const json = (file) => JSON.parse(readFileSync(file, 'utf8'));
const write = (file, value) =>
  writeFileSync(file, JSON.stringify(value, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
const location = () =>
  path.join(
    ROOT,
    '.scratch',
    'peer-review',
    'ci-source-' +
      process.env.GITHUB_RUN_ID +
      '-' +
      process.env.GITHUB_RUN_ATTEMPT +
      '-' +
      process.env.RUNNER_OS +
      '-' +
      process.versions.node.split('.')[0]
  );
async function prepare() {
  const base = location(),
    output = path.join(base, 'public');
  mkdirSync(output, { recursive: true });
  const codeCommit = git(['rev-parse', 'HEAD']);
  const frozen = { codeCommit, producerFiles: producerFiles() };
  assertProducers(frozen);
  write(path.join(output, 'producer-freeze.json'), {
    schema: 'ai-peer-review.capture-producer-freeze/v1',
    verified: false,
    ...frozen,
  });
  let prerequisite = { verified: false, clockChanges: 'none', restoration: 'not-required' };
  if (process.platform === 'linux') {
    const clock = await initializeCiClockHost();
    prerequisite = { verified: false, prerequisites: clock.prerequisites, restoration: 'verified' };
  }
  const packagePath = path.join(base, 'portable-candidate.tgz');
  await runProcessSourceConformance({ mode: 'pack', output: packagePath });
  const captures = [];
  for (const kind of process.platform === 'linux' ? ['absence', 'creation'] : ['absence']) {
    const binding = path.join(base, kind + '-binding.json');
    await runProcessSourceConformance({ mode: 'bind', packagePath, binding });
    const candidate = json(binding + '.registration.json');
    const registration = {
      ...candidate,
      kinds: [kind],
      transitions: kind === 'creation' ? candidate.transitions : [],
    };
    validateProcessSourceRegistration(registration);
    write(path.join(output, registration.captureId + '.registration.json'), registration);
    captures.push({ captureId: registration.captureId, kind, binding, registration });
  }
  write(path.join(output, 'worker.json'), {
    schema: 'ai-peer-review.process-source-ci-worker/v1',
    verified: false,
    runId: process.env.GITHUB_RUN_ID,
    runAttempt: process.env.GITHUB_RUN_ATTEMPT,
    repository: process.env.GITHUB_REPOSITORY,
    codeCommit,
    runnerOS: process.env.RUNNER_OS,
    nodeMajor: Number(process.versions.node.split('.')[0]),
    prerequisite,
    captures: captures.map((c) => ({ captureId: c.captureId, kind: c.kind })),
  });
  write(path.join(output, 'package-receipt.json'), json(packagePath + '.receipt.json'));
  write(path.join(base, 'private-state.json'), { ...frozen, captures, packagePath });
  console.log('Public pre-capture registrations ready; ordinary review required.');
}
async function approval(capture, state) {
  const end = performance.now() + 2400000;
  const approvedPath =
    'evidence/portable-runtime/process-source/registrations/approved-refs/' +
    capture.captureId +
    '.json';
  while (performance.now() < end) {
    git(['fetch', 'origin', CAPTURE_BRANCH]);
    const remote = git(['rev-parse', 'FETCH_HEAD']);
    let value;
    try {
      value = JSON.parse(git(['show', remote + ':' + approvedPath]));
    } catch {
      await delay(10000);
      continue;
    }
    git(['checkout', '--detach', remote]);
    assertProducers(state);
    const authority = await readApprovedProcessSourceIndex({ approvedRef: value });
    const registered = authority.registrations.get(
      'evidence/portable-runtime/process-source/registrations/' + capture.captureId + '.json'
    );
    if (
      !registered ||
      processSourceRecordDigest(registered) !== processSourceRecordDigest(capture.registration)
    )
      fail('ci-capture-registration-mismatch');
    return value;
  }
  fail('ci-capture-registration-review-unavailable');
}
async function creation(capture, approvedRef, output) {
  const clock = await initializeCiClockHost();
  const context = { signal: new AbortController().signal, deadline: performance.now() + 800000 };
  let child, restoration, error, timer;
  try {
    await clock.begin(context);
    child = spawn(
      process.execPath,
      [
        DRIVER,
        'capture',
        '--binding',
        capture.binding,
        '--registration-index',
        'evidence/portable-runtime/process-source/registration-index.json',
        '--approved-ref',
        approvedRef,
        '--output',
        output,
      ],
      { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'] }
    );
    let text = '',
      pending = Promise.resolve();
    timer = setTimeout(() => child.kill('SIGTERM'), 700000);
    child.stderr.on('data', (bytes) => {
      text += bytes.toString('utf8');
      let line;
      while ((line = text.indexOf('\n')) >= 0) {
        const value = text.slice(0, line);
        text = text.slice(line + 1);
        process.stderr.write(value + '\n');
        const ready = value.match(
          /^Capture ready for expressly authorized (clock-forward|clock-backward|timezone|dst) transition;/u
        );
        if (ready) pending = pending.then(() => clock.apply(ready[1]));
        else if (
          /^Sustained (clock-forward|clock-backward|timezone|dst) observed; restore/u.test(value)
        )
          pending = pending.then(() => clock.restoreTransition());
        pending.catch((e) => {
          error = e;
          child.kill('SIGTERM');
        });
      }
    });
    child.stdout.on('data', (bytes) => process.stdout.write(bytes));
    const exited = await new Promise((resolve, reject) => {
      child.once('error', reject);
      child.once('exit', (code, signal) => resolve({ code, signal }));
    });
    clearTimeout(timer);
    await pending;
    if (error) throw error;
    if (exited.code !== 0 || exited.signal !== null) fail('ci-creation-capture-failed');
  } finally {
    clearTimeout(timer);
    if (child && child.exitCode === null && child.signalCode === null) child.kill('SIGTERM');
    restoration = await clock.finish();
  }
  return { verified: false, prerequisites: clock.prerequisites, restoration };
}
async function captureAll() {
  const base = location(),
    state = json(path.join(base, 'private-state.json'));
  for (const capture of state.captures) {
    assertProducers(state);
    const approved = await approval(capture, state);
    const approvedRef = path.join(base, capture.captureId + '-approved-ref.json');
    write(approvedRef, approved);
    const output = path.join(base, capture.captureId + '-receipt.json');
    let control = { verified: false, clockChanges: 'none', restoration: 'not-required' };
    if (capture.kind === 'creation') control = await creation(capture, approvedRef, output);
    else
      await runProcessSourceConformance({
        mode: 'capture-absence',
        binding: capture.binding,
        registrationIndex: 'evidence/portable-runtime/process-source/registration-index.json',
        approvedRef,
        output,
      });
    await runProcessSourceConformance({
      mode: 'verify',
      receipt: output,
      registrationIndex: 'evidence/portable-runtime/process-source/registration-index.json',
      approvedRef,
    });
    const folder = path.join(base, 'public', capture.captureId);
    mkdirSync(folder, { recursive: true });
    write(path.join(folder, 'receipt.json'), json(output));
    write(path.join(folder, 'host-control.json'), {
      schema: 'ai-peer-review.process-source-ci-control/v1',
      verified: false,
      runId: process.env.GITHUB_RUN_ID,
      runAttempt: process.env.GITHUB_RUN_ATTEMPT,
      codeCommit: state.codeCommit,
      captureProducerCommit: git(['rev-parse', 'HEAD']),
      captureId: capture.captureId,
      kind: capture.kind,
      control,
    });
    console.log('Genuine signed capture preserved: ' + capture.captureId);
  }
}
export async function runCiSourceCapture(options = {}) {
  if (
    !options ||
    Object.getPrototypeOf(options) !== Object.prototype ||
    Object.keys(options).sort().join(',') !== 'mode' ||
    !['prepare', 'capture'].includes(options.mode)
  )
    fail('ci-capture-options');
  host();
  if (options.mode === 'prepare') return prepare();
  return captureAll();
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    await runCiSourceCapture({ mode: process.argv[2] });
  } catch (error) {
    console.error(error.code ?? error.message);
    process.exitCode = 1;
  }
}
