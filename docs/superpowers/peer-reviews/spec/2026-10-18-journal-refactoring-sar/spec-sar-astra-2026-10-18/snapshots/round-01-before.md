# AIPR moderator and versioned journal refactoring specification

**Status:** Draft for owner review. This document does not modify live issue authority or authorize implementation.

**Date:** 2026-10-18

**Revision:** 2 — incorporates the read-only code/backlog review; pending owner adoption and requested SAR. Revision does not authorize implementation or live issue changes.

**Companion plan:** [Refactoring plan](2026-10-18-review-journal-refactoring-plan.md)

**Issue ownership:** No cleanup issue has been registered. Existing issue numbers below identify affected work, not ownership of this new specification. Add the new owning issue number to these filenames when registering them through the governed workflow.

## 1. Purpose and owner direction

AIPR is a moderator for agent review. It coordinates review turns, records the results, and formats review documentation consistently so humans and agents can audit it. Review agents inspect the submitted artifact and relevant codebase. Their output is review documentation; they do not implement changes to the codebase under review.

The owner explicitly rejected execution proof as a product purpose and requested an audit and refactoring of already committed support, followed by reconciliation of open stories before their execution. This specification implements that direction. It replaces the proposed direction of #216 if adopted; the earlier document, review, adoption statement, and completed-story history remain historical records.

Success means that a useful review can be moderated and audited without producer-image attestation, proof publication, or approval of an execution-proof chain. Current records identify their format and validate against its documented schema. Historical records remain readable as historical documents with their associated schemas, without a promise that every historical workflow remains executable.

## 2. Scope and alternatives

Selected approach: remove the unnecessary proof/approval layer at its actual consumer boundaries, reuse existing journal/schema facilities, and preserve coordination mechanisms whose behavior has a concrete operational purpose.

Rejected alternatives:

1. Rename proofs to journals while retaining the same execution-attestation gates. This preserves the unwanted mechanism.
2. Delete everything named evidence, authority, lineage, or receipt. This would remove useful audit history and may break turn routing, safe recovery, or unrelated development governance.

In scope:

- Inventory committed code, tests, schemas, generated data, CI/release commands, documentation, public exports, and downstream consumers associated with review proof or approval authority.
- Determine each item's actual consumer and shipped status before changing it.
- Remove unnecessary proof generation, execution-attestation admission, and publication prerequisites.
- Preserve or simplify the current review journal and current-format validation.
- Enforce the review-only role boundary through existing supported mechanisms and honest instructions.
- Reconcile affected open issues, accepted design/plan pointers, ACs, verification commands, dependencies, and aggregate completion obligations.

Out of scope:

- A new generic evidence engine, cryptographic attestation service, schema framework, policy engine, database redesign, or migration program.
- Implementation or delivery by participants in an AIPR review session.
- Unrelated knowledge retrieval, analytics, experimentation, or global-install redesign.
- Activation of #107, Windows support, or operating on protected unsettled sessions.

## 3. Product boundary

### 3.1 Review and write behavior

