import { readFileSync } from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';

import { TEMPLATE_NAMES, TEMPLATE_VARIABLES, hydrateTemplate } from '../../src/templates/index.mjs';

const values = Object.freeze({
  review_id: 'review-01',
  mode_banner: 'Mode: `normal`',
  artifact_absolute: '/repo/docs/example.md',
  workspace_absolute: '/repo/.scratch/peer-review/review-01',
  response_absolute: '/repo/docs/peer-reviews/spec/example/reviewer-response-1.md',
  invitation_absolute: '/repo/docs/peer-reviews/spec/example/reviewer-invitation.md',
  artifact_display: '`/repo/docs/example.md`',
  workspace_display: '`/repo/.scratch/peer-review/review-01`',
  response_display: '`/repo/docs/peer-reviews/spec/example/reviewer-response-1.md`',
  invitation_display: '`/repo/docs/peer-reviews/spec/example/reviewer-invitation.md`',
  invitation_payload: 'cGF5bG9hZA',
  installed_join_display:
    '`peer-review join /repo/docs/peer-reviews/spec/example/reviewer-invitation.md`',
  zero_install_join_display:
    '`npx --yes ai-peer-review@0.1.0 join /repo/docs/peer-reviews/spec/example/reviewer-invitation.md`',
  recovery_display: '`peer-review resume /repo/.scratch/peer-review/review-01`',
  frontmatter: '---\nschema: "ai-peer-review.response/v1"\n---',
  summary: 'Summary text.',
  findings: 'None.',
  required_changes: 'None.',
  optional_suggestions: 'None.',
  decision: 'accepted',
  finding_dispositions: 'None.',
  changes_made: 'No changes.',
  declined_changes: 'None.',
  verification: 'Tests passed.',
  human_rationale: 'Accepted with documented rationale.',
  manifest_body: 'Manifest evidence.',
});

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
    assert.match(output, /`npx --yes ai-peer-review@0\.1\.0 (?:status|join) /);
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
