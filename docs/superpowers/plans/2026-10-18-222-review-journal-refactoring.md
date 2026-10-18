---
based_on_commit: 359a7dcea83c585541f18ab03de78fe2a0b0a317
revision_id: issue-222-plan-r1
---

# Review Moderator and Versioned Journal Refactoring Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver useful, reconstructable agent-review journals without execution-proof admission, while preserving safe process ownership and governed downstream planning.

**Architecture:** Retain the existing single-writer event journal, contextual document readers, process-instance checks and contained collateral writes. Separate finite measured process support from review approvals before altering its 117-file source closure. Add narrowly scoped versioned provenance, immutable manifests and reversible FUR diffs; external authoring/publication and downstream AITM retain their own permissions and responsibilities.

**Tech Stack:** Node.js >=24, ESM, `node:test`, Git, existing canonical JSON and atomic journal facilities, existing Claude launcher, JSON Schema documents with package-owned document-specific validation. Linux/macOS only; no new dependency is selected.

**Spec:** [2026-10-18-222-review-journal-refactoring-design.md](../specs/2026-10-18-222-review-journal-refactoring-design.md), exact accepted revision `issue-222-r13`, SHA-256 `f67d8a5c22b8a36537876aee529fe9dbc0530b7137650c28f144d7b9960ad5be`. Source acceptance: XPR `review-0b5e44367ed1ebf60276c5f385829029`, author `gpt-6-astra/high`, reviewer `claude-opus-5-5/high`.

**Plan metadata:** Draft 1; preparation owner #222 under #141, not an implementation child or approved native Plan. Writing basis `359a7dcea83c585541f18ab03de78fe2a0b0a317`. Owner explicitly accepted revision 13 and authorized this fresh plan. [Adoption and suitability record](../peer-reviews/222-spec-adoption/owner-adoption-r13.json). Keep accepted spec bytes unchanged despite the documented table-alignment warning. The retired orphan plan was not consulted and supplies no executable scope or estimates.

## Global Constraints

- Linux and macOS are the only supported runtime targets. Windows #213 remains indefinitely deferred, unscheduled and nonblocking. No Windows worker or native build.
- Preserve `review-2bdf5dd8ee56accc6e494643054a3cf1` and Claude session `1c82a9bc-d4dd-4d10-92b5-022615f0abcd` unchanged and unsettled. Never use them as test inputs or operate on them to complete this work.
- Preserve historical timing rows and every Unknown timing value. No backfill, inferred zero, repaired accounting, fabricated review acceptance, or deletion of prior evidence.
- Retain operation/query/portable/test budgets `30000/15000/5000/800000 ms` and portable concurrency cap four.
- Every executable cleanup story has an independently inspected human forecast of four hours or less, including routine review/verification/delivery. A budget is not evidence that the work fits it.
- For each executable cleanup child, independently enforce a four-hour cumulative agent-engagement limit across preparation, investigation, planning, implementation, debugging, review, verification, delivery, all agents, sessions and retries. No reset on rewrite, reassignment or supersession of substantially the same work.
- Pause passive external waits. Use defensible retained bounds for enforcement without repairing native Unknown values. If allowance cannot be established, stop for replanning. Stop at the boundary; a proven overrun fails/scraps that plan and preserves its work/evidence.
- Preserve #217's unapproved 9.5 human-hour/4.5 agent-hour forecast and retained 4037.9-second bound. Add all attributable subsequent work; this plan does not reset it. Prior SAR/XPR preparation, 1336-second prior allocation, 1368-second earlier native-window bound and 814.524-second latest native-window bound remain additional to other preparation/Unknown accounting; those are bounds, not native measured engagement or a complete ledger.
- AIPR and its review participants never stage, commit, push or implement the FUR. External authoring revises it; an authorized external publisher commits turn bundles. Implementation workers implementing AIPR are a separate development role.
- Preserve local role/session/turn authentication, one-writer transitions, expected revisions, atomic durability, exact retries and honest incomplete/unavailable states. No new attestation service, policy engine, general schema evaluator, sandbox or migration framework.
- No #107 activation/release, protected-session recovery, global upgrade, package publication, trunk merge, issue Close or broad existing-AC adoption is authorized by this draft.

## Review Focus

1. Dirty source at review creation, then unchanged/committed/discarded: compare effective contents and distinguish bookkeeping from changed context (Tasks 08–09).
2. Cross-pattern lineage with legacy predecessors and unavailable Git objects: reconstruct retained FUR bytes, expose gaps and require current-HEAD review when code suitability cannot be assessed (Tasks 13, 17, 20).
3. Publication racing a new reviewer turn or crashing after commit: exclusive publication windows and duplicate-safe external publication preserve decisions without launching conflicting turns (Tasks 14, 18).
4. Malicious/ambiguous collateral links and path renames: exact verified declarations cannot hide source/configuration/test changes (Tasks 09, 12–13).
5. Historical process seals and changed runtime source: usable replacement support must land before source-closure changes; uncertain ownership never authorizes takeover or duplicate launch (Tasks 03–05).

## Grounding, precedence and execution gates

The source was inspected at `359a7dc`. Git comparison from the revision-13 writing/review context `5546d80` shows only the accepted FUR and review collateral. The original available lineage context `db0febd` additionally contains the owner-authorized #223 Windows CI change, already present in later technical reviews. Current source behavior—not the orphan plan—grounds the file map below. The native v1 review lacks the future root/overlay contract; do not retroactively invent it. All referenced original commits currently resolve; the adoption record states these limits and the governing agent's suitability rationale.

**Explicit precedence clarification:** Accepted spec §5.2 describes a historical per-branch CI exception. The owner's later direct instruction and already committed #223 policy disable Windows CI globally. Tasks 01–02 preserve that stronger current direction; do not restore Windows defaults or add an old branch-only exception. This clarification does not edit accepted spec bytes. Exact capture/admission bindings for #221 remain separate until their own scoped adoption.

Live read-only backlog refresh found 40 open issues, including #214/#217–#221, #222, #223 and deferred #213. Neither #214 nor #217 has been superseded by this planning action. Live parent/ref observations: `feature/child/141` at `81e1d58`, trunk at `7a17a73`, remote planning branch at `d8f31d4`. These are snapshots, not execution authority. The local branch includes earlier integration work; no automatic rebase/reset/push of parent or trunk follows.

AITM currently binds #222 with a timer but Explain reports `state-unavailable` because Backlog has no move-complete sentinel. Keep that uncertainty. This owner-authorized document preparation does not repair provenance, advance the board or set a Plan-approval marker. Register/bind each eventual executable leaf through its owning workflow only after this plan's technical review, owner approval and independent forecast inspection. Prefix commit subjects with the actual registered issue number and run `npx aitm commit-trace <actual-issue>`; task labels below are not issue IDs.

### Work boundaries and delivery order

1. **Scoped preimplementation adoption and inventory:** Tasks 01, 03, 20.
2. **CI bootstrap and exact source-ref receipts:** Task 02; preserve #223 globally.
3. **Process contract/implementation and old-seal compatibility:** Tasks 03–05. Task 04 is an unactivated module; Task 05 delivers its real operational replacement. No later task may deliver a changed source-closure file before Task 05, or in a separate incomplete delivery before its usable behavior is available.
4. **Review-only roles and external revision handoff:** Task 15, based on the versioned contracts and journal work.
5. **Journal/provenance and collateral:** Tasks 06–14 and 16–19. Explicitly named in response to optional accepted-review suggestion **R2-F001**. Includes root/overlay capture, drift, response-v2, manifest-v2, lineage, reversible diffs, reconstruction and publication lifecycle. These modules also change the closure and therefore depend on Task 05's delivered separation.
6. **Backlog disposition and downstream registration/handoff:** Tasks 21–24.
7. **Aggregate verification:** Task 25.

All tasks are proposed independently reviewable leaves. Task 01's inventory/adoption records must enumerate every affected consumer and adopt replacement Scope/ACs before the specific leaf changes it; final backlog disposition is not permission to postpone those prerequisites. If discovery changes an interface, update this fresh plan and obtain its applicable review before affected work. Do not turn a discovery task into unlimited implementation.

