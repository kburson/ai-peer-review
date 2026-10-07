// @story #175
import { performance } from 'node:perf_hooks';
import { AprError } from '../errors.mjs';

// Unverified protocol delegation only; the supplied store owns real effects and
// descriptor checks. No injected store or resulting handle is production authority.
export async function createHeldPrivatePublicationCore({ store, name, bytes, budget } = {}) {
  const original = { signal: budget?.signal, deadline: budget?.deadline };
  const now = budget?.clock || (() => performance.now());
  function check(context) {
    if (!context || context.signal !== original.signal || context.deadline !== original.deadline)
      throw new AprError('APR_BROKER_STALE', 'Publication context changed.', {
        details: { reason: 'publication-budget-mismatch' },
      });
    if (!(context.signal instanceof AbortSignal) || !Number.isFinite(context.deadline))
      throw new AprError('APR_BROKER_STALE', 'Publication context is unproved.', {
        details: { reason: 'operation-budget-unproved' },
      });
    if (context.signal.aborted || now() >= context.deadline)
      throw new AprError('APR_BROKER_STALE', 'Publication context expired.', {
        details: { reason: context.signal.aborted ? 'operation-aborted' : 'operation-deadline' },
      });
  }
  check(original);
  const descriptor = await store.createExclusive(name, bytes);
  let closed = false,
    busy = false;
  const operate = async (context, effect) => {
    check(context);
    if (busy || closed)
      throw new AprError('APR_BROKER_STALE', 'Publication is unavailable.', {
        details: { reason: busy ? 'owned-publication-busy' : 'owned-publication-retired' },
      });
    busy = true;
    try {
      const result = await effect();
      check(context);
      return result;
    } finally {
      busy = false;
    }
  };
  return Object.freeze({
    verified: false,
    snapshot: (context) => operate(context, () => store.read(name)),
    verify: (context) =>
      operate(context, async () => {
        await store.read(name);
        return true;
      }),
    replace: (expected, value, context) => operate(context, () => store.replace(expected, value)),
    withdraw: (expected, context) => operate(context, () => store.unlink(expected)),
    close: (context) =>
      operate(context, async () => {
        await store.close(descriptor);
        closed = true;
      }),
    retainedGeneration: () => descriptor.retainedGeneration(),
  });
}
