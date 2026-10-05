<!-- ai-peer-review-template version="1" digest="sha256:78e9a634af9d540baaf6790db82952eaf39cf7ab59a6cdc7938319ae07a4cbed" -->

<!-- protected-frontmatter -->

---
schema: "ai-peer-review.response/v1"
review_id: "review-58b490491800f0c13d64191cb58071b5"
role: "reviewer"
turn: 2
commit_mode: "normal"
authority_assurance: "unavailable"
artifact_path: "docs/superpowers/specs/2026-10-03-107-runtime-policy-reconciliation-design.md"
artifact_commit: "4d8815b2fabf861d24d25fa9735b953865e99f55"
artifact_blob: "dcb99da9191789472bbd1840beb72448bf755fba"
artifact_digest: "sha256:4e8d38f06fb53b963089cfe5835e2722cc31a3053ac3ba7076467d93e6973405"
agent:
  host: "claude-code"
  provider: "anthropic"
  model_id: "claude-opus-5-5"
  model_display: "claude-opus-5-5"
  session_fingerprint: "sha256:3a89e4dd2bc35ce46c13a43ae5588baea492f1a3b436b0ccdf85c333a45f82ed"
  identity_source: "runtime"
started_at: "2026-10-05T11:18:12.993Z"
submitted_at: "2026-10-05T11:32:41.493Z"
finding_ids: ["R2-F001","R2-F002"]
answered_finding_ids: []
acknowledged_supplement_ids: []
---

Mode: `normal`

## Summary

I re-read the full revised specification at artifact commit `4d8815b` against author response 1 and my round-1 response. All eight round-1 findings are resolved:

- **R1-F001 (resolved).** Runtime, Policy and Prior journals are now one atomic bundle ("Choices submitted for joint review", paragraph after the table). Mixed, absent or partially accepted choices are explicitly unresolved conflicts that block `contractAdopted`. Required acceptance item 1 repeats this. Evidence and telemetry were moved out of the A/B table into a paragraph of common constraints, which removes the false Telemetry "alternative".
- **R1-F002 (resolved).** "Timing of legacy drain under recommendation A" now does three things:
  - It admits that an upgrade can happen before drain.
  - It defines an explicit current-global maintenance reselection of a compatible package, with registration and current-image checks, account-wide inventory, owned drain/abandon, and an explicit return to the newer package. It distinguishes this from retained per-run image execution.
  - It scopes the refusal to the validated primary clone plus overlapping worktrees and output reservations. Unknown owner or root widens the refusal rather than narrowing it.

  The new "Upgrade before compatible drain" operational row carries the matching proof obligations. When compatibility or ownership cannot be proven, the outcome is explicit: preserve the journal and report the obligation. That is fail-closed and no longer an undefined wedge.
- **R1-F003 (resolved).** "Contract adoption versus activation proof" paragraph 5 now covers the assurance rule:
  - It defines what makes a review reference authentic: accepted reviewer event, distinct registered sessions, exact subject bytes, full lineage, and the terminal author Git transaction.
  - It lists the admissible assurance enum values and refuses `unverified-test`, `no-commit`, and fabricated or incomplete lineage.
  - It requires the manifest and member assurance to match.
  - It states that `unavailable` assurance suffices for `contractAdopted`, and for `activationAuthorized` only together with every operational proof.

  This is now a reviewed policy rather than one inherited from the draft checker. The author correctly records that the draft checker must be brought up to the fuller lineage requirements.
- **R1-F004 (resolved).** Paragraphs 6–8 define the record lifecycle:
  - The contract record is immutable.
  - Activation evidence is an append-only sibling addendum, keyed by tag, source and package and referencing the contract digest.
  - The addendum is reviewed by #102 (launcher, registration, conformance), #107 (release integration) and #30 (chain linkage).
  - The approved-ref selects exact records, never latest-by-filename.
  - An addendum cannot amend contract decisions.
  - Older-tag addenda stay historical only.

  The proposed adoption-only verification mode is correctly deferred to a reviewed Task 5 plan amendment, without inverting the existing default gate.
- **R1-F005 (resolved).** "Detailed shared configuration boundary" paragraph 1 and Required acceptance item 5 now declare #130 as a detailed-schema dependency. They make clear that:
  - contract adoption may rely on the accepted #102 field-ownership table alone;
  - Task 7 cannot declare its production config contract complete, or integrate with runtime activation, until #130 adopts the versioned schemas.

  This answers the `contractAdopted`-without-#130 question unambiguously.
- **R1-F006 (resolved).** The ordering sentence now matches the plan. Task 4 packaging, the wrapper and the red fixtures are delivered independently, and contract adoption precedes release authorization and publication (plan lines 384 and 427).
- **R1-F007 (resolved).** The existing `schemas/api-response-v1.json` and `schemas/response-v1.json` bytes are named as provisional, with SHA-256 digests at input HEAD `66b1a7a`, and adoption binds both. The tag-only dispatch prohibition is scoped to supported in-repository entry points, and external consumers are pointed at the schema boundary.
- **R1-F008 (resolved).** The #102 field-ownership source is cited by path, commit `021bed7`, section, blob and SHA-256. The cited table governs on divergence, and omitted host fields get no implicit ownership.

**Verification limits.** In this session I could not recompute the two schema SHA-256 digests or read the #102 blob at `021bed7`: shell use is limited to the exact join/submit commands, and Git is excluded. I accept the author's stated verification for these. Each is a precise, checkable binding that the checker and owner reviewers will re-verify byte-for-byte.

**New text.** I found no new contradictions in the revised text. The maintenance-reselection recovery, the scoped refusal and the addendum lifecycle are consistent with:

- the Status line ("does not amend an accepted specification or authorize activation");
- the tombstone section;
- the existing operational rows.

I have two optional clarity suggestions below. Neither blocks acceptance.

## Findings

None blocking. See optional suggestions R2-F001 and R2-F002.

## Required changes

None.

## Optional suggestions

### R2-F001 — Say whether a pre-#102 (v0.4.x) package can serve as the maintenance reselection target

Location: "Timing of legacy drain under recommendation A" paragraph 3 ("explicit operator selection of one compatible package … with normal registration/current-image checks").

The main stranded population at activation time is likely v0.4.x native-family journals. Those packages predate #102 registration and current-image checks. As written, the maintenance path needs "normal registration/current-image checks", so a pre-#102 package may be ineligible by construction. In that case the affected clone stays refused until some other proof exists.

That outcome is fail-closed and acceptable. Still, one sentence would set the right expectations for owners and for the diagnostics text, saying either:

- whether pre-#102 packages are eligible, and under what registration shim; or
- that for pre-#102 journals the documented remedy is the "Already-live native manual drain" path before upgrading, and that after an upgrade the clone stays scoped-refused with a specific diagnostic.

### R2-F002 — Cross-reference the maintenance path from the Prior journals A cell

Location: "Choices submitted for joint review" table, Prior journals / A cell ("No retained-image execution or relaunch").

Someone who reads only the table could take "no … relaunch" to forbid the later current-global maintenance reselection, which does execute older package bytes. Consider adding to the cell a few words such as "explicit current-global maintenance reselection only (see Timing of legacy drain)". That keeps the atomic bundle text self-consistent when owners accept the table as the decision of record.

## Decision

accepted
