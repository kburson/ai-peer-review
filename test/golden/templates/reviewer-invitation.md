<!-- ai-peer-review-template version="1" digest="sha256:762a582a5c7ab89ca9755f3129d3bb11db6e67e33b035cc43da714a3bbff4d9a" -->
<!-- ai-peer-review-invitation data="cGF5bG9hZA" -->

# Reviewer invitation

Review: `review-01`

Mode: `normal`

- Artifact: `/repo/docs/example.md`
- Workspace: `/repo/.scratch/peer-review/review-01`
- Response: `/repo/docs/peer-reviews/spec/example/reviewer-response-1.md`
- Invitation: `/repo/docs/peer-reviews/spec/example/reviewer-invitation.md`

Role: reviewer. Join from a distinct session in the same physical worktree.

Installed join: `peer-review join /repo/docs/peer-reviews/spec/example/reviewer-invitation.md`

Zero-install join: `npx --yes ai-peer-review@0.1.0 join /repo/docs/peer-reviews/spec/example/reviewer-invitation.md`

Rules of engagement:

- Edit only the exact pending reviewer response shown above.
- Do not edit the reviewed artifact, create commits, or push.
- Query `peer-review help join` instead of guessing command syntax.

Recovery: `peer-review resume /repo/.scratch/peer-review/review-01`
