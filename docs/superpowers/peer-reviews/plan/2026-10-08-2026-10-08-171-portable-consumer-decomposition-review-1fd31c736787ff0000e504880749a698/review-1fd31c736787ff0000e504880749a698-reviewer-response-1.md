<!-- ai-peer-review-template version="1" digest="sha256:78e9a634af9d540baaf6790db82952eaf39cf7ab59a6cdc7938319ae07a4cbed" -->

<!-- protected-frontmatter -->

---
schema: "ai-peer-review.response/v1"
review_id: "review-1fd31c736787ff0000e504880749a698"
role: "reviewer"
turn: 1
commit_mode: "normal"
authority_assurance: "unavailable"
artifact_path: "docs/superpowers/plans/2026-10-08-171-portable-consumer-decomposition.md"
artifact_commit: "cc0634a5d9c77445b3dc9d02e4f68475b165b4f3"
artifact_blob: "45f10c1ee7b67648349da2c4b337577a5531c44e"
artifact_digest: "sha256:1f899ac9d79f20224efa12c07943eeef5aaf8b48206706efbfe58e50eb0a31ac"
agent:
  host: "claude-code"
  provider: "anthropic"
  model_id: "claude-opus-5-5"
  model_display: "claude-opus-5-5"
  session_fingerprint: "sha256:30bcadcebf970eea4d15c3089f78752c74407a7bb1cc034923c1733bbfe93baf"
  identity_source: "runtime"
started_at: "2026-10-08T10:17:10.872Z"
submitted_at: "2026-10-08T10:20:49.500Z"
finding_ids: ["R1-F001","R1-F002","R1-F003","R1-F004","R1-F005","R1-F006"]
answered_finding_ids: []
acknowledged_supplement_ids: []
---

Mode: `normal`

## Summary

I reviewed `docs/superpowers/plans/2026-10-08-171-portable-consumer-decomposition.md` (artifact commit cc0634a, blob 45f10c1e) as a decomposition of accepted #141 Task 6 (`docs/superpowers/plans/2026-10-06-141-protected-storage-ownership-decomposition.md` lines 303–348). I checked it against the current source tree at the working-tree head:

- every direct importer of `src/broker/platform.mjs` in src/bin;
- the provider-resource lease implementation and its real callers;
- the `ipc.mjs` importers;
- the source-contract digest in `src/protocol/process-source-assurance.mjs` and its mirror test;
- the selection/primary callers of `assertSelectedRuntime`;
- existence of every named file and test.

What holds up:

- **Estimate and split.** The six allocations (4+6+4+6+6+1.5) sum to the stated 27.5 base hours. The 36.5-hour native risk-adjusted forecast is preserved, not reduced. Each child is below the 24-hour must-split threshold.
- **Original obligations.** The original Task 6 Story Intent is carried verbatim. All eight Task 6 checklist obligations map to an owner. Root #141 and whole #107 Task 2 gates and the 15 later #107 release gates are retained.
- **Contract change acknowledged.** The plan states plainly that Task 2's `runtime-selection-core.mjs` edits invalidate the 524b class and require genuine recapture and normal class review in Task 5 before installed proof. This is the route the original Task 6 Interfaces paragraph prescribes for a contract change found during integration.
- **Primary election separation.** The primary-admission exclusive lock is a separate resource and root, as the original requires.
- **Named files exist.** Every source file the plan names exists, including `bin/peer-review-broker.mjs` and `src/startup/authority-fence.mjs`.
- **Native importer survey is accurate.** The direct native importers today are `bin/peer-review-broker.mjs`, `src/broker/client-core.mjs`, `src/cli/run-core.mjs`, `src/startup/runtime-core.mjs`, `src/startup/authority-fence.mjs`, `src/config/runtime-selection-core.mjs`, `primary-admission.mjs`, `primary-authority.mjs` and `primary-maintenance.mjs`. `ipc.mjs:187` and `service-core.mjs:101` call `platform.peerUser` on an injected handle.

I found two defects that would let a delivered child pass its own GREEN while breaking a Review Focus property, one specification gap in the verifier, and one gap in the verification commands. Details follow.

Verification limits: shell execution was denied in this reviewer session, so I did not run any test or the verifier. All observations come from reading files.

## Findings

### R1-F001 — Task 2 changes the source-contract import closure, but no task owns re-deriving the contract file set (High)

`processSourceContractDigest` (`src/protocol/process-source-assurance.mjs:11-22, 79-83`) hashes a fixed, hand-maintained list of ten files. That list is exactly the transitive import closure of `process-source-assurance.mjs` plus the class schema:

- `process-source-assurance.mjs` imports `runtime-selection.mjs`;
- `runtime-selection.mjs` imports `runtime-selection-core.mjs`;
- `runtime-selection-core.mjs` imports `errors.mjs`, `broker/platform.mjs` and `runtime-inventory.mjs`;
- `runtime-inventory.mjs` imports `dependency-closure.mjs`.

