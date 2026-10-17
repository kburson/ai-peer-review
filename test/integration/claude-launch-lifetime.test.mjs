// @story #190
// Production installed entry point; only the external model is an inert Node child.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { installRuntimeFixture } from '../helpers/runtime-package.mjs';

test(
  'installed local reviewer launch separates provider waiting from bounded control',
  { timeout: 180000, skip: process.platform === 'win32' ? '#190 Windows deferred' : false },
  async (t) => {
    const f = installRuntimeFixture(t);
    const scenario = new URL('../helpers/claude-launch-lifetime-scenario.mjs', import.meta.url);
    const exercise = (mode) => {
      const r = spawnSync(
        process.execPath,
        [
          '--import',
          new URL('../helpers/installed-provider/account-profile.mjs', import.meta.url).href,
          fileURLToPath(scenario),
          f.packageRoot,
          path.join(f.directory, 'lifetime-' + mode),
          mode,
        ],
        {
          env: {
            ...process.env,
            HOME: path.join(f.directory, 'account'),
            APR_FIXTURE_ACCOUNT_HOME: path.join(f.directory, 'account'),
          },
          encoding: 'utf8',
          timeout: 90000,
          maxBuffer: 4 * 1024 * 1024,
        }
      );
      assert.equal(r.status, 0, r.stderr);
      const actual = JSON.parse(r.stdout.trim());
      assert.equal(actual.spawns, mode === 'already-aborted' ? 0 : 1);
      assert.equal(actual.actualProvider, false);
      assert.equal(actual.journalUnchanged, true);
      assert.equal(actual.gitUnchanged, true);
      if (actual.spawns) assert.equal(actual.context.sameSignal, true);
      return actual;
    };
    // Removing the production phase separation must restore the original 30s failure.
    for (const mode of ['slow-terminal', 'slow-observation']) {
      await t.test(mode, () => {
        const r = exercise(mode);
        assert.equal(r.code, 0, r.stderr);
        assert.equal(JSON.parse(r.stdout).status, 'outcome-unknown');
        assert.doesNotMatch(r.stderr, /APR_OPERATION_AUTHORITY_UNAVAILABLE/);
        assert.ok(r.elapsed >= 30000 && r.elapsed < 45000);
        assert.ok(r.context.remaining > 29000 && r.context.remaining <= 30000);
        assert.equal(r.children[0].exitCode, 0);
        assert.equal(r.observationExists, mode === 'slow-observation');
      });
    }
    for (const mode of ['caller-deadline', 'cancelled', 'nested-deadline', 'already-aborted']) {
      await t.test(mode, () => {
        const r = exercise(mode);
        assert.equal(r.code, 1);
        assert.match(r.stderr, /APR_OPERATION_AUTHORITY_UNAVAILABLE/);
        assert.match(r.stderr, /Original operation context was aborted or expired/);
        if (['caller-deadline', 'nested-deadline'].includes(mode))
          assert.equal(r.context.deadline, r.explicitDeadline);
      });
    }
    await t.test('inherited provider deadline still stops the owned child', () => {
      const r = exercise('provider-deadline');
      assert.equal(r.children[0].signalCode, 'SIGKILL');
      assert.match(r.children[0].providerDeadline, /^\d+$/);
      assert.equal(r.children[0].providerDeadline, r.inheritedProviderDeadline);
      assert.ok(r.elapsed < 5000);
      assert.doesNotMatch(r.stderr, /APR_OPERATION_AUTHORITY_UNAVAILABLE/);
      assert.equal(JSON.parse(r.stdout).status, 'outcome-unknown');
    });
  }
);
