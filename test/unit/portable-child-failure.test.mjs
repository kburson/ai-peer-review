// @story #209
import test from 'node:test';
import assert from 'node:assert/strict';
const api = await import('../../src/broker/portable-child-failure.mjs').catch((error) => {
  if (error.code === 'ERR_MODULE_NOT_FOUND') return {};
  throw error;
});

test('broker child projection carries only closed reasons and obligation names', () => {
  assert.equal(typeof api.encodePortableBrokerChildFailure, 'function');
  const encoded = api.encodePortableBrokerChildFailure({
    details: {
      reason: 'provider-resource-retained',
      nonce: 'private-nonce',
      path: '/private/store',
      outstandingObligations: [
        { name: 'provider-resource-retained', root: '/secret', credential: 'token' },
      ],
    },
  });
  const decoded = api.decodePortableBrokerChildFailure(encoded);
  assert.deepEqual(decoded, {
    schema: 'ai-peer-review.broker-child-failure/v1',
    reason: 'provider-resource-retained',
    obligations: ['provider-resource-retained'],
  });
  for (const privateValue of ['private-nonce', '/private/store', '/secret', 'token'])
    assert.equal(encoded.includes(privateValue), false);
});

test('child decoder refuses oversized, unknown, duplicate and trailing diagnostics', () => {
  assert.equal(typeof api.decodePortableBrokerChildFailure, 'function');
  const good = api.encodePortableBrokerChildFailure({
    details: { reason: 'reconciliation-deadline' },
  });
  for (const bad of [
    good + good,
    good + 'private stderr',
    'x'.repeat(4097),
    good.replace('reconciliation-deadline', '/private/store'),
  ])
    assert.equal(api.decodePortableBrokerChildFailure(bad), null);
});

test('bounded child channel rejects overflow and decodes only the complete close-time frame', () => {
  assert.equal(typeof api.createPortableBrokerFailureChannel, 'function');
  const frame = api.encodePortableBrokerChildFailure({
    details: { reason: 'manual-resource-retained' },
  });
  const channel = api.createPortableBrokerFailureChannel();
  for (const byte of Buffer.from(frame)) channel.append(Buffer.from([byte]));
  assert.equal(channel.read().reason, 'manual-resource-retained');
  channel.append(Buffer.alloc(4097));
  assert.equal(channel.read(), null);
});

test('shipped broker entrypoint emits one closed frame and preserves its failing exit', async () => {
  const { execFile } = await import('node:child_process');
  const { fileURLToPath } = await import('node:url');
  const result = await new Promise((resolve) =>
    execFile(
      process.execPath,
      [fileURLToPath(new URL('../../bin/peer-review-broker.mjs', import.meta.url))],
      { timeout: 30000, maxBuffer: 4096 },
      (error, stdout, stderr) => resolve({ error, stdout, stderr })
    )
  );
  assert.equal(result.error.code, 1);
  assert.equal(result.stdout, '');
  const projected = api.decodePortableBrokerChildFailure(result.stderr);
  assert.equal(projected.reason, 'broker-startup-incomplete');
  assert.deepEqual(projected.obligations, []);
});

test('client preserves closed retained obligations and actual child exit under the original deadline', async () => {
  const { createPortableClientCore } = await import('../../src/broker/client-core.mjs');
  const context = { signal: new AbortController().signal, deadline: 30000 };
  const projected = api.decodePortableBrokerChildFailure(
    api.encodePortableBrokerChildFailure({
      details: {
        reason: 'provider-resource-retained',
        outstandingObligations: [{ name: 'coordinator-generation-retained', root: '/private' }],
      },
    })
  );
  const core = createPortableClientCore({
    clock: { now: () => 0 },
    current: async () => {},
    effect: (operation) => operation(),
    delay: async () => {
      throw new Error('exited child must not get a retry delay');
    },
    observe: async (_input, current) => {
      assert.equal(current, context);
      return { status: 'missing' };
    },
    launch: async (_input, current) => {
      assert.equal(current, context);
      return {
        ready: Promise.resolve(),
        exited: () => true,
        failure: () => projected,
        exitStatus: () => ({ code: 1, signal: null }),
      };
    },
  });
  await assert.rejects(
    () => core.ensure({}, context),
    (error) => {
      assert.equal(error.details.reason, 'provider-resource-retained');
      assert.deepEqual(error.details.childExit, { code: 1, signal: null });
      assert.deepEqual(error.details.childFailure.obligations, ['coordinator-generation-retained']);
      assert.equal(JSON.stringify(error.details).includes('/private'), false);
      return true;
    }
  );
  assert.equal(context.deadline, 30000);
});
