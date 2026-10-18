<!-- ai-peer-review-template version="1" digest="sha256:78e9a634af9d540baaf6790db82952eaf39cf7ab59a6cdc7938319ae07a4cbed" -->

<!-- protected-frontmatter -->

---
schema: "ai-peer-review.response/v1"
review_id: "review-ae67aea5b6c2c817e8cd1162ee9af02e"
role: "reviewer"
turn: 2
commit_mode: "no-commit"
authority_assurance: "unavailable"
artifact_path: "docs/superpowers/plans/2026-10-18-222-review-journal-refactoring.md"
artifact_commit: "3a5293b9093fbf56288427f701356b5e2b7b6dc3"
artifact_blob: "219939e315d1238967adf15f775480f9ed93ce5b"
artifact_digest: "sha256:40f42a01820509ed7d24afe13291fdceabe0f1bd565da0548191da065951afb7"
agent:
  host: "claude-code"
  provider: "anthropic"
  model_id: "claude-opus-5-5"
  model_display: "claude-opus-5-5"
  session_fingerprint: "sha256:2747565d67cc695469ddbcc259a7b78ad2e7cb7ec3f0bb6a76318a646cba5782"
  identity_source: "runtime"
started_at: "2026-10-18T16:36:06.655Z"
submitted_at: "2026-10-18T16:49:03.803Z"
finding_ids: ["R2-F001","R2-F002"]
answered_finding_ids: []
acknowledged_supplement_ids: []
---

> **LOCAL JOURNAL MODE** — authority assurance: `unavailable`

## Summary

This is the round-2 independent XPR of plan revision 6 (`revision_id: issue-222-plan-r6`, `based_on_commit: 3a5293b9093fbf56288427f701356b5e2b7b6dc3`). It follows the round-1 reviewer response (R1-F001–R1-F006) and the author's response 1, which claims to address all six.

**Review basis and limits**

- I read the sealed turn snapshot `.scratch/peer-review/review-ae67aea5b6c2c817e8cd1162ee9af02e/artifacts/turn-1.md`. I read in full every section touched by the revision:
  - header, work boundaries, task and wave tables, parallel ownership rules;
  - Tasks 07B, 07C, 07D, 10, 11, 12, 13, 14, 15A, 15B1–15B3, 16–18, 19A, 19D, 19B, 19C, 23B1, 23B2;
  - coverage table and handoff.
- I rely on the protected `artifact_digest` for byte identity, because shell hashing was not available to this session. I did not use Git.
- I re-checked against current source the claims the revisions depend on:
  - `scripts/generate-process-source-contract.mjs` accepts exactly one optional `--check` argument (lines 43–49).
  - `test/unit/portable-consumer-inventory.test.mjs`, `test/unit/portable-authority-fences.test.mjs` and `test/integration/authority-entrypoints.test.mjs` exist and reference `process-source-contract-files.json`.
  - `withReviewLock` non-reentrance and the `appendLockedEvents` lock-held primitive (`src/protocol/store.mjs:360-424`, `:497`) are as the revision describes.

**Mechanical re-verification**

- **New leaf.** 07D adds 3.0 h, with components 1.5 + 0.5 + 0.5 + 0.5. The aggregate becomes 131 + 3 = 134 h across 51 leaves, matching the stated totals.
- **Waves.** 07D depends only on 07B, so it lands in wave 10, as the table shows. 15B3 now also depends on 07D, but its binding prerequisite is still 15B2 (wave 15), so 15B3 stays in wave 16. No other leaf's earliest layer changes, and 25 waves remain correct.
- **Wave-10 write sets.** 07D's write set (`src/api/{contracts,registry,journal-contracts-v2,validate}.mjs`, `schemas/api-response-v2.json`, the golden help test and fixture) is disjoint from its wave-10 siblings: 06B owns scripts and live conformance, and 07C owns `journal-contracts.mjs` and `compatibility-read.mjs`. 07D is serialized after 07B on the one file they share, `src/api/journal-contracts-v2.mjs`.

**Disposition check**

