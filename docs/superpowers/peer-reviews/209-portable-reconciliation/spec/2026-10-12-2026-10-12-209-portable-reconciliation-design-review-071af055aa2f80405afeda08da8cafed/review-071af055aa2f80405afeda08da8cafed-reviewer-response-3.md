<!-- ai-peer-review-template version="1" digest="sha256:78e9a634af9d540baaf6790db82952eaf39cf7ab59a6cdc7938319ae07a4cbed" -->

<!-- protected-frontmatter -->

---
schema: "ai-peer-review.response/v1"
review_id: "review-071af055aa2f80405afeda08da8cafed"
role: "reviewer"
turn: 3
commit_mode: "normal"
authority_assurance: "unavailable"
artifact_path: "docs/superpowers/specs/2026-10-12-209-portable-reconciliation-design.md"
artifact_commit: "696e8d3df86e8996e3dba848defc1072ea773d07"
artifact_blob: "88a22293444722aff2856e935912c502eb322a16"
artifact_digest: "sha256:5c7920d29cb06d52984c7cd5e5d80c3b8db28ad0bfcf59875a0f47e95b4fd243"
agent:
  host: "claude-code"
  provider: "anthropic"
  model_id: "claude-opus-5-5"
  model_display: "claude-opus-5-5"
  session_fingerprint: "sha256:bb08761a852bbd80b75a86caf1b80d91ada22393fa0b77ab36d3c9e1b3c243a7"
  identity_source: "runtime"
started_at: "2026-10-12T19:21:54.010Z"
submitted_at: "2026-10-12T20:01:47.720Z"
finding_ids: ["R3-F001","R3-F002","R3-F003","R3-F004"]
answered_finding_ids: []
acknowledged_supplement_ids: []
---

Mode: `normal`

## Summary

I re-checked the revision at `696e8d3` against the tree. The round-2 findings are addressed as written:

- **R2-F001:** restoration mode defers `startCoordinator`, new launches/wakes and state-change settlement until `lifecycle.publish`, and adds a zero-wake control before publication.
- **R2-F002:** adds a bounded pre-creation route that uses only the existing exact producers, with no reserve or deliver, and routes `broker reconcile` through it.
- **R2-F003:** adds the `broker/recovery` schema and a closed per-review vocabulary that matches the real producers. The coordinator lock is `coordinator.lock`, the lease `coordinator-lease.json`, and the stop request `stop-request.json` (`src/coordinator/lease-core.mjs:69-74`).
- **R2-F004 and R2-F005:** resolved.

Two problems remain.

1. The repair cannot deliver crash recovery for any project that had an active review. The only exception is a crash at a moment when no non-terminal review was registered. The spec does not say this, and its claim that #210 "is not a dependency" contradicts the stated intent.
2. The new pre-creation reconciliation step names producers that, in the current tree, can only be built inside a production worker. That needs a genuine owner and acquires new provider-resource records, and neither is available or allowed before owner creation.

## Findings

### R3-F001 — Any broker crash during an active review leaves blockers that #209 cannot clear, so it delivers no crash recovery while #210 is called "not a dependency"