- AIPR routes the selected artifact and relevant context to review participants and collects their responses, findings, dispositions, and recorded decisions.
- Review participants may write only their designated current review-documentation outputs. They may not edit application source, dependencies, configuration, Git metadata, another participant's response, or earlier sealed records.
- AIPR-owned writes are limited to its declared coordination state and designated review documentation. AIPR does not implement source changes or commit the reviewed codebase.
- If an external author revises the artifact, AIPR records the new artifact identity/version and a subsequent review. That revision belongs to the external authoring workflow, not an AIPR permission to modify the subject. The registered submitting participant supplies the revised artifact reference and expected prior review revision/subject digest through an explicit handoff. AIPR reads and snapshots those bytes; it does not apply a patch to the subject. Existing role/session authentication remains required.
- An artifact change during a reviewer turn invalidates that turn for the prior bytes; it cannot silently replace the reviewed subject. A revision handoff must bind the new digest, preserve prior responses, invalidate stale submissions and retain duplicate-safe retries. An unchanged-artifact response remains possible with an explicit disposition; neither a revision nor a new acceptance is inferred from silence. The exact supported existing operation or necessary versioned change must be adopted before its implementation.
- Review-only participant behavior is a separate workstream from process observation and owner recovery. Current author artifact-write instructions, CLI submission behavior, launch restrictions, and #118/#148–#150 author-capable requirements must be reconciled together; removing a write permission alone is insufficient.
- Existing flows that let an AIPR author participant edit the subject must be assessed explicitly against this boundary. Removing proof alone does not resolve that conflict.
- Supported provider path restrictions may enforce the boundary. Existing manual sessions remain instruction-bound where the host offers no enforcement. Do not build a new sandbox or claim that instructions prove write denial.
- A controller cannot manufacture a participant's findings or acceptance. Exit, silence, timeout, successful JSON validation, and schema compatibility are not review acceptance.

### 3.2 What records establish

A record describes the activity reported and recorded by AIPR: the artifact version, participants, turns, findings, responses, decisions, timestamps when available, and recorded outcome. Validation establishes supported format and internal consistency. Artifact hashes associate records with bytes and can detect changed bytes when compared with retained values.

These checks do not independently establish provider execution, model execution, uncompromised host behavior, or a cryptographic reviewer identity. Requested, declared, observed, unavailable, and uncertain values retain their original meanings. Do not strengthen them by changing labels.

### 3.3 Coordination mechanisms to preserve

Keep mechanisms needed for correct moderation:

- Review/project/role/session/turn association and the existing local authentication needed to prevent misrouting.
- One writer for a state transition, expected-revision checks, atomic persistence, and duplicate-safe retry behavior.
- Artifact/response version association, prior-response preservation, and explicit lifecycle outcomes.
- Read-only diagnosis and supported recovery of a pending turn without launching duplicate participants.
- Ownership checks that prevent taking a live lock or terminating an unrelated process. Timeout or endpoint silence alone does not establish process death.
- Ordinary supported filesystem access and containment checks for AIPR's own writes.

Keep a mechanism because a named behavior requires it, not because an old proof contract requires a field. Development issue approvals and CI integrity remain separate from the product journal; this refactoring does not bypass the repository's governed delivery workflow.

## 4. Versioned record contract

### 4.1 Use existing formats first

Existing `schemas/event-v1.json`, `schemas/event-v2.json`, `schemas/manifest-v1.json`, participant/response schemas, renderers, and validators are the starting point. Do not introduce a new format merely to rename the system.

Inventory each currently emitted durable document. Its machine-readable data must identify its schema family and version, interpreted in its documented operation/document-family context. Human-readable review documents must carry a documented schema/format identifier in their metadata. The associated schema document must explain structure and field meanings. A package version or producer image digest is not a schema version.

Add missing metadata only in the appropriate versioned format. A breaking field or semantic change requires a new schema version; do not silently change the meaning of an already published version. Historical schema definitions and their explanatory documents remain available. Fixing documentation errors may be additive with an explicit erratum; do not rewrite historical bytes to make an old record validate differently.

### 4.2 Current reader and writer behavior

