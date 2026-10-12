// @story #209
// Ordinary physical integrity observations never mint C1 protection or effect authority.
import { open, opendir, lstat, realpath } from 'node:fs/promises';
import { constants } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { AprError } from '../errors.mjs';
import { inspectOwnerElectionPaths } from './ownership-election.mjs';
import { initializePortableOperations } from './portable-platform.mjs';
import { canonicalPortableProjectIdentity } from './identity.mjs';
import { encodeRequestCanonical } from '../api/canonical-json.mjs';
import { readStartupJournal, startupEvidence } from './startup-evidence-reader.mjs';
import { inspectReviewAuthority } from '../protocol/authority-reader.mjs';

const observations = new WeakMap();
const retainedDescriptors = new Set();
const MAX_ENTRIES = 4096;
const MAX_DEPTH = 16;
const MAX_BYTES = 1048576;
const identity = (s) => `${s.dev}:${s.ino}`;
const version = (s) =>
  [s.size, s.mode, s.nlink, s.uid, s.gid, s.mtimeNs, s.ctimeNs].map(String).join(':');
function refuse(reason) {
  throw new AprError('APR_BROKER_STALE', 'Ordinary reconciliation inventory is unproved.', {
    details: { reason, retrySafe: false },
    recovery: 'Preserve the original namespace and retry only after exact reconciliation.',
  });
}
function budget(context) {
  if (
    !(context.signal instanceof AbortSignal) ||
    !Number.isFinite(context.deadline) ||
    context.deadline - performance.now() > 30000
  )
    refuse('reconciliation-context-unproved');
  if (context.signal.aborted) refuse('reconciliation-aborted');
  if (performance.now() >= context.deadline) refuse('reconciliation-deadline');
}
async function directoryFacts(directory, context) {
  budget(context);
  const s = await lstat(directory, { bigint: true });
  if (!s.isDirectory() || s.isSymbolicLink() || (await realpath(directory)) !== directory)
    refuse('reconciliation-namespace-unproved');
  budget(context);
  return { identity: identity(s), version: version(s) };
}
async function physicalChain(root, context) {
  let current = path.parse(root).root;
  const result = [[current, await directoryFacts(current, context)]];
  for (const part of path.relative(current, root).split(path.sep).filter(Boolean)) {
    current = path.join(current, part);
    result.push([current, await directoryFacts(current, context)]);
  }
  return result;
}
async function closeDirectories(records) {
  const pending = records.filter((record) => !record.closed);
  const results = await Promise.allSettled(pending.map(({ handle }) => handle.close()));
  for (let i = 0; i < results.length; i++) {
    if (results[i].status === 'fulfilled') {
      pending[i].closed = true;
      retainedDescriptors.delete(pending[i]);
    } else retainedDescriptors.add(pending[i]);
  }
  if (results.some((result) => result.status === 'rejected')) {
    throw pendingDescriptorError(pending.filter((record) => !record.closed));
  }
}
function pendingDescriptorError(records) {
  return new AprError('APR_BROKER_STALE', 'Ordinary inventory descriptor cleanup is unproved.', {
    details: {
      reason: 'reconciliation-close-unproved',
      retrySafe: false,
      outstandingObligations: descriptorObligations(records),
    },
    recovery: 'Retain and close the exact original descriptors before retrying.',
  });
}
function descriptorObligations(records) {
  return records.map((record) =>
    Object.freeze({
      name: record.kind === 'file' ? 'ordinary-file-descriptor' : 'ordinary-root-descriptor',
      root: record.directory,
      identity: record.identity,
      outcome: 'descriptor-close-pending',
    })
  );
}
export async function retryOrdinaryReconciliationCleanup() {
  await closeDirectories([...retainedDescriptors]);
}
async function capture(root, context, mode = 'tree') {
  budget(context);
  if (retainedDescriptors.size) throw pendingDescriptorError([...retainedDescriptors]);
  const chain = await physicalChain(root, context);
  const directories = [];
  const entries = [];
  const files = new Map();
  async function visit(directory, relative, depth) {
    budget(context);
    if (depth > MAX_DEPTH) refuse('reconciliation-inventory-overflow');
    const before = await directoryFacts(directory, context);
    const handle = await opendir(directory);
    directories.push({ handle, directory, kind: 'directory', ...before });
    const names = [];
    for (;;) {
      budget(context);
      const entry = await handle.read();
      if (!entry) break;
      if (names.length + entries.length >= MAX_ENTRIES) refuse('reconciliation-inventory-overflow');
      if (!entry.name || entry.name.length > 255 || /[\0\r\n/\\]/u.test(entry.name))
        refuse('reconciliation-namespace-unproved');
      names.push(entry.name);
    }
    names.sort();
    for (const name of names) {
      budget(context);
      if (entries.length >= MAX_ENTRIES) refuse('reconciliation-inventory-overflow');
      const location = path.join(directory, name);
      const relativePath = relative ? relative + '/' + name : name;
      const s = await lstat(location, { bigint: true });
      if (s.isSymbolicLink() || (!s.isFile() && !s.isDirectory()) || (s.isFile() && s.nlink !== 1n))
        refuse('reconciliation-namespace-unproved');
      const row = Object.freeze({
        relativePath,
        type: s.isDirectory() ? 'directory' : 'file',
        identity: identity(s),
        fileVersion: version(s),
      });
      entries.push(row);
      if (s.isDirectory()) {
        if (mode === 'tree') await visit(location, relativePath, depth + 1);
      } else if (mode !== 'membership') {
        if (s.size > BigInt(MAX_BYTES)) refuse('reconciliation-inventory-overflow');
        const file = await open(location, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0));
        const descriptor = {
          handle: file,
          directory: location,
          identity: row.identity,
          kind: 'file',
        };
        try {
          const opened = await file.stat({ bigint: true });
          if (
            !opened.isFile() ||
            opened.nlink !== 1n ||
            identity(opened) !== row.identity ||
            version(opened) !== row.fileVersion
          )
            refuse('reconciliation-generation-changed');
          const chunks = [];
          let count = 0;
          for (;;) {
            budget(context);
            const chunk = Buffer.alloc(Math.min(65536, MAX_BYTES + 1 - count));
            const { bytesRead } = await file.read(chunk, 0, chunk.length, count);
            if (!bytesRead) break;
            chunks.push(chunk.subarray(0, bytesRead));
            count += bytesRead;
            if (count > MAX_BYTES) refuse('reconciliation-inventory-overflow');
          }
          const final = await file.stat({ bigint: true });
          const located = await lstat(location, { bigint: true });
          if (
            identity(final) !== row.identity ||
            version(final) !== row.fileVersion ||
            identity(located) !== row.identity ||
            version(located) !== row.fileVersion
          )
            refuse('reconciliation-generation-changed');
          const bytes = Buffer.concat(chunks);
          files.set(relativePath, {
            bytes,
            digest: createHash('sha256').update(bytes).digest('hex'),
          });
        } finally {
          await closeDirectories([descriptor]);
        }
      }
    }
    const after = await directoryFacts(directory, context);
    if (before.identity !== after.identity || before.version !== after.version)
      refuse('reconciliation-generation-changed');
  }
  try {
    await visit(root, '', 0);
    for (const [directory, before] of chain) {
      const after = await directoryFacts(directory, context);
      if (before.identity !== after.identity) refuse('reconciliation-generation-changed');
    }
    budget(context);
    entries.sort((a, b) =>
      a.relativePath < b.relativePath ? -1 : a.relativePath > b.relativePath ? 1 : 0
    );
    return { entries: Object.freeze(entries), files, directories, chain };
  } catch (error) {
    try {
      await closeDirectories(directories);
    } catch (close) {
      close.cause = error;
      throw close;
    }
    throw error;
  }
}
export async function observeOrdinaryReconciliationTree(input = {}) {
  if (
    Object.keys(input).sort().join(',') !== 'deadline,root,signal' ||
    typeof input.root !== 'string' ||
    !path.isAbsolute(input.root) ||
    path.resolve(input.root) !== input.root
  )
    refuse('reconciliation-context-unproved');
  const context = Object.freeze({ signal: input.signal, deadline: input.deadline });
  const root = input.root;
  return observeOrdinary(root, context);
}
async function observeOrdinary(root, context, mode = 'tree') {
  const recorded = await capture(root, context, mode);
  let closed = false,
    closing = false;
  const observed = Object.freeze({
    verified: false,
    entries: recorded.entries,
    get outstandingObligations() {
      return closing
        ? descriptorObligations(recorded.directories.filter((record) => !record.closed))
        : [];
    },
    async close() {
      if (closed) return;
      closing = true;
      await closeDirectories(recorded.directories);
      closed = true;
    },
  });
  observations.set(observed, { root, context, recorded, mode, isClosed: () => closed || closing });
  return observed;
}
export async function assertOrdinaryReconciliationTreeUnchanged(observed) {
  const record = observations.get(observed);
  if (!record || record.isClosed()) refuse('reconciliation-observation-unproved');
  const current = await capture(record.root, record.context, record.mode);
  try {
    const chain = (value) => value.chain.map(([directory, facts]) => [directory, facts.identity]);
    const directories = (value) =>
      value.directories.map(({ directory, identity, version }) => ({
        directory,
        identity,
        version,
      }));
    if (
      JSON.stringify(chain(current)) !== JSON.stringify(chain(record.recorded)) ||
      JSON.stringify(directories(current)) !== JSON.stringify(directories(record.recorded))
    )
      refuse('reconciliation-generation-changed');
    if (JSON.stringify(current.entries) !== JSON.stringify(record.recorded.entries))
      refuse('reconciliation-generation-changed');
    for (const [name, original] of record.recorded.files)
      if (current.files.get(name)?.digest !== original.digest)
        refuse('reconciliation-generation-changed');
  } finally {
    await closeDirectories(current.directories);
  }
}

