<!-- ai-peer-review-template version="1" digest="sha256:83e1152f236d0468d42cccebe89136e5a97d44849991b9fab7acd33965d739bd" -->
<!-- ai-peer-review-invitation data="ewogICJhcnRpZmFjdCI6ICIvVXNlcnMva3BidXJzb24vLmNvZGV4L3dvcmt0cmVlcy9haXByLWpvdXJuYWwtcmVmYWN0b3JpbmcvYWktcGVlci1yZXZpZXcvZG9jcy9zdXBlcnBvd2Vycy9zcGVjcy8yMDI2LTEwLTE4LTIyMi1yZXZpZXctam91cm5hbC1yZWZhY3RvcmluZy1kZXNpZ24ubWQiLAogICJyZXNwb25zZSI6ICIvVXNlcnMva3BidXJzb24vLmNvZGV4L3dvcmt0cmVlcy9haXByLWpvdXJuYWwtcmVmYWN0b3JpbmcvYWktcGVlci1yZXZpZXcvZG9jcy9zdXBlcnBvd2Vycy9wZWVyLXJldmlld3Mvc3BlYy8yMjItcmVydW4tcjkvc3BlYy8yMDI2LTEwLTE4LTIwMjYtMTAtMTgtMjIyLXJldmlldy1qb3VybmFsLXJlZmFjdG9yaW5nLWRlc2lnbi1yZXZpZXctZDgxZGI2MzZmNmYyYTc3Y2ExM2UzM2NlZjY0ODk5MzQvcmV2aWV3LWQ4MWRiNjM2ZjZmMmE3N2NhMTNlMzNjZWY2NDg5OTM0LXJldmlld2VyLXJlc3BvbnNlLTEubWQiLAogICJyZXZpZXdfaWQiOiAicmV2aWV3LWQ4MWRiNjM2ZjZmMmE3N2NhMTNlMzNjZWY2NDg5OTM0IiwKICAic2NoZW1hIjogImFpLXBlZXItcmV2aWV3Lmludml0YXRpb24tcm91dGluZy92MSIsCiAgIndvcmtzcGFjZSI6ICIvVXNlcnMva3BidXJzb24vLmNvZGV4L3dvcmt0cmVlcy9haXByLWpvdXJuYWwtcmVmYWN0b3JpbmcvYWktcGVlci1yZXZpZXcvLnNjcmF0Y2gvcGVlci1yZXZpZXcvcmV2aWV3LWQ4MWRiNjM2ZjZmMmE3N2NhMTNlMzNjZWY2NDg5OTM0Igp9Cg" -->

# Reviewer invitation

Review: `review-d81db636f6f2a77ca13e33cef6489934`

> **LOCAL JOURNAL MODE** — authority assurance: `unavailable`

- Artifact: `/Users/kpburson/.codex/worktrees/aipr-journal-refactoring/ai-peer-review/docs/superpowers/specs/2026-10-18-222-review-journal-refactoring-design.md`
- Workspace: `/Users/kpburson/.codex/worktrees/aipr-journal-refactoring/ai-peer-review/.scratch/peer-review/review-d81db636f6f2a77ca13e33cef6489934`
- Response: `/Users/kpburson/.codex/worktrees/aipr-journal-refactoring/ai-peer-review/docs/superpowers/peer-reviews/spec/222-rerun-r9/spec/2026-10-18-2026-10-18-222-review-journal-refactoring-design-review-d81db636f6f2a77ca13e33cef6489934/review-d81db636f6f2a77ca13e33cef6489934-reviewer-response-1.md`
- Invitation: `/Users/kpburson/.codex/worktrees/aipr-journal-refactoring/ai-peer-review/docs/superpowers/peer-reviews/spec/222-rerun-r9/spec/2026-10-18-2026-10-18-222-review-journal-refactoring-design-review-d81db636f6f2a77ca13e33cef6489934/review-d81db636f6f2a77ca13e33cef6489934-reviewer-invitation.md`
- Reviewer: `claude-opus-5-5` (`claude-opus-5-5`), effort: `high`
- Runtime: XPR, local filepath handoff

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

When the project-local broker is active, yield after each handoff; do not poll or repeat wait calls. Inspect `peer-review broker status --json` for authenticated instance state. After a failure, preserve receipts and run `peer-review broker reconcile /Users/kpburson/.codex/worktrees/aipr-journal-refactoring/ai-peer-review/.scratch/peer-review/review-d81db636f6f2a77ca13e33cef6489934 --json` only when the exact recovery evidence calls for it. A broker failure never silently changes the selected reviewer or transport. If the broker is unavailable for an existing manual review, use the bounded `peer-review status /Users/kpburson/.codex/worktrees/aipr-journal-refactoring/ai-peer-review/.scratch/peer-review/review-d81db636f6f2a77ca13e33cef6489934 --next` recovery path.

Role: reviewer. Join from a distinct session in the same physical worktree.

Installed join: `peer-review join /Users/kpburson/.codex/worktrees/aipr-journal-refactoring/ai-peer-review/docs/superpowers/peer-reviews/spec/222-rerun-r9/spec/2026-10-18-2026-10-18-222-review-journal-refactoring-design-review-d81db636f6f2a77ca13e33cef6489934/review-d81db636f6f2a77ca13e33cef6489934-reviewer-invitation.md`

Installed-package join: `npx --no-install ai-peer-review join /Users/kpburson/.codex/worktrees/aipr-journal-refactoring/ai-peer-review/docs/superpowers/peer-reviews/spec/222-rerun-r9/spec/2026-10-18-2026-10-18-222-review-journal-refactoring-design-review-d81db636f6f2a77ca13e33cef6489934/review-d81db636f6f2a77ca13e33cef6489934-reviewer-invitation.md`

Rules of engagement:

- Edit only `/Users/kpburson/.codex/worktrees/aipr-journal-refactoring/ai-peer-review/docs/superpowers/peer-reviews/spec/222-rerun-r9/spec/2026-10-18-2026-10-18-222-review-journal-refactoring-design-review-d81db636f6f2a77ca13e33cef6489934/review-d81db636f6f2a77ca13e33cef6489934-reviewer-response-1.md`, the exact pending reviewer response shown above.
- Do not edit the reviewed artifact, create commits, or push.
- Do not write any other tracked, untracked, ignored or new files, Git metadata, automation-owned coordination records, another response or anything outside the project.
- Existing human-launched sessions are instruction-bound: these instructions do not change their host permissions. Automatically launched sessions use the provider's existing exact response restriction where supported.
- Query `peer-review help join` instead of guessing command syntax.

Recovery: `peer-review resume /Users/kpburson/.codex/worktrees/aipr-journal-refactoring/ai-peer-review/.scratch/peer-review/review-d81db636f6f2a77ca13e33cef6489934`
