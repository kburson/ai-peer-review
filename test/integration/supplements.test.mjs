import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';

import * as api from '../../src/public-api.mjs';
import { parseResponse } from '../../src/collateral/responses.mjs';
import { budgetIntervention, fixture, signedGrant } from '../helpers/intervention-fixture.mjs';

test('supplement bytes are normalized, frozen, and acknowledged by the next targeted draft', async (t) => {
  const fx = fixture();
  t.after(fx.cleanup);
  const review = await budgetIntervention(fx.root, 'supplement-intervention');
  const source = path.join(fx.root, 'supplement.md');
  writeFileSync(source, 'Cafe\u0301\r\nEvidence\r\n');
  const normalized = Buffer.from('Café\nEvidence\n');
  const digest = `sha256:${await import('node:crypto').then(({ createHash }) => createHash('sha256').update(normalized).digest('hex'))}`;
  const parameters = {
    content_digest: digest,
    target_role: 'reviewer',
    target_turn: 2,
  };
  const supplementGrant = await signedGrant(
    review.started.paths.workspace,
    'supplement',
    parameters,
    review.fixtureId,
    review.author,
    '2026-09-09T02:03:00.000Z'
  );
  const registered = await api.registerSupplement({
    cwd: fx.root,
    workspace: review.started.paths.workspace,
    file: source,
    forRole: 'reviewer',
    grant: supplementGrant,
    now: '2026-09-09T02:04:00.000Z',
  });
  assert.deepEqual(readFileSync(registered.paths.supplement), normalized);

  const continueParameters = {
    additional_turns: 1,
    resulting_effective_maximum: 2,
    resume_role: 'reviewer',
    focus_path: null,
    focus_digest: null,
  };
  const continueGrant = await signedGrant(
    review.started.paths.workspace,
    'continue',
    continueParameters,
    review.fixtureId,
    review.author,
    '2026-09-09T02:05:00.000Z'
  );
  const continued = await api.continueReview({
    cwd: fx.root,
    workspace: review.started.paths.workspace,
    grant: continueGrant,
    now: '2026-09-09T02:06:00.000Z',
  });
  assert.deepEqual(
    parseResponse(readFileSync(continued.paths.response)).metadata.acknowledged_supplement_ids,
    [registered.review.supplement.supplement_id]
  );
});
