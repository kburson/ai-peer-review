<!-- ai-peer-review-template version="1" digest="sha256:78e9a634af9d540baaf6790db82952eaf39cf7ab59a6cdc7938319ae07a4cbed" -->

<!-- protected-frontmatter -->

---
schema: "ai-peer-review.response/v1"
review_id: "review-d6f023926c73861846a0874adc640aae"
role: "reviewer"
turn: 1
commit_mode: "normal"
authority_assurance: "unavailable"
artifact_path: "docs/superpowers/plans/2026-10-11-190-selection-read-scope.md"
artifact_commit: "d940f64d30648161ac0b91c71b7c63c66910d823"
artifact_blob: "5d6b824c0d9f78de308edbd991ba16f325d64e7d"
artifact_digest: "sha256:3000832b456e42d534eb45d3347a3c54a536237bdf3e866077f0fcb2f77224e8"
agent:
  host: "claude-code"
  provider: "anthropic"
  model_id: "claude-opus-5-5"
  model_display: "claude-opus-5-5"
  session_fingerprint: "sha256:85adb2d848d9ea60a54d199ebc5c0b1ed30c31c66c4e9498eda226806afe2d20"
  identity_source: "runtime"
started_at: "2026-10-12T03:18:02.243Z"
submitted_at: "2026-10-12T03:21:22.825Z"
finding_ids: []
answered_finding_ids: []
acknowledged_supplement_ids: []
---

Mode: `normal`

## Summary

I independently reviewed `docs/superpowers/plans/2026-10-11-190-selection-read-scope.md` at artifact commit `d940f64`. I checked it against its accepted spec `docs/superpowers/specs/2026-10-11-190-selection-read-scope-design.md` and against the current source:

- `src/config/runtime-selection-core.mjs`: `operation`, `accountContext` (L123–158), `protectedStore`/`close`/`withStore` (L186–232), `register` (L315–417), `assertSelected` (L418–519) and the store `retryCleanup` (L525–530);
- `src/config/runtime-selection.mjs` (the singleton store) and `src/config/primary-operations.mjs` (production `admit: assertSelectedRuntime`);
- `src/config/primary-maintenance.mjs`: `withRegistrationStore` (L119–145), `writeRecord` (L146–182), `activate`/`register`, and `guarded` (L325–338);
- `src/config/primary-admission.mjs`: `context()` (L20–30), `assertPrimaryAdmissionFence` (L31–45) and `withPrimaryAdmissionFence` (L77–154);
- `src/broker/portable-system.mjs`: `userId()` (L367–370), the principal `check()` (L119) and `openProtectedRoot`'s post-open failure path (L381–401);
- `src/protocol/process-source-contract-files.json`, `scripts/generate-process-source-contract.mjs` and `test/unit/runtime-selection-guard-lifetime.test.mjs`.

What the plan gets right:

- **The scope key survives the existing path.** `withPrimaryAdmissionFence` re-freezes the context, but it keeps the same `AbortSignal` object and the same deadline number (primary-admission L20–30). It also refuses a changed context (L37). So every admission inside `guarded` can match on exact signal identity plus exact deadline.
- **The principal comparison is genuinely fresh.** Each call builds a new portable system, and `userId()` runs `check()`, which re-observes the principal against that system's original value (portable-system L119, L367–370). Task 2 Step 2 adds this comparison on win32, where `accountContext` does not call `userId()` today (runtime-selection-core L145–146). That closes review focus 5.
- **The arithmetic is correct.** (N−1)/N ≥ 75% needs N ≥ 4, and 2(N−1) ≥ 20 needs N ≥ 11, so N ≥ 11 binds. With N = 16 the plan gets 93.75% and 30 fewer starts.
- **The order matches the spec.** Scope entry comes before `admit(original)`, only `register`/`activate` are wrapped, and history maintenance stays outside. The plan keeps both fresh snapshots and the explicit verifies, adds no cache, and refuses registration during live or uncertain scopes. `possible()` is placed just before the receipt write, and `committed` comes only after read-back. The post-effect wording (committed/unknown/no-effect plus uncertain completion) is truthful.
- **The TDD structure is concrete.** Each task gives commands, expected RED/GREEN results and genuine C1 descriptor taps.

