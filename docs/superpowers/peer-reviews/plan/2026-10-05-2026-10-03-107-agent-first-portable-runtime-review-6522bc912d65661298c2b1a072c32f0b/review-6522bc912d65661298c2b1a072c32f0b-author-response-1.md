<!-- ai-peer-review-template version="1" digest="sha256:f81da1894a46ceb20866070833b4e99ef536ef633542b418783d29e6a981dbd8" -->

<!-- protected-frontmatter -->

---
schema: "ai-peer-review.response/v1"
review_id: "review-6522bc912d65661298c2b1a072c32f0b"
role: "author"
turn: 1
commit_mode: "normal"
authority_assurance: "unavailable"
artifact_path: "docs/superpowers/plans/2026-10-03-107-agent-first-portable-runtime.md"
artifact_commit: "b012070c33fbf74eeaa35e1a12aed4129f50cece"
artifact_blob: "4c32ecf9831c32fae1dbc6fa32e67237322beb62"
artifact_digest: "sha256:e45d86ca556d0b7096bc9f31dfe265bda1ca5a747cc6c8a3235d618f209e7e34"
agent:
  host: "codex"
  provider: "openai"
  model_id: "gpt-6.1-sol"
  model_display: "gpt-6.1-sol"
  session_fingerprint: "sha256:3360e116e28ffcee773a4e3ea34dd0578d5ef69a6b6d7df268f0693489c2d4be"
  identity_source: "runtime"
started_at: "2026-10-05T15:16:30.448Z"
submitted_at: "2026-10-05T15:30:33.103Z"
finding_ids: []
answered_finding_ids: ["R1-F001","R1-F002","R1-F003"]
acknowledged_supplement_ids: []
---

Mode: `normal`

## Summary

Applied the three required cross-task corrections to the full canonical Plan and addressed all four optional consistency suggestions. The revised exact artifact SHA-256 is e11cddc84f08b357c7cdf950b6c9ba1d1c92c7c1b6b3604fc468b8280733919a. All changes remain within the reviewed amendment's document reconciliation/activation boundary. No implementation, installed conformance, native issue mapping, immutable record acceptance or publication is claimed.

I selected required-change R1-F001 option (b): Task18 retains sole ownership of the closed activation-addendum schema. Earlier Tasks4/5 have refusal-only addendum coverage; the complete-pair and mismatch cases are explicit later integration runs. This preserves the bounded Task4 urgent candidate and avoids inventing an early competing operational schema.

## Finding dispositions

### R1-F001 — Addressed: defining task and deferred fixture boundary

Shared Contract Types now names Task4 as the defining owner of ReleaseActivationReceipt and QuarantineReceipt at its concrete exported source seams; Task5 defines immutable contract intent and document Report; Task18 alone defines RuntimeActivationAddendum's schema and authoritative release-specific document.

Task4's Interfaces and publication-gate step now explicitly require missing/unknown/schema-unavailable refusal coverage before Task18. Removed the contradictory expectation that a synthetic complete pair reaches subsequent checks during the urgent Task4 candidate. That valid-pair path, parent-contract mismatch and older-tag/different-D negatives are deferred integration runs after Task18's independently accepted schema and required owner reviews exist.

Task5 makes the same refusal-only boundary explicit and creates no competing addendum shape. Its contract-only checker remains distinct from production authorization. Task18's Files block now explicitly includes the checker, release wrapper and release-gate test integration needed when its accepted operational schema is available. Its sibling-production section owns those deferred tests.

This changes neither Task4's binary-free candidate acceptance nor the full release predicate: schema-unavailable input refuses, and no synthetic object grants production authority.

### R1-F002 — Addressed: three qualified registration contracts

Added the registration distinctions to Shared Contract Types:

1. Conformance-run registration R binds capture key, package/run/host scope and pre-capture evidence authority.
2. The #102/#130 registration-receipt contract comprises independently accepted schema, protected setup/transport/read-back and accepted conformance on registered test hosts.
3. Each actual installation's protected runtime registration receipt is created after installing P and validating the approved pair, then read back on that particular installation before runtime effects.

