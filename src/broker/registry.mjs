import { existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, realpathSync } from 'node:fs';
import path from 'node:path';

import { AprError } from '../errors.mjs';
import { atomicCreate } from '../protocol/store.mjs';
import { verifyRuntimeImage } from './runtime-image.mjs';

const REGISTRATION_SCHEMA = 'ai-peer-review.broker-registration/v1';
const DIGEST_RE = /^[a-f0-9]{64}$/;
const REGISTRATION_FIELDS = [
  'created_at',
  'project_digest',
  'project_root',
  'request_digest',
  'review_id',
  'runtime',
  'schema',
  'workspace',
];
const RUNTIME_FIELDS = ['digest', 'entrypoint', 'nodeExecutable', 'root'];

function failure(code, message, recovery, details = {}, cause) {
  const error = new AprError(code, message, { recovery, details });
  if (cause !== undefined) error.cause = cause;
  return error;
}

function contained(parent, candidate) {
  const relative = path.relative(parent, candidate);
  return (
    relative !== '' &&
    relative !== '..' &&
    !relative.startsWith(`..${path.sep}`) &&
    !path.isAbsolute(relative)
  );
}

function physicalDirectory(directory, code, label) {
  let status;
  try {
    status = lstatSync(directory);
  } catch (cause) {
    throw failure(
      code,
      `${label} is missing or unreadable.`,
      'Restore the exact non-symlink project-owned directory and retry.',
      { directory },
      cause
    );
  }
  if (!status.isDirectory() || status.isSymbolicLink() || realpathSync(directory) !== directory) {
    throw failure(
      code,
      `${label} is not its canonical physical directory.`,
      'Use the exact non-symlink project-owned directory and retry.',
      { directory }
    );
  }
}

function inspectOwnedDirectoryChain(root, target, code, label) {
  physicalDirectory(root, code, 'Project root');
  if (target !== root && !contained(root, target)) {
    throw failure(
      code,
      `${label} is outside the project root.`,
      'Use the exact project-owned path.',
      { root, target }
    );
  }
  const segments = path.relative(root, target).split(path.sep).filter(Boolean);
  let current = root;
  for (const segment of segments) {
    current = path.join(current, segment);
    if (!existsSync(current)) break;
    physicalDirectory(current, code, label);
  }
}

function ensureOwnedDirectoryChain(root, target, code, label) {
  inspectOwnedDirectoryChain(root, target, code, label);
  const segments = path.relative(root, target).split(path.sep).filter(Boolean);
  let current = root;
  for (const segment of segments) {
    current = path.join(current, segment);
    if (!existsSync(current)) mkdirSync(current, { mode: 0o700 });
    physicalDirectory(current, code, label);
  }
}

function canonicalProject(project) {
  if (
    !project ||
    !DIGEST_RE.test(project.digest ?? '') ||
    typeof project.physicalRoot !== 'string' ||
    !path.isAbsolute(project.physicalRoot) ||
    path.resolve(project.physicalRoot) !== project.physicalRoot
  ) {
    throw failure(
      'APR_BROKER_REGISTRATION_INVALID',
      'Project identity is incomplete or noncanonical.',
      'Recompute the exact canonical project identity and retry registration.'
    );
  }
  physicalDirectory(project.physicalRoot, 'APR_BROKER_REGISTRATION_INVALID', 'Project root');
  return project;
}

function registrationRoot(project, store, { recovery = false } = {}) {
  const expected = path.join(
    project.physicalRoot,
    '.scratch',
    'peer-review',
    'broker',
    'registrations'
  );
  const actual = path.resolve(typeof store === 'string' ? store : (store?.root ?? ''));
  if (actual !== expected) {
    throw failure(
      'APR_BROKER_REGISTRATION_INVALID',
      'Registration store is outside the project-local broker authority path.',
      `Use the exact project-owned registration directory: ${expected}`,
      { expected, actual }
    );
  }
  inspectOwnedDirectoryChain(
    project.physicalRoot,
    actual,
    recovery ? 'APR_BROKER_REGISTRATION_RECOVERY_REQUIRED' : 'APR_BROKER_REGISTRATION_INVALID',
    'Registration store'
  );
  return actual;
}

