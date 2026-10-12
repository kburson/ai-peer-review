# #209 Portable Owner Reconciliation Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans inline. Root is the sole implementer. Run normal specification/plan review before product changes and one fresh whole-child review before native delivery. Do not delegate implementation.

**Goal:** Replace permanent missing-producer refusal with genuine bounded reconciliation over the actual stores, retaining all uncertain effects.

**Architecture:** A read-only inventory producer captures complete authority-bearing namespaces using each store's actual ordinary or C1-protected mechanism. A pure classifier documents dispositions without granting authority. The fixed production observer binds a private observation to the genuine owner paths, physical project and original context, then reobserves at owner effects and restoration.

**Tech Stack:** Node >=24, existing stock C1/C2/C3/C4 operations and closed protocol readers. No new runtime dependency or native build.

**Spec:** `docs/superpowers/specs/2026-10-12-209-portable-reconciliation-design.md`.

## Story Intent

- **Beneficiary:** installed review users and recovery operators
- **Capability:** establish actual portable registry and effect reconciliation before broker ownership
- **Need:** the shipped observer permanently reports missing producers after current source admission
- **Value or failure prevented:** enable proved startup while retaining uncertain manual and provider effects

## Global Constraints

- Preserve startup's original AbortSignal and absolute monotonic deadline, at most 30000 ms. No deadline renewal, clock control or TTL.
- Fresh principal/protection/type/link/root/parent/file observations authorize reads and effects; no cached security fact, copied result or caller callback grants clearance.
- Registry, manual, wake and provider effects retain exact identities and independent resource ownership. Process death never discharges them.
- Keep #102 current-runtime authority and source-class admission at actual effects. Covered source changes require #190 normal recapture and separate finite class review.
- Locally run affected tests only; full suites use authentic exact-head hosted receipts and the existing 800000 ms ceiling.
- Preserve private diagnostics locally; tracked evidence contains no credentials, nonce digests or raw private records.
- Deliver #209 through its native workflow, then resume #190; no source-unavailable success, unconditional clear, ACL rewrite, provider/reboot/descendant discharge or acceptance waiver.

## Review Focus

1. A review transaction lacks a registration but contains pending effect evidence: it must still be discovered and block unsafe recovery.
2. A resource belongs to an unrelated physical worktree: validated unrelated ownership must remain independent; ambiguous association must refuse.
3. Directory membership changes after empty enumeration, or a manual fence changes during restoration: publication must not use the older observation.
4. A provider acknowledgement records submission but not completion: restoring the broker must not retire or duplicate that provider effect.
5. A descriptor cannot close after observation or refusal: preserve its exact obligation rather than report clean clearance.

## Task 1: Complete Ordinary and Protected Namespace Observations

**Files:** Modify `src/broker/storage-protection.mjs`; create `src/broker/portable-reconciliation-inventory.mjs` and `test/unit/portable-reconciliation-inventory.test.mjs`; extend `test/unit/storage-protection.test.mjs`.

**Interfaces:** Genuine protected guards gain `listOrdinaryEntries()` returning frozen `{name,type,identity}` entries after bounded fresh verification. `observeReconciliationInventory({paths,signal,deadline})` derives the fixed physical project/account namespaces from genuine owner paths and stock operations, using retained ordinary physical-directory identity for public project/review stores and genuine C1 guards only for actual protected roots. Its private observation exposes no write capability; production assertion reobserves membership and retained generations.

- [ ] Write RED substrate tests that create protected ordinary files/directories and assert complete sorted membership, then replace/add/remove a member and require the retained observation to refuse. Include symlink/hardlink, malformed name, entry overflow, abort/deadline and descriptor-close failures.

```js
assert.deepEqual(
  (await guard.listOrdinaryEntries()).map((entry) => entry.name),
  ['a.json', 'reviews']
);
await rename(root, root + '-old');
await assert.rejects(() => guard.listOrdinaryEntries(), /root|identity|protection/i);
```

- [ ] Run the targeted new tests before implementation and preserve their failures. Implement enumeration with existing C1 budget/name/root checks and retained physical metadata; do not broaden election publication prefixes or write authority.
- [ ] Implement fixed namespace discovery for project registrations/review transactions, review wake/manual/provider authority and account manual/provider resources. Each absent directory is tied to the nearest retained physical parent under that store's actual mechanism; unknown names/types and unreadable or over-limit namespaces remain unresolved.
- [ ] Test orphan review discovery, foreign project resources, a new child appearing across an await, and cleanup retention. Rereads validate unrelated resources freshly rather than using a cached foreign-project exclusion.
- [ ] Add matching ordinary 0755-tree controls for member replacement/add/remove across an await, linked ancestor/child, hardlinked authority file and unknown namespace child. Pin 4096 total entries, depth16, 1048576 bytes/file, and exact reconciliation-inventory-overflow/reconciliation-deadline/reconciliation-aborted/reconciliation-namespace-unproved reasons. Ordinary observations cannot pass C1 membership checks.
- [ ] Run affected storage/inventory tests and changed-file lint/format. Commit only the bounded producer and tests as `[#209] Observe complete protected reconciliation namespaces`.

