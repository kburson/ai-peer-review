# Issue #102 planning and session recovery report

This report records the decisions made under the user's instruction to continue autonomously while AFK. The accepted replacement specification and implementation plan are durable. Implementation acceptance criteria remain unchecked.

## Workspace and chat recovery

The requested `102-primary-runtime-xpr-0697` checkout was unavailable after competing-chat cleanup. Its work was recovered from archived Git snapshots, including `14a2df3e339ab5b61773abe2ccf1da33f721b046`. A native replacement checkout at `102-primary-runtime-xpr-8567` was attached, but the host guard continued to reject that path. It was archived after recovery. The usable linked worktree is:

`/Users/kpburson/projects/Vibe-Coding/ai-peer-review/.scratch/102-primary-runtime-xpr`

Branch: `codex/102-primary-runtime-xpr`. Current chat: `01a0f5ea-7f5f-7db3-8746-00b4c66979d9`, titled `Deliver 102`. The two competing #102 chats, `resume 102` and `Assess task 102 status`, were archived; the old #102 occupancy claim was released. Live chat listing showed this chat as the remaining active one of those three. The final repository lease audit also found stale claims on #111, #124 and #130. Their unloaded chats, `Deliver issue 111 to Done`, `Defect 124` and `Investigate #1847 broker defect`, were archived and their claims released under the user's one-chat instruction. Their worktrees/files and issue states were preserved. Child refinement temporarily rebinds this same chat, then returns it to parent #102.

## Hook decision

The user explicitly requested disabling blocking hooks. AITM command hooks were removed from `.codex/hooks.json` and `.claude/settings.json` in both the original root and recovered worktree. Validation found zero AITM commands in all four files; each Claude settings file retains one AIPR integrity hook. These local hook-disable edits are intentionally uncommitted, rather than included in the shared runtime design/implementation commits.

Exact pre-change backups are under:

`/Users/kpburson/projects/Vibe-Coding/ai-peer-review/.scratch/102-hook-recovery/`

Files: `host-.codex-hooks.json.before.json`, `host-.claude-settings.json.before.json`, `worktree-.codex-hooks.json.before.json`, `worktree-.claude-settings.json.before.json`. Restore from these backups only when restoring the hooks is desired.

## Accepted design evidence

XPR `review-a3927de204393c987234f146101239f9` used GPT-6 Astra author identity and Anthropic Claude Opus 5.5 reviewer at medium effort, resuming the same reviewer session for all three rounds. Package status confirms terminal `accepted` with no next action. Authority assurance is `unavailable`; this report does not upgrade that claim.

- Accepted artifact: `docs/superpowers/specs/2026-09-29-102-primary-runtime-authority-design.md`.
- Accepted artifact commit: `021bed7e9cc01782f0822e99fa2d3a58aadeb16e`.
- Finalization commit: `6abc0111f4c380f68e3b590ba5b7512d48aa6f3a`.
- Full reviewer/author findings and dispositions: `docs/superpowers/peer-reviews/spec/2026-10-01-2026-09-29-102-primary-runtime-authority-design-review-a3927de204393c987234f146101239f9/`.

Round 1 led to committed primary-policy activation, account-wide runtime selection, integration contracts, bounded inventory and unknown-journal diagnostics. Round 2 hardened OS-account/Git discovery against environment redirects and completed host field ownership. Round 3 accepted with no required changes. Its optional wording and split-schema notes are carried into the implementation plan; the accepted artifact stays frozen.

## Recorded recommendations

| Decision                                                                       | Reason                                                                                                  |
| ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------- |
| One current globally selected runner, no version pins or older-image execution | Matches the requested architecture and preserves evidence without obsolete fallback.                    |
| Activated primary policy plus user-exclusive machine bindings                  | Shared policy remains portable without committing machine commands or treating hints as identity proof. |
| Native strict sequential work in this chat                                     | User requested one chat and will not answer questions while AFK.                                        |
| Six child deliverables under #102                                              | AITM classified the XL/62-hour plan as must-split; do not shrink estimates to evade decomposition.      |
| Preserve #107 and #130 as separate open deliverables                           | Their broker/deployment and detailed-config work is not falsely claimed complete.                       |
| Keep current native runtime assets until #107 replaces them                    | A runtime-only tarball must still contain assets the current broker needs.                              |
| Preserve #111 migration and #128 formatting behavior                           | Their delivered fixes constrain this implementation; they do not implement the new architecture.        |

## Implementation plan and children

