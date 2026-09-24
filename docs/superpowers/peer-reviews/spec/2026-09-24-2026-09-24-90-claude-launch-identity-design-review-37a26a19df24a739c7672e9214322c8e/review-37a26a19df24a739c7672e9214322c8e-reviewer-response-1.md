<!-- ai-peer-review-template version="1" digest="sha256:78e9a634af9d540baaf6790db82952eaf39cf7ab59a6cdc7938319ae07a4cbed" -->

<!-- protected-frontmatter -->

---
schema: "ai-peer-review.response/v1"
review_id: "review-37a26a19df24a739c7672e9214322c8e"
role: "reviewer"
turn: 1
commit_mode: "normal"
authority_assurance: "unavailable"
artifact_path: "docs/superpowers/specs/2026-09-24-90-claude-launch-identity-design.md"
artifact_commit: "94457b58412f7fb300905392942945c9e23fbb02"
artifact_blob: "a64a5ceabc51b5a0100cd2558f0dba127fe95b26"
artifact_digest: "sha256:72ae598d77cd63455807bff344b7b693357ee1f1c4871b843fd349a8987e28b4"
agent:
  host: "codex"
  provider: "openai"
  model_id: "gpt-6-astra"
  model_display: "GPT-6 Astra"
  session_fingerprint: "sha256:7b8d6647dd2fe0d59aa3e7f72cafdc848c24f825f4f4dc6f68248c202e43336c"
  identity_source: "runtime"
started_at: "2026-09-24T21:00:25.730Z"
submitted_at: "2026-09-24T21:02:34.517Z"
finding_ids: ["R1-F001","R1-F002","R1-F003"]
answered_finding_ids: []
acknowledged_supplement_ids: []
---

Mode: `normal`

## Summary

Revisions requested. The narrow Codex environment scrub and preservation of deterministic preflight environments address the reproduced contamination path. The design also correctly preserves event authority as the submission criterion. Three requirements need clarification before implementation: failures that never reach the classifier, how Claude-local identity is established consistently across commands, and the public diagnostic contract.

Reviewed the sealed invitation, pinned design, current launch runner/classifier, CLI identity selection and launch rendering, identity registry and Claude adapter, deterministic preflight environment policy, and existing launch tests in the exact physical worktree. No provider calls, Git commands, source edits, or full test suite were performed. Two dependency-injected, in-memory runner probes confirmed the failure paths described below; neither reached a filesystem write. Doctor was healthy with the declared Codex model metadata, in manual transport. Setup was not run because this assignment permits writes only to the pending response and package-owned review transitions.

## Findings

### R1-F001 — P1: Specify failures before JSON parsing and session validation, not only classifier failures

Design references: Launch outcome diagnostics, lines 83–87; Test strategy, lines 101–107.

The requirement promises a governed failed result when execution fails before a reviewer exists, but locates the remedy and regression coverage at the classifier. In src/provider/claude-launch.mjs, runClaudeReviewerLaunch first calls parseProviderResult, then requires a resumable session handle, and only afterwards inspects post-launch authority and invokes classifyClaudeReviewerOutcome. Spawn errors, non-JSON provider failures, and structured errors without a session never reach the classifier. A classifier-only implementation can satisfy the proposed direct classifier tests while retaining masked startup failures.

Read-only probes of the current runner, using an injected execFile and in-memory authority with no reviewer, produced:

- An injected ENOENT spawn rejection became APR_CLAUDE_RESULT_INVALID: "Claude launch did not return valid structured JSON."
- A structured exit-code-1 result containing an authentication error but no session_id became APR_CLAUDE_SESSION_INVALID: "Claude launch result does not contain a valid resumable session."

Required clarification: define runner-level handling for spawn failure, empty/malformed/oversized output, structured failure without a session, and interruption, distinguishing definite failure from uncertainty. Specify when current authority is inspected, which integrity/session mismatch errors must still fail closed, and that missing reviewer authority is different from corrupt or mismatched review authority. A failed pre-join launch without a valid handle must not fabricate a fingerprint, write a resumable launch state, or advertise --resume. Define the absent-reviewer result shape, including session_fingerprint omission or null. Add runner tests for these cases with no paid provider calls, including valid submitted authority accompanied by provider failure evidence and unchanged authority on definite startup failure.

### R1-F002 — P1: Define the evidence and scope of Claude-local identity selection across join and submit

Design references: Identity selection boundary, lines 75–79; Test strategy, lines 98–99.

The proposed alternatives leave "when the CLI is executing under Claude" undefined. Presence of Claude environment variables cannot by itself prove this: inherited provider variables are the defect under review. configuredIdentityContext in src/cli/run.mjs is shared by CLI identity resolution, and src/identity/registry.mjs otherwise rejects multiple provider candidates as APR_IDENTITY_AMBIGUOUS. Merely reversing global environment precedence changes which inherited provider wins; the proposed positive mixed-environment test would pass even if a Codex author with stale Claude variables were newly misidentified.

The other suggested alternative names an explicit adapter only for reviewer join. The generated Claude prompt separately executes submit, which must resolve the same registered participant. A join-only override could successfully register Claude and then resolve submit as Codex under the same mixed environment. Preserving the fingerprint equality check alone does not establish that the selected provider/session was the correct one.

Required clarification: choose or precisely constrain a launch-scoped provider-selection mechanism and state how both join and submit receive it, including resumed execution. It must select a provider using defined launch/runtime evidence, obtain an actual Claude session and model from the supported identity sources, and never relabel a Codex session as Anthropic or invent session metadata. Define behavior for mixed variables outside that launch context and for missing Claude session/model metadata. Require negative coverage for a Codex author with inherited Claude variables, explicit-adapter preservation, incomplete Claude identity, and the genuine same-session conflict. Require a regression exercising child-environment construction through actual CLI identity resolution for both join and submit, not only a helper invoked with a preselected Claude adapter. Preserve the existing exact command permission contract if command generation is affected.

### R1-F003 — P2: Make bounded diagnostics safe and visible in the default CLI output

Design references: Launch outcome diagnostics, line 85; Risks, line 115; Test strategy, lines 105–107.

The design calls an error/result summary safe but does not define its allowed fields, bound, or sanitization. parseProviderResult currently retains parsed.error and parsed.result, which are arbitrary provider content. Truncating those values alone does not prevent disclosure of a session handle, credential, or private transcript embedded near the beginning. The stated privacy requirement needs a concrete output rule and regression assertions.

Additionally, writeClaudeLaunchResult in src/cli/run.mjs currently prints only status, response path, and an optional recovery command. Adding diagnostic fields to the classifier result can therefore leave a normal launch-reviewer invocation without the promised actionable explanation, even while JSON-oriented tests pass.

Required clarification: define a small public diagnostic schema, a numeric size bound, and an allowlist/redaction or omission policy that excludes arbitrary transcript/result text and sensitive values. Define a useful error category and safe next action when raw content cannot be shown. Require the safe diagnostic to appear in both default text and --json output. Add fixtures with secrets/raw handles/private text in nested provider error/result fields, large multibyte content, missing diagnostics, and ordinary join failure codes; verify bounded output and no sensitive sentinel leakage. Keep raw provider session material in its existing private location only when valid resumable state is warranted.

## Required changes

1. Address R1-F001 with an explicit runner failure/authority/session-state contract and runner-level regression cases.
2. Address R1-F002 with a bounded identity-selection contract covering join, submit, resume, and negative non-Claude cases.
3. Address R1-F003 with a concrete public diagnostic and CLI rendering contract, including privacy and bound assertions.

## Optional suggestions

None.

## Decision

revisions-requested
