<!-- ai-peer-review-template version="1" digest="sha256:67647a97b95d0d88ad485fdc636134e56a7bf2688c4aab40d4acdfdcac1a98af" -->
<!-- ai-peer-review-invitation data="ewogICJhcnRpZmFjdCI6ICIvVXNlcnMva3BidXJzb24vcHJvamVjdHMvVmliZS1Db2RpbmcvYWktcGVlci1yZXZpZXctd29ya3RyZWVzLzMwLWFydGlmYWN0LWxpZmVjeWNsZS9kb2NzL2Rlc2lnbi8yMDI2LTA5LTEzLTMwLWFydGlmYWN0LWxpZmVjeWNsZS1yZXZpZXctZXZpZGVuY2UtZGVzaWduLm1kIiwKICAicmVzcG9uc2UiOiAiL1VzZXJzL2twYnVyc29uL3Byb2plY3RzL1ZpYmUtQ29kaW5nL2FpLXBlZXItcmV2aWV3LXdvcmt0cmVlcy8zMC1hcnRpZmFjdC1saWZlY3ljbGUvZG9jcy9wZWVyLXJldmlld3Mvc3BlYy8yMDI2LTA5LTEzLTIwMjYtMDktMTMtMzAtYXJ0aWZhY3QtbGlmZWN5Y2xlLXJldmlldy1ldmlkZW5jZS1kZXNpZ24tcmV2aWV3LTJhNjlkZmYyZGQyOTkyZjNkMzM4NTRlN2NhMzFlODg4L3Jldmlldy0yYTY5ZGZmMmRkMjk5MmYzZDMzODU0ZTdjYTMxZTg4OC1yZXZpZXdlci1yZXNwb25zZS0xLm1kIiwKICAicmV2aWV3X2lkIjogInJldmlldy0yYTY5ZGZmMmRkMjk5MmYzZDMzODU0ZTdjYTMxZTg4OCIsCiAgInNjaGVtYSI6ICJhaS1wZWVyLXJldmlldy5pbnZpdGF0aW9uLXJvdXRpbmcvdjEiLAogICJ3b3Jrc3BhY2UiOiAiL1VzZXJzL2twYnVyc29uL3Byb2plY3RzL1ZpYmUtQ29kaW5nL2FpLXBlZXItcmV2aWV3LXdvcmt0cmVlcy8zMC1hcnRpZmFjdC1saWZlY3ljbGUvLnNjcmF0Y2gvcGVlci1yZXZpZXcvcmV2aWV3LTJhNjlkZmYyZGQyOTkyZjNkMzM4NTRlN2NhMzFlODg4Igp9Cg" -->

# Reviewer invitation

Review: `review-2a69dff2dd2992f3d33854e7ca31e888`

Mode: `normal`

- Artifact: `/Users/kpburson/projects/Vibe-Coding/ai-peer-review-worktrees/30-artifact-lifecycle/docs/design/2026-09-13-30-artifact-lifecycle-review-evidence-design.md`
- Workspace: `/Users/kpburson/projects/Vibe-Coding/ai-peer-review-worktrees/30-artifact-lifecycle/.scratch/peer-review/review-2a69dff2dd2992f3d33854e7ca31e888`
- Response: `/Users/kpburson/projects/Vibe-Coding/ai-peer-review-worktrees/30-artifact-lifecycle/docs/peer-reviews/spec/2026-09-13-2026-09-13-30-artifact-lifecycle-review-evidence-design-review-2a69dff2dd2992f3d33854e7ca31e888/review-2a69dff2dd2992f3d33854e7ca31e888-reviewer-response-1.md`
- Invitation: `/Users/kpburson/projects/Vibe-Coding/ai-peer-review-worktrees/30-artifact-lifecycle/docs/peer-reviews/spec/2026-09-13-2026-09-13-30-artifact-lifecycle-review-evidence-design-review-2a69dff2dd2992f3d33854e7ca31e888/review-2a69dff2dd2992f3d33854e7ca31e888-reviewer-invitation.md`

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

Installed join: `peer-review join /Users/kpburson/projects/Vibe-Coding/ai-peer-review-worktrees/30-artifact-lifecycle/docs/peer-reviews/spec/2026-09-13-2026-09-13-30-artifact-lifecycle-review-evidence-design-review-2a69dff2dd2992f3d33854e7ca31e888/review-2a69dff2dd2992f3d33854e7ca31e888-reviewer-invitation.md`

Zero-install join: `npx --yes ai-peer-review@0.2.2 join /Users/kpburson/projects/Vibe-Coding/ai-peer-review-worktrees/30-artifact-lifecycle/docs/peer-reviews/spec/2026-09-13-2026-09-13-30-artifact-lifecycle-review-evidence-design-review-2a69dff2dd2992f3d33854e7ca31e888/review-2a69dff2dd2992f3d33854e7ca31e888-reviewer-invitation.md`

Rules of engagement:

- Edit only the exact pending reviewer response shown above.
- Do not edit the reviewed artifact, create commits, or push.
- Query `peer-review help join` instead of guessing command syntax.

Recovery: `peer-review resume /Users/kpburson/projects/Vibe-Coding/ai-peer-review-worktrees/30-artifact-lifecycle/.scratch/peer-review/review-2a69dff2dd2992f3d33854e7ca31e888`
