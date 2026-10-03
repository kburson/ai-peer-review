// @story #136
import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtempSync, existsSync, rmSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import {
  initializeReview,
  readReview,
  mutateReview,
  mutateReviewBatch,
  repairReview,
} from '../../src/protocol/service.mjs';
import { event } from '../helpers/review-fixture.mjs';

// Removing production admission must allow a real journal/projection write,
// making these tests fail; no provider or authority adapter is mocked.
function workspace(t) {
  const root = mkdtempSync(path.join(tmpdir(), 'apr-unselected-effect-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  return root;
}
const runtimeRefusal = (error) => error.code === 'APR_RUNTIME_INSTALLATION_INVALID';

test('direct initializer refuses source execution before lock or journal creation', async (t) => {
  const root = workspace(t);
  await assert.rejects(initializeReview(root, event('review-created')), runtimeRefusal);
  assert.equal(existsSync(path.join(root, 'events.jsonl')), false);
  assert.equal(existsSync(path.join(root, 'review.lock')), false);
});

test('direct projection repair refuses source execution and preserves the journal', async (t) => {
  const root = workspace(t);
  const journal = JSON.stringify(event('review-created')) + '\n';
  writeFileSync(path.join(root, 'events.jsonl'), journal);
  await assert.rejects(readReview(root), runtimeRefusal);
  assert.equal(readFileSync(path.join(root, 'events.jsonl'), 'utf8'), journal);
  assert.equal(existsSync(path.join(root, 'protocol.json')), false);
});

for (const [name, operation] of [
  [
    'single mutation',
    (root) =>
      mutateReview(
        root,
        { reviewId: 'review-01', sequence: 1, revision: 1, actor: 'reviewer' },
        () => event('reviewer-joined', { sequence: 2, revision: 2 })
      ),
  ],
  [
    'batch mutation',
    (root) =>
      mutateReviewBatch(
        root,
        { reviewId: 'review-01', sequence: 1, revision: 1, actor: 'reviewer' },
        () => [event('reviewer-joined', { sequence: 2, revision: 2 })]
      ),
  ],
  [
    'repair callback',
    (root) =>
      repairReview(
        root,
        { reviewId: 'review-01', sequence: 1, revision: 1, actor: 'reviewer' },
        { repair: () => writeFileSync(path.join(root, 'callback-effect'), 'unsafe') }
      ),
  ],
]) {
  test('direct ' + name + ' refuses before callback and journal effects', async (t) => {
    const root = workspace(t);
    const journal = JSON.stringify(event('review-created')) + '\n';
    writeFileSync(path.join(root, 'events.jsonl'), journal);
    await assert.rejects(operation(root), runtimeRefusal);
    assert.equal(readFileSync(path.join(root, 'events.jsonl'), 'utf8'), journal);
    assert.equal(existsSync(path.join(root, 'callback-effect')), false);
    assert.equal(existsSync(path.join(root, 'protocol.json')), false);
  });
}

import { authorityInstalledFixture } from '../helpers/authority-installed-fixture.mjs';
test('a selected installed runtime admits an activated clone', async (t) => {
  const f = await authorityInstalledFixture(t);
  const result = f.execute(
    'import {assertOperationAuthority,revalidateOperationAuthority} from ' +
      f.module('src/startup/authority-fence.mjs') +
      '; const fence=await assertOperationAuthority({operation:"start",cwd:process.cwd()}); await revalidateOperationAuthority(fence); console.log("admitted");'
  );
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout.trim(), 'admitted');
});
test('policy replacement during a wait fences the subsequent effect', async (t) => {
  const f = await authorityInstalledFixture(t);
  const result = f.execute(
    'import {writeFileSync,readFileSync,existsSync} from "node:fs"; import path from "node:path"; import {assertOperationAuthority,revalidateOperationAuthority} from ' +
      f.module('src/startup/authority-fence.mjs') +
      '; const fence=await assertOperationAuthority({operation:"start",cwd:process.cwd()}); const config=path.join(process.cwd(),".ai-peer-review/config.json"); await Promise.resolve(); writeFileSync(config,readFileSync(config,"utf8")+" "); let refused=false; try { await revalidateOperationAuthority(fence); writeFileSync("effect","unsafe"); } catch(error) {refused=error.code==="APR_PRIMARY_AUTHORITY_UNAVAILABLE";} if(!refused||existsSync("effect")) throw Error("stale policy effect admitted"); console.log("fenced");'
  );
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout.trim(), 'fenced');
});

