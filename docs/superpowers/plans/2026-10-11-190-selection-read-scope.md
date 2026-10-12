# #190 selection read scope implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Root implements inline under the user's existing authorization; no implementer delegation.

**Goal:** Retain one selection-store descriptor across one original primary operation while observing every current permission, account, generation and installed source afresh.

**Architecture:** A private scope manager owns context-keyed state and a single genuine C1 guard. The existing selection store supplies acquisition, fresh identity and final integrity ports. Primary maintenance supplies the existing original operation boundary and truthful effect-progress reporting; a scope result provides no new authority.

**Tech Stack:** Node 24/26, AsyncLocalStorage, AbortSignal, monotonic performance clock, existing portable C1/C2 interfaces and native peer-review/AITM workflows.

**Spec:** `docs/superpowers/specs/2026-10-11-190-selection-read-scope-design.md`, normal accepted review5c332d239bdb1535dd319816d3228888, native finalization b4741ce.

## Global constraints

- The original actual signal and exact deadline remain unchanged; strictly future, at most 30000 ms away at scope entry. Longer deadlines refuse, never clamp.
- No permission/principal/bytes/current-source observation cache, injected clock, caller root/receipt/script or production authority from scope data.
- FIFO maximum 64 pending borrowers and maximum 64 live open/closing/uncertain entries per store. Tombstones do not count; no FinalizationRegistry is required.
- A failure poisons that context permanently. Actual cleanup discharges resources only and cannot reopen/retry/revive it.
- Lexically inherited async continuations remain nested even after closure; later entry from them is intentionally refused.
- Scope code implements no resident PowerShell worker. Windows query15000ms, operation30000ms, portable5000ms and test800000ms remain unchanged.
- Native CI builds stay disabled. Host TIA only; complete suites use exact-head hosted receipts. Linux manual review remains excluded only.
- Preserve historical review/class bytes; changed producer closure requires new normal capture/class acceptance before actual installed claims.

## Attributed baseline and decision

Actual hosted run38198497690 on immutable40a3e279d551719416eb750974fe30d011d6a37a completed register and activate on Node24.21.0 and26.11.1. Each observed one original signal/deadline context,16matching admissions,zero other calls,32actual legacy C1 opens and actual metadata-worker exit. Private heap identity and deadline values were never published. The observer changed no candidate source, stock script, command arguments, signal or budget; its pause cost remained in the original clock.

The existing b58e95f per-admission retention normalizes those16admissions to16acquisitions. A successful scope projects16→1,93.75% fewer acquisitions and2(16−1)=30fewer stock root-query starts. This satisfies the conditional ≥75%/≥20-start count gate (the binding threshold is N≥11). It does not measure Windows completion or admit the Windows worker.

First implement an isolated diagnostic prototype. Compare scoped/unscoped behaviour on the same immutable diagnostic candidate and identical16-call sequence. Keep the original failing40a3 candidate untouched. If the prototype does not observe16→1 genuine descriptors while preserving32fresh snapshots, source/generation controls and actual closure, stop adoption and retain failed results. No prototype output is positive installed authority.

## Review focus

1. An unawaited borrower can outlive the callback; completion must track and settle or retain it, with no successful return while its guard is unresolved.
2. Selection changes after actual primary writes; final scope failure must preserve committed receipt/state and report uncertainty without pretending the effect failed or retrying it.
3. Same signal with changed deadline, sibling contexts and inherited post-close continuations; only exact matching independent scope keys may borrow.
4. The first portable system can retain a guard when post-open principal validation fails; its explicit cleanup handle must remain reachable.
5. Windows SID changes with uid=-1 and a stable path; a fresh principal mismatch must refuse, not reuse a directory merely because its name agrees.

## Task 1: Private scope manager and isolated diagnostic prototype

**Files:** Create `src/config/selection-read-scope.mjs`, `test/unit/selection-read-scope.test.mjs` and `test/helpers/selection-read-scope-fixture.mjs`.

**Interfaces:**

- `createSelectionReadScope({ acquire, identity, finalize, cleanupAcquisition })` constructs an internal manager. Ports are instance-local. It produces no provider/source membership.
- `run(context, callback)` validates the original context, opens its private registry entry and runs `callback(effectSink)`. The sink records private monotone effect state; no serializable observation is an authority grant.
- `use(context, identity, operation)` returns `{ borrowed, value }`. An eligible exact-context borrow runs `operation(guard)` in bounded FIFO. Nonmatching/unscoped/closed-clean contexts return `{ borrowed: false }`; the caller runs its existing one-shot path.
- `assertRegistrationAllowed()` refuses registration/update/dry-run while any open/closing/uncertain entry exists.
- `retryCleanup()` retries only actual retained acquisition/guard cleanup, and retains poisoned tombstones.
- `effectSink.possible()` changes none→unknown before the first mutating call. `effectSink.committed(receipt, result)` changes unknown→committed only after actual read-back. Nothing moves backward. Private receipt/result recovery evidence is not public collateral.

