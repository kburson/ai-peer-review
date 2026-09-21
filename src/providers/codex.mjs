import { createProviderAdapter, registerProductionProviderAdapter } from './registry.mjs';
import { execFile as execFileCallback } from 'node:child_process';
import { promisify } from 'node:util';

import { AprError } from '../errors.mjs';
import { readCodexStartHook } from './codex-hook.mjs';
import { readCodexSessionSnapshot } from './codex-session.mjs';

const execFile = promisify(execFileCallback);

const MODELS = Object.freeze({
  astra: Object.freeze({ model_id: 'gpt-6-astra', model_display: 'GPT-6 Astra' }),
  'gpt-6-astra': Object.freeze({ model_id: 'gpt-6-astra', model_display: 'GPT-6 Astra' }),
  sol: Object.freeze({ model_id: 'gpt-5.6-sol', model_display: 'GPT-5.6 Sol' }),
  'gpt-5.6-sol': Object.freeze({ model_id: 'gpt-5.6-sol', model_display: 'GPT-5.6 Sol' }),
});

export function createCodexProviderSurface({
  executeVersion = async () => {
    const result = await execFile('codex', ['--version'], { shell: false, encoding: 'utf8' });
    return String(result.stdout ?? '')
      .trim()
      .match(/^codex-cli (.+)$/)?.[1];
  },
} = {}) {
  const version = async () => {
    const value = await executeVersion();
    if (typeof value !== 'string' || !value)
      throw new AprError('APR_CODEX_HOOK_INVALID', 'Codex CLI version is unavailable.', {
        recovery: 'Use the installed version-pinned Codex CLI.',
      });
    return value;
  };
  return Object.freeze({
    available: async () => Boolean(await version()),
    version,
    observeCurrentSession: ({ root, token, handleLocator, operationId }) => {
      if (!operationId?.startsWith('start:'))
        throw new AprError(
          'APR_IDENTITY_CONFLICT',
          'Codex has no exact reviewer-join observation for this operation.',
          { recovery: 'Use a conformant reviewer surface or explicitly declared manual delivery.' }
        );
      return readCodexStartHook({ root, token, sessionId: handleLocator, operationId });
    },
    observeBoundSession: ({ projectRoot, handleLocator, now }) =>
      readCodexSessionSnapshot({ projectRoot, sessionId: handleLocator, now }),
  });
}

export function createCodexAdapter(options = {}) {
  const { surface = createCodexProviderSurface(), ...adapterOptions } = options;
  return createProviderAdapter({
    ...adapterOptions,
    selector: 'codex',
    provider: 'openai',
    host: 'codex',
    models: MODELS,
    surface,
    resource: { concurrent: true, resource_id: null },
  });
}

export const codexProviderAdapter = registerProductionProviderAdapter(createCodexAdapter());
export default codexProviderAdapter;
