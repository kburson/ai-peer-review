import { lstatSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { createInterface } from 'node:readline';
import { spawn } from 'node:child_process';
import os from 'node:os';

export function createClaudeStreamingExec({ recorder, spawnProcess = spawn } = {}) {
  return async (file, args, options = {}) => {
    const index = args?.indexOf('--output-format');
    if (index < 0 || args[index + 1] !== 'json')
      invalid('Claude launch contract lacks structured JSON output.');
    const streamArgs = [...args];
    streamArgs[index + 1] = 'stream-json';
    if (!streamArgs.includes('--verbose')) streamArgs.push('--verbose');
    const child = spawnProcess(file, streamArgs, {
      cwd: options.cwd,
      env: options.env,
      shell: false,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    return collectClaudeStream({ child, recorder });
  };
}

import { AprError } from '../errors.mjs';
import { atomicWrite } from '../protocol/store.mjs';

export async function collectClaudeStream({ child, recorder } = {}) {
  if (!child?.stdout || !child?.stderr || typeof recorder?.accept !== 'function')
    invalid('Claude stream process is incomplete.');
  let stderr = '';
  let total = 0;
  let result = null;
  child.stderr.setEncoding('utf8');
  child.stderr.on('data', (part) => {
    if (stderr.length < 1024 * 1024) stderr += part;
  });
  try {
    for await (const line of createInterface({ input: child.stdout })) {
      total += Buffer.byteLength(line, 'utf8');
      if (total > 4 * 1024 * 1024) invalid('Claude stream exceeds its bounded output limit.');
      if (!line) continue;
      let event;
      try {
        event = JSON.parse(line);
      } catch {
        invalid('Claude stream contains invalid structured JSON.');
      }
      recorder.accept(event);
      if (event?.type === 'result') result = event;
    }
    const exitCode = await new Promise((resolve, reject) => {
      if (child.exitCode !== null) return resolve(child.exitCode);
      child.once('error', reject);
      child.once('close', resolve);
    });
    if (!result) invalid('Claude stream has no terminal result.');
    return Object.freeze({
      stdout: JSON.stringify(result),
      stderr,
      exit_code: Number.isInteger(exitCode) ? exitCode : 1,
    });
  } catch (cause) {
    child.kill();
    throw cause;
  }
}

function invalid(message) {
  throw new AprError('APR_CLAUDE_SESSION_INVALID', message, {
    recovery: 'Preserve the exact Claude operation and re-observe its provider stream.',
  });
}

function observationFile(workspace, operationId) {
  if (
    !path.isAbsolute(workspace ?? '') ||
    path.normalize(workspace) !== workspace ||
    !/^[A-Za-z0-9][A-Za-z0-9._:-]*$/.test(operationId ?? '')
  )
    invalid('Claude stream observation location is invalid.');
  return path.join(workspace, 'provider', 'claude', 'observations', `${operationId}.json`);
}

export function createClaudeStreamRecorder({ workspace, operationId, expectedCommand } = {}) {
  const file = observationFile(workspace, operationId);
  if (typeof expectedCommand !== 'string' || !expectedCommand)
    invalid('Claude join command is missing.');
  let initialized = null;
  return Object.freeze({
    accept(event) {
      if (event?.type === 'system' && event.subtype === 'init') {
        if (
          initialized ||
          typeof event.session_id !== 'string' ||
          !event.session_id ||
          typeof event.model !== 'string' ||
          !event.model ||
          typeof event.claude_code_version !== 'string' ||
          !event.claude_code_version
        )
          invalid('Claude stream initialization is incomplete or repeated.');
        initialized = {
          session_id: event.session_id,
          model_id: event.model,
          source_version: event.claude_code_version,
        };
        return;
      }
      if (event?.type !== 'assistant') return;
      const calls = event.message?.content?.filter(
        (entry) =>
          entry?.type === 'tool_use' &&
          entry.name === 'Bash' &&
          entry.input?.command === expectedCommand
      );
      if (!calls?.length) return;
      if (
        !initialized ||
        event.session_id !== initialized.session_id ||
        !/^[A-Za-z0-9._:-]+$/.test(calls[0].id ?? '') ||
        typeof event.message?.model !== 'string' ||
        !event.message.model ||
        !Number.isFinite(Date.parse(event.timestamp))
      )
        invalid('Claude active join tool use is not bound to its stream session.');
      const observed = {
        source: 'official-exact-session',
        source_version: initialized.source_version,
        observed_at: new Date(event.timestamp).toISOString(),
        operation_id: operationId,
        provider: 'anthropic',
        host: 'claude-code',
        model_id: event.message.model,
        session_id: initialized.session_id,
        phase: 'tool-use',
        tool_use_id: calls[0].id,
      };
      atomicWrite(file, `${JSON.stringify(observed)}\n`);
    },
  });
}

export function readClaudeStreamObservation({ workspace, operationId, handleLocator } = {}) {
  const file = observationFile(workspace, operationId);
  let observed;
  try {
    const stat = lstatSync(file);
    if (
      !stat.isFile() ||
      stat.isSymbolicLink() ||
      (process.platform !== 'win32' && stat.mode & 0o077)
    )
      invalid('Claude stream observation file is not owner-only.');
    observed = JSON.parse(readFileSync(file, 'utf8'));
  } catch (cause) {
    if (cause instanceof AprError) throw cause;
    invalid('Claude stream observation cannot be read safely.');
  }
  if (
    observed?.source !== 'official-exact-session' ||
    observed?.operation_id !== operationId ||
    observed?.session_id !== handleLocator
  )
    invalid('Claude stream observation differs from the exact session locator.');
  return Object.freeze(observed);
}

export function readClaudeSessionSnapshot({
  projectRoot,
  sessionId,
  claudeHome = path.join(os.homedir(), '.claude'),
  now = new Date(),
} = {}) {
  if (
    !path.isAbsolute(projectRoot ?? '') ||
    path.normalize(projectRoot) !== projectRoot ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(sessionId ?? '') ||
    !path.isAbsolute(claudeHome ?? '') ||
    !Number.isFinite(new Date(now).valueOf())
  )
    invalid('Claude transcript snapshot location is invalid.');
  const file = path.join(
    claudeHome,
    'projects',
    projectRoot.replace(/[^A-Za-z0-9]/g, '-'),
    `${sessionId}.jsonl`
  );
  let lines;
  try {
    const stat = lstatSync(file);
    if (
      !stat.isFile() ||
      stat.isSymbolicLink() ||
      stat.size > 64 * 1024 * 1024 ||
      (process.platform !== 'win32' && stat.mode & 0o077)
    )
      invalid('Claude transcript is not a bounded owner-only file.');
    lines = readFileSync(file, 'utf8').trimEnd().split('\n');
  } catch (cause) {
    if (cause instanceof AprError) throw cause;
    invalid('Claude transcript cannot be read safely.');
  }
  let last = null;
  for (const line of lines) {
    let entry;
    try {
      entry = JSON.parse(line);
    } catch {
      invalid('Claude transcript contains invalid JSON.');
    }
    if (entry?.type !== 'user' && entry?.type !== 'assistant') continue;
    if (entry.sessionId !== sessionId || !Number.isFinite(Date.parse(entry.timestamp)))
      invalid('Claude transcript contains a mismatched session message.');
    last = entry;
  }
  if (
    last?.type === 'user' ||
    (last?.type === 'assistant' && last.message?.stop_reason !== 'end_turn')
  )
    throw new AprError('APR_CLAUDE_SESSION_ACTIVE', 'Claude session has an active turn.', {
      recovery: 'Wait for the exact provider turn or use its fresh active tool-use stream.',
    });
  if (
    last?.type !== 'assistant' ||
    last.message?.role !== 'assistant' ||
    typeof last.message?.model !== 'string' ||
    !last.message.model ||
    last.message.model.startsWith('<') ||
    typeof last.version !== 'string' ||
    !last.version ||
    new Date(last.timestamp).valueOf() > new Date(now).valueOf() + 30_000
  )
    invalid('Claude session has no exact terminal model observation.');
  return Object.freeze({
    source: 'official-session-record',
    source_version: last.version,
    observed_at: new Date(now).toISOString(),
    last_turn_at: new Date(last.timestamp).toISOString(),
    provider: 'anthropic',
    host: 'claude-code',
    model_id: last.message.model,
    session_id: sessionId,
    phase: 'terminal-snapshot',
  });
}
