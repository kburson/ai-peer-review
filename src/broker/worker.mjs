import { reconcileWake, runCoordinator } from '../coordinator/service.mjs';
import { statusReview } from '../protocol/service.mjs';

const TERMINAL_STATES = new Set([
  'accepted',
  'accepted-uncommitted',
  'accepted-over-objections',
  'accepted-over-objections-uncommitted',
  'abandoned',
  'superseded',
]);
const AUTHOR_ACTIONS = new Set([
  'finalize-acceptance',
  'commit-acceptance',
  'advance-phase-artifact',
]);

function classify(status, adapter) {
  if (TERMINAL_STATES.has(status?.state)) return 'terminal';
  if (
    status?.review?.recovery?.fenced ||
    ['launch-pending', 'outcome-unknown'].includes(status?.review?.recovery?.stage)
  )
    return 'recovery-only';
  const action = status?.next_action?.action ?? status?.next_action ?? null;
  if (AUTHOR_ACTIONS.has(action)) return 'runnable';
  if (status?.state === 'intervention-required' || action === 'human-intervention') {
    return 'recovery-only';
  }
  return adapter?.automatic === true || typeof adapter?.deliver === 'function'
    ? 'automatic-wait'
    : 'recovery-only';
}

export function createReviewWorker({
  registration,
  adapter,
  resourceLease,
  clock,
  inspectStatus = statusReview,
  reconcile = reconcileWake,
  coordinator = runCoordinator,
} = {}) {
  if (!registration || typeof registration.workspace !== 'string') {
    throw new TypeError('broker-worker: registration workspace is required');
  }
  let status = null;
  let state = 'runnable';
  let started = false;
  let suspended = false;
  let closed = false;
  let coordinatorStop = null;
  let coordinatorRun = null;
  let coordinatorFailure = null;
  let recoveryPersisted = false;
  const listeners = new Set();
  const guardedAdapter = adapter && {
    ...adapter,
    async deliver(input) {
      const fresh = inspectStatus(registration.workspace, {
        now: new Date(clock?.now?.() ?? Date.now()),
      });
      const evidence = fresh.review?.recovery;
      if (
        suspended ||
        closed ||
        evidence?.fenced ||
        (evidence && evidence.event_revision !== input.expected_revision)
      ) {
        return { status: 'refused', reason: 'manual-recovery-fence-or-stale-revision' };
      }
      return adapter.deliver(input);
    },
  };

  const observe = () => {
    status = inspectStatus(registration.workspace, { now: new Date(clock?.now?.() ?? Date.now()) });
    state = classify(status, adapter);
    return state;
  };
  const notify = () => {
    for (const listener of listeners) listener(state);
  };
  const persistRecovery = async () => {
    if (recoveryPersisted || state === 'terminal') return;
    await adapter?.persistRecovery?.({ registration, status, cause: coordinatorFailure });
    recoveryPersisted = true;
    suspended = true;
    state = 'recovery-only';
    notify();
  };
  const startCoordinator = () => {
    const input = adapter?.coordinatorInput;
    if (!input || coordinatorRun) return;
    let stop;
    const stopped = new Promise((resolve) => {
      stop = resolve;
    });
    coordinatorStop = stop;
    const running = coordinator({
      ...input,
      workspace: registration.workspace,
      adapter: guardedAdapter,
      onStarted(controller) {
        coordinatorStop = controller.stop;
        return input.onStarted?.(controller);
      },
      async onSettled(...args) {
        await input.onSettled?.(...args);
        observe();
        notify();
        if (state === 'terminal' || state === 'recovery-only') coordinatorStop?.();
      },
      async beforeRelease(...args) {
        if (state !== 'terminal') {
          try {
            observe();
          } catch (error) {
            coordinatorFailure ??= error;
          }
          await persistRecovery();
        }
        await input.beforeRelease?.(...args);
      },
      waitForStop: async ({ untilStopped }) => Promise.race([untilStopped, stopped]),
    });
    coordinatorRun = Promise.resolve(running).catch((error) => {
      coordinatorFailure = error;
      state = 'recovery-only';
      notify();
    });
  };

  return Object.freeze({
    async start() {
      if (closed) throw new Error('broker-worker: closed');
      if (!started) {
        started = true;
        observe();
        if (state === 'automatic-wait') startCoordinator();
      }
      return state;
    },
    async reconcile() {
      if (suspended || closed) return state;
      if (!started) await this.start();
      observe();
      if (
        state === 'automatic-wait' &&
        adapter?.observation &&
        typeof adapter?.deliver === 'function'
      ) {
        await reconcile({
          workspace: registration.workspace,
          observation:
            typeof adapter.observation === 'function'
              ? await adapter.observation(registration)
              : adapter.observation,
          adapter: guardedAdapter,
          now: clock?.now?.() ?? Date.now(),
        });
      }
      return observe();
    },
    async suspend() {
      if (suspended || closed) return state;
      coordinatorStop?.();
      if (coordinatorRun) await coordinatorRun;
      if (!coordinatorFailure && !recoveryPersisted) observe();
      await persistRecovery();
      if (recoveryPersisted) state = 'recovery-only';
      return state;
    },
    async close() {
      if (closed) return;
      if (state !== 'terminal' && !suspended) await this.suspend();
      closed = true;
      coordinatorStop?.();
      if (coordinatorRun) await coordinatorRun;
      if (!coordinatorRun) await adapter?.close?.();
      await resourceLease?.release?.();
    },
    onStateChange(listener) {
      if (typeof listener !== 'function') throw new TypeError('broker-worker: listener required');
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    workState() {
      return state;
    },
  });
}

export { classify as classifyReviewWork };
