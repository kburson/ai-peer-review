import { AprError } from '../errors.mjs';
import { PROVIDERS } from '../providers/registry.mjs';
import { createHash } from 'node:crypto';
import { existsSync, lstatSync, readFileSync, realpathSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { canonicalProjectIdentity } from '../broker/identity.mjs';
import { ensureBroker, requestBroker } from '../broker/client.mjs';
import { registerReview, readStartupJournal, startupEvidence } from '../broker/registry.mjs';
import { platformSecurity } from '../broker/platform.mjs';
import { pinRuntimeImage, verifyRuntimeImage } from '../broker/runtime-image.mjs';
import { createGitRepository } from '../git/repository.mjs';
import { loadConfig } from '../config/load.mjs';
import { canonicalProjection, inspectReview } from '../protocol/service.mjs';
import { atomicCreate, atomicWrite, withReviewLock } from '../protocol/store.mjs';
import { startReview } from '../cli/run.mjs';
import { resolveSelection } from './selection.mjs';

const packageRoot = fileURLToPath(new URL('../..', import.meta.url));
const preparedRequests = new WeakMap();
const DEFINITELY_NOT_SUBMITTED_ERRORS = new Set([
  'APR_PROVIDER_QUOTA',
  'APR_PROVIDER_RESOURCE_BUSY',
]);

export async function prepareStartup(input, deps = {}) {
  input = structuredClone({ ...input, now: input.now ?? new Date() });
  if (!text(input.reviewerProvider) || !text(input.reviewerModel)) {
    usage('New reviews require explicit reviewer provider and model selection.');
  }
  const repository = deps.repository ?? createGitRepository();
  const root = repository.root(input.cwd);
  const loaded = structuredClone(deps.config ?? loadConfig({ cwd: root }));
  const selection = await resolveSelection(
    {
      author: input.identity,
      selector: input.reviewerProvider,
      model: input.reviewerModel,
      effort: input.reviewerEffort ?? 'medium',
    },
    deps.adapters
  );
  const adapter =
    deps.adapters instanceof Map
      ? deps.adapters.get(selection.selector)
      : deps.adapters?.[selection.selector];
  const capabilities =
    typeof adapter.capabilities === 'function'
      ? await adapter.capabilities({ author: input.identity, selection })
      : adapter.capabilities;
  const selected = selectRuntime({
    selection,
    author: input.identity,
    requestedTransport: input.transportMode,
    policy: loaded.config.review,
    capabilities,
  });
  const brokerPlatform =
    deps.platform ??
    (selected.ownership === 'broker' && !deps.ensureBroker ? platformSecurity() : null);
  const project = canonicalProjectIdentity({
    cwd: root,
    platform: {
      kind: process.platform,
      canonicalPath: realpathSync,
      userId: brokerPlatform?.userId ?? (() => String(process.geteuid?.() ?? process.env.USERNAME)),
      repository,
    },
  });
  const { classification, ...reviewer } = selection;
  const runtime = validateRuntimeDescriptor({
    schema: 'ai-peer-review.runtime/v1',
    classification,
    ...selected,
    reviewer,
    project_root_digest: project.digest,
  });
  if (input.runtime && canonicalProjection(input.runtime) !== canonicalProjection(runtime))
    usage('Supplied runtime conflicts with resolved selection.');
  let resolvedInput = { ...input, runtime, transportMode: runtime.transport_mode };
  let preflight = await startReview(resolvedInput, {
    ...deps,
    config: loaded,
    validatedStartup: true,
    preflightOnly: true,
  });
  let initial =
    preflight.initial ??
    JSON.parse(
      readFileSync(path.join(preflight.paths.scratch.absolute, 'events.jsonl'), 'utf8').split(
        '\n'
      )[0]
    );
  const prior = readStartupJournal(preflight.paths.scratch.absolute);
  if (prior?.stage === 'reserved' && !preflight.existing) {
    // First preflight above checks today's artifact, authority and capability.
    // Rebuild with sealed timestamps only; every stable field must still hash
    // to the original request before any authority is created.
    resolvedInput = {
      ...resolvedInput,
      now:
        prior.created_at ??
        prior.request.startup.bootstrap?.attestation.verified_at ??
        `${prior.request.startup.context.review_date}T00:00:00.000Z`,
      identity: { ...resolvedInput.identity, joined_at: prior.request.author.joined_at },
    };
    preflight = await startReview(resolvedInput, {
      ...deps,
      config: loaded,
      validatedStartup: true,
      preflightOnly: true,
    });
    initial = preflight.initial;
  }
  const requestDigest = createHash('sha256')
    .update(canonicalProjection(initial.payload))
    .digest('hex');
  let image = null;
  let broker = null;
  let versions = null;
  const journalFile = path.join(preflight.paths.scratch.absolute, 'startup-request.json');
  if (preflight.existing) startupEvidence(preflight.paths.scratch.absolute, preflight.existing);
  if (prior && prior.request_digest !== requestDigest)
    throw new AprError('APR_OUTPUT_COLLISION', 'A different startup request owns this workspace.', {
      recovery: `Preserve ${journalFile} and reconcile the exact request.`,
    });
  if (prior?.stage === 'reserved' && preflight.existing) {
    // Existing exact event authority may predate its derived reservations after
    // an interrupted create. Repair that owned transaction before broker reload.
    await withReviewLock(path.join(preflight.paths.scratch.absolute, 'startup'), () =>
      startReview(resolvedInput, {
        ...deps,
        config: loaded,
        validatedStartup: true,
        requestDigest,
        repairStartupIdentity: true,
      })
    );
  }
  if (runtime.ownership === 'broker') {
    image =
      prior?.runtime ??
      (deps.pinRuntimeImage ?? pinRuntimeImage)({
        packageRoot,
        nodeExecutable: realpathSync(process.execPath),
        destination: path.join(root, '.scratch', 'peer-review', 'runtimes', requestDigest),
      });
    versions = prior?.versions ?? {
      package_version: JSON.parse(
        readFileSync(path.join(image.root, 'package/package.json'), 'utf8')
      ).version,
      broker_protocol_version: 1,
      node_major: Number(process.versions.node.split('.')[0]),
    };
    if (
      !prior ||
      !['manual', 'launched', 'launch-pending', 'outcome-unknown'].includes(prior.stage)
    ) {
      if (prior && !verifyRuntimeImage(image))
        throw new AprError('APR_BROKER_RUNTIME_MISSING', 'The reserved runtime is unavailable.', {
          recovery: `Restore the exact runtime at ${image.root}.`,
        });
      broker = await (deps.ensureBroker ?? ensureBroker)({
        project,
        runtimeImage: image,
        versions,
        platform: brokerPlatform,
      });
    }
  }
  const prepared = Object.freeze({
    artifact: preflight.artifact,
    selection,
    runtime,
    requestDigest,
    paths: preflight.paths,
  });
  preparedRequests.set(prepared, {
    input: structuredClone(resolvedInput),
    preflight,
    loaded,
    project,
    image,
    versions,
    broker,
    adapter,
    requestAuthority: structuredClone(initial.payload),
    createdAt: initial.at,
    preparedSnapshot: canonicalProjection(prepared),
  });
  return prepared;
}

export async function activateStartup(prepared, deps = {}) {
  const request = preparedRequests.get(prepared);
  if (!request) usage('Startup requires a validated preparation from this process.');
  if (canonicalProjection(prepared) !== request.preparedSnapshot) {
    request.broker?.close?.();
    request.broker?.connection?.close?.();
    throw new AprError(
      'APR_OUTPUT_COLLISION',
      'Prepared startup intent changed before activation.',
      { recovery: 'Prepare the exact requested review again before activating it.' }
    );
  }
  prepared = JSON.parse(request.preparedSnapshot);
  const workspace = prepared.paths.scratch.absolute;
  const file = path.join(workspace, 'startup-request.json');
  try {
    return await withReviewLock(path.join(workspace, 'startup'), async () => {
      let journal;
      if (existsSync(file)) {
        if (!lstatSync(file).isFile() || lstatSync(file).isSymbolicLink())
          usage('Startup journal is not an owned regular file.');
        journal = readStartupJournal(workspace);
        if (journal.request_digest !== prepared.requestDigest || journal.workspace !== workspace) {
          throw new AprError(
            'APR_OUTPUT_COLLISION',
            'Startup reservation belongs to a different request.',
            { recovery: `Preserve ${file} and reconcile the exact reserved request.` }
          );
        }
      } else {
        journal = {
          schema: 'ai-peer-review.startup-request/v1',
          request_digest: prepared.requestDigest,
          request: request.requestAuthority,
          created_at: request.createdAt,
          workspace,
          review_id: request.preflight.reviewId,
          runtime: request.image,
          versions: request.versions,
          descriptor: prepared.runtime,
          stage: 'reserved',
        };
        atomicCreate(file, `${JSON.stringify(journal)}\n`);
      }
      const save = (stage, extra = {}) => {
        journal = { ...journal, ...extra, stage };
        atomicWrite(file, `${JSON.stringify(journal)}\n`);
      };
      const enriched = (result) => {
        const current = inspectReview(workspace);
        return {
          ...result,
          state: current.protocol.state,
          next_action: current.protocol.next_action,
          review: {
            ...result.review,
            runtime: prepared.runtime,
            recovery: startupEvidence(workspace, current).recovery,
          },
        };
      };
      const unknown = () =>
        new AprError(
          'APR_WAKE_OUTCOME_UNKNOWN',
          'Reviewer launch outcome requires explicit reconciliation.',
          {
            recovery: `peer-review broker reconcile '${workspace.replaceAll("'", "'\\''")}'`,
            details: { workspace, request_digest: prepared.requestDigest },
          }
        );
      if (['launch-pending', 'outcome-unknown'].includes(journal.stage)) throw unknown();
      await deps.afterStartupStage?.('reservation', { workspace });
      const result = await startReview(request.input, {
        ...deps,
        config: request.loaded,
        validatedStartup: true,
        requestDigest: prepared.requestDigest,
      });
      if (['launched', 'manual'].includes(journal.stage)) return enriched(result);
      const dispatchRevision = inspectReview(workspace).protocol.revision;
      save('authority');
      await deps.afterStartupStage?.('authority', { workspace });
      if (prepared.runtime.ownership === 'broker') {
        const registration = (deps.registerReview ?? registerReview)(
          {
            project: request.project,
            requestDigest: prepared.requestDigest,
            workspace,
            runtime: journal.runtime,
          },
          {
            root: path.join(
              request.project.physicalRoot,
              '.scratch',
              'peer-review',
              'broker',
              'registrations'
            ),
          }
        );
        const registered = await requestBroker(request.broker, 'register', workspace);
        if (
          !['runnable', 'automatic-wait', 'recovery-only', 'terminal'].includes(registered?.status)
        ) {
          throw new AprError(
            'APR_BROKER_START_FAILED',
            'Broker did not acknowledge review registration.',
            { recovery: `peer-review broker reconcile '${workspace.replaceAll("'", "'\\''")}'` }
          );
        }
        save('registered', { registration_file: registration.registration_file });
      } else save('registered');
      await deps.afterStartupStage?.('registration', { workspace });
      return withReviewLock(path.join(workspace, 'dispatch'), async () => {
        const fresh = inspectReview(workspace);
        const evidence = startupEvidence(workspace, fresh);
        journal = evidence.journal;
        if (['launch-pending', 'outcome-unknown'].includes(journal.stage)) throw unknown();
        if (
          evidence.recovery.fenced ||
          evidence.recovery.suspending ||
          journal.stage !== 'registered' ||
          fresh.protocol.revision !== dispatchRevision
        )
          throw new AprError(
            'APR_BROKER_STALE',
            'Startup dispatch authority changed before launch.',
            {
              recovery: evidence.recovery.reconciliation_command,
            }
          );
        if (typeof request.adapter.launch !== 'function') {
          save('manual');
          return enriched(result);
        }
        save('launch-pending');
        let outcome;
        try {
          outcome = await request.adapter.launch({
            workspace,
            invitation: result.paths.reviewer_invitation,
            selection: prepared.selection,
            runtime: prepared.runtime,
            requestDigest: prepared.requestDigest,
            authorSessionFingerprint: request.input.identity.session_fingerprint,
          });
        } catch (cause) {
          if (cause instanceof AprError && DEFINITELY_NOT_SUBMITTED_ERRORS.has(cause.code)) {
            save('registered');
            throw cause;
          }
          save('outcome-unknown');
          throw unknown();
        }
        if (outcome?.status === 'definitely-not-submitted') {
          save('registered');
          throw new AprError(
            'APR_WAKE_NOT_SUBMITTED',
            'Reviewer launch was definitely not submitted.',
            {
              recovery: `Retry the exact startup request for ${workspace}.`,
              details: { workspace, request_digest: prepared.requestDigest },
            }
          );
        }
        if (outcome?.status !== 'launched') {
          save('outcome-unknown');
          throw unknown();
        }
        save('launched');
        return enriched(result);
      });
    });
  } finally {
    request.broker?.close?.();
    request.broker?.connection?.close?.();
  }
}

const TRANSPORTS = new Set(['manual', 'resume-only', 'automatic-required']);
const IDENTITY_SOURCES = new Set(['runtime', 'declared']);
const CLASSIFICATIONS = new Set(['SPR', 'XPR']);
const OWNERSHIPS = new Set(['native', 'broker']);
const SELECTOR_IDENTITY = Object.freeze({
  codex: Object.freeze({ provider: 'openai', host: 'codex' }),
  claude: Object.freeze({ provider: 'anthropic', host: 'claude-code' }),
  grok: Object.freeze({ provider: 'xai', host: 'grok' }),
});

function unavailable(reason, details = {}) {
  throw new AprError(
    'APR_TRANSPORT_UNAVAILABLE',
    'No observed transport satisfies reviewer startup policy.',
    {
      recovery:
        'Use a declared available transport or restore a conformant exact-session native or broker adapter.',
      details: { reason, ...details },
    }
  );
}

function text(value) {
  return typeof value === 'string' && value.trim() === value && value.length > 0;
}

function usage(message, details = {}) {
  throw new AprError('APR_USAGE', message, {
    recovery: 'Provide the complete closed runtime descriptor for the requested reviewer.',
    details,
  });
}

function identityConflict(message, details = {}) {
  throw new AprError('APR_IDENTITY_CONFLICT', message, {
    recovery: 'Join from the exact requested reviewer session and adapter observation.',
    details,
  });
}

function exactKeys(value, keys, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) usage(`${label} is invalid.`);
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index])) {
    usage(`${label} must use the closed descriptor fields.`, { fields: actual });
  }
}

