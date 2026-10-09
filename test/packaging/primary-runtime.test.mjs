// @story #137
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { spawnSync, execFileSync } from 'node:child_process';
import {
  readFileSync,
  unlinkSync,
  existsSync,
  mkdirSync,
  cpSync,
  copyFileSync,
  writeFileSync,
} from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { runNpm } from '../helpers/npm-command.mjs';
import { packRuntime, sourceRoot } from '../helpers/runtime-package.mjs';

test('actual tarball manifest contains only installation and diagnostic scripts', (t) => {
  const { extracted, report } = packRuntime(t);
  const manifest = JSON.parse(readFileSync(path.join(extracted, 'package.json'), 'utf8'));
  assert.deepEqual(Object.keys(manifest.scripts).sort(), [
    'build:broker-security',
    'verify:deployment',
  ]);
  assert.equal(manifest.devDependencies, undefined);
  for (const file of report.files) {
    assert.ok(!/^(?:test|\.github|\.codex|\.agents|vendors)\//.test(file.path), file.path);
    assert.ok(
      !/^scripts\/(?:verify-release|verify-extraction|pack-runtime|run-secret-scan)/.test(
        file.path
      ),
      file.path
    );
    assert.ok(!/^docs\/superpowers\//.test(file.path), file.path);
  }
  for (const file of [
    'runtime-inventory.json',
    'bin/verify-deployment.mjs',
    'src/installed/verify-deployment.mjs',
    'native/broker-security/addon.cc',
    'scripts/build-broker-security.mjs',
  ])
    assert.ok(
      report.files.some((entry) => entry.path === file),
      'missing ' + file
    );
});

test('installed deployment diagnostic validates tarball offline without project or account writes', (t) => {
  const { extracted, directory } = packRuntime(t);
  const diagnostic = path.join(extracted, 'bin/verify-deployment.mjs');
  assert.ok(existsSync(diagnostic), 'installed deployment diagnostic is missing');
  const result = spawnSync(process.execPath, [diagnostic, '--json'], {
    cwd: directory,
    encoding: 'utf8',
    env: {
      ...process.env,
      HOME: path.join(directory, 'absent account'),
      USERPROFILE: path.join(directory, 'absent account'),
      npm_config_offline: 'true',
    },
  });
  assert.equal(result.status, 0, result.stderr);
  const output = JSON.parse(result.stdout);
  assert.equal(output.status, 'verified');
  assert.equal(output.packageName, '@kburson/ai-peer-review');
  assert.equal(output.nativeStatus, 'requires-build');
  assert.match(output.inventoryDigest, /^[a-f0-9]{64}$/);
  assert.equal(existsSync(path.join(directory, 'absent account')), false);
  assert.equal(existsSync(path.join(directory, '.ai-peer-review')), false);
});

test('installed deployment refuses a missing runtime asset before exposing success', (t) => {
  const { extracted, directory } = packRuntime(t);
  const diagnostic = path.join(extracted, 'bin/verify-deployment.mjs');
  assert.ok(existsSync(diagnostic), 'installed deployment diagnostic is missing');
  unlinkSync(path.join(extracted, 'schemas/config-v1.json'));
  const result = spawnSync(process.execPath, [diagnostic, '--json'], {
    cwd: directory,
    encoding: 'utf8',
  });
  assert.equal(result.status, 1);
  assert.equal(result.stdout.trim(), '');
  assert.match(result.stderr, /APR_RUNTIME_INVENTORY_INVALID/);
});

test('actual disposable global installation verifies without resealing dependencies', (t) => {
  const { tarball, directory } = packRuntime(t);
  const prefix = path.join(directory, 'global prefix');
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
  const result = spawnSync(
    process.execPath,
    [path.join(installed, 'bin/verify-deployment.mjs'), '--json'],
    { cwd: directory, encoding: 'utf8' }
  );
  assert.equal(result.status, 0, result.stderr);
  assert.equal(JSON.parse(result.stdout).status, 'verified');
  assert.equal(JSON.parse(result.stdout).nativeStatus, 'requires-build');
  assert.equal(JSON.parse(result.stdout).runtimeInventoryStatus, 'requires-bootstrap');
});

test(
  'native installation build refreshes only its bounded runtime inventory',
  { skip: 'Native broker verification paused for #102/#107' },
  (t) => {
    const { tarball, directory } = packRuntime(t);
    const prefix = path.join(directory, 'local consumer');
    runNpm(
      'npm',
      [
        'install',
        '--install-strategy=nested',
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
    const installed = path.join(prefix, 'node_modules/@kburson/ai-peer-review');
    const build = spawnSync(
      process.execPath,
      [
        path.join(installed, 'scripts/build-broker-security.mjs'),
        '--nodedir',
        process.env.APR_NODEDIR_BASE
          ? path.join(process.env.APR_NODEDIR_BASE, process.versions.node)
          : path.dirname(path.dirname(process.execPath)),
      ],
      { cwd: directory, encoding: 'utf8' }
    );
    assert.equal(build.status, 0, build.stderr);
    const result = spawnSync(
      process.execPath,
      [path.join(installed, 'bin/verify-deployment.mjs'), '--json'],
      { cwd: directory, encoding: 'utf8' }
    );
    assert.equal(result.status, 0, result.stderr);
    const inventory = JSON.parse(
      readFileSync(path.join(installed, 'runtime-inventory.json'), 'utf8')
    );
    for (const name of [
      'native/broker-security/build/Release/broker_security.node',
      'native/broker-security/build/Release/build-identity.json',
    ])
      assert.ok(
        inventory.files.some((entry) => entry.path === name),
        'unsealed native output ' + name
      );
  }
);

test(
  'global native bootstrap seals executing dependencies and fences later replacement',
  { skip: 'Native broker verification paused for #102/#107' },
  async (t) => {
    const { tarball, directory } = packRuntime(t);
    const prefix = path.join(directory, 'sealed global prefix');
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
    const { verifyRuntimeInventorySync } = await import(
      pathToFileURL(path.join(installed, 'src/startup/runtime-inventory.mjs'))
    );
    assert.throws(() => verifyRuntimeInventorySync({ packageRoot: installed }), {
      code: 'APR_RUNTIME_INVENTORY_INVALID',
    });
    const build = spawnSync(
      process.execPath,
      [
        path.join(installed, 'scripts/build-broker-security.mjs'),
        '--nodedir',
        process.env.APR_NODEDIR_BASE
          ? path.join(process.env.APR_NODEDIR_BASE, process.versions.node)
          : path.dirname(path.dirname(process.execPath)),
      ],
      { cwd: directory, encoding: 'utf8' }
    );
    assert.equal(build.status, 0, build.stderr);
    const observation = verifyRuntimeInventorySync({ packageRoot: installed });
    assert.ok(observation.entries.some((entry) => entry.path.startsWith('node_modules/')));
    // Selection and relocation are exercised by the installed CLI under an
    // explicit test-only OS-profile substitution, never the user's account.
    const home = path.join(directory, 'disposable account');
    mkdirSync(home, { mode: 0o700 });
    const preload = new URL('../helpers/installed-provider/preload.mjs', import.meta.url).href;
    const env = {
      ...process.env,
      APR_FIXTURE_ACCOUNT_HOME: home,
      HOME: home,
      USERPROFILE: home,
      NODE_OPTIONS: (process.env.NODE_OPTIONS ?? '') + ' --import=' + preload,
    };
    const cli = (packageRoot, cwd, argv, node = process.execPath) =>
      spawnSync(node, [path.join(packageRoot, 'bin/peer-review.mjs'), ...argv], {
        cwd,
        env,
        encoding: 'utf8',
      });
    const registered = cli(installed, directory, ['register-runtime', '--json']);
    assert.equal(registered.status, 0, registered.stderr);
    const generation = JSON.parse(registered.stdout).selection_id;
    assert.match(generation, /^[0-9a-f-]{36}$/);
    const firstClone = path.join(directory, 'first clone');
    execFileSync('git', ['init', '-b', 'trunk', firstClone], { stdio: 'pipe' });
    execFileSync(
      'git',
      [
        '-C',
        firstClone,
        '-c',
        'user.name=Fixture',
        '-c',
        'user.email=fixture@example.invalid',
        'commit',
        '--allow-empty',
        '-m',
        'fixture',
      ],
      { stdio: 'pipe' }
    );
    const secondClone = path.join(directory, 'second clone');
    execFileSync('git', ['clone', firstClone, secondClone], { stdio: 'pipe' });
    const linked = path.join(directory, 'custom linked layout');
    execFileSync('git', ['-C', firstClone, 'worktree', 'add', '-b', 'linked', linked], {
      stdio: 'pipe',
    });
    for (const cwd of [firstClone, secondClone, linked]) {
      const result = cli(installed, cwd, ['register-runtime', '--dry-run', '--json']);
      assert.equal(result.status, 0, result.stderr);
      assert.equal(JSON.parse(result.stdout).after.selection_id, generation);
      assert.equal(existsSync(path.join(cwd, '.ai-peer-review')), false);
    }
    const movedPrefix = path.join(directory, 'relocated global prefix');
    const relocated = path.join(
      movedPrefix,
      ...(process.platform === 'win32' ? [] : ['lib']),
      'node_modules/@kburson/ai-peer-review'
    );
    cpSync(installed, relocated, { recursive: true, verbatimSymlinks: true });
    const movedNode = path.join(
      directory,
      process.platform === 'win32' ? 'relocated-node.exe' : 'relocated-node'
    );
    copyFileSync(process.execPath, movedNode);
    const refused = cli(relocated, secondClone, ['register-runtime', '--json'], movedNode);
    assert.equal(refused.status, 1);
    assert.match(refused.stderr, /APR_RUNTIME_SELECTION_INVALID/);
    const updated = cli(
      relocated,
      secondClone,
      ['register-runtime', '--update', '--json'],
      movedNode
    );
    assert.equal(updated.status, 0, updated.stderr);
    assert.notEqual(JSON.parse(updated.stdout).selection_id, generation);
    const stale = cli(installed, linked, ['register-runtime', '--json']);
    assert.equal(stale.status, 1);
    assert.match(stale.stderr, /APR_RUNTIME_SELECTION_INVALID/);
    const dependency = observation.entries.find(
      (entry) => entry.path.startsWith('node_modules/') && entry.path.endsWith('.js')
    );
    const { appendFileSync } = await import('node:fs');
    appendFileSync(path.join(installed, dependency.path), '\n// changed dependency\n');
    assert.throws(
      () =>
        verifyRuntimeInventorySync({ packageRoot: installed, previousObservation: observation }),
      { code: 'APR_RUNTIME_INVENTORY_INVALID' }
    );
  }
);

test(
  'project-local installed package cannot register itself as the global runner',
  { skip: 'Native broker verification paused for #102/#107' },
  (t) => {
    const { tarball, directory } = packRuntime(t);
    const prefix = path.join(directory, 'local Git project');
    runNpm(
      'npm',
      [
        'install',
        '--install-strategy=nested',
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
    execFileSync('git', ['init', prefix], { stdio: 'pipe' });
    const installed = path.join(prefix, 'node_modules/@kburson/ai-peer-review');
    const build = spawnSync(
      process.execPath,
      [
        path.join(installed, 'scripts/build-broker-security.mjs'),
        '--nodedir',
        process.env.APR_NODEDIR_BASE
          ? path.join(process.env.APR_NODEDIR_BASE, process.versions.node)
          : path.dirname(path.dirname(process.execPath)),
      ],
      { encoding: 'utf8' }
    );
    assert.equal(build.status, 0, build.stderr);
    const account = path.join(directory, 'private account');
    mkdirSync(account);
    const preload = new URL('../helpers/installed-provider/preload.mjs', import.meta.url);
    const result = spawnSync(
      process.execPath,
      ['--import', preload.href, path.join(installed, 'bin/peer-review.mjs'), 'register-runtime'],
      {
        cwd: prefix,
        encoding: 'utf8',
        env: {
          ...process.env,
          APR_FIXTURE_ACCOUNT_HOME: account,
          HOME: account,
          USERPROFILE: account,
        },
      }
    );
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /APR_RUNTIME_INSTALLATION_INVALID/);
    assert.equal(
      existsSync(path.join(account, '.config/ai-peer-review/runtime-selection.json')),
      false
    );
  }
);

test('source npm pack refuses and leaves the source manifest unchanged', () => {
  const file = path.join(sourceRoot, 'package.json');
  const before = readFileSync(file);
  assert.throws(
    () => runNpm('npm', ['pack', '--dry-run', '--json'], { cwd: sourceRoot, encoding: 'utf8' }),
    (error) => error.status !== 0 && /APR_SOURCE_PACK_REFUSED/.test(error.stderr)
  );
  assert.deepEqual(readFileSync(file), before);
});

for (const nested of [false, true]) {
  test(
    nested
      ? 'a plain local npm install outside Git cannot register as the shared runner'
      : 'installed native bootstrap refuses effective dependencies outside its sealed root',
    { skip: 'Native broker verification paused for #102/#107' },
    (t) => {
      const { tarball, directory } = packRuntime(t);
      const consumer = path.join(
        directory,
        nested ? 'plain nested consumer' : 'plain hoisted consumer'
      );
      runNpm(
        'npm',
        [
          'install',
          '--prefix',
          consumer,
          '--install-strategy=' + (nested ? 'nested' : 'hoisted'),
          '--ignore-scripts',
          '--offline',
          '--no-audit',
          '--no-fund',
          tarball,
        ],
        { encoding: 'utf8' }
      );
      assert.equal(existsSync(path.join(consumer, '.git')), false);
      const installed = path.join(consumer, 'node_modules/@kburson/ai-peer-review');
      const inventoryPath = path.join(installed, 'runtime-inventory.json');
      const before = readFileSync(inventoryPath);
      const build = spawnSync(
        process.execPath,
        [
          path.join(installed, 'scripts/build-broker-security.mjs'),
          '--nodedir',
          process.env.APR_NODEDIR_BASE
            ? path.join(process.env.APR_NODEDIR_BASE, process.versions.node)
            : path.dirname(path.dirname(process.execPath)),
        ],
        { cwd: consumer, encoding: 'utf8' }
      );
      if (!nested) {
        assert.notEqual(build.status, 0, 'ancestor-resolved dependency bytes were accepted');
        assert.match(build.stderr, /dependency.*(?:closure|root|installation)/i);
        assert.deepEqual(
          readFileSync(inventoryPath),
          before,
          'refusal changed the shipped inventory'
        );
        assert.equal(existsSync(path.join(installed, 'native/broker-security/build')), false);
      } else {
        assert.equal(build.status, 0, build.stderr);
        const home = path.join(directory, 'isolated local account');
        mkdirSync(home, { mode: 0o700 });
        const preload = new URL('../helpers/installed-provider/preload.mjs', import.meta.url).href;
        const registration = spawnSync(
          process.execPath,
          [path.join(installed, 'bin/peer-review.mjs'), 'register-runtime', '--dry-run', '--json'],
          {
            cwd: consumer,
            encoding: 'utf8',
            env: {
              ...process.env,
              APR_FIXTURE_ACCOUNT_HOME: home,
              HOME: home,
              USERPROFILE: home,
              NODE_OPTIONS: (process.env.NODE_OPTIONS ?? '') + ' --import=' + preload,
            },
          }
        );
        assert.notEqual(
          registration.status,
          0,
          'plain local installation became the shared runner'
        );
        assert.match(registration.stderr, /APR_RUNTIME_INSTALLATION_INVALID/);
        assert.equal(
          existsSync(path.join(home, '.config/ai-peer-review/runtime-selection.json')),
          false
        );
        assert.equal(
          existsSync(path.join(home, 'AppData/Local/ai-peer-review/runtime-selection.json')),
          false
        );
      }
    }
  );
}

test('deployment diagnostic refuses an unlisted executable in a sealed dependency closure', (t) => {
  const { extracted, directory } = packRuntime(t);
  const manifest = JSON.parse(readFileSync(path.join(extracted, 'package.json')));
  const inventoryFile = path.join(extracted, 'runtime-inventory.json');
  const inventory = JSON.parse(readFileSync(inventoryFile));
  // Supply bounded dependency metadata to the integrity check; no provider or native build runs.
  for (const [name, version] of Object.entries(manifest.dependencies)) {
    const relative = path.posix.join('node_modules', name, 'package.json');
    const file = path.join(extracted, relative);
    mkdirSync(path.dirname(file), { recursive: true });
    const bytes = JSON.stringify({ name, version });
    writeFileSync(file, bytes);
    inventory.files.push({
      path: relative,
      sha256: createHash('sha256').update(bytes).digest('hex'),
    });
  }
  inventory.files.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
  writeFileSync(inventoryFile, JSON.stringify(inventory));
  const diagnostic = path.join(extracted, 'bin/verify-deployment.mjs');
  const before = spawnSync(process.execPath, [diagnostic, '--json'], {
    cwd: directory,
    encoding: 'utf8',
  });
  assert.equal(before.status, 0, before.stderr);
  assert.equal(JSON.parse(before.stdout).runtimeInventoryStatus, 'verified');
  writeFileSync(
    path.join(extracted, 'node_modules/injected.js'),
    'throw Error("unexpected executable");'
  );
  const after = spawnSync(process.execPath, [diagnostic, '--json'], {
    cwd: directory,
    encoding: 'utf8',
  });
  assert.equal(after.status, 1, after.stdout + after.stderr);
  assert.equal(after.stdout.trim(), '');
  assert.ok(after.stderr.includes('APR_RUNTIME_INVENTORY_INVALID'));
});