const inventories = new WeakMap();
const pendingInventories = new Set();
const REVIEW_ID = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/u;
const KEY = /^[a-f0-9]{64}$/u;
const RESERVED = new Set(['private', 'runtime', 'runtimes', 'broker', 'reviews']);

// Explicit unverified namespace policy. This cannot authenticate paths or authorize effects.
export function describeReconciliationNamespacesCore({
  projectEntries,
  brokerEntries,
  reviewEntries,
} = {}) {
  if (![projectEntries, brokerEntries, reviewEntries].every(Array.isArray))
    refuse('reconciliation-namespace-unproved');
  const reviewPaths = [],
    brokerPaths = [];
  const unique = (entries) => {
    if (entries.length > MAX_ENTRIES) refuse('reconciliation-inventory-overflow');
    const names = new Set();
    for (const entry of entries) {
      if (!entry || typeof entry.name !== 'string' || names.has(entry.name))
        refuse('reconciliation-namespace-unproved');
      names.add(entry.name);
    }
  };
  for (const entries of [projectEntries, brokerEntries, reviewEntries]) unique(entries);
  for (const { name, type } of projectEntries) {
    if (type !== 'directory' || !REVIEW_ID.test(name)) refuse('reconciliation-namespace-unproved');
    if (!RESERVED.has(name)) reviewPaths.push(name);
  }
  for (const { name, type } of brokerEntries) {
    if (['registrations', 'recovery'].includes(name) && type === 'directory')
      brokerPaths.push('broker/' + name);
    else if (!(type === 'file' && /^bootstrap-[a-f0-9-]+\.json$/u.test(name)))
      refuse('reconciliation-namespace-unproved');
  }
  for (const { name, type } of reviewEntries) {
    if (type !== 'directory' || !REVIEW_ID.test(name)) refuse('reconciliation-namespace-unproved');
    reviewPaths.push('reviews/' + name);
  }
  return Object.freeze({
    verified: false,
    reviewPaths: Object.freeze(reviewPaths.sort()),
    brokerPaths: Object.freeze(brokerPaths.sort()),
  });
}

