// cspell:words localtime zoneinfo
// @story #170
// Read-only actual OS zone and UTC/monotonic observation; no clock mutation.
import { execFile } from 'node:child_process';
import { readFileSync, realpathSync, lstatSync } from 'node:fs';
import { promisify } from 'node:util';
import { parseRawJson } from '../../../src/api/canonical-json.mjs';

const execute = promisify(execFile);
const POWERSHELL = 'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe';
export async function observeSystemClockCore(options = {}) {
  if (
    !options ||
    Object.getPrototypeOf(options) !== Object.prototype ||
    Object.keys(options).length
  )
    throw Error('clock-observation-options');
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
      { timeout: 5000, encoding: 'utf8' }
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
    const location = realpathSync('/etc/localtime');
    const marker = location.lastIndexOf('/zoneinfo/');
    zone = marker >= 0 ? location.slice(marker + 10) : readFileSync('/etc/timezone', 'utf8').trim();
    if (!zone || zone.length > 128) throw Error('clock-zone-unproved');
    const perl = '/usr/bin/perl';
    if (!lstatSync(perl).isFile() || lstatSync(perl).isSymbolicLink())
      throw Error('clock-stock-probe-unproved');
    const env = { ...process.env };
    delete env.TZ;
    const result = await execute(perl, ['-e', 'print((localtime)[8]);'], {
      env,
      encoding: 'utf8',
      timeout: 5000,
    });
    if (result.stderr !== '' || !/^[01]$/u.test(result.stdout)) throw Error('clock-dst-unproved');
    dst = result.stdout === '1';
  }
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
