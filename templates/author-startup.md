<!-- ai-peer-review-template version="{{template_version}}" digest="{{template_digest}}" -->

# Author startup

Review: `{{review_id}}`

{{mode_banner}}

- Artifact: {{artifact_display}}
- Workspace: {{workspace_display}}
- Response: {{response_display}}
- Reviewer invitation: {{invitation_display}}

## Communication policy (v1)

Keep all peer-review chat messages terse. Put complete review analysis, findings, dispositions, revised prose, rationale, decisions, and verification evidence in the generated durable review documents.

Chat may contain only:

- a short operational status;
- a pointer to the relevant durable document;
- the exact next action; or
- a concise blocker requiring human action.

Read the relevant durable reviewer or author response document; do not rely on a chat summary. Do not paste findings, dispositions, revised prose, verification output, or other durable document content into chat unless the human explicitly requests it.

“Terse chat” does not mean terse review evidence. Durable reviewer and author response documents remain complete, self-contained, and authoritative.

Installed help: `peer-review status --help`

Zero-install help: `npx --yes ai-peer-review@0.2.2 status --help`
