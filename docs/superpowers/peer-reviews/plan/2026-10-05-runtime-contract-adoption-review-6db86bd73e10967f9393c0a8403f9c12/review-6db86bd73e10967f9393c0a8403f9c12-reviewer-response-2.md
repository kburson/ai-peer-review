<!-- ai-peer-review-template version="1" digest="sha256:78e9a634af9d540baaf6790db82952eaf39cf7ab59a6cdc7938319ae07a4cbed" -->

<!-- protected-frontmatter -->

---
schema: "ai-peer-review.response/v1"
review_id: "review-6db86bd73e10967f9393c0a8403f9c12"
role: "reviewer"
turn: 2
commit_mode: "normal"
authority_assurance: "unavailable"
artifact_path: "evidence/portable-runtime/contracts/runtime-contract-adoption.json"
artifact_commit: "9414ec7cf317ed8f147d34116104b5418323dcaf"
artifact_blob: "c4ff0df400d83b8e5a8f71f6216fc47679f1c598"
artifact_digest: "sha256:cf697a60ad618ceac7caf2a6f46327cd57842f1582d890edcdd41d300d75c104"
agent:
  host: "claude-code"
  provider: "anthropic"
  model_id: "claude-opus-5-5"
  model_display: "claude-opus-5-5"
  session_fingerprint: "sha256:8759da882a138165c9a3fb63a94fafe5d4d7aafbf8bf9183362af2aaec278977"
  identity_source: "runtime"
started_at: "2026-10-05T19:13:20.340Z"
submitted_at: "2026-10-05T19:30:28.214Z"
finding_ids: []
answered_finding_ids: []
acknowledged_supplement_ids: []
---

Mode: `normal`

## Summary

I read in full the complete author response 1 and the complete revised record `evidence/portable-runtime/contracts/runtime-contract-adoption.json` at artifact commit `9414ec7` (blob `c4ff0df4…`, digest `cf697a60…c104`, 911 lines). I compared the record against my round-1 findings, the accepted bounded owner Plan, the companion amendment, the closed schema, and the governed-evidence helper.

Verification limits are unchanged from round 1. I may not use Git and could not recompute hashes. The newly pinned objects are not present in this worktree:

- the #29/#34 umbrella Plan;
- the `review-a3927de…` manifest;
- the `review-a3927de…` final response.

I therefore take their blob and SHA-256 values from the author's stated object-level verification. That risk is fail-closed. Every new reference sits in `preservedBaselines`, and the checker runs each non-null baseline through `verified()` (`check-runtime-contract-adoption.mjs:531–532`). A wrong pin would refuse adoption; it could not grant it.

All five findings are resolved. Each disposition follows.

**R1-F001 — resolved.** `analytics.preservedBaselines` now contains an `umbrella-plan-task` entry. Its revision `1860a95c…`, path `docs/plans/2026-09-13-29-project-local-review-lifecycle-and-learning.md` and SHA-256 `9d83574b…` match the bounded Plan's ledger row exactly. Its status retains umbrella Task 5 without implying an accepted standalone #34 Plan. The DRAFT standalone design stays separately pinned.

**R1-F002 — resolved by the record-level alternative I offered.** Three changes were made:

- The `accepted-design` baseline status now names `review-a3927de204393c987234f146101239f9` and finalization `6abc0111f4c380f68e3b590ba5b7512d48aa6f3a`, matching the bounded Plan's stated #102 design review.
- Two new baselines pin that review's manifest and final reviewer response at the finalization revision.
- A new `runtimePolicy.remainingObligations` entry states plainly that the original native #102 comment omitted the citation, and that this is a preserved historical deficiency, not rewritten history.

The record now binds the exact acceptance evidence for the design it uses as `activationBinding.source`. It also keeps the native transaction as the genuine bounded owner adoption, without claiming the body said something it did not. That meets the purpose of Plan step 4: no accepted status without exact review evidence, and no substitution of broader approval. It does so without fabricating a native citation. The status strings also keep "no … broad independent Plan acceptance", so the design review cannot be read as #102 Plan acceptance.

