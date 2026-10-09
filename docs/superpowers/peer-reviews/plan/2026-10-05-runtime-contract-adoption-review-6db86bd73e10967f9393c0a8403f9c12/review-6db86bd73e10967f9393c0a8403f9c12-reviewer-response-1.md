<!-- ai-peer-review-template version="1" digest="sha256:78e9a634af9d540baaf6790db82952eaf39cf7ab59a6cdc7938319ae07a4cbed" -->

<!-- protected-frontmatter -->

---
schema: "ai-peer-review.response/v1"
review_id: "review-6db86bd73e10967f9393c0a8403f9c12"
role: "reviewer"
turn: 1
commit_mode: "normal"
authority_assurance: "unavailable"
artifact_path: "evidence/portable-runtime/contracts/runtime-contract-adoption.json"
artifact_commit: "cbc51d0008ab82f38602b8c58f3e3c5141482ba2"
artifact_blob: "b4906bb95766a79a3e565b7f9dc9cdff2e0ed550"
artifact_digest: "sha256:46b31420fefcb70d1be6b493c0ba0df25122ae80bc3517643f1be06ed4b3b573"
agent:
  host: "claude-code"
  provider: "anthropic"
  model_id: "claude-opus-5-5"
  model_display: "claude-opus-5-5"
  session_fingerprint: "sha256:8759da882a138165c9a3fb63a94fafe5d4d7aafbf8bf9183362af2aaec278977"
  identity_source: "runtime"
started_at: "2026-10-05T19:13:20.340Z"
submitted_at: "2026-10-05T19:17:01.276Z"
finding_ids: ["R1-F001","R1-F002","R1-F003","R1-F004","R1-F005"]
answered_finding_ids: []
acknowledged_supplement_ids: []
---

Mode: `normal`

## Summary

I read the complete record `evidence/portable-runtime/contracts/runtime-contract-adoption.json` (blob `b4906bb9…`, digest `46b31420…b573`, 853 lines). I checked it against these inputs:

- its closed schema `schemas/runtime-contract-adoption-v1.json`;
- the document-only checker `scripts/check-runtime-contract-adoption.mjs` (record/owner/native-proof validation, lines 440–788) and the governed-evidence helper's approver checks in `scripts/lib/runtime-contract-evidence.mjs`;
- the accepted bounded owner Plan `docs/superpowers/plans/2026-10-05-144-contract-owner-adoption-addendum.md`, including its preserved input ledger and adoption transaction checklist;
- the accepted companion amendment `docs/superpowers/plans/2026-10-05-107-runtime-contract-plan-amendment.md` (Task 5 interface contract, lineage boundaries);
- all four retained owner bodies `evidence/portable-runtime/contracts/owners/{102,30,34,109}-adoption.md`, the `102-native-receipt.json` receipt and the owners README;
- all four retained lineage receipts in `evidence/portable-runtime/contracts/review-lineage/` (review references, state, identities, reproducibility classification) and the review-lineage README;
- the contracts README and the author's manual self-review `2026-10-05-144-immutable-record-author-sar.md`;
- this review's own `participants.json`.

Verification limits. In this session I may not use Git, and shell hashing was unavailable. I therefore did not recompute any blob or SHA-256, and I did not resolve any revision. These inputs are not present in this worktree, so I could not read them: the #102 specification and plan, the #30 plans, the #29/#34 umbrella plan, the #34 draft design, and the PR #139 interface sources. I took the author's preflight claim of 314 verified pinned identities as stated. I also could not authenticate the GitHub owner comments, observe issue metadata, or replay any original private event journal. My review is a structural, cross-reference and fidelity review of the record against its governing documents and retained evidence.

What is sound:

- The record is closed and fail-closed. `release` is `null`, `conformance` is empty, every interface source is `observed-unmerged-draft` with `activationAuthorized:false`, and both normative targets carry `detailedSchemaFrozen:false`.
- The six decisions are the complete A bundle, and every owner selects bundle `A` against the identical reconciliation reference.
- Each owner has a distinct native comment ID and node ID, a URL that matches its issue, `observedAt` ≥ `publishedAt`, and `bodySha256` equal to `body.sha256`.
- Each owner body contains its exact bounded subsection, the owned-comment marker, the bounded Plan path/blob/SHA, the review ID and the reconciliation digest. These are the checker's textual requirements.
- The #30 and #102 bodies both bind the two response-schema digests and the contextual rule, as the bounded Plan requires.
- The 102 native receipt's `acceptedOwnerPlan.revision` is the review finalization `674a5c9`, which the checker accepts alongside the subject revision `bdd8426`; the blob and SHA match.
- The four lineage receipts reference reviews identical to `governance.priorLineage[*].review`. All report `state: accepted`, `localOriginalEventReplay: complete`, `ciOriginalEventReplay: unavailable` and `assurance: unavailable`, which matches the companion amendment's two verification boundaries.
- `expectedEvidenceApprover.authorSessionFingerprint` (`3360e116…`) equals the author fingerprint in the canonical-plan lineage receipt, as the helper requires (`runtime-contract-evidence.mjs:500–503`). It differs from this review's author session (`e82e25e5…`), which keeps record authorship separate from evidence approval.
- `recordReviewSelection` matches this review's actual reviewer identity (`claude`/`anthropic`/`claude-code`/`claude-opus-5-5`, effort `high`).

The problems are completeness and fidelity of preserved provenance, not decision logic:

- One baseline that the accepted bounded Plan requires to be preserved is missing from the record (R1-F001).
- The #102 accepted design review that the Plan requires the owner record to cite is bound nowhere (R1-F002).
- `reviewedDigests` has no stated membership rule, and its current membership can mislead (R1-F003).
- Two smaller issues: the `registration` placeholder (R1-F004) and malformed permanent obligation strings (R1-F005).

The record becomes immutable on acceptance, so these should be corrected before it is accepted.

## Findings

### R1-F001 — The #34 umbrella Task 5 baseline is not preserved in `analytics.preservedBaselines`

Location: `analytics.preservedBaselines` (record lines 411–422).

The accepted bounded Plan's preserved input ledger has a row "#34 umbrella Task 5". It pins `1860a95c4ab6ebf859a2fe57146c720220c62480:docs/plans/2026-09-13-29-project-local-review-lifecycle-and-learning.md`, SHA-256 `9d83574b214bfb12368d334162fa1af8ddddc8cfc4c055f9447312be76b58b43`, with authority "Standalone accepted #34 plan absent; umbrella prerequisites retained." The Plan's #34 section says the supplement "preserves umbrella Task 5". The checklist's first step says "Preserve all baseline Git objects." The retained #34 owner body also states "Umbrella Task 5 is retained."

The record's only #34 baseline is the standalone DRAFT design (`ee445945…`). The umbrella Plan path and digest appear nowhere in the record or its evidence directory; a grep for `29-project-local-review-lifecycle` and `9d83574b` under `evidence/` returns nothing.

The other three owners carry every ledger baseline: #102 has its design and plan, #30 has its pre-revision and revised plans, and #109 has an explicit `null`. #34 is therefore the only owner whose "retained" governing baseline is asserted in prose but not pinned. Bounded Plan review focus 2 says "a draft standalone #34 specification cannot become accepted through its umbrella plan". That guarantee depends on the umbrella Plan being an identified, preserved object. As things stand, a later consumer of the immutable record cannot tell which umbrella bytes the #34 disposition preserved.

### R1-F002 — The #102 accepted design review is cited by neither the #102 owner disposition nor the record

Location: `runtimePolicy.preservedBaselines[0]` (`accepted-design`, record lines 228–237); `activationBinding.source`/`registration`; retained body `owners/102-adoption.md`.

