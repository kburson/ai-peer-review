// @story #170
// Actual substrate controls only; results are unverified data, never class admission.
import { fork } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { readFileSync, realpathSync } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { inspectInstalledCandidateSource } from './package.mjs';

const ROOT = realpathSync(fileURLToPath(new URL('../../../', import.meta.url)));
const BOOT = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/u;
const fail = (code, obligations = []) => Object.assign(new Error(code), { obligations });
function budget(context) {
  if (
    !(context.signal instanceof AbortSignal) ||
    context.signal.aborted ||
    !Number.isFinite(context.deadline) ||
    performance.now() >= context.deadline
  )
    throw fail('source-capture-budget');
  return context.deadline - performance.now();
}
function kernelBoot() {
  if (process.platform !== 'linux') return null;
  const value = readFileSync('/proc/sys/kernel/random/boot_id', 'utf8').trim();
  if (!BOOT.test(value)) throw fail('source-capture-boot-unproved');
  return value;
}
async function startChild(context) {
  budget(context);
  const nonce = randomBytes(32).toString('hex');
  const child = fork(path.join(ROOT, 'test/helpers/process-source-child.mjs'), [], {
    execPath: process.execPath,
    stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
  });
  let exit = null;
  const exitPromise = new Promise((resolve) =>
    child.once('exit', (exitCode, signal) => {
      exit = { pid: child.pid, exitCode, signal };
      resolve(exit);
    })
  );
  const obligation = () => [{ kind: 'owned-capture-child', pid: child.pid, nonce }];
  const wait = (promise) =>
    new Promise((resolve, reject) => {
      const abort = () => done(fail('source-capture-budget', obligation()));
      const done = (error, value) => {
        clearTimeout(timer);
        context.signal.removeEventListener('abort', abort);
        if (error) reject(error);
        else resolve(value);
      };
      const timer = setTimeout(
        () => done(fail('source-capture-budget', obligation())),
        budget(context)
      );
      context.signal.addEventListener('abort', abort, { once: true });
      promise.then(
        (value) => done(null, value),
        (error) => done(error)
      );
    });
  const ready = new Promise((resolve, reject) => {
    const message = (m) => {
      if (m?.event === 'ready' && m.nonce === nonce && m.pid === child.pid) {
        child.off('message', message);
        resolve();
      }
    };
    child.on('message', message);
    child.once('error', reject);
    child.once('exit', () => reject(fail('source-capture-child-exited', obligation())));
  });
  child.send({ op: 'start', nonce });
  try {
    await wait(ready);
  } catch (error) {
    if (child.exitCode === null) child.kill('SIGTERM');
    throw error;
  }
  let stopping = false;
  return {
    child,
    nonce,
    async stop() {
      if (exit) return exit;
      if (!stopping) {
        budget(context);
        stopping = true;
        child.send({ op: 'stop', nonce });
      }
      return wait(exitPromise);
    },
    signalStop() {
      budget(context);
      stopping = true;
      child.send({ op: 'stop', nonce });
    },
    exited: () => exit,
    obligations: obligation,
  };
}
export async function captureAbsenceControlsCore(options = {}) {
  if (
    !options ||
    Object.keys(options).some(
      (key) => !['installation', 'packagePath', 'signal', 'deadline'].includes(key)
    )
  )
    throw fail('source-capture-options');
  const { installation, packagePath, signal, deadline } = options;
  const context = { signal, deadline };
  budget(context);
  const inspected = inspectInstalledCandidateSource({ installation, packagePath });
  const identity = await import(
    pathToFileURL(path.join(installation, 'src/protocol/process-identity.mjs')).href
  );
  const source = await import(
    pathToFileURL(path.join(installation, 'src/protocol/process-source-assurance.mjs')).href
  );
  const probe = await identity.observeProcessSourceContext(context);
  const hostId = await identity.observeExecutionHostIdentity(context);
  if (
    !probe ||
    !/^sha256:[a-f0-9]{64}$/u.test(hostId ?? '') ||
    (await source.processSourceContractDigest()) !== inspected.package.contractDigest
  )
    throw fail('source-capture-context-unproved');
  const scope = {
    platform: process.platform,
    build: os.release(),
    architecture: process.arch,
    nodeMajor: Number(process.versions.node.split('.')[0]),
    probe,
  };
  const observe = (pid) =>
    identity.observeProcessIdentityCore({
      pid,
      platform: process.platform,
      hostname: hostId,
      probeObservation: probe,
      ...context,
    });
  const before = kernelBoot();
  const owned = await startChild(context);
  let controls, errorResult;
  try {
    const live = await observe(owned.child.pid);
    if (live.status !== 'live' || !live.creation) throw fail('source-live-control-unproved');
    const exit = await owned.stop();
    if (exit.exitCode !== 0 || exit.signal !== null) throw fail('source-exit-control-unproved');
    const absence = await observe(owned.child.pid);
    if (absence.status !== 'absent') throw fail('source-absence-control-unproved');
    if (process.platform !== 'linux') {
      errorResult = await observe(Number.MAX_SAFE_INTEGER);
    } else {
      // The real procfs directory/stat race must be observed. No injected read,
      // mocked denial or expired-budget result can satisfy the error control.
      for (let attempt = 0; attempt < 64 && errorResult?.status !== 'unknown'; attempt += 1) {
        budget(context);
        const racing = await startChild(context);
        try {
          const initial = await observe(racing.child.pid);
          if (initial.status !== 'live') throw fail('source-error-live-unproved');
          racing.signalStop();
          for (let check = 0; check < 128 && !racing.exited(); check += 1) {
            const value = await observe(racing.child.pid);
            budget(context);
            if (value.status === 'unknown' && value.reason === 'identity-unavailable') {
              errorResult = value;
              break;
            }
          }
        } finally {
          const result = await racing.stop();
          if (result.exitCode !== 0 || result.signal !== null)
            throw fail('source-error-cleanup-unproved');
        }
      }
    }
    budget(context);
    if (errorResult?.status !== 'unknown' || errorResult.reason !== 'identity-unavailable')
      throw fail('source-error-control-inconclusive');
    controls = {
      producer: {
        kind: 'installed-source',
        contractDigest: inspected.package.contractDigest,
        inventoryDigest: inspected.package.inventoryDigest,
      },
      live: { pid: live.pid, nonce: owned.nonce, creation: live.creation },
      exit,
      absence: { pid: absence.pid, status: absence.status },
      error: { status: 'unknown', reason: 'probe-query-error' },
      cleanup: { childExited: true, restoration: 'not-required' },
    };
  } finally {
    const exit = await owned.stop();
    if (exit.exitCode !== 0 || exit.signal !== null)
      throw fail('source-capture-cleanup-unproved', owned.obligations());
  }
  const after = kernelBoot();
  if (
    before !== after ||
    (await identity.observeExecutionHostIdentity(context)) !== hostId ||
    (await source.processSourceContractDigest()) !== inspected.package.contractDigest
  )
    throw fail('source-capture-context-changed');
  inspectInstalledCandidateSource({ installation, packagePath });
  budget(context);
  return Object.freeze({ verified: false, controls, boot: { before, after }, scope, hostId });
}
