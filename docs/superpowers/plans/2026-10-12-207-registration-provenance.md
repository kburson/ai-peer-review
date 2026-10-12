# #207 Preserved Broker Registration Provenance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans. Root implements inline under existing full authorization; no implementer delegation or execution-method question.

**Goal:** Let current broker startup validate exact historical registration files without restoring obsolete executions.

**Architecture:** Historical reconciliation already validates the closed record identity and excludes authority inspection. Add the same derived in-memory registration_file metadata as ordinary results. The unchanged ownership snapshot consumer strips that metadata and compares exact stored bytes.

**Tech Stack:** Node 24/26, existing filesystem registration fixtures, native AITM lifecycle and exact-head hosted CI receipts.

**Spec:** docs/superpowers/specs/2026-10-11-202-preserved-review-history-design.md. This bounded defect repairs its existing producer/consumer contract; it adds no preservation policy or provider behavior.

## Scope and context

The selected unchanged broker failed with ERR_INVALID_ARG_TYPE at registrationSnapshotCurrent in bin/peer-review-broker.mjs:171, where path.basename received undefined. src/broker/registry.mjs returns a raw preserved registration but ordinary results include registration_file. #190 capture approval therefore timed out. All failed runs, successful signed controls, original registration bytes and sealed reviews remain preserved. This standalone prerequisite unblocks #190/#107 after delivered #202/#204.

## Plan Metadata

- Priority: P0
- Size: XS
- Estimate: 0.5 base human hours
- Labels: bug
- Execution: sole inline implementer under Full-Auto

## Story Intent

- **Beneficiary:** review authors starting current reviews while retaining old evidence
- **Capability:** reconcile inactive historical registrations with exact file provenance needed by safe broker ownership validation
- **Need:** the history result omits registration_file and currently aborts broker startup with an undefined path
- **Value or failure prevented:** completed review execution stays inactive and auditable without blocking current delivery

## Global Constraints

- Preserve target paths, journals, private bindings, responses and review decisions unchanged.
- History is permanent exclusion from execution; it never means accepted, abandoned, provider-settled or safely deleted.
- Keep canonical membership, closed identity, history snapshot and current ownership validation mandatory.
- Add provenance to the derived result only, never serialize it into an existing registration.
- No historical authority inspection, worker restoration, provider dispatch, selection/protection observation cache or runtime-image execution.
- Host TIA only; complete suites use exact-head hosted CI receipts. Native builds remain disabled and original deadlines unchanged.
- Repack/install only delivered current selected code; compatible existing helper evidence is retained rather than rebuilt.

## Review Focus

1. A preserved registration whose workspace/runtime no longer exists retains file provenance without authority inspection or restored execution.
2. A malformed historical closed identity still refuses before ownership admission.
3. Mixed ordinary and historical records preserve ordinary current-authority checks.
4. Reconciliation never changes original stored bytes; the snapshot consumer reconstructs them after dropping the derived field.
5. Preserved registration names must still match their closed review IDs, and an unsafe registration store still refuses.

## Task 1: Preserve derived registration file provenance

### Story Intent

- **Beneficiary:** review authors starting current reviews while retaining old evidence
- **Capability:** supply exact historical registration file provenance to the existing broker snapshot guard
- **Need:** current history results omit the file path consumed by ownership validation
- **Value or failure prevented:** obsolete execution remains inactive while safe current startup succeeds

**Files:** Modify src/broker/registry.mjs and test/unit/broker-registry.test.mjs. Keep bin/peer-review-broker.mjs unchanged; its existing contract is correct. Retain existing review-history-restoration/history controls.

**Interfaces:** reconcileRegistrations({project,store,inspectAuthority,isPreserved,isPreservedRegistration}) returns registrations with derived registration_file in both historical and ordinary branches. The field is the actual file assembled from the validated canonical store and name. Historical result creation follows existing closed identity/file-name checks. The consumer continues removing registration_file before comparing the serialized record.

