---
based_on_commit: cd92ab1bee76b43fab0e743c259901ab16b2d844
revision_id: issue-222-plan-r2
---

# Review Moderator and Versioned Journal Refactoring Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver useful, reconstructable agent-review journals without execution-proof admission, while preserving safe process ownership and governed downstream planning.

**Architecture:** Retain the existing single-writer event journal, contextual document readers, process-instance checks and contained collateral writes. Separate finite measured process support from review approvals before altering its 117-file source closure. Add narrowly scoped versioned provenance, immutable manifests and reversible FUR diffs; external authoring/publication and downstream AITM retain their own permissions and responsibilities.

**Tech Stack:** Node.js >=24, ESM, `node:test`, Git, existing canonical JSON and atomic journal facilities, existing Claude launcher, JSON Schema documents with package-owned document-specific validation. Linux/macOS only; no new dependency is selected.

**Spec:** [2026-10-18-222-review-journal-refactoring-design.md](../specs/2026-10-18-222-review-journal-refactoring-design.md), exact accepted revision `issue-222-r13`, SHA-256 `f67d8a5c22b8a36537876aee529fe9dbc0530b7137650c28f144d7b9960ad5be`. Source acceptance: XPR `review-0b5e44367ed1ebf60276c5f385829029`, author `gpt-6-astra/high`, reviewer `claude-opus-5-5/high`.

**Plan metadata:** Draft 2; preparation owner #222 under #141, not an implementation child or approved native Plan. Writing basis `cd92ab1bee76b43fab0e743c259901ab16b2d844`. Source suitability was recorded at `359a7dc`; only plan/adoption documentation changed since then. Owner explicitly accepted revision 13 and authorized this fresh plan. [Adoption and suitability record](../peer-reviews/222-spec-adoption/owner-adoption-r13.json). Keep accepted spec bytes unchanged despite the documented table-alignment warning. The retired orphan plan was not consulted and supplies no executable scope or estimates.

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
3. **Process contract/implementation and old-seal compatibility:** Task 03 contract,04 qualification,05A Linux adapter and 05B Darwin/seal adapter precede05C atomic operational integration. Task 04 and 05A/05B remain inactive until05C delivers their real replacement. No later task may deliver a changed source-closure file before 05C, or in a separate incomplete delivery before its usable behavior is available.
4. **Review-only roles and external revision handoff:** 15A assets then15B activation and 16 acknowledgement, based on the versioned contracts and journal work.
5. **Journal/provenance and collateral:** 06,07A–07C,08–14,16–18 and 19A–19C. Explicitly named in response to optional accepted-review suggestion **R2-F001**. Includes root/overlay capture, drift, response-v2, manifest-v2, lineage, reversible diffs, reconstruction and publication lifecycle. These modules also change the closure and therefore depend on 05C's delivered separation.
6. **Backlog disposition and downstream registration/handoff:** 21,22A–22C,23A–23B and 24.
7. **Aggregate verification:** 25A local,25B portable and 25C final reconciliation.

All tasks are proposed independently reviewable leaves. Task 01's inventory/adoption records must enumerate every affected consumer and adopt replacement Scope/ACs before the specific leaf changes it; final backlog disposition is not permission to postpone those prerequisites. If discovery changes an interface, update this fresh plan and obtain its applicable review before affected work. Do not turn a discovery task into unlimited implementation.

### Task-size gate and full human estimates

Only the numbered leaf tasks in this revision are executable planning units. Family labels05/07/15/19/22/23/25 are no longer standalone tasks; their named A/B/C children replace them. Each leaf has one deliverable, exclusive write ownership, verification and an explicit human estimate below four hours. These forecasts include engineering/document work, verification, independent review and delivery preparation; they are provisional until independently inspected in the owning workflow. Do not add hidden "integration" work to a leaf, rename work to reset prior engagement, or start a leaf whose attributable preparation leaves inadequate remaining agent allowance.

If inspection shows a leaf cannot fit **4 human hours total**, split its deliverable before registration/Develop and revise this plan and dependencies. At execution, stop and replan when the forecast is invalid; the four-hour ceiling is not permission to compress evidence or run over. Agent engagement remains a separate cumulative four-hour cap, independently forecast/charged before execution; this revision removes the prior unsupported automatic one-to-one human/agent estimate. Historical estimates and Unknown values remain unchanged. Passive hosted/provider waits are excluded from active human/agent effort and recorded separately.

| Leaf                                                                        | Engineering/docs h | Verification h | Review h | Delivery h | Total human h | Prerequisites                      |
| --------------------------------------------------------------------------- | -----------------: | -------------: | -------: | ---------: | ------------: | ---------------------------------- |
| 01: Inventory consumers and adopt the interim execution hold                |                  1 |            0.5 |     0.25 |       0.25 |         **2** | Approved plan / owner-adopted spec |
| 02: Verify the global POSIX CI bootstrap and future receipt bindings        |                0.4 |            0.2 |      0.2 |        0.2 |         **1** | 01                                 |
| 03: Adopt finite process semantics and persisted-seal compatibility         |                  1 |            0.5 |     0.25 |       0.25 |         **2** | 01, 02                             |
| 04: Build isolated finite process qualification and compatibility readers   |                1.5 |            0.5 |      0.5 |        0.5 |         **3** | 03                                 |
| 05A: Implement isolated Linux probe observations                            |                1.5 |            0.5 |      0.5 |        0.5 |         **3** | 04                                 |
| 05B: Implement Darwin observations and preserve old ownership seals         |                1.5 |            0.5 |      0.5 |        0.5 |         **3** | 04                                 |
| 05C: Activate usable process observations and inventory atomically          |               1.75 |           0.75 |      0.5 |        0.5 |       **3.5** | 05A, 05B                           |
| 06: Retire proof-only admission consumers and retain useful journal readers |                1.5 |            0.5 |      0.5 |        0.5 |         **3** | 05C                                |
| 07A: Define response and manifest v2 validators                             |               1.25 |            0.5 |      0.5 |       0.25 |       **2.5** | 05C                                |
| 07B: Define event, protocol and explicit handoff contracts                  |                1.5 |            0.5 |      0.5 |        0.5 |         **3** | 05C                                |
| 07C: Integrate fixed contextual journal dispatch                            |               0.75 |           0.25 |     0.25 |       0.25 |       **1.5** | 07A, 07B                           |
| 08: Capture bounded root and reviewer working contexts                      |                1.5 |            0.5 |      0.5 |        0.5 |         **3** | 05C                                |
| 09: Compare effective contexts with exact collateral exclusions             |                1.5 |            0.5 |      0.5 |        0.5 |         **3** | 08, 07C                            |
| 10: Validate FUR revision identity and protected reviewer provenance        |                1.5 |            0.5 |      0.5 |        0.5 |         **3** | 08, 07C                            |
| 11: Add new-format event projection with honest intermediate states         |                1.5 |            0.5 |      0.5 |        0.5 |         **3** | 07C, 10                            |
| 12: Seal initial and layered acceptance manifests                           |                1.5 |            0.5 |      0.5 |        0.5 |         **3** | 08, 09, 11                         |
| 13: Generate exact reversible diffs and cross-review links                  |                1.5 |            0.5 |      0.5 |        0.5 |         **3** | 07C, 10                            |
| 14: Coordinate publication windows and pending external outcomes            |                1.5 |            0.5 |      0.5 |        0.5 |         **3** | 11, 13                             |
| 15A: Prepare versioned review-only prompts and provider constraints         |               1.25 |            0.5 |      0.5 |       0.25 |       **2.5** | 07C, 10                            |
| 15B: Activate the external revision handoff and reviewer boundary           |               1.75 |           0.75 |      0.5 |        0.5 |       **3.5** | 14, 15A                            |
| 16: Complete both response sides and acceptance acknowledgements            |               1.25 |            0.5 |      0.5 |       0.25 |       **2.5** | 15B                                |
| 17: Reconstruct FUR history from final bytes after squash                   |                1.5 |            0.5 |      0.5 |        0.5 |         **3** | 12, 13                             |
| 18: Document and verify scoped external turn publication                    |                  1 |            0.5 |     0.25 |       0.25 |         **2** | 14, 17                             |
| 19A: Expose the read-only public journal and API contracts                  |               1.25 |            0.5 |      0.5 |       0.25 |       **2.5** | 06, 15B, 17                        |
| 19B: Wire CLI and MCP parity for journal inspection                         |               1.25 |            0.5 |      0.5 |       0.25 |       **2.5** | 19A, 15B                           |
| 19C: Verify portable package closure and immutable format exceptions        |               1.25 |            0.5 |      0.5 |       0.25 |       **2.5** | 18, 19B, 20                        |
| 20: Deliver the pre-planning suitability decision procedure                 |                  1 |            0.5 |     0.25 |       0.25 |         **2** | 01, 09, 12, 17                     |
| 21: Disposition the obsolete proof program without false completion         |                  1 |            0.5 |     0.25 |       0.25 |         **2** | 01, 06                             |
| 22A: Reconcile review roles and measured participant requirements           |                  1 |            0.5 |     0.25 |       0.25 |         **2** | 16, 20                             |
| 22B: Reconcile journal, recovery and installed-release requirements         |                  1 |            0.5 |     0.25 |       0.25 |         **2** | 19C                                |
| 22C: Coordinate the external publication consumer obligations               |                  1 |            0.5 |     0.25 |       0.25 |         **2** | 19B, 20                            |
| 23A: Consolidate parent obligations and the final candidate census          |                  1 |            0.5 |     0.25 |       0.25 |         **2** | 21, 22A, 22B, 22C, 23B             |
| 23B: Disposition the remaining unrelated and deferred candidates            |                  1 |            0.5 |     0.25 |       0.25 |         **2** | 01, 21                             |
| 24: Register the downstream AITM ownership and exact-context handoff        |                  1 |            0.5 |     0.25 |       0.25 |         **2** | 19C, 20, 22C                       |
| 25A: Verify local aggregate behavior and specification coverage             |               1.25 |            0.5 |      0.5 |       0.25 |       **2.5** | 19C, 20, 23A                       |
| 25B: Collect exact-head Linux/macOS installed and ownership evidence        |               1.25 |            0.5 |      0.5 |       0.25 |       **2.5** | 19C, 18                            |
| 25C: Reconcile final evidence and prepare governed delivery                 |                  1 |            0.5 |     0.25 |       0.25 |         **2** | 24, 25A, 25B                       |

