// Test-only executable substitution. No registry, broker, authority, or IPC mock.
import childProcess from 'node:child_process';
import { syncBuiltinESMExports } from 'node:module';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const driver = fileURLToPath(new URL('./claude.mjs', import.meta.url));
for (const method of ['spawn', 'execFile', 'execFileSync']) {
  const original = childProcess[method];
  childProcess[method] = function (file, args, ...rest) {
    const executable = file === 'claude' ? process.execPath : file;
    if (
      process.platform === 'win32' &&
      process.env.APR_OFFLINE_WINDOWS_GROUP &&
      path.basename(executable).toLowerCase() === 'node.exe'
    ) {
      const protectedNodes = JSON.parse(process.env.APR_OFFLINE_WINDOWS_NODES);
      if (
        !protectedNodes.some(
          (node) => path.resolve(node).toLowerCase() === path.resolve(executable).toLowerCase()
        )
      )
        throw new Error('Offline fixture refused an unprotected Node executable');
    }
    return file === 'claude'
      ? original.call(this, process.execPath, [driver, ...args], ...rest)
      : original.call(this, file, args, ...rest);
  };
}
childProcess.execFile[promisify.custom] = (file, args, options) =>
  new Promise((resolve, reject) => {
    childProcess.execFile(file, args, options, (error, stdout, stderr) => {
      if (error) {
        error.stdout = stdout;
        error.stderr = stderr;
        reject(error);
      } else resolve({ stdout, stderr });
    });
  });
syncBuiltinESMExports();
