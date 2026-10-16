// @story #190
// Actual election controls in a disposable installed protocol fixture.
// No ordinary installed OS journey acceptance is inferred from this fixture.
import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { authorityInstalledFixture } from '../helpers/authority-installed-fixture.mjs';

test('stock election preserves exact binding or refuses a missing source class without effects', async (t) => {
  const fixture = await authorityInstalledFixture(t, {
    nativeSecurity: false,
    activatePrimary: false,
  });
  const result = fixture.execute(
    'import {provisionProtectedRoot} from ' +
      fixture.module('src/broker/storage-protection.mjs') +
      ';import {bindOwnerElectionPaths,acquireOwnerElection,inspectOwnerElectionLease} from ' +
      fixture.module('src/broker/ownership-election.mjs') +
      ';import {readdirSync} from "node:fs";const context={signal:new AbortController().signal,deadline:performance.now()+30000};' +
      'const receipt=await provisionProtectedRoot({root:' +
      JSON.stringify(path.join(fixture.root, '.scratch', 'owner-binding-control')) +
      ',...context});const paths=await bindOwnerElectionPaths({receipt,resource:{kind:"broker-owner"},...context});let lease,other;try{' +
      'const observedRoot=' +
      JSON.stringify(path.join(fixture.root, '.scratch', 'owner-binding-control')) +
      ';const before=JSON.stringify(readdirSync(observedRoot,{recursive:true}).sort());const elected=await acquireOwnerElection({paths,...context});if(elected.kind!=="won"||elected.verified!==true){if(elected.kind!=="indeterminate"||elected.reason!=="source-class-unavailable"||elected.verified!==false||elected.obligations.length)throw Error("unexpected-election-refusal:"+elected.reason);console.log(JSON.stringify({incomplete:true,reason:elected.reason,verified:false,entriesUnchanged:before===JSON.stringify(readdirSync(observedRoot,{recursive:true}).sort())}));}else{lease=elected.lease;' +
      'const observed=await inspectOwnerElectionLease({lease,paths,...context});' +
      'const refused=async(input)=>{try{await inspectOwnerElectionLease(input);return false;}catch(error){return error.code==="APR_BROKER_STALE";}};' +
      'other=await bindOwnerElectionPaths({receipt,resource:{kind:"broker-owner"},...context});' +
      'const result={accepted:observed.identity.pid===process.pid,copiedPathsRefused:await refused({lease,paths:{...paths},...context}),otherBindingRefused:await refused({lease,paths:other,...context}),copiedLeaseRefused:await refused({lease:{...lease},paths,...context}),changedSignalRefused:await refused({lease,paths,signal:new AbortController().signal,deadline:context.deadline})};' +
      'const withdrawn=await lease.release();lease=null;result.withdrawn=withdrawn.status==="withdrawn"&&!withdrawn.obligations.length;console.log(JSON.stringify(result));' +
      '}}finally{if(lease)await lease.release();if(other)await other.close();await paths.close();}'
  );
  assert.equal(result.status, 0, result.stderr);
  const observed = JSON.parse(result.stdout);
  if (observed.incomplete) {
    assert.deepEqual(observed, {
      incomplete: true,
      reason: 'source-class-unavailable',
      verified: false,
      entriesUnchanged: true,
    });
    t.diagnostic(
      'Positive legacy election coverage incomplete: current source class unavailable; closed refusal is proven, not admission. Local handoffs have no election/class prerequisite.'
    );
    return;
  }
  assert.deepEqual(observed, {
    accepted: true,
    copiedPathsRefused: true,
    otherBindingRefused: true,
    copiedLeaseRefused: true,
    changedSignalRefused: true,
    withdrawn: true,
  });
});
