<!-- ai-peer-review-template version="1" digest="sha256:78e9a634af9d540baaf6790db82952eaf39cf7ab59a6cdc7938319ae07a4cbed" -->

<!-- protected-frontmatter -->

---
schema: "ai-peer-review.response/v1"
review_id: "review-5c332d239bdb1535dd319816d3228888"
role: "reviewer"
turn: 1
commit_mode: "normal"
authority_assurance: "unavailable"
artifact_path: "docs/superpowers/specs/2026-10-11-190-selection-read-scope-design.md"
artifact_commit: "ba59707afeb5da730d8f19879f0a54068119ec67"
artifact_blob: "a708dc334fb457e05d826697c049bb80d00d85c4"
artifact_digest: "sha256:fbc61642c772f372c3881a942596fbe6dbc9a166c69fde937f6482e6a3971c30"
agent:
  host: "claude-code"
  provider: "anthropic"
  model_id: "claude-opus-5-5"
  model_display: "claude-opus-5-5"
  session_fingerprint: "sha256:4aa1751fafeeca10ee6b721c7a2bc83321a82bec1a1b883fcec0648e211b5805"
  identity_source: "runtime"
started_at: "2026-10-12T01:58:45.231Z"
submitted_at: "2026-10-12T02:02:44.998Z"
finding_ids: []
answered_finding_ids: []
acknowledged_supplement_ids: []
---

Mode: `normal`

## Summary

I independently reviewed `docs/superpowers/specs/2026-10-11-190-selection-read-scope-design.md`. It proposes an internal, operation-owned selection-store read scope. The scope keeps the one genuine C1 descriptor of the account selection directory open across repeated `assertSelected` admissions that carry the identical original signal and deadline. Today each admission opens and closes its own descriptor. I checked the design against the current working-tree source:

- `src/config/runtime-selection-core.mjs`: `budget`/`check` (L73–86), `operation` (L106–122), `accountContext` (L123–158), `components` (L159–185), `protectedStore`/`close`/`withStore` (L186–232), `register` (L315–417), `assertSelected` (L418–519, including the b58e95f fresh-context re-observation at L477–486) and `retryCleanup` (L525–530);
- `src/config/runtime-selection.mjs`: the module-singleton production store (L6–13);
- `src/config/primary-maintenance.mjs`: `withRegistrationStore` (L119–145), `writeRecord` (L146–182), `activate`/`register` admits (L207, L249, L266, L312) and the `guarded` wrapper (L325–338);
- `src/config/primary-admission.mjs`: `withPrimaryAdmissionFence` (L77–154), including withdrawal in `finally`;
- `src/config/primary-operations.mjs` (production `admit: assertSelectedRuntime`) and `src/config/review-history-maintenance.mjs` (L97–112, its own `admit(original)` wrapper);
- `src/broker/portable-system.mjs`: per-system `originalPrincipal`, `pendingCleanup` and `openProtectedRoot` (L105–404);
- `src/broker/storage-protection.mjs`: `assertProtectedSnapshotUnchanged` (L48–), and the guard's `verify`, `readObserved` and `close` (L961–1101, L2016–2049);
- `test/unit/runtime-selection-guard-lifetime.test.mjs` and `test/helpers/registration-cost-coverage.mjs`.

What the design gets right:

- **It keeps fresh observation.** Retaining the descriptor does not retain any observation. The retained guard's `verify()` re-inspects the root against the original receipt binding (`binding.fingerprint` and `r.identity`, L988–1001). So a replaced root, ACL or protection is refused, not adopted. This matches the design's "cannot adopt replacement protection".
- **Context identity is already threaded.** In primary maintenance, the identical `signal` object and `deadline` number really do flow from `guarded` (L328–331) through `admit(original)`, `withPrimaryAdmissionFence` (which re-checks identity at L37) and every inner `admit(context)`. So "identical signal and exact deadline" is a usable matching key there, not a new invariant.
- **The boundaries are conservative.** No principal or protection cache, no budget change, no repair while borrowing, no retry or reopen in a poisoned scope, and no broker or CLI-lifetime scope. All of these keep the change small and reviewable.
- **Retaining cleanup obligations on uncertain close** matches the existing `pendingCleanup`/`retryCleanup` patterns in both the store and the portable system.

The direction is sound. But six decisions are still open: when the final revalidation runs relative to effects, the scope-state model, the borrower identity tuple, the integration seam, how `register` interacts with an active scope, and whether the change pays for itself. The implementation would otherwise have to invent all of these. Findings 1 and 2 are the main ones.

Verification limits: this session could run only the two prescribed peer-review commands. I did not run tests and did not inspect hosted runs 38191125761 or 38191790750. I read the working-tree source, which is at the artifact commit `ba59707`.

## Findings