function shallowEntries(observation) {
  return observation.entries.map(({ relativePath, type }) => ({ name: relativePath, type }));
}
async function exists(location, context) {
  budget(context);
  try {
    return await lstat(location, { bigint: true });
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    return null;
  }
}
async function closeInventory(record) {
  record.closing = true;
  const results = await Promise.allSettled([
    ...record.ordinary.map((entry) => entry.close()),
    ...record.protected.filter((entry) => entry.owned).map((entry) => entry.guard.close()),
  ]);
  if (results.some((entry) => entry.status === 'rejected')) {
    pendingInventories.add(record);
    throw new AprError('APR_BROKER_STALE', 'Inventory cleanup is unproved.', {
      details: {
        reason: 'reconciliation-close-unproved',
        outstandingObligations: results.flatMap((entry) =>
          entry.status === 'rejected'
            ? (entry.reason?.details?.outstandingObligations ?? [
                { name: 'inventory-descriptor', outcome: 'descriptor-close-pending' },
              ])
            : []
        ),
      },
      recovery: 'Retain and close the original inventory descriptors.',
    });
  }
  record.closed = true;
  pendingInventories.delete(record);
}

function newInventoryRecord(context) {
  return {
    context,
    ordinary: [],
    protected: [],
    absent: [],
    namespaces: [],
    closing: false,
    closed: false,
    count: 0,
    associations: [],
  };
}
function countInventory(record, amount) {
  record.count += amount;
  if (record.count > MAX_ENTRIES) refuse('reconciliation-inventory-overflow');
}
function ordinaryInventoryAccess(record) {
  const context = record.context;
  async function ordinaryRoot(root, mode) {
    const observed = await observeOrdinary(root, context, mode);
    record.ordinary.push(observed);
    countInventory(record, observed.entries.length);
    return observed;
  }
  async function absentRoot(root) {
    let parent = path.dirname(root);
    while (!(await exists(parent, context))) parent = path.dirname(parent);
    const observed = await ordinaryRoot(parent, 'membership');
    record.absent.push({ root, observed });
    if (await exists(root, context)) refuse('reconciliation-generation-changed');
  }
  async function optionalOrdinary(root, mode) {
    if (!(await exists(root, context))) {
      await absentRoot(root);
      return null;
    }
    return ordinaryRoot(root, mode);
  }
  return { ordinaryRoot, optionalOrdinary, absentRoot };
}
function assertReviewNamespace(entries) {
  const topFiles = new Set([
    'startup-request.json',
    'review-context.json',
    'events.jsonl',
    'protocol.json',
    'participants.json',
    'collateral-reservation.json',
    'manual-launch-history.json',
    'manual-fence.json',
    'manual-suspension.json',
    'lineage-receipt.json',
  ]);
  const directories =
    /^(coordinator|deliveries|dispatch|dispatch\/locks|dispatch\/locks\/stale|locks|locks\/stale|responses|startup|startup\/locks|startup\/locks\/stale|provider|provider\/bindings|provider\/(codex|claude|grok)|provider\/(codex|claude|grok)\/observations|provider\/(codex|claude|grok)\/operations|wake|wake\/operations|wake\/outcomes|wake\/outcomes\/[a-f0-9]{64}|artifacts|supplements|handoffs)$/u;
  const files = [
    /^coordinator\/(coordinator\.lock|coordinator-lease\.json|stop-request\.json)$/u,
    /^deliveries\/[A-Za-z0-9][A-Za-z0-9._-]{0,127}\.json$/u,
    /^(dispatch\/locks|startup\/locks|locks)\/review\.lock$/u,
    /^(dispatch\/locks|startup\/locks|locks)\/stale\/review-lock-[a-f0-9]{64}-[a-f0-9-]{36}\.json(\.receipt\.json)?$/u,
    /^responses\/(author|reviewer)-[1-9][0-9]*\.json$/u,
    /^provider\/bindings\/(author|reviewer)\.json$/u,
    /^provider\/(codex|claude|grok)\/launch-state\.json$/u,
    /^provider\/(codex|claude|grok)\/operations\/[a-f0-9]{64}\.json$/u,
    /^provider\/(codex|claude|grok)\/observations\/([a-f0-9]{64}|join:[A-Za-z0-9][A-Za-z0-9._-]{0,127})\.json$/u,
    /^wake\/operations\/[a-f0-9]{64}\.json$/u,
    /^wake\/outcomes\/[a-f0-9]{64}\/[0-9]{6}\.json$/u,
    /^artifacts\/turn-[1-9][0-9]*\.md$/u,
    /^supplements\/[A-Za-z0-9][A-Za-z0-9._-]{0,127}\.md$/u,
    /^handoffs\/(author|reviewer)-resume\.json$/u,
  ];
  for (const entry of entries) {
    const valid =
      entry.type === 'directory'
        ? directories.test(entry.relativePath)
        : topFiles.has(entry.relativePath) ||
          files.some((pattern) => pattern.test(entry.relativePath));
    if (!valid) refuse('reconciliation-namespace-unproved');
  }
}