The direction is sound. But the gate that decides adoption does not measure what the spec asks it to measure. Several interfaces that Task 2 depends on are also still ambiguous. Finding 1 is the main one.

Verification limits: this session could run only the two prescribed peer-review commands. I did not run tests or inspect hosted run 38198497690. My review is based on reading the source at the artifact commit.

## Findings

1. **The prototype adoption gate is synthetic, so it cannot fail in the way the spec cares about.** The spec says (Implementation admission) that "a diagnostic scoped prototype must then compare before/after counts on that same immutable diagnostic candidate **and operation**". Task 1 Step 5 instead runs a hand-written 16-iteration acquire/read-twice loop through the manager. That loop puts all 16 calls inside one scope with one context, so 16→1 holds by construction. It cannot detect the risks that matter in the real operation:
   - an admission inside `register`/`activate`, or in a process-source or election check, that carries a different or rebuilt context and so goes one-shot;
   - an admission that falls outside the scope's lexical window, for example before `guarded` or after withdrawal;
   - an admission that arrives during closing and is refused.

   No later task has a measured stop rule on the actual operation. Task 3 Step 4 runs tests and hosted CI. "Compare final-source actual acquisition counts" appears only in the final-boundary paragraph, after production wiring has been committed, and has no threshold or discard rule. So the plan can adopt production scoping without ever showing that the real register/activate reaches 16 → 1.

2. **The manager's port contracts are ambiguous, and two of them give the identity tuple from different sources.** `createSelectionReadScope({ acquire, identity, finalize, cleanupAcquisition })` takes an `identity` port, and `use(context, identity, operation)` also takes a caller-supplied identity. The spec requires every borrower to derive the tuple freshly from its own account and portable-system checks. The plan does not say:
   - which of the two is compared with the bound tuple;
   - when the `identity` port is called, if at all;
   - whether the caller's tuple binds on first use.

   The other ports are also undefined:
   - `finalize`: its arguments, whether it is synchronous, and whether it runs for poisoned or uncertain scopes;
   - `cleanupAcquisition`: its relation to the acquisition error's `retryCleanup` (portable-system L396) and to the manager's own `retryCleanup()`.

   Task 1 tests are written against these signatures, and Task 2 binds production to them. Implementers would have to invent the contracts.

3. **Task 2 does not say how `withStore` behaves when it borrows, or who owns the store's cleanup.** Today `withStore` (L208–232) opens the guard, runs the callback, calls `guard.verify()` and `check()`, then closes the guard, or calls `close(guard, error)` on failure. Close failures go to the store's `pendingCleanup` (L196–207). The plan says only that "scope-aware `withStore` borrows". It does not state:
   - that a borrowed call still runs its post-callback `verify()`/`check()`;
   - that a borrowed call never closes the scope's guard on success **or failure**; instead a failure poisons the key, and the scope closes the guard at completion, or immediately if that is intended;
   - how a failed borrowed call's error relates to the poisoning.

   The spec also says "the store's `pendingCleanup`/`retryCleanup` owns all scope obligations". Task 1 gives the manager its own `retryCleanup()`, but Task 2 never wires the store's exported `retryCleanup` (L525–530) to discharge manager obligations. It also has no test that a retained scope guard or acquisition obligation can be reached through `store.retryCleanup()`. As planned, there would be two cleanup owners, and only one of them is reachable through the existing store API.

4. **The effect sink does not classify protected-root provisioning in `writeRecord`.** `possible()` runs "immediately before receipt `writeExclusive`". But `writeRecord` → `withRegistrationStore(location, context, true, …)` may first call `provisionProtectedRoot` for the registration root (primary-maintenance L122–132). That durable directory creation happens while the outcome is still `none`. If the call later fails before the receipt write, it reports "no effect committed", even though a protected root now exists. That outcome may be intended: provisioning is infrastructure, like admission-root provisioning in `withPrimaryAdmissionFence` L96–99. But the plan should say so, and it needs a control that pins the classification. Otherwise a reader can call the report untruthful.

