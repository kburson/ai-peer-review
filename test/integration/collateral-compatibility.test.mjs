// @story #135
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { readFileSync, writeFileSync, realpathSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import * as compatibility from '../../src/protocol/compatibility.mjs';
import { inspectReview, mutateReview, mutateReviewBatch } from '../helpers/protocol-api.mjs';
import { parseResponse } from '../../src/collateral/responses.mjs';
import { renderManifest, sealPhaseManifest } from '../../src/manifest/render.mjs';
import { readStartupJournal } from '../../src/broker/registry.mjs';
import { runBrokerEntrypoint } from '../../bin/peer-review-broker.mjs';
import { ensureBroker } from '../helpers/broker-client-api.mjs';
import {
  createReviewWorkspace,
  reviewerTurnEvents,
  acceptancePendingEvents,
  compatibilityDeclared,
  v2Event,
  event,
  participant,
  FINGERPRINTS,
} from '../helpers/review-fixture.mjs';

const expected = (state) => ({
  reviewId: state.protocol.review_id,
  revision: state.protocol.revision,
  sequence: state.protocol.sequence,
  actor: state.protocol.current_actor,
});
const snapshot = (fixture) =>
  [fixture.events, fixture.protocol, fixture.participants].map((file) => readFileSync(file));
async function incompatibleReviewFixture(t) {
  const fixture = await createReviewWorkspace({ events: reviewerTurnEvents() });
  t.after(fixture.cleanup);
  const events = fixture.readEvents().trim().split('\n').map(JSON.parse);
  events[0].schema = 'ai-peer-review.event/v99';
  writeFileSync(fixture.events, `${events.map(JSON.stringify).join('\n')}\n`);
  return {
    ...fixture,
    snapshotEvidence: () => snapshot(fixture),
    continueWithCurrent: () =>
      mutateReview(fixture.workspace, expected(fixture.state), () => {
        throw new Error('unsupported evidence must refuse before factory');
      }),
  };
}

test('unsupported journal refuses continuation before effects and preserves all legacy bytes', async (t) => {
  const old = await incompatibleReviewFixture(t);
  const before = old.snapshotEvidence();
  await assert.rejects(
    old.continueWithCurrent(),
    (error) => error.code === 'APR_REVIEW_RUNTIME_UNSUPPORTED'
  );
  assert.deepEqual(old.snapshotEvidence(), before);
});

for (const mutation of ['single', 'batch']) {
  test(`supported ${mutation} continuation ignores the historical writer package floor`, async (t) => {
    const events = reviewerTurnEvents();
    const declaration = compatibilityDeclared(
      { review_id: events[0].review_id, sequence: 2, revision: 2 },
      {
        minimum_reader_version: '0.2.2',
        minimum_writer_version: '999.0.0',
        accepted_event_schemas: ['ai-peer-review.event/v1', 'ai-peer-review.event/v2'],
      }
    );
    const fixture = await createReviewWorkspace({
      events: [
        ...events,
        declaration,
        v2Event('identity-changed', {
          sequence: 4,
          revision: 2,
          actor: FINGERPRINTS.reviewer,
          payload: { identity: participant('reviewer') },
        }),
      ],
    });
    t.after(fixture.cleanup);
    const state = inspectReview(fixture.workspace);
    const mutate = mutation === 'single' ? mutateReview : mutateReviewBatch;
    const result = await mutate(fixture.workspace, expected(state), () => {
      const next = event('identity-changed', {
        sequence: 5,
        revision: 2,
        actor: FINGERPRINTS.reviewer,
        payload: { identity: participant('reviewer') },
      });
      return mutation === 'single' ? next : [next];
    });
    assert.equal(result.protocol.sequence, 5);
    assert.equal(result.protocol.compatibility.minimum_writer_version, '999.0.0');
  });
}

test('bounded incompatible diagnostic reveals schemas and paths without inventing status', async (t) => {
  const old = await incompatibleReviewFixture(t);
  const before = old.snapshotEvidence();
  assert.equal(
    typeof compatibility.inspectUnsupportedReview,
    'function',
    'unsupported reviews require a bounded diagnostic'
  );
  const diagnostic = compatibility.inspectUnsupportedReview({ workspace: old.workspace });
  assert.equal(diagnostic.code, 'APR_REVIEW_RUNTIME_UNSUPPORTED');
  assert.equal(diagnostic.workspace, realpathSync(old.workspace));
  assert.ok(diagnostic.schemas.includes('ai-peer-review.event/v99'));
  for (const key of ['state', 'next_action', 'terminal', 'complete', 'events'])
    assert.equal(Object.hasOwn(diagnostic, key), false);
  assert.deepEqual(old.snapshotEvidence(), before);
});

for (const corruption of ['torn', 'bad-sequence', 'invalid-role']) {
  test(`supported format retains ${corruption} integrity refusal without rewriting evidence`, async (t) => {
    const fixture = await createReviewWorkspace({ events: reviewerTurnEvents() });
    t.after(fixture.cleanup);
    if (corruption === 'torn') writeFileSync(fixture.events, fixture.readEvents().slice(0, -1));
    else {
      const events = fixture.readEvents().trim().split('\n').map(JSON.parse);
      if (corruption === 'bad-sequence') events[1].sequence = 99;
      else events[1].payload.reviewer.role = 'author';
      writeFileSync(fixture.events, `${events.map(JSON.stringify).join('\n')}\n`);
    }
    const before = snapshot(fixture);
    await assert.rejects(
      mutateReview(fixture.workspace, expected(fixture.state), () => {
        throw new Error('never create');
      })
    );
    assert.deepEqual(snapshot(fixture), before);
  });
}

test('broker launch never selects the retained image executable or package entrypoint', async (t) => {
  const fixture = await createReviewWorkspace({ events: reviewerTurnEvents() });
  t.after(fixture.cleanup);
  const before = snapshot(fixture);
  const image = {
    root: path.join(fixture.root, 'old image'),
    nodeExecutable: path.join(fixture.root, 'obsolete-node'),
    digest: `sha256:${'a'.repeat(64)}`,
  };
  let connects = 0;
  let launch;
  let bootstrapRecord;
  await ensureBroker({
    project: { physicalRoot: fixture.root, digest: 'b'.repeat(64), tuple: [] },
    versions: {
      package_version: '0.4.0',
      broker_protocol_version: 1,
      node_major: Number(process.versions.node.split('.')[0]),
    },
    runtimeImage: image,
    platform: {
      verifyRuntimeImage: () => true,
      connect: () => {
        if (++connects === 1) throw Object.assign(new Error('absent'), { code: 'ENOENT' });
        return { current: true };
      },
      createBootstrap: ({ record }) => {
        bootstrapRecord = record;
        return path.join(fixture.root, 'bootstrap.json');
      },
      spawn: (command, args) => {
        launch = { command, args };
        const child = new EventEmitter();
        child.unref = () => {};
        queueMicrotask(() => child.emit('spawn'));
        return child;
      },
    },
  });
  assert.equal(bootstrapRecord.schema, 'ai-peer-review.broker-bootstrap/v2');
  assert.equal(
    bootstrapRecord.execution.package_root,
    realpathSync(fileURLToPath(new URL('../..', import.meta.url)))
  );
  assert.equal(bootstrapRecord.execution.node_executable, realpathSync(process.execPath));
  assert.equal(launch.command, realpathSync(process.execPath));
  assert.equal(
    launch.args[0],
    fileURLToPath(new URL('../../bin/peer-review-broker.mjs', import.meta.url))
  );
  assert.deepEqual(snapshot(fixture), before);
});

test('legacy broker bootstrap is readable evidence and cannot execute retained code', async (t) => {
  const fixture = await createReviewWorkspace({ events: reviewerTurnEvents() });
  t.after(fixture.cleanup);
  const directory = path.join(fixture.root, '.scratch', 'peer-review', 'broker');
  const { mkdirSync } = await import('node:fs');
  mkdirSync(directory, { recursive: true });
  const file = path.join(directory, 'bootstrap-a1b2.json');
  const record = {
    schema: 'ai-peer-review.broker-bootstrap/v1',
    project: {
      physicalRoot: realpathSync(fixture.root),
      digest: 'a'.repeat(64),
      tuple: [
        'ai-peer-review.broker-root/v1',
        realpathSync(fixture.root),
        null,
        String(process.getuid()),
      ],
    },
    versions: { package_version: '0.1.0', broker_protocol_version: 1, node_major: 24 },
    runtimeImage: {
      root: path.join(fixture.root, 'old image'),
      nodeExecutable: process.execPath,
      digest: `sha256:${'b'.repeat(64)}`,
    },
  };
  writeFileSync(file, JSON.stringify(record), { mode: 0o600 });
  const before = readFileSync(file);
  await assert.rejects(
    runBrokerEntrypoint(realpathSync(file)),
    (error) => error.code === 'APR_REVIEW_RUNTIME_UNSUPPORTED'
  );
  assert.deepEqual(readFileSync(file), before);
});

test('unknown response and manifest formats refuse before heuristically interpreting their fields', () => {
  const unsupported = (error) => error.code === 'APR_REVIEW_RUNTIME_UNSUPPORTED';
  assert.throws(
    () => parseResponse('---\nschema: "ai-peer-review.response/v99"\n---\n'),
    unsupported
  );
  assert.throws(() => renderManifest({ schema: 'ai-peer-review.manifest/v99' }), unsupported);
});

test('unknown startup journal preserves bytes and refuses as unsupported', async (t) => {
  const fixture = await createReviewWorkspace({ events: reviewerTurnEvents() });
  t.after(fixture.cleanup);
  const file = path.join(fixture.workspace, 'startup-request.json');
  const bytes = '{"schema":"ai-peer-review.startup-request/v99","state":"terminal"}\n';
  writeFileSync(file, bytes);
  assert.throws(
    () => readStartupJournal(fixture.workspace),
    (error) => error.code === 'APR_REVIEW_RUNTIME_UNSUPPORTED'
  );
  assert.equal(readFileSync(file, 'utf8'), bytes);
});

test('unknown nested context refuses before reduction with safe review-path diagnostics', async (t) => {
  const fixture = await createReviewWorkspace({ events: reviewerTurnEvents() });
  t.after(fixture.cleanup);
  const events = fixture.readEvents().trim().split('\n').map(JSON.parse);
  events[0].payload.startup.context.schema = 'ai-peer-review.context/v99';
  writeFileSync(fixture.events, `${events.map(JSON.stringify).join('\n')}\n`);
  const before = snapshot(fixture);
  assert.throws(
    () => inspectReview(fixture.workspace),
    (error) =>
      error.code === 'APR_REVIEW_RUNTIME_UNSUPPORTED' &&
      error.details.workspace === realpathSync(fixture.workspace) &&
      error.details.schemas.includes('ai-peer-review.context/v99')
  );
  assert.deepEqual(snapshot(fixture), before);
});

test('unknown phase manifests refuse before interpreting fields', () => {
  assert.throws(
    () => sealPhaseManifest({ schema: 'ai-peer-review.phase-manifest/v99' }),
    (error) => error.code === 'APR_REVIEW_RUNTIME_UNSUPPORTED'
  );
});

test('unknown retained image metadata remains preserved unsupported evidence', async (t) => {
  const fixture = await createReviewWorkspace({ events: reviewerTurnEvents() });
  t.after(fixture.cleanup);
  const { verifyRuntimeImage } = await import('../../src/broker/runtime-image.mjs');
  const file = path.join(fixture.workspace, 'runtime-image.json');
  const bytes = '{"schema":"ai-peer-review.runtime-image/v99"}\n';
  writeFileSync(file, bytes);
  assert.throws(
    () => verifyRuntimeImage({ root: fixture.workspace }),
    (error) => error.code === 'APR_REVIEW_RUNTIME_UNSUPPORTED'
  );
  assert.equal(readFileSync(file, 'utf8'), bytes);
});

test('supported terminal event authority remains readable without rewriting historical collateral', async (t) => {
  const events = acceptancePendingEvents();
  events.push(
    event('finalization-started', {
      sequence: 5,
      revision: events.at(-1).revision + 1,
      actor: FINGERPRINTS.author,
    })
  );
  events.push(
    event('acceptance-committed', {
      sequence: 6,
      revision: events.at(-1).revision + 1,
      actor: FINGERPRINTS.author,
    })
  );
  const fixture = await createReviewWorkspace({ events });
  t.after(fixture.cleanup);
  const before = snapshot(fixture);
  assert.equal(inspectReview(fixture.workspace).protocol.state, 'accepted');
  assert.deepEqual(snapshot(fixture), before);
});

test('archive support names the actual sealed relocation contracts and refuses unknown plans', async () => {
  const manifest = compatibility.readRuntimeCompatibility();
  assert.ok(manifest.contracts.archive.read.includes('ai-peer-review.relocation-receipt/v1'));
});

test('unknown archive plans refuse before interpreting their shape or applying writes', async () => {
  const { applyReviewRecord } = await import('../helpers/review-record-api.mjs');
  assert.throws(
    () => applyReviewRecord({ schema: 'ai-peer-review.relocation-plan/v99' }),
    (error) => error.code === 'APR_REVIEW_RUNTIME_UNSUPPORTED'
  );
});

test('unsupported diagnostics bound large files and never follow journal links', async (t) => {
  const fixture = await createReviewWorkspace({ events: reviewerTurnEvents() });
  t.after(fixture.cleanup);
  const { unlinkSync, symlinkSync } = await import('node:fs');
  writeFileSync(fixture.events, 'x'.repeat(1048577));
  let diagnostic = compatibility.inspectUnsupportedReview({ workspace: fixture.workspace });
  assert.ok(diagnostic.reasons.includes('unreadable-or-unsafe-file'));
  unlinkSync(fixture.events);
  const secret = path.join(fixture.root, 'foreign.json');
  writeFileSync(secret, '{"schema":"private-secret/v1"}');
  symlinkSync(secret, fixture.events);
  diagnostic = compatibility.inspectUnsupportedReview({ workspace: fixture.workspace });
  assert.ok(diagnostic.reasons.includes('unreadable-or-unsafe-file'));
  assert.ok(!diagnostic.schemas.includes('private-secret/v1'));
  assert.ok(JSON.stringify(diagnostic).length < 4096);
});

test('unknown broker bootstrap schema refuses before executable or identity interpretation', async (t) => {
  const fixture = await createReviewWorkspace({ events: reviewerTurnEvents() });
  t.after(fixture.cleanup);
  const { mkdirSync } = await import('node:fs');
  const directory = path.join(fixture.root, '.scratch/peer-review/broker');
  mkdirSync(directory, { recursive: true });
  const file = path.join(directory, 'bootstrap-a1b2.json');
  const bytes = '{"schema":"ai-peer-review.broker-bootstrap/v99"}';
  writeFileSync(file, bytes, { mode: 0o600 });
  await assert.rejects(
    runBrokerEntrypoint(realpathSync(file)),
    (error) => error.code === 'APR_REVIEW_RUNTIME_UNSUPPORTED'
  );
  assert.equal(readFileSync(file, 'utf8'), bytes);
});
