// @story #189
import path from 'node:path';
import { AprError } from '../errors.mjs';

const COMMANDS = new Set(['status', 'register', 'launch', 'suspend', 'stop', 'reconcile']);

export function brokerError(code, message) {
  return new AprError(code, message, {
    recovery:
      'Preserve broker evidence. Restore the recorded compatible runtime and reconcile registry/provider ownership before retrying.',
  });
}

function closed(value, fields) {
  return (
    value !== null &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    Object.keys(value).length === fields.length &&
    fields.every((key) => Object.hasOwn(value, key))
  );
}

export function validateCommand(message) {
  if (
    !closed(message, ['id', 'command', 'workspace']) ||
    !/^[a-zA-Z0-9-]{1,64}$/.test(message.id) ||
    !COMMANDS.has(message.command) ||
    (['status', 'stop'].includes(message.command)
      ? message.workspace !== null
      : typeof message.workspace !== 'string' ||
        message.workspace.includes('\0') ||
        !(path.posix.isAbsolute(message.workspace) || path.win32.isAbsolute(message.workspace)))
  ) {
    throw brokerError('APR_BROKER_PROTOCOL', 'Unknown or malformed broker command.');
  }
  return message;
}

export function assertBrokerTransport(transport) {
  if (transport !== 'portable')
    throw brokerError('APR_BROKER_PROTOCOL', 'Unsupported broker transport.');
}

// Protocol data only; a callback never grants production owner/server membership.
export async function dispatchBrokerCommandCore({ request, dispatch } = {}) {
  let message;
  const failure = (code, dispatched) => ({
    schema: 'ai-peer-review.response/v1',
    ok: false,
    result: null,
    action_id: message?.id ?? (typeof request?.actionId === 'string' ? request.actionId : null),
    mutation_occurred: dispatched && message.command !== 'status' ? null : false,
    retry_safe: !dispatched || message.command === 'status',
    next_action: dispatched && message.command !== 'status' ? 'reconcile' : null,
    error: {
      code:
        typeof code === 'string' && /^APR_[A-Z0-9_]{1,100}$/u.test(code)
          ? code
          : 'APR_BROKER_START_FAILED',
      message: 'Broker command could not be completed.',
    },
  });
  try {
    if (
      !request?.body ||
      typeof request.body !== 'object' ||
      Array.isArray(request.body) ||
      Object.keys(request.body).some((key) => key !== 'workspace') ||
      typeof dispatch !== 'function'
    )
      throw brokerError('APR_BROKER_PROTOCOL', 'Invalid broker command body.');
    message = validateCommand({
      id: request.actionId,
      command: request.operation,
      workspace: request.body.workspace ?? null,
    });
  } catch (error) {
    return failure(error?.code, false);
  }
  try {
    const result = await dispatch(message);
    return {
      schema: 'ai-peer-review.response/v1',
      ok: true,
      action_id: message.id,
      result: result ?? {},
      error: null,
    };
  } catch (error) {
    return failure(error?.code, true);
  }
}
