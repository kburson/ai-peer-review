// @story #209
// Closed historical data checks never assert a current provider observation.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
const api = await import('../../src/broker/portable-provider-records.mjs').catch((error) => {
  if (error.code === 'ERR_MODULE_NOT_FOUND') return {};
  throw error;
});
const operation = 'launch:' + 'a'.repeat(64),
  handle = 'reviewer-session';
const fp =
  'sha256:' +
  createHash('sha256')
    .update('ai-peer-review.session/v1\nanthropic\n' + handle)
    .digest('hex');
const state = {
  protocol: {
    review_id: 'review',
    revision: 4,
    startup: {
      runtime: {
        adapter_version: '1.0.0',
        reviewer: { selector: 'claude', model_id: 'model', effort: 'high' },
      },
    },
  },
  participants: {
    author: {
      provider: 'openai',
      host: 'codex',
      model_id: 'author',
      session_fingerprint: 'sha256:' + 'b'.repeat(64),
    },
    reviewer: {
      provider: 'anthropic',
      host: 'claude-code',
      model_id: 'model',
      session_fingerprint: fp,
    },
  },
};
const journal = { provider_operation: { operation_id: operation } };
const file = (name, record) => ({
  name,
  bytes: Buffer.from(JSON.stringify(record)),
  mode: 0o100600,
});
function classify(files) {
  assert.equal(typeof api.validatePortableProviderRecordsCore, 'function');
  return api.validatePortableProviderRecordsCore({ files, state, journal });
}
function operationRecord() {
  return {
    schema: 'ai-peer-review.provider-operation/v1',
    selector: 'claude',
    operation_id: operation,
    handle,
    session_fingerprint: fp,
  };
}
const operationFile =
  'provider/claude/operations/' + createHash('sha256').update(operation).digest('hex') + '.json';
test('exact stock operation record is historical unverified data with exact filename and fingerprint', () => {
  const record = operationRecord();
  const result = classify([file(operationFile, record)]);
  assert.equal(result.status, 'valid');
  assert.equal(result.verified, false);
  assert.equal(
    classify([file(operationFile, { ...record, credential: 'private' })]).status,
    'unknown'
  );
  assert.equal(classify([file(operationFile, { ...record, handle: 'another' })]).status, 'unknown');
  assert.equal(
    classify([file(operationFile.replace('operations/', 'operations/f'), record)]).status,
    'unknown'
  );
});
test('unsupported Codex and Grok observation or launch-state records remain unproved', () => {
  for (const selector of ['codex', 'grok'])
    for (const name of ['launch-state.json', 'observations/' + 'a'.repeat(64) + '.json'])
      assert.equal(classify([file('provider/' + selector + '/' + name, {})]).status, 'unknown');
});
test('closed binding joins the exact role and sealed session rather than a copied field flag', () => {
  const record = {
    schema: 'ai-peer-review.participant-binding/v1',
    review_id: 'review',
    role: 'reviewer',
    selector: 'claude',
    provider: 'anthropic',
    host: 'claude-code',
    model_id: 'model',
    adapter_version: '1.0.0',
    operation_id: 'join:review',
    session_fingerprint: fp,
    evidence_digest: 'sha256:' + 'c'.repeat(64),
    tool_use_id: 'tool-id',
    handle_locator: handle,
  };
  assert.equal(classify([file('provider/bindings/reviewer.json', record)]).status, 'valid');
  assert.equal(classify([file('provider/bindings/author.json', record)]).status, 'unknown');
  assert.equal(
    classify([file('provider/bindings/reviewer.json', { ...record, operation_id: 'join:other' })])
      .status,
    'unknown'
  );
});

test('old Claude tool observations are historical data and never current observation authority', () => {
  const op = 'join:review';
  const name =
    'provider/claude/observations/' + createHash('sha256').update(op).digest('hex') + '.json';
  const record = {
    source: 'official-exact-session',
    source_version: '2.1.278',
    observed_at: '2000-01-01T00:00:00.000Z',
    operation_id: op,
    provider: 'anthropic',
    host: 'claude-code',
    model_id: 'model',
    session_id: handle,
    phase: 'tool-use',
    tool_use_id: 'tool-id',
  };
  const result = classify([file(name, record)]);
  assert.equal(result.status, 'valid');
  assert.equal(result.verified, false);
  assert.equal(classify([file(name, { ...record, phase: 'terminal-snapshot' })]).status, 'unknown');
  assert.equal(classify([file(name, { ...record, session_id: 'different' })]).status, 'unknown');
  if (process.platform !== 'win32')
    assert.equal(classify([{ ...file(name, record), mode: 0o100644 }]).status, 'unknown');
});