- [ ] **Step 1: Write the manager's actual missing-API RED and closed-lifetime tests.**

Use explicit unverified fixture ports; initialize `opens=0`, `closes=0`, `freshReads=0`, a genuine AbortController and deadline performance.now()+30000. `acquire` increments opens and returns a fixture guard whose read increments freshReads and whose close increments closes. The fixture identity returns copied `{directory:'fixture',home:'fixture',uid:0,principal:'fixture'}`; its ports never enter production membership.

```js
assert.equal(typeof createSelectionReadScope, 'function');
const manager = createSelectionReadScope(ports);
await manager.run(context, async () => {
  for (let n = 0; n < 16; n++) {
    const result = await manager.use(context, tuple, (guard) => guard.read());
    assert.equal(result.borrowed, true);
  }
});
assert.equal(opens, 1);
assert.equal(freshReads, 16);
assert.equal(closes, 1);
assert.equal((await manager.use(context, tuple, () => {})).borrowed, false);
```

Run `node --test test/unit/selection-read-scope.test.mjs`.
Expected: missing createSelectionReadScope assertion fails; after implementation all controls pass.

- [ ] **Step 2: Pin rejection and concurrency controls before their implementations.**

Create distinct actual signals with equal deadlines, and the same signal with distinct deadlines. Assert no borrowed guard for mismatches. Check long deadline, lexical nesting, same-key re-entry, FIFO order,65th pending borrower,65th live entry and a copied tuple with changed home/uid/principal. Spawn sibling runs under separate Promise branches and prove their independent guards. Schedule an inherited continuation after run completion and require nested-entry refusal. Keep tombstones outside the live-entry Set count.

```js
await assert.rejects(manager.run({ ...context, deadline: performance.now() + 30001 }, callback));
await manager.run(context, async () => {
  assert.equal(
    (await manager.use({ ...context, signal: otherSignal }, tuple, read)).borrowed,
    false
  );
  await assert.rejects(manager.run(otherContext, callback));
});
```

Run the same targeted command after each control.
Expected: each newly introduced missing branch is RED before implementation, then GREEN.

- [ ] **Step 3: Implement the private registry, queue and cleanup.**

Use per-manager AsyncLocalStorage, a WeakMap(signal→Map(deadline→entry)) and a Set of live entries. Entry states are open/closing/closed-clean/poisoned/uncertain. Register every participating call synchronously before acquisition or queue waits. Store one initialization promise and copied identity tuple. Compare all tuple fields freshly before borrowing. FIFO waiting consumes the original deadline; abort/expiry checks reject queued calls. A failed call poisons its key and prevents further borrowing/reopen/retry.

Scope completion first marks closing and rejects new borrowing, then establishes quiescence under the original deadline. It closes the one actual guard, removes its live entry, then invokes the final synchronous integrity port. On pending/acquisition/close uncertainty retain the entry and cleanup handle. After successful cleanup preserve a poisoned tombstone. Independent siblings remain allowed while healthy; new entry refuses when an older uncertain obligation remains. Never abort an externally owned signal or reset a deadline.

- [ ] **Step 4: Add unawaited, failed-open, failed-close and post-effect RED/GREEN controls.**

Use deferred fixture promises and an acquisition error carrying a reachable `retryCleanup` handle. Assert the callback cannot return successful completion before tracked reads settle. An expiry while a read remains pending retains uncertainty. A close that fails once leaves the actual fixture guard reachable; cleanup closes it but old-context borrowing still refuses. Capture the internal outcome as none for dry-run/no-op/pre-effect failure, unknown before mutation, committed only after read-back. A finalizer failure must retain the committed private receipt/result and expose only bounded public outcome categories. Never replace the original callback exception or roll back.

Run `node --test test/unit/selection-read-scope.test.mjs`.
Expected: all controls pass, no production membership is created, public diagnostic serialization contains no fixture paths, bytes, handles or raw exception text.

- [ ] **Step 5: Build a real-C1 isolated prototype and count its actual descriptors.**

The helper uses runtimeFixture(t) for owned files and the actual C1 provision/observe/open interfaces, with no production singleton substitution or fake C1 permission. It does not call the not-yet-added store.withReadScope. First provision the owned directory, create its bounded selection file through a genuine guard, and close setup. For the unscoped path acquire/read-twice/verify/close on each of16iterations; for the scoped path use this task's manager with the same genuine acquisition and read-twice callback. Run both paths against the same sealed diagnostic source. Tap genuine FileHandles as in runtime-selection-guard-lifetime.test.mjs; count opens, separate fresh snapshots and actually closed descriptors. Bind original context identity; exclude every uncertain call. This prototype remains unverified.

Expected before/after:16→1 acquisitions after the existing per-call optimization,32fresh snapshots both paths, no skipped permissions or changed budgets. Any mismatch blocks adoption.

