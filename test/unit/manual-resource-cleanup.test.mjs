// @story #188
// Explicit unverified scheduling harness; no supplied election enters production maps.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { compileFunction } from 'node:vm';
import { parse } from 'espree';
import { AprError } from '../../src/errors.mjs';
async function harness(withdrawal) {
  let withdrawals = 0,
    closes = 0;
  const generation = Object.freeze({
    contenderId: 'original-slot',
    resourceKey: 'manual',
    version: 'original-generation',
    outcome: 'held-election-slot',
  });
  const context = { signal: new AbortController().signal, deadline: performance.now() + 30000 };
  const bindings = {
    path,
    createHash,
    AprError,
    currentOperationAuthorityContext: async () => context,
    initializePortableOperations: async () => ({
      userId: async () => 'actual-fixture-user',
      accountHome: async () => '/account',
      observeProtection: async () => ({ verified: true }),
      openProtectedRoot: async () => {
        throw new Error('guard-open-failed');
      },
    }),
    bindOwnerElectionPaths: async () => ({
      resourceKey: 'a'.repeat(64),
      close: async () => {
        closes++;
      },
    }),
    acquireOwnerElection: async () => ({
      kind: 'won',
      verified: true,
      lease: {
        contenderId: 'original-slot',
        retainedGeneration: () => generation,
        release: async () => {
          withdrawals++;
          return withdrawal;
        },
      },
    }),
  };
  const source = await readFile(
    new URL('../../src/broker/manual-recovery-resource.mjs', import.meta.url),
    'utf8'
  );
  const ast = parse(source, { ecmaVersion: 'latest', sourceType: 'module', range: true });
  const body = ast.body
    .filter((n) => n.type !== 'ImportDeclaration')
    .map((n) => {
      const actual = n.type === 'ExportNamedDeclaration' ? n.declaration : n;
      return source.slice(...actual.range);
    })
    .join('\n');
  const compiled = compileFunction(
    body + '\nreturn {acquire:acquireManualRecoveryResource,uncertain};',
    Object.keys(bindings)
  )(...Object.values(bindings));
  return {
    ...compiled,
    generation,
    counts: () => ({ withdrawals, closes }),
    input: {
      workspace: '/workspace',
      authority: { state: { protocol: { review_id: 'review', revision: 1 } } },
      evidence: { recovery: { request_digest: 'b'.repeat(64) } },
    },
  };
}
test('manual guard-open failure withdraws the already-winning election before closing paths', async () => {
  const f = await harness({ status: 'withdrawn', obligations: [] });
  await assert.rejects(f.acquire(f.input), /guard-open-failed/);
  assert.deepEqual(f.counts(), { withdrawals: 1, closes: 1 });
  assert.equal(f.uncertain.size, 0);
});
test('manual guard-open failure retains the exact winning generation when withdrawal is unproved', async () => {
  const f = await harness({
    status: 'unresolved',
    obligations: [{ name: 'slot', reason: 'deadline' }],
  });
  await assert.rejects(f.acquire(f.input), (error) => {
    assert.ok(
      error.details?.outstandingObligations?.some(
        (o) => JSON.stringify(o.generation) === JSON.stringify(f.generation)
      )
    );
    return /guard-open-failed/.test(error.message);
  });
  assert.deepEqual(f.counts(), { withdrawals: 1, closes: 0 });
  assert.equal(f.uncertain.size, 1);
});
