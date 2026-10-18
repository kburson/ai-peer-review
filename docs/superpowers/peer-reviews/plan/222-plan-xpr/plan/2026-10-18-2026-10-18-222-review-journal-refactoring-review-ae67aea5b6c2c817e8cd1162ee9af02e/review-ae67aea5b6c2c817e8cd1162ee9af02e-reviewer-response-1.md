<!-- ai-peer-review-template version="1" digest="sha256:78e9a634af9d540baaf6790db82952eaf39cf7ab59a6cdc7938319ae07a4cbed" -->

<!-- protected-frontmatter -->

---
schema: "ai-peer-review.response/v1"
review_id: "review-ae67aea5b6c2c817e8cd1162ee9af02e"
role: "reviewer"
turn: 1
commit_mode: "no-commit"
authority_assurance: "unavailable"
artifact_path: "docs/superpowers/plans/2026-10-18-222-review-journal-refactoring.md"
artifact_commit: "3a5293b9093fbf56288427f701356b5e2b7b6dc3"
artifact_blob: "e76bfc15addd465689e80e788a9e5fae6b0cf101"
artifact_digest: "sha256:139414a3851a2edc04d429805cc1c0cc656635745ee287409089e3acb1f3cee8"
agent:
  host: "claude-code"
  provider: "anthropic"
  model_id: "claude-opus-5-5"
  model_display: "claude-opus-5-5"
  session_fingerprint: "sha256:2747565d67cc695469ddbcc259a7b78ad2e7cb7ec3f0bb6a76318a646cba5782"
  identity_source: "runtime"
started_at: "2026-10-18T16:36:06.655Z"
submitted_at: "2026-10-18T16:42:22.420Z"
finding_ids: ["R1-F001","R1-F002","R1-F003","R1-F004","R1-F005","R1-F006"]
answered_finding_ids: []
acknowledged_supplement_ids: []
---

> **LOCAL JOURNAL MODE** — authority assurance: `unavailable`

## Summary

This is an independent XPR of plan draft 5 (`revision_id: issue-222-plan-r5`, `based_on_commit: 9130dc6fa73f80b89ddc67c4f29f055f52d08600`) for #222. The plan implements accepted spec revision 13 (`issue-222-r13`).

**Review basis and limits**

- I read the sealed snapshot `.scratch/peer-review/review-ae67aea5b6c2c817e8cd1162ee9af02e/artifacts/start.md` in full (1194 lines). I rely on the protected `artifact_digest` above for byte identity, because shell hashing was not available to this session.
- I was instructed not to use Git, so I did not inspect commit history. I read the current worktree source with read-only file tools.
- I read the accepted spec's §5.3 tail, §6 and §7 to check ordering and backlog obligations.
- I did not read the earlier SAR rounds. This review is independent of them.

**Mechanical checks I performed (all passed)**

- **Wave table.** I recomputed the earliest dependency layer of all 50 leaves from their headers. Every leaf lands in the wave the table gives it, with 25 waves in total. The cross-family edges also resolve: 18 depends on 19B, 19C on 18/20, 23A on 23B1/23B2, and 25C on 24.
- **Estimates.** Every row's components sum to its stated total. The leaf totals sum to the stated 131 human hours, and no leaf exceeds 3.5 h.
- **Grounding.** These existing interfaces named by the plan exist at the stated paths:
  - `resolveVerificationScope` and `scopePlatforms` in `scripts/ci/verification-scope.mjs`;
  - `createGitRepository` in `src/git/repository.mjs`;
  - `encodeRequestCanonical` in `src/api/canonical-json.mjs`;
  - `reduceEvents` in `src/protocol/reducer.mjs`;
  - `atomicWrite`, `atomicCreate` and `withReviewLock` in `src/protocol/store.mjs`;
  - `validateContract` in `src/api/validate.mjs`;
  - `createResponseDraft` and `sealResponse` in `src/collateral/responses.mjs`;
  - `observeOriginalProcess` and `reconcileOriginalProcess` in `src/protocol/process-identity.mjs`.
- **Existing tests.** Every test file the plan says to run before editing exists:
  - `windows-ci-deferral`, `ci-receipts`;
  - `process-source-assurance`, `portable-owner-lifecycle`;
  - `runtime-review-lineage-proof`, `runtime-contract-adoption`, `runtime-contract-evidence`;
  - `repository`, `reducer`, `responses`, `record-lineage`, `manifest`;
  - `test/live/process-source/{authority,class-review,classes}.mjs`.
- **Task 25A commands.** The npm scripts `test`, `test:slow`, `test:packaging`, `lint` and `format:check` exist, and `APR_SKIP_NATIVE_BROKER_TESTS` is honoured by existing tests.

