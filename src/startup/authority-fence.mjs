import { existsSync, lstatSync, realpathSync } from 'node:fs';
import path from 'node:path';
import { initializePortableSystem } from '../broker/portable-system.mjs';
import { performance } from 'node:perf_hooks';
import { AsyncLocalStorage } from 'node:async_hooks';
import {
  withPrimaryAdmissionFence,
  assertPrimaryAdmissionFence,
} from '../config/primary-admission.mjs';
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
import {
  resolvePrimaryAuthoritySync,
  assertPrimaryAuthorityGeneration,
} from '../config/primary-authority.mjs';
import { createIntegrationChecker } from '../config/integration-contract-core.mjs';
import { verifyRuntimeInventorySync } from './runtime-inventory.mjs';

const packageRoot = fileURLToPath(new URL('../..', import.meta.url));
const digest = (bytes) => 'sha256:' + createHash('sha256').update(bytes).digest('hex');
const nodeIdentity = (stat) =>
  [stat.dev, stat.ino, stat.size, stat.mode, stat.mtimeNs, stat.ctimeNs].join(':');
let nodeAtStart;
const fences = new WeakMap();
const operationContext = new AsyncLocalStorage();
const effectContext = new AsyncLocalStorage();
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
async function selectionSnapshot(file, context) {
  const system = await initializePortableSystem(context);
  const receipt = await system.observeProtection({ root: path.dirname(file) });
  if (!receipt.verified) refuse('Selection protection is unavailable.');
  const handle = await system.openProtectedRoot({ receipt });
  try {
    const snapshot = await handle.readSnapshot(path.basename(file), 8192);
    const bytes = snapshot.bytes;
    if (bytes.length > 8192) refuse('Selection exceeds its read bound.');
    await handle.verify();
    return snapshot;
  } finally {
    await handle.close();
  }
}
async function observePrimary(cwd, context) {
  const primary = await resolvePrimaryAuthoritySync({ cwd, ...context });
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
// Every effect awaits fresh protected authority under the original context.
// Only tokens minted here carry production authority.
export async function assertOperationAuthorityNow(fence) {
  const seal = fences.get(fence);
  if (!seal) refuse('Authority fence is not an authenticated observation.');
  if (seal.kind === 'read') return fence;
  if (
    nodeIdentity(lstatSync(realpathSync(process.execPath), { bigint: true })) !== seal.nodeIdentity
  )
    refuse('Node identity changed after process startup.');
  const selection = await selectionSnapshot(seal.selectionPath, seal.context);
  if (
    digest(selection.bytes) !== seal.selectionDigest ||
    ['identity', 'fileVersion', 'rootIdentity', 'parentIdentity', 'location'].some(
      (key) => selection[key] !== seal.selectionSnapshot[key]
    )
  )
    refuse('Selected runtime physical generation changed during the operation.');
  const inventory = verifyRuntimeInventorySync({
    packageRoot,
    previousObservation: seal.runtime.inventory,
  });
  if (inventory.inventoryDigest !== seal.runtime.inventoryDigest)
    refuse('Runtime changed during the operation.');
  const observed = await observePrimary(seal.cwd, seal.context);
  await assertPrimaryAuthorityGeneration(seal.primary, observed.primary);
  if (
    observed.primary.activationDigest !== seal.primary.activationDigest ||
    observed.primary.activeWorktreeRoot !== seal.primary.activeWorktreeRoot ||
    observed.integrationDigest !== seal.integrationDigest
  )
    refuse('Primary activation or integration changed during the operation.');
  assertReviewAuthority(seal);
  if (seal.context.signal.aborted || performance.now() >= seal.context.deadline)
    refuse('Original operation context was aborted or expired.');
  if (
    nodeIdentity(lstatSync(realpathSync(process.execPath), { bigint: true })) !== seal.nodeIdentity
  )
    refuse('Node identity changed during protected authority observation.');
  verifyRuntimeInventorySync({ packageRoot, previousObservation: seal.runtime.inventory });
  return fence;
}
export async function assertOperationAuthority({
  operation,
  cwd = process.cwd(),
  reviewWorkspace,
  reviewContext,
  signal,
  deadline,
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
  const parentSeal = parent ? fences.get(parent) : null;
  if (parentSeal && parentSeal.kind !== 'read' && cwd === parentSeal.cwd) {
    const seal = { ...parentSeal, kind, reviewWorkspace, reviewContext };
    if (
      reviewContext &&
      realpathSync(reviewContext.repository_root) !== seal.primary.activeWorktreeRoot
    )
      refuse('Review context belongs to a different physical worktree.');
    assertReviewAuthority(seal);
    // Parent revalidation above completed both asynchronous runtime admission
    // and the final synchronous physical observation. No promise boundary lies
    // between that observation and this child seal. Effects and post-operation
    // validation still make their own fresh observations.
    fences.set(fence, seal);
    return fence;
  }
  const context = Object.freeze({
    signal: signal ?? new AbortController().signal,
    deadline: deadline ?? performance.now() + 30000,
  });
  const runtime = await assertSelectedRuntime(context);
  const currentNode = nodeIdentity(lstatSync(realpathSync(process.execPath), { bigint: true }));
  if (nodeAtStart === undefined) nodeAtStart = currentNode;
  else if (nodeAtStart !== currentNode)
    refuse('Node identity changed after its first admitted observation.');
  const selectionPath = await verifiedAccountSelectionPath(context);
  const selectedSnapshot = await selectionSnapshot(selectionPath, context);
  const selection = selectedSnapshot.bytes;
  const record = JSON.parse(selection);
  if (
    record.selection_id !== runtime.selection_id ||
    record.package_root !== runtime.packageRoot ||
    record.node_executable !== runtime.nodeExecutable
  )
    refuse('Selection changed between runtime admission and fence sealing.');
  const observation = await observePrimary(cwd, context);
  if (parent) {
    await assertOperationAuthorityNow(parent);
    const parentSeal = fences.get(parent);
    if (
      parentSeal.kind === 'read' ||
      parentSeal.primary.activeWorktreeRoot !== observation.primary.activeWorktreeRoot
    )
      refuse('Nested operation cannot change its admitted physical worktree.');
  }
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
    context,
    nodeIdentity: currentNode,
    selectionDigest: digest(selection),
    selectionSnapshot: selectedSnapshot,
    ...observation,
  });
  await assertOperationAuthorityNow(fence);
  return fence;
}
export async function revalidateOperationAuthority(fence) {
  const seal = fences.get(fence);
  if (!seal) refuse('Authority fence is not an authenticated observation.');
  if (seal.kind !== 'read')
    await assertSelectedRuntime({ previousObservation: seal.runtime, ...seal.context });
  return await assertOperationAuthorityNow(fence);
}

