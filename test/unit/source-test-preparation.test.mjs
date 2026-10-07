// @story #137
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { runNpm } from '../helpers/npm-command.mjs';

const root = fileURLToPath(new URL('../..', import.meta.url));

for (const lane of ['test:unit', 'test:integration']) {
  test(
    `a cold source ${lane} prepares real native ownership before executing tests`,
    { timeout: 120_000 },
    (t) => {
      const fixture = mkdtempSync(path.join(tmpdir(), 'apr-source-tests-'));
      t.after(() => rmSync(fixture, { recursive: true, force: true }));
      execFileSync('git', ['init', '-q'], { cwd: fixture });
      cpSync(path.join(root, 'src'), path.join(fixture, 'src'), { recursive: true });
      mkdirSync(path.join(fixture, 'scripts'));
      for (const name of ['build-broker-security.mjs', 'prepare-source-tests.mjs']) {
        if (existsSync(path.join(root, 'scripts', name)))
          cpSync(path.join(root, 'scripts', name), path.join(fixture, 'scripts', name));
      }
      const native = path.join(fixture, 'native', 'broker-security');
      mkdirSync(native, { recursive: true });
      for (const name of ['binding.gyp', 'addon.cc', 'posix.cc', 'windows.cc'])
        cpSync(path.join(root, 'native', 'broker-security', name), path.join(native, name));
      symlinkSync(
        path.join(root, 'node_modules'),
        path.join(fixture, 'node_modules'),
        process.platform === 'win32' ? 'junction' : 'dir'
      );
      const metadata = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8'));
      // Keep the real npm preparation hook, but substitute a narrow native
      // test consumer to avoid recursively running this entire fixture suite.
      metadata.scripts[lane] = 'node native-probe.mjs';
      writeFileSync(path.join(fixture, 'package.json'), JSON.stringify(metadata));
      writeFileSync(
        path.join(fixture, 'native-probe.mjs'),
        `
import assert from 'node:assert/strict';
import path from 'node:path';
import { platformSecurity } from './src/broker/platform.mjs';
const security = platformSecurity();
assert.equal(typeof security.userId(), 'string');
const directory = security.openPrivateDirectory(path.join(process.cwd(), 'owned-probe'), { exclusive: true });
try {
  assert.equal(directory.verify(), true);
  directory.create('proof.json', '{"native":true}');
  assert.equal(directory.read('proof.json').toString(), '{"native":true}');
} finally {
  directory.close();
}
`
      );
      assert.equal(existsSync(path.join(native, 'build')), false);
      assert.doesNotThrow(() =>
        runNpm('npm', ['run', lane], {
          cwd: fixture,
          encoding: 'utf8',
          stdio: 'pipe',
          timeout: 110_000,
          maxBuffer: 1024 * 1024,
        })
      );
      assert.equal(existsSync(path.join(native, 'build', 'Release', 'broker_security.node')), true);
    }
  );
}
