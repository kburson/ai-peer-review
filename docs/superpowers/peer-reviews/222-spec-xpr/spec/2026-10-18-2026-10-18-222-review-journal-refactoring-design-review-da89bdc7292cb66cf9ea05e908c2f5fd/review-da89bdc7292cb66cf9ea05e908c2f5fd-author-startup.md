<!-- ai-peer-review-template version="1" digest="sha256:155e1fc135a1045ea2819117e88031f389655669bed77bf9362969c315ca8998" -->

# Author startup

Review: `review-da89bdc7292cb66cf9ea05e908c2f5fd`

> **LOCAL JOURNAL MODE** — authority assurance: `unavailable`

- Artifact: `/Users/kpburson/.codex/worktrees/aipr-journal-refactoring/ai-peer-review/docs/superpowers/specs/2026-10-18-222-review-journal-refactoring-design.md`
- Workspace: `/Users/kpburson/.codex/worktrees/aipr-journal-refactoring/ai-peer-review/.scratch/peer-review/review-da89bdc7292cb66cf9ea05e908c2f5fd`
- Response: `/Users/kpburson/.codex/worktrees/aipr-journal-refactoring/ai-peer-review/docs/superpowers/peer-reviews/222-spec-xpr/spec/2026-10-18-2026-10-18-222-review-journal-refactoring-design-review-da89bdc7292cb66cf9ea05e908c2f5fd/review-da89bdc7292cb66cf9ea05e908c2f5fd-reviewer-response-1.md`
- Reviewer invitation: `/Users/kpburson/.codex/worktrees/aipr-journal-refactoring/ai-peer-review/docs/superpowers/peer-reviews/222-spec-xpr/spec/2026-10-18-2026-10-18-222-review-journal-refactoring-design-review-da89bdc7292cb66cf9ea05e908c2f5fd/review-da89bdc7292cb66cf9ea05e908c2f5fd-reviewer-invitation.md`
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

## Role write boundaries

Author writes only `/Users/kpburson/.codex/worktrees/aipr-journal-refactoring/ai-peer-review/docs/superpowers/specs/2026-10-18-222-review-journal-refactoring-design.md` and the exact current author response returned by the handoff. The response listed above belongs to the reviewer; do not edit it. Reviewer writes only its exact current reviewer response and never the artifact.

Neither participant writes other tracked, untracked, ignored or new files, Git metadata, automation-owned coordination records, another response or anything outside the project. The automation's protocol commands own its coordination writes. Do not create commits or push during a review turn.

Existing human-launched sessions are instruction-bound; this handoff does not change their host permissions or claim OS isolation. Use existing provider write controls where available. An author without exact automated artifact/response scope continues in its existing human-launched session.

## Project-local broker and recovery

Phased sessions remain event-authoritative. After a non-final acceptance, finalize the current artifact and follow the single `peer-review advance <workspace> <artifact>` action emitted by `status --next`; never infer or skip a phase from chat.

When the project-local broker is active, yield after each handoff; do not poll or repeat wait calls. Inspect `peer-review broker status --json` for authenticated instance state. After a failure, preserve receipts and run `peer-review broker reconcile /Users/kpburson/.codex/worktrees/aipr-journal-refactoring/ai-peer-review/.scratch/peer-review/review-da89bdc7292cb66cf9ea05e908c2f5fd --json` only when the exact recovery evidence calls for it. A broker failure never silently changes the selected reviewer or transport. If the broker is unavailable for an existing manual review, use the bounded `peer-review status /Users/kpburson/.codex/worktrees/aipr-journal-refactoring/ai-peer-review/.scratch/peer-review/review-da89bdc7292cb66cf9ea05e908c2f5fd --next` recovery path.

Installed help: `peer-review status --help`

Installed-package help: `npx --no-install ai-peer-review status --help`
