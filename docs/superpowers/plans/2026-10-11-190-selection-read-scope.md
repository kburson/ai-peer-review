# #190 selection read scope implementation plan

## Active simple local handoff amendment

The user's 2026-10-16 direction selects trusted agents already permitted to work
in one local project. The [simple handoff design](../specs/2026-10-16-190-trusted-local-storage-design.md) and
[implementation plan](./2026-10-16-190-trusted-local-storage.md) govern that workflow. Reviewer writes only its
current response notes; author may also revise the artifact; neither participant
modifies other tracked files, Git metadata or anything outside the project.
Use normal filesystem access with essential turn authentication, locking and
restart recovery. No initial/repeated ACL or SID challenge, protection-admission
scope, source-class enrollment/capture prerequisite, persistent query worker or
native binary is required for this local handoff.
Conflicting stronger requirements below are historical/broader capability scope,
not local handoff gates. Preserve their evidence and do not mark their broader
claims complete. Old accepted revisions do not approve this amendment; normally
review the revised documents and record the changed #190 scope before runtime
implementation.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Root implements inline under the user's existing authorization; no implementer delegation.

**Goal:** Retain one selection-store descriptor across one original primary operation while observing every current permission, account, generation and installed source afresh.

**Architecture:** A private scope manager owns context-keyed state and a single genuine C1 guard. The existing selection store derives fresh identity and supplies a per-call acquisition closure plus the final synchronous integrity port. Primary maintenance supplies the existing original operation boundary and truthful effect-progress reporting; a scope result provides no new authority.

**Tech Stack:** Node 24/26, AsyncLocalStorage, AbortSignal, monotonic performance clock, existing portable C1/C2 interfaces and native peer-review/AITM workflows.

**Spec:** `docs/superpowers/specs/2026-10-11-190-selection-read-scope-design.md`, normal accepted review5c332d239bdb1535dd319816d3228888, native finalization b4741ce.

## Global constraints

- The original actual signal and exact deadline remain unchanged; strictly future, at most 30000 ms away at scope entry. Longer deadlines refuse, never clamp.
- No permission/principal/bytes/current-source observation cache, injected clock, caller root/receipt/script or production authority from scope data.
- FIFO maximum 64 pending borrowers and maximum 64 live open/closing/uncertain entries per store. Tombstones do not count; no FinalizationRegistry is required.
- A failure poisons that context permanently. Actual cleanup discharges resources only and cannot reopen/retry/revive it.
- Lexically inherited async continuations remain nested even after closure; later entry from them is intentionally refused.
- Scope code implements no resident PowerShell worker. Windows query 15000 ms, operation 30000 ms, portable 5000 ms and test 800000 ms remain unchanged.
- Native CI builds stay disabled. Host TIA only; complete suites use exact-head hosted receipts. Linux manual review remains excluded only.
- Preserve historical review/class bytes; changed producer closure requires new normal capture/class acceptance before actual installed claims.

## Attributed baseline and decision

Actual hosted run 38198497690 on immutable 40a3e279d551719416eb750974fe30d011d6a37a completed register and activate on Node 24.21.0 and 26.11.1. Each observed one original signal/deadline context,16 matching admissions,zero other calls,32 actual legacy C1 opens and actual metadata-worker exit. Private heap identity and deadline values were never published. The observer changed no candidate source, stock script, command arguments, signal or budget; its pause cost remained in the original clock.

The existing b58e95f per-admission retention normalizes those16admissions to16acquisitions. A successful scope projects16→1,93.75% fewer acquisitions and2(16−1)=30fewer stock root-query starts. This satisfies the conditional ≥75%/≥20-start count gate (the binding threshold is N≥11). It does not measure Windows completion or admit the Windows worker.

First implement an isolated diagnostic prototype. Compare scoped/unscoped behaviour on the same immutable diagnostic candidate and identical16-call sequence. Keep the original failing40a3 candidate untouched. If the prototype does not observe16→1 genuine descriptors while preserving32 fresh snapshots, source/generation controls and actual closure, stop adoption and retain failed results. No prototype output is positive installed authority.

## Review focus

1. An unawaited borrower can outlive the callback; completion must track and settle or retain it, with no successful return while its guard is unresolved.
2. Selection changes after actual primary writes; final scope failure must preserve committed receipt/state and report uncertainty without pretending the effect failed or retrying it.
3. Same signal with changed deadline, sibling contexts and inherited post-close continuations; only exact matching independent scope keys may borrow.
4. The first portable system can retain a guard when post-open principal validation fails; its explicit cleanup handle must remain reachable.
5. Windows SID changes with uid=-1 and a stable path; a fresh principal mismatch must refuse, not reuse a directory merely because its name agrees.