### Provisional leaf forecasts

Estimates below include coding/documentation, meaningful focused verification, ordinary independent review and delivery preparation. They are planning hypotheses, **not independently inspected native forecasts** or a claim that any child has remaining engagement allowance. Preparation already attributable to substantially the same work must be charged before execution; where this makes a leaf exceed a cap, replan instead of assigning a new ID to reset it. Execution remains gated until evidence-backed independent inspection confirms each leaf fits. Passive hosted/provider waits are tracked separately.

| Task                                                                        | Human h | Agent engagement h | Depends on                                                                        |
| --------------------------------------------------------------------------- | ------: | -----------------: | --------------------------------------------------------------------------------- |
| 01: Inventory consumers and adopt the interim execution hold                |       2 |                  2 | Owner-adopted spec; reviewed/approved fresh plan                                  |
| 02: Verify the global POSIX CI bootstrap and future receipt bindings        |       1 |                  1 | 01; delivered #223 source policy                                                  |
| 03: Adopt finite process semantics and persisted-seal compatibility         |       2 |                  2 | 01–02                                                                             |
| 04: Build isolated finite process qualification and compatibility readers   |       3 |                  3 | 03                                                                                |
| 05: Wire usable observations and legacy-safe recovery atomically            |     3.5 |                3.5 | 04 plus scoped 03 adoption                                                        |
| 06: Retire proof-only admission consumers and retain useful journal readers |       3 |                  3 | Delivered05; each consumer adoption from01                                        |
| 07: Define and validate the new document/lifecycle contracts                |       3 |                  3 | 05–06                                                                             |
| 08: Capture bounded root and reviewer working contexts                      |       3 |                  3 | 05,07                                                                             |
| 09: Compare effective contexts with exact collateral exclusions             |       3 |                  3 | 08,07                                                                             |
| 10: Validate FUR revision identity and protected reviewer provenance        |       3 |                  3 | 07–09                                                                             |
| 11: Add new-format event projection with honest intermediate states         |       3 |                  3 | 07,10                                                                             |
| 12: Seal initial and layered acceptance manifests                           |       3 |                  3 | 08–11                                                                             |
| 13: Generate exact reversible diffs and cross-review links                  |       3 |                  3 | 07,10–12                                                                          |
| 14: Coordinate publication windows and pending external outcomes            |       3 |                  3 | 11–13                                                                             |
| 15: Activate review-only participants and external FUR handoff              |     3.5 |                3.5 | 10–14; adopted role/author issue contracts                                        |
| 16: Complete both response sides and acceptance acknowledgements            |     2.5 |                2.5 | 11–15                                                                             |
| 17: Reconstruct FUR history from final bytes after squash                   |       3 |                  3 | 12–13,16                                                                          |
| 18: Document and verify scoped external turn publication                    |       2 |                  2 | 14–17                                                                             |
| 19: Integrate read-only contracts, exports and portable package contents    |       3 |                  3 | 06–18                                                                             |
| 20: Deliver the pre-planning suitability decision procedure                 |       2 |                  2 | 01,09,12,17,19                                                                    |
| 21: Disposition the obsolete proof program without false completion         |       2 |                  2 | 01–06; scoped adoptions before affected edits                                     |
| 22: Reconcile role, journal and external consumer requirements              |       3 |                  3 | 01,15–20; owning consumers coordinated                                            |
| 23: Complete the remaining candidate census and aggregate obligations       |     2.5 |                2.5 | 01,21–22                                                                          |
| 24: Register the downstream AITM ownership and exact-context handoff        |       2 |                  2 | 01,19–23; downstream owning workflow available                                    |
| 25: Verify aggregate behavior and deliver exact-head evidence               |       3 |                  3 | All surviving implementation/disposition leaves and actual downstream obligations |

Provisional program sum: **67 human hours** and **67 agent-engagement hours**, before any additional scope discovery or rework beyond these task hypotheses. This is an aggregate program, not a single executable child. The withdrawn nine-leaf/25-hour proposal is not reused.

### File responsibility map

| Unit                                    | Existing integration points                                                                                                | New bounded responsibility                                                                                                                                                             |
| --------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Finite process qualification            | `src/protocol/process-source-assurance.mjs`, `process-identity.mjs`, `src/broker/portable-platform.mjs`, ownership callers | `src/protocol/process-source-qualification.mjs`: measured finite capabilities, not reviewer approval                                                                                   |
| Current journal contracts               | `events.mjs`, `reducer.mjs`, `store.mjs`, `compatibility-read.mjs`                                                         | `schemas/response-v2.json`, `manifest-v2.json`, `event-v3.json`, `protocol-v3.json`, explicit start/submit request-v2 contracts; fixed readers in `src/protocol/journal-contracts.mjs` |
| Working repository context              | `src/git/repository.mjs`                                                                                                   | `src/git/review-context.mjs`: bounded raw-byte observations; `src/protocol/review-drift.mjs`: effective comparisons                                                                    |
| Metadata and initial/acceptance records | `src/collateral/responses.mjs`, `src/manifest/render.mjs`, templates                                                       | `src/manifest/journal-v2.mjs`, `src/collateral/fur-revision.mjs`                                                                                                                       |
| Diffs and lineage                       | `src/protocol/record-lineage.mjs`, `src/collateral/paths.mjs`                                                              | `src/collateral/fur-diff.mjs`, `fur-history.mjs`; reuse old lineage readers unchanged                                                                                                  |
| Turn/publication state                  | `src/cli/run-core.mjs`, event reducer/store, CLI/MCP contracts                                                             | `src/protocol/review-publication.mjs`: journal-only window state, never Git mutation                                                                                                   |
| External workflow                       | Existing documented manual handoff                                                                                         | `docs/review-turn-publication.md`: authorized operator recipe with exact staged-byte checks; not auto-invoked by AIPR                                                                  |
| Pre-plan/downstream integration         | Governing operator and AITM issue workflow                                                                                 | `docs/review-plan-suitability.md`, `docs/superpowers/adoption/222-downstream-handoff.md`; no invented downstream issue ID                                                              |

New exports below are **proposed interfaces**, not claims they exist today. Keep them internal unless Task 19 explicitly exposes a read-only public operation. Paths without a leading repository name are relative to this AIPR checkout. Implementation tests create disposable repositories and never read or operate on the protected sessions.

### Shared data decisions for the bounded implementation

- Use `sha256:` plus 64 lowercase hex digits for raw-byte digests, consistent with existing records. Keep Git object IDs as full repository-native object IDs; validate against the bound repository, not a hard-coded 40-character assumption for new formats. Existing published schemas retain their actual old constraints.
- Context observation uses raw Git blob bytes for committed/index entries and raw file bytes (or symlink target bytes) for working entries. Record existence, type and Git-compatible mode. Sort contained relative paths before canonical JSON digesting with existing `encodeRequestCanonical`. Explicitly unavailable is a discriminated record with a reason, never an empty clean observation.
- Context capture is two matching bounded observations around FUR/HEAD reads; changing inventory/content/HEAD produces unavailable/retry without a manufactured root. Do not retain source contents in public collateral. Ignored untracked files, installed dependencies and external runtime state are outside scope.
- Effective working content overlays commit content. Index contents are separately observed bookkeeping; committing unchanged initial dirty contents is not a source change. The comparison universe includes tree changes between endpoints and the union of both overlays, not only currently dirty paths.
- New-format Markdown FURs are regular UTF-8 files; support exact LF/CRLF and missing terminal newline, tracked/untracked initial drafts and contained recorded renames. Non-Markdown/binary subject intake is explicitly unsupported until a separate adopted metadata representation exists. A symlink/hard-link escape is refused, not followed as a subject.
- Adopt patch format `ai-peer-review.fur-git-patch/v1`: Git full-index binary-capable patch bytes over a fixed virtual `FUR.md` path; actual old/new FUR paths are immutable manifest metadata. Generate from sealed byte inputs with `git diff --no-index --binary --full-index --no-ext-diff --no-textconv --unified=0`. Apply using `git apply --unidiff-zero` in an isolated temporary directory after verifying exact input digest, then verify exact result digest. Never use the user's index or source working tree for reconstruction. A result record requires successful forward and reverse round trips; zero-byte content changes and path-only changes have explicit empty payload semantics plus verified endpoint metadata.
- Distinguish participant acceptance, closing acknowledgement, collateral completeness, publication reservation and external publication outcome. None is inferred from another. Fixed package-owned readers select schema by document family, operation and identifier; no executable/remote schema selection and no new generic schema framework.