async function observeProjectNamespaces(record, base) {
  const { ordinaryRoot, optionalOrdinary } = ordinaryInventoryAccess(record);
  const projectRoot = await ordinaryRoot(base, 'membership');
  const broker = await optionalOrdinary(path.join(base, 'broker'), 'membership');
  const reviews = await optionalOrdinary(path.join(base, 'reviews'), 'membership');
  const names = describeReconciliationNamespacesCore({
    projectEntries: shallowEntries(projectRoot),
    brokerEntries: broker ? shallowEntries(broker) : [],
    reviewEntries: reviews ? shallowEntries(reviews) : [],
  });
  for (const relative of [...names.brokerPaths, ...names.reviewPaths]) {
    const root = path.join(base, relative);
    const observation = await ordinaryRoot(root, 'tree');
    if (!relative.startsWith('broker/')) assertReviewNamespace(observation.entries);
    else if (
      observation.entries.some(
        ({ relativePath, type }) =>
          type !== 'file' || !/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}\.json$/u.test(relativePath)
      )
    )
      refuse('reconciliation-namespace-unproved');
    record.namespaces.push({
      kind: relative.startsWith('broker/') ? relative.split('/')[1] : 'review',
      root,
      observation,
    });
  }
  const images = await optionalOrdinary(path.join(base, 'runtimes'), 'membership');
  if (
    images &&
    shallowEntries(images).some(({ name, type }) => type !== 'directory' || !KEY.test(name))
  )
    refuse('reconciliation-namespace-unproved');
}
async function assertOrdinaryInventory(record) {
  if (record.closing || record.closed) refuse('reconciliation-observation-unproved');
  budget(record.context);
  for (const observed of record.ordinary) await assertOrdinaryReconciliationTreeUnchanged(observed);
  for (const absent of record.absent)
    if (await exists(absent.root, record.context)) refuse('reconciliation-generation-changed');
}
// Explicit read-only core, used by the fixed producer. A caller root never authenticates a project.
export async function observeProjectReconciliationInventoryCore(input = {}) {
  if (
    Object.keys(input).sort().join(',') !== 'deadline,root,signal' ||
    typeof input.root !== 'string' ||
    !path.isAbsolute(input.root) ||
    path.resolve(input.root) !== input.root
  )
    refuse('reconciliation-context-unproved');
  const context = Object.freeze({ signal: input.signal, deadline: input.deadline });
  const root = input.root;
  budget(context);
  const record = newInventoryRecord(context);
  try {
    await observeProjectNamespaces(record, root);
    return Object.freeze({
      verified: false,
      entryCount: record.count,
      namespaces: Object.freeze(
        record.namespaces.map(({ kind, root }) => Object.freeze({ kind, root }))
      ),
      assertUnchanged: () => assertOrdinaryInventory(record),
      close: () => closeInventory(record),
    });
  } catch (error) {
    try {
      await closeInventory(record);
    } catch (cleanup) {
      cleanup.cause = error;
      throw cleanup;
    }
    throw error;
  }
}

