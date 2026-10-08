// @story #178
import { AprError } from '../errors.mjs';
import { createHash, randomBytes } from 'node:crypto';
import { realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { parseRawJson, encodeRequestCanonical } from '../api/canonical-json.mjs';
import {
  portableOwnerReadinessObligations,
  createPortableOwnerReadiness,
} from './owner-readiness.mjs';
import {
  createPortableOwnerLifecycle,
  isPortableBrokerOwner,
} from './portable-owner-lifecycle.mjs';
import { observePortableReconciliation } from './portable-reconciliation.mjs';
import { verifyRuntimeInventorySync } from '../startup/runtime-inventory.mjs';
import path from 'node:path';
import packageJson from '../../package.json' with { type: 'json' };
import { portableBrokerPaths } from './portable-paths.mjs';
import {
  acquireOwnerElection,
  inspectOwnerElectionLease,
  bindOwnerElectionPaths,
  inspectOwnerElectionPaths,
} from './ownership-election.mjs';
import {
  createHeldPrivatePublication,
  quarantinePrivateFile,
  assertQuarantineReceipt,
  observeProtectedCredential,
} from './storage-protection.mjs';
import {
  ownerConnectionObligations,
  observeLoopbackOwner,
  isVerifiedOwnerConnection,
} from './owner-connection.mjs';
import { observeOriginalProcess, reconcileOriginalProcess } from '../protocol/process-identity.mjs';
import { isInstalledProcessSourceAssurance } from '../protocol/process-source-assurance.mjs';
import { assertLifecycleBoundary } from './owner-lifecycle-core.mjs';
import {
  acquirePortableOwnerCore,
  retainQuarantineReceiptCore,
  ownerTransactionObligationsCore,
  createJoinedBrokerClientCore,
  completeOwnerJoinCore,
  assessOwnerEvidenceCore,
  closeOwnerObservationCore,
  inspectOwnerRecordsCore,
} from './portable-ownership-core.mjs';
const loadedInstallation = realpathSync(fileURLToPath(new URL('../../', import.meta.url)));
const retainedTransactions = new Set();
const observations = new WeakMap();
const bindings = new WeakMap();
const obligationFields = new Set([
  'name',
  'root',
  'identity',
  'fileVersion',
  'previousFileVersion',
  'rootIdentity',
  'parentIdentity',
  'alternateName',
  'outcome',
  'reason',
  'resourceKey',
  'contenderId',
  'version',
  'originalLocator',
  'quarantineLocator',
  'status',
  'host',
  'port',
  'instanceId',
  'worktree',
  'ownerVersion',
  'localAddress',
  'localPort',
  'remoteAddress',
  'remotePort',
]);
function metadata(value) {
  const result = {};
  if (!value || typeof value !== 'object' || Array.isArray(value))
    return { outcome: 'obligation-unavailable' };
  for (const key of obligationFields) {
    const item = value[key];
    if (typeof item === 'string' && item.length <= 4096) result[key] = item;
    else if (typeof item === 'number' && Number.isSafeInteger(item)) result[key] = item;
  }
  return Object.keys(result).length ? result : { outcome: 'obligation-unavailable' };
}
export function boundedOwnershipError(reason = 'ownership-unproved', evidence = {}) {
  const all = [
    ...(Array.isArray(evidence.outstandingObligations) ? evidence.outstandingObligations : []),
    ...(Array.isArray(evidence.obligations) ? evidence.obligations : []),
  ];
  const outstandingObligations = all.slice(0, 64).map(metadata);
  if (all.length > 64)
    outstandingObligations.push({
      outcome: 'additional-obligations-retained',
      version: all.length - 64,
    });
  return new AprError('APR_BROKER_STALE', 'Portable ownership could not be proved.', {
    recovery:
      'Preserve exact protected generations and reconcile outstanding obligations before retrying.',
    details: {
      reason:
        typeof reason === 'string' && /^[a-z][a-z0-9-]{0,95}$/u.test(reason)
          ? reason
          : 'ownership-unproved',
      mutationOccurred: evidence.mutationOccurred === true,
      retrySafe: false,
      outstandingObligations,
    },
  });
}
export function isAuthenticatedOwnerObservation(value) {
  return observations.has(value);
}
export async function joinVerifiedBroker({ binding, signal, deadline } = {}) {
  const record = bindings.get(binding);
  if (!record || signal !== record.context.signal || deadline !== record.context.deadline)
    throw boundedOwnershipError('genuine-owner-binding-required');
  // Consume the private handoff synchronously before any asynchronous reread.
  bindings.delete(binding);
  const result = await completeOwnerJoinCore({
    context: record.context,
    reread: async (context) => {
      ownerBudget(context);
      await record.reread(context);
    },
    connect: record.connect,
    dispose: record.dispose,
  });
  return result.client;
}
export async function disposeAuthenticatedOwnerObservation({ observation } = {}) {
  const held = observations.get(observation);
  if (!held) throw boundedOwnershipError('genuine-owner-observation-required');
  observations.delete(observation);
  const record = held.binding && bindings.get(held.binding);
  if (!record) return Object.freeze({ disposed: true, outstandingObligations: Object.freeze([]) });
  await record.dispose();
  return Object.freeze({ disposed: true, outstandingObligations: Object.freeze([]) });
}

function ownerBudget(input) {
  if (
    !(input?.signal instanceof AbortSignal) ||
    input.signal.aborted ||
    !Number.isFinite(input.deadline) ||
    input.deadline <= performance.now() ||
    input.deadline - performance.now() > 30000
  )
    throw boundedOwnershipError('operation-budget-unproved');
  return Object.freeze({ signal: input.signal, deadline: input.deadline });
}
const unknownOwner = (reason, evidence = {}) =>
  Object.freeze({
    status: 'unknown',
    reason,
    outstandingObligations: boundedOwnershipError(reason, evidence).details.outstandingObligations,
  });
async function readOwnerState(view) {
  const read = async (guard, name) => {
    try {
      return await guard.readSnapshot(name);
    } catch (error) {
      if (error.code === 'ENOENT') return null;
      throw error;
    }
  };
  const owner = await read(view.privateGuard, 'owner.json');
  const credential = await read(view.privateGuard, 'credential');
  const endpoint = await read(view.runtimeGuard, 'endpoint.json');
  return { owner, credential, endpoint };
}
function sameOwnerState(a, b) {
  return ['owner', 'credential', 'endpoint'].every((key) => {
    if (!a[key] || !b[key]) return a[key] === b[key];
    return (
      ['name', 'root', 'identity', 'fileVersion', 'rootIdentity', 'parentIdentity'].every(
        (field) => a[key][field] === b[key][field]
      ) && a[key].bytes.equals(b[key].bytes)
    );
  });
}
export async function observeAuthenticatedOwner(input = {}) {
  let credential, connection, result;
  try {
    result = await (async () => {
      const context = ownerBudget(input);
      const view = await inspectOwnerElectionPaths({ paths: input.paths, ...context });
      const state = await readOwnerState(view);
      if (!state.owner || !state.credential || !state.endpoint)
        return unknownOwner('owner-state-incomplete');
      const canonical = await portableBrokerPaths({
        worktree: path.resolve(view.privateRoot, '../../..'),
      });
      if (canonical.privateRoot !== view.privateRoot || canonical.runtimeRoot !== view.runtimeRoot)
        throw boundedOwnershipError('owner-paths-unproved');
      const worktree = createHash('sha256').update(canonical.worktree).digest('hex');
      const { owner, endpoint, ownerVersion } = inspectOwnerRecordsCore({
        state,
        worktree,
        versions: {
          package_version: packageJson.version,
          broker_protocol_version: 1,
          node_major: Number(process.versions.node.split('.')[0]),
        },
      });
      const processObservation = await observeOriginalProcess({
        pid: owner.identity?.pid,
        ...context,
      });
      if (!isInstalledProcessSourceAssurance(processObservation.assurance))
        return unknownOwner('source-class-unavailable');
      const originalProcess = await reconcileOriginalProcess({
        original: owner.identity,
        observation: processObservation,
      });
      credential = await observeProtectedCredential({ guard: view.privateGuard, ...context });
      const expected = Object.freeze({
        instanceId: owner.instanceId,
        worktree: owner.worktree,
        ownerVersion,
      });
      const proof = await observeLoopbackOwner({
        endpoint: { host: endpoint.host, port: endpoint.port },
        privateBinding: credential,
        expected,
        ...context,
      });
      connection = proof.connection; // Capture before any conflicting-evidence branch.
      const decision = assessOwnerEvidenceCore({ process: originalProcess, endpoint: proof });
      if (decision.status === 'dead') {
        if (!sameOwnerState(state, await readOwnerState(view)))
          throw boundedOwnershipError('owner-generation-changed');
        const observed = Object.freeze({
          status: 'dead',
          scope: 'original-process-only',
          identity: owner.identity,
          outstandingObligations: Object.freeze([]),
        });
        observations.set(observed, {
          paths: input.paths,
          state,
          process: originalProcess,
          context,
        });
        return observed;
      }
      if (decision.status !== 'authenticated-live') return unknownOwner(decision.reason);
      if (proof.kind !== 'verified-live' || !isVerifiedOwnerConnection(proof.connection))
        return unknownOwner('owner-authentication-unproved');
      connection = proof.connection;
      if (!sameOwnerState(state, await readOwnerState(view)))
        throw boundedOwnershipError('owner-generation-changed');
      const binding = Object.freeze({});
      const heldConnection = connection;
      const client = createJoinedBrokerClientCore({
        connection,
        credential,
        context,
        handshake: { instance_id: owner.instanceId, versions: owner.versions },
      });
      const record = {
        context,
        async dispose() {
          bindings.delete(binding);
          observations.delete(observed);
          return client.close(context);
        },
        async reread(next) {
          await inspectOwnerElectionPaths({ paths: input.paths, ...next });
          if (!sameOwnerState(state, await readOwnerState(view)))
            throw boundedOwnershipError('owner-generation-changed');
          const current = await observeOriginalProcess({ pid: owner.identity.pid, ...next });
          if (
            (await reconcileOriginalProcess({ original: owner.identity, observation: current }))
              .status !== 'live'
          )
            throw boundedOwnershipError('original-process-unproved');
        },
        async connect(next) {
          if (
            next.signal !== context.signal ||
            next.deadline !== context.deadline ||
            !isVerifiedOwnerConnection(heldConnection)
          )
            throw boundedOwnershipError('proved-socket-lost');
          observations.delete(observed);
          return Object.freeze({
            ...client,
            verified: true,
            async close(options) {
              const result = await client.close(options);
              bindings.delete(binding);
              return result;
            },
          });
        },
      };
      bindings.set(binding, record);
      const observed = Object.freeze({
        status: 'authenticated-live',
        owner: Object.freeze({ binding }),
        outstandingObligations: Object.freeze([]),
      });
      observations.set(observed, { paths: input.paths, state, process: originalProcess, binding });
      credential = null;
      connection = null; // The privately bound client now owns their cleanup.
      return observed;
    })();
  } catch (error) {
    result = unknownOwner(
      error?.details?.reason || 'owner-observation-unproved',
      error?.details || {}
    );
  }
  try {
    await closeOwnerObservationCore({ connection, credential, context: input });
  } catch (cleanup) {
    return unknownOwner(cleanup.details.reason, {
      outstandingObligations: [
        ...(result?.outstandingObligations || []),
        ...(cleanup.details?.outstandingObligations || []),
      ],
    });
  }
  return result;
}
export async function acquirePortableOwner(input = {}) {
  let bound,
    lease,
    candidate,
    genuineOwner,
    joinedClient,
    failure,
    transferred = false,
    effectStarted = false;
  const record = { input, lease: null, candidate: null };
  try {
    assertLifecycleBoundary();
    const context = ownerBudget(input);
    if (
      !input ||
      Object.keys(input).sort().join(',') !== 'deadline,paths,protection,reconcile,signal,worktree'
    )
      throw boundedOwnershipError('owner-options-invalid');
    const canonical = await portableBrokerPaths({ worktree: input.worktree });
    if (
      !input.paths ||
      ['worktree', 'privateRoot', 'runtimeRoot', 'endpoint', 'credential'].some(
        (key) => input.paths[key] !== canonical[key]
      )
    )
      throw boundedOwnershipError('owner-paths-unproved');
    bound = await bindOwnerElectionPaths({
      receipt: input.protection?.private,
      effectReceipts: [input.protection?.runtime],
      resource: { kind: 'broker-owner' },
      ...context,
    });
    const view = await inspectOwnerElectionPaths({ paths: bound, ...context });
    if (view.privateRoot !== canonical.privateRoot || view.runtimeRoot !== canonical.runtimeRoot)
      throw boundedOwnershipError('owner-paths-unproved');
    let identity = await observeOriginalProcess(context);
    let source = identity.assurance;
    if (identity.status !== 'live' || !isInstalledProcessSourceAssurance(identity.assurance))
      throw boundedOwnershipError('source-class-unavailable');
    record.bound = bound;
    const protocol = await acquirePortableOwnerCore({
      budget: context,
      ports: {
        async elect(current) {
          const outcome = await acquireOwnerElection({ paths: bound, ...current });
          if (outcome.kind === 'won') {
            lease = outcome.lease;
            record.lease = lease;
            const electedFacts = await inspectOwnerElectionLease({ lease, ...current });
            identity = electedFacts.identity;
            source = electedFacts.source;
          }
          return outcome;
        },
        async join(owner, current) {
          joinedClient = await joinVerifiedBroker({ binding: owner.owner?.binding, ...current });
          return Object.freeze({ ...joinedClient, verified: false });
        },
        async readState() {
          const state = await readOwnerState(view);
          if (state.owner) {
            try {
              state.original = parseRawJson(
                new TextDecoder('utf-8', { fatal: true }).decode(state.owner.bytes)
              ).identity;
            } catch {
              throw boundedOwnershipError('owner-state-format-unproved');
            }
          }
          record.state = state;
          return state;
        },
        async observeProcess(state, current) {
          const observation = await observeOriginalProcess({
            pid: state.original?.pid,
            ...current,
          });
          return reconcileOriginalProcess({ original: state.original, observation });
        },
        async observeEndpoint(state, current) {
          const observation = await observeAuthenticatedOwner({ paths: bound, ...current });
          if (observation.status === 'dead' && isAuthenticatedOwnerObservation(observation))
            return { kind: 'absent', verified: true };
          if (
            observation.status === 'authenticated-live' &&
            isAuthenticatedOwnerObservation(observation)
          ) {
            // This route conflicts with the separate original-death proof. Retire
            // the real temporary joining resources without touching owner names.
            const client = await joinVerifiedBroker({
              binding: observation.owner.binding,
              ...current,
            });
            await client.close(current);
            return { kind: 'verified-live', verified: true };
          }
          return {
            kind: 'unknown',
            reason: observation.reason,
            outstandingObligations: observation.outstandingObligations,
          };
        },
        reconcile: ({ context: current }) =>
          observePortableReconciliation({ paths: bound, ...current }),
        async quarantine(state, current) {
          const receipts = [];
          for (const [key, guard] of [
            ['owner', view.privateGuard],
            ['credential', view.privateGuard],
            ['endpoint', view.runtimeGuard],
          ]) {
            const snapshot = state[key];
            if (!snapshot) continue;
            effectStarted = true;
            const receipt = await quarantinePrivateFile({
              guard,
              name: snapshot.name,
              expected: snapshot,
              lease,
              ...current,
            });
            const root = key === 'endpoint' ? view.runtimeRoot : view.privateRoot;
            const mapped = retainQuarantineReceiptCore({
              records: receipts,
              snapshot,
              receipt,
              root,
            });
            record.quarantined = receipts; // Capture completed effect before any fallible assertion.
            await assertQuarantineReceipt({ guard, receipt, lease, ...current });
            mapped.outcome = 'quarantined-generation-retained';
          }
          return { status: 'quarantined', verified: true, receipts };
        },
        async create(current) {
          effectStarted = true;
          const runtime = verifyRuntimeInventorySync({ packageRoot: loadedInstallation });
          const versions = Object.freeze({
            package_version: runtime.packageVersion,
            broker_protocol_version: 1,
            node_major: Number(process.versions.node.split('.')[0]),
          });
          const facts = {
            schema: 'ai-peer-review.portable-owner/v1',
            instanceId: randomBytes(32).toString('hex'),
            worktree: createHash('sha256').update(canonical.worktree).digest('hex'),
            identity: Object.fromEntries(
              ['host', 'pid', 'creation', 'creationSource']
                .filter((key) => identity[key] !== undefined)
                .map((key) => [key, identity[key]])
            ),
            versions,
          };
          const bytes = encodeRequestCanonical(facts);
          candidate = {
            facts,
            runtime,
            ownerVersion: createHash('sha256').update(bytes).digest('hex'),
          };
          record.candidate = candidate;
          candidate.publication = await createHeldPrivatePublication({
            guard: view.privateGuard,
            name: 'owner.json',
            bytes,
            lease,
            ...current,
          });
          const secret = randomBytes(32);
          try {
            candidate.credential = await createHeldPrivatePublication({
              guard: view.privateGuard,
              name: 'credential',
              bytes: secret,
              lease,
              ...current,
            });
          } finally {
            secret.fill(0);
          }
          return candidate;
        },
        async ready(value, current) {
          const expected = {
            instanceId: value.facts.instanceId,
            worktree: value.facts.worktree,
            ownerVersion: value.ownerVersion,
          };
          value.readinessServer = await createPortableOwnerReadiness({
            credential: value.credential,
            expected,
            ...current,
          });
          const proof = await observeLoopbackOwner({
            endpoint: value.readinessServer.endpoint,
            privateBinding: value.credential,
            expected,
            ...current,
          });
          value.connection = proof.connection;
          if (proof.kind !== 'verified-live' || !isVerifiedOwnerConnection(proof.connection))
            throw boundedOwnershipError('owner-readiness-unproved', proof);
          return value.readinessServer;
        },
        async publishEndpoint(value, ready, current) {
          const subject = {
            instanceId: value.facts.instanceId,
            worktree: value.facts.worktree,
            ownerVersion: value.ownerVersion,
            host: ready.endpoint.host,
            port: ready.endpoint.port,
            versions: value.facts.versions,
          };
          const endpoint = {
            schema: 'ai-peer-review.portable-endpoint/v1',
            ...subject,
            digest: createHash('sha256').update(encodeRequestCanonical(subject)).digest('hex'),
            heartbeat: Date.now(),
          };
          value.endpointPublication = await createHeldPrivatePublication({
            guard: view.runtimeGuard,
            name: 'endpoint.json',
            bytes: encodeRequestCanonical(endpoint),
            lease,
            ...current,
          });
        },
        async lifecycle(value, current) {
          genuineOwner = await createPortableOwnerLifecycle({
            publication: value.publication,
            credential: value.credential,
            endpointPublication: value.endpointPublication,
            lease,
            identity,
            source,
            connection: value.connection,
            runtime: value.runtime,
            readinessServer: value.readinessServer,
            paths: bound,
            ...current,
          });
          return Object.freeze({
            verified: false,
            publish: () => genuineOwner.publish(),
            verify: (options) => genuineOwner.verify(options),
            release: (options) => genuineOwner.release(options),
          });
        },
        outstandingObligations: () =>
          ownerTransactionObligationsCore({
            files: [candidate?.publication, candidate?.credential, candidate?.endpointPublication]
              .filter(Boolean)
              .map((value) => value.retainedGeneration()),
            quarantines: record.quarantined || [],
            transports: [
              ...(candidate?.readinessServer
                ? portableOwnerReadinessObligations(candidate.readinessServer)
                : []),
              ...(candidate?.connection ? ownerConnectionObligations(candidate.connection) : []),
            ],
          }),
      },
    });
    if (joinedClient) {
      transferred = true;
      const retainedBound = bound;
      return Object.freeze({
        ...joinedClient,
        async close(options) {
          let error;
          try {
            await joinedClient.close(options);
          } catch (caught) {
            error = caught;
          }
          try {
            await retainedBound.close();
          } catch (cleanup) {
            throw boundedOwnershipError(error?.details?.reason || 'binding-close-unproved', {
              outstandingObligations: [
                ...(error?.details?.outstandingObligations || []),
                ...(cleanup?.details?.obligations || []),
              ],
            });
          }
          if (error) throw error;
          return Object.freeze({ closed: true, outstandingObligations: Object.freeze([]) });
        },
      });
    }
    // Public production acquisition completes the one bounded startup itself.
    // The injected protocol object is never returned as genuine ownership.
    await protocol.publish();
    if (!isPortableBrokerOwner(genuineOwner))
      throw boundedOwnershipError('genuine-owner-completion-unproved');
    transferred = true;
    return genuineOwner;
  } catch (error) {
    failure = boundedOwnershipError(
      error?.details?.reason || 'owner-acquisition-unproved',
      error?.details || {}
    );
    if (effectStarted) {
      retainedTransactions.add(record);
      transferred = true;
    } else if (lease) {
      try {
        const withdrawal = await lease.release();
        if (withdrawal.status !== 'withdrawn' || withdrawal.obligations?.length)
          throw boundedOwnershipError('slot-withdrawal-unproved', withdrawal);
      } catch (cleanup) {
        retainedTransactions.add(record);
        transferred = true;
        failure = boundedOwnershipError(failure.details.reason, {
          mutationOccurred: true,
          outstandingObligations: [
            ...failure.details.outstandingObligations,
            ...(cleanup?.details?.outstandingObligations || cleanup?.details?.obligations || []),
            lease.retainedGeneration(),
          ],
        });
      }
    }
    throw failure;
  } finally {
    if (bound && !transferred) {
      try {
        await bound.close();
      } catch (cleanup) {
        throw boundedOwnershipError(failure?.details?.reason || 'binding-close-unproved', {
          mutationOccurred: failure?.details?.mutationOccurred === true,
          outstandingObligations: [
            ...(failure?.details?.outstandingObligations || []),
            ...(cleanup?.details?.obligations || []),
          ],
        });
      }
    }
  }
}
