// @story #190
// Actual unchanged stock observations; diagnostic data supplies no host or source authority.
import {
  observeProcessSourceContext,
  observeExecutionHostIdentity,
} from '../../src/protocol/process-identity.mjs';
if (
  process.platform !== 'win32' ||
  process.argv.length !== 2 ||
  process.env.NODE_OPTIONS ||
  process.env.GITHUB_ACTIONS !== 'true' ||
  process.env.RUNNER_ENVIRONMENT !== 'github-hosted' ||
  process.env.GITHUB_REPOSITORY !== 'kburson/ai-peer-review' ||
  process.env.GITHUB_WORKFLOW !== 'Windows host observation diagnostic' ||
  process.env.GITHUB_REF_NAME !== 'codex/190-installed-journeys'
)
  throw Error('diagnostic-host-unavailable');
for (let operation = 1; operation <= 3; operation++) {
  const started = performance.now();
  const context = { signal: new AbortController().signal, deadline: started + 30000 };
  const probe = await observeProcessSourceContext(context);
  const probeElapsedMs = Math.round(performance.now() - started);
  const host = probe ? await observeExecutionHostIdentity(context) : null;
  console.log(
    JSON.stringify({
      schema: 'ai-peer-review.windows-host-diagnostic/v1',
      verified: false,
      operationalAuthority: 'unavailable',
      operation,
      node: process.versions.node,
      phase: operation === 1 ? 'first-observation' : 'independent-later-observation',
      probeClassified: probe !== null,
      hostClassified: /^sha256:[a-f0-9]{64}$/u.test(host ?? ''),
      probeElapsedMs,
      elapsedMs: Math.round(performance.now() - started),
      originalBudgetExpired: performance.now() >= context.deadline,
      guaranteedStartupSavingMs: 0,
    })
  );
}