**37 executable leaf tasks; maximum 3.5 human hours per leaf; provisional aggregate 92.5 human hours.** The aggregate grows from 67 hours because splitting broad work adds separately visible review, verification and delivery effort. Do not present the aggregate as one task or claim an elapsed-time speedup without actual worker/host/approval availability.

### Dependency waves and safe parallel work

| Wave | Newly eligible work (subject to worker slots) | Barrier / integration note                                                              |
| ---- | --------------------------------------------- | --------------------------------------------------------------------------------------- |
| 01   | 01                                            | Serial prerequisite                                                                     |
| 02   | 02                                            | Serial prerequisite                                                                     |
| 03   | 03                                            | Serial prerequisite                                                                     |
| 04   | 04                                            | Serial prerequisite                                                                     |
| 05   | 05A, 05B                                      | Disjoint leaves can overlap                                                             |
| 06   | 05C                                           | Deliver usable process separation before later source work                              |
| 07   | 06, 07A, 07B, 08                              | Disjoint leaves can overlap                                                             |
| 08   | 07C, 21                                       | One integration owner per shared file set; Disjoint leaves can overlap                  |
| 09   | 09, 10, 23B                                   | Disjoint leaves can overlap                                                             |
| 10   | 11, 13, 15A                                   | One integration owner per shared file set; Disjoint leaves can overlap                  |
| 11   | 12, 14                                        | One integration owner per shared file set; Disjoint leaves can overlap                  |
| 12   | 15B, 17                                       | One integration owner per shared file set; Disjoint leaves can overlap                  |
| 13   | 16, 18, 19A, 20                               | One integration owner per shared file set; Disjoint leaves can overlap                  |
| 14   | 19B, 22A                                      | Disjoint leaves can overlap                                                             |
| 15   | 19C, 22C                                      | One integration owner per shared file set; Disjoint leaves can overlap                  |
| 16   | 22B, 24, 25B                                  | Disjoint leaves can overlap; Freeze evidence source;25C revalidates final delivery HEAD |
| 17   | 23A                                           | One integration owner per shared file set                                               |
| 18   | 25A                                           | Serial prerequisite                                                                     |
| 19   | 25C                                           | One integration owner per shared file set                                               |

These are earliest dependency layers, **not compulsory all-worker barriers**. A leaf may start as soon as its own listed prerequisites are reviewed/delivered and its native approvals/forecast gates pass; it need not wait for unrelated work in the same row. Three implementation workers plus one integration/orchestration owner is the default scheduling ceiling. This is a scheduling choice, separate from the unchanged portable runtime concurrency cap four. Any four-task row is scheduled as three concurrent workers plus the remaining leaf when a slot opens; the integration owner stays reserved for coordination and shared-file review.

- Each worker uses a suitable isolated managed worktree rooted at the declared integration checkpoint. No parallel writers in the same checkout, shared index, timer binding or native review session. This plan does not create workers/worktrees now or choose their models.
- The integration owner alone merges reviewed leaf commits. Each shared-file integration leaf has one designated writer, which may be an assigned worker in an isolated worktree. Different integration leaves may overlap only when their declared files are disjoint; leaves sharing runtime/API/template/packaging/census files are serialized by the explicit dependencies. Sibling modules/schema families own disjoint files; if discovery adds a shared path, reassign to the integrator or serialize it before editing.
- Wave completion never grants issue-state advancement. Register/bind actual issues and use their own one-step workflow; read-only reference to another issue does not authorize its mutation.
- **Mandatory process barrier:**05C is delivered with all adopted finite capabilities and old-seal behavior usable before any later closure-changing task.05A/05B are inactive new modules and cannot deliver partial active selection. No parallel path bypasses05C.
- **Single-writer integrations:**07C contextual registry;11 event projection/store;12 manifest projection;15B/16 controller sequencing;19A API contracts then19B transport;19C package inventories;23A parent/census;25C final source/evidence binding. Sibling workers do not cherry-pick changes into these files themselves.
- **Downstream/verification barriers:**24 registers/links actual AITM ownership but does not claim downstream behavior complete.25C waits for real required owning-workflow evidence.25B receives a frozen delivery source SHA; if any later source changes, the integration owner determines which receipts must be refreshed. No worker updates source while claiming existing exact-head evidence remains current.
- Per-leaf independent review can overlap implementation of disjoint eligible leaves. Shared-port/service/platform probes and high-cost suites are scheduled by the integration owner so concurrent test processes do not exceed budgets or contaminate fixture ports; all repositories/processes used are disposable, never protected sessions.

### Parallel ownership examples

| Eligible leaves                                    | Disjoint write sets                                                                                                 | Integration handoff                                                                       |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| 05A / 05B                                          | Linux adapter versus Darwin/seal adapters and separate tests                                                        | 05C alone activates callers and coherent inventory                                        |
| 06 / 07A / 07B / 08                                | Proof-consumer scripts versus response/manifest schemas versus lifecycle/request schemas versus Git/context capture | 07C integrates schema dispatch; other owners keep these source sets separate              |
| 11 / 13 / 15A                                      | Event/store projection versus diff/lineage core versus inactive versioned role assets                               | 12/14 then15B consume reviewed interfaces; no concurrent active template/controller edits |
| 12 / 14                                            | Manifest renderer/template versus standalone publication-state operations                                           | Both reuse11 completed store/event interfaces without modifying them                      |
| 15B / 17                                           | Active controller/API request wiring versus independent read-only reconstruction module                             | 19A waits for both before exposing the public API                                         |
| 16 / 18 / 19A / 20                                 | Response/controller completion versus publisher recipe versus read-only public API versus suitability procedure     | Three workers maximum; controller/API files remain explicitly separate                    |
| 22A / 22B / 22C / 23B (when individually eligible) | Nonoverlapping issue sets and separate disposition files                                                            | 23A alone consolidates parent obligations and final census                                |

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

New exports below are **proposed interfaces**, not claims they exist today. Keep them internal unless 19A explicitly exposes a read-only public operation. Paths without a leading repository name are relative to this AIPR checkout. Implementation tests create disposable repositories and never read or operate on the protected sessions.

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

**Prerequisite leaves:** Owner-adopted specification and approved fresh plan.

**Total human estimate: 2 hours (maximum 4).** Engineering/docs 1h; verification 0.5h; independent review 0.25h; delivery 0.25h. Includes the complete task; no hidden integration allowance. Independently inspect the forecast and attributable agent allowance before native registration/execution.

**Files:** Create `docs/superpowers/adoption/222-consumer-inventory.json`, `222-scoped-adoptions.md` and `222-execution-hold.md`; read spec §5 candidate paths, package files/exports, installed consumers and all open issues. No production edits.

**Interfaces:** Consumes exact revision-13 digest and current issue/ref/package observations. Produces an inventory row per path/export/requirement: introducing owner/commit, live callers, shipped location, disposition, reason, cleanup task, scoped adoption and verifier.

- [ ] Requery open/closed issue bodies and dependencies, remote refs, actual installed package inventories and downstream importers. Record access failures as unavailable, not absence. Inspect `scripts/verify-extraction.mjs`, `scripts/verify-portable-consumers.mjs`, API/public exports and generated inventory users.
- [ ] Through the owning AITM workflow, record a scoped interim hold for proof-dependent #214/#217–#221 execution. A hold is not cancellation/Done or replacement AC adoption. If the sanctioned workflow cannot represent it, record the exact gap and stop dependent execution.
- [ ] Fill the candidate census without keyword deletion. Classify every runtime-proof, development approval, process observation, journal/lineage and CI consumer separately. Retain out-of-scope rows with reasons.
- [ ] Before each later leaf, record its exact replacement Scope/ACs, source-plan changes, interface consumer decisions and responsible owning approval. Do not treat spec adoption as adoption of all issue contracts.
- [ ] Verify read-back of each sanctioned mutation and all affected requirements have an owner. Review the inventory independently, commit only these records under the registered leaf issue, and trace that commit.

## Task 02: Verify the global POSIX CI bootstrap and future receipt bindings

