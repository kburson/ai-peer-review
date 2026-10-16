<!-- ai-peer-review-template version="1" digest="sha256:78e9a634af9d540baaf6790db82952eaf39cf7ab59a6cdc7938319ae07a4cbed" -->

<!-- protected-frontmatter -->

---
schema: "ai-peer-review.response/v1"
review_id: "review-c115d400865c99d3f2883d3a80d70007"
role: "reviewer"
turn: 2
commit_mode: "normal"
authority_assurance: "unavailable"
artifact_path: "docs/superpowers/specs/2026-10-16-190-trusted-local-storage-design.md"
artifact_commit: "8cfaed68c8983ce4b468c5a40a5f304d0d335eb1"
artifact_blob: "27626a5680b297a5438944accbda908d4ab6db60"
artifact_digest: "sha256:a2e6ed5f38a3efcd11b9112fedcfa812f71a698780b921ad80cf92eed5d0c735"
agent:
  host: "claude-code"
  provider: "anthropic"
  model_id: "claude-opus-5-5"
  model_display: "claude-opus-5-5"
  session_fingerprint: "sha256:aa81aacd4ed7e02a555cd16840ba7caa1794f3ee25ee6bae1cd34a3c02ce8382"
  identity_source: "runtime"
started_at: "2026-10-16T08:51:36.263Z"
submitted_at: "2026-10-16T08:58:32.681Z"
finding_ids: []
answered_finding_ids: []
acknowledged_supplement_ids: []
---

Mode: `normal`

## Summary

I re-reviewed the revised spec (blob `27626a56…`, commit `8cfaed68…`) against my turn-1 findings and the author's response 1. All five required changes are addressed in the artifact itself, not only in the response:

1. **Git writes (turn-1 F1).** Line 42 now says the local handoff makes no Git writes or automatic commits. It allows read-only Git inspection, defines the canonical project as the physical worktree root (excluding an outside Git common directory), removes legacy normal-mode audit commits from the amended handoff, and forbids relabeling the no-commit test mode as production evidence. This removes the conflict between the `.git` prohibition, sandboxed submission and linked-worktree containment. It is a real behavior change from today's `normal` submit (`src/git/transaction.mjs:299-302`). The spec states it openly and does not hide it, and it fits the user's "just pass filepaths" direction.
2. **Manual sessions (turn-1 F2).** Line 39 explicitly allows human-launched sessions, labels their scope as instruction-bound rather than provider-enforced, and requires actual provider support wherever enforcement is reported. Line 68 matches: observed compliance is not proof of enforced denial, and denial is tested only where enforcement is advertised.
3. **Author fallback (turn-1 F3).** Line 38 now requires an automatically launched author to have existing exact artifact/current-response edit support. Otherwise the turn goes to a human-launched author, with no artifact-publishing wrapper and no broader shell. That is a clear, bounded outcome.
4. **Write-time checks (turn-1 F4).** Line 40 splits at-publication containment (automation writes) from initial binding plus pre-seal/pre-advance identity and containment rechecks (provider/manual writes). A mismatch refuses submission. The spec no longer promises to intercept an independent editor or roll back a completed write.
5. **Allowlist scope (turn-1 F5).** Line 19 now forbids any path outside the role allowlist, explicitly including untracked, ignored and new files, the coordination workspace, and `.git`.

The optional budget sentence (line 66) is now unambiguous. The author declined the filename note to keep linked paths stable, which is reasonable.

The author's response says the companion plan is intentionally unchanged during this spec phase and will be aligned in the plan phase. I accept that sequencing. The plan currently contradicts the revised spec in several places, though, and the next phase must fix them; they are listed under Optional suggestion 1 so they carry forward. None of them is a defect in the spec.

The spec is accepted as the governing design for the local handoff.

## Findings

None blocking. The minor wording and carry-forward items are listed under Optional suggestions.

## Required changes

None

## Optional suggestions

1. **Plan-phase alignment checklist** (for the companion plan `docs/superpowers/plans/2026-10-16-190-trusted-local-storage.md`, not this spec):
   - Line 17 still says "other tracked files". Change it to the spec's "any path outside the role allowlist" (untracked/ignored/new/coordination workspace).
   - Line 21 ("unsupported scope refuses the automation capability") and Review focus 3 should include the spec's manual-session route: an unsupported automatic author is routed to a human-launched, instruction-bound session.
   - Review focus 2 ("reject before writing through it") and the Task 1 Step 1 symlink test should follow spec line 40: at-publication rejection only for automation writes, and for provider/manual writes a pre-seal identity/containment recheck that refuses submission.
   - Task 1 Step 1's "each attempt must be denied by actual provider/tool controls" should apply only where provider enforcement is advertised (spec line 68). Add the new-untracked-file and coordination-journal negatives.
   - Task 2 must take on the journal-only (no Git write) production submit semantics from spec line 42, which replace the current `normal`-mode `commitExactPaths` path in `src/cli/run-core.mjs` (around `:3552` and `:4140`). It must also say whether `normal` mode is refused or rerouted on the local path.
2. **Leftover wording in the spec.** Line 19's last-but-one sentence ("The reviewed artifact is the author's explicit exception to the other-tracked-file prohibition") refers to the old tracked-only rule. Under the new allowlist wording the artifact is simply in the author's allowlist, so the sentence can be dropped or reworded. Likewise, line 44's "make arbitrary Git changes" could read "make any Git changes" to match line 42's no-Git-write rule.
3. **Reviewer diffs without commits.** Without commits, a reviewer on turn N+1 no longer has an `artifact_commit` to diff against. Consider letting the existing journal keep (or point to) the previously reviewed artifact bytes or snapshot digest, so the reviewer can see exactly what the author changed. The existing no-commit baseline/snapshot fields may already cover this, which would need no new subsystem.

## Decision

accepted
