import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';

import { COMMAND_FLAGS, COMMAND_USAGE, COMMANDS } from '../../src/cli/parse.mjs';
import { explainError, helpRequest } from '../../src/cli/help-data.mjs';

test('all offline help topics derive complete contracts from the frozen command catalog', () => {
  const resultSchema = JSON.parse(
    readFileSync(new URL('../../schemas/cli-result-v1.json', import.meta.url), 'utf8')
  );
  assert.equal(resultSchema.$id, 'ai-peer-review.cli-result/v1');
  assert.equal(resultSchema.additionalProperties, false);
  assert.equal(resultSchema.properties.review.additionalProperties, false);
  assert.equal(resultSchema.properties.paths.additionalProperties, false);
  assert.equal(resultSchema.properties.next_action.oneOf[1].additionalProperties, false);
  for (const [name, definition] of Object.entries(resultSchema.$defs)) {
    if (definition.type === 'object') assert.equal(definition.additionalProperties, false, name);
  }
  for (const command of COMMANDS) {
    const topic = helpRequest(command, 'json');
    assert.equal(topic.schema, 'ai-peer-review.help/v1');
    assert.equal(topic.command, command);
    assert.equal(topic.usage, COMMAND_USAGE[command]);
    for (const field of [
      'purpose',
      'roles',
      'states',
      'usage',
      'arguments',
      'flags',
      'defaults',
      'environment',
      'preconditions',
      'effects',
      'commit',
      'push',
      'block',
      'wake',
      'tokens',
      'no_commit',
      'examples',
      'result',
      'next_action',
      'errors',
      'json_schema',
    ])
      assert.ok(Object.hasOwn(topic, field), `${command}.${field}`);
    assert.deepEqual(
      topic.flags.map(({ flag }) => flag),
      COMMAND_FLAGS[command]
    );
  }
});

test('help --all, search, JSON, and stable error explanations have deterministic fixtures', () => {
  const rendered = helpRequest(null, 'text', { all: true });
  assert.equal(
    createHash('sha256').update(rendered).digest('hex'),
    readFileSync(new URL('./help/all.sha256.txt', import.meta.url), 'utf8').trim()
  );
  assert.match(helpRequest('submit', 'text'), /peer-review submit/);
  const submitJson = JSON.stringify(helpRequest('submit', 'json'));
  assert.equal(
    createHash('sha256').update(submitJson).digest('hex'),
    readFileSync(new URL('./help/submit.sha256.txt', import.meta.url), 'utf8').trim()
  );
  assert.doesNotMatch(submitJson, /\x1b\[/);
  assert.ok(helpRequest('status', 'json').flags.some(({ flag }) => flag === '--next'));
  assert.match(
    helpRequest('start', 'json').preconditions.join(' '),
    /bootstrap-grant.*pin-verifier/
  );
  assert.ok(helpRequest('review', 'json', { search: true }).matches.includes('submit'));
  assert.equal(explainError('APR_ARTIFACT_DIRTY').code, 'APR_ARTIFACT_DIRTY');
  assert.throws(
    () => explainError('APR_UNKNOWN'),
    (error) => error.code === 'APR_USAGE'
  );
});