- The current writer emits the current documented version for each document family.
- The current validator dispatches through a fixed package-owned set of supported operation/document-family and schema-identifier combinations. The API envelope uses schema artifact `ai-peer-review.api-response/v1` while its transport tag is `ai-peer-review.response/v1`; historical participant responses also use that transport identifier with `schemas/response-v1.json`. Preserve the adopted contextual dispatch rule and both historical schema artifacts. A tag alone must not select a reader.
- Use existing event validation, event reduction and document-specific checks for journal interpretation. `src/api/validate.mjs:validateContract` is an API-contract subset, not a JSON Schema evaluator for journal documents: it does not resolve `$ref` or evaluate `anyOf`, and its `oneOf` branch returns before sibling constraints. Do not route journal schemas through it or advertise full JSON Schema validation without a separately justified, bounded implementation. Existing API validation is not weakened by this cleanup.
- A fixed package-owned registry may select only supported local document checks. An input cannot select executable code, a retained runtime, or a remote schema download.
- Validate required fields, supported values, associated review/artifact/turn references, and applicable recorded transition consistency.
- Distinguish malformed input, unsupported format, incomplete records, and well-formed records with a non-accepted outcome using each existing format's real enums. A reviewer rejection or revision request is valid response/event data; it need not be a terminal journal status. Existing `buildManifest`/manifest-v1 accepts terminal acceptance variants only. Pending, abandoned, superseded or otherwise non-accepted event histories are inspected at their journal/response boundary, not forced into acceptance manifests. Introducing another terminal outcome or changing manifest semantics requires an explicit versioned decision. A recorded non-acceptance is not itself malformed.
- Validation must not require provider execution, model attestation, an exact installed producer image, a source-class approval, a Git finalization commit, a primary enrollment operation, or a published proof bundle.
- Unknown/future schemas produce an explicit unsupported-format result without modifying the input. Missing schema metadata is reported as such; no guessed version or automatic migration.
- Existing historical readers may remain where useful and inexpensive. New development is not obligated to add historical runtime replay, retained-image execution, automatic migration, or universal old-version acceptance.
- Validation of a recorded outcome does not approve an artifact or satisfy a consuming system's approval policy. External consumers make their own explicit workflow decisions from the recorded data.

### 4.3 Data minimization

Retain useful audit information without adding unrestricted provider output, credentials, private session handles, or private filesystem details to public exports. Existing sensitive historical records are not republished by this cleanup. A routine copy/export, if still required by a concrete consumer, is a versioned data interface rather than an attestation.

## 5. Initial verified inventory and cleanup classification

Inspection baseline: integration worktree `story-141-storage/ai-peer-review`, branch `feature/child/141`, HEAD `db0febda2e07f827a5c5f47808bcf27ad64e0ed9`. Local `origin/trunk` snapshot: `7a17a736ddfab84b6a36b9fc3733e293ea3709cd`. These are inspection references, not claims about current release status.

| Area                                                                                                                                                 | Observed owner/history                      | Required disposition investigation                                                                                                                                                                                            |
| ---------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `scripts/lib/runtime-review-lineage-proof.mjs`, `schemas/runtime-review-lineage-proof-v1.json`, pinned `scripts/lib/review-grammar-v0.4.1/`          | Closed #144                                 | Retire proof production and proof-only grammar consumers. Preserve historical records and schemas needed to interpret them. Extract shared validation only where a retained current journal behavior actually needs it.       |
| `scripts/check-runtime-contract-adoption.mjs`, `scripts/lib/runtime-contract-evidence.mjs`, `scripts/ci/prepare-contract-adoption.mjs`               | Closed #144                                 | Trace development/release consumers and remove the review-proof prerequisite. Preserve legitimate external approval policy outside product journal validation. Coordinate affected consumers before retiring exports.         |
| `test/live/process-source/authority.mjs`, `class-review.mjs`, `classes.mjs`, capture/registration helpers                                            | Closed #170 and continuation work           | Remove mandatory review-as-proof admission. Retain useful portability tests and bounded results without requiring a journal approval chain.                                                                                   |
| `src/protocol/process-source-assurance.mjs`, `process-identity.mjs`, `src/broker/portable-platform.mjs` and ownership/recovery callers               | Closed #167/#187 and broader #141           | Separate OS/process observations needed for safe coordination from externally approved source-class authority. Do not delete reliable ownership checks or enable uncertain takeover.                                          |
| `src/manifest/render.mjs`, `src/protocol/events.mjs`, `compatibility-read.mjs`, `format-authority.mjs`, `record-lineage.mjs`, `src/api/validate.mjs` | Existing journal and compatibility behavior | Retain useful recorded history, schemas, turn integrity and validation. Remove proof-only coupling and unsupported execution claims. A journal lineage can remain a history relationship without being execution attestation. |
| #216 contract document and #215 exact-POSIX CI change                                                                                                | Closed #216 and #215                        | Supersede #216's active requirements after adoption of this spec. Retain #215's Linux/macOS-only CI selection where useful; it is not proof-specific merely because #214 owned it.                                            |

