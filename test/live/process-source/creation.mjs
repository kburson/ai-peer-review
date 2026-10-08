// @story #170
// Actual read-only capture: authorized host operators own transitions and restoration.
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';
import { readFileSync } from 'node:fs';
import { observeSystemClockCore } from './clock.mjs';
import { captureAbsenceControlsCore, startOwnedConformanceChild } from './absence.mjs';
import { processSourceRecordDigest } from './records.mjs';
import { inspectInstalledCandidateSource } from './package.mjs';

const fail = (code, obligations = []) => Object.assign(Error(code), { obligations });
function remaining(context) {
  if (
    !(context.signal instanceof AbortSignal) ||
    context.signal.aborted ||
    !Number.isFinite(context.deadline) ||
    context.deadline <= performance.now()
  )
    throw fail('source-capture-budget');
  return context.deadline - performance.now();
}
const offset = (sample) => BigInt(sample.utcNs) - BigInt(sample.monotonicNs);
const restored = (value, before) => {
  const delta = offset(value) - offset(before);
  return (
    delta >= -500000000n &&
    delta <= 500000000n &&
    value.zone === before.zone &&
    value.dst === before.dst
  );
};
function changed(kind, value, before) {
  const delta = offset(value) - offset(before);
  if (kind === 'clock-forward') return delta >= 60000000000n;
  if (kind === 'clock-backward') return delta <= -60000000000n;
  if (kind === 'timezone') return value.zone !== before.zone && value.dst === before.dst;
  return value.zone === before.zone && value.dst !== before.dst;
}
export async function captureCreationControlsCore(options = {}) {
  if (
    !options ||
    Object.getPrototypeOf(options) !== Object.prototype ||
    Object.keys(options).some(
      (k) => !['installation', 'packagePath', 'signal', 'deadline'].includes(k)
    )
  )
    throw fail('source-capture-options');
  const context = { signal: options.signal, deadline: options.deadline };
  remaining(context);
  const base = await captureAbsenceControlsCore(options);
  const identity = await import(
    pathToFileURL(path.join(options.installation, 'src/protocol/process-identity.mjs')).href
  );
  const owned = await startOwnedConformanceChild(context);
  const observe = () =>
    identity.observeProcessIdentityCore({
      pid: owned.child.pid,
      platform: process.platform,
      hostname: base.hostId,
      probeObservation: base.scope.probe,
      ...context,
    });
  let original,
    latest,
    restoredAll = false;
  const sample = async () => {
    remaining(context);
    await owned.ping();
    const live = await observe();
    if (live.status !== 'live' || !live.creation) throw fail('creation-child-source-unproved');
    if (
      original &&
      processSourceRecordDigest(live.creation) !== processSourceRecordDigest(original.creation)
    )
      throw fail('creation-child-source-changed');
    if (!original) original = { pid: live.pid, nonce: owned.nonce, creation: live.creation };
    const clock = await observeSystemClockCore(context);
    latest = {
      monotonicNs: clock.monotonicNs,
      utcNs: clock.utcNs,
      zone: clock.zone,
      dst: clock.dst,
      ...original,
    };
    return latest;
  };
  const pause = async () => {
    await delay(Math.min(1000, remaining(context)), undefined, { signal: context.signal });
    remaining(context);
  };
  const window = async (first) => {
    const points = first ? [first] : [await sample()];
    while (
      points.length < 6 ||
      BigInt(points.at(-1).monotonicNs) - BigInt(points[0].monotonicNs) < 5000000000n
    ) {
      await pause();
      points.push(await sample());
      if (points.length > 256) throw fail('creation-window-inadequate');
    }
    return points;
  };
  const waitFor = async (predicate) => {
    while (true) {
      const value = await sample();
      if (predicate(value)) return value;
      await pause();
    }
  };
  const transitions = [];
  let controls;
  try {
    for (const kind of ['clock-forward', 'clock-backward', 'timezone', 'dst']) {
      const before = await window();
      process.stderr.write(
        'Capture ready for expressly authorized ' +
          kind +
          ' transition; preserve original system state.\n'
      );
      const during = await window(await waitFor((value) => changed(kind, value, before[0])));
      process.stderr.write(
        'Sustained ' + kind + ' observed; restore original time, zone and DST state.\n'
      );
      const after = await window(await waitFor((value) => restored(value, before[0])));
      transitions.push({ kind, before, during, after });
    }
    restoredAll = true;
    const exit = await owned.stop();
    if (exit.exitCode !== 0 || exit.signal !== null) throw fail('source-exit-control-unproved');
    const absence = await observe();
    if (absence.status !== 'absent') throw fail('source-absence-control-unproved');
    controls = {
      ...base.controls,
      live: original,
      exit,
      absence: { pid: absence.pid, status: absence.status },
      cleanup: { childExited: true, restoration: 'verified' },
    };
  } finally {
    const obligations = [];
    if (!restoredAll)
      obligations.push({ kind: 'registered-host-state-restoration-unproved', latest });
    try {
      const exit = await owned.stop();
      if (exit.exitCode !== 0 || exit.signal !== null) obligations.push(...owned.obligations());
    } catch {
      obligations.push(...owned.obligations());
    }
    if (obligations.length) throw fail('source-capture-cleanup-unproved', obligations);
  }
  if (
    process.platform === 'linux' &&
    readFileSync('/proc/sys/kernel/random/boot_id', 'utf8').trim() !== base.boot.before
  )
    throw fail('source-capture-boot-changed');
  if (
    (await identity.observeExecutionHostIdentity(context)) !== base.hostId ||
    processSourceRecordDigest(await identity.observeProcessSourceContext(context)) !==
      processSourceRecordDigest(base.scope.probe)
  )
    throw fail('source-capture-context-changed');
  await inspectInstalledCandidateSource({
    installation: options.installation,
    packagePath: options.packagePath,
  });
  remaining(context);
  return Object.freeze({
    verified: false,
    controls,
    boot: base.boot,
    scope: base.scope,
    hostId: base.hostId,
    transitions,
  });
}
