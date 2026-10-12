// @story #190
// Resource lifetime only: neither these ports nor diagnostics grant membership.
import { AsyncLocalStorage } from 'node:async_hooks';
import { performance } from 'node:perf_hooks';
import { AprError } from '../errors.mjs';

const outcomes = new WeakMap();
export function selectionScopeOutcome(error) {
  return outcomes.get(error)?.public ?? null;
}
// CLI projection only; the actual callback exception and private receipt remain
// untouched. These bounded categories cannot establish operational membership.
export function renderSelectionScopeFailure(error) {
  const outcome = selectionScopeOutcome(error);
  if (!outcome) return null;
  const effect =
    outcome.effect === 'committed'
      ? 'Primary effect committed'
      : outcome.effect === 'unknown'
        ? 'Primary effect status unknown'
        : 'No primary effect committed';
  return Object.freeze({
    schema: 'ai-peer-review.error/v1',
    code: error instanceof AprError ? error.code : 'APR_INTERNAL',
    message:
      effect +
      '; selection scope completion uncertain.' +
      (outcome.infrastructure ? ' Infrastructure may exist.' : ''),
    recovery:
      'Inspect the actual primary record and retained cleanup before explicit recovery; do not automatically retry.',
    details: Object.freeze({ selection_scope: outcome }),
    mutation_occurred: outcome.effect !== 'none' || Boolean(outcome.infrastructure),
    retry_safe: false,
  });
}
function refusal(reason) {
  return new AprError(
    'APR_SELECTION_SCOPE_UNAVAILABLE',
    'Selection scope completion is unavailable.',
    {
      recovery: 'Inspect the actual operation and retained cleanup before explicit recovery.',
      details: { reason },
    }
  );
}
function check(context) {
  if (!(context?.signal instanceof AbortSignal) || !Number.isFinite(context.deadline))
    throw refusal('invalid-context');
  if (context.signal.aborted || performance.now() >= context.deadline)
    throw refusal('expired-context');
}
const fields = ['directory', 'home', 'uid', 'principal'];
function copyTuple(tuple) {
  if (
    !tuple ||
    Object.keys(tuple).length !== 4 ||
    !['directory', 'home', 'principal'].every(
      (key) => typeof tuple[key] === 'string' && tuple[key]
    ) ||
    !Number.isSafeInteger(tuple.uid)
  )
    throw refusal('invalid-identity');
  return Object.freeze(Object.fromEntries(fields.map((key) => [key, tuple[key]])));
}
// Waiting consumes the actual original clock. It never cancels somebody else's
// signal or drops the operation when the deadline wins the race.
function bounded(promise, context, observeAbort = true) {
  return new Promise((resolve, reject) => {
    const expired = () => finish(reject, refusal('quiescence-unproved'));
    const timer = setTimeout(expired, Math.max(1, Math.ceil(context.deadline - performance.now())));
    function finish(settle, value) {
      clearTimeout(timer);
      context.signal.removeEventListener('abort', expired);
      settle(value);
    }
    if (observeAbort) context.signal.addEventListener('abort', expired, { once: true });
    Promise.resolve(promise).then(
      (value) => finish(resolve, value),
      (error) => finish(reject, error)
    );
    if (observeAbort && context.signal.aborted) expired();
  });
}
export function createSelectionReadScope({ finalize }) {
  if (typeof finalize !== 'function') throw refusal('finalizer-unavailable');
  const association = new AsyncLocalStorage(),
    admissions = new AsyncLocalStorage(),
    registry = new WeakMap(),
    live = new Set();
  function lookup(context) {
    return registry.get(context?.signal)?.get(context.deadline);
  }
  function poison(entry, error) {
    if (!entry.hasFailure) entry.failure = error;
    entry.hasFailure = true;
    if (entry.state !== 'uncertain') entry.state = 'poisoned';
  }
  async function close(entry) {
    if (entry.guard && !entry.closed) {
      // Retain a particular pending close so a timeout cannot trigger a second
      // close on the same descriptor while its first close is still in flight.
      entry.closing ??= Promise.resolve()
        .then(() => entry.guard.close())
        .then(
          () => {
            entry.closed = true;
          },
          (error) => {
            entry.closing = null;
            throw error;
          }
        );
      await bounded(entry.closing, entry.context, false);
    }
    if (entry.acquisitionCleanup) {
      entry.cleaning ??= Promise.resolve()
        .then(() => entry.acquisitionCleanup.retryCleanup())
        .then(
          () => {
            entry.acquisitionCleanup = null;
          },
          (error) => {
            entry.cleaning = null;
            throw error;
          }
        );
      await bounded(entry.cleaning, entry.context, false);
    }
  }
  function sink(entry) {
    const writable = () => {
      if (entry.callbackFinished) throw refusal('effect-sink-closed');
      check(entry.context);
    };
    return Object.freeze({
      infrastructurePossible() {
        writable();
        entry.infrastructurePossible = true;
      },
      infrastructureObserved(observation) {
        writable();
        entry.infrastructurePossible = true;
        (entry.infrastructure ??= []).push(observation);
      },
      possible() {
        writable();
        if (entry.effect === 'committed') throw refusal('effect-backward');
        entry.effect = 'unknown';
      },
      committed(receipt, result) {
        writable();
        if (entry.effect === 'committed' && entry.receipt === receipt && entry.result === result)
          return;
        if (entry.effect !== 'unknown' || receipt == null) throw refusal('effect-transition');
        entry.effect = 'committed';
        entry.receipt = receipt;
        entry.result = result;
      },
    });
  }
  async function complete(entry, callbackError) {
    entry.callbackFinished = true;
    if (entry.state === 'open') entry.state = 'closing';
    try {
      await bounded(Promise.allSettled([...entry.pending]), entry.context);
      if (entry.callbackPending) throw refusal('callback-exit-unproved');
      // Failed acquisition handles require an explicit recovery retry, rather
      // than a hidden retry during completion.
      if (entry.acquisitionCleanup) throw refusal('acquisition-cleanup-retained');
      await close(entry);
      live.delete(entry);
      if (entry.hasFailure || callbackError) {
        entry.state = 'poisoned';
        throw callbackError ? callbackError.error : entry.failure;
      }
      check(entry.context);
      const finalized = finalize(entry.context, entry.tuple, entry.witness);
      if (finalized?.then) throw refusal('asynchronous-finalizer');
      entry.state = 'closed-clean';
    } catch (error) {
      const retained =
        entry.callbackPending ||
        entry.pending.size > 0 ||
        (entry.guard && !entry.closed) ||
        entry.acquisitionCleanup;
      entry.state = retained ? 'uncertain' : 'poisoned';
      if (!retained) live.delete(entry);
      const failure = callbackError
        ? callbackError.error
        : entry.hasFailure
          ? entry.failure
          : error instanceof AprError
            ? error
            : refusal('completion-integrity-unproved');
      if ((typeof failure === 'object' && failure !== null) || typeof failure === 'function')
        outcomes.set(
          failure,
          Object.freeze({
            entry,
            public: Object.freeze({
              effect: entry.effect,
              completion: 'uncertain',
              cleanup: retained ? 'retained' : 'discharged',
              ...(entry.infrastructurePossible ? { infrastructure: 'may-exist' } : {}),
            }),
          })
        );
      throw failure;
    }
  }
  return Object.freeze({
    async run(context, callback) {
      check(context);
      if (context.deadline - performance.now() > 30000) throw refusal('excess-budget');
      if (association.getStore()) throw refusal('lexical-nesting');
      if (lookup(context)) throw refusal('context-already-used');
      if ([...live].some((entry) => entry.state === 'uncertain')) throw refusal('cleanup-retained');
      if (live.size >= 64) throw refusal('live-overflow');
      const entry = {
        state: 'open',
        context: Object.freeze({ signal: context.signal, deadline: context.deadline }),
        pending: new Set(),
        queued: 0,
        tail: Promise.resolve(),
        effect: 'none',
        callbackFinished: false,
      };
      let map = registry.get(context.signal);
      if (!map) registry.set(context.signal, (map = new Map()));
      map.set(context.deadline, entry);
      live.add(entry);
      return association.run(entry, async () => {
        let value, error;
        entry.callbackPending = true;
        const callbackResult = Promise.resolve()
          .then(() => callback(sink(entry)))
          .then(
            (result) => {
              entry.callbackPending = false;
              return result;
            },
            (failure) => {
              entry.callbackPending = false;
              throw failure;
            }
          );
        try {
          value = await bounded(callbackResult, entry.context);
        } catch (failure) {
          error = { error: failure };
          poison(entry, failure);
        }
        await complete(entry, error);
        return value;
      });
    },
    async track(context, operation) {
      const entry = lookup(context);
      if (!entry || entry.state === 'closed-clean') return operation();
      try {
        check(context);
        if (entry.state !== 'open') throw refusal('scope-not-open');
        if ((entry.trackedCount ?? 0) >= 65) throw refusal('admission-overflow');
      } catch (error) {
        poison(entry, error);
        throw error;
      }
      const token = { entry, settled: false };
      entry.trackedCount = (entry.trackedCount ?? 0) + 1;
      const call = admissions.run(token, async () => {
        try {
          return await operation();
        } catch (error) {
          poison(entry, error);
          throw error;
        } finally {
          token.settled = true;
          entry.trackedCount--;
        }
      });
      entry.pending.add(call);
      void call.then(
        () => entry.pending.delete(call),
        () => entry.pending.delete(call)
      );
      return call;
    },
    async use(context, tuple, acquire, operation) {
      const entry = lookup(context);
      if (!entry || entry.state === 'closed-clean') return { borrowed: false };
      try {
        check(context);
        const token = admissions.getStore();
        if (
          entry.state !== 'open' &&
          !(entry.state === 'closing' && token?.entry === entry && !token.settled)
        )
          throw refusal('scope-not-open');
        const copied = copyTuple(tuple);
        if (entry.tuple && fields.some((key) => entry.tuple[key] !== copied[key]))
          throw refusal('identity-changed');
        if (entry.queued >= 64) throw refusal('queue-overflow');
        entry.tuple ??= copied;
      } catch (error) {
        poison(entry, error);
        throw error;
      }
      const previous = entry.tail;
      entry.queued++;
      const call = (async () => {
        try {
          await bounded(previous, entry.context);
          entry.queued--;
          check(entry.context);
          // Closing accepts already tracked calls, poisoned/uncertain does not.
          if (entry.hasFailure) throw entry.failure;
          if (entry.state === 'uncertain') throw refusal('scope-poisoned');
          entry.initialization ??= Promise.resolve()
            .then(() => acquire(entry.context, entry.tuple))
            .then(
              (guard) => {
                entry.guard = guard;
                return guard;
              },
              (error) => {
                if (typeof error?.retryCleanup === 'function') entry.acquisitionCleanup = error;
                throw error;
              }
            );
          const guard = await entry.initialization;
          check(entry.context);
          const value = await operation(guard);
          check(entry.context);
          return { borrowed: true, value };
        } catch (error) {
          poison(entry, error);
          throw error;
        }
      })();
      entry.pending.add(call);
      entry.tail = call.then(
        () => {},
        () => {}
      );
      void call.then(
        () => entry.pending.delete(call),
        () => entry.pending.delete(call)
      );
      return call;
    },
    noteWitness(context, witness) {
      const entry = lookup(context);
      if (!entry || entry.hasFailure || !['open', 'closing'].includes(entry.state))
        throw refusal('witness-unavailable');
      check(context);
      entry.witness = witness;
    },
    assertRegistrationAllowed() {
      if (live.size) throw refusal('registration-during-scope');
    },
    async retryCleanup() {
      for (const entry of live) {
        if (entry.state !== 'uncertain') continue;
        if (entry.callbackPending || entry.pending.size) throw refusal('pending-cleanup');
        try {
          await close(entry);
        } catch {
          throw refusal('cleanup-unproved');
        }
        live.delete(entry);
        entry.state = 'poisoned';
      }
    },
  });
}
