<!-- ai-peer-review-template version="1" digest="sha256:064952674640611160aff00e947b64de060d4a4cfe7139019eb0f24ee264aa25" -->
<!-- ai-peer-review-invitation data="ewogICJhcnRpZmFjdCI6ICIvVXNlcnMva3BidXJzb24vLmNvZGV4L3dvcmt0cmVlcy9iYWVjL2FpLXBlZXItcmV2aWV3L2RvY3Mvc3VwZXJwb3dlcnMvc3BlY3MvMjAyNi0wOS0yOS0xMTctYnJva2VyLXJlY292ZXJ5LWRlc2lnbi5tZCIsCiAgInJlc3BvbnNlIjogIi9Vc2Vycy9rcGJ1cnNvbi8uY29kZXgvd29ya3RyZWVzL2JhZWMvYWktcGVlci1yZXZpZXcvZG9jcy9zdXBlcnBvd2Vycy9wZWVyLXJldmlld3Mvc3BlYy8yMDI2LTA5LTI5LTIwMjYtMDktMjktMTE3LWJyb2tlci1yZWNvdmVyeS1kZXNpZ24tcmV2aWV3LTUyMGYzOGM3ZWQ2YTY1NjVlY2Y2ZTdiNWQ4ODMzYTVlL3Jldmlldy01MjBmMzhjN2VkNmE2NTY1ZWNmNmU3YjVkODgzM2E1ZS1yZXZpZXdlci1yZXNwb25zZS0xLm1kIiwKICAicmV2aWV3X2lkIjogInJldmlldy01MjBmMzhjN2VkNmE2NTY1ZWNmNmU3YjVkODgzM2E1ZSIsCiAgInNjaGVtYSI6ICJhaS1wZWVyLXJldmlldy5pbnZpdGF0aW9uLXJvdXRpbmcvdjEiLAogICJ3b3Jrc3BhY2UiOiAiL1VzZXJzL2twYnVyc29uLy5jb2RleC93b3JrdHJlZXMvYmFlYy9haS1wZWVyLXJldmlldy8uc2NyYXRjaC9wZWVyLXJldmlldy9yZXZpZXctNTIwZjM4YzdlZDZhNjU2NWVjZjZlN2I1ZDg4MzNhNWUiCn0K" -->

# Reviewer invitation

Review: `review-520f38c7ed6a6565ecf6e7b5d8833a5e`

Mode: `normal`

- Artifact: `/Users/kpburson/.codex/worktrees/baec/ai-peer-review/docs/superpowers/specs/2026-09-29-117-broker-recovery-design.md`
- Workspace: `/Users/kpburson/.codex/worktrees/baec/ai-peer-review/.scratch/peer-review/review-520f38c7ed6a6565ecf6e7b5d8833a5e`
- Response: `/Users/kpburson/.codex/worktrees/baec/ai-peer-review/docs/superpowers/peer-reviews/spec/2026-09-29-2026-09-29-117-broker-recovery-design-review-520f38c7ed6a6565ecf6e7b5d8833a5e/review-520f38c7ed6a6565ecf6e7b5d8833a5e-reviewer-response-1.md`
- Invitation: `/Users/kpburson/.codex/worktrees/baec/ai-peer-review/docs/superpowers/peer-reviews/spec/2026-09-29-2026-09-29-117-broker-recovery-design-review-520f38c7ed6a6565ecf6e7b5d8833a5e/review-520f38c7ed6a6565ecf6e7b5d8833a5e-reviewer-invitation.md`
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

When the project-local broker is active, yield after each handoff; do not poll or repeat wait calls. Inspect `peer-review broker status --json` for authenticated instance state. After a failure, preserve receipts and run `peer-review broker reconcile /Users/kpburson/.codex/worktrees/baec/ai-peer-review/.scratch/peer-review/review-520f38c7ed6a6565ecf6e7b5d8833a5e --json` only when the exact recovery evidence calls for it. A broker failure never silently changes the selected reviewer or transport. If the broker is unavailable for an existing manual review, use the bounded `peer-review status /Users/kpburson/.codex/worktrees/baec/ai-peer-review/.scratch/peer-review/review-520f38c7ed6a6565ecf6e7b5d8833a5e --next` recovery path.

Role: reviewer. Join from a distinct session in the same physical worktree.

Installed join: `peer-review join /Users/kpburson/.codex/worktrees/baec/ai-peer-review/docs/superpowers/peer-reviews/spec/2026-09-29-2026-09-29-117-broker-recovery-design-review-520f38c7ed6a6565ecf6e7b5d8833a5e/review-520f38c7ed6a6565ecf6e7b5d8833a5e-reviewer-invitation.md`

Installed-package join: `npx --no-install ai-peer-review join /Users/kpburson/.codex/worktrees/baec/ai-peer-review/docs/superpowers/peer-reviews/spec/2026-09-29-2026-09-29-117-broker-recovery-design-review-520f38c7ed6a6565ecf6e7b5d8833a5e/review-520f38c7ed6a6565ecf6e7b5d8833a5e-reviewer-invitation.md`

Rules of engagement:

- Edit only the exact pending reviewer response shown above.
- Do not edit the reviewed artifact, create commits, or push.
- Query `peer-review help join` instead of guessing command syntax.

Recovery: `peer-review resume /Users/kpburson/.codex/worktrees/baec/ai-peer-review/.scratch/peer-review/review-520f38c7ed6a6565ecf6e7b5d8833a5e`