## Task 2: Classify Durable Obligations and Construct Exact Pre-Creation Recovery

**Files:** Create `src/broker/portable-reconciliation-policy.mjs`, `src/broker/portable-participant-binding.mjs`, `src/broker/portable-existing-effect-reconciliation.mjs`, `test/unit/portable-reconciliation-policy.test.mjs` and `test/unit/portable-existing-effect-reconciliation.test.mjs`; extract shared read-only participant/adapter binding from `src/broker/worker-factory-core.mjs` and reconciliation-only wake logic from `src/coordinator/service-core.mjs`; replace `src/broker/portable-reconciliation.mjs`'s unavailable-producer stub; extend `test/integration/portable-ownership.test.mjs`.

**Interfaces:** `classifyPortableReconciliationCore({project,registrations,reviews,resources})` returns an explicitly unverified disposition and bounded obligations. Production feeds it only real, retained, schema-validated observations under each actual store mechanism and existing exact startup/event/output/wake/manual authority readers. `preparePortableReconciliation({paths,lease,signal,deadline})` may first run fixed exact existing-effect reconciliation; it requires the actual won lease/source and never creates a worker or provider resource. `isPortableReconciliationObservation(value)` and `assertPortableReconciliation({observation,paths,signal,deadline})` use private membership and original context.

- [ ] Write table-driven RED controls for empty stores, exact restorable registrations before any launch, terminal/preserved history, durably fenced manual review, unknown startup/wake/manual launch, retained same-project provider resources, valid foreign-project resources and malformed/ambiguous records.

```js
const unknown = classifyPortableReconciliationCore({
  project,
  registrations: [],
  reviews: [{ wake: [{ status: 'outcome-unknown' }] }],
  resources: [],
});
assert.equal(unknown.verified, false);
assert.equal(unknown.status, 'unknown');
assert.ok(unknown.outstandingObligations.length);
```

- [ ] Observe RED, then implement exact closed classification. Missing complete manual-launch coverage cannot prove non-submission. Acknowledgement alone cannot prove completion. Retained same-project provider ownership cannot be discharged by this observer. Settled manual resources require the exact durable fence hash, withdrawn election AND current genuine C1 protection of the review workspace from the settlement producer, without deleting the durable record. Add a RED case with all other fields matching but an ordinary 0755 workspace: it remains a blocker.
- [ ] Implement the fixed observation/seal components, retaining physical generations and cleanup obligations, but keep the wired production observePortableReconciliation result non-clear until Task3 atomically adds all effect/registration/restoration/publication bindings. Only the explicit unverified pure classifier may return clear at this intermediate commit. A caller's clear object, copied election/source, or reconcile callback must fail production assertion; any relevant change after an await refuses.
- [ ] Extract fixed sealed participant/adapter binding without constructing a worker, acquiring provider resources or accepting caller probes. Authorize pre-creation reconciliation with the genuine won election lease and exact source revalidation. For each review write use `withOperationAuthority({operation:'broker.reconcile',cwd:project.physicalRoot,reviewWorkspace:workspace,signal,deadline}, operation)`, inheriting the original context and fresh #102 review-containment/startup checks.
- [ ] Add RED controls for a clean/idle stop after outcome-unknown launch whose resource leases were released: exact reconciliation may settle only its existing operation. Prove unchanged provider-store membership, no reserve/new launch/wake, refusal without genuine election/source and retained unknown outcome. Use a production-used producer harness, not an accepting fixture callback. Extract `reconcileReserved` without reaching `deliverReserved`; closed unknown observations cannot return clear.
- [ ] Classify acknowledged launched reviews by the exact joinedLaunchMatches acknowledged branch; reserved/unknown branches require the bounded pre-creation producer. Include broker/recovery records and all accepted-spec namespaces. Empty/uninitialized review directories and retained coordinator/lock generations refuse explicitly; no TTL/PID-only cleanup.
- [ ] Run targeted policy and actual guarded observer tests. Retain a real production-path refusal control at this Task2 commit, proving portable startup still cannot obtain clear before Task3 integration; prove genuine ordinary/protected observations where available without enabling ownership; pure fixtures remain unverified.
- [ ] Commit as `[#209] Prepare guarded reconciliation without enabling production clearance`. Verify the wired production path remains non-clear at that exact commit.

## Task 3: Bind Clearance to Actual Owner Effects and Delivery

