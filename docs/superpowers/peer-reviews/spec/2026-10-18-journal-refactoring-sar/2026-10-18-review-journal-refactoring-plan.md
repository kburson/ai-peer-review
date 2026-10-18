# AIPR moderator and versioned journal refactoring plan

> **For agentic workers:** Use the executing-plans skill for inline implementation after approval and governed registration. No implementation agents are authorized by this document. Perform required independent review under the applicable review workflow and include its engagement in the owning child's limit.

**Status:** Revision 2 program planning draft, revised after source/live-backlog review. Neither artifact is adopted yet. This is a sequencing and decomposition plan; each executable leaf still needs its own source-grounded native Plan, exact tests/commands and inspected forecast. No implementation or live backlog edits have occurred.

**Goal:** Remove execution-proof obligations from AIPR's committed implementation and reconcile the open backlog around moderation and schema-versioned audit records.

**Architecture:** Reuse the existing journal, schema and renderer paths. Remove proof-only admission at its consumers; retain the minimal coordination and recovery mechanisms needed for correct moderation. Adopt each conflicting requirement/consumer decision before its affected implementation, preceded by an interim hold on obsolete execution. Verify final backlog consistency against delivered behavior afterward.

**Tech stack:** Existing Node.js ESM, JSON schemas, Markdown documentation, node:test, repository CI and AITM governed issue workflow. No new runtime dependency or storage framework is planned.

**Spec:** [Moderator and journal specification](2026-10-18-review-journal-refactoring-design.md).

## Global constraints

- Draft files are side-conversation artifacts. At adoption, register new owning work through the governed workflow; rename/copy the files with its actual issue number and commit them in its owned worktree. Do not assign #214 as owner by assumption.
- Linux/macOS only; Windows #213 deferred, unscheduled and nonblocking. R0 must establish exact owner/child source-ref CI and detached receipt scope before any cleanup push/PR/hosted run. Never bootstrap verification with Windows jobs or native compilation.
- Preserve protected unsettled review/session, historical records and every Unknown value exactly as required by the spec.
- Retain budgets `30000/15000/5000/800000 ms` and portable cap four.
- Human forecasts and cumulative agent engagement are separate. Every leaf must genuinely forecast at most four human hours, including routine gates; inspect the native recommendation before approval.
- Stop at four cumulative agent hours per child, including every reviewer/session/retry and attributable preparation. If remaining allowance is not established, stop. Preserve evidence and replan rather than extending the cap or resetting it with a new issue number.
- The previous nine-leaf/25-hour decomposition is withdrawn. All estimates below are preliminary human planning estimates, not native forecasts or guarantees. A leaf that cannot fit must be split before Develop at independently reviewable boundaries. No large remainder is hidden in an umbrella story.
- Preserve #217's 9.5-human-hour/4.5-agent-hour unapproved forecast and retained 4037.9-second conservative bound. Assign attributable work from this review, revision, SAR and later work before native approval; shared preparation needs defensible allocation, not a new zero starting point. Preserve Unknown values and stop if remaining allowance cannot be established.
- Each leaf must have adopted replacement Scope/ACs/source-plan amendments for its affected requirements before Develop. An interim hold does not authorize conflicting implementation. R8/R9A audits cannot retroactively supply that approval.
- An orchestration-only issue does not absorb implementation or unbounded analysis. Its coordination also has an explicit engagement budget and checkpoint.
- No production edits before issue binding, source-grounded deep dive, approved native Plan and required source trust checks. Use TDD for behavioral changes. Human prose needs review and lint, not tests that search its text.

## Review focus

1. A malformed or future-version record must not be reported as accepted merely because it is JSON. Add negative current-validator cases in R3.
2. A valid pending/rejected record must remain valid data without becoming workflow approval. Add outcome-separation and contextual response-schema cases in R3 and R7. Keep acceptance manifests terminal-only; do not invent a rejected manifest enum.
3. Removal of a proof check must not allow a duplicate turn, a stolen live lock, or an unrelated-process kill. Add behavioral regression cases in R4/R5.
4. Historical immutable bytes and Unknown fields must survive cleanup without migration or reinterpretation. Check byte preservation in R3/R8 and review the final inventory in R9A.
5. A hidden CLI/MCP/release/downstream caller can keep the obsolete requirement alive. Trace both imports and actual consuming behavior in R1; cover consumer boundaries in R4/R6/R7.

