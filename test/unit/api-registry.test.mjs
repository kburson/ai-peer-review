import * as cliHelp from '../../src/cli/help-data.mjs';
import * as cliTopics from '../../src/cli/help-topics.mjs';
import { AprError } from '../../src/errors.mjs';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
const registry = await import('../../src/api/registry.mjs').catch(() => ({}));
const validation = await import('../../src/api/validate.mjs').catch(() => ({}));
test('[#145] registry owns all nine operations and examples validate', () => {
  assert.equal(typeof registry.operationRegistry, 'object');
  assert.deepEqual(Object.keys(registry.operationRegistry), [
    'start_review',
    'preview_review',
    'wait_for_review',
    'get_review_status',
    'intervene_review',
    'submit_review_turn',
    'get_peer_review_help',
    'cleanup_brokers',
    'reconcile_review_series',
  ]);
  for (const [name, operation] of Object.entries(registry.operationRegistry)) {
    assert.equal(operation.requestSchema.additionalProperties, false);
    assert.equal(operation.mcp.inputSchema, operation.requestSchema);
    for (const example of operation.examples)
      assert.deepEqual(validation.validateOperation(name, example).value, example);
    assert.throws(
      () => validation.validateOperation(name, { ...operation.examples[0], typo: true }),
      { code: 'APR_REQUEST_INVALID' }
    );
  }
  for (const { schema, value } of registry.registryExamples)
    assert.deepEqual(validation.validateContract(schema, value), []);
});
test('[#145] nested closed schemas reject absent stages and forbidden aliases', () => {
  const valid = registry.operationRegistry.start_review.examples[0];
  const absent = { ...valid };
  delete absent.stages;
  assert.throws(() => validation.validateOperation('start_review', absent), {
    code: 'APR_REQUEST_INVALID',
  });
  for (const input of [
    { ...valid, kind: 'sar' },
    { ...valid, stages: [] },
    { ...valid, stages: [{ kind: 'sar', typo: true }] },
    { ...valid, stages: [{ kind: 'sar', max_rounds: 1001 }] },
    { ...valid, stages: [{ kind: 'xpr', participants: { solo: { selector: 'codex' } } }] },
    { ...valid, stages: [{ kind: 'sar', participants: { solo: { host: 'codex' } } }] },
  ])
    assert.throws(() => validation.validateOperation('start_review', input), {
      code: 'APR_REQUEST_INVALID',
    });
  assert.throws(() => validation.validateOperation('unregistered', valid), {
    code: 'APR_OPERATION_UNKNOWN',
  });
});
test('[#145] action union, turn phases and response framing remain closed', () => {
  const intervention = registry.operationRegistry.intervene_review.examples[0];
  assert.throws(
    () =>
      validation.validateOperation('intervene_review', {
        ...intervention,
        action: { kind: 'extend-cap', max_rounds: 3 },
      }),
    { code: 'APR_REQUEST_INVALID' }
  );
  const turn = registry.operationRegistry.submit_review_turn.examples[0];
  assert.throws(
    () => validation.validateOperation('submit_review_turn', { ...turn, phase: 'accept' }),
    { code: 'APR_REQUEST_INVALID' }
  );
  for (const { schema, value } of registry.registryExamples) {
    if (schema === registry.responseSchema)
      assert.ok(validation.validateContract(schema, { ...value, raw_handle: 'private' }).length);
  }
});
test('[#145] diagnostics are bounded, corrective and redact secrets and raw handles', () => {
  const valid = registry.operationRegistry.start_review.examples[0];
  let error;
  try {
    validation.validateOperation('start_review', {
      ...valid,
      credentials: 'private-secret',
      raw_handle: 'session-secret',
      ...Object.fromEntries(
        Array.from({ length: 50 }, (_, i) => ['unknown' + i, 'private-secret'])
      ),
    });
  } catch (caught) {
    error = caught;
  }
  const value = error.toJSON();
  assert.equal(value.mutation_occurred, false);
  assert.equal(value.retry_safe, true);
  assert.ok(value.details.issues.length <= 20);
  assert.ok(value.details.truncated_issue_count > 0);
  assert.ok(value.next_action);
  for (const issue of value.details.issues)
    for (const key of ['pointer', 'rule', 'received', 'expected', 'correction'])
      assert.ok(Object.hasOwn(issue, key));
  assert.equal(JSON.stringify(value).includes('private-secret'), false);
  assert.equal(JSON.stringify(value).includes('session-secret'), false);
});
test('[#145] finding grammar consumes entire scalar ASCII input', () => {
  for (const id of ['A', 'XPR-001', 'a.b_c-9', 'A' + '1'.repeat(63)])
    assert.equal(registry.isFindingId(id), true);
  for (const id of ['', '1A', 'A' + '1'.repeat(64), 'é', 'A\n', 'A\r', 'A\u2028', 'A\u2029'])
    assert.equal(registry.isFindingId(id), false);
});

