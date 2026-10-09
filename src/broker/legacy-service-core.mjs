// @story #143
// Retained legacy transport; portable production entries must not import it.
import { AprError } from '../errors.mjs';
import { createFrameDecoder, encodeFrame, validateCommand, validateHandshake } from './ipc.mjs';
function fail(code, message, recovery, details = {}) {
  throw new AprError(code, message, { recovery, details });
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

export function createLegacyBrokerServer(owner, platform, { schedule = setImmediate } = {}) {
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
  const active = new Set();

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
          encodeFrame({ id: command.id, ok: true, result: result ?? {}, error: null }),
          { drain: command.command === 'stop' }
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
          }),
          { drain: command.command === 'stop' }
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
    schedule(() => {
      const operation = serve();
      active.add(operation);
      operation.then(
        () => active.delete(operation),
        () => active.delete(operation)
      );
    });
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
      return Promise.all([...active]);
    },
  });
}