**Files:** Modify `src/broker/portable-ownership.mjs`, `src/broker/portable-service.mjs`, `src/broker/service-core.mjs`, `src/broker/worker-factory.mjs`, `src/broker/worker-factory-core.mjs`, `src/broker/worker.mjs`, `bin/peer-review-broker.mjs`, the readiness-failure client decoder in `src/broker/client-core.mjs` and broker command/result path in `src/cli/run-core.mjs`, affected ownership/readiness/worker/diagnostic tests and `scripts/verify-portable-consumers.mjs` if the new genuine guard method needs closed origin classification; regenerate `src/protocol/process-source-contract-files.json` and `evidence/portable-runtime/consumer-inventory.json` when the graph changes.

**Interfaces:** Existing public owner/startup APIs remain awaited. Preparation retains the genuine reconciliation observation privately. Actual quarantine/create and publish paths assert it under the original context. Service startup uses `readPreparedPortableRegistrations({owner,signal,deadline})` from the private exact initial set. Genuine production factory and start/suspend/close transitions issue private restoration receipts; `acceptPortableWorkerRestoration({owner,receipt,signal,deadline})` validates exact prior/new workspace and broker/recovery generations plus any genuine still-held acquired lease. No copied worker or arbitrary baseline refresh qualifies. Legacy reconcile input grants nothing and is never executed.

- [ ] Add RED controls at real production call sites: copied clearance/callback, record or namespace changes between reconciliation and quarantine/create/publish, delayed restoration crossing deadline, manual/provider contender changes, and cleanup failure. No effect counter may advance after refusal.

```js
await assert.rejects(
  () =>
    assertPortableReconciliation({
      observation: { status: 'clear', outstandingObligations: [] },
      paths,
      signal,
      deadline,
    }),
  /reconciliation|binding|authority/i
);
assert.equal(ownerCreated, false);
assert.equal(endpointPublished, false);
```

- [ ] Observe RED, then enable the wired production observer's first clear atomically with the private observation at quarantine/create, immediately before publishEndpoint and again immediately before lifecycle.publish, the exact initial registry set, restoration receipts/mode and optional inert legacy key. Add a mutation between publishEndpoint and lifecycle.publish; the second assertion must refuse. Remove the service's empty callback and keep compatibility without granting injected authority. Retain C4's exact death, conflicting endpoint, quarantine and owner-generation checks.
- [ ] Select restoration mode only from genuine prepared-owner membership in the production factory. Defer coordinator startup, new launches/wakes and asynchronous state-change settlement until lifecycle.publish succeeds; await and receipt initial settlement. After publication activate genuine workers under published lifecycle authority and their normal independent dispatched contexts, never by renewing startup.
- [ ] Add RED/GREEN production-used controls: automatic-wait restoration publishes with zero pre-publication wake; recovery-only suspension/close records are receipted even after worker removal; new registration/manual mutation or copied receipt refuses; a crash with an active automatic review retains exact provider/coordinator obligations and does not report recovery.
- [ ] Implement a closed, bounded broker-child failure projection and client decoder. Carry only an allowlisted reason and obligation names, not arbitrary stderr/JSON, paths, nonce, credential/digest or private values. Include existing-effect-reconciliation-unproved, provider-resource-retained, coordinator-generation-retained, review-lock-retained, review-initialization-unproved and reconciliation inventory/namespace/deadline/abort reasons. Preserve actual child exit and original readiness deadline. broker reconcile/status must distinguish refusal from recovery and never claim a retry as success.
- [ ] Add production-used CLI/client/entrypoint controls for no-live-broker outcomes: clean-stop outcome-unknown reaches the fixed existing-only producer; active automatic-review crash yields exact retained provider/coordinator names; unavailable probe yields existing-effect-reconciliation-unproved. Use the real shipped CLI core/error-projection path with explicit unverified test ports where necessary; that narrow control is not installed/current effect authority or #190 acceptance. Actual positive installed execution remains with final-byte class admission in #190.
- [ ] Derive the complete source closure and consumer inventory with repository-owned generators; run affected source-assurance/manifest tests. The changed digest must refuse previous finite classes rather than relabel them.
- [ ] Commit, push the repair branch and create a draft PR to the parent delivery branch. Attach the PR to this chat. Obtain genuine exact-head hosted receipts and one fresh whole-child review; repair consequential findings once with RED/GREEN evidence and recheck only changed gates.
- [ ] Complete native delivery and closure, preserving explicit human authorization and exact-head authority. Resume #190 in its recorded worktree only after #209 is Done. Merge/synchronize through the sanctioned workflow and run normal final-byte registration/capture/class reviews before actual installed acceptance.

## Completion Contract

Issue #209 delivers startup for empty, clean/idle-stopped stores and crashes with no registered non-terminal review. Active-review crash recovery requires separately delivered provider/coordinator recovery, including #210; this limitation cannot be credited as positive #190 recovery. Issue #209 is complete only when the guarded production producer/composition repair passes its declared evidence and native delivery gates. It does not claim #190's positive installed journeys, expired original-budget submission, other OS readiness or whole #171/#141 acceptance. Those remain open until their own exact receipts pass.