**R1-F003 — resolved for this record.** I recomputed membership by hand from the record text, collecting every embedded `{revision, path, blob, sha256}` object:

- There are exactly 51 unique SHA-256 values.
- They are exactly the 51 entries in `reviewedDigests` (lines 36–86).
- The list is strictly sorted, with no duplicates and nothing extra.
- It now includes every value I listed as missing in round 1: the #102 design, every non-null baseline, all four owner bodies and native receipts, and every review manifest and final response.
- It correctly excludes the finalization digests, which are not Git-reference objects.

The definition is explicit and non-authorizing. It states that membership does not mean prior acceptance, semantic approval of draft source, registration, activation or publication. That removes the misreading I raised about the PR #139 draft digests.

I checked the author's sealing argument against `runtime-contract-evidence.mjs:472–481`. Governed adoption requires `approvalReview.subject` to equal `recordReference` and the parsed pinned record to equal `record`. Any later change to the inventory or its definition therefore invalidates this acceptance. Given that, I agree that schema, README and checker set-equality enforcement are not required for this immutable record. I keep that enforcement as an optional suggestion for successor records.

**R1-F004 — resolved.** Both `activationBinding.unresolvedOverlapObligations` and `runtimePolicy.remainingObligations` now state that `registration` pins #102 design intent only. They also state that it freezes neither an implemented registration store/receipt contract nor its transport, and that #102/#130 review and installed-current conformance remain required. `release` remains `null` and `conformance` remains `[]`.

**R1-F005 — resolved.** The three obligation strings now read normally:

- "Broader #30 Plan …"
- "Standalone #34 specification and Plan, #31/#32 prerequisites …"
- "#109 … remain in Ready for Planning; #152/#153 own …"

"R4P" is expanded. The #30 obligation also now carries the C1/C2 transaction, setup/catalog/index and migration scope, which was my round-1 optional suggestion 1. I accept the author's statement that the merged tokens came from hand-authored text, not a writer transform. One residual token remains in `telemetry.preservedBaselines[0].status`: "broader152/153". My round-1 scan missed it. Its meaning is unambiguous, so I note it under optional suggestions and do not block on it.

The record still does what round 1 found sound:

- the A bundle is complete and consistent across all four owners;
- the four native transactions are distinct;
- both response-schema references and the contextual rule are bound;
- the operational fields are refusal-only, with interface sources `observed-unmerged-draft` and `activationAuthorized:false`;
- `detailedSchemaFrozen:false`;
- the prior lineage set is unchanged;
- the expected evidence approver and the record review selection are unchanged.

Accepting this record grants only normal machine-reviewer consensus on its exact bytes, with authority assurance unavailable. Contract adoption still requires the record's own terminal lineage receipt, the distinct governed root native evidence transaction, evidence commit E, and a genuine adoption-only VC1 run. Activation and publication remain denied.

## Findings

None.

## Required changes

None.

## Optional suggestions

1. In a later source change, before any successor contract record, move the `reviewedDigests` definition into the schema `description` and the contracts README, and have the checker enforce full set equality. The definition currently lives in `runtimePolicy.remainingObligations` because the closed schema allows no better place. A reader could take a record-wide inventory rule placed under #102's obligations as a #102-specific obligation.
2. `telemetry.preservedBaselines[0].status` still reads "broader152/153 implementation pending", without spaces or `#`. Fixing it would require a new subject revision. If no other revision occurs, record it as a known typographic erratum (for example in the evidence commit's README) rather than reopening this review.
3. Round-1 optional suggestions 2 (liveness of the pinned root approver fingerprint) and 3 (self-dating the PR #139 CI observation) still apply and can go into README or evidence-commit prose, outside this immutable record.

## Decision

accepted
