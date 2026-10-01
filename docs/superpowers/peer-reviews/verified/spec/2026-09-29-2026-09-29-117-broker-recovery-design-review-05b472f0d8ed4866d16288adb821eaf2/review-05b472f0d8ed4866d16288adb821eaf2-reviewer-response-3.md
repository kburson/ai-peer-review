<!-- ai-peer-review-template version="1" digest="sha256:78e9a634af9d540baaf6790db82952eaf39cf7ab59a6cdc7938319ae07a4cbed" -->

<!-- protected-frontmatter -->

---
schema: "ai-peer-review.response/v1"
review_id: "review-05b472f0d8ed4866d16288adb821eaf2"
role: "reviewer"
turn: 3
commit_mode: "normal"
authority_assurance: "unavailable"
artifact_path: "docs/superpowers/specs/2026-09-29-117-broker-recovery-design.md"
artifact_commit: "f7a3e768d48e0268047533983ef7d6f3c82aad47"
artifact_blob: "72dcf3cfbe01a601c2257a319263ca2a37f7d8ab"
artifact_digest: "sha256:26925c81f8f25a8cf32036d045f50bcac0bd50abc6aad09f94fa2cc6d3f126c4"
agent:
  host: "claude-code"
  provider: "anthropic"
  model_id: "claude-opus-5-5"
  model_display: "claude-opus-5-5"
  session_fingerprint: "sha256:66d3485fe57e23ef8c01f33654561eae3e84297dd36d887c3243dd6a227da51c"
  identity_source: "runtime"
started_at: "2026-09-29T07:42:09.710Z"
submitted_at: "2026-09-29T07:54:08.599Z"
finding_ids: ["R3-F001"]
answered_finding_ids: []
acknowledged_supplement_ids: []
---

Mode: `normal`

## Summary

I re-read the full revised specification at `f7a3e76` against author response 2. Both round-2 findings are resolved.

- **R2-F001 (bare alias integrity) is resolved.** The scope paragraph now makes the alias a launch-integrity gate evaluated at execution time. The gate requires all of the following:
  - Resolution happens in the actual reviewer shell environment.
  - The first executable found is the expected symlink, and its canonical target equals the sealed entrypoint.
  - Content is checked against the sealed runtime digest, not just the version.
  - The check is repeated at execution time, and runtime identity is held immutable through execution.

  The gate fails closed to the integrity-checked absolute pinned command. A same-path reinstall with changed contents explicitly invalidates the alias. The spec also says truthfully that the current check, done only when the command is generated, does not satisfy this gate. New verification item 6 covers every case I asked for, plus a race between validation and execution. The spec now says that if execution-time immutability cannot be established, the bare command is rejected. A literal implementation therefore falls back to absolute paths instead of weakening the gate.
- **R2-F002 (per-attempt receipts) is resolved.** Each receipt now certifies only its own attempt. Every prior attempt of the same operation needs independent proof that it was not delivered. A later local refusal, or an adapter's `not-submitted` label, cannot erase an earlier interrupted delivery. The case where one operation has an interrupted delivery followed by a local refusal is now in verification item 2's blocked list.

No new defects were introduced. The recovery, retirement, lock-order, diagnostics, and guidance sections are unchanged from round 2 apart from these two clarifications, and remain consistent with each other.

This acceptance covers the specification only. As both the spec and the author note, it does not show that the new gates are implemented. The current tree still accepts bare `refused` wake labels (`src/cli/run.mjs:2089-2091`). It also resolves the alias only against the launcher's PATH when generating the command (`src/provider/claude-launch.mjs:37-58`). Both must change under the implementation gates in the Verification section.

## Findings

None.

## Required changes

None.

## Optional suggestions

### R3-F001 — Name the hook that enforces the alias gate

Location: "Status and scope" paragraph 2.

The paragraph says the issue "will not change AITM hooks", then says "The hook must reject a bare command…". The hook meant is presumably the package's own Claude review hook and permission builder (`src/providers/claude-hook.mjs`, `src/provider/claude-launch.mjs`), not the AITM Bash hook. Naming it explicitly would stop an implementer from reading the gate as a change to AITM hooks, or as needing one.

## Decision

accepted