Step 4 of the bounded Plan's adoption transaction requires: "#102 additionally cites its genuinely accepted design review and preserves the native Plan-approval provenance." The Plan names that review: `review-a3927de204393c987234f146101239f9`, finalization `6abc0111f4c380f68e3b590ba5b7512d48aa6f3a`.

The retained #102 native body says only "The accepted #102 design and genuine native Full-Auto Plan approval remain their own provenance." It does not cite the review ID or the finalization. The record describes the baseline as `status: "accepted replacement design only; no deployed proof"`, and `activationBinding.source`/`registration` point to the same design. Neither carries the acceptance evidence. A grep for `a3927de` or `6abc0111` under `evidence/` returns nothing.

The consequence is that the record asserts an "accepted" #102 design, and binds `ActivationBinding` to it, without pinning the review that makes it accepted. That is the substitution pattern the Plan and the companion amendment forbid ("no caller assertion … grants authority"). It also leaves an accepted Plan step unmet in the pinned owner evidence. The checker does not detect the omission, because it checks only the bounded Plan review values in the body.

### R1-F003 — `reviewedDigests` has no defined membership rule, and its current membership is inconsistent and can mislead

Location: `reviewedDigests` (record lines 35–63).

Neither the schema, the checker, the companion amendment nor the contracts README defines what `reviewedDigests` means. The checker requires only a subset: the amendment, the schemas, and each owner's reconciliation and boundedPlan (`check-runtime-contract-adoption.mjs:704–710`). The 27 entries actually present are:

- the reconciliation, both response schemas and the bounded Plan;
- the #107 spec, the canonical Plan and the companion Plan;
- the three checker schemas and the seven importer sources;
- the four lineage receipts and their two verifier inventories;
- the four PR #139 interface sources.

They omit:

- the #102 design `7130694f…`, which is the target of `activationBinding.source` and `registration`;
- every preserved baseline (`f1b6e0a7…`, `2d436e18…`, `8de3983d…`, `ee445945…`);
- all four owner bodies (`3885933d…`, `d1e2b6f0…`, `5b0639ab…`, `ced7e213…`) and all four native receipts;
- every review manifest and final response.

Two consequences follow:

- The list includes the PR #139 draft sources, which the record itself marks `observed-unmerged-draft` and which no normal review accepted. A reader can take "reviewed digest" to mean those bytes were reviewed.
- The list excludes the four owner bodies and receipts, the central adoption evidence that this record review is the first to cover. The lineage README calls the receipts "unreviewed" until this review, yet they are listed. So neither "previously reviewed" nor "covered by this record review" explains the membership.

For an immutable record consumed by later Task 8 and Task 18 verifiers, an undefined field whose name implies review status is a latent misinterpretation risk.

### R1-F004 — `activationBinding.registration` is byte-identical to `activationBinding.source`, which looks like a frozen registration contract

Location: `activationBinding.source` and `activationBinding.registration` (record lines 96–107).

The companion amendment says `ActivationBinding` "freezes the exact reviewed #102 launcher/current-runtime interfaces, registration contract, exclusion/drain guarantees, prospective conformance requirements and unresolved operational obligations". The record sets `registration` to exactly the same reference as `source`: the #102 design document.

Meanwhile, every owner body and the record's own third obligation state that the registration-store/receipt transport is pending, owned by #102/#130 and not yet reviewed. With no qualifying text, a non-null `registration` reference that duplicates `source` can be read as "the registration contract is frozen at this design". In fact it is a placeholder for design intent only. The schema requires a `gitRef` here, so the field cannot be null. The ambiguity therefore has to be resolved in the record's own obligation text.

I could not read the #102 design in this worktree, so I could not confirm which section, if any, defines registration.

### R1-F005 — Permanent obligation strings contain merged tokens and an undefined abbreviation

Location: `evidence.remainingObligations[0]`, `analytics.remainingObligations[0]`, `telemetry.remainingObligations[0]` (record lines 343, 424, 500).

These strings are the only human-readable statement of each owner's open obligations in an immutable record:

- "Broader30 Plan remains unaccepted…"
- "Standalone34 specification/Plan,31/32 prerequisites…"
- "109 Codex headless repair/controller timing remains R4P;152/153 own…"

Problems:

- Spaces are missing between words and issue numbers ("Broader30", "Standalone34", "Plan,31/32", "R4P;152/153").
- "R4P" is not defined anywhere in the record, the bounded Plan or the owner bodies. It plausibly means "Ready for Planning", but the record should not depend on a guess.

The same defect appears in the author self-review ("all314", "at56d47c8", "recorded294 tests:293"). That suggests a systematic whitespace-collapse step in authoring that may affect other generated text. The rest of the record looks clean.

## Required changes

1. (R1-F001) Add a #34 preserved baseline for the umbrella Plan to `analytics.preservedBaselines`, for example `kind: "umbrella-plan-task"` and `status: "umbrella Task 5 retained; no accepted standalone #34 Plan"`. Use the exact ledger reference: revision `1860a95c…`, path `docs/plans/2026-09-13-29-project-local-review-lifecycle-and-learning.md`, SHA-256 `9d83574b…`, and the blob resolved from Git. Verify it through the existing `verified()` path. If R1-F003 is resolved by including baselines, add its digest to `reviewedDigests`.
2. (R1-F002) Bind the #102 accepted design review in the record. At minimum, extend the `accepted-design` baseline status to name `review-a3927de204393c987234f146101239f9` and finalization `6abc0111f4c380f68e3b590ba5b7512d48aa6f3a`. Preferably, pin its manifest and final-response references if the closed schema is extended for that purpose. Then give an explicit, durable disposition of the #102 owner body's omission. Either explain why record-level binding satisfies Plan step 4, given that the step names the owner record, or obtain a supplemental scoped #102 owner record that cites it. Do not leave the gap undocumented.
3. (R1-F003) Define `reviewedDigests` in the schema `description` and the contracts README. Then make the membership match the definition. Two options:
   - "Every artifact digest whose bytes this record's normal review covers": include the #102 design, every non-null baseline, the four owner bodies, the four native receipts and the review manifests/final responses.
   - Restrict the list to normally accepted review subjects and the new evidence that this record introduces, and drop the PR #139 draft sources (they remain pinned under `interfaceSources`).

   Whichever definition is chosen, make the checker enforce it, so a later record cannot silently drift from it.
4. (R1-F004) Add text to `activationBinding.unresolvedOverlapObligations` (and the identical `runtimePolicy.remainingObligations`). It should state that `registration` references #102 design intent only, and that the registration-store/receipt contract is not frozen until the #102/#130 independently reviewed schema and transport exist. If the #102 design has a specific registration section, name it there.
5. (R1-F005) Rewrite the three obligation strings with normal spacing, and expand "R4P" to its intended meaning, for example "remains in Ready for Planning". Check the record generator or authoring step for the whitespace-collapse defect before regenerating.

## Optional suggestions

1. `evidence.remainingObligations` leaves out part of the bounded Plan's #30 preservation clause: "Preserve broader #30 C1/C2 transaction, setup/catalog/index and migration requirements." Add it, so that the record's #30 obligations reproduce the accepted subsection's full residual scope.
2. `expectedEvidenceApprover.authorSessionFingerprint` pins one root Codex session fingerprint for a future native approval transaction. If that session is lost before E, the immutable record can never be approved and a successor record is needed. Consider stating that liveness consequence and its recovery path (a successor record, never a relabel) in the contracts README, so that an operator does not try to substitute a different root session.
3. `activationBinding.unresolvedOverlapObligations` records PR #139's CI state without a timestamp. The #102 owner body carries the observation time (2026-10-05T14:05:11.859Z). Consider appending "as observed 2026-10-05T14:05:11.859Z" to the first obligation, so that this point-in-time fact is self-dated within the immutable record.

## Decision

revisions-requested