For every candidate, the execution inventory records: path/export or requirement, introducing owner/commit, live callers, public/downstream consumers, branch/trunk/package/release location, preserve/simplify/remove/archive disposition, concrete reason, owning cleanup child, and verification. Inspect tests and generated files as well as production imports. Keyword matches alone are not removal authority.

The five specifically inspected proof/adoption/source-assurance files were absent from the local trunk snapshot above. Do not infer they were never published, installed, or consumed. Check remote refs and actual package contents/version before selecting a compatibility or removal strategy. Do not delete worktrees, commits, released package history, or original audit evidence.

### 5.1 Refreshed read-only observations

At revision-2 review, the fresh worktree remained clean on `codex/aipr-journal-refactoring` at `db0febda2e07f827a5c5f47808bcf27ad64e0ed9`. The complete live issue listing contained 38 open issues. #214 was open/Develop and #217 open/Plan; #215/#216 and #144/#167/#170/#187/#190/#209 were closed. These observations must be refreshed before workflow changes.

Remote trunk remained `7a17a736ddfab84b6a36b9fc3733e293ea3709cd`; remote `feature/child/141` was `81e1d58264485883d6bdda4d77a6906b9a4b84d9`, behind the local integration baseline. GitHub listed release assets through v0.2.2. The scoped npm metadata lookup returned E404; this establishes only that lookup result, not absence from all distributions or installations. Actual package content and installed-consumer inventory remain execution-inventory obligations.

### 5.2 Verification bootstrap prerequisite

The current `scripts/ci/verification-scope.mjs` closed branch list does not include `codex/aipr-journal-refactoring` or future cleanup-child branches. Pure resolver probes select `all`, including Windows, for push and pull-request events on this branch. Before any cleanup push/PR/hosted run, a bounded prerequisite must bind the actual governed owner/child branches to Linux/macOS-only verification. Update the detached native Test mapping in `scripts/ci/verify-project-receipts.mjs` for the same exact issue/source refs. Test push, PR, manual and detached contexts; foreign/mismatched refs must not gain the exception. Preserve ordinary default scope elsewhere and #215's useful behavior. Do not push first to obtain a Windows-containing bootstrap run.

### 5.3 Process observations without review-proof admission

`process-source-assurance.mjs` currently requires classes containing `acceptance.reviewDigest` and `approvalDigest`; installed observations refuse when no matching class exists. `events.mjs`, `compatibility-read.mjs`, `format-authority.mjs` and `api/validate.mjs` belong to its hashed source closure. Changing them before addressing this contract can invalidate installed class matches. A later cleanup step cannot be assumed to repair an earlier delivered leaf.

Before any affected source edit, adopt a per-operation contract distinguishing: (1) measured process/host facts, finite supported platform/probe semantics and package integrity needed for safe decisions; (2) useful recorded test/conformance results; and (3) obsolete review-approval inputs. Production observations must derive from the supported OS probe or an actual owned child handle, remain bound to the relevant process instance/host and operation, and preserve Unknown/unavailable results. Absence or endpoint silence must not imply descendant discharge, unrelated-process kill permission or universal host support. A fixture or serialized approval object cannot mint production observation authority.

Remove the requirement for a review journal, accepted source-class review or published proof to make an otherwise supported observation usable. Retain finite measured probe semantics where operationally necessary, without turning their documentation into a replacement review-approval gate. Define the supported Linux/macOS observation/reconciliation cases, PID reuse/precision behavior, failure results and source-change behavior before implementing this separation. Installed runtime/file integrity checks are not automatically obsolete merely because they use hashes. If this separation cannot be delivered independently, regroup its affected edits into smaller usable increments before Develop; do not ship a knowingly broken intermediate ownership path.

