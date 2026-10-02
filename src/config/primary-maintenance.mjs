// @story #134
import path from 'node:path';
import { withPrimaryAdmissionFence } from './primary-admission.mjs';
import { ownedContentDigest } from './owned-content-digest.mjs';
import { createIntegrationChecker } from './integration-contract-core.mjs';
import { lstatSync, readFileSync, mkdirSync, writeFileSync, renameSync, rmSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { AprError } from '../errors.mjs';
import { authorityGit, discoverAuthorityRepository } from '../git/repository.mjs';
import { platformSecurity } from '../broker/platform.mjs';
import {
  readPrimaryRegistration,
  primaryRegistrationPath,
  PRIMARY_CONFIG_PATH,
  PRIMARY_SKILL_PATH,
  PRIMARY_ACTIVATION_SCHEMA,
  resolvePrimaryAuthoritySync,
} from './primary-authority.mjs';
import { validatePrimaryStore } from './load.mjs';
import {
  inspectPrimaryReviewInventory,
  assertPrimaryInventoryObservation,
} from './primary-inventory.mjs';
const stable = (value) => JSON.stringify(value) + '\n';
function unavailable(message, details = {}) {
  throw new AprError('APR_PRIMARY_AUTHORITY_UNAVAILABLE', message, {
    recovery: details.primaryRoot
      ? `cd ${JSON.stringify(details.primaryRoot)} && peer-review primary activate --dry-run`
      : 'Inspect the primary Git identity and active-review inventory before explicit maintenance.',
    details,
  });
}
function primaryLocation(cwd) {
  const location = discoverAuthorityRepository(cwd);
  if (location.gitDir !== location.commonDir || location.root !== location.mainRoot)
    unavailable('Maintenance requires the physical primary checkout.', {
      primaryRoot: location.mainRoot,
    });
  return location;
}
function ordinary(root, relative) {
  let current = root;
  for (const segment of relative.split('/')) {
    current = path.join(current, segment);
    const stat = lstatSync(current);
    if (
      stat.isSymbolicLink() ||
      (current !== path.join(root, relative) ? !stat.isDirectory() : !stat.isFile()) ||
      stat.size > 1024 * 1024
    )
      unavailable('Owned primary path is not a bounded ordinary file.', { file: current });
  }
  return readFileSync(current);
}
function committed(location) {
  const owned = {};
  for (const [name, relative] of [
    ['config', PRIMARY_CONFIG_PATH],
    ['skill', PRIMARY_SKILL_PATH],
  ]) {
    const tree = authorityGit(location.root, ['ls-tree', '-z', 'HEAD', '--', relative]);
    const entry = /^(100644|100755) blob ([0-9a-f]+)\t([^\0]+)\0$/.exec(tree);
    const index = authorityGit(location.root, ['ls-files', '--stage', '-z', '--', relative]);
    const stage = /^(100644|100755) ([0-9a-f]+) 0\t([^\0]+)\0$/.exec(index);
    if (
      !entry ||
      !stage ||
      entry[2] !== stage[2] ||
      entry[1] !== stage[1] ||
      entry[3] !== relative ||
      stage[3] !== relative ||
      !authorityGit(location.root, ['cat-file', 'blob', entry[2]], { buffer: true }).equals(
        ordinary(location.root, relative)
      )
    )
      unavailable('Primary policy must be clean and committed before activation.', {
        path: relative,
        primaryRoot: location.root,
      });
    owned[name] = { path: relative, blob: entry[2] };
  }
  return owned;
}
function writeRecord(location, before, after, operation) {
  const file = primaryRegistrationPath(location.commonDir),
    directory = path.dirname(file);
  mkdirSync(directory, { mode: 0o700, recursive: true });
  const stat = lstatSync(directory);
  if (
    stat.isSymbolicLink() ||
    !stat.isDirectory() ||
    (process.platform !== 'win32' && ((stat.mode & 0o077) !== 0 || stat.uid !== process.getuid()))
  )
    unavailable('Primary registration directory is not private.');
  if (process.platform === 'win32') {
    const handle = platformSecurity().openPrivateDirectory(directory);
    try {
      if (!handle.verify()) unavailable('Windows primary directory ownership is unavailable.');
    } finally {
      handle.close();
    }
  }
  const receipt = Object.freeze({
    schema: 'ai-peer-review.primary-maintenance-receipt/v1',
    operation,
    before: before?.record ?? null,
    before_bytes_base64: before?.bytes.toString('base64') ?? null,
    after,
    created_at: new Date().toISOString(),
  });
  const journal = path.join(directory, 'receipt-' + randomUUID() + '.json');
  writeFileSync(journal, stable(receipt), { flag: 'wx', mode: 0o600 });
  let observed = null;
  try {
    observed = readFileSync(file);
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  if (
    (before === null && observed !== null) ||
    (before !== null && !observed?.equals(before.bytes))
  )
    unavailable('Primary registration changed before maintenance write.');
  const temporary = path.join(directory, '.activation-' + randomUUID() + '.tmp');
  try {
    writeFileSync(temporary, stable(after), { flag: 'wx', mode: 0o600 });
    renameSync(temporary, file);
  } finally {
    rmSync(temporary, { force: true });
  }
  const readBack = readPrimaryRegistration(location);
  if (stable(readBack.record) !== stable(after))
    unavailable('Primary registration read-back disagrees.');
  return receipt;
}
export function createPrimaryMaintenance({ packageRoot, home, admit, integrationContract }) {
  async function activate({
    cwd = process.cwd(),
    dryRun = false,
    expectedOwnedBlobs,
    inventory,
  } = {}) {
    await admit();
    const location = primaryLocation(cwd),
      before = readPrimaryRegistration(location);
    const observed = inspectPrimaryReviewInventory(location.commonDir, location.root);
    if (inventory) assertPrimaryInventoryObservation(inventory, location.commonDir, location.root);
    const owned = committed(location);
    if (expectedOwnedBlobs && JSON.stringify(expectedOwnedBlobs) !== JSON.stringify(owned))
      unavailable('Expected owned blobs disagree with committed policy.');
    const config = validatePrimaryStore(JSON.parse(ordinary(location.root, PRIMARY_CONFIG_PATH)));
    const skill = ordinary(location.root, PRIMARY_SKILL_PATH),
      expected = readFileSync(path.join(packageRoot, 'skills/peer-review/SKILL.md'));
    if (
      config.setup?.integration_contract !== integrationContract ||
      ownedContentDigest(skill) !== ownedContentDigest(expected) ||
      config.setup?.skill_sha256 !== ownedContentDigest(expected)
    )
      unavailable('Committed integration does not match the current package contract.');
    const checker = createIntegrationChecker({ packageRoot, home });
    const prospective = {
      root: location.root,
      activeWorktreeRoot: location.root,
      config,
      skillPath: path.join(location.root, PRIMARY_SKILL_PATH),
      integrationContract,
    };
    checker.check(prospective, { primaryOnly: true });
    const after = {
      ...before.record,
      primary_initialized: true,
      integration_contract: integrationContract,
      owned_blobs: owned,
    };
    await admit();
    assertPrimaryInventoryObservation(observed, location.commonDir, location.root);
    if (
      JSON.stringify(committed(location)) !== JSON.stringify(owned) ||
      !readPrimaryRegistration(location).bytes.equals(before.bytes)
    )
      unavailable('Primary policy changed during activation.');
    checker.check(prospective, { primaryOnly: true });
    if (dryRun) return Object.freeze({ before: before.record, after, inventory: observed });
    writeRecord(location, before, after, 'activate');
    return resolvePrimaryAuthoritySync({ cwd });
  }
  async function register({ cwd = process.cwd(), dryRun = false, update = false } = {}) {
    await admit();
    const location = primaryLocation(cwd);
    let before = null;
    try {
      before = readPrimaryRegistration(location);
    } catch (error) {
      const file = primaryRegistrationPath(location.commonDir);
      let stat;
      try {
        stat = lstatSync(file);
      } catch (cause) {
        if (cause.code !== 'ENOENT') throw cause;
      }
      if (stat) {
        if (!update) throw error;
        const directory = path.dirname(file),
          parent = lstatSync(directory);
        if (
          !stat.isFile() ||
          stat.isSymbolicLink() ||
          stat.size > 1024 * 1024 ||
          !parent.isDirectory() ||
          parent.isSymbolicLink()
        )
          unavailable('Existing registration cannot be safely inspected for repair.');
        let bytes;
        if (process.platform === 'win32') {
          const handle = platformSecurity().openPrivateDirectory(directory);
          try {
            bytes = handle.read(path.basename(file));
            if (!bytes || !handle.verify()) unavailable('Repair ownership cannot be proven.');
          } finally {
            handle.close();
          }
        } else {
          if (
            [stat, parent].some(
              (value) => (value.mode & 0o077) !== 0 || value.uid !== process.getuid()
            )
          )
            unavailable('Repair registration is not account-private.');
          bytes = readFileSync(file);
        }
        before = { record: null, bytes };
      }
    }
    if (before && !update)
      unavailable('Existing registration requires explicit --update inspection.');
    const inventory = inspectPrimaryReviewInventory(location.commonDir, location.root);
    const after = before?.record ?? {
      schema: PRIMARY_ACTIVATION_SCHEMA,
      primary_root: location.root,
      common_dir: location.commonDir,
      primary_initialized: false,
      integration_contract: null,
      owned_blobs: null,
    };
    await admit();
    assertPrimaryInventoryObservation(inventory, location.commonDir, location.root);
    if (dryRun)
      return Object.freeze({
        before: before?.record ?? null,
        before_bytes_base64: before?.bytes.toString('base64') ?? null,
        after,
        inventory,
      });
    if (before?.record && stable(before.record) === stable(after)) return before.record;
    writeRecord(location, before, after, 'register');
    return readPrimaryRegistration(location).record;
  }
  const guarded =
    (operation) =>
    async (options = {}) => {
      await admit();
      const location = primaryLocation(options.cwd ?? process.cwd());
      return withPrimaryAdmissionFence(
        { commonDir: location.commonDir, dryRun: options.dryRun },
        () => operation(options)
      );
    };
  return Object.freeze({ activate: guarded(activate), register: guarded(register) });
}
