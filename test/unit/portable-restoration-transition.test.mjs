// @story #209
// Pure transition comparison cannot grant ownership or mint a worker receipt.
import test from 'node:test';
import assert from 'node:assert/strict';
import { describeResourceReconciliationNamespaceCore } from '../../src/broker/portable-reconciliation-inventory.mjs';
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
    containers: [
      {
        root: registration.workspace,
        mechanism: 'ordinary',
        identity: 'workspace',
        version: 'v1',
        entries: [],
        chain: [['/project', 'project']],
      },
    ],
    absent: [],
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
test('restoration refuses physical container replacement and unrelated absence changes', () => {
  const input = fixture();
  input.after.containers[0].identity = 'replacement';
  assert.equal(compare(input).status, 'unknown');
  const changed = fixture();
  changed.after.absent.push({ root: '/foreign', parent: '/project' });
  assert.equal(compare(changed).status, 'unknown');
  const metadata = fixture();
  metadata.after.containers[0].version = 'different';
  assert.equal(compare(metadata).status, 'unknown');
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

test('only the exact acquired resource publication and its proved release can change', () => {
  const input = fixture();
  input.stage = 'created';
  const root = '/account/.cache/ai-peer-review/provider-resources/' + 'd'.repeat(64);
  const record = {
    schema: 'ai-peer-review.provider-resource/v1',
    resource_digest: 'd'.repeat(64),
    owner_project_root_digest: project.digest,
    instance_id: 'e'.repeat(64),
    nonce_digest: 'f'.repeat(64),
    acquired_at: '2026-10-12T00:00:00.000Z',
    heartbeat_at: '2026-10-12T00:00:00.000Z',
    diagnostic_at: '2026-10-12T00:00:00.000Z',
  };
  const key = describeResourceReconciliationNamespaceCore({ root, entries: [] }).resourceKey;
  input.resources.push({
    verified: false,
    released: false,
    concurrent: false,
    resourceDigest: 'd'.repeat(64),
    record,
    root,
  });
  input.after.namespaces.push(
    namespace('provider-resources', root, [
      file('apr-resource-' + key + '.json', record),
      file('apr-election-' + key + '-contender.json', {
        schema: 'ai-peer-review.election-slot/v1',
        resourceKey: key,
        contenderId: 'contender',
        choosing: false,
        ticket: '1',
        identity: { host: 'host', pid: 123 },
      }),
    ])
  );
  assert.equal(compare(input).status, 'transition');
  assert.equal(compare(input).verified, false);
  const rogue = structuredClone(input);
  rogue.after.namespaces.at(-1).files.push(file('resource.lock', {}));
  assert.equal(compare(rogue).status, 'unknown');
  const release = structuredClone(input);
  release.before = structuredClone(input.after);
  release.after.namespaces[2] = namespace('provider-resources', root);
  release.stage = 'close';
  release.resources[0].released = true;
  assert.equal(compare(release).status, 'transition');
  release.resources[0].released = false;
  assert.equal(compare(release).status, 'unknown');
});
test('restoration sequence rejects skipped starts, replacement workers and effects after close', () => {
  assert.equal(typeof api.nextPortableRestorationStageCore, 'function');
  assert.equal(api.nextPortableRestorationStageCore(null, 'created'), 'created');
  assert.equal(api.nextPortableRestorationStageCore(null, 'start'), null);
  assert.equal(api.nextPortableRestorationStageCore('created', 'start'), 'start');
  assert.equal(api.nextPortableRestorationStageCore('created', 'close'), null);
  assert.equal(api.nextPortableRestorationStageCore('start', 'suspend'), 'suspend');
  assert.equal(api.nextPortableRestorationStageCore('suspend', 'close'), 'close');
  assert.equal(api.nextPortableRestorationStageCore('close', 'start'), null);
  assert.equal(api.nextPortableRestorationStageCore('start', 'created'), null);
});
