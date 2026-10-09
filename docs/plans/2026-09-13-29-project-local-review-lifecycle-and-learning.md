# Project-Local Review Lifecycle and Learning Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> `superpowers:executing-plans` to implement this plan task-by-task. This plan
> is intentionally serial because each phase changes the authority boundary
> consumed by the next phase.

**Goal:** Deliver the accepted project-local review lifecycle and learning
architecture through five independently governed, dependency-ordered phases.

**Architecture:** The root epic branch `codex/planning` is the aggregate
integration authority. Each phase is designed, planned, reviewed, implemented,
verified, and delivered on an isolated child branch rooted at the current epic
head, then merged back before its dependents enter Plan. Tracked JSON and Git
remain durable authority; clone-shared SQLite is a disposable projection.

**Tech Stack:** Node.js 24+, ECMAScript modules, built-in `node:test`, JSON
Schema, Git linked worktrees, SQLite, GitHub Actions, and the provider-neutral
`ai-peer-review` protocol.

**Spec:** `docs/design/2026-09-12-project-local-review-lifecycle-and-learning-design.md`

## Global Constraints

- Preserve reviewer non-mutation, exact-path author Git transactions,
  provider-identity integrity, and fail-closed recovery.
- Keep one complete canonical File Under Review; tracked review evidence stores
  patches and responses, not duplicate complete artifact copies.
- Keep project-local durable authority in tracked repository files.
- Store the disposable SQLite projection under the Git common directory, never
  in a worktree or tracked path.
- Bind every review to the exact committed knowledge snapshot used for all
  turns.
- Candidate lessons remain inactive until independently accepted.
- Experiment arms have no canonical approval or delivery authority.
- Preserve no-commit mode as explicitly non-durable and mutation-free.
- Keep the five issue-numbered phase specifications and plans independently
  reviewable and mergeable.

---

### Task 1: Phase 1: Artifact lifecycle and review-evidence layout

**Issue:** #30

**Files:**

- Read: `docs/design/2026-09-13-30-artifact-lifecycle-review-evidence-design.md`
- Create: `docs/plans/2026-09-13-30-artifact-lifecycle-review-evidence.md`
- Create: `test/integration/project-lifecycle-layout.test.mjs`
- Create or modify: `schemas/*.json`, `src/config/*.mjs`,
  `src/collateral/*.mjs`, `src/manifest/*.mjs`, `src/git/*.mjs`,
  `src/cli/*.mjs`, `src/public-api.mjs`, and package documentation as selected
  by the accepted child plan

**Interfaces:**

- Consumes: current artifact observation, exact-path Git transaction, manifest,
  response, and finalization services.
- Produces: stable artifact/chain identity, tracked project lifecycle layout,
  artifact catalog events, path-history and delivery receipts, deterministic
  indexes, revision patches, terminal amendments, and explicit legacy
  migration seams used by every later phase.

- [ ] Review and accept the Phase 1 specification with a distinct reviewer
  identity, preserving the review record and exact accepted digest.
- [ ] Write and review the issue-numbered Phase 1 implementation plan with
  exact file boundaries, APIs, TDD steps, and compatibility migrations.
- [ ] Implement each accepted plan task test-first on the #30 child branch.
- [ ] Verify every #30 acceptance probe and the complete repository matrix.
- [ ] Deliver #30 to the epic branch with an exact-SHA receipt and close it
  before #31 enters Plan.

**Verification Commands:**

```bash
node --test test/integration/project-lifecycle-layout.test.mjs
npm test
npm run test:slow
npm run lint
npm run format:check
```

### Task 2: Phase 2: Clone-shared SQLite authority projection

**Issue:** #31

**Files:**

- Read: `docs/design/2026-09-13-31-clone-shared-sqlite-authority-projection-design.md`
- Create: `docs/plans/2026-09-13-31-clone-shared-sqlite-authority-projection.md`
- Create: `test/integration/sqlite-projection.test.mjs`
- Create or modify: SQLite location, schema, migration, projection,
  coordination, retained-ref lease, protocol store, recovery, and manifest
  modules selected by the accepted child plan

**Interfaces:**

- Consumes: Phase 1 tracked artifact, review, patch, agreement, catalog, and
  manifest evidence.
- Produces: one Git-common-directory SQLite database, deterministic committed
  evidence materialization, startup reconciliation/rebuild, live session
  coordination, and clone-wide retained-ref mutation leasing consumed by
  Phases 3 through 5.

- [ ] Confirm #30 is Done and the native #31 blocker is satisfied.
- [ ] Review and accept the Phase 2 specification with a distinct reviewer
  identity and retained evidence.
- [ ] Write and review the issue-numbered Phase 2 implementation plan,
  including migrations, WAL discipline, parity cutover, and recovery.
- [ ] Implement each accepted plan task test-first on the #31 child branch.
- [ ] Verify the committed-only projection, cross-worktree lease, recovery,
  and complete protocol parity matrix.
- [ ] Deliver #31 to the epic branch with an exact-SHA receipt and close it
  before #32 enters Plan.

**Verification Commands:**

```bash
node --test test/integration/sqlite-projection.test.mjs
npm test
npm run test:slow
npm run lint
npm run format:check
```

### Task 3: Phase 3: Project-local knowledge retrieval

**Issue:** #32

**Files:**