## Sequence and budget

| Leaf | Independently reviewable result                                                          | Preliminary human estimate | Dependencies                             |
| ---- | ---------------------------------------------------------------------------------------- | -------------------------: | ---------------------------------------- |
| R0   | Exact cleanup branch/issue Linux/macOS CI and detached Test receipt scope                |                      1.5 h | Owner adoption and governed registration |
| R1   | Dependency/shipment inventory, execution hold and requirement-change map                 |                      2.5 h | R0                                       |
| R1A  | Adopt process-observation contract without review-proof admission                        |                        2 h | R1                                       |
| R2   | Contextual current schema/format documentation                                           |                        2 h | R1                                       |
| R7   | Adopt AITM review-record interface decision and scoped consumer amendments               |                      2.5 h | R1, R2                                   |
| R5   | Deliver the adopted process-observation/ownership separation                             |                        3 h | R1A, R7                                  |
| R3   | Current journal validation and outcome separation                                        |                        3 h | R2, R5, R7                               |
| R5A  | Review-output-only participants and external-author revision handoff                     |                        3 h | R1, R3, R7                               |
| R4   | Retire review-proof production and source-approval consumers                             |                        3 h | R3, R5, R7                               |
| R6   | Retire remaining contract-adoption proof gates and CI/release coupling                   |                        3 h | R4, R5, R7                               |
| R8   | Verify directly affected governed amendments and dependencies against delivered behavior |                        2 h | R3, R4, R5, R5A, R6, R7                  |
| R9A  | Complete remaining-open-story disposition audit                                          |                        2 h | R8                                       |
| R9B  | Aggregate exact-head installed behavior, review and delivery verification                |                        3 h | R9A                                      |

These are 13 proposed reviewable units, not 13 approved native stories. Their arithmetic sum is 32.5 preliminary human hours, not a forecast or an engagement allowance. Inventory discoveries, actual routine delivery costs, or broader independent boundaries may require further splits. No implementation is hidden in R1/R1A/R7/R8/R9A documentation work. No cross-repository implementation is bundled into the contract decision.

One valid topological order is R0, R1, R1A, R2, R7, R5, R3, R5A, R4, R6, R8, R9A, R9B. The process contract and its usable implementation precede changes to hashed R3 sources. R7 is an explicit prerequisite to R3/R4/R5/R5A/R6 where their interface decisions apply. A leaf may record that a particular external interface is unaffected; it may not assume that decision silently. If a usable R5 increment cannot precede R3, revise and review the decomposition before either enters Develop; do not create a dependency cycle or deliver a broken intermediate ownership path.

Before each implementation leaf, prepare and adopt only its precise conflicting Scope/AC/source-plan/consumer amendments through the responsible workflow, preserve the prior accepted pins, and verify live read-back. The resulting amendment is a leaf admission requirement; R8 is its later conformance audit. New replacement implementation discovered during backlog disposition gets a separate bounded owner and native forecast.

## R0 — CI and native receipt bootstrap

**Files:** `scripts/ci/verification-scope.mjs`, `scripts/ci/verify-project-receipts.mjs`, their existing unit tests, and `.github/workflows/ci.yml` only if its invocation requires a change.

**Interface:** Keep `resolveVerificationScope` and `projectReceiptScope`; add only the actual governed cleanup owner/child branch and issue bindings after registration. Current `codex/aipr-journal-refactoring` resolves to `all` for push/PR, so it cannot be pushed safely before this prerequisite.

- [ ] Read the actual registered owner and planned child source refs. Do not invent issue numbers or reuse #214 authority.
- [ ] Add failing pure-function cases for the exact cleanup push/PR refs, manual selection, detached native Test issue/source/published-head binding, foreign repository, wrong branch and mismatched SHA.
- [ ] Update the closed mappings so authorized cleanup contexts select `linux-macos`; unrelated contexts retain their existing defaults and invalid detached bindings do not gain an exception.
- [ ] Verify local selector/receipt tests first. Inspect the resulting workflow matrix for zero Windows allocation before the first authorized push. Preserve #215 behavior, native checks and receipt authentication.
- [ ] Obtain required review and governed delivery with Linux/macOS-only hosted evidence. No push may be used to discover whether a Windows job was allocated.

