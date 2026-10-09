<!-- ai-peer-review-template version="1" digest="sha256:78e9a634af9d540baaf6790db82952eaf39cf7ab59a6cdc7938319ae07a4cbed" -->

<!-- protected-frontmatter -->

---
schema: "ai-peer-review.response/v1"
review_id: "review-6522bc912d65661298c2b1a072c32f0b"
role: "reviewer"
turn: 1
commit_mode: "normal"
authority_assurance: "unavailable"
artifact_path: "docs/superpowers/plans/2026-10-03-107-agent-first-portable-runtime.md"
artifact_commit: "b012070c33fbf74eeaa35e1a12aed4129f50cece"
artifact_blob: "4c32ecf9831c32fae1dbc6fa32e67237322beb62"
artifact_digest: "sha256:e45d86ca556d0b7096bc9f31dfe265bda1ca5a747cc6c8a3235d618f209e7e34"
agent:
  host: "claude-code"
  provider: "anthropic"
  model_id: "claude-opus-5-5"
  model_display: "claude-opus-5-5"
  session_fingerprint: "sha256:79ccd7118cb7ce874538557331d0245d681ab002cf2c6a295e6d4f8d6013fa7d"
  identity_source: "runtime"
started_at: "2026-10-05T15:17:52.783Z"
submitted_at: "2026-10-05T15:21:09.101Z"
finding_ids: ["R1-F001","R1-F002","R1-F003"]
answered_finding_ids: []
acknowledged_supplement_ids: []
---

Mode: `normal`

## Summary

I read the complete applied canonical plan `docs/superpowers/plans/2026-10-03-107-agent-first-portable-runtime.md` (all 1,634 lines) in the working tree at `b012070`. This session could not run arbitrary shell commands and may not use Git, so I did not recompute the artifact digest `e45d86ca…7e34` or any digest the plan cites (including the four native owner-comment SHA-256 values at lines 75–80). I take those values as stated. I could not diff against the baseline object `60efdbb`. Instead I compared each clause the amendment changes with the applied text.

I checked the plan against these sources:

- the accepted amendment `docs/superpowers/plans/2026-10-05-107-runtime-contract-plan-amendment.md` (complete);
- its accepted review `review-a4157c49c11ad9d12836d7bfea0df472`, reviewer responses 1 and 2;
- the accepted reconciliation `docs/superpowers/specs/2026-10-03-107-runtime-policy-reconciliation-design.md` (complete).

**Application fidelity: the amendment was applied correctly.** Every listed change is present:

- Prerequisites: the historical conflict table is retained, and the disposition table and pointer are added (lines 56–71).
- Task 4: the `verifyReleaseActivation` and `quarantineLegacyLeftovers` interfaces and the publication-gate step are replaced (lines 383, 404).
- Task 5: the files and interfaces, the step 5 text and snippet, and the strict-provenance and lineage-proof sections are replaced. VC1 now uses `--mode adoption-only`, and the native mapping is added (lines 460–559).
- Task 7: the #130 dependency is updated (lines 626–650).
- Task 8: the named-argument `assertContractAdoption` and the external registered-authority transport are in place (lines 689, 707, 716–730, 743–749).
- Task 18: the files, the `verifyPortableRelease` interface, ordering step (3), the consumer and release.yml bullets, the line-1590 consumer command, the `validate-consumer-inputs` addendum materialization and the activation-sibling section are all applied (lines 1320–1337, 1582–1601).
- Gate rows 8 and 15 are rewritten (lines 1616, 1623).

The applied text differs from the amendment's literal wording in three places. Each one adopts an optional suggestion from the accepted amendment review, and none weakens a constraint:

- `lineageProofs` is added to the Task 5 snippet (line 492);
- the #102/#130 transport/read-back obligation is added to the Prerequisites "Continuing gate" column (line 67) and to Gate 8 (line 1616);
- the native owner disposition pins are recorded (lines 73–80) as the amendment sequence's "obtain owner adoption" step. Line 82 states correctly that full canonical Plan review and contract-record acceptance are still pending.

All fifteen gates, numeric limits, A/B bundle atomicity and default publication refusal are preserved.

**What remains.** Applying the amendment puts some contracts in the full plan that do not fit together across tasks, and the amendment review could not see them in isolation:

- The closed addendum shape is created in Task 18, but Tasks 4 and 5 consume it first (R1-F001).
- "Registration" means different things in different places, and one reading makes publication circular (R1-F002).
- The release-side executable command does not name its addendum input (R1-F003).