- Read: `docs/design/2026-09-13-32-project-local-knowledge-retrieval-design.md`
- Create: `docs/plans/2026-09-13-32-project-local-knowledge-retrieval.md`
- Create: `test/integration/knowledge-retrieval.test.mjs`
- Create or modify: knowledge event schema, materializer, committed snapshot,
  policy/scope selection, lexical ranking, context compilation, supplemental
  retrieval, manifest, CLI, and public API modules selected by the child plan

**Interfaces:**

- Consumes: Phase 1 artifact identity and Phase 2 clone-shared committed
  materialized view.
- Produces: append-only knowledge events, exact committed snapshots, explicit
  policy applicability, bounded deterministic context, and complete selection
  receipts used by Phase 4 learning and Phase 5 experiments.

- [ ] Confirm #31 is Done and the native #32 blocker is satisfied.
- [ ] Review and accept the Phase 3 specification with distinct reviewer
  identity and retained evidence.
- [ ] Write and review the issue-numbered Phase 3 implementation plan with
  closed event types, hard eligibility filters, ranking, budgets, and receipts.
- [ ] Implement each accepted plan task test-first on the #32 child branch.
- [ ] Verify deterministic materialization, snapshot isolation, applicability,
  ranking, compiled context, and manifest provenance.
- [ ] Deliver #32 to the epic branch with an exact-SHA receipt and close it
  before either Rank-4 child enters Plan.

**Verification Commands:**

```bash
node --test test/integration/knowledge-retrieval.test.mjs
npm test
npm run test:slow
npm run lint
npm run format:check
```

### Task 4: Phase 4: Defect feedback and governed learning

**Issue:** #33

**Files:**

- Read: `docs/design/2026-09-13-33-defect-feedback-governed-learning-design.md`
- Create: `docs/plans/2026-09-13-33-defect-feedback-governed-learning.md`
- Create: `test/integration/defect-learning.test.mjs`
- Create or modify: defect lineage, assessment, attribution, observation,
  candidate lesson, evaluator/human decision, knowledge lifecycle, quality
  query, CLI, manifest, and public API modules selected by the child plan

**Interfaces:**

- Consumes: Phase 1 lineage receipts, Phase 2 committed projection, Phase 3
  append-only events and pinned knowledge snapshots, and current participant
  identity authority.
- Produces: evidence-cited defect audits, bounded inactive candidates,
  independent lesson decisions, immutable lesson lifecycle events, and
  reproducible review-quality queries.

- [ ] Confirm #32 is Done and the native #33 blocker is satisfied.
- [ ] Review and accept the Phase 4 specification with distinct reviewer
  identity and retained evidence.
- [ ] Write and review the issue-numbered Phase 4 implementation plan with
  explicit fact/inference separation and self-approval refusal.
- [ ] Implement each accepted plan task test-first on the #33 child branch.
- [ ] Verify lineage outcomes, attribution evidence, candidate eligibility,
  independent decisions, snapshot stability, and quality calculations.
- [ ] Deliver #33 to the epic branch with an exact-SHA receipt and close it
  before using the local single-WIP slot for #34.

**Verification Commands:**

```bash
node --test test/integration/defect-learning.test.mjs
npm test
npm run test:slow
npm run lint
npm run format:check
```

### Task 5: Phase 5: Provider-comparison experiments

**Issue:** #34

**Files:**

- Read: `docs/design/2026-09-13-34-provider-comparison-experiments-design.md`
- Create: `docs/plans/2026-09-13-34-provider-comparison-experiments.md`
- Create: `test/integration/provider-experiments.test.mjs`
- Create or modify: experiment schema, controlled-input freezer, arm
  worktree/session orchestration, non-delivery authorization, evidence
  collection, anonymization, comparison metrics/reporting, selection handoff,
  recovery, cleanup, CLI, manifest, and public API modules selected by the plan

**Interfaces:**

- Consumes: Phase 1 artifact identity, Phase 2 clone/worktree coordination, and
  Phase 3 immutable knowledge/context receipts. Phase 4 is not an admission
  dependency.
- Produces: immutable experiment definitions, isolated equivalent arm
  receipts, enforced non-delivery comparisons, reproducible blind evaluation,
  observation-only outputs, and explicit normal-lifecycle handoff.

- [ ] Confirm #31 and #32 are Done and the native #34 blockers are satisfied.
- [ ] Review and accept the Phase 5 specification with distinct reviewer
  identity and retained evidence.
- [ ] Write and review the issue-numbered Phase 5 implementation plan with
  exact controlled inputs, isolation, non-delivery, and recovery transitions.
- [ ] Implement each accepted plan task test-first on the #34 child branch.
- [ ] Verify controlled-input equality, isolated arms, canonical authority
  refusal, blind metrics, observation-only output, interruption, and cleanup.
- [ ] Deliver #34 to the epic branch with an exact-SHA receipt and close it.

**Verification Commands:**

```bash
node --test test/integration/provider-experiments.test.mjs
npm test
npm run test:slow
npm run lint
npm run format:check
```

## Parent Reconciliation

After every child is Done, verify that their delivery receipts and commits are
present on `codex/planning`, review the cross-phase schemas and public APIs for
drift, and run:

```bash
npm test
npm run test:slow
npm run lint
npm run format:check
node scripts/task-tracker/verify-epic-trail.mjs
```

Open or update aggregate PR #35 at the exact epic head, wait for all required
hosted checks, deliver through AITM's provider-action envelope, and close #29
only after the live board confirms #30 through #34 are Done.
