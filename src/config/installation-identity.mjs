import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { AprError } from '../errors.mjs';
import { configPaths, loadConfig } from './load.mjs';

const PACKAGE_FILE = new URL('../../package.json', import.meta.url);
const SKILL_FILE = new URL('../../skills/peer-review/SKILL.md', import.meta.url);
const HOST_DIR = Object.freeze({
  codex: '.codex',
  claude: '.claude',
  grok: '.grok',
  generic: '.agents',
});

function digest(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

export function installedPackageIdentity() {
  return Object.freeze({
    package_version: JSON.parse(readFileSync(PACKAGE_FILE, 'utf8')).version,
    skill_sha256: digest(readFileSync(SKILL_FILE)),
  });
}

export function assertProjectSetupCompatible({ cwd = process.cwd(), env = process.env } = {}) {
  const file = configPaths({ cwd, env }).project;
  if (!existsSync(file)) return;
  // Keep malformed legacy configuration on the normal APR_CONFIG_INVALID path.
  loadConfig({ cwd, env });
  const config = JSON.parse(readFileSync(file, 'utf8'));
  const setup = config.setup;
  if (!setup) return;
  const expected = installedPackageIdentity();
  const staleFiles = setup.agents.filter((host) => {
    const skillFile = path.join(
      path.resolve(cwd),
      HOST_DIR[host],
      'skills',
      'peer-review',
      'SKILL.md'
    );
    return !existsSync(skillFile) || digest(readFileSync(skillFile)) !== expected.skill_sha256;
  });
  if (
    setup.package_version !== expected.package_version ||
    setup.skill_sha256 !== expected.skill_sha256 ||
    staleFiles.length
  ) {
    throw new AprError(
      'APR_SETUP_VERSION_MISMATCH',
      'The project peer-review setup does not match the installed CLI and skill.',
      {
        recovery:
          'Run peer-review setup --update --dry-run, then peer-review setup --update in the affected project. Run peer-review doctor afterward.',
        details: {
          expected,
          configured: {
            package_version: setup.package_version ?? null,
            skill_sha256: setup.skill_sha256 ?? null,
          },
          stale_hosts: staleFiles,
        },
      }
    );
  }
}
