// @story #134
import path from 'node:path';
import { withPrimaryAdmissionFence, assertPrimaryAdmissionFence } from './primary-admission.mjs';
import { ownedContentDigest } from './owned-content-digest.mjs';
import { createIntegrationChecker } from './integration-contract-core.mjs';
import { lstatSync, readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { AprError } from '../errors.mjs';

import { initializePortableSystem } from '../broker/portable-system.mjs';
import { performance } from 'node:perf_hooks';
import {
  readPrimaryRegistration,
  discoverPrimaryAuthorityRepository,
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
async function primaryLocation(cwd, context) {
  const location = await discoverPrimaryAuthorityRepository(cwd, context);
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
async function committed(location, context) {
  const system = await initializePortableSystem(context);
  const observation = await system.primaryPolicy({ root: location.root, blobs: null });
  const owned = {};
  let offset = 0;
  for (const [name, relative] of [
    ['config', PRIMARY_CONFIG_PATH],
    ['skill', PRIMARY_SKILL_PATH],
  ]) {
    const tree =
      observation.tree
        .split('\0')
        .filter((line) => line.endsWith('\t' + relative))
        .join('') + '\0';
    const entry = /^(100644|100755) blob ([0-9a-f]+)\t([^\0]+)\0$/.exec(tree);
    const index =
      observation.index
        .split('\0')
        .filter((line) => line.endsWith('\t' + relative))
        .join('') + '\0';
    const stage = /^(100644|100755) ([0-9a-f]+) 0\t([^\0]+)\0$/.exec(index);
    const end = observation.batch.indexOf(10, offset);
    const header =
      end >= 0
        ? /^([a-f0-9]+) blob ([0-9]+)$/.exec(
            observation.batch.subarray(offset, end).toString('ascii')
          )
        : null;
    const size = header ? Number(header[2]) : NaN;
    if (
      !entry ||
      !stage ||
      !header ||
      !Number.isSafeInteger(size) ||
      size > 1048576 ||
      header[1] !== entry[2] ||
      entry[2] !== stage[2] ||
      entry[1] !== stage[1] ||
      entry[3] !== relative ||
      stage[3] !== relative ||
      observation.batch[end + 1 + size] !== 10 ||
      !observation.batch.subarray(end + 1, end + 1 + size).equals(ordinary(location.root, relative))
    )
      unavailable('Primary policy must be clean and committed before activation.', {
        path: relative,
        primaryRoot: location.root,
      });
    offset = end + 2 + size;
    owned[name] = { path: relative, blob: entry[2] };
  }
  if (offset !== observation.batch.length)
    unavailable('Primary policy batch contains unexpected output.');
  return owned;
}
const retainedRegistrationGuards = new Set();
export async function retryPrimaryMaintenanceCleanup() {
  for (const guard of retainedRegistrationGuards) {
    await guard.close();
    retainedRegistrationGuards.delete(guard);
  }
}
async function withRegistrationStore(location, context, create, operation) {
  const system = await initializePortableSystem(context);
  const root = path.dirname(primaryRegistrationPath(location.commonDir));
  let receipt = await system.observeProtection({ root });
  if (!receipt.verified && create) {
    try {
      lstatSync(root);
      unavailable('Existing primary registration protection is unavailable.');
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
    const { provisionProtectedRoot } = await import('../broker/storage-protection.mjs');
    receipt = await provisionProtectedRoot({ root, ...context });
  }
  if (!receipt.verified) unavailable('Primary registration protection is unavailable.');
  const guard = await system.openProtectedRoot({ receipt });
  try {
    return await operation(guard);
  } finally {
    try {
      await guard.close();
    } catch (error) {
      retainedRegistrationGuards.add(guard);
      throw error;
    }
  }
}
async function writeRecord(location, before, after, operation, fence, context, assertAdmission) {
  await assertAdmission(fence, context);
  const receipt = Object.freeze({
    schema: 'ai-peer-review.primary-maintenance-receipt/v1',
    operation,
    before: before?.record ?? null,
    before_bytes_base64: before?.bytes.toString('base64') ?? null,
    after,
    created_at: new Date().toISOString(),
  });
  await withRegistrationStore(location, context, true, async (guard) => {
    await assertAdmission(fence, context);
    await guard.writeExclusive('receipt-' + randomUUID() + '.json', Buffer.from(stable(receipt)));
    await assertAdmission(fence, context);
    const name = 'primary-activation.json';
    let observed = null;
    try {
      observed = await guard.read(name);
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
    if (
      (before === null && observed !== null) ||
      (before !== null && !observed?.equals(before.bytes))
    )
      unavailable('Primary registration changed before maintenance write.');
    await assertAdmission(fence, context);
    const bytes = Buffer.from(stable(after));
    if (before === null) await guard.writeExclusive(name, bytes);
    else await guard.replace(name, before.bytes, bytes);
    await assertAdmission(fence, context);
    const actual = await guard.read(name);
    if (!actual.equals(bytes)) unavailable('Primary registration read-back disagrees.');
    await guard.verify();
  });
  return receipt;
}
export function createPrimaryMaintenance(options) {
  return createPrimaryMaintenanceCore({
    ...options,
    admission: {
      run: withPrimaryAdmissionFence,
      assert: assertPrimaryAdmissionFence,
    },
  });
}
// Explicit protocol core; injected fixture admission never enters production fence membership.
export function createPrimaryMaintenanceCore({
  packageRoot,
  home,
  admit,
  integrationContract,
  admission,
}) {
  if (typeof admission?.run !== 'function' || typeof admission?.assert !== 'function')
    throw new TypeError('Explicit primary admission ports required.');
  async function activate(
    { cwd = process.cwd(), dryRun = false, expectedOwnedBlobs, inventory, signal, deadline } = {},
    fence
  ) {
    const context = { signal, deadline };
    await admit(context);
    const location = await primaryLocation(cwd, context),
      before = await readPrimaryRegistration(location, context);
    const observed = await inspectPrimaryReviewInventory(
      location.commonDir,
      location.root,
      context
    );
    if (inventory)
      await assertPrimaryInventoryObservation(
        inventory,
        location.commonDir,
        location.root,
        context
      );
    const owned = await committed(location, context);
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
    await admit(context);
    await assertPrimaryInventoryObservation(observed, location.commonDir, location.root, context);
    if (
      JSON.stringify(await committed(location, context)) !== JSON.stringify(owned) ||
      !(await readPrimaryRegistration(location, context)).bytes.equals(before.bytes)
    )
      unavailable('Primary policy changed during activation.');
    checker.check(prospective, { primaryOnly: true });
    if (dryRun) return Object.freeze({ before: before.record, after, inventory: observed });
    await writeRecord(location, before, after, 'activate', fence, context, admission.assert);
    return await resolvePrimaryAuthoritySync({ cwd, ...context });
  }
  async function register(
    { cwd = process.cwd(), dryRun = false, update = false, signal, deadline } = {},
    fence
  ) {
    const context = { signal, deadline };
    await admit(context);
    const location = await primaryLocation(cwd, context);
    let before = null;
    try {
      before = await readPrimaryRegistration(location, context);
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
        const bytes = await withRegistrationStore(location, context, false, (guard) =>
          guard.read(path.basename(file))
        );
        before = { record: null, bytes };
      }
    }
    if (before && !update)
      unavailable('Existing registration requires explicit --update inspection.');
    const inventory = await inspectPrimaryReviewInventory(
      location.commonDir,
      location.root,
      context
    );
    const after = before?.record ?? {
      schema: PRIMARY_ACTIVATION_SCHEMA,
      primary_root: location.root,
      common_dir: location.commonDir,
      primary_initialized: false,
      integration_contract: null,
      owned_blobs: null,
    };
    await admit(context);
    await assertPrimaryInventoryObservation(inventory, location.commonDir, location.root, context);
    if (dryRun)
      return Object.freeze({
        before: before?.record ?? null,
        before_bytes_base64: before?.bytes.toString('base64') ?? null,
        after,
        inventory,
      });
    if (before?.record && stable(before.record) === stable(after)) return before.record;
    await writeRecord(location, before, after, 'register', fence, context, admission.assert);
    return (await readPrimaryRegistration(location, context)).record;
  }
  const guarded =
    (operation) =>
    async (options = {}) => {
      const original = Object.freeze({
        signal: options.signal ?? new AbortController().signal,
        deadline: options.deadline ?? performance.now() + 30000,
      });
      await admit(original);
      const location = await primaryLocation(options.cwd ?? process.cwd(), original);
      return admission.run(
        { commonDir: location.commonDir, dryRun: options.dryRun, ...original },
        (fence, context) => operation({ ...options, ...context }, fence)
      );
    };
  return Object.freeze({
    verified: false,
    activate: guarded(activate),
    register: guarded(register),
  });
}
