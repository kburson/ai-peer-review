import { randomBytes } from 'node:crypto';
import path from 'node:path';
import { brokerError, validateHandshake } from './ipc.mjs';

function provisionDirectories(values, platform, { keepLast = false } = {}) {
  const directories = [];
  try {
    for (const value of values) {
      const directory = platform.openPrivateDirectory(value);
      directories.push(directory);
      if (!directory.verify())
        throw brokerError('APR_BROKER_STALE', 'Broker directory ownership is indeterminate.');
    }
    const retained = keepLast ? directories.pop() : null;
    for (const directory of directories) directory.close();
    return retained;
  } catch (error) {
    for (const directory of directories.reverse()) directory.close();
    throw error;
  }
}

export function acquireBrokerOwnership({ identity, paths, versions, reconcile }, platform) {
  const authorityDirectories = paths.authorityDirectories ?? [paths.directory];
  const directory = provisionDirectories(authorityDirectories, platform, { keepLast: true });
  let lock,
    endpoint,
    metadata,
    fenced = false,
    released = false;
  const handshake = Object.freeze({
    schema: 'ai-peer-review.broker-handshake/v1',
    tuple: identity.tuple,
    versions: { ...versions },
    instance_id: randomBytes(32).toString('hex'),
    nonce: randomBytes(32).toString('hex'),
  });
  const metadataName = path.basename(paths.metadata);
  const owner = {
    instanceId: handshake.instance_id,
    nonce: handshake.nonce,
    handshake,
    verify() {
      if (fenced || released) return false;
      try {
        if (
          !directory.verify() ||
          !lock.verify() ||
          !endpoint.verify() ||
          !Buffer.from(directory.read(metadataName) ?? '').equals(metadata)
        )
          fenced = true;
      } catch {
        fenced = true;
      }
      return !fenced;
    },
    release() {
      const valid = owner.verify();
      released = true;
      endpoint.close();
      if (valid) directory.remove?.(metadataName, metadata);
      const lockReleased = lock.release();
      directory.close();
      return valid && lockReleased;
    },
    get endpoint() {
      return endpoint;
    },
  };
  try {
    provisionDirectories(paths.endpointDirectories ?? [], platform);
    validateHandshake(handshake, handshake, platform.userId());
    lock = platform.acquireExclusive(paths.lock, {
      instanceId: owner.instanceId,
      nonce: owner.nonce,
    });
    if (!directory.verify() || !lock.verify())
      throw brokerError('APR_BROKER_STALE', 'Broker resource ownership is indeterminate.');
    // A missing cache is not proof of absent review/provider ownership. The caller
    // must reconcile both durable registries and provider state under this lock.
    if (typeof reconcile !== 'function' || reconcile({ identity, paths, lock }) !== true) {
      throw brokerError('APR_BROKER_STALE', 'Registry and provider reconciliation is required.');
    }
    const prior = directory.read(metadataName);
    if (prior !== null) {
      let discovery;
      try {
        discovery = JSON.parse(prior.toString('utf8'));
      } catch {
        throw brokerError('APR_BROKER_STALE', 'Prior broker metadata is malformed.');
      }
      // The OS lock excludes a live broker. Discovery must still identify this
      // exact project/runtime before its evidence can be superseded.
      validateHandshake(
        discovery,
        { ...discovery, tuple: identity.tuple, versions },
        platform.userId()
      );
    }
    if (typeof platform.reclaimStaleEndpoint === 'function') {
      platform.reclaimStaleEndpoint(paths.endpoint, lock);
    } else if (prior !== null) {
      throw brokerError('APR_BROKER_STALE', 'Safe endpoint reconciliation is unavailable.');
    }
    if (prior !== null && directory.remove(metadataName, prior) !== true)
      throw brokerError('APR_BROKER_STALE', 'Prior broker metadata changed during reconciliation.');
    endpoint = platform.listenPrivate(paths.endpoint);
    metadata = Buffer.from(JSON.stringify(handshake));
    directory.create(metadataName, metadata);
    if (!owner.verify())
      throw brokerError('APR_BROKER_STALE', 'Broker evidence changed during acquisition.');
    return Object.freeze(owner);
  } catch (error) {
    endpoint?.close();
    lock?.abandon();
    directory.close();
    throw error;
  }
}
