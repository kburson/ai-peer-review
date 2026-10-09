// @story #134
// Internal maintenance-only core. It has no provider or review execution capability.
import path from 'node:path';
import { createHash } from 'node:crypto';
import { performance } from 'node:perf_hooks';
import { withPrimaryAdmissionFence, assertPrimaryAdmissionFence } from './primary-admission.mjs';
import { readFileSync, lstatSync, realpathSync } from 'node:fs';
import { modify, applyEdits } from 'jsonc-parser';
import {
  inspectPrimaryReviewInventory,
  assertPrimaryInventoryObservation,
} from './primary-inventory.mjs';
import { ownedContentDigest } from './owned-content-digest.mjs';
import { AprError } from '../errors.mjs';
import { authorityGit } from '../git/repository.mjs';
import { discoverPrimaryAuthorityRepository as discoverAuthorityRepository } from './primary-authority.mjs';
import {
  readPrimaryRegistration,
  assertPrimaryRegistrationGeneration,
  PRIMARY_CONFIG_PATH,
  PRIMARY_SKILL_PATH,
} from './primary-authority.mjs';
import {
  HOST_FIELD_OWNERS,
  validateConfig,
  validatePrimaryStore,
  validateUserStore,
} from './load.mjs';
import { createIntegrationChecker } from './integration-contract-core.mjs';
import { resolvePrimaryAuthoritySync } from './primary-authority.mjs';
import { createPrimaryMaintenanceCore } from './primary-maintenance.mjs';
import { validateSetupWriteSet, applyAtomicValidatedWrites } from './setup-validation.mjs';

const directories = { codex: '.codex', claude: '.claude', grok: '.grok', generic: '.agents' };
const hooks = { codex: 'peer-review-codex-hook', claude: 'peer-review-claude-hook' };
import { hostWrapper, INTEGRATION_CONTRACT } from './integration-assets.mjs';
export { hostWrapper, INTEGRATION_CONTRACT };
const stable = (value) => JSON.stringify(value, null, 2) + '\n';
const digest = ownedContentDigest;
function conflict(message, details = {}) {
  throw new AprError('APR_SETUP_CONFLICT', message, {
    recovery:
      'Inspect ownership and resolve the reported conflict before explicit setup migration.',
    details,
  });
}
function read(file) {
  try {
    const stat = lstatSync(file);
    if (!stat.isFile() || stat.isSymbolicLink() || stat.size > 1024 * 1024)
      conflict('Setup input is not a bounded ordinary file.', { file });
    return readFileSync(file, 'utf8');
  } catch (error) {
    if (error.code === 'ENOENT') return null;
    throw error;
  }
}
function parse(bytes, file) {
  if (bytes === null) return null;
  try {
    const value = JSON.parse(bytes);
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('not object');
    return value;
  } catch {
    conflict('Setup input JSON is invalid.', { file });
  }
}

