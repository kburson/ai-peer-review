// @story #190
// Actual installed protocol fixtures with declared identities; no provider proof.
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import test from 'node:test';
import { participantIdentity } from '../../src/identity/registry.mjs';
import {
  fixtureSelection,
  fixtureStartupDeps,
  fixtureObservation,
} from '../helpers/internal-api.mjs';
import { startReview, joinReview } from '../helpers/operations-api.mjs';
import { fixture } from '../helpers/intervention-fixture.mjs';
import { installRuntimeFixture } from '../helpers/runtime-package.mjs';
for (const manualDelivery of [false, true])
  test(`installed local handoff keeps its original deadline (manual delivery=${manualDelivery})`, async (t) => {
    const f = fixture();
    t.after(f.cleanup);
    const runtime = installRuntimeFixture(t),
      now = '2026-09-09T12:00:00.000Z';
    const identity = (role) =>
      participantIdentity({
        role,
        provider: 'openai',
        host: 'codex',
        modelId: 'gpt-test',
        modelDisplay: 'GPT Test',
        sessionId: 'review-' + role,
        source: 'declared',
        joinedAt: now,
      });
    const author = identity('author'),
      reviewer = identity('reviewer');
    const started = await startReview(
      {
        ...fixtureSelection('codex', 'gpt-test'),
        noCommit: true,
        cwd: f.root,
        artifact: 'docs/artifact.md',
        artifactKind: 'spec',
        identity: author,
        reviewId: 'review-budget',
        now,
      },
      fixtureStartupDeps
    );
    const joined = await joinReview({
      cwd: f.root,
      invitation: started.paths.reviewer_invitation,
      identity: reviewer,
      runtimeObservation: { ...fixtureObservation(), assurance: 'declared' },
      now,
    });
    for (const [heading, content] of [
      ['Summary', 'One repair.'],
      ['Findings', '### R1-F001 — Repair\n\nFix it.'],
      ['Required changes', 'Address R1-F001.'],
      ['Optional suggestions', 'None.'],
      ['Decision', 'revisions-requested'],
    ]) {
      const text = readFileSync(joined.paths.response, 'utf8');
      writeFileSync(
        joined.paths.response,
        text.replace(
          new RegExp('(## ' + heading + '\\r?\\n\\r?\\n)[\\s\\S]*?(?=\\r?\\n\\r?\\n## |$)'),
          '$1' + content
        )
      );
    }
    const input = {
      cwd: f.root,
      workspace: started.paths.workspace,
      identity: reviewer,
      decision: 'revisions-requested',
      now: '2026-09-09T12:01:00.000Z',
    };
    const result = runtime.execute(
      `const {submitReviewTurn}=await import(${runtime.module('src/cli/run.mjs')});const {withOperationAuthority,currentOperationAuthorityContext}=await import(${runtime.module('src/startup/authority-fence.mjs')});const {manualTransport}=await import(${runtime.module('src/transport/manual.mjs')});const fs=await import('node:fs');let deadline,changed=false,delivered=false;await withOperationAuthority({operation:'submit',cwd:process.cwd(),reviewWorkspace:${JSON.stringify(started.paths.workspace)}},async()=>{deadline=(await currentOperationAuthorityContext()).deadline;await submitReviewTurn(${JSON.stringify(input)},{checkpoint(name){if(name==='author-claimed')changed=true;}${manualDelivery ? ",transport:{async deliver(request){if((await currentOperationAuthorityContext()).deadline!==deadline)throw Error('renewed budget');delivered=true;return manualTransport.deliver(request);}}" : ''}});if((await currentOperationAuthorityContext()).deadline!==deadline)throw Error('renewed operation budget');});console.log(JSON.stringify({changed,delivered,noPrimaryAdmission:!fs.existsSync('.git/ai-peer-review/admission.lock'),draft:fs.existsSync(${JSON.stringify(joined.paths.response.replace('reviewer-response-1.md', 'author-response-1.md'))})}));`,
      { cwd: f.root }
    );
    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(JSON.parse(result.stdout), {
      changed: true,
      delivered: manualDelivery,
      noPrimaryAdmission: true,
      draft: true,
    });
  });