## R1 — Containment and dependency inventory

**Files/read surfaces:** Spec section 5 paths, package exports/scripts, `.github/workflows/`, `schemas/`, `test/`, existing accepted source plans, all live open issues and relevant closed-owner history. Write the inventory into the registered cleanup issue's governed design artifact; no product code change.

**Output contract:** For each candidate record `pathOrRequirement`, `ownerIssue`, `introducingCommit`, `consumers`, `shipmentStatus`, `disposition`, `reason`, `cleanupLeaf`, and `verification`. Shipment status distinguishes integration-only, remote-trunk, packaged, published and installed; unavailable observations remain unavailable. This is a human maintenance inventory, not a new product schema or attestation framework.

- [ ] Refresh live branches/issues and inspect any #217 work completed since the recorded baseline. Preserve all WIP. Do not rely on this draft's status snapshot as current authority.
- [ ] Through the owning governed workflow, record the superseding product direction and interim hold on proof-dependent execution; map each implementation leaf to the exact accepted contract amendments it needs before Develop. Do not pause another active chat or mutate its task state from a side conversation. If another chat owns the necessary hold operation, its directly authorized operator must execute it; no unsolicited cross-chat message is implied.
- [ ] Trace production imports, public exports, CLI/MCP dispatch, CI/release commands, tests, generated artifacts and AITM consumers. Read-only starting commands:

```sh
git log --all --oneline -- scripts/lib/runtime-review-lineage-proof.mjs scripts/check-runtime-contract-adoption.mjs
rg -n 'checkNormalRuntimeReview|verifyRuntimeReviewLineage|loadProcessSourceAssurance|verifyGovernedRuntimeContractEvidence' src scripts test
rg -n 'proof|attest|adoption|process-source' package.json .github/workflows
gh api --paginate repos/kburson/ai-peer-review/issues --method GET -f state=open -f per_page=100 --jq ' .[] | select(has("pull_request") | not) | {number,title,body} '
```

- [ ] Inspect remote refs and actual package manifests/content without installing or executing retained runtimes. Record uncertainty about shipment instead of assuming the local trunk snapshot proves non-release.
- [ ] Identify exact role paths that permit reviewed-subject/code edits; classify required journal readers separately from proof-only readers.
- [ ] Review every disposition against a concrete user behavior. Freeze the leaf scope and inspect native forecasts; split oversized leaves before implementation.
- [ ] Deliver the inventory and hold record through normal review. Do not claim code cleanup from this documentation result.

## R1A — Adopt the process-observation contract

**Read surfaces:** `src/protocol/process-source-assurance.mjs`, `process-identity.mjs`, `process-source-contract-files.json`, `src/broker/portable-platform.mjs`, ownership/reconciliation callers, #141 and its accepted source plans. Output is a scoped reviewed contract decision, not product code or a new proof schema.

- [ ] For each actual operation, document required OS/host/process-instance facts, supported finite probe semantics and precision, unknown/unavailable outcomes, owned-child-handle behavior, PID reuse and descendant limitations.
- [ ] Identify and retire only review-journal/source-review/publication approval requirements. Preserve installed runtime/file integrity where it serves a concrete operational purpose, but do not require a source-review digest to make supported measured observations usable.
- [ ] Specify source-change behavior: R3's `events.mjs`, `compatibility-read.mjs`, `format-authority.mjs` and `api/validate.mjs` are in the current contract hash. Establish a usable R5 transition before changing that closure; old fixture/class approvals are not fresh production observation authority.
- [ ] Adopt the precise #141/#107 requirement amendment through their responsible workflow before R5. Freeze independent R5 test cases: live owner refuses takeover, unknown observation refuses termination, PID reuse refuses ownership, unavailable probe preserves pending state, and supported actual observations remain usable without a review-proof input.
- [ ] Inspect the native forecast. Split independent OS observation or reconciliation work before Develop if needed; preserve every retained bound and Unknown value.

## R2 — Current schema documentation

**Files:** Existing `schemas/event-v1.json`, `event-v2.json`, `manifest-v1.json`, participant/response/phase schemas, `src/protocol/format-authority.mjs`, and `src/manifest/render.mjs` as read inputs. Add `docs/reference/review-journal-formats.md` in the cleanup branch.

