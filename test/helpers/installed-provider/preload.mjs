// Test-only executable substitution. No registry, broker, authority, or IPC mock.
import childProcess from 'node:child_process';
import { syncBuiltinESMExports } from 'node:module';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
const driver = fileURLToPath(new URL('./claude.mjs', import.meta.url));
for (const method of ['spawn', 'execFile', 'execFileSync']) {
  const original = childProcess[method];
  childProcess[method] = function (file, args, ...rest) {
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