// Fixed production discovery: genuine owner binding determines the project and account stores.
// The observation itself remains unverified and grants no owner/write capability.
export async function observeReconciliationInventory(input = {}) {
  if (pendingInventories.size) refuse('reconciliation-close-unproved');
  if (Object.keys(input).sort().join(',') !== 'deadline,paths,signal')
    refuse('reconciliation-context-unproved');
  const { paths, signal, deadline } = input;
  const context = Object.freeze({ signal, deadline });
  budget(context);
  const owner = await inspectOwnerElectionPaths({ paths, ...context });
  const base = path.dirname(owner.privateRoot);
  const worktree = path.dirname(path.dirname(base));
  if (base !== path.join(worktree, '.scratch', 'peer-review'))
    refuse('reconciliation-project-unproved');
  const operations = await initializePortableOperations(context);
  const project = await canonicalPortableProjectIdentity({ cwd: worktree, operations, ...context });
  if (project.physicalRoot !== worktree) refuse('reconciliation-project-unproved');
  const record = newInventoryRecord(context);
  Object.assign(record, { paths, project });
  const { absentRoot, ordinaryRoot } = ordinaryInventoryAccess(record);
  async function protectedRoot(root, borrowed) {
    let guard = borrowed;
    if (!guard) {
      const receipt = await operations.observeProtection({ root });
      if (!receipt.verified) refuse('reconciliation-namespace-unproved');
      guard = await operations.openProtectedRoot({ receipt });
    }
    const retained = { root, guard, owned: !borrowed, entries: null, snapshots: [] };
    record.protected.push(retained);
    const entries = await guard.listOrdinaryEntries();
    retained.entries = entries;
    countInventory(record, entries.length);
    for (const entry of entries)
      if (entry.type === 'file')
        retained.snapshots.push({
          name: entry.name,
          snapshot: await guard.readSnapshot(entry.name, MAX_BYTES),
        });
    return retained;
  }
  try {
    await observeProjectNamespaces(record, base);
    // C4 owns these exact owner generations; this layer retains their actual C1 substrate.
    const privateStore = await protectedRoot(owner.privateRoot, owner.privateGuard);
    const runtimeStore = await protectedRoot(owner.runtimeRoot, owner.runtimeGuard);
    const ownerNames = describeOwnerReconciliationNamespaceCore({
      resourceKey: owner.resourceKey,
      privateEntries: privateStore.entries,
      runtimeEntries: runtimeStore.entries,
    });
    if (ownerNames.legacyNames.length)
      record.namespaces.push({
        kind: 'owner-legacy',
        root: owner.privateRoot,
        protected: privateStore,
        snapshotNames: ownerNames.legacyNames,
      });
    const home = await operations.accountHome();
    const account = path.join(home, '.cache', 'ai-peer-review');
    record.accountRoot = account;
    if (!(await exists(account, context))) await absentRoot(account);
    else {
      const parent = await ordinaryRoot(account, 'membership');
      for (const kind of ['manual-resources', 'provider-resources']) {
        const root = path.join(account, kind);
        if (!(await exists(root, context))) {
          await absentRoot(root);
          continue;
        }
        // Manual provisioning protects only the leaf. Provider acquisition protects
        // its complete account/group/leaf chain; preserve each actual mechanism.
        if (kind === 'provider-resources') await protectedRoot(account);
        const group =
          kind === 'provider-resources'
            ? await protectedRoot(root)
            : { entries: shallowEntries(await ordinaryRoot(root, 'membership')) };
        if (group.entries.some(({ name, type }) => type !== 'directory' || !KEY.test(name)))
          refuse('reconciliation-namespace-unproved');
        for (const entry of group.entries) {
          const resource = await protectedRoot(path.join(root, entry.name));
          if (
            resource.entries.some(
              ({ name, type }) =>
                type !== 'file' ||
                !/^(apr-resource-[a-f0-9]{64}\.json|apr-election-[a-f0-9]{64}-[A-Za-z0-9_-]+\.json|resource\.json|resource\.lock)$/u.test(
                  name
                )
            )
          )
            refuse('reconciliation-namespace-unproved');
          describeResourceReconciliationNamespaceCore({
            root: resource.root,
            entries: resource.entries,
          });
          record.namespaces.push({ kind, root: resource.root, protected: resource });
        }
      }
      // Other account stores are independent; preserve the complete parent membership for rechecks.
      await assertOrdinaryReconciliationTreeUnchanged(parent);
    }
    for (const namespace of record.namespaces.filter(
      (entry) => entry.kind === 'manual-resources'
    )) {
      const snapshot = namespace.protected.snapshots.find(({ name }) =>
        name.startsWith('apr-resource-')
      );
      if (!snapshot) continue;
      let manual;
      try {
        manual = JSON.parse(snapshot.snapshot.bytes.toString('utf8'));
      } catch {
        refuse('resource-association-unproved');
      }
      const workspace = manual.workspace;
      if (
        typeof workspace !== 'string' ||
        !path.isAbsolute(workspace) ||
        path.normalize(workspace) !== workspace
      )
        refuse('resource-association-unproved');
      const marker = path.sep + '.scratch' + path.sep + 'peer-review' + path.sep;
      const at = workspace.lastIndexOf(marker);
      if (at < 1) refuse('resource-association-unproved');
      const associated = await canonicalPortableProjectIdentity({
        cwd: workspace.slice(0, at),
        operations,
        ...context,
      });
      const relative = path.relative(
        path.join(associated.physicalRoot, '.scratch', 'peer-review'),
        workspace
      );
      if (
        !REVIEW_ID.test(path.basename(workspace)) ||
        ![path.basename(workspace), path.join('reviews', path.basename(workspace))].includes(
          relative
        )
      )
        refuse('resource-association-unproved');
      let review = record.namespaces.find(
        (entry) => entry.kind === 'review' && entry.root === workspace
      )?.observation;
      if (!review) {
        review = await ordinaryRoot(workspace, 'tree');
        assertReviewNamespace(review.entries);
      }
      const journal = readStartupJournal(workspace);
      const authority = inspectReviewAuthority(workspace);
      startupEvidence(workspace, authority.state);
      if (
        !journal ||
        journal.review_id !== manual.review_id ||
        journal.request_digest !== manual.request_digest ||
        journal.descriptor.project_root_digest !== associated.digest ||
        authority.state.protocol.startup?.runtime?.project_root_digest !== associated.digest
      )
        refuse('resource-association-unproved');
      const key = createHash('sha256')
        .update(
          JSON.stringify([
            'ai-peer-review.manual-resource/v1',
            await operations.userId(),
            workspace,
            manual.review_id,
            manual.request_digest,
          ])
        )
        .digest('hex');
      if (key !== path.basename(namespace.root)) refuse('resource-association-unproved');
      record.associations.push(associated);
      namespace.association = Object.freeze({ project_digest: associated.digest, workspace });
      if (associated.digest === project.digest && Object.hasOwn(manual, 'durable_fence_digest')) {
        const receipt = await operations.observeProtection({ root: workspace });
        if (receipt.verified) {
          const guarded = await protectedRoot(workspace);
          const fence = guarded.snapshots.find(({ name }) => name === 'manual-fence.json');
          let value;
          try {
            value = fence && JSON.parse(fence.snapshot.bytes.toString('utf8'));
          } catch {
            refuse('manual-resource-retained');
          }
          if (
            !value ||
            Object.keys(value).sort().join(',') !==
              'event_revision,request_digest,review_id,schema' ||
            value.schema !== 'ai-peer-review.manual-fence/v1' ||
            value.review_id !== manual.review_id ||
            value.request_digest !== manual.request_digest ||
            value.event_revision !== authority.state.protocol.revision
          )
            refuse('manual-resource-retained');
          namespace.settlement = Object.freeze({
            fenceDigest: createHash('sha256').update(fence.snapshot.bytes).digest('hex'),
            reviewProtection: 'C1',
            electionWithdrawn: !namespace.protected.entries.some(({ name }) =>
              name.startsWith('apr-election-')
            ),
          });
        }
      }
    }
    await inspectOwnerElectionPaths({ paths, ...context });
    budget(context);
    const observed = Object.freeze({
      verified: false,
      entryCount: record.count,
      namespaces: Object.freeze(
        record.namespaces.map(({ kind, root }) => Object.freeze({ kind, root }))
      ),
      close: () => closeInventory(record),
    });
    inventories.set(observed, record);
    return observed;
  } catch (error) {
    try {
      await closeInventory(record);
    } catch (cleanup) {
      cleanup.cause = error;
      throw cleanup;
    }
    throw error;
  }
}

