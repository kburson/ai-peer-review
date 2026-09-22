import { createHash } from 'node:crypto';
import { lstatSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { createInterface } from 'node:readline';
import { spawn } from 'node:child_process';
import os from 'node:os';
import { spawnProviderProcess } from './process-lifetime.mjs';

export function createClaudeStreamingExec({ recorder, spawnProcess = spawn } = {}) {
  return async (file, args, options = {}) => {
    const index = args?.indexOf('--output-format');
    if (index < 0 || args[index + 1] !== 'json')
      invalid('Claude launch contract lacks structured JSON output.');
    const streamArgs = [...args];
    streamArgs[index + 1] = 'stream-json';
    if (!streamArgs.includes('--verbose')) streamArgs.push('--verbose');
    const lifetime = spawnProviderProcess(
      file,
      streamArgs,
      {
        cwd: options.cwd,
        env: options.env,
        shell: false,
        stdio: ['ignore', 'pipe', 'pipe'],
      },
      spawnProcess
    );
    return collectClaudeStream({ child: lifetime.child, recorder, lifetime });
  };
}

import { AprError } from '../errors.mjs';
import { atomicWrite } from '../protocol/store.mjs';

export async function collectClaudeStream({ child, recorder, lifetime } = {}) {
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
    const exitCode = lifetime
      ? await lifetime.wait()
      : await new Promise((resolve, reject) => {
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
    if (lifetime) await lifetime.stop();
    else child.kill();
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
  return path.join(
    workspace,
    'provider',
    'claude',
    'observations',
    `${createHash('sha256').update(operationId).digest('hex')}.json`
  );
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

export function createClaudeWakeRecorder({ sessionId, expectedModel } = {}) {
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(sessionId ?? '') ||
    typeof expectedModel !== 'string' ||
    !expectedModel
  )
    invalid('Claude wake stream expectation is invalid.');
  let initialized = null;
  let assistant = false;
  let terminal = false;
  return Object.freeze({
    accept(event) {
      if (event?.type === 'system' && event.subtype === 'init') {
        if (
          initialized ||
          event.session_id !== sessionId ||
          event.model !== expectedModel ||
          typeof event.claude_code_version !== 'string' ||
          !event.claude_code_version
        )
          invalid('Claude wake initialization changed session or model.');
        initialized = {
          session_id: event.session_id,
          model_id: event.model,
          source_version: event.claude_code_version,
        };
      } else if (event?.type === 'assistant') {
        if (
          !initialized ||
          event.session_id !== sessionId ||
          event.message?.model !== expectedModel
        )
          invalid('Claude wake assistant stream changed session or model.');
        assistant = true;
      } else if (event?.type === 'result') {
        if (!initialized || event.session_id !== sessionId || event.is_error === true)
          invalid('Claude wake result changed session or failed.');
        terminal = true;
      }
    },
    confirm() {
      if (!initialized || !assistant || !terminal)
        invalid('Claude wake has no complete same-session model stream.');
      return Object.freeze({ ...initialized });
    },
  });
}

export function readClaudeStreamObservation({ workspace, operationId, handleLocator } = {}) {
  let file = observationFile(workspace, operationId);
  // Existing Unix observations retain their exact original bytes. Never use
  // legacy colon paths on Windows (alternate streams), or bypass an unsafe new file.
  try {
    lstatSync(file);
  } catch (error) {
    if (error.code === 'ENOENT' && process.platform !== 'win32')
      file = path.join(workspace, 'provider', 'claude', 'observations', `${operationId}.json`);
  }
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

export function readClaudeWakeOutcome({
  projectRoot,
  claudeHome = path.join(os.homedir(), '.claude'),
  sessionId,
  wakeOperationId,
  capsuleDigest,
  expectedModel,
} = {}) {
  if (
    !path.isAbsolute(projectRoot ?? '') ||
    path.normalize(projectRoot) !== projectRoot ||
    !path.isAbsolute(claudeHome ?? '') ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(sessionId ?? '') ||
    !/^sha256:[0-9a-f]{64}$/.test(wakeOperationId ?? '') ||
    !/^sha256:[0-9a-f]{64}$/.test(capsuleDigest ?? '') ||
    typeof expectedModel !== 'string' ||
    !expectedModel
  )
    invalid('Claude wake transcript identity is invalid.');
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
      invalid('Claude wake transcript is not a bounded owner-only file.');
    lines = readFileSync(file, 'utf8').trimEnd().split('\n');
  } catch (cause) {
    if (cause instanceof AprError) throw cause;
    invalid('Claude wake transcript cannot be read safely.');
  }
  const marker = `APR_WAKE_OPERATION ${wakeOperationId} ${capsuleDigest}`;
  let matchingPrompts = 0;
  let awaitingAssistant = false;
  let completed = false;
  const pendingTools = new Set();
  for (const line of lines) {
    let entry;
    try {
      entry = JSON.parse(line);
    } catch {
      invalid('Claude wake transcript contains invalid JSON.');
    }
    if (entry?.type !== 'user' && entry?.type !== 'assistant') continue;
    if (entry.sessionId !== sessionId || !Number.isFinite(Date.parse(entry.timestamp)))
      invalid('Claude wake transcript contains a mismatched session message.');
    if (entry.type === 'user') {
      const content = entry.message?.content;
      // Claude records tool responses as user messages inside the same turn.
      // Only results for this wake's pending calls can continue that turn.
      if (
        awaitingAssistant &&
        Array.isArray(content) &&
        content.length > 0 &&
        content.every((part) => part?.type === 'tool_result')
      ) {
        const ids = content.map((part) => part.tool_use_id);
        if (new Set(ids).size === ids.length && ids.every((id) => pendingTools.has(id))) {
          for (const id of ids) pendingTools.delete(id);
          continue;
        }
      }
      const prompt =
        typeof content === 'string'
          ? content
          : Array.isArray(content)
            ? content
                .filter((part) => part?.type === 'text')
                .map((part) => part.text)
                .join('\n')
            : '';
      if (prompt.includes(marker)) {
        matchingPrompts += 1;
        awaitingAssistant = true;
        completed = false;
        pendingTools.clear();
      } else if (awaitingAssistant) {
        awaitingAssistant = false;
        pendingTools.clear();
      }
      continue;
    }
    if (!awaitingAssistant) continue;
    if (entry.message?.model !== expectedModel) invalid('Claude wake model changed in transcript.');
    for (const part of Array.isArray(entry.message?.content) ? entry.message.content : []) {
      if (part?.type !== 'tool_use') continue;
      if (typeof part.id !== 'string' || !part.id || pendingTools.has(part.id))
        invalid('Claude wake tool call identity is missing or repeated.');
      pendingTools.add(part.id);
    }
    if (entry.message?.stop_reason === 'end_turn') {
      completed = pendingTools.size === 0;
      awaitingAssistant = false;
    }
  }
  if (matchingPrompts > 1) invalid('Claude wake operation appears more than once.');
  return Object.freeze(
    matchingPrompts === 1 && completed
      ? { status: 'acknowledged', reason: 'provider-terminal-turn' }
      : { status: 'outcome-unknown', reason: 'provider-turn-unconfirmed' }
  );
}
