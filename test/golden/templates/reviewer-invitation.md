<!-- ai-peer-review-template version="1" digest="sha256:9901816a2120d7bb8c6b3f501e59f03217faec9e5dbafadd145408a1662398b9" -->
<!-- ai-peer-review-invitation data="cGF5bG9hZA" -->

# Reviewer invitation

Review: `review-01`

Mode: `normal`

- Artifact: `/repo/docs/example.md`
- Workspace: `/repo/.scratch/peer-review/review-01`
- Response: `/repo/docs/peer-reviews/spec/example/reviewer-response-1.md`
- Invitation: `/repo/docs/peer-reviews/spec/example/reviewer-invitation.md`
- Reviewer: Claude Opus 5 (claude-opus-5), effort: medium
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

When the project-local broker is active, yield after each handoff; do not poll or repeat wait calls. Inspect `peer-review broker status --json` for authenticated instance state. After a failure, preserve receipts and run `peer-review broker reconcile /repo/.scratch/peer-review/review-01 --json` only when the exact recovery evidence calls for it. A broker failure never silently changes the selected reviewer or transport. If the broker is unavailable for an existing manual review, use the bounded `peer-review status /repo/.scratch/peer-review/review-01 --next` recovery path.

Role: reviewer. Join from a distinct session in the same physical worktree.

Installed join: `peer-review join /repo/docs/peer-reviews/spec/example/reviewer-invitation.md`

Zero-install join: `npx --yes @kburson/ai-peer-review@0.3.0 join /repo/docs/peer-reviews/spec/example/reviewer-invitation.md`

Rules of engagement:

- Edit only the exact pending reviewer response shown above.
- Do not edit the reviewed artifact, create commits, or push.
- Query `peer-review help join` instead of guessing command syntax.

Recovery: `peer-review resume /repo/.scratch/peer-review/review-01`
