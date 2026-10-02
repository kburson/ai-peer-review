import { existsSync, lstatSync, realpathSync } from 'node:fs';
import path from 'node:path';
import { platformSecurity } from '../broker/platform.mjs';
import { AsyncLocalStorage } from 'node:async_hooks';
import { withPrimaryAdmissionFenceSync } from '../config/primary-admission.mjs';
// @story #136
import { createHash } from 'node:crypto';
import { userInfo } from 'node:os';
import { fileURLToPath } from 'node:url';
import { inspectReviewAuthority } from '../protocol/service.mjs';
import {
  assertCollateralCompatible,
  readRuntimeCompatibility,
} from '../protocol/compatibility.mjs';
import { AprError } from '../errors.mjs';
import {
  assertSelectedRuntime,
  verifiedAccountSelectionPath,
} from '../config/runtime-selection.mjs';
import { resolvePrimaryAuthoritySync } from '../config/primary-authority.mjs';
import { createIntegrationChecker } from '../config/integration-contract-core.mjs';
import { readBoundedOrdinaryFile, verifyRuntimeInventorySync } from './runtime-inventory.mjs';

const packageRoot = fileURLToPath(new URL('../..', import.meta.url));
const digest = (bytes) => 'sha256:' + createHash('sha256').update(bytes).digest('hex');
const nodeIdentity = (stat) =>
  [stat.dev, stat.ino, stat.size, stat.mode, stat.mtimeNs, stat.ctimeNs].join(':');
