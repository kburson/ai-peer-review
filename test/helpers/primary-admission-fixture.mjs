// @story #187
// Unverified protocol scheduling only: this helper never binds production paths,
// mints an installed source class, or enters primary/election capability registries.
import { randomUUID } from 'node:crypto';
import { performance } from 'node:perf_hooks';
import {
  acquireOwnerElectionCore,
  isOwnerElectionLease,
} from '../../src/broker/ownership-election.mjs';
const stale = () =>
  Object.assign(new Error('Unverified fixture primary admission changed.'), {
    code: 'APR_PRIMARY_AUTHORITY_UNAVAILABLE',
  });
export function primaryAdmissionFixture() {
  const slots = new Map(),
    tokens = new WeakMap(),
    retained = new Set();
  let version = 0,
    blocked = false;
  const snapshot = (id) =>
    slots.has(id)
      ? { id, record: structuredClone(slots.get(id).record), version: slots.get(id).version }
      : null;
  const store = {
    async assertBound() {
      if (blocked) throw stale();
    },
    async create(id, record) {
      if (slots.has(id)) throw stale();
      slots.set(id, { record, version: ++version });
      return snapshot(id);
    },
    async read(id) {
      return snapshot(id);
    },
    async list() {
      return [...slots.keys()].map(snapshot);
    },
    async publish(id, expected, record) {
      if (snapshot(id)?.version !== expected.version) throw stale();
      slots.set(id, { record, version: ++version });
      return snapshot(id);
    },
    async remove(id, expected) {
      if (snapshot(id)?.version !== expected.version) throw stale();
      slots.delete(id);
    },
  };
  const assert = async (fence, context) => {
    const item = tokens.get(fence);
    if (
      !item ||
      item.released ||
      context.signal !== item.context.signal ||
      context.deadline !== item.context.deadline
    )
      throw stale();
    await item.lease.assert();
    return fence;
  };
  const run = async (options, operation) => {
    const context = {
      signal: options.signal ?? new AbortController().signal,
      deadline: options.deadline ?? performance.now() + 30000,
    };
    const outcome = await acquireOwnerElectionCore({
      store,
      resourceKey: options.commonDir,
      contenderId: randomUUID(),
      contenderIdentity: { host: 'unverified-fixture', pid: process.pid },
      ...context,
      observeProcessIdentity: async ({ original }) => ({ ...original, status: 'live' }),
    });
    if (outcome.kind !== 'won' || outcome.verified !== false || isOwnerElectionLease(outcome.lease))
      throw stale();
    const fence = Object.freeze({ verified: false });
    const item = { lease: outcome.lease, context, released: false };
    tokens.set(fence, item);
    try {
      return await outcome.lease.run(() => operation(fence, context));
    } finally {
      const result = await outcome.lease.release();
      if (result.status !== 'withdrawn' || result.obligations.length) {
        retained.add(item);
        throw stale();
      }
      item.released = true;
    }
  };
  return Object.freeze({
    verified: false,
    run,
    assert,
    slots,
    retained,
    block() {
      blocked = true;
    },
    corruptHeld() {
      for (const [id, item] of slots) slots.set(id, { ...item, version: ++version });
    },
  });
}