**Output:** One index mapping every currently emitted durable document to operation/document-family context, declared schema/format version, retained schema artifact, human explanation and reader/writer support. Document the API envelope artifact `ai-peer-review.api-response/v1` versus historical participant artifact `ai-peer-review.response/v1`: both payload boundaries can carry the response/v1 transport tag, so dispatch never uses that tag alone. No new schema family by default.

- [ ] Enumerate actual emitted record/document families and their metadata from renderer output; do not infer output solely from schema filenames.
- [ ] Document field meaning, missing/unknown values, version evolution, non-acceptance outcomes and the distinction between data validation and consuming workflow approval.
- [ ] Record any document missing a version identifier as an explicit R3 change. A breaking change receives a new version; existing schemas are preserved.
- [ ] Review docs against real example records, then run the applicable Markdown/spelling/format checks. Do not create prose-grep tests.
- [ ] Commit only the documentation result using the registered issue number. Preserve old schema and record bytes.

## R3 — Current-format journal behavior

**Files:** Modify existing `src/protocol/events.mjs`, `compatibility-read.mjs`, `format-authority.mjs`, `src/manifest/render.mjs`, and current schema files only where the inventory proves a required change. Use `validateVersionedEvent`, `reduceEvents`, `inspectReviewAuthority` and the existing response/manifest-specific checks at their actual owning boundaries. Preserve `src/api/validate.mjs:validateContract` as the API subset; it does not resolve journal `$ref`/`anyOf` and must not become a journal-schema evaluator by assumption. Add focused cases to the existing validation/manifest tests; introduce `test/unit/review-journal-validation.test.mjs` only if no existing owner test fits.

**Interface:** Preserve the existing public moderator API. Current data validation consumes operation/document-family context, recorded schema identifiers and record bytes; it does not consume producer-image identity, a proof bundle or provider credentials. Keep existing result/error structures where they already distinguish invalid, unsupported and incomplete. Version any necessary public result change explicitly and register it in R2's index; do not create a parallel generic validation API.

- [ ] Write failing behavioral tests at the existing parser/renderer entry points before changing code. Pin these independent expectations:

```js
// Test scenarios use real parser/renderer functions identified in R1.
// A valid pending journal parses as pending; it never becomes accepted.
// A real reviewer rejection/revision-request response is valid recorded data.
// Nonterminal/abandoned/superseded histories use journal inspection, not buildManifest.
// Manifest-v1 continues to refuse non-acceptance terminal variants.
// API response and participant response readers use contextual schema selection.
// Malformed referenced/nested journal fields refuse in actual event validators.
// Missing required fields reject with the actual validation error.
// A future schema reports unsupported and leaves input bytes unchanged.
// A valid current no-commit record needs no finalization Git commit.
// Current output includes its documented schema/format identifier.
```

- [ ] Run the selected focused test file and confirm each new behavior fails for the intended missing behavior, not a broken import or invented fixture shape.
- [ ] Verify the adopted R1A/R5 source-change behavior and relevant scoped contract amendments before editing hashed R3 sources. Implement the smallest changes using existing document-specific validators/registry. Do not loosen session/turn consistency or treat schema-valid data as approval.
- [ ] Add missing current-document metadata under the correct format version. Preserve fixtures representing old versions and their original bytes.
- [ ] Run focused validation/manifest/golden tests and the required complete project lanes. Review that no provider or retained runtime is executed for validation.
- [ ] Commit, independently review, verify exact head, deliver and close the leaf through the governing workflow.

## R4 — Retire review-proof production and source-approval consumers

**Files:** `scripts/lib/runtime-review-lineage-proof.mjs`, proof-only `scripts/lib/review-grammar-v0.4.1/` consumers, `test/live/process-source/authority.mjs`, related proof-only tests/commands and schemas identified in R1. Historical schema documents and original evidence remain retained.

**Interface:** Source-conformance tests consume their declared runtime/platform inputs and return measured test results. They do not require a reviewer journal to confer runtime authority. A current review record remains an audit record, not an approval proof for the source under test.

