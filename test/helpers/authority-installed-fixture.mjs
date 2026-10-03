// @story #136
import { cpSync, mkdirSync, symlinkSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { setupHostFixture } from './setup-host-fixture.mjs';
import { sealInstalledRuntimeFixture } from './installed-runtime-inventory.mjs';
export async function authorityInstalledFixture(t) {
  const f = await setupHostFixture(t);
  await f.setupApply();
  f.git('add', '.');
  f.git('commit', '-m', 'activate fixture policy');
  await f.core.activate({ cwd: f.root });
  const source = fileURLToPath(new URL('../..', import.meta.url));
  const installed = path.join(f.parent, 'global runtime');
  mkdirSync(installed);
  for (const name of ['src', 'bin', 'schemas', 'templates', 'skills', 'provenance', 'package.json'])
    cpSync(path.join(source, name), path.join(installed, name), { recursive: true });
  sealInstalledRuntimeFixture(installed);
  symlinkSync(path.join(source, 'node_modules'), path.join(f.parent, 'node_modules'), 'dir');
  const module = (name) => JSON.stringify(pathToFileURL(path.join(installed, name)).href);
  const execute = (code) =>
    spawnSync(
      process.execPath,
      [
        '--import',
        fileURLToPath(new URL('./installed-provider/preload.mjs', import.meta.url)),
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
