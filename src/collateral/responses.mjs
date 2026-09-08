import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, openSync, closeSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { AprError } from '../errors.mjs';
import { atomicWrite } from '../protocol/store.mjs';
import { hydrateTemplate } from '../templates/index.mjs';
import { resolveContainedPath } from './paths.mjs';

const METADATA_KEYS = Object.freeze([
  'schema',
  'review_id',
  'role',
  'turn',
  'commit_mode',
  'artifact_path',
  'artifact_commit',
  'artifact_blob',
  'artifact_digest',
  'agent',
  'started_at',
  'submitted_at',
  'finding_ids',
  'answered_finding_ids',
]);
const AGENT_KEYS = Object.freeze([
  'host',
  'provider',
  'model_id',
  'model_display',
  'session_fingerprint',
  'identity_source',
]);
const SECTION_CATALOG = Object.freeze(
  Object.assign(Object.create(null), {
    reviewer: Object.freeze([
      'Summary',
      'Findings',
      'Required changes',
      'Optional suggestions',
      'Decision',
    ]),
    author: Object.freeze([
      'Summary',
      'Finding dispositions',
      'Changes made',
      'Declined changes and rationale',
      'Verification',
    ]),
  })
);
function fail(code, message, recovery, details = {}) {
  throw new AprError(code, message, { recovery, details });
}

function sha256(bytes) {
  return `sha256:${createHash('sha256').update(bytes).digest('hex')}`;
}

function protocolOf(review) {
  const protocol = review?.protocol ?? review;
  if (!protocol || typeof protocol !== 'object') {
    fail('APR_RESPONSE_INVALID', 'Review authority is required.', 'Read the review and retry.');
  }
  return protocol;
}

function instant(review) {
  const value = review.now ?? new Date();
  const parsed = value instanceof Date ? new Date(value.valueOf()) : new Date(value);
  if (Number.isNaN(parsed.valueOf())) {
    fail('APR_RESPONSE_INVALID', 'Response time is invalid.', 'Use a valid clock instant.');
  }
  return parsed.toISOString();
}

function agent(identity) {
  return Object.fromEntries(AGENT_KEYS.map((key) => [key, identity[key]]));
}

function expectedMetadata(review, role, turn, startedAt) {
  const protocol = protocolOf(review);
  const identity = review.participants?.[role];
  if (!identity) {
    fail(
      'APR_IDENTITY_REQUIRED',
      `The ${role} participant is not registered.`,
      `Register the ${role} participant and retry.`
    );
  }
  const artifact = protocol.artifact;
  return {
    schema: 'ai-peer-review.response/v1',
    review_id: protocol.review_id,
    role,
    turn,
    commit_mode: protocol.commit_mode,
    artifact_path: artifact?.path,
    artifact_commit: artifact?.head ?? review.artifact_commit ?? null,
    artifact_blob: artifact?.blob ?? null,
    artifact_digest: artifact?.digest,
    agent: agent(identity),
    started_at: startedAt,
    submitted_at: null,
    finding_ids: [],
    answered_finding_ids: role === 'author' ? [...(review.pending_finding_ids ?? [])] : [],
  };
}

function scalar(value) {
  return JSON.stringify(value);
}

function renderFrontmatter(metadata) {
  const lines = ['---'];
  for (const key of METADATA_KEYS) {
    if (key === 'agent') {
      lines.push('agent:');
      for (const agentKey of AGENT_KEYS)
        lines.push(`  ${agentKey}: ${scalar(metadata.agent[agentKey])}`);
    } else {
      lines.push(`${key}: ${scalar(metadata[key])}`);
    }
  }
  lines.push('---');
  return lines.join('\n');
}

