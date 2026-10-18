<!-- ai-peer-review-template version="1" digest="sha256:78e9a634af9d540baaf6790db82952eaf39cf7ab59a6cdc7938319ae07a4cbed" -->

<!-- protected-frontmatter -->

---
schema: "ai-peer-review.response/v1"
review_id: "review-0b5e44367ed1ebf60276c5f385829029"
role: "reviewer"
turn: 2
commit_mode: "no-commit"
authority_assurance: "unavailable"
artifact_path: "docs/superpowers/specs/2026-10-18-222-review-journal-refactoring-design.md"
artifact_commit: "5546d8019e59b98c0e5f6cbb5e1570c7640c857b"
artifact_blob: "15968bff92a9fab29ce629002d1f39f9e9440050"
artifact_digest: "sha256:f67d8a5c22b8a36537876aee529fe9dbc0530b7137650c28f144d7b9960ad5be"
agent:
  host: "claude-code"
  provider: "anthropic"
  model_id: "claude-opus-5-5"
  model_display: "claude-opus-5-5"
  session_fingerprint: "sha256:d67c48a081e566e1e470dc936b561071d5d482e0a5d8d45802836ededf5513b8"
  identity_source: "runtime"
started_at: "2026-10-18T15:25:02.605Z"
submitted_at: "2026-10-18T15:30:47.258Z"
finding_ids: ["R2-F001"]
answered_finding_ids: []
acknowledged_supplement_ids: []
---

> **LOCAL JOURNAL MODE** — authority assurance: `unavailable`

## Summary

This is the round-2 XPR of revision 13 (`revision_id: issue-222-r13`, `based_on_commit: 5546d8019e59b98c0e5f6cbb5e1570c7640c857b`).

**Review basis and limits**

- I read author-response-1 in full and reread the full revision-13 working-tree artifact.
- I checked the sealed turn snapshot `.scratch/peer-review/review-0b5e44367ed1ebf60276c5f385829029/artifacts/turn-1.md`. It carries the same revision frontmatter and the new AC 16.
- Shell hashing was unavailable to this session, so I rely on the protected `artifact_digest` above.
- This session was instructed not to use Git. I did not observe the full reviewer HEAD myself, so it is unavailable here. Response-v1 has no `reviewer_commit` field.
- The author reports HEAD unchanged at `5546d80…`, which matches the protected `artifact_commit`. The new `based_on_commit` correctly records that commit as the writing basis for revision 13.

**Changed passages reviewed**

- The header.
- §4.3 "Initial manifest and stable review root", "Drift at acceptance and code-context forks", "Before plan generation" and "After plan acceptance and backlog hydration".
- The new last row of the §6 table.
- The §7 work-boundary bullet.
- ACs 12, 15 and 16.

**R1-F001 (major) — resolved.**

- The initial-manifest capture now records a working-state overlay in the same stability window as HEAD and the FUR. For each non-FUR, non-collateral staged, unstaged and nonignored untracked path it records existence, type, mode and index/working content digests. It records an explicit clean marker when there are none, and an explicit `unavailable` with a reason when capture fails.
- The acceptance comparison now runs between effective working contexts (root commit plus overlay versus acceptance commit plus overlay). The commit-to-commit comparison is recorded separately.
- All three of my scenarios now produce the correct result:
  - dirty content left unchanged is no context change;
  - committing that content unchanged changes only commit/index bookkeeping;
  - discarding it is a context change.
- Pre-existing dirty paths are reported separately.
- Ignored-path scope is stated. Tracked paths are included even when an ignore rule matches them, and a clean result makes no claim about ignored or external runtime state.
- A missing overlay or Git object yields `unavailable`, never a clean result by inference.
- The pre-planning bullet applies the same overlay comparison to session roots. It correctly limits an earlier writing basis that has no overlay to a commit comparison, without inventing a clean historical state.
- Storing only paths and digests keeps source contents out of collateral, which is consistent with §4.5.
- AC 12 covers each case.

**R1-F002 — resolved.**

- The exclusion set now derives from exact contained paths declared by the initial manifest and each later sealed linked record.
- Both endpoints of a supported FUR rename are included.
- Links and roles are resolved before exclusion. A missing, corrupt or ambiguous link makes classification `unavailable`.
- Directory, template and filename-resemblance exclusions are explicitly forbidden.
- Other sessions' collateral stays outside the set and is reported as informational divergence. The recorded suitability judgement may treat it as irrelevant, but it cannot silently widen the set. This is the conservative option I offered and is acceptable.
- AC 12 covers it.

**R1-F003 — resolved.**

- AC 15 now separates three things:
  - AIPR's mechanically verifiable comparison records and bindings;
  - a documented governing-operator procedure owned by scoped preimplementation adoption, with no new engine or CLI mandated;
  - a named decider's rationale bound to the comparison inputs, verified for presence, binding and workflow branch, with no claim that tests establish whether a materiality judgement is semantically correct.
- AC 16 limits AIPR to the downstream handoff and registration record.
- The new §6 row assigns the post-hydration deep-dive behaviour to a future bounded native AITM issue verified in its owning workflow. That issue is honestly marked "not yet registered" rather than given an invented number.
- Registration is future authorized workflow work and is not performed in this specification-only scope. That is the right call under the current authorization, and §6's cross-repository rule is respected.
- The §7 bullet assigns both new procedural obligations to named work boundaries.

**Optional suggestions — adopted.**

- **R1-F004:** The earliest-basis comparison is kept as lineage context, as the owner required. Suitability is judged against the accepting sessions' evaluated contexts and their remaining unreviewed differences, and the text explicitly forbids re-review loops caused only by already-reviewed history.
- **R1-F005:** Root capture now distinguishes detached HEAD.

**Consistency check**

I found no regression.

- The new comparison text keeps the within-turn stale HEAD/FUR refusal intact.
- It keeps the publication window and reservation rules in §4.4.
- It keeps the immutable-root and append-only divergence semantics.
- It does not touch response-v1 or manifest-v1 semantics.
- §§1–3, §5, the other ACs and §9 are unchanged and remain consistent with the revision-11 acceptance and the R1 resolutions above.

**Scope of this acceptance**

The remaining open items belong to later steps, not to this specification:

- the concrete overlay digest algorithm and how it relates to Git blob identity;
- the manifest-v2, response-v2 and lifecycle contracts;
- the patch format;
- registration of the AITM issue.

The spec explicitly assigns these to adoption, planning or the owning workflow. Owner adoption and fresh planning are still required. This technical acceptance does not authorize implementation or live issue changes.

## Findings

None.

## Required changes

None.

## Optional suggestions

### R2-F001 — Name the journal/provenance work boundary in the §7 list

The §7 bullet now says "journal/provenance delivery supplies its mechanical comparison inputs". However, the enumerated required work boundaries in the same bullet are:

- CI bootstrap;
- process contract/implementation;
- review-only roles;
- scoped preimplementation adoption;
- backlog disposition;
- aggregate verification.

None of them is a journal/provenance delivery boundary. The §4.3/§4.4 implementation work has the same gap: initial manifest and overlay, response-v2, lineage, diffs, reconstruction and publication lifecycle.

Consider adding "journal/provenance and collateral" to the enumerated list so the fresh plan cannot fold it into another boundary or omit it. That work changes files in the §5.3 contract closure (event, collateral-response, template and config modules). It is therefore already subject to the existing rule that process separation lands before, or atomically with, every closure-changing boundary. Naming it would make that ordering visible in the plan.

## Decision

accepted