async function assertProtectedInventory(record) {
  if (record.associations.length) {
    const operations = await initializePortableOperations(record.context);
    for (const associated of record.associations) {
      const fresh = await canonicalPortableProjectIdentity({
        cwd: associated.physicalRoot,
        operations,
        ...record.context,
      });
      if (fresh.digest !== associated.digest) refuse('resource-association-unproved');
    }
  }
  for (const retained of record.protected) {
    await retained.guard.verify();
    // Owner/election generations are independently guarded at each C4 effect.
    if (!retained.owned) continue;
    const entries = await retained.guard.listOrdinaryEntries();
    if (JSON.stringify(entries) !== JSON.stringify(retained.entries))
      refuse('reconciliation-generation-changed');
    for (const { name, snapshot } of retained.snapshots) {
      const fresh = await retained.guard.readSnapshot(name, MAX_BYTES);
      if (
        fresh.identity !== snapshot.identity ||
        fresh.fileVersion !== snapshot.fileVersion ||
        !fresh.bytes.equals(snapshot.bytes)
      )
        refuse('reconciliation-generation-changed');
    }
  }
}
function boundInventory(input) {
  if (retainedDescriptors.size) throw pendingDescriptorError([...retainedDescriptors]);
  if (pendingInventories.size) refuse('reconciliation-close-unproved');
  if (Object.keys(input).sort().join(',') !== 'deadline,observation,paths,signal')
    refuse('reconciliation-context-unproved');
  const record = inventories.get(input.observation);
  if (!record || record.closing || record.closed) refuse('reconciliation-observation-unproved');
  if (
    input.paths !== record.paths ||
    input.signal !== record.context.signal ||
    input.deadline !== record.context.deadline
  )
    refuse('reconciliation-context-unproved');
  budget(record.context);
  return record;
}
// Read-only proof of the stores an existing-effect producer does not own. This is no write permit.
export async function assertReconciliationExistingEffectScope(input = {}) {
  const record = boundInventory(input);
  await inspectOwnerElectionPaths({ paths: record.paths, ...record.context });
  for (const namespace of record.namespaces)
    if (['registrations', 'recovery'].includes(namespace.kind))
      await assertOrdinaryReconciliationTreeUnchanged(namespace.observation);
  for (const absent of record.absent)
    if (
      absent.root === record.accountRoot ||
      absent.root.startsWith(record.accountRoot + path.sep)
    ) {
      await assertOrdinaryReconciliationTreeUnchanged(absent.observed);
      if (await exists(absent.root, record.context)) refuse('reconciliation-generation-changed');
    }
  await assertProtectedInventory(record);
  await inspectOwnerElectionPaths({ paths: record.paths, ...record.context });
  budget(record.context);
}

