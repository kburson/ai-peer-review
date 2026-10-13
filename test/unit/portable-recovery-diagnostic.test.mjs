// @story #209
// Stock producer/reader composition through explicit unverified CLI test ports.
import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { readdir, readFile, lstat, writeFile } from 'node:fs/promises';
import { exerciseClaudeLaunchCli } from '../helpers/claude-launch-cli-regression.mjs';
import { inspectReviewAuthority } from '../../src/protocol/authority-reader.mjs';
import { readStartupJournal } from '../../src/broker/startup-evidence-reader.mjs';
import { validatePortableProviderRecordsCore } from '../../src/broker/portable-provider-records.mjs';
import { observeProjectReconciliationInventoryCore } from '../../src/broker/portable-reconciliation-inventory.mjs';

test('actual same-session recovery diagnostic remains bounded historical evidence without granting effects', async (t) => {
  const { workspace } = await exerciseClaudeLaunchCli(t, { resume: true, expired: true });
  const directory = path.join(workspace, 'provider', 'claude');
  const names = (await readdir(directory)).filter((name) => name.startsWith('recovery-'));
  assert.equal(names.length, 1);
  const file = path.join(directory, names[0]);
  const bytes = await readFile(file),
    mode = (await lstat(file)).mode;
  const { state, events } = inspectReviewAuthority(workspace);
  const journal = readStartupJournal(workspace);
  const parse = (record, name = names[0]) =>
    validatePortableProviderRecordsCore({
      files: [
        { name: 'provider/claude/' + name, bytes: Buffer.from(JSON.stringify(record)), mode },
      ],
      state,
      journal,
      events,
    });
  const record = JSON.parse(bytes);
  const parsed = parse(record);
  assert.equal(parsed.status, 'valid');
  assert.equal(parsed.verified, false);
  for (const changed of [
    { ...record, claim_id: 'claim-11111111-1111-4111-8111-111111111111' },
    { ...record, review_id: 'wrong-review' },
    { ...record, after_sequence: record.before_sequence },
    { ...record, observation: { ...record.observation, exit_code: 1 } },
    { ...record, observation: { ...record.observation, session_id: 'another-session' } },
    { ...record, verified: true },
  ])
    assert.equal(parse(changed).status, 'unknown');
  assert.equal(parse(record, 'recovery-unknown.json').status, 'unknown');
  const context = {
    root: path.dirname(workspace),
    signal: new AbortController().signal,
    deadline: performance.now() + 30000,
  };
  const observed = await observeProjectReconciliationInventoryCore(context);
  t.after(() => observed.close());
  assert.equal(observed.verified, false);
  await observed.assertUnchanged();
  assert.deepEqual(await readFile(file), bytes);
  await writeFile(file, '{}\n');
  await assert.rejects(() => observed.assertUnchanged(), { code: 'APR_BROKER_STALE' });
});