- [ ] Write failing consumer-level tests: ordinary current review validation and the retained conformance command must not request a private review workspace, a proof publication, or an exact review-producer image. Assert actual execution behavior and filesystem effects, not the absence of a source string.
- [ ] Retire new proof production and update its direct callers as one atomic change. Do not delete a module that still supplies a reader used by an R6 consumer: keep that narrowly required reader until R6 removes its last active dependency. Delete tests whose sole requirement is the retired production feature; keep substantive current-journal validation tests in R3.
- [ ] Retain historical proof/schema files as historical data with an active documentation notice; do not mutate their bytes or build a historical proof executor.
- [ ] Verify the retained conformance tests still detect incorrect OS observations, malformed results and source mismatches where those are concrete tested properties. Do not retain review-approval gates under different names.
- [ ] Run affected tests and full required lanes, obtain independent review, and deliver through native gates.

## R5 — Process observation and safe ownership

**Files:** `src/protocol/process-source-assurance.mjs`, `process-identity.mjs`, `src/broker/portable-platform.mjs`, affected ownership/reconciliation callers and their existing tests. This leaf excludes participant permission and author-submission changes.

**Interface:** Implement the adopted R1A per-operation observation contract using supported measured OS facts or actual owned child handles. Review-proof approval is not an input. Retain unknown/unavailable states, process-instance association, internal object membership and safe refusal where they serve concrete operational requirements.

- [ ] Verify the exact adopted requirement/consumer decisions before edits. Select the existing observation/ownership test entry points and pin R1A's independent failure cases with real behavioral assertions.
- [ ] Confirm new cases fail for the missing separation, then remove only the review-approval dependency at actual production callers. Preserve supported finite probe semantics, deadlines and runtime integrity checks where justified by R1A.
- [ ] Test actual installed observations on Linux/macOS under the supported contract, plus unavailable/ambiguous probe, PID reuse and unknown-owner refusal. A serialized fixture does not prove production authority or OS support.
- [ ] Verify required source changes do not leave current-class hash mismatches as an ordinary-path prerequisite. If this cannot be delivered as a usable bounded increment, stop and revise the decomposition before R3.
- [ ] Run affected ownership/recovery lanes, required full verification and independent review; deliver through native gates. No protected session reconciliation or #107 activation follows.

## R5A — Review-only roles and external subject revisions

**Files:** `skills/peer-review/SKILL.md`, `templates/author-startup.md`, `templates/reviewer-invitation.md`, `src/cli/run-core.mjs`, actual provider launch/scope paths and existing role/submission/handoff tests identified in R1. `src/protocol/events.mjs`/reducer changes require an adopted versioned decision and R5's safe source-change behavior.

**Interface:** A review participant writes only its designated response outputs. A registered participant can submit an externally revised subject reference against the expected prior revision/digest; AIPR reads and snapshots it without editing the subject. Existing role/session/turn identity, prior-response preservation and exact duplicate retries remain required. Prefer an existing supported handoff; adopt/version any necessary public request/event change before implementation.

- [ ] Before Develop, reconcile conflicting author-edit assumptions in #118/#148–#150 and affected #109/#152/#153 telemetry contracts through scoped owner amendments. Keep useful actual telemetry and same-agent SAR attribution; no new independent-review claim.
- [ ] Add failing cases: exact current response publication succeeds; launched participant source writes are denied where advertised; stale subject/revision rejects without advancement; exact retry advances once; external revised bytes yield a distinct snapshot; reviewer-turn drift never silently replaces the subject; unchanged-artifact disposition preserves its real meaning.
- [ ] Update author instructions and actual supported launch restrictions together with the accepted submission operation. Manual sessions remain instruction-bound, and tests/reports state that limitation. Do not add a new permission service or broaden shell grants.
- [ ] Preserve old event/schema bytes; version any breaking semantic change and update R2's index. Preserve pending operations without replay, automatic migration or manufactured author findings.
- [ ] Run supported participant-scope, communication, submission, duplicate and recovery behavior tests plus required full lanes and independent review. Deliver only the bounded supported behavior.

## R6 — Remaining contract, CI and release consumers

**Files:** `scripts/check-runtime-contract-adoption.mjs`, `scripts/lib/runtime-contract-evidence.mjs`, `scripts/ci/prepare-contract-adoption.mjs`, actual CI/release/import callers and related tests from R1. Keep #215's useful POSIX-only CI selection.