## 6. Open-story reconciliation after code cleanup

Before code cleanup, record an interim governed hold on affected proof-dependent execution so existing Plans cannot continue by stale authority. This is containment, not the final backlog rewrite. A hold alone does not supersede accepted requirements. Before each affected implementation leaf, adopt its exact replacement Scope/ACs, relevant source-plan/contract amendments and consumer decision through the owning workflow. R1 records that prerequisite and each leaf verifies it; final reconciliation after verified behavior is a completeness audit, not the first authorization to diverge from an accepted contract.

| Issues                                                                               | Required treatment                                                                                                                                                                                                                                                                                                              |
| ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| #214, #217–#221                                                                      | Supersede the proof program or rewrite narrowly useful pieces as current-format audit/coordination work. Do not close unimplemented stories as delivered. Preserve their original scopes, estimates, decisions and relationships as history.                                                                                    |
| Closed #216                                                                          | Record a superseding product decision without rewriting the original adoption or pretending its completed document was code delivery. No automatic reopen.                                                                                                                                                                      |
| #141, #107                                                                           | Amend surviving Scope, ACs, source-plan links and aggregate child requirements. Remove the proof program as a completion prerequisite while retaining required Linux/macOS coordination guarantees. Do not silently tick or weaken old ACs.                                                                                     |
| #197 and AITM #1939/#1944                                                            | Reconcile the producer and consumer together. A consumer may validate a versioned review record and apply its own policy; it must not receive a false claim of proven execution. Preserve an explicit interoperability requirement only if that consumer still needs it.                                                        |
| #30, #151                                                                            | Keep the needed journal/audit layout, artifact references and historical relationships. Reassess mandatory publication envelopes, producer-bound lineage, patch chains and approval authority against actual audit needs. Do not replace them with a parallel evidence architecture.                                            |
| #118, #148–#150, #109/#152/#153, #142, #156, #157, #124                              | Review SAR/author revision, identity, write scopes, author metrics, recovery and conformance for conflicting assumptions. Preserve useful measured telemetry and session routing. Reconcile review-only permissions with external author revisions before implementation; keep same-agent SAR distinct from independent review. |
| #29, #31–#34, #130, #143, #146–#147, #154–#155, #210, #212 and all other open issues | Record a disposition after checking their live text and references. Related terminology is not evidence that the whole feature is unwanted. Out-of-scope work stays out of scope with its reason recorded.                                                                                                                      |

Each affected story receives a specific keep/rewrite/supersede/split decision, retained original reference, replacement owner/dependencies if any, measurable ACs, verification commands and an estimate within the limits below. Use sanctioned creation, issue-body, dependency, state and closure operations. Superseded/cancelled work must remain visibly distinct from implemented/verified Done work. If the installed workflow has no sanctioned supersession representation, stop and identify that exact workflow gap; do not invent a state jump or repurpose Done.

Native dependencies must not leave active stories blocked by an abandoned proof requirement. Conversely, do not remove a dependency until its surviving requirement is assigned and its actual prerequisites are represented. Cross-repository changes require the corresponding owning workflow, not an AIPR-only declaration that the consumer has changed.

## 7. Preservation and execution limits

