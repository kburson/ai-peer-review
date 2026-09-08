function frozen(values) {
  return Object.freeze([...values]);
}

function resolveRuntime({ runtime = {}, env = {} } = {}) {
  const sessionId = runtime.sessionId ?? env.CLAUDE_CODE_SESSION_ID ?? env.CLAUDE_SESSION_ID;
  const modelId = runtime.modelId ?? env.CLAUDE_MODEL_ID;
  const modelDisplay = runtime.modelDisplay ?? env.CLAUDE_MODEL_DISPLAY ?? modelId;
  if (![sessionId, modelId, modelDisplay].every((value) => typeof value === 'string' && value)) {
    return null;
  }
  return {
    host: 'claude-code',
    provider: 'anthropic',
    sessionId,
    modelId,
    modelDisplay,
    source: 'runtime',
  };
}

export const claudeAdapter = Object.freeze({
  name: 'claude',
  host: 'claude-code',
  provider: 'anthropic',
  sessionIdEnvKeys: frozen(['CLAUDE_CODE_SESSION_ID', 'CLAUDE_SESSION_ID']),
  capabilities: frozen(['manual', 'staleness-only']),
  resolveRuntime,
});

export default claudeAdapter;