**Prerequisite leaves:** 01.

**Total human estimate: 1 hours (maximum 4).** Engineering/docs 0.4h; verification 0.2h; independent review 0.2h; delivery 0.2h. Includes the complete task; no hidden integration allowance. Independently inspect the forecast and attributable agent allowance before native registration/execution.

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

**Prerequisite leaves:** 01, 02.

**Total human estimate: 2 hours (maximum 4).** Engineering/docs 1h; verification 0.5h; independent review 0.25h; delivery 0.25h. Includes the complete task; no hidden integration allowance. Independently inspect the forecast and attributable agent allowance before native registration/execution.

**Files:** Create `docs/superpowers/adoption/222-process-observation-contract.md`; inspect `schemas/process-source-class-v1.json`, conformance/registration schemas, `src/protocol/process-source-contracts.json`, `process-identity.mjs` and ownership callers.

**Interfaces:** Produces a per-operation finite qualification table and old/new seal operation matrix that Tasks 04–05 implement. No production capability is enabled by a fixture or approval object.

- [ ] Select the conservative finite-support option in spec §5.3: Linux build `6.17.0-1022-azure`, x64, Node 24/26, absence and creation; Darwin `25.6.0`, arm64, Node 24/26, absence only. Record real probe semantic predicates and precision; other cases remain unavailable. Reconfirm these scopes against actual current evidence before adoption; do not widen them from OS labels.
- [ ] Define qualification as package-owned supported probe semantics plus observed matching OS/host/process facts, independent of reviewer acceptance, ledger approval or arbitrary journal-source digests. Preserve installed package integrity separately.
- [ ] Document every persisted `creationSource` v1 shape and in-flight owner operation. Old seals remain readable with original approval fields; only operations justified by their original semantics and current reliable observations stay supported. Uncertain/unsupported cases return Unknown with a compatible recovery path, never automatic seal conversion or takeover.
- [ ] Adopt v2 class/qualification and seal contracts before implementation; preserve v1 schemas/ledger bytes and Windows historical entries. Define precision, process-instance identity and same-host rules for each operation.
- [ ] Independently review the contract, its explicit exclusions and representative old-seal fixtures. Obtain scoped native adoption before Task 05C enters Develop; commit/trace the decision without claiming a runtime replacement exists yet.

## Task 04: Build isolated finite process qualification and compatibility readers

**Prerequisite leaves:** 03.

**Total human estimate: 3 hours (maximum 4).** Engineering/docs 1.5h; verification 0.5h; independent review 0.5h; delivery 0.5h. Includes the complete task; no hidden integration allowance. Independently inspect the forecast and attributable agent allowance before native registration/execution.

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
- [ ] Rerun tests and commit/trace the unactivated module. It may deliver independently only if it neither changes the active closure nor alters current operational capability. Otherwise deliver it atomically with Task 05C.

## Task 05A: Implement isolated Linux probe observations

**Prerequisite leaves:** 04.

**Total human estimate: 3 hours (maximum 4).** Engineering/docs 1.5h; verification 0.5h; independent review 0.5h; delivery 0.5h. Includes the complete task; no hidden integration allowance. Independently inspect the forecast and attributable agent allowance before native registration/execution.

**Files and exclusive write ownership:** Create `src/protocol/process-observation-linux.mjs` and `test/unit/process-observation-linux.test.mjs`; read but do not modify `process-identity.mjs`, qualification modules or inventory files.

**Interfaces:** Exports `observeLinuxProcessFacts({pid,signal,deadline,readProc})` with the existing adopted process-fact representation; Task 05C alone wires it to operational callers. `readProc` is the injected bounded procfs reader, never proof data.

**Completion boundary:** A tested, unactivated Linux observation adapter; no live capability transition or shared source edit.

- [ ] Pin failing cases for the adopted Linux absence/creation semantics, procfs visibility failures, malformed stat, PID reuse, boot/namespace mismatch, precision and deadline exhaustion.
- [ ] Run `node --test test/unit/process-observation-linux.test.mjs` and record intended failure before implementing the bounded adapter.
- [ ] Produce observations only from real procfs reads in production and the adopted finite qualification. Return Unknown on unsupported/uncertain facts; no serialized fixture or reviewer approval can grant production authority.
- [ ] Test real supported-host observation separately from injected parser fixtures; record unavailable host coverage honestly. Rerun tests and independently review/commit/trace this inactive adapter.
- [ ] Do not modify active selection, broaden supported hosts or deliver a closure-changing partial activation. Hand the reviewed adapter interface and evidence to 05C.

## Task 05B: Implement Darwin observations and preserve old ownership seals

**Prerequisite leaves:** 04.

**Total human estimate: 3 hours (maximum 4).** Engineering/docs 1.5h; verification 0.5h; independent review 0.5h; delivery 0.5h. Includes the complete task; no hidden integration allowance. Independently inspect the forecast and attributable agent allowance before native registration/execution.

**Files and exclusive write ownership:** Create `src/protocol/process-observation-darwin.mjs`, `src/protocol/process-seal-compatibility.mjs`, `test/unit/process-observation-darwin.test.mjs`, `test/unit/process-seal-compatibility.test.mjs`; do not edit05A files or active ownership modules.

**Interfaces:** Exports `observeDarwinProcessFacts({pid,signal,deadline,probe})` for adopted absence only, and `interpretCreationSeal({bytes,operation,host})` preserving original bytes/precision. It consumes 04 strict v1/v2 parsing; Task 05C alone changes operational selection.

**Completion boundary:** Tested inactive Darwin absence adapter and old-seal operation reader; no universal macOS claim or live-owner mutation.

- [ ] Add failing Darwin absence/visibility/deadline tests and a compatibility table for v1/v2 seals, unsupported creation, live/unknown owners, mismatched host and unavailable compatible recovery.
- [ ] Run both new unit files, implement the adopted finite semantics and strict operation-specific legacy interpretation, then rerun them.
- [ ] Preserve original `creationSource` fields including `classId`, `contractDigest`, `approvalDigest` and `precision`; do not convert seals or infer descendant discharge from endpoint silence.
- [ ] Verify real supported Darwin observation where available, recording platform exclusions and fixture limits. Independently review/commit/trace the unactivated modules and compatibility matrix.
- [ ] Do not touch the protected review/session, active Linux code or installed inventory. Give 05C exact allowed old-owner operations and explicit Unknown/recovery outcomes.

## Task 05C: Activate usable process observations and inventory atomically

**Prerequisite leaves:** 05A, 05B.

**Total human estimate: 3.5 hours (maximum 4).** Engineering/docs 1.75h; verification 0.75h; independent review 0.5h; delivery 0.5h. Includes the complete task; no hidden integration allowance. Independently inspect the forecast and attributable agent allowance before native registration/execution.

**Files and exclusive write ownership:** Exclusive owner of `src/protocol/process-source-assurance.mjs`, `process-identity.mjs`, active ownership callers in `src/broker/portable-platform.mjs`, `portable-ownership-core.mjs`, `portable-owner-lifecycle.mjs`, `ownership-election.mjs`, and coherent qualification/runtime inventories. Extend existing process/owner tests; do not concurrently edit05A/05B modules.

**Interfaces:** Integrates reviewed04/05A/05B interfaces while preserving existing external observation/reconciliation results. New operations consume measured facts and finite qualifications, not approval chains. Old seals route through 05B.

**Completion boundary:** One atomic usable replacement delivery with tested legacy refusal/compatibility. Other runtime work may start only from this delivered checkpoint.

- [ ] Add failing behavior tests showing a journal-source-only change cannot invalidate an otherwise supported process operation through the old 117-file digest. Pin uncertain takeover, duplicate launch and unrelated-process-kill refusal.
- [ ] Run `node --test test/unit/process-source-assurance.test.mjs test/unit/portable-owner-lifecycle.test.mjs` and relevant disposable owner-publication cases.
- [ ] Wire the adapters/legacy reader and install a coherent active qualification/inventory in one usable transition. Remove new-operation approval/review-digest admission; preserve separate installed package integrity and exact process-instance/host/precision checks.
- [ ] Verify adopted supported and excluded Linux/macOS cases and in-flight v1 owners without automatic migration or capability loss caused only by stale journal hashes. If a required finite supported host is unavailable, record a blocked delivery prerequisite; do not spend this task building a new host matrix or widen support claims. If any formerly supported adopted operation cannot be shown usable, stop delivery rather than publish a reduced interim contract.
- [ ] Independently review/commit/trace and deliver this activation before any later closure-changing task. Real hosted/integration coverage reuses valid exact-head evidence under the same budgets; no Windows/native build.

## Task 06: Retire proof-only admission consumers and retain useful journal readers

**Prerequisite leaves:** 05C.

**Total human estimate: 3 hours (maximum 4).** Engineering/docs 1.5h; verification 0.5h; independent review 0.5h; delivery 0.5h. Includes the complete task; no hidden integration allowance. Independently inspect the forecast and attributable agent allowance before native registration/execution.

**Files:** Modify/retire actual active callers in `scripts/lib/runtime-review-lineage-proof.mjs`, `runtime-contract-evidence.mjs`, `scripts/check-runtime-contract-adoption.mjs`, `scripts/ci/prepare-contract-adoption.mjs`, extraction/consumer checks and `test/live/process-source/{authority,class-review,classes}.mjs`; preserve historical schemas/data and required external interfaces until consumer adoption.

