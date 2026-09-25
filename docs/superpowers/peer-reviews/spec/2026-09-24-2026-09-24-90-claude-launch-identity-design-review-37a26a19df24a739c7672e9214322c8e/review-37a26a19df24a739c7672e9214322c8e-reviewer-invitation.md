<!-- ai-peer-review-template version="1" digest="sha256:67647a97b95d0d88ad485fdc636134e56a7bf2688c4aab40d4acdfdcac1a98af" -->
<!-- ai-peer-review-invitation data="ewogICJhcnRpZmFjdCI6ICIvVXNlcnMva3BidXJzb24vLmNvZGV4L3dvcmt0cmVlcy9jN2YzL2FpLXBlZXItcmV2aWV3L2RvY3Mvc3VwZXJwb3dlcnMvc3BlY3MvMjAyNi0wOS0yNC05MC1jbGF1ZGUtbGF1bmNoLWlkZW50aXR5LWRlc2lnbi5tZCIsCiAgInJlc3BvbnNlIjogIi9Vc2Vycy9rcGJ1cnNvbi8uY29kZXgvd29ya3RyZWVzL2M3ZjMvYWktcGVlci1yZXZpZXcvZG9jcy9zdXBlcnBvd2Vycy9wZWVyLXJldmlld3Mvc3BlYy8yMDI2LTA5LTI0LTIwMjYtMDktMjQtOTAtY2xhdWRlLWxhdW5jaC1pZGVudGl0eS1kZXNpZ24tcmV2aWV3LTM3YTI2YTE5ZGYyNGE3MzljNzY3MmU5MjE0MzIyYzhlL3Jldmlldy0zN2EyNmExOWRmMjRhNzM5Yzc2NzJlOTIxNDMyMmM4ZS1yZXZpZXdlci1yZXNwb25zZS0xLm1kIiwKICAicmV2aWV3X2lkIjogInJldmlldy0zN2EyNmExOWRmMjRhNzM5Yzc2NzJlOTIxNDMyMmM4ZSIsCiAgInNjaGVtYSI6ICJhaS1wZWVyLXJldmlldy5pbnZpdGF0aW9uLXJvdXRpbmcvdjEiLAogICJ3b3Jrc3BhY2UiOiAiL1VzZXJzL2twYnVyc29uLy5jb2RleC93b3JrdHJlZXMvYzdmMy9haS1wZWVyLXJldmlldy8uc2NyYXRjaC9wZWVyLXJldmlldy9yZXZpZXctMzdhMjZhMTlkZjI0YTczOWM3NjcyZTkyMTQzMjJjOGUiCn0K" -->

# Reviewer invitation

Review: `review-37a26a19df24a739c7672e9214322c8e`

Mode: `normal`

- Artifact: `/Users/kpburson/.codex/worktrees/c7f3/ai-peer-review/docs/superpowers/specs/2026-09-24-90-claude-launch-identity-design.md`
- Workspace: `/Users/kpburson/.codex/worktrees/c7f3/ai-peer-review/.scratch/peer-review/review-37a26a19df24a739c7672e9214322c8e`
- Response: `/Users/kpburson/.codex/worktrees/c7f3/ai-peer-review/docs/superpowers/peer-reviews/spec/2026-09-24-2026-09-24-90-claude-launch-identity-design-review-37a26a19df24a739c7672e9214322c8e/review-37a26a19df24a739c7672e9214322c8e-reviewer-response-1.md`
- Invitation: `/Users/kpburson/.codex/worktrees/c7f3/ai-peer-review/docs/superpowers/peer-reviews/spec/2026-09-24-2026-09-24-90-claude-launch-identity-design-review-37a26a19df24a739c7672e9214322c8e/review-37a26a19df24a739c7672e9214322c8e-reviewer-invitation.md`

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

Installed join: `peer-review join /Users/kpburson/.codex/worktrees/c7f3/ai-peer-review/docs/superpowers/peer-reviews/spec/2026-09-24-2026-09-24-90-claude-launch-identity-design-review-37a26a19df24a739c7672e9214322c8e/review-37a26a19df24a739c7672e9214322c8e-reviewer-invitation.md`

Zero-install join: `npx --yes ai-peer-review@0.2.2 join /Users/kpburson/.codex/worktrees/c7f3/ai-peer-review/docs/superpowers/peer-reviews/spec/2026-09-24-2026-09-24-90-claude-launch-identity-design-review-37a26a19df24a739c7672e9214322c8e/review-37a26a19df24a739c7672e9214322c8e-reviewer-invitation.md`

Rules of engagement:

- Edit only the exact pending reviewer response shown above.
- Do not edit the reviewed artifact, create commits, or push.
- Query `peer-review help join` instead of guessing command syntax.

Recovery: `peer-review resume /Users/kpburson/.codex/worktrees/c7f3/ai-peer-review/.scratch/peer-review/review-37a26a19df24a739c7672e9214322c8e`
