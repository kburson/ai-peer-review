import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { fingerprintSession } from '../../src/identity/registry.mjs';
import {
  buildClaudeReviewerLaunch,
  buildClaudeReviewerLaunchFromExecution,
  encodeClaudeExecutionPermissions,
} from '../../src/provider/claude-launch.mjs';

export function launchFixture(t) {
  const scratch = path.join(process.cwd(), '.scratch', 'test');
  mkdirSync(scratch, { recursive: true });
  const root = mkdtempSync(path.join(scratch, 'claude-launch-identity-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const repositoryRoot = path.join(root, 'repository');
  const destination = path.join(repositoryRoot, 'docs', 'peer-reviews', 'spec', 'review-1');
  const workspace = path.join(repositoryRoot, '.scratch', 'peer-review', 'review-1');
  const artifact = path.join(repositoryRoot, 'docs', 'artifact.md');
  const invitation = path.join(destination, 'reviewer-invitation.md');
  const response = path.join(destination, 'reviewer-response-1.md');
  mkdirSync(destination, { recursive: true });
  mkdirSync(workspace, { recursive: true });
  writeFileSync(artifact, '# Artifact\n');
  writeFileSync(invitation, '# Invitation\n');
  const contract = buildClaudeReviewerLaunch({
    repositoryRoot,
    invitation,
    routing: {
      schema: 'ai-peer-review.invitation-routing/v1',
      review_id: 'review-1',
      artifact,
      workspace,
      response,
    },
    model: 'claude-opus-5',
    effort: 'high',
  });
  return {
    contract,
    workspace,
    stateFile: path.join(workspace, 'provider', 'claude', 'launch-state.json'),
  };
}

export function preflightLaunchFixture(t, childEnvironment) {
  const fixture = launchFixture(t);
  const { contract } = fixture;
  const packageBin = path.join(contract.repository_root, 'bin', 'peer-review.mjs');
  mkdirSync(path.dirname(packageBin), { recursive: true });
  writeFileSync(packageBin, '# package\n');
  const execution = {
    schema: 'ai-peer-review.execution-contract/v1',
    review_id: contract.review_id,
    repository_root: contract.repository_root,
    workspace: contract.workspace,
    invitation: contract.invitation,
    response: contract.response,
    artifact: contract.artifact,
    host: 'claude',
    model: contract.model,
    effort: contract.effort,
    join_required: true,
    commands: {
      join: {
        file: process.execPath,
        args: [packageBin, 'join', contract.invitation],
        shell: false,
      },
      submit: {
        file: process.execPath,
        args: [packageBin, 'submit', contract.workspace],
        shell: false,
      },
    },
  };
  const preflight = {
    schema: 'ai-peer-review.provider-preflight/v1',
    status: 'ready',
    executable: { path: '/opt/claude/bin/claude' },
    permissions: encodeClaudeExecutionPermissions(execution),
    digest: `sha256:${'1'.repeat(64)}`,
    child_environment: childEnvironment,
  };
  return {
    ...fixture,
    preflight,
    contract: buildClaudeReviewerLaunchFromExecution({ contract: execution, preflight }),
  };
}

export function launchAuthority({
  joined = true,
  sequence = 3,
  revision = 2,
  events = [],
  state,
} = {}) {
  return {
    state: {
      protocol: {
        review_id: 'review-1',
        sequence,
        revision,
        state: state ?? (joined ? 'reviewer-turn' : 'awaiting-reviewer'),
      },
      participants: joined
        ? {
            reviewer: {
              host: 'claude-code',
              provider: 'anthropic',
              session_fingerprint: fingerprintSession('anthropic', 'fixture-claude-session'),
            },
          }
        : {},
    },
    events,
  };
}
