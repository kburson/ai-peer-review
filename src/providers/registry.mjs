import { AprError } from '../errors.mjs';
import { createHash } from 'node:crypto';
import { existsSync, lstatSync, readFileSync, unlinkSync } from 'node:fs';
import path from 'node:path';
import { atomicWrite } from '../protocol/store.mjs';
import { evaluateSurfaceConformance } from './conformance.mjs';

export const SELECTORS = Object.freeze({
  codex: Object.freeze({ provider: 'openai', host: 'codex' }),
  claude: Object.freeze({ provider: 'anthropic', host: 'claude-code' }),
  grok: Object.freeze({ provider: 'xai', host: 'grok' }),
});

export const PROVIDERS = Object.freeze(new Set(['openai', 'anthropic', 'xai']));
const registeredProductionAdapters = new Map();

export function productionProviderAdapters() {
  return new Map(registeredProductionAdapters);
}

export function registerProductionProviderAdapter(adapter) {
  const selected = SELECTORS[adapter?.selector];
  if (
    !selected ||
    adapter.provider !== selected.provider ||
    adapter.host !== selected.host ||
    registeredProductionAdapters.has(adapter.selector)
  )
    throw new TypeError('provider-adapter: invalid production registration');
  registeredProductionAdapters.set(adapter.selector, adapter);
  return adapter;
}

export function selectionUnsupported(message, details = {}) {
  throw new AprError('APR_REVIEWER_SELECTION_UNSUPPORTED', message, {
    recovery: 'Select codex, claude, or grok with an adapter-supported exact model and effort.',
    details,
  });
}

export function selectedAdapter(selector, adapters) {
  const selected = SELECTORS[selector];
  if (!selected) selectionUnsupported('Reviewer provider selector is unsupported.', { selector });
  const adapter = adapters instanceof Map ? adapters.get(selector) : adapters?.[selector];
  if (!adapter || typeof adapter.resolveModel !== 'function') {
    selectionUnsupported('Reviewer provider adapter is unavailable.', { selector });
  }
  return Object.freeze({ ...selected, adapter });
}

const EFFORTS = new Set(['low', 'medium', 'high']);

function text(value) {
  return typeof value === 'string' && value.trim() === value && value.length > 0;
}

function identityConflict(message, details = {}) {
  throw new AprError('APR_IDENTITY_CONFLICT', message, {
    recovery: 'Preserve the provider operation and reconcile the exact requested reviewer session.',
    details,
  });
}

function unavailable(message, details = {}) {
  throw new AprError('APR_TRANSPORT_UNAVAILABLE', message, {
    recovery: 'Use manual delivery or restore a verified official provider control surface.',
    details,
  });
}

function freezeObservation(value) {
  return Object.freeze({ ...value });
}

