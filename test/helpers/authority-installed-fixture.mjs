// @story #136
import { spawnSync, execFileSync } from 'node:child_process';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { setupHostFixture } from './setup-host-fixture.mjs';
import { packRuntime } from './runtime-package.mjs';
import { readdirSync, lstatSync, readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { runNpm } from './npm-command.mjs';
export async function authorityInstalledFixture(t, { nativeSecurity = true } = {}) {
  const f = await setupHostFixture(t);
  await f.setupApply({ agents: nativeSecurity ? ['codex'] : ['grok'] });
  f.git('add', '.');
  f.git('commit', '-m', 'activate fixture policy');
  await f.core.activate({ cwd: f.root });
  // Use the genuine installed artifact and nested global dependency closure.
  // Ancestor source dependency links cannot stand in for selected runtime bytes.
  const { tarball } = packRuntime(t);
  const prefix = path.join(f.parent, 'global runtime prefix');
  runNpm(
    'npm',
    [
      'install',
      '--global',
      '--prefix',
      prefix,
      '--ignore-scripts',
      '--offline',
      '--no-audit',
      '--no-fund',
      tarball,
    ],
    { encoding: 'utf8' }
  );
  const installed = path.join(
    prefix,
    ...(process.platform === 'win32' ? [] : ['lib']),
    'node_modules/@kburson/ai-peer-review'
  );
  if (nativeSecurity)
    execFileSync(
      process.execPath,
      [
        path.join(installed, 'scripts/build-broker-security.mjs'),
        '--nodedir',
        process.env.APR_NODEDIR_BASE
          ? path.join(process.env.APR_NODEDIR_BASE, process.versions.node)
          : path.dirname(path.dirname(process.execPath)),
      ],
      { cwd: f.root, encoding: 'utf8' }
    );
  if (!nativeSecurity) {
    // Disposable POSIX effect fixtures need the real dependency closure, not native broker code.
    const files = JSON.parse(readFileSync(path.join(installed, 'runtime-inventory.json'))).files;
    const visit = (relative) => {
      for (const name of readdirSync(path.join(installed, relative))) {
        const file = relative + '/' + name;
        const stat = lstatSync(path.join(installed, file));
        if (stat.isDirectory()) visit(file);
        else if (stat.isFile() && (/\.(mjs|cjs|js|json|node)$/.test(name) || stat.mode & 0o111))
          files.push({
            path: file,
            sha256: createHash('sha256')
              .update(readFileSync(path.join(installed, file)))
              .digest('hex'),
          });
      }
    };
    visit('node_modules');
    files.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
    writeFileSync(
      path.join(installed, 'runtime-inventory.json'),
      JSON.stringify({ schema: 'ai-peer-review.runtime-inventory/v1', files }) + '\n'
    );
  }
  const module = (name) => JSON.stringify(new URL(name, pathToFileURL(installed + path.sep)).href);
  const execute = (code) =>
    spawnSync(
      process.execPath,
      [
        '--import',
        new URL('./installed-provider/account-profile.mjs', import.meta.url).href,
        '--input-type=module',
        '-e',
        'import {registerRuntimeSelection} from ' +
          module('src/config/runtime-selection.mjs') +
          '; await registerRuntimeSelection({});\n' +
          code,
      ],
      {
        cwd: f.root,
        encoding: 'utf8',
        env: { ...process.env, APR_FIXTURE_ACCOUNT_HOME: f.home, HOME: f.home },
      }
    );
  return { ...f, installed, module, execute };
}
