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
    authentication: {
      kind: 'github-api-credential',
      host: 'github.com',
      repository: 'kburson/ai-peer-review',
      repositoryId: 123,
    },
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
      x.source.authentication = null;
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

test('[#144] native source authentication does not substitute reader identity for comment author', () => {
  const x = sourceFixture();
  x.source.authentication.repository = 'foreign/repository';
  assert.throws(() => api.validateNativeApprovalSource(x), /approved-evidence-source-invalid/);
});

const scopePointer = (commentId = '6000000001', digest = 'c', lineage = 'd') =>
  '<!-- aitm-reviewed-scope-evidence comment="' +
  commentId +
  '" sha256="' +
  digest.repeat(64) +
  '" lineage="' +
  lineage.repeat(64) +
  '" -->';
const narrative = '- [ ] Preserve exact normative contract.';
test('[#144] mapping preserves exact bytes across canonical native narrative receipt metadata', () => {
  for (const originalLine of [
    narrative,
    narrative + '  ',
    narrative + '\t',
    narrative + ' <!-- retained-note -->',
  ]) {
    const originalBody = body.replace(narrative, originalLine);
    const recorded = originalBody.replace(
      originalLine,
      originalLine.replace('- [ ]', '- [x]') + ' ' + scopePointer()
    );
    assert.deepEqual(
      api.extractRuntimeContractMapping(recorded),
      api.extractRuntimeContractMapping(originalBody)
    );
    for (const changed of [
      recorded.replace('exact normative', 'edited normative'),
      recorded.replace('Preserve exact', 'Preserve  exact'),
      recorded.replace(' <!-- retained-note -->', ' <!-- changed-note -->'),
    ].filter((x) => x !== recorded))
      assert.notDeepEqual(
        api.extractRuntimeContractMapping(changed),
        api.extractRuntimeContractMapping(originalBody)
      );
  }
});
test('[#144] mapping preserves literal pointer examples inside fenced Scope requirements', () => {
  for (const fence of ['```', '~~~~']) {
    const example = body.replace(
      narrative,
      narrative +
        '\n' +
        fence +
        'text\n' +
        '- [x] Literal requirement ' +
        scopePointer() +
        '\n' +
        fence
    );
    const recorded = example.replace(
      narrative,
      narrative.replace('[ ]', '[x]') + ' ' + scopePointer('6000000002', 'e', 'f')
    );
    assert.deepEqual(
      api.extractRuntimeContractMapping(recorded),
      api.extractRuntimeContractMapping(example)
    );
    assert.notDeepEqual(
      api.extractRuntimeContractMapping(
        example.replace('sha256="' + 'c'.repeat(64), 'sha256="' + 'a'.repeat(64))
      ),
      api.extractRuntimeContractMapping(example)
    );
  }
});
for (const [name, changed] of [
  [
    'unknown attribute',
    body.replace(narrative, narrative + ' ' + scopePointer().replace(' -->', ' extra="true" -->')),
  ],
  [
    'unknown version',
    body.replace(
      narrative,
      narrative + ' ' + scopePointer().replace('scope-evidence ', 'scope-evidence:v2 ')
    ),
  ],
  [
    'unknown marker family',
    body.replace(
      narrative,
      narrative + ' ' + scopePointer().replace('scope-evidence ', 'scope-evidence-other ')
    ),
  ],
  ['zero comment ID', body.replace(narrative, narrative + ' ' + scopePointer('0'))],
  ['leading zero ID', body.replace(narrative, narrative + ' ' + scopePointer('06000000001'))],
  ['long comment ID', body.replace(narrative, narrative + ' ' + scopePointer('1'.repeat(21)))],
  ['uppercase digest', body.replace(narrative, narrative + ' ' + scopePointer('6000000001', 'C'))],
  [
    'truncated digest',
    body.replace(
      narrative,
      narrative + ' ' + scopePointer().replace('c'.repeat(64), 'c'.repeat(63))
    ),
  ],
  [
    'duplicate on line',
    body.replace(narrative, narrative + ' ' + scopePointer() + ' ' + scopePointer()),
  ],
  [
    'duplicate comment across lines',
    body.replace(
      narrative,
      narrative +
        ' ' +
        scopePointer() +
        '\n- [x] Another target. ' +
        scopePointer('6000000001', 'e', 'f')
    ),
  ],
  [
    'duplicate lineage across lines',
    body.replace(
      narrative,
      narrative +
        ' ' +
        scopePointer() +
        '\n- [x] Another target. ' +
        scopePointer('6000000002', 'e', 'd')
    ),
  ],
  [
    'nonterminal pointer',
    body.replace(narrative, narrative + ' ' + scopePointer() + ' changed requirement'),
  ],
  ['missing native separator', body.replace(narrative, narrative + scopePointer())],
  ['standalone pointer', body.replace(narrative, narrative + '\n' + scopePointer())],
  ['indented target', body.replace(narrative, '  ' + narrative + ' ' + scopePointer())],
  [
    'alternate bullet',
    body.replace(narrative, narrative.replace('- ', '* ') + ' ' + scopePointer()),
  ],
  [
    'uppercase checkbox',
    body.replace(narrative, narrative.replace('[ ]', '[X]') + ' ' + scopePointer()),
  ],
  [
    'verification-bearing target',
    body.replace(narrative, narrative + ' <!-- aitm-verified vc-list="vc:1" --> ' + scopePointer()),
  ],
  ['verification token target', body.replace(narrative, narrative + ' vc:1 ' + scopePointer())],
  ['lifecycle target', body.replace(narrative, '- [x] Final Review Passed ' + scopePointer())],
  ['lifecycle alias', body.replace(narrative, '- [x] Passed final human review ' + scopePointer())],
  ['deep dive target', body.replace(narrative, '- [x] Deep dive complete ' + scopePointer())],
  ['discussion target', body.replace(narrative, '- [x] Discussion complete ' + scopePointer())],
  [
    'pointer outside Scope',
    body.replace(
      '## AITM Progress Markers',
      '## AITM Progress Markers\n- [x] Elsewhere. ' + scopePointer()
    ),
  ],
])
  test('[#144] mapping refuses native pointer ' + name, () => {
    assert.throws(() => api.extractRuntimeContractMapping(changed), /native-mapping-invalid/);
  });

