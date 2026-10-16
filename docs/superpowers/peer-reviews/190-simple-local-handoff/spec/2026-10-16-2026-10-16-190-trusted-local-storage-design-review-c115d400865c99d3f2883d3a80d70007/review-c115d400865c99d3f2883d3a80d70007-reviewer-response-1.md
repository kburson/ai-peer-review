<!-- ai-peer-review-template version="1" digest="sha256:78e9a634af9d540baaf6790db82952eaf39cf7ab59a6cdc7938319ae07a4cbed" -->

<!-- protected-frontmatter -->

---
schema: "ai-peer-review.response/v1"
review_id: "review-c115d400865c99d3f2883d3a80d70007"
role: "reviewer"
turn: 1
commit_mode: "normal"
authority_assurance: "unavailable"
artifact_path: "docs/superpowers/specs/2026-10-16-190-trusted-local-storage-design.md"
artifact_commit: "d2e029dc1ef4583aaa5718445fd7fad1bb794609"
artifact_blob: "39cea5f79aaea91b2a1ad884ca5de076c840e7fb"
artifact_digest: "sha256:cd8d08e2d985e86d5b1014cb02261ca102f2749228568b62729038c4735ad547"
agent:
  host: "claude-code"
  provider: "anthropic"
  model_id: "claude-opus-5-5"
  model_display: "claude-opus-5-5"
  session_fingerprint: "sha256:aa81aacd4ed7e02a555cd16840ba7caa1794f3ee25ee6bae1cd34a3c02ce8382"
  identity_source: "runtime"
started_at: "2026-10-16T08:51:36.263Z"
submitted_at: "2026-10-16T08:53:42.675Z"
finding_ids: []
answered_finding_ids: []
acknowledged_supplement_ids: []
---

Mode: `normal`

## Summary

