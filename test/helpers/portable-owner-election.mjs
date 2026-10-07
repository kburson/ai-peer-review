// @story #178
// Test-owned actual filesystem adapter; no production lease or source admission.
import { open, readFile, readdir, lstat, rename, unlink } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID, createHash } from 'node:crypto';
import { acquireOwnerElectionCore } from '../../src/broker/ownership-election.mjs';

export async function actualElection(
  t,
  { root, budget, observeOwner = async () => null, afterWinning = async () => {} }
) {
  const rootStat = await lstat(root, { bigint: true }),
    key = createHash('sha256').update(root).digest('hex'),
    prefix = 'apr-election-' + key + '-',
    id = randomUUID();
  const handles = new Map();
  t.after(async () => {
    for (const file of handles.values()) await file.close().catch(() => {});
  });
  const snapshot = async (subject) => {
    const location = path.join(root, prefix + subject + '.json');
    try {
      const stat = await lstat(location, { bigint: true });
      return {
        id: subject,
        record: JSON.parse(await readFile(location, 'utf8')),
        version: [stat.dev, stat.ino, stat.size, stat.mtimeNs, stat.ctimeNs].map(String).join(':'),
      };
    } catch (error) {
      if (error.code === 'ENOENT') return null;
      throw error;
    }
  };
  const store = {
    async assertBound() {
      const stat = await lstat(root, { bigint: true });
      if (stat.dev !== rootStat.dev || stat.ino !== rootStat.ino) throw Error('root changed');
    },
    read: snapshot,
    async list() {
      const names = (await readdir(root)).filter(
        (name) => name.startsWith(prefix) && name.endsWith('.json')
      );
      return Promise.all(names.map((name) => snapshot(name.slice(prefix.length, -5))));
    },
    async create(subject, record) {
      const file = await open(path.join(root, prefix + subject + '.json'), 'wx+', 0o600);
      handles.set(subject, file);
      await file.writeFile(JSON.stringify(record));
      await file.sync();
      return snapshot(subject);
    },
    async publish(subject, expected, record) {
      if ((await snapshot(subject))?.version !== expected.version) throw Error('slot changed');
      const temporary = path.join(root, 'pending-' + randomUUID()),
        file = await open(temporary, 'wx+', 0o600);
      await file.writeFile(JSON.stringify(record));
      await file.sync();
      const original = handles.get(subject);
      await rename(temporary, path.join(root, prefix + subject + '.json'));
      handles.set(subject, file);
      await original.close();
      return snapshot(subject);
    },
    async remove(subject, expected) {
      if ((await snapshot(subject))?.version !== expected.version) throw Error('slot changed');
      await unlink(path.join(root, prefix + subject + '.json'));
      await handles.get(subject)?.close();
      handles.delete(subject);
    },
    ownedObligations: () =>
      [...handles].map(([subject, file]) => ({
        name: prefix + subject + '.json',
        root,
        outcome: file.fd >= 0 ? 'held' : 'closed',
      })),
  };
  const outcome = await acquireOwnerElectionCore({
    store,
    resourceKey: key,
    contenderId: id,
    contenderIdentity: { host: 'test-owned-host', pid: process.pid },
    ...budget,
    observeProcessIdentity: async ({ pid }) => ({
      status: pid === process.pid ? 'live' : 'unknown',
      host: 'test-owned-host',
      pid,
    }),
    observeOwner,
  });
  if (outcome.kind === 'won')
    return {
      ...outcome,
      lease: {
        assert: outcome.lease.assert,
        retainedGeneration: outcome.lease.retainedGeneration,
        async release() {
          await afterWinning();
          return outcome.lease.release();
        },
      },
    };
  return outcome;
}