**Interface:** AIPR runtime/journal usability and package testability do not depend on execution-proof adoption. Repository development approval and any still-required external release policy stay explicit outside journal validation.

- [ ] Test the real ordinary start/validation/package command paths without contract-adoption evidence, proof files or review-producer image metadata.
- [ ] Remove obsolete proof checks and their generated inputs from active commands, then remove shared R4 readers/modules after their last active caller is gone. Preserve historical data interpretation through retained schema documents. Retire exports only after classifying external consumers; where a consumer still exists, settle the versioned interface decision before changing that export rather than silently breaking it.
- [ ] Retain ordinary package integrity and Linux/macOS CI tests. Change obsolete source-plan/command references where needed to prevent accidental invocation, preserving historical blobs.
- [ ] Run packaging and CLI/MCP regressions as applicable, lint/format and complete exact-head hosted lanes. Windows jobs must remain skipped by policy.
- [ ] Independent review confirms no proof-equivalent admission remains and no development delivery gate was bypassed. Complete delivery and Close.

## R7 — AITM integration boundary

**Records:** AIPR #197 and AITM #1939/#1944, with #30/#151 interface references. No cross-repository implementation is bundled into this policy/contract leaf. Its decision precedes affected implementation and does not depend on R3 implementation. #197 exact-subject verification is useful journal integrity unless a specific execution-attestation assumption is established.

**Output:** A governed shared interface decision that exports versioned review data where a consumer actually needs it. It may include artifact references, recorded outcomes, rounds and useful provenance, but makes no independent execution-attestation claim.

- [ ] Read live AITM consumer requirements and identify exactly what decision consumes an AIPR record. Do not assume a versioned journal alone grants AITM delivery approval.
- [ ] Define typed unsupported/incomplete/non-accepted outcomes and distinguish data validation from consumer approval. Retain requested/declared/observed identity distinctions and Unknown values where relevant.
- [ ] Prepare linked exact Scope/AC amendments through each repository's sanctioned workflow. If external approval is still required, keep it explicitly pending; an AIPR-only comment cannot settle it.
- [ ] Refactor or supersede #197 with bounded implementation work only after the consumer decision. Any new implementation is a separate estimated child, not hidden in this 2.5-hour contract leaf. AITM #1944's recorded 12-hour scope also needs honest bounded decomposition before its revised execution; do not count it as this leaf's deliverable.
- [ ] Review both sides for consistency and record exact adoption provenance. Historical accepted designs remain linked with an explicit supersession notice.

## R8 — Verify directly affected backlog reconciliation

**Records:** #214, #217–#221, closed #216, #141, #107, #30 and #151; accepted source plans and native dependency edges.

- [ ] Compare each live scope with delivered R3–R7 behavior and identify remaining useful work. Do not infer implementation from a new document.
- [ ] Verify the scoped amendments adopted before each implementation leaf; prepare and review any remaining exact governed amendments for keep/rewrite/supersede/split. An unadopted conflict blocks the affected leaf rather than waiting for R8. Include measurable ACs, verification commands, retained historical pointers, actual replacement owner and estimates within four hours.
- [ ] Record #216's superseding decision as additive history. Do not erase its original owner adoption, change completed timing, or reopen merely to relabel history.
- [ ] Use the sanctioned supersession/cancellation representation for unimplemented proof stories. If unavailable, report the workflow gap and stop that mutation. Never mark abandoned implementation as delivered Done.
- [ ] Reconcile #141/#107 aggregate ACs and source-plan pointers explicitly. No hidden weakening, automatic checkbox completion or Windows activation.
- [ ] Update native dependency edges through governed binding after surviving requirements have owners. Verify no active story is still gated by superseded proof work or an invalid stale Plan approval.
- [ ] Complete leaf review of the exact issue/document changes and verify live read-back.

## R9A — Remaining backlog disposition audit

**Records:** All remaining open AIPR issues, especially #118/#148–#150/#109/#152/#153/#143/#142/#156/#157/#124, #210/#212 and the broader #29–#34 program; cleanup inventory and delivered commits.

