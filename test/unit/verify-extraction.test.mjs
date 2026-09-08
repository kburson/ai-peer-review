import assert from 'node:assert/strict';
import test from 'node:test';

import {
  canonicalRelicensingPayload,
  EXPECTED_HOLDER_IDENTITIES,
  verifyRelicensingDeclaration,
  verifyExtraction,
} from '../../scripts/verify-extraction.mjs';
import {
  buildSecretScanRecord,
  redactGitleaksReport,
} from '../../scripts/run-secret-scan.mjs';

const SHA = 'a'.repeat(64);

function validDeclaration(overrides = {}) {
  return {
    schema: 'ai-peer-review.relicensing-declaration/v1',
    copyright_holder: 'Kendrick Burson',
    covered_source_repository: 'https://github.com/kburson/ai-task-manager',
    covered_source_commit: '4b3bcd43cba141a611da4a2b861433b915462806',
    license_grant: 'Apache-2.0',
    proprietary_fork_consequence_accepted: true,
    authorization_statement:
      'I, Kendrick Burson, as copyright holder, approve relicensing the extracted ai-peer-review code covered by AITM source commit 4b3bcd43cba141a611da4a2b861433b915462806 under Apache-2.0, accept the proprietary-fork consequence, and authorize use of my existing SSH Ed25519 key to sign the declaration and proceed with public publication.',
    signature_type: 'ssh-ed25519',
    signature_namespace: 'ai-peer-review-relicensing',
    signer_identity: 'copyright-holder',
    signer_public_key: 'ssh-ed25519 AAAATEST kendrick@example.com',
    signer_fingerprint: 'SHA256:test',
    signed_at: '2026-09-08T12:00:00Z',
    signature: '-----BEGIN SSH SIGNATURE-----\ntest\n-----END SSH SIGNATURE-----\n',
    ...overrides,
  };
}

function validManifest(overrides = {}) {
  return {
    schema: 'ai-peer-review.extraction/v1',
    source_repository: 'https://github.com/kburson/ai-task-manager',
    source_commit: '4b3bcd43cba141a611da4a2b861433b915462806',
    filtered_history_tip: 'bfc6f9ffabd8281a815c7bd0e0824f3bacb84d9d',
    prefilter_ref_inventory: [
      {
        ref: 'refs/heads/extraction-source',
        object: '4b3bcd43cba141a611da4a2b861433b915462806',
      },
    ],
    retained_path_rules: {
      prefixes: ['scripts/review', 'scripts/providers'],
      globs: [
        'scripts/tests/**/*co-review*',
        'docs/superpowers/specs/*co-review*',
        'docs/superpowers/plans/*co-review*',
      ],
      exact: ['LICENSE', 'NOTICE', 'LICENSE-COMMERCIAL'],
    },
    standalone_path_rules: {
      prefixes: [
        '.github/workflows',
        'bin',
        'docs/design',
        'provenance',
        'schemas',
        'skills/peer-review',
        'src',
        'templates',
        'test',
      ],
      exact: [
        '.gitignore',
        '.gitleaks.toml',
        '.markdownlint-cli2.jsonc',
        '.npmrc',
        '.prettierignore',
        '.prettierrc.json',
        'CONTRIBUTING.md',
        'LICENSE',
        'NOTICE',
        'README.md',
        'cspell.json',
        'docs/dependency-audit-mcp.md',
        'docs/spdx-policy.md',
        'eslint.config.mjs',
        'package-lock.json',
        'package.json',
        'scripts/run-secret-scan.mjs',
        'scripts/verify-extraction.mjs',
        'scripts/verify-release.mjs',
      ],
    },
    legacy_retained_path_rules: {
      prefixes: ['scripts/review', 'scripts/providers'],
      globs: [
        'scripts/tests/**/*co-review*',
        'docs/superpowers/specs/*co-review*',
        'docs/superpowers/plans/*co-review*',
      ],
    },
    retained_path_inventory: {
      paths: ['LICENSE', 'scripts/review/co-review.mjs'],
      digest: SHA,
    },
    contributor_audit: {
      command_argv: ['git', 'log'],
      normalizer: 'LC_ALL=C sort -fu',
      normalized_result: [...EXPECTED_HOLDER_IDENTITIES],
      digest: SHA,
    },
    secret_scan: {
      tool: 'gitleaks',
      tool_version: '8.30.1',
      config_digest: SHA,
      scanned_ref: 'bfc6f9ffabd8281a815c7bd0e0824f3bacb84d9d',
      report_digest: SHA,
      result: 'pass',
    },
    relicensing_declaration_digest: SHA,
    design_source: {
      repository: 'https://github.com/kburson/ai-task-manager',
      commit: '68de80b45b23c90874bac0fcd87cfa0c1980edd4',
      path: 'docs/superpowers/specs/2026-09-07-ai-peer-review-extraction-design.md',
      digest: SHA,
    },
    ...overrides,
  };
}

