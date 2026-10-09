// @story #136
import path from 'node:path';
import { userInfo } from 'node:os';
import { fileURLToPath } from 'node:url';
import { authorityGit, discoverAuthorityRepository } from '../git/repository.mjs';
import {
  readPrimaryRegistration,
  resolvePrimaryAuthoritySync,
  PRIMARY_SKILL_PATH,
} from '../config/primary-authority.mjs';
import { createIntegrationChecker } from '../config/integration-contract-core.mjs';
import { validatePrimaryStore } from '../config/load.mjs';
const packageRoot = fileURLToPath(new URL('../..', import.meta.url));
export function authorityDiagnosticRows({ cwd = process.cwd() } = {}) {
  const attempt = (id, inspect) => {
    try {
      inspect();
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
  return [
    attempt('primary-registration', () =>
      readPrimaryRegistration(discoverAuthorityRepository(cwd))
    ),
    attempt('primary-config', () => resolvePrimaryAuthoritySync({ cwd })),
    attempt('integration-contract', () => {
      const location = discoverAuthorityRepository(cwd),
        { record } = readPrimaryRegistration(location);
      if (!record.primary_initialized) throw Error('Uninitialized');
      const config = validatePrimaryStore(
        JSON.parse(
          authorityGit(record.primary_root, ['cat-file', 'blob', record.owned_blobs.config.blob])
        )
      );
      createIntegrationChecker({ packageRoot, home: userInfo().homedir }).check({
        root: record.primary_root,
        activeWorktreeRoot: location.root,
        skillPath: path.join(record.primary_root, PRIMARY_SKILL_PATH),
        integrationContract: record.integration_contract,
        config,
      });
    }),
  ];
}