## Task 1: Private scope manager and isolated diagnostic prototype

**Files:** Create `src/config/selection-read-scope.mjs`, `test/unit/selection-read-scope.test.mjs` and `test/helpers/selection-read-scope-fixture.mjs`.

**Interfaces:**

- `createSelectionReadScope({ finalize })` constructs an internal manager. Ports are instance-local. It produces no provider/source membership.
- `run(context, callback)` validates the original context, opens its private registry entry and runs `callback(effectSink)`. The sink records private monotone effect state; no serializable observation is an authority grant.
- `use(context, tuple, acquire, operation)` returns `{ borrowed, value }`. The caller is the only identity source: it derives a fresh tuple through its current account/system checks, then use copies and compares that tuple. The first borrower binds it. acquire(context, tuple) is an asynchronous closure bound to that current portable system and returns the genuine guard; it is called only for the first matching borrower. An eligible exact-context borrow runs operation(guard) in bounded FIFO. Nonmatching/unscoped/closed-clean contexts return `{ borrowed: false }`; the caller runs its existing one-shot path.
- `assertRegistrationAllowed()` refuses registration/update/dry-run while any open/closing/uncertain entry exists.
- `retryCleanup()` retries only actual retained acquisition/guard cleanup, and retains poisoned tombstones. If acquire throws with an attached retryCleanup function, retain that exact error/function/owning system; manager retryCleanup invokes it. A post-open check failure whose close succeeded has no retained handle and must not create an invented cleanup obligation.
- `noteWitness(context, witness)` records the private last genuine snapshot/inventory for a successful participating admission. finalize(context, copiedTuple, witness) is synchronous, called only after tracked reads have quiesced and the guard has actually closed, before clean return. It never runs as a substitute for unresolved close, and does not turn poisoned or uncertain entries into success. It checks source/snapshot/context integrity; a failure becomes truthful completion uncertainty.
- `effectSink.possible()` changes none→unknown before the first mutating call. `effectSink.committed(receipt, result)` changes unknown→committed only after actual read-back. Repeated possible in unknown and committed in committed are idempotent only for the same actual receipt/result; a backward transition or different committed receipt refuses. Nothing moves backward. Private receipt/result recovery evidence is not public collateral.

- [ ] **Step 1: Write the manager's actual missing-API RED and closed-lifetime tests.**

Use explicit unverified fixture ports with ports={finalize}; define acquire separately; initialize `opens=0`, `closes=0`, `freshReads=0`, a genuine AbortController and deadline performance.now()+30000. `acquire` increments opens and returns a fixture guard whose read increments freshReads and whose close increments closes. The fixture caller derives copied `{directory:'fixture',home:'fixture',uid:0,principal:'fixture'}`; its ports never enter production membership.

```js
assert.equal(typeof createSelectionReadScope, 'function');
const manager = createSelectionReadScope(ports);
await manager.run(context, async () => {
  for (let n = 0; n < 16; n++) {
    const result = await manager.use(context, tuple, acquire, (guard) => guard.read());
    assert.equal(result.borrowed, true);
  }
});
assert.equal(opens, 1);
assert.equal(freshReads, 16);
assert.equal(closes, 1);
assert.equal((await manager.use(context, tuple, acquire, () => {})).borrowed, false);
```

Run `node --test test/unit/selection-read-scope.test.mjs`.
Expected: missing createSelectionReadScope assertion fails; after implementation all controls pass.

- [ ] **Step 2: Pin rejection and concurrency controls before their implementations.**

Create distinct actual signals with equal deadlines, and the same signal with distinct deadlines. Assert no borrowed guard for mismatches. Check long deadline, lexical nesting, same-key re-entry, FIFO order,65th pending borrower,65th live entry and a copied tuple with changed home/uid/principal. Spawn sibling runs under separate Promise branches and prove their independent guards. Register a listener inside the scope, fire it after closure and have it enter run: require intentional lexical nested-entry refusal. Also schedule an inherited continuation after run completion with the same assertion. Keep tombstones outside the live-entry Set count.

```js
await assert.rejects(manager.run({ ...context, deadline: performance.now() + 30001 }, callback));
await manager.run(context, async () => {
  assert.equal(
    (await manager.use({ ...context, signal: otherSignal }, tuple, acquire, read)).borrowed,
    false
  );
  await assert.rejects(manager.run(otherContext, callback));
});
```