The amendment is a sound and welcome simplification. It narrows the local two-agent handoff to path binding, turn authentication, locking, idempotent submission and truthful recovery, and it drops the ACL/source-class/native machinery. Its supersession language is consistent: all seven governing notices (#107 design/plan, #141, #171, #190 selection plan/design, read-pair design, retired worker proposal) carry the same amendment text and link back to this spec and its companion plan. The non-goals (no hostile same-user resistance, no OS-isolation claim, instructions are not enforcement) are stated honestly.

I checked the spec against the current runtime. The existing Claude launch path (`src/provider/claude-launch-core.mjs:408-421`) already matches the intended reviewer model: `--permission-mode dontAsk`, one exact `Edit(/<response>)` rule and exact `Bash(<submit>)` rules. That shows the provider-enforced design is realistic for Claude.

Several gaps in the write model still need fixing before the plan can be implemented and verified without guessing. Normal-mode Git commits made by protocol commands are not in the role table. Manual (human-launched) participants are not classified. The author role has no fallback when a provider cannot scope edits. Write-time containment is promised for writes the automation does not perform. The prohibition list covers only tracked files. Each of these could lead an implementer to build or claim something the spec does not actually allow, or to miss a boundary the role table implies.

## Findings

1. **Normal-mode Git commits are not in the write model, and they conflict with the participant `.git` prohibition and the read-only-reviewer preference.** In `normal` commit mode, protocol submission commits exact paths (`src/cli/run-core.mjs:3552-3555` and `:4140-4143` → `src/git/transaction.mjs:299-302`, `git commit --only -- <ownedPaths>`; `src/collateral/review-record-core.mjs:656`). That writes the index, objects and refs. The role table's Automation row only allows "fixed project-local coordination records and the designated response file". Line 42 says only that protocol commands "may not … make arbitrary Git changes", which implies exact commits are allowed without saying so. Line 19 says neither participant may modify `.git` metadata, yet a participant starts `peer-review submit` from its own provider session (the Claude allowlist includes the exact `Bash(submit)` rule). That makes the participant's process tree the one writing `.git`. Two consequences follow. (a) If a provider's read-only/sandboxed execution is used as the line 38 preference suggests, normal-mode submit run inside that sandbox will fail at the commit. (b) In a linked worktree such as this one, `.git` is a file pointing at the common Git directory, which may sit outside the physical worktree root. So the commit writes "outside the canonical local project", which line 19 and line 25 forbid. Without an explicit rule, Task1's ".git denied" test and Task2's commit behavior contradict each other.

2. **Manual (human-launched) participants are unclassified, so the "preserves each write boundary" claim has no defined meaning for the main cross-provider path.** The spec describes automation starting each participant (Handoff flow step 2) and enforcing scope through provider controls (line 38-39). The current Codex adapter (`src/providers/codex.mjs`, 57 lines) only has version/hook/session observation. It has no launch path and no sandbox/permission controls. Codex participants, like this review's author, therefore join through an invitation from a session the human started with whatever permissions they chose. The automation does not control those permissions, so the write boundary there is instructions only. Line 39 says to refuse "that automation capability" when a provider cannot honor the boundary. It does not say whether manual join is (a) still allowed as an explicitly instruction-bound, unenforced mode, (b) refused, or (c) out of scope for this amendment. Line 66's success criterion ("preserves each write boundary", "Advertise provider/host write-scope support only where it has actual evidence") and Task3 Step1 cannot be written or judged until this is settled.

3. **The author role has no defined outcome when a provider cannot scope edits to exactly the artifact and its response.** Line 38 gives the reviewer a fallback (read-only execution plus automation publishing the returned notes). For the author it says only "allow only the artifact and its current response". The role table does not let automation write the artifact for the author, and line 42 forbids protocol commands from modifying the artifact. A provider whose native sandbox is project-wide (workspace-level write) has no way to act as author under this spec. The spec should say so directly ("author automation is refused for that provider"). Alternatively, it should define a narrow author publication path: automation writes the author's returned artifact bytes, checked against the expected artifact version and contained physical target. As written, an implementer could reasonably grant workspace-wide write "temporarily" for the author. That would violate line 38, and this gap is the likely place for it to happen.

4. **"Check containment at the write itself" can only be enforced for writes the automation performs.** Line 40 requires the check at write time and requires rejecting "a changed physical target". Plan review focus #2 says "reject before writing through it". When the provider's own tool does the write (Claude `Edit` on the response or artifact), the automation cannot step in at write time. It can only (i) encode an exact physical-path rule (already done, `encodeClaudeEditRule`, `claude-launch-core.mjs:160-169`) and (ii) check the artifact/response physical identity and containment after the turn, before sealing or accepting the submission. Whether the provider's tool follows a symlink swapped in at the allowed path is provider behavior, and the spec does not pin it. The spec should separate the two cases: at-write checks for automation publications, and post-turn identity/containment checks (refuse to seal or advance on mismatch) for provider-performed writes. Without that split, Task1 Step1's "symlink replacement between resolution and write" test has no achievable pass condition for provider writes.

5. **The prohibition list covers tracked files only, which leaves untracked, ignored, new and coordination-state paths unstated.** The role table lists one exact writable path per reviewer (two for the author), which implies "nothing else". Line 19 lists the prohibitions as "another tracked file, `.git` metadata, another participant's response, an earlier sealed response, or anything outside the canonical local project". Read literally, a participant may create new untracked files or modify ignored files inside the project. That includes the untracked `.scratch/peer-review/<review>/` journal, bindings and receipts, and direct edits there would bypass the protocol-integrity guarantees in lines 35-37. The plan's Task1 Step1 negative set (artifact, another response, unrelated tracked file, `.git`, outside sentinel) has the same gap.

## Required changes

1. Add the protocol's normal-mode exact-path Git commit to the Automation write row, limited to exactly the sealed owned paths, with no other index or ref changes. Say whether that write is attributed to automation even when a participant starts the exact submit command. Say how a sandboxed/read-only participant's submit gets that capability (for example, the exact submit command runs outside the participant's restricted scope, or `no-commit` mode is required for sandboxed participants). Define "canonical local project" for linked worktrees whose Git common directory is outside the worktree root.
2. Classify manual/human-launched participant joins explicitly: instruction-bound and unenforced (and labeled that way in status/advertising), refused, or out of scope. Make the line 66 acceptance and Task3 provider-evidence wording follow that classification.
3. State the outcome for an author whose provider cannot scope edits to the artifact plus its current response. Either refuse author automation for that provider, or define a narrow automation publication of returned artifact bytes with expected-version and physical-target checks, and add it to the role table and to line 42.
4. Split line 40 into at-write checks (automation publications) and post-turn identity/containment verification before sealing or advancing (provider-performed writes). Update plan review focus #2 and Task1 Step1 to match.
5. Change line 19 (and the plan's constraint bullets) from "another tracked file" to "any path other than the role's allowlisted paths", explicitly naming untracked/ignored/new files and the review coordination workspace. Add a new-untracked-file write and a coordination-journal write to the Task1 Step1 negative set.

## Optional suggestions

1. The artifact filename and the plan filename say "trusted-local-storage", but both headings say "simple local handoff". Consider a one-line note that the filename is kept for continuity, so readers do not expect a storage design.
2. Line 64's "An unused ACL-query budget does not require making ACL queries" would read more clearly as "The 5000 ms budget formerly used for ACL queries is retained but need not be consumed", assuming that is the budget meant.
3. In Handoff flow step 2, consider saying explicitly that reviewer read access includes running the exact protocol `join`/`submit` commands. This mirrors the existing Claude `Bash(<join>)`/`Bash(<submit>)` allowlist and keeps a generic shell out of the reviewer's tools.

## Decision

revisions-requested
