<!-- ai-peer-review-template version="1" digest="sha256:78e9a634af9d540baaf6790db82952eaf39cf7ab59a6cdc7938319ae07a4cbed" -->

<!-- protected-frontmatter -->

---
schema: "ai-peer-review.response/v1"
review_id: "review-057079566301a0106537dde070ea518a"
role: "reviewer"
turn: 1
commit_mode: "normal"
authority_assurance: "unavailable"
artifact_path: "docs/superpowers/plans/2026-10-05-144-contract-owner-adoption-addendum.md"
artifact_commit: "6b58cbed105ecf97efc4e5e1376a409dbb9e0d3d"
artifact_blob: "63b268c6aefb714bb291534d6c79b9ae284d4099"
artifact_digest: "sha256:cfc32c539018e805c59319d47ff7e4de5083048329f8cbdc67a2b49fc752d725"
agent:
  host: "claude-code"
  provider: "anthropic"
  model_id: "claude-opus-5-5"
  model_display: "claude-opus-5-5"
  session_fingerprint: "sha256:e4b622b375b867a957ed0ad0ab080fbd829d8187bb9717070565109d60235c7a"
  identity_source: "runtime"
started_at: "2026-10-05T12:39:01.143Z"
submitted_at: "2026-10-05T12:46:11.877Z"
finding_ids: ["R1-F001","R1-F002","R1-F003","R1-F004","R1-F005","R1-F006","R1-F007"]
answered_finding_ids: []
acknowledged_supplement_ids: []
---

Mode: `normal`

## Summary

I read the full addendum at artifact commit `6b58cbe`. The working-tree bytes hash to the bound digest `cfc32c53…d725`.

I checked it against these sources:

- the accepted reconciliation spec `docs/superpowers/specs/2026-10-03-107-runtime-policy-reconciliation-design.md`. Its working-tree SHA-256 is `4e8d38f0…6973405`, matching the addendum's Spec line.
- the immutable #107 spec `docs/superpowers/specs/2026-09-27-107-agent-first-review-runtime-design.md`. Its working-tree SHA-256 is `395bf5ce…a2c2e`, matching the ledger row. I read the `Evidence` section (lines 812–943) and the `Metrics and Comparative Evaluation` section, including `Accounting Identity and Aggregation` and `Costs, Recovery and Privacy` (lines 1038–1271).
- the #107 plan's Task 13/14 headings (lines 877, 950), which confirm the #109 mapping.
- the companion draft `docs/superpowers/plans/2026-10-05-107-runtime-contract-plan-amendment.md`, read for scope consistency only.

The following inputs are not present in this worktree, and this session may not use Git:

- the #102 spec and plan;
- the #30 pre-revision and revised plans;
- the #29/#34 umbrella plan.

I could not verify their revisions, digests, or quoted content. That includes the #30 Task 4 Step 18 overlay field list and the #102 field-ownership section. I take those claims as stated.

The addendum's structure is sound and fail-closed:

- It keeps every baseline.
- It refuses to turn broad, requested-revision, or draft owner material into acceptance.
- It keeps the A bundle atomic.
- It separates contract adoption from activation.
- It treats #130 as a declared dependency, not an acceptor of nonexistent schemas.

Review focus items 1, 2 and 4 are addressed adequately by the #30, #34 and #102 sections and the Acceptance boundary.

The main problem is fidelity. The #109 and #34 owner sections restate the #107 telemetry contract in summary bullets. Several bullets are stricter than, looser than, or incomplete against the exact #107 sections they claim to adopt. Owners would then record dispositions that conflict with the normative source (R1-F001, R1-F002). The #30 section also omits #30's named role as packaging consumer of the telemetry schemas (R1-F003).

Smaller issues:

- the ledger calls spec prose "exact normative schema definitions" (R1-F004);
- the owner-record "accepted plan review" reference is ambiguous (R1-F005);
- the reconciliation's API/historical response ruling has no stated disposition (R1-F006);
- review focus 5 has no corresponding contract text (R1-F007).

## Findings

### R1-F001 — #109 cost/collection bullets contradict the adopted #107 cost and provenance rules

Location: `#109 — attributable attempt telemetry`, bullets 3 and 5. The addendum says "Collect token/cache/API/cost only from supported structured provider reports" and "Cost requires price provenance".

The #107 spec rules (lines 1068–1069, 1079–1081, 1218–1228) are:

- Every field carries a provenance of `reported`, `derived`, `estimated` or `unavailable`.
- Derived values identify their inputs and formula.
- Estimates record price source, model/tier, effective date and assumptions.
- Native provider-reported cost must be preserved "with its stated basis, even when that basis is unknown".
- Zero cost requires affirmative evidence.

Read literally, the two bullets conflict with these rules in two ways:

- "Cost requires price provenance" would drop or refuse a provider-reported cost whose basis is unknown, which the spec requires to be preserved.
- "Only from supported structured provider reports" would forbid derived values and versioned list-price estimates, which the spec permits with provenance.

The #109 section also says it reuses the #107 schemas. An owner disposition recorded against this text would therefore carry an internal conflict with the source it cites. An implementer following the owner plan would build a narrower collector than `attempt-metrics/v1` / `measurement/v1` require.

### R1-F002 — Attribution and aggregation bullets omit the nullable-round, single-accounting-owner and disjoint-partition rules, leaving review focus 3 under-specified

Location: #109 bullets 1–2 and 4, and #34 bullets 2–3.

"Each attempt has its own run/stage/role/round/attempt/session identity" reads as though every attempt carries a round. #34's "Correlate run, stage, role, round, attempt and provider session" reads the same way. The #107 spec (lines 1092–1102, 1110–1116) is more precise:

- Round is nullable before dispatch.
- Pre-admission launch/fallback attempts are stage- or run-owned.
- Every attempt has exactly one accounting owner: round, stage or run.
- Cross-round continuous-session usage stays at the lowest known scope, without fabricated per-round allocation.

The addendum also says "controller records lifecycle timestamps for every launch…". It does not carry the spec's rule (lines 1152–1161) that controller observations use a separate opaque controller accounting ID and must never fabricate worker attempt IDs. The prior #107 SAR (SAR-002) flagged exactly that defect.

Review focus 3 ("a valid-looking aggregate cannot hide overlapping attempt coverage") is not actually closed by the bullets present. "Normalize cumulative versus per-turn counters" and "Incomplete coverage remains labeled a subtotal" do not state the spec's overlap guards (lines 1118–1137, 1192–1206):

- Each aggregate declares included and excluded attempt/observation IDs.
- Each partition uses a parent inclusive total or its exclusive children, never both.
- Observation identity is idempotent, so replays are not added twice.
- Chain views never sum previously computed rollups.

An aggregate that double-includes a parent and its children could satisfy every bullet as written.

### R1-F003 — The #30 owner contract omits #30's named consumption of the four telemetry schemas and the telemetry-amendment packaging

Location: `#30 — canonical evidence and immutable amendments`, and #109 bullet 7 ("consumed by #30/#34").

The #107 spec (line 1042) names #30 as the packaging consumer of `attempt-metrics/v1`, `measurement/v1`, `aggregate-coverage/v1` and `telemetry-amendment/v1`. The spec's Evidence layout puts `metrics.json`, `receipts/T.json` and `attempts/T/attempt-evidence.json` inside the #30-owned run record (lines 826–849). It makes late telemetry a sibling `amendments/R/A/` tree discoverable through the series-index (lines 861–865, 1241–1245). The response envelope carries a supervisor section outside the participant payload digest (lines 910–937).

The #30 section adopts only the four Evidence schemas. The #109 section asserts that #30 consumes the telemetry schemas, but #30's own disposition never accepts that. The verification step "Reject a missing owner" would not catch this gap, because #30 is present; the subset it adopts is simply narrower than what #109 depends on. Late telemetry amendments then have no adopted #30 packaging and linkage owner.

### R1-F004 — The ledger overstates the #107 sections as "exact normative schema definitions"

Location: the paragraph after the Preserved input ledger.

The #107 `Evidence` and `Metrics…` sections reserve versioned identifiers and state normative behavioural requirements. They contain no field-level schema bytes. The spec itself says "Before schema freeze, its plan must adopt or jointly revise these contracts" (lines 816–817) and "Schema freeze requires reconciliation with both dependent plans" (lines 1045–1046).

The same paragraph later correctly says it adopts "the exact normative target interface, never nonexistent detailed schema bytes". The opening phrase contradicts that. It also invites an owner record or checker to treat "schema identifier + spec digest" as a frozen schema, and it leaves unstated whether accepting this addendum constitutes the "schema freeze" reconciliation that #107 requires.

### R1-F005 — The owner record's "accepted plan review" reference is ambiguous, and the ledger lacks review references for its acceptance claims

Location: Adoption transaction step 4 ("…exact addendum digest, its accepted plan review and unresolved obligations"), and the ledger "Existing authority" column.

For #30, #34 and #109 no owner plan is accepted. The only accepted plan review that can exist is this addendum's XPR. "Its accepted plan review" could be read as the owner's own broader plan review. For #30 that review is the superseded requested-revisions review `review-ae95793f08da8e886f60ba09a30ce53d`, and for #34 it is the umbrella plan. That is the substitution the addendum elsewhere forbids.

The ledger also asserts that the #102 plan is an "Existing accepted six-slice plan" and that the #30 round-1 review is superseded. It cites no review ID, finalization commit or record path for either claim. The reconciliation spec does name `review-ae95793f…` for #30. Under the addendum's own constraint ("Missing actual owner acceptance, plan review or source bytes blocks contract adoption"), a verifier cannot check the #102 plan acceptance claim from this document.