**Assessment**

The decomposition is careful, and most of it is sound:

- The process-separation barrier (05C3) is placed before all closure-changing work.
- Each shared-file writer (07C, 11, 15B3, 19A→19D→19B, 19C, 23A, 25C) is serialized by explicit dependencies.
- Inactive preparation leaves are kept separate from activation leaves.
- The backlog partitions do not overlap.

Grounding the API and lock interfaces against current source exposed two concrete integration defects. A third, smaller ownership gap also needs fixing before native hydration:

1. **API registry (R1-F001).** The plan treats new API request and response schemas as standalone files. In current source they are generated registry artifacts, and the API-v1 response schema embeds every registered request schema. As written, the 15B3/19A/19D API leaves either break the golden registry test or change `api-response-v1.json`, which 19A promises to keep unchanged. No leaf owns the registry/MCP wiring for start/submit v2.
2. **Review lock (R1-F002).** `withReviewLock` is not reentrant within a process. Several leaves compose lock-taking helpers inside an already-held lock, which would fail with `APR_REVIEW_LOCKED`.
3. **Acknowledged context (R1-F003).** No leaf exports the stale/unavailable comparison of acknowledged context at submission. Task 10 describes it, but 15B2 is the leaf that would run it.

## Findings

### R1-F001 — New API request and response contracts ignore the generated-registry discipline, which breaks API-v1 byte preservation and leaves v2 start/submit unregistered

**Where:** Tasks 07B, 15B3, 19A, 19D, 19B.

**Current source**

- `src/api/contracts.mjs:114` defines `requestSchemas` as JS objects.
- `src/api/registry.mjs:285` (`schemaArtifacts`) maps each published file to its registry object. For example, it maps `'start-request-v1.json'` to `requestSchemas.start_review` and `'api-response-v1.json'` to `responseSchema`.
- `test/golden/api-help.test.mjs:6-14` asserts that each `schemas/<file>` equals its registry object exactly. It also asserts that `renderHelp({format:'json'})` equals `test/fixtures/api-help.json`.
- The API-v1 response schema is built from the whole request set:
  - `nextActionSchema` (`contracts.mjs:212-216`) is `oneOf` over **every** `requestSchemas` entry, keyed by tool name.
  - `diagnostics.examples` (`contracts.mjs:229`) is `oneOf` over every request schema.
  - Both are embedded in `responseSchema`, whose `$id` is `ai-peer-review.api-response/v1` (`contracts.mjs:236-247`).
- `operationRegistry` (`registry.mjs:154-179`) gives every operation the single `responseSchema` (v1) and `responseSchemaDocument: 'schemas/api-response-v1.json'`. It also sets the MCP `inputSchema` to the operation's single `requestSchema`.

**Consequences for the plan**

1. **API-v1 cannot stay unchanged through ordinary additions.** Task 19A says to "Preserve API-v1 and closed legacy schemas unchanged" while adding `inspect_review_journal` and `reconstruct_review_history`. Task 19D adds `manage_review_publication`. Adding any of these to `requestSchemas` in the normal way changes `responseSchema`, and therefore the generated `schemas/api-response-v1.json`. If the file is not regenerated, the golden test fails; if it is, API-v1 has changed. The plan names `api-response-v2.json` but does not specify:
   - how new requests are kept out of the v1 `next_action`/`examples` unions;
   - how `operationRegistry` selects a per-operation response schema.
2. **07B creates a second source of truth.** Task 07B hand-authors `schemas/start-request-v2.json`, `schemas/submit-turn-request-v2.json` and `schemas/review-publication-request-v1.json`. It also writes validators in `src/protocol/journal-lifecycle-contracts.mjs`, outside the registry. These are API request contracts for existing tools (`start_review`, `submit_review_turn`) and a new tool. Either:
   - they become registry artifacts, and 07B's standalone files and validators must be generated from the same objects; or
   - they stay outside the registry. Then `operationRegistry.start_review.mcp.inputSchema` still advertises only v1, so an MCP client cannot send a v2 start/submit request. That contradicts 19B's "equivalent CLI/MCP … versioned lifecycle requests".
3. **No leaf owns registering start/submit v2.** Task 15B3 owns "`src/api/contracts.mjs` request adapter branches" but not `src/api/registry.mjs`. Task 19A owns `registry.mjs` only for read-only additions, 19D only for publication, and 19B owns only transport files. Nobody is assigned to:
   - register the v2 versions of `start_review`/`submit_review_turn`;
   - extend `nextActionSchema` so the same tool accepts two request versions;
   - add their `schemaArtifacts` entries.