None of these is a security regression, and each fails closed as written. But F001 and F002 leave a task implementer without the contract they need, or with a circular dependency, at the exact points this amendment introduced.

## Findings

### R1-F001 — The activation addendum's closed shape is defined in Task 18, but Tasks 4 and 5 must build and test against it earlier

Location: Task 18 Files (line 1320) and `Task 18 activation sibling production` (line 1599) create `schemas/runtime-activation-addendum-v1.json` (`ai-peer-review.runtime-activation-addendum/v1`). Earlier consumers:

- Task 4 (line 383) `verifyReleaseActivation({…,contractRecord,activationAddendum,approvedReference,checker})` requires "exact parent-contract digest and C/T/D equality". Line 404 requires red release-workflow fixtures where "a synthetic complete pair exercises refusal grammar and reaches the subsequent existing checks".
- Task 5 (lines 470–472) `checkRuntimeContractAdoption({…,activationAddendum,mode})`. In default/publication mode, the approved-ref must pin "one exact activation addendum and accepted review" (line 472). Line 555 keeps that stronger requirement when the mode is omitted. The amendment's TDD negatives ("addendum parent-contract mismatch, older-tag/different-D addendum", amendment line 201) need a concrete addendum shape.
- The Shared Contract Types section (lines 96–104) names no owner for `RuntimeActivationAddendum`, `ReleaseActivationReceipt` or `QuarantineReceipt`.

The order (line 88) runs Task 4 first, as the urgent candidate. The reconciliation (line 55) requires that "Task 4 … wrapper implementation and red release-gate fixtures are delivered independently of Task 5". Neither task can wait for Task 18.

Failure scenario: a Task 4 or Task 5 implementer must build a "synthetic complete pair" and addendum-mismatch negatives with no closed schema. They either invent an ad-hoc addendum shape (which Task 18 later replaces with a competing one), or they skip the positive-pair path and leave only refusal tests. In the first case, Task 4's wrapper and Task 5's checker are validated against a shape that the Task 18 schema and the #102/#107/#30 reviews never accepted. That is the "no competing shapes" problem the plan forbids elsewhere (line 104). In the second case, Task 4's acceptance step (line 404, "reaches the subsequent existing checks") cannot be met.

### R1-F002 — "Registration" in the activation addendum and publication predicate is ambiguous, and the per-installation reading is circular

Location:

- Task 5 line 470: the addendum "references the exact contract digest, release source/tag/tarball, registration and genuine installed exclusion/drain conformance".
- Line 404: "The separate sibling binds its exact parent-contract digest and C/T/D/registration/conformance".
- Line 1599: "registration/conformance references".
- Gate 8 dependency (line 1616): "exact release C/T/D/registration".
- Task 8 transport (lines 745–747): "#102-owned setup/registration stores the independently verified public contract/addendum pair … in a protected OS-account selected-current registration store". It validates the pair "before writing the protected receipt".

The plan uses "registration" for at least three different things:

- (a) Task 3/18 pre-capture conformance key registrations at review commit R;
- (b) the #102/#130 registration-receipt contract (schema plus transport/read-back interface);
- (c) the per-installation protected registration receipt that #102 setup writes on each user machine after install, and that Task 8 reads back at every effect.

The addendum is assembled before publication (ordering step (3), line 1332). It can bind (a), and it can bind conformance evidence for (b) exercised on conformance hosts. It cannot bind (c): (c) exists only after P is installed, and it is written by validating and storing that same addendum.

Failure scenario: an implementer of `checkRuntimeContractAdoption` publication mode or `verifyReleaseActivation` reads "registration" in `activationAuthorized` as an installation registration receipt. Then either publication is impossible, because no receipt can exist before P is published and installed, or a conformance host's own receipt is put into the addendum and treated as authority. That would let a single machine's receipt stand in for the per-installation read-back Task 8 requires on every user host. Going the other way, a runtime implementer could treat the addendum's "registration reference" as satisfying the Task 8 read-back. The reconciliation (line 57) already treats publication-time `activationAuthorized` and the runtime check as separate requirements. The plan does not say which registration each one consumes.

### R1-F003 — The release.yml `check-release-activation` command omits the activation-addendum input the amendment requires it to receive

Location: line 1522. The command is `node scripts/check-release-activation.mjs --package … --binding … --record evidence/portable-runtime/contracts/runtime-contract-adoption.json --approved-ref …`. Compare:

- the consumer command at line 1590, which passes `--activation-addendum .scratch/peer-review/runtime-activation-addendum.json` after `validate-consumer-inputs` materializes and rechecks it (line 1582);
- the release.yml bullet (line 1337), which requires running check-release-activation "against that same E/D and exact approved immutable contract/addendum pair";
- the amendment (line 178), which requires that release.yml "pass the exact pair from approved-ref … to `check-release-activation`; neither … verifies release identity against the contract alone".

The release job has no `validate-consumer-inputs` step. The plan does not say how the addendum is resolved there, and the only adoption-specific input shown is the contract `--record`.

Failure scenario: an implementer writes `check-release-activation.mjs` to match the shown command. That script validates only the contract record and the release-input binding, so release identity is checked against the contract alone, which the amendment forbids. Or the release-side and consumer-side checkers resolve the addendum differently, one from a scratch copy and one from approved-ref, so the two jobs can bind different addendum bytes for the same D. The `verifyReleaseActivation` interface (line 383) does require `activationAddendum`, so a careful implementer would refuse. But the executable command is the spec CI will copy.

## Required changes

1. **R1-F001.** Give the addendum's closed contract an owner before its first consumer. Pick one option and state it in the Shared Contract Types section and in the affected Files/Interfaces blocks:
   - (a) Task 5 (or Task 4) creates `schemas/runtime-activation-addendum-v1.json`, a typedef, and schema-valid synthetic fixtures in `test/fixtures/` (examples only, with no authority). Task 18 then produces only the authoritative release-specific record under `evidence/portable-runtime/contracts/activation/…`, plus the #30 sibling-linkage and #102/#107/#30 reviews; or
   - (b) Tasks 4/5 deliver refusal-only fixtures (missing, unknown or unschema'd addendum refuses). The line-404 "synthetic complete pair" positive path and the addendum-mismatch negatives are labelled integration runs after the Task 18 schema exists, consistent with line 106. Task 4's acceptance wording is adjusted to match.

   Also name the defining tasks for `ReleaseActivationReceipt` and `QuarantineReceipt`.
2. **R1-F002.** Define "registration" separately for each context and use the qualified term at lines 404, 470, 1599 and in Gate 8:
   - The addendum and publication-mode `activationAuthorized` bind conformance-run registrations (R) and accepted conformance of the #102/#130 registration-receipt contract and transport/read-back on registered hosts.
   - Runtime `activationAuthorized` in Task 8 additionally requires the per-installation protected receipt read back on that installation.
   - An addendum never contains or references any installation's runtime registration receipt, and no conformance-host receipt can satisfy another installation's read-back.
3. **R1-F003.** Make the line-1522 release command match the amendment, using one of two approaches:
   - add an explicit `--activation-addendum` argument, materialized in the release job by the same original-reference resolution and recheck as `validate-consumer-inputs`; or
   - state that `check-release-activation.mjs` resolves the exact addendum only from the authenticated approved-ref at E, rechecks its path, revision, blob and digest, and compares its C/T/D with `release-input-binding.json`.

   In both cases, state that the release and consumer jobs must bind identical addendum bytes and that the contract record alone refuses.

## Optional suggestions

1. Task 5's unchecked steps at lines 475–478 ("Write targeted spec follow-up…", tombstone evaluation, expected outcomes) and the Files line 460 ("Governed follow-up creates …reconciliation-design.md") are already satisfied by the accepted reconciliation `4d8815b`, which covers the tombstone alternative (lines 27–37) and operational outcomes (lines 39–51). Mark them as satisfied, with that evidence pointer, so a Task 5 executor does not re-author the spec. If this needs another governed amendment, say so.
2. Line 82 says "Tasks7/8/18 production integration and gates8/15 still require the independently approved contract/activation pair, actual registration/read-back…". The Gate 15 row (line 1623) and Task 7 (line 626) name the #130 schemas and the #102/#130 transport/read-back, but not the activation pair. Gate 15 also lacks the read-back. Align the three statements so a reader does not have to infer which requirement is authoritative.
3. Task 8's **Consumes** line (line 688) does not list the Task 5 contract/addendum pair or the #102/#130 registration read-back, although lines 743–749 require both. Add them so the Interfaces block stays the complete consumed-contract list that line 106 promises.
4. Line 71 says "This amendment cannot label open owner plans accepted." In the canonical plan, "this amendment" no longer has a referent. Use "The joint amendment (…runtime-contract-plan-amendment.md) cannot…".

## Decision

revisions-requested