- Linux and macOS are the only supported runtime targets. Windows #213 remains indefinitely deferred, unscheduled and nonblocking. No Windows worker or native build.
- Preserve `review-2bdf5dd8ee56accc6e494643054a3cf1` and Claude session `1c82a9bc-d4dd-4d10-92b5-022615f0abcd` unchanged and unsettled. Never use them as test inputs or operate on them to complete this work.
- Preserve historical timing rows and every Unknown timing value. No backfill, inferred zero, repaired accounting, fabricated review acceptance, or deletion of prior evidence.
- Retain operation/query/portable/test budgets `30000/15000/5000/800000 ms` and portable concurrency cap four.
- The original nine-leaf/25-hour proposal is withdrawn as an execution decomposition. The revised plan separates CI bootstrap, process contract/implementation, review-only roles, scoped preimplementation adoption, backlog disposition and aggregate verification. Provisional numbers are not native forecasts. Large existing story estimates (including #149/#151 at 25 hours, #157 at 41.5 hours and AITM #1944 at 12 hours) are not executable bounded replacements. Decompose surviving work honestly and do not hide it in reconciliation.
- #217's original forecast remains 9.5 human hours and 4.5 agent engaged hours, unapproved. Its retained conservative engagement bound is 4037.9 seconds. Add subsequent attributable preparation/review to substantially the same work; neither a new owner nor this revision resets it. Preserve native Unknown values.
- Every executable cleanup story has an independently inspected human forecast of four hours or less, including routine review/verification/delivery. A budget is not evidence that the work fits it.
- Independently enforce a four-hour cumulative agent-engagement limit across preparation, investigation, planning, implementation, debugging, review, verification, delivery, all agents, sessions and retries. No reset on rewrite, reassignment or supersession of substantially the same work.
- Pause passive external waits. Use defensible retained bounds for enforcement without repairing native Unknown values. If allowance cannot be established, stop for replanning. Stop at the boundary; a proven overrun fails/scraps that plan and preserves its work/evidence.

## 8. Acceptance and verification

1. An adopted product statement and complete candidate inventory account for all identified code, test, schema, package, CI, release and external-consumer dependencies.
2. A current-format ordinary review can start, record multiple turns/findings/responses and a real recorded outcome without producer-image proof, proof publication, source-class approval or Git finalization.
3. AIPR-launched review participants have the documented review-output write scope at the actual enforcement level. The moderator does not edit implementation code or commit the subject. External subject revisions are recorded distinctly.
4. Every newly emitted durable review document names a documented schema/format version. Current validation uses contextual schema dispatch and document-specific checks, distinguishes malformed, unsupported, incomplete, and well-formed non-accepted records, preserves manifest-v1 terminal semantics and input bytes.
5. Historical records and schema definitions remain intact. Their old outcome labels and uncertainty remain truthful, with no implicit migration or stronger retrospective assurance.
6. Duplicate submissions, changed artifact versions, interrupted handoffs and uncertain launches retain honest behavior; locks are not stolen and unrelated processes are not terminated.
7. Proof-only production/approval consumers are removed or explicitly retired, with a disposition for any retained external interface. No renamed equivalent gate remains on the ordinary path.
8. All open issues are dispositioned, affected live requirements and dependencies reconciled, and obsolete execution plans made inactive through sanctioned workflow. Supersession is not represented as implementation success.
9. Meaningful focused behavior tests, the required complete exact-head Linux/macOS verification lanes, applicable independent review and governed delivery/Close gates pass for each delivered cleanup child. Reuse valid exact-head evidence where permitted. Missing tests or receipts remain missing; do not substitute file-text assertions for behavior.
10. Windows deferral, unsettled evidence, Unknown timing and per-child engagement limits are preserved and verified at handoff.

## 9. Adoption and handoff

This side-conversation draft changes no live issues, timers, source, Git state, provider sessions, or main-thread instructions. Written-spec adoption and the companion plan's approval are required before execution. The owner-authorized governing operator in the existing fresh worktree must record the new decision, establish the interim execution hold through the responsible workflow, refresh live issue/code state, and register bounded work before implementation. No action or message in another chat is authorized by this document. If a hold needs that chat's operator, obtain direct owner routing rather than assuming it received a message. Participant SAR findings/technical acceptance do not substitute for owner adoption or native Plan approval. Earlier authorization to drive #214's old proof children to Done is not a reason to keep executing superseded requirements.
