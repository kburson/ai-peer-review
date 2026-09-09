import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const file = new URL('../../skills/peer-review/SKILL.md', import.meta.url);

test('installable skill states the complete provider-neutral operating contract', () => {
  const text = readFileSync(file, 'utf8');
  for (const phrase of [
    'peer-review setup',
    'peer-review doctor',
    'peer-review help',
    'absolute paths',
    'Reviewer Git boundary',
    'Author Git boundary',
    'NO-COMMIT TEST MODE',
    'relay only the reviewer invitation',
    'manual recovery',
  ]) {
    assert.match(text, new RegExp(phrase, 'i'), phrase);
  }
  assert.doesNotMatch(text, /\baitm\b|\/task\b/i);
});
