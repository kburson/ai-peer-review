<!-- ai-peer-review-template version="1" digest="sha256:78e9a634af9d540baaf6790db82952eaf39cf7ab59a6cdc7938319ae07a4cbed" -->

<!-- protected-frontmatter -->

---
schema: "ai-peer-review.response/v1"
review_id: "review-7e2f728a783cebdbe3659714f0dc0480"
role: "reviewer"
turn: 2
commit_mode: "normal"
authority_assurance: "unavailable"
artifact_path: "docs/superpowers/specs/2026-09-26-102-aipr-install-policy-design.md"
artifact_commit: "5acf6d729e2f83572e74b87b81104c5345df6897"
artifact_blob: "3382dc77e590656fa2f340a5cc25104ac6d207df"
artifact_digest: "sha256:6a4a2383daa5d2ede6e634c4ac3e565bffffa04a3901869a4960517eae09ed5d"
agent:
  host: "claude-code"
  provider: "anthropic"
  model_id: "claude-opus-5"
  model_display: "Claude Opus 5"
  session_fingerprint: "sha256:f3f8c98cef4e244abdcd93c24f4e30bad12e74b105c365d67b8d61d8ee3bca34"
  identity_source: "declared"
started_at: "2026-09-27T03:02:59.465Z"
submitted_at: "2026-09-27T03:21:06.117Z"
finding_ids: []
answered_finding_ids: []
acknowledged_supplement_ids: []
---

Mode: `normal`

## Summary

I re-read the revised specification at commit `5acf6d729e2f83572e74b87b81104c5345df6897` in full and checked each disposition in author response 1 against the artifact text, not against the author's description of it. I also re-verified the code claims that the revisions now depend on: `readConfig` (`src/config/load.mjs:274`) is module-private and reachable only through `loadConfig`; `validateConfig`, `configPaths`, `loadConfig`, and `buildClaudeProviderCapability` are the only exports of that module; `src/doctor.mjs:98` computes aggregate health over required rows; `src/git/repository.mjs` already owns validated Git path resolution.

All five required changes are resolved, and all four optional suggestions were taken. The two dispositions that departed from my suggested implementation — F1's enforcement point and F4's choice of remedy — are both sound, and in F1's case better than what I proposed.

On F1, the author declined the `validateConfig` signature change and put source enforcement in the private loading orchestration instead. I checked whether that leaves a hole and it does not: `readConfig` is private, `loadConfig` is the only path to it, and §Authority And Root Resolution now additionally requires that every production loader and mutation gate apply the restriction, that pure structural validation grants no mutation permission, and that no public caller-settable scope flag can promote a user file to project authority. Rejecting any *own* `tool` key from the user source — explicitly including null, empty, and partial objects — closes the deep-merge completion case I raised, and keeping the exported validator source-neutral avoids public API churn my proposal would have caused. The declined change is the better call and I withdraw the signature-change requirement.

On F4, the author retained the mismatch gate on `setup --remove` and documented the owner-controlled escape in the removal path itself (§Ordinary Setup), which was the second of the two options I offered. The recovery text now orders it correctly: verified matching runner first, then deliberate removal of only `tool` from the tracked root config after settling and preserving owned activity, then removal of owned integrations through the warned unconfigured lane. It states plainly that this forfeits version protection and is never an automatic edit or force flag, and that pin removal waives neither historical-format readability nor setup ownership and foreign-file checks. The operations table was also corrected so that the unconfigured legacy lane counts as admission, which is what makes the documented escape actually reachable — that correction was necessary for the remedy to work and I am glad it was made rather than left implicit.

F2, F3, and F5 are resolved as described, and I confirmed each in the artifact: the default non-required `unconfigured` warning row with an opt-in `doctor --require-tool-policy` flag, consistent across §Diagnostics And Recovery, §Worktrees CI And Rollout, AC7, and Resolved Decisions; whole-config resolution at the validated physical worktree root with nested configs ignored, out-of-Git behavior specified, and the exported-API behavior change recorded in migration notes; and the administrative-directory resolver placed in `src/git/repository.mjs` with fixed lock and receipt paths, corrected common-directory wording, and fail-closed handling for unreadable, unsafe, or unwritable locations.

The corrected Git wording is accurate as written: an ordinary clone's administrative and common directories do coincide, a linked worktree's is `<common>/worktrees/<name>`, and the isolation property therefore comes from selecting the per-worktree directory rather than from being outside the common directory. Flagging the paths as examples rather than templates to construct, with custom layouts deferring to the resolver, is the right level of precision for a design document.

Two minor points remain. Both are non-blocking, neither affects the design's soundness, and both can be settled during implementation planning. I am recording them as suggestions rather than holding the document.

## Findings

None. All five findings from turn 1 are resolved in the artifact text.

## Required changes

None.

## Optional suggestions

1. **`APR_TOOL_POLICY_BUSY` now covers a condition its definition does not describe.** The stable-outcomes list defines it as "adoption cannot prove idle state or acquire exclusion," but §Activity Preconditions now also returns it when the administrative directory or receipt location is unreadable, unsafe, or unwritable. That is a filesystem-access fault, not contention, and an operator reading "busy" will reasonably retry rather than fix permissions. Either widen the definition to cover "cannot establish or acquire the coordination exclusion, including an unusable lock location," or split out a distinct code. The bounded filesystem reason the section already requires will carry the detail either way, so this is a naming and operator-guidance concern rather than a behavioral one.
2. **Specify what exported `configPaths` returns outside a Git repository.** §Worktrees, CI, And Rollout commits to documenting the exported config-path/load behavior change while noting the option shape can stay compatible. Today `configPaths` (`src/config/load.mjs:303`) returns a frozen object with `user` and `project` both as strings. Once `project` resolves from the validated physical worktree root, there is no project path to return outside Git, yet §Authority And Root Resolution says user-scoped setup must still work there. The design should state whether `project` becomes null, whether the call throws, or whether resolution is deferred — the three choices are meaningfully different for the exported consumers the migration note is addressed to, and picking one here avoids an arbitrary implementation-time decision on a public surface.

## Decision

accepted