function fakeGit({ history = 'scripts/review/co-review.mjs\nLICENSE\n', current } = {}) {
  const currentPaths =
    current ??
    [
      '.gitleaks.toml',
      'LICENSE',
      'NOTICE',
      'README.md',
      'scripts/verify-extraction.mjs',
      'scripts/review/co-review.mjs',
      'test/unit/verify-extraction.test.mjs',
    ].join('\n');
  return async (_root, args) => {
    if (args[0] === 'log') return history;
    if (args[0] === 'ls-tree') return `${currentPaths}\n`;
    throw new Error(`unexpected git argv: ${args.join(' ')}`);
  };
}

test('accepts the exact filtered boundary before legacy parity removal', async () => {
  const result = await verifyExtraction({
    root: '/repo',
    manifest: validManifest(),
    runGit: fakeGit(),
  });
  assert.deepEqual(result, {
    sourceCommit: '4b3bcd43cba141a611da4a2b861433b915462806',
    filteredTip: 'bfc6f9ffabd8281a815c7bd0e0824f3bacb84d9d',
  });
});

test('canonical relicensing payload excludes only the detached signature', () => {
  const declaration = validDeclaration();
  const payload = canonicalRelicensingPayload(declaration);
  assert.equal(payload.includes('"signature"'), false);
  assert.equal(payload.includes(declaration.authorization_statement), true);
  assert.equal(payload.endsWith('\n'), true);
});

test('verifies the signed relicensing declaration through an injected SSH verifier', async () => {
  const declaration = validDeclaration();
  const declarationBytes = Buffer.from(`${JSON.stringify(declaration, null, 2)}\n`);
  let invocation;
  const digest = await verifyRelicensingDeclaration({
    declarationBytes,
    runSshVerify: async (details) => {
      invocation = details;
    },
  });
  assert.match(digest, /^[a-f0-9]{64}$/);
  assert.equal(invocation.identity, 'copyright-holder');
  assert.equal(invocation.namespace, 'ai-peer-review-relicensing');
  assert.equal(invocation.signature, declaration.signature);
  assert.equal(invocation.payload, canonicalRelicensingPayload(declaration));
});

test('rejects a relicensing declaration without the exact grant boundary', async () => {
  const declaration = validDeclaration({ license_grant: 'MIT' });
  await assert.rejects(
    verifyRelicensingDeclaration({
      declarationBytes: Buffer.from(`${JSON.stringify(declaration, null, 2)}\n`),
      runSshVerify: async () => {},
    }),
    /license grant/
  );
});

test('rejects a leaked path from filtered history', async () => {
  await assert.rejects(
    verifyExtraction({
      root: '/repo',
      manifest: validManifest(),
      runGit: fakeGit({ history: 'scripts/review/co-review.mjs\npackage.json\n' }),
    }),
    /foreign retained paths: package\.json/
  );
});

test('does not widen co-review globs to their containing directories', async () => {
  await assert.rejects(
    verifyExtraction({
      root: '/repo',
      manifest: validManifest(),
      runGit: fakeGit({ history: 'scripts/tests/unit/unrelated.test.mjs\n' }),
    }),
    /foreign retained paths/
  );
});

