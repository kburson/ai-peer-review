// Test-only access to mutation surfaces that are intentionally excluded from
// the package's bounded public adapter API.
import { chmodSync, mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pinRuntimeImage } from '../../src/broker/runtime-image.mjs';
import { createHash } from 'node:crypto';
import { event } from './review-fixture.mjs';
import { canonicalProjection } from '../../src/protocol/service.mjs';
import { appendEvent } from '../../src/protocol/store.mjs';
import { v1Participant } from '../../src/identity/registry.mjs';
import { resolveReviewPaths } from '../../src/collateral/paths.mjs';

// Load a sealed pre-runtime event fixture. This deliberately does not call the
// new-start API, so compatibility tests cannot accidentally inherit its rules.
export async function loadLegacyAuthority({
  cwd,
  identity,
  reviewId,
  recordId = reviewId,
  artifact = 'docs/artifact.md',
  artifactKind = 'spec',
  now,
}) {
  const root = realpathSync(cwd);
  const date = now.slice(0, 10);
  const name = path.basename(artifact, path.extname(artifact));
  const paths = resolveReviewPaths({ root, kind: artifactKind, name, date, reviewId, recordId });
  const context = {
    schema: 'ai-peer-review.context/v1',
    review_id: reviewId,
    record_id: recordId,
    repository_root: root,
    artifact_kind: artifactKind,
    artifact_name: name,
    review_date: date,
    reviews_root: paths.reviewsRoot.relative,
    review_path_template: '<kind>/<date>-<name>-<record-id>',
    issue: null,
  };
  const legacy = event('review-created', { reviewId });
  legacy.at = now;
  legacy.payload.author = v1Participant(identity);
  legacy.payload.startup.context = context;
  legacy.payload.startup.context_digest = `sha256:${createHash('sha256').update(canonicalProjection(context)).digest('hex')}`;
  legacy.payload.startup.destination = paths.destination.relative;
  const events = path.join(paths.scratch.absolute, 'events.jsonl');
  await appendEvent(events, legacy);
  return {
    review_id: reviewId,
    record_id: recordId,
    paths: { workspace: paths.scratch.absolute, events },
  };
}

export function fixtureSelection(selector, model, effort = 'medium') {
  return {
    reviewerProvider: selector,
    reviewerModel: model,
    reviewerEffort: effort,
    transportMode: 'manual',
  };
}

export function fixtureObservation(
  provider = 'openai',
  host = 'codex',
  model = 'gpt-test',
  effort = 'medium',
  assurance = 'runtime'
) {
  return { provider, host, model_id: model, effort, adapter_version: 'fixture-v1', assurance };
}

let fixtureImage;
function fixtureRuntimeImage() {
  if (fixtureImage) return fixtureImage;
  const root = realpathSync(mkdtempSync(path.join(tmpdir(), 'apr-startup-image-')));
  process.once('exit', () => rmSync(root, { recursive: true, force: true }));
  const packageRoot = path.join(root, 'source');
  const native = path.join(packageRoot, 'native/broker-security/build/Release');
  mkdirSync(native, { recursive: true });
  writeFileSync(
    path.join(packageRoot, 'package.json'),
    JSON.stringify({
      name: 'fixture-runtime',
      version: '9.8.7-fixture',
      bin: { 'peer-review': './cli.mjs' },
      files: ['cli.mjs'],
    })
  );
  writeFileSync(path.join(packageRoot, 'cli.mjs'), '// inert fixture runtime\n');
  writeFileSync(path.join(native, 'broker_security.node'), 'fixture');
  writeFileSync(path.join(native, 'build-identity.json'), '{}');
  const nodeExecutable = path.join(root, 'node-fixture');
  writeFileSync(nodeExecutable, 'fixture executable');
  chmodSync(nodeExecutable, 0o755);
  fixtureImage = pinRuntimeImage({
    packageRoot,
    nodeExecutable,
    destination: path.join(root, 'image'),
  });
  return fixtureImage;
}

export const fixtureStartupDeps = {
  adapters: Object.fromEntries(
    [
      ['codex', 'openai', 'codex'],
      ['claude', 'anthropic', 'claude-code'],
      ['grok', 'xai', 'grok'],
    ].map(([selector, provider, host]) => [
      selector,
      {
        resolveModel: async ({ model, effort }) => ({
          model_id: model,
          model_display: model,
          effort,
        }),
        capabilities: {
          native: ['manual', 'resume-only', 'automatic-required'].map((transport_mode) => ({
            provider,
            host,
            exact_session: true,
            transport_mode,
            adapter_version: 'fixture-v1',
          })),
          broker: ['manual', 'resume-only', 'automatic-required'].map((transport_mode) => ({
            transport_mode,
            adapter_version: 'fixture-v1',
          })),
        },
      },
    ])
  ),
  pinRuntimeImage: fixtureRuntimeImage,
  ensureBroker: async () => ({ request: async () => ({ status: 'recovery-only' }), close() {} }),
};

export {
  advanceReview,
  abandonReview,
  continueReview,
  finalizeReview,
  joinReview,
  recoverReview,
  registerSupplement,
  resumeReview,
  run,
  startReview,
  statusReview,
  supersedeReview,
  submitAuthorTurn,
  submitReviewTurn,
} from '../../src/cli/run.mjs';
export { parseCommand } from '../../src/cli/parse.mjs';
export { commitExactPaths, createGitTransactionRepository } from '../../src/git/transaction.mjs';
export { reclaimReviewLock, sealNoCommitHandoff } from '../../src/protocol/service.mjs';
export { mutateReviewBatch } from '../../src/protocol/service.mjs';
export {
  assertReaderWriterCompatibility,
  compatibilityDeclared,
} from '../../src/protocol/compatibility.mjs';
export { hydrateTemplate } from '../../src/templates/index.mjs';
export { createResumeTransport } from '../../src/transport/resume.mjs';
export {
  buildClaudeReviewerLaunch,
  buildClaudeReviewerResume,
  classifyClaudeReviewerOutcome,
  runClaudeReviewerLaunch,
} from '../../src/provider/claude-launch.mjs';
