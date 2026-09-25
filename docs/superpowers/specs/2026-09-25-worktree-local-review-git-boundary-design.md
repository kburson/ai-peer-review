# Worktree-local reviewer Git boundary

Date: 2026-09-25

## Decision

A reviewer turn seals the tracked artifact and the physical worktree that owns
the review. Submission compares the artifact blob and digest, checked-out `HEAD`,
branch, index, and worktree contents with the event-authorized handoff. The
reviewer may edit only the pending response through the package protocol and may
not run Git commands or push.

Git refs outside the checked-out branch are shared by linked worktrees. Their
inventory may be recorded as `refs_digest` for diagnosis and compatibility with
existing events, but a change to that digest alone never invalidates reviewer
submission. This applies to remote tracking refs, other story branches, tags,
Codex snapshots, and other provider bookkeeping refs. A change to the reviewed
branch that changes this worktree's `HEAD` remains blocked.

## Why

The former all-ref seal made independent worktrees depend on one another. A
fetch, snapshot, or commit in another worktree changed `refs_digest` while the
reviewed artifact, `HEAD`, branch, index, and worktree stayed identical. The
reviewer then could not submit, so accepted analysis became draft evidence and
the whole review had to restart. Worktrees are the intended unit of parallel
development; their unrelated refs cannot be a review lock.

The package cannot infer which process changed a shared ref from a digest. A
clone-wide ref lock would serialize otherwise independent reviews and author
commits for the duration of reviewer turns. That is incompatible with concurrent
development and is not an acceptable recovery strategy.

## Compatibility and scope

Existing `refs_digest` event fields remain in place so stored review records
retain their schema and evidence. They are diagnostic, not a submission gate.
An older review blocked solely by ref drift may be retried with a compatible
updated package and its same authorized response and participant identity.
Artifact or worktree drift still requires restoring event-authorized state.

This decision supersedes the clone-wide retained-ref seal and mutation lease in
the concurrency section of
[Project-Local Review Lifecycle and Learning Design](2026-09-12-project-local-review-lifecycle-and-learning-design.md)
and the retained-ref mutation lease in
[Clone-Shared SQLite Authority Projection Design](2026-09-13-31-clone-shared-sqlite-authority-projection-design.md).
Phase 2 may use short SQLite transactions for protocol rows, but it must not
block an author commit in one worktree because a reviewer turn is active in
another. Later experiment arms follow the same worktree-local rule.

The package's reviewer launch permissions remain the preventive control on
reviewer Git commands. In manual transport, the no-Git reviewer rule remains a
participant obligation; the worktree boundary detects local mutations, but
cannot attribute an independent remote ref update to a specific participant.

## Verification

Integration tests must submit successfully after a sibling worktree commit, a
remote tracking ref update, and a snapshot ref creation. They must still reject
changes to the reviewed artifact, checked-out `HEAD`, branch, index, unrelated
local files, protocol paths, and physical worktree identity.