function canonicalWorkspace(project, workspace) {
  if (
    typeof workspace !== 'string' ||
    !path.isAbsolute(workspace) ||
    path.resolve(workspace) !== workspace
  ) {
    throw failure(
      'APR_BROKER_REGISTRATION_INVALID',
      'Review workspace must be a canonical absolute path.',
      'Use the exact project-owned review workspace path.',
      { workspace }
    );
  }
  const reviewRoot = path.join(project.physicalRoot, '.scratch', 'peer-review', 'reviews');
  if (!contained(reviewRoot, workspace)) {
    throw failure(
      'APR_BROKER_REGISTRATION_INVALID',
      'Review workspace is outside the project-owned review root.',
      'Use the exact project-owned review workspace path.',
      { workspace }
    );
  }
  let status;
  try {
    status = lstatSync(workspace);
  } catch (cause) {
    throw failure(
      'APR_BROKER_REGISTRATION_INVALID',
      'Review workspace is missing or unreadable.',
      'Restore the exact review workspace before registration.',
      { workspace },
      cause
    );
  }
  if (!status.isDirectory() || status.isSymbolicLink()) {
    throw failure(
      'APR_BROKER_REGISTRATION_INVALID',
      'Review workspace is not an owned directory.',
      'Use the exact non-symlink project review workspace.',
      { workspace }
    );
  }
  if (realpathSync(workspace) !== workspace) {
    throw failure(
      'APR_BROKER_REGISTRATION_INVALID',
      'Review workspace has a symbolic-link or noncanonical ancestor.',
      'Use the exact non-symlink project review workspace.',
      { workspace }
    );
  }
  const reviewId = path.basename(workspace);
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(reviewId)) {
    throw failure(
      'APR_BROKER_REGISTRATION_INVALID',
      'Review workspace name cannot serve as a durable review ID.',
      'Use the sealed safe review ID as the workspace basename.',
      { reviewId }
    );
  }
  return { workspace, reviewId };
}

function runtimeRecord(runtime) {
  if (!verifyRuntimeImage(runtime)) {
    throw failure(
      'APR_BROKER_RUNTIME_MISSING',
      'Registered runtime image is missing, incomplete, or no longer matches its manifest.',
      'Fence broker automation, preserve the registration, and restore or explicitly recover the exact immutable runtime image.',
      { runtimeRoot: runtime?.root ?? null }
    );
  }
  return Object.freeze({
    root: runtime.root,
    entrypoint: runtime.entrypoint,
    nodeExecutable: runtime.nodeExecutable,
    digest: runtime.digest,
  });
}

function stableFields(registration) {
  return {
    schema: registration.schema,
    review_id: registration.review_id,
    project_digest: registration.project_digest,
    project_root: registration.project_root,
    workspace: registration.workspace,
    request_digest: registration.request_digest,
    runtime: registration.runtime,
  };
}

function sameRegistration(left, right) {
  return (
    validRegistrationShape(left) &&
    JSON.stringify(stableFields(left)) === JSON.stringify(stableFields(right))
  );
}

function exactFields(value, fields) {
  return (
    value &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    Object.keys(value).sort().join('\n') === fields.join('\n')
  );
}

function validRegistrationShape(registration) {
  if (
    !exactFields(registration, REGISTRATION_FIELDS) ||
    !exactFields(registration.runtime, RUNTIME_FIELDS) ||
    registration.schema !== REGISTRATION_SCHEMA ||
    !/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(registration.review_id ?? '') ||
    !DIGEST_RE.test(registration.project_digest ?? '') ||
    !DIGEST_RE.test(registration.request_digest ?? '') ||
    !/^sha256:[a-f0-9]{64}$/.test(registration.runtime.digest ?? '')
  ) {
    return false;
  }
  try {
    return new Date(registration.created_at).toISOString() === registration.created_at;
  } catch {
    return false;
  }
}

function readRegistration(file) {
  let value;
  try {
    const status = lstatSync(file);
    if (!status.isFile() || status.isSymbolicLink()) return null;
    value = JSON.parse(readFileSync(file, 'utf8'));
  } catch (cause) {
    throw failure(
      'APR_BROKER_REGISTRATION_RECOVERY_REQUIRED',
      'A durable broker registration is unreadable or malformed.',
      'Fence broker automation, preserve the registration bytes, and reconcile them against exact review authority.',
      { file },
      cause
    );
  }
  return value;
}

function result(registration, file) {
  return Object.freeze({
    ...registration,
    runtime: Object.freeze({ ...registration.runtime }),
    registration_file: file,
  });
}

function registrationConflict(file, existing, requested) {
  throw failure(
    'APR_BROKER_REGISTRATION_CONFLICT',
    'Review ID is already bound to different immutable registration evidence.',
    'Preserve the existing registration, inspect its exact request digest, workspace, and runtime image, then use explicit recovery.',
    {
      file,
      existing_request_digest: existing?.request_digest ?? null,
      requested_request_digest: requested.request_digest,
    }
  );
}

