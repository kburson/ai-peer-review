import { AprError } from '../errors.mjs';
import { manualTransport } from './manual.mjs';

function unavailable(capability) {
  throw new AprError(
    'APR_TRANSPORT_UNAVAILABLE',
    'The requested transport capability is unavailable.',
    {
      recovery: 'Use manual transport or configure a validated official resume-only adapter.',
      details: { capability },
    }
  );
}

export function createTransportRegistry() {
  const adapters = new Map();
  return Object.freeze({
    register(adapter) {
      if (
        !adapter ||
        typeof adapter.name !== 'string' ||
        !['manual', 'resume-only'].includes(adapter.capability) ||
        typeof adapter.deliver !== 'function'
      )
        unavailable(adapter?.capability);
      adapters.set(adapter.capability, adapter);
      return adapter;
    },
    resolve(capability = 'manual') {
      return adapters.get(capability) ?? unavailable(capability);
    },
    capabilities() {
      return Object.freeze([...adapters.keys()].sort());
    },
  });
}

const defaultRegistry = createTransportRegistry([manualTransport]);
defaultRegistry.register(manualTransport);

export function registerTransport(adapter) {
  return defaultRegistry.register(adapter);
}

export function resolveTransport(capability) {
  return defaultRegistry.resolve(capability);
}
