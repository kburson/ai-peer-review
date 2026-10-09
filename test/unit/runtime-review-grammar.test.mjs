// @story #144
import test from 'node:test';
import assert from 'node:assert/strict';
import { acceptancePendingEvents, v2Event } from '../helpers/review-fixture.mjs';
import { reduceEvents as historicalReduce } from '../../src/protocol/reducer.mjs';
const api = await import('../../scripts/lib/runtime-review-grammar-v0.4.1.mjs').catch(() => ({}));
const runtime = () => ({
  schema: 'ai-peer-review.runtime/v1',
  classification: 'XPR',
  ownership: 'broker',
  transport_mode: 'manual',
  author: {
    provider: 'openai',
    host: 'codex',
    model_id: 'declared-author',
    model_display: 'declared-author',
    effort: 'requested-high',
  },
  reviewer: {
    selector: 'claude',
    provider: 'anthropic',
    host: 'claude-code',
    model_id: 'requested-reviewer',
    model_display: 'requested-reviewer',
    effort: 'requested-high',
  },
  adapter_version: '1.0.0',
  project_root_digest: 'd'.repeat(64),
});
function events() {
  const list = acceptancePendingEvents();
  list[0].payload.startup.runtime = runtime();
  return list;
}
test('[#144] strict fixed producer grammar replays 0.4.1 author selection without removing fields', () => {
  const list = events(),
    original = JSON.stringify(list);
  assert.throws(
    () => historicalReduce(list),
    (error) => error.code === 'APR_EVENT_INVALID'
  );
  const result = api.reduceRuntimeReviewEvents(list, '0.4.1');
  assert.equal(result.protocol.state, 'acceptance-pending');
  assert.deepEqual(result.protocol.startup.runtime.author, runtime().author);
  assert.equal(JSON.stringify(list), original);
});
test('[#144] unknown producer version cannot silently select an available parser', () => {
  assert.throws(
    () => api.reduceRuntimeReviewEvents(events(), '0.4.2'),
    /producer-profile-unsupported/
  );
});
for (const [name, mutate] of [
  [
    'unknown author field',
    (x) => {
      x[0].payload.startup.runtime.author.observed = true;
    },
  ],
  [
    'missing author effort',
    (x) => {
      delete x[0].payload.startup.runtime.author.effort;
    },
  ],
  [
    'reviewer selector/provider disagreement',
    (x) => {
      x[0].payload.startup.runtime.reviewer.provider = 'openai';
    },
  ],
  [
    'unknown startup field',
    (x) => {
      x[0].payload.startup.extra = true;
    },
  ],
  [
    'missing event',
    (x) => {
      x.splice(1, 1);
    },
  ],
  [
    'different reviewer actor',
    (x) => {
      x[3].actor = 'sha256:' + 'a'.repeat(64);
    },
  ],
])
  test('[#144] versioned grammar refuses ' + name, () => {
    const list = events();
    mutate(list);
    assert.throws(
      () => api.reduceRuntimeReviewEvents(list, '0.4.1'),
      (error) =>
        ['APR_EVENT_INVALID', 'APR_PROJECTION_DRIFT', 'APR_INVALID_TRANSITION'].includes(error.code)
    );
  });

test('[#144] fixed producer reader version honors a real mixed v1/v2 minimum0.4.1 contract', () => {
  const first = events()[0];
  const declaration = {
    schema: 'ai-peer-review.event/v2',
    review_id: 'review-01',
    sequence: 2,
    revision: 1,
    type: 'compatibility-declared',
    actor: 'system',
    at: '2026-09-08T12:00:02.000Z',
    payload: {
      compatibility: {
        minimum_reader_version: '0.4.1',
        minimum_writer_version: '0.4.1',
        accepted_event_schemas: ['ai-peer-review.event/v1', 'ai-peer-review.event/v2'],
      },
    },
  };
  const joined = v2Event('reviewer-joined', { sequence: 3, revision: 2 });
  const projected = api.reduceRuntimeReviewEvents([first, declaration, joined], '0.4.1');
  assert.equal(projected.protocol.state, 'reviewer-turn');
  declaration.payload.compatibility.minimum_reader_version = '0.4.2';
  assert.throws(
    () => api.reduceRuntimeReviewEvents([first, declaration, joined], '0.4.1'),
    (error) => error.code === 'APR_READER_UPGRADE_REQUIRED'
  );
});

