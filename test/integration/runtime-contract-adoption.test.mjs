// @story #144
// Offline Git fixtures exercise pinning; none represents a real adopted contract.
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { inspectApprovedAdoption } from '../../scripts/check-runtime-contract-adoption.mjs';

const hash = (value) => createHash('sha256').update(value).digest('hex');
function withGitFixture(run) {
  const cwd = mkdtempSync(path.join(tmpdir(), 'apr-contract-fixture-'));
  const git = (...args) =>
    execFileSync('git', args, {
      cwd,
      encoding: 'utf8',
      env: Object.fromEntries(
        Object.entries(process.env).filter(([key]) => !key.startsWith('GIT_'))
      ),
    });
  try {
    git('init', '--quiet');
    git('config', 'user.name', 'Contract fixture');
    git('config', 'user.email', 'fixture@example.invalid');
    const record = 'evidence/portable-runtime/contracts/record.json';
    mkdirSync(path.dirname(path.join(cwd, record)), { recursive: true });
    writeFileSync(path.join(cwd, record), JSON.stringify({ schema: 'draft-only' }));
    git('add', record);
    git('commit', '--quiet', '-m', 'Offline fixture only; no acceptance');
    const revision = git('rev-parse', 'HEAD').trim();
    const selector = {
      schema: 'ai-peer-review.runtime-contract-approved-ref/v1',
      evidenceRevision: revision,
      record: {
        revision,
        path: record,
        blob: git('rev-parse', revision + ':' + record).trim(),
        sha256: hash(readFileSync(path.join(cwd, record))),
      },
      approvalReview: {
        reviewId: 'draft-fixture',
        subject: null,
        manifest: null,
        finalResponse: null,
        finalization: {
          revision,
          sha256: hash(git('show', '--no-patch', '--format=%B', revision)),
        },
      },
    };
    // Complete locator grammar only. These five deliberately non-normal draft
    // objects and synthetic public descriptor never supply acceptance authority.
    selector.lineageProofs = Array.from({ length: 5 }, (_, i) => ({
      review: {
        reviewId: 'review-offline-fixture-' + i,
        subject: selector.record,
        manifest: selector.record,
        finalResponse: selector.record,
        finalization: selector.approvalReview.finalization,
      },
      receipt: selector.record,
      verifier: selector.record,
    }));
    selector.approvedEvidenceTransaction = {
      kind: 'aitm-owned-comment',
      repository: 'kburson/ai-peer-review',
      issue: 144,
      ownedCommentKey: 'runtime-contract-approved-evidence.review-offline-fixture',
      commentDatabaseId: 1,
      commentNodeId: 'IC_offline_fixture',
      url: 'https://github.com/kburson/ai-peer-review/issues/144#issuecomment-1',
      authoredBy: 'offline-fixture',
      body: selector.record,
      bodySha256: selector.record.sha256,
      publishedAt: '2026-10-05T00:00:00Z',
      observedAt: '2026-10-05T00:00:01Z',
    };
    const approvedRef = path.join(cwd, 'selector.json');
    writeFileSync(approvedRef, JSON.stringify(selector));
    run({ cwd, record, approvedRef, git, selector });
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
}
test('[#144] genuine immutable Git pin does not make a draft without accepted review authoritative', () => {
  withGitFixture((f) => {
    const before = f.git('status', '--porcelain');
    const previous = process.env.GIT_DIR;
    process.env.GIT_DIR = '/invalid/fixture-only/git-dir';
    let report;
    try {
      report = inspectApprovedAdoption(f);
    } finally {
      if (previous === undefined) delete process.env.GIT_DIR;
      else process.env.GIT_DIR = previous;
    }
    assert.equal(report.contractAdopted, false);
    assert.equal(report.activationAuthorized, false);
    assert.equal(report.publicationAllowed, false);
    assert.ok(report.contractBlockers.includes('review-proof-incomplete'));
    assert.equal(f.git('status', '--porcelain'), before);
  });
});
test('[#144] local bytes must equal the exact pinned Git record', () => {
  withGitFixture((f) => {
    writeFileSync(path.join(f.cwd, f.record), '{"schema":"drifted-draft"}');
    assert.throws(() => inspectApprovedAdoption(f), /record-drift/);
  });
});
test('[#144] duplicate selector keys are refused before artifact lookup', () => {
  withGitFixture((f) => {
    writeFileSync(f.approvedRef, '{"schema":"draft","schema":"other"}');
    assert.throws(() => inspectApprovedAdoption(f));
  });
});
