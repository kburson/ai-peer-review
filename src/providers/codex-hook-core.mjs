import { lstatSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { AprError } from '../errors.mjs';
import { atomicWrite } from '../protocol/store.mjs';

// @story #136
export function createCodexHook({ performCurrentOperationEffect }) {
  if (typeof performCurrentOperationEffect !== 'function')
    throw new TypeError('Explicit hook effect guard required');
  const TOKEN = /^[0-9a-f]{32}$/;
  const START =
    /^(?:(?:npx )?(?:ai-)?peer-review|node (?:\.\/)?bin\/peer-review\.mjs) start(?:\s|$)/;
  const JOIN = /^(?:(?:npx )?(?:ai-)?peer-review|node (?:\.\/)?bin\/peer-review\.mjs) join(?:\s|$)/;
  const COMMAND = /^(?:(?:npx )?(?:ai-)?peer-review|node (?:\.\/)?bin\/peer-review\.mjs)(?:\s|$)/;

  function invalid(message) {
    throw new AprError('APR_CODEX_HOOK_INVALID', message, {
      recovery: 'Run the exact command from a Codex session with the trusted provider hook.',
    });
  }

  function recordFile(root, token) {
    if (!path.isAbsolute(root ?? '') || path.normalize(root) !== root || !TOKEN.test(token ?? ''))
      invalid('Codex hook record location is invalid.');
    return path.join(root, '.scratch', 'peer-review', 'codex-hooks', `${token}.json`);
  }

  function captureCodexStartHook({ event, sourceVersion, token, observedAt = new Date() } = {}) {
    const command = event?.tool_input?.command;
    if (!COMMAND.test(command ?? '')) return null;
    if (
      event?.hook_event_name !== 'PreToolUse' ||
      event.tool_name !== 'Bash' ||
      typeof event.model !== 'string' ||
      !/^[A-Za-z0-9._:-]+$/.test(event.model) ||
      typeof event.session_id !== 'string' ||
      !event.session_id ||
      typeof event.tool_use_id !== 'string' ||
      !event.tool_use_id ||
      typeof event.turn_id !== 'string' ||
      !event.turn_id ||
      typeof sourceVersion !== 'string' ||
      !sourceVersion ||
      !Number.isFinite(new Date(observedAt).valueOf())
    )
      invalid('Codex hook event lacks active exact-session evidence.');
    const record = {
      schema: 'ai-peer-review.codex-hook/v1',
      source: 'official-exact-session',
      source_version: sourceVersion,
      observed_at: new Date(observedAt).toISOString(),
      provider: 'openai',
      host: 'codex',
      model_id: event.model,
      session_id: event.session_id,
      turn_id: event.turn_id,
      phase: 'tool-use',
      tool_use_id: event.tool_use_id,
      command,
    };
    if (START.test(command) || JOIN.test(command))
      performCurrentOperationEffect(() =>
        atomicWrite(recordFile(event.cwd, token), `${JSON.stringify(record)}\n`)
      );
    return Object.freeze({
      hookSpecificOutput: Object.freeze({
        hookEventName: 'PreToolUse',
        permissionDecision: 'allow',
        updatedInput: Object.freeze({
          ...event.tool_input,
          command: START.test(command)
            ? `APR_CODEX_HOOK_TOKEN=${token} ${command}`
            : `${JOIN.test(command) ? `APR_CODEX_HOOK_TOKEN=${token} ` : ''}CODEX_MODEL_ID=${event.model} CODEX_MODEL_DISPLAY=${event.model} ${command}`,
        }),
      }),
    });
  }

  function readCodexStartHook({ root, token, sessionId, operationId } = {}) {
    const file = recordFile(root, token);
    let record;
    try {
      const stat = lstatSync(file);
      if (
        !stat.isFile() ||
        stat.isSymbolicLink() ||
        (process.platform !== 'win32' && stat.mode & 0o077)
      )
        invalid('Codex hook record is not owner-only.');
      record = JSON.parse(readFileSync(file, 'utf8'));
    } catch (cause) {
      if (cause instanceof AprError) throw cause;
      invalid('Codex hook record cannot be read safely.');
    }
    if (
      record?.schema !== 'ai-peer-review.codex-hook/v1' ||
      record.source !== 'official-exact-session' ||
      record.provider !== 'openai' ||
      record.host !== 'codex' ||
      record.session_id !== sessionId ||
      !(
        (operationId?.startsWith('start:') && START.test(record.command ?? '')) ||
        (operationId?.startsWith('join:') && JOIN.test(record.command ?? ''))
      ) ||
      typeof operationId !== 'string' ||
      !/^(?:start|join):/.test(operationId)
    )
      invalid('Codex hook record does not bind the exact start session.');
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

  return Object.freeze({ captureCodexStartHook, readCodexStartHook });
}
