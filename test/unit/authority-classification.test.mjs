// @story #136
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  classifyOperation,
  assertOperationAuthority,
  revalidateOperationAuthority,
} from '../../src/startup/authority-fence.mjs';
import { COMMANDS } from '../../src/cli/parse.mjs';
const wants = {
  help: 'read',
  explain: 'read',
  status: 'read',
  doctor: 'read',
  setup: 'maintenance',
  build: 'maintenance',
  'register-runtime': 'maintenance',
  start: 'mutation',
  advance: 'mutation',
  'request-grant': 'mutation',
  join: 'mutation',
  'launch-reviewer': 'mutation',
  resume: 'mutation',
  submit: 'mutation',
  supplement: 'mutation',
  continue: 'mutation',
  finalize: 'mutation',
  recover: 'mutation',
  abandon: 'mutation',
  supersede: 'mutation',
  consolidate: 'mutation',
};
test('all ordinary parser commands have closed authority classes', () => {
  for (const command of COMMANDS.filter((c) => !['primary', 'broker'].includes(c)))
    assert.equal(classifyOperation(command), wants[command]);
  for (const [name, want] of Object.entries({
    'primary.inspect': 'read',
    'primary.register': 'maintenance',
    'primary.activate': 'maintenance',
    'broker.status': 'read',
    'broker.start': 'mutation',
    'broker.reconcile': 'mutation',
    'broker.register': 'mutation',
    'broker.launch': 'mutation',
    'broker.suspend': 'cleanup',
    'broker.stop': 'cleanup',
  }))
    assert.equal(classifyOperation(name), want);
});
test('unknown operations cannot acquire authority', async () => {
  assert.throws(() => classifyOperation('future-write'), {
    code: 'APR_OPERATION_AUTHORITY_UNAVAILABLE',
  });
  await assert.rejects(assertOperationAuthority({ operation: 'future-write' }), {
    code: 'APR_OPERATION_AUTHORITY_UNAVAILABLE',
  });
});
test('maintenance classification does not admit ordinary review effects', async () => {
  await assert.rejects(assertOperationAuthority({ operation: 'setup' }), {
    code: 'APR_OPERATION_AUTHORITY_UNAVAILABLE',
  });
  await assert.rejects(
    revalidateOperationAuthority(Object.freeze({ operation: 'start', kind: 'mutation' })),
    { code: 'APR_OPERATION_AUTHORITY_UNAVAILABLE' }
  );
});
test('read-only authority remains usable outside Git', async () => {
  const fence = await assertOperationAuthority({ operation: 'help', cwd: '/' });
  assert.equal(await revalidateOperationAuthority(fence), fence);
});