- [ ] **Step 6: Verify and commit the isolated prototype.**

Run targeted manager tests, `node --test test/unit/runtime-selection-guard-lifetime.test.mjs test/unit/runtime-selection.test.mjs`, and format/lint for changed files. No host full suite. Commit `[#190] Add bounded private selection read scopes` and native commit-trace190. Record prototype result and any ruling in this plan's ledger; do not report installed recovery.

## Task 2: Bind scopes to the existing selection store

**Files:** Modify `src/config/runtime-selection-core.mjs`, `src/config/runtime-selection.mjs`, `src/protocol/process-source-contract-files.json` only if mechanically derived reachability changes; extend `test/unit/runtime-selection-guard-lifetime.test.mjs` and `test/unit/portable-authority-fences.test.mjs`.

**Interfaces:** Store adds `withReadScope(context, callback)` backed by Task1's manager. Singleton wrapper exports internal `withSelectionReadScope`. Scope-aware `withStore` borrows only for read/assertSelected; existing register paths remain one-shot and are refused while scope state prohibits writes. `location()` is unchanged.

- [ ] **Step 1: Write real descriptor-sharing RED.**

```js
await store.withReadScope(context, async () => {
  for (let n = 0; n < 16; n++) await store.assertSelected(context);
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

Each call keeps ordinary `operation`, fresh `accountContext` and component checks. Obtain a freshly checked `op.system.userId()` and compare `{directory,home,uid,principal}`. Only then borrow. The first acquisition uses existing protectedStore. A retained acquisition error keeps its actual system retryCleanup handle. Both existing snapshots and explicit verify calls remain; no decoded bytes/current observation are reused.

Privately record the last genuine selected snapshot and installed inventory for successful calls. After final scope closure run `assertProtectedSnapshotUnchanged` and a fresh synchronous installed inventory/source check, then the original-context check, with no later awaited gap. Scope output cannot create installed source/provider membership. A real registration attempt calls assertRegistrationAllowed before any filesystem write or process-generation reseal.

- [ ] **Step 3: Pin all current race controls and new scope controls.**

Test byte changes, same-byte inode replacement, ancestor link/root replacement, late account lookup, POSIX principal and Windows SID changes, aborted/expired context, final-close selection/inventory replacement and register/dry-run/update during an active/uncertain scope. Use actual owned files and C1 where supported; explicitly unverified ports handle unsupported fault injection. Preserve old immutable baseline cases unchanged.

Run `node --test test/unit/runtime-selection-guard-lifetime.test.mjs test/unit/runtime-selection.test.mjs test/unit/portable-authority-fences.test.mjs test/integration/runtime-selection.test.mjs`.
Expected: all affected controls pass; actual descriptor closure on every successful scope, retained obligation on uncertainty.

- [ ] **Step 4: Derive the complete producer closure and commit.**

Derive process-source reachability mechanically and update the declared file list only for actual new reachable modules. Old classes become historical automatically by changed bytes; never edit them to appear current. Run source conformance/assurance affected controls, formatting/lint, commit `[#190] Bind scoped selection reads to genuine store guards`, native commit-trace190.

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

Thread the sink to writeRecord without changing existing pre-effect assertAdmission checks. Call possible immediately before receipt writeExclusive, so any partial effect is unknown. Call committed only after activation bytes are actually read back and compared, passing the actual receipt/result privately. No-op early return, dry-run and pre-mutation failures leave none. Preserve callback failure and primary withdrawal order. Scope post-effect failure reports committed/unknown/no-effect plus uncertain completion, not rollback/retry.

- [ ] **Step 3: RED/GREEN actual effect races.**

Change selection or source after an actual owned primary write but before scope close. Assert the actual activation/receipt persists and outcome is committed/uncertain. Inject failure after the receipt write but before activation read-back: outcome unknown/uncertain, not none. Cover unchanged-register no-op, dry-run and pre-write failure. Observe closure or retained actual obligation and exclude raw private paths/bytes from published reports.

- [ ] **Step 4: Verify primary behaviour and commit.**

Run the current primary core/maintenance tests and affected portable authority fences. Format/lint, commit `[#190] Scope primary admissions with truthful post-effect outcomes`, native commit-trace190. Push and run complete hosted CI; download exact-head receipts. Do not run full suites on the host.

## Final boundary and remaining Task5 work

Fresh whole-child review must assess the complete Task5 branch and rulings, not just these scope tasks. Compare final-source actual acquisition counts and retain failed/unknown outcomes. Even successful scoped retention does not complete #190: complete Windows prediction with margin/cleanup, any admitted worker's actual framing/parent-loss/exit tests, final source recapture and separate finite class approval, fresh OS installed/start/crash/original-PID absence/reclaim/manual/cleanup, exact full hosted receipts and native lifecycle delivery remain required. Then continue191→171→141→107 children. No automatic permission or positive class membership is inferred from this plan.
