// cspell:words localtime zoneinfo
// @story #170
// Read-only actual OS zone and UTC/monotonic observation; no clock mutation.
import { execFile } from 'node:child_process';
import { realpathSync, lstatSync } from 'node:fs';
import { promisify } from 'node:util';
import { parseRawJson } from '../../../src/api/canonical-json.mjs';

const execute = promisify(execFile);
const POWERSHELL = 'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe';
export async function observeSystemClockCore(options = {}) {
  if (
    !options ||
    Object.getPrototypeOf(options) !== Object.prototype ||
    Object.keys(options).some((key) => !['signal', 'deadline'].includes(key))
  )
    throw Error('clock-observation-options');
  const signal = options.signal ?? new AbortController().signal;
  const deadline = options.deadline ?? performance.now() + 5000;
  const timeout = () => {
    if (
      !(signal instanceof AbortSignal) ||
      signal.aborted ||
      !Number.isFinite(deadline) ||
      deadline <= performance.now()
    )
      throw Error('clock-observation-budget');
    return {
      signal,
      timeout: Math.max(1, Math.min(5000, Math.floor(deadline - performance.now()))),
      encoding: 'utf8',
    };
  };
  timeout();
  let zone, dst;
  if (process.platform === 'win32') {
    if (
      String(process.env.SystemRoot).toLowerCase() !== 'c:\\windows' ||
      !lstatSync(POWERSHELL).isFile() ||
      lstatSync(POWERSHELL).isSymbolicLink() ||
      realpathSync(POWERSHELL).toLowerCase() !== POWERSHELL.toLowerCase()
    )
      throw Error('clock-stock-probe-unproved');
    const script = [
      "$ErrorActionPreference='Stop'",
      "$ProgressPreference='SilentlyContinue'",
      "$env:PSModulePath='C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\Modules'",
      '[Console]::OutputEncoding=New-Object System.Text.UTF8Encoding($false)',
      '$zone=Get-TimeZone -ErrorAction Stop',
      '[Console]::Out.Write((@{zone=[string]$zone.Id;dst=[DateTime]::Now.IsDaylightSavingTime()} | ConvertTo-Json -Compress))',
    ].join('; ');
    const result = await execute(
      POWERSHELL,
      [
        '-NoLogo',
        '-NoProfile',
        '-NonInteractive',
        '-EncodedCommand',
        Buffer.from(script, 'utf16le').toString('base64'),
      ],
      timeout()
    );
    if (result.stderr !== '') throw Error('clock-zone-unproved');
    const value = parseRawJson(result.stdout);
    if (
      Object.keys(value).sort().join(',') !== 'dst,zone' ||
      typeof value.zone !== 'string' ||
      !value.zone ||
      typeof value.dst !== 'boolean'
    )
      throw Error('clock-zone-unproved');
    ({ zone, dst } = value);
  } else {
    const env = { ...process.env };
    delete env.TZ;
    // Observe the OS default independently of optional /etc/timezone files.
    const observed = await execute(
      realpathSync(process.execPath),
      ['-e', 'process.stdout.write(Intl.DateTimeFormat().resolvedOptions().timeZone);'],
      { ...timeout(), env }
    );
    zone = observed.stdout;
    if (observed.stderr !== '' || !zone || zone.length > 128 || /[\r\n]/u.test(zone))
      throw Error('clock-zone-unproved');
    const perl = '/usr/bin/perl';
    if (!lstatSync(perl).isFile() || lstatSync(perl).isSymbolicLink())
      throw Error('clock-stock-probe-unproved');
    const result = await execute(perl, ['-e', 'print((localtime)[8]);'], {
      ...timeout(),
      env,
    });
    if (result.stderr !== '' || !/^[01]$/u.test(result.stdout)) throw Error('clock-dst-unproved');
    dst = result.stdout === '1';
  }
  timeout();
  const monotonicNs = process.hrtime.bigint();
  const utcNs = BigInt(Date.now()) * 1000000n;
  return Object.freeze({
    verified: false,
    monotonicNs: String(monotonicNs),
    utcNs: String(utcNs),
    zone,
    dst,
  });
}