**Interfaces:** Produces a consumer disposition report and ordinary current-journal validation path without producer proof. Existing v1 journals remain interpretable; external approval policy is not treated as product validation.

- [ ] Add an integration case that starts/inspects an ordinary current review without producer-image proof, proof publication or source-class review approval. Exercise actual callers, not file-text absence assertions.
- [ ] Run `node --test test/unit/runtime-review-lineage-proof.test.mjs test/unit/runtime-contract-adoption.test.mjs test/unit/runtime-contract-evidence.test.mjs` to establish existing behavior and a failing ordinary-path regression.
- [ ] Remove only proof-only active gates traced by 01. Reuse journal/response interpretation where useful, preserve history and isolate legacy readers. Do not replace retired proof with an equivalently mandatory renamed receipt.
- [ ] Update packaging/extraction consumers and public export compatibility only under their scoped adoption. If a downstream interface remains live, keep it explicitly legacy or postpone its removal until the owning change lands.
- [ ] Verify valid pending/rejected journals are not forced into terminal acceptance manifests. Run focused behavior/integration tests and exact package-content inspection; independently review, commit/trace and record unresolved external owners.

## Task 07A: Define response and manifest v2 validators

**Prerequisite leaves:** 05C.

**Total human estimate: 2.5 hours (maximum 4).** Engineering/docs 1.25h; verification 0.5h; independent review 0.5h; delivery 0.25h. Includes the complete task; no hidden integration allowance. Independently inspect the forecast and attributable agent allowance before native registration/execution.

**Files and exclusive write ownership:** Create `schemas/response-v2.json`, `schemas/manifest-v2.json`, `src/protocol/journal-response-contracts.mjs`, `test/unit/journal-response-contracts.test.mjs`, `docs/review-journal-records-v2.md`. No edits to 07B/07C files.

**Interfaces:** Exports `validateResponseV2(document)` and `validateManifestV2(document)` returning `{status,issues}` with valid/malformed/incomplete outcomes. Implements protected provenance, initial/cycle/acceptance records and immutable links, not lifecycle transitions.

**Completion boundary:** Two independently tested document-family readers and schemas; no event/protocol implementation or current writer switch.

- [ ] Add failing required-field, field-type, digest/reference, unavailable-provenance and initial/in-progress/acceptance cases; cover genuine nonacceptance versus malformed data.
- [ ] Run `node --test test/unit/journal-response-contracts.test.mjs`; implement bounded explicit document checks with closed new-format fields and rerun.
- [ ] Retain response-v1, terminal-only manifest-v1 and old explanatory schemas byte-for-byte. No generic JSON Schema evaluator or remote schema loading.
- [ ] Verify supported and unsupported record examples, document every field meaning, independently review/commit/trace and deliver only the new inactive readers.
- [ ] Hand07C exact validator exports and fixture expectations; do not change the shared registry or templates.

## Task 07B: Define event, protocol and explicit handoff contracts

**Prerequisite leaves:** 05C.

**Total human estimate: 3 hours (maximum 4).** Engineering/docs 1.5h; verification 0.5h; independent review 0.5h; delivery 0.5h. Includes the complete task; no hidden integration allowance. Independently inspect the forecast and attributable agent allowance before native registration/execution.

**Files and exclusive write ownership:** Create `schemas/event-v3.json`, `schemas/protocol-v3.json`, `schemas/start-request-v2.json`, `schemas/submit-turn-request-v2.json`, `src/protocol/journal-lifecycle-contracts.mjs`, `test/unit/journal-lifecycle-contracts.test.mjs`, `docs/review-journal-lifecycle-v3.md`.

**Interfaces:** Exports `validateEventV3(document)`, `validateProtocolV3(document)` and `validateReviewRequestV2({operation,document})` returning `{status,issues}`. Declares actor/version, handoff, decision, acknowledgement, reserved/waiting/pending/released and external outcome bindings.

**Completion boundary:** Independently tested inactive lifecycle/request definitions; no concurrent reducer or API-contract edits.

- [ ] Add failing malformed/unsupported/valid event/protocol/start/submit fixtures, explicit expected revisions and digest bindings, same-session exact retry and wrong-role cases.
- [ ] Run `node --test test/unit/journal-lifecycle-contracts.test.mjs`; implement the bounded new-family checks and rerun.
- [ ] Preserve all published old schemas and existing API envelope semantics. Separate recorded participant acceptance from collateral completeness and external publication.
- [ ] Document exact new operation fields/states and errors without enabling a new runtime path; independently review/commit/trace.
- [ ] Give 07C validators and operation/family dispatch keys. Do not edit07A record validators, the shared event reducer, registry or CLI.

## Task 07C: Integrate fixed contextual journal dispatch

**Prerequisite leaves:** 07A, 07B.

**Total human estimate: 1.5 hours (maximum 4).** Engineering/docs 0.75h; verification 0.25h; independent review 0.25h; delivery 0.25h. Includes the complete task; no hidden integration allowance. Independently inspect the forecast and attributable agent allowance before native registration/execution.

**Files and exclusive write ownership:** Exclusive owner of new `src/protocol/journal-contracts.mjs`, `test/unit/journal-contracts.test.mjs`, the contextual additions to `src/protocol/compatibility-read.mjs`, and `docs/review-journal-v2.md`.

**Interfaces:** Exports `validateJournalDocument({family,operation,document}) -> {status:"valid"|"malformed"|"unsupported"|"incomplete",issues}` by fixed mappings to 07A/07B. Request-family dispatch includes start/submit-v2; historical/API same-tag interpretations remain contextual.

**Completion boundary:** One authoritative contextual dispatch integration, with no parallel writer to compatibility-read.mjs.

- [ ] Test correct family/operation/schema combinations, unknown schemas, absent metadata, wrong-family same tag, malformed versus incomplete data and unchanged historical responses/API envelopes.
- [ ] Run `node --test test/unit/journal-contracts.test.mjs`; add only the fixed imports/dispatch table and explicit version branches needed to pass.
- [ ] Never feed journal schemas through `src/api/validate.mjs:validateContract` as a general schema evaluator; no runtime/remote schema selection.
- [ ] Run07A/07B tests plus existing compatibility/manifest/response regressions. Independently review/commit/trace the shared integration after both disjoint readers land.
- [ ] No current writer activation occurs until the new runtime handoff is ready in 15B.

## Task 08: Capture bounded root and reviewer working contexts

**Prerequisite leaves:** 05C.

**Total human estimate: 3 hours (maximum 4).** Engineering/docs 1.5h; verification 0.5h; independent review 0.5h; delivery 0.5h. Includes the complete task; no hidden integration allowance. Independently inspect the forecast and attributable agent allowance before native registration/execution.

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

**Prerequisite leaves:** 08, 07C.

**Total human estimate: 3 hours (maximum 4).** Engineering/docs 1.5h; verification 0.5h; independent review 0.5h; delivery 0.5h. Includes the complete task; no hidden integration allowance. Independently inspect the forecast and attributable agent allowance before native registration/execution.

**Files:** Create `src/protocol/review-drift.mjs`, `test/unit/review-drift.test.mjs`; reuse contained path checks and 07 document readers.

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

`root`, `chain` and `readTreeEntry` are produced from a disposable repository and Task 07A/07B/07C/08 valid records, not arbitrary asserted clean fixtures for operational decisions.

- [ ] Run `node --test test/unit/review-drift.test.mjs`; record failure of incorrect dirty-context comparison before implementation.
- [ ] Union tree-diff paths with both overlays, materialize effective states by overlaying working bytes on commit states, compare existence/type/mode/digest, and report bookkeeping separately. Derive exclusions from every validated linked declaration; never a directory or name resemblance.
- [ ] Preserve immutable original root; append informational divergence data, even for nonancestor equivalent trees. Missing/corrupt chain, ambiguous roles or unreadable state returns unavailable. This mechanical comparison makes no materiality/acceptance decision.
- [ ] Rerun cases including changes restored between endpoint observations: claim endpoint equality only, not a proof of all intervening commits. Commit/review/trace.

## Task 10: Validate FUR revision identity and protected reviewer provenance

**Prerequisite leaves:** 08, 07C.

**Total human estimate: 3 hours (maximum 4).** Engineering/docs 1.5h; verification 0.5h; independent review 0.5h; delivery 0.5h. Includes the complete task; no hidden integration allowance. Independently inspect the forecast and attributable agent allowance before native registration/execution.

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

**Prerequisite leaves:** 07C, 10.

**Total human estimate: 3 hours (maximum 4).** Engineering/docs 1.5h; verification 0.5h; independent review 0.5h; delivery 0.5h. Includes the complete task; no hidden integration allowance. Independently inspect the forecast and attributable agent allowance before native registration/execution.

**Files:** Modify `src/protocol/events.mjs`, `reducer.mjs`, `service.mjs`, `store.mjs`; create `test/unit/journal-v3-lifecycle.test.mjs` and `test/helpers/journal-v3-fixture.mjs`; retain existing lifecycle tests.

