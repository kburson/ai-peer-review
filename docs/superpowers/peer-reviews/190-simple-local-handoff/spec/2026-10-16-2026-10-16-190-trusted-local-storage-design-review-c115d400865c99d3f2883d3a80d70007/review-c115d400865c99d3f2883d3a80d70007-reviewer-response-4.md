<!-- ai-peer-review-template version="1" digest="sha256:78e9a634af9d540baaf6790db82952eaf39cf7ab59a6cdc7938319ae07a4cbed" -->

<!-- protected-frontmatter -->

---
schema: "ai-peer-review.response/v1"
review_id: "review-c115d400865c99d3f2883d3a80d70007"
role: "reviewer"
turn: 4
commit_mode: "normal"
authority_assurance: "unavailable"
artifact_path: "docs/superpowers/plans/2026-10-16-190-trusted-local-storage.md"
artifact_commit: "2abbb37bb31c0c2e647af00d222a4b94a1ceb753"
artifact_blob: "16a16ac203f5710fe06d74df1425f9c030a86047"
artifact_digest: "sha256:14f24a8b64153f1a3d5877affb042b734829cb891fd62626888b84f7e1880291"
agent:
  host: "claude-code"
  provider: "anthropic"
  model_id: "claude-opus-5-5"
  model_display: "claude-opus-5-5"
  session_fingerprint: "sha256:aa81aacd4ed7e02a555cd16840ba7caa1794f3ee25ee6bae1cd34a3c02ce8382"
  identity_source: "runtime"
started_at: "2026-10-16T08:51:36.263Z"
submitted_at: "2026-10-16T09:09:17.142Z"
finding_ids: []
answered_finding_ids: []
acknowledged_supplement_ids: []
---

Mode: `normal`

## Summary

I re-reviewed the plan (blob `16a16ac2…`) against my turn-3 response and author response 3. All three turn-3 required changes are addressed in the artifact:

1. **Existing no-commit path (turn-3 F1).** Option (a) was chosen. The existing sealed-no-commit events, reducer states, baseline and snapshot helpers become the local default. The concrete production gap (durable, atomically published, digest-verified snapshots) is named. `--test-human-authority` records are kept as fixture-only evidence. `--no-commit` remains a compatible spelling, the invented legacy-flag assertion is gone, and legacy `normal` records are refused for mutation rather than silently converted (Task 2 Interfaces, Step 2, Step 3).
2. **Every Git-writing lifecycle command (turn-3 F2).** Task 2's Files list now includes review-record/Git transaction/events/reducer/parser/help. Step 2 lists every lifecycle operation. Step 3 and Task 3 Step 2 assert unchanged HEAD, index and common-dir refs over a complete multi-phase lifecycle in ordinary and linked worktrees. The no-optional-locks inspection detail is a good catch.
3. **Pre-seal identity check (turn-3 F3).** It is now defined as a regular non-symlink/non-reparse file at the bound pathname, with the expected physical parent and no leaf-inode equality requirement. Atomic-save positives are added.

I also accept the optional items: the deterministic manual-invitation test, explicit Codex manual routing, and the declined worktree-change reporting with its stated rationale.

Adopting the existing no-commit path as the production default brings in one existing behavior the plan does not address. That behavior directly contradicts the author's own rationale for declining whole-worktree reporting, and it would make ordinary local use fail. There is also one leftover sentence in the plan's constraint list that now contradicts Task 2.

## Findings