`test/unit/process-source-assurance.test.mjs:129-140` mirrors the same ten paths. The plan's phrase "Freeze the ten covered producer paths" refers to this list.

Task 2 replaces `runtime-selection-core.mjs`'s `platformSecurity` import (line 15, and the `security = platformSecurity` default at line 64) with awaited C1/Task 1 operations. That edit changes the closure:

- `src/broker/portable-platform.mjs`, `src/broker/storage-protection.mjs` and whatever they import become code that runs inside `assertSelectedRuntime`;
- `src/broker/platform.mjs` may drop out of the closure.

No task lists `src/protocol/process-source-assurance.mjs` or its test, and no RED checks that the contract list equals the derived closure.

Failure scenario: Task 5 genuinely recaptures and normally approves a class whose `contract` digest still covers only the old ten paths. A later edit to `storage-protection.mjs` or `portable-platform.mjs` changes the protection/selection guard that every source-class admission executes. The contract digest does not change, so the approved class still matches. That is exactly the stale-class admission Review Focus 5 and Task 5 ("prevent stale source admission") are meant to stop. The 524b-invalidation reasoning in the plan also silently assumes the set stays at ten.

There is also a cycle hazard. Task 1's frozen operations object exposes `observeSource()`, which presumably reaches `loadProcessSourceAssurance`. If Task 2 makes `runtime-selection-core.mjs` import `portable-platform.mjs`, the result is a static ESM cycle: `process-source-assurance` → `runtime-selection` → `runtime-selection-core` → `portable-platform` → `process-source-assurance`. The cycle's evaluation order and TDZ behaviour would become part of the contract.

### R1-F002 — Task 3 omits the real synchronous consumers of provider-resource lease methods (High)

Task 3 makes `acquire`/`beforeDelivery`/`releaseUnused`/`release`/`abandon` async and promises "await … at every caller". However, its Files list names only `src/cli/run-core.mjs`, `src/startup/runtime-core.mjs` and "complete-inventory registry/wake/manual modules". Neither named file imports `provider-resources.mjs`.

The actual consumers are:

- `src/broker/worker-factory-core.mjs`, which imports `acquireProviderResource` at line 25 and calls `lease.beforeDelivery(observation)` unawaited at line 391, plus `releaseUnused` at 345/397 and the delivery hook at 473;
- `src/broker/worker.mjs:245`, which calls `resourceLease.beforeDelivery(observation);` unawaited, immediately before reviewer launch;
- `src/broker/provider-bridge.mjs:203`, which calls `lease.beforeDelivery(input.target_role, resource);` unawaited, immediately before `deliverToSession`.

Today `beforeDelivery` is synchronous (`provider-resources.mjs:457-472`) and signals refusal by throwing. That is why these call sites work without `await`.

Failure scenario: Task 3 makes `beforeDelivery` async as specified, but these three files are not migrated. The lease check then returns a promise that nobody awaits, and its rejection becomes an unhandled rejection. Reviewer launch (`worker.mjs`) or session wake delivery (`provider-bridge.mjs`) proceeds to the provider effect even when:

- the slot belongs to another contender;
- the record generation is stale;
- the observation is not fresh.

This is precisely Review Focus 3 and the plan's own "no promise-as-boolean" constraint. Task 3's RED cases, as written, exercise the lease directly and the inventory rows. They would not detect the unawaited call at the effect site.

### R1-F003 — The inventory verifier does not define "reachable", and drops the original Task 6 `ipc.mjs`/`platform.mjs` ownership (Medium)

Original #141 Task 6 lists `src/broker/ipc.mjs` and `src/broker/platform.mjs` under Modify. It requires "no reachable platformSecurity, inspectPlatformSecurity, loadBinding, peerUser or native handle operations" on portable operational paths. This plan:

- freezes `platform.mjs`;
- declares "IPC residuals stay 143-owned/unreachable" (Task 4);
- does not list `ipc.mjs` in any task.

But `ipc.mjs` is statically imported by modules that remain on the portable path:

- `ownership.mjs:3` (`brokerError`, `validateHandshake`);
- `service.mjs:1`, `service-core.mjs:2`, `client.mjs:1`, `client-core.mjs:23`;
- `run-core.mjs:39` (`connectBroker`);
- `bin/peer-review-broker.mjs:16`.

`ipc.mjs:187` itself calls `platform.peerUser(connection)`. Likewise `run-core.mjs:5001` calls `inspectPlatformSecurity()` on the CLI path.

So the verifier's verdict depends on a definition the plan never gives:

- **Module-level import reachability.** `ipc.mjs` and `platform.mjs` stay reachable while any portable module imports a helper from them. The "unreachable 143 residual" disposition is then impossible without splitting those modules, and no task owns the split.
- **Binding- or call-level reachability.** This needs exported-binding and call-graph analysis that Task 1's description ("import, export, alias, default and call edge") does not specify.