Plan: `docs/superpowers/plans/2026-10-01-102-primary-runtime-authority.md` at `8ee1cbe1e4c09469648727df453803880a4b9c57`. Each child records the exact pinned task section, its own stakeholder story and prospective verification commands.

| Order | Issue | Deliverable                                            | Base human hours |
| ----- | ----- | ------------------------------------------------------ | ---------------- |
| 1     | #132  | Activated primary authority and classified preferences | 12               |
| 2     | #133  | OS-account current global selection                    | 10               |
| 3     | #134  | Primary setup, validation and integration activation   | 12               |
| 4     | #135  | Collateral compatibility and obsolete-image fence      | 8                |
| 5     | #136  | All-entrypoint and asynchronous enforcement            | 8                |
| 6     | #137  | Actual installed tarball and consumer independence     | 6                |

The base human WBS is 56 hours. Governed estimation converged to XL/62 hours with a separate AI forecast. The former L/16 estimate is superseded. This is an estimate, not time already spent.

Issue #102's old exact-pin criteria, verifiers and plan metadata were replaced through fresh-base governed operations while preserving protected markers. The substantive [deep dive](https://github.com/kburson/ai-peer-review/issues/102#issuecomment-5925839209) was posted, mirrored and marked complete. Story semantics were reviewed against current source, the accepted spec and all six distinct task intents.

## Workflow defects and recovery

The installed AITM `split-plan` command incorrectly tries to launch `bin/aitm.mjs` from the consuming repository. Its generated six fragments were used through the sanctioned installed `aitm create-issue` wrapper. Every child passed creator preflight before the first creation; all six were tethered and linked to #102. No direct `gh issue create` or arbitrary state mutation was used.

AITM structural metadata parsing removes inline-code spans. The root plan/spec paths were corrected to plain path values. The generated child Governing-spec fields inherited an unrelated AITM default while the path was invisible; those fields are explicitly corrected to the accepted #102 specification before implementation. Pinned Source-plan commits and task sections remain unchanged.

The inherited root User Story placement failed the current validator. A repair attempt left a duplicate identical section; it was removed through `mutateIssueBody` with the required explicit removed-heading declaration. The retained governed story is first. This correction changed placement only.

Automatic approval review initially rejected the deep-dive publication because repository trust and payload authorization were not established. Read-only verification confirmed the repository is public and the account has admin access. A public-source-only payload with no credentials/private files was then approved and published. No remaining permission refusal is hidden by this report.

The first plan-approve invocation unexpectedly labeled agent approval as human despite session Full-Auto settings. The registered cancel-plan refused before effects because the historical refinement snapshot was stale. Only the incorrect approval marker was invalidated through the guarded mutation API with explicit marker-loss declaration; no replacement authority was hand-written. Rerunning the supported command with TT_FULL_AUTO=1 revalidated the plan and recorded full-auto provenance at 2026-10-01T06:38:16Z with its audit posted. No human review is claimed.

AITM warns that the optional `Blocked By` project field ID is missing. Native GitHub dependency authority is used; this report does not claim the optional board mirror was configured.

## Verification limits

The plan passed Prettier formatting and Markdownlint against the explicit file. CLI lint from a nested `.scratch` checkout can ignore every file, so zero-file output was not counted as verification. The accepted spec revisions also received explicit-file formatting/lint checks. The four hook files parse as JSON and contain zero AITM commands. Peer-review status confirms accepted.

No implementation test command has passed for the new architecture. No source implementation or delivery/merge is claimed by this planning report. All implementation ACs stay unchecked, and children require their own JIT Plan/Develop verification and review.

## Final governed status

Issue #102 advanced exactly one edge from Plan to Develop through the registered promote verb. The command verified the live Develop board state, entry stamp, entry timing row and final move-complete sentinel. Fresh pre-transition Explain returned ready with zero blockers. Approval provenance is full-auto, with forecast 01M3V1E7RMP1RA9TA3267NH4CD and trunk dbb75729c11840a9342b5661dbdfaa4f6f65add5.

All six children are staged at Ready for Planning with current refinement evidence and ranks 2–7. Native predecessor dependencies form #132 → #133 → #134 → #135 → #136 → #137. Parent orchestration is strict sequential. Next implementation work is the first child, #132; later children remain staged until their predecessor is delivered. No implementation is claimed by the successful parent transition.

Final read-back verified all six accepted-spec links and refinement snapshots, ranks and native dependency chain. The live board reports #102 Develop. The repository occupancy store contains only #102 owned by this chat. Source/runtime/test paths have no implementation diff from trunk. The timer is paused after report recording to avoid charging idle AFK time; the retained binding remains #102.