4. **The help fixture and golden test have no owner.** Every registry or error-catalog change alters `renderHelp` output. Each `operationRegistry` entry lists `errors: Object.keys(apiErrorCatalog)`, so adding errors in 19A/19D changes every operation. Yet `test/fixtures/api-help.json` and `test/golden/api-help.test.mjs` appear in no leaf's write ownership. Under the plan's own rule, "A newly discovered shared path requires an explicit ownership/dependency amendment before either worker writes it", this blocks 15B3/19A/19D mid-task.

**Failure scenario:** A worker on 19A adds `inspect_review_journal` to `requestSchemas` as the existing pattern requires. `npm test` then fails `[#145] schemas and help are exact generated registry artifacts`, because `api-response-v1.json` and `api-help.json` no longer match. The worker has two choices:

- regenerate both, which violates the 19A acceptance statement and the global "historical schema" constraint; or
- stop for an ownership amendment, which is unplanned work inside a 2.5 h forecast.

### R1-F002 — Lock-taking helpers are composed inside held locks, but `withReviewLock` is not reentrant

**Where:** Tasks 12, 14, 15B1, 15B2, 19D.

**Current source:** `src/protocol/store.mjs:360-424` takes an exclusive file lock (`openSync(lockFile,'wx')`). If the lock already exists and is held by an active token in the same process, `activeInProcessLock(lockFile)` makes it throw `APR_REVIEW_LOCKED` ("locked by another live operation in this process"). A nested call does not reenter. Existing code avoids nesting by using lock-held primitives such as `appendLockedEvents(file, priorBytes, events)` (`store.mjs:497`).

**Plan conflicts**

- **14 and 19D.** Task 14 says each of `reservePublication`, `reportPublication`, `reconcilePublication` and `releasePublication` "reloads current journal state under `withReviewLock(workspace, ...)`". Task 19D says the adapter "authenticates the bound publisher session and reservation **under the existing journal lock before invoking 14**". If 19D holds the lock and calls 14, the inner acquisition throws `APR_REVIEW_LOCKED` on every call. If 19D instead releases the lock first, authentication and mutation are no longer atomic, which is exactly the race Review Focus 3 targets.
- **12, 15B1 and 15B2.** Task 15B1 does all of the following "under the existing writer lock … [and] under that same lock": capture context, persist the immutable initial manifest, append events, check publication state and append turn-open. Task 15B2 similarly locks, then calls `sealJournalManifest` and `appendEvents`. Task 12's `sealJournalManifest({workspace,relative,model,expectedRevision})` takes a workspace and an expected revision, which implies it locks and re-reads internally. Neither 12 nor 14 states whether its exports acquire the lock or require the caller to hold it.

**Failure scenario:** 19D's `manageReviewPublication` acquires the lock, authenticates the publisher, then calls `reservePublication({workspace,…})`. That call's `withReviewLock` finds `review.lock` held by an active in-process token and throws `APR_REVIEW_LOCKED`, so publication coordination can never succeed. The 19D unit tests would surface this only after 14 was already delivered with an incompatible contract, so 14 would need rework outside its forecast.

### R1-F003 — The submission-time acknowledged-context comparison has no defining interface or owner

**Where:** Tasks 10 and 15B2.

**Plan text**

- Task 10's step says: "At reviewer submission capture 08 context and compare the entire tuple; stale changes refuse … If provenance capture is unavailable, retain the authenticated participant decision as provenance-incomplete … a changed available tuple is stale and refuses advancement."
- Task 10's **Interfaces** export only `validateFurRevision` and extensions to `createResponseDraft`/`sealResponse`. Its files contain no submission controller.
- Task 15B2's ports include `captureReviewContext` and `validateFurRevision`, but no comparison function. Its tests ("stale available acknowledged context, unavailable provenance") assume that semantics exist.

**Effect:** The three-way outcome (current / stale-refuse / unavailable-retain-as-provenance-incomplete) is the core of the stale-reviewer protection behind spec §4.3 and Review Focus 1. As written:

- the 10 worker cannot implement or test this step without a submission path;
- the 15B2 worker is likely to re-derive it ad hoc inside orchestration, outside 10's review.

The plan's self-review claims "all proposed interfaces have a defining task", which does not hold for this behaviour.

## Required changes

