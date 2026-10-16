<!-- ai-peer-review-template version="1" digest="sha256:78e9a634af9d540baaf6790db82952eaf39cf7ab59a6cdc7938319ae07a4cbed" -->

<!-- protected-frontmatter -->

---
schema: "ai-peer-review.response/v1"
review_id: "review-c115d400865c99d3f2883d3a80d70007"
role: "reviewer"
turn: 3
commit_mode: "normal"
authority_assurance: "unavailable"
artifact_path: "docs/superpowers/plans/2026-10-16-190-trusted-local-storage.md"
artifact_commit: "86e70451598626391945eb634d7c5a81c28f7398"
artifact_blob: "8e84d0021e39e3b8a7ed5cd52bba81c8f9025ea7"
artifact_digest: "sha256:a3aecf10b948e4977918fd6dac39d47f2b6b9683c5315e8bc39ffde38adb5195"
agent:
  host: "claude-code"
  provider: "anthropic"
  model_id: "claude-opus-5-5"
  model_display: "claude-opus-5-5"
  session_fingerprint: "sha256:aa81aacd4ed7e02a555cd16840ba7caa1794f3ee25ee6bae1cd34a3c02ce8382"
  identity_source: "runtime"
started_at: "2026-10-16T08:51:36.263Z"
submitted_at: "2026-10-16T09:04:45.768Z"
finding_ids: []
answered_finding_ids: []
acknowledged_supplement_ids: []
---

Mode: `normal`

## Summary

Plan phase: I reviewed `docs/superpowers/plans/2026-10-16-190-trusted-local-storage.md` (blob `8e84d002…`) against the accepted spec (blob `27626a56…`) and the current runtime.

The plan already includes every carry-forward item from my turn-2 optional suggestion 1:

- the allowlist wording covers untracked, ignored, new and coordination paths (line 17);
- the manual-session route and enforcement labeling are in place (lines 21, 30, 55, 57);
- automation publication checks are split from pre-seal checks (line 29, Task 1 Step 1/2);
- negatives are conditioned on advertised enforcement, with the new-untracked-file and coordination-journal cases (Task 1 Step 1);
- journal-only production submission, refusal of an explicit legacy Git mode, and reuse of existing snapshots/baselines for reviewer diffs are in place (Task 2 Step 2/3).

The task structure, red-before-green ordering, budget preservation, no-native constraint and truthful-incompleteness rules match the spec.

Three implementation-level gaps remain. Each would likely send the implementer down a contradictory or user-hostile path:

1. The plan tells the implementer to build a "real durable journal-only" submission distinct from the existing `--no-commit` mode. The existing protocol only knows two event families, and the plan also forbids new journal schemas.
2. The no-Git-write requirement and its assertions cover only the handoff/submit step. Phase advance, finalization and record consolidation also write Git today.
3. "Changed physical identity" at pre-seal is undefined. Read as inode equality, it would refuse ordinary author edits made by atomic-save editors.

## Findings

1. **The journal-only production path contradicts both the existing `--no-commit` mode and the plan's "existing journal schemas" interface (Task 2 Step 2, line 63, line 67).**
   - **What exists today.** `--no-commit` is a complete, user-facing start mode. It is in the `peer-review start` usage (`src/cli/parse.mjs:105`), and its help text says "Uses explicit non-durable snapshot evidence and never implies a Git commit" (`src/cli/help-data.mjs:1157-1164`). It has a full sealed-event family: `author-revision-sealed-no-commit`, `author-closing-round-sealed-no-commit`, `acceptance-sealed-no-commit`, `phase-acceptance-sealed-no-commit`, `phase-artifact-sealed-no-commit` and `override-sealed-no-commit` (`src/protocol/events.mjs:38-130`). It also has `accepted-uncommitted` terminal states (`src/protocol/reducer.mjs:49-68`), a startup HEAD/index/changed-path baseline (`src/cli/run-core.mjs:1332`, `:355-369`), snapshot sealing (`:3684-3729`) and recovery checks (`:3512-3534`).
   - **What the reducer accepts.** It allows committed events only when `commit_mode === 'normal'` and sealed-no-commit events only when `commit_mode === 'no-commit'` (`src/protocol/reducer.mjs:382-383`). `review-created` enumerates exactly those two modes (`src/protocol/events.mjs:751`).
   - **The contradiction.** Task 2 says to implement "real durable journal-only submission" without "routing through the old no-commit fixture mode", while line 63 says "journal schemas remain the default" and Step 2 says "Do not introduce new … grant schema". With the current reducer, a no-Git production path either reuses the no-commit event family, which the plan forbids, or adds a third mode or event family, which is a schema change the plan does not declare.
   - **What is missing.** The plan never says what is actually wrong with the existing no-commit path. Candidates are "non-durable" snapshot evidence, coupling with `--test-human-authority` (`src/cli/parse.mjs:297-298`), or something else.
   - **No CLI surface for the legacy mode.** `explicitLegacyGitMode.status === 'unsupported'` (Task 2 Step 3) assumes a user can explicitly request Git-writing mode. Today `normal` is the implicit default (`src/cli/run-core.mjs:1011`), with no flag to request it.
   - **Risk.** An implementer will either build a parallel journal path that duplicates working sealed-event logic, contrary to spec line 31 ("Do not build a replacement orchestration framework"), or stall on the contradiction.