1. **The final revalidation runs after the operation's effects, and the design does not say what a failure there reports.** The design puts its new boundary "after the last awaited closure", after the callback returns. In primary maintenance, the callback is the whole `guarded` operation. That operation includes `writeRecord`, which writes the receipt and `primary-activation.json` (L146–182), and the primary admission withdrawal in `withPrimaryAdmissionFence`'s `finally` (L138–153). So if the final selection, inventory or context check fails, the effect is already committed, and the scope "refuses completion". The caller sees a refusal for an operation that actually succeeded. For example, a retry of `register` without `--update` then fails with "Existing registration requires explicit --update inspection." (L297–298). Today's selection checks all run before the effect fences (L503–508, then later `assertAdmission` fences), so this post-effect failure mode is new. The design must say one of the following:
   - (a) the final revalidation is only an integrity adjunct for the scope's own descriptor, and a failure after the effects is reported as "effect committed; scope completion uncertain", carrying the committed receipt/record and the retained obligation; or
   - (b) why a post-effect refusal is the intended contract.
   Either way it must say that nothing is rolled back. It also needs a rejection control for "selection changed after the effect but before scope completion".

2. **The scope-state model is under-specified: matching after completion, poisoned retention, and sibling scopes.** The production store is a single module-level instance (`runtime-selection.mjs` L6–9), so every in-process operation shares it. The spec says three things that do not together define the behaviour:
   - "A scope closing or poisoned … refuses further matching calls";
   - "A subsequent operation opens its own descriptor";
   - "Utilities without that explicit context retain their existing separate one-shot path."

   It leaves these cases open:
   - (a) A call carrying the same signal and deadline arrives after the scope completed successfully, for example a CLI that reuses one context for a follow-up `assertSelectedRuntime`. Does it refuse or go one-shot?
   - (b) The scope is poisoned or has an uncertain close, and its guard is still retained for cleanup. Do matching calls refuse until `retryCleanup` discharges it, or forever (for example, a `WeakMap` keyed by signal)?
   - (c) A second scope opens on the same store with a *different* context while the first is active, for example concurrent `registerPrimary` and `activatePrimaryPolicy` in one process, or a review-history operation. "Nested scopes in the same store refuse" can be read as "any second active scope refuses", which would newly serialise or refuse independent operations. It can also be read as "a scope opened from inside a scope's callback with the same context refuses".
   - (d) An unscoped call arrives while a scope is active. Presumably it goes one-shot, but this is not stated.

   Without explicit states (open, closing, closed, poisoned, uncertain), the registry key, and the behaviour of matching and non-matching calls in each state, the implementation and its controls cannot be checked.

3. **The borrower identity check is weaker than the existing in-admission check.** The design compares only "each freshly derived account directory with the scope's initially bound directory". The current b58e95f in-call check compares `directory`, `home` and `user.uid` (L479–485). Each `operation()` also builds a new portable system that records its own `originalPrincipal` (portable-system L108). So the effective principal at scope initialisation is never compared with a later borrower's principal: each per-call system only checks principal stability within itself. On win32, `uid` is not meaningful, and principal identity comes only from the system's `userId()`/SID. The scope should bind `{directory, home, uid, effective principal}` from the initialising call, and every borrower should compare the whole tuple before borrowing. The refusal controls list "changed … account", but the design text does not ensure it.

4. **The integration seam and the set of wrapped operations are not named.** `createPrimaryMaintenanceCore` receives only an injected `admit` port (L193–201). Production supplies `assertSelectedRuntime` (primary-operations L14), and fixtures supply their own. To open a scope on the production singleton store, the wrapper needs a new explicit port, for example `selectionScope`. The design must say:
   - what that port is;
   - what fixtures supply, given the requirement that isolated test ports create no production membership;
   - whether its absence refuses or falls back to unscoped behaviour.

   "The existing primary-maintenance operation wrapper" is also ambiguous. `guarded` (L325–338) covers only `activate` and `register`. `preserveHistory`/`holdReview`/`releaseReview` go through `createReviewHistoryMaintenance`, which has its own `admit(original)` wrapper (L107–112). State whether those are in scope.

   Two more points are missing:
   - The scope must start before `admit(original)` at L332, so that the first admission initialises it. That is the order the "original context is already constructed" sentence implies, but the design should state it.
   - The design caps the scope deadline at ≤30000 ms in the future. `guarded` accepts a caller-supplied `deadline` with no cap. State that a longer caller deadline is refused, not clamped, and that this is a deliberate behaviour change.

5. **Calling `register` while a scope is active is not addressed, and the result could be unsafe.** "Selection registration/update is outside this read-only scope" says what the scope is for, not what happens. If `store.register` runs with the matching context while a scope is active, it would take its own one-shot `withStore(…, create)` path (L406–407). It would write a new selection and set `processSelectionGeneration`/`processSelectionId` to the new generation (L414–415). Later borrowed admissions compare against those updated fields (L433–456), so a mid-operation relocation through `register --update` would be accepted silently by the rest of the scope. The design should state the following:
   - `register` (dry-run or not) refuses while any scope is active on that store, or at least while a matching scope is active;
   - `read()` participates in borrowing, in the same way as `assertSelected`;
   - `location()` is unchanged.

   Add the matching rejection control.

