// @story #209
// Pure transition comparison cannot grant ownership or mint a worker receipt.
import test from 'node:test';
import assert from 'node:assert/strict';
const api = await import('../../src/broker/portable-restoration-transition.mjs').catch((error) => {
  if (error.code === 'ERR_MODULE_NOT_FOUND') return {};
  throw error;
});
const project = { physicalRoot: '/project', digest: 'a'.repeat(64) };
const registration = {
  schema: 'ai-peer-review.broker-registration/v1',
  created_at: '2026-10-12T00:00:00.000Z',
  project_root: '/project',
  project_digest: project.digest,
  review_id: 'review',
  workspace: '/project/.scratch/peer-review/review',
  request_digest: 'b'.repeat(64),
  runtime: {
    digest: 'sha256:' + 'c'.repeat(64),
    root: '/runtime',
    entrypoint: '/runtime/bin/peer-review.mjs',
    nodeExecutable: '/node',
  },
};
const namespace = (kind, root, files = []) => ({
  kind,
  root,
  entries: files.map(({ name }) => ({
    relativePath: name,
    type: 'file',
    identity: name,
    fileVersion: 'original',
  })),
  files,
});
const file = (name, value) => ({ name, bytes: Buffer.from(JSON.stringify(value) + '\n') });
function fixture() {
  const data = {
    verified: false,
    project,
    namespaces: [
      namespace('registrations', '/project/.scratch/peer-review/broker/registrations', [
        file('review.json', registration),
      ]),
      namespace('review', registration.workspace, [file('events.jsonl', { revision: 4 })]),
    ],
  };
  return {
    before: data,
    after: structuredClone(data),
    registration,
    stage: 'start',
    protocolState: 'reviewer-turn',
    resources: [],
  };
}
function compare(input) {
  assert.equal(typeof api.comparePortableRestorationTransitionCore, 'function');
  return api.comparePortableRestorationTransitionCore(input);
}
test('unchanged restoration and its one exact recovery record remain unverified', () => {
  const input = fixture();
  assert.equal(compare(input).status, 'unchanged');
  assert.equal(compare(input).verified, false);
  input.stage = 'suspend';
  input.after.namespaces.push(
    namespace('recovery', '/project/.scratch/peer-review/broker/recovery', [
      file('review.json', {
        schema: 'ai-peer-review.broker-recovery/v1',
        review_id: 'review',
        project_digest: project.digest,
        workspace: registration.workspace,
        request_digest: registration.request_digest,
        runtime_digest: registration.runtime.digest,
        protocol_state: 'reviewer-turn',
      }),
    ])
  );
  assert.equal(compare(input).status, 'transition');
  input.stage = 'start';
  assert.equal(compare(input).status, 'unknown');
});
test('manual, registration and event mutations cannot be accepted as arbitrary refreshed baselines', () => {
  for (const changed of ['manual-fence.json', 'events.jsonl']) {
    const input = fixture();
    input.after.namespaces[1].files.push(file(changed, { changed: true }));
    assert.equal(compare(input).status, 'unknown');
  }
  const input = fixture();
  input.after.namespaces[0].files.push(
    file('another.json', { ...registration, review_id: 'another' })
  );
  assert.equal(compare(input).status, 'unknown');
});