test('clone maintenance exclusion prevents a direct journal effect', async (t) => {
  const f = await authorityInstalledFixture(t);
  const journalEvent = event('review-created');
  journalEvent.payload.startup.context.repository_root = f.root;
  const result = f.execute(
    'import {mkdirSync,existsSync} from "node:fs"; import path from "node:path"; import {initializeReview} from ' +
      f.module('src/protocol/service.mjs') +
      '; const workspace=path.join(process.cwd(),".scratch/peer-review/held"); mkdirSync(workspace,{recursive:true}); mkdirSync(path.join(process.cwd(),".git/ai-peer-review/admission.lock"),{mode:448}); let refused=false; try {await initializeReview(workspace,' +
      JSON.stringify(journalEvent) +
      ');} catch(error) {refused=error.code==="APR_PRIMARY_AUTHORITY_UNAVAILABLE";} if(!refused||existsSync(path.join(workspace,"events.jsonl"))||existsSync(path.join(workspace,"locks"))) throw Error("clone exclusion was bypassed"); console.log("excluded");'
  );
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout.trim(), 'excluded');
});

import { captureCodexStartHook } from '../../src/providers/codex-hook.mjs';
test('direct provider hook refuses source execution before writing exact-session evidence', async (t) => {
  const root = workspace(t),
    token = 'a'.repeat(32);
  await assert.rejects(
    Promise.resolve().then(() =>
      captureCodexStartHook({
        event: {
          cwd: root,
          hook_event_name: 'PreToolUse',
          tool_name: 'Bash',
          model: 'gpt-fixture',
          session_id: 'fixture-session',
          turn_id: 'fixture-turn',
          tool_use_id: 'fixture-tool',
          tool_input: { command: 'peer-review start docs/spec.md' },
        },
        sourceVersion: 'fixture',
        token,
      })
    ),
    runtimeRefusal
  );
  assert.equal(
    existsSync(path.join(root, '.scratch/peer-review/codex-hooks', token + '.json')),
    false
  );
});

import { startReview as productionStart } from '../../src/cli/run.mjs';
import { setupHostFixture } from '../helpers/setup-host-fixture.mjs';
import { participant } from '../helpers/review-fixture.mjs';
test('validatedStartup and preflightOnly caller inputs cannot bypass production admission', async (t) => {
  const f = await setupHostFixture(t);
  f.write('.git/info/exclude', '.scratch/peer-review/\n');
  await assert.rejects(
    productionStart(
      {
        issue: 136,
        cwd: f.root,
        artifact: 'README.md',
        artifactKind: 'spec',
        identity: participant('author'),
        reviewId: 'source-bypass',
        now: '2026-09-08T12:00:00.000Z',
      },
      {
        validatedStartup: true,
        preflightOnly: true,
        config: { config: { review: { transport_mode: 'manual' } } },
      }
    ),
    runtimeRefusal
  );
  assert.equal(existsSync(path.join(f.root, '.scratch/peer-review/source-bypass')), false);
});

import { runBroker } from '../../src/broker/service.mjs';
test('direct broker restoration refuses source authority before starting a worker', async (t) => {
  const root = workspace(t),
    identity = { digest: 'a'.repeat(64), physicalRoot: root };
  await assert.rejects(
    runBroker({
      identity,
      owner: {},
      versions: {},
      registry: {
        list: async () => [
          { project_digest: identity.digest, review_id: 'review-01', workspace: root },
        ],
        get: async () => null,
      },
      workerFactory: async () => ({
        workState: () => 'terminal',
        start: async () => writeFileSync(path.join(root, 'worker-effect'), 'unsafe'),
        suspend: async () => {},
        close: async () => {},
      }),
      clock: {
        now: () => 0,
        setTimeout: (callback) => {
          queueMicrotask(callback);
          return 1;
        },
        clearTimeout: () => {},
      },
      server: { start: () => {}, close: async () => {} },
    }),
    runtimeRefusal
  );
  assert.equal(existsSync(path.join(root, 'worker-effect')), false);
});