**Interfaces:** The new test helper exports `acceptedDecisionEvents({closingAcknowledgement})`, a valid event-v3 sequence through reviewer acceptance with optional participant acknowledgement, created under the exact Task 07A/07B/07C schemas with fixed disposable identities and deterministic timestamps. Produces event-v3/protocol-v3 projections for recorded participant decision, closing acknowledgement, sealed collateral, revision handoff and publication reservation/outcome. Reuses `atomicCreate`, `atomicWrite`, `withReviewLock` and expected revision; no second transition writer.

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

**Prerequisite leaves:** 08, 09, 11.

**Total human estimate: 3 hours (maximum 4).** Engineering/docs 1.5h; verification 0.5h; independent review 0.5h; delivery 0.5h. Includes the complete task; no hidden integration allowance. Independently inspect the forecast and attributable agent allowance before native registration/execution.

**Files:** Create `src/manifest/journal-v2.mjs`, `test/unit/journal-manifest-v2.test.mjs`; integrate the v2 renderer/template only. Reuse the completed 11 store/event APIs without editing them; do not replace v1 renderer or touch14 publication files.

**Interfaces:** Exports `buildJournalManifest({state,context,prior}) -> manifestV2`, `sealJournalManifest({workspace,relative,model,expectedRevision}) -> {path,digest}`. Initial record is immutable; each linked cycle/acceptance record has exact paths, IDs, digests and prior-record identity.

- [ ] Pin failing initial-manifest-before-reviewer tests, capture races, repeated SAR/SPR/XPR acceptances with coincident SHAs, detached HEAD and incomplete-provenance observations.
- [ ] Run `node --test test/unit/journal-manifest-v2.test.mjs test/unit/manifest.test.mjs`; confirm v1 terminal fixtures remain byte-identical.
- [ ] Capture08 context and FUR consistently, then atomic-create the initial manifest before turn launch. Record the observed HEAD, not the commit that will later contain this manifest. Link subsequent immutable records rather than mutating a hashed predecessor.
- [ ] At acceptance capture actual current HEAD and 09 comparison; preserve the root and append informational other-context records. Keep participant decision, acknowledgement and publication fields distinct. Missing overlay/HEAD is explicit incomplete provenance, not a fabricated value.
- [ ] Verify exact role/path declarations, wrong-link failures and retained historical schemas. Publish stable UTF-8 Markdown with documented machine-readable v2 metadata and commit/review/trace.

## Task 13: Generate exact reversible diffs and cross-review links

**Prerequisite leaves:** 07C, 10.

**Total human estimate: 3 hours (maximum 4).** Engineering/docs 1.5h; verification 0.5h; independent review 0.5h; delivery 0.5h. Includes the complete task; no hidden integration allowance. Independently inspect the forecast and attributable agent allowance before native registration/execution.

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

**Prerequisite leaves:** 11, 13.

**Total human estimate: 3 hours (maximum 4).** Engineering/docs 1.5h; verification 0.5h; independent review 0.5h; delivery 0.5h. Includes the complete task; no hidden integration allowance. Independently inspect the forecast and attributable agent allowance before native registration/execution.

**Files:** Create `src/protocol/review-publication.mjs`, `test/unit/review-publication.test.mjs`; use11 existing projection/store APIs without editing events/reducer/store. Keep runtime CLI/API activation in 15B, so14 and 12 have disjoint writes.

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

## Task 15A: Prepare versioned review-only prompts and provider constraints

**Prerequisite leaves:** 07C, 10.

**Total human estimate: 2.5 hours (maximum 4).** Engineering/docs 1.25h; verification 0.5h; independent review 0.5h; delivery 0.25h. Includes the complete task; no hidden integration allowance. Independently inspect the forecast and attributable agent allowance before native registration/execution.

**Files and exclusive write ownership:** Create `templates/v2/author-startup.md`, `templates/v2/reviewer-invitation.md`, `src/provider/review-only-contract.mjs`, `test/unit/review-only-contract.test.mjs`; scoped role documentation only. Do not modify active templates, run-core, event state or launch ledgers.

**Interfaces:** Exports `buildReviewOnlyContract({role,responsePath,revisionHandoff})` selecting only the designated response output and exact supported submission operations; an external authoring workflow supplies FUR revisions. Existing legacy contract remains current until15B.

**Completion boundary:** Tested inactive prompt/constraint assets that can be reviewed independently of runtime activation.

- [ ] Pin failing contract cases for an author/reviewer allowed only their own response, prohibited artifact/Git/config writes, unsupported provider restrictions and honest manual instruction-bound status.
- [ ] Run `node --test test/unit/review-only-contract.test.mjs`; implement only the new versioned assets/contract builder and rerun.
- [ ] Reconcile future #118/#148–#150 role obligations through scoped adoption. Existing manual/normal/no-commit records keep their recorded legacy rules.
- [ ] Independently review/commit/trace the inactive assets. No new sandbox or handcrafted broader Claude Bash/Edit rules and no actual provider launch in this task.
- [ ] Hand15B exact template paths, builder and enforcement-status output; do not make existing sessions unusable before external handoff exists.

## Task 15B: Activate the external revision handoff and reviewer boundary

**Prerequisite leaves:** 14, 15A.

**Total human estimate: 3.5 hours (maximum 4).** Engineering/docs 1.75h; verification 0.75h; independent review 0.5h; delivery 0.5h. Includes the complete task; no hidden integration allowance. Independently inspect the forecast and attributable agent allowance before native registration/execution.

**Files and exclusive write ownership:** Exclusive owner of new-format `src/cli/run-core.mjs` activation, `src/api/contracts.mjs` request adapter branches, `src/templates/index.mjs` version selection and provider wiring. Tests `test/integration/review-only-handoff.test.mjs`, existing no-commit/Claude permission suites. New asset files stay owned by 15A.

**Interfaces:** Consumes10 protected metadata,11 lifecycle,12 manifests,13 diffs,14 reservation and 15A role contract. Enables start-request-v2 and submit-turn-request-v2 with `{reviewId,expectedRevision,priorDigest,resultReference,submittingSession}`.

**Completion boundary:** One reviewed activation of the new externally revised, response-only participant flow; legacy paths remain compatible.

- [ ] Write a failing disposable end-to-end new-format review: participant writes only its response; external author supplies revised bytes; stale input refuses; exact retry advances once; publication reservation excludes new reviewer launch.
- [ ] Run `node --test test/integration/review-only-handoff.test.mjs`; activate the new route and explicit format selection without converting legacy records.
- [ ] Snapshot/validate external result bytes and record their identity; never apply source patches or mutate Git. Keep within-turn HEAD/FUR checks and publisher waiting while a turn is open.
- [ ] Verify real supported provider restrictions only through existing package launcher when separately authorized; automated fixture compliance alone is not OS enforcement. Preserve legacy integration behavior and list unsupported/manual modes truthfully.
- [ ] Independently review/commit/trace this single controller integration. No other parallel task may edit run-core or the shared API adapter during activation.

## Task 16: Complete both response sides and acceptance acknowledgements

**Prerequisite leaves:** 15B.

**Total human estimate: 2.5 hours (maximum 4).** Engineering/docs 1.25h; verification 0.5h; independent review 0.5h; delivery 0.25h. Includes the complete task; no hidden integration allowance. Independently inspect the forecast and attributable agent allowance before native registration/execution.

**Files:** Modify new-format submission/finalization in `src/cli/run-core.mjs`, response generation and v3 projection; create `test/integration/review-cycle-collateral.test.mjs`.

**Interfaces:** Produces revision cycles with reviewer-on-N plus submitting-participant disposition-on-N/result-N+1, and acceptance cycles with reviewer acceptance plus unchanged-FUR acknowledgement. Native old v1 omission remains historical, not backfilled.

- [ ] Test actual accepted reviewer decision before closing acknowledgement, explicit unchanged-FUR response, missing response, abandoned cycle and exact retries.
- [ ] Run `node --test test/integration/review-cycle-collateral.test.mjs`; confirm the current early-terminal behavior fails the new-format completeness scenario.
- [ ] Generate the submitting participant's own acknowledgement draft under its declared response write scope. Do not author its prose or count acknowledgement as reviewer acceptance. Seal exact inputs and preserve pending/incomplete publication separately.
- [ ] Verify every response references the correct revision/digest and the cycle exposes both sides before complete publication eligibility. No silence/process exit/format validation supplies acceptance.
- [ ] Run lifecycle/response/manifest regressions, commit/review/trace and leave missing historical responses missing.

## Task 17: Reconstruct FUR history from final bytes after squash

**Prerequisite leaves:** 12, 13.

**Total human estimate: 3 hours (maximum 4).** Engineering/docs 1.5h; verification 0.5h; independent review 0.5h; delivery 0.5h. Includes the complete task; no hidden integration allowance. Independently inspect the forecast and attributable agent allowance before native registration/execution.

**Files:** Create `src/collateral/fur-history.mjs`, `test/integration/fur-history-squash.test.mjs`; consume13 completed lineage interfaces without concurrent edits. Build actual retained-package fixtures using12 manifests and 13 diffs; live controller cycle coverage is verified later by 25A.

