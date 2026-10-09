// @story #189
// Explicit unverified consumer ports over real authenticated loopback HTTP.
// These fixtures never enter production owner/service/connection maps.
import { portableBrokerFixture } from './portable-broker-fixture.mjs';
import { observeLoopbackOwnerCore } from '../../src/broker/owner-connection.mjs';
import { createPortableClientCore } from '../../src/broker/client-core.mjs';
export async function portableConsumerJourney(t, scenario = {}) {
  let now = performance.now(),
    current = true,
    live = null,
    launches = 0,
    commands = 0;
  const context = { signal: new AbortController().signal, deadline: now + 30000 };
  const input = {
    project: { physicalRoot: '/fixture/project' },
    runtimeImage: { root: '/fixture/image' },
  };
  const start = async () => {
    live = await portableBrokerFixture(t, {
      realClock: true,
      dispatch: async (req) => {
        commands++;
        now += scenario.commandMs ?? 0;
        return {
          schema: 'ai-peer-review.response/v1',
          ok: true,
          mutation_occurred: false,
          retry_safe: true,
          next_action: null,
          action_id: req.actionId,
          result: { status: 'stopped' },
          error: null,
        };
      },
    });
  };
  const close = async () => {
    const old = live;
    live = null;
    if (old) {
      old.agent.destroy();
      await old.server.close();
    }
  };
  const core = createPortableClientCore({
    clock: { now: () => now },
    current: async () => {
      if (!current) throw new Error('current authority changed');
    },
    effect: async (operation) => {
      if (!current) throw new Error('current authority changed');
      return operation();
    },
    delay: async (ms) => {
      now += ms;
    },
    launch: async () => {
      launches++;
      now += scenario.recoveryMs ?? 0;
      if (now < context.deadline) await start();
      return { ready: Promise.resolve(), exited: () => false, unref() {} };
    },
    observe: async (_input, received) => {
      if (received !== context) throw new Error('operation context renewed');
      if (!live) return { status: 'missing' };
      now += scenario.occupiedMs ?? 0;
      const proof = await observeLoopbackOwnerCore({
        endpoint: live.endpoint,
        privateBinding: live.privateBinding,
        expected: {
          instanceId: live.privateBinding.instanceId,
          worktree: live.privateBinding.worktree,
          ownerVersion: live.privateBinding.ownerVersion,
        },
        ...context,
      });
      if (proof.kind !== 'core-live') throw new Error('actual owner proof failed');
      if (scenario.retireDuringHandshake && commands === 0 && launches === 0) {
        await proof.connection.close(context);
        await close();
        if (scenario.authorityDrift) current = false;
        return { status: 'missing' };
      }
      return {
        status: 'live',
        request: (options) => proof.connection.request(options),
        close: () => proof.connection.close(context),
      };
    },
  });
  return {
    verified: false,
    core,
    input,
    context,
    start,
    retire: close,
    prepare: () => {
      now += scenario.prepareMs ?? 0;
    },
    drift: () => {
      current = false;
    },
    facts: () => ({ now, launches, commands, advertised: live !== null }),
  };
}