function parseFrontmatter(bytes) {
  const text = Buffer.isBuffer(bytes) ? bytes.toString('utf8') : String(bytes);
  const lines = text.split('\n');
  const start = lines.indexOf('---');
  const end = lines.indexOf('---', start + 1);
  if (start < 0 || end <= start + 1) {
    fail(
      'APR_RESPONSE_INVALID',
      'Response frontmatter is missing.',
      'Recreate the response draft.'
    );
  }
  const metadata = {};
  for (let index = start + 1; index < end; index += 1) {
    const line = lines[index];
    if (line === 'agent:') {
      const value = {};
      for (const key of AGENT_KEYS) {
        index += 1;
        const match = lines[index]?.match(/^  ([a-z_]+): (.+)$/);
        if (!match || match[1] !== key) {
          fail(
            'APR_RESPONSE_INVALID',
            'Response agent metadata is malformed.',
            'Recreate the response draft.'
          );
        }
        try {
          value[key] = JSON.parse(match[2]);
        } catch {
          fail(
            'APR_RESPONSE_INVALID',
            'Response agent metadata is malformed.',
            'Recreate the response draft.'
          );
        }
      }
      metadata.agent = value;
      continue;
    }
    const match = line.match(/^([a-z_]+): (.+)$/);
    if (!match || Object.hasOwn(metadata, match[1])) {
      fail(
        'APR_RESPONSE_INVALID',
        'Response metadata is malformed.',
        'Recreate the response draft.'
      );
    }
    try {
      metadata[match[1]] = JSON.parse(match[2]);
    } catch {
      fail(
        'APR_RESPONSE_INVALID',
        'Response metadata is malformed.',
        'Recreate the response draft.'
      );
    }
  }
  const keys = Object.keys(metadata);
  if (
    keys.length !== METADATA_KEYS.length ||
    keys.some((key, index) => key !== METADATA_KEYS[index])
  ) {
    fail(
      'APR_RESPONSE_INVALID',
      'Response metadata fields are not closed.',
      'Recreate the response draft.'
    );
  }
  return { text, metadata, body: lines.slice(end + 1).join('\n') };
}