export function validateRuntimeDescriptor(value) {
  exactKeys(
    value,
    [
      'schema',
      'classification',
      'ownership',
      'transport_mode',
      'reviewer',
      'adapter_version',
      'project_root_digest',
    ],
    'Runtime descriptor'
  );
  if (value.schema !== 'ai-peer-review.runtime/v1') usage('Runtime descriptor schema is invalid.');
  if (!CLASSIFICATIONS.has(value.classification))
    usage('Runtime descriptor classification is invalid.');
  if (!OWNERSHIPS.has(value.ownership)) usage('Runtime descriptor ownership is invalid.');
  if (!TRANSPORTS.has(value.transport_mode)) usage('Runtime descriptor transport mode is invalid.');
  exactKeys(
    value.reviewer,
    ['selector', 'provider', 'host', 'model_id', 'model_display', 'effort'],
    'Runtime descriptor reviewer'
  );
  const selected = SELECTOR_IDENTITY[value.reviewer.selector];
  if (
    !selected ||
    selected.provider !== value.reviewer.provider ||
    selected.host !== value.reviewer.host
  ) {
    usage('Runtime descriptor reviewer selector, provider, and host disagree.');
  }
  if (!text(value.reviewer.model_id) || !text(value.reviewer.model_display))
    usage('Runtime descriptor reviewer model is invalid.');
  if (!text(value.reviewer.effort)) usage('Runtime descriptor reviewer effort is invalid.');
  if (!text(value.adapter_version)) usage('Runtime descriptor adapter version is invalid.');
  if (
    typeof value.project_root_digest !== 'string' ||
    !/^[0-9a-f]{64}$/.test(value.project_root_digest)
  )
    usage('Runtime descriptor project root digest is invalid.');
  return value;
}