export async function assertReconciliationInventory(input = {}) {
  const record = boundInventory(input);
  await inspectOwnerElectionPaths({ paths: record.paths, ...record.context });
  await assertOrdinaryInventory(record);
  await assertProtectedInventory(record);
  await inspectOwnerElectionPaths({ paths: record.paths, ...record.context });
  budget(record.context);
}

// Private membership is required even to obtain parsing input; returned data grants no authority.
export async function readReconciliationInventory(input = {}) {
  await assertReconciliationInventory(input);
  const record = inventories.get(input.observation);
  return Object.freeze({
    verified: false,
    project: record.project,
    namespaces: Object.freeze(
      record.namespaces.map((namespace) => {
        const ordinaryRecord = namespace.observation && observations.get(namespace.observation);
        const files = ordinaryRecord
          ? [...ordinaryRecord.recorded.files].map(([name, file]) =>
              Object.freeze({ name, bytes: Buffer.from(file.bytes) })
            )
          : namespace.protected.snapshots
              .filter(
                ({ name }) => !namespace.snapshotNames || namespace.snapshotNames.includes(name)
              )
              .map(({ name, snapshot }) =>
                Object.freeze({ name, bytes: Buffer.from(snapshot.bytes) })
              );
        return Object.freeze({
          kind: namespace.kind,
          root: namespace.root,
          association: namespace.association,
          settlement: namespace.settlement,
          entries: namespace.observation?.entries ?? namespace.protected.entries,
          files: Object.freeze(files),
        });
      })
    ),
  });
}

