import { readFileSync } from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';

import { TEMPLATE_NAMES, TEMPLATE_VARIABLES, hydrateTemplate } from '../../src/templates/index.mjs';
import { renderCommand } from '../../src/cli/help-data.mjs';
import { TEMPLATE_FIXTURE_VALUES as values } from '../helpers/template-values.mjs';
import { executeJoinCommand } from '../helpers/command-roundtrip.mjs';

test('generated join commands round-trip spaces and Windows-style paths', () => {
  for (const invitation of [
    '/repo/Review Files/reviewer invitation.md',
    "C:\\Review Files\\Owner's\\reviewer invitation.md",
  ]) {
    assert.equal(
      executeJoinCommand(renderCommand(['peer-review', 'join', invitation])),
      invitation
    );
  }
  assert.equal(
    renderCommand(['peer-review', 'join', "C:\\Review Files\\Owner's\\reviewer invitation.md"], {
      platform: 'win32',
    }),
    "peer-review join 'C:\\Review Files\\Owner''s\\reviewer invitation.md'"
  );
});

const COMMUNICATION_POLICY = `## Communication policy (v1)

Keep all peer-review chat messages terse. Put complete review analysis, findings, dispositions, revised prose, rationale, decisions, and verification evidence in the generated durable review documents.

Chat may contain only:

- a short operational status;
- a pointer to the relevant durable document;
- the exact next action; or
- a concise blocker requiring human action.

Read the relevant durable reviewer or author response document; do not rely on a chat summary. Do not paste findings, dispositions, revised prose, verification output, or other durable document content into chat unless the human explicitly requests it.

“Terse chat” does not mean terse review evidence. Durable reviewer and author response documents remain complete, self-contained, and authoritative.`;

function communicationPolicy(output) {
  return output.match(
    /## Communication policy \(v1\)\n\n[\s\S]*?(?=\n\n## |\n\nInstalled |\n\nRole:|\n\nRecovery:|$)/
  )?.[0];
}

test('every package template hydrates to its exact golden without unresolved placeholders', () => {
  for (const name of TEMPLATE_NAMES) {
    const variables = Object.fromEntries(TEMPLATE_VARIABLES[name].map((key) => [key, values[key]]));
    const actual = hydrateTemplate(name, variables);
    const golden = readFileSync(new URL(`./templates/${name}.md`, import.meta.url));
    assert.deepEqual(actual, golden, name);
    assert.doesNotMatch(actual.toString(), /\{\{[^}]+\}\}/);
    assert.match(
      actual.toString(),
      /ai-peer-review-template version="1" digest="sha256:[0-9a-f]{64}"/
    );
  }
});

test('startup templates use absolute paths and document installed and zero-install commands', () => {
  for (const name of ['author-startup', 'reviewer-invitation']) {
    const variables = Object.fromEntries(TEMPLATE_VARIABLES[name].map((key) => [key, values[key]]));
    const output = hydrateTemplate(name, variables).toString();
    assert.match(output, /\/repo\/docs\/example\.md/);
    assert.match(output, /\/repo\/\.scratch\/peer-review\/review-01/);
    assert.match(output, /`peer-review /);
    assert.match(output, /`npx --yes @kburson\/ai-peer-review@0\.2\.2 (?:status|join) /);
    assert.doesNotMatch(output, /`npx --yes ai-peer-review@0\.2\.2/);
  }
  const invitation = hydrateTemplate('reviewer-invitation', {
    ...Object.fromEntries(
      TEMPLATE_VARIABLES['reviewer-invitation'].map((key) => [key, values[key]])
    ),
  }).toString();
  assert.match(invitation, new RegExp(`peer-review join ${values.invitation_absolute}`));
  assert.match(invitation, /Do not edit the reviewed artifact, create commits, or push/);
  assert.match(invitation, /peer-review resume \/repo\/\.scratch/);
});

test('startup handoffs print the sealed reviewer selection and resolved effort', () => {
  for (const name of ['author-startup', 'reviewer-invitation']) {
    const variables = Object.fromEntries(TEMPLATE_VARIABLES[name].map((key) => [key, values[key]]));
    const output = hydrateTemplate(name, variables).toString();
    assert.match(output, /Reviewer: Claude Opus 5 \(claude-opus-5\), effort: medium/);
    assert.match(output, /Runtime: XPR, project-local broker/);
  }
});

test('startup templates explain broker recovery without retired coordinator commands', () => {
  for (const name of ['author-startup', 'reviewer-invitation']) {
    const variables = Object.fromEntries(TEMPLATE_VARIABLES[name].map((key) => [key, values[key]]));
    const output = hydrateTemplate(name, variables).toString();
    assert.match(output, /project-local broker/i);
    assert.match(output, /peer-review broker status/i);
    assert.match(output, /peer-review broker reconcile/i);
    assert.doesNotMatch(output, /peer-review coordinator/i);
  }
});

test('both generated startup artifacts carry one identical durable-document communication policy', () => {
  const outputs = ['author-startup', 'reviewer-invitation'].map((name) => {
    const variables = Object.fromEntries(TEMPLATE_VARIABLES[name].map((key) => [key, values[key]]));
    return hydrateTemplate(name, variables).toString();
  });

  for (const output of outputs) {
    assert.equal(communicationPolicy(output), COMMUNICATION_POLICY);
    assert.equal(output.match(/## Communication policy \(v1\)/g)?.length, 1);
  }
  assert.equal(communicationPolicy(outputs[0]), communicationPolicy(outputs[1]));
});

test('hydration rejects unknown templates, incomplete variables, extras, and template injection', () => {
  assert.throws(
    () => hydrateTemplate('toString', {}),
    (error) => error.code === 'APR_TEMPLATE_INVALID'
  );
  assert.throws(
    () => hydrateTemplate('author-startup', {}),
    (error) => error.code === 'APR_TEMPLATE_INVALID'
  );
  const variables = Object.fromEntries(
    TEMPLATE_VARIABLES['author-startup'].map((key) => [key, values[key]])
  );
  assert.throws(
    () => hydrateTemplate('author-startup', { ...variables, extra: 'no' }),
    (error) => error.code === 'APR_TEMPLATE_INVALID'
  );
  assert.throws(
    () => hydrateTemplate('author-startup', { ...variables, review_id: '{{nested}}' }),
    (error) => error.code === 'APR_TEMPLATE_INVALID'
  );
  assert.throws(
    () => hydrateTemplate('author-startup', { ...variables, artifact_absolute: 'docs/example.md' }),
    (error) => error.code === 'APR_TEMPLATE_INVALID'
  );
});
