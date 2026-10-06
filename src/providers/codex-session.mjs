import { lstatSync, readFileSync, readdirSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { AprError } from '../errors.mjs';

function invalid(message) {
  throw new AprError('APR_CODEX_SESSION_INVALID', message, {
    recovery: 'Preserve the exact Codex session and reconcile its provider-owned record.',
  });
}

export function readCodexSessionSnapshot({
  codexHome = path.join(os.homedir(), '.codex'),
  projectRoot,
  sessionId,
  now = new Date(),
} = {}) {
  if (
    !path.isAbsolute(codexHome ?? '') ||
    !path.isAbsolute(projectRoot ?? '') ||
    path.normalize(projectRoot) !== projectRoot ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(sessionId ?? '') ||
    !Number.isFinite(new Date(now).valueOf())
  )
    invalid('Codex session snapshot location is invalid.');
  const sessions = path.join(codexHome, 'sessions');
  let files;
  try {
    files = readdirSync(sessions, { recursive: true }).filter((file) =>
      file.endsWith(`-${sessionId}.jsonl`)
    );
  } catch {
    invalid('Codex session directory is unavailable.');
  }
  if (files.length !== 1) invalid('Codex exact session record is missing or ambiguous.');
  const file = path.join(sessions, files[0]);
  let records;
  try {
    const stat = lstatSync(file);
    if (
      !stat.isFile() ||
      stat.isSymbolicLink() ||
      stat.size > 64 * 1024 * 1024 ||
      (process.platform !== 'win32' && stat.mode & 0o077)
    )
      invalid('Codex session record is not a bounded owner-only file.');
    records = readFileSync(file, 'utf8')
      .trimEnd()
      .split('\n')
      .map((line) => JSON.parse(line));
  } catch (cause) {
    if (cause instanceof AprError) throw cause;
    invalid('Codex session record cannot be read safely.');
  }
  const meta = records.find((entry) => entry?.type === 'session_meta')?.payload;
  if (
    meta?.id !== sessionId ||
    meta.cwd !== projectRoot ||
    typeof meta.cli_version !== 'string' ||
    !meta.cli_version
  )
    invalid('Codex session metadata differs from the exact bound session.');
  let lastTurn = null;
  let completed = null;
  for (const record of records) {
    if (record?.type === 'turn_context') {
      if (
        record.payload?.cwd !== projectRoot ||
        typeof record.payload?.turn_id !== 'string' ||
        typeof record.payload?.model !== 'string' ||
        !Number.isFinite(Date.parse(record.timestamp))
      )
        invalid('Codex turn context is incomplete.');
      lastTurn = record;
      completed = null;
    } else if (
      record?.type === 'event_msg' &&
      record.payload?.type === 'task_complete' &&
      record.payload.turn_id === lastTurn?.payload.turn_id
    ) {
      completed = record;
    }
  }
  if (
    !lastTurn ||
    !completed ||
    !Number.isFinite(Date.parse(completed.timestamp)) ||
    new Date(completed.timestamp).valueOf() > new Date(now).valueOf() + 30_000
  )
    invalid('Codex exact session has no terminal model observation.');
  return Object.freeze({
    source: 'official-session-record',
    source_version: meta.cli_version,
    observed_at: new Date(now).toISOString(),
    last_turn_at: new Date(completed.timestamp).toISOString(),
    provider: 'openai',
    host: 'codex',
    model_id: lastTurn.payload.model,
    session_id: sessionId,
    phase: 'terminal-snapshot',
  });
}
