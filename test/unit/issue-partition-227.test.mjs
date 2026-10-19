// @story #227
// cspell:words aipr
import assert from 'node:assert/strict';
import test from 'node:test';
import { validatePartition } from '../helpers/verify-issue-partition-227.mjs';

function fixture() {
  const proof = [214, 217, 218, 219, 220, 221];
  const dependencies = [[275], [275, 216], [275, 217], [275, 218], [275, 219], [275, 220, 215]];
  const evidence = {
    schema: 'aipr.issue-partition-evidence/v1',
    openIssues: [29, 70, 213, 214, 217, 218, 219, 220, 221, 225].map((number) => ({
      number,
      labels: number === 225 ? ['222-hydration'] : [],
      sourceTaskId: number === 225 ? '01A' : null,
    })),
    proofIssues: proof.map((number, index) => ({
      number,
      bodySha256: 'a'.repeat(64),
      commentsSha256: 'b'.repeat(64),
      blockedBy: dependencies[index],
      blocking: [],
      sourcePointers: ['Independent historical contract reference'],
      paginationComplete: true,
      readback: {
        bodySha256: 'a'.repeat(64),
        commentsSha256: 'b'.repeat(64),
        blockedBy: dependencies[index],
        blocking: [],
        paginationComplete: true,
      },
    })),
  };
  const partition = {
    schema: 'aipr.initial-issue-partition/v1',
    entries: [
      {
        number: 29,
        classification: 'disposition',
        ownerTask: '23B1',
        ownerIssue: 270,
        reason: 'Pinned candidate owner',
      },
      {
        number: 70,
        classification: 'retained-independent',
        ownerTask: null,
        ownerIssue: 70,
        reason: 'Dedicated estimation authority, no requirement adoption',
      },
      {
        number: 213,
        classification: 'disposition',
        ownerTask: '23B2',
        ownerIssue: 271,
        reason: 'Keep indefinitely deferred and unscheduled',
      },
      ...proof.map((number) => ({
        number,
        classification: 'disposition',
        ownerTask: '21',
        ownerIssue: 263,
        reason: 'Proof-program disposition, not implementation',
      })),
      {
        number: 225,
        classification: 'hydrated-implementation',
        ownerTask: '01A',
        ownerIssue: 225,
        reason: 'Existing owning issue, no adoption here',
      },
    ],
    constraints: {
      windows213: 'keep-deferred-unscheduled-nonblocking',
      newHoldEdges: 0,
      newHoldLabels: 0,
      proofIssueMutations: 0,
      nativeUnknownRewritten: false,
    },
  };
  return { partition, evidence };
}

test('complete partition accepts one owner for every observed open identity', () => {
  const { partition, evidence } = fixture();
  assert.deepEqual(validatePartition(partition, evidence), {
    openIssues: 10,
    proofIssues: 6,
    dispositionEntries: 8,
    hydratedEntries: 1,
    retainedIndependentEntries: 1,
    replacementEntries: 0,
    proposalEntries: 0,
  });
});

test('duplicate responsibility cannot masquerade as complete coverage', () => {
  const { partition, evidence } = fixture();
  partition.entries.push({ ...partition.entries[0] });
  assert.throws(() => validatePartition(partition, evidence), /duplicate-issue/);
});

test('missing and newly observed issues require explicit ownership', () => {
  const { partition, evidence } = fixture();
  evidence.openIssues.push({ number: 999, labels: [] });
  assert.throws(() => validatePartition(partition, evidence), /missing-issue/);
});

test('wrong accepted disposition owner is rejected', () => {
  const { partition, evidence } = fixture();
  partition.entries[0].ownerIssue = 264;
  assert.throws(() => validatePartition(partition, evidence), /wrong-disposition-owner/);
});

test('an old snapshot cannot hide a changed native hold or original dependency', () => {
  const { partition, evidence } = fixture();
  evidence.proofIssues[1].readback.blockedBy = [275];
  assert.throws(() => validatePartition(partition, evidence), /containment-changed/);
});

test('changed historical body or timing comment cannot pass preservation read-back', () => {
  const { partition, evidence } = fixture();
  evidence.proofIssues[0].readback.commentsSha256 = 'c'.repeat(64);
  assert.throws(() => validatePartition(partition, evidence), /history-changed/);
});

test('partial native pagination cannot be called complete containment evidence', () => {
  const { partition, evidence } = fixture();
  evidence.proofIssues[0].readback.paginationComplete = false;
  assert.throws(() => validatePartition(partition, evidence), /partial-native-read/);
});

test('proof issue without source provenance is rejected', () => {
  const { partition, evidence } = fixture();
  evidence.proofIssues[0].sourcePointers = [];
  assert.throws(() => validatePartition(partition, evidence), /source-reference-missing/);
});

test('Windows support cannot be silently scheduled by the partition', () => {
  const { partition, evidence } = fixture();
  partition.constraints.windows213 = 'ready';
  assert.throws(() => validatePartition(partition, evidence), /windows-deferral/);
});

