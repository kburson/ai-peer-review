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
  const modelSource =
    runtime.modelSource ?? (runtimeModel ? 'official-runtime' : 'environment-declaration');
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
  return 'For a new review, pass the run-scoped --author-model and --author-effort selection. For an existing review, resume its registered Codex session; a model hook is not required.';
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
