<!-- ai-peer-review-template version="1" digest="sha256:064952674640611160aff00e947b64de060d4a4cfe7139019eb0f24ee264aa25" -->
<!-- ai-peer-review-invitation data="ewogICJhcnRpZmFjdCI6ICIvVXNlcnMva3BidXJzb24vLmNvZGV4L3dvcmt0cmVlcy8yMDktcG9ydGFibGUtcmVjb25jaWxpYXRpb24vYWktcGVlci1yZXZpZXcvZXZpZGVuY2UvcG9ydGFibGUtcnVudGltZS9wcm9jZXNzLXNvdXJjZS9yZWdpc3RyYXRpb24tcmV2aWV3cy8yMDI2LTEwLTE1LTE5MC1yZXBhaXItd2F2ZTEyLm1kIiwKICAicmVzcG9uc2UiOiAiL1VzZXJzL2twYnVyc29uLy5jb2RleC93b3JrdHJlZXMvMjA5LXBvcnRhYmxlLXJlY29uY2lsaWF0aW9uL2FpLXBlZXItcmV2aWV3L2RvY3Mvc3VwZXJwb3dlcnMvcGVlci1yZXZpZXdzL3NwZWMvMjAyNi0xMC0xNi0yMDI2LTEwLTE1LTE5MC1yZXBhaXItd2F2ZTEyLXJldmlldy0wNmMxNGY5ZjdhZTMxYTE1OTM4MGI0MjBhNDEwNzc2YS9yZXZpZXctMDZjMTRmOWY3YWUzMWExNTkzODBiNDIwYTQxMDc3NmEtcmV2aWV3ZXItcmVzcG9uc2UtMS5tZCIsCiAgInJldmlld19pZCI6ICJyZXZpZXctMDZjMTRmOWY3YWUzMWExNTkzODBiNDIwYTQxMDc3NmEiLAogICJzY2hlbWEiOiAiYWktcGVlci1yZXZpZXcuaW52aXRhdGlvbi1yb3V0aW5nL3YxIiwKICAid29ya3NwYWNlIjogIi9Vc2Vycy9rcGJ1cnNvbi8uY29kZXgvd29ya3RyZWVzLzIwOS1wb3J0YWJsZS1yZWNvbmNpbGlhdGlvbi9haS1wZWVyLXJldmlldy8uc2NyYXRjaC9wZWVyLXJldmlldy9yZXZpZXctMDZjMTRmOWY3YWUzMWExNTkzODBiNDIwYTQxMDc3NmEiCn0K" -->

# Reviewer invitation

Review: `review-06c14f9f7ae31a159380b420a410776a`

Mode: `normal`

- Artifact: `/Users/kpburson/.codex/worktrees/209-portable-reconciliation/ai-peer-review/evidence/portable-runtime/process-source/registration-reviews/2026-10-15-190-repair-wave12.md`
- Workspace: `/Users/kpburson/.codex/worktrees/209-portable-reconciliation/ai-peer-review/.scratch/peer-review/review-06c14f9f7ae31a159380b420a410776a`
- Response: `/Users/kpburson/.codex/worktrees/209-portable-reconciliation/ai-peer-review/docs/superpowers/peer-reviews/spec/2026-10-16-2026-10-15-190-repair-wave12-review-06c14f9f7ae31a159380b420a410776a/review-06c14f9f7ae31a159380b420a410776a-reviewer-response-1.md`
- Invitation: `/Users/kpburson/.codex/worktrees/209-portable-reconciliation/ai-peer-review/docs/superpowers/peer-reviews/spec/2026-10-16-2026-10-15-190-repair-wave12-review-06c14f9f7ae31a159380b420a410776a/review-06c14f9f7ae31a159380b420a410776a-reviewer-invitation.md`
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

When the project-local broker is active, yield after each handoff; do not poll or repeat wait calls. Inspect `peer-review broker status --json` for authenticated instance state. After a failure, preserve receipts and run `peer-review broker reconcile /Users/kpburson/.codex/worktrees/209-portable-reconciliation/ai-peer-review/.scratch/peer-review/review-06c14f9f7ae31a159380b420a410776a --json` only when the exact recovery evidence calls for it. A broker failure never silently changes the selected reviewer or transport. If the broker is unavailable for an existing manual review, use the bounded `peer-review status /Users/kpburson/.codex/worktrees/209-portable-reconciliation/ai-peer-review/.scratch/peer-review/review-06c14f9f7ae31a159380b420a410776a --next` recovery path.

Role: reviewer. Join from a distinct session in the same physical worktree.

Installed join: `peer-review join /Users/kpburson/.codex/worktrees/209-portable-reconciliation/ai-peer-review/docs/superpowers/peer-reviews/spec/2026-10-16-2026-10-15-190-repair-wave12-review-06c14f9f7ae31a159380b420a410776a/review-06c14f9f7ae31a159380b420a410776a-reviewer-invitation.md`

Installed-package join: `npx --no-install ai-peer-review join /Users/kpburson/.codex/worktrees/209-portable-reconciliation/ai-peer-review/docs/superpowers/peer-reviews/spec/2026-10-16-2026-10-15-190-repair-wave12-review-06c14f9f7ae31a159380b420a410776a/review-06c14f9f7ae31a159380b420a410776a-reviewer-invitation.md`

Rules of engagement:

- Edit only the exact pending reviewer response shown above.
- Do not edit the reviewed artifact, create commits, or push.
- Query `peer-review help join` instead of guessing command syntax.

Recovery: `peer-review resume /Users/kpburson/.codex/worktrees/209-portable-reconciliation/ai-peer-review/.scratch/peer-review/review-06c14f9f7ae31a159380b420a410776a`
