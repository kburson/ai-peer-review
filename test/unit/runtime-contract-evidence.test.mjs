// @story #144
// Offline source fixtures exercise validation only, never adoption authority.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
const api = await import('../../scripts/lib/runtime-contract-evidence.mjs').catch(() => ({}));
const sha = (b) => createHash('sha256').update(b).digest('hex');
const original = '60efdbbeb60c83c1c56884491ae018eaea70d282';
const body = [
  '<!-- aitm-body-version version="48" -->',
  '## Scope',
  '',
  '- [ ] Preserve exact normative contract.',
  '',
  '## Plan Metadata',
  '',
  '- **Source-plan-commit**: ' + original,
  '- **Source-plan-amendment-commit**: ' + 'a'.repeat(40),
  '',
  '## Verification Commands',
  '',
  '- [ ] `node checker.mjs --mode adoption-only` <!-- id=1 -->',
  '- [ ] `git diff --check` <!-- id=2 -->',
  '',
  '## AITM Progress Markers',
  '<!-- aitm-last-known-state state="develop" -->',
  '',
].join('\n');
test('[#144] mapping ignores only checkbox ticks and outside state/version changes', () => {
  assert.equal(typeof api.extractRuntimeContractMapping, 'function');
  const expected = api.extractRuntimeContractMapping(body);
  assert.equal(expected.originalSourcePlanCommit, original);
  const changed = body
    .replaceAll('[ ]', '[x]')
    .replace('version="48"', 'version="99"')
    .replace('state="develop"', 'state="test"');
  assert.deepEqual(api.extractRuntimeContractMapping(changed), expected);
  for (const changed of [
    body.replace('exact normative', 'different normative'),
    body.replace('amendment-commit**: a', 'amendment-commit**: b'),
    body.replace('--mode adoption-only', '--mode publication'),
  ])
    assert.notDeepEqual(api.extractRuntimeContractMapping(changed), expected);
});
test('[#144] mapping refuses changed original source and ambiguous command/sections', () => {
  for (const changed of [
    body.replace(original, 'b'.repeat(40)),
    body.replace('## Scope', '## Scope\n\n## Scope'),
    body.replace('<!-- id=2 -->', '<!-- id=1 -->'),
  ])
    assert.throws(() => api.extractRuntimeContractMapping(changed), /native-mapping-invalid/);
});
function sourceFixture() {
  const text =
    'Exact public approval bytes.\n<!-- aitm-owned-comment key="runtime-contract-approved-evidence.review-fixture" -->';
  const transaction = {
    kind: 'aitm-owned-comment',
    repository: 'kburson/ai-peer-review',
    issue: 144,
    ownedCommentKey: 'runtime-contract-approved-evidence.review-fixture',
    commentDatabaseId: 123,
    commentNodeId: 'IC_fixture',
    url: 'https://github.com/kburson/ai-peer-review/issues/144#issuecomment-123',
    authoredBy: 'fixture-owner',
    body: {
      revision: 'a'.repeat(40),
      path: 'evidence/portable-runtime/contracts/approval.md',
      blob: 'b'.repeat(40),
      sha256: sha(text),
    },
    bodySha256: sha(text),
    publishedAt: '2026-10-05T00:00:00Z',
    observedAt: '2026-10-05T00:00:01Z',
  };
  const source = {
    authenticatedActor: 'fixture-reader',
    comment: {
      id: 123,
      node_id: 'IC_fixture',
      html_url: transaction.url,
      issue_url: 'https://api.github.com/repos/kburson/ai-peer-review/issues/144',
      user: { login: 'fixture-owner' },
      created_at: transaction.publishedAt,
      body: text,
    },
  };
  return { transaction, retainedBody: Buffer.from(text), source };
}
test('[#144] native source validator matches exact authenticated public source bytes only', () => {
  assert.equal(typeof api.validateNativeApprovalSource, 'function');
  assert.equal(api.validateNativeApprovalSource(sourceFixture()), true);
});
for (const [name, change] of [
  [
    'unavailable authentication',
    (x) => {
      x.source.authenticatedActor = null;
    },
  ],
  [
    'foreign issue',
    (x) => {
      x.source.comment.issue_url = x.source.comment.issue_url.replace('/144', '/145');
    },
  ],
  [
    'wrong author',
    (x) => {
      x.source.comment.user.login = 'other';
    },
  ],
  [
    'wrong node',
    (x) => {
      x.source.comment.node_id = 'IC_other';
    },
  ],
  [
    'wrong ID',
    (x) => {
      x.source.comment.id = 124;
    },
  ],
  [
    'wrong URL',
    (x) => {
      x.source.comment.html_url += '-other';
    },
  ],
  [
    'changed exact body',
    (x) => {
      x.source.comment.body += '\n';
    },
  ],
  [
    'wrong creation time',
    (x) => {
      x.source.comment.created_at = '2026-10-05T00:01:00Z';
    },
  ],
  [
    'foreign repository',
    (x) => {
      x.transaction.repository = 'other/repo';
    },
  ],
  [
    'wrong key',
    (x) => {
      x.transaction.ownedCommentKey = 'runtime-contract-approved-evidence.other';
    },
  ],
  [
    'caller success assertion',
    (x) => {
      x.transaction.approved = true;
    },
  ],
]) {
  test('[#144] native source validator refuses ' + name, () => {
    const x = sourceFixture();
    change(x);
    assert.throws(() => api.validateNativeApprovalSource(x), /approved-evidence-source-invalid/);
  });
}

test('[#144] retained receipt consumer refuses missing original accepted member bytes', () => {
  assert.equal(typeof api.checkRetainedLineageProof, 'function');
  const result = api.checkRetainedLineageProof({
    receipt: null,
    reviewReference: null,
    artifacts: new Map(),
  });
  assert.equal(result.receiptCoherent, false);
  assert.equal(result.originalPrivateReplay, 'unavailable');
  assert.ok(result.blockers.includes('lineage-proof-invalid'));
});
