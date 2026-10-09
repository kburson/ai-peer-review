<!-- ai-peer-review-template version="1" digest="sha256:78e9a634af9d540baaf6790db82952eaf39cf7ab59a6cdc7938319ae07a4cbed" -->

<!-- protected-frontmatter -->

---
schema: "ai-peer-review.response/v1"
review_id: "review-057079566301a0106537dde070ea518a"
role: "reviewer"
turn: 2
commit_mode: "normal"
authority_assurance: "unavailable"
artifact_path: "docs/superpowers/plans/2026-10-05-144-contract-owner-adoption-addendum.md"
artifact_commit: "bdd842694a0494da963c538de686d1c85d689d4d"
artifact_blob: "95a44172d2683c9c5b213c6e9b7be4cd7b690149"
artifact_digest: "sha256:3f04358b465b4722bc0d5880c2896e19df44445a1ee3839887749f24cbb935d8"
agent:
  host: "claude-code"
  provider: "anthropic"
  model_id: "claude-opus-5-5"
  model_display: "claude-opus-5-5"
  session_fingerprint: "sha256:e4b622b375b867a957ed0ad0ab080fbd829d8187bb9717070565109d60235c7a"
  identity_source: "runtime"
started_at: "2026-10-05T12:39:01.143Z"
submitted_at: "2026-10-05T13:08:23.095Z"
finding_ids: []
answered_finding_ids: []
acknowledged_supplement_ids: []
---

Mode: `normal`

## Summary

I read the complete revised addendum at artifact commit `bdd8426` and the complete author response 1. The working-tree bytes hash to the bound digest `3f04358b…35d8`.

Independent checks in this worktree:

- `schemas/api-response-v1.json` hashes to `7eb93ca4…9292` and `schemas/response-v1.json` hashes to `744390c3…76d9`. Both match the new compatibility section.
- `docs/superpowers/plans/2026-10-03-107-plan-decomposition.md` (lines 27–28, 248, 264) maps #107 Tasks 13/14 to #152/#153. It keeps the #109 Codex attempt-timing/usage repair as its own separately counted work package. That matches the revised #109 scope and Global constraints.
- I re-checked the revised #34/#109 bullets against #107 spec lines 1038–1271 (`Metrics and Comparative Evaluation`, `Accounting Identity and Aggregation`, `Costs, Recovery and Privacy`). I re-checked the revised #30 telemetry-packaging bullet against the Evidence layout (lines 826–865, 910–937).

These claims could not be verified here and are taken as stated, as in round 1:

- `docs/superpowers/reviews/2026-10-01-102-planning-report.md` is not present in this worktree.
- Live #109/#130 bodies cannot be read without network or Git access.
- The #34 draft pin cannot be checked for the same reason.

Disposition of round-1 findings:

- **R1-F001 — resolved.** #109 bullets 4–5 and #34 bullet 5 now state the following, matching spec lines 1068–1069, 1079–1081 and 1218–1228:
  - reported/derived/estimated/unavailable provenance;
  - inputs and formula for derived values;
  - versioned price provenance for estimates only;
  - reported cost preserved with an unknown basis;
  - separate billed, list-price, subscription and currency measures;
  - zero only with affirmative evidence.

  A "cited section governs on divergence" clause was added to both sections.
- **R1-F002 — resolved.** Both consumers now state:
  - nullable round;
  - exactly one accounting owner per attempt;
  - lowest-known-scope session usage without allocation;
  - a separate controller accounting ID with no fabricated worker IDs;
  - declared included/excluded IDs;
  - inclusive-or-exclusive partitions;
  - idempotent observation identity with replay suppression;
  - no re-summed chain rollups;
  - null complete totals unless coverage is complete.

  These close review focus 3.
- **R1-F003 — resolved.** The new #30 bullet adopts packaging of all four telemetry interfaces, the run-record files, sibling `amendments/R/A/` linked through the series-index, and the supervisor section outside the payload digest. The #109 bullet 9 wording ("emitted by #107, packaged by #30 and consumed by #34") is now consistent with it.
- **R1-F004 — resolved.** The ledger paragraph now says "normative interface requirements and reserved versioned identifiers, not field-level schema bytes". It states that acceptance is not schema freeze.
- **R1-F005 — resolved, with an accepted limitation.** Transaction step 4 now names this exact-digest XPR as each owner's bounded Plan-review reference, and forbids substituting broader, umbrella, superseded or requested-revision reviews. The ledger names `review-ae95793f…` and the #102 design review and finalization. The author's refusal to fabricate a broad #102 Plan XPR is correct: native Full-Auto approval is kept as provenance and not relabeled. The new step 6 adds a useful guard: one common review repeated four times is not four owner transactions.
- **R1-F006 — resolved.** The new compatibility section binds both schema digests, the artifact IDs and the source revision. It forbids tag-only dispatch at supported boundaries and keeps contract adoption blocked until native #30/#102 records and the #107 amendment bind the rule.
- **R1-F007 — resolved.** The #30 importer bullet states exact declared-grammar verification, refusal on unknown or mismatched grammar, and no stripping or normalization.
- **Optional suggestions — both adopted.** The changes are refreshed observation timestamps with a mandatory pre-record refresh, the full #34 draft pin, and the identical whole-bundle requirement for #102 and the #107 amendment.

The revision introduces no fail-open path. None of the residual points below changes who may adopt, what is adopted, or when publication/activation is denied, so I accept.

## Findings

None.

## Required changes

None.

## Optional suggestions

1. **#102 broad Plan-review status versus the Global constraint.** Global constraints say "Missing actual owner acceptance, plan review or source bytes blocks contract adoption". The ledger and step 4 say #102's broad independent Plan XPR "remains unverified". The intended reading is clear from step 4 (the bounded Plan-review reference is this XPR), but a checker implementer could read the unverified broad review as a missing plan review. Consider one sentence stating that the unverified broad #102 Plan XPR is recorded provenance, not a `contractAdopted` prerequisite. Alternatively, state that it is a prerequisite, if that is the intent.
2. **Local out-of-Git proof.** The #30 importer bullet allows "local actual-workspace proof … outside package/Git paths". The reconciliation spec's approved-ref identifies immutable Git evidence. Consider stating that the contract record must name which verified facts rest on non-retained local proof, so a later verifier on another machine can see which checks are not reproducible from Git alone. Also state that such proof supplements, and never replaces, the pinned Git record and review digests.
3. **Companion amendment alignment.** The compatibility section makes `contractAdopted` depend on the accepted #107 amendment binding both schema references. The companion `docs/superpowers/plans/2026-10-05-107-runtime-contract-plan-amendment.md` currently has no such clause. Consider adding it during that artifact's own review, so the dependency is not discovered only at contract-record time.

## Decision

accepted
