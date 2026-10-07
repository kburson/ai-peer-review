import { lstatSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { AprError } from '../errors.mjs';
import { atomicWrite } from '../protocol/store.mjs';

// @story #136
export function createCodexHook({ performCurrentOperationEffect }) {
  if (typeof performCurrentOperationEffect !== 'function')
    throw new TypeError('Explicit hook effect guard required');
  const TOKEN = /^[0-9a-f]{32}$/;
  const CLI =
    '(?:(?:npx (?:--no-install )?)?(?:ai-)?peer-review|node (?:\\./)?bin/peer-review\\.mjs)';
  const START = new RegExp(`^${CLI} start(?:\\s|$)`);
  const JOIN = new RegExp(`^${CLI} join(?:\\s|$)`);
  const COMMAND = new RegExp(`^${CLI}(?:\\s|$)`);

  function isCodexPeerReviewCommand(command) {
    return COMMAND.test(command ?? '');
  }

  function isCodexPeerReviewCodeModeEvent(event) {
    return (
      ['functions.exec', 'exec'].includes(event?.tool_name) &&
      typeof event?.tool_input?.code === 'string' &&
      event.tool_input.code.includes('exec_command') &&
      event.tool_input.code.includes('peer-review')
    );
  }

  function codeModeCommands(code) {
    const commands = [];
    const literal = /\bcmd\s*:\s*("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')/g;
    for (const match of code.matchAll(literal)) {
      const quoted = match[1];
      let command;
      if (quoted.startsWith('"')) {
        try {
          command = JSON.parse(quoted);
        } catch {
          continue;
        }
      } else if (!quoted.includes('\\')) command = quoted.slice(1, -1);
      if (START.test(command ?? '') || JOIN.test(command ?? '')) commands.push(command);
    }
    return [...new Set(commands)];
  }

  function codeModePrelude({ model, token, allowedCommands }) {
    return `(() => { const original = globalThis.tools.exec_command.bind(globalThis.tools); const command = new RegExp(${JSON.stringify(COMMAND.source)}); const start = new RegExp(${JSON.stringify(START.source)}); const join = new RegExp(${JSON.stringify(JOIN.source)}); const allowed = new Set(${JSON.stringify(allowedCommands)}); let tokenUsed = false; globalThis.tools.exec_command = (args) => { if (typeof args?.cmd !== 'string' || !command.test(args.cmd)) return original(args); const bound = start.test(args.cmd) || join.test(args.cmd); if (bound && !allowed.has(args.cmd)) throw new Error('APR_CODEX_HOOK_INVALID: nested start or join must use an exact cmd literal'); if (bound && tokenUsed) throw new Error('APR_CODEX_HOOK_INVALID: one start or join per tool call'); if (bound) tokenUsed = true; const prefix = bound ? ${JSON.stringify(`APR_CODEX_HOOK_TOKEN=${token} `)} : ${JSON.stringify(`CODEX_MODEL_ID=${model} CODEX_MODEL_DISPLAY=${model} `)}; return original({ ...args, cmd: prefix + args.cmd }); }; })();`;
  }

  function withCodeModePrelude(code, prelude) {
    const pragma = /^(\/\/ @exec:[^\r\n]*\r?\n)/.exec(code)?.[1] ?? '';
    return `${pragma}${prelude}\n${code.slice(pragma.length)}`;
  }

  function invalid(
    message,
    recovery = 'Run the exact command from a Codex session with the trusted provider hook.'
  ) {
    throw new AprError('APR_CODEX_HOOK_INVALID', message, {
      recovery,
    });
  }

  function recordFile(root, token) {
    if (!path.isAbsolute(root ?? '') || path.normalize(root) !== root || !TOKEN.test(token ?? ''))
      invalid('Codex hook record location is invalid.');
    return path.join(root, '.scratch', 'peer-review', 'codex-hooks', `${token}.json`);
  }

  function captureCodexStartHook({
    event,
    hookRuntimeSessionId = null,
    sourceVersion,
    token,
    observedAt = new Date(),
  } = {}) {
    const command = event?.tool_input?.command;
    const codeMode = isCodexPeerReviewCodeModeEvent(event);
    const allowedCommands = codeMode ? codeModeCommands(event.tool_input.code) : [];
    if (!isCodexPeerReviewCommand(command) && !codeMode) return null;
    if (
      event?.hook_event_name !== 'PreToolUse' ||
      !(event.tool_name === 'Bash' || codeMode) ||
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
      (hookRuntimeSessionId !== null &&
        (typeof hookRuntimeSessionId !== 'string' || !hookRuntimeSessionId)) ||
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
      runtime_session_id:
        hookRuntimeSessionId && hookRuntimeSessionId !== event.session_id
          ? hookRuntimeSessionId
          : null,
      turn_id: event.turn_id,
      phase: 'tool-use',
      tool_use_id: event.tool_use_id,
      command: codeMode ? event.tool_input.code : command,
      tool_name: event.tool_name,
      code_mode_commands: codeMode ? allowedCommands : null,
    };
    if (allowedCommands.length || START.test(command) || JOIN.test(command))
      performCurrentOperationEffect(() =>
        atomicWrite(recordFile(event.cwd, token), `${JSON.stringify(record)}\n`)
      );
    if (codeMode)
      return Object.freeze({
        hookSpecificOutput: Object.freeze({
          hookEventName: 'PreToolUse',
          permissionDecision: 'allow',
          updatedInput: Object.freeze({
            ...event.tool_input,
            code: withCodeModePrelude(
              event.tool_input.code,
              codeModePrelude({ model: event.model, token, allowedCommands })
            ),
          }),
        }),
      });
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
    // Codex reports the parent session in subagent hook events. A child binding
    // also requires the hook process to observe that child's runtime session ID;
    // the private token carries both observations to the exact rewritten call.
    if (
      record?.schema !== 'ai-peer-review.codex-hook/v1' ||
      record.source !== 'official-exact-session' ||
      record.provider !== 'openai' ||
      record.host !== 'codex' ||
      typeof record.session_id !== 'string' ||
      !record.session_id ||
      typeof sessionId !== 'string' ||
      !sessionId ||
      !(
        (operationId?.startsWith('start:') &&
          (START.test(record.command ?? '') ||
            record.code_mode_commands?.some((command) => START.test(command)))) ||
        (operationId?.startsWith('join:') &&
          (JOIN.test(record.command ?? '') ||
            record.code_mode_commands?.some((command) => JOIN.test(command))))
      ) ||
      typeof operationId !== 'string' ||
      !/^(?:start|join):/.test(operationId)
    )
      invalid('Codex hook record does not bind the exact start session.');
    if (record.session_id !== sessionId && record.runtime_session_id !== sessionId) {
      if (!record.runtime_session_id)
        invalid(
          'Codex hook observed a parent session without the child runtime session.',
          'The Codex hook needs the child session ID in CODEX_THREAD_ID to bind this headless start or join. Check the active host hook and retry from that child session; do not reuse a parent-only token.'
        );
      invalid('Codex hook record does not bind the exact start session.');
    }
    return Object.freeze({
      source: record.source,
      source_version: record.source_version,
      observed_at: record.observed_at,
      operation_id: operationId,
      provider: record.provider,
      host: record.host,
      model_id: record.model_id,
      session_id: sessionId,
      hook_session_id: record.session_id,
      phase: record.phase,
      tool_use_id: record.tool_use_id,
    });
  }

  return Object.freeze({
    captureCodexStartHook,
    readCodexStartHook,
    isCodexPeerReviewCommand,
    isCodexPeerReviewCodeModeEvent,
  });
}