export function assertRequestedReviewer(runtime, identity, observation) {
  validateRuntimeDescriptor(runtime);
  exactKeys(
    observation,
    ['provider', 'host', 'model_id', 'effort', 'adapter_version', 'assurance'],
    'Reviewer runtime observation'
  );
  const requested = runtime.reviewer;
  const actual = identity ?? {};
  const observed = observation ?? {};
  const exact =
    actual.provider === requested.provider &&
    actual.host === requested.host &&
    actual.model_id === requested.model_id &&
    observed.provider === requested.provider &&
    observed.host === requested.host &&
    observed.model_id === requested.model_id &&
    observed.effort === requested.effort &&
    observed.adapter_version === runtime.adapter_version;
  if (!exact) identityConflict('Joining reviewer does not match sealed startup intent.');
  if (actual.identity_source === 'declared') {
    if (runtime.transport_mode !== 'manual' || observed.assurance !== 'declared')
      identityConflict(
        'Declared reviewer registration is restricted to an explicitly labeled manual declaration.'
      );
  } else if (actual.identity_source !== 'runtime' || observed.assurance !== 'runtime') {
    identityConflict('Reviewer runtime observation does not provide the requested assurance.');
  }
  return true;
}

function requestedModes(requestedTransport, policy = {}) {
  if (requestedTransport !== null && requestedTransport !== undefined) {
    if (!TRANSPORTS.has(requestedTransport)) unavailable('invalid-requested-transport');
    return [requestedTransport];
  }
  const modes = [policy.transport_mode, ...(policy.startup_transport_preference ?? [])].filter(
    (mode) => mode !== undefined
  );
  if (!modes.length || modes.some((mode) => !TRANSPORTS.has(mode))) unavailable('invalid-policy');
  return [...new Set(modes)];
}

