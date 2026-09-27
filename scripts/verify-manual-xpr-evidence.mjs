#!/usr/bin/env node
// @story #106
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, realpathSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseResponse } from '../src/collateral/responses.mjs';

export const evidencePath = 'docs/conformance/2026-09-26-106-manual-xpr-evidence.json';
export function verifyManualXprEvidence(root = fileURLToPath(new URL('..', import.meta.url))) {
  root = realpathSync(root);
  const read = (relative) => {
    assert.equal(typeof relative, 'string');
    assert.ok(relative.startsWith('docs/') && !relative.split('/').includes('..'));
    const absolute = realpathSync(path.join(root, relative));
    assert.ok(absolute.startsWith(root + path.sep));
    return readFileSync(absolute);
  };
  const verified = (reference) => {
    const bytes = read(reference.path);
    assert.equal(
      'sha256:' + createHash('sha256').update(bytes).digest('hex'),
      reference.digest,
      reference.path
    );
    return bytes;
  };
  const proof = JSON.parse(read(evidencePath));
  assert.equal(proof.schema, 'ai-peer-review.manual-xpr-evidence/v1');
  assert.equal(proof.issue, 106);
  assert.equal(proof.transport_mode, 'manual');
  assert.equal(proof.startup_stage, 'manual');
  assert.equal(proof.initial_launch_status, 'submitted');
  assert.equal(proof.same_session_resume_status, 'submitted');
  assert.equal(proof.same_reviewer_session, true);
  const text = verified(proof.manifest).toString('utf8');
  const manifest = JSON.parse(text.split('```json\n')[1].split('\n```')[0]);
  assert.equal(manifest.schema, 'ai-peer-review.manifest/v1');
  assert.equal(manifest.review_id, proof.review_id);
  assert.equal(manifest.commit_mode, 'normal');
  assert.equal(manifest.status, 'accepted');
  assert.equal(manifest.acceptance_basis, 'reviewer-consensus');
  assert.equal(manifest.authority_assurance, proof.authority_assurance);
  assert.equal(proof.authority_assurance, 'unavailable');
  const { author, reviewer } = manifest.participants;
  assert.equal(author.provider, 'openai');
  assert.equal(author.model_id, 'gpt-6-astra');
  assert.equal(reviewer.provider, 'anthropic');
  assert.equal(reviewer.model_id, 'claude-opus-5');
  assert.notEqual(author.session_fingerprint, reviewer.session_fingerprint);
  const observed = proof.stream_observation;
  assert.equal(observed.source, 'official-exact-session');
  assert.equal(observed.source_version, proof.provider_version);
  assert.equal(observed.model_id, reviewer.model_id);
  assert.equal(observed.session_fingerprint, reviewer.session_fingerprint);
  assert.equal(manifest.artifact_path, proof.artifact.path);
  assert.equal(manifest.artifact_history.at(-1).digest, proof.artifact.digest);
  verified(proof.artifact);
  assert.ok(manifest.turns.length >= 2);
  for (const turn of manifest.turns) {
    const response = parseResponse(verified(turn.reviewer_response));
    assert.equal(response.metadata.review_id, proof.review_id);
    assert.equal(response.metadata.role, 'reviewer');
    assert.equal(response.metadata.turn, turn.turn);
    assert.ok(Number.isFinite(Date.parse(response.metadata.submitted_at)));
    assert.equal(response.metadata.agent.session_fingerprint, reviewer.session_fingerprint);
    assert.equal(
      response.sections.find(({ heading }) => heading === 'Decision').content.trim(),
      turn.decision
    );
    if (turn.author_response) verified(turn.author_response);
  }
  assert.equal(manifest.turns.at(-1).decision, 'accepted');
  assert.deepEqual(manifest.turns.at(-1).reviewer_response, proof.accepted_response);
  return { review_id: proof.review_id, turns: manifest.turns.length, status: manifest.status };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  console.log(JSON.stringify(verifyManualXprEvidence()));
}
