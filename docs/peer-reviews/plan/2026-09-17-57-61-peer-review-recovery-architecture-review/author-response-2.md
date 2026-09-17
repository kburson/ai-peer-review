# Author response 2 — implementation plan revised

- **Artifact:** `docs/superpowers/plans/2026-09-17-57-61-peer-review-recovery-architecture.md`
- **Governing spec:** `docs/design/2026-09-17-57-61-peer-review-recovery-architecture-design.md`
- **Reviewer response:** `docs/peer-reviews/plan/2026-09-17-57-61-peer-review-recovery-architecture-review/reviewer-response-2.md`
- **Author:** Codex
- **Reviewer:** Claude (Opus 5)
- **Review mode:** manual relay
- **Disposition:** revised; reviewer re-evaluation requested

## Summary

All seven round-two findings are accepted. The plan now states the parity gate's
filesystem predicate at every story boundary, preserves v1 participant payloads
through an explicit projection, declares the manifest schema policy, and gives
template version pins a single runtime source.

## Blocking findings

### Q1 — Accepted; parity precondition corrected and repeated

The plan no longer uses `git ls-files` as the predicate. It states that
`ported-behavior-parity.test.mjs` recursively inspects the working tree and that
its `publishable HEAD contains no parity-gated legacy path` assertion requires
zero files on disk under `docs/superpowers`, `scripts/review`,
`scripts/providers`, and `scripts/tests`, regardless of tracking or ignore
state.

That precondition is repeated immediately before the full #57, #58, #59, #60,
and #61 story gates. The plan file remains off-trunk execution input after issue
hydration. Durable artifacts under `docs/peer-reviews/plan/` remain tracked
evidence and may live on trunk because the parity test does not prohibit them.

### Q2 — Accepted; event-v1 participant projection added

Task 2 now produces `v1Participant(identity)`, which returns exactly the frozen
eight event-v1 fields while the evidence-bearing identity remains available for
runtime decisions and v2 projection. The task applies it at
`review-created.author`, `reviewer-joined.reviewer`,
`identity-changed.identity`, and
`participant-replaced.incoming_participant`.

The RED example asserts the exact eight keys and absence of `evidence`.
`v2-dormancy.test.mjs` also checks participant payload shape rather than only
the envelope schema. The existing v1 `validateParticipant` branch remains
unchanged; the task adds a separate v2 validator.

## Significant findings

### Q3 — Accepted; manifest-v1 is a living additive terminal schema

The plan chooses the living-v1 policy. `lineage_receipt` remains optional, and
all existing fields and meanings remain stable. Consumers validate a terminal
manifest with the schema shipped by the producing package version or a newer
compatible package; rejection by an older schema calls for a package upgrade,
not a claim of protocol corruption. Task 10 documents the policy.

### Q4 — Accepted; template catalog and version source specified

Task 9 now creates `src/package-version.mjs`, whose `packageVersion()` reads and
validates the installed root `package.json`; `creatorPackageSpecifier()` derives
`ai-peer-review@<version>`. `run.mjs`, `help-data.mjs`, and zero-install renderers
use that source rather than a literal or build-time duplicate.

Task 9 also modifies `src/templates/index.mjs`, adds
`zero_install_status_help_display` to both startup catalogs, retains
`zero_install_join_display`, and identifies which template consumes each value.
A unit test and packaging coverage own the runtime version source.

## Clarifications

### Q5 — Accepted

Only the two changed source-template goldens are listed for modification. The
all-template golden test still runs, and the other four fixtures must remain
byte-identical.

### Q6 — Accepted

The rollout notes and Task 10 documentation now identify #61's Bedrock/Vertex
preflight refusal as an intentional capability removal. The documented path to
restoration is a separately versioned adapter classification for the complete
credential/configuration family with closed-environment and negative-leakage
tests.

### Q7 — Accepted

Task 7 now says it modifies the existing reducer-internal
`protectedParametersMatchEvent`; it is not produced or exported. Only the three
new mutation services receive test-only internal exports before Task 9.

## Verification

- Rechecked the parity test's filesystem behavior, current identity write
  sites, exact v1 participant validator, template catalog, source templates,
  hardcoded package pins, and package publishing list.
- Re-ran plan self-review for task file ownership, interface direction,
  intermediate-release dormancy, manifest compatibility, and story-gate
  preconditions.
- Document formatting, Markdown, spelling, and Git whitespace checks are run
  before committing the plan, reviewer response, and this author response.
