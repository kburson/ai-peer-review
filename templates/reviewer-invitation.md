<!-- ai-peer-review-template version="{{template_version}}" digest="{{template_digest}}" -->
<!-- ai-peer-review-invitation data="{{invitation_payload}}" -->

# Reviewer invitation

Review: `{{review_id}}`

- Artifact: {{artifact_display}}
- Workspace: {{workspace_display}}
- Response: {{response_display}}
- Invitation: {{invitation_display}}

Role: reviewer. Join from a distinct session in the same physical worktree.

Installed join: {{installed_join_display}}

Zero-install join: {{zero_install_join_display}}

Rules of engagement:

- Edit only the exact pending reviewer response shown above.
- Do not edit the reviewed artifact, create commits, or push.
- Query `peer-review help join` instead of guessing command syntax.

Recovery: {{recovery_display}}
