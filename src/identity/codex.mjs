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

export const codexAdapter = Object.freeze({
  name: 'codex',
  host: 'codex',
  provider: 'openai',
  sessionIdEnvKeys: frozen(['CODEX_THREAD_ID', 'CODEX_SESSION_ID']),
  capabilities: frozen(['manual', 'staleness-only']),
  resolveRuntime,
});

export default codexAdapter;