### R1-F006 — The reconciliation's API/historical response compatibility ruling has no stated disposition

Location: Acceptance boundary. Source: reconciliation spec, `API and historical participant response compatibility` (lines 83–111).

That ruling "requires explicit joint adoption" and says "Adoption binds both digests" (`schemas/api-response-v1.json` `7eb93ca4…9292`, `schemas/response-v1.json` `744390c3…76d9`). Neither this addendum nor the companion #107 plan amendment mentions it. #30 adopts `response-envelope/v1` and owns historical evidence readers, so the ruling touches a #30 boundary. The Acceptance boundary says the addendum adopts "only the four bounded owner sections" without saying where this ruling is adopted. The contract record could therefore reach `contractAdopted` with the provisional schema digests silently unbound, or block for a reason no artifact owns.

### R1-F007 — Review focus 5 has no corresponding contract text in this addendum

Location: Review focus item 5 ("A newer producer's event grammar cannot be verified by removing fields to fit an older importer").

No owner section addresses producer/importer grammar versioning, and neither do the transaction steps. The rule appears only in the companion #107 plan amendment (its line 108, and Review focus 3). A reviewer accepting this addendum would seem to have verified a property the addendum does not state.

## Required changes

1. (R1-F001) Replace #109 bullets 3 and 5 with text faithful to `Costs, Recovery and Privacy` and the measurement provenance rules:
   - Observations carry reported, derived, estimated or unavailable provenance.
   - Reported cost is preserved with its stated basis, even when that basis is unknown.
   - Estimates require versioned price source, effective date and assumptions.
   - Derived values identify their inputs and formula.
   - Zero requires affirmative evidence.
   - Unknown stays unavailable with a reason.

   Add one sentence to the #34 and #109 sections: on any divergence between these bullets and the cited #107 section, the cited section governs.
2. (R1-F002) In #109 and #34, state that:
   - round is nullable before dispatch;
   - every attempt has exactly one accounting owner (round, stage or run);
   - continuous-session usage stays at its lowest known scope with no per-round allocation;
   - controller observations use a separate controller accounting ID and never fabricate worker attempt IDs.

   Add the aggregate overlap guards:
   - declared included and excluded attempt/observation IDs;
   - parent inclusive total or exclusive children, never both;
   - idempotent observation identity with replay suppression;
   - chain views never re-sum prior rollups;
   - a complete total stays null unless coverage is complete and compatible.
3. (R1-F003) Extend the #30 section so it adopts #30's consumer role for the four telemetry schemas, covering:
   - run-record packaging of metrics, receipts and attempt evidence;
   - immutable sibling telemetry amendments linked through the series-index;
   - envelope supervisor sections outside the participant payload digest.

   Alternatively, state explicitly that this is excluded and name where it is adopted. Then make the #109 "consumed by #30/#34" statement consistent with that choice.
4. (R1-F004) Reword the ledger paragraph to "normative interface requirements and reserved versioned identifiers". State whether accepting this addendum is, or is not, the #107 "schema freeze" reconciliation. State that field-level schema bytes need later owner review.
5. (R1-F005) In Adoption transaction step 4, specify the plan-review reference:
   - The owner record cites the accepted normal XPR of this exact addendum digest.
   - For #102, it additionally cites its existing accepted plan review.
   - It never cites a broader, superseded, umbrella or requested-revision review as the plan review.

   In the ledger, add the review ID and finalization reference for the #102 plan acceptance and for the #30 round-1 review, or mark those claims unverified.
6. (R1-F006) State the disposition of the API/historical response compatibility ruling and its two schema digests. Name which artifact or owner adopts it, or state that `contractAdopted` stays blocked until a named artifact does.
7. (R1-F007) Either delete review focus 5, or replace it with a pointer to the companion #107 plan amendment where it is addressed. Alternatively, add a bounded rule in the #30 section: an importer verifies only the producer's exact declared grammar, unknown or mismatched grammar refuses, and fields are never stripped or normalized.

## Optional suggestions

1. The #109/#130 ledger row says "Live issue metadata observed for this task" with no observation time. Unlike PR #139, it has no refresh requirement. Record the observation timestamp, and require a refresh of #109/#130 (and the #34 standalone spec status) before the owner records are made. Pin the path and digest of the draft standalone #34 specification so that the "draft substitution" refusal in step 5 can actually be checked.
2. The #102 section says only #102 accepts the A bundle. Consider stating here, as the companion amendment does, that `contractAdopted` requires the #102 owner record and the #107 amendment acceptance to select the identical whole bundle at the same reconciliation digest.

## Decision

revisions-requested