**Interfaces:** Exports `reconstructFurHistory({headBytes,manifest,readRecord,readPatch}) -> {status:"complete",revisions}|{status:"incomplete"|"corrupt",reason}`. `readRecord`/`readPatch` resolve only contained exact declared artifacts; reconstructed bytes are written only to an explicit separate output destination.

- [ ] Build a disposable repository with several revision cycles, two review patterns, a legacy predecessor and a later unreviewed head. Squash to a new parent, copy only final FUR/collateral tree into an object-independent repository, then reconstruct every retained revision.
- [ ] Run `node --test test/integration/fur-history-squash.test.mjs`; first remove a patch and assert incomplete rather than guessed reconstruction.
- [ ] Reverse uniquely named diffs from the manifest-bound retained head, verify each input/result digest and required revision ID, traverse immutable cross-review links and report which reconstructed versions were actually accepted.
- [ ] Cover corrupt patch/link/digest, non-FUR path escape, unsupported format and missing legacy intermediates. No dependency on original turn commits or independent archived FUR copies is allowed.
- [ ] Run in a separate temporary destination and prove the original FUR/records stayed byte-identical. Commit/review/trace the read-only reconstruct capability and documented scope limits.

## Task 18: Document and verify scoped external turn publication

**Prerequisite leaves:** 14, 17.

**Total human estimate: 2 hours (maximum 4).** Engineering/docs 1h; verification 0.5h; independent review 0.25h; delivery 0.25h. Includes the complete task; no hidden integration allowance. Independently inspect the forecast and attributable agent allowance before native registration/execution.

**Files:** Create `docs/review-turn-publication.md`, `test/integration/review-turn-publication.test.mjs`; reuse existing temporary-repository helper patterns, not a new product Git-publishing service.

**Interfaces:** Produces an operator procedure consuming a reserved window and sealed cycle bundle and returning a verified publication outcome. AIPR records it through 14; only the separately authorized publisher mutates Git.

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

## Task 19A: Expose the read-only public journal and API contracts

**Prerequisite leaves:** 06, 15B, 17.

**Total human estimate: 2.5 hours (maximum 4).** Engineering/docs 1.25h; verification 0.5h; independent review 0.5h; delivery 0.25h. Includes the complete task; no hidden integration allowance. Independently inspect the forecast and attributable agent allowance before native registration/execution.

**Files and exclusive write ownership:** Exclusive owner of read-only additions in `src/public-api.mjs`, `src/api/contracts.mjs`, `schemas/api-response-v2.json` and `test/unit/journal-api-contract.test.mjs`; starts after 15B has released these shared files.

**Interfaces:** Exposes adopted inspect/reconstruct APIs with explicit API-response-v2 contracts. Uses existing current/historical readers and 17 history reconstruction; never exposes an AIPR Git publisher.

**Completion boundary:** Tested read-only API contract/export surface, independent of CLI/MCP presentation and packaging.

- [ ] Add failing valid/pending/rejected/unsupported response tests through real public entry points, with old participant/API same-tag fixtures.
- [ ] Run `node --test test/unit/journal-api-contract.test.mjs`; wire explicit read-only exports/new envelope and rerun.
- [ ] Preserve API-v1 and closed legacy schemas unchanged. Verify inspector input bytes remain unchanged, paths stay contained and remote/executable schema selection refuses.
- [ ] Independently review/commit/trace the API boundary; provide19B concrete operation names, request/response shapes and errors.
- [ ] Do not edit CLI/MCP dispatch, packaging or inventory files in this leaf.

## Task 19B: Wire CLI and MCP parity for journal inspection

**Prerequisite leaves:** 19A, 15B.

**Total human estimate: 2.5 hours (maximum 4).** Engineering/docs 1.25h; verification 0.5h; independent review 0.5h; delivery 0.25h. Includes the complete task; no hidden integration allowance. Independently inspect the forecast and attributable agent allowance before native registration/execution.

**Files and exclusive write ownership:** Exclusive owner of CLI help/dispatch and MCP operation routing, plus `test/integration/journal-cli-mcp.test.mjs`; use the19A contract without changing it. Controller write-path changes stay owned by 15B/16.

**Interfaces:** Produces equivalent CLI/MCP read-only inspect/reconstruct results for19A public operations and existing versioned lifecycle request routing. No transport may grant Git/source-write permission.

**Completion boundary:** Tested CLI/MCP contract parity; transport does not duplicate policy or implement a Git publisher.

- [ ] Add failing parity cases for valid, incomplete, unsupported, malformed and unavailable-context records, including path errors and unchanged legacy workflows.
- [ ] Run `node --test test/integration/journal-cli-mcp.test.mjs`; implement thin transport routing/help against19A contracts and rerun.
- [ ] Verify both transports preserve input files, exact meanings and structured errors; do not independently reimplement journal semantics in a transport.
- [ ] Independently review/commit/trace the transport integration. Hand19C the actual shipped entry points/assets.
- [ ] No concurrent run-core/API contract or package inventory edit is permitted.

## Task 19C: Verify portable package closure and immutable format exceptions

**Prerequisite leaves:** 18, 19B, 20.

**Total human estimate: 2.5 hours (maximum 4).** Engineering/docs 1.25h; verification 0.5h; independent review 0.5h; delivery 0.25h. Includes the complete task; no hidden integration allowance. Independently inspect the forecast and attributable agent allowance before native registration/execution.

**Files and exclusive write ownership:** Exclusive owner of `package.json` files list when required, runtime/extraction/portable inventory updates, installation docs, the exact accepted-spec `.prettierignore` entry and `test/unit/journal-package-contract.test.mjs`. No API, controller or transport source edits.

**Interfaces:** Produces coherent source/package inventory and shipped schemas/templates/readers/docs matching actual19A/19B behavior. Preserves every independent legacy consumer until scoped adoption permits retirement.

**Completion boundary:** A coherent portable package and exact immutable-artifact exception, with no additional public API implementation.

- [ ] Add failing package-content tests for required current/historical schemas, versioned role templates, reconstruction reader and publication/suitability docs; inspect actual portable output, not raw source `npm pack` refusal bypass.
- [ ] Run `node --test test/unit/journal-package-contract.test.mjs`; make exact files/inventory changes and rerun.
- [ ] Add only the immutable accepted revision13 spec path to `.prettierignore` with its exact accepted SHA-256; verify bytes against the adoption receipt. No directory exclusion or silent reformat.
- [ ] Verify package identity/integrity coherently and inspect actual Linux/macOS installed assets. Reuse valid exact-head evidence where permitted; unavailable/skipped native support stays explicit.
- [ ] Independently review/commit/trace before 25B installed verification. No shared package/inventory writer runs concurrently.

## Task 20: Deliver the pre-planning suitability decision procedure

**Prerequisite leaves:** 01, 09, 12, 17.

**Total human estimate: 2 hours (maximum 4).** Engineering/docs 1h; verification 0.5h; independent review 0.25h; delivery 0.25h. Includes the complete task; no hidden integration allowance. Independently inspect the forecast and attributable agent allowance before native registration/execution.

**Files:** Create `docs/review-plan-suitability.md` and `docs/superpowers/adoption/222-suitability-scenarios.md`; use mechanical comparison results, not a new drift engine or mandatory new CLI.

**Interfaces:** Consumes exact accepted FUR/layer identities, earliest available writing basis, available review roots/overlays and current observations. Produces a named-decider rationale bound to input digests and outcome `suitable` or `review-current-head-before-planning`.

- [ ] Document ordered checks: verify accepted bytes/layers; resolve original and accepting contexts; account for already-reviewed history; inspect current effective drift and dirty paths; evaluate requirements/interfaces/dependencies; record a named human/agent decision and reason.
- [ ] Rehearse procedural scenarios using real09 comparison outputs: collateral-only changes, irrelevant verified docs, dirty source unchanged/committed/discarded, already-reviewed old source differences, material changed API and missing original Git context after squash.
- [ ] For wide/material or unavailable context require current-HEAD spec review, necessary revisions and fresh recorded acceptance before plan generation. Do not loop solely because earliest-basis historical differences remain visible after later review. Do not claim automated tests prove semantic correctness of a materiality judgement.
- [ ] Verify each scenario records exact compared SHAs/observation identities/FUR digest and follows the expected workflow branch; an explicit missing input cannot be labelled mechanically clean.
- [ ] Obtain scoped preimplementation adoption of this operator procedure, independently review the scenario evidence and commit/trace. Native Plan approval remains separate.

## Task 21: Disposition the obsolete proof program without false completion

**Prerequisite leaves:** 01, 06.

**Total human estimate: 2 hours (maximum 4).** Engineering/docs 1h; verification 0.5h; independent review 0.25h; delivery 0.25h. Includes the complete task; no hidden integration allowance. Independently inspect the forecast and attributable agent allowance before native registration/execution.

**Files:** Update owning-workflow records for #214/#217–#221 and closed #216 history; create `docs/superpowers/adoption/222-proof-program-disposition.md`.

**Interfaces:** Produces exact keep/rewrite/supersede/split decisions and surviving dependencies with original contracts/timing preserved. No superseded issue is labelled implemented Done.

