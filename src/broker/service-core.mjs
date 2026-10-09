import { AprError } from '../errors.mjs';

// @story #136
export function createBrokerService({
  withOperationAuthority,
  withLifecycleAuthority = withOperationAuthority,
  assertCurrentOperationAuthority,
  reserveReviewerLaunch,
  settleReservedReviewerLaunch,
}) {
  if (
    typeof withOperationAuthority !== 'function' ||
    typeof withLifecycleAuthority !== 'function' ||
    typeof assertCurrentOperationAuthority !== 'function'
  )
    throw new TypeError('Explicit broker authority required');
  const IDLE_MILLISECONDS = 60_000;
  const ACTIVE_STATES = new Set(['bootstrap', 'runnable', 'automatic-wait']);
  // Exact unresolved handles must survive the rejected startup/shutdown promise.
  const retainedServices = new Set();

  function fail(code, message, recovery, details = {}) {
    throw new AprError(code, message, { recovery, details });
  }

  function assertInput({ identity, owner, versions, registry, workerFactory, clock, server }) {
    if (
      !identity ||
      !/^[a-f0-9]{64}$/.test(identity.digest ?? '') ||
      typeof identity.physicalRoot !== 'string' ||
      typeof registry?.list !== 'function' ||
      typeof registry?.get !== 'function' ||
      typeof workerFactory !== 'function' ||
      typeof clock?.now !== 'function' ||
      typeof clock?.setTimeout !== 'function' ||
      typeof clock?.clearTimeout !== 'function' ||
      typeof server?.start !== 'function' ||
      typeof server?.close !== 'function' ||
      !owner ||
      !versions
    ) {
      fail(
        'APR_BROKER_START_FAILED',
        'Broker service dependencies are incomplete.',
        'Restore the exact package runtime and retry project broker startup.'
      );
    }
  }

  function assertRegistration(identity, registration) {
    if (
      !registration ||
      registration.project_digest !== identity.digest ||
      typeof registration.review_id !== 'string' ||
      typeof registration.workspace !== 'string'
    ) {
      fail(
        'APR_BROKER_AUTH_FAILED',
        'Review registration does not belong to this project broker.',
        'Route the review through the broker derived from its canonical project root.',
        {
          broker_project_digest: identity.digest,
          registration_project_digest: registration?.project_digest ?? null,
        }
      );
    }
    return registration;
  }

  async function runBroker(input = {}) {
    assertInput(input);
    const { identity, owner, versions, registry, workerFactory, clock, server } = input;
    const workers = new Map();
    const launchRuns = new Map();
    const workerSubscriptions = new Map();
    let idleTimer = null;
    let stopped = false;
    let sequence = Promise.resolve();
    let resolveStopped;
    const untilStopped = new Promise((resolve) => {
      resolveStopped = resolve;
    });

    const clearIdle = () => {
      if (idleTimer !== null) clock.clearTimeout(idleTimer);
      idleTimer = null;
    };
    const stop = () => {
      if (stopped) return;
      stopped = true;
      clearIdle();
      resolveStopped();
    };
    const scheduleIdle = () => {
      clearIdle();
      idleTimer = clock.setTimeout(stop, IDLE_MILLISECONDS);
    };
    const addWorker = async (registration) => {
      const valid = assertRegistration(identity, registration);
      const existing = workers.get(valid.workspace);
      if (existing) return existing;
      const worker = await workerFactory(valid);
      if (!worker || typeof worker.workState !== 'function') {
        fail(
          'APR_BROKER_START_FAILED',
          'Broker worker factory returned an incomplete worker.',
          'Restore the exact package runtime and retry project broker startup.',
          { review_id: valid.review_id }
        );
      }
      workers.set(valid.workspace, worker);
      if (typeof worker.onStateChange === 'function') {
        const unsubscribe = worker.onStateChange(() => {
          const operation = sequence.then(() =>
            withLifecycleAuthority(
              { operation: 'broker.reconcile', cwd: identity.physicalRoot },
              () => settleWorkers({ resetIdle: true })
            )
          );
          sequence = operation.catch(() => stop());
        });
        workerSubscriptions.set(valid.workspace, unsubscribe);
      }
      await assertCurrentOperationAuthority();
      await worker.start();
      await assertCurrentOperationAuthority();
      return worker;
    };
    const settleWorkers = async ({ resetIdle = false } = {}) => {
      for (const [workspace, worker] of [...workers]) {
        const state = worker.workState();
        if (state === 'recovery-only') {
          await input.cleanupGuard?.();
          await assertCurrentOperationAuthority();
          await worker.suspend();
          await assertCurrentOperationAuthority();
          await input.cleanupGuard?.();
          await assertCurrentOperationAuthority();
          await worker.close();
          await assertCurrentOperationAuthority();
          workerSubscriptions.get(workspace)?.();
          workerSubscriptions.delete(workspace);
          workers.delete(workspace);
        } else if (state === 'terminal') {
          await input.cleanupGuard?.();
          await assertCurrentOperationAuthority();
          await worker.close();
          await assertCurrentOperationAuthority();
          workerSubscriptions.get(workspace)?.();
          workerSubscriptions.delete(workspace);
          workers.delete(workspace);
        } else if (!ACTIVE_STATES.has(state)) {
          fail(
            'APR_BROKER_START_FAILED',
            'Review worker returned an unknown lifecycle state.',
            'Preserve broker evidence and inspect the exact worker runtime.',
            { workspace, state }
          );
        }
      }
      if ([...workers.values()].some((worker) => ACTIVE_STATES.has(worker.workState()))) {
        clearIdle();
      } else if (resetIdle || idleTimer === null) {
        scheduleIdle();
      }
    };
    const dispatch = async (message) => {
      if (stopped) {
        fail(
          'APR_BROKER_STALE',
          'Broker service is stopping.',
          'Reconnect to the compatible project broker and retry.'
        );
      }
      if (message?.command === 'status') {
        return Object.freeze({
          status: 'running',
          project_digest: identity.digest,
          package_version: versions.package_version,
          broker_protocol_version: versions.broker_protocol_version,
          node_major: versions.node_major,
          reviews: workers.size,
        });
      }
      if (message?.command === 'stop') {
        const unreconciled = [];
        try {
          await input.cleanupGuard?.();
          for (const registration of await registry.list()) {
            const worker = await addWorker(registration);
            if (worker.workState() === 'recovery-only') unreconciled.push(registration.workspace);
          }
          await settleWorkers();
        } catch (error) {
          fail(
            'APR_BROKER_STOP_REFUSED',
            'Broker registration or worker authority could not be reconciled before stop.',
            'Preserve project broker evidence and reconcile the exact registered reviews before retrying.',
            { cause_code: error?.code ?? 'unknown' }
          );
        }
        if (workers.size || unreconciled.length) {
          fail(
            'APR_BROKER_STOP_REFUSED',
            'Broker still owns runnable or unreconciled reviews.',
            'Reconcile or suspend the reported reviews before retrying broker stop.',
            { active_workspaces: [...workers.keys()], unreconciled_workspaces: unreconciled }
          );
        }
        stop();
        return Object.freeze({ status: 'stopping', project_digest: identity.digest });
      }
      const registration = assertRegistration(identity, await registry.get(message?.workspace));
      const worker = await addWorker(registration);
      clearIdle();
      if (message.command === 'reconcile' || message.command === 'register') {
        await assertCurrentOperationAuthority();
        await worker.reconcile();
        await assertCurrentOperationAuthority();
      } else if (message.command === 'launch') {
        let operation;
        try {
          await assertCurrentOperationAuthority();
          operation = await reserveReviewerLaunch({ registration, worker });
          await assertCurrentOperationAuthority();
        } catch (cause) {
          await settleWorkers({ resetIdle: true });
          throw cause;
        }
        if (operation === null) {
          await assertCurrentOperationAuthority();
          await worker.reconcile();
          await assertCurrentOperationAuthority();
        } else {
          const running = settleReservedReviewerLaunch({ registration, worker, operation })
            .catch(() => {})
            .then(() => worker.reconcile())
            .finally(() => {
              launchRuns.delete(registration.workspace);
              const cleanup = sequence.then(() =>
                withLifecycleAuthority(
                  { operation: 'broker.reconcile', cwd: identity.physicalRoot },
                  () => settleWorkers({ resetIdle: true })
                )
              );
              sequence = cleanup.catch(() => stop());
            });
          launchRuns.set(registration.workspace, running);
        }
      } else if (message.command === 'suspend') {
        if (launchRuns.has(registration.workspace)) {
          throw new AprError('APR_WAKE_OUTCOME_UNKNOWN', 'Reviewer launch is still in flight.', {
            recovery: 'Wait for exact launch settlement, then reconcile before manual takeover.',
          });
        }
        await input.cleanupGuard?.();
        await assertCurrentOperationAuthority();
        await worker.suspend();
        await assertCurrentOperationAuthority();
      } else {
        fail(
          'APR_BROKER_PROTOCOL',
          'Unknown broker service command.',
          'Send one command from the closed broker protocol.',
          { command: message?.command ?? null }
        );
      }
      await settleWorkers({ resetIdle: true });
      return Object.freeze({
        status: worker.workState(),
        ...(launchRuns.has(registration.workspace) ? { launch_status: 'pending' } : {}),
        review_id: registration.review_id,
        project_digest: identity.digest,
      });
    };
    const serializedDispatch = (message) => {
      const operation = sequence.then(() =>
        withOperationAuthority(
          {
            operation: 'broker.' + message.command,
            cwd: identity.physicalRoot,
            ...(['status', 'stop'].includes(message.command)
              ? {}
              : { reviewWorkspace: message.workspace }),
          },
          () => dispatch(message)
        )
      );
      sequence = operation.catch(() => {});
      return operation;
    };

    try {
      await withLifecycleAuthority(
        { operation: 'broker.reconcile', cwd: identity.physicalRoot },
        async () => {
          for (const registration of await registry.list()) await addWorker(registration);
          await settleWorkers({ resetIdle: true });
          await server.start(serializedDispatch);
          // Original bounded startup includes restoration and publication.
          await owner.publish?.();
        }
      );
      input.onReady?.();
      await untilStopped;
      await sequence;
    } finally {
      let serverClosed = false;
      let ownerReleased = false;
      const retained = {
        identity,
        owner,
        server,
        workers,
        workerSubscriptions,
        get serverClosed() {
          return serverClosed;
        },
        get ownerReleased() {
          return ownerReleased;
        },
      };
      retainedServices.add(retained); // Retain before even the authority await.
      try {
        await withLifecycleAuthority(
          { operation: 'broker.stop', cwd: identity.physicalRoot },
          async () => {
            clearIdle();
            let cleanupError = null;
            for (const [workspace, worker] of [...workers]) {
              try {
                if (worker.workState() !== 'terminal') {
                  await input.cleanupGuard?.();
                  await assertCurrentOperationAuthority();
                  await worker.suspend();
                  await assertCurrentOperationAuthority();
                }
                await input.cleanupGuard?.();
                await assertCurrentOperationAuthority();
                await worker.close();
                await assertCurrentOperationAuthority();
                workerSubscriptions.get(workspace)?.();
                workerSubscriptions.delete(workspace);
                workers.delete(workspace);
              } catch (error) {
                cleanupError ??= error;
              }
            }
            if (!cleanupError) {
              try {
                await input.cleanupGuard?.();
                await assertCurrentOperationAuthority();
              } catch (error) {
                cleanupError ??= error;
              }
            }
            try {
              // A stop dispatch can resolve before its authenticated reply is written.
              // Keep the endpoint owned until that in-flight connection closes.
              await server.close();
              serverClosed = true;
            } catch (error) {
              cleanupError ??= error;
            }
            if (!cleanupError) {
              try {
                // Drained readiness is valid only in the owner's private release
                // transaction, which freshly verifies exact lease/files/runtime.
                await assertCurrentOperationAuthority();
                const release = await owner.release?.();
                ownerReleased = release?.released === true;
              } catch (error) {
                cleanupError ??= error;
              }
            }
            if (cleanupError) {
              const error = new AprError(
                cleanupError.code ?? 'APR_BROKER_STOP_REFUSED',
                cleanupError.message ?? 'Broker cleanup remains unresolved.',
                {
                  recovery:
                    cleanupError.recovery ??
                    'Retain the exact broker resources and reconcile cleanup before retrying.',
                  details: {
                    ...cleanupError.details,
                    outstandingObligations: [
                      ...(cleanupError.details?.outstandingObligations ?? []),
                      ...[...workers.keys()].map((workspace) => ({
                        name: 'broker-worker',
                        workspace,
                        outcome: 'cleanup-unproved',
                      })),
                      ...(!serverClosed
                        ? [
                            {
                              name: 'broker-server',
                              instanceId: owner.instanceId,
                              outcome: 'drain-unproved',
                            },
                          ]
                        : []),
                      {
                        name: 'owner-release',
                        instanceId: owner.instanceId,
                        outcome: 'release-unproved',
                      },
                    ],
                  },
                }
              );
              error.cause = cleanupError;
              throw error;
            }
          }
        );
        retainedServices.delete(retained);
      } catch (cause) {
        if (cause?.details?.outstandingObligations?.some((value) => value.name === 'owner-release'))
          throw cause;
        const error = new AprError(
          cause?.code ?? 'APR_BROKER_STOP_REFUSED',
          cause?.message ?? 'Broker cleanup authority is unavailable.',
          {
            recovery: 'Retain exact broker resources and reconcile current cleanup authority.',
            details: {
              ...cause?.details,
              outstandingObligations: [
                ...(cause?.details?.outstandingObligations ?? []),
                ...[...workers.keys()].map((workspace) => ({
                  name: 'broker-worker',
                  workspace,
                  outcome: 'cleanup-unproved',
                })),
                ...(!serverClosed
                  ? [
                      {
                        name: 'broker-server',
                        instanceId: owner.instanceId,
                        outcome: 'drain-unproved',
                      },
                    ]
                  : []),
                ...(!ownerReleased
                  ? [
                      {
                        name: 'owner-release',
                        instanceId: owner.instanceId,
                        outcome: 'release-unproved',
                      },
                    ]
                  : []),
              ],
            },
          }
        );
        error.cause = cause;
        throw error;
      }
    }
  }

  function startBroker(input) {
    let resolveReady, rejectReady;
    const ready = new Promise((resolve, reject) => {
      resolveReady = resolve;
      rejectReady = reject;
    });
    const untilStopped = runBroker({ ...input, onReady: resolveReady });
    untilStopped.catch(rejectReady);
    ready.catch(() => {});
    // Explicit protocol lifecycle; production must retain its own genuine inputs.
    return Object.freeze({ verified: false, ready, untilStopped });
  }
  return Object.freeze({ runBroker, startBroker, IDLE_MILLISECONDS });
}
