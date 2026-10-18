<!-- ai-peer-review-template version="1" digest="sha256:78e9a634af9d540baaf6790db82952eaf39cf7ab59a6cdc7938319ae07a4cbed" -->

<!-- protected-frontmatter -->

---
schema: "ai-peer-review.response/v1"
review_id: "review-0b5e44367ed1ebf60276c5f385829029"
role: "reviewer"
turn: 1
commit_mode: "no-commit"
authority_assurance: "unavailable"
artifact_path: "docs/superpowers/specs/2026-10-18-222-review-journal-refactoring-design.md"
artifact_commit: "5546d8019e59b98c0e5f6cbb5e1570c7640c857b"
artifact_blob: "08fa44f9265d19b2838446cfc623361881d3d005"
artifact_digest: "sha256:9250f0cb442f44d62b4910d52bf4280d5bf1b6292fbac3b71a665ec19482fd5c"
agent:
  host: "claude-code"
  provider: "anthropic"
  model_id: "claude-opus-5-5"
  model_display: "claude-opus-5-5"
  session_fingerprint: "sha256:d67c48a081e566e1e470dc936b561071d5d482e0a5d8d45802836ededf5513b8"
  identity_source: "runtime"
started_at: "2026-10-18T15:25:02.605Z"
submitted_at: "2026-10-18T15:27:20.363Z"
finding_ids: ["R1-F001","R1-F002","R1-F003","R1-F004","R1-F005"]
answered_finding_ids: []
acknowledged_supplement_ids: []
---

> **LOCAL JOURNAL MODE** — authority assurance: `unavailable`

## Summary

This is an independent XPR of revision 12 (`revision_id: issue-222-r12`, `based_on_commit: 7e5ab23acfc77bd21335f32596f925518c225c54`) of the #222 journal refactoring specification. Revision 11 was XPR-accepted in `review-d81db636f6f2a77ca13e33cef6489934` (reviewer-response-3). The revision-12 header says that acceptance does not cover the new bytes, which is correct.

**Review basis and limits**

- I read the working-tree artifact and the sealed snapshot `.scratch/peer-review/review-0b5e44367ed1ebf60276c5f385829029/artifacts/start.md` in full. Their text is identical on reading. Shell hashing was unavailable to this session, so I rely on the protected `artifact_digest` above.
- This session was instructed not to use Git. The session-start environment reported this worktree on `codex/aipr-journal-refactoring` with latest commit `5546d80` (abbreviated). That commit is titled "Record stable review roots and lifecycle drift requirements" and is consistent with the protected `artifact_commit` `5546d8019e59b98c0e5f6cbb5e1570c7640c857b`.
- The FUR's `based_on_commit` is the parent `7e5ab23`. This is consistent with §4.3's rule that a writing-basis SHA does not mean the FUR already exists in that commit.
- I did not observe the full reviewer HEAD myself, so it is unavailable here. Response-v1 has no `reviewer_commit` field.
- I also read the prior round-1 and round-3 reviewer responses of `review-d81db636…` to identify what changed.

**Scope of change since revision 11**

- §4.3 has a new "Initial manifest and stable review root" bullet.
- §4.3 has a new "Drift at acceptance and code-context forks" bullet.
- §4.3 "Before plan generation" is rewritten around session roots, writing basis and current-HEAD re-review.
- §4.3 has a new "After plan acceptance and backlog hydration" bullet.
- AC 12 and AC 15 are revised.
- The header is updated.

I found no regression in the rest of the document. That includes the R1/R2 resolutions in §4.3/§4.4 confirmed at revision 11, §§1–3, §§5–7 and ACs 1–11, 13 and 14. The final paragraph of §4.4 now routes unreachable context to current-HEAD re-review, which is consistent with the new pre-planning bullet.

**Assessment**

The direction is sound. Several design choices are correct and avoid the over-claiming the rest of the spec guards against:

- Anchoring each session on an immutable, HEAD-stable root captured at initial-manifest sealing.
- Keeping the root fixed while appending informational divergence records rather than rewriting it.
- Treating review-only publication commits as non-code drift.
- Recording non-ancestor rewrites separately from endpoint content differences.
- Mapping unresolvable roots to `unavailable` rather than to review-only.
- Splitting drift responsibility by lifecycle stage: a pre-planning spec suitability check, then a per-story deep dive after hydration.

Three gaps would make the new drift records misleading or the new ACs unverifiable as written:

1. The root records only HEAD, but the acceptance comparison includes dirty state. Dirty work that already existed at session start is therefore reported as drift.
2. The source of the "declared review-collateral paths" allowlist is undefined for collateral created after the initial manifest is sealed. Other sessions' collateral is also not addressed.
3. AC 15 asks AIPR verification to test a judgement ("material drift") and a downstream workflow behaviour (story deep dives) that this repository neither performs nor owns.

Revisions are requested.

## Findings

### R1-F001 — Review root captures only HEAD, so pre-existing dirty state is misreported as drift

Severity: major.

The "Initial manifest and stable review root" bullet captures `review_root_commit` (full HEAD), repository/branch identity, creation time and the submitted FUR revision/digest. It records nothing about the non-FUR working state at session start.

The "Drift at acceptance" bullet then compares the root with the acceptance HEAD and also inspects "relevant staged, unstaged and untracked changes". The "Before plan generation" bullet does the same against current HEAD ("Inspect relevant dirty changes as well").

The two endpoints are therefore not the same kind of observation:

- the start is a commit only;
- the end is a commit plus the working tree.

The reviewers in this session evaluated the actual working tree, not only the committed snapshot. The same-worktree topology in §4.3 makes this the normal case.

Failure modes:

- **False divergence.** At session creation, an application source file `S` already has uncommitted edits, and reviewers evaluate the spec against that code. `S` is still dirty and unchanged at acceptance. The comparison finds a non-collateral difference and appends a code-context divergence record. That record implies the code changed during review when it did not.
- **Same false divergence after a commit.** The same edits to `S` are committed between turns. The HEAD diff shows `S` changed, but the evaluated code context did not change.
- **Masked change.** `S` is dirty at session start and the edits are discarded before acceptance. The code the reviewers saw is gone, yet HEAD-to-HEAD plus the clean worktree reports no drift for `S`.

In each case the record is a false or missing claim about review context. That is what §3.2 ("do not strengthen them by changing labels") and the drift bullet's own distinction between observed and stronger claims try to prevent. The same problem carries into the pre-planning suitability check, which uses these roots.

Gitignored paths are a related gap. The drift bullet says exclusions must not conceal "dependency changes", but installed dependencies and local configuration are often ignored and invisible to the staged/unstaged/untracked inspection. The spec should say that ignored paths are outside the comparison scope, so a clean result is not read as covering them.

### R1-F002 — The review-collateral path allowlist has no defined source after the initial manifest is sealed

Severity: moderate.

The drift bullet says "The versioned manifest defines the exact FUR and declared review-collateral paths allowed for this comparison". The initial manifest is sealed and immutable before the first reviewer turn opens. Most of the collateral that publication commits during a session does not exist at that point:

- reviewer responses N and author responses N;
- per-cycle diffs;
- later linked manifest records;
- boundary records.

§4.4 also allows the FUR path itself to change ("Preserve file addition, deletion or path changes explicitly where supported").

The spec does not say which of these mechanisms defines the allowlist:

- (a) path templates fixed in the initial manifest;
- (b) the exact paths declared by each later sealed linked record;
- (c) something else.

It also does not say how a FUR rename is handled. Option (a) risks becoming the "directory-wide exclusion" the same sentence forbids. Option (b) needs the acceptance-time comparison to resolve the full linked chain, and that chain must itself be complete. If it is not, the result should be `unavailable` rather than review-only.

A related case occurs in this repository's actual workflow. Commits `7e5ab23` and `e4d4bea` published collateral from earlier #222 review sessions. If an external publisher commits a different session's collateral (for example, closing out an earlier review) while this session is open, those paths are neither this session's FUR nor its declared collateral. As written, they produce a code-context divergence record even though no application source, configuration, tests or dependencies changed. That is noisy at best. It can also wrongly push the pre-planning check toward re-review.

### R1-F003 — AC 15 makes AIPR verification test a judgement and a downstream workflow it does not own

Severity: moderate.

AC 15 has two problems.

**The materiality judgement cannot be an automated test.** The AC says "Test review-only/irrelevant drift, wide/material drift requiring current-HEAD specification re-review and fresh acceptance before planning". The "Before plan generation" bullet correctly makes suitability a reasoned assessment: "Do not reduce suitability to a raw changed-line count", plus effects on "requirements, interfaces, dependencies and assumptions". Whether drift is "material" or "demonstrably irrelevant" is that assessment. It cannot be a behaviour test of AIPR without inventing the mechanical rule the bullet forbids.

What AIPR can test mechanically is narrower:

- the drift report: compared SHAs, changed paths, review-only / other / `unavailable` classification, and ancestry/rewrite notes;
- the refusal or routing when the context is unavailable;
- that a recorded suitability decision, with its basis and decider, is bound to the exact accepted FUR digest and the compared SHAs.

**The deep-dive half belongs to another workflow.** The AC says "After accepted-plan backlog hydration, each story's just-in-time deep dive records and evaluates relevant drift". The bullet itself says this "assigns responsibility to the downstream workflow; AIPR supplies review records and does not execute story implementation or hydrate the backlog itself". §6 says cross-repository changes "require the corresponding owning workflow, not an AIPR-only declaration". As an AIPR cleanup acceptance criterion, this half cannot be met by any AIPR deliverable. It also has no owning issue or §6 reconciliation row in the downstream workflow (presumably the AITM task deep-dive skill/process).

The "Before plan generation" check has the same ownership gap. §9 says the governing operator applies it, but neither §8 nor §6 says whether AIPR ships a drift-report command, whether the check is a documented procedure, or which issue owns it. AC 12 also says "Each SAR/SPR/XPR session seals its initial manifest". That half is clearly AIPR's and is testable. The ownership gap is specific to AC 15.

## Required changes

1. **R1-F001:** Extend the initial-manifest root capture with a working-state observation taken inside the same HEAD/FUR stability window.
   - Record the set of non-FUR, non-collateral staged, unstaged and untracked paths with content digests (or an explicit clean marker), or an explicit `unavailable` record with a reason.
   - Define the acceptance-time and pre-planning drift comparisons as root working state versus observed working state, not root commit versus observed working state.
   - Report paths that were dirty at session start separately from paths that changed during the session.
   - State that gitignored paths are outside the comparison scope and that a clean result makes no claim about them.
   - Extend AC 12 to cover dirty source at session start that is unchanged, committed during the session, or discarded before acceptance.
2. **R1-F002:** Specify how the collateral allowlist is defined over the session's life.
   - Recommended: each sealed linked record declares the exact contained paths it creates. The acceptance comparison derives the allowlist from the initial manifest plus the complete linked chain. An incomplete chain yields `unavailable`.
   - State how a FUR path change in the lineage is included.
   - State how collateral belonging to other AIPR review sessions is classified. Either add a distinct, verifiable "other review documentation" classification (verified against that session's sealed records) or explicitly accept that it produces a divergence record.
   - Add the chosen behaviour to AC 12 alongside the existing path/rename exclusion coverage.
3. **R1-F003:** Split AC 15 and assign ownership.
   - **(a) AIPR-verifiable:** the mechanical drift report and its classifications, `unavailable` for unreachable or unresolved context, routing of that case to current-HEAD re-review, and binding of a recorded suitability decision to the exact accepted FUR and compared SHAs.
   - **(b) Recorded human/agent decision:** the materiality judgement. Verify its presence and binding, not its outcome.
   - **(c) Downstream workflow requirement:** the post-hydration deep-dive drift duty. Give it an explicit §6 reconciliation row and an owning issue in the responsible workflow, and verify it there rather than as an AIPR acceptance test.
   - In §8 or §9, state whether the pre-planning drift check is delivered as an AIPR command, a documented procedure or both, and which work boundary in §7 owns it.

## Optional suggestions

### R1-F004 — State which baseline governs pre-planning suitability

"Before plan generation" evaluates drift from "the specification's earliest available writing-basis commit and each applicable session's stable review root". For a long-lived specification like this one (12 revisions, first basis `db0febda…`, current basis `7e5ab23…`), drift from the earliest writing basis includes code changes that later revisions were written against and later accepting sessions reviewed. Read literally as a suitability baseline, it will tend to report wide drift that has already been reviewed.

Consider stating that suitability is judged against the code context the accepted revision was actually reviewed in: the applicable accepting sessions' roots, plus their working-state observations per R1-F001. Comparison from the earliest writing basis would then be informational lineage context. This keeps the owner's rule that acceptance HEADs are not substitute roots, while avoiding re-review loops driven by already-reviewed history.

### R1-F005 — Record detached-HEAD state at root capture

The acceptance-manifest bullet requires distinguishing a detached HEAD explicitly. The initial-manifest root bullet records "repository/branch identity" but does not repeat that rule. Applying the same detached-HEAD distinction to `review_root_commit` would keep the two observations symmetric for the drift comparison.

## Decision

revisions-requested
