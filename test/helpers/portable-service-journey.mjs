// @story #189
// Unverified lifecycle ports and real Node HTTP. No production admission.
import { randomBytes, createHash, randomUUID } from 'node:crypto';
import { createLoopbackServer } from '../../src/broker/http-server.mjs';
import { observeLoopbackOwnerCore } from '../../src/broker/owner-connection.mjs';
import { dispatchBrokerCommandCore } from '../../src/broker/broker-protocol.mjs';
import { createBrokerService } from '../../src/broker/service-core.mjs';
import { fakeClock } from './portable-broker-fixture.mjs';
export async function portableServiceJourney(
  t,
  {
    identity,
    versions,
    registrations = [],
    workerFactory = () => {
      throw new Error('Unexpected worker registration.');
    },
  }
) {
  let server,
    published = false,
    drained = false,
    released = false;
  const privateBinding = {
    credential: randomBytes(32).toString('hex'),
    instanceId: randomBytes(32).toString('hex'),
    worktree: identity.digest,
    ownerVersion: createHash('sha256').update(JSON.stringify(versions)).digest('hex'),
  };
  const service = createBrokerService({
    withOperationAuthority: async (_authority, operation) => operation(),
    assertCurrentOperationAuthority: async () => {},
    reserveReviewerLaunch: async () => {},
    settleReservedReviewerLaunch: async () => {},
  });
  const run = service.startBroker({
    identity,
    versions,
    clock: fakeClock(),
    registry: {
      list: async () => registrations,
      get: async (workspace) =>
        registrations.find((value) => value.workspace === workspace) ?? null,
    },
    workerFactory,
    owner: {
      instanceId: privateBinding.instanceId,
      publish: async () => {
        if (!server) throw new Error('publish before restoration/listening');
        published = true;
      },
      release: async () => {
        if (!drained) throw new Error('owner released before response drain');
        released = true;
      },
    },
    server: {
      start: async (dispatch) => {
        server = await createLoopbackServer({
          binding: privateBinding,
          dispatch: (req) =>
            dispatchBrokerCommandCore({
              request: { operation: req.operation, actionId: req.actionId, body: req.body },
              dispatch,
            }),
        });
      },
      close: async () => {
        await server.close();
        drained = true;
      },
    },
  });
  run.untilStopped.catch(() => {});
  await run.ready;
  t.after(async () => {
    if (server && !drained) await server.close();
  });
  const endpoint = { host: '127.0.0.1', port: server.port };
  return {
    verified: false,
    endpoint,
    privateBinding,
    run,
    request: async (command, workspace = null, overrides = {}) => {
      const context = { signal: new AbortController().signal, deadline: performance.now() + 30000 };
      const binding = { ...privateBinding, ...overrides };
      const proof = await observeLoopbackOwnerCore({
        endpoint,
        privateBinding: binding,
        expected: {
          instanceId: binding.instanceId,
          worktree: binding.worktree,
          ownerVersion: binding.ownerVersion,
        },
        ...context,
      });
      if (proof.kind !== 'core-live')
        return { ok: false, error: { code: 'APR_BROKER_AUTH_FAILED' } };
      try {
        return await proof.connection.request({
          operation: command,
          actionId: randomUUID(),
          body: workspace === null ? {} : { workspace },
          ...context,
        });
      } finally {
        await proof.connection.close(context);
      }
    },
    facts: () => ({ published, drained, released }),
  };
}
