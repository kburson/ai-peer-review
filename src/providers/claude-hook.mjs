import { lstatSync, mkdirSync, readFileSync, readdirSync, realpathSync } from 'node:fs';
import path from 'node:path';

import { AprError } from '../errors.mjs';
import { atomicWrite } from '../protocol/store.mjs';

const TOKEN = /^[0-9a-f]{32}$/;
const SESSION = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const START = /^(?:peer-review|npx peer-review|node (?:\.\/)?bin\/peer-review\.mjs) start(?:\s|$)/;

function invalid(message) {
  throw new AprError('APR_CLAUDE_HOOK_INVALID', message, {
    recovery: 'Run the exact start command from a Claude session with the trusted provider hook.',
  });
}

function recordFile(root, token) {
  if (!path.isAbsolute(root ?? '') || path.normalize(root) !== root || !TOKEN.test(token ?? ''))
    invalid('Claude hook record location is invalid.');
  return path.join(root, '.scratch', 'peer-review', 'claude-hooks', `${token}.json`);
}

function toolObservation(event, sourceVersion, observedAt) {
  const file = event?.transcript_path;
  if (
    event?.hook_event_name !== 'PreToolUse' ||
    event.tool_name !== 'Bash' ||
    !SESSION.test(event.session_id ?? '') ||
    typeof event.tool_use_id !== 'string' ||
    !event.tool_use_id ||
    !path.isAbsolute(file ?? '') ||
    path.basename(file) !== `${event.session_id}.jsonl` ||
    !path.isAbsolute(event.cwd ?? '') ||
    typeof sourceVersion !== 'string' ||
    !sourceVersion
  )
    invalid('Claude hook event lacks exact active session authority.');
  let lines;
  try {
    const stat = lstatSync(file);
    if (
      !stat.isFile() ||
      stat.isSymbolicLink() ||
      realpathSync(file) !== file ||
      stat.size > 64 * 1024 * 1024 ||
      (process.platform !== 'win32' && stat.mode & 0o077)
    )
      invalid('Claude hook transcript is not a bounded owner-only file.');
    lines = readFileSync(file, 'utf8').trimEnd().split('\n');
  } catch (cause) {
    if (cause instanceof AprError) throw cause;
    invalid('Claude hook transcript cannot be read safely.');
  }
  const matches = [];
  for (const line of lines) {
    let entry;
    try {
      entry = JSON.parse(line);
    } catch {
      invalid('Claude hook transcript contains invalid JSON.');
    }
    if (entry?.type !== 'assistant' || entry.sessionId !== event.session_id) continue;
    const calls = entry.message?.content?.filter(
      (part) => part?.type === 'tool_use' && part.id === event.tool_use_id
    );
    if (calls?.length) matches.push({ entry, calls });
  }
  if (matches.length === 0)
    invalid('Claude start tool use is not yet present in its provider transcript.');
  if (matches.length !== 1 || matches[0].calls.length !== 1)
    invalid('Claude start tool use is ambiguous in its provider transcript.');
  const { entry, calls } = matches[0];
  const age = new Date(observedAt).valueOf() - Date.parse(entry.timestamp);
  if (
    calls[0].name !== 'Bash' ||
    calls[0].input?.command !== event.tool_input.command ||
    typeof entry.message?.model !== 'string' ||
    !/^[A-Za-z0-9._:-]+$/.test(entry.message.model) ||
    entry.version !== sourceVersion ||
    !Number.isFinite(age) ||
    age < -30_000 ||
    age > 5 * 60_000
  )
    invalid('Claude start transcript changed command, model, or version.');
  return entry.message.model;
}

export function captureClaudeStartHook({
  event,
  sourceVersion,
  token,
  observedAt = new Date(),
} = {}) {
  const command = event?.tool_input?.command;
  if (!START.test(command ?? '')) return null;
  const model = toolObservation(event, sourceVersion, observedAt);
  const record = {
    schema: 'ai-peer-review.claude-hook/v1',
    source: 'official-exact-session',
    source_version: sourceVersion,
    observed_at: new Date(observedAt).toISOString(),
    provider: 'anthropic',
    host: 'claude-code',
    model_id: model,
    session_id: event.session_id,
    phase: 'tool-use',
    tool_use_id: event.tool_use_id,
    command,
  };
  const file = recordFile(event.cwd, token);
  mkdirSync(path.dirname(file), { recursive: true, mode: 0o700 });
  atomicWrite(file, `${JSON.stringify(record)}\n`);
  return Object.freeze({
    hookSpecificOutput: Object.freeze({
      hookEventName: 'PreToolUse',
      permissionDecision: 'allow',
      updatedInput: Object.freeze({
        ...event.tool_input,
        command: `APR_CLAUDE_HOOK_TOKEN=${token} CLAUDE_CODE_SESSION_ID=${event.session_id} CLAUDE_MODEL_ID=${model} ${command}`,
      }),
    }),
  });
}