- [ ] Refresh all seven open proof-program issue bodies, dependencies, forecast/approval markers and parent aggregate requirements. Compare them with implemented consumer dispositions, not names alone.
- [ ] Prepare concrete replacement Scope/AC/source-plan/verification changes for each surviving requirement and retain original references. Use sanctioned `aitm issue-body`, creation and dependency verbs after fresh Explain; never raw `gh issue create` or arbitrary state jumps.
- [ ] Record the superseding product decision for closed #216 without rewriting historical adoption or reopening automatically. Preserve #217 forecast/timing and every Unknown.
- [ ] If there is no sanctioned cancellation/supersession state, record that workflow gap and stop the affected mutation; do not repurpose Done or silently remove blockers.
- [ ] Verify native read-back/dependency topology and exact parent obligations; independently review, commit/trace the durable disposition record. Final reconciliation does not excuse missing01 scoped adoption.

## Task 22A: Reconcile review roles and measured participant requirements

**Prerequisite leaves:** 16, 20.

**Total human estimate: 2 hours (maximum 4).** Engineering/docs 1h; verification 0.5h; independent review 0.25h; delivery 0.25h. Includes the complete task; no hidden integration allowance. Independently inspect the forecast and attributable agent allowance before native registration/execution.

**Files and exclusive write ownership:** Governed records only for #118/#148–#150 and #109/#152/#153; create `docs/superpowers/adoption/222-role-dispositions.md`. Other issue sets belong to 22B/22C.

**Interfaces:** Produces retained/split/replacement role/write-scope and measured-telemetry obligations, with native references, dependencies and owning adopters.

**Completion boundary:** One nonoverlapping role/telemetry issue-set disposition; no runtime or cross-repository source implementation.

- [ ] Refresh each assigned issue body/source-plan pointer and reconcile role requirements with 15–16 and 20. Preserve useful measured telemetry and identity/session routing.
- [ ] Split surviving25-hour #149 scope into evidence-backed bounded proposals; preserve the old estimate and do not implement inside reconciliation.
- [ ] Apply only individually adopted changes through sanctioned owner commands. Verify read-back and dependency assignment; superseded is not delivered Done.
- [ ] Independently review/commit/trace this issue-set record. Do not edit shared aggregate census or other22 task outputs.

## Task 22B: Reconcile journal, recovery and installed-release requirements

**Prerequisite leaves:** 19C.

**Total human estimate: 2 hours (maximum 4).** Engineering/docs 1h; verification 0.5h; independent review 0.25h; delivery 0.25h. Includes the complete task; no hidden integration allowance. Independently inspect the forecast and attributable agent allowance before native registration/execution.

**Files and exclusive write ownership:** Governed records only for #142/#156/#157/#124 and #30/#151; create `docs/superpowers/adoption/222-journal-dispositions.md`.

**Interfaces:** Produces bounded surviving journal/recovery/release obligations and exact prerequisites after real19C package behavior exists; closed historical evidence retains meaning.

**Completion boundary:** One nonoverlapping journal/recovery/package issue-set disposition, not the implementation of those surviving stories.

- [ ] Refresh assigned bodies and accepted contracts. Preserve ownership/recovery and installed compatibility while retiring only traced proof obligations.
- [ ] Split surviving25-hour #151 and 41.5-hour #157 scopes into bounded proposed leaves; do not hide the work in this2-hour disposition task.
- [ ] Apply adopted native body/dependency changes, verify read-back and retain original scopes/estimates as history. No automatic #107 activation or release.
- [ ] Independently review/commit/trace only this task's issue-set record; leave aggregate census and 22A/22C files untouched.

## Task 22C: Coordinate the external publication consumer obligations

**Prerequisite leaves:** 19B, 20.

**Total human estimate: 2 hours (maximum 4).** Engineering/docs 1h; verification 0.5h; independent review 0.25h; delivery 0.25h. Includes the complete task; no hidden integration allowance. Independently inspect the forecast and attributable agent allowance before native registration/execution.

**Files and exclusive write ownership:** Governed records for AIPR #197 and AITM #1939/#1944 through their actual owning workflows; create `docs/superpowers/adoption/222-external-consumer-dispositions.md`.

**Interfaces:** Produces exact producer/consumer interface decisions and downstream ownership links; AIPR-only records cannot claim changed downstream behavior.

**Completion boundary:** Explicit cross-repository consumer decisions or blockers, without falsely completing downstream integration.

- [ ] Read actual export/consumer contracts and 19A/19B interfaces plus20 suitability procedure. Preserve any still-required external API until consumer adoption lands.
- [ ] Split surviving12-hour AITM #1944 scope into bounded proposals without inventing downstream issue IDs or resetting attributable work.
- [ ] Use each repository's sanctioned workflow to record scoped adoption and real prerequisites; missing access/authority remains an explicit dependency, not inferred consent.
- [ ] Verify read-back and independently review/commit/trace the consumer-disposition record. Give 24 the concrete handoff/registration obligation.
- [ ] Do not implement AITM code, hydrate a backlog or change other task issue sets.

## Task 23A: Consolidate parent obligations and the final candidate census

**Prerequisite leaves:** 21, 22A, 22B, 22C, 23B.

**Total human estimate: 2 hours (maximum 4).** Engineering/docs 1h; verification 0.5h; independent review 0.25h; delivery 0.25h. Includes the complete task; no hidden integration allowance. Independently inspect the forecast and attributable agent allowance before native registration/execution.

**Files and exclusive write ownership:** Exclusive owner of governed #141/#107 aggregate updates and `docs/superpowers/adoption/222-complete-census.md`. Consumes read-only 21/22A/22B/22C/23B records.

**Interfaces:** Produces a complete current-issue census with relevant/out-of-scope reasons, surviving aggregate requirements and exact implementing owners. One integration writer owns parent/body/census consolidation.

**Completion boundary:** A complete reviewed census and parent-obligation consolidation, with all missing requirements still visibly open.

- [ ] Refresh the complete open-issue listing and compare it with all assigned disposition records. New candidates must have explicit ownership; never infer completion from the initial count40.
- [ ] Adopt parent Scope/AC/source-plan amendments through the owning workflow without weakening required process-safe behavior, activating107 or labelling superseded work delivered.
- [ ] Verify no removed dependency leaves surviving scope unowned, all records preserve original references and Windows213 remains deferred under global223 policy.
- [ ] Independently review/read-back/commit/trace the census. Parent Close and source implementation are outside this leaf.

## Task 23B: Disposition the remaining unrelated and deferred candidates

**Prerequisite leaves:** 01, 21.

**Total human estimate: 2 hours (maximum 4).** Engineering/docs 1h; verification 0.5h; independent review 0.25h; delivery 0.25h. Includes the complete task; no hidden integration allowance. Independently inspect the forecast and attributable agent allowance before native registration/execution.

**Files and exclusive write ownership:** Governed records for #29/#31–#34/#130/#143/#146–#147/#154–#155/#210/#212 and other candidates outside21/22 sets; create `docs/superpowers/adoption/222-remaining-candidates.md`. Do not edit #141/#107 or the final census.

**Interfaces:** Produces an independently reviewed candidate partition with keep/rewrite/split/out-of-scope reasons and unresolved workflow gaps, consumed by 23A.

**Completion boundary:** One clearly partitioned candidate-set disposition; discovery beyond its capacity becomes a separately forecasted task before work.

- [ ] Refresh each assigned issue/body/dependency, test actual consumer relevance, and retain out-of-scope retrieval/learning/analytics/configuration work with its reason.
- [ ] Preserve useful CI integrity and unrelated recovery guarantees; terminology alone is not removal authority. Retain deferred Windows213 and do not schedule it.
- [ ] If the assigned set cannot be examined honestly inside the stated forecast, partition the remaining issue set before registration; do not silently exceed this task or fabricate a census row.
- [ ] Verify sanctioned mutation read-back for any adopted changes, independently review/commit/trace this partition and leave aggregate integration to 23A.

## Task 24: Register the downstream AITM ownership and exact-context handoff

**Prerequisite leaves:** 19C, 20, 22C.

**Total human estimate: 2 hours (maximum 4).** Engineering/docs 1h; verification 0.5h; independent review 0.25h; delivery 0.25h. Includes the complete task; no hidden integration allowance. Independently inspect the forecast and attributable agent allowance before native registration/execution.

**Files:** Create `docs/superpowers/adoption/222-downstream-handoff.md`; read AITM `scripts/task-tracker/verbs/plan-approve.mjs`, `lib/deep-dive-gate.mjs`, `verbs/mirror-deep-dive.mjs`, applicable pickup/rules and sanctioned creation tools in its owning repository. No AITM source changes in this AIPR leaf.

**Interfaces:** Produces an actual registered native AITM issue URL/number and dependency link, or explicit blocked registration state. Handoff binds accepted plan/spec/review identities, context records and owning workflow verification obligations.

