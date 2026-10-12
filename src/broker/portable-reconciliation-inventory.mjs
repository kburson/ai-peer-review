// @story #209
// Ordinary physical integrity observations never mint C1 protection or effect authority.
import { open, opendir, lstat, realpath } from 'node:fs/promises';
import { constants } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { AprError } from '../errors.mjs';

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
    const error = new AprError(
      'APR_BROKER_STALE',
      'Ordinary inventory descriptor cleanup is unproved.',
      {
        details: {
          reason: 'reconciliation-close-unproved',
          retrySafe: false,
          outstandingObligations: descriptorObligations(pending.filter((record) => !record.closed)),
        },
        recovery: 'Retain and close the exact original descriptors before retrying.',
      }
    );
    throw error;
  }
}
function descriptorObligations(records) {
  return records.map((record) =>
    Object.freeze({
      name: 'ordinary-root-descriptor',
      root: record.directory,
      identity: record.identity,
      outcome: 'descriptor-close-pending',
    })
  );
}
export async function retryOrdinaryReconciliationCleanup() {
  await closeDirectories([...retainedDescriptors]);
}
async function capture(root, context) {
  const chain = await physicalChain(root, context);
  const directories = [];
  const entries = [];
  const files = new Map();
  async function visit(directory, relative, depth) {
    budget(context);
    if (depth > MAX_DEPTH) refuse('reconciliation-inventory-overflow');
    const before = await directoryFacts(directory, context);
    const handle = await opendir(directory);
    directories.push({ handle, directory, ...before });
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
      if (s.isDirectory()) await visit(location, relativePath, depth + 1);
      else {
        if (s.size > BigInt(MAX_BYTES)) refuse('reconciliation-inventory-overflow');
        const file = await open(location, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0));
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
          await file.close();
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
  const recorded = await capture(root, context);
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
  observations.set(observed, { root, context, recorded, isClosed: () => closed || closing });
  return observed;
}
export async function assertOrdinaryReconciliationTreeUnchanged(observed) {
  const record = observations.get(observed);
  if (!record || record.isClosed()) refuse('reconciliation-observation-unproved');
  const current = await capture(record.root, record.context);
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
