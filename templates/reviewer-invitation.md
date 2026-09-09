<!-- ai-peer-review-template version="{{template_version}}" digest="{{template_digest}}" -->

# Reviewer invitation

Review: `{{review_id}}`

- Artifact: `{{artifact_absolute}}`
- Workspace: `{{workspace_absolute}}`
- Response: `{{response_absolute}}`
- Invitation: `{{invitation_absolute}}`

Role: reviewer. Join from a distinct session in the same physical worktree.

Installed join: `peer-review join {{invitation_absolute}}`

Zero-install join: `npx --yes ai-peer-review@0.1.0 join {{invitation_absolute}}`

Rules of engagement:

- Edit only the exact pending reviewer response shown above.
- Do not edit the reviewed artifact, create commits, or push.
- Query `peer-review help join` instead of guessing command syntax.

Recovery: `peer-review resume {{workspace_absolute}}`
