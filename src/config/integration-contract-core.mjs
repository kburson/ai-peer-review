// @story #134
import path from 'node:path';
import { readFileSync, lstatSync } from 'node:fs';
import { ownedContentDigest } from './owned-content-digest.mjs';
import { AprError } from '../errors.mjs';
import {
  hostWrapper,
  HOST_DIRECTORIES,
  HOST_HOOKS,
  INTEGRATION_CONTRACT,
} from './integration-assets.mjs';
const digest = ownedContentDigest;
function mismatch(message, scope = 'project', details = {}) {
  throw new AprError('APR_SETUP_VERSION_MISMATCH', message, {
    recovery: `Run peer-review setup --update --scope ${scope} --dry-run, then peer-review setup --update --scope ${scope}. Commit and explicitly activate changed primary owned files.`,
    details,
  });
}
function bytes(file, scope) {
  try {
    let ancestor = path.dirname(file),
      depth = 0;
    while (true) {
      if (++depth > 128) mismatch('Owned path ancestry exceeds its bound.', scope, { file });
      const metadata = lstatSync(ancestor);
      if (!metadata.isDirectory() || metadata.isSymbolicLink())
        mismatch('Owned integration ancestor is not ordinary.', scope, { file });
      const parent = path.dirname(ancestor);
      if (parent === ancestor) break;
      ancestor = parent;
    }
    const stat = lstatSync(file);
    if (!stat.isFile() || stat.isSymbolicLink() || stat.size > 1024 * 1024)
      mismatch('Owned integration path is not a bounded ordinary file.', scope, { file });
    return readFileSync(file);
  } catch (error) {
    if (error instanceof AprError) throw error;
    mismatch('Owned integration content is missing or unreadable.', scope, { file });
  }
}
export function readIntegrationContract(packageRoot) {
  const file = path.join(packageRoot, 'templates/integration/contract-v1.json');
  const input = bytes(file, 'project');
  let contract;
  try {
    contract = JSON.parse(input);
  } catch {
    mismatch('Installed integration contract is invalid JSON.', 'project', { file });
  }
  if (
    !contract ||
    JSON.stringify(Object.keys(contract).sort()) !==
      JSON.stringify(['contract', 'hooks', 'schema', 'shared_skill_sha256', 'wrappers']) ||
    contract.schema !== 'ai-peer-review.integration-contract/v1' ||
    contract.contract !== INTEGRATION_CONTRACT
  )
    mismatch('Installed integration contract is invalid.');
  const expected = {
    shared_skill_sha256: digest(
      bytes(path.join(packageRoot, 'skills/peer-review/SKILL.md'), 'project')
    ),
    wrappers: {},
    hooks: {},
  };
  for (const host of Object.keys(HOST_DIRECTORIES))
    expected.wrappers[host] = digest(hostWrapper(host));
  for (const [host, command] of Object.entries(HOST_HOOKS))
    expected.hooks[host] = digest(
      JSON.stringify({ matcher: 'Bash', hooks: [{ type: 'command', command }] }),
      'json'
    );
  if (
    contract.shared_skill_sha256 !== expected.shared_skill_sha256 ||
    JSON.stringify(contract.wrappers) !== JSON.stringify(expected.wrappers) ||
    JSON.stringify(contract.hooks) !== JSON.stringify(expected.hooks)
  )
    mismatch('Installed content contradicts its declared integration contract.');
  return Object.freeze(contract);
}
export function createIntegrationChecker({ packageRoot, home }) {
  function check(primary, { primaryOnly = false } = {}) {
    const contract = readIntegrationContract(packageRoot),
      setup = primary.config.setup;
    if (
      primary.integrationContract !== contract.contract ||
      setup?.integration_contract !== contract.contract ||
      setup?.skill_sha256 !== contract.shared_skill_sha256 ||
      digest(bytes(primary.skillPath, 'project')) !== contract.shared_skill_sha256
    )
      mismatch('Primary shared procedure does not match the current integration contract.');
    const observed = [];
    for (const host of setup.agents) {
      const userWrapper = path.join(home, HOST_DIRECTORIES[host], 'skills/peer-review/SKILL.md');
      let hasUser = false;
      try {
        lstatSync(userWrapper);
        hasUser = true;
      } catch (error) {
        if (error.code !== 'ENOENT')
          mismatch('User wrapper cannot be discovered.', 'user', { file: userWrapper });
      }
      const linked = primary.activeWorktreeRoot !== primary.root;
      const scope = !primaryOnly && (linked || hasUser) ? 'user' : 'project';
      const root = scope === 'user' ? home : primary.root;
      const wrapper = path.join(root, HOST_DIRECTORIES[host], 'skills/peer-review/SKILL.md');
      if (digest(bytes(wrapper, scope)) !== contract.wrappers[host])
        mismatch('Discoverable host wrapper is stale or modified.', scope, { file: wrapper });
      if (HOST_HOOKS[host]) {
        const file = path.join(
          root,
          HOST_DIRECTORIES[host],
          host === 'codex' ? 'hooks.json' : 'settings.json'
        );
        let groups;
        try {
          groups = JSON.parse(bytes(file, scope)).hooks?.PreToolUse;
        } catch {
          mismatch('Host integration settings are invalid.', scope, { file });
        }
        if (!Array.isArray(groups)) mismatch('Owned host hook is unavailable.', scope, { file });
        const owned = groups.filter((group) =>
          group?.hooks?.some((hook) => hook.command === HOST_HOOKS[host])
        );
        if (owned.length !== 1 || digest(JSON.stringify(owned[0]), 'json') !== contract.hooks[host])
          mismatch('Owned host hook is stale, ambiguous or modified.', scope, { file });
      }
      observed.push(Object.freeze({ host, scope, wrapper }));
    }
    return Object.freeze({
      contract: contract.contract,
      skillPath: primary.skillPath,
      primaryRoot: primary.root,
      hosts: Object.freeze(observed),
    });
  }
  return Object.freeze({ check });
}
