// @story #137
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  cpSync,
  lstatSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
  mkdirSync,
} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const args = process.argv.slice(2);
let destination = process.cwd(),
  dryRun = false,
  json = false;
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--pack-destination' && args[i + 1]) destination = path.resolve(args[++i]);
  else if (args[i] === '--json') json = true;
  else if (args[i] === '--dry-run') dryRun = true;
  else if (args[i] !== '--ignore-scripts')
    throw new Error('Unsupported runtime pack argument: ' + args[i]);
}
const stage = mkdtempSync(path.join(os.tmpdir(), 'apr-runtime-stage-'));
try {
  const source = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8'));
  const files = source.files.filter(
    (entry) =>
      !['docs/', 'scripts/verify-extraction.mjs', 'scripts/verify-release.mjs'].includes(entry)
  );
  files.push(
    'docs/releases/',
    'docs/dependency-audit-mcp.md',
    'docs/dependency-audit-broker-build.md',
    'docs/manual-cross-provider-peer-review.md',
    'docs/claude-launch-api-migration.md',
    'docs/spdx-policy.md'
  );
  for (const relative of files) {
    const target = path.join(stage, relative);
    mkdirSync(path.dirname(target), { recursive: true });
    cpSync(path.join(root, relative), target, {
      recursive: true,
      dereference: false,
      filter: (name) => {
        if (lstatSync(name).isSymbolicLink())
          throw new Error('Runtime source contains a symbolic link: ' + name);
        return true;
      },
    });
  }
  const metadata = { ...source };
  delete metadata.devDependencies;
  delete metadata.scripts;
  delete metadata.files;
  const manifest = {
    ...metadata,
    scripts: {
      'build:broker-security': source.scripts['build:broker-security'],
      'verify:deployment': 'node bin/verify-deployment.mjs',
    },
    files: [...files, 'runtime-inventory.json'],
  };
  writeFileSync(path.join(stage, 'package.json'), JSON.stringify(manifest, null, 2) + '\n');
  const inventory = [];
  function visit(relative = '') {
    for (const entry of readdirSync(path.join(stage, relative), { withFileTypes: true })) {
      const name = relative ? relative + '/' + entry.name : entry.name;
      if (entry.isDirectory()) visit(name);
      else if (entry.isFile())
        inventory.push({
          path: name,
          sha256: createHash('sha256')
            .update(readFileSync(path.join(stage, name)))
            .digest('hex'),
        });
      else throw new Error('Runtime staging contains a non-ordinary entry: ' + name);
    }
  }
  visit();
  inventory.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
  writeFileSync(
    path.join(stage, 'runtime-inventory.json'),
    JSON.stringify({ schema: 'ai-peer-review.runtime-inventory/v1', files: inventory }) + '\n'
  );
  const npmArgs = [
    'pack',
    '--ignore-scripts',
    '--json',
    '--pack-destination',
    destination,
    ...(dryRun ? ['--dry-run'] : []),
  ];
  const npmCli =
    process.env.npm_execpath ??
    (process.platform === 'win32'
      ? path.join(path.dirname(process.execPath), 'node_modules/npm/bin/npm-cli.js')
      : null);
  const output = npmCli
    ? execFileSync(process.execPath, [npmCli, ...npmArgs], { cwd: stage, encoding: 'utf8' })
    : execFileSync('npm', npmArgs, { cwd: stage, encoding: 'utf8' });
  if (json) process.stdout.write(output);
  else {
    const report = JSON.parse(output);
    console.log((Array.isArray(report) ? report[0] : Object.values(report)[0]).filename);
  }
} finally {
  rmSync(stage, { recursive: true, force: true });
}
