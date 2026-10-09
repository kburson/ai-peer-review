import assert from 'node:assert/strict';
import test from 'node:test';
import { flush, waitForBrokerCondition } from '../helpers/portable-broker-fixture.mjs';

test('broker acknowledgement waits through delayed delivery instead of a fixed flush', async () => {
  let delivered = false;
  let notification;
  try {
    await flush();
    assert.equal(delivered, false, 'a scheduler flush is not notification acknowledgement');
    notification = setTimeout(() => {
      delivered = true;
    }, 60);
    await waitForBrokerCondition(() => delivered, 'delayed broker notification');
    assert.equal(delivered, true);
  } finally {
    clearTimeout(notification);
  }
});

test('missing broker acknowledgement fails at its bounded deadline', async () => {
  await assert.rejects(
    waitForBrokerCondition(() => false, 'missing admission', { timeoutMs: 25 }),
    /missing admission/
  );
});