test('rejects a foreign path in standalone HEAD', async () => {
  await assert.rejects(
    verifyExtraction({
      root: '/repo',
      manifest: validManifest(),
      runGit: fakeGit({ current: 'LICENSE\nprivate.txt' }),
    }),
    /foreign standalone paths: private\.txt/
  );
});

test('release gate rejects retained legacy paths', async () => {
  await assert.rejects(
    verifyExtraction({
      root: '/repo',
      manifest: validManifest(),
      runGit: fakeGit(),
      requireLegacyRemoved: true,
    }),
    /legacy retained paths/
  );
});

for (const [name, mutate, pattern] of [
  ['failed scan', (m) => (m.secret_scan.result = 'fail'), /secret scan result/],
  ['missing scan version', (m) => (m.secret_scan.tool_version = null), /secret scan version/],
  ['empty contributor audit', (m) => (m.contributor_audit.normalized_result = []), /contributor audit/],
  [
    'changed contributor audit',
    (m) => (m.contributor_audit.normalized_result = ['Somebody Else <else@example.com>']),
    /contributor audit/,
  ],
  [
    'null declaration digest',
    (m) => (m.relicensing_declaration_digest = null),
    /relicensing declaration digest/,
  ],
  [
    'malformed source boundary',
    (m) => (m.prefilter_ref_inventory[0].object = 'deadbeef'),
    /prefilter ref inventory/,
  ],
]) {
  test(`rejects ${name}`, async () => {
    const manifest = validManifest();
    mutate(manifest);
    await assert.rejects(
      verifyExtraction({ root: '/repo', manifest, runGit: fakeGit() }),
      pattern
    );
  });
}

test('redacts secret material before hashing a Gitleaks report', () => {
  const report = redactGitleaksReport(
    JSON.stringify([
      {
        RuleID: 'generic-api-key',
        Description: 'Generic API Key',
        File: 'docs/example.md',
        StartLine: 7,
        EndLine: 7,
        Commit: 'f'.repeat(40),
        Secret: 'super-secret-value',
        Match: 'token=super-secret-value',
        Fingerprint: 'stable-fingerprint',
      },
    ])
  );
  assert.equal(report.includes('super-secret-value'), false);
  const parsed = JSON.parse(report);
  assert.deepEqual(parsed[0], {
    commit: 'f'.repeat(40),
    description: 'Generic API Key',
    end_line: 7,
    file: 'docs/example.md',
    fingerprint: 'stable-fingerprint',
    rule_id: 'generic-api-key',
    start_line: 7,
  });
});

test('builds a closed passing secret-scan provenance record', () => {
  const record = buildSecretScanRecord({
    toolVersion: '8.30.1',
    configBytes: Buffer.from('[extend]\nuseDefault = true\n'),
    scannedRef: 'bfc6f9ffabd8281a815c7bd0e0824f3bacb84d9d',
    redactedReportBytes: Buffer.from('[]\n'),
    exitCode: 0,
  });
  assert.equal(record.tool, 'gitleaks');
  assert.equal(record.tool_version, '8.30.1');
  assert.equal(record.scanned_ref, 'bfc6f9ffabd8281a815c7bd0e0824f3bacb84d9d');
  assert.match(record.config_digest, /^[a-f0-9]{64}$/);
  assert.match(record.report_digest, /^[a-f0-9]{64}$/);
  assert.equal(record.result, 'pass');
});

test('refuses to record a failed Gitleaks scan as passing', () => {
  assert.throws(
    () =>
      buildSecretScanRecord({
        toolVersion: '8.30.1',
        configBytes: Buffer.from('[extend]\nuseDefault = true\n'),
        scannedRef: 'bfc6f9ffabd8281a815c7bd0e0824f3bacb84d9d',
        redactedReportBytes: Buffer.from('[]\n'),
        exitCode: 1,
      }),
    /Gitleaks scan failed/
  );
});