1. **R1-F001:** Add an explicit API-registry decision and assign its ownership.
   - **Response versioning.** State how new operations and request versions coexist with the generated registry. For example: a separate `requestSchemasV2` and `responseSchemaV2` with their own `nextActionSchema`/`examples` unions, plus a per-operation `responseSchemaDocument`. The existing `requestSchemas`, `responseSchema` and `schemas/api-response-v1.json` would then stay byte-identical.
   - **Single source of truth.** Make 07B's request schema files registry-generated artifacts from one object source. 07B's validators then wrap or derive from those objects rather than keeping a second hand-written copy. Alternatively, state that these files are not API requests and explain how CLI/MCP reach them.
   - **Registration owner.** Assign one leaf (15B3 is the natural owner, since it activates start/submit v2) to register v2 `start_review`/`submit_review_turn` in `registry.mjs`. That includes MCP `inputSchema` versioning and `schemaArtifacts` entries. Serialize it with 19A/19D as today.
   - **Golden files.** Add `test/fixtures/api-help.json` and `test/golden/api-help.test.mjs` to the write ownership of each registry-changing leaf (15B3, 19A, 19D, and 19B if help topics change), serialized by the existing chain.
   - **Acceptance.** Add an acceptance check that `schemas/api-response-v1.json` and the existing v1 request artifacts are byte-unchanged after 19D.
2. **R1-F002:** Specify the lock contract for every exported lifecycle/manifest helper that is composed by an orchestrator.
   - For 12 (`sealJournalManifest`) and 14 (the four publication operations), either export lock-held variants that take the caller's lock context or prior bytes, matching the existing `appendLockedEvents` pattern, or state that the helper alone acquires the lock and that authentication runs inside it through an injected authenticator.
   - Make 15B1/15B2/19D consume the chosen form.
   - Add a test in 14 (and 12 if applicable) that calls the operation from within a held `withReviewLock`, or from the 19D adapter path, so that nested-lock refusal is caught before 19D.
3. **R1-F003:** Define and export the submission-context comparison in Task 10 and add it to 15B2's port list.
   - Suggested signature: `compareAcknowledgedContext({acknowledged, current}) -> {status:'current'} | {status:'stale', changed} | {status:'unavailable', reason}`.
   - Task 10 owns its unit tests for all three outcomes.
   - 15B2 owns only the controller reaction: refuse, advance, or retain as provenance-incomplete.
   - Alternatively, move the step and its outcomes into 15B2's interfaces explicitly and remove it from Task 10.

## Optional suggestions

### R1-F004 — Align the publication operation signatures with the 07B request bindings

Task 07B says every `manage_review_publication` action binds `requestId`, `reviewId`, `publisherSession`, `expectedRevision`, ordered `cycleIds` and result digests. Task 18 says report is invoked "with the same reservation and committed result digests". However, Task 14's `reportPublication`, `reconcilePublication` and `releasePublication` signatures carry only `reservation` and `outcome`, with no `cycleIds`/`resultDigests`. Either:

- add the cycle and digest bindings to those signatures; or
- state that `outcome` carries them and that 14 verifies them against the reservation.

That way 19D's "wrong cycle/digest" rejection test has a defined source.

### R1-F005 — Reconcile the generic disposition text with 23B1/23B2's early position

23B1 and 23B2 sit in wave 13, after only 01 and 21. They reuse the 22-family step "Compare only its requirements affected by this cleanup with **completed behavior** and actual consumers". At wave 13, almost none of the journal, role or publication behaviour exists yet. Spec §6 requires only "Record a disposition after checking their live text and references" for these issues, so the early placement is defensible. Two adjustments would make that explicit:

- reword the 23B steps to that requirement;
- add a rule that any candidate found to be affected by later behaviour is deferred to a post-19C bounded proposal rather than dispositioned early.

23B2 also contains #213. State that its disposition is "keep deferred, no mutation beyond reference", consistent with the global constraint that #213 stays unscheduled.

### R1-F006 — Name the concrete generated inventories that each delivery must refresh

The parallel-ownership rule requires "generated inventory refresh at each earlier source delivery … serialized against all other inventory writes", but does not name the inventories. In current source, `src/protocol/process-source-contract-files.json` is the tracked one. It is generated by `scripts/generate-process-source-contract.mjs` and checked by `process-source-assurance`, `portable-consumer-inventory`, `portable-authority-fences` and `authority-entrypoints`. The packed `runtime-inventory.json` is produced at pack time by `scripts/pack-runtime.mjs`.

Leaves in the same wave can change the import graph of closure files. Examples are 08 (`src/git/repository.mjs`), 10 (`src/collateral/responses.mjs`) and 11 (`events`/`reducer`/`store`/`service`). Stating three things would make the rule operational:

- which tracked inventories exist after 05C3;
- that the integration owner regenerates rather than hand-merges them;
- which tests prove coherence.

## Decision

revisions-requested
