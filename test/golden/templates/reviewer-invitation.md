<!-- ai-peer-review-template version="1" digest="sha256:8b80dbd7ab800b458b81166d624449e6f5dca19aa34fca293eabf46b38eb2ba0" -->
<!-- ai-peer-review-invitation data="cGF5bG9hZA" -->

# Reviewer invitation

Review: `review-01`

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
