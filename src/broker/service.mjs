import { AprError } from '../errors.mjs';
import { createFrameDecoder, encodeFrame, validateCommand, validateHandshake } from './ipc.mjs';

const IDLE_MILLISECONDS = 60_000;
const ACTIVE_STATES = new Set(['runnable', 'automatic-wait']);

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

function decodeOne(bytes) {
  const decoder = createFrameDecoder();
  const values = decoder.push(bytes);
  decoder.end();
  if (values.length !== 1) {
    fail(
      'APR_BROKER_PROTOCOL',
      'Broker connection supplied an invalid frame count.',
      'Reconnect to the authenticated broker and send one bounded frame.'
    );
  }
  return values[0];
}

export function createAuthenticatedBrokerServer(owner, platform, { schedule = setImmediate } = {}) {
  if (!owner?.handshake || typeof owner?.endpoint?.accept !== 'function') {
    fail(
      'APR_BROKER_START_FAILED',
      'Broker owner has no authenticated endpoint.',
      'Reacquire exact broker ownership and retry service startup.'
    );
  }
  let dispatch = null;
  let stopped = false;
  let scheduled = false;

  const serve = async () => {
    scheduled = false;
    if (stopped) return;
    let connection;
    try {
      connection = owner.endpoint.accept();
      const handshake = decodeOne(connection.readFrame());
      validateHandshake(handshake, owner.handshake, platform.peerUser(connection));
      connection.write(encodeFrame(owner.handshake));
      const command = validateCommand(decodeOne(connection.readFrame()));
      try {
        const result = await dispatch(command);
        connection.write(
          encodeFrame({ id: command.id, ok: true, result: result ?? {}, error: null })
        );
      } catch (error) {
        connection.write(
          encodeFrame({
            id: command.id,
            ok: false,
            result: null,
            error: {
              code: error?.code ?? 'APR_BROKER_START_FAILED',
              message: error?.message ?? 'Broker command failed.',
              recovery: error?.recovery ?? 'Preserve broker evidence and inspect the failure.',
            },
          })
        );
      }
    } catch {
      // Authentication, framing, version, and disconnect failures fence only
      // the untrusted connection. Broker ownership remains authoritative.
    } finally {
      connection?.close?.();
      queue();
    }
  };
  const queue = () => {
    if (stopped || scheduled) return;
    scheduled = true;
    schedule(() => void serve());
  };

  return Object.freeze({
    start(handler) {
      if (typeof handler !== 'function' || dispatch) {
        fail(
          'APR_BROKER_START_FAILED',
          'Broker server can be started exactly once with a command handler.',
          'Create a fresh server only after prior ownership releases.'
        );
      }
      dispatch = handler;
      queue();
    },
    close() {
      stopped = true;
    },
  });
}

export async function runBroker(input = {}) {
  assertInput(input);
  const { identity, owner, versions, registry, workerFactory, clock, server } = input;
  const workers = new Map();
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
    const worker = workerFactory(valid);
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
        const operation = sequence.then(() => settleWorkers({ resetIdle: true }));
        sequence = operation.catch(() => stop());
      });
      workerSubscriptions.set(valid.workspace, unsubscribe);
    }
    await worker.start();
    return worker;
  };
  const settleWorkers = async ({ resetIdle = false } = {}) => {
    for (const [workspace, worker] of [...workers]) {
      const state = worker.workState();
      if (state === 'recovery-only') {
        await worker.suspend();
        await worker.close();
        workerSubscriptions.get(workspace)?.();
        workerSubscriptions.delete(workspace);
        workers.delete(workspace);
      } else if (state === 'terminal') {
        await worker.close();
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
      await settleWorkers();
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
      await worker.reconcile();
    } else if (message.command === 'suspend') {
      await worker.suspend();
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
      review_id: registration.review_id,
      project_digest: identity.digest,
    });
  };
  const serializedDispatch = (message) => {
    const operation = sequence.then(() => dispatch(message));
    sequence = operation.catch(() => {});
    return operation;
  };

  try {
    for (const registration of await registry.list()) await addWorker(registration);
    await settleWorkers({ resetIdle: true });
    server.start(serializedDispatch);
    await untilStopped;
    await sequence;
  } finally {
    clearIdle();
    let cleanupError = null;
    for (const worker of workers.values()) {
      try {
        if (worker.workState() !== 'terminal') await worker.suspend();
        await worker.close();
      } catch (error) {
        cleanupError ??= error;
      }
    }
    for (const unsubscribe of workerSubscriptions.values()) unsubscribe();
    workerSubscriptions.clear();
    workers.clear();
    try {
      server.close();
    } catch (error) {
      cleanupError ??= error;
    }
    if (!cleanupError) {
      try {
        owner.release?.();
      } catch (error) {
        cleanupError ??= error;
      }
    }
    if (cleanupError) throw cleanupError;
  }
}

export { IDLE_MILLISECONDS };