test('[#145] closed schemas reject prototype-named fields and context collision', () => {
  const valid = registry.operationRegistry.start_review.examples[0];
  const input = JSON.parse(
    JSON.stringify(valid).replace('"stages":', '"__proto__":{"credentials":"secret"},"stages":')
  );
  assert.throws(() => validation.validateOperation('start_review', input), {
    code: 'APR_REQUEST_INVALID',
  });
  const legacy = JSON.parse(
    readFileSync(new URL('../../schemas/response-v1.json', import.meta.url))
  );
  const apiResponse = registry.registryExamples.find(({ name }) => name === 'status').value;
  assert.ok(validation.validateContract(legacy, apiResponse).length > 0);
  assert.ok(
    validation.validateContract(registry.responseSchema, {
      schema: 'ai-peer-review.response/v1',
      review_id: 'legacy',
      role: 'reviewer',
      turn: 1,
    }).length > 0
  );
  assert.equal(registry.responseSchema.$id, 'ai-peer-review.api-response/v1');
  assert.equal(apiResponse.schema, legacy.$id);
});

test('[#145] CLI API help consumes the registry while legacy help stays intact', () => {
  assert.equal(typeof cliHelp.apiHelpRequest, 'function');
  assert.deepEqual(
    cliHelp.apiHelpRequest('monitoring'),
    registry.renderHelp({ topic: 'monitoring' })
  );
  assert.deepEqual(cliTopics.API_HELP_TOPICS, Object.keys(registry.helpTopics));
  const apiError = new AprError('APR_REQUEST_INVALID', 'malformed', {
    recovery: 'Correct the request',
  }).toApiJSON({ next_action: null });
  assert.deepEqual(validation.validateContract(registry.responseSchema, apiError), []);
});

test('[#145] fallback topology errors name the typed code and exact array or member', () => {
  const valid = registry.operationRegistry.start_review.examples[0];
  for (const [fallback_kinds, pointer] of [
    [[], '/stages/0/fallback_kinds'],
    [['sar', 'spr'], '/stages/0/fallback_kinds/1'],
    [['sar', 'sar'], '/stages/0/fallback_kinds'],
  ]) {
    let error;
    try {
      validation.validateOperation('start_review', {
        ...valid,
        stages: [{ kind: 'sar', fallback_kinds }],
      });
    } catch (caught) {
      error = caught;
    }
    assert.equal(error.code, 'APR_FALLBACK_TOPOLOGY_INVALID');
    assert.ok(error.details.issues.some((issue) => issue.pointer === pointer));
    assert.deepEqual(validation.validateContract(registry.responseSchema, error.toJSON()), []);
  }
});
test('[#145] every common and validation error API envelope validates', () => {
  const common = new AprError('APR_REQUEST_INVALID', 'malformed', {
    recovery: 'Correct the request',
  }).toApiJSON();
  assert.deepEqual(validation.validateContract(registry.responseSchema, common), []);
  const valid = registry.operationRegistry.start_review.examples[0];
  try {
    validation.validateOperation('start_review', { ...valid, unexpected: true });
    assert.fail('accepted unknown field');
  } catch (error) {
    const value = error.toJSON();
    assert.deepEqual(validation.validateContract(registry.responseSchema, value), []);
    assert.deepEqual(value.error.examples, registry.operationRegistry.start_review.examples);
  }
});

