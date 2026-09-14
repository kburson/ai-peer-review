import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';

import {
  buildClaudeReviewerLaunch,
  encodeClaudeEditRule,
  matchesClaudeEditRule,
} from '../../src/provider/claude-launch.mjs';

function fixture(prefix = 'claude launch ') {
  const scratch = path.join(process.cwd(), '.scratch', 'test');
  mkdirSync(scratch, { recursive: true });
  const root = mkdtempSync(path.join(scratch, prefix));
  const repositoryRoot = path.join(root, 'repository with spaces');
  const destination = path.join(repositoryRoot, 'docs', 'peer-reviews', 'spec', 'review-1');
  const workspace = path.join(repositoryRoot, '.scratch', 'peer-review', 'review-1');
  const artifact = path.join(repositoryRoot, 'docs', 'artifact.md');
  const invitation = path.join(destination, 'reviewer-invitation.md');
  const response = path.join(destination, 'reviewer-response-1.md');
  mkdirSync(destination, { recursive: true });
  mkdirSync(workspace, { recursive: true });
  writeFileSync(artifact, '# Artifact\n');
  writeFileSync(invitation, '# Invitation\n');
  return {
    root,
    repositoryRoot,
    invitation,
    routing: {
      schema: 'ai-peer-review.invitation-routing/v1',
      review_id: 'review-1',
      artifact,
      workspace,
      response,
    },
    cleanup: () => rmSync(root, { recursive: true, force: true }),
  };
}

test('encodes a filesystem-root Edit rule instead of the reproduced project-relative rule', () => {
  const response = '/work/project/reviewer-response-1.md';
  assert.equal(encodeClaudeEditRule(response), 'Edit(//work/project/reviewer-response-1.md)');
  assert.equal(
    matchesClaudeEditRule('Edit(//work/project/reviewer-response-1.md)', response, {
      projectRoot: '/work/project',
    }),
    true
  );
  assert.equal(
    matchesClaudeEditRule('Edit(/work/project/reviewer-response-1.md)', response, {
      projectRoot: '/work/project',
    }),
    false
  );
});

test('keeps spaces literal and refuses unsafe or noncanonical permission paths', () => {
  assert.equal(
    encodeClaudeEditRule('/work/review files/response.md'),
    'Edit(//work/review files/response.md)'
  );
  for (const candidate of [
    'relative/response.md',
    '/work/reviews/../response.md',
    '/work/reviews/*.md',
    '/work/reviews/response?.md',
    '/work/reviews/[response].md',
    '/work/reviews/response\\name.md',
  ]) {
    assert.throws(() => encodeClaudeEditRule(candidate), {
      code: 'APR_CLAUDE_PERMISSION_INVALID',
    });
  }
});

test('builds an immutable dontAsk launch that authorizes only the pending response', (t) => {
  const fx = fixture();
  t.after(fx.cleanup);
  const contract = buildClaudeReviewerLaunch({
    repositoryRoot: fx.repositoryRoot,
    invitation: fx.invitation,
    routing: fx.routing,
    model: 'claude-opus-5',
    effort: 'high',
  });

  assert.equal(contract.schema, 'ai-peer-review.claude-launch/v1');
  assert.equal(contract.command.file, 'claude');
  assert.equal(contract.command.shell, false);
  assert.equal(contract.command.args.includes('dontAsk'), true);
  assert.deepEqual(contract.permissions.allow, [
    'Read',
    'Glob',
    'Grep',
    `Edit(/${fx.routing.response})`,
  ]);
  assert.deepEqual(contract.readiness, {
    exact_response: true,
    bad_single_slash_rejected: true,
    artifact_rejected: true,
    neighbor_rejected: true,
  });
  assert.equal(Object.isFrozen(contract), true);
  assert.equal(Object.isFrozen(contract.command.args), true);
  assert.equal(
    matchesClaudeEditRule(contract.permissions.allow.at(-1), fx.routing.artifact, {
      projectRoot: fx.repositoryRoot,
    }),
    false
  );
  assert.equal(
    matchesClaudeEditRule(
      contract.permissions.allow.at(-1),
      path.join(path.dirname(fx.routing.response), 'reviewer-response-2.md'),
      { projectRoot: fx.repositoryRoot }
    ),
    false
  );
});

test('fails closed for path escape, routing drift, symlinks, and incomplete launch identity', (t) => {
  const fx = fixture('claude launch invalid ');
  t.after(fx.cleanup);
  const base = {
    repositoryRoot: fx.repositoryRoot,
    invitation: fx.invitation,
    routing: fx.routing,
    model: 'claude-opus-5',
    effort: 'high',
  };

  for (const input of [
    { ...base, routing: { ...fx.routing, response: path.join(fx.root, 'outside.md') } },
    { ...base, invitation: path.join(fx.root, 'other-invitation.md') },
    { ...base, model: '' },
    { ...base, effort: '' },
  ]) {
    assert.throws(
      () => buildClaudeReviewerLaunch(input),
      (error) => ['APR_CLAUDE_PERMISSION_INVALID', 'APR_INVITATION_INVALID'].includes(error.code)
    );
  }

  const outside = path.join(fx.root, 'outside');
  mkdirSync(outside);
  const link = path.join(fx.repositoryRoot, 'linked-outside');
  symlinkSync(outside, link, 'dir');
  assert.throws(
    () =>
      buildClaudeReviewerLaunch({
        ...base,
        routing: { ...fx.routing, response: path.join(link, 'response.md') },
      }),
    { code: 'APR_CLAUDE_PERMISSION_INVALID' }
  );
});