export async function captureClaudeStartHookWhenPresent(
  input,
  { delay = 100, attempts = 20 } = {}
) {
  for (let index = 0; index < attempts; index += 1) {
    try {
      return captureClaudeStartHook(input);
    } catch (cause) {
      if (
        cause?.code !== 'APR_CLAUDE_HOOK_INVALID' ||
        cause.message !== 'Claude start tool use is not yet present in its provider transcript.' ||
        index === attempts - 1
      )
        throw cause;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
}

export function readClaudeStartHook({ root, token, sessionId, operationId } = {}) {
  const file = recordFile(root, token);
  let record;
  try {
    const stat = lstatSync(file);
    if (
      !stat.isFile() ||
      stat.isSymbolicLink() ||
      (process.platform !== 'win32' && stat.mode & 0o077)
    )
      invalid('Claude hook record is not owner-only.');
    record = JSON.parse(readFileSync(file, 'utf8'));
  } catch (cause) {
    if (cause instanceof AprError) throw cause;
    invalid('Claude hook record cannot be read safely.');
  }
  if (
    record?.schema !== 'ai-peer-review.claude-hook/v1' ||
    record.source !== 'official-exact-session' ||
    record.provider !== 'anthropic' ||
    record.host !== 'claude-code' ||
    record.session_id !== sessionId ||
    !START.test(record.command ?? '') ||
    typeof operationId !== 'string' ||
    !operationId.startsWith('start:')
  )
    invalid('Claude hook record does not bind the exact start session.');
  return Object.freeze({
    source: record.source,
    source_version: record.source_version,
    observed_at: record.observed_at,
    operation_id: operationId,
    provider: record.provider,
    host: record.host,
    model_id: record.model_id,
    session_id: record.session_id,
    phase: record.phase,
    tool_use_id: record.tool_use_id,
  });
}

export function readClaudeStartHookForSession({ root, sessionId, operationId } = {}) {
  if (
    !path.isAbsolute(root ?? '') ||
    path.normalize(root) !== root ||
    !SESSION.test(sessionId ?? '') ||
    !operationId?.startsWith('start:')
  )
    invalid('Claude start session lookup is incomplete.');
  const directory = path.join(root, '.scratch', 'peer-review', 'claude-hooks');
  let names;
  try {
    const stat = lstatSync(directory);
    if (
      !stat.isDirectory() ||
      stat.isSymbolicLink() ||
      (process.platform !== 'win32' && stat.mode & 0o077)
    )
      invalid('Claude hook directory is not owner-only.');
    names = readdirSync(directory).filter(
      (name) => TOKEN.test(name.slice(0, -5)) && name.endsWith('.json')
    );
  } catch (cause) {
    if (cause instanceof AprError) throw cause;
    invalid('Claude start hook directory cannot be read safely.');
  }
  const matches = [];
  for (const name of names) {
    const token = name.slice(0, -5);
    let record;
    try {
      const file = path.join(directory, name);
      const stat = lstatSync(file);
      if (
        !stat.isFile() ||
        stat.isSymbolicLink() ||
        (process.platform !== 'win32' && stat.mode & 0o077)
      )
        invalid('Claude start hook directory contains unsafe evidence.');
      record = JSON.parse(readFileSync(file, 'utf8'));
    } catch (cause) {
      if (cause instanceof AprError) throw cause;
      invalid('Claude start hook directory contains invalid evidence.');
    }
    if (record?.session_id === sessionId)
      matches.push(readClaudeStartHook({ root, token, sessionId, operationId }));
  }
  if (matches.length !== 1) invalid('Claude start hook session evidence is missing or ambiguous.');
  return matches[0];
}