const nodeAtStart = nodeIdentity(lstatSync(realpathSync(process.execPath), { bigint: true }));
const fences = new WeakMap();
const operationContext = new AsyncLocalStorage();
const effectsInProgress = new WeakSet();
export const OPERATION_CLASSIFICATION = Object.freeze({
  help: 'read',
  explain: 'read',
  status: 'read',
  doctor: 'read',
  'primary.inspect': 'read',
  'broker.status': 'read',
  'register-runtime': 'maintenance',
  'primary.register': 'maintenance',
  'primary.activate': 'maintenance',
  setup: 'maintenance',
  build: 'maintenance',
  start: 'mutation',
  join: 'mutation',
  advance: 'mutation',
  resume: 'mutation',
  submit: 'mutation',
  supplement: 'mutation',
  continue: 'mutation',
  finalize: 'mutation',
  recover: 'mutation',
  abandon: 'mutation',
  supersede: 'mutation',
  'request-grant': 'mutation',
  'launch-reviewer': 'mutation',
  consolidate: 'mutation',
  'broker.start': 'mutation',
  'broker.reconcile': 'mutation',
  'broker.register': 'mutation',
  'broker.launch': 'mutation',
  'broker.suspend': 'cleanup',
  'broker.stop': 'cleanup',
  'protocol.initialize': 'mutation',
  'protocol.read-repair': 'mutation',
  'protocol.repair': 'mutation',
  'protocol.mutate': 'mutation',
  'protocol.reclaim': 'mutation',
  'protocol.snapshot': 'mutation',
  'protocol.delivery-receipt': 'mutation',
  'mcp.wait': 'mutation',
  'hook.codex': 'mutation',
  'hook.claude': 'mutation',
  'record.apply': 'mutation',
  'provider.launch': 'mutation',
});
function refuse(message) {
  throw new AprError('APR_OPERATION_AUTHORITY_UNAVAILABLE', message, {
    recovery:
      'Retry through a classified entry point under current selected runtime and activated primary policy.',
  });
}
export function classifyOperation(operation) {
  if (!Object.hasOwn(OPERATION_CLASSIFICATION, operation)) refuse('Operation is unclassified.');
  return OPERATION_CLASSIFICATION[operation];
}
function selectionBytes(file) {
  const parent = path.dirname(file),
    stat = lstatSync(file),
    directory = lstatSync(parent);
  if (
    !stat.isFile() ||
    stat.isSymbolicLink() ||
    !directory.isDirectory() ||
    directory.isSymbolicLink() ||
    stat.size > 1048576
  )
    refuse('Selection paths are not bounded ordinary private files.');
  if (process.platform !== 'win32') {
    if (
      stat.uid !== process.getuid() ||
      directory.uid !== process.getuid() ||
      stat.mode & 0o077 ||
      directory.mode & 0o077
    )
      refuse('Selection ownership or privacy changed.');
    return readBoundedOrdinaryFile(file, 1048576);
  }
  const handle = platformSecurity().openPrivateDirectory(parent);
  try {
    const bytes = handle.read(path.basename(file));
    if (bytes === null || !handle.verify()) refuse('Windows selection ownership cannot be proven.');
    return bytes;
  } finally {
    handle.close();
  }
}
function observePrimary(cwd) {
  const primary = resolvePrimaryAuthoritySync({ cwd });
  const integration = createIntegrationChecker({ packageRoot, home: userInfo().homedir }).check(
    primary
  );
  return { primary, integrationDigest: digest(JSON.stringify(integration)) };
}
function assertReviewAuthority(seal) {
  if (!seal.reviewWorkspace) return;
  const workspace = path.resolve(seal.reviewWorkspace);
  let existing = workspace;
  while (!existsSync(existing)) {
    const parent = path.dirname(existing);
    if (parent === existing) refuse('Review location cannot be proven.');
    existing = parent;
  }
  if (realpathSync(existing) !== existing) refuse('Review location traverses a symbolic link.');
  const relative = path.relative(seal.primary.activeWorktreeRoot, workspace);
  if (relative === '..' || relative.startsWith('..' + path.sep) || path.isAbsolute(relative))
    refuse('Review workspace is outside the admitted worktree.');
  if (
    seal.reviewContext &&
    realpathSync(seal.reviewContext.repository_root) !== seal.primary.activeWorktreeRoot
  )
    refuse('Review context belongs to a different physical worktree.');
  if (!existsSync(path.join(workspace, 'events.jsonl'))) return;
  const { events, state } = inspectReviewAuthority(workspace);
  const context = state.protocol.startup?.context;
  if (!context || realpathSync(context.repository_root) !== seal.primary.activeWorktreeRoot)
    refuse('Existing review context belongs to a different physical worktree.');
  assertCollateralCompatible({
    manifest: readRuntimeCompatibility(),
    operation: 'write',
    metadata: [
      ...events.map((event) => ({ contract: 'event', schema: event.schema })),
      { contract: 'protocol', schema: state.protocol.schema },
      { contract: 'participants', schema: state.participants.schema },
      { contract: 'context', schema: context.schema },
      ...(state.protocol.startup?.runtime
        ? [{ contract: 'runtime', schema: state.protocol.startup.runtime.schema }]
        : []),
    ],
  });
}
// The final synchronous check leaves no promise boundary between admission and
// an immediate effect. Only tokens minted here carry production authority.
export function assertOperationAuthorityNow(fence) {
  const seal = fences.get(fence);
  if (!seal) refuse('Authority fence is not an authenticated observation.');
  if (seal.kind === 'read') return fence;
  if (nodeIdentity(lstatSync(realpathSync(process.execPath), { bigint: true })) !== nodeAtStart)
    refuse('Node identity changed after process startup.');
  if (digest(selectionBytes(seal.selectionPath)) !== seal.selectionDigest)
    refuse('Selected runtime generation changed during the operation.');
  const inventory = verifyRuntimeInventorySync({
    packageRoot,
    previousObservation: seal.runtime.inventory,
  });
  if (inventory.inventoryDigest !== seal.runtime.inventoryDigest)
    refuse('Runtime changed during the operation.');
  const observed = observePrimary(seal.cwd);
  if (
    observed.primary.activationDigest !== seal.primary.activationDigest ||
    observed.primary.activeWorktreeRoot !== seal.primary.activeWorktreeRoot ||
    observed.integrationDigest !== seal.integrationDigest
  )
    refuse('Primary activation or integration changed during the operation.');
  assertReviewAuthority(seal);
  return fence;
}
export async function assertOperationAuthority({
  operation,
  cwd = process.cwd(),
  reviewWorkspace,
  reviewContext,
} = {}) {
  const kind = classifyOperation(operation);
  const parent = operationContext.getStore();
  if (parent && kind !== 'read') await revalidateOperationAuthority(parent);
  if (kind === 'maintenance')
    refuse('Maintenance uses its explicit registration, setup or activation transaction.');
  const fence = Object.freeze({ operation, kind });
  if (kind === 'read') {
    fences.set(fence, { kind });
    return fence;
  }
  const runtime = await assertSelectedRuntime();
  const selectionPath = await verifiedAccountSelectionPath();
  const selection = selectionBytes(selectionPath);
  const record = JSON.parse(selection);
  if (
    record.selection_id !== runtime.selection_id ||
    record.package_root !== runtime.packageRoot ||
    record.node_executable !== runtime.nodeExecutable
  )
    refuse('Selection changed between runtime admission and fence sealing.');
  const observation = observePrimary(cwd);
  if (
    reviewContext &&
    realpathSync(reviewContext.repository_root) !== observation.primary.activeWorktreeRoot
  )
    refuse('Review context belongs to a different physical worktree.');
  if (reviewWorkspace) {
    const relative = path.relative(
      observation.primary.activeWorktreeRoot,
      path.resolve(reviewWorkspace)
    );
    if (relative === '..' || relative.startsWith('..' + path.sep) || path.isAbsolute(relative))
      refuse('Review workspace is outside the admitted worktree.');
  }
  fences.set(fence, {
    kind,
    cwd,
    reviewWorkspace,
    reviewContext,
    runtime,
    selectionPath,
    selectionDigest: digest(selection),
    ...observation,
  });
  assertOperationAuthorityNow(fence);
  return fence;
}
export async function revalidateOperationAuthority(fence) {
  const seal = fences.get(fence);
  if (!seal) refuse('Authority fence is not an authenticated observation.');
  if (seal.kind !== 'read') await assertSelectedRuntime({ previousObservation: seal.runtime });
  return assertOperationAuthorityNow(fence);
}

export async function withOperationAuthority(input, operation) {
  const fence = await assertOperationAuthority(input);
  return operationContext.run(fence, async () => {
    const result = await operation(fence);
    await revalidateOperationAuthority(fence);
    return result;
  });
}
export function performOperationEffect(fence, operation) {
  assertOperationAuthorityNow(fence);
  const seal = fences.get(fence);
  if (seal.kind === 'read') refuse('Read authority cannot perform effects.');
  if (effectsInProgress.has(fence)) return operation();
  return withPrimaryAdmissionFenceSync({ commonDir: seal.primary.commonDir }, () => {
    assertOperationAuthorityNow(fence);
    effectsInProgress.add(fence);
    try {
      return operation();
    } finally {
      effectsInProgress.delete(fence);
    }
  });
}
export function performCurrentOperationEffect(operation) {
  const fence = operationContext.getStore();
  if (!fence) refuse('Production effect requires an admitted operation context.');
  return performOperationEffect(fence, operation);
}

export function assertCurrentOperationAuthority() {
  const fence = operationContext.getStore();
  if (!fence) refuse('Production operation has no admitted context.');
  return assertOperationAuthorityNow(fence);
}
