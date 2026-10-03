import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

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

// All installed fixtures consume the same actual runtime-only tarball as release CI.
export function runRuntimePack(args, options = {}) {
  const root = options.cwd ?? fileURLToPath(new URL('../..', import.meta.url));
  return execFileSync(
    process.execPath,
    [path.join(root, 'scripts/pack-runtime.mjs'), ...args],
    options
  );
}

export function parseNpmPackOutput(output, { expectedPackageName, requireFilename = false } = {}) {
  if (typeof expectedPackageName !== 'string' || expectedPackageName.trim() === '') {
    throw new TypeError('expectedPackageName must be a non-empty string');
  }

  let parsed;
  try {
    parsed = JSON.parse(output);
  } catch (cause) {
    throw new Error('Invalid npm pack JSON', { cause });
  }

  let report;
  if (Array.isArray(parsed)) {
    if (parsed.length !== 1) {
      throw new Error(`Expected exactly one npm pack report, received ${parsed.length}`);
    }
    [report] = parsed;
  } else if (parsed !== null && typeof parsed === 'object') {
    const packageNames = Object.keys(parsed);
    if (packageNames.length !== 1) {
      throw new Error(`Expected exactly one npm pack report, received ${packageNames.length}`);
    }
    const [packageName] = packageNames;
    if (packageName !== expectedPackageName) {
      throw new Error(
        `Expected npm pack report for ${expectedPackageName}, received ${packageName}`
      );
    }
    report = parsed[packageName];
  } else {
    throw new TypeError('Expected npm pack JSON to be an array or package-keyed object');
  }

  if (report === null || typeof report !== 'object' || Array.isArray(report)) {
    throw new TypeError('npm pack report must be an object');
  }
  if (report.name !== expectedPackageName) {
    throw new Error(
      `Expected packed package name ${expectedPackageName}, received ${String(report.name)}`
    );
  }
  if (!Array.isArray(report.files)) {
    throw new TypeError('npm pack report files must be an array');
  }
  if (requireFilename && (typeof report.filename !== 'string' || report.filename.trim() === '')) {
    throw new TypeError('npm pack report filename must be a non-empty string');
  }
  return report;
}
