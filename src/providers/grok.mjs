import { createProviderAdapter, registerProductionProviderAdapter } from './registry.mjs';

const MODELS = Object.freeze({
  grok: Object.freeze({ model_id: 'grok-4.6', model_display: 'Grok 4.6' }),
  'grok-4.6': Object.freeze({ model_id: 'grok-4.6', model_display: 'Grok 4.6' }),
});

export function createGrokAdapter(options = {}) {
  return createProviderAdapter({
    ...options,
    selector: 'grok',
    provider: 'xai',
    host: 'grok',
    models: MODELS,
    resource: { concurrent: false, resource_id: 'grok-desktop' },
  });
}

export const grokProviderAdapter = registerProductionProviderAdapter(createGrokAdapter());
export default grokProviderAdapter;
