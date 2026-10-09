// @story #177
import { AsyncLocalStorage } from 'node:async_hooks';
import { performance } from 'node:perf_hooks';
import { encodeRequestCanonical } from '../api/canonical-json.mjs';
import { AprError } from '../errors.mjs';

// Pure comparison only: matching facts never confer producer membership.
export function sameProcessOwnerFacts(left, right) {
  const fields = ['host', 'pid', 'creation', 'creationSource'];
  const project = (value) =>
    Object.fromEntries(
      fields.filter((key) => value?.[key] !== undefined).map((key) => [key, value[key]])
    );
  try {
    return (
      typeof left?.host === 'string' &&
      Number.isSafeInteger(left?.pid) &&
      encodeRequestCanonical(project(left)).equals(encodeRequestCanonical(project(right)))
    );
  } catch {
    return false;
  }
}
const operation = new AsyncLocalStorage();
const lifecycleRecords = new WeakMap();
function refusal(reason, outstandingObligations = []) {
  return new AprError('APR_BROKER_STALE', 'Owner lifecycle could not be proved.', {
    recovery: 'Retain the exact owner, slot and unresolved cleanup obligations.',
    details: { reason, outstandingObligations },
  });
}
export function assertLifecycleBoundary() {
  if (operation.getStore()) throw refusal('nested-lifecycle-operation');
}
// Read-only private-frame observation. An injected core is never genuine authority.
export function currentLifecycleOperation(owner) {
  const frame = operation.getStore();
  return frame?.owner === owner && frame.active ? frame.context : null;
}
export function currentLifecyclePhase(owner) {
  const frame = operation.getStore();
  return frame?.owner === owner && frame.active ? frame.phase : null;
}
export function ownerLifecycleCompleted(owner) {
  const state = lifecycleRecords.get(owner);
  return state?.completed === true && !state.retired && !state.fenced;
}

export async function createOwnerLifecycleCore({ ports, budget } = {}) {
  const now = typeof budget?.clock === 'function' ? budget.clock : () => performance.now();
  const original = Object.freeze({ signal: budget?.signal, deadline: budget?.deadline });
  const publications = [ports?.publication, ports?.credential, ports?.endpoint].filter(Boolean);
  if (
    !ports?.publication ||
    !ports?.endpoint ||
    !ports?.source?.observe ||
    !ports?.ready?.verify ||
    !publications.every((item) =>
      ['verify', 'withdraw', 'close'].every((key) => typeof item[key] === 'function')
    )
  )
    throw refusal('lifecycle-ports-unproved');
  const state = { completed: false, phase: 'idle', retired: false, fenced: false };
  const obligations = () => {
    let transport = [];
    if (ports.transport) {
      try {
        transport = ports.transport.obligations?.();
        if (!Array.isArray(transport)) throw Error('unavailable transport metadata');
      } catch {
        transport = [{ name: 'owner-transport', outcome: 'transport-obligations-unavailable' }];
      }
    }
    return [
      ...publications.map((item) => item.retainedGeneration?.()).filter(Boolean),
      ports.lease?.retainedGeneration?.(),
      ...transport,
    ].filter(Boolean);
  };
  const check = (context) => {
    const value = now();
    if (
      !(context?.signal instanceof AbortSignal) ||
      !Number.isFinite(context?.deadline) ||
      !Number.isFinite(value) ||
      context.deadline - value > 30000
    )
      throw refusal('operation-budget-unproved');
    if (context.signal.aborted || value >= context.deadline)
      throw refusal(context.signal.aborted ? 'operation-aborted' : 'operation-deadline');
  };
  check(original);
  const checked = async (context, effect) => {
    check(context);
    const result = await effect();
    check(context);
    return result;
  };
  const prove = async (context) => {
    if (ports.lease) await checked(context, () => ports.lease.assert(context));
    if ((await checked(context, () => ports.source.observe(context))) !== true)
      throw refusal('owner-source-unproved');
    for (const item of publications)
      if ((await checked(context, () => item.verify(context))) !== true)
        throw refusal('owner-publication-unproved');
    if ((await checked(context, () => ports.ready.verify(context))) !== true)
      throw refusal('owner-readiness-unproved');
  };
  const operate = async (phase, supplied, effect) => {
    if (operation.getStore()) throw refusal('nested-lifecycle-operation', obligations());
    if (state.phase !== 'idle') throw refusal('owner-operation-busy', obligations());
    if (state.retired || state.fenced)
      throw refusal(state.retired ? 'owner-retired' : 'owner-fenced', obligations());
    if (phase !== 'publish' && !state.completed && supplied !== undefined)
      throw refusal('startup-incomplete', obligations());
    const context =
      phase === 'publish' || !state.completed
        ? original
        : Object.freeze({ signal: supplied?.signal, deadline: supplied?.deadline });
    try {
      check(context);
    } catch (error) {
      throw refusal(error.details.reason, obligations());
    }
    state.phase = phase; // Reserve before the first await, including release.
    const frame = { owner, context, phase, active: true };
    try {
      return await operation.run(frame, () => effect(context));
    } catch (error) {
      state.fenced = true;
      throw refusal(error?.details?.reason || 'owner-operation-unproved', [
        ...(error?.details?.outstandingObligations || error?.details?.obligations || []),
        ...obligations(),
      ]);
    } finally {
      frame.active = false; // Detached callbacks cannot retain operation authority.
      state.phase = 'idle';
    }
  };
  const owner = Object.freeze({
    verified: false,
    publish: () =>
      operate('publish', undefined, async (context) => {
        if (state.completed) throw refusal('startup-already-completed');
        await prove(context);
        state.completed = true;
      }),
    verify: (context) =>
      operate('verify', context, async (admitted) => {
        await prove(admitted);
        return true;
      }),
    release: (context) =>
      operate('release', context, async (admitted) => {
        await prove(admitted);
        if (
          ports.transport &&
          (await checked(admitted, () => ports.transport.stop(admitted))) !== true
        )
          throw refusal('owner-transport-close-unproved');
        for (const item of publications) await checked(admitted, () => item.withdraw(admitted));
        for (const item of publications) await checked(admitted, () => item.close(admitted));
        if (ports.lease) {
          const result = await checked(admitted, () => ports.lease.release(admitted));
          if (result?.status !== 'withdrawn' || result.obligations?.length)
            throw refusal('slot-withdrawal-unproved', result?.obligations || []);
        }
        state.retired = true;
        return Object.freeze({ released: true, outstandingObligations: Object.freeze([]) });
      }),
  });
  lifecycleRecords.set(owner, state);
  return owner;
}