test('selection permission drift refuses an immediate effect with unchanged bytes', async (t) => {
  const f = await authorityInstalledFixture(t);
  const result = f.execute(
    'import {chmodSync,existsSync,readFileSync,writeFileSync} from "node:fs"; import {execFileSync} from "node:child_process"; import {verifiedAccountSelectionPath} from ' +
      f.module('src/config/runtime-selection.mjs') +
      '; import {assertOperationAuthority,performOperationEffect} from ' +
      f.module('src/startup/authority-fence.mjs') +
      '; const fence=await assertOperationAuthority({operation:"start",cwd:process.cwd()}); const selection=await verifiedAccountSelectionPath(); const before=readFileSync(selection); if(process.platform==="win32"){execFileSync("icacls.exe",[selection,"/grant","*S-1-1-0:(R)"],{stdio:"pipe"});}else{chmodSync(selection,420);} if(!before.equals(readFileSync(selection)))throw Error("permission drift changed selection bytes"); let refused=false; try{performOperationEffect(fence,()=>writeFileSync("effect","unsafe"));}catch(error){refused=true;} if(!refused||existsSync("effect")) throw Error("public selection admitted an effect"); console.log("fenced");'
  );
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout.trim(), 'fenced');
});

test('direct initializer cannot write a foreign-worktree review context', async (t) => {
  const f = await authorityInstalledFixture(t);
  const foreign = event('review-created');
  foreign.payload.startup.context.repository_root = f.linked;
  const result = f.execute(
    'import {mkdirSync,existsSync} from "node:fs"; import path from "node:path"; import {initializeReview} from ' +
      f.module('src/protocol/service.mjs') +
      '; const workspace=path.join(process.cwd(),".scratch/peer-review/foreign"); mkdirSync(workspace,{recursive:true}); let refused=false; try{await initializeReview(workspace,' +
      JSON.stringify(foreign) +
      ');}catch(error){refused=error.code==="APR_OPERATION_AUTHORITY_UNAVAILABLE";} if(!refused||existsSync(path.join(workspace,"events.jsonl")))throw Error("foreign context admitted"); console.log("fenced");'
  );
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout.trim(), 'fenced');
});

test('existing foreign review context is refused before projection repair', async (t) => {
  const f = await authorityInstalledFixture(t),
    foreign = event('review-created');
  foreign.payload.startup.context.repository_root = f.linked;
  const result = f.execute(
    'import {mkdirSync,writeFileSync,existsSync} from "node:fs"; import path from "node:path"; import {readReview} from ' +
      f.module('src/protocol/service.mjs') +
      '; const workspace=path.join(process.cwd(),".scratch/peer-review/foreign"); mkdirSync(workspace,{recursive:true}); writeFileSync(path.join(workspace,"events.jsonl"),' +
      JSON.stringify(JSON.stringify(foreign) + '\n') +
      '); let refused=false; try{await readReview(workspace);}catch(error){refused=error.code==="APR_OPERATION_AUTHORITY_UNAVAILABLE";} if(!refused||existsSync(path.join(workspace,"protocol.json")))throw Error("foreign repair admitted"); console.log("fenced");'
  );
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout.trim(), 'fenced');
});

import { sealNoCommitHandoff, writeDeliveryReceiptExclusive } from '../../src/protocol/service.mjs';
for (const [name, write] of [
  [
    'snapshot',
    (root) =>
      sealNoCommitHandoff({
        review: {
          protocol: {
            commit_mode: 'no-commit',
            review_id: 'review-01',
            sequence: 1,
            startup: { context: { repository_root: root }, no_commit_baseline: {} },
          },
        },
        artifactBytes: Buffer.from('artifact'),
        responses: [{ digest: 'sha256:' + 'a'.repeat(64) }],
        store: {
          assertBaseline: () => {},
          writeExclusiveSnapshot: () => {
            writeFileSync(path.join(root, 'effect'), 'unsafe');
            return { relative: 'snapshot', digest: 'sha256:' + 'b'.repeat(64) };
          },
        },
      }),
  ],
  [
    'receipt',
    (root) =>
      writeDeliveryReceiptExclusive(path.join(root, 'effect'), {
        delivery_id: 'delivery-01',
        recipient: 'author',
        digest: 'sha256:' + 'a'.repeat(64),
      }),
  ],
])
  test('direct exported ' + name + ' writer refuses source authority before effects', async (t) => {
    const root = workspace(t);
    await assert.rejects(
      Promise.resolve().then(() => write(root)),
      runtimeRefusal
    );
    assert.equal(existsSync(path.join(root, 'effect')), false);
  });