export async function retryReconciliationInventoryCleanup() {
  for (const record of [...pendingInventories]) await closeInventory(record);
  await retryOrdinaryReconciliationCleanup();
}

// Exact C3 filenames, not the account resource digest, identify its election publication.
export function describeResourceReconciliationNamespaceCore({ root, entries } = {}) {
  if (typeof root !== 'string' || !KEY.test(path.basename(root)) || !Array.isArray(entries))
    refuse('resource-association-unproved');
  const key = createHash('sha256')
    .update(
      encodeRequestCanonical({
        root,
        resource: { kind: 'provider-resource', id: 'sha256:' + path.basename(root) },
      })
    )
    .digest('hex');
  const prefix = 'apr-election-' + key + '-';
  const names = new Set();
  for (const { name, type } of entries) {
    if (
      type !== 'file' ||
      names.has(name) ||
      !(
        name === 'apr-resource-' + key + '.json' ||
        ['resource.json', 'resource.lock'].includes(name) ||
        (name.startsWith(prefix) &&
          /^[A-Za-z0-9][A-Za-z0-9_-]{0,63}\.json$/u.test(name.slice(prefix.length)))
      )
    )
      refuse('resource-association-unproved');
    names.add(name);
  }
  return Object.freeze({ verified: false, resourceKey: key });
}

// Explicit namespace policy only. No owner, election or legacy-effect discharge is granted.
export function describeOwnerReconciliationNamespaceCore({
  resourceKey,
  privateEntries,
  runtimeEntries,
} = {}) {
  if (!KEY.test(resourceKey ?? '') || ![privateEntries, runtimeEntries].every(Array.isArray))
    refuse('reconciliation-namespace-unproved');
  const legacyNames = [];
  const quarantine = new RegExp(
    '^apr-owner-quarantine-' + resourceKey + '-[a-f0-9-]{36}\\.json$',
    'u'
  );
  const election = new RegExp(
    '^apr-election-' + resourceKey + '-[A-Za-z0-9][A-Za-z0-9_-]{0,63}\\.json$',
    'u'
  );
  for (const [entries, ordinary] of [
    [privateEntries, ['owner.json', 'credential', 'registry.json', 'manual-suspension.json']],
    [runtimeEntries, ['endpoint.json']],
  ]) {
    if (entries.length > MAX_ENTRIES) refuse('reconciliation-inventory-overflow');
    const seen = new Set();
    for (const entry of entries) {
      if (
        !entry ||
        entry.type !== 'file' ||
        seen.has(entry.name) ||
        !(
          ordinary.includes(entry.name) ||
          quarantine.test(entry.name) ||
          (entries === privateEntries && election.test(entry.name))
        )
      )
        refuse('reconciliation-namespace-unproved');
      seen.add(entry.name);
      if (['registry.json', 'manual-suspension.json'].includes(entry.name))
        legacyNames.push(entry.name);
    }
  }
  return Object.freeze({ verified: false, legacyNames: Object.freeze(legacyNames.sort()) });
}