Run the same targeted command after each control.
Expected: each newly introduced missing branch is RED before implementation, then GREEN.

- [ ] **Step 3: Implement the private registry, queue and cleanup.**

Use per-manager AsyncLocalStorage, a WeakMap(signal→Map(deadline→entry)) and a Set of live entries. Entry states are open/closing/closed-clean/poisoned/uncertain. Register every participating call synchronously before acquisition or queue waits. Store one initialization promise and a copy of the first caller-derived fresh identity tuple; no identity port or second source exists. Compare all tuple fields freshly before borrowing. FIFO waiting consumes the original deadline; abort/expiry checks reject queued calls. A failed call poisons its key and prevents further borrowing/reopen/retry.

Scope completion first marks closing and rejects new borrowing, then establishes quiescence under the original deadline. It closes the one actual guard, removes its live entry, then invokes the final synchronous integrity port. On pending/acquisition/close uncertainty retain the entry and cleanup handle. After successful cleanup preserve a poisoned tombstone. Independent siblings remain allowed while healthy; new entry refuses when an older uncertain obligation remains. Never abort an externally owned signal or reset a deadline.

- [ ] **Step 4: Add unawaited, failed-open, failed-close and post-effect RED/GREEN controls.**

Use deferred fixture promises. Model the exact real acquisition case: post-open principal check fails AND the guard close also fails, so the error carries its owning system's reachable retryCleanup handle. Also test post-open check failure with successful close and no attached handle; retain no invented obligation. Assert the callback cannot return successful completion before tracked reads settle. An expiry while a read remains pending retains uncertainty. A close that fails once leaves the actual fixture guard reachable; cleanup closes it but old-context borrowing still refuses. Capture the internal outcome as none for dry-run/no-op/pre-effect failure, unknown before mutation, committed only after read-back. A finalizer failure must retain the committed private receipt/result and expose only bounded public outcome categories. Never replace the original callback exception or roll back.

Run `node --test test/unit/selection-read-scope.test.mjs`.
Expected: all controls pass, no production membership is created, public diagnostic serialization contains no fixture paths, bytes, handles or raw exception text.

- [ ] **Step 5: Build a real-C1 isolated prototype and count its actual descriptors.**

The helper uses runtimeFixture(t) for owned files and the actual C1 provision/observe/open interfaces, with no production singleton substitution or fake C1 permission. It does not call the not-yet-added store.withReadScope. First provision the owned directory, create its bounded selection file through a genuine guard, and close setup. For the unscoped path acquire/read-twice/verify/close on each of16iterations; for the scoped path use this task's manager with the same genuine acquisition and read-twice callback. Run both paths against the same sealed diagnostic source. Tap genuine FileHandles as in runtime-selection-guard-lifetime.test.mjs; count opens, separate fresh snapshots and actually closed descriptors. Bind original context identity; exclude every uncertain call. This prototype remains unverified.

Expected unit-level before/after:16→1 acquisitions and32 fresh snapshots both paths, with no skipped permissions or changed budgets. This loop tests manager mechanics only; it is NOT the real-operation adoption gate. Any unit mismatch stops further work.

- [ ] **Step 6: Verify and commit the isolated prototype.**

Run targeted manager tests, `node --test test/unit/runtime-selection-guard-lifetime.test.mjs test/unit/runtime-selection.test.mjs`, and format/lint for changed files. No host full suite. Commit `[#190] Add bounded private selection read scopes` and native commit-trace 190. Record prototype result and any ruling in this plan's ledger; do not report installed recovery.

## Task 2: Bind scopes to the existing selection store

**Files:** Modify `src/config/runtime-selection-core.mjs`, `src/config/runtime-selection.mjs`, `src/protocol/process-source-contract-files.json` (the new reachable manager makes this update certain); extend `test/unit/runtime-selection-guard-lifetime.test.mjs` and `test/unit/portable-authority-fences.test.mjs`.

**Interfaces:** Store adds `withReadScope(context, callback)` backed by Task1's manager. Singleton wrapper exports internal `withSelectionReadScope`. Scope-aware `withStore` borrows only for read/assertSelected; existing register paths remain one-shot and are refused while scope state prohibits writes. `location()` is unchanged.

- [ ] **Step 1: Write real descriptor-sharing RED.**

```js
const original = context();
await store.withReadScope(original, async () => {
  for (let n = 0; n < 16; n++) await store.assertSelected(original);
});
assert.equal(records.length, 1);
assert.equal(
  records.every((record) => record.closed),
  true
);
```