test('new hold effects or historical accounting repair are forbidden', () => {
  const { partition, evidence } = fixture();
  partition.constraints.newHoldEdges = 1;
  assert.throws(() => validatePartition(partition, evidence), /forbidden-mutation/);
});

test('genuine native children retain the original Task 01A program owner', () => {
  const { partition, evidence } = fixture();
  evidence.openIssues.push({ number: 276, labels: ['222-hydration'], parentIssue: 225 });
  partition.entries.push({
    number: 276,
    classification: 'replacement-implementation',
    ownerTask: '01A',
    ownerIssue: 225,
    executionIssue: 276,
    nativeParentIssue: 225,
    reason: 'Native child continues the original source inventory scope',
  });
  const result = validatePartition(partition, evidence);
  assert.equal(result.openIssues, 11);
  assert.equal(result.replacementEntries, 1);
});

test('a genuine replacement cannot be laundered into a foreign disposition owner', () => {
  const { partition, evidence } = fixture();
  evidence.openIssues.push({ number: 276, labels: ['222-hydration'], parentIssue: 225 });
  partition.entries.push({
    number: 276,
    classification: 'disposition',
    ownerTask: '23A',
    ownerIssue: 269,
    reason: 'Incorrect owner',
  });
  assert.throws(() => validatePartition(partition, evidence), /wrong-replacement-owner/);
});

test('agreement between snapshots does not excuse removal of the original proof chain', () => {
  const { partition, evidence } = fixture();
  evidence.proofIssues[1].blockedBy = [275];
  evidence.proofIssues[1].readback.blockedBy = [275];
  assert.throws(() => validatePartition(partition, evidence), /original-dependency-lost/);
});

test('raw snapshot archive is decoded exactly and refuses a false recorded digest', async () => {
  const { gzipSync } = await import('node:zlib');
  const { createHash } = await import('node:crypto');
  const { decodeRawSnapshot } = await import('../helpers/verify-issue-partition-227.mjs');
  const bytes = Buffer.from('{"data":{"native":"retained exact bytes"}}\n');
  const item = {
    encoding: 'gzip+base64',
    bytesBase64: gzipSync(bytes).toString('base64'),
    sha256: createHash('sha256').update(bytes).digest('hex'),
  };
  assert.deepEqual(decodeRawSnapshot(item), bytes);
  item.sha256 = 'f'.repeat(64);
  assert.throws(() => decodeRawSnapshot(item), /raw-snapshot-hash-mismatch/);
});

test('retained native snapshot comment ordering verifies exact evidence hashes', async () => {
  const { readFileSync } = await import('node:fs');
  const { verifyRawSources } = await import('../helpers/verify-issue-partition-227.mjs');
  const evidence = JSON.parse(
    readFileSync(
      new URL('../../docs/superpowers/adoption/227-native-issue-evidence.json', import.meta.url)
    )
  );
  const archive = JSON.parse(
    readFileSync(
      new URL('../../docs/superpowers/adoption/227-native-raw-snapshots.json', import.meta.url)
    )
  );
  assert.deepEqual(verifyRawSources(evidence, archive), { verifiedSnapshots: 4 });
});

test('derived evidence cannot contradict its retained native response bytes', async () => {
  const { readFileSync } = await import('node:fs');
  const { verifyRawSources } = await import('../helpers/verify-issue-partition-227.mjs');
  const evidence = JSON.parse(
    readFileSync(
      new URL('../../docs/superpowers/adoption/227-native-issue-evidence.json', import.meta.url)
    )
  );
  const archive = JSON.parse(
    readFileSync(
      new URL('../../docs/superpowers/adoption/227-native-raw-snapshots.json', import.meta.url)
    )
  );
  evidence.proofIssues[0].bodySha256 = '0'.repeat(64);
  assert.throws(() => verifyRawSources(evidence, archive), /raw-source-readback-mismatch/);
});

test('derived labels cannot invent implementation ownership absent from native listing', async () => {
  const { readFileSync } = await import('node:fs');
  const { verifyRawSources } = await import('../helpers/verify-issue-partition-227.mjs');
  const evidence = JSON.parse(
    readFileSync(
      new URL('../../docs/superpowers/adoption/227-native-issue-evidence.json', import.meta.url)
    )
  );
  const archive = JSON.parse(
    readFileSync(
      new URL('../../docs/superpowers/adoption/227-native-raw-snapshots.json', import.meta.url)
    )
  );
  evidence.openIssues.find((issue) => issue.number === 70).labels.push('222-hydration');
  assert.throws(() => verifyRawSources(evidence, archive), /raw-source-readback-mismatch/);
});

test('retained original scope cannot be rewritten while retaining the old body hash', async () => {
  const { readFileSync } = await import('node:fs');
  const { verifyRawSources } = await import('../helpers/verify-issue-partition-227.mjs');
  const evidence = JSON.parse(
    readFileSync(
      new URL('../../docs/superpowers/adoption/227-native-issue-evidence.json', import.meta.url)
    )
  );
  const archive = JSON.parse(
    readFileSync(
      new URL('../../docs/superpowers/adoption/227-native-raw-snapshots.json', import.meta.url)
    )
  );
  evidence.proofIssues[0].originalScope = 'Replacement text without the historical scope';
  assert.throws(() => verifyRawSources(evidence, archive), /raw-source-readback-mismatch/);
});

