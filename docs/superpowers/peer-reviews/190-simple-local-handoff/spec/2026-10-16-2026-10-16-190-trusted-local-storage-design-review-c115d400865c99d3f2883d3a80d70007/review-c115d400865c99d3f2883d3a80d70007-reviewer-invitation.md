<!-- ai-peer-review-template version="1" digest="sha256:064952674640611160aff00e947b64de060d4a4cfe7139019eb0f24ee264aa25" -->
<!-- ai-peer-review-invitation data="ewogICJhcnRpZmFjdCI6ICIvVXNlcnMva3BidXJzb24vLmNvZGV4L3dvcmt0cmVlcy8yMDktcG9ydGFibGUtcmVjb25jaWxpYXRpb24vYWktcGVlci1yZXZpZXcvZG9jcy9zdXBlcnBvd2Vycy9zcGVjcy8yMDI2LTEwLTE2LTE5MC10cnVzdGVkLWxvY2FsLXN0b3JhZ2UtZGVzaWduLm1kIiwKICAicmVzcG9uc2UiOiAiL1VzZXJzL2twYnVyc29uLy5jb2RleC93b3JrdHJlZXMvMjA5LXBvcnRhYmxlLXJlY29uY2lsaWF0aW9uL2FpLXBlZXItcmV2aWV3L2RvY3Mvc3VwZXJwb3dlcnMvcGVlci1yZXZpZXdzLzE5MC1zaW1wbGUtbG9jYWwtaGFuZG9mZi9zcGVjLzIwMjYtMTAtMTYtMjAyNi0xMC0xNi0xOTAtdHJ1c3RlZC1sb2NhbC1zdG9yYWdlLWRlc2lnbi1yZXZpZXctYzExNWQ0MDA4NjVjOTlkM2YyODgzZDNhODBkNzAwMDcvcmV2aWV3LWMxMTVkNDAwODY1Yzk5ZDNmMjg4M2QzYTgwZDcwMDA3LXJldmlld2VyLXJlc3BvbnNlLTEubWQiLAogICJyZXZpZXdfaWQiOiAicmV2aWV3LWMxMTVkNDAwODY1Yzk5ZDNmMjg4M2QzYTgwZDcwMDA3IiwKICAic2NoZW1hIjogImFpLXBlZXItcmV2aWV3Lmludml0YXRpb24tcm91dGluZy92MSIsCiAgIndvcmtzcGFjZSI6ICIvVXNlcnMva3BidXJzb24vLmNvZGV4L3dvcmt0cmVlcy8yMDktcG9ydGFibGUtcmVjb25jaWxpYXRpb24vYWktcGVlci1yZXZpZXcvLnNjcmF0Y2gvcGVlci1yZXZpZXcvcmV2aWV3LWMxMTVkNDAwODY1Yzk5ZDNmMjg4M2QzYTgwZDcwMDA3Igp9Cg" -->

# Reviewer invitation

Review: `review-c115d400865c99d3f2883d3a80d70007`

Mode: `normal`

- Artifact: `/Users/kpburson/.codex/worktrees/209-portable-reconciliation/ai-peer-review/docs/superpowers/specs/2026-10-16-190-trusted-local-storage-design.md`
- Workspace: `/Users/kpburson/.codex/worktrees/209-portable-reconciliation/ai-peer-review/.scratch/peer-review/review-c115d400865c99d3f2883d3a80d70007`
- Response: `/Users/kpburson/.codex/worktrees/209-portable-reconciliation/ai-peer-review/docs/superpowers/peer-reviews/190-simple-local-handoff/spec/2026-10-16-2026-10-16-190-trusted-local-storage-design-review-c115d400865c99d3f2883d3a80d70007/review-c115d400865c99d3f2883d3a80d70007-reviewer-response-1.md`
- Invitation: `/Users/kpburson/.codex/worktrees/209-portable-reconciliation/ai-peer-review/docs/superpowers/peer-reviews/190-simple-local-handoff/spec/2026-10-16-2026-10-16-190-trusted-local-storage-design-review-c115d400865c99d3f2883d3a80d70007/review-c115d400865c99d3f2883d3a80d70007-reviewer-invitation.md`
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

When the project-local broker is active, yield after each handoff; do not poll or repeat wait calls. Inspect `peer-review broker status --json` for authenticated instance state. After a failure, preserve receipts and run `peer-review broker reconcile /Users/kpburson/.codex/worktrees/209-portable-reconciliation/ai-peer-review/.scratch/peer-review/review-c115d400865c99d3f2883d3a80d70007 --json` only when the exact recovery evidence calls for it. A broker failure never silently changes the selected reviewer or transport. If the broker is unavailable for an existing manual review, use the bounded `peer-review status /Users/kpburson/.codex/worktrees/209-portable-reconciliation/ai-peer-review/.scratch/peer-review/review-c115d400865c99d3f2883d3a80d70007 --next` recovery path.

Role: reviewer. Join from a distinct session in the same physical worktree.

Installed join: `peer-review join /Users/kpburson/.codex/worktrees/209-portable-reconciliation/ai-peer-review/docs/superpowers/peer-reviews/190-simple-local-handoff/spec/2026-10-16-2026-10-16-190-trusted-local-storage-design-review-c115d400865c99d3f2883d3a80d70007/review-c115d400865c99d3f2883d3a80d70007-reviewer-invitation.md`

Installed-package join: `npx --no-install ai-peer-review join /Users/kpburson/.codex/worktrees/209-portable-reconciliation/ai-peer-review/docs/superpowers/peer-reviews/190-simple-local-handoff/spec/2026-10-16-2026-10-16-190-trusted-local-storage-design-review-c115d400865c99d3f2883d3a80d70007/review-c115d400865c99d3f2883d3a80d70007-reviewer-invitation.md`

Rules of engagement:

- Edit only the exact pending reviewer response shown above.
- Do not edit the reviewed artifact, create commits, or push.
- Query `peer-review help join` instead of guessing command syntax.

Recovery: `peer-review resume /Users/kpburson/.codex/worktrees/209-portable-reconciliation/ai-peer-review/.scratch/peer-review/review-c115d400865c99d3f2883d3a80d70007`
