// cspell:ignore statfs mountinfo hidepid ioreg IOREG
import { execFile as nodeExecFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { lstatSync, readFileSync, readlinkSync, realpathSync, statfsSync } from 'node:fs';
import os from 'node:os';
import { promisify } from 'node:util';
import {
  loadProcessSourceAssurance,
  isInstalledProcessSourceAssurance,
  revalidateInstalledProcessSourceAssurance,
  parseCreationStamp,
  assessOriginalProcess,
} from './process-source-assurance.mjs';
import { parseRawJson } from '../api/canonical-json.mjs';

const execFileAsync = promisify(nodeExecFile);
const MAC_PS = '/bin/ps';
const WINDOWS_POWERSHELL = 'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe';
const BOOT = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/u;
const observations = new WeakMap();
const WINDOWS_SCRIPT = [
  "$ErrorActionPreference='Stop'",
  "$ProgressPreference='SilentlyContinue'",
  "$env:PSModulePath='C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\Modules'",
  '[Console]::OutputEncoding=New-Object System.Text.UTF8Encoding($false)',
  '$id=[int]::Parse($env:APR_PROCESS_PID,[Globalization.CultureInfo]::InvariantCulture)',
  "if ($id -le 0) { throw 'invalid-pid' }",
  "$rows=@(Get-CimInstance -ClassName Win32_Process -Filter ('ProcessId='+$id) -ErrorAction Stop)",
  "if ($rows.Count -gt 1) { throw 'query-cardinality' }",
  '$present=($rows.Count -eq 1)',
  '$stamp=$null',
  "if ($present) { if ([int]$rows[0].ProcessId -ne $id) { throw 'query-pid' }; $stamp=$rows[0].CreationDate.ToUniversalTime().ToString('yyyy-MM-ddTHH:mm:ss.fffffffZ',[Globalization.CultureInfo]::InvariantCulture) }",
  "[Console]::Out.Write((@{schema='ai-peer-review.process-probe/v1';completed=$true;pid=$id;present=$present;start=$stamp} | ConvertTo-Json -Compress))",
].join('; ');

function unknown(host, pid, reason = 'identity-unavailable') {
  return Object.freeze({ status: 'unknown', host, pid, reason });
}
function inBudget(signal, deadline) {
  return (
    !signal?.aborted &&
    (deadline === undefined || (Number.isFinite(deadline) && performance.now() < deadline))
  );
}
function canonicalExecutable(file, lstat = lstatSync) {
  try {
    const metadata = lstat(file);
    return metadata.isFile() && !metadata.isSymbolicLink();
  } catch {
    return false;
  }
}
function linuxStart(stat, pid) {
  const match = /^(\d+) \(/u.exec(stat);
  const close = String(stat).lastIndexOf(')');
  if (!match || Number(match[1]) !== pid || close < 0) return null;
  const fields = String(stat)
    .slice(close + 1)
    .trim()
    .split(/\s+/u);
  return fields.length > 19 && /^(?:0|[1-9]\d{0,29})$/u.test(fields[19]) ? fields[19] : null;
}
function expectedProbe(platform) {
  return {
    linux: {
      path: '/proc',
      visibility: 'full-pid-namespace',
      errorContract: 'exact-pid-directory-v1',
    },
    darwin: {
      path: MAC_PS,
      visibility: 'same-user-full-selection',
      errorContract: 'exact-ps-selection-v1',
    },
    win32: {
      path: WINDOWS_POWERSHELL,
      visibility: 'local-cim-query',
      errorContract: 'completed-cim-query-v1',
    },
  }[platform];
}
function matchesProbe(platform, probe) {
  const expected = expectedProbe(platform);
  return (
    expected &&
    probe &&
    typeof probe.version === 'string' &&
    probe.version.length > 0 &&
    Object.keys(expected).every((key) => probe[key] === expected[key])
  );
}

// Read-only actual context. A caller-supplied object never replaces this probe.
export async function observeProcessSourceContext({ signal, deadline } = {}) {
  if (!inBudget(signal, deadline)) return null;
  try {
    const platform = process.platform;
    const expected = expectedProbe(platform);
    if (!expected) return null;
    if (platform === 'linux') {
      if (Number(statfsSync('/proc').type) !== 0x9fa0 || realpathSync('/proc') !== '/proc')
        return null;
      const mounts = readFileSync('/proc/self/mountinfo', 'utf8')
        .split('\n')
        .filter((line) => line.split(' ')[4] === '/proc');
      if (mounts.length !== 1) return null;
      const parts = mounts[0].split(' - ');
      if (
        parts.length !== 2 ||
        parts[1].split(' ')[0] !== 'proc' ||
        mounts[0].split(' ')[3] !== '/'
      )
        return null;
      const opts = parts[0].split(' ')[5] + ',' + parts[1].split(' ')[2];
      if (/(?:^|,)hidepid=(?!0(?:,|$))|(?:^|,)subset=pid(?:,|$)/u.test(opts)) return null;
      const own = readFileSync('/proc/self/status', 'utf8').match(/^Pid:\s+(\d+)$/mu);
      if (
        !own ||
        Number(own[1]) !== process.pid ||
        readlinkSync('/proc/self/ns/pid') !== readlinkSync('/proc/1/ns/pid')
      )
        return null;
      const boot = readFileSync('/proc/sys/kernel/random/boot_id', 'utf8').trim();
      if (!BOOT.test(boot)) return null;
      return Object.freeze({ ...expected, version: 'procfs-v1' });
    }
    const probePath = expected.path;
    if (
      !canonicalExecutable(probePath) ||
      realpathSync(probePath).toLowerCase() !== probePath.toLowerCase()
    )
      return null;
    if (platform === 'win32' && String(process.env.SystemRoot).toLowerCase() !== 'c:\\windows')
      return null;
    const bytes =
      process.platform === 'darwin'
        ? Buffer.concat([readFileSync(probePath), readFileSync('/usr/sbin/ioreg')])
        : readFileSync(probePath);
    return Object.freeze({
      ...expected,
      version: 'sha256:' + createHash('sha256').update(bytes).digest('hex'),
    });
  } catch {
    return null;
  }
}

export function linuxExecutionHostBinding({ machineId, bootId, pidNamespace, timeNamespace } = {}) {
  if (
    typeof machineId !== 'string' ||
    !/^[a-f0-9]{32}$/u.test(machineId) ||
    /^0+$/u.test(machineId) ||
    !BOOT.test(bootId) ||
    typeof pidNamespace !== 'string' ||
    !/^pid:\[\d+\]$/u.test(pidNamespace) ||
    typeof timeNamespace !== 'string' ||
    !/^time:\[\d+\]$/u.test(timeNamespace)
  )
    return null;
  return (
    'sha256:' +
    createHash('sha256')
      .update('linux:' + machineId + ':' + bootId + ':' + pidNamespace + ':' + timeNamespace)
      .digest('hex')
  );
}

const MAC_IOREG = '/usr/sbin/ioreg';
const HOST_SCRIPT = [
  "$ErrorActionPreference='Stop'",
  "$ProgressPreference='SilentlyContinue'",
  "$env:PSModulePath='C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\Modules'",
  '[Console]::OutputEncoding=New-Object System.Text.UTF8Encoding($false)',
  '$rows=@(Get-CimInstance -ClassName Win32_ComputerSystemProduct -ErrorAction Stop)',
  "if ($rows.Count -ne 1) { throw 'host-cardinality' }",
  '[Console]::Out.Write((@{completed=$true;uuid=[string]$rows[0].UUID} | ConvertTo-Json -Compress))',
].join('; ');

// Opaque binding only, not host-restart/boot-epoch or descendant conformance.
// Cloned/unsupported identities remain a C5 finite-scope acceptance concern.
export async function observeExecutionHostIdentity(options = {}) {
  if (
    Object.keys(options).some((key) => !['signal', 'deadline'].includes(key)) ||
    !inBudget(options.signal, options.deadline)
  )
    return null;
  try {
    let identifier;
    const qualifier = '';
    if (process.platform === 'linux') {
      identifier = readFileSync('/etc/machine-id', 'utf8').trim();
      if (!/^[a-f0-9]{32}$/u.test(identifier) || /^0+$/u.test(identifier)) return null;
      const boot = readFileSync('/proc/sys/kernel/random/boot_id', 'utf8').trim();
      if (!BOOT.test(boot)) return null;
      const binding = linuxExecutionHostBinding({
        machineId: identifier,
        bootId: boot,
        pidNamespace: readlinkSync('/proc/self/ns/pid'),
        timeNamespace: readlinkSync('/proc/self/ns/time'),
      });
      return inBudget(options.signal, options.deadline) ? binding : null;
    } else if (process.platform === 'darwin') {
      if (!canonicalExecutable(MAC_IOREG) || realpathSync(MAC_IOREG) !== MAC_IOREG) return null;
      const result = await execFileAsync(
        MAC_IOREG,
        ['-rd1', '-c', 'IOPlatformExpertDevice'],
        execOptions(options)
      );
      if (result.stderr !== '') return null;
      const matches = [...result.stdout.matchAll(/"IOPlatformUUID"\s*=\s*"([a-fA-F0-9-]{36})"/gu)];
      if (matches.length !== 1) return null;
      identifier = matches[0][1].toLowerCase();
      if (!BOOT.test(identifier) || identifier === '00000000-0000-0000-0000-000000000000')
        return null;
    } else if (process.platform === 'win32') {
      if (
        !canonicalExecutable(WINDOWS_POWERSHELL) ||
        String(process.env.SystemRoot).toLowerCase() !== 'c:\\windows'
      )
        return null;
      const result = await execFileAsync(
        WINDOWS_POWERSHELL,
        [
          '-NoLogo',
          '-NoProfile',
          '-NonInteractive',
          '-EncodedCommand',
          Buffer.from(HOST_SCRIPT, 'utf16le').toString('base64'),
        ],
        execOptions(options, {
          ...process.env,
          PSModulePath: 'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\Modules',
        })
      );
      if (result.stderr !== '') return null;
      const record = parseRawJson(result.stdout);
      if (
        !record ||
        Object.keys(record).sort().join(',') !== 'completed,uuid' ||
        record.completed !== true ||
        typeof record.uuid !== 'string'
      )
        return null;
      identifier = record.uuid.toLowerCase();
      if (!BOOT.test(identifier) || identifier === '00000000-0000-0000-0000-000000000000')
        return null;
    } else return null;
    if (!inBudget(options.signal, options.deadline)) return null;
    return (
      'sha256:' +
      createHash('sha256')
        .update(process.platform + ':' + identifier + ':' + qualifier)
        .digest('hex')
    );
  } catch {
    return null;
  }
}

function execOptions({ signal, deadline }, env = process.env) {
  if (!inBudget(signal, deadline)) throw new Error('observation-budget');
  const remaining =
    deadline === undefined ? 15000 : Math.min(15000, Math.ceil(deadline - performance.now()));
  return {
    shell: false,
    encoding: 'utf8',
    signal,
    timeout: Math.max(1, remaining),
    maxBuffer: 64 * 1024,
    env,
  };
}

// Explicit parser/test core. Its results are always data and never registered
// as production observations, even with perfect fixture-shaped class metadata.
export async function observeProcessIdentityCore({
  pid,
  platform,
  hostname,
  probeObservation,
  readFile = readFileSync,
  lstat = lstatSync,
  execFile = execFileAsync,
  signal,
  deadline,
} = {}) {
  const host = typeof hostname === 'string' ? hostname.trim() : '';
  if (!host || !Number.isSafeInteger(pid) || pid <= 0)
    return unknown(host, pid, 'identity-invalid');
  if (!inBudget(signal, deadline)) return unknown(host, pid, 'observation-budget');
  if (!matchesProbe(platform, probeObservation)) return unknown(host, pid, 'probe-unclassified');
  try {
    if (platform === 'linux') {
      const bootId = String(readFile('/proc/sys/kernel/random/boot_id', 'utf8')).trim();
      if (!BOOT.test(bootId)) return unknown(host, pid);
      try {
        const directory = lstat('/proc/' + pid);
        if (!directory.isDirectory() || directory.isSymbolicLink()) return unknown(host, pid);
      } catch (error) {
        if (error?.code !== 'ENOENT') return unknown(host, pid);
        if (!inBudget(signal, deadline)) return unknown(host, pid, 'observation-budget');
        // Repeat only the exact directory lookup; a stat-file miss is never used.
        try {
          lstat('/proc/' + pid);
          return unknown(host, pid);
        } catch (again) {
          if (again?.code !== 'ENOENT') return unknown(host, pid);
          return Object.freeze({ status: 'absent', host, pid, boot_id: bootId, verified: false });
        }
      }
      const stamp = linuxStart(String(readFile('/proc/' + pid + '/stat', 'utf8')), pid);
      const creation = parseCreationStamp({
        value: stamp,
        semantics: 'linux-start-ticks-v1',
        bootId,
      });
      if (!creation || !inBudget(signal, deadline)) return unknown(host, pid);
      return Object.freeze({
        status: 'live',
        host,
        pid,
        boot_id: bootId,
        process_start: stamp,
        creation,
        verified: false,
      });
    }
    const file = platform === 'darwin' ? MAC_PS : WINDOWS_POWERSHELL;
    if (!canonicalExecutable(file, lstat)) return unknown(host, pid, 'probe-unavailable');
    if (platform === 'darwin') {
      let selected;
      try {
        selected = await execFile(
          file,
          ['-p', String(pid), '-o', 'pid=,lstart='],
          execOptions({ signal, deadline }, { ...process.env, LC_ALL: 'C', LANG: 'C', TZ: 'UTC' })
        );
      } catch (error) {
        if (
          error?.code === 1 &&
          error.stdout === '' &&
          error.stderr === '' &&
          !error.killed &&
          !error.signal &&
          inBudget(signal, deadline)
        )
          return Object.freeze({ status: 'absent', host, pid, verified: false });
        return unknown(host, pid);
      }
      if (!inBudget(signal, deadline) || selected.stderr !== '') return unknown(host, pid);
      const match = /^\s*(\d+)\s+([^\r\n]+)\s*$/u.exec(selected.stdout);
      if (!match || Number(match[1]) !== pid) return unknown(host, pid);
      const creation = parseCreationStamp({
        value: match[2].trim(),
        semantics: 'darwin-lstart-utc-v1',
      });
      if (!creation) return unknown(host, pid);
      return Object.freeze({ status: 'live', host, pid, creation, verified: false });
    }
    const result = await execFile(
      file,
      [
        '-NoLogo',
        '-NoProfile',
        '-NonInteractive',
        '-EncodedCommand',
        Buffer.from(WINDOWS_SCRIPT, 'utf16le').toString('base64'),
      ],
      execOptions(
        { signal, deadline },
        {
          ...process.env,
          APR_PROCESS_PID: String(pid),
          PSModulePath: 'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\Modules',
        }
      )
    );
    if (!inBudget(signal, deadline) || result.stderr !== '') return unknown(host, pid);
    const parsed = parseRawJson(result.stdout);
    if (
      !parsed ||
      Object.keys(parsed).sort().join(',') !== 'completed,pid,present,schema,start' ||
      parsed.schema !== 'ai-peer-review.process-probe/v1' ||
      parsed.completed !== true ||
      parsed.pid !== pid ||
      typeof parsed.present !== 'boolean'
    )
      return unknown(host, pid);
    if (!parsed.present)
      return parsed.start === null
        ? Object.freeze({ status: 'absent', host, pid, verified: false })
        : unknown(host, pid);
    const creation = parseCreationStamp({ value: parsed.start, semantics: 'windows-utc-v1' });
    if (!creation) return unknown(host, pid);
    return Object.freeze({ status: 'live', host, pid, creation, verified: false });
  } catch {
    return unknown(host, pid);
  }
}

export async function observeOriginalProcess({ pid = process.pid, signal, deadline } = {}) {
  const host = os.hostname();
  if (!Number.isSafeInteger(pid) || pid <= 0) return unknown(host, pid, 'identity-invalid');
  const assurance = await loadProcessSourceAssurance({ signal, deadline });
  if (
    !isInstalledProcessSourceAssurance(assurance) ||
    (assurance.absence.status !== 'available' && assurance.creation.status !== 'available')
  )
    return unknown(host, pid, 'source-class-unavailable');
  const probeObservation = await observeProcessSourceContext({ signal, deadline });
  if (
    !probeObservation ||
    Object.keys(probeObservation).some(
      (key) => probeObservation[key] !== assurance.probeObservation[key]
    )
  )
    return unknown(host, pid, 'source-class-unavailable');
  const executionHost = await observeExecutionHostIdentity({ signal, deadline });
  if (!executionHost) return unknown(host, pid, 'source-class-unavailable');
  const observed = await observeProcessIdentityCore({
    pid,
    platform: process.platform,
    hostname: executionHost,
    probeObservation,
    signal,
    deadline,
  });
  if (observed.status === 'unknown') return observed;
  const creationSource =
    assurance.creation.status === 'available'
      ? Object.freeze(
          Object.fromEntries(
            ['classId', 'contractDigest', 'approvalDigest', 'precision'].map((key) => [
              key,
              assurance.creation[key],
            ])
          )
        )
      : undefined;
  const outcome = Object.freeze({
    ...observed,
    verified: true,
    assurance,
    ...(creationSource ? { creationSource } : {}),
  });
  observations.set(outcome, { assurance, signal, deadline });
  return outcome;
}

// The observation must have been produced here from actual installed material.
// Copied JSON or fixture records cannot discharge an original process.
export async function reconcileOriginalProcess({ original, observation } = {}) {
  const registration = observations.get(observation);
  if (!registration || !inBudget(registration.signal, registration.deadline))
    return unknown(original?.host ?? '', original?.pid, 'source-class-unavailable');
  if (
    !(await revalidateInstalledProcessSourceAssurance(registration.assurance, {
      signal: registration.signal,
      deadline: registration.deadline,
    }))
  )
    return unknown(original?.host ?? '', original?.pid, 'source-class-unavailable');
  const actualHost = await observeExecutionHostIdentity({
    signal: registration.signal,
    deadline: registration.deadline,
  });
  if (!actualHost || actualHost !== observation.host)
    return unknown(original?.host ?? '', original?.pid, 'source-class-unavailable');
  const candidate = assessOriginalProcess({
    original,
    observation,
    assurance: registration.assurance,
  });
  if (['absent', 'different-process'].includes(candidate.candidate))
    return Object.freeze({
      status: 'dead',
      host: original.host,
      pid: original.pid,
      reason: candidate.candidate,
      scope: 'original-process-only',
    });
  return Object.freeze({
    status: candidate.candidate === 'same-or-overlapping' ? 'live' : 'unknown',
    host: original?.host,
    pid: original?.pid,
    reason: 'creation-stamp-unavailable',
  });
}

export async function observeProcessIdentity(options = {}) {
  const pid = options.pid ?? process.pid;
  const host = os.hostname();
  // Legacy injection surface refuses rather than accidentally conferring trust.
  if (Object.keys(options).some((key) => !['pid', 'signal', 'deadline', 'original'].includes(key)))
    return unknown(host, pid, 'source-class-unavailable');
  const observed = await observeOriginalProcess(options);
  if (options.original)
    return reconcileOriginalProcess({ original: options.original, observation: observed });
  if (observed.status === 'absent' && observed.assurance.absence.status === 'available')
    return Object.freeze({ status: 'dead', host, pid, reason: 'process-absent' });
  // The old lock consumer compares raw strings. Until C6 integrates the
  // interval seam, do not expose another-process live stamps to that consumer.
  return observed.status === 'unknown'
    ? observed
    : unknown(host, pid, 'creation-stamp-unavailable');
}