async function retainedFixture() {
  const { readFileSync } = await import('node:fs');
  const read = (name) =>
    JSON.parse(readFileSync(new URL('../../docs/superpowers/adoption/' + name, import.meta.url)));
  return {
    evidence: read('227-native-issue-evidence.json'),
    archive: read('227-native-raw-snapshots.json'),
    partition: read('222-initial-issue-partition.json'),
  };
}

async function changeRaw(archive, name, change) {
  const { gzipSync } = await import('node:zlib');
  const { createHash } = await import('node:crypto');
  const { decodeRawSnapshot } = await import('../helpers/verify-issue-partition-227.mjs');
  const item = archive.snapshots.find((row) => row.name === name);
  const raw = JSON.parse(decodeRawSnapshot(item));
  change(raw);
  const bytes = Buffer.from(JSON.stringify(raw));
  item.bytesBase64 = gzipSync(bytes).toString('base64');
  item.sha256 = createHash('sha256').update(bytes).digest('hex');
}

test('raw nested pagination is required even with valid recomputed response hashes', async () => {
  const { verifyRawSources } = await import('../helpers/verify-issue-partition-227.mjs');
  for (const connection of ['labels', 'comments', 'blockedBy', 'blocking']) {
    for (const name of ['227-proof-fresh.json', '227-proof-readback.json']) {
      const { evidence, archive } = await retainedFixture();
      await changeRaw(archive, name, (raw) => {
        raw.data.repository.i217[connection].pageInfo.hasNextPage = true;
      });
      assert.throws(
        () => verifyRawSources(evidence, archive),
        /partial-native-read/,
        `${name}/${connection}`
      );
    }
  }
  const { evidence, archive } = await retainedFixture();
  await changeRaw(archive, archive.finalOpenListing, (raw) => {
    raw.data.repository.issues.nodes[0].labels.pageInfo.hasNextPage = true;
  });
  assert.throws(() => verifyRawSources(evidence, archive), /partial-native-read/);
});

test('matching raw reads cannot bless extra or duplicate historical edges', async () => {
  const { verifyRawSources } = await import('../helpers/verify-issue-partition-227.mjs');
  for (const connection of ['blockedBy', 'blocking']) {
    for (const number of [999, connection === 'blockedBy' ? 275 : 218]) {
      const { evidence, archive } = await retainedFixture();
      for (const name of ['227-proof-fresh.json', '227-proof-readback.json']) {
        await changeRaw(archive, name, (raw) => {
          raw.data.repository.i217[connection].nodes.push({ number });
        });
      }
      const issue = evidence.proofIssues.find((row) => row.number === 217);
      issue[connection].push(number);
      issue.readback[connection].push(number);
      assert.throws(
        () => verifyRawSources(evidence, archive),
        /historical-topology/,
        `${connection}/${number}`
      );
    }
  }
});

test('historical projections must be derived from retained comments and body markers', async () => {
  const { verifyRawSources } = await import('../helpers/verify-issue-partition-227.mjs');
  const changes = [
    (row) => {
      row.forecastRecords = [];
    },
    (row) => {
      row.forecastRecords[0].human.humanHours = 3;
    },
    (row) => {
      row.forecastRecords[0].ai.p50EngagedHours = 0;
    },
    (row) => {
      row.timingReferences[0].literalUnknownTokens = 0;
    },
    (row) => {
      row.timingReferences[0].historicalHoldRows = ['invented'];
    },
    (row) => {
      row.sourcePointers = ['invented'];
    },
    (row) => {
      row.recordedStage = 'develop';
    },
    (row) => {
      (row.bodyFieldValues ?? row.nativeFieldValues).estimate = 3;
    },
    (row) => {
      row.bodyPlanApprovalPresent = true;
    },
  ];
  for (const change of changes) {
    const { evidence, archive, partition } = await retainedFixture();
    change(evidence.proofIssues.find((row) => row.number === 217));
    // Replacing the outer digest must not make a false projection authoritative.
    const { createHash } = await import('node:crypto');
    partition.evidenceSha256 = createHash('sha256').update(JSON.stringify(evidence)).digest('hex');
    assert.throws(() => verifyRawSources(evidence, archive), /historical-projection/);
  }
});

test('hydrated task and replacement native parent must match raw-backed owner chain', async () => {
  const { partition, evidence } = await retainedFixture();
  partition.entries.find((row) => row.number === 225).ownerTask = '23A';
  assert.throws(() => validatePartition(partition, evidence), /wrong-hydrated-owner/);
  const replacement = await retainedFixture();
  replacement.partition.entries.find((row) => row.number === 276).nativeParentIssue = 269;
  assert.throws(
    () => validatePartition(replacement.partition, replacement.evidence),
    /wrong-replacement-owner/
  );
});
