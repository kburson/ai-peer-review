---
name: peer-review
description: Run a provider-neutral, integrity-bound AI peer review for a tracked specification or plan.
---

# AI Peer Review

Run `peer-review setup` with an explicit user or project scope, then run
`peer-review doctor` before starting or joining a review. Query
`peer-review help <command>` whenever syntax is uncertain; never guess flags or
state transitions.

Use every generated artifact, workspace, invitation, and response location as
exact absolute paths. Relay only the reviewer invitation in the default
consensus workflow. Do not copy scratch state or raw provider handles into
tracked files.

## Roles and boundaries

The Reviewer Git boundary forbids Git commands, artifact edits, commits,
pushes, and writes outside the exact pending reviewer response and package-owned
scratch transition. The Author Git boundary permits only package-generated,
exact-path protocol commits; inspect status before every submit or finalize.
Keep author and reviewer sessions distinct.

If startup reports `NO-COMMIT TEST MODE`, disclose that mode and its authority
assurance in every handoff. It is test evidence, not normal acceptance evidence.

Manual transport is always available. Resume-only transport may be used only
when doctor validates the provider's official resume command and scratch-only
handle. If delivery fails, leave it pending and use the printed manual recovery
command; never improvise shell composition or an undocumented wake mechanism.
