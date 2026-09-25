import assert from 'node:assert/strict';
import { appendFileSync, existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

// This explicitly simulates persisted crash states in a disposable workspace.
// It exercises the installed entrypoint and native IPC, not a real provider crash.
export async function verifyInstalledLaunchRestart({
  load,
  root,
  project,
  platform,
  children,
  client,
}) {
  const { ensureBroker, requestBroker } = await load('src/broker/client.mjs');
  const { inspectReviewAuthority } = await load('src/protocol/service.mjs');
  const { startupEvidence } = await load('src/broker/registry.mjs');
  const { atomicWrite } = await load('src/protocol/store.mjs');
  const { createClaudeAdapter } = await load('src/providers/claude.mjs');
  const { readClaudeSessionSnapshot } = await load('src/providers/claude-stream.mjs');
  const heldFile = path.join(root, '.scratch/fixture-held-launch.json');
  const deadline = Date.now() + 30_000;
  while (!existsSync(heldFile) && Date.now() < deadline)
    await new Promise((resolve) => setTimeout(resolve, 25));
  assert.ok(existsSync(heldFile), 'synthetic reviewer must join and submit before restart');
  const held = JSON.parse(readFileSync(heldFile, 'utf8'));
  assert.ok(Number.isSafeInteger(held.pid) && held.pid > 0);
  assert.equal(held.session, '22222222-2222-4222-8222-222222222222');
  const stopOwnedBroker = async () => {
    client?.connection?.close();
    const owned = children.at(-1);
    assert.ok(owned, 'restart fixture must own the broker it terminates');
    if (owned.child.exitCode === null && owned.child.signalCode === null)
      owned.child.kill('SIGKILL');
    owned.child.ref();
    await owned.exited;
  };
  try {
    await stopOwnedBroker();
  } finally {
    try {
      process.kill(held.pid, 'SIGKILL');
    } catch (error) {
      if (error.code !== 'ESRCH') throw error;
    }
  }
  const directory = path.join(root, '.scratch/peer-review');
  const workspaces = readdirSync(directory)
    .map((name) => path.join(directory, name))
    .filter((file) => existsSync(path.join(file, 'events.jsonl')));
  assert.equal(workspaces.length, 1);
  const workspace = workspaces[0];
  const journalFile = path.join(workspace, 'startup-request.json');
  const original = JSON.parse(readFileSync(journalFile, 'utf8'));
  assert.equal(original.stage, 'launch-pending');
  assert.equal(original.provider_operation.status, 'reserved');
  const joined = inspectReviewAuthority(workspace);
  assert.equal(joined.state.protocol.state, 'author-revision');
  assert.ok(joined.events.some((event) => event.type === 'reviewer-joined'));
  assert.ok(joined.events.some((event) => event.type === 'reviewer-revisions-requested'));
  const assertNoDelivery = () => {
    assert.deepEqual(readFileSync(process.env.APR_FIXTURE_CALLS, 'utf8').trim().split('\n'), [
      'start',
      'launch',
    ]);
    const authority = inspectReviewAuthority(workspace);
    assert.equal(authority.state.protocol.revision, joined.state.protocol.revision);
    assert.equal(startupEvidence(workspace, authority.state).recovery.fenced, false);
    const operations = path.join(workspace, 'wake/operations');
    assert.equal(
      existsSync(operations)
        ? readdirSync(operations).filter((file) => /^[a-f0-9]{64}\.json$/.test(file)).length
        : 0,
      0,
      'join without a durable launch acknowledgement cannot enable wakes'
    );
  };
  for (const status of ['reserved', 'outcome-unknown']) {
    atomicWrite(
      journalFile,
      `${JSON.stringify({
        ...original,
        stage: status === 'reserved' ? 'launch-pending' : 'outcome-unknown',
        provider_operation: { ...original.provider_operation, status },
      })}\n`
    );
    client = await ensureBroker({
      project,
      platform,
      runtimeImage: JSON.parse(process.env.APR_FIXTURE_IMAGE),
      versions: {
        package_version: '0.3.0',
        broker_protocol_version: 1,
        node_major: Number(process.versions.node.split('.')[0]),
      },
    });
    for (let observation = 0; observation < 2; observation++) {
      assert.equal((await requestBroker(client, 'status')).reviews, 1);
      assert.equal((await requestBroker(client, 'reconcile', workspace)).status, 'bootstrap');
      assertNoDelivery();
      const journal = JSON.parse(readFileSync(journalFile, 'utf8'));
      assert.equal(
        journal.provider_operation.operation_id,
        original.provider_operation.operation_id
      );
      assert.equal(journal.provider_operation.status, status);
    }
    if (status === 'reserved') await stopOwnedBroker();
  }
  // Inject an exact synthetic late acknowledgement through the production
  // receipt writer. The previously held executable is already terminated;
  // this surface never spawns a provider or retries its launch operation.
  const expected = {
    ...joined.state.protocol.startup.runtime.reviewer,
    adapter_version: joined.state.protocol.startup.runtime.adapter_version,
  };
  const adapter = createClaudeAdapter({
    surface: {
      async launch() {
        return {
          status: 'acknowledged',
          handle: held.session,
          observation: {
            provider: 'anthropic',
            host: 'claude-code',
            session_id: held.session,
            model_id: expected.model_id,
            effort: expected.effort,
            adapter_version: expected.adapter_version,
            assurance: 'runtime',
          },
        };
      },
    },
  });
  const destination = path.join(root, joined.state.protocol.startup.destination);
  const invitationPath = path.join(
    destination,
    readdirSync(destination).find((name) => name.endsWith('-reviewer-invitation.md'))
  );
  const acknowledged = await adapter.launchReviewer({
    invitationPath,
    expected,
    effort: expected.effort,
    operationId: original.provider_operation.operation_id,
    authorSessionFingerprint: joined.state.participants.author.session_fingerprint,
    scratchRoot: workspace,
  });
  assert.equal(
    acknowledged.observation.session_fingerprint,
    joined.state.participants.reviewer.session_fingerprint
  );
  // The killed synthetic launch left an unfinished reviewer transcript. Model
  // the independently completed provider turn that a late acknowledgement
  // represents; otherwise the return wake must correctly refuse that session.
  const transcript = path.join(
    process.env.HOME,
    '.claude',
    'projects',
    root.replace(/[^A-Za-z0-9]/g, '-'),
    `${held.session}.jsonl`
  );
  appendFileSync(
    transcript,
    `${JSON.stringify({
      type: 'assistant',
      sessionId: held.session,
      version: '2.1.278',
      timestamp: new Date().toISOString(),
      message: {
        role: 'assistant',
        model: expected.model_id,
        stop_reason: 'end_turn',
        content: [{ type: 'text', text: 'Synthetic reviewer launch turn completed.' }],
      },
    })}\n`
  );
  assert.equal(
    readClaudeSessionSnapshot({
      projectRoot: root,
      claudeHome: path.join(process.env.HOME, '.claude'),
      sessionId: held.session,
    }).phase,
    'terminal-snapshot',
    'synthetic late launch acknowledgement must include a completed reviewer turn'
  );
  await requestBroker(client, 'reconcile', workspace);
  const settled = JSON.parse(readFileSync(journalFile, 'utf8'));
  assert.equal(settled.stage, 'launched');
  assert.equal(settled.provider_operation.status, 'acknowledged');
  assert.equal(settled.provider_operation.operation_id, original.provider_operation.operation_id);
  assert.equal(
    settled.provider_operation.session_fingerprint,
    joined.state.participants.reviewer.session_fingerprint
  );
  console.log(
    'Simulated installed launch restart: reserved/unknown stay resident; exact late receipt promotes without relaunch.'
  );
  return client;
}