export function registerReview({ project, requestDigest, workspace, runtime } = {}, store) {
  const identity = canonicalProject(project);
  if (!DIGEST_RE.test(requestDigest ?? '')) {
    throw failure(
      'APR_BROKER_REGISTRATION_INVALID',
      'Review request digest is invalid.',
      'Use the exact lowercase SHA-256 digest of the sealed startup request.',
      { requestDigest }
    );
  }
  const location = canonicalWorkspace(identity, workspace);
  const root = registrationRoot(identity, store);
  const runtimeValue = runtimeRecord(runtime);
  const registration = {
    schema: REGISTRATION_SCHEMA,
    review_id: location.reviewId,
    project_digest: identity.digest,
    project_root: identity.physicalRoot,
    workspace: location.workspace,
    request_digest: requestDigest,
    runtime: runtimeValue,
    created_at:
      typeof store?.now === 'function'
        ? new Date(store.now()).toISOString()
        : new Date().toISOString(),
  };
  const file = path.join(root, `${location.reviewId}.json`);
  ensureOwnedDirectoryChain(
    identity.physicalRoot,
    root,
    'APR_BROKER_REGISTRATION_INVALID',
    'Registration store'
  );
  if (lstatExists(file)) {
    const existing = readRegistration(file);
    if (!sameRegistration(existing, registration))
      registrationConflict(file, existing, registration);
    return result(existing, file);
  }
  try {
    const payload = `${JSON.stringify(registration)}\n`;
    atomicCreate(file, payload);
    inspectOwnedDirectoryChain(
      identity.physicalRoot,
      root,
      'APR_BROKER_REGISTRATION_INVALID',
      'Registration store'
    );
    if (readFileSync(file, 'utf8') !== payload) registrationConflict(file, null, registration);
  } catch (cause) {
    if (cause?.code !== 'APR_OUTPUT_COLLISION') throw cause;
    const existing = readRegistration(file);
    if (!sameRegistration(existing, registration))
      registrationConflict(file, existing, registration);
    return result(existing, file);
  }
  return result(registration, file);
}

function lstatExists(file) {
  try {
    lstatSync(file);
    return true;
  } catch (error) {
    if (error?.code === 'ENOENT') return false;
    throw error;
  }
}

function ownedRegistration(project, root, file, registration) {
  if (
    !validRegistrationShape(registration) ||
    registration.project_digest !== project.digest ||
    registration.project_root !== project.physicalRoot ||
    typeof registration.review_id !== 'string' ||
    file !== path.join(root, `${registration.review_id}.json`) ||
    typeof registration.workspace !== 'string'
  ) {
    return false;
  }
  const reviewRoot = path.join(project.physicalRoot, '.scratch', 'peer-review', 'reviews');
  return (
    contained(reviewRoot, registration.workspace) &&
    path.basename(registration.workspace) === registration.review_id
  );
}

function reviewWorkspaces(project) {
  const root = path.join(project.physicalRoot, '.scratch', 'peer-review', 'reviews');
  if (!lstatExists(root)) return [];
  let status;
  try {
    status = lstatSync(root);
  } catch (cause) {
    throw failure(
      'APR_BROKER_REGISTRATION_RECOVERY_REQUIRED',
      'Project review root cannot be inspected safely.',
      'Fence broker automation, preserve project scratch evidence, and restore exact read access.',
      { root },
      cause
    );
  }
  if (!status.isDirectory() || status.isSymbolicLink()) {
    throw failure(
      'APR_BROKER_REGISTRATION_RECOVERY_REQUIRED',
      'Project review root is not an owned directory.',
      'Fence broker automation and restore the exact non-symlink project review root.',
      { root }
    );
  }
  return readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(entry.name))
    .map((entry) => path.join(root, entry.name))
    .filter((workspace) => {
      const entry = lstatSync(workspace);
      return entry.isDirectory() && !entry.isSymbolicLink();
    })
    .sort();
}

function authorityFailure(message, details = {}, cause) {
  throw failure(
    'APR_BROKER_REGISTRATION_RECOVERY_REQUIRED',
    message,
    'Fence broker automation, preserve registration, event, and output-reservation evidence, then reconcile their exact values manually.',
    details,
    cause
  );
}

async function inspectWorkspaceAuthority(inspectAuthority, project, workspace, registration) {
  try {
    return await inspectAuthority({
      project,
      reviewId: workspace === null ? null : path.basename(workspace),
      workspace,
      registration,
    });
  } catch (cause) {
    authorityFailure(
      'Review authority could not be inspected for a contained workspace.',
      { workspace },
      cause
    );
  }
}