import { applyReviewRecord, runClaudeReviewerLaunch } from '../../src/public-api.mjs';
test('public record application refuses source execution before accepting a relocation plan', async (t) => {
  const root = workspace(t);
  await assert.rejects(
    Promise.resolve().then(() =>
      applyReviewRecord(
        Object.freeze({ schema: 'ai-peer-review.relocation-plan/v1', repository_root: root })
      )
    ),
    runtimeRefusal
  );
});
test('public provider launch refuses source execution before inspecting or dispatching', async (t) => {
  const root = workspace(t);
  await assert.rejects(
    runClaudeReviewerLaunch({
      contract: {
        schema: 'ai-peer-review.claude-launch/v1',
        repository_root: root,
        workspace: root,
      },
      execFile: async () => {
        writeFileSync(path.join(root, 'dispatch'), 'unsafe');
      },
      inspectAuthority: () => {
        writeFileSync(path.join(root, 'inspect'), 'unsafe');
        return {};
      },
    }),
    runtimeRefusal
  );
  assert.equal(existsSync(path.join(root, 'dispatch')), false);
  assert.equal(existsSync(path.join(root, 'inspect')), false);
});

test('replacement runtime rejects a carried fence but admits a fresh unchanged-contract upgrade', async (t) => {
  const f = await authorityInstalledFixture(t);
  const result = f.execute(
    'import {cpSync,writeFileSync,existsSync} from "node:fs";import path from "node:path";import {pathToFileURL} from "node:url";import {assertOperationAuthority,revalidateOperationAuthority} from ' +
      f.module('src/startup/authority-fence.mjs') +
      ';const old=await assertOperationAuthority({operation:"start",cwd:process.cwd()});await Promise.resolve();const next=' +
      JSON.stringify(f.installed + '-upgrade') +
      ';cpSync(' +
      JSON.stringify(f.installed) +
      ',next,{recursive:true});const selection=await import(pathToFileURL(path.join(next,"src/config/runtime-selection.mjs")));await selection.registerRuntimeSelection({update:true});let refused=false;try{await revalidateOperationAuthority(old);writeFileSync("stale-effect","unsafe");}catch{refused=true;}const fresh=await import(pathToFileURL(path.join(next,"src/startup/authority-fence.mjs")));await fresh.assertOperationAuthority({operation:"start",cwd:process.cwd()});if(!refused||existsSync("stale-effect"))throw Error("replacement admitted stale authority");console.log("upgraded");'
  );
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout.trim(), 'upgraded');
});
test('integration replacement during a wait refuses the subsequent effect', async (t) => {
  const f = await authorityInstalledFixture(t);
  const result = f.execute(
    'import {writeFileSync,readFileSync,existsSync} from "node:fs";import path from "node:path";import {assertOperationAuthority,revalidateOperationAuthority} from ' +
      f.module('src/startup/authority-fence.mjs') +
      ';const fence=await assertOperationAuthority({operation:"start",cwd:process.cwd()});await Promise.resolve();const wrapper=path.join(process.cwd(),".codex/skills/peer-review/SKILL.md");writeFileSync(wrapper,readFileSync(wrapper,"utf8")+" changed");let refused=false;try{await revalidateOperationAuthority(fence);writeFileSync("effect","unsafe");}catch{refused=true;}if(!refused||existsSync("effect"))throw Error("stale integration admitted");console.log("fenced");'
  );
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout.trim(), 'fenced');
});
import { createNativePushTransport } from '../../src/transport/native-push.mjs';
for (const method of ['deliver', 'reconcile'])
  test('public native push ' + method + ' refuses source execution before dispatch', async (t) => {
    const root = workspace(t),
      now = Date.parse('2026-09-11T09:00:00.000Z');
    const effect = async () => {
      writeFileSync(path.join(root, 'effect'), 'unsafe');
      return { acknowledged: true };
    };
    const transport = createNativePushTransport({
      adapter: 'codex-app',
      now,
      dispatch: effect,
      reconcile: effect,
      lease: {
        schema: 'ai-peer-review.resident-lease/v1',
        process_instance_id: 'codex-process-01',
        pid: null,
        opaque_handle: 'codex:session-01',
        host: 'codex',
        adapter_version: '2.0.0',
        heartbeat_sequence: 7,
        observed_at: '2026-09-11T08:59:55.000Z',
        expires_at: '2026-09-11T09:00:30.000Z',
      },
    });
    await assert.rejects(
      transport[method]({ repositoryRoot: root, invitation: 'invitation.md' }),
      runtimeRefusal
    );
    assert.equal(existsSync(path.join(root, 'effect')), false);
  });

