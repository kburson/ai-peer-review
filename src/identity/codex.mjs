function frozen(values) {
  return Object.freeze([...values]);
}

function resolveRuntime({ runtime = {}, env = {} } = {}) {
  const runtimeSession = runtime.sessionId;
  const runtimeModel = runtime.modelId;
  const sessionId = runtimeSession ?? env.CODEX_THREAD_ID ?? env.CODEX_SESSION_ID;
  const modelId = runtimeModel ?? env.CODEX_MODEL_ID;
  const modelDisplay = runtime.modelDisplay ?? env.CODEX_MODEL_DISPLAY ?? modelId;
  if (![sessionId, modelId, modelDisplay].every((value) => typeof value === 'string' && value)) {
    return null;
  }
  const sessionSource = runtimeSession ? 'official-runtime' : 'environment-declaration';
  const modelSource = runtimeModel ? 'official-runtime' : 'environment-declaration';
  return {
    host: 'codex',
    provider: 'openai',
    sessionId,
    modelId,
    modelDisplay,
    source: 'runtime',
    sessionSource,
    modelSource,
  };
}

function identityRecovery({ runtime = {}, env = {} } = {}) {
  const sessionId = runtime.sessionId ?? env.CODEX_THREAD_ID ?? env.CODEX_SESSION_ID;
  if (typeof sessionId !== 'string' || !sessionId)
    return 'Run from a supported Codex session that exposes CODEX_THREAD_ID, then retry.';
  return 'The Codex hook did not supply the current model for this command. For a linked worktree, open a Codex CLI there and run /hooks to inspect the active hook source and trust state. Run peer-review setup --update in that source if the hook is absent, then review and trust the hook or start a new session before retrying. peer-review doctor --mode installation checks package files but cannot prove this session’s hook is active.';
}

export const codexAdapter = Object.freeze({
  name: 'codex',
  host: 'codex',
  provider: 'openai',
  sessionIdEnvKeys: frozen(['CODEX_THREAD_ID', 'CODEX_SESSION_ID']),
  capabilities: frozen(['manual', 'staleness-only']),
  resolveRuntime,
  identityRecovery,
});

export default codexAdapter;