- **R1-F001 — resolved.**
  - 07B now defines the three API request objects once in `src/api/journal-contracts-v2.mjs` and emits their JSON from those objects. Its validators consume the same definitions.
  - 07D freezes the existing `requestSchemas`/`nextActionSchema`/diagnostics/`responseSchema` to the v1 request set. It adds separate V2 unions and envelope, plus a fixed `resolveOperationContract({operation,schema})` that refuses unknown combinations.
  - 07D also tests raw-byte invariance of every v1 request artifact and `api-response-v1.json`.
  - 15B3 explicitly owns registering start/submit-v2, MCP closed-version advertising and their artifacts.
  - Every registry or help writer (07D → 15B3 → 19A → 19D → 19B) now owns its serialized golden fixture and test refresh and reruns the byte-invariance check.
  - The work is budgeted as a separate leaf rather than hidden in 15B3. This closes the second-source-of-truth, unregistered-v2 and unowned-fixture gaps.
- **R1-F002 — resolved.**
  - 12 exports only `sealJournalManifestLocked`. That function never acquires the lock and takes caller-loaded `priorState`, following the `appendLockedEvents` pattern.
  - 15B1/15B2 acquire once and use only the lock-held primitives.
  - Each 14 publication operation is the sole lock-acquiring boundary. It invokes a package-owned `authenticate` callback against freshly loaded state inside the lock, and that callback must not take the lock.
  - 19D supplies the callback without a surrounding acquisition.
  - Both 12 and 19D/14 add real non-reentrant-lock tests, so authentication and mutation stay atomic without nested `APR_REVIEW_LOCKED`.
- **R1-F003 — resolved.**
  - Task 10 exports a pure `compareAcknowledgedContext({acknowledged,current})` from `src/protocol/acknowledged-context.mjs`. It returns current, stale or unavailable outcomes, and a malformed acknowledgement throws a typed refusal. Task 10 owns the unit tests.
  - 15B2 lists it as a port and owns only the controller reaction.
- **R1-F004 — resolved.** All four 14 signatures carry ordered `cycleIds` and `resultDigests` (and `outcome` where applicable), compared against the sealed reservation on every action. This matches 07B's binding list and gives 19D's wrong-cycle/digest tests a source.
- **R1-F005 — resolved.** 23B1/23B2 now make early live-text/reference/consumer dispositions only. Any candidate affected by later behaviour gets an explicit post-19C dependency before mutation, and #213 is keep-deferred with no mutation beyond reference.
- **R1-F006 — resolved.** The parallel ownership rules name:
  - the retained tracked generated `src/protocol/process-source-contract-files.json` and its generator with `--check`;
  - the four coherence tests at their actual paths;
  - the pack-time `runtime-inventory.json` producer;
  - regeneration rather than hand-merging, as distinct from the unchanged historical approval ledger.

I found no regression or new defect introduced by revision 6. The two items below are documentation-consistency nits only and do not block acceptance.

## Findings

None.

## Required changes

None.

## Optional suggestions

### R2-F001 — List 07D in the summary boundary and single-writer text

Work boundary 5 still lists "06C,07A–07C,08–14,…". The "Single-writer integrations" bullet still reads "19A inspection contracts then 19D publication contracts then 19B transport". Neither mentions 07D or the 07D → 15B3 registry steps that the parallel ownership rules and task bodies now establish.

Adding 07D to boundary 5, and "07D → 15B3 →" to the single-writer chain, would keep the summary sections consistent with the authoritative task headers. The task headers already govern, so this is cosmetic.

### R2-F002 — Name a single owner for `schemas/api-response-v2.json` creation

07D's write set says "new `schemas/api-response-v2.json`". 19A's exclusive list also still includes `schemas/api-response-v2.json`, and 19A/19D/19B say registry writers "also own … generated API-response-v2/request schemas". The ordering is serialized, so this cannot conflict.

To avoid a 19A worker treating the file as theirs to author afresh, two wording changes would help:

- describe 07D as the creator;
- describe later leaves as regenerating the file from the single `responseSchemaV2` object when their operations join the V2 request set.

## Decision

accepted