export async function withOperationAuthority(input, operation) {
  const fence = await assertOperationAuthority(input);
  return operationContext.run(fence, async () => {
    const result = await operation(fence);
    await revalidateOperationAuthority(fence);
    return result;
  });
}
export async function performOperationEffect(fence, operation) {
  await assertOperationAuthorityNow(fence);
  const seal = fences.get(fence);
  if (seal.kind === 'read') refuse('Read authority cannot perform effects.');
  const inherited = effectContext.getStore();
  if (inherited?.fence === fence) {
    if (!inherited.active) refuse('An inherited effect outlived its held primary generation.');
    await assertPrimaryAdmissionFence(inherited.admission, seal.context);
    return operation();
  }
  return withPrimaryAdmissionFence(
    { commonDir: seal.primary.commonDir, ...seal.context },
    async (admission) => {
      await assertOperationAuthorityNow(fence);
      const held = { fence, admission, active: true };
      try {
        return await effectContext.run(held, async () => {
          await assertPrimaryAdmissionFence(admission, seal.context);
          await assertOperationAuthorityNow(fence);
          const result = await operation();
          await assertOperationAuthorityNow(fence);
          await assertPrimaryAdmissionFence(admission, seal.context);
          return result;
        });
      } finally {
        held.active = false;
      }
    }
  );
}
export async function performCurrentOperationEffect(operation) {
  const fence = operationContext.getStore();
  if (!fence) refuse('Production effect requires an admitted operation context.');
  return await performOperationEffect(fence, operation);
}

export async function assertCurrentOperationAuthority() {
  const fence = operationContext.getStore();
  if (!fence) refuse('Production operation has no admitted context.');
  return await assertOperationAuthorityNow(fence);
}