Location: "Intent and authority" ("Installed review users must be able to start or recover a broker"), "State classification and restoration" paragraph 4 (#210 "is not a dependency"), "Complete protected observation" paragraph 10, and "Bounded pre-creation recovery".

The broker's own normal operation creates exactly the records the spec treats as terminal:

- **Provider resources.** Every production worker acquires provider-resource leases for the author and reviewer-launch roles when it is created. It uses `instanceId: owner.instanceId, nonce: owner.nonce`, and it holds the leases for the worker's whole life (`src/broker/worker-factory-core.mjs:340-380`). Only `worker.close()` → `resourceLease.release()` removes them (`src/broker/worker.mjs:208-218`, `src/broker/worker-factory-core.mjs:442-458`). `startBroker` creates a worker for every registration (`src/broker/service-core.mjs:297`). A crash while any non-terminal review is registered therefore leaves same-project records owned by the dead instance. Under paragraph 4 of the classification section, each one is the terminal `provider-resource-retained`.
- **Coordinator leases.** Every `runnable` or `automatic-wait` worker runs a coordinator that holds `coordinator.lock` and `coordinator-lease.json` until release (`src/coordinator/lease-core.mjs:175-228, 288-320`). A crash leaves them behind, and paragraph 10 of the observation section makes them a terminal obligation.

Then consider the scenario the bounded pre-creation route was added for (R2-F002): a crash during reviewer launch or wake delivery. Those effects run inside a worker that holds the provider leases above. The pre-creation route runs only when there is "no independent retained-resource blocker", so it is unreachable in exactly that scenario. `peer-review broker reconcile` will then report the #210 operator case, not reconcile the launch.

The net result is narrower than the spec says. #209 enables portable startup only for:

- empty stores;
- stores left by a clean or idle stop, where workers close and release their leases;
- crashes that happen while no non-terminal review is registered.

That may be the right safety stance, because discharging a provider resource needs provider-side observation, not process death. But it contradicts "recover a broker", and it makes #210 a real dependency for any crash recovery. #190's positive crash/reclaim journey is also limited in practice to a broker with no non-terminal registrations, which the spec does not say.

### R3-F002 — The pre-creation producers cannot be built from the existing worker path before an owner exists

Location: "Bounded pre-creation recovery", paragraphs 1–2.

The spec says pre-creation reconciliation "invokes that producer" (the exact-session `reconcileReviewerLaunch`, plus a reconciliation-only form of `reconcileReserved`), under "the genuine held election" and before any owner or credential is created. In the tree, those producers are reachable only through `createProductionReviewWorker`:

- The factory requires a genuine prepared or published owner (`src/broker/worker-factory.mjs:35`, `resolvePortableWorkerOwner`). Pre-creation, none exists.
- Building the worker acquires provider-resource leases bound to `owner.instanceId`/`owner.nonce` (`src/broker/worker-factory-core.mjs:346-374`). That writes new same-project provider records, which is neither possible without an owner nor consistent with "may never … retire a provider resource" or with a read-mostly pre-creation step.
- The launch reconciliation closure checks `owner.verify(await ownerContext(owner))` before it calls `reconcileReviewerLaunch` (`src/broker/worker-factory-core.mjs:498-517`).
- The wake reconciliation path (`bridge.reconcile`, `src/broker/provider-bridge.mjs:217-231`) needs the sealed participant binding and adapter selection that the bridge builds inside that factory.

So "invoke the existing producer" needs a defined construction path. The spec must say which component replaces `owner.verify`: presumably the won election `lease.assert` plus `revalidateInstalledProcessSourceAssurance` under the original context. It must also state that no provider-resource lease is acquired, and how the sealed participant adapters and bindings are obtained without a worker. Otherwise an implementer will either create a premature owner, acquire provider records before creation, or substitute a fixture probe. The spec forbids all three, so the step cannot be built as written.

## Required changes

1. (R3-F001) Choose one of these and state it in Intent, Classification and Verification:
   - (a) Narrow #209's recovery claim explicitly. Portable startup succeeds for empty stores, clean or idle-stopped stores, and crashes with no registered non-terminal review. Any crash that leaves dead-instance provider records or coordinator leases refuses with `provider-resource-retained` or `coordinator-generation-retained` until #210 (and the coordinator counterpart) lands. Record that #190's positive crash/reclaim journey therefore uses a broker with no non-terminal registrations. Record that `broker reconcile` for a crash-interrupted launch or wake reports the #210 operator obligation instead of reaching pre-creation reconciliation.
   - (b) Make #210 an explicit dependency of the crash-recovery part of the intent, and say which #190 journeys wait on it.

   Either way, add a RED control: a crash with one registered `automatic-wait` review must refuse startup with the exact provider and coordinator obligations, and must not report recovery.
2. (R3-F002) Specify how the pre-creation producers are constructed:
   - the fixed production module that builds the sealed participant adapter and binding for one review without creating a worker;
   - the authority check that replaces `owner.verify`, with the won election lease and source revalidation under the original context;
   - an explicit statement that no provider-resource lease or record is acquired or written.

   Add a RED control: pre-creation reconciliation leaves the provider-resource store membership unchanged and cannot run without the won election lease.

## Optional suggestions

### R3-F003 — Correct the coordinator lease binding statement

The spec says "Coordinator owner.pid is diagnostic and has no original-process epoch binding". That is true for the PID. But the broker's coordinator lease is created with `leaseOptions: { instanceId: owner.instanceId, nonce: owner.nonce }` (`src/broker/provider-bridge.mjs:185-187`), so `instance_id` equals the broker owner instance recorded in the owner record, which C4 quarantines. The spec should say so. Keeping the lease terminal in #209 is still fine. The binding is evidence a future #107 or coordinator-recovery route could use, because the coordinator runs in the broker's process.

### R3-F004 — Note that manual settlement reads the fence through a C1 guard on the review workspace

`acquireManualRecoveryResource` settlement opens the review workspace through `observeProtection`/`openProtectedRoot` to read `manual-fence.json` (`src/broker/manual-recovery-resource.mjs:170-176`). The table row for per-review manual stores describes ordinary observation. The "settled manual resource is nonblocking" rule depends on that producer's fence digest. State that a review workspace that is not protected, such as an ordinary `0755` directory, cannot produce a proved settlement and therefore remains a blocker.

## Decision

revisions-requested
