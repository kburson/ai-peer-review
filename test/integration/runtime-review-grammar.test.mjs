// @story #144
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, realpathSync, rmSync } from 'node:fs';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { createHash } from 'node:crypto';
import { reviewerTurnEvents } from '../helpers/review-fixture.mjs';
const api = await import('../../scripts/lib/runtime-review-grammar-v0.4.1.mjs').catch(() => ({}));
function fixture() {
  const root = realpathSync(mkdtempSync(path.join(tmpdir(), 'runtime-grammar144-')));
  const workspace = path.join(root, '.scratch', 'peer-review', 'review-01');
  mkdirSync(workspace, { recursive: true });
  const list = reviewerTurnEvents();
  list[0].payload.startup.context.repository_root = root;
  list[0].payload.startup.runtime = {
    schema: 'ai-peer-review.runtime/v1',
    classification: 'XPR',
    ownership: 'broker',
    transport_mode: 'manual',
    author: {
      provider: 'openai',
      host: 'codex',
      model_id: 'fixture',
      model_display: 'fixture',
      effort: 'high',
    },
    reviewer: {
      selector: 'claude',
      provider: 'anthropic',
      host: 'claude-code',
      model_id: 'fixture',
      model_display: 'fixture',
      effort: 'high',
    },
    adapter_version: '1',
    project_root_digest: 'd'.repeat(64),
  };
  const file = path.join(workspace, 'events.jsonl');
  writeFileSync(file, list.map((x) => JSON.stringify(x)).join('\n') + '\n');
  return { workspace, file, list, cleanup: () => rmSync(root, { recursive: true, force: true }) };
}
test('[#144] fixed versioned importer validates actual complete persisted event bytes', (t) => {
  const f = fixture();
  t.after(f.cleanup);
  const proof = api.inspectRuntimeReviewLineage([f.workspace], '0.4.1');
  assert.equal(proof.status, 'complete');
  assert.equal(proof.attempts[0].review_id, 'review-01');
  // A complete grammar replay is not accepted review authority by itself.
});
test('[#144] raw journal whitespace does not substitute for canonical producer receipt digest', (t) => {
  const f = fixture();
  t.after(f.cleanup);
  const before = api.inspectRuntimeReviewLineage([f.workspace], '0.4.1');
  const firstRaw = createHash('sha256').update(readFileSync(f.file)).digest('hex');
  writeFileSync(
    f.file,
    f.list.map((x) => JSON.stringify(x).replaceAll('":', '": ')).join('\n') + '\n'
  );
  const secondRaw = createHash('sha256').update(readFileSync(f.file)).digest('hex');
  assert.notEqual(secondRaw, firstRaw);
  const after = api.inspectRuntimeReviewLineage([f.workspace], '0.4.1');
  assert.equal(after.status, 'complete');
  assert.equal(after.attempts[0].event_log_digest, before.attempts[0].event_log_digest);
});
test('[#144] changed persisted event cannot retain the old complete lineage receipt', (t) => {
  const f = fixture();
  t.after(f.cleanup);
  const before = api.inspectRuntimeReviewLineage([f.workspace], '0.4.1');
  writeFileSync(
    path.join(f.workspace, 'lineage-receipt.json'),
    JSON.stringify({
      schema: 'ai-peer-review.lineage-receipt/v1',
      complete: true,
      attempts: before.attempts,
    })
  );
  f.list[0].payload.startup.runtime.author.model_id = 'different-declaration';
  writeFileSync(f.file, f.list.map((x) => JSON.stringify(x)).join('\n') + '\n');
  const after = api.inspectRuntimeReviewLineage([f.workspace], '0.4.1');
  assert.equal(after.status, 'lineage-invalid');
  assert.ok(after.reasons.includes('event-log-digest-conflict'));
});