export async function reconcileRegistrations({ project, store, inspectAuthority } = {}) {
  const identity = canonicalProject(project);
  const root = registrationRoot(identity, store, { recovery: true });
  if (typeof inspectAuthority !== 'function') {
    throw failure(
      'APR_BROKER_REGISTRATION_RECOVERY_REQUIRED',
      'Registration reconciliation has no review-authority inspector.',
      'Fence broker automation and retry with the exact event and output-reservation authority inspector.'
    );
  }
  const registrations = new Map();
  if (lstatExists(root)) {
    const storeStatus = lstatSync(root);
    if (!storeStatus.isDirectory() || storeStatus.isSymbolicLink()) {
      authorityFailure('Project registration store is not an owned directory.', { root });
    }
    let names;
    try {
      names = readdirSync(root)
        .filter((name) => name.endsWith('.json'))
        .sort();
    } catch (cause) {
      authorityFailure('Project registration store cannot be enumerated safely.', { root }, cause);
    }
    for (const name of names) {
      const file = path.join(root, name);
      const registration = readRegistration(file);
      if (!registration) continue;
      const claimsProject =
        registration.project_digest === identity.digest ||
        registration.project_root === identity.physicalRoot;
      if (claimsProject && !validRegistrationShape(registration)) {
        authorityFailure('Claimed project registration is outside the closed record schema.', {
          file,
        });
      }
      if (!ownedRegistration(identity, root, file, registration)) {
        if (claimsProject) {
          authorityFailure('Claimed project registration contradicts canonical project identity.', {
            file,
          });
        }
        continue;
      }
      if (!lstatExists(registration.workspace)) {
        authorityFailure('Durable registration references a missing review workspace.', { file });
      }
      physicalDirectory(
        registration.workspace,
        'APR_BROKER_REGISTRATION_RECOVERY_REQUIRED',
        'Registered review workspace'
      );
      runtimeRecord(registration.runtime);
      registrations.set(registration.review_id, result(registration, file));
    }
  }
  const workspaces = new Set(reviewWorkspaces(identity));
  for (const registration of registrations.values()) workspaces.add(registration.workspace);
  if (workspaces.size === 0) {
    const authority = await inspectWorkspaceAuthority(inspectAuthority, identity, null, null);
    if (
      authority?.status !== 'clear' ||
      authority.event_authority !== 'exact' ||
      authority.output_reservation !== 'exact'
    ) {
      authorityFailure('Absent project scratch does not prove that no operation is outstanding.', {
        status: authority?.status ?? null,
      });
    }
    return Object.freeze([]);
  }
  const reconciled = [];
  for (const workspace of [...workspaces].sort()) {
    const reviewId = path.basename(workspace);
    const registration = registrations.get(reviewId) ?? null;
    const authority = await inspectWorkspaceAuthority(
      inspectAuthority,
      identity,
      workspace,
      registration
    );
    if (authority?.status === 'absent' && registration === null) continue;
    if (!['active', 'terminal'].includes(authority?.status)) {
      authorityFailure('Contained review workspace has missing or ambiguous authority.', {
        workspace,
        status: authority?.status ?? null,
      });
    }
    if (authority.event_authority !== 'exact' || authority.output_reservation !== 'exact') {
      authorityFailure('Review event or output-reservation authority is incomplete.', {
        workspace,
      });
    }
    if (
      (authority.review_id !== undefined && authority.review_id !== reviewId) ||
      (authority.workspace !== undefined && authority.workspace !== workspace)
    ) {
      authorityFailure('Observed review authority identifies a different workspace.', {
        workspace,
      });
    }
    let current = registration;
    if (current === null) {
      if (
        !DIGEST_RE.test(authority.request_digest ?? '') ||
        !verifyRuntimeImage(authority.runtime) ||
        authority.runtime_digest !== authority.runtime.digest
      ) {
        authorityFailure('Missing registration cannot be rebuilt from incomplete exact evidence.', {
          workspace,
        });
      }
      current = registerReview(
        {
          project: identity,
          requestDigest: authority.request_digest,
          workspace,
          runtime: authority.runtime,
        },
        store
      );
    }
    for (const [field, expected] of [
      ['request_digest', current.request_digest],
      ['runtime_digest', current.runtime.digest],
    ]) {
      if (authority[field] !== expected) {
        authorityFailure('Durable registration contradicts observed review authority.', {
          file: current.registration_file,
          field,
          expected,
          actual: authority[field] ?? null,
        });
      }
    }
    reconciled.push(current);
  }
  return Object.freeze(reconciled);
}
