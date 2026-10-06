<!-- ai-peer-review-template version="1" digest="sha256:064952674640611160aff00e947b64de060d4a4cfe7139019eb0f24ee264aa25" -->
<!-- ai-peer-review-invitation data="ewogICJhcnRpZmFjdCI6ICIvVXNlcnMva3BidXJzb24vLmNvZGV4L3dvcmt0cmVlcy9iYWVjL2FpLXBlZXItcmV2aWV3L2RvY3Mvc3VwZXJwb3dlcnMvcGxhbnMvMjAyNi0wOS0yOS0xMTctYnJva2VyLXJlY292ZXJ5Lm1kIiwKICAicmVzcG9uc2UiOiAiL1VzZXJzL2twYnVyc29uLy5jb2RleC93b3JrdHJlZXMvYmFlYy9haS1wZWVyLXJldmlldy9kb2NzL3N1cGVycG93ZXJzL3BlZXItcmV2aWV3cy9waW5uZWQtcHJvb2YvcGxhbi8yMDI2LTA5LTI5LTIwMjYtMDktMjktMTE3LWJyb2tlci1yZWNvdmVyeS1yZXZpZXctNDNiOTlkNmE3N2U5ZjU0Njg3ZGFkZTNjYzQwYmZkNjAvcmV2aWV3LTQzYjk5ZDZhNzdlOWY1NDY4N2RhZGUzY2M0MGJmZDYwLXJldmlld2VyLXJlc3BvbnNlLTEubWQiLAogICJyZXZpZXdfaWQiOiAicmV2aWV3LTQzYjk5ZDZhNzdlOWY1NDY4N2RhZGUzY2M0MGJmZDYwIiwKICAic2NoZW1hIjogImFpLXBlZXItcmV2aWV3Lmludml0YXRpb24tcm91dGluZy92MSIsCiAgIndvcmtzcGFjZSI6ICIvVXNlcnMva3BidXJzb24vLmNvZGV4L3dvcmt0cmVlcy9iYWVjL2FpLXBlZXItcmV2aWV3Ly5zY3JhdGNoL3BlZXItcmV2aWV3L3Jldmlldy00M2I5OWQ2YTc3ZTlmNTQ2ODdkYWRlM2NjNDBiZmQ2MCIKfQo" -->

# Reviewer invitation

Review: `review-43b99d6a77e9f54687dade3cc40bfd60`

Mode: `normal`

- Artifact: `/Users/kpburson/.codex/worktrees/baec/ai-peer-review/docs/superpowers/plans/2026-09-29-117-broker-recovery.md`
- Workspace: `/Users/kpburson/.codex/worktrees/baec/ai-peer-review/.scratch/peer-review/review-43b99d6a77e9f54687dade3cc40bfd60`
- Response: `/Users/kpburson/.codex/worktrees/baec/ai-peer-review/docs/superpowers/peer-reviews/pinned-proof/plan/2026-09-29-2026-09-29-117-broker-recovery-review-43b99d6a77e9f54687dade3cc40bfd60/review-43b99d6a77e9f54687dade3cc40bfd60-reviewer-response-1.md`
- Invitation: `/Users/kpburson/.codex/worktrees/baec/ai-peer-review/docs/superpowers/peer-reviews/pinned-proof/plan/2026-09-29-2026-09-29-117-broker-recovery-review-43b99d6a77e9f54687dade3cc40bfd60/review-43b99d6a77e9f54687dade3cc40bfd60-reviewer-invitation.md`
- Reviewer: `claude-opus-5-5` (`claude-opus-5-5`), effort: `high`
- Runtime: XPR, project-local broker

## Communication policy (v1)

Keep all peer-review chat messages terse. Put complete review analysis, findings, dispositions, revised prose, rationale, decisions, and verification evidence in the generated durable review documents.

Chat may contain only:

- a short operational status;
- a pointer to the relevant durable document;
- the exact next action; or
- a concise blocker requiring human action.

Read the relevant durable reviewer or author response document; do not rely on a chat summary. Do not paste findings, dispositions, revised prose, verification output, or other durable document content into chat unless the human explicitly requests it.

“Terse chat” does not mean terse review evidence. Durable reviewer and author response documents remain complete, self-contained, and authoritative.

## Project-local broker and recovery

Phased sessions remain event-authoritative. After a non-final acceptance, the registered author finalizes and advances the exact next artifact; resume only from the generated reviewer response and never infer or skip a phase from chat.

When the project-local broker is active, yield after each handoff; do not poll or repeat wait calls. Inspect `peer-review broker status --json` for authenticated instance state. After a failure, preserve receipts and run `peer-review broker reconcile /Users/kpburson/.codex/worktrees/baec/ai-peer-review/.scratch/peer-review/review-43b99d6a77e9f54687dade3cc40bfd60 --json` only when the exact recovery evidence calls for it. A broker failure never silently changes the selected reviewer or transport. If the broker is unavailable for an existing manual review, use the bounded `peer-review status /Users/kpburson/.codex/worktrees/baec/ai-peer-review/.scratch/peer-review/review-43b99d6a77e9f54687dade3cc40bfd60 --next` recovery path.

Role: reviewer. Join from a distinct session in the same physical worktree.

Installed join: `peer-review join /Users/kpburson/.codex/worktrees/baec/ai-peer-review/docs/superpowers/peer-reviews/pinned-proof/plan/2026-09-29-2026-09-29-117-broker-recovery-review-43b99d6a77e9f54687dade3cc40bfd60/review-43b99d6a77e9f54687dade3cc40bfd60-reviewer-invitation.md`

Installed-package join: `npx --no-install ai-peer-review join /Users/kpburson/.codex/worktrees/baec/ai-peer-review/docs/superpowers/peer-reviews/pinned-proof/plan/2026-09-29-2026-09-29-117-broker-recovery-review-43b99d6a77e9f54687dade3cc40bfd60/review-43b99d6a77e9f54687dade3cc40bfd60-reviewer-invitation.md`

Rules of engagement:

- Edit only the exact pending reviewer response shown above.
- Do not edit the reviewed artifact, create commits, or push.
- Query `peer-review help join` instead of guessing command syntax.

Recovery: `peer-review resume /Users/kpburson/.codex/worktrees/baec/ai-peer-review/.scratch/peer-review/review-43b99d6a77e9f54687dade3cc40bfd60`