test('[#144] mapping keeps a fenced literal identical to live native metadata as requirement text', () => {
  const literal = narrative.replace('[ ]', '[x]') + ' ' + scopePointer();
  const example = body.replace(narrative, narrative + '\n```text\n' + literal + '\n```');
  const recorded = example.replace(narrative + '\n', literal + '\n');
  assert.deepEqual(
    api.extractRuntimeContractMapping(recorded),
    api.extractRuntimeContractMapping(example)
  );
  assert.notDeepEqual(
    api.extractRuntimeContractMapping(
      recorded.replace(
        'text\n' + literal,
        'text\n' + literal.replace('exact normative', 'changed normative')
      )
    ),
    api.extractRuntimeContractMapping(recorded)
  );
});

test('[#144] fenced example checkbox glyph changes remain semantic Scope drift', () => {
  const example = body.replace(
    narrative,
    narrative + '\n```text\n- [ ] Literal requirement ' + scopePointer() + '\n```'
  );
  assert.notDeepEqual(
    api.extractRuntimeContractMapping(example.replace('- [ ] Literal', '- [x] Literal')),
    api.extractRuntimeContractMapping(example)
  );
});

const literalBlocks = [
  ['backtick', (text) => '```text\n' + text + '\n```'],
  ['tilde', (text) => '~~~~text\n' + text + '\n~~~~'],
  ['multiline comment', (text) => '<!-- retained literal\n' + text + '\n-->'],
];
for (const [kind, wrap] of literalBlocks) {
  test(
    '[#144] live section selection retains ' + kind + ' unrelated H2 and all following bytes',
    () => {
      const content = narrative + '\n' + wrap('## Other\nExact literal example  \t');
      const originalBody = body.replace(narrative, content);
      const expectedScope = '## Scope\n\n' + content + '\n\n';
      assert.equal(api.extractRuntimeContractMapping(originalBody).scopeSha256, sha(expectedScope));
      assert.notDeepEqual(
        api.extractRuntimeContractMapping(
          originalBody.replace('Exact literal example', 'Changed literal example')
        ),
        api.extractRuntimeContractMapping(originalBody)
      );
    }
  );
  for (const name of ['Scope', 'Plan Metadata', 'Verification Commands']) {
    test(
      '[#144] literal ' + kind + ' named ' + name + ' H2 cannot duplicate a live section',
      () => {
        const content = narrative + '\n' + wrap('## ' + name + '\nLiteral requirement  \t');
        const originalBody = body.replace(narrative, content);
        assert.equal(
          api.extractRuntimeContractMapping(originalBody).scopeSha256,
          sha('## Scope\n\n' + content + '\n\n')
        );
        assert.equal(
          api.extractRuntimeContractMapping(originalBody).planMetadataSha256,
          api.extractRuntimeContractMapping(body).planMetadataSha256
        );
        assert.equal(
          api.extractRuntimeContractMapping(originalBody).vc1Sha256,
          api.extractRuntimeContractMapping(body).vc1Sha256
        );
      }
    );
    test(
      '[#144] literal ' + kind + ' named ' + name + ' H2 cannot replace a missing live heading',
      () => {
        const changed = body.replace('## ' + name, wrap('## ' + name));
        assert.throws(() => api.extractRuntimeContractMapping(changed), /native-mapping-invalid/);
      }
    );
  }
}
test('[#144] live section selection still refuses genuine duplicate or missing headings', () => {
  for (const name of ['Scope', 'Plan Metadata', 'Verification Commands']) {
    assert.throws(
      () =>
        api.extractRuntimeContractMapping(
          body.replace('## ' + name, '## ' + name + '\n\n## ' + name)
        ),
      /native-mapping-invalid/
    );
    assert.throws(
      () => api.extractRuntimeContractMapping(body.replace('## ' + name, '## Removed')),
      /native-mapping-invalid/
    );
  }
});

