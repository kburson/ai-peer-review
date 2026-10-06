# Phase 2: Clone-Shared SQLite Authority Projection

<!-- cspell:words worktree worktrees SQLite checkpointed reconstructable transactionally cutover unreconstructable unauditable rescan -->

## Document status

- **Date:** 2026-09-13
- **Status:** Draft for written human and peer review
- **Owner:** `ai-peer-review`
- **Issue:** [#31](https://github.com/kburson/ai-peer-review/issues/31)
- **Parent feature epic:**
  [#29](https://github.com/kburson/ai-peer-review/issues/29)
- **Phase:** 2 of 5
- **Depends on:** Phase 1, [#30](https://github.com/kburson/ai-peer-review/issues/30)
- **Scope:** Design only; this document does not authorize implementation or
  replacement of current protocol authority
- **Concurrency update:** The
  [worktree-local reviewer boundary](2026-09-25-worktree-local-review-git-boundary-design.md)
  replaces the former clone-wide mutation lease.

## Source authority

This specification atomically extracts Phase 2 from the accepted
[Project-Local Review Lifecycle and Learning Design](2026-09-12-project-local-review-lifecycle-and-learning-design.md),
whose accepted digest is
`sha256:0b65a538437dc2ef2bb86533e991c90b945dacb9fbc7cbe16ad277f8f709fd27`.
The digest identifies the historical reviewed baseline. The umbrella design
and accepted Phase 1 contract remain binding except where the later
worktree-local boundary explicitly supersedes clone-wide ref coordination.

## Summary

Phase 2 replaces ignored per-review scratch event authority for new reviews
with one clone-scoped SQLite database shared by all linked worktrees. SQLite
provides efficient protocol coordination and materialized reads, but it remains
disposable. Tracked Phase 1 manifests, responses, patches, agreements,
amendments, and catalog events remain durable authority.

The phase preserves the
[worktree-local reviewer boundary](2026-09-25-worktree-local-review-git-boundary-design.md).
An author commit in one worktree must not invalidate a reviewer turn in another.

## Goals

- Resolve one protected database per Git clone, not per worktree.
- Materialize committed artifact and completed review evidence deterministically.
- Coordinate live review state without holding database transactions over agent work.
- Pin every review to branch-local committed evidence without cross-branch leakage.
- Rebuild derived state safely after database deletion or compatible corruption.
- Preserve active state or fail closed when rebuilding would discard it.
- Permit independent author commits and reviewer turns across linked worktrees.
- Prove current protocol semantics before new reviews omit scratch event authority.

## Non-goals

- Making SQLite durable, tracked, remotely shared, or approved for secrets.
- Treating uncommitted or branch-only rows as committed authority.
- Implementing knowledge retrieval; Phase 3 owns prompt context.
- Implementing defect learning or experiments beyond required storage seams.
- Migrating a live legacy review mid-protocol.
- Holding a transaction during provider calls or reasoning.

## Database location and permissions

The package resolves the repository root and `git rev-parse --git-common-dir`,
then creates:

```text
<git-common-dir>/peer-review/peer-review.sqlite
```

WAL and shared-memory files live beside it. The directory and database use
restrictive local permissions. The resolver rejects symlink or path traversal
that escapes the canonical Git common directory. The database is never staged,
committed, copied into a linked worktree, or treated as secret storage.

Each clone owns an independent projection. Fresh and ephemeral clones rebuild
from Git. Database records identify `worktreeId`, `reviewId`, operation ID, and
snapshot identity rather than assuming one checkout.

## Schema boundary

The first schema must support logical equivalents of:

```text
database_metadata
ingested_events
knowledge_cases
knowledge_scopes
knowledge_snapshots
snapshot_events
knowledge_retrievals
worktrees
review_sessions
review_participants
review_turns
review_pending_actions
review_file_receipts
review_leases
```

Phase 2 may create empty knowledge-oriented tables so Phase 3 can migrate them
compatibly, but it must not synthesize knowledge. The implementation plan may
normalize the schema further. Every schema change carries a version, ordered
migration, compatibility range, and transactionally recorded result.

The semantic rule is fixed:

- knowledge rows derive from tracked canonical events;
- completed review rows derive from tracked Phase 1 evidence;
- branch-local views include only evidence reachable from the bound commit;
- live provider handles and no-commit artifact bytes may be transient; and
- no SQLite row can overrule contradictory tracked evidence.

## Materialization and startup

Every new peer-review instantiation synchronizes before session creation:

1. resolve worktree, Git directory, common directory, branch, and `HEAD`;
2. resolve committed Phase 1 evidence and the knowledge tree object, if present;
3. open SQLite and validate metadata, schema, permissions, and migration state;
4. acquire a short database write lease;
5. reuse an existing projection when authoritative tree IDs are already indexed;
6. otherwise enumerate committed blobs, validate schemas and digests, and ingest
   only missing evidence in a transaction;
7. materialize exact reachability and snapshot membership;
8. release the write lease; and
9. create or resume the review session against the verified projection.

The ingestion manifest records event ID, relative path, Git blob, SHA-256
digest, schema version, reachability basis, and result. Enumeration order cannot
change the materialized result. An existing immutable ID with different bytes
fails closed.

The database may know about several branches simultaneously. Every query that
can influence a review must join through that review's pinned committed
membership. Filtering a global result after ranking or protocol selection is
insufficient.

## Live protocol authority transition

The current `.scratch/peer-review/<review-id>/events.jsonl` reducer remains the
behavioral oracle until parity is proven. The transition sequence is:

1. define SQLite operations and manifest checkpoints for every current event;
2. ingest retained golden sessions into both reducers;
3. compare state, permitted actions, recovery, and rendered evidence;
4. add interruption fixtures around every write boundary;
5. enable SQLite authority for newly started reviews only; and
6. leave already active legacy reviews on their original store until terminal
   completion or explicit abandonment.

Parity covers reviewer isolation, author commit ownership, claims, grants,
supplements, budgets, acceptance, override, abandonment, participant
replacement, recovery, and no-commit labeling. A mismatch blocks cutover.

## Worktree-local reviewer boundary

Protocol rows may use the clone-shared SQLite database, but reviewer Git
authority remains scoped to the review's physical worktree. The package seals
the artifact, checked-out `HEAD`, branch, index, and worktree content. A
`refs_digest` may be retained for diagnosis and compatibility; its change
alone cannot block submission. Other worktrees may commit, fetch, and create
refs during a sealed reviewer turn, including while its provider is dormant or
delivery is interrupted.

Author submission still performs its exact-path Git transaction and records
the next worktree boundary. SQLite transactions protect protocol rows and
idempotent operation IDs; they do not form a clone-wide Git mutation lease.
This rule also applies to experiment-arm commits in Phase 5.

## Transaction discipline

SQLite uses WAL, short transactions, a bounded busy timeout, foreign keys, and
idempotent operation IDs. Provider calls, user waits, agent reasoning, filesystem
rendering, and Git operations do not hold an open database transaction.

Filesystem, Git, and SQLite writes are not described as one atomic transaction.
Instead, pending actions advance through reserved, written, and verified states
and are reconciled against Phase 1 manifest receipts. A retry reuses identical
completed work and refuses conflicts.

## Recovery and rebuild

If the database is absent and no unreconstructable active state exists, startup
creates a new database and replays committed evidence. Compatible corruption or
derived-table mismatch may trigger a quarantined rebuild that leaves tracked
files untouched.

An incompatible schema, corrupt active session, missing transient no-commit
bytes, or unresolved lease cannot be silently rebuilt away. The affected review
enters intervention-required state with one exact recovery action. Other valid
reviews and committed evidence remain available where isolation can be proven.

Deleting SQLite may lose provider handles, leases that have no durable
successor, and uncommitted no-commit snapshots. It must never erase or make
unauditable a durably completed response, patch, agreement, amendment, catalog
event, or review manifest.

A cleanup operation may remove completed session rows, caches, and derived
indexes. It cannot delete active rows, Git objects, tracked files, or evidence
needed to rebuild another row.

## No-commit behavior

No-commit sessions may store transient FUR bytes as SQLite BLOBs and use normal
row-level coordination. Their rows are explicitly non-production. They cannot
materialize approval, delivery, artifact catalog, human index, or committed
knowledge authority. Losing transient bytes interrupts the test honestly; it
does not promote any partial result.

## Error handling

Phase 2 must provide stable errors for at least:

- common-directory escape or unsupported Git layout;
- database permission, open, schema, or migration failure;
- immutable evidence rewritten under the same identity;
- projection membership or cross-branch leakage;
- database busy timeout or conflicting mutation in the same worktree;
- unexpected artifact, `HEAD`, branch, index, or local worktree change;
- rebuild blocked by unreconstructable active state; and
- conflicting pending operation or durable receipt.

Every failure preserves existing bytes and reports one recovery action. No
automatic repair may overwrite tracked evidence, clear a live reviewer seal, or
discard an active no-commit snapshot while claiming success.

## Implementation seams

The plan should isolate:

- Git common-directory and protected database path resolution;
- database open, migration, transaction, and integrity services;
- committed evidence ingestion and deterministic materialization;
- worktree and snapshot membership;
- SQLite-backed protocol store implementing the current store contract;
- manifest-to-database reconciliation;
- worktree-local reviewer boundary and diagnostic shared-ref inventory; and
- cleanup, rebuild, and diagnostic CLI surfaces.

`src/protocol/events.mjs`, `reducer.mjs`, `service.mjs`, and `store.mjs` define
current behavior. `src/git/repository.mjs` and `transaction.mjs` define current
Git safety. The plan must preserve public CLI and API semantics while replacing
the backing store behind a deliberate feature gate.

## Verification strategy

The Phase 2 plan must include:

- common-directory resolution from a main checkout and several linked worktrees;
- restrictive permissions and proof that no database files appear in Git status;
- schema creation, ordered migration, busy timeout, WAL, and integrity checks;
- fresh rebuild, reuse without content rescan, and incremental ingestion;
- deletion, compatible corruption, and incompatible active-state recovery;
- deterministic committed-only projection across divergent branches;
- concurrent row-isolated reviews without ID collision;
- acceptance of a second worktree's commit during every sealed-interval state;
- worktree boundary continuity across process loss and interrupted delivery;
- rejection of artifact, `HEAD`, branch, index, and local worktree drift;
- parity fixtures for every current reducer state and recovery result; and
- no-commit isolation before and after SQLite loss.

The issue-level targeted verifier is
`test/integration/sqlite-projection.test.mjs`; the implementation plan may split
fixtures while preserving the named acceptance probes in #31.

## Acceptance criteria

Phase 2 is ready for implementation planning when peer review agrees that:

1. all worktrees in a clone resolve one protected, untracked database;
2. committed evidence deterministically controls every durable projection;
3. branch-only and uncommitted rows cannot leak across pinned membership;
4. deletion or compatible corruption rebuilds without durable evidence loss;
5. incompatible active-state recovery fails closed with exact guidance;
6. provider calls and reasoning hold neither database nor Git mutation locks;
7. sealed reviewer intervals permit independent commits in other worktrees;
8. worktree-local boundary protection survives dormant or interrupted providers;
9. current protocol and no-commit semantics have golden parity; and
10. active legacy reviews are never migrated mid-protocol.

## Final decision

Phase 2 makes SQLite the clone-local coordination and projection engine for new
reviews only after parity proof. Tracked Phase 1 evidence remains durable
authority. Worktree-local Git boundaries and short SQLite transactions permit
parallel development across linked worktrees.
