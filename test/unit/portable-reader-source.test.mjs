// @story #209
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const leaf = await import('../../src/startup/runtime-descriptor.mjs').catch((error) => {
  if (error.code === 'ERR_MODULE_NOT_FOUND') return {};
  throw error;
});
const formats = await import('../../src/protocol/format-authority.mjs').catch((error) => {
  if (error.code === 'ERR_MODULE_NOT_FOUND') return {};
  throw error;
});
test('descriptor reader has no startup execution edge and rejects unsealed fields', () => {
  assert.equal(typeof leaf.validateRuntimeDescriptor, 'function');
  assert.throws(
    () => leaf.validateRuntimeDescriptor({ schema: 'ai-peer-review.runtime/v1', secret: 'handle' }),
    { code: 'APR_USAGE' }
  );
});
test('published format JSON remains an exact projection of shared format authority', () => {
  assert.deepEqual(
    formats.RUNTIME_COMPATIBILITY,
    JSON.parse(
      readFileSync(new URL('../../provenance/runtime-compatibility.json', import.meta.url))
    )
  );
  const schema = JSON.parse(
    readFileSync(new URL('../../schemas/runtime-compatibility-v1.json', import.meta.url))
  );
  assert.deepEqual(Object.keys(formats.SUPPORTED_FORMATS), schema.properties.contracts.required);
  for (const name of schema.properties.contracts.required)
    for (const operation of ['read', 'write'])
      assert.deepEqual(
        formats.SUPPORTED_FORMATS[name][operation],
        schema.properties.contracts.properties[name].properties[operation].items.enum
      );
  const cli = JSON.parse(
    readFileSync(new URL('../../schemas/cli-result-v1.json', import.meta.url))
  );
  assert.deepEqual(formats.PROTOCOL_STATES, cli.$defs.state.enum);
});
