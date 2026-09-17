function frozen(values) {
  return Object.freeze([...values]);
}

function resolveRuntime({ runtime = {}, env = {} } = {}) {
  const runtimeSession = runtime.sessionId;
  const runtimeModel = runtime.modelId;
  const sessionId = runtimeSession ?? env.GROK_SESSION_ID;
  const modelId = runtimeModel ?? env.GROK_MODEL_ID;
  const modelDisplay = runtime.modelDisplay ?? env.GROK_MODEL_DISPLAY ?? modelId;
  if (![sessionId, modelId, modelDisplay].every((value) => typeof value === 'string' && value)) {
    return null;
  }
  const sessionSource = runtimeSession ? 'official-runtime' : 'environment-declaration';
  const modelSource = runtimeModel ? 'official-runtime' : 'environment-declaration';
  return {
    host: 'grok',
    provider: 'xai',
    sessionId,
    modelId,
    modelDisplay,
    source: modelSource === 'official-runtime' ? 'runtime' : 'declared',
    sessionSource,
    modelSource,
  };
}

export const grokAdapter = Object.freeze({
  name: 'grok',
  host: 'grok',
  provider: 'xai',
  sessionIdEnvKeys: frozen(['GROK_SESSION_ID']),
  capabilities: frozen(['manual', 'staleness-only']),
  resolveRuntime,
});

export default grokAdapter;
