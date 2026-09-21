import { createProviderAdapter, registerProductionProviderAdapter } from './registry.mjs';

const MODELS = Object.freeze({
  opus: Object.freeze({ model_id: 'claude-opus-5', model_display: 'Claude Opus 5' }),
  'claude-opus-5': Object.freeze({ model_id: 'claude-opus-5', model_display: 'Claude Opus 5' }),
  sonnet: Object.freeze({ model_id: 'claude-sonnet-5', model_display: 'Claude Sonnet 5' }),
  'claude-sonnet-5': Object.freeze({
    model_id: 'claude-sonnet-5',
    model_display: 'Claude Sonnet 5',
  }),
});

export function createClaudeAdapter(options = {}) {
  return createProviderAdapter({
    ...options,
    selector: 'claude',
    provider: 'anthropic',
    host: 'claude-code',
    models: MODELS,
    resource: { concurrent: true, resource_id: null },
  });
}

export const claudeProviderAdapter = registerProductionProviderAdapter(createClaudeAdapter());
export default claudeProviderAdapter;
