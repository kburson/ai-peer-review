import { createProviderAdapter, registerProductionProviderAdapter } from './registry.mjs';

const MODELS = Object.freeze({
  astra: Object.freeze({ model_id: 'gpt-6-astra', model_display: 'GPT-6 Astra' }),
  'gpt-6-astra': Object.freeze({ model_id: 'gpt-6-astra', model_display: 'GPT-6 Astra' }),
  sol: Object.freeze({ model_id: 'gpt-5.6-sol', model_display: 'GPT-5.6 Sol' }),
  'gpt-5.6-sol': Object.freeze({ model_id: 'gpt-5.6-sol', model_display: 'GPT-5.6 Sol' }),
});

export function createCodexAdapter(options = {}) {
  return createProviderAdapter({
    ...options,
    selector: 'codex',
    provider: 'openai',
    host: 'codex',
    models: MODELS,
    resource: { concurrent: true, resource_id: null },
  });
}

export const codexProviderAdapter = registerProductionProviderAdapter(createCodexAdapter());
export default codexProviderAdapter;