function projectOnly(location, record, dryRun) {
  if (location.root !== record.primary_root && !dryRun)
    throw new AprError(
      'APR_PRIMARY_AUTHORITY_UNAVAILABLE',
      'Setup apply requires the physical primary checkout.',
      {
        recovery: `cd ${JSON.stringify(record.primary_root)} && peer-review setup --update --dry-run`,
        details: { primaryRoot: record.primary_root },
      }
    );
}
function splitLegacy(legacy) {
  const primary = { schema: 'ai-peer-review.primary-config/v2' },
    user = { schema: 'ai-peer-review.user-config/v2' };
  if (!legacy) return { primary, user };
  validateConfig(legacy);
  for (const field of ['authority', 'review'])
    if (legacy[field] !== undefined) primary[field] = structuredClone(legacy[field]);
  for (const [host, fields] of Object.entries(legacy.hosts ?? {}))
    for (const [field, owner] of Object.entries(HOST_FIELD_OWNERS)) {
      const [group, key] = field.split('.');
      const value = key ? fields[group]?.[key] : fields[group];
      if (value === undefined) continue;
      const target = owner === 'primary' ? primary : user;
      target.hosts ??= {};
      target.hosts[host] ??= {};
      if (key) (target.hosts[host][group] ??= {})[key] = structuredClone(value);
      else target.hosts[host][group] = structuredClone(value);
    }
  return { primary, user };
}
export function createSetupMaintenanceCore({
  packageRoot,
  userFile,
  home,
  admit,
  primaryAdmission,
}) {
  const admission = primaryAdmission ?? {
    run: withPrimaryAdmissionFence,
    assert: assertPrimaryAdmissionFence,
  };
  const skill = readFileSync(path.join(packageRoot, 'skills/peer-review/SKILL.md'), 'utf8');
  async function setupUnchecked(options = {}, beforeEffect) {
    await admit({ signal: options.signal, deadline: options.deadline });
    const scope = options.scope ?? 'project';
    if (!['project', 'user'].includes(scope)) conflict('Setup scope is invalid.');
    const agents = [...new Set(options.agents ?? ['generic'])].sort();
    if (!agents.length || agents.some((host) => !Object.hasOwn(directories, host)))
      conflict('Setup host is invalid.');
    const writes = [];
    const add = (file, after, owner, preserveForeign = false) => {
      const before = read(file);
      if (before !== after) writes.push({ file, before, after, owner, preserveForeign });
    };
    let root,
      current,
      configFile,
      legacyFile,
      legacy = null,
      location,
      registration,
      inventory;
    if (scope === 'project') {
      location = await discoverAuthorityRepository(options.cwd ?? process.cwd(), {
        signal: options.signal,
        deadline: options.deadline,
      });
      registration = await readPrimaryRegistration(location, {
        signal: options.signal,
        deadline: options.deadline,
      });
      projectOnly(location, registration.record, options.dryRun);
      root = registration.record.primary_root;
      let ignored = false;
      try {
        authorityGit(root, [
          'check-ignore',
          '--quiet',
          '--no-index',
          '--',
          '.scratch/peer-review/probe',
        ]);
        ignored = true;
      } catch (error) {
        if (error.cause?.status !== 1) throw error;
      }
      if (!ignored && !options.remove) {
        if (!options.confirmScratchExclude)
          conflict('Scratch exclude requires explicit --confirm-scratch-exclude.');
        const file = path.join(location.commonDir, 'info/exclude'),
          before = read(file) ?? '';
        add(
          file,
          before +
            (before && !before.endsWith('\n') ? '\n' : '') +
            '# ai-peer-review local scratch\n/.scratch/peer-review/\n',
          'local-scratch-exclude'
        );
      }
      inventory = await inspectPrimaryReviewInventory(location.commonDir, root, {
        signal: options.signal,
        deadline: options.deadline,
      });
      configFile = path.join(root, PRIMARY_CONFIG_PATH);
      legacyFile = path.join(root, '.ai-peer-review.json');
      legacy = parse(read(legacyFile), legacyFile);
      current = parse(read(configFile), configFile);
      if (legacy && current)
        conflict('New and legacy primary configuration copies coexist.', {
          files: [legacyFile, configFile],
        });
      if (legacy && !options.migrate)
        conflict('Legacy primary configuration requires explicit --migrate.', { file: legacyFile });
      if (current) validatePrimaryStore(current);
      const tracked = authorityGit(root, [
        'status',
        '--porcelain',
        '--untracked-files=no',
        '--',
        PRIMARY_CONFIG_PATH,
        PRIMARY_SKILL_PATH,
      ]);
      if (tracked)
        conflict('Primary owned files are staged, dirty or unmerged.', { paths: tracked });
      const split = splitLegacy(legacy);
      current ??= split.primary;
      if (Object.keys(split.user.hosts ?? {}).length) {
        if (!options.migrateUser)
          conflict('Legacy machine fields require explicit invoking-account migration consent.');
        const beforeUser = parse(read(userFile), userFile) ?? {
          schema: 'ai-peer-review.user-config/v2',
        };
        validateUserStore(beforeUser);
        const merged = structuredClone(beforeUser);
        merged.hosts ??= {};
        for (const [host, fields] of Object.entries(split.user.hosts))
          for (const [group, value] of Object.entries(fields)) {
            const old = merged.hosts[host]?.[group];
            if (old !== undefined && JSON.stringify(old) !== JSON.stringify(value))
              conflict('Legacy machine bindings conflict with user preferences.', { host, group });
            (merged.hosts[host] ??= {})[group] = value;
          }
        validateUserStore(merged);
        add(userFile, stable(merged), 'user-config');
      }
    } else {
      root = realpathSync(home);
      configFile = userFile;
      current = parse(read(configFile), configFile) ?? { schema: 'ai-peer-review.user-config/v2' };
      validateUserStore(current);
    }
    const next = structuredClone(current);
    const selected = options.update ? (next.setup?.agents ?? legacy?.setup?.agents) : agents;
    if (!selected?.length) conflict('No prior package-owned setup exists for update.');
    const remaining = options.remove
      ? (next.setup?.agents ?? []).filter((host) => !selected.includes(host))
      : [...new Set([...(next.setup?.agents ?? []), ...selected])].sort();
    if (remaining.length)
      next.setup = {
        owner: 'ai-peer-review',
        version: 3,
        agents: remaining,
        skill_sha256: digest(skill),
        integration_contract: INTEGRATION_CONTRACT,
      };
    else delete next.setup;
    (scope === 'project' ? validatePrimaryStore : validateUserStore)(next);
    add(configFile, stable(next), 'package-config');
    if (scope === 'project') {
      const shared = path.join(root, PRIMARY_SKILL_PATH);
      const before = read(shared);
      if (before !== null && before !== skill && !current.setup)
        conflict('Existing shared skill has no package ownership.', { file: shared });
      if (!options.remove) add(shared, skill, 'shared-skill');
      if (legacy) add(legacyFile, null, 'legacy-config');
    }
    for (const host of selected) {
      const hostRoot = path.join(root, directories[host]);
      const wrapper = path.join(hostRoot, 'skills/peer-review/SKILL.md');
      const old = read(wrapper);
      if (
        old !== null &&
        old !== hostWrapper(host) &&
        !legacy?.setup?.agents?.includes(host) &&
        !current.setup?.agents?.includes(host)
      )
        conflict('Existing peer review wrapper is not package-owned.', { file: wrapper });
      if (options.remove) {
        if (current.setup?.agents?.includes(host)) {
          if (old !== hostWrapper(host))
            conflict('Owned wrapper changed before teardown.', { file: wrapper });
          add(wrapper, null, host + '-wrapper');
        }
      } else add(wrapper, hostWrapper(host), host + '-wrapper');
      const adapter = path.join(hostRoot, 'config.json'),
        adapterBytes = read(adapter);
      if (adapterBytes !== null) {
        const metadata = parse(adapterBytes, adapter).ai_peer_review;
        if (metadata) {
          if (metadata.owner !== 'ai-peer-review' || !legacy?.setup?.agents?.includes(host))
            conflict('Provider adapter metadata ownership is unknown.', { file: adapter });
          add(
            adapter,
            applyEdits(adapterBytes, modify(adapterBytes, ['ai_peer_review'], undefined, {})),
            host + '-legacy-adapter',
            true
          );
        }
      }
      if (hooks[host]) {
        const file = path.join(hostRoot, host === 'codex' ? 'hooks.json' : 'settings.json');
        const before = read(file);
        const value = parse(before, file) ?? {};
        const groups = value.hooks?.PreToolUse ?? [];
        if (!Array.isArray(groups)) conflict('Host PreToolUse hooks must be an array.', { file });
        const hook = { matcher: 'Bash', hooks: [{ type: 'command', command: hooks[host] }] };
        const owned = groups.filter((group) =>
          group?.hooks?.some((entry) => entry.command === hooks[host])
        );
        if (
          owned.length > 1 ||
          owned.some((group) => JSON.stringify(group) !== JSON.stringify(hook))
        )
          conflict('Owned host hook is ambiguous or modified.', { file });
        if (options.remove) {
          if (owned.length && current.setup?.agents?.includes(host)) {
            const index = groups.indexOf(owned[0]);
            const bytes = applyEdits(
              before,
              modify(before, ['hooks', 'PreToolUse', index], undefined, {})
            );
            add(file, bytes, host + '-hook', true);
          }
        } else if (!owned.length) {
          const bytes =
            before === null
              ? stable({ hooks: { PreToolUse: [hook] } })
              : applyEdits(before, modify(before, ['hooks', 'PreToolUse', -1], hook, {}));
          add(file, bytes.endsWith('\n') ? bytes : bytes + '\n', host + '-hook', before !== null);
        }
      }
    }
    const localFile = location ? path.join(location.commonDir, 'info/exclude') : null;
    const localWrites = writes.filter((entry) => entry.file === localFile);
    const projectWrites = writes.filter(
        (entry) => entry.file !== userFile && entry.file !== localFile
      ),
      userWrites = writes.filter((entry) => entry.file === userFile);
    const checked = await validateSetupWriteSet({ writes: projectWrites, destinationRoot: root });
    const localChecked = localWrites.length
      ? await validateSetupWriteSet({ writes: localWrites, destinationRoot: location.commonDir })
      : null;
    let userRoot = home;
    if (userWrites.length) {
      const relative = path.relative(home, userFile);
      if (relative === '..' || relative.startsWith('..' + path.sep) || path.isAbsolute(relative)) {
        userRoot = path.dirname(userFile);
        let depth = 0;
        while (true) {
          if (++depth > 128) conflict('Preference path traversal exceeds its bound.');
          try {
            const stat = lstatSync(userRoot);
            if (
              !stat.isDirectory() ||
              stat.isSymbolicLink() ||
              realpathSync(userRoot) !== userRoot ||
              (process.platform !== 'win32' && stat.uid !== process.getuid())
            )
              conflict('Preference destination is not an invoking-account directory.');
            break;
          } catch (error) {
            if (error.code !== 'ENOENT') throw error;
          }
          const parent = path.dirname(userRoot);
          if (parent === userRoot) conflict('Preference destination is unavailable.');
          userRoot = parent;
        }
      }
    }
    const userChecked = userWrites.length
      ? await validateSetupWriteSet({ writes: userWrites, destinationRoot: userRoot })
      : null;
    await admit({ signal: options.signal, deadline: options.deadline });
    if (location) {
      await assertPrimaryInventoryObservation(inventory, location.commonDir, root, {
        signal: options.signal,
        deadline: options.deadline,
      });
      const observed = await readPrimaryRegistration(
        await discoverAuthorityRepository(root, {
          signal: options.signal,
          deadline: options.deadline,
        }),
        {
          signal: options.signal,
          deadline: options.deadline,
        }
      );
      if (!observed.bytes.equals(registration.bytes))
        conflict('Primary registration changed during setup.');
    }
    const changes = Object.freeze(
      [...checked.writes, ...(userChecked?.writes ?? []), ...(localChecked?.writes ?? [])].map(
        (entry) =>
          Object.freeze({
            ...entry,
            beforeDigest:
              entry.before === null
                ? null
                : createHash('sha256').update(entry.before).digest('hex'),
            afterDigest:
              entry.after === null ? null : createHash('sha256').update(entry.after).digest('hex'),
          })
      )
    );
    const preview = {
      primaryBranch: location ? authorityGit(root, ['branch', '--show-current']).trim() : null,
      ownedDirtyPaths: [],
      inventory: inventory ?? null,
      primaryCommand: location
        ? `cd ${JSON.stringify(root)} && peer-review setup --update --scope project --dry-run`
        : null,
    };
    if (options.dryRun)
      return Object.freeze({
        schema: 'ai-peer-review.setup-result/v1',
        ...preview,
        scope,
        primaryRoot: scope === 'project' ? root : null,
        writes: changes,
        applied: 0,
        dryRun: true,
      });
    const checkAuthority = async () => {
      await beforeEffect?.();
      if (location) {
        const current = await readPrimaryRegistration(location, {
          signal: options.signal,
          deadline: options.deadline,
        });
        await assertPrimaryRegistrationGeneration(registration, current);
      }
    };
    const result = await applyAtomicValidatedWrites(
      [checked, userChecked, localChecked].filter(Boolean),
      { beforeEffect: checkAuthority }
    );
    return Object.freeze({
      schema: 'ai-peer-review.setup-result/v1',
      scope,
      primaryRoot: scope === 'project' ? root : null,
      writes: changes,
      applied: result.applied,
      dryRun: false,
    });
  }
  async function setup(options = {}) {
    const context = Object.freeze({
      signal: options.signal ?? new AbortController().signal,
      deadline: options.deadline ?? performance.now() + 30000,
    });
    await admit(context);
    if (options.scope === 'user')
      return setupUnchecked({ ...options, ...context }, () => admit(context));
    const location = await discoverAuthorityRepository(options.cwd ?? process.cwd(), context);
    return admission.run(
      { commonDir: location.commonDir, dryRun: options.dryRun, ...context },
      async (fence, original) => {
        await admission.assert(fence, original);
        const beforeEffect = async () => {
          await admit(original);
          await admission.assert(fence, original);
        };
        const result = await setupUnchecked({ ...options, ...original }, beforeEffect);
        await admission.assert(fence, original);
        return result;
      }
    );
  }
  const checker = createIntegrationChecker({ packageRoot, home });
  async function inspectIntegration({ cwd = process.cwd() } = {}) {
    await admit();
    return checker.check(await resolvePrimaryAuthoritySync({ cwd }));
  }
  return Object.freeze({
    setup,
    inspectIntegration,
    ...createPrimaryMaintenanceCore({
      packageRoot,
      home,
      admit,
      integrationContract: INTEGRATION_CONTRACT,
      admission,
    }),
  });
}
