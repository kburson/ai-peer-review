import { createProviderAdapter, registerProductionProviderAdapter } from './registry.mjs';

export function createGrokAdapter(options = {}) {
  return createProviderAdapter({
    ...options,
    selector: 'grok',
    provider: 'xai',
    host: 'grok',
    resource: { concurrent: false, resource_id: 'grok-desktop' },
  });
}

export const grokProviderAdapter = registerProductionProviderAdapter(createGrokAdapter());
export default grokProviderAdapter;
