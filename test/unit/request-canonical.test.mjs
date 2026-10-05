import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const api = await import('../../src/api/canonical-json.mjs').catch(() => ({}));
const validation = await import('../../src/api/validate.mjs').catch(() => ({}));
const fixture = JSON.parse(
  readFileSync(new URL('../fixtures/api-contracts.json', import.meta.url))
);
test('[#145] canonical boundary exists', () => {
  assert.equal(typeof api.encodeRequestCanonical, 'function');
  assert.equal(typeof validation.validateOperation, 'function');
});
test('[#145] equivalent raw spellings have exact submitted identity', () => {
  const values = fixture.rawEquivalent.map((rawText) =>
    validation.validateOperation('start_review', JSON.parse(rawText), { rawText })
  );
  for (const item of values) {
    assert.deepEqual(item.value, fixture.valid);
    assert.equal(item.input_validation.duplicate_keys, 'checked');
    assert.deepEqual(
      api.encodeRequestCanonical(item.value),
      api.encodeRequestCanonical(fixture.valid)
    );
    assert.equal(item.digest, api.requestDigest(fixture.valid));
  }
  assert.notEqual(
    api.requestDigest({ ...fixture.valid, filepath: './spec.md' }),
    api.requestDigest(fixture.valid)
  );
  assert.equal(
    validation.validateOperation('start_review', fixture.valid).input_validation.duplicate_keys,
    'not-observable'
  );
  assert.equal(
    Object.hasOwn(validation.validateOperation('start_review', fixture.valid).value, 'unattended'),
    false
  );
});
test('[#145] canonical encoding sorts unsigned UTF-16 keys including prefixes', () => {
  const value = { '\ue000': 'bmp', '\ud83d\ude00': 'astral', aa: true, a: null, 10: 1, 2: 2 };
  assert.equal(
    api.encodeRequestCanonical(value).toString(),
    '{"10":1,"2":2,"a":null,"aa":true,"😀":"astral","":"bmp"}'
  );
});
test('[#145] string escapes preserve Unicode scalars and slash without normalization', () => {
  const value = { text: '"\\\b\t\n\f\r\u0000\u001f/é😀é' };
  assert.equal(
    api.encodeRequestCanonical(value).toString(),
    '{"text":"\\"\\\\\\b\\t\\n\\f\\r\\u0000\\u001f/é😀é"}'
  );
  assert.notEqual(api.requestDigest({ a: 'é' }), api.requestDigest({ a: 'é' }));
  assert.equal(
    api.encodeRequestCanonical([true, false, null, 6]).toString(),
    '[true,false,null,6]'
  );
});
test('[#145] invalid numeric and Unicode domains fail before digest', () => {
  for (const number of [NaN, Infinity, -Infinity, -1, -0, 0, 1.5, Number.MAX_SAFE_INTEGER + 1]) {
    assert.throws(
      () =>
        validation.validateOperation('start_review', {
          ...fixture.valid,
          stages: [{ kind: 'sar', max_rounds: number }],
        }),
      { code: 'APR_REQUEST_INVALID' }
    );
    assert.throws(() => api.encodeRequestCanonical({ number }));
  }
  for (const text of ['\ud800', '\udfff', 'x\ud800x']) {
    assert.throws(
      () => validation.validateOperation('start_review', { ...fixture.valid, filepath: text }),
      { code: 'APR_REQUEST_INVALID' }
    );
    assert.throws(() => api.encodeRequestCanonical({ text }));
    assert.throws(() => api.encodeRequestCanonical({ [text]: true }));
  }
});
test('[#145] recursive raw parser rejects decoded duplicates and malformed JSON', () => {
  const raw = fixture.rawEquivalent[0];
  for (const rawText of [
    raw.replace('"filepath":"spec.md"', '"filepath":"spec.md","file\\u0070ath":"spec.md"'),
    raw.replace('"kind":"sar"', '"kind":"sar","kind":"sar"'),
    raw.replace('"kind":"sar"', '"kind":"sar",'),
    raw + ' null',
    raw.replace('"max_rounds":6', '"max_rounds":01'),
    raw.replace('"filepath":"spec.md"', '"filepath":"spec\n.md"'),
  ]) {
    assert.throws(() => validation.validateOperation('start_review', fixture.valid, { rawText }), {
      code: 'APR_REQUEST_INVALID',
    });
  }
  assert.throws(
    () =>
      validation.validateOperation(
        'start_review',
        { ...fixture.valid, filepath: 'other.md' },
        { rawText: raw }
      ),
    { code: 'APR_REQUEST_INVALID' }
  );
  const parsed = api.parseRawJson(
    '{"__proto__":{"safe":true},"s":"braces } [ and colon :","a":[{"x":1}]}'
  );
  assert.equal(Object.hasOwn(parsed, '__proto__'), true);
  assert.equal(Object.getPrototypeOf(parsed), Object.prototype);
});

test('[#145] object safety never invokes accessors or toJSON', () => {
  let calls = 0;
  const getter = { ...fixture.valid };
  Object.defineProperty(getter, 'filepath', {
    get() {
      calls += 1;
      return 'spec.md';
    },
    enumerable: true,
  });
  for (const value of [
    getter,
    Object.assign(Object.create({ inherited: true }), fixture.valid),
    {
      ...fixture.valid,
      toJSON() {
        calls += 1;
        return fixture.valid;
      },
    },
  ]) {
    assert.throws(() => validation.validateOperation('start_review', value), {
      code: 'APR_REQUEST_INVALID',
    });
    assert.throws(() => api.encodeRequestCanonical(value));
  }
  assert.equal(calls, 0);
  assert.throws(() => api.encodeRequestCanonical(new Array(2)));
  assert.throws(() => api.encodeRequestCanonical(Object.assign([1], { extra: true })));
});

test('[#145] invalid scalar diagnostics retain exact escaped JSON Pointer', () => {
  try {
    validation.validateOperation('start_review', {
      ...fixture.valid,
      stages: [{ kind: 'sar', max_rounds: 0 }],
    });
    assert.fail('accepted invalid cap');
  } catch (error) {
    assert.equal(error.details.issues[0].pointer, '/stages/0/max_rounds');
  }
});
