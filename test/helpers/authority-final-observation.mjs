// Read-only checkout review controls for 8a409fd; every filesystem mutation is a disposable fixture.
// @story #187
// Controlled disposable races around genuine protected snapshots and stock Git.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import cp from 'node:child_process';
import path from 'node:path';
import { syncBuiltinESMExports } from 'node:module';
import { promisify } from 'node:util';
import { pathToFileURL, fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../..', import.meta.url));
const moduleAt = (file) => import(pathToFileURL(path.join(root, file)));
const mode = process.argv[2];
const cleanups = [];
try {
  if (mode === 'selection') {
    const { runtimeFixture } = await moduleAt('test/helpers/runtime-selection-fixture.mjs');
    const { createSelectionStore } = await moduleAt('src/config/runtime-selection-core.mjs');
    const f = runtimeFixture({ after: (fn) => cleanups.push(fn) });
    const store = createSelectionStore({ packageRoot: f.packageRoot, account: f.account });
    await store.register();
    const file = await store.location();
    let checks = 0,
      changed = false;
    const raw = fsp.lstat;
    cleanups.push(() => {
      fsp.lstat = raw;
      syncBuiltinESMExports();
    });
    fsp.lstat = async function (target, ...rest) {
      try {
        return await raw.call(this, target, ...rest);
      } finally {
        if (target === path.join(f.packageRoot, '.git') && ++checks === 2) {
          const value = JSON.parse(fs.readFileSync(file));
          fs.renameSync(file, file + '.old');
          fs.writeFileSync(
            file,
            JSON.stringify({ ...value, selection_id: '11111111-1111-1111-1111-111111111111' }) +
              '\n',
            { mode: 0o600 }
          );
          changed = true;
        }
      }
    };
    syncBuiltinESMExports();
    await assert.rejects(store.assertSelected(), { code: 'APR_RUNTIME_CHANGED' });
    assert.equal(changed, true);
    assert.equal(
      JSON.parse(fs.readFileSync(file)).selection_id,
      '11111111-1111-1111-1111-111111111111'
    );
  } else if (mode === 'primary') {
    const raw = cp.execFile;
    let onGit = () => {};
    const wrapped = function (file, args, ...rest) {
      onGit(file, args);
      return raw.call(this, file, args, ...rest);
    };
    wrapped[promisify.custom] = function (file, args, ...rest) {
      onGit(file, args);
      return raw[promisify.custom](file, args, ...rest);
    };
    cp.execFile = wrapped;
    syncBuiltinESMExports();
    cleanups.push(() => {
      cp.execFile = raw;
      syncBuiltinESMExports();
    });
    const { createPrimaryAuthorityFixture } = await moduleAt('test/helpers/repository-fixture.mjs');
    const { resolvePrimaryAuthority } = await moduleAt('src/config/primary-authority.mjs');
    const f = await createPrimaryAuthorityFixture({ after: (fn) => cleanups.push(fn) });
    let trees = 0,
      changed = false;
    onGit = (file, args) => {
      if (args.includes('ls-tree') && ++trees === 2) {
        const record = JSON.parse(fs.readFileSync(f.registrationPath));
        fs.renameSync(f.registrationPath, f.registrationPath + '.old');
        fs.writeFileSync(
          f.registrationPath,
          JSON.stringify({
            ...record,
            primary_initialized: false,
            owned_blobs: null,
            integration_contract: null,
          }) + '\n',
          { mode: 0o600 }
        );
        changed = true;
      }
    };
    await assert.rejects(resolvePrimaryAuthority({ cwd: f.root }), {
      code: 'APR_PRIMARY_AUTHORITY_UNAVAILABLE',
    });
    assert.equal(changed, true);
    assert.equal(JSON.parse(fs.readFileSync(f.registrationPath)).primary_initialized, false);
  } else throw Error('Unknown observation race');
} finally {
  for (const fn of cleanups.reverse()) await fn();
}