`records` is the genuine C1 tap from the existing lifetime tests; preserve the existing separately bounded admission tests. Run `node --test test/unit/runtime-selection-guard-lifetime.test.mjs`.
Expected: missing withReadScope or too many genuine descriptors before implementation.

- [ ] **Step 2: Wire fresh identity/acquisition and after-close integrity.**

Each call keeps ordinary `operation`, fresh `accountContext` and component checks. Obtain a freshly checked `op.system.userId()` and compare `{directory,home,uid,principal}`. Only then call manager.use(context, tuple, currentAcquisitionClosure, callback). A borrowed withStore runs the existing callback, then guard.verify and the original-context check on successful callback completion, exactly as the existing withStore. A failed callback is preserved and poisons the entry without a further read/verify retry; no post-poison query authority is created. It never closes the shared guard, either on success or failure; use poisons the entry on failure, and scope completion owns close/quiescence. Unborrowed calls keep the existing open/verify/check/close path. Store.retryCleanup first discharges its existing one-shot obligations, then awaits manager.retryCleanup, retaining failures and poisoning. Add a test that scope guard and acquisition obligations are reachable through that exported store method. The first acquisition uses existing protectedStore. A retained acquisition error keeps its actual system retryCleanup handle. Both existing snapshots and explicit verify calls remain; no decoded bytes/current observation are reused.

Privately record the last genuine selected snapshot and installed inventory for successful calls. After final scope closure run `assertProtectedSnapshotUnchanged` and a fresh synchronous installed inventory/source check, then the original-context check, with no later awaited gap. Scope output cannot create installed source/provider membership. A real registration attempt calls assertRegistrationAllowed before any filesystem write or process-generation reseal.

- [ ] **Step 3: Pin all current race controls and new scope controls.**

Test byte changes, same-byte inode replacement, ancestor link/root replacement, late account lookup, POSIX principal and Windows SID changes, aborted/expired context, final-close selection/inventory replacement and register/dry-run/update during an active/uncertain scope. Use actual owned files and C1 where supported; explicitly unverified ports handle unsupported fault injection. Preserve old immutable baseline cases unchanged.

Run `node --test test/unit/runtime-selection-guard-lifetime.test.mjs test/unit/runtime-selection.test.mjs test/unit/portable-authority-fences.test.mjs test/integration/runtime-selection.test.mjs`.
Expected: all affected controls pass; actual descriptor closure on every successful scope, retained obligation on uncertainty.

- [ ] **Step 4: Derive the complete producer closure and commit.**

Run node scripts/generate-process-source-contract.mjs to derive the closure including the new reachable src/config/selection-read-scope.mjs, then node scripts/generate-process-source-contract.mjs --check. Both must pass. The declared file list must change; no hand-edited omission is allowed. Old classes become historical automatically by changed bytes; never edit them to appear current. Run source conformance/assurance affected controls, formatting/lint, commit `[#190] Bind scoped selection reads to genuine store guards`, native commit-trace 190.

## Task 3: Primary boundaries and truthful effects

**Files:** Modify `src/config/primary-operations.mjs` and `src/config/primary-maintenance.mjs`; extend `test/unit/primary-operation-core.test.mjs` (create if absent) and existing primary maintenance/integration tests.

**Interfaces:** Production passes `selectionScope: withSelectionReadScope`. Production factory requires the function; core fixtures may intentionally omit it and remain unscoped. `guarded` enters scope after original context construction and before admit(original); only register/activate are wrapped. Pass the internal effect sink by positional producer parameter, never caller JSON. History maintenance stays outside.

- [ ] **Step 1: RED integration order and missing-port controls.**

Inject a deliberately unverified trace port in core fixtures:

```js
const selectionScope = async (original, callback) => {
  trace.push('scope-enter');
  try {
    return await callback(effectSink);
  } finally {
    trace.push('scope-close');
  }
};
assert.deepEqual(trace.slice(0, 2), ['scope-enter', 'admit']);
```

Record real original signal/deadline identity across all admits. Missing production port refuses; absent core fixture port does not create production scope membership. History methods never enter the port. Run only the affected primary core tests.

- [ ] **Step 2: Preserve mutation and outcome order.**