test('Claude launch history must retain the exact sealed collateral family and session', async (t) => {
  const fs = await import('node:fs');
  const os = await import('node:os');
  const path = await import('node:path');
  const { resolveReviewPaths } = await import('../../src/collateral/paths.mjs');
  const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'apr-provider-history-')));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const sealed = structuredClone(state);
  const context = {
    repository_root: root,
    reviews_root: 'docs/reviews',
    review_path_template: '{issue}/{review-id}',
    issue: 209,
    artifact_kind: 'spec',
    artifact_name: 'artifact',
    review_date: '2026-10-12',
    review_id: 'review',
  };
  sealed.protocol.startup.context = context;
  sealed.protocol.max_turns = 6;
  const paths = resolveReviewPaths({
    root,
    reviewsRoot: context.reviews_root,
    reviewPathTemplate: context.review_path_template,
    issue: 209,
    kind: 'spec',
    name: 'artifact',
    date: '2026-10-12',
    reviewId: 'review',
    recordId: 'review',
  });
  const record = {
    schema: 'ai-peer-review.claude-launch-state/v1',
    review_id: 'review',
    invitation: paths.reviewerInvitation.absolute,
    response: paths.reviewerResponse(2).absolute,
    model: 'model',
    effort: 'high',
    session_handle: handle,
    session_fingerprint: fp,
    protocol_revision: 2,
  };
  const validate = (record) =>
    api.validatePortableProviderRecordsCore({
      files: [file('provider/claude/launch-state.json', record)],
      state: sealed,
      journal,
    });
  assert.equal(validate(record).status, 'valid');
  assert.equal(
    validate({ ...record, response: paths.reviewerResponse(7).absolute }).status,
    'unknown'
  );
  assert.equal(validate({ ...record, invitation: '/other/invitation' }).status, 'unknown');
  assert.equal(validate({ ...record, session_handle: 'different' }).status, 'unknown');
});

test('binding digest and tool-use ID must join its retained exact-session observation', () => {
  const observation = {
    source: 'official-exact-session',
    source_version: '2.1.278',
    observed_at: '2000-01-01T00:00:00.000Z',
    operation_id: 'join:review',
    provider: 'anthropic',
    host: 'claude-code',
    model_id: 'model',
    session_id: handle,
    phase: 'tool-use',
    tool_use_id: 'tool-id',
  };
  const digest =
    'sha256:' +
    createHash('sha256')
      .update(
        JSON.stringify({
          source: observation.source,
          source_version: observation.source_version,
          observed_at: observation.observed_at,
          operation_id: observation.operation_id,
          tool_use_id: observation.tool_use_id,
          provider: observation.provider,
          host: observation.host,
          model_id: observation.model_id,
          session_fingerprint: fp,
          adapter_version: '1.0.0',
        })
      )
      .digest('hex');
  const binding = {
    schema: 'ai-peer-review.participant-binding/v1',
    review_id: 'review',
    role: 'reviewer',
    selector: 'claude',
    provider: 'anthropic',
    host: 'claude-code',
    model_id: 'model',
    adapter_version: '1.0.0',
    operation_id: 'join:review',
    session_fingerprint: fp,
    evidence_digest: digest,
    tool_use_id: 'tool-id',
    handle_locator: handle,
  };
  const name =
    'provider/claude/observations/' +
    createHash('sha256').update(observation.operation_id).digest('hex') +
    '.json';
  assert.equal(
    classify([file('provider/bindings/reviewer.json', binding), file(name, observation)]).status,
    'valid'
  );
  binding.evidence_digest = 'sha256:' + 'f'.repeat(64);
  assert.equal(
    classify([file('provider/bindings/reviewer.json', binding), file(name, observation)]).status,
    'unknown'
  );
});

test('duplicate provider record keys cannot be hidden by JSON parsing', () => {
  const good = file(operationFile, operationRecord());
  const duplicate = {
    ...good,
    bytes: Buffer.from(
      good.bytes
        .toString()
        .replace('"handle":"reviewer-session"', '"handle":"other","handle":"reviewer-session"')
    ),
  };
  assert.equal(classify([duplicate]).status, 'unknown');
});