import { createHash } from 'node:crypto';
import path from 'node:path';
function startupBinding() {
  const initial = events()[0],
    payload = initial.payload;
  const projectRoot = path.resolve('/repo');
  payload.startup.context.repository_root = projectRoot;
  const sorted = (x) =>
    Array.isArray(x)
      ? x.map(sorted)
      : x && typeof x === 'object'
        ? Object.fromEntries(
            Object.keys(x)
              .sort()
              .map((k) => [k, sorted(x[k])])
          )
        : x;
  const requestDigest = createHash('sha256')
    .update(JSON.stringify(sorted(payload), null, 2) + '\n')
    .digest('hex');
  const root = path.join(projectRoot, '.scratch', 'peer-review', 'runtimes', requestDigest);
  const journal = {
    schema: 'ai-peer-review.startup-request/v1',
    request_digest: requestDigest,
    request: payload,
    created_at: '2026-09-08T12:00:00.000Z',
    workspace: path.join(projectRoot, '.scratch', 'peer-review', 'review-01'),
    review_id: 'review-01',
    runtime: {
      root,
      entrypoint: path.join(root, 'package', 'bin', 'peer-review.mjs'),
      nodeExecutable: path.join(root, 'node', process.platform === 'win32' ? 'node.exe' : 'node'),
      digest: 'sha256:' + 'c'.repeat(64),
      files: [],
    },
    versions: { package_version: '0.4.1', broker_protocol_version: 1, node_major: 26 },
    descriptor: payload.startup.runtime,
    stage: 'manual',
    registration_file: path.join(
      projectRoot,
      '.scratch',
      'peer-review',
      'broker',
      'registrations',
      'review-01.json'
    ),
  };
  const registration = {
    schema: 'ai-peer-review.broker-registration/v1',
    review_id: 'review-01',
    project_digest: 'd'.repeat(64),
    project_root: projectRoot,
    workspace: journal.workspace,
    request_digest: requestDigest,
    runtime: Object.fromEntries(Object.entries(journal.runtime).filter(([k]) => k !== 'files')),
    created_at: '2026-09-08T12:00:00.000Z',
  };
  return { journal, registration, initialEvent: initial, workspace: journal.workspace };
}
test('[#144] producer startup binds first event request and protected registration to same image', () => {
  assert.equal(api.assertRuntimeReviewStartupBinding(startupBinding()), true);
});
for (const [name, mutate] of [
  [
    'different request digest',
    (x) => {
      x.journal.request_digest = 'b'.repeat(64);
    },
  ],
  [
    'unrelated registration image',
    (x) => {
      x.registration.runtime.digest = 'sha256:' + 'e'.repeat(64);
    },
  ],
  [
    'different workspace',
    (x) => {
      x.registration.workspace = '/different';
    },
  ],
  [
    'different runtime author declaration',
    (x) => {
      x.journal.descriptor = structuredClone(x.journal.descriptor);
      x.journal.descriptor.author.model_id = 'different';
    },
  ],
  [
    'unknown producer version',
    (x) => {
      x.journal.versions.package_version = '0.4.2';
    },
  ],
  [
    'unknown registration field',
    (x) => {
      x.registration.approved = true;
    },
  ],
  [
    'different entrypoint',
    (x) => {
      x.journal.runtime.entrypoint = '/external/code.mjs';
    },
  ],
  [
    'different registration pointer',
    (x) => {
      x.journal.registration_file = '/external/receipt.json';
    },
  ],
])
  test('[#144] startup source binding refuses ' + name, () => {
    const value = startupBinding();
    mutate(value);
    assert.throws(
      () => api.assertRuntimeReviewStartupBinding(value),
      /producer-startup-binding-invalid/
    );
  });

test('[#144] invented broker_protocol shorthand does not satisfy real producer version envelope', () => {
  const f = startupBinding();
  delete f.journal.versions.broker_protocol_version;
  f.journal.versions.broker_protocol = 1;
  assert.throws(() => api.assertRuntimeReviewStartupBinding(f), /producer-startup-binding-invalid/);
});
