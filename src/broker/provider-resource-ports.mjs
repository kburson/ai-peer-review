// @story #188
// Fixed production C1/C3 adapter. The explicit protocol core receives only
// these guarded effects; caller-supplied native directory/lock handles never enter.
import path from 'node:path';
import { lstat } from 'node:fs/promises';
import { AprError } from '../errors.mjs';
import { portableOperationsContext } from './portable-platform.mjs';
import { provisionProtectedRoot } from './storage-protection.mjs';
import { bindOwnerElectionPaths, acquireOwnerElection } from './ownership-election.mjs';

function stale(message, details = {}) {
  return new AprError('APR_PROVIDER_RESOURCE_STALE', message, {
    recovery:
      'Preserve the exact provider election and record generation; reconcile the provider surface before retrying.',
    details,
  });
}
export async function createProviderResourcePorts(input, operations) {
  const original = await portableOperationsContext(operations);
  const home = await operations.accountHome();
  const cacheRoot = path.join(home, '.cache');
  let binding, election, directory, recordName;
  const snapshots = new Map();
  const opened = new Set();
  async function protect(root) {
    let receipt = await operations.observeProtection({ root });
    if (!receipt.verified) {
      try {
        await lstat(root);
        throw stale('Existing provider root protection is unavailable.');
      } catch (error) {
        if (error.code !== 'ENOENT') throw error;
      }
      // First-use provisioning only. Existing private paths are never repaired.
      receipt = await provisionProtectedRoot({ root, ...original });
    }
    return receipt;
  }
  async function assertLegacyAbsent(guard) {
    for (const legacy of ['resource.json', 'resource.lock']) {
      try {
        await guard.readSnapshot(legacy);
        throw stale('Retained native provider evidence requires explicit reconciliation.', {
          legacyName: legacy,
        });
      } catch (error) {
        if (error.code !== 'ENOENT') throw error;
      }
    }
  }
  function name(value) {
    if (value !== 'resource.json' || !recordName)
      throw stale('Provider record is outside its election.');
    return recordName;
  }
  async function expected(value, bytes) {
    const previous = snapshots.get(value);
    if (!previous || !previous.bytes.equals(Buffer.from(bytes)))
      throw stale('Exact provider snapshot is unavailable.');
    return previous;
  }
  const ports = Object.freeze({
    kind: operations.kind,
    cacheRoot,
    userId: () => operations.userId(),
    async openPrivateDirectory(root) {
      const receipt = await protect(root);
      const guard = await operations.openProtectedRoot({ receipt });
      opened.add(guard);
      const handle = Object.freeze({
        async verify() {
          await guard.verify();
          return true;
        },
        async read(value) {
          await assertLegacyAbsent(guard);
          try {
            const snapshot = await guard.readSnapshot(name(value));
            // Reading must not silently replace the retained physical generation.
            const prior = snapshots.get(value);
            if (
              prior &&
              (snapshot.identity !== prior.identity ||
                snapshot.fileVersion !== prior.fileVersion ||
                !snapshot.bytes.equals(prior.bytes))
            )
              throw stale('Provider record physical generation changed.');
            snapshots.set(value, snapshot);
            return Buffer.from(snapshot.bytes);
          } catch (error) {
            if (error.code === 'ENOENT') return null;
            throw error;
          }
        },
        async create(value, bytes) {
          await assertLegacyAbsent(guard);
          await guard.writeExclusive(name(value), bytes, election);
          snapshots.set(value, await guard.readSnapshot(name(value)));
          return true;
        },
        async replace(value, bytes, next) {
          await assertLegacyAbsent(guard);
          await guard.replace(name(value), await expected(value, bytes), next, election);
          snapshots.set(value, await guard.readSnapshot(name(value)));
          return true;
        },
        async remove(value, bytes) {
          await assertLegacyAbsent(guard);
          await guard.remove(name(value), await expected(value, bytes), election);
          snapshots.delete(value);
          return true;
        },
        async close() {
          await guard.close();
          opened.delete(guard);
        },
      });
      directory = { root, receipt, guard };
      return handle;
    },
    async acquireExclusive(lockPath) {
      if (!directory || lockPath !== path.join(directory.root, 'resource.lock'))
        throw stale('Provider election root changed.');
      const digest = path.basename(directory.root);
      if (!/^[a-f0-9]{64}$/u.test(digest)) throw stale('Provider resource digest is invalid.');
      await assertLegacyAbsent(directory.guard);
      binding = await bindOwnerElectionPaths({
        receipt: directory.receipt,
        resource: { kind: 'provider-resource', id: 'sha256:' + digest },
        ...original,
      });
      recordName = 'apr-resource-' + binding.resourceKey + '.json';
      const result = await acquireOwnerElection({ paths: binding, ...original });
      if (result.kind !== 'won' || !result.verified)
        throw stale('Provider election refused: ' + result.reason, {
          outstandingObligations: result.obligations,
        });
      election = result.lease;
      return Object.freeze({
        async verify() {
          await election.assert();
          return true;
        },
        async release() {
          const outcome = await election.release();
          if (outcome.status !== 'withdrawn' || outcome.obligations.length)
            throw stale('Provider election withdrawal is unresolved.', {
              outstandingObligations: outcome.obligations,
            });
          await binding.close();
          return true;
        },
        async abandon() {
          const outcome = await election.release();
          if (outcome.status !== 'withdrawn' || outcome.obligations.length)
            throw stale('Provider election abandonment is unresolved.', {
              outstandingObligations: outcome.obligations,
            });
          await binding.close();
        },
      });
    },
    async reconcileProviderResource(value) {
      if (typeof input.reconcileProviderResource !== 'function')
        throw stale('Actual provider reconciliation is unavailable.');
      return await input.reconcileProviderResource(value);
    },
  });
  return Object.freeze({
    ports,
    get election() {
      return election;
    },
    async close() {
      for (const guard of opened) {
        await guard.close();
        opened.delete(guard);
      }
      if (binding && !election) await binding.close();
    },
  });
}
