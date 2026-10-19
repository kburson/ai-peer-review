// @story #227
// cspell:words aipr
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { gunzipSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';

const TASK_OWNERS = {
  21: { issue: 263, candidates: [214, 217, 218, 219, 220, 221] },
  '22A1': { issue: 264, candidates: [118, 148, 149, 150] },
  '22A2': { issue: 265, candidates: [109, 152, 153] },
  '22B1': { issue: 266, candidates: [30, 151] },
  '22B2': { issue: 267, candidates: [142, 156, 157, 124] },
  '22C': { issue: 268, candidates: [197] },
  '23A': { issue: 269, candidates: [141, 107] },
  '23B1': { issue: 270, candidates: [29, 31, 32, 33, 34, 130, 143] },
  '23B2': { issue: 271, candidates: [146, 147, 154, 155, 210, 212, 213] },
};
const PROOF_ISSUES = [214, 217, 218, 219, 220, 221];
const ORIGINAL_DEPENDENCIES = {
  214: [],
  217: [216],
  218: [217],
  219: [218],
  220: [219],
  221: [220, 215],
};
const sorted = (values) => [...values].sort((left, right) => left - right);
const sameSet = (left, right) => JSON.stringify(sorted(left)) === JSON.stringify(sorted(right));
const fail = (code) => {
  throw new Error(`issue-partition:${code}`);
};
const substantive = (value) => typeof value === 'string' && value.trim().length > 0;

export function decodeRawSnapshot(item) {
  if (item.encoding !== 'gzip+base64') fail('raw-snapshot-encoding');
  const bytes = gunzipSync(Buffer.from(item.bytesBase64, 'base64'));
  if (createHash('sha256').update(bytes).digest('hex') !== item.sha256)
    fail('raw-snapshot-hash-mismatch');
  return bytes;
}

function nativeSection(body, heading) {
  const marker = new RegExp('^## ' + heading + '[ \t]*\\r?\\n', 'm').exec(body);
  if (!marker) return null;
  const remainder = body.slice(marker.index + marker[0].length);
  const nextHeading = /^## /m.exec(remainder);
  return remainder.slice(0, nextHeading?.index ?? remainder.length).replace(/^\n+|\n+$/g, '');
}

export function verifyRawSources(evidence, archive) {
  const snapshots = new Map();
  for (const item of archive.snapshots) {
    const bytes = decodeRawSnapshot(item);
    if (createHash('sha256').update(item.requestJson).digest('hex') !== item.requestJsonSha256)
      fail('query-signature-mismatch');
    if (
      createHash('sha256').update(JSON.parse(item.requestJson).query).digest('hex') !==
      item.querySha256
    )
      fail('query-signature-mismatch');
    snapshots.set(item.name, JSON.parse(bytes));
  }
  const listingName = archive.finalOpenListing;
  const listing = snapshots.get(listingName).data.repository.issues;
  if (listing.pageInfo.hasNextPage) fail('partial-native-read');
  if (
    !sameSet(
      listing.nodes.map((issue) => issue.number),
      evidence.openIssues.map((issue) => issue.number)
    )
  )
    fail('raw-source-readback-mismatch');
  for (const issue of evidence.openIssues) {
    const raw = listing.nodes.find((row) => row.number === issue.number);
    const labels = raw.labels.nodes.map((label) => label.name).sort();
    const task = /^- \*\*Task-id\*\*: (.*)$/m.exec(raw.body)?.[1] ?? null;
    if (
      JSON.stringify(labels) !== JSON.stringify([...issue.labels].sort()) ||
      task !== issue.sourceTaskId
    )
      fail('raw-source-readback-mismatch');
    if (
      createHash('sha256').update(raw.body).digest('hex') !== issue.bodySha256 ||
      (raw.parent?.number ?? null) !== (issue.parentIssue ?? null)
    )
      fail('raw-source-readback-mismatch');
  }
  for (const [name, readback] of [
    ['227-proof-fresh.json', false],
    ['227-proof-readback.json', true],
  ]) {
    const raw = snapshots.get(name).data.repository;
    for (const issue of evidence.proofIssues) {
      const source = raw['i' + issue.number];
      const expected = readback ? issue.readback : issue;
      if (
        !readback &&
        (nativeSection(source.body, 'Scope') !== issue.originalScope ||
          nativeSection(source.body, 'Acceptance Criteria') !== issue.originalAcceptanceCriteria ||
          nativeSection(source.body, 'Plan Metadata') !== issue.originalPlanMetadata)
      )
        fail('raw-source-readback-mismatch');
      const comments = [...source.comments.nodes].sort((left, right) =>
        left.id < right.id ? -1 : left.id > right.id ? 1 : 0
      );
      // Nested native comment objects have the same fixed shape, sorted at every level.
      const commentBytes = JSON.stringify(
        comments.map((comment) =>
          Object.fromEntries(
            Object.entries(comment).sort(([left], [right]) =>
              left < right ? -1 : left > right ? 1 : 0
            )
          )
        )
      ).replace(
        /[\u007f-\uffff]/g,
        (character) => '\\u' + character.charCodeAt(0).toString(16).padStart(4, '0')
      );
      if (
        createHash('sha256').update(source.body).digest('hex') !== expected.bodySha256 ||
        createHash('sha256').update(commentBytes).digest('hex') !== expected.commentsSha256 ||
        !sameSet(
          source.blockedBy.nodes.map((row) => row.number),
          expected.blockedBy
        ) ||
        !sameSet(
          source.blocking.nodes.map((row) => row.number),
          expected.blocking
        )
      )
        fail('raw-source-readback-mismatch');
    }
  }
  return { verifiedSnapshots: snapshots.size };
}

export function validatePartition(partition, evidence) {
  if (
    partition?.schema !== 'aipr.initial-issue-partition/v1' ||
    evidence?.schema !== 'aipr.issue-partition-evidence/v1'
  )
    fail('schema');
  if (
    !Array.isArray(partition.entries) ||
    !Array.isArray(evidence.openIssues) ||
    !Array.isArray(evidence.proofIssues)
  )
    fail('shape');
  const open = new Map();
  for (const issue of evidence.openIssues) {
    if (!Number.isSafeInteger(issue.number) || issue.number <= 0 || open.has(issue.number))
      fail('duplicate-observed-issue');
    open.set(issue.number, issue);
  }
  const entries = new Map();
  for (const entry of partition.entries) {
    if (entries.has(entry.number)) fail('duplicate-issue');
    if (!open.has(entry.number)) fail('unobserved-issue');
    if (!substantive(entry.reason)) fail('missing-disposition-reason');
    entries.set(entry.number, entry);
    const expected = Object.entries(TASK_OWNERS).find(([, owner]) =>
      owner.candidates.includes(entry.number)
    );
    if (expected) {
      if (
        entry.classification !== 'disposition' ||
        entry.ownerTask !== expected[0] ||
        entry.ownerIssue !== expected[1].issue
      )
        fail('wrong-disposition-owner');
    } else if (open.get(entry.number).parentIssue === 225) {
      if (
        entry.classification !== 'replacement-implementation' ||
        entry.ownerTask !== '01A' ||
        entry.ownerIssue !== 225 ||
        entry.executionIssue !== entry.number
      )
        fail('wrong-replacement-owner');
    } else if (open.get(entry.number).labels.includes('222-hydration')) {
      if (entry.classification !== 'hydrated-implementation' || entry.ownerIssue !== entry.number)
        fail('wrong-hydrated-owner');
    } else if ([70, 111, 223].includes(entry.number)) {
      if (
        entry.classification !== 'retained-independent' ||
        entry.ownerIssue !== entry.number ||
        entry.ownerTask !== null
      )
        fail('wrong-independent-owner');
    } else if (
      entry.classification !== 'requires-bounded-proposal' ||
      entry.ownerTask !== '23A' ||
      entry.ownerIssue !== 269
    )
      fail('unowned-new-candidate');
  }
  if (!sameSet([...open.keys()], [...entries.keys()])) fail('missing-issue');
  if (
    !sameSet(
      evidence.proofIssues.map((issue) => issue.number),
      PROOF_ISSUES
    )
  )
    fail('proof-identity-coverage');
  for (const issue of evidence.proofIssues) {
    if (!open.has(issue.number)) fail('proof-issue-not-open');
    if (!issue.paginationComplete || !issue.readback?.paginationComplete)
      fail('partial-native-read');
    if (!Array.isArray(issue.sourcePointers) || !issue.sourcePointers.some(substantive))
      fail('source-reference-missing');
    if (!ORIGINAL_DEPENDENCIES[issue.number].every((number) => issue.blockedBy.includes(number)))
      fail('original-dependency-lost');
    if (
      !issue.blockedBy.includes(275) ||
      !sameSet(issue.blockedBy, issue.readback.blockedBy) ||
      !sameSet(issue.blocking, issue.readback.blocking)
    )
      fail('containment-changed');
    if (
      !/^[a-f0-9]{64}$/.test(issue.bodySha256) ||
      !/^[a-f0-9]{64}$/.test(issue.commentsSha256) ||
      issue.bodySha256 !== issue.readback.bodySha256 ||
      issue.commentsSha256 !== issue.readback.commentsSha256
    )
      fail('history-changed');
  }
  const policy = partition.constraints;
  if (policy?.windows213 !== 'keep-deferred-unscheduled-nonblocking') fail('windows-deferral');
  if (
    policy.newHoldEdges !== 0 ||
    policy.newHoldLabels !== 0 ||
    policy.proofIssueMutations !== 0 ||
    policy.nativeUnknownRewritten !== false
  )
    fail('forbidden-mutation');
  return {
    openIssues: open.size,
    proofIssues: evidence.proofIssues.length,
    dispositionEntries: partition.entries.filter((entry) => entry.classification === 'disposition')
      .length,
    hydratedEntries: partition.entries.filter(
      (entry) => entry.classification === 'hydrated-implementation'
    ).length,
    retainedIndependentEntries: partition.entries.filter(
      (entry) => entry.classification === 'retained-independent'
    ).length,
    replacementEntries: partition.entries.filter(
      (entry) => entry.classification === 'replacement-implementation'
    ).length,
    proposalEntries: partition.entries.filter(
      (entry) => entry.classification === 'requires-bounded-proposal'
    ).length,
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const directory = path.resolve(
      path.dirname(fileURLToPath(import.meta.url)),
      '../../docs/superpowers/adoption'
    );
    const partition = JSON.parse(
      readFileSync(path.join(directory, '222-initial-issue-partition.json'), 'utf8')
    );
    const bytes = readFileSync(path.join(directory, '227-native-issue-evidence.json'));
    if (partition.evidenceSha256 !== createHash('sha256').update(bytes).digest('hex'))
      fail('evidence-file-mismatch');
    const evidence = JSON.parse(bytes);
    const archiveBytes = readFileSync(path.join(directory, '227-native-raw-snapshots.json'));
    if (createHash('sha256').update(archiveBytes).digest('hex') !== evidence.rawArchiveSha256)
      fail('raw-archive-hash-mismatch');
    const raw = verifyRawSources(evidence, JSON.parse(archiveBytes));
    console.log(JSON.stringify({ ...validatePartition(partition, evidence), ...raw }, null, 2));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
