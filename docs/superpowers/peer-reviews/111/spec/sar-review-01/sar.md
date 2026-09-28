---
issue: 111
review_type: single-agent-review
reviewer_model: GPT-6 Astra
author_model: GPT-6 Astra
independent_review: false
protocol_acceptance: false
reviewed_commit: c4e4d5eb0ae2ad182d1d6d8fdd2372a5a594f2a4
artifact: docs/superpowers/specs/2026-09-27-111-review-collateral-layout-and-evidence-migration-design.md
recorded_at: 2026-09-27T21:50:09Z
revised_artifact_sha256: cfed3e169ff3b7fca229d0f0b3188784324d81ae59e2fa9c1c416ca0f6a04e6e
assessment: revisions-recorded-pending-written-decisions
---

# Issue 111 specification SAR

## Scope and authority

GPT-6 Astra performed both reviewer and author roles in this single-agent review
(SAR). This is an informal design review, not independent same-provider review,
cross-provider review, or protocol acceptance. No protocol execution, submission,
seal, participant identity, or approval has been created by this report. Its
numbered directory is a human filing location, not a protocol allocation receipt.

The first pass examined the committed specification above against current path,
response, review-record, provider, template, and phased-protocol source. The author
pass revised only the specification, preserving the approved response layout and
historical evidence requirements. The final pass checked those revisions against
the findings below. No feature implementation or historical migration was performed.

## Findings and author dispositions

### SAR-111-01: Retry paths need distinct draft authority

**Finding:** `src/collateral/responses.mjs` registers drafts by role and protocol
turn. A new filename suffix alone does not establish a separate retry identity or
authorize reusing another execution's reviewer submission.

**Resolution:** Added complete role/retry/path binding for registration, recovery,
and reservations; retries cannot reset turn budgets. Reviewer submission reuse
requires current event authority. A mapping alone cannot import authority or
findings from a different execution. Resolved at design level; implementation and
regression tests remain future work.

### SAR-111-02: Invitation ownership depends on directory equality

**Finding:** `src/provider/claude-launch.mjs` currently rejects an invitation whose
parent directory differs from the response directory. The proposed supporting-file
placement would break launch even after filename parsing is repaired.

**Resolution:** Require sealed invitation/execution/current-turn/exact-path
ownership instead of directory equality. Preserve refusal of foreign invitations,
edited routing projections, and neighboring writes. Resolved invariant; exact
supporting-file placement remains a written decision.

### SAR-111-03: Phased execution routing is unspecified

**Finding:** `src/protocol/reducer.mjs` preserves execution-wide turns across spec
and plan phases while resetting the phase budget. Kind-scoped review directories
must not split this execution or duplicate its acceptance.

**Resolution:** Added explicit phase, artifact, and counter preservation plus
phased regression fixtures. The cross-kind mapping and ownership of shared
execution collateral remain unresolved design choices requiring written approval.
This finding remains open only for that concrete routing decision.

### SAR-111-04: Index reconstruction can lose allocation history

**Finding:** Calling the index a replaceable projection does not specify how
previous allocations, including abandoned reservations, survive its reconstruction.
Scanning remaining directories can reuse a number promised to remain stable.

**Resolution:** Require durable allocation and retirement evidence outside the
replaceable index, exact allocation identity during recovery, and reconstruction
tests that preserve abandoned numbers. Resolved at design level; the detailed
storage mechanism belongs in the implementation plan.

### SAR-111-05: Relative links can change meaning without changing bytes

**Finding:** A path-only move can preserve the file digest while changing the target
of a relative link. Textual or Markdown-structure equivalence is insufficient to
prove reference preservation.

**Resolution:** Require resolved target and fragment checks before and after moves.
Treat link rewrites as explicit verified relocation mappings, including links among
transformed documents. Preserve original sealed links in retained source; changed
or unproven targets require fresh review or stop application. Resolved at design
level without authorizing edits to original evidence.

### SAR-111-06: Retention and partial publication need stronger boundaries

**Finding:** A commit hash alone does not ensure durable retrieval. Multiple file
publications and source removals can expose incomplete mappings or delete a source
changed after preflight.

**Resolution:** Require reachable retained history or a published retention
reference, verification of required evidence dependencies, reader rejection of
incomplete publication, durable journal state before removal, and immediate source
revalidation under the same mutation coordination. Resolved at design level;
fault-injection verification remains an implementation requirement.

### SAR-111-07: Sealing changes bytes after draft formatting

**Finding:** `src/collateral/responses.mjs` fills submission timestamps and finding
IDs during sealing. Formatting a draft earlier does not establish that the final
submitted response passes formatting or retains the same parser interpretation.

**Resolution:** Require computed metadata first, then final formatting and
validation, then hashing/sealing of those exact bytes. Recheck protected metadata
and formatter idempotence, including interrupted finalization recovery. Resolved
at design level; no sealed historical response was changed.

## Final assessment and remaining decisions

The revised specification addresses the seven findings as far as the approved
scope permits. It is ready for written design decisions, not implementation or
protocol acceptance. Two connected decisions remain:

1. Approve or revise the proposed `executions/<review-id>/` supporting-file location.
2. Specify cross-kind phased routing and shared execution-file ownership without
   splitting protocol identity or duplicating acceptance.

The approved issue/kind/review/turn response hierarchy, role-specific retry
suffixes, full metadata identities, all tracked history including closed issues,
immutable source retention, preflight-first application, and fresh review for
substantive or unproven changes remain intact.

## Validation

Both documents passed Prettier checking and Markdownlint. Cspell checked each
through a separate `stdin://` filename so the configured specification exclusions
could not skip the content; both passed with zero spelling issues. `git diff
--check` passed for the tracked specification changes. The report is a new file.
The initial spelling failures were resolved with plain wording.

No code tests were run for these document-only changes. No repository-wide lint result,
implementation correctness, completed migration, or independent acceptance is
claimed by this SAR.

## Save history

The initial save attempts were rejected by the task-tracker patch-input parser
with “missing exact patch boundaries.” No file changed during those attempts.
The parent confirmed ordinary shell document writes under the user-authorized
temporary chore mode. This report and the revisions were then saved through that
normal tool path without modifying guards or unrelated files.