Injected handles make this harder. Portable modules receive native handles as parameters (`service-core.mjs:101`, `ipc.mjs:187`, `identity.mjs:19-55` `platform.canonicalPath`/`platform.userId`). The new portable operations deliberately expose the same method names (`canonicalPath`, `userId`). A call-name check therefore cannot tell native from portable. The plan does not say how the verifier attributes an injected handle to its origin.

Failure scenario: Task 1 implements import-edge analysis plus name-based call edges. A portable entry path still reaches `connectBroker` → `platform.peerUser`, or `run-core` passes `platformSecurity` into `canonicalProjectIdentity({ platform })`. Then either:

- the verifier passes because the callee module has no native import and the call name looks portable; or
- the verifier permanently blocks Task 6 because `ipc.mjs` is module-reachable, which pushes the root toward an owner-text excuse the plan itself forbids.

### R1-F004 — Child verification commands skip tests the children modify or claim to migrate (Low)

Host runs are affected/TIA-only, so each child's listed commands are its actual targeted GREEN evidence. Several commands miss the tests that matter:

- **Task 2** says "Extend existing selection/primary tests" but runs only the unit files. It omits `test/integration/runtime-selection.test.mjs` and `test/integration/primary-authority.test.mjs`, both of which exist and exercise the migrated paths.
- **Task 3** extends `test/integration/provider-resource.test.mjs` but does not run it.
- **Task 4** states "Retained broker-multiproject/broker-endpoint/readiness journeys must actually run through the portable path". Its command omits `test/integration/broker-multiproject.test.mjs`, `test/integration/broker-endpoint.test.mjs` and `test/integration/broker-readiness.test.mjs`.
- **Task 6's** cumulative command omits `broker-readiness.test.mjs`.

## Required changes

1. **R1-F001.** Re-derive the contract file set in place of the frozen ten paths:
   - In Task 2 (or a named Task 1 sub-step), require re-deriving the source-contract file set from the actual static import closure of `process-source-assurance.mjs` after the selection migration. Use the Task 1 AST walker; do not maintain the list by hand.
   - Add `src/protocol/process-source-assurance.mjs` and `test/unit/process-source-assurance.test.mjs` to Task 2's Files. Note that this is itself a contract-file edit that Task 5 must recapture.
   - Add a RED that refuses when the `CONTRACT_FILES` list differs from the derived closure, in either direction.
   - State how the `observeSource` ↔ selection cycle is avoided. Options include splitting source observation out of the operations object that selection imports, or injecting it lazily. Then state that the resolved structure is part of the recaptured contract.
   - Replace "ten covered producer paths" with "the derived contract closure".
2. **R1-F002.** Migrate the real lease callers in Task 3:
   - Add `src/broker/worker-factory-core.mjs`, `src/broker/worker-factory.mjs`, `src/broker/worker.mjs` and `src/broker/provider-bridge.mjs` to Task 3's Files.
   - Add a RED where an async `beforeDelivery` rejects (foreign slot, stale generation, stale observation) and the test proves that `launchReviewer` / `deliverToSession` is not invoked.
   - Add a Task 1 inventory or lint rule that flags unawaited calls to lease methods.
3. **R1-F003.** Define reachability and own the IPC/platform residuals:
   - In Task 1's interface, define reachability as module-level or binding/call-level from the `bin/*` entries.
   - Specify how parameter-injected handles are attributed to their origin. One approach is to treat every `platformSecurity`/`inspectPlatformSecurity` binding as tainted at its import, and to treat every call that passes it on, or calls a method on a tainted value, as a native edge.
   - Assign `src/broker/ipc.mjs` (and any portable-used helpers it must shed) to Task 4 with an explicit split-or-residual disposition.
   - State that `run-core.mjs:5001` `inspectPlatformSecurity()` must be removed from portable paths or proven unreachable at the defined granularity.
   - Add Task 1 RED fixtures for (a) a native handle passed through a parameter into a module with no native import, and (b) a portable module importing a non-native helper from a module that also exports a native operation.
4. **R1-F004.** Add the missing test files to the Task 2, 3, 4 and 6 verification commands as listed in R1-F004.

## Optional suggestions

### R1-F005 — Name the interim state between Task 2 and Task 5 delivery

After Task 2 merges, the accepted 524b class no longer matches the current source until Task 5 adopts a new one. One sentence would close this gap. It should state that any source-assurance consumer in the interim fails closed to `unavailable` with no operational regression to an activated path. It should also list which test asserts that.

### R1-F006 — Drop the "may stay synchronous construction" escape for `createSelectionStore`

`createSelectionStore` currently performs `realpathSync`/`lstatSync` and a bounded inventory read at construction (`runtime-selection-core.mjs:66-77`). If construction stays synchronous, say explicitly that construction performs no protection- or principal-dependent observation. Otherwise the construction-time snapshot becomes a synchronous facade, which the plan forbids.

## Decision

revisions-requested