- [ ] Exhaustively page the open-issue inventory and assign keep/rewrite/supersede/split/out-of-scope with a concrete reason. New issues appearing during cleanup receive a disposition at the final snapshot.
- [ ] Rewrite affected stories only through sanctioned workflow. Preserve unrelated features and avoid scope expansion from terminology alone. Split any revised story whose actual human forecast exceeds four hours before it can enter Develop.
- [ ] Verify every inventory item has a delivered disposition or an explicit bounded surviving owner. Read-only reference searches support this audit but do not replace behavior tests.
- [ ] Large existing estimates (#149/#151 25 hours, #157 41.5 hours and others) remain historical inputs, not approved replacement slices. Disposition auditing does not include implementing their surviving features or preparing every replacement Plan inside one 2-hour leaf. Register bounded subsequent owners as required and stop aggregate completion while required cleanup obligations remain unresolved.
- [ ] Independently review the complete disposition/read-back audit. Do not operate on #210's protected provider-effect records or close #212 merely because related #190 is closed.

## R9B — Aggregate verification and delivery

**Inputs:** Delivered cleanup commits, R9A disposition audit, exact adopted source-plan/contract amendments and native dependency read-back. No new product implementation is included.

- [ ] Run the required exact-head Linux/macOS full CI and receipt verification at aggregate head. Reuse exact-head evidence only where the native workflow permits; changed heads require fresh evidence.
- [ ] Exercise an authorized ordinary installed review/record journey, duplicate submission and pending-turn recovery. Do not launch against protected unsettled sessions. Record the actual provider enforcement level and any missing genuine journey without manufacturing success.
- [ ] Confirm current format identifiers/docs, read-only validation, no required execution-proof inputs, preserved historical/schema bytes and Unknown values, and reconciled issue/dependency state.
- [ ] Obtain aggregate independent review and complete applicable governed delivery/Close. Do not claim all of #107 or deferred broader capabilities from this cleanup.

## Verification commands and acceptance mapping

Use native issue declarations for the actual accepted commands. Existing repository lanes at the inspected baseline are:

```sh
npm test
npm run test:slow
npm run test:packaging
npm run lint
npm run format:check
git diff --check
node scripts/ci/verify-project-receipts.mjs
```

These commands are not all local prerequisites on every leaf. Select meaningful focused tests from actual affected files and retain required full hosted Linux/macOS classifications under the governing project policy. Do not run native setup or all lanes again when a valid exact-head receipt is reusable. Do not treat the current `test:live:broker-handoff` script as a real journey: at the inspected baseline it only prints a paused message.

| Spec acceptance                              | Owning leaf/evidence                                                             |
| -------------------------------------------- | -------------------------------------------------------------------------------- |
| Complete inventory and requirement adoption  | R1 governed records, R9A final disposition audit                                 |
| Ordinary moderation without proof admission  | R3/R4/R5/R5A/R6 consumer behavior tests and R9B installed journey                |
| Review-only write boundary                   | R1 path inventory, R5A supported-scope tests and honest manual-session claims    |
| Versioned documents and current validation   | R2 documentation, R3 parser/renderer tests                                       |
| Historical and Unknown preservation          | Per-leaf before/after byte/record comparison; R8/R9A audit                       |
| Duplicate/recovery integrity                 | R5/R5A focused behavior tests and R9B installed recovery                         |
| No remaining proof-only active consumer      | R4/R6 dependency closure and R7 consumer decision                                |
| Open-story reconciliation                    | Per-leaf adoption and R7/R8/R9A governed read-back and native graph verification |
| Platform/engagement constraints and delivery | R0 scope prerequisite and every leaf's recorded bounds/receipts/native gates     |

## Stop conditions and handoff

Stop for a specific decision when a required external consumer cannot accept the revised interface, a necessary safety check cannot be separated within scope, the workflow cannot honestly represent supersession, a leaf forecast exceeds four hours, remaining cumulative engagement cannot be established, or the engagement limit is reached. Identify the exact remaining obligation and a smaller decomposition; preserve all work and evidence.

This plan is ready for written-spec/plan review, not execution. Owner adoption and later execution approval must establish the responsible operator, interim hold and registration of bounded leaves. Adopt conflicting scoped requirements before their affected implementation. SAR technical acceptance alone is not owner adoption, issue-change authority or native Plan approval. No message has been sent to the main thread and no live task has been changed by producing these artifacts.