2. **The no-Git-write coverage stops at the submit handoff, but phase advance, finalization and record consolidation also write Git (Task 2 Files and Step 3, Task 3 Step 2).**
   - **Other Git writers.** Normal-mode Git transactions also exist outside author submit: the review-record/manifest path (`src/collateral/review-record-core.mjs:653-656`, `mode === 'normal' ? createGitTransactionRepository(...)`) and the protocol-wide committed events `phase-acceptance-committed` / `phase-artifact-committed` / `acceptance-committed` / `override-committed`. Help text says `consolidate` "apply uses exact-path Git commit in normal mode" (`src/cli/help-data.mjs:1158-1159`).
   - **Seen in this review.** The phase-1 manifest records `final_commit: 8cfaed6…`, and the plan artifact under review now carries a distinct `artifact_commit: 86e7045…`. So the spec→plan phase transition itself produced Git commits.
   - **What the plan covers.** Task 2's Files list does not include `src/collateral/review-record-core.mjs`, `src/git/transaction.mjs`, `src/protocol/events.mjs`/`reducer.mjs` or `src/cli/parse.mjs`. The Step 3 assertions (`afterHandoff.gitHead`, `gitIndexDigest`) and Task 3 Step 2's no-Git-write check are framed around "handoff".
   - **Risk.** If they are implemented literally, submit would make no commits while finalize, phase advance or consolidate still commit. That violates spec line 42 ("The local handoff performs no Git writes or automatic commits") without failing any planned test.

3. **The pre-seal "physical identity" check is undefined. If it uses inode identity, legitimate author edits would be refused (Task 1 Step 1/2, Review focus 2).**
   - **Where the risk comes from.** The plan requires refusing advancement when a provider/manual edit leaves a target with "changed physical identity". The existing helper already compares `dev`/`ino` (`src/collateral/paths.mjs:33`), so the obvious implementation is to compare the artifact's bound `dev`/`ino` with its seal-time `dev`/`ino`.
   - **Why that breaks normal editing.** Many legitimate editors, including common agent edit tools and `apply_patch`-style writers, save by writing a temporary file and renaming it over the target. That gives the artifact (and often the response) a new inode on every ordinary revision. An inode-equality check would therefore refuse normal author turns.
   - **What the check should be.** The spec's intent (line 40) is containment against escapes: the exact bound path still resolves, through a physical (realpath) check, to a regular non-symlink file inside the physical project root, with the expected parent directory identity. File inode equality is not part of that intent. The plan should state this so the test asserts the right property: refuse a symlink/reparse or out-of-root swap, and accept an atomic-rename save.

## Required changes

1. In Task 2 Step 2 (and its Interfaces paragraph), state concretely how production journal-only submission relates to the existing `--no-commit` event family. Choose one:
   - (a) Promote the existing sealed-no-commit events, baseline and snapshot sealing to the production local default. Name the specific deficiencies to fix, for example durable snapshot evidence, or separating `--test-human-authority` so test authority is never production evidence. This needs no new event family.
   - (b) Explicitly declare and specify a new mode/event family. Name the schema change and justify it against spec line 31.

   Either way, define the CLI surface: the new default, and how (or whether) a user can explicitly request the legacy Git-writing mode that Step 3 expects to be refused. Update the Step 3 `explicitLegacyGitMode` assertion to match.
2. Extend the no-Git-write requirement and its assertions from "handoff" to every local review lifecycle command that can write Git today: start, join, submit (both roles), finalize/acceptance, phase advance/phase-artifact sealing, override, consolidate and recover. Add `src/collateral/review-record-core.mjs` and the Git transaction call sites to Task 2's Files list (still limited to where the trace shows it is needed). Make Task 3 Step 2's ordinary and linked-worktree checks cover a multi-phase spec→plan review through acceptance with unchanged HEAD, index and common-dir refs.
3. Define the pre-seal identity/containment check in Task 1 Step 2 as: the bound path physically resolves to a regular, non-symlink/non-reparse file inside the physical project root, with an unchanged physical parent. Explicitly do not require artifact/response inode equality. Add a Task 1 Step 1 positive case in which the author's artifact (and a participant response) is saved by write-temp-then-rename, and it must seal successfully.

## Optional suggestions

1. For instruction-bound (manual) sessions, think about reusing the existing no-commit baseline comparison (`preservesNoCommitBaseline`, `src/cli/run-core.mjs:355-369`) as a detection-only pre-seal report of unrelated tracked/untracked changes. It could surface a warning, or refuse if you prefer. It would give review focus 1 an automated observation for manual sessions without any new subsystem. Be careful about false positives from the human's own concurrent edits in a shared worktree; a warning may fit better than refusal.
2. Task 1 Step 1's "verify the supplied role instructions and observed compliant turn" for a manual session is nondeterministic as a unit/integration test. Consider making this a deterministic test that the invitation/instructions contain the exact allowlist and the instruction-bound label, and leave "observed compliant turn" to Task 3's real installed journey.
3. Task 1's Files list names `src/providers/codex.mjs`, but that adapter has no launch/permission surface today. Saying explicitly that Codex participants take the manual instruction-bound route unless Task 1 adds an evidenced launch path would stop an implementer from trying to build a Codex sandbox wrapper.
4. Two spec wording leftovers from my turn-2 suggestion 2 remain: line 19's "other-tracked-file prohibition" sentence and line 44's "arbitrary Git changes". They can be tidied in a later spec touch-up; this plan does not depend on them.

## Decision

revisions-requested
