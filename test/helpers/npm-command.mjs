import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';

function cliPath(tool) {
  const invoked = process.env.npm_execpath;
  if (invoked) {
    return tool === 'npm' ? invoked : path.join(path.dirname(invoked), 'npx-cli.js');
  }
  if (process.platform === 'win32') {
    return path.join(
      path.dirname(process.execPath),
      'node_modules',
      'npm',
      'bin',
      `${tool}-cli.js`
    );
  }
  return null;
}

export function runNpm(tool, args, options = {}) {
  const cli = cliPath(tool);
  if (cli) {
    if (!existsSync(cli)) throw new Error(`${tool} CLI is unavailable at ${cli}`);
    return execFileSync(process.execPath, [cli, ...args], options);
  }
  return execFileSync(tool, args, options);
}
