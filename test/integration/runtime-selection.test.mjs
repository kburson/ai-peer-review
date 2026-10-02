// @story #133
import assert from 'node:assert/strict';
import test from 'node:test';
import { run } from '../../src/cli/run.mjs';

test('registration dry run validates the executing installation before account writes', async () => {
  let output = '';
  let diagnostic = '';
  const result = await run(['register-runtime', '--dry-run', '--json'], {
    cwd: process.cwd(),
    env: {
      HOME: '/forged',
      USERPROFILE: '/forged',
      XDG_CONFIG_HOME: '/forged',
      APPDATA: '/forged',
    },
    stdout: {
      write: (value) => {
        output += value;
      },
    },
    stderr: {
      write: (value) => {
        diagnostic += value;
      },
    },
  });
  assert.equal(result, 1);
  assert.equal(JSON.parse(diagnostic).code, 'APR_RUNTIME_INSTALLATION_INVALID');
  assert.equal(output, '');
});

import { spawnSync } from 'node:child_process';
import { userInfo } from 'node:os';
import { realpathSync } from 'node:fs';
import path from 'node:path';
import { assertSelectedRuntime } from '../../src/config/runtime-selection.mjs';

test(
  'production account location ignores process environment overrides',
  { skip: process.platform === 'win32' },
  () => {
    const module = new URL('../../src/config/runtime-selection.mjs', import.meta.url).href;
    const observed = spawnSync(
      process.execPath,
      [
        '--input-type=module',
        '-e',
        `import {verifiedAccountSelectionPath} from ${JSON.stringify(module)}; console.log(await verifiedAccountSelectionPath());`,
      ],
      {
        encoding: 'utf8',
        env: {
          ...process.env,
          HOME: '/forged',
          USERPROFILE: '/forged',
          XDG_CONFIG_HOME: '/forged',
          APPDATA: '/forged',
        },
      }
    );
    assert.equal(observed.status, 0, observed.stderr);
    assert.equal(
      observed.stdout.trim(),
      path.join(realpathSync(userInfo().homedir), '.config/ai-peer-review/runtime-selection.json')
    );
  }
);

test('source APIs cannot impersonate a registered global installation', async () => {
  await assert.rejects(assertSelectedRuntime(), { code: 'APR_RUNTIME_INSTALLATION_INVALID' });
});