- [ ] **Step 1: Add the real missing-provenance regression using the existing fixture.**

```js
const value = fixture(t);
const workspace = path.join(
  value.project.physicalRoot,
  '.scratch',
  'peer-review',
  'reviews',
  'historical'
);
mkdirSync(workspace, { recursive: true });
const registered = registerReview(
  { project: value.project, requestDigest: DIGEST_A, workspace, runtime: value.image },
  value.store
);
const original = readFileSync(registered.registration_file, 'utf8');
rmSync(workspace, { recursive: true });
rmSync(value.image.root, { recursive: true });
const result = await reconcileRegistrations({
  project: value.project,
  store: value.store,
  isPreservedRegistration: (file) => file === registered.registration_file,
  inspectAuthority: async () => {
    throw Error('Historical authority inspection attempted');
  },
});
assert.equal(result.length, 1);
assert.equal(
  path.basename(result[0].registration_file),
  path.basename(registered.registration_file)
);
const { registration_file, ...record } = result[0];
assert.equal(registration_file, registered.registration_file);
assert.equal(JSON.stringify(record) + '\n', original);
assert.equal(readFileSync(registered.registration_file, 'utf8'), original);
```

Run `node --test --test-name-pattern='historical registration retains exact file provenance' test/unit/broker-registry.test.mjs`.
Expected: FAIL with undefined path in path.basename before the implementation. Missing historical workspace/image must not trigger authority inspection; this fixture data grants no operational authority.

- [ ] **Step 2: Make the minimal result-contract repair.**

In the already validated isPreservedRegistration(file) branch, replace the raw result insertion with:

```js
registrations.set(registration.review_id, { ...registration, registration_file: file });
```

Run the same regression. Expected: PASS; the unchanged snapshot-consumer inputs now have their exact file provenance, stored bytes remain unchanged and the inspector is never called.

- [ ] **Step 3: Add targeted history/current identity controls.**

Use the existing registration fixture to reconcile one preserved record and one current record. The current inspector must receive only the current workspace and return the fixture's exact active request/runtime/event/output authority. Both results must retain their actual registration_file and unchanged bytes. Add literal negative mutations to the historical raw record: unknown key and a review_id differing from its file name. Require APR_BROKER_REGISTRATION_RECOVERY_REQUIRED. Existing unsafe-store/symlink and current missing/ambiguous authority controls remain mandatory. These tests protect validation and exclusion behavior, not framework internals.

Run `node --test test/unit/broker-registry.test.mjs test/unit/review-history-restoration.test.mjs test/unit/review-history.test.mjs`.
Expected: all targeted controls PASS, no provider or native helper build.

- [ ] **Step 4: Verify, commit and publish the draft PR.**

Run changed-file ESLint/CSpell/Prettier and git diff --check, then commit `[#207] Preserve historical registration file provenance`. Native commit-trace 207 records the exact HEAD. Push origin and open a draft PR based on trunk without closing keywords.
Expected: local affected controls and formatting pass; complete hosted CI is still distinct pending evidence until real receipts are downloaded.

- [ ] **Step 5: Complete governed delivery and actual recovery.**

Run complete CI at the final SHA and validate downloaded receipts using node scripts/ci/verify-receipts.mjs. Apply native AITM Test/Review/Full-Auto delivery and close gates, with fresh exact-head review/merge authority. Repack the delivered code and install into the selected runtime while retaining compatible existing helper evidence. Verify actual broker startup with the preserved historical registration store, then return to #190 and run a genuine complete new capture attempt. Preserve all older failed attempts and current proof references.
Expected: native issue delivery succeeds only with actual evidence; broker safely starts without restoring history. No partial capture run or fixture is promoted to installed/source authority.

## Verification and execution authority

Use .superpowers/sdd/2026-10-12-207-registration-provenance/progress.md with this plan identity, actual RED/GREEN logs and any rulings. Root remains sole owner and implements inline. Native Plan approval and story intent remain required. User full authorization supplies the existing execution choice; no routine confirmation is requested.