Thread the sink to writeRecord without changing existing pre-effect assertAdmission checks. The effect sink describes PRIMARY receipt/activation writes only. Protected registration/admission-root provisioning and temporary election infrastructure are separately observed infrastructure, not a primary committed-record effect. Privately retain actual infrastructure state/obligations, and publish a bounded infrastructure-may-exist category on uncertain completion; never imply that no primary effect means no infrastructure was created. Add a real control where registration root provisioning completes and a pre-receipt failure follows: primary effect none, infrastructure actually exists, no rollback/automatic retry. Call possible immediately before receipt writeExclusive, so any partial effect is unknown. Call committed only after activation bytes are actually read back and compared, passing the actual receipt/result privately. No-op early return, dry-run and pre-mutation failures leave none. Preserve callback failure and primary withdrawal order. Scope post-effect failure reports committed/unknown/no-effect plus uncertain completion, not rollback/retry.

- [ ] **Step 3: RED/GREEN actual effect races.**

Change selection or source after an actual owned primary write but before scope close. Assert the actual activation/receipt persists and outcome is committed/uncertain. Inject failure after the receipt write but before activation read-back: outcome unknown/uncertain, not none. Cover unchanged-register no-op, dry-run and pre-write failure. Observe closure or retained actual obligation and exclude raw private paths/bytes from published reports.

- [ ] **Step 4: Run the real-operation adoption gate before keeping integration.**

Freeze ONE immutable diagnostic candidate containing the prospective manager/store/integration and derive its exact source closure. It must have genuine current process-source capture and separate normal class acceptance before real original-process admission can succeed; no old class, fake permission or source-unavailable exemption is permitted. This is unmerged diagnostic branch work, not production adoption. Preserve the original40a3 failing candidate and its inputs unchanged.

Create test/helpers/selection-scope-operation-ci.mjs and a dedicated hosted comparison workflow. The diagnostic frontend selects ONLY the existing internal selectionScope port on createPrimaryMaintenanceCore: omitted for unscoped, actual singleton.withSelectionReadScope for scoped. ALL other ports are the genuine installed assertSelectedRuntime and withPrimaryAdmissionFence/assertPrimaryAdmissionFence, and both modes invoke the actual register/activate methods on fresh owned projects. There is no replacement account, principal, filesystem, process identity or class. The same frozen diagnostic frontend command and default original30s budget run in both modes; no package CLI feature flag or loader/source/API rewrite is introduced. Its source/ports/mode are pinned public diagnostic provenance, and it grants no installed authority.

The observer uses the actual original context, attributes every store admission, and independently counts genuine acquisitions,32 fresh snapshots and descriptor exit. On Node24 and26 require16 matching admissions, unscoped16 vs scoped1 acquisitions (post-b58), identical fresh observation/counter coverage, zero unexplained/mismatching/one-shot admissions, current source membership and actual closure. Every unmatched call must be explicitly attributed and prevents the expected16→1 keep decision. If the real baseline differs, stop and obtain a new source-grounded count decision; do not tune the loop or threshold around it.

Any mismatch, unavailable class/metadata, renewed context or uncertain cleanup **discards adoption of the integration** and retains all failed results. Keep prospective code on the unmerged diagnostic branch for analysis only; do not promote Task5/class ledger/production release or claim completion from the synthetic loop. Only a passing real-operation comparison permits keeping this integration toward later actual installed proof. Original ordinary CLI behaviour is also verified separately; diagnostic frontend results do not replace it.

- [ ] **Step 5: Verify primary behaviour and commit after the adoption gate.**

Run the current primary core/maintenance tests and affected portable authority fences. Format/lint, commit `[#190] Scope primary admissions with truthful post-effect outcomes`, native commit-trace 190. Push and run complete hosted CI; download exact-head receipts. Do not run full suites on the host.

## Ledger and execution authority

Use this plan's isolated ledger at .superpowers/sdd/2026-10-11-190-selection-read-scope/progress.md, with its first line naming this exact plan. Record each task's base/head, actual RED/GREEN commands, prototype/adoption inputs, results and rulings there. Keep the parent171 Task5 ledger as a pointer; do not overwrite another plan's ledger. Root executes inline after normal plan acceptance under the existing user authorization. No manual or repeated execution-method confirmation is requested.

## Final boundary and remaining Task5 work

Fresh whole-child review must assess the complete Task5 branch and rulings, not just these scope tasks. Compare final-source actual acquisition counts and retain failed/unknown outcomes. Even successful scoped retention does not complete #190: complete Windows prediction with margin/cleanup, any admitted worker's actual framing/parent-loss/exit tests, final source recapture and separate finite class approval, fresh OS installed/start/crash/original-PID absence/reclaim/manual/cleanup, exact full hosted receipts and native lifecycle delivery remain required. Then continue191→171→141→107 children. No automatic permission or positive class membership is inferred from this plan.
