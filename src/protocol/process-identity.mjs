import { execFile as nodeExecFile } from 'node:child_process';
import { lstatSync, readFileSync } from 'node:fs';
import os from 'node:os';
import { promisify } from 'node:util';

const execFileAsync = promisify(nodeExecFile);
const MAC_SYSCTL = '/usr/sbin/sysctl';
const MAC_PS = '/bin/ps';
const WINDOWS_POWERSHELL = 'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe';

function base(host, pid) {
  return { host, pid };
}

function unknown(host, pid, reason) {
  return Object.freeze({ status: 'unknown', ...base(host, pid), reason });
}

function canonicalExecutable(file, lstat) {
  try {
    const metadata = lstat(file);
    return metadata.isFile() && !metadata.isSymbolicLink();
  } catch {
    return false;
  }
}

function linuxProcessStart(stat) {
  const close = String(stat).lastIndexOf(')');
  if (close < 0) return null;
  const fields = String(stat)
    .slice(close + 1)
    .trim()
    .split(/\s+/u);
  return fields.length > 19 && /^\d+$/u.test(fields[19]) ? fields[19] : null;
}

async function observeLinux({ pid, host, readFile }) {
  let bootId;
  try {
    bootId = String(readFile('/proc/sys/kernel/random/boot_id', 'utf8')).trim();
    if (!bootId) return unknown(host, pid, 'identity-unavailable');
  } catch {
    return unknown(host, pid, 'identity-unavailable');
  }
  let stat;
  try {
    stat = readFile(`/proc/${pid}/stat`, 'utf8');
  } catch (error) {
    if (error?.code === 'ENOENT' || error?.code === 'ESRCH') {
      return Object.freeze({ status: 'dead', ...base(host, pid) });
    }
    return unknown(host, pid, 'identity-unavailable');
  }
  const processStart = linuxProcessStart(stat);
  if (!processStart) return unknown(host, pid, 'identity-unavailable');
  return Object.freeze({
    status: 'live',
    ...base(host, pid),
    boot_id: bootId,
    process_start: processStart,
  });
}

async function observeDarwin({ pid, host, lstat, execFile }) {
  if (!canonicalExecutable(MAC_SYSCTL, lstat) || !canonicalExecutable(MAC_PS, lstat)) {
    return unknown(host, pid, 'probe-unavailable');
  }
  try {
    const boot = await execFile(MAC_SYSCTL, ['-n', 'kern.boottime'], {
      shell: false,
      encoding: 'utf8',
    });
    const bootMatch = String(boot?.stdout ?? boot).match(/sec\s*=\s*(\d+)/u);
    if (!bootMatch) return unknown(host, pid, 'identity-unavailable');
    const started = await execFile(MAC_PS, ['-o', 'lstart=', '-p', String(pid)], {
      shell: false,
      encoding: 'utf8',
    });
    const processStartText = String(started?.stdout ?? started).trim();
    if (!processStartText) return Object.freeze({ status: 'dead', ...base(host, pid) });
    const parsedStart = /^\d+$/u.test(processStartText)
      ? Number(processStartText)
      : Math.floor(Date.parse(processStartText) / 1000);
    if (!Number.isFinite(parsedStart)) return unknown(host, pid, 'identity-unavailable');
    return Object.freeze({
      status: 'live',
      ...base(host, pid),
      boot_id: `epoch:${bootMatch[1]}`,
      process_start: `epoch:${parsedStart}`,
    });
  } catch (error) {
    if (error?.code === 'ESRCH' || error?.code === 'ENOENT') {
      return Object.freeze({ status: 'dead', ...base(host, pid) });
    }
    return unknown(host, pid, 'identity-unavailable');
  }
}

async function observeWindows({ pid, host, lstat, execFile, powershellPath }) {
  if (!canonicalExecutable(powershellPath, lstat)) return unknown(host, pid, 'probe-unavailable');
  const script = [
    `$p=Get-CimInstance Win32_Process -Filter \"ProcessId=${pid}\"`,
    'if ($null -eq $p) { exit 3 }',
    '$o=Get-CimInstance Win32_OperatingSystem',
    '[Console]::Out.Write((@{boot=$o.LastBootUpTime.ToUniversalTime().ToString("o");start=$p.CreationDate.ToUniversalTime().ToString("o")} | ConvertTo-Json -Compress))',
  ].join('; ');
  try {
    const result = await execFile(
      powershellPath,
      ['-NoLogo', '-NoProfile', '-NonInteractive', '-Command', script],
      { shell: false, encoding: 'utf8' }
    );
    const parsed = JSON.parse(String(result?.stdout ?? result));
    if (typeof parsed.boot !== 'string' || typeof parsed.start !== 'string') {
      return unknown(host, pid, 'identity-unavailable');
    }
    return Object.freeze({
      status: 'live',
      ...base(host, pid),
      boot_id: parsed.boot,
      process_start: parsed.start,
    });
  } catch (error) {
    if (error?.code === 3 || error?.exitCode === 3) {
      return Object.freeze({ status: 'dead', ...base(host, pid) });
    }
    return unknown(host, pid, 'identity-unavailable');
  }
}

export async function observeProcessIdentity({
  pid = process.pid,
  platform = process.platform,
  hostname = os.hostname(),
  readFile = readFileSync,
  lstat = lstatSync,
  execFile = execFileAsync,
  powershellPath = WINDOWS_POWERSHELL,
} = {}) {
  if (!Number.isSafeInteger(pid) || pid <= 0 || typeof hostname !== 'string' || !hostname.trim()) {
    return unknown(String(hostname || ''), pid, 'identity-invalid');
  }
  const host = hostname.trim();
  if (platform === 'linux') return observeLinux({ pid, host, readFile });
  if (platform === 'darwin') return observeDarwin({ pid, host, lstat, execFile });
  if (platform === 'win32') {
    return observeWindows({ pid, host, lstat, execFile, powershellPath });
  }
  return unknown(host, pid, 'platform-unsupported');
}