import { prepareStartup } from '../../src/startup/runtime.mjs';
test('standalone startup preparation refuses source execution before provider effects', async (t) => {
  const root = workspace(t);
  await assert.rejects(
    prepareStartup(
      {
        cwd: root,
        issue: 136,
        reviewerProvider: 'codex',
        reviewerModel: 'gpt-test',
        artifact: 'artifact.md',
        artifactKind: 'spec',
      },
      {
        repository: {
          root: () => {
            writeFileSync(path.join(root, 'effect'), 'unsafe');
            return root;
          },
        },
      }
    ),
    runtimeRefusal
  );
  assert.equal(existsSync(path.join(root, 'effect')), false);
});

import { reserveReviewerLaunch, settleReservedReviewerLaunch } from '../../src/broker/launch.mjs';
for (const [name, operation] of [
  ['reservation', reserveReviewerLaunch],
  ['settlement', settleReservedReviewerLaunch],
])
  test('direct broker launch ' + name + ' refuses before locks or provider dispatch', async (t) => {
    const root = workspace(t);
    await assert.rejects(
      operation({
        registration: { workspace: root },
        worker: {
          launchReviewer: async () => {
            writeFileSync(path.join(root, 'dispatch'), 'unsafe');
            return { status: 'launched' };
          },
        },
        operation: { operation_id: 'launch-01', intent_digest: 'sha256:' + 'a'.repeat(64) },
      }),
      runtimeRefusal
    );
    assert.equal(existsSync(path.join(root, 'dispatch')), false);
    assert.equal(existsSync(path.join(root, 'dispatch/locks')), false);
  });

test('registered provider launch revalidates policy before persisting an awaited acknowledgement', async (t) => {
  const f = await authorityInstalledFixture(t);
  const result = f.execute(
    'import {writeFileSync,readFileSync,existsSync} from "node:fs"; import path from "node:path"; import {withOperationAuthority} from ' +
      f.module('src/startup/authority-fence.mjs') +
      '; import {createProviderAdapter,registerProductionProviderAdapter} from ' +
      f.module('src/providers/registry.mjs?isolated-provider-registration') +
      '; const adapter=registerProductionProviderAdapter(createProviderAdapter({selector:"grok",provider:"xai",host:"grok",surface:{launch:async()=>{await Promise.resolve();const config=path.join(process.cwd(),".ai-peer-review/config.json");writeFileSync(config,readFileSync(config,"utf8")+" ");return {status:"acknowledged",handle:"reviewer-session",observation:{provider:"xai",host:"grok",session_id:"reviewer-session",model_id:"grok-4",effort:"low",adapter_version:"1.0.0",assurance:"runtime"}};}}})); let refused=false; try {await withOperationAuthority({operation:"provider.launch",cwd:process.cwd()},()=>adapter.launchReviewer({invitationPath:path.join(process.cwd(),"invitation.md"),expected:{provider:"xai",host:"grok",model_id:"grok-4",effort:"low",adapter_version:"1.0.0"},effort:"low",operationId:"waited",scratchRoot:path.join(process.cwd(),"provider-effect")}));} catch(error){refused=error.code==="APR_PRIMARY_AUTHORITY_UNAVAILABLE";} if(!refused||existsSync(path.join(process.cwd(),"provider-effect"))) throw Error("stale provider acknowledgement persisted"); console.log("fenced");'
  );
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout.trim(), 'fenced');
});

test('direct coordinator lease refuses before directory or lease creation', async (t) => {
  const root = workspace(t);
  const { acquireCoordinatorLease } = await import('../../src/coordinator/lease.mjs');
  assert.throws(() => acquireCoordinatorLease(root, { kind: 'app-host', pid: process.pid }), {
    code: 'APR_OPERATION_AUTHORITY_UNAVAILABLE',
  });
  assert.equal(existsSync(path.join(root, 'coordinator')), false);
});

