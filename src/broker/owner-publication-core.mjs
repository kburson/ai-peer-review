// @story #175
import { performance } from 'node:perf_hooks';
import { AprError } from '../errors.mjs';

function refusal(reason) {
  return new AprError('APR_BROKER_STALE', 'Publication could not be established.', {
    recovery: 'Retain the exact publication and reconcile cleanup before a fresh transaction.',
    details: { reason },
  });
}

// Unverified protocol delegation only; the supplied store owns real effects and
// descriptor checks. No injected store or resulting handle is production authority.
export async function createHeldPrivatePublicationCore({ store, name, bytes, budget } = {}) {
  const original = { signal: budget?.signal, deadline: budget?.deadline };
  const now = budget?.clock || (() => performance.now());
  function check(context) {
    if (!(context?.signal instanceof AbortSignal) || !Number.isFinite(context?.deadline))
      throw refusal('operation-budget-unproved');
    if (context.signal !== original.signal || context.deadline !== original.deadline)
      throw refusal('publication-budget-mismatch');
    if (context.signal.aborted || now() >= context.deadline)
      throw refusal(context.signal.aborted ? 'operation-aborted' : 'operation-deadline');
  }
  check(original);
  const descriptor = await store.createExclusive(name, bytes);
  function report(error, mutationOccurred = false) {
    const result = refusal(error?.details?.reason || 'publication-effect-unproved');
    result.details = Object.freeze({
      ...result.details,
      mutationOccurred: mutationOccurred || error?.details?.mutationOccurred === true,
      retrySafe: false,
      obligations: Object.freeze([
        ...(error?.details?.obligations || []),
        descriptor.retainedGeneration(),
      ]),
    });
    return result;
  }
  try {
    check(original);
  } catch (error) {
    throw report(error, true);
  }
  let closed = false,
    busy = false;
  const operate = async (context, effect, mutating = false) => {
    check(context);
    if (busy || closed)
      throw refusal(busy ? 'owned-publication-busy' : 'owned-publication-retired');
    busy = true;
    let completed = false;
    try {
      const result = await effect();
      completed = true;
      check(context);
      return result;
    } catch (error) {
      throw report(error, completed && mutating);
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
    replace: (expected, value, context) =>
      operate(context, () => store.replace(expected, value), true),
    withdraw: (expected, context) => operate(context, () => store.unlink(expected), true),
    close: (context) =>
      operate(
        context,
        async () => {
          await store.close(descriptor);
          closed = true;
        },
        true
      ),
    retainedGeneration: () => descriptor.retainedGeneration(),
  });
}
