---
issue: 111
review_type: single-agent-review
reviewer: Codex
author: Codex
reviewer_model: gpt-6-astra
author_model: gpt-6-astra
model_provenance: parent-dispatch-configuration
independent_review: false
protocol_acceptance: false
reviewed_commit: 18e9d65ac46011647793bb4514ce62781315f243
artifact: docs/superpowers/specs/20260927-111-spec.md
recorded_at: 2026-09-28T03:57:34Z
revised_artifact_sha256: 048276df160ae486ed7ecf4462e350f41d04ab59f3f2b222409c1edd93a79fdf
assessment: self-review-complete-xpr-deferred
predecessor: docs/peer-reviews/111/spec/review-01/sar.md
---

# Issue 111 specification SAR, second pass

## Scope and authority

One Codex agent performed both reviewer and author roles. The parent explicitly
dispatched that agent with GPT-6 Astra; the model fields record dispatch
configuration rather than independent runtime introspection. This report is a fresh
single-agent review of the committed specification identified above, followed by
revisions to that specification and a final self-review. It is not independent
review, cross-provider review (XPR), protocol acceptance, or human approval. XPR
remains deferred to a later user decision.

The numbered report directory is an informal filing location, not an allocated
protocol execution. The predecessor link records report history and creates no
execution, submission, claim, seal, participant identity, or inherited acceptance.
The prior SAR remains unchanged. The final specification digest identifies the
revised working-tree bytes; the reviewed commit identifies the initial input.
The parent will manage any later commit.

The pass checked the approved layout and lifecycle decisions against
`src/collateral/paths.mjs`, `src/collateral/review-record.mjs`,
`src/collateral/responses.mjs`, `src/provider/claude-launch.mjs`, and
`src/protocol/reducer.mjs`. It also checked the previous SAR and the current
Prettier, Markdownlint, and spelling configuration. Current source is feasibility
evidence, not a claim that the proposed behavior already exists.

## Findings and author dispositions

### SAR-111-08: Frozen inputs must allow authorized later launches

**Finding:** The specification freezes selected and resolved instructions at
startup and requires a new execution for instruction changes. It also requires
agents to receive current turn and retry paths. Without a distinction between
frozen templates and derived launch projections, later launches could either use
stale permissions or rewrite startup evidence. The Claude resume code already
separates the original invitation from the current authorized response.

**Disposition:** Added a rule that later launch and resume projections use the
same frozen templates and authoritative current state. Each retained projection
binds its input digests, execution, turn, role, retry, and exact response path.
Projections cannot replace selected templates or retained startup bytes. Current
authority must be checked before granting access; changing instructions still
requires a new execution. Added explicit resume and stale-grant verification.
Resolved at design level; implementation remains future work.

### SAR-111-09: Finished review is not sufficient planning-entry evidence

**Finding:** The ordered workflow said to finish the spec review and establish its
actual outcome, then commit and record the spec before generating the plan. A
terminated or unsuccessful review also has an actual outcome. The previous
wording did not explicitly require eligibility under the applicable review policy
or ensure that the committed spec bytes still matched the cited review evidence.
The current reducer distinguishes accepted, interrupted, and other terminal
states; completion alone cannot stand in for those distinctions.

**Disposition:** Required a policy-eligible outcome tied to committed spec bytes.
Termination, budget exhaustion, completion alone, or an abandoned recommendation
does not satisfy planning entry. A commit that changes reviewed artifact bytes
requires evidence reconciliation. The rule preserves the actual review class and
separately required approvals; it does not invent human approval, require an
XPR without user direction, or let SAR satisfy independent acceptance. Added negative
verification cases. Resolved at design level.

### SAR-111-10: Historical phase folders need an explicit identity exception

**Finding:** The new layout described every review folder as a distinct execution,
while historical phased reviews must preserve one original execution across spec
and plan projections. The shared evidence source was required but its ownership
and the explicit exception to the new folder rule were not stated together. A
consumer could interpret the two folders as two reviews or duplicate acceptance.

**Disposition:** Limited the one-folder/one-execution rule to new reviews and
made the historical exception explicit. One recorded owning review folder retains
the canonical shared evidence. The other kind's folder is labeled a historical
phase projection. Both mappings identify the original execution and owner, and
consumers deduplicate by that identity. Preflight must resolve ownership before
publication. This preserves the approved rule that supporting evidence belongs
inside a review folder and introduces no shared execution directory. Added
verification for single ownership and absence of double counting. Resolved at
design level; exact schema and mapping mechanics belong in planning.

## Previous findings and final assessment

The first SAR's two open layout decisions are addressed by the supplied final
design: supporting files stay within review folders, and new spec and plan jobs
use separate executions while legacy phases remain explicit historical mappings.
The earlier findings concerning retry authority, sealed invitation ownership,
durable allocation history, link resolution, retained evidence, partial
publication, and final-byte sealing remain covered by the revised specification.

No unresolved design decision was found in this pass within the approved scope.
The specification is ready for detailed planning subject to the applicable
workflow gates and the user's deferred XPR decision. This self-review neither
advances those gates nor asserts independent acceptance. The frontmatter status
now records that SAR occurred and XPR remains deferred.

The implementation plan still must supply exact schemas, allocation and recovery
mechanics, transformation comparators, historical mappings, and tests. Those are
explicit plan deliverables, not evidence of an implemented or completed migration.
No code, historical evidence, issue record, lifecycle state, or Git commit was
changed by this review. Unrelated hook mode changes were preserved.

## Validation

The revised specification and this report passed actual Prettier checking and
Markdownlint. Cspell checked each document using a separate `stdin://` filename
to ensure the specification ignore pattern could not skip its content; both
passed with zero spelling issues. `git diff --check` passed. The prior SAR matched
its committed bytes. The final specification SHA-256 above was verified after
formatting.

These are document checks. No implementation tests, repository-wide lint result,
completed migration, or protocol acceptance are claimed.