function parseSections(body, role) {
  if (!Object.hasOwn(SECTION_CATALOG, role)) {
    fail('APR_RESPONSE_INVALID', 'Response role is invalid.', 'Use author or reviewer.');
  }
  const matches = [...body.matchAll(/^## ([^\r\n]+)$/gm)];
  const headings = matches.map((match) => match[1]);
  const expected = SECTION_CATALOG[role];
  if (
    headings.length !== expected.length ||
    headings.some((heading, index) => heading !== expected[index])
  ) {
    fail(
      'APR_RESPONSE_INVALID',
      'Response prose sections do not match the role contract.',
      'Restore the generated role-specific section headings.'
    );
  }
  return matches.map((match, index) => ({
    heading: match[1],
    content: body
      .slice(match.index + match[0].length, matches[index + 1]?.index ?? body.length)
      .trim(),
  }));
}

export function parseResponse(bytes) {
  const parsed = parseFrontmatter(bytes);
  return Object.freeze({
    metadata: parsed.metadata,
    sections: Object.freeze(parseSections(parsed.body, parsed.metadata.role)),
  });
}

function responsePath(review, role, turn) {
  if (!Number.isSafeInteger(turn) || turn <= 0 || !['author', 'reviewer'].includes(role)) {
    fail(
      'APR_RESPONSE_INVALID',
      'Response role or turn is invalid.',
      'Use the current role and positive turn.'
    );
  }
  const resolver = review.paths?.[`${role}Response`];
  if (typeof resolver !== 'function') {
    fail(
      'APR_RESPONSE_INVALID',
      'Resolved review paths are required.',
      'Resolve review paths and retry.'
    );
  }
  return resolver(turn).absolute;
}

function registryPath(review, role, turn) {
  const scratch = review.paths?.scratch?.absolute;
  if (!scratch) {
    fail(
      'APR_RESPONSE_INVALID',
      'Resolved scratch path is required.',
      'Resolve review paths and retry.'
    );
  }
  return path.join(scratch, 'responses', `${role}-${turn}.json`);
}

function same(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function draftVariables(role, frontmatter) {
  if (role === 'reviewer') {
    return {
      frontmatter,
      summary: '<!-- Write the review summary. -->',
      findings: '<!-- List numbered findings or write None. -->',
      required_changes: '<!-- List required changes or write None. -->',
      optional_suggestions: '<!-- List numbered optional suggestions or write None. -->',
      decision: '<!-- Write revisions-requested or accepted. -->',
    };
  }
  return {
    frontmatter,
    summary: '<!-- Summarize the revision. -->',
    finding_dispositions: '<!-- Disposition every sealed finding ID. -->',
    changes_made: '<!-- Describe changes made. -->',
    declined_changes: '<!-- Explain declined changes or write None. -->',
    verification: '<!-- Record verification performed. -->',
  };
}

function collision(file) {
  fail(
    'APR_OUTPUT_COLLISION',
    'Tracked response path is occupied by conflicting content.',
    `Preserve ${file}, inspect the collision, and choose explicit recovery.`,
    { file }
  );
}

function authorizedTurn(review, role) {
  const state = protocolOf(review).state;
  return (
    (role === 'reviewer' && state === 'reviewer-turn') ||
    (role === 'author' && state === 'author-revision')
  );
}

function allCollateralPaths(review, paths = review.paths) {
  const maximum = protocolOf(review).max_turns;
  if (!Number.isSafeInteger(maximum) || maximum <= 0) {
    fail(
      'APR_RESPONSE_INVALID',
      'Review turn budget is unavailable for collateral reservation.',
      'Start the review with a positive maximum turn budget.'
    );
  }
  const values = [];
  for (let turn = 1; turn <= maximum; turn += 1) {
    values.push(paths.reviewerResponse(turn), paths.authorResponse(turn));
  }
  values.push(paths.humanDecision, paths.manifest);
  return values;
}

function recoveryPaths(review) {
  const current = review.paths;
  const reviewId = protocolOf(review).review_id;
  if (typeof reviewId !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(reviewId)) {
    fail('APR_RESPONSE_INVALID', 'Review ID is invalid.', 'Use the event-authorized review ID.');
  }
  const destination = resolveContainedPath(
    current.root,
    `${current.destination.relative}-recovery-${reviewId}`,
    'review recovery'
  );
  const shift = (value) => {
    const relative = path.relative(current.destination.absolute, value.absolute);
    return resolveContainedPath(
      current.root,
      path.join(destination.relative, relative),
      'response'
    );
  };
  return Object.freeze({
    ...current,
    destination,
    reviewerResponse: (turn) => shift(current.reviewerResponse(turn)),
    authorResponse: (turn) => shift(current.authorResponse(turn)),
    humanDecision: shift(current.humanDecision),
    manifest: shift(current.manifest),
  });
}

export function reserveCollateral(review, { validateForeignManifest } = {}) {
  const registry = path.join(review.paths?.scratch?.absolute ?? '', 'collateral-reservation.json');
  if (!review.paths?.scratch?.absolute) {
    fail(
      'APR_RESPONSE_INVALID',
      'Resolved scratch path is required.',
      'Resolve review paths and retry.'
    );
  }
  const select = (paths, recoveredFrom = null) => {
    const expected = allCollateralPaths(review, paths);
    const record = {
      schema: 'ai-peer-review.collateral-reservation/v1',
      review_id: protocolOf(review).review_id,
      destination: paths.destination.relative,
      paths: expected.map((value) => value.relative),
      recovered_from: recoveredFrom,
    };
    if (existsSync(registry)) {
      let prior;
      try {
        prior = JSON.parse(readFileSync(registry, 'utf8'));
      } catch {
        collision(registry);
      }
      if (!same(prior, record)) collision(registry);
      return Object.freeze({ paths, reservation: Object.freeze(record) });
    }
    const occupied = expected.filter((value) => existsSync(value.absolute));
    if (occupied.length) {
      if (recoveredFrom !== null || typeof validateForeignManifest !== 'function') {
        collision(paths.destination.absolute);
      }
      if (!existsSync(paths.manifest.absolute)) collision(paths.destination.absolute);
      let inspection;
      try {
        inspection = validateForeignManifest({
          bytes: readFileSync(paths.manifest.absolute),
          occupied: occupied.map((value) => value.relative),
          expected: expected.map((value) => value.relative),
        });
      } catch {
        inspection = null;
      }
      if (
        !inspection ||
        inspection.complete !== true ||
        typeof inspection.review_id !== 'string' ||
        inspection.review_id === protocolOf(review).review_id
      ) {
        collision(paths.destination.absolute);
      }
      return select(recoveryPaths({ ...review, paths }), inspection.review_id);
    }
    mkdirSync(path.dirname(registry), { recursive: true });
    atomicWrite(registry, Buffer.from(`${JSON.stringify(record, null, 2)}\n`));
    return Object.freeze({ paths, reservation: Object.freeze(record) });
  };
  return select(review.paths);
}

export function createResponseDraft(review, role, turn) {
  const file = responsePath(review, role, turn);
  const registry = registryPath(review, role, turn);
  if (!authorizedTurn(review, role)) {
    fail(
      'APR_RESPONSE_INVALID',
      'Response draft role is not current in event authority.',
      'Read status and create only the current participant response.'
    );
  }
  if (existsSync(file)) {
    if (!existsSync(registry)) collision(file);
    let registered;
    let parsed;
    try {
      registered = JSON.parse(readFileSync(registry, 'utf8'));
      parsed = parseResponse(readFileSync(file));
    } catch {
      collision(file);
    }
    const metadata = expectedMetadata(review, role, turn, registered.started_at);
    if (parsed.metadata.submitted_at !== null) {
      const prior = (review.sealed_responses ?? []).find((item) => item.path === file);
      if (!prior || prior.digest !== sha256(readFileSync(file))) collision(file);
      return Object.freeze({ path: file, bytes: readFileSync(file), metadata: parsed.metadata });
    }
    if (!same(registered, metadata) || !same(parsed.metadata, metadata)) collision(file);
    return Object.freeze({ path: file, bytes: readFileSync(file), metadata });
  }
  const metadata = expectedMetadata(review, role, turn, instant(review));
  const bytes = hydrateTemplate(
    `${role}-response`,
    draftVariables(role, renderFrontmatter(metadata))
  );
  mkdirSync(path.dirname(file), { recursive: true });
  mkdirSync(path.dirname(registry), { recursive: true });
  atomicWrite(registry, Buffer.from(`${JSON.stringify(metadata, null, 2)}\n`));
  let descriptor;
  try {
    descriptor = openSync(file, 'wx', 0o600);
    writeFileSync(descriptor, bytes);
    closeSync(descriptor);
    descriptor = null;
  } catch (cause) {
    if (descriptor !== undefined && descriptor !== null) closeSync(descriptor);
    if (cause?.code === 'EEXIST') collision(file);
    throw cause;
  }
  return Object.freeze({ path: file, bytes, metadata });
}

function validateIdentity(review, role, identity) {
  const pinned = review.participants?.[role];
  if (
    !identity ||
    identity.role !== role ||
    identity.host !== pinned?.host ||
    identity.provider !== pinned?.provider ||
    identity.session_fingerprint !== pinned?.session_fingerprint ||
    identity.identity_source !== pinned?.identity_source
  ) {
    fail(
      'APR_IDENTITY_CONFLICT',
      'Response identity does not match the registered participant.',
      'Submit from the registered participant session.'
    );
  }
}

function findingIds(sections, turn, prior) {
  const selected = sections.filter(({ heading }) =>
    ['Findings', 'Optional suggestions'].includes(heading)
  );
  const ids = [];
  for (const section of selected) {
    for (const heading of section.content.matchAll(/^### ([^\r\n]+)$/gm)) {
      const match = heading[1].match(/^R([1-9][0-9]*)-F([0-9]{3}) — (.*)$/);
      if (!match || Number(match[1]) !== turn || !match[3].trim()) {
        fail(
          'APR_RESPONSE_INVALID',
          'Reviewer finding heading is invalid.',
          `Use headings like ### R${turn}-F001 — Title.`
        );
      }
      ids.push(`R${match[1]}-F${match[2]}`);
    }
  }
  if (
    new Set(ids).size !== ids.length ||
    ids.some((id) => prior.includes(id)) ||
    ids.some((id, index) => id !== `R${turn}-F${String(index + 1).padStart(3, '0')}`)
  ) {
    fail(
      'APR_RESPONSE_INVALID',
      'Reviewer finding IDs are duplicated, reused, or out of sequence.',
      `Number this turn's findings once from R${turn}-F001 in document order.`
    );
  }
  return ids;
}

function sealedResult(file, bytes, metadata) {
  return Object.freeze({
    path: file,
    digest: sha256(bytes),
    role: metadata.role,
    turn: metadata.turn,
    submitted_at: metadata.submitted_at,
    finding_ids: Object.freeze([...metadata.finding_ids]),
    answered_finding_ids: Object.freeze([...metadata.answered_finding_ids]),
  });
}

export function sealResponse(review, file, identity) {
  const input = readFileSync(file);
  const parsed = parseResponse(input);
  const { metadata, sections } = parsed;
  const expectedFile = responsePath(review, metadata.role, metadata.turn);
  if (path.resolve(file) !== path.resolve(expectedFile)) collision(file);
  validateIdentity(review, metadata.role, identity);
  if (metadata.submitted_at !== null) {
    const prior = (review.sealed_responses ?? []).find((item) => item.path === file);
    const result = sealedResult(file, input, metadata);
    if (!prior || prior.digest !== result.digest) {
      fail(
        'APR_PROTECTED_METADATA_CHANGED',
        'Sealed response bytes do not match event authority.',
        'Restore the exact previously sealed response bytes.'
      );
    }
    return result;
  }
  const registry = registryPath(review, metadata.role, metadata.turn);
  let protectedMetadata;
  try {
    protectedMetadata = JSON.parse(readFileSync(registry, 'utf8'));
  } catch {
    fail(
      'APR_PROTECTED_METADATA_CHANGED',
      'Response draft authority is unavailable.',
      'Restore the response registry or recreate the draft.'
    );
  }
  if (!same(metadata, protectedMetadata)) {
    fail(
      'APR_PROTECTED_METADATA_CHANGED',
      'Protected response metadata changed after draft creation.',
      'Restore the generated frontmatter and edit only prose sections.'
    );
  }
  const protocol = protocolOf(review);
  const requiredState = metadata.role === 'reviewer' ? 'reviewer-turn' : 'author-revision';
  if (protocol.state !== requiredState) {
    fail(
      'APR_RESPONSE_INVALID',
      'Response role is not current.',
      'Read status and submit the current role.'
    );
  }
  const updated = {
    ...metadata,
    agent: agent(identity),
    submitted_at: instant(review),
  };
  if (metadata.role === 'reviewer') {
    const decision = sections.find(({ heading }) => heading === 'Decision').content;
    if (!['revisions-requested', 'accepted'].includes(decision)) {
      fail(
        'APR_RESPONSE_INVALID',
        'Reviewer decision is invalid.',
        'Use exactly revisions-requested or accepted.'
      );
    }
    updated.finding_ids = findingIds(sections, metadata.turn, review.prior_finding_ids ?? []);
  } else if (!same(metadata.answered_finding_ids, review.pending_finding_ids ?? [])) {
    fail(
      'APR_RESPONSE_INVALID',
      'Author response does not answer the preceding sealed finding set.',
      'Recreate the author draft from the current reviewer response.'
    );
  }
  const frontmatter = renderFrontmatter(updated);
  const text = input.toString('utf8');
  const first = text.indexOf('---');
  const second = text.indexOf('---', first + 3);
  const sealed = Buffer.from(`${text.slice(0, first)}${frontmatter}${text.slice(second + 3)}`);
  atomicWrite(file, sealed);
  return sealedResult(file, sealed, updated);
}