test('[#145] schema artifacts inline reusable contracts without duplicate identities', () => {
  for (const schema of Object.values(registry.schemaArtifacts)) {
    const walk = (value, root = false) => {
      if (!value || typeof value !== 'object') return;
      if (!root) assert.equal(Object.hasOwn(value, '$id'), false);
      for (const child of Object.values(value)) walk(child);
    };
    walk(schema, true);
  }
});

test('[#145] critique severity preserves submitted identifiers without a provider catalog', () => {
  const example = registry.registryExamples.find((x) => x.name === 'critique');
  const value = structuredClone(example.value);
  value.findings[0].severity = 'provider-specific-severity';
  assert.deepEqual(validation.validateContract(example.schema, value), []);
});

test('[#145] diagnostic bounds preserve Unicode scalars in long JSON Pointer keys', () => {
  const key = 'a'.repeat(238) + '😀' + 'tail';
  const valid = registry.operationRegistry.start_review.examples[0];
  try {
    validation.validateOperation('start_review', { ...valid, [key]: true });
    assert.fail('expected invalid closed request');
  } catch (error) {
    assert.equal(error.code, 'APR_REQUEST_INVALID');
    assert.deepEqual(validation.validateContract(registry.responseSchema, error.toJSON()), []);
    assert.ok(error.details.issues[0].pointer.isWellFormed());
  }
});

test('[#145] raw non-scalar keys fail with schema-valid corrective error envelopes', () => {
  const valid = registry.operationRegistry.start_review.examples[0];
  const prefix = JSON.stringify(valid).slice(0, -1);
  for (const key of ['\\ud800', '\\udc00', 'prefix\\ud800', '\\udc00suffix']) {
    for (const duplicate of [false, true]) {
      const members = '"' + key + '":1' + (duplicate ? ',"' + key + '":2' : '');
      for (const [suffix, parent] of [
        [',' + members + '}', ''],
        [',"extra":{' + members + '}}', '/extra'],
        [',"extra":[{' + members + '}]}', '/extra/0'],
        [',"extra":{"' + key + '":', '/extra'],
      ]) {
        const rawText = prefix + suffix;
        let parsed = valid;
        try {
          parsed = JSON.parse(rawText);
        } catch {
          /* retain valid parsed input for malformed raw text */
        }
        assert.throws(
          () => validation.validateOperation('start_review', parsed, { rawText }),
          (error) => {
            assert.equal(error.code, 'APR_REQUEST_INVALID');
            const envelope = error.toJSON();
            assert.equal(envelope.mutation_occurred, false);
            assert.equal(envelope.retry_safe, true);
            assert.deepEqual(validation.validateContract(registry.responseSchema, envelope), []);
            assert.equal(error.details.issues[0].pointer, parent);
            assert.ok(error.details.issues[0].pointer.isWellFormed());
            return true;
          }
        );
      }
    }
  }
});

test('[#145] valid scalar raw keys preserve exact escaped duplicate-key pointers', () => {
  const valid = registry.operationRegistry.start_review.examples[0];
  const prefix = JSON.stringify(valid).slice(0, -1);
  const key = '😀/~';
  const members = JSON.stringify(key) + ':1,' + JSON.stringify(key) + ':2';
  const rawText = prefix + ',"extra":{' + members + '}}';
  assert.throws(
    () => validation.validateOperation('start_review', JSON.parse(rawText), { rawText }),
    (error) => {
      assert.equal(error.code, 'APR_REQUEST_INVALID');
      assert.equal(error.details.issues[0].rule, 'duplicate-key');
      assert.equal(error.details.issues[0].pointer, '/extra/😀~1~0');
      assert.deepEqual(validation.validateContract(registry.responseSchema, error.toJSON()), []);
      return true;
    }
  );
});
