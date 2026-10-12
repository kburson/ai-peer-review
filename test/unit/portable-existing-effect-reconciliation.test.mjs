// @story #209
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, realpath, rm, readdir, readFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { tmpdir } from 'node:os';
import {
  reserveWakeOperation,
  appendWakeOutcome,
  readWakeOperation,
} from '../helpers/coordinator-ledger-api.mjs';
const existing = await import('../../src/coordinator/existing-effect-core.mjs').catch((error) => {
  if (error.code === 'ERR_MODULE_NOT_FOUND' && error.url?.endsWith('/existing-effect-core.mjs'))
    return {};
  throw error;
});
async function fixture(t) {
  const workspace = await realpath(await mkdtemp(path.join(tmpdir(), 'apr-existing-209-')));
  t.after(() => rm(workspace, { recursive: true, force: true }));
  const now = new Date('2026-10-12T00:00:00.000Z');
  const operation = await reserveWakeOperation(
    workspace,
    {
      kind: 'wake',
      authority_revision: 4,
      participant_fingerprint: 'sha256:' + 'a'.repeat(64),
      transport: { capability: 'native-push', adapter: 'codex-app', adapter_version: '2.0.0' },
      delivery: {
        delivery_id: 'author-turn-1-to-reviewer',
        recipient: 'reviewer',
        digest: 'sha256:' + 'b'.repeat(64),
        sequence: 7,
        revision: 4,
        receipt_verified: true,
      },
      capsule: {
        schema: 'ai-peer-review.wake-capsule/v1',
        review_id: 'review-existing-209',
        expected_revision: 4,
        target_role: 'reviewer',
        reason: 'role-actionable',
        next_command: 'peer-review resume /workspace',
      },
    },
    now
  );
  const providerStore = path.join(workspace, 'provider-resources');
  await mkdir(providerStore);
  return {
    workspace,
    operation,
    providerStore,
    now: now.valueOf(),
    appendWakeOutcome,
    dispatch: (operation) => operation(),
  }; // Explicit unverified core; real immutable ledger writes.
}

test('existing-only wake reconciliation appends an exact outcome without reserving or submitting another operation', async (t) => {
  assert.equal(typeof existing.reconcileExistingWakeOperationCore, 'function');
  const f = await fixture(t);
  const original = await readFile(f.operation.paths.operation);
  const result = await existing.reconcileExistingWakeOperationCore({
    ...f,
    adapter: {
      reconcile: async (input) => {
        assert.equal(input.operation_id, f.operation.operation_id);
        assert.equal(input.target_session_fingerprint, 'sha256:' + 'a'.repeat(64));
        assert.equal(
          input.capsule_text,
          '{\n  "expected_revision": 4,\n  "next_command": "peer-review resume /workspace",\n  "reason": "role-actionable",\n  "review_id": "review-existing-209",\n  "schema": "ai-peer-review.wake-capsule/v1",\n  "target_role": "reviewer"\n}\n\n'
        );
        return { status: 'delivered' };
      },
      deliver: () => {
        throw Error('new submission forbidden');
      },
    },
  });
  assert.equal(result.status, 'acknowledged');
  assert.equal(readWakeOperation(f.workspace, f.operation.operation_id).outcomes.length, 1);
  assert.deepEqual(await readFile(f.operation.paths.operation), original);
  assert.deepEqual(await readdir(path.join(f.workspace, 'wake', 'operations')), [
    path.basename(f.operation.paths.operation),
  ]);
  assert.deepEqual(await readdir(f.providerStore), []);
});

test('existing-only wake reconciliation retains unknown outcome when its official probe is unavailable', async (t) => {
  assert.equal(typeof existing.reconcileExistingWakeOperationCore, 'function');
  const f = await fixture(t);
  const result = await existing.reconcileExistingWakeOperationCore({ ...f, adapter: {} });
  assert.equal(result.status, 'outcome-unknown');
  assert.equal(readWakeOperation(f.workspace, f.operation.operation_id).status, 'outcome-unknown');
});

test('fixed existing-effect producer refuses caller-shaped election and inventory before any recovery write', async () => {
  const production =
    await import('../../src/broker/portable-existing-effect-reconciliation.mjs').catch((error) => {
      if (
        error.code === 'ERR_MODULE_NOT_FOUND' &&
        error.url?.endsWith('/portable-existing-effect-reconciliation.mjs')
      )
        return {};
      throw error;
    });
  assert.equal(typeof production.reconcilePortableExistingEffects, 'function');
  await assert.rejects(
    () =>
      production.reconcilePortableExistingEffects({
        paths: {},
        lease: { verified: true, assert: async () => true },
        inventory: { verified: true, namespaces: [] },
        signal: new AbortController().signal,
        deadline: performance.now() + 30000,
      }),
    { code: 'APR_BROKER_STALE' }
  );
});

test('existing wake binding validates the original operation against current role, capsule and event revision', async (t) => {
  const binding = await import('../../src/broker/portable-participant-binding.mjs');
  assert.equal(typeof binding.assertPortableWakeBindingCore, 'function');
  const f = await fixture(t);
  const input = existing.existingWakeDeliveryInputCore(f.operation);
  const authority = {
    state: {
      protocol: { review_id: 'review-existing-209', current_actor: 'reviewer', revision: 4 },
      participants: { reviewer: { session_fingerprint: 'sha256:' + 'a'.repeat(64) } },
    },
  };
  binding.assertPortableWakeBindingCore(input, authority);
  const changed = { ...input, capsule: { ...input.capsule, review_id: 'another-review' } };
  assert.throws(() => binding.assertPortableWakeBindingCore(changed, authority), {
    code: 'APR_IDENTITY_CONFLICT',
  });
});