---

## Task 01: Inventory consumers and adopt the interim execution hold

**Dependencies:** Owner-adopted spec; reviewed/approved fresh plan.

**Files:** Create `docs/superpowers/adoption/222-consumer-inventory.json`, `222-scoped-adoptions.md` and `222-execution-hold.md`; read spec §5 candidate paths, package files/exports, installed consumers and all open issues. No production edits.

**Interfaces:** Consumes exact revision-13 digest and current issue/ref/package observations. Produces an inventory row per path/export/requirement: introducing owner/commit, live callers, shipped location, disposition, reason, cleanup task, scoped adoption and verifier.

- [ ] Requery open/closed issue bodies and dependencies, remote refs, actual installed package inventories and downstream importers. Record access failures as unavailable, not absence. Inspect `scripts/verify-extraction.mjs`, `scripts/verify-portable-consumers.mjs`, API/public exports and generated inventory users.
- [ ] Through the owning AITM workflow, record a scoped interim hold for proof-dependent #214/#217–#221 execution. A hold is not cancellation/Done or replacement AC adoption. If the sanctioned workflow cannot represent it, record the exact gap and stop dependent execution.
- [ ] Fill the candidate census without keyword deletion. Classify every runtime-proof, development approval, process observation, journal/lineage and CI consumer separately. Retain out-of-scope rows with reasons.
- [ ] Before each later leaf, record its exact replacement Scope/ACs, source-plan changes, interface consumer decisions and responsible owning approval. Do not treat spec adoption as adoption of all issue contracts.
- [ ] Verify read-back of each sanctioned mutation and all affected requirements have an owner. Review the inventory independently, commit only these records under the registered leaf issue, and trace that commit.

## Task 02: Verify the global POSIX CI bootstrap and future receipt bindings

**Dependencies:** 01; delivered #223 source policy.

**Files:** Inspect/modify only if required: `scripts/ci/verification-scope.mjs`, `scripts/ci/verify-project-receipts.mjs`, `.github/workflows/ci.yml`, `installed-portable-journeys.yml`, `docs/ci-verification.md`, `test/unit/windows-ci-deferral.test.mjs`, `test/unit/ci-receipts.test.mjs`.

**Interfaces:** Consumes actual registered leaf/source/target refs. Produces verified Linux/macOS worker selection and exact-source receipt mapping without changing #221 capture identity.

- [ ] Run `node --test test/unit/windows-ci-deferral.test.mjs test/unit/ci-receipts.test.mjs` before editing. Existing global #223 behavior may satisfy this task without a production diff.
- [ ] If a real gap exists, add a failing case for that specific leaf/detached/delivery-ref mapping, then preserve the global rule:

```js
assert.equal(
  resolveVerificationScope({
    eventName: 'workflow_dispatch',
    branch: 'trunk',
    requestedScope: 'all',
  }),
  'linux-macos'
);
```

- [ ] Keep `scopePlatforms('all')` historical receipt interpretation; it is not a scheduling option. Maintain exact repository/ref/SHA capture checks and exact-head receipt validation.
- [ ] Rerun focused tests and inspect all enabled workflow runner expressions. Verify no Windows allocation for push, PR, manual or detached tests. Do not trigger hosted CI to discover a bad Windows default.
- [ ] Before any later push/PR/integration, obtain authorized source/target refs and current POSIX prerequisite mapping. Commit a necessary fix or a verification record, independently review it, then trace. No parent/trunk push is implied.

## Task 03: Adopt finite process semantics and persisted-seal compatibility

**Dependencies:** 01–02.

**Files:** Create `docs/superpowers/adoption/222-process-observation-contract.md`; inspect `schemas/process-source-class-v1.json`, conformance/registration schemas, `src/protocol/process-source-contracts.json`, `process-identity.mjs` and ownership callers.

**Interfaces:** Produces a per-operation finite qualification table and old/new seal operation matrix that Tasks 04–05 implement. No production capability is enabled by a fixture or approval object.

- [ ] Select the conservative finite-support option in spec §5.3: Linux build `6.17.0-1022-azure`, x64, Node 24/26, absence and creation; Darwin `25.6.0`, arm64, Node 24/26, absence only. Record real probe semantic predicates and precision; other cases remain unavailable. Reconfirm these scopes against actual current evidence before adoption; do not widen them from OS labels.
- [ ] Define qualification as package-owned supported probe semantics plus observed matching OS/host/process facts, independent of reviewer acceptance, ledger approval or arbitrary journal-source digests. Preserve installed package integrity separately.
- [ ] Document every persisted `creationSource` v1 shape and in-flight owner operation. Old seals remain readable with original approval fields; only operations justified by their original semantics and current reliable observations stay supported. Uncertain/unsupported cases return Unknown with a compatible recovery path, never automatic seal conversion or takeover.
- [ ] Adopt v2 class/qualification and seal contracts before implementation; preserve v1 schemas/ledger bytes and Windows historical entries. Define precision, process-instance identity and same-host rules for each operation.
- [ ] Independently review the contract, its explicit exclusions and representative old-seal fixtures. Obtain scoped native adoption before Task 05 enters Develop; commit/trace the decision without claiming a runtime replacement exists yet.

## Task 04: Build isolated finite process qualification and compatibility readers

**Dependencies:** 03.

**Files:** Create `src/protocol/process-source-qualification.mjs`, `schemas/process-source-qualification-v2.json`, `schemas/process-source-seal-v2.json`, `test/unit/process-source-qualification.test.mjs`, `test/fixtures/process-source-v2.json`; leave existing operational selection untouched.

**Interfaces:** Exports `qualifyProcessSource({ host, probe, installedIntegrity }) -> { absence, creation }`, each capability `{status:"supported", semantics, precision}` or `{status:"unavailable",reason}`; `readCreationSourceSeal(value) -> {version,original,interpretation}` preserves original bytes.

