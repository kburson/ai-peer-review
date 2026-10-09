// @story #136
import path from 'node:path';
import { userInfo } from 'node:os';
import { fileURLToPath } from 'node:url';
import { discoverPrimaryAuthorityRepository as discoverAuthorityRepository } from '../config/primary-authority.mjs';
import { initializePortableSystem } from '../broker/portable-system.mjs';
import { performance } from 'node:perf_hooks';
import {
  readPrimaryRegistration,
  resolvePrimaryAuthoritySync,
  PRIMARY_SKILL_PATH,
} from '../config/primary-authority.mjs';
import { createIntegrationChecker } from '../config/integration-contract-core.mjs';
import { validatePrimaryStore } from '../config/load.mjs';
const packageRoot = fileURLToPath(new URL('../..', import.meta.url));
export async function authorityDiagnosticRows({ cwd = process.cwd() } = {}) {
  const attempt = async (id, inspect) => {
    try {
      await inspect();
      return Object.freeze({ id, status: 'ok', required: true, details: null });
    } catch (error) {
      return Object.freeze({
        id,
        status: 'unavailable',
        required: true,
        details: {
          code: typeof error?.code === 'string' ? error.code : 'APR_PRIMARY_AUTHORITY_UNAVAILABLE',
        },
      });
    }
  };
  return Promise.all([
    attempt(
      'primary-registration',
      async () => await readPrimaryRegistration(await discoverAuthorityRepository(cwd))
    ),
    attempt('primary-config', async () => await resolvePrimaryAuthoritySync({ cwd })),
    attempt('integration-contract', async () => {
      const location = await discoverAuthorityRepository(cwd),
        { record } = await readPrimaryRegistration(location);
      if (!record.primary_initialized) throw Error('Uninitialized');
      const system = await initializePortableSystem({
        signal: new AbortController().signal,
        deadline: performance.now() + 30000,
      });
      const policy = await system.primaryPolicy({
        root: record.primary_root,
        blobs: [record.owned_blobs.config.blob, record.owned_blobs.skill.blob],
      });
      const end = policy.batch.indexOf(10);
      const header = /^([a-f0-9]+) blob ([0-9]+)$/.exec(
        policy.batch.subarray(0, end).toString('ascii')
      );
      if (!header || header[1] !== record.owned_blobs.config.blob)
        throw Error('Primary config blob unavailable');
      const config = validatePrimaryStore(
        JSON.parse(policy.batch.subarray(end + 1, end + 1 + Number(header[2])).toString('utf8'))
      );
      createIntegrationChecker({ packageRoot, home: userInfo().homedir }).check({
        root: record.primary_root,
        activeWorktreeRoot: location.root,
        skillPath: path.join(record.primary_root, PRIMARY_SKILL_PATH),
        integrationContract: record.integration_contract,
        config,
      });
    }),
  ]);
}
