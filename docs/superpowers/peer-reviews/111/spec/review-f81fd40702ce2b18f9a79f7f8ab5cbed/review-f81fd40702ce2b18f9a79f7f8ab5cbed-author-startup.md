<!-- ai-peer-review-template version="1" digest="sha256:407c0183bbb626968282060157995fdb989c70593266bae91803b66facb669e2" -->

# Author startup

Review: `review-f81fd40702ce2b18f9a79f7f8ab5cbed`

Mode: `normal`

- Artifact: `/Users/kpburson/.codex/worktrees/e831/ai-peer-review/docs/superpowers/specs/20260927-111-spec.md`
- Workspace: `/Users/kpburson/.codex/worktrees/e831/ai-peer-review/.scratch/peer-review/review-f81fd40702ce2b18f9a79f7f8ab5cbed`
- Response: `/Users/kpburson/.codex/worktrees/e831/ai-peer-review/docs/superpowers/peer-reviews/111/spec/review-f81fd40702ce2b18f9a79f7f8ab5cbed/review-f81fd40702ce2b18f9a79f7f8ab5cbed-reviewer-response-1.md`
- Reviewer invitation: `/Users/kpburson/.codex/worktrees/e831/ai-peer-review/docs/superpowers/peer-reviews/111/spec/review-f81fd40702ce2b18f9a79f7f8ab5cbed/review-f81fd40702ce2b18f9a79f7f8ab5cbed-reviewer-invitation.md`
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

Phased sessions remain event-authoritative. After a non-final acceptance, finalize the current artifact and follow the single `peer-review advance <workspace> <artifact>` action emitted by `status --next`; never infer or skip a phase from chat.

When the project-local broker is active, yield after each handoff; do not poll or repeat wait calls. Inspect `peer-review broker status --json` for authenticated instance state. After a failure, preserve receipts and run `peer-review broker reconcile /Users/kpburson/.codex/worktrees/e831/ai-peer-review/.scratch/peer-review/review-f81fd40702ce2b18f9a79f7f8ab5cbed --json` only when the exact recovery evidence calls for it. A broker failure never silently changes the selected reviewer or transport. If the broker is unavailable for an existing manual review, use the bounded `peer-review status /Users/kpburson/.codex/worktrees/e831/ai-peer-review/.scratch/peer-review/review-f81fd40702ce2b18f9a79f7f8ab5cbed --next` recovery path.

Installed help: `peer-review status --help`

Zero-install help: `npx --yes @kburson/ai-peer-review@0.3.0 status --help`