test('[#144] mapping preserves VC1 command digest after native Test verification stamping', () => {
  const command = 'node checker.mjs --mode adoption-only';
  const stamp =
    ' <!-- aitm-verified cmd="' +
    command +
    '" exit="0" sha="' +
    'd'.repeat(40) +
    '" ts="2026-10-06T02:14:31.904Z" evidence="sandbox exit 0 (' +
    command +
    ')" -->';
  const stamped = body.replace(
    '- [ ] `' + command + '` <!-- id=1 -->',
    '- [x] `' + command + '` <!-- id=1 -->' + stamp
  );
  const mapping = api.extractRuntimeContractMapping(stamped);
  assert.equal(mapping.vc1Sha256, sha(command));
  assert.equal(
    mapping.scopeSha256,
    sha('## Scope\n\n- [ ] Preserve exact normative contract.\n\n')
  );
  assert.equal(mapping.issue, 144);
  assert.equal(mapping.originalSourcePlanCommit, original);
  const changed = api.extractRuntimeContractMapping(
    stamped.replace('`' + command + '`', '`node checker.mjs --mode publication`')
  );
  assert.equal(changed.vc1Sha256, sha('node checker.mjs --mode publication'));
  assert.notEqual(changed.vc1Sha256, mapping.vc1Sha256);
});

test('[#144] VC1 annotations never hide duplicate commands or unsupported trailing text', () => {
  const command = 'node checker.mjs --mode adoption-only';
  const line = '- [ ] `' + command + '` <!-- id=1 -->';
  const stamp =
    ' <!-- aitm-verified cmd="' +
    command +
    '" exit="0" sha="' +
    'd'.repeat(40) +
    '" ts="2026-10-06T02:14:31.904Z" -->';
  for (const changed of [
    body.replace(line, line + stamp + '\n' + line + stamp),
    body.replace(line, line + stamp + ' extra requirement'),
    body.replace(line, line + ' <!-- operator-approved value="true" -->'),
    body.replace(line, line + stamp + stamp),
    body.replace(line, line + ' <!-- aitm-verified exit="0" unfinished -->'),
  ])
    assert.throws(() => api.extractRuntimeContractMapping(changed), /native-mapping-invalid/);
});
