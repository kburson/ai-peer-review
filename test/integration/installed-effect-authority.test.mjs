// @story #102
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
import { authorityInstalledFixture } from '../helpers/authority-installed-fixture.mjs';

test(
  'installed submission fences draft and registry writes under current source and primary authority',
  {
    skip:
      process.platform === 'win32'
        ? 'Native account security verification paused for #102/#107'
        : false,
  },
  async (t) => {
    const f = await authorityInstalledFixture(t, { nativeSecurity: false });
    f.write('docs/artifact.md', '# Artifact\n');
    f.git('add', '.');
    f.git('commit', '-m', 'review artifact');
    const previous = { HOME: process.env.HOME, XDG_CONFIG_HOME: process.env.XDG_CONFIG_HOME };
    process.env.HOME = f.home;
    process.env.XDG_CONFIG_HOME = f.home + '/.config';
    t.after(() => {
      for (const [key, value] of Object.entries(previous)) {
        if (value === undefined) delete process.env[key];
        else process.env[key] = value;
      }
    });
    const now = '2026-09-09T12:00:00.000Z';
    const identity = (role) =>
      participantIdentity({
        role,
        provider: 'openai',
        host: 'codex',
        modelId: 'gpt-test',
        modelDisplay: 'GPT Test',
        sessionId: 'review-' + role,
        source: 'runtime',
        joinedAt: now,
      });
    const author = identity('author');
    const reviewer = identity('reviewer');
    const started = await startReview(
      {
        ...fixtureSelection('codex', 'gpt-test'),
        cwd: f.root,
        artifact: 'docs/artifact.md',
        artifactKind: 'spec',
        identity: author,
        reviewId: 'review-effect-fence',
        now,
      },
      fixtureStartupDeps
    );
    const joined = await joinReview({
      cwd: f.root,
      invitation: started.paths.reviewer_invitation,
      identity: reviewer,
      runtimeObservation: fixtureObservation(),
      now,
    });
    for (const [heading, content] of [
      ['Summary', 'One repair remains.'],
      ['Findings', '### R1-F001 — Repair\n\nFix it.'],
      ['Required changes', '- Address R1-F001.'],
      ['Optional suggestions', 'None.'],
      ['Decision', 'revisions-requested'],
    ]) {
      const text = readFileSync(joined.paths.response, 'utf8');
      const pattern = new RegExp(
        '(## ' + heading + '\\r?\\n\\r?\\n)[\\s\\S]*?(?=\\r?\\n\\r?\\n## |$)'
      );
      writeFileSync(joined.paths.response, text.replace(pattern, '$1' + content));
    }
    const input = {
      cwd: f.root,
      workspace: started.paths.workspace,
      identity: reviewer,
      decision: 'revisions-requested',
      now: '2026-09-09T12:01:00.000Z',
    };
    const result = f.execute(
      'import {submitReviewTurn} from ' +
        f.module('src/cli/run.mjs') +
        ';import {isInstalledProcessSourceAssurance} from ' +
        f.module('src/protocol/process-source-assurance.mjs') +
        ';import {observeOriginalProcess} from ' +
        f.module('src/protocol/process-identity.mjs') +
        ';import {readFileSync,writeFileSync,existsSync} from "node:fs";import path from "node:path";' +
        'const currentProcess=await observeOriginalProcess({signal:new AbortController().signal,deadline:performance.now()+30000});const sourceAvailable=currentProcess.status==="live"&&isInstalledProcessSourceAssurance(currentProcess.assurance);let changed=false,failure;try{await submitReviewTurn(' +
        JSON.stringify(input) +
        ',{checkpoint(name){' +
        'if(name==="author-claimed"){changed=true;const file=path.join(process.cwd(),".ai-peer-review/config.json");' +
        'writeFileSync(file,readFileSync(file,"utf8")+" ");}}});}catch(error){failure={code:error.code,message:error.message};}' +
        'const workspace=' +
        JSON.stringify(started.paths.workspace) +
        ';console.log(JSON.stringify({changed,failure,sourceAvailable,' +
        'draftExists:existsSync(' +
        JSON.stringify(
          joined.paths.response.replace('reviewer-response-1.md', 'author-response-1.md')
        ) +
        '),' +
        'registryExists:existsSync(path.join(workspace,"responses","author-1.json"))}));'
    );
    assert.equal(result.status, 0, result.stderr);
    const observed = JSON.parse(result.stdout);
    assert.equal(observed.changed, observed.sourceAvailable);
    if (!observed.sourceAvailable)
      assert.match(
        observed.failure.message,
        /^Primary admission election refused: source-class-unavailable$/
      );
    assert.equal(observed.failure.code, 'APR_PRIMARY_AUTHORITY_UNAVAILABLE');
    assert.equal(observed.draftExists, false);
    assert.equal(observed.registryExists, false);
  }
);
