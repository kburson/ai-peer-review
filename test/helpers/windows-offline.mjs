import { execFileSync } from 'node:child_process';
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
  execFileSync(
    executable,
    [fileURLToPath(new URL('./assert-network.mjs', import.meta.url)), 'blocked'],
    {
      stdio: 'pipe',
      timeout: 10_000,
    }
  );
}
