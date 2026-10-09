// @story #189
// Explicit unverified orchestration core. Production fixes every dependency.
import { randomUUID } from 'node:crypto';
import { AprError } from '../errors.mjs';
import { validateCommand } from './broker-protocol.mjs';
export function createPortableClientCore({
  observe,
  launch,
  current,
  effect,
  delay,
  clock = performance,
}) {
  const retained = new Set();
  const failure = (reason, cause) => {
    const error = new AprError(
      'APR_BROKER_START_FAILED',
      'Portable broker readiness is unproved.',
      {
        recovery: 'Retain exact startup and owner obligations; reconcile before retrying.',
        details: { reason },
      }
    );
    if (cause) error.cause = cause;
    return error;
  };
  const check = async (context) => {
    if (context.signal.aborted || clock.now() >= context.deadline)
      throw failure('readiness-budget-expired');
    await current();
  };
  async function ensure(input, context) {
    await check(context);
    let state = await observe(input, context);
    if (state.status === 'live') {
      await state.close();
      await check(context);
      return;
    }
    if (state.status === 'pending') {
      // An existing prepared owner can only be awaited, never promoted or
      // replaced from partial publication. The original budget stays sealed.
      do {
        await check(context);
        await delay(Math.min(25, Math.max(1, context.deadline - clock.now())), context);
        await check(context);
        state = await observe(input, context);
      } while (state.status === 'pending');
      if (state.status !== 'live') throw failure('owner-observation-unproved', state.error);
      retained.add(state);
      await state.close();
      retained.delete(state);
      await check(context);
      return;
    }
    if (!['missing', 'dead'].includes(state.status))
      throw failure('owner-observation-unproved', state.error);
    // A candidate process still must win genuine C3 before publishing anything.
    // Silence, busy, conflicting generations and unknown observations never launch.
    await check(context);
    const process = await effect(() => launch(input, context));
    retained.add(process);
    try {
      await process.ready;
      while (true) {
        await check(context);
        state = await observe(input, context);
        if (state.status === 'live') {
          await state.close();
          await check(context);
          process.unref();
          retained.delete(process);
          return;
        }
        if (!['missing', 'pending', 'dead'].includes(state.status))
          throw failure('owner-observation-unproved', state.error);
        if (process.exited()) throw failure('broker-process-exited-before-readiness');
        await delay(Math.min(25, Math.max(1, context.deadline - clock.now())), context);
      }
    } catch (error) {
      throw failure('broker-startup-incomplete', error);
    }
  }
  async function request(input, command, workspace, context) {
    const message = validateCommand({ id: randomUUID(), command, workspace });
    await check(context);
    let state = await observe(input, context);
    if (
      ['missing', 'dead', 'pending'].includes(state.status) &&
      command !== 'status' &&
      input.runtimeImage
    ) {
      await ensure(input, context);
      state = await observe(input, context);
    }
    if (['missing', 'dead'].includes(state.status))
      throw new AprError(
        'APR_BROKER_STALE',
        'Owner absence was observed before command dispatch.',
        {
          recovery:
            'Acquire the recorded compatible broker runtime through guarded reconciliation.',
          details: {
            reason: 'owner-absent-before-dispatch',
            ownerState: state.status,
            mutationOccurred: false,
            retrySafe: true,
          },
        }
      );
    if (state.status !== 'live') throw failure('owner-observation-unproved', state.error);
    retained.add(state);
    try {
      await check(context);
      const response = await state.request({
        operation: command,
        actionId: message.id,
        body: workspace === null ? {} : { workspace },
        ...context,
      });
      if (
        response?.schema !== 'ai-peer-review.response/v1' ||
        response.action_id !== message.id ||
        typeof response.ok !== 'boolean'
      )
        throw failure('command-response-unproved');
      if (!response.ok)
        throw new AprError(response.error.code, response.error.message, {
          details: {
            mutationOccurred: response.mutation_occurred,
            retrySafe: response.retry_safe,
            nextAction: response.next_action,
          },
          recovery: 'Reconcile the exact command outcome before retrying.',
        });
      await check(context);
      return response.result;
    } finally {
      await state.close();
      retained.delete(state);
    }
  }
  return Object.freeze({ verified: false, ensure, request });
}
