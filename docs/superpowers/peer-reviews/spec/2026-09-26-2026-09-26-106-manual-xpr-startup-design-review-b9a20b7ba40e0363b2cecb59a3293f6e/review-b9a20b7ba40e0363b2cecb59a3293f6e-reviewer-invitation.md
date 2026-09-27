<!-- ai-peer-review-template version="1" digest="sha256:9901816a2120d7bb8c6b3f501e59f03217faec9e5dbafadd145408a1662398b9" -->
<!-- ai-peer-review-invitation data="ewogICJhcnRpZmFjdCI6ICIvVXNlcnMva3BidXJzb24vLmNvZGV4L3dvcmt0cmVlcy8xMDYtbWFudWFsLXhwci1zdGFydHVwL2FpLXBlZXItcmV2aWV3L2RvY3Mvc3VwZXJwb3dlcnMvc3BlY3MvMjAyNi0wOS0yNi0xMDYtbWFudWFsLXhwci1zdGFydHVwLWRlc2lnbi5tZCIsCiAgInJlc3BvbnNlIjogIi9Vc2Vycy9rcGJ1cnNvbi8uY29kZXgvd29ya3RyZWVzLzEwNi1tYW51YWwteHByLXN0YXJ0dXAvYWktcGVlci1yZXZpZXcvZG9jcy9zdXBlcnBvd2Vycy9wZWVyLXJldmlld3Mvc3BlYy8yMDI2LTA5LTI2LTIwMjYtMDktMjYtMTA2LW1hbnVhbC14cHItc3RhcnR1cC1kZXNpZ24tcmV2aWV3LWI5YTIwYjdiYTQwZTAzNjNiMmNlY2I1OWEzMjkzZjZlL3Jldmlldy1iOWEyMGI3YmE0MGUwMzYzYjJjZWNiNTlhMzI5M2Y2ZS1yZXZpZXdlci1yZXNwb25zZS0xLm1kIiwKICAicmV2aWV3X2lkIjogInJldmlldy1iOWEyMGI3YmE0MGUwMzYzYjJjZWNiNTlhMzI5M2Y2ZSIsCiAgInNjaGVtYSI6ICJhaS1wZWVyLXJldmlldy5pbnZpdGF0aW9uLXJvdXRpbmcvdjEiLAogICJ3b3Jrc3BhY2UiOiAiL1VzZXJzL2twYnVyc29uLy5jb2RleC93b3JrdHJlZXMvMTA2LW1hbnVhbC14cHItc3RhcnR1cC9haS1wZWVyLXJldmlldy8uc2NyYXRjaC9wZWVyLXJldmlldy9yZXZpZXctYjlhMjBiN2JhNDBlMDM2M2IyY2VjYjU5YTMyOTNmNmUiCn0K" -->

# Reviewer invitation

Review: `review-b9a20b7ba40e0363b2cecb59a3293f6e`

Mode: `normal`

- Artifact: `/Users/kpburson/.codex/worktrees/106-manual-xpr-startup/ai-peer-review/docs/superpowers/specs/2026-09-26-106-manual-xpr-startup-design.md`
- Workspace: `/Users/kpburson/.codex/worktrees/106-manual-xpr-startup/ai-peer-review/.scratch/peer-review/review-b9a20b7ba40e0363b2cecb59a3293f6e`
- Response: `/Users/kpburson/.codex/worktrees/106-manual-xpr-startup/ai-peer-review/docs/superpowers/peer-reviews/spec/2026-09-26-2026-09-26-106-manual-xpr-startup-design-review-b9a20b7ba40e0363b2cecb59a3293f6e/review-b9a20b7ba40e0363b2cecb59a3293f6e-reviewer-response-1.md`
- Invitation: `/Users/kpburson/.codex/worktrees/106-manual-xpr-startup/ai-peer-review/docs/superpowers/peer-reviews/spec/2026-09-26-2026-09-26-106-manual-xpr-startup-design-review-b9a20b7ba40e0363b2cecb59a3293f6e/review-b9a20b7ba40e0363b2cecb59a3293f6e-reviewer-invitation.md`
- Reviewer: `Claude Opus 5` (`claude-opus-5`), effort: `medium`
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

When the project-local broker is active, yield after each handoff; do not poll or repeat wait calls. Inspect `peer-review broker status --json` for authenticated instance state. After a failure, preserve receipts and run `peer-review broker reconcile /Users/kpburson/.codex/worktrees/106-manual-xpr-startup/ai-peer-review/.scratch/peer-review/review-b9a20b7ba40e0363b2cecb59a3293f6e --json` only when the exact recovery evidence calls for it. A broker failure never silently changes the selected reviewer or transport. If the broker is unavailable for an existing manual review, use the bounded `peer-review status /Users/kpburson/.codex/worktrees/106-manual-xpr-startup/ai-peer-review/.scratch/peer-review/review-b9a20b7ba40e0363b2cecb59a3293f6e --next` recovery path.

Role: reviewer. Join from a distinct session in the same physical worktree.

Installed join: `peer-review join /Users/kpburson/.codex/worktrees/106-manual-xpr-startup/ai-peer-review/docs/superpowers/peer-reviews/spec/2026-09-26-2026-09-26-106-manual-xpr-startup-design-review-b9a20b7ba40e0363b2cecb59a3293f6e/review-b9a20b7ba40e0363b2cecb59a3293f6e-reviewer-invitation.md`

Zero-install join: `npx --yes @kburson/ai-peer-review@0.3.0 join /Users/kpburson/.codex/worktrees/106-manual-xpr-startup/ai-peer-review/docs/superpowers/peer-reviews/spec/2026-09-26-2026-09-26-106-manual-xpr-startup-design-review-b9a20b7ba40e0363b2cecb59a3293f6e/review-b9a20b7ba40e0363b2cecb59a3293f6e-reviewer-invitation.md`

Rules of engagement:

- Edit only the exact pending reviewer response shown above.
- Do not edit the reviewed artifact, create commits, or push.
- Query `peer-review help join` instead of guessing command syntax.

Recovery: `peer-review resume /Users/kpburson/.codex/worktrees/106-manual-xpr-startup/ai-peer-review/.scratch/peer-review/review-b9a20b7ba40e0363b2cecb59a3293f6e`