1. **The reused no-commit baseline freezes the whole repository for the entire review. As the production default, that refuses ordinary concurrent human work, which contradicts the author's declined-change rationale and spec line 37.**
   - **What the baseline records.** At start, `repository.baseline(root)` (`src/git/repository.mjs:345-360`) records HEAD, a digest of the full `ls-files --stage` index, and a `status --porcelain=v1 --untracked-files=all` inventory of every changed or untracked path.
   - **What it requires afterwards.** `preservesNoCommitBaseline` (`src/cli/run-core.mjs:355-377`) requires, at author handoff (`:3646-3662`) and recovery (`:3512-3534`):
     - HEAD equality;
     - index-digest equality;
     - every startup-dirty path except the artifact byte-identical to its startup entry;
     - every newly changed path to be either the artifact or an owned untracked review path.
   - **What happens otherwise.** It fails with `APR_REVIEWER_GIT_VIOLATION`: "Restore the startup HEAD, index, and exact artifact snapshot before retrying."
   - **Why this matters now.** Under `--no-commit` as an opt-in, this strictness was a chosen trade-off. As the production local default, any of the following during a review (which can span spec→plan phases and hours, as this one has) blocks the next handoff:
     - the human or another tool saves an unrelated file;
     - a file is created under a non-ignored path;
     - a file is staged with `git add`;
     - the human commits unrelated work or the accepted spec;
     - a branch is switched.
   - **Contradiction with the author's rationale.** In author response 3, the author declined optional whole-worktree change reporting because "concurrent human edits can create false attribution" and "the user asked to automate filepath handoff without another filesystem monitor". The reused baseline is exactly a whole-worktree change check, and it refuses rather than reports. It also attributes the change to the reviewer (`APR_REVIEWER_GIT_VIOLATION`).
   - **Contradiction with the spec.** Spec line 37 says "do not repeatedly inventory/hash the whole installation or project merely to pass the next filepath", and an `--untracked-files=all` status inventory plus full index digest on every handoff is such an inventory. The plan neither keeps this behavior deliberately (with the constraint documented and tested) nor narrows it, so the implementer will inherit it by accident.

2. **The constraint at plan line 19 still contradicts Task 2.** Line 19 says "Do not relabel the legacy no-commit test mode as production evidence". Task 2 Step 2 now says "Make the existing `commit_mode: no-commit` sealed-event path the production local default. The current no-commit path is not intrinsically a fixture." An implementer reading the constraints first will see a prohibition on exactly what Task 2 instructs. The accepted spec (line 42) has the same phrase. Because the spec bytes are immutable, the plan has to carry the interpretation that resolves it: the fixture evidence is `--test-human-authority` records, not the sealed-no-commit event family.

## Required changes

1. In Task 2 Step 2, decide explicitly what the reused no-commit baseline enforces on the production local path, and test that decision. Recommended, consistent with spec line 37 and author response 3: on the local path, narrow the handoff/recovery check to
   - the role-bound paths (artifact content/version digest, exact response seal, durable snapshot digest);
   - the no-Git-write invariant for the automation's own operations;

   and stop refusing because of unrelated HEAD/index/worktree changes made by the human. If you instead keep the full freeze, document it as a user-facing constraint ("do not commit, stage, switch branches or edit other non-ignored files in this worktree until the review completes, across all phases"), give the error a neutral (not reviewer-attributed) code/message, and add tests showing the refusal and its recovery. Either way, add a Step 3 case in which a human edits an unrelated tracked file and creates an unrelated untracked file between turns, with the expected outcome stated.
2. Reword plan line 19's last sentence to agree with Task 2. For example: "Production local handoffs use the existing sealed-no-commit event family; `--test-human-authority` fixture records are never production or actual-provider evidence (this is how spec line 42's 'no-commit test mode' wording is applied)."

## Optional suggestions

1. Legacy `normal` records are "refused for mutation by this new local path" and use "their original compatible recovery path separately". Consider saying whether the new package version keeps a way to finish an in-flight `normal` review (such as this one), or whether such reviews must be finished with the previously installed version. One sentence prevents an upgrade from stranding open reviews.
2. If you narrow the baseline (required change 1), the existing `noCommitOwnedChangedPaths` reservation set (`src/cli/run-core.mjs:345-353`) may still be useful as the exact owned-path allowlist for automation publications. That would be a reuse, not new machinery.

## Decision

revisions-requested
