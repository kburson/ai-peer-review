# #209 Portable Owner Reconciliation Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans inline. Root is the sole implementer. Run normal specification/plan review before product changes and one fresh whole-child review before native delivery. Do not delegate implementation.

**Goal:** Replace permanent missing-producer refusal with genuine bounded reconciliation over the actual stores, retaining all uncertain effects.

**Architecture:** A protected read-only inventory producer captures complete authority-bearing namespaces. A pure classifier documents dispositions without granting authority. The fixed production observer binds a private observation to the genuine owner paths, physical project and original context, then reobserves at owner effects and restoration.

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

## Task 1: Complete Protected Namespace Observations

**Files:** Modify `src/broker/storage-protection.mjs`; create `src/broker/portable-reconciliation-inventory.mjs` and `test/unit/portable-reconciliation-inventory.test.mjs`; extend `test/unit/storage-protection.test.mjs`.

**Interfaces:** Genuine protected guards gain `listOrdinaryEntries()` returning frozen `{name,type,identity}` entries after bounded fresh verification. `observeReconciliationInventory({paths,signal,deadline})` derives the fixed physical project/account namespaces from genuine owner paths and stock operations. Its private observation exposes no write capability; production assertion reobserves membership and retained generations.

- [ ] Write RED substrate tests that create protected ordinary files/directories and assert complete sorted membership, then replace/add/remove a member and require the retained observation to refuse. Include symlink/hardlink, malformed name, entry overflow, abort/deadline and descriptor-close failures.

```js
assert.deepEqual(
  (await guard.listOrdinaryEntries()).map((entry) => entry.name),
  ['a.json', 'reviews']
);
await rename(root, root + '-old');
await assert.rejects(() => guard.listOrdinaryEntries(), /root|identity|protection/i);
assert.equal(isPortableReconciliationObservation({ status: 'clear' }), false);
```

- [ ] Run the targeted new tests before implementation and preserve their failures. Implement enumeration with existing C1 budget/name/root checks and retained physical metadata; do not broaden election publication prefixes or write authority.
- [ ] Implement fixed namespace discovery for project registrations/review transactions, review wake/manual/provider authority and account manual/provider resources. Each absent directory is tied to a retained protected parent; unknown names/types and unreadable or over-limit namespaces remain unresolved.
- [ ] Test orphan review discovery, foreign project resources, a new child appearing across an await, and cleanup retention. Rereads validate unrelated resources freshly rather than using a cached foreign-project exclusion.
- [ ] Run affected storage/inventory tests and changed-file lint/format. Commit only the bounded producer and tests as `[#209] Observe complete protected reconciliation namespaces`.

## Task 2: Classify Real Durable Obligations

**Files:** Create `src/broker/portable-reconciliation-policy.mjs` and `test/unit/portable-reconciliation-policy.test.mjs`; replace `src/broker/portable-reconciliation.mjs`'s unavailable-producer stub; extend `test/integration/portable-ownership.test.mjs`.

**Interfaces:** `classifyPortableReconciliationCore({project,registrations,reviews,resources})` returns an explicitly unverified disposition and bounded obligations. Production feeds it only real, guarded, schema-validated observations and existing exact startup/event/output/wake/manual authority readers. `isPortableReconciliationObservation(value)` and `assertPortableReconciliation({observation,paths,signal,deadline})` use private membership and original context.

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

- [ ] Observe RED, then implement exact closed classification. Missing complete manual-launch coverage cannot prove non-submission. Acknowledgement alone cannot prove completion. Retained same-project provider ownership cannot be discharged by this observer. Settled manual resources require the exact durable fence hash and withdrawn election, without deleting the durable record.
- [ ] Implement the fixed observer and private seal, retaining physical generations and cleanup obligations. A caller's clear object or reconcile callback must fail production assertion; any relevant change after an await refuses.
- [ ] Run targeted policy and actual guarded observer tests. Replace the old permanent-unavailability assertion with controls that still refuse genuinely unavailable producers/invalid project bindings and prove genuine protected observations where available; pure fixtures remain unverified.
- [ ] Commit as `[#209] Reconcile real portable registry and effect obligations`.

## Task 3: Bind Clearance to Actual Owner Effects and Delivery

**Files:** Modify `src/broker/portable-ownership.mjs`, `src/broker/portable-service.mjs` and affected ownership/readiness tests; regenerate `src/protocol/process-source-contract-files.json` and `evidence/portable-runtime/consumer-inventory.json` when the graph changes.

**Interfaces:** Existing public owner/startup APIs remain awaited. Preparation retains the genuine reconciliation observation privately. Actual quarantine/create and publish paths assert it under the original context. Service worker restoration consumes exact registry authority and checks manual/resource state before publication. Legacy reconcile input grants nothing and is never executed.

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

- [ ] Observe RED, then bind the private observation at the production quarantine/create/publish closures. Remove the service's empty callback and keep compatibility without granting injected authority. Retain C4's exact death, conflicting endpoint, quarantine and owner-generation checks.
- [ ] Derive the complete source closure and consumer inventory with repository-owned generators; run affected source-assurance/manifest tests. The changed digest must refuse previous finite classes rather than relabel them.
- [ ] Commit, push the repair branch and create a draft PR to the parent delivery branch. Attach the PR to this chat. Obtain genuine exact-head hosted receipts and one fresh whole-child review; repair consequential findings once with RED/GREEN evidence and recheck only changed gates.
- [ ] Complete native delivery and closure, preserving explicit human authorization and exact-head authority. Resume #190 in its recorded worktree only after #209 is Done. Merge/synchronize through the sanctioned workflow and run normal final-byte registration/capture/class reviews before actual installed acceptance.

## Completion Contract

Issue #209 is complete only when the guarded production producer/composition repair passes its declared evidence and native delivery gates. It does not claim #190's positive installed journeys, expired original-budget submission, other OS readiness or whole #171/#141 acceptance. Those remain open until their own exact receipts pass.