function assuredAuthor(author) {
  return (
    author &&
    PROVIDERS.has(author.provider) &&
    text(author.host) &&
    text(author.session_fingerprint) &&
    IDENTITY_SOURCES.has(author.identity_source)
  );
}

function compatibleNative(capabilities, selection, author, mode) {
  if (
    selection.classification !== 'SPR' ||
    author.identity_source !== 'runtime' ||
    author.provider !== selection.provider
  ) {
    return null;
  }
  return (capabilities?.native ?? []).find(
    (candidate) =>
      candidate?.exact_session === true &&
      candidate.provider === selection.provider &&
      candidate.host === selection.host &&
      candidate.transport_mode === mode &&
      text(candidate.adapter_version)
  );
}

function compatibleBroker(capabilities, mode) {
  return (capabilities?.broker ?? []).find(
    (candidate) => candidate?.transport_mode === mode && text(candidate.adapter_version)
  );
}

export function selectRuntime({
  selection,
  author,
  requestedTransport = null,
  policy = {},
  capabilities,
} = {}) {
  if (
    !selection ||
    !text(selection.provider) ||
    !text(selection.host) ||
    !['SPR', 'XPR'].includes(selection.classification)
  ) {
    unavailable('unresolved-selection');
  }
  if (!assuredAuthor(author)) unavailable('unresolved-author-assurance');
  const modes = requestedModes(requestedTransport, policy);
  for (const mode of modes) {
    const native = compatibleNative(capabilities, selection, author, mode);
    if (native) {
      return Object.freeze({
        ownership: 'native',
        transport_mode: mode,
        adapter_version: native.adapter_version,
      });
    }
    if (author?.identity_source === 'declared' && mode !== 'manual') continue;
    const broker = compatibleBroker(capabilities, mode);
    if (broker) {
      return Object.freeze({
        ownership: 'broker',
        transport_mode: mode,
        adapter_version: broker.adapter_version,
      });
    }
  }
  unavailable('no-policy-capability-intersection', { modes });
}