- [ ] Add failing finite-scope tests using contract-approved host/probe fixtures; include unsupported build/architecture/Node, probe mismatch, forged fixture claims and macOS creation refusal.

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { qualifyProcessSource } from '../../src/protocol/process-source-qualification.mjs';
test('missing real probe cannot create support', () => {
  const result = qualifyProcessSource({
    host: { platform: 'linux' },
    probe: null,
    installedIntegrity: null,
  });
  assert.equal(result.absence.status, 'unavailable');
  assert.equal(result.creation.status, 'unavailable');
});
```

- [ ] Run `node --test test/unit/process-source-qualification.test.mjs`; confirm the missing new module or unsupported matching behavior fails for the intended reason.
- [ ] Implement fixed per-operation qualification from the adopted table, discriminated unsupported results and strict v1/v2 seal dispatch. No approval/review digest is consumed for new qualification. Pure qualification cannot manufacture actual child handles or host observations.
- [ ] Test unchanged v1 fields/precision and malformed/newer seal refusal. Prove fixture data cannot call the operational installed observer path.
- [ ] Rerun tests and commit/trace the unactivated module. It may deliver independently only if it neither changes the active closure nor alters current operational capability. Otherwise deliver it atomically with Task 05.

## Task 05: Wire usable observations and legacy-safe recovery atomically

**Dependencies:** 04 plus scoped 03 adoption.

**Files:** Modify `src/protocol/process-source-assurance.mjs`, `process-identity.mjs`, `src/broker/portable-platform.mjs`, `portable-ownership-core.mjs`, `portable-owner-lifecycle.mjs`, `ownership-election.mjs`, callers found in 01, source/qualification inventory generation; extend `test/unit/process-source-assurance.test.mjs`, `test/unit/portable-owner-lifecycle.test.mjs` and disposable ownership integration tests.

**Interfaces:** Consumes Task04 qualification; retains existing observation/reconciliation public results and unavailable semantics. Produces real supported observations without review-proof admission, original-seal-aware ownership checks and a coherently verified installed inventory.

- [ ] Pin failing regressions: a journal-source change must not invalidate an otherwise supported measured operation merely because the old 117-file digest changed; PID reuse, host mismatch, invisible probes, endpoint silence and uncertain descendants must refuse takeover.
- [ ] Run `node --test test/unit/process-source-assurance.test.mjs test/unit/portable-owner-lifecycle.test.mjs` and record the intended regression before wiring.
- [ ] Route actual supported OS probes/owned child handles through Task04's finite semantics. Remove new-operation dependence on `acceptance.reviewDigest`/`approvalDigest`; retain old readers for persisted seals. Keep process-instance precision and ownership membership checks at their callers.
- [ ] Update the active class/qualification inventory coherently with installed runtime identity. Verify real supported Linux/macOS cases, all excluded cases and old live-owner cases in disposable installations; preserve safe refusal where evidence is unavailable. No protected-session inputs and no native broker build.
- [ ] Run relevant ownership/owner-publication/installed journeys on supported hosts under existing budgets. A fixture pass is not real platform availability evidence. If supported behavior cannot be demonstrated, stop this delivery rather than ship accidental digest-based capability loss.
- [ ] Commit/review/trace and deliver this complete separation before Tasks 06 onward alter any closure member. Freeze the old ledger only as retained history, not active approval authority. Recheck remaining cumulative allowance before delivery.

## Task 06: Retire proof-only admission consumers and retain useful journal readers

**Dependencies:** Delivered05; each consumer adoption from01.

**Files:** Modify/retire actual active callers in `scripts/lib/runtime-review-lineage-proof.mjs`, `runtime-contract-evidence.mjs`, `scripts/check-runtime-contract-adoption.mjs`, `scripts/ci/prepare-contract-adoption.mjs`, extraction/consumer checks and `test/live/process-source/{authority,class-review,classes}.mjs`; preserve historical schemas/data and required external interfaces until consumer adoption.

**Interfaces:** Produces a consumer disposition report and ordinary current-journal validation path without producer proof. Existing v1 journals remain interpretable; external approval policy is not treated as product validation.

- [ ] Add an integration case that starts/inspects an ordinary current review without producer-image proof, proof publication or source-class review approval. Exercise actual callers, not file-text absence assertions.
- [ ] Run `node --test test/unit/runtime-review-lineage-proof.test.mjs test/unit/runtime-contract-adoption.test.mjs test/unit/runtime-contract-evidence.test.mjs` to establish existing behavior and a failing ordinary-path regression.
- [ ] Remove only proof-only active gates traced by01. Reuse journal/response interpretation where useful, preserve history and isolate legacy readers. Do not replace retired proof with an equivalently mandatory renamed receipt.
- [ ] Update packaging/extraction consumers and public export compatibility only under their scoped adoption. If a downstream interface remains live, keep it explicitly legacy or postpone its removal until the owning change lands.
- [ ] Verify valid pending/rejected journals are not forced into terminal acceptance manifests. Run focused behavior/integration tests and exact package-content inspection; independently review, commit/trace and record unresolved external owners.

## Task 07: Define and validate the new document/lifecycle contracts

**Dependencies:** 05–06.

**Files:** Create `schemas/response-v2.json`, `manifest-v2.json`, `event-v3.json`, `protocol-v3.json`, `schemas/start-request-v2.json`, `schemas/submit-turn-request-v2.json`, `src/protocol/journal-contracts.mjs`, `docs/review-journal-v2.md`, `test/unit/journal-contracts.test.mjs`; integrate contextual dispatch with `compatibility-read.mjs` without altering v1 definitions.

**Interfaces:** Exports `validateJournalDocument({family,operation,document}) -> {status:"valid"|"malformed"|"unsupported"|"incomplete",issues}`. Fixed families: response, manifest, event, protocol. New schema IDs use the corresponding `ai-peer-review.<family>/vN` identifiers; API response envelope stays separately contextual.

- [ ] Write failing fixtures for supported response-v2, initial/in-progress/acceptance manifest-v2, event-v3 and protocol-v3; unknown identifier, missing fields, nonacceptance, incompatible family/tag, cyclic/invalid data and incomplete records.

```js
assert.equal(
  validateJournalDocument({
    family: 'manifest',
    operation: 'inspect',
    document: { schema: 'ai-peer-review.manifest/v999' },
  }).status,
  'unsupported'
);
assert.equal(
  validateJournalDocument({
    family: 'response',
    operation: 'inspect',
    document: { schema: 'ai-peer-review.response/v2' },
  }).status,
  'malformed'
);
```

- [ ] Run `node --test test/unit/journal-contracts.test.mjs`; verify unsupported versus malformed failures before adding readers.
- [ ] Encode the spec's new fields and distinct participant-decision/collateral/publication states. Use bounded document-specific checks and existing canonical encoding, not `validateContract` as a general JSON Schema evaluator. Enumerate supported fields, IDs, digest/reference constraints and lifecycle invariants in the local schema docs.
- [ ] Preserve `manifest-v1` terminal-only semantics, response-v1 transport/API contextual selection and old event readers. Reader selection is package-owned; inputs cannot request remote schema/code.
- [ ] Run new contracts plus existing compatibility/manifest/response tests. Commit/review/trace the unactivated v2/v3 contract support; later tasks wire its mechanics, and activation waits for15.

## Task 08: Capture bounded root and reviewer working contexts

**Dependencies:** 05,07.

**Files:** Create `src/git/review-context.mjs`, `test/unit/review-context.test.mjs`; extend raw-byte Git access in `src/git/repository.mjs` only as needed.

**Interfaces:** Exports `captureReviewContext({cwd,furPath,declaredPaths,git}) -> {status:"available",head,branch,detached,overlay,digest}|{status:"unavailable",reason}`. Overlay contains sorted entries with path, existence/type/mode and separate index/working digests; no file contents are exported.

- [ ] Create disposable-repository tests with staged/unstaged source, executable bit, deletion, symlink target, tracked ignored file, untracked nonignored file and ignored dependency. A two-observation injected change must return unavailable.

```js
const a = captureReviewContext({ cwd, furPath: 'spec.md', declaredPaths: ['review.md'], git });
assert.equal(a.status, 'available');
assert.ok(a.overlay.entries.every((entry) => !Object.hasOwn(entry, 'contents')));
```

Here `cwd` is a newly initialized disposable Git repository, `git` is the real `createGitRepository()` extended by this task, and files are created by the test before capture. Do not use an existing review worktree.

- [ ] Run `node --test test/unit/review-context.test.mjs test/unit/repository.test.mjs`; establish intended capture failures first.
- [ ] Read committed/index blobs and working bytes with bounded, scrubbed Git commands and contained paths. Capture HEAD/FUR/path/type/mode/content twice and compare. Reject unmerged index/unsupported entries explicitly. Preserve clean versus unavailable and detached HEAD; never represent ignored external state as observed clean.
- [ ] Verify deletion versus unreadability, repeated stable captures, CRLF/missing-newline bytes, path race and no source contents in output. Use SHA-256 raw-byte digests, separately recording Git object IDs.
- [ ] Commit/review/trace focused passing results; no global drift engine or repository snapshot archive is introduced.

## Task 09: Compare effective contexts with exact collateral exclusions

**Dependencies:** 08,07.

**Files:** Create `src/protocol/review-drift.mjs`, `test/unit/review-drift.test.mjs`; reuse contained path checks and07 document readers.

**Interfaces:** Exports `compareReviewContexts({root,current,chain,readTreeEntry}) -> {status:"available",classification:"review-only"|"other",changedPaths,preexistingDirtyPaths,ancestry}|{status:"unavailable",reason}`. `chain` is the validated immutable path-declaration chain; `readTreeEntry({head,path})` returns raw-derived existence/type/mode/digest.

- [ ] Pin tests for initial dirty source unchanged, committed unchanged, discarded or edited; first three must distinguish evaluated content from commit/index bookkeeping. Include renamed FUR endpoints, a fake collateral path hiding source, another review's collateral, an unknown tree object and same-tree nonancestor heads.

```js
assert.equal(
  compareReviewContexts({ root, current: root, chain, readTreeEntry }).classification,
  'review-only'
);
const missing = compareReviewContexts({
  root: { status: 'unavailable', reason: 'object-missing' },
  current: root,
  chain,
  readTreeEntry,
});
assert.equal(missing.status, 'unavailable');
```

`root`, `chain` and `readTreeEntry` are produced from a disposable repository and Task07/08 valid records, not arbitrary asserted clean fixtures for operational decisions.

- [ ] Run `node --test test/unit/review-drift.test.mjs`; record failure of incorrect dirty-context comparison before implementation.
- [ ] Union tree-diff paths with both overlays, materialize effective states by overlaying working bytes on commit states, compare existence/type/mode/digest, and report bookkeeping separately. Derive exclusions from every validated linked declaration; never a directory or name resemblance.
- [ ] Preserve immutable original root; append informational divergence data, even for nonancestor equivalent trees. Missing/corrupt chain, ambiguous roles or unreadable state returns unavailable. This mechanical comparison makes no materiality/acceptance decision.
- [ ] Rerun cases including changes restored between endpoint observations: claim endpoint equality only, not a proof of all intervening commits. Commit/review/trace.

## Task 10: Validate FUR revision identity and protected reviewer provenance

**Dependencies:** 07–09.

**Files:** Create `src/collateral/fur-revision.mjs`, `test/unit/fur-revision.test.mjs`; extend `src/collateral/responses.mjs`, `test/unit/responses.test.mjs`, response templates/index and new-format submission metadata.

**Interfaces:** Exports `validateFurRevision({bytes,lineage}) -> {revisionId,basedOnCommit,digest}` or typed `AprError`. Extends `createResponseDraft`/`sealResponse` through explicit format selection and protected available/unavailable `reviewer_commit` metadata; legacy call semantics stay unchanged.

- [ ] Add failing cases for malformed/missing frontmatter, changed bytes retaining ID, earlier ID reused for different bytes, byte-identical retry and explicit legacy predecessor. Pin protected-field edit rejection in response-v2.

```js
assert.throws(
  () => validateFurRevision({ bytes: Buffer.from('# missing metadata'), lineage: [] }),
  { code: 'APR_FUR_METADATA_INVALID' }
);
```

- [ ] Run `node --test test/unit/fur-revision.test.mjs test/unit/responses.test.mjs` and verify intended failures.
- [ ] Validate new Markdown metadata without editing the FUR. Compare exact digest on reused IDs. Bind response subject revision/digest separately from author-introduced result. At reviewer submission capture08 context and compare against the acknowledged checkout/FUR; stale changes refuse and preserve original records.
- [ ] Render protected response-v2 metadata with `{status:'available',commit}` or `{status:'unavailable',reason}`. Same-worktree capture is valid; unadopted separate checkout is unsupported. Do not overload `artifact_commit` or legacy null.
- [ ] Rerun frontmatter, retry, provenance race and old response fixture tests. Update documented error recovery to external author/reviewer action; commit/review/trace.

## Task 11: Add new-format event projection with honest intermediate states

**Dependencies:** 07,10.

**Files:** Modify `src/protocol/events.mjs`, `reducer.mjs`, `service.mjs`, `store.mjs`; create `test/unit/journal-v3-lifecycle.test.mjs` and `test/helpers/journal-v3-fixture.mjs`; retain existing lifecycle tests.

**Interfaces:** The new test helper exports `acceptedDecisionEvents({closingAcknowledgement})`, a valid event-v3 sequence through reviewer acceptance with optional participant acknowledgement, created under the exact Task07 schemas with fixed disposable identities and deterministic timestamps. Produces event-v3/protocol-v3 projections for recorded participant decision, closing acknowledgement, sealed collateral, revision handoff and publication reservation/outcome. Reuses `atomicCreate`, `atomicWrite`, `withReviewLock` and expected revision; no second transition writer.

- [ ] Write failing sequences: acceptance without closing acknowledgement is a real decision with incomplete collateral; malformed events fail; duplicate exact handoff is idempotent; stale revisions and conflicting results refuse without history rewrite.
- [ ] Run `node --test test/unit/journal-v3-lifecycle.test.mjs test/unit/reducer.test.mjs`.
- [ ] Extend fixed new-format definitions/projection. Preserve old readers and existing event bytes. Publish transitions under one lock with explicit expected revision and durable writes; an interrupted seal is pending, never inferred completed.

```js
import { reduceEvents } from '../../src/protocol/reducer.mjs';
import { acceptedDecisionEvents } from '../helpers/journal-v3-fixture.mjs';
const state = reduceEvents(acceptedDecisionEvents({ closingAcknowledgement: false }));
assert.equal(state.decision.outcome, 'accepted');
assert.equal(state.collateral.status, 'incomplete');
assert.equal(state.publication.status, 'pending');
```

The fixture must pass the real new event validators and reducer; do not bypass required participants, identities or transitions to assert a literal result.

- [ ] Exercise write-failure/retry, simultaneous transitions and wrong session/role. Verify the existing lock/token ownership and containment checks remain effective.
- [ ] Run new and existing protocol tests, inspect persisted failure records and commit/review/trace. No acceptance is manufactured by the controller.

## Task 12: Seal initial and layered acceptance manifests

**Dependencies:** 08–11.

**Files:** Create `src/manifest/journal-v2.mjs`, `test/unit/journal-manifest-v2.test.mjs`; integrate with `src/manifest/render.mjs`, templates and store without replacing v1 renderer.

**Interfaces:** Exports `buildJournalManifest({state,context,prior}) -> manifestV2`, `sealJournalManifest({workspace,relative,model,expectedRevision}) -> {path,digest}`. Initial record is immutable; each linked cycle/acceptance record has exact paths, IDs, digests and prior-record identity.

- [ ] Pin failing initial-manifest-before-reviewer tests, capture races, repeated SAR/SPR/XPR acceptances with coincident SHAs, detached HEAD and incomplete-provenance observations.
- [ ] Run `node --test test/unit/journal-manifest-v2.test.mjs test/unit/manifest.test.mjs`; confirm v1 terminal fixtures remain byte-identical.
- [ ] Capture08 context and FUR consistently, then atomic-create the initial manifest before turn launch. Record the observed HEAD, not the commit that will later contain this manifest. Link subsequent immutable records rather than mutating a hashed predecessor.
- [ ] At acceptance capture actual current HEAD and09 comparison; preserve the root and append informational other-context records. Keep participant decision, acknowledgement and publication fields distinct. Missing overlay/HEAD is explicit incomplete provenance, not a fabricated value.
- [ ] Verify exact role/path declarations, wrong-link failures and retained historical schemas. Publish stable UTF-8 Markdown with documented machine-readable v2 metadata and commit/review/trace.

## Task 13: Generate exact reversible diffs and cross-review links

**Dependencies:** 07,10–12.

**Files:** Create `src/collateral/fur-diff.mjs`, `test/unit/fur-diff.test.mjs`; extend versioned lineage in `src/protocol/record-lineage.mjs` and test `test/unit/record-lineage.test.mjs`.

**Interfaces:** Exports `createFurDiff({predecessorBytes,resultBytes,predecessor,result,paths}) -> {bytes,metadata}` and `applyFurDiff({inputBytes,patchBytes,metadata,direction}) -> Buffer`. Direction is `forward` or `reverse`; metadata binds exact raw digests, revision identities, virtual-path patch format and actual FUR paths.

- [ ] Add byte-roundtrip tests covering CRLF, LF, no final newline, Unicode, empty content, path-only rename, dirty initial draft and corrupted input/patch. Preserve legacy predecessor ID only in manifest metadata, never rewrite old bytes.

```js
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import { createFurDiff, applyFurDiff } from '../../src/collateral/fur-diff.mjs';
const hash = (bytes) => `sha256:${createHash('sha256').update(bytes).digest('hex')}`;
const before = Buffer.from('---\nrevision_id: a\n---\r\ntext');
const after = Buffer.from('---\nrevision_id: b\n---\r\nchanged');
const d = createFurDiff({
  predecessorBytes: before,
  resultBytes: after,
  predecessor: { revisionId: 'a', digest: hash(before) },
  result: { revisionId: 'b', digest: hash(after) },
  paths: { predecessor: 'spec.md', result: 'spec.md' },
});
assert.deepEqual(
  applyFurDiff({
    inputBytes: after,
    patchBytes: d.bytes,
    metadata: d.metadata,
    direction: 'reverse',
  }),
  before
);
```

- [ ] Run `node --test test/unit/fur-diff.test.mjs test/unit/record-lineage.test.mjs`; first verify a deliberately lossy newline patch fails digest validation.
- [ ] Generate only from exact sealed inputs and the selected patch format. Use contained temporary files and scrubbed Git, never the subject index. Forward/reverse verify before durably declaring success. Explicit empty change result is allowed only for byte-identical content, with path metadata preserved.
- [ ] At cross-review intake require an origin or immutable predecessor review/publication manifest link. Differing bytes require a boundary diff; missing historical bytes/links mark a gap. Other author saves are not invented review cycles.
- [ ] Verify cross-pattern links, legacy predecessors and contradictory path declarations; commit/review/trace with no permanent initial/full-revision snapshot archive.

## Task 14: Coordinate publication windows and pending external outcomes

**Dependencies:** 11–13.

**Files:** Create `src/protocol/review-publication.mjs`, `test/unit/review-publication.test.mjs`; wire journal mutation service and bounded lifecycle actions in CLI/API contracts.

**Interfaces:** Exports `reservePublication({state,expectedRevision,publisherSession})`, `releasePublication({state,reservation,outcome})`, `canOpenReviewerTurn(state)`. Operations emit event-v3 records through the existing writer; they do not run Git.

- [ ] Pin races: reviewer turn open blocks publisher reservation; active reservation blocks reviewer launch; uncertain publish keeps reservation; exact outcome retry is idempotent; wrong session/revision refuses.

```js
assert.equal(canOpenReviewerTurn({ publication: { status: 'reserved' } }), false);
assert.equal(canOpenReviewerTurn({ publication: { status: 'released' } }), true);
```

- [ ] Run `node --test test/unit/review-publication.test.mjs`; add actual concurrent journal mutation tests, not just these pure checks.
- [ ] Reserve only a sealed-turn boundary or completed review. Keep deferred publication pending across subsequent sealed cycles without committing during an open reviewer turn. Explicit reconciliation is needed after uncertain publication; timeout is not success.
- [ ] Record external publication status and exact cycle-result digest without requiring a turn-commit SHA index. Keep arbitrary human Git changes possible but subject to stale reviewer checks.
- [ ] Test no Git writer is called by the product path using injected Git effects that throw on mutation. Commit/review/trace the lifecycle and recovery documentation.

## Task 15: Activate review-only participants and external FUR handoff

**Dependencies:** 10–14; adopted role/author issue contracts.

**Files:** Modify `src/cli/run-core.mjs`, `schemas/start-request-v2.json`, `schemas/submit-turn-request-v2.json`, `src/api/contracts.mjs`, startup/submission adapters, `templates/author-startup.md`, `reviewer-invitation.md`, installed skill and provider execution contract; tests `test/integration/no-commit.test.mjs`, `claude-launch-permissions.test.mjs`, new `test/integration/review-only-handoff.test.mjs`.

**Interfaces:** New starts use `ai-peer-review.start-request/v2` and revision submissions use `ai-peer-review.submit-turn-request/v2`, validated by fixed request-family readers alongside Task07 document checks. Explicit new-format handoff input `{reviewId,expectedRevision,priorDigest,resultReference,submittingSession}` is versioned separately from legacy submit. External author supplies result; AIPR validates/snapshots it, writes designated documentation and never applies source patches.

- [ ] Add a failing end-to-end new-format review where participants can write only their own response, an external author supplies changed FUR bytes, stale digest/version refuses, and an exact retry does not create another turn.
- [ ] Run `node --test test/integration/review-only-handoff.test.mjs`; verify legacy normal/no-commit records still follow their original compatible paths.
- [ ] Route new-format create/join/submit/finalize through07–14 and reconcile #118/#148–#150 author-capable assumptions through scoped adoption. Remove artifact-write instructions from participant roles; external revision remains available through the explicit handoff.
- [ ] Apply supported provider path restrictions via existing launcher tools only. Manual modes remain instruction-bound and report that truthfully. Do not handcraft broader Claude shell permissions or build a sandbox.
- [ ] Exercise real disposable Claude restrictions if the owner authorizes a live conformance run, plus automated interface tests; list supported launch/host enforcement levels. No claim of enforcement from mere compliance.
- [ ] Confirm no application/Git writes by AIPR in the ordinary path, run relevant legacy and new integration tests, commit/review/trace.

## Task 16: Complete both response sides and acceptance acknowledgements

**Dependencies:** 11–15.

**Files:** Modify new-format submission/finalization in `src/cli/run-core.mjs`, response generation and v3 projection; create `test/integration/review-cycle-collateral.test.mjs`.

**Interfaces:** Produces revision cycles with reviewer-on-N plus submitting-participant disposition-on-N/result-N+1, and acceptance cycles with reviewer acceptance plus unchanged-FUR acknowledgement. Native old v1 omission remains historical, not backfilled.

- [ ] Test actual accepted reviewer decision before closing acknowledgement, explicit unchanged-FUR response, missing response, abandoned cycle and exact retries.
- [ ] Run `node --test test/integration/review-cycle-collateral.test.mjs`; confirm the current early-terminal behavior fails the new-format completeness scenario.
- [ ] Generate the submitting participant's own acknowledgement draft under its declared response write scope. Do not author its prose or count acknowledgement as reviewer acceptance. Seal exact inputs and preserve pending/incomplete publication separately.
- [ ] Verify every response references the correct revision/digest and the cycle exposes both sides before complete publication eligibility. No silence/process exit/format validation supplies acceptance.
- [ ] Run lifecycle/response/manifest regressions, commit/review/trace and leave missing historical responses missing.

## Task 17: Reconstruct FUR history from final bytes after squash

**Dependencies:** 12–13,16.

**Files:** Create `src/collateral/fur-history.mjs`, `test/integration/fur-history-squash.test.mjs`; extend read-only lineage inspection and errors.

**Interfaces:** Exports `reconstructFurHistory({headBytes,manifest,readRecord,readPatch}) -> {status:"complete",revisions}|{status:"incomplete"|"corrupt",reason}`. `readRecord`/`readPatch` resolve only contained exact declared artifacts; reconstructed bytes are written only to an explicit separate output destination.

- [ ] Build a disposable repository with several revision cycles, two review patterns, a legacy predecessor and a later unreviewed head. Squash to a new parent, copy only final FUR/collateral tree into an object-independent repository, then reconstruct every retained revision.
- [ ] Run `node --test test/integration/fur-history-squash.test.mjs`; first remove a patch and assert incomplete rather than guessed reconstruction.
- [ ] Reverse uniquely named diffs from the manifest-bound retained head, verify each input/result digest and required revision ID, traverse immutable cross-review links and report which reconstructed versions were actually accepted.
- [ ] Cover corrupt patch/link/digest, non-FUR path escape, unsupported format and missing legacy intermediates. No dependency on original turn commits or independent archived FUR copies is allowed.
- [ ] Run in a separate temporary destination and prove the original FUR/records stayed byte-identical. Commit/review/trace the read-only reconstruct capability and documented scope limits.

## Task 18: Document and verify scoped external turn publication

**Dependencies:** 14–17.

**Files:** Create `docs/review-turn-publication.md`, `test/integration/review-turn-publication.test.mjs`; reuse existing temporary-repository helper patterns, not a new product Git-publishing service.

**Interfaces:** Produces an operator procedure consuming a reserved window and sealed cycle bundle and returning a verified publication outcome. AIPR records it through14; only the separately authorized publisher mutates Git.

- [ ] In a disposable fixture, rehearse ordered publication of two pending cycle results after the working FUR advanced. Verify exact staged blobs and dedicated commit contents; leave later working bytes intact.
- [ ] Document the exact sequence: bind/check registered development owner and publication reservation; verify predecessor/result/response/manifest/patch digests; refuse unrelated staged paths; stage only the declared bundle and exact cycle-result FUR; inspect tree; commit; read back committed digests; record outcome and safely release reservation.

```bash
git diff --cached --name-only -z
git show :docs/example-spec.md
git diff --cached --check
```

The recipe computes SHA-256 over the raw `git show` blob, checks against the cycle result, and compares the NUL-delimited staged-path set to the exact declared allowed set before `git commit`. It must not rely on terminal display for byte equality. For an earlier result use the sealed/reconstructed blob through `git hash-object -w --stdin` and `git update-index --cacheinfo` under the external authorization; never overwrite the later working FUR.

- [ ] Test commit failure, successful commit followed by lost outcome response, duplicate retry and reservation conflict. Recover by checking exact parent/tree/bundle identity; do not create a duplicate commit or release uncertain state on timeout.
- [ ] Test real Git effects only in disposable repositories and show product ordinary review paths never invoke this recipe. Commit/review/trace the procedure and behavior test; user repository publication remains a separately authorized external action.

## Task 19: Integrate read-only contracts, exports and portable package contents

**Dependencies:** 06–18.

**Files:** Modify `src/public-api.mjs`, CLI help/dispatch, `src/api/contracts.mjs`, `schemas/api-response-v2.json`, MCP operation routing, `package.json` files list only as required, runtime inventory/portable checks, install docs and the exact accepted-spec entry in `.prettierignore`; tests existing API/MCP/packaging suites plus `test/unit/journal-package-contract.test.mjs`.

**Interfaces:** Exposes only adopted read-only inspect/reconstruction and existing lifecycle operations under explicit API/MCP contract versions; no public external Git publisher. The new envelope uses `ai-peer-review.api-response/v2`; preserve existing API-v1 envelope and participant response-v1 contextual readers rather than extending their closed contracts silently. Packaged schemas/templates/docs match emitted identifiers and current runtime inventory.

- [ ] Add package-consumer tests reading valid/pending/rejected/unsupported new journals, old fixtures and response/API same-tag contexts through actual public entry points.
- [ ] Run `node --test test/unit/journal-package-contract.test.mjs` and relevant existing API tests; verify missing package assets fail before adding them.
- [ ] Ship required current/historical schemas and fixed readers. Remove retired proof-only exports only with01 consumer adoption; keep approved deprecated compatibility where still necessary. Update extraction/installed inventories coherently.
- [ ] Preserve the frozen accepted specification despite its known table-alignment warning: add only its exact path to `.prettierignore` with the revision-13 accepted SHA-256 comment, and verify its bytes against the adoption receipt. Do not add a directory-wide format exclusion or reformat accepted bytes silently. Verify CLI and MCP produce equivalent contextual results, safe paths, input bytes unchanged on inspection, and no remote/executable schema loading. Inspect actual portable package contents using the repository-supported portable pack flow, not raw `npm pack` source refusal bypass.
- [ ] Run packaging/API/MCP/installed Linux/macOS lanes under their existing budgets, record skipped native cases honestly, commit/review/trace.

## Task 20: Deliver the pre-planning suitability decision procedure

**Dependencies:** 01,09,12,17,19.

**Files:** Create `docs/review-plan-suitability.md` and `docs/superpowers/adoption/222-suitability-scenarios.md`; use mechanical comparison results, not a new drift engine or mandatory new CLI.

**Interfaces:** Consumes exact accepted FUR/layer identities, earliest available writing basis, available review roots/overlays and current observations. Produces a named-decider rationale bound to input digests and outcome `suitable` or `review-current-head-before-planning`.

- [ ] Document ordered checks: verify accepted bytes/layers; resolve original and accepting contexts; account for already-reviewed history; inspect current effective drift and dirty paths; evaluate requirements/interfaces/dependencies; record a named human/agent decision and reason.
- [ ] Rehearse procedural scenarios using real09 comparison outputs: collateral-only changes, irrelevant verified docs, dirty source unchanged/committed/discarded, already-reviewed old source differences, material changed API and missing original Git context after squash.
- [ ] For wide/material or unavailable context require current-HEAD spec review, necessary revisions and fresh recorded acceptance before plan generation. Do not loop solely because earliest-basis historical differences remain visible after later review. Do not claim automated tests prove semantic correctness of a materiality judgement.
- [ ] Verify each scenario records exact compared SHAs/observation identities/FUR digest and follows the expected workflow branch; an explicit missing input cannot be labelled mechanically clean.
- [ ] Obtain scoped preimplementation adoption of this operator procedure, independently review the scenario evidence and commit/trace. Native Plan approval remains separate.

## Task 21: Disposition the obsolete proof program without false completion

**Dependencies:** 01–06; scoped adoptions before affected edits.

**Files:** Update owning-workflow records for #214/#217–#221 and closed #216 history; create `docs/superpowers/adoption/222-proof-program-disposition.md`.

**Interfaces:** Produces exact keep/rewrite/supersede/split decisions and surviving dependencies with original contracts/timing preserved. No superseded issue is labelled implemented Done.

- [ ] Refresh all seven open proof-program issue bodies, dependencies, forecast/approval markers and parent aggregate requirements. Compare them with implemented consumer dispositions, not names alone.
- [ ] Prepare concrete replacement Scope/AC/source-plan/verification changes for each surviving requirement and retain original references. Use sanctioned `aitm issue-body`, creation and dependency verbs after fresh Explain; never raw `gh issue create` or arbitrary state jumps.
- [ ] Record the superseding product decision for closed #216 without rewriting historical adoption or reopening automatically. Preserve #217 forecast/timing and every Unknown.
- [ ] If there is no sanctioned cancellation/supersession state, record that workflow gap and stop the affected mutation; do not repurpose Done or silently remove blockers.
- [ ] Verify native read-back/dependency topology and exact parent obligations; independently review, commit/trace the durable disposition record. Final reconciliation does not excuse missing01 scoped adoption.

## Task 22: Reconcile role, journal and external consumer requirements

**Dependencies:** 01,15–20; owning consumers coordinated.

**Files:** Governed records for #118/#148–#150, #109/#152/#153, #142/#156/#157/#124, #30/#151/#197 and AITM #1939/#1944; create `docs/superpowers/adoption/222-consumer-dispositions.md`.

**Interfaces:** Produces retained/split/replacement consumer obligations and exact ownership links; AIPR delivery alone cannot complete downstream changes.

- [ ] Refresh each live body and source-plan pointer. Preserve measured metrics, recovery, package compatibility and identity/turn association while replacing execution-attestation claims and author artifact-write assumptions only where scoped adoption permits.
- [ ] Split surviving 25-hour #149/#151, 41.5-hour #157 and 12-hour AITM #1944 requirements into evidence-backed bounded proposals before registration; original estimates stay historical. Do not hide implementation inside a reconciliation leaf.
- [ ] Coordinate #197 export/read-only consumer requirements with AITM #1939/#1944 through the corresponding owning workflow. Keep a required external interface until its consumer actually changes.
- [ ] Verify every removed dependency has surviving scope assigned, every replacement has actual prerequisites and each producer/consumer decision has a verifier. Preserve original references and unavailable access.
- [ ] Independently review disposition evidence and sanctioned read-backs, commit/trace only records owned by this task. Cross-repository source implementation is not included.

## Task 23: Complete the remaining candidate census and aggregate obligations

**Dependencies:** 01,21–22.

**Files:** Governed issue records for #141/#107, #29/#31–#34/#130/#143/#146–#147/#154–#155/#210/#212 and every other currently open issue; create `docs/superpowers/adoption/222-complete-census.md`.

**Interfaces:** Produces a closed candidate census: each refreshed issue has a concrete relevant disposition or out-of-scope reason, surviving parent obligations/dependencies and a linked implementing owner where required.

- [ ] Compare the complete fresh open-issue listing with the inventory; do not rely on this document's initial count of40 after backlog changes.
- [ ] Amend surviving parent Scope/AC/source-plan/aggregate requirements only through scoped governed adoption. Removing proof obligations cannot weaken required process-safe behavior or activate107.
- [ ] Keep Windows213 indefinitely deferred and preserve global223 scheduling policy. Keep unrelated retrieval/learning/analytics/configuration work out of this program unless its actual consumer boundary changes.
- [ ] Verify every candidate's disposition, dependencies and history. New work requires bounded native registration; a spreadsheet or task label is not an issue.
- [ ] Independently review the census and read-backs, commit/trace and leave unresolved external/workflow gaps visibly open. No parent Close is authorized.

## Task 24: Register the downstream AITM ownership and exact-context handoff

**Dependencies:** 01,19–23; downstream owning workflow available.

**Files:** Create `docs/superpowers/adoption/222-downstream-handoff.md`; read AITM `scripts/task-tracker/verbs/plan-approve.mjs`, `lib/deep-dive-gate.mjs`, `verbs/mirror-deep-dive.mjs`, applicable pickup/rules and sanctioned creation tools in its owning repository. No AITM source changes in this AIPR leaf.

**Interfaces:** Produces an actual registered native AITM issue URL/number and dependency link, or explicit blocked registration state. Handoff binds accepted plan/spec/review identities, context records and owning workflow verification obligations.

- [ ] Prepare a bounded native AITM story owning context preservation during accepted-plan hydration and relevant drift evaluation during each story's just-in-time deep dive. Include exact producer/consumer fields and source references; do not invent an issue ID.
- [ ] Use the downstream repository's `scripts/gh/create-issue.mjs --shape ...` through its owning workflow only after authorization/binding/preflight. If missing authority/capability prevents registration, record the exact blocker and keep integration incomplete. Do not route a raw GitHub create around guards.
- [ ] Require downstream ACs for accepted-plan/spec/review linkage, current-code versus planning-basis comparison before implementation, rationale and scoped adjustment, and governed replanning on material invalidation. No global re-review is mandated for every post-hydration commit.
- [ ] Link the real issue/dependency back into AIPR's governed records and verify read-back. AIPR-side tests/inspection verify handoff presence/binding; downstream behavior is tested and accepted in that issue, not asserted here.
- [ ] Independently review/commit/trace the handoff. Do not claim aggregate downstream adoption until its actual owning-workflow verification is available. Hydration itself waits for accepted/approved implementation plan and explicit execution authority.

## Task 25: Verify aggregate behavior and deliver exact-head evidence

**Dependencies:** All surviving implementation/disposition leaves and actual downstream obligations.

**Files:** Create `docs/superpowers/adoption/222-final-verification.md`; existing CI/installed receipts, current journal suites, package consumers and complete disposition inventory. No generic verification framework.

**Interfaces:** Produces a requirement-to-evidence closure report for spec AC1–16 at the exact delivered source HEAD, with actual scope/host exclusions, missing receipts and downstream dependencies visible.

- [ ] Run full required local and portable checks on disposable records; initially use:

```bash
APR_SKIP_NATIVE_BROKER_TESTS=1 npm test
npm run test:slow
npm run test:packaging
npm run lint
npm run format:check
git diff --check
```

Confirm each suite's runtime requirements/budgets before execution. Native broker exclusions remain exclusions; never turn them into green native claims. New executable source and current-format docs must satisfy checks; immutable historical formatting exceptions remain explicitly documented.

- [ ] Obtain required exact-head Linux/macOS ownership, owner-publication, unit and installed receipt lanes under current CI scope. The seven-worker/35-record current policy is an observed baseline, not a reason to ignore any later adopted required lane. No Windows/native worker is authorized.
- [ ] Perform the full ordinary new-format review journey, changed/unchanged/acceptance cycles, current/historical record inspection, publication race/retry, effective code drift and object-independent squash reconstruction. Preserve every result and mismatch; do not substitute file-text tests for behavior.
- [ ] Reaudit process support and old/in-flight seals, complete package/external-consumer inventory, all candidate issue dispositions and actual downstream owning-workflow evidence. Acceptance records do not establish producer/provider execution proof.
- [ ] Independently review the whole delivered change, verify exact source/tree SHA and receipts through native Test/Review gates, commit/trace and request separately authorized integration/Close at the actual boundary. Missing external adoption/receipt remains open. No automatic107 activation, release or protected-session recovery.

## Specification coverage and self-review

| Accepted requirement                                                             | Implementation/verification owner                                                          |
| -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| §1–2 product purpose, complete consumer inventory; AC1/7/8                       | 01, 06, 19, 21–25                                                                          |
| §3 review-only boundary, external revisions, coordination; AC2/3/6               | 05, 10–16, 18–19, 25                                                                       |
| §4.1–4.2 contextual versions and unchanged history; AC4/5                        | 06–07, 10–13, 19                                                                           |
| §4.3 root/overlay/response/FUR/acceptance provenance; AC11/12                    | 08–12, 15–16                                                                               |
| §4.3 pre-plan suitability and post-hydration ownership; AC15/16                  | 09, 20, 24–25                                                                              |
| §4.4 cycles, diffs, immutable links and squash reconstruction; AC13/14           | 11–18                                                                                      |
| §4.5 minimization                                                                | 08–09, 12–13, 19                                                                           |
| §5.2 CI bootstrap with later owner-global223 precedence; AC9/10                  | 02, 25                                                                                     |
| §5.3 supported process observations, seal compatibility and atomic ordering; AC6 | 03–05 before all closure-changing work                                                     |
| §6 live backlog/external consumers and holds; AC8/16                             | 01, 21–24                                                                                  |
| §7 limits, protected records and truthful estimates; AC10                        | All tasks; forecast/attribution inspection before each native registration                 |
| §8 complete exact-head verification; §9 adoption and fresh planning              | 25, owner-adoption receipt, future native plan-review/approval boundary                    |
| Optional R2-F001 journal/provenance-and-collateral boundary                      | Explicit boundary5 and Tasks06–14/16–19; process separation precedes their closure changes |

Self-review checks: no orphan-plan reuse; no historical schema/data mutation; no runtime proof gate renamed as a journal; no current v1 provenance backfill; all proposed interfaces have a defining task; each of five Review Focus conditions has a named behavioral owner. Task labels/forecasts are provisional, not fabricated native issues/independent estimates. Governance/document-only tasks use concrete read-back/scenario verification instead of implementation-mirroring tests. Source tests use actual temporary repositories, journal transitions and supported probe cases. Remaining independent review must challenge task size and mechanical/lifecycle interfaces before native hydration.

## Handoff

This file is a fresh draft implementation plan from the exact owner-adopted revision13. It has not received technical plan acceptance, owner Plan approval or execution-method selection. The orphan plan remains retired. Next: review this draft and its estimates, revise under an explicit plan revision identity if needed, complete the chosen technical plan review, then obtain native Plan approval and register bounded execution issues through their owning workflows. No implementation, downstream hydration, existing-issue supersession or merge occurs merely because this document exists.

Recommended execution method after approval: **A. Subagent-driven**, with a fresh implementer and independent reviewer per registered leaf and whole-delivery review; journal/lifecycle/process interfaces justify that scrutiny. **B. Native**, one implementer in this session with independent whole-branch review, remains available if the owner chooses it. Do not infer execution authorization from selecting a review model or accepting the source specification.
