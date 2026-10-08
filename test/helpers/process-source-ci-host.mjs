// cspell:words timedatectl
// @story #170
// Linux clock controls belong exclusively to the disposable hosted capture workflow.
import { execFileSync } from 'node:child_process';
import { observeSystemClockCore } from '../live/process-source/clock.mjs';
const fail = (code, obligations = []) => Object.assign(Error(code), { obligations });
const offset = (v) => BigInt(v.utcNs) - BigInt(v.monotonicNs);
function budget(context) {
  if (
    context.signal.aborted ||
    !Number.isFinite(context.deadline) ||
    performance.now() >= context.deadline
  )
    throw fail('ci-clock-budget');
  return Math.max(1, Math.min(10000, Math.floor(context.deadline - performance.now())));
}
function execute(context, command, args) {
  return execFileSync(command, args, {
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'pipe'],
    timeout: budget(context),
  }).trim();
}
const sudo = (context, command, args) =>
  execute(context, '/usr/bin/sudo', ['-n', command, ...args]);
const ntp = (context) => {
  const value = execute(context, '/usr/bin/timedatectl', ['show', '--property=NTP', '--value']);
  if (!['yes', 'no'].includes(value)) throw fail('ci-clock-service-unproved');
  return value;
};
const setNtp = (context, value) =>
  sudo(context, '/usr/bin/timedatectl', ['set-ntp', value === 'yes' ? 'true' : 'false']);
const setZone = (context, zone) => sudo(context, '/usr/bin/timedatectl', ['set-timezone', zone]);
function setTime(context, original, shift = 0n) {
  const now =
    BigInt(original.utcNs) + (process.hrtime.bigint() - BigInt(original.monotonicNs)) + shift;
  sudo(context, '/usr/bin/date', [
    '--set',
    '@' + String(now / 1000000000n) + '.' + String(now % 1000000000n).padStart(9, '0'),
  ]);
}
const systemZone = (context) => {
  const zone = execute(context, '/usr/bin/timedatectl', ['show', '--property=Timezone', '--value']);
  if (!/^[A-Za-z0-9_+.-]+(?:\/[A-Za-z0-9_+.-]+)*$/u.test(zone))
    throw fail('ci-clock-zone-unproved');
  return zone;
};
async function restore(context, original, originalNtp, originalZone) {
  const obligations = [];
  try {
    setTime(context, original);
  } catch {
    obligations.push('system-clock-restoration-unproved');
  }
  try {
    setZone(context, originalZone);
  } catch {
    obligations.push('system-zone-restoration-unproved');
  }
  try {
    setNtp(context, originalNtp);
  } catch {
    obligations.push('system-service-restoration-unproved');
  }
  try {
    const value = await observeSystemClockCore(context);
    const delta = offset(value) - offset(original);
    if (
      value.zone !== original.zone ||
      value.dst !== original.dst ||
      delta < -500000000n ||
      delta > 500000000n ||
      ntp(context) !== originalNtp ||
      systemZone(context) !== originalZone
    )
      obligations.push('system-state-restoration-unproved');
  } catch {
    obligations.push('system-state-restoration-unproved');
  }
  if (obligations.length) throw fail('ci-clock-restoration-unproved', obligations);
  return {
    verified: false,
    restoration: 'verified',
    zone: original.zone,
    networkTime: originalNtp,
    systemZone: originalZone,
  };
}
export async function initializeCiClockHost(options = {}) {
  if (
    !options ||
    Object.getPrototypeOf(options) !== Object.prototype ||
    Object.keys(options).length
  )
    throw fail('ci-clock-options');
  if (
    process.platform !== 'linux' ||
    process.env.GITHUB_ACTIONS !== 'true' ||
    process.env.RUNNER_ENVIRONMENT !== 'github-hosted' ||
    process.env.RUNNER_OS !== 'Linux' ||
    process.env.GITHUB_REPOSITORY !== 'kburson/ai-peer-review' ||
    process.env.GITHUB_WORKFLOW !== 'Process source conformance capture' ||
    !/^[0-9]+$/u.test(process.env.GITHUB_RUN_ID ?? '')
  )
    throw fail('ci-clock-host-unavailable');
  const prerequisiteContext = {
    signal: new AbortController().signal,
    deadline: performance.now() + 60000,
  };
  const original = await observeSystemClockCore(prerequisiteContext),
    originalNtp = ntp(prerequisiteContext),
    originalZone = systemZone(prerequisiteContext);
  let proven = false;
  try {
    setNtp(prerequisiteContext, 'no');
    if (ntp(prerequisiteContext) !== 'no') throw fail('ci-clock-service-unproved');
    setTime(prerequisiteContext, original, 2000000000n);
    const changed = await observeSystemClockCore(prerequisiteContext);
    const delta = offset(changed) - offset(original);
    if (delta < 1500000000n || delta > 2500000000n) throw fail('ci-clock-privilege-unproved');
    proven = true;
  } finally {
    await restore(prerequisiteContext, original, originalNtp, originalZone);
  }
  if (!proven) throw fail('ci-clock-privilege-unproved');
  let context,
    capturedOriginal,
    capturedNtp,
    capturedZone,
    baseline,
    finished = false;
  const active = () => {
    if (!context || finished) throw fail('ci-clock-session-unavailable');
    budget(context);
  };
  return Object.freeze({
    verified: false,
    prerequisites: 'privilege-and-restoration-observed',
    async begin(input) {
      if (
        context ||
        !input ||
        Object.keys(input).sort().join(',') !== 'deadline,signal' ||
        !(input.signal instanceof AbortSignal)
      )
        throw fail('ci-clock-session-invalid');
      context = input;
      budget(context);
      capturedOriginal = await observeSystemClockCore(context);
      capturedNtp = ntp(context);
      capturedZone = systemZone(context);
      setNtp(context, 'no');
      setZone(context, 'America/New_York');
      baseline = await observeSystemClockCore(context);
      if (ntp(context) !== 'no' || baseline.zone !== 'America/New_York')
        throw fail('ci-clock-baseline-unproved');
    },
    async apply(kind) {
      active();
      if (kind === 'clock-forward') setTime(context, baseline, 90000000000n);
      else if (kind === 'clock-backward') setTime(context, baseline, -90000000000n);
      else if (kind === 'timezone') setZone(context, 'America/Detroit');
      else if (kind === 'dst') {
        const year = new Date(Number(BigInt(baseline.utcNs) / 1000000n)).getUTCFullYear();
        const target = BigInt(Date.UTC(year, baseline.dst ? 0 : 6, 15, 12, 0, 0)) * 1000000n;
        setTime(context, baseline, target - BigInt(baseline.utcNs));
      } else throw fail('ci-clock-transition-invalid');
    },
    async restoreTransition() {
      active();
      setTime(context, baseline);
      setZone(context, baseline.zone);
      const current = await observeSystemClockCore(context);
      const delta = offset(current) - offset(baseline);
      if (
        delta < -500000000n ||
        delta > 500000000n ||
        current.zone !== baseline.zone ||
        current.dst !== baseline.dst
      )
        throw fail('ci-clock-transition-restoration-unproved');
    },
    async finish() {
      if (!context || !capturedOriginal) throw fail('ci-clock-session-unavailable');
      const result = await restore(context, capturedOriginal, capturedNtp, capturedZone);
      finished = true;
      return result;
    },
  });
}
