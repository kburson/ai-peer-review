// @story #190
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
const file = new URL('../../skills/peer-review/SKILL.md', import.meta.url);
test('installable skill states the trusted local provider-neutral operating contract', () => {
  const text = readFileSync(file, 'utf8'),
    active = text.slice(0, text.indexOf('## Legacy maintenance')),
    normalized = text.replace(/\s+/g, ' ');
  for (const phrase of [
    'ordinary project filesystem access',
    'peer-review start',
    'peer-review help',
    'absolute invitation filepath',
    'instruction-bound',
    'LOCAL JOURNAL MODE',
    'NO-COMMIT TEST MODE',
    '--reconcile-launch',
    'same-session',
    'exact current response',
    'never stages, commits or pushes',
  ])
    assert.ok(normalized.includes(phrase), phrase);
  assert.doesNotMatch(
    active,
    /peer-review primary inspect|peer-review register-runtime|requires the project-local broker|peer-review setup/
  );
  for (const phrase of [
    'Communication policy (v1)',
    'all later turns, resumes, handoffs, and finalization',
    'do not rely on a chat summary',
    'unless the human explicitly requests it',
  ])
    assert.ok(normalized.toLowerCase().includes(phrase.toLowerCase()), phrase);
  assert.doesNotMatch(text, /\baitm\b|\/task\b/i);
  assert.doesNotMatch(text, /peer-review coordinator /i);
  assert.match(normalized, /Do not handcraft Claude Edit\/Write\/Bash rules/);
  assert.match(
    normalized,
    /original operation and verify the same session's official terminal evidence/
  );
  assert.match(normalized, /active or unknown provider outcome remains pending/i);
  assert.match(normalized, /Only an actual reviewer acceptance allows author finalization/);
});
