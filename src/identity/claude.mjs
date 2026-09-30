function frozen(values) {
  return Object.freeze([...values]);
}

function resolveRuntime({ runtime = {}, env = {}, declaredModel = {} } = {}) {
  const runtimeSession = runtime.sessionId;
  const runtimeModel = runtime.modelId;
  const sessionId = runtimeSession ?? env.CLAUDE_CODE_SESSION_ID ?? env.CLAUDE_SESSION_ID;
  const modelId = runtimeModel ?? env.CLAUDE_MODEL_ID;
  const modelDisplay = runtime.modelDisplay ?? env.CLAUDE_MODEL_DISPLAY ?? modelId;
  if ([sessionId, modelId, modelDisplay].every((value) => typeof value === 'string' && value)) {
    const sessionSource = runtimeSession ? 'official-runtime' : 'environment-declaration';
    const modelSource =
      runtime.modelSource ?? (runtimeModel ? 'official-runtime' : 'environment-declaration');
    return {
      host: 'claude-code',
      provider: 'anthropic',
      sessionId,
      modelId,
      modelDisplay,
      source: 'runtime',
      sessionSource,
      modelSource,
    };
  }

  if (
    typeof sessionId === 'string' &&
    sessionId &&
    typeof declaredModel.modelId === 'string' &&
    declaredModel.modelId &&
    typeof declaredModel.modelDisplay === 'string' &&
    declaredModel.modelDisplay
  ) {
    return {
      host: 'claude-code',
      provider: 'anthropic',
      sessionId,
      modelId: declaredModel.modelId,
      modelDisplay: declaredModel.modelDisplay,
      source: 'declared',
      sessionSource: runtimeSession ? 'official-runtime' : 'environment-declaration',
      modelSource: 'configuration',
    };
  }
  return null;
}

function identityRecovery({ runtime = {}, env = {} } = {}) {
  const sessionId = runtime.sessionId ?? env.CLAUDE_CODE_SESSION_ID ?? env.CLAUDE_SESSION_ID;
  if (typeof sessionId !== 'string' || !sessionId) {
    return 'Run from a supported Claude Code session that exposes CLAUDE_CODE_SESSION_ID, then retry.';
  }
  return 'For a new review, pass the run-scoped --author-model and --author-effort selection. For an existing review, resume its registered Claude session; a model hook is not required.';
}

export const claudeAdapter = Object.freeze({
  name: 'claude',
  host: 'claude-code',
  provider: 'anthropic',
  sessionIdEnvKeys: frozen(['CLAUDE_CODE_SESSION_ID', 'CLAUDE_SESSION_ID']),
  capabilities: frozen(['manual', 'staleness-only']),
  resolveRuntime,
  identityRecovery,
});

export default claudeAdapter;