test('provider stream refuses to persist join evidence without current operation authority', async (t) => {
  const root = workspace(t);
  const { createClaudeStreamRecorder } = await import('../../src/providers/claude-stream.mjs');
  const recorder = createClaudeStreamRecorder({
    workspace: root,
    operationId: 'join:review-1',
    expectedCommand: 'peer-review join /repo/invitation.md',
  });
  recorder.accept({
    type: 'system',
    subtype: 'init',
    model: 'claude-opus-5',
    session_id: 'private-session',
    claude_code_version: '2.1.278',
  });
  assert.throws(
    () =>
      recorder.accept({
        type: 'assistant',
        session_id: 'private-session',
        timestamp: '2026-10-02T12:00:00.000Z',
        message: {
          model: 'claude-opus-5',
          content: [
            {
              type: 'tool_use',
              id: 'join-1',
              name: 'Bash',
              input: { command: 'peer-review join /repo/invitation.md' },
            },
          ],
        },
      }),
    { code: 'APR_OPERATION_AUTHORITY_UNAVAILABLE' }
  );
  assert.equal(existsSync(path.join(root, 'provider')), false);
});

test('an immediate effect waits for bounded foreign-process clone contention and revalidates', async (t) => {
  const f = await authorityInstalledFixture(t);
  const result = f.execute(
    'import {spawn} from "node:child_process";import {existsSync,writeFileSync} from "node:fs";import path from "node:path";import {assertOperationAuthority,performOperationEffect} from ' +
      f.module('src/startup/authority-fence.mjs') +
      '; const fence=await assertOperationAuthority({operation:"start",cwd:process.cwd()}); const lock=path.join(process.cwd(),".git/ai-peer-review/admission.lock"); const script="const fs=require(\\"node:fs\\");const path=require(\\"node:path\\");const lock=process.argv[1];fs.mkdirSync(lock,{mode:448});fs.writeFileSync(path.join(lock,\\"owner.json\\"),JSON.stringify({schema:\\"ai-peer-review.primary-admission/v1\\",pid:process.pid,token:\\"fixture\\"})+\\"\\\\n\\",{mode:384});process.stdout.write(\\"held\\");setTimeout(()=>{fs.unlinkSync(path.join(lock,\\\"owner.json\\\"));setTimeout(()=>fs.rmdirSync(lock),100);},2000);"; const child=spawn(process.execPath,["-e",script,lock],{stdio:["ignore","pipe","inherit"]}); const done=new Promise(resolve=>child.once("exit",resolve)); await new Promise(resolve=>child.stdout.once("data",resolve)); try{performOperationEffect(fence,()=>writeFileSync("contended-effect","safe"));}finally{await done;} if(!existsSync("contended-effect"))throw Error("bounded contention refused");console.log("admitted");'
  );
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout.trim(), 'admitted');
});

test('standalone broker bootstrap refuses source execution before launch or bootstrap effects', async (t) => {
  const root = workspace(t);
  const { ensureBroker } = await import('../../src/broker/client.mjs');
  let effects = 0;
  await assert.rejects(
    ensureBroker({
      project: { physicalRoot: root, digest: 'e'.repeat(64) },
      versions: {},
      runtimeImage: { root, nodeExecutable: process.execPath },
      platform: {
        verifyRuntimeImage: () => true,
        connect: async () => {
          throw Object.assign(new Error('missing'), { code: 'ENOENT' });
        },
        createBootstrap: () => {
          effects++;
          return 'bootstrap';
        },
        spawn: () => {
          effects++;
          throw new Error('unsafe launch');
        },
      },
    }),
    runtimeRefusal
  );
  assert.equal(effects, 0);
});

test('standalone production worker refuses source authority before recovery evidence writes', async (t) => {
  const { recoveryWorkerFixture } = await import('../helpers/recovery-worker-fixture.mjs');
  const { createProductionReviewWorker } = await import('../../src/broker/worker-factory.mjs');
  const f = recoveryWorkerFixture(t, { workerFactory: createProductionReviewWorker });
  await assert.rejects(
    (async () => {
      const worker = await f.makeWorker();
      await worker.start();
    })(),
    runtimeRefusal
  );
  assert.equal(existsSync(f.file), false);
});
