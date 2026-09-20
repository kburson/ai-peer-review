<!-- ai-peer-review-template version="1" digest="sha256:67647a97b95d0d88ad485fdc636134e56a7bf2688c4aab40d4acdfdcac1a98af" -->
<!-- ai-peer-review-invitation data="ewogICJhcnRpZmFjdCI6ICIvVXNlcnMva3BidXJzb24vLmNvZGV4L3dvcmt0cmVlcy85ZDQ1L2FpLXBlZXItcmV2aWV3L2RvY3Mvc3VwZXJwb3dlcnMvcGxhbnMvMjAyNi0wOS0xOS03Ni1jaGFuZ2UtbnBtLXBhY2thZ2Utc2NvcGUubWQiLAogICJyZXNwb25zZSI6ICIvVXNlcnMva3BidXJzb24vLmNvZGV4L3dvcmt0cmVlcy85ZDQ1L2FpLXBlZXItcmV2aWV3L2RvY3Mvc3VwZXJwb3dlcnMvcGVlci1yZXZpZXdzL3BsYW4vMjAyNi0wOS0xOS0yMDI2LTA5LTE5LTc2LWNoYW5nZS1ucG0tcGFja2FnZS1zY29wZS1yZXZpZXctZDhhZGEwZTRiOThmYjNmOWZjZTBjZjczMDI5NDQ4N2QvcmV2aWV3LWQ4YWRhMGU0Yjk4ZmIzZjlmY2UwY2Y3MzAyOTQ0ODdkLXJldmlld2VyLXJlc3BvbnNlLTEubWQiLAogICJyZXZpZXdfaWQiOiAicmV2aWV3LWQ4YWRhMGU0Yjk4ZmIzZjlmY2UwY2Y3MzAyOTQ0ODdkIiwKICAic2NoZW1hIjogImFpLXBlZXItcmV2aWV3Lmludml0YXRpb24tcm91dGluZy92MSIsCiAgIndvcmtzcGFjZSI6ICIvVXNlcnMva3BidXJzb24vLmNvZGV4L3dvcmt0cmVlcy85ZDQ1L2FpLXBlZXItcmV2aWV3Ly5zY3JhdGNoL3BlZXItcmV2aWV3L3Jldmlldy1kOGFkYTBlNGI5OGZiM2Y5ZmNlMGNmNzMwMjk0NDg3ZCIKfQo" -->

# Reviewer invitation

Review: `review-d8ada0e4b98fb3f9fce0cf730294487d`

Mode: `normal`

- Artifact: `/Users/kpburson/.codex/worktrees/9d45/ai-peer-review/docs/superpowers/plans/2026-09-19-76-change-npm-package-scope.md`
- Workspace: `/Users/kpburson/.codex/worktrees/9d45/ai-peer-review/.scratch/peer-review/review-d8ada0e4b98fb3f9fce0cf730294487d`
- Response: `/Users/kpburson/.codex/worktrees/9d45/ai-peer-review/docs/superpowers/peer-reviews/plan/2026-09-19-2026-09-19-76-change-npm-package-scope-review-d8ada0e4b98fb3f9fce0cf730294487d/review-d8ada0e4b98fb3f9fce0cf730294487d-reviewer-response-1.md`
- Invitation: `/Users/kpburson/.codex/worktrees/9d45/ai-peer-review/docs/superpowers/peer-reviews/plan/2026-09-19-2026-09-19-76-change-npm-package-scope-review-d8ada0e4b98fb3f9fce0cf730294487d/review-d8ada0e4b98fb3f9fce0cf730294487d-reviewer-invitation.md`

## Communication policy (v1)

Keep all peer-review chat messages terse. Put complete review analysis, findings, dispositions, revised prose, rationale, decisions, and verification evidence in the generated durable review documents.

Chat may contain only:

- a short operational status;
- a pointer to the relevant durable document;
- the exact next action; or
- a concise blocker requiring human action.

Read the relevant durable reviewer or author response document; do not rely on a chat summary. Do not paste findings, dispositions, revised prose, verification output, or other durable document content into chat unless the human explicitly requests it.

“Terse chat” does not mean terse review evidence. Durable reviewer and author response documents remain complete, self-contained, and authoritative.

## Durable coordinator

Phased sessions remain event-authoritative. After a non-final acceptance, the registered author finalizes and advances the exact next artifact; resume only from the generated reviewer response and never infer or skip a phase from chat.

When the host reports that the durable coordinator is active, yield after each handoff. The coordinator sleeps outside participant context and wakes only the exact configured session for an actionable protocol revision; do not poll or repeat wait calls. If durable wake is unavailable, use only the bounded manual fallback `peer-review status <workspace> --next`.

Role: reviewer. Join from a distinct session in the same physical worktree.

Installed join: `peer-review join /Users/kpburson/.codex/worktrees/9d45/ai-peer-review/docs/superpowers/peer-reviews/plan/2026-09-19-2026-09-19-76-change-npm-package-scope-review-d8ada0e4b98fb3f9fce0cf730294487d/review-d8ada0e4b98fb3f9fce0cf730294487d-reviewer-invitation.md`

Zero-install join: `npx --yes ai-peer-review@0.2.2 join /Users/kpburson/.codex/worktrees/9d45/ai-peer-review/docs/superpowers/peer-reviews/plan/2026-09-19-2026-09-19-76-change-npm-package-scope-review-d8ada0e4b98fb3f9fce0cf730294487d/review-d8ada0e4b98fb3f9fce0cf730294487d-reviewer-invitation.md`

Rules of engagement:

- Edit only the exact pending reviewer response shown above.
- Do not edit the reviewed artifact, create commits, or push.
- Query `peer-review help join` instead of guessing command syntax.

Recovery: `peer-review resume /Users/kpburson/.codex/worktrees/9d45/ai-peer-review/.scratch/peer-review/review-d8ada0e4b98fb3f9fce0cf730294487d`