- [ ] Prepare a bounded native AITM story owning context preservation during accepted plan hydration and relevant drift evaluation during each story's just-in-time deep dive. Include exact producer/consumer fields and source references; do not invent an issue ID.
- [ ] Use the downstream repository's `scripts/gh/create-issue.mjs --shape ...` through its owning workflow only after authorization/binding/preflight. If missing authority/capability prevents registration, record the exact blocker and keep integration incomplete. Do not route a raw GitHub create around guards.
- [ ] Require downstream ACs for accepted plan/spec/review linkage, current-code versus planning-basis comparison before implementation, rationale and scoped adjustment, and governed replanning on material invalidation. No global re-review is mandated for every post-hydration commit.
- [ ] Link the real issue/dependency back into AIPR's governed records and verify read-back. AIPR-side tests/inspection verify handoff presence/binding; downstream behavior is tested and accepted in that issue, not asserted here.
- [ ] Independently review/commit/trace the handoff. Do not claim aggregate downstream adoption until its actual owning-workflow verification is available. Hydration itself waits for accepted/approved implementation plan and explicit execution authority.

## Task 25A: Verify local aggregate behavior and specification coverage

**Prerequisite leaves:** 19C, 20, 23A.

**Total human estimate: 2.5 hours (maximum 4).** Engineering/docs 1.25h; verification 0.5h; independent review 0.5h; delivery 0.25h. Includes the complete task; no hidden integration allowance. Independently inspect the forecast and attributable agent allowance before native registration/execution.

**Files and exclusive write ownership:** Create `docs/superpowers/adoption/222-local-verification.md`; read-only source/journal/consumer/census inputs. No production repair work hidden inside verification.

**Interfaces:** Produces exact-head local behavior/lint/format/requirement coverage, including AC1–16 and explicit missing downstream evidence.

**Completion boundary:** A local aggregate verification report or precise failures, without source repair, hosted receipt integration or Close.

- [ ] Run the required local commands under the preserved budgets:

```bash
APR_SKIP_NATIVE_BROKER_TESTS=1 npm test
npm run test:slow
npm run test:packaging
npm run lint
npm run format:check
git diff --check
```

- [ ] Exercise current/historical inspection, both response sides, final acknowledgement, publication race/retry, effective dirty code drift and object-independent squash reconstruction. Reuse valid exact-head leaf evidence where applicable.
- [ ] Map each spec acceptance criterion to actual behavior/evidence; source-text assertions and skipped native suites are not substituted for it.
- [ ] Record failures and return them to a bounded owning repair leaf; do not use the verification budget as unlimited debugging.
- [ ] Independently review/commit/trace the local report. The final delivery source SHA is frozen by 25C before portable exact-head collection.

## Task 25B: Collect exact-head Linux/macOS installed and ownership evidence

**Prerequisite leaves:** 19C, 18.

**Total human estimate: 2.5 hours (maximum 4).** Engineering/docs 1.25h; verification 0.5h; independent review 0.5h; delivery 0.25h. Includes the complete task; no hidden integration allowance. Independently inspect the forecast and attributable agent allowance before native registration/execution.

**Files and exclusive write ownership:** Create `docs/superpowers/adoption/222-portable-verification.md`; use existing hosted/installed receipt tooling. No shared CI policy/source/inventory edits.

**Interfaces:** Produces required exact-source Linux/macOS ownership, owner-publication, unit and installed receipts, with host limitations and exclusions intact. The integration owner supplies a frozen delivery SHA.

**Completion boundary:** Exact-head portable evidence or explicit missing lanes; passive wait is not human effort or engaged-agent time.

- [ ] Freeze the intended source HEAD with the integration owner and verify all prerequisite POSIX mappings before any authorized push/run. No Windows/native worker is permitted.
- [ ] Collect required current ownership/owner-publication/unit/installed lanes under existing budgets and concurrency4. Current seven-worker/35-record policy is a baseline, not an excuse to omit newly adopted lanes.
- [ ] Verify each receipt binds the exact source/host/lane and installed inventory; genuine supported-host observations remain distinct from fixture conformance and skipped native cases.
- [ ] Pause passive hosted waits and record missing/failed receipts. If source changes, assess invalidated evidence instead of calling an earlier HEAD current.
- [ ] Independently review/commit/trace the report; delivery/Close/release remains25C's separate gate. Source fixes are separately forecasted leaves.

## Task 25C: Reconcile final evidence and prepare governed delivery

**Prerequisite leaves:** 24, 25A, 25B.

**Total human estimate: 2 hours (maximum 4).** Engineering/docs 1h; verification 0.5h; independent review 0.25h; delivery 0.25h. Includes the complete task; no hidden integration allowance. Independently inspect the forecast and attributable agent allowance before native registration/execution.

**Files and exclusive write ownership:** Exclusive owner of `docs/superpowers/adoption/222-final-verification.md`, final evidence manifest and delivery handoff. Read-only 25A/25B/24/census inputs; no source fixes or unsanctioned GitHub state changes.

**Interfaces:** Produces the final AC1–16 closure matrix, exact source/tree/receipt binding, independent whole-delivery review and explicit downstream completion/blockers.

**Completion boundary:** A governed delivery-ready record or exact outstanding blockers; it does not authorize the final irreversible actions itself.

- [ ] Reconcile25A/25B reports and complete the final delivery-record commit, then freeze that final source/tree HEAD. Validate existing receipts against the actual native exact-source rules. If the final documentation commit changes the required source identity, collect the required final-HEAD lanes again after it; retain those outcomes in native/GitHub records rather than creating another source commit merely to copy receipts. Never claim earlier SHAs match a later commit. Pause passive waits; do not change source while the final lanes run.
- [ ] Reaudit finite process/old-owner compatibility, package/external consumers, complete issue dispositions and actual AITM owning-workflow evidence. Registration alone is not downstream behavior verification.
- [ ] Obtain independent whole-delivery review and native Test/Review receipts. Missing external adoption or receipts remain open and block only the claims that depend on them.
- [ ] Trace the already frozen final-record commit and present concrete separately authorized integration/Close actions at the actual boundary. Do not create a further source/documentation commit after the final-HEAD receipts; any necessary write invalidates the affected exact-head claims and requires revalidation. No automatic parent/trunk push,107 activation, package release or protected-session recovery.
- [ ] If a newly required code change or broad investigation is found, return to a new bounded forecast/approval instead of exceeding the task cap.

## Specification coverage and self-review

| Accepted requirement                                                             | Implementation/verification owner                                                                       |
| -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| §1–2 product purpose, complete consumer inventory; AC1/7/8                       | 01, 06, 19, 21–25                                                                                       |
| §3 review-only boundary, external revisions, coordination; AC2/3/6               | 05, 10–16, 18–19, 25                                                                                    |
| §4.1–4.2 contextual versions and unchanged history; AC4/5                        | 06–07, 10–13, 19                                                                                        |
| §4.3 root/overlay/response/FUR/acceptance provenance; AC11/12                    | 08–12, 15–16                                                                                            |
| §4.3 pre-plan suitability and post-hydration ownership; AC15/16                  | 09, 20, 24–25                                                                                           |
| §4.4 cycles, diffs, immutable links and squash reconstruction; AC13/14           | 11–18                                                                                                   |
| §4.5 minimization                                                                | 08–09, 12–13, 19                                                                                        |
| §5.2 CI bootstrap with later owner-global223 precedence; AC9/10                  | 02, 25                                                                                                  |
| §5.3 supported process observations, seal compatibility and atomic ordering; AC6 | 03–05 before all closure-changing work                                                                  |
| §6 live backlog/external consumers and holds; AC8/16                             | 01, 21–24                                                                                               |
| §7 limits, protected records and truthful estimates; AC10                        | All tasks; forecast/attribution inspection before each native registration                              |
| §8 complete exact-head verification; §9 adoption and fresh planning              | 25A–25C, owner-adoption receipt, future native plan-review/approval boundary                            |
| Optional R2-F001 journal/provenance-and-collateral boundary                      | Explicit boundary5 and 06–14 families/16–19 families; process separation precedes their closure changes |

Self-review checks: no orphan-plan reuse; no historical schema/data mutation; no runtime proof gate renamed as a journal; no current v1 provenance backfill; all proposed interfaces have a defining task; each of five Review Focus conditions has a named behavioral owner. Task labels/forecasts are provisional, not fabricated native issues/independent estimates. Governance/document-only tasks use concrete read-back/scenario verification instead of implementation-mirroring tests. Source tests use actual temporary repositories, journal transitions and supported probe cases. Remaining independent review must challenge task size and mechanical/lifecycle interfaces before native hydration.

## Handoff

Revision 2 replaces broad tasks05/07/15/19/22/23/25 with separately forecast A/B/C leaves and adds dependency waves, disjoint ownership and single-writer integration barriers. Numeric family references in coverage mean all named leaves of that family, not a separate executable task. Every leaf is at most3.5 human hours; the four-human-hour ceiling applies to complete work including review/verification/delivery.

This file is a fresh draft implementation plan from the exact owner-adopted revision13. It has not received technical plan acceptance, owner Plan approval or execution-method selection. The orphan plan remains retired. Next: review this draft and its estimates, revise under an explicit plan revision identity if needed, complete the chosen technical plan review, then obtain native Plan approval and register bounded execution issues through their owning workflows. No implementation, downstream hydration, existing-issue supersession or merge occurs merely because this document exists.

Recommended execution method after approval: **A. Subagent-driven**, with a fresh implementer and independent reviewer per registered leaf and whole-delivery review; journal/lifecycle/process interfaces justify that scrutiny. **B. Native**, one implementer in this session with independent whole-branch review, remains available if the owner chooses it. Do not infer execution authorization from selecting a review model or accepting the source specification.
