import { execFileSync } from 'node:child_process';
import { realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export function protectWindowsRuntime(executable) {
  const group = process.env.APR_OFFLINE_WINDOWS_GROUP;
  if (process.platform !== 'win32' || !group) return;
  execFileSync(
    'pwsh',
    [
      '-NoProfile',
      '-File',
      fileURLToPath(new URL('./windows-offline.ps1', import.meta.url)),
      '-Mode',
      'block',
      '-Group',
      group,
      '-Program',
      executable,
    ],
    { stdio: 'pipe', timeout: 30_000 }
  );
  // The firewall operation must succeed before this executable is admitted.
  // The mandatory network probe below independently proves the actual denial.
  const protectedNodes = JSON.parse(process.env.APR_OFFLINE_WINDOWS_NODES ?? '[]');
  process.env.APR_OFFLINE_WINDOWS_NODES = JSON.stringify([
    ...new Set([...protectedNodes, realpathSync(executable)]),
  ]);
  execFileSync(
    executable,
    [fileURLToPath(new URL('./assert-network.mjs', import.meta.url)), 'blocked'],
    {
      stdio: 'pipe',
      timeout: 10_000,
    }
  );
}
