// cspell:words CXXFLAGS gypi LDFLAGS nodedir MSVS PYTHONPATH
import {
  prepareNativeInventory,
  finishNativeInventory,
} from '../src/installed/native-inventory.mjs';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import {
  accessSync,
  cpSync,
  mkdtempSync,
  mkdirSync,
  rmSync,
  constants,
  readFileSync,
  realpathSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const fail = (message) => {
  throw new Error(message);
};

let buildRoot = null;
try {
  const originalInventory = prepareNativeInventory(root);
  const options = {};
  const args = process.argv.slice(2);
  for (let i = 0; i < args.length; i += 2) {
    const key = args[i];
    if (
      !['--nodedir', '--python'].includes(key) ||
      options[key] ||
      !args[i + 1] ||
      !path.isAbsolute(args[i + 1])
    )
      fail(
        'Use --nodedir <absolute-local-development-tree> and optional --python <absolute-executable>.'
      );
    options[key] = realpathSync(args[i + 1]);
  }
  if (!options['--nodedir'])
    fail('A local --nodedir is required; this command never downloads development files.');
  const include = path.join(options['--nodedir'], 'include', 'node');
  for (const file of ['node_api.h', 'node_version.h', 'common.gypi', 'config.gypi']) {
    if (!statSync(path.join(include, file)).isFile())
      fail(`Missing local development file: ${file}`);
  }
  const version = readFileSync(path.join(include, 'node_version.h'), 'utf8');
  const actual = ['MAJOR', 'MINOR', 'PATCH']
    .map((part) => version.match(new RegExp(`#define NODE_${part}_VERSION\\s+(\\d+)`))?.[1])
    .join('.');
  if (actual !== process.versions.node)
    fail(`Development files are for Node ${actual}; running Node is ${process.versions.node}.`);
  if (
    process.platform === 'win32' &&
    !statSync(path.join(options['--nodedir'], 'Release', 'node.lib')).isFile()
  )
    fail('Matching Windows Release/node.lib is required.');
  if (options['--python']) accessSync(options['--python'], constants.X_OK);
  const require = createRequire(import.meta.url);
  const builder = require.resolve('node-gyp/bin/node-gyp.js');
  const manifest = JSON.parse(readFileSync(require.resolve('node-gyp/package.json'), 'utf8'));
  if (manifest.version !== '12.4.0')
    fail('The exact package-local node-gyp@12.4.0 builder is required.');
  // Discard injected node-gyp/npm/GYP/Node/Python options. PATH remains the
  // operator-provisioned compiler/Python lookup boundary; nothing is installed.
  const env = Object.fromEntries(
    Object.entries(process.env).filter(
      ([key]) => !/^(npm_|GYP_|NODE_|PYTHON|CC$|CXX$|LD$|AR$|CFLAGS$|CXXFLAGS$|LDFLAGS$)/i.test(key)
    )
  );
  buildRoot = mkdtempSync(path.join(os.tmpdir(), 'apr-native-build-'));
  for (const name of ['binding.gyp', 'addon.cc', 'posix.cc', 'windows.cc'])
    cpSync(path.join(root, 'native/broker-security', name), path.join(buildRoot, name));
  const invocation = [
    builder,
    'rebuild',
    `--directory=${buildRoot}`,
    `--nodedir=${options['--nodedir']}`,
    `--arch=${process.arch}`,
  ];
  if (options['--python']) invocation.push(`--python=${options['--python']}`);
  const result = spawnSync(process.execPath, invocation, {
    cwd: root,
    env,
    shell: false,
    stdio: 'inherit',
  });
  if (result.error || result.status !== 0)
    fail(
      'Local compiler/Python/build failed. Provision prerequisites and rerun the explicit command.'
    );
  const output = path.join(root, 'native/broker-security/build/Release/broker_security.node');
  try {
    mkdirSync(path.dirname(output), { recursive: true });
    cpSync(path.join(buildRoot, 'build/Release/broker_security.node'), output);
  } finally {
    rmSync(buildRoot, { recursive: true, force: true });
  }
  if (!statSync(output).isFile()) fail('The builder did not produce the expected native helper.');
  writeFileSync(
    path.join(path.dirname(output), 'build-identity.json'),
    JSON.stringify({
      node: process.versions.node,
      platform: process.platform,
      arch: process.arch,
    }) + '\n',
    { mode: 0o600 }
  );
  finishNativeInventory(root, originalInventory);
  console.log(
    `Built broker security for Node ${process.versions.node} ${process.platform}/${process.arch}.`
  );
} catch (error) {
  console.error(`APR_BROKER_BUILD_FAILED: ${error.message}`);
  process.exitCode = 1;
} finally {
  if (buildRoot) rmSync(buildRoot, { recursive: true, force: true });
}
