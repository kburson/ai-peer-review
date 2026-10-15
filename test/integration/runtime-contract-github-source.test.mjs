// @story #144
// Transport conformance only; a source read never grants contract adoption.
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
// Confined to this isolated test process; also trace the actual hosted direct read.
import * as transportDiagnostics from '../helpers/contract-source-transport-diagnostics.mjs';
const diagnostic = new URL('../helpers/contract-source-transport-diagnostics.mjs', import.meta.url)
  .href;

test('contract trace reports only ordered fixed-request phases and excludes private debug bytes', () => {
  assert.equal(typeof transportDiagnostics.contractTransportTrace, 'function');
  const trace = [
    '* Request at fixture-time',
    '* Request to https://api.github.com/repos/kburson/ai-peer-review',
    '> GET /repos/kburson/ai-peer-review HTTP/1.1',
    '> Host: api.github.com',
    '> Authorization: Bearer fixture-private-token',
    '',
    '< HTTP/2.0 200 OK',
    '< Set-Cookie: fixture-private-cookie',
    '',
    '{"private":"fixture-private-body"}',
    '< HTTP/2.0 500 body-text-is-not-a-response',
  ].join('\n');
  assert.deepEqual(
    transportDiagnostics.contractTransportTrace(trace, 'repos/kburson/ai-peer-review'),
    {
      requestObserved: true,
      responseHeadersObserved: true,
      httpStatus: 200,
      traceTruncated: false,
    }
  );
});
test('contract trace cannot infer a response from body text or an unexpected endpoint', () => {
  assert.equal(typeof transportDiagnostics.contractTransportTrace, 'function');
  for (const trace of [
    '* Request at fixture-time\n* Request to https://foreign.invalid/private\n> GET /repos/kburson/ai-peer-review HTTP/1.1\n> Host: api.github.com\n\n< HTTP/2.0 200 OK',
    'private body\n< HTTP/2.0 200 OK\n* Request took 1ms',
    '* Request at fixture-time\n* Request to https://api.github.com/repos/kburson/ai-peer-review\n> GET /repos/kburson/ai-peer-review HTTP/1.1\nprivate body\n< HTTP/2.0 200 OK',
  ])
    assert.deepEqual(
      transportDiagnostics.contractTransportTrace(trace, 'repos/kburson/ai-peer-review'),
      {
        requestObserved: false,
        responseHeadersObserved: false,
        httpStatus: null,
        traceTruncated: false,
      }
    );
});
test('contract trace retains unknown phases for truncated debug output', () => {
  assert.equal(typeof transportDiagnostics.contractTransportTrace, 'function');
  assert.deepEqual(
    transportDiagnostics.contractTransportTrace(
      'private'.repeat(10000),
      'repos/kburson/ai-peer-review'
    ),
    {
      requestObserved: false,
      responseHeadersObserved: false,
      httpStatus: null,
      traceTruncated: true,
    }
  );
});
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
test('contract transport diagnostics preserve actual command output', () => {
  const result = spawnSync(
    process.execPath,
    [
      '--import',
      diagnostic,
      '--input-type=module',
      '-e',
      "import {execFileSync} from 'node:child_process'; process.stdout.write(execFileSync(process.execPath,['-e','process.stdout.write(\"actual-output\")'],{stdio:['ignore','pipe','pipe']}));",
    ],
    { encoding: 'utf8' }
  );
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout, 'actual-output');
  assert.equal(result.stderr, '');
});
test('contract transport diagnostics retain real unavailable credential refusal without private values', (t) => {
  const config = mkdtempSync(path.join(tmpdir(), 'apr-contract-diagnostic-'));
  t.after(() => rmSync(config, { recursive: true, force: true }));
  const env = { ...process.env, PATH: config, GH_CONFIG_DIR: config };
  delete env.GH_TOKEN;
  delete env.GITHUB_TOKEN;
  const script =
    "import {readNativeContractSource} from './scripts/lib/runtime-contract-evidence.mjs';try {readNativeContractSource(JSON.parse(process.argv[1])); process.exitCode=2;} catch(e) {console.log(e.message);}";
  const result = spawnSync(
    process.execPath,
    ['--import', diagnostic, '--input-type=module', '-e', script, JSON.stringify(descriptor)],
    { env, encoding: 'utf8' }
  );
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout.trim(), 'approved-evidence-source-unavailable');
  const line = result.stderr.trim();
  assert.ok(line.startsWith('contract-transport-diagnostic '));
  const evidence = JSON.parse(line.slice('contract-transport-diagnostic '.length));
  assert.equal(evidence.verified, false);
  assert.equal(evidence.operation, 'credential');
  assert.equal(evidence.code, 'ENOENT');
  assert.equal(evidence.status, null);
  assert.ok(Number.isFinite(evidence.elapsedMs));
  assert.equal(line.includes(config), false);
});

// An explicit credential never proves source authority: actual API transport is still mandatory.
for (const name of ['GH_TOKEN', 'GITHUB_TOKEN']) {
  test(`explicit ${name} avoids redundant credential CLI but refuses unavailable actual API`, (t) => {
    const config = mkdtempSync(path.join(tmpdir(), 'apr-explicit-github-auth-'));
    t.after(() => rmSync(config, { recursive: true, force: true }));
    const env = { ...process.env, PATH: config, GH_CONFIG_DIR: config };
    delete env.GH_TOKEN;
    delete env.GITHUB_TOKEN;
    env[name] = 'unverified-test-credential';
    const script =
      "import {readNativeContractSource} from './scripts/lib/runtime-contract-evidence.mjs';try {readNativeContractSource(JSON.parse(process.argv[1])); process.exitCode=2;} catch(e) {console.log(e.message);}";
    const result = spawnSync(
      process.execPath,
      ['--import', diagnostic, '--input-type=module', '-e', script, JSON.stringify(descriptor)],
      { env, encoding: 'utf8' }
    );
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stdout.trim(), 'approved-evidence-source-unavailable');
    const line = result.stderr.trim();
    assert.ok(line.startsWith('contract-transport-diagnostic '));
    const evidence = JSON.parse(line.slice('contract-transport-diagnostic '.length));
    assert.equal(evidence.operation, 'repository');
    assert.equal(evidence.code, 'ENOENT');
    assert.equal(evidence.verified, false);
    assert.equal(line.includes(env[name]), false);
    assert.equal(line.includes(config), false);
  });
}
test('malformed preferred explicit credential refuses without lower-priority credential or CLI fallback', (t) => {
  const config = mkdtempSync(path.join(tmpdir(), 'apr-invalid-github-auth-'));
  t.after(() => rmSync(config, { recursive: true, force: true }));
  const env = {
    ...process.env,
    PATH: config,
    GH_CONFIG_DIR: config,
    GH_TOKEN: 'invalid\ncredential',
    GITHUB_TOKEN: 'unverified-lower-priority-credential',
  };
  const script =
    "import {readNativeContractSource} from './scripts/lib/runtime-contract-evidence.mjs';try {readNativeContractSource(JSON.parse(process.argv[1])); process.exitCode=2;} catch(e) {console.log(e.message);}";
  const result = spawnSync(
    process.execPath,
    ['--import', diagnostic, '--input-type=module', '-e', script, JSON.stringify(descriptor)],
    { env, encoding: 'utf8' }
  );
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout.trim(), 'approved-evidence-source-unavailable');
  assert.equal(result.stderr, '');
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