export function createProviderAdapter({
  selector,
  provider,
  host,
  models,
  surface = null,
  adapterVersion = '1.0.0',
  resource = { concurrent: true, resource_id: null },
} = {}) {
  const selected = SELECTORS[selector];
  if (
    !selected ||
    selected.provider !== provider ||
    selected.host !== host ||
    !text(adapterVersion)
  ) {
    throw new TypeError('provider-adapter: invalid closed identity');
  }
  const catalog = new Map(Object.entries(models ?? {}));
  const operations = new Map();
  const exactNative =
    typeof surface?.launch === 'function' &&
    typeof surface?.resume === 'function' &&
    typeof surface?.monitor === 'function' &&
    typeof surface?.observe === 'function';

  const provenSurface = async () => {
    if (!exactNative || typeof surface?.conformance !== 'function')
      return evaluateSurfaceConformance({ adapterVersion });
    try {
      const report = await surface.conformance();
      return evaluateSurfaceConformance({ ...report, adapterVersion });
    } catch {
      return evaluateSurfaceConformance({ adapterVersion });
    }
  };

  const surfaceAvailable = async () => {
    if (typeof surface?.available === 'function') {
      try {
        return (await surface.available()) === true;
      } catch {
        return false;
      }
    }
    return typeof surface?.launch === 'function';
  };

  const fingerprintSession = (sessionId) => {
    if (!text(sessionId)) identityConflict('Provider session observation is incomplete.');
    return `sha256:${createHash('sha256')
      .update('ai-peer-review.session/v1\n', 'utf8')
      .update(provider, 'utf8')
      .update('\n', 'utf8')
      .update(sessionId, 'utf8')
      .digest('hex')}`;
  };

  const operationFile = (scratchRoot, operationId) => {
    if (
      !path.isAbsolute(scratchRoot ?? '') ||
      path.normalize(scratchRoot) !== scratchRoot ||
      !/^[A-Za-z0-9._:-]+$/.test(operationId ?? '')
    ) {
      identityConflict('Provider operation storage identity is invalid.');
    }
    return path.join(scratchRoot, 'provider', selector, 'operations', `${operationId}.json`);
  };

  const persistOperation = (scratchRoot, operationId, operation) => {
    if (scratchRoot === undefined) return;
    atomicWrite(
      operationFile(scratchRoot, operationId),
      `${JSON.stringify({
        schema: 'ai-peer-review.provider-operation/v1',
        selector,
        operation_id: operationId,
        handle: operation.handle,
        session_fingerprint: operation.fingerprint,
      })}\n`
    );
  };

  const storedOperation = (scratchRoot, operationId) => {
    const memory = operations.get(operationId);
    if (memory) return memory;
    if (scratchRoot === undefined) return null;
    const file = operationFile(scratchRoot, operationId);
    let value;
    try {
      const metadata = lstatSync(file);
      if (!metadata.isFile() || metadata.isSymbolicLink()) throw new Error('unsafe operation file');
      value = JSON.parse(readFileSync(file, 'utf8'));
    } catch {
      unavailable('Provider operation handle is unavailable.', { operationId });
    }
    if (
      value?.schema !== 'ai-peer-review.provider-operation/v1' ||
      value.selector !== selector ||
      value.operation_id !== operationId ||
      !text(value.handle) ||
      !/^sha256:[0-9a-f]{64}$/.test(value.session_fingerprint ?? '')
    ) {
      identityConflict('Provider operation handle conflicts with sealed reviewer intent.');
    }
    const operation = Object.freeze({
      handle: value.handle,
      fingerprint: value.session_fingerprint,
    });
    operations.set(operationId, operation);
    return operation;
  };

  const validateObservation = (
    observation,
    expected,
    priorFingerprint = null,
    authorFingerprint = null
  ) => {
    if (!observation || typeof observation !== 'object')
      identityConflict('Provider runtime observation is unavailable.');
    const fingerprint = fingerprintSession(observation.session_id);
    if (
      observation.provider !== provider ||
      observation.host !== host ||
      observation.model_id !== expected.model_id ||
      observation.effort !== expected.effort ||
      observation.adapter_version !== adapterVersion ||
      observation.assurance !== 'runtime' ||
      (priorFingerprint && fingerprint !== priorFingerprint) ||
      (authorFingerprint && fingerprint === authorFingerprint)
    )
      identityConflict('Provider runtime observation does not match sealed reviewer intent.');
    return freezeObservation({
      provider,
      host,
      model_id: observation.model_id,
      effort: observation.effort,
      adapter_version: adapterVersion,
      assurance: 'runtime',
      session_fingerprint: fingerprint,
    });
  };

  const adapter = {
    name: selector,
    selector,
    provider,
    host,
    adapter_version: adapterVersion,
    async resolveModel({ model, effort = 'medium' } = {}) {
      const resolved = catalog.get(model);
      if (
        !resolved ||
        !EFFORTS.has(effort) ||
        (resolved.efforts && !resolved.efforts.includes(effort))
      ) {
        selectionUnsupported('Reviewer model or effort is unsupported.', {
          selector,
          model,
          effort,
        });
      }
      return Object.freeze({
        model_id: resolved.model_id,
        model_display: resolved.model_display,
        effort,
      });
    },
    async observeCapabilities() {
      const available = await surfaceAvailable();
      const conformance = await provenSurface();
      const automatic = available && conformance.reviewerLaunchable;
      return Object.freeze({
        selector,
        provider,
        host,
        adapter_version: adapterVersion,
        available,
        automatic,
        unavailable_reasons: conformance.reasons,
        native: Object.freeze(automatic ? ['exact-session'] : []),
        broker: Object.freeze([
          Object.freeze({ transport_mode: 'manual', adapter_version: adapterVersion }),
        ]),
        transport: Object.freeze([
          'manual',
          ...(available && typeof surface?.resume === 'function' ? ['resume-only'] : []),
          ...(automatic ? ['automatic-required'] : []),
        ]),
        resource: Object.freeze({ ...resource }),
      });
    },
    async capabilities({ selection } = {}) {
      const available = await surfaceAvailable();
      const conformance = await provenSurface();
      const automatic = available && conformance.reviewerLaunchable;
      const native =
        automatic && selection?.classification === 'SPR'
          ? [
              Object.freeze({
                exact_session: true,
                provider,
                host,
                transport_mode: 'automatic-required',
                adapter_version: adapterVersion,
              }),
            ]
          : [];
      return Object.freeze({
        native: Object.freeze(native),
        broker: Object.freeze([
          Object.freeze({ transport_mode: 'manual', adapter_version: adapterVersion }),
          ...(available && typeof surface?.resume === 'function'
            ? [Object.freeze({ transport_mode: 'resume-only', adapter_version: adapterVersion })]
            : []),
          ...(automatic
            ? [
                Object.freeze({
                  transport_mode: 'automatic-required',
                  adapter_version: adapterVersion,
                }),
              ]
            : []),
        ]),
        resource: Object.freeze({ ...resource }),
      });
    },
    async launchReviewer({
      invitationPath,
      expected,
      effort,
      operationId,
      authorSessionFingerprint = null,
      scratchRoot,
    } = {}) {
      if (
        !path.isAbsolute(invitationPath ?? '') ||
        path.normalize(invitationPath) !== invitationPath
      )
        unavailable('Provider launch requires a canonical absolute invitation pointer.');
      if (
        !text(operationId) ||
        effort !== expected?.effort ||
        expected?.adapter_version !== adapterVersion
      )
        identityConflict('Provider launch request conflicts with sealed reviewer intent.');
      if (typeof surface?.launch !== 'function')
        unavailable('Provider launch surface is unavailable.');
      const result = await surface.launch(
        Object.freeze({
          invitationPath,
          model: expected.model_id,
          effort,
          operationId,
        })
      );
      if (!['acknowledged', 'definitely-not-submitted', 'outcome-unknown'].includes(result?.status))
        unavailable('Provider launch returned an invalid outcome.');
      if (result.status !== 'acknowledged') return Object.freeze({ status: result.status });
      const observed = validateObservation(
        result.observation,
        expected,
        null,
        authorSessionFingerprint
      );
      if (!text(result.handle)) unavailable('Provider launch did not return a resumable handle.');
      const operation = Object.freeze({
        handle: result.handle,
        fingerprint: observed.session_fingerprint,
      });
      operations.set(operationId, operation);
      persistOperation(scratchRoot, operationId, operation);
      return Object.freeze({ status: 'launched', observation: observed });
    },
    async observeSession({
      operationId,
      expected,
      authorSessionFingerprint = null,
      scratchRoot,
    } = {}) {
      const operation = storedOperation(scratchRoot, operationId);
      if (!operation || typeof surface?.observe !== 'function')
        unavailable('Provider session observation is unavailable.');
      const observed = await surface.observe(operation.handle);
      return validateObservation(
        observed,
        expected,
        operation.fingerprint,
        authorSessionFingerprint
      );
    },
    async deliver(input) {
      if (typeof surface?.deliver !== 'function') unavailable('Provider delivery is unavailable.');
      const operation = storedOperation(input?.scratchRoot, input?.operationId);
      return surface.deliver({ ...input, handle: operation?.handle });
    },
    async reconcile(input) {
      if (typeof surface?.reconcile !== 'function')
        unavailable('Provider reconciliation is unavailable.');
      const operation = storedOperation(input?.scratchRoot, input?.operationId);
      return surface.reconcile({ ...input, handle: operation?.handle });
    },
    async close(input) {
      const operation = storedOperation(input?.scratchRoot, input?.operationId);
      const result =
        typeof surface?.close === 'function'
          ? await surface.close({ ...input, handle: operation?.handle })
          : undefined;
      operations.delete(input?.operationId);
      if (input?.scratchRoot !== undefined) {
        const file = operationFile(input.scratchRoot, input.operationId);
        if (existsSync(file)) unlinkSync(file);
      }
      return result;
    },
  };
  if (typeof surface?.observeCurrentSession === 'function') {
    adapter.observeCurrentSession = (input) => surface.observeCurrentSession(input);
  }
  if (typeof surface?.observeBoundSession === 'function') {
    adapter.observeBoundSession = (input) => surface.observeBoundSession(input);
  }
  if (typeof surface?.version === 'function') {
    adapter.attestVersion = async () =>
      Object.freeze({
        source: 'pinned-runtime',
        adapter_version: adapterVersion,
        surface_version: await surface.version(),
      });
  }
  if (typeof surface?.launch === 'function') {
    adapter.launch = async ({
      invitation,
      selection,
      requestDigest,
      authorSessionFingerprint = null,
      workspace,
    }) =>
      adapter.launchReviewer({
        invitationPath: invitation,
        expected: {
          provider,
          host,
          model_id: selection.model_id,
          effort: selection.effort,
          adapter_version: adapterVersion,
        },
        effort: selection.effort,
        operationId: requestDigest,
        authorSessionFingerprint,
        scratchRoot: workspace,
      });
  }
  return Object.freeze(adapter);
}