5. **The process-source closure update is written as conditional, but it is certain.** `src/config/runtime-selection-core.mjs` is already in `process-source-contract-files.json`. Task 2 makes it import `src/config/selection-read-scope.mjs`, so the derived closure will change. "Only if mechanically derived reachability changes" suggests that the change may not happen. The plan also does not name the generator: `node scripts/generate-process-source-contract.mjs`, with `--check` as the conformance gate. This matters because the changed closure bytes are what make the old classes historical and require new capture and class acceptance (Global constraints, last bullet).

6. **Smaller gaps in the executable detail:**
   - (a) Task 2 Step 1's snippet passes `context` as a value. In `runtime-selection-guard-lifetime.test.mjs`, `context` is a factory (L57–60) that returns a fresh signal on each call. The test must bind one `const original = context()` and pass that same object to `withReadScope` and to every `assertSelected`. Otherwise the test is RED for the wrong reason, or it passes vacuously.
   - (b) Task 1 Step 6 says "record prototype result and any ruling in this plan's ledger", but the plan has no ledger section.
   - (c) Task 1 Step 4 says "an acquisition error carrying a reachable `retryCleanup` handle". The real portable system attaches `retryCleanup` only when the post-open `check()` fails **and** the guard's close also fails (L388–397). The fixture should model that exact condition, plus the case where the close succeeds and no handle is attached, so the control matches production.

## Required changes

1. **Add a real-operation adoption gate (Finding 1).** Before or as part of Task 3, run the existing attributed observer on the actual primary `register` and `activate`, unscoped and scoped, on the same immutable diagnostic candidate, with the original commands and budgets, on Node 24 and Node 26. Require the same 16 matching admissions with one genuine selection acquisition per operation, 32 fresh snapshots, actual descriptor closure and no other changed counters. Every unmatched or one-shot admission must be attributed. State the stop rule: any mismatch discards the integration and retains the failed results. Keep the Task 1 synthetic loop only as a unit-level check, not as the adoption gate.
2. **Define the manager port contracts (Finding 2).** Give one identity source: either the caller passes its freshly derived tuple to `use`, or the `identity` port derives it per call, but not both. Say how the first borrower binds the tuple. Give `finalize` and `cleanupAcquisition` signatures, timing (synchronous or not), and the states in which they run.
3. **Specify borrowed `withStore` semantics and a single cleanup owner (Finding 3).** State that per-call verify/check still runs, that borrowed calls never close the shared guard, and how a failure poisons the key and when the guard is closed. Make the store's exported `retryCleanup` discharge scope obligations, and add a control that a retained scope guard or acquisition obligation is reachable through `store.retryCleanup()` and that poisoning remains.
4. **Classify registration-root provisioning in the effect outcome (Finding 4).** Either call `possible()` before a provisioning `withRegistrationStore`, or state that provisioning is non-effect infrastructure. In both cases, add the matching control.
5. **Make the closure update unconditional and name the command (Finding 5).** Use `node scripts/generate-process-source-contract.mjs`, then the `--check` mode, as the conformance gate in Task 2 Step 4.
6. **Fix the executable details (Finding 6).** Bind one original context in the Task 2 RED snippet. Add the ledger section, or point to where results are recorded. Model the acquisition-error fixture on the real `openProtectedRoot` condition.

## Optional suggestions

1. **Say that `possible()`/`committed()` are idempotent within each state.** `writeRecord` runs once per operation today, but stating that a repeated call in the same state is a no-op, and that a backward call throws, would make the "nothing moves backward" rule testable.
2. **Explain the ALS inheritance consequence.** AsyncLocalStorage propagates into any long-lived resource first created inside a scope, such as lease timers or listeners. The plan already says later entry from inherited continuations is refused. A Task 1 control that pins "listener registered inside scope, fired after closure, tries `run` → refused" would document this and not leave it to be discovered later.
3. **Typography.** Numbers and identifiers often run into adjacent words: "run38198497690", "immutable40a3e…", "Node24.21.0 and26.11.1", "16matching", "Windows query15000ms", "commit-trace190". Adding spaces would make the evidence easier to audit.

## Decision

revisions-requested