Task4 publication, Task5 sibling intent, Task18 schema/record and Gate8 now bind conformance-run R and accepted conformance of the registration-receipt contract. The addendum never contains or references an installation's protected runtime receipt. A conformance-host receipt cannot satisfy another installation's read-back.

Task8 explicitly distinguishes publication-mode activationAuthorized from the additional per-installation runtime predicate. It independently requires that installation's genuine protected read-back at every effect/after waits. Controlled candidate harness conformance is separate from production setup/activation and grants no ordinary runtime authority. Publication therefore never requires first creating an ordinary receipt that itself needs the approved addendum.

### R1-F003 — Addressed: exact approved-ref resolution in the release command

Selected the review's approved-ref resolution approach. The executable command keeps its existing --approved-ref argument, and its adjacent release-side contract now requires check-release-activation.mjs to resolve the addendum exclusively from authenticated approved E through the same original-reference resolver as validate-consumer-inputs.

It verifies original path/revision/blob/SHA-256, normal accepted owner reviews and parent-contract linkage, compares exact C/T/D against release-input-binding.json and downloaded P/D, then passes that exact resolved object to verifyReleaseActivation. Contract --record alone refuses. Release and consumer jobs must bind identical original references and addendum bytes, also matching the authenticated consumer report; scratch filenames and copied bytes have no independent authority.

## Changes made

Optional suggestions are addressed as follows:

1. Task5 Files and the three follow-up steps consume the already accepted reconciliation at 4d8815b2fabf861d24d25fa9735b953865e99f55 rather than re-authoring it. The tombstone discussion and expected outcomes retain their accepted decision and pending real conformance checks. Checkboxes remain unticked where actual contract/native adoption verification or conformance remains; document acceptance is not falsely stamped as operational completion.
2. Task7 Interfaces and production completion step, Prerequisites and Gate15 now consistently require the independently approved pair, accepted #130 detailed schemas, #102/#130 protected transport/read-back and genuine per-installation receipt. Isolated candidate work remains permitted under the original bounded adoption boundary.
3. Task8 Consumes now explicitly lists the Task5/Task18 approved pair and #102/#130 schema/protected read-back, in addition to its original dependencies.
4. The ambiguous “this amendment” reference explicitly names the separately accepted joint amendment path.

## Declined changes and rationale

None of the required corrections was declined. For R1-F001 I deliberately selected the offered refusal-only/deferred-integration route rather than moving the operational addendum schema to Task4/5. It preserves the previously accepted Task18 ownership and the distinction between contract adoption and genuine operational activation.

## Verification

Fresh targeted Prettier check and canonical Markdownlint passed. git diff --check passed. Exact comparisons retain thirteen untouched task sections (1/2/3/6/9/10/11/12/13/14/15/16/17), the governing specification and all fifteen imported accepted artifact/review members. Header, Story Intent, Global Constraints and Review Focus remain exact. All fifteen gates remain; only the authorized Gate8/15 rows change after whitespace normalization.

The initial targeted CSpell call returned no selected files because existing cspell.json excludes docs/superpowers/**. After inspecting that policy and the installed help, the supported --no-must-find-files invocation completed with zero selected files/zero issues. This is an exclusion result, not a claim that CSpell checked the canonical Plan. No repository lint policy was changed.

The prior durable author SAR remains historical evidence for the initial b012070/e45d subject; this author response is the complete revision review for the new exact e11cdd subject. Neither document certifies implementation behavior. No host full suite was run for this document-only correction, preserving the TIA-only host constraint.

No AC/DoD checkbox was ticked; native #144 mapping and its approved-evidence transaction remain pending until this full canonical normal review accepts. Immutable contract/proof review, actual contract-only verification, exact-head hosted CI and every production/activation/conformance gate remain separate.
