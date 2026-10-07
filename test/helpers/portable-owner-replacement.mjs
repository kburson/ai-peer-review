// @story #178
// Stock-OS test-owned replacement, preserving a retained destination descriptor.
import { rename } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
const execute = promisify(execFile);
export async function replaceFixtureFile(source, target, context) {
  if (process.platform !== 'win32') return rename(source, target);
  const script = String.raw`$ErrorActionPreference='Stop';$ProgressPreference='SilentlyContinue';[Console]::InputEncoding=[System.Text.UTF8Encoding]::new($false);[Console]::OutputEncoding=[System.Text.UTF8Encoding]::new($false);$p=[Console]::In.ReadToEnd()|ConvertFrom-Json;[System.IO.File]::Replace([string]$p.source,[string]$p.target,[System.Management.Automation.Language.NullString]::Value,$false)`;
  const result = execute(
    'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe',
    [
      '-NoLogo',
      '-NoProfile',
      '-NonInteractive',
      '-EncodedCommand',
      Buffer.from(script, 'utf16le').toString('base64'),
    ],
    {
      encoding: 'utf8',
      windowsHide: true,
      signal: context.signal,
      timeout: Math.max(1, Math.ceil(context.deadline - performance.now())),
    }
  );
  result.child.stdin.end(JSON.stringify({ source, target }));
  await result;
}
