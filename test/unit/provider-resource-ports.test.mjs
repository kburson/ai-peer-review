// @story #188
// Scheduling harness executes shipped adapter logic with explicit unverified
// election ports; real C1 storage does not promote those ports to authority.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, mkdtemp, realpath, rm } from 'node:fs/promises';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { performance } from 'node:perf_hooks';
import { compileFunction } from 'node:vm';
import { parse } from 'espree';
import { AprError } from '../../src/errors.mjs';
import {
  provisionProtectedRoot,
  observeStorageProtection,
  openProtectedRoot,
} from '../../src/broker/storage-protection.mjs';
async function adapter(bindings) {
  const source = await readFile(
    new URL('../../src/broker/provider-resource-ports.mjs', import.meta.url),
    'utf8'
  );
  const ast = parse(source, { ecmaVersion: 'latest', sourceType: 'module', range: true });
  const functions = ast.body
    .flatMap((node) => {
      const actual = node.type === 'ExportNamedDeclaration' ? node.declaration : node;
      return actual?.type === 'FunctionDeclaration' ? [source.slice(...actual.range)] : [];
    })
    .join('\n');
  return compileFunction(
    functions + '\nreturn createProviderResourcePorts;',
    Object.keys(bindings)
  )(...Object.values(bindings));
}
for (const legacyName of ['resource.json', 'resource.lock']) {
  test(
    'portable resource acquisition preserves and refuses retained legacy ' + legacyName,
    async (t) => {
      const home = await realpath(await mkdtemp(path.join(tmpdir(), 'apr-provider-legacy-')));
      t.after(() => rm(home, { recursive: true, force: true }));
      const bounded = () => ({
        signal: new AbortController().signal,
        deadline: performance.now() + 30000,
      });
      const setup = bounded();
      const digest = 'a'.repeat(64),
        root = path.join(home, '.cache', 'ai-peer-review', 'provider-resources', digest);
      const receipt = await provisionProtectedRoot({ root, ...setup });
      const guard = await openProtectedRoot({ receipt, ...setup });
      t.after(() => guard.close());
      const bytes = Buffer.from('retained-uncertain-owner');
      await guard.writeExclusive(legacyName, bytes);
      // Setup, the refused request, and independent final inspection are three
      // operations. None may renew the deadline of another in-flight request.
      const context = bounded();
      let elections = 0;
      const create = await adapter({
        path,
        lstat: (await import('node:fs/promises')).lstat,
        AprError,
        portableOperationsContext: async () => context,
        provisionProtectedRoot,
        bindOwnerElectionPaths: async () => ({
          resourceKey: 'b'.repeat(64),
          close: async () => {},
        }),
        acquireOwnerElection: async () => {
          elections++;
          return {
            kind: 'won',
            verified: true,
            lease: {
              assert: async () => {},
              release: async () => ({ status: 'withdrawn', obligations: [] }),
            },
          };
        },
      });
      const resources = await create(
        {},
        {
          kind: process.platform,
          accountHome: async () => home,
          userId: async () => String(process.geteuid?.() ?? -1),
          observeProtection: ({ root }) => observeStorageProtection({ root, ...context }),
          openProtectedRoot: ({ receipt }) => openProtectedRoot({ receipt, ...context }),
        }
      );
      t.after(() => resources.close());
      await resources.ports.openPrivateDirectory(root);
      await assert.rejects(
        resources.ports.acquireExclusive(path.join(root, 'resource.lock')),
        (error) =>
          error.code === 'APR_PROVIDER_RESOURCE_STALE' &&
          /Retained native provider evidence/.test(error.message)
      );
      assert.equal(elections, 0);
      const inspection = bounded();
      const freshReceipt = await observeStorageProtection({ root, ...inspection });
      const inspector = await openProtectedRoot({ receipt: freshReceipt, ...inspection });
      t.after(() => inspector.close());
      assert.deepEqual(await inspector.read(legacyName), bytes);
    }
  );
}
