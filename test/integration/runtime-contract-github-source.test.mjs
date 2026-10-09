// @story #144
// Transport conformance only; a source read never grants contract adoption.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { readNativeContractSource } from '../../scripts/lib/runtime-contract-evidence.mjs';

const descriptor = {
  kind: 'aitm-owned-comment',
  repository: 'kburson/ai-peer-review',
  issue: 144,
  ownedCommentKey: 'runtime-contract-approved-evidence.review-transport-conformance',
  commentDatabaseId: 5987759101,
  commentNodeId: 'IC_transport_conformance',
  url: 'https://github.com/kburson/ai-peer-review/issues/144#issuecomment-5987759101',
  authoredBy: 'kburson',
  body: {
    revision: 'a'.repeat(40),
    path: 'evidence/portable-runtime/contracts/conformance.md',
    blob: 'b'.repeat(40),
    sha256: 'c'.repeat(64),
  },
  bodySha256: 'c'.repeat(64),
  publishedAt: '2026-10-05T00:00:00Z',
  observedAt: '2026-10-05T00:00:01Z',
};
test('[#144] native GitHub source refuses unknown endpoints before credential access', () => {
  assert.throws(
    () => readNativeContractSource({ ...descriptor, repository: 'other/repository' }),
    /approved-evidence-source-invalid/
  );
});
test('[#144] native GitHub source refuses unavailable credential resolver without leaking credentials', (t) => {
  const config = mkdtempSync(path.join(tmpdir(), 'apr-no-github-auth-'));
  t.after(() => rmSync(config, { recursive: true, force: true }));
  const env = { ...process.env, GH_CONFIG_DIR: config, PATH: config };
  delete env.GH_TOKEN;
  delete env.GITHUB_TOKEN;
  delete env.GH_ENTERPRISE_TOKEN;
  delete env.GITHUB_ENTERPRISE_TOKEN;
  const script =
    "import {readNativeContractSource} from './scripts/lib/runtime-contract-evidence.mjs';try {readNativeContractSource(JSON.parse(process.argv[1])); process.exitCode=2;} catch(e) { console.log(e.message); }";
  const output = execFileSync(
    process.execPath,
    ['--input-type=module', '-e', script, JSON.stringify(descriptor)],
    { env, encoding: 'utf8' }
  );
  assert.equal(output.trim(), 'approved-evidence-source-unavailable');
});
test(
  '[#144] hosted Actions credential reads the fixed GitHub repository and original comment',
  {
    skip:
      process.env.APR_CONTRACT_GITHUB_CONFORMANCE !== '1'
        ? 'Hosted authenticated source conformance is unavailable here.'
        : false,
  },
  () => {
    assert.ok(process.env.GH_TOKEN, 'Hosted read-only credential must be explicitly supplied.');
    const source = readNativeContractSource(descriptor);
    assert.equal(source.authentication.kind, 'github-api-credential');
    assert.equal(source.authentication.repository, 'kburson/ai-peer-review');
    assert.equal(source.issue.number, 144);
    assert.equal(source.comment.id, 5987759101);
    assert.equal(
      source.comment.issue_url,
      'https://api.github.com/repos/kburson/ai-peer-review/issues/144'
    );
    assert.equal(typeof source.comment.user.login, 'string');
    console.log(
      'GitHub service source read observed; no adoption or original private-event replay claimed.'
    );
  }
);
