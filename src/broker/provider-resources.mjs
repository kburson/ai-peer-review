// @story #188
import { AprError } from '../errors.mjs';
import path from 'node:path';
import {
  isPortableOperations,
  portableOperationsContext,
  initializePortableOperations,
} from './portable-platform.mjs';
import { acquireProviderResourceCore } from './provider-resource-core.mjs';
import { createProviderResourcePorts } from './provider-resource-ports.mjs';
import { withProviderElectionOperation } from './ownership-election.mjs';
import {
  currentOperationAuthorityContext,
  currentProviderOperationAdmission,
} from '../startup/authority-fence.mjs';
export { providerResourceDigest, acquireProviderResourceCore } from './provider-resource-core.mjs';
const leases = new WeakMap();
const retained = new Set();
export function isProviderResourceLease(value) {
  return leases.has(value);
}
export async function acquireProviderResource(input = {}, operations) {
  if (!isPortableOperations(operations))
    throw new AprError(
      'APR_PROVIDER_RESOURCE_INTEGRITY',
      'Provider resources require genuine portable operations.',
      {
        recovery: 'Use the current stock portable factory and retain exact resource evidence.',
      }
    );
  input = Object.freeze({
    ...input,
    identity: Object.freeze({ ...input.identity }),
    descriptor: Object.freeze({ ...input.descriptor }),
  });
  const context = await currentOperationAuthorityContext();
  const original = await portableOperationsContext(operations);
  if (context.signal !== original.signal || context.deadline !== original.deadline)
    throw new AprError(
      'APR_PROVIDER_RESOURCE_INTEGRITY',
      'Provider resource admission context differs from the stock factory.',
      { recovery: 'Use the actual current operation context.' }
    );
  let adapter, core;
  try {
    if (input.descriptor?.concurrent === true)
      core = await acquireProviderResourceCore(input, operations);
    else {
      adapter = await createProviderResourcePorts(input, operations);
      core = await acquireProviderResourceCore(input, adapter.ports);
    }
  } catch (error) {
    if (adapter && error.details?.outstandingObligations?.length) retained.add(adapter);
    else if (adapter) {
      try {
        await adapter.close();
      } catch (cleanup) {
        retained.add(adapter);
        error.cause = cleanup;
      }
    }
    throw error;
  }
  let busy = false,
    released = false;
  const run = async (name, args) => {
    if (busy || released)
      throw new AprError(
        'APR_PROVIDER_RESOURCE_STALE',
        'Provider resource operation is busy or released.',
        { recovery: 'Reconcile the retained exact lease.' }
      );
    busy = true;
    try {
      const operation = async () => {
        const current = await currentOperationAuthorityContext();
        const fresh = await initializePortableOperations(current);
        if ((await fresh.userId()) !== input.identity.userId)
          throw new AprError('APR_PROVIDER_RESOURCE_INTEGRITY', 'Provider principal changed.', {
            recovery: 'Preserve the original lease.',
          });
        const result = await core[name](...args);
        if (name === 'release' || name === 'releaseUnused') released = true;
        return result;
      };
      return adapter
        ? await withProviderElectionOperation(
            adapter.election,
            operation,
            await currentProviderOperationAdmission()
          )
        : await operation();
    } catch (error) {
      if (adapter) retained.add(adapter);
      throw error;
    } finally {
      busy = false;
    }
  };
  const lease = Object.freeze({
    verified: true,
    concurrent: core.concurrent,
    resourceDigest: core.resourceDigest,
    get record() {
      return core.record;
    },
    get outstandingObligations() {
      return core.outstandingObligations ?? [];
    },
    assertDeliveryFresh: () => {
      if (busy || released)
        throw new AprError(
          'APR_PROVIDER_RESOURCE_STALE',
          'Provider delivery freshness is unavailable.',
          { recovery: 'Keep the lease and obtain a fresh provider observation.' }
        );
      return core.assertDeliveryFresh();
    },
    beforeDelivery: (...args) => run('beforeDelivery', args),
    verify: () => run('verify', []),
    releaseUnused: (...args) => run('releaseUnused', args),
    release: (...args) => run('release', args),
  });
  leases.set(lease, {
    core,
    adapter,
    input,
    original,
    get released() {
      return released;
    },
  });
  return lease;
}

// Read-only restoration facts require the actual production lease and original
// startup context. A protocol lease or copied projection never qualifies.
export async function inspectProviderResourceLease(options = {}) {
  const record = leases.get(options.lease);
  if (
    Object.keys(options).sort().join(',') !== 'deadline,lease,signal' ||
    !record ||
    options.signal !== record.original.signal ||
    options.deadline !== record.original.deadline
  )
    throw new AprError(
      'APR_PROVIDER_RESOURCE_INTEGRITY',
      'Genuine restoration lease is required.',
      {
        recovery: 'Retain the actual acquired provider lease and original startup context.',
      }
    );
  const context = await currentOperationAuthorityContext();
  if (context.signal !== options.signal || context.deadline !== options.deadline)
    throw new AprError('APR_PROVIDER_RESOURCE_INTEGRITY', 'Restoration context changed.', {
      recovery: 'Use the original admitted startup operation.',
    });
  const operations = await initializePortableOperations(context);
  if ((await operations.userId()) !== record.input.identity.userId)
    throw new AprError('APR_PROVIDER_RESOURCE_INTEGRITY', 'Restoration principal changed.', {
      recovery: 'Preserve the exact original resource.',
    });
  if (!record.released) await options.lease.verify();
  return Object.freeze({
    verified: false,
    released: record.released,
    concurrent: record.core.concurrent,
    resourceDigest: record.core.resourceDigest,
    record: record.core.record,
    root: record.core.concurrent
      ? null
      : path.join(
          await operations.accountHome(),
          '.cache',
          'ai-peer-review',
          'provider-resources',
          record.core.resourceDigest
        ),
  });
}