6. **The benefit is not quantified, and there is no acceptance criterion for the scope itself.** The design is motivated by budget, but it gives no estimate of how much the scope removes from a complete operation. The cited counters (428/424/38/36/208/59) are V8 function-level coverage counts (`registration-cost-coverage.mjs` L5–25, `projectRegistrationCostCoverage`) and are not attributed to callers. So the share that comes from selection admissions is unknown.

   Retention removes only the `observeProtection` call and the open-time `inspect` per borrowed admission. Each admission still runs `components`, two `readSnapshot` calls (each doing `verify`/`inspect`, or `inspectWindowsReadPair` on Windows), `guard.verify()`, `verifyRuntimeInventory` and `installation()`. Primary `register` performs about three admissions (L332, L266, L312), and `activate` about three (L332, L207, L249). So the saving may be about 4 protection operations out of roughly 74 observations and opens, and an unknown share of the ~424 inspections.

   Without an attributed baseline and a projected after-count, the change could add real lifecycle complexity (tracking, poisoning, quiescence, post-callback revalidation) and still leave Windows registration outside its budget. This is the same gap as Finding 1 of the earlier stock-worker review.

## Required changes

1. **Specify when the final revalidation runs relative to effects, and what it reports (Finding 1).** Either make the scope's final revalidation a descriptor-integrity adjunct whose post-effect failure reports "effect committed; scope completion uncertain", with the receipt and retained obligation and no rollback, or justify a post-effect refusal. Add a control in which the selection changes after `writeRecord` and before scope completion, with an assertion on the reported outcome.
2. **Define the scope state machine and registry (Finding 2).** Name the key (signal identity plus exact deadline, per store instance). Define the states (open, closing, closed, poisoned, uncertain) and what matching and non-matching calls do in each:
   - after successful completion, matching calls either go one-shot or refuse (pick one);
   - while poisoned or uncertain, they refuse until cleanup is discharged (or permanently).

   State whether concurrent scopes with *distinct* contexts on the singleton store are allowed. Define "nested" precisely. Add controls for (a)–(d) in Finding 2.
3. **Bind and compare the full identity tuple (Finding 3).** Record `{directory, home, uid, effective principal}` from the initialising call and compare all of it before every borrow. Add a principal-change refusal control on both POSIX and win32.
4. **Name the integration seam and the wrapped operation set (Finding 4).** Define the explicit scope port for `createPrimaryMaintenanceCore`, its fixture counterpart, and the behaviour when it is absent. Say whether review-history maintenance is included. State that the scope starts before `admit(original)`. State how a caller deadline beyond 30000 ms is handled.
5. **Specify `register` and `read` behaviour under an active scope (Finding 5).** `register`/`--update`/`--dry-run` refuses while a scope is active. `read()` participates. `location()` is unchanged. Add the rejection control.
6. **Add an attributed baseline and an acceptance criterion (Finding 6).** Count the selection-store `observeProtection`, `openProtectedRoot`, `inspect`/`inspectWindowsReadPair` and `verify` calls per admission. Count the admissions per complete primary `register` and `activate` (for example with the existing stack-based descriptor tap in `runtime-selection-guard-lifetime.test.mjs`, extended to the protection calls). State the projected reduction. Add a required-evidence item that compares complete-operation counters with and without the scope on the same immutable candidate. State the threshold, or the decision rule, for keeping the change if the reduction is marginal.

## Optional suggestions

1. **Say whether borrowed reads run concurrently or in a queue.** "Queueing … consume the original deadline" implies serialisation, but the text also allows concurrent matching reads after initialisation. If borrowed `readSnapshot` calls may overlap on one guard, say that the guard's `heldFiles` handling is safe under concurrency. Otherwise say that borrowers are serialised in FIFO order, and that queue time counts against the deadline.
2. **Say who owns retained-guard cleanup.** The first borrower opens the guard through its own per-call portable system. If the post-open `check()` fails, a failed close lands in *that* system's `pendingCleanup` (portable-system L388–399), which nothing can reach once the call returns. State that the scope or store `pendingCleanup`/`retryCleanup` (L525–530) owns every scope-guard obligation, including this path.
3. **Note the Windows hold effect.** On Windows, holding the selection-directory handle open for up to 30 s, instead of briefly, can make another process's attempt to rename or delete that directory fail during the operation (for example uninstall or manual repair). Mention this as an expected, bounded effect, or rule it out with evidence.
4. **Typography.** Many numbers and identifiers run into adjacent words: "were396,435,429 and3142milliseconds", "Commitb58e95f", "counted428ancestor", "no more than30000milliseconds", "unchanged15000ms". Adding the spaces would make the evidence easier to audit.

## Decision

revisions-requested
