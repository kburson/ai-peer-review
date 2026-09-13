# Artifact Lifecycle and Review-Evidence Implementation Plan

<!-- cspell:words ENOENT journaled -->

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> `superpowers:executing-plans` to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking. Execute the five governed child tasks
> serially because each one consumes authority established by its predecessor.

**Goal:** Add an explicitly enabled, project-local artifact lifecycle that keeps
one canonical specification or plan, compact digest-verifiable review evidence,
immutable terminal records, deterministic indexes, and safe legacy migration.

**Architecture:** Focused `src/lifecycle` modules own closed schemas, catalog
materialization, indexes, lifecycle transitions, patch evidence, checkpoints,
amendments, and migration. Existing configuration, collateral, and Git adapters
remain compatibility seams; CLI and public API modules only translate inputs
into lifecycle-service calls. Normal mode uses the existing exact-path Git
transaction boundary, while no-commit mode returns isolated test evidence and
does not invoke lifecycle mutation services.

**Tech Stack:** Node.js 24+, ECMAScript modules, built-in `node:test`, JSON
Schema draft 2020-12, Git plumbing, SHA-256, and the existing `AprError` and
exact-path transaction primitives.

**Spec:** `docs/design/2026-09-13-30-artifact-lifecycle-review-evidence-design.md`

## Global Constraints

- Project lifecycle setup is opt-in; an unconfigured project retains current
  paths and behavior.
- Exactly one complete File Under Review exists in each commit.
- Opaque IDs and SHA-256 digests establish identity; names and dates only
  organize storage.
- Lifecycle (`proposed`, `approved`, `delivered`) and disposition (`active`,
  `abandoned`, `superseded`) remain separate.
- Approved bytes are immutable; substantive edits create a successor artifact
  in the same chain.
- A plan retains its exact `sourceArtifactId` even after a successor
  specification is approved.
- Every normal author revision creates reproducible patch evidence; an unchanged
  revision has an explicit deterministic empty transition.
- Manifest evidence uses C1 then C2 ordering and never claims its own commit.
- Terminal corrections append amendments; terminal files are never rewritten.
- No-commit mode changes no lifecycle path, production record, index, `HEAD`,
  or Git index.
- Legacy migration is explicit, dry-run-first, collision-safe, byte-preserving,
  digest-verified, and receipt-backed.
- Phase 1 retains scratch-event live protocol authority; SQLite remains Phase 2.
- Before execution, run `npx aitm split-plan 30 --confirm` against this plan to
  create five governed child issues. Each task executes only after its child is
  dependency-ready, bound in its recorded worktree, and carrying the Phase 1
  plan/spec pins.
- Each implementation commit belongs to the currently bound child issue. The
  child pickup and commit-trace evidence, not a `[#30]` suffix, establish
  authority and epic-trail provenance.

---

### Task 1: Closed project configuration and artifact catalog foundations

**Files:**

- Create: `schemas/project-lifecycle-config-v1.json`
- Create: `schemas/artifact-record-v1.json`
- Create: `schemas/lifecycle-amendment-v1.json`
- Create: `schemas/review-layout-v1.json`
- Create: `src/lifecycle/canonical-json.mjs`
- Create: `src/lifecycle/config.mjs`
- Create: `src/lifecycle/catalog.mjs`
- Create: `src/lifecycle/layout.mjs`
- Modify: `src/config/setup.mjs`
- Modify: `src/config/load.mjs`
- Modify: `src/config/guards.mjs`
- Modify: `src/collateral/paths.mjs`
- Modify: `src/git/transaction.mjs`
- Modify: `src/public-api.mjs`
- Test: `test/unit/project-config.test.mjs`
- Test: `test/unit/artifact-catalog.test.mjs`
- Test: `test/unit/lifecycle-layout.test.mjs`
- Test: `test/integration/git-transaction.test.mjs`
- Create: `test/helpers/lifecycle-fixture.mjs`

**Interfaces:**

- Consumes: `resolveContainedPath(root, candidate, label)` and `AprError`.
- Produces: `canonicalJson(value) -> string`,
  `loadLifecycleConfig({ root }) -> null | ProjectLifecycleConfig`,
  `planLifecycleSetup({ root, enabled, clock }) -> SetupPlan`,
  `applyLifecycleSetup(plan) -> SetupReceipt`,
  `resolveLifecycleReviewPaths(input) -> LifecycleReviewPaths`,
  `pinLifecycleLayout(input) -> ReviewLayoutAuthority`,
  `validateArtifactRecord(value) -> ArtifactRecord`,
  `materializeCatalog(records) -> ArtifactCatalog`,
  `loadCommittedCatalog({ root, head }) -> ArtifactCatalog`,
  `createArtifactRecord(input) -> ArtifactRecord`, and
  `appendArtifactEvent(record, event) -> ArtifactRecord`.
- Extends Git transactions with
  `sealPathOperation({ path, before, after }) -> SealedPathOperation` and
  `commitExactOperation(repository, request, message, trailers) -> CommitReceipt`.
  `before` and `after` are either `null` or `{ bytes: Buffer, digest, mode }`;
  their combination defines create, update, or delete.
- Test helpers produce
  `createLifecycleFixture(options) -> { root, clock, ids, adapters }`,
  `snapshotRepository(root) -> RepositorySnapshot`,
  `stopAfter(checkpoint) -> checkpoint callback`, and fixture builders for
  normal, phased, no-commit, successor, delivery, and migration cases. Every
  example below uses these helpers or a named public interface from its task.

- [ ] **Step 1: Write failing closed-config tests**

  Create fixtures that prove missing config returns `null`, explicit enabled
  config resolves owned roots, a second identical setup is a no-op, path escape
  fails with `APR_PATH_OUTSIDE_REPOSITORY`, and an unknown field fails with
  `APR_LIFECYCLE_CONFIG_INVALID`.

  ```js
  test('project lifecycle setup is explicit and idempotent', () => {
    assert.equal(loadLifecycleConfig({ root }), null);
    const first = planLifecycleSetup({ root, enabled: true, clock });
    assert.equal(first.changed, true);
    applyLifecycleSetup(first);
    assert.equal(planLifecycleSetup({ root, enabled: true, clock }).changed, false);
  });
  ```

- [ ] **Step 2: Run the config tests and confirm the missing-module failure**

  Run: `node --test test/unit/project-config.test.mjs`

  Expected: FAIL because `src/lifecycle/config.mjs` does not exist.

- [ ] **Step 3: Define and load the closed lifecycle configuration**

  The schema requires exactly these version-1 keys and rejects unknown fields:

  ```json
  {
    "schema": "ai-peer-review.project-lifecycle/v1",
    "enabled": true,
    "artifacts_root": ".peer-review/artifacts",
    "reviews_root": ".peer-review/reviews",
    "amendments_root": ".peer-review/amendments",
    "documents_root": "docs/superpowers"
  }
  ```

  `loadLifecycleConfig` returns `null` only for `ENOENT`, validates exact keys,
  resolves every configured path through `resolveContainedPath`, and freezes the
  returned value. Extend project setup with an explicit `--lifecycle-layout`
  input; do not enable it from ordinary `setup --scope project`.

- [ ] **Step 4: Run the config tests and confirm they pass**

  Run: `node --test test/unit/project-config.test.mjs`

  Expected: PASS with no writes outside the fixture repository.

- [ ] **Step 5: Write failing artifact identity and lineage tests**

  Cover closed fields, duplicate ID with different bytes, canonical key order,
  creation, path history, lifecycle/disposition separation, exact source-spec
  binding, successor lineage, delivery receipt append, and terminal amendment.

  ```js
  const plan = createArtifactRecord({
    artifactId: 'artifact-plan-001',
    chainId: 'chain-001',
    artifactKind: 'plan',
    sourceArtifactId: 'artifact-spec-001',
    path: 'docs/superpowers/plans/proposed/2026/09/plan.md',
    digest: digest(planBytes),
    at: now,
  });
  assert.equal(plan.source_artifact_id, 'artifact-spec-001');
  assert.equal(plan.lifecycle, 'proposed');
  assert.equal(plan.disposition, 'active');
  ```

- [ ] **Step 6: Run the catalog tests and confirm the missing exports fail**

  Run: `node --test test/unit/artifact-catalog.test.mjs`

  Expected: FAIL because the catalog functions are not implemented.

- [ ] **Step 7: Implement canonical records and append-only events**

  Store a materialized closed record with immutable identity and an ordered
  `events` array. Validate IDs with `^[A-Za-z0-9][A-Za-z0-9._-]*$`, digests with
  `^sha256:[0-9a-f]{64}$`, persisted repository-relative paths resolved to
  frozen absolute runtime paths through the containment helper, monotonically
  increasing timestamps, legal lifecycle transitions, and event-specific
  closed payloads.

  ```js
  export function canonicalJson(value) {
    const order = (entry) =>
      Array.isArray(entry)
        ? entry.map(order)
        : entry && typeof entry === 'object'
          ? Object.fromEntries(
              Object.keys(entry)
                .sort()
                .map((key) => [key, order(entry[key])])
            )
          : entry;
    return `${JSON.stringify(order(value), null, 2)}\n`;
  }
  ```

  `appendArtifactEvent` returns a new frozen record. It refuses a path or digest
  replacement that is not represented by a legal event and refuses edits after
  approved/delivered except `delivery-recorded`, `disposition-changed`, and
  `amendment-recorded`.

- [ ] **Step 8: Write and run failing exact-transaction tests**

  Before the combined run, add failing transaction cases for create, update,
  delete, rename expressed as one delete plus one create, executable-bit
  preservation, changed `HEAD`, owned staged overlap, unrelated staged bytes,
  and interruptions before/after staging, commit, and receipt publication.
  Confirm the delete and second-operation cases fail against the current
  `commitExactPaths` implementation.

  Run:
  `node --test test/integration/git-transaction.test.mjs --test-name-pattern "lifecycle operation"`

  Expected: FAIL on delete sealing and distinct C1/C2 journal behavior.

- [ ] **Step 9: Implement operation-scoped exact Git transactions**

  Add a closed request with `operation_id`, `operation_kind`, `expected_head`,
  and sealed create/update/delete entries. Journal it at
  `git rev-parse --git-path ai-peer-review/transactions/<operation-id>.json`.
  Require a safe opaque operation ID and include the complete request digest in
  the journal. For delete, verify the before bytes/mode at `expected_head`, stage
  absence, and require the path to be absent from the created commit. For create
  and update, verify planned bytes and mode in the working tree, index, and
  commit. A rename is one sealed delete and one sealed create with equal bytes.

  Preserve `commitExactPaths` and its old review/turn journal contract as a
  compatibility wrapper. New lifecycle callers must use distinct IDs such as
  `review-123:revision:1:evidence` and
  `review-123:revision:1:checkpoint`, which permits C1 and C2 to carry different
  requests without journal collision. Exact retries verify ancestry, complete
  tree delta, modes, outside-index snapshot, and request digest before reuse.
  Partial or conflicting evidence remains untouched and raises
  `APR_GIT_RECOVERY_INVALID`.

- [ ] **Step 10: Write failing review-layout and production-loader tests**

  Cover the exact configured directory/file names, zero-revision manifest,
  padded response numbers, custom contained roots, legacy/custom
  `.ai-peer-review.json` coexistence, and config changes after review creation.
  Prove a valid-looking dirty or untracked artifact record is excluded from
  production readiness and that only normal-mode catalog records read from the
  pinned committed tree are eligible.

  ```js
  const authority = pinLifecycleLayout({ root, reviewId: 'review-123', clock });
  assert.equal(
    authority.paths.manifest,
    '.peer-review/reviews/2026/09/review-123/review-manifest.json'
  );
  assert.equal(
    authority.paths.reviewerResponse(1),
    '.peer-review/reviews/2026/09/review-123/reviewer-response-001.md'
  );
  ```

- [ ] **Step 11: Implement pinned layout authority and committed catalog reads**

  When lifecycle config is enabled, resolve and pin its schema version, roots,
  exact file map, and config digest in the `review-created` startup authority.
  The file map uses `review-manifest.json`, `author-handoff.md`,
  `reviewer-invitation.md`, padded response names, revision patches, and
  `terminal-agreement.json`. Join, submit, resume, finalize, and recover consume
  that immutable map rather than re-reading current config. Existing active
  reviews without the pin continue through `resolveReviewPaths`; enabling or
  changing setup never migrates them implicitly.

  `loadCommittedCatalog` reads config and artifact records with Git tree plumbing
  at the supplied `head` and repository-relative path. It accepts only committed
  normal-mode events, validates every closed schema/path/digest, and never
  substitutes working-tree bytes. Pure planners may render candidate records,
  but only this loader feeds production readiness and delivery decisions.

- [ ] **Step 12: Run all foundation, layout, and transaction tests**

  Run:
  `node --test test/unit/project-config.test.mjs test/unit/artifact-catalog.test.mjs test/unit/lifecycle-layout.test.mjs test/integration/git-transaction.test.mjs test/integration/setup-doctor.test.mjs`

  Expected: PASS.

- [ ] **Step 13: Export stable foundation APIs and commit**

  Add only the documented lifecycle functions to `src/public-api.mjs`.

  ```bash
  git add schemas/project-lifecycle-config-v1.json \
    schemas/artifact-record-v1.json schemas/lifecycle-amendment-v1.json \
    schemas/review-layout-v1.json \
    src/lifecycle/canonical-json.mjs src/lifecycle/config.mjs \
    src/lifecycle/catalog.mjs src/lifecycle/layout.mjs src/config/setup.mjs \
    src/config/load.mjs src/config/guards.mjs src/collateral/paths.mjs \
    src/git/transaction.mjs src/public-api.mjs \
    test/unit/project-config.test.mjs test/unit/artifact-catalog.test.mjs \
    test/unit/lifecycle-layout.test.mjs test/integration/git-transaction.test.mjs \
    test/helpers/lifecycle-fixture.mjs
  git commit -m "feat: add lifecycle authority foundations"
  ```

### Task 2: Normal intake and deterministic human indexes

**Files:**

- Create: `schemas/lifecycle-review-manifest-v1.json`
- Create: `schemas/intake-receipt-v1.json`
- Create: `src/lifecycle/indexes.mjs`
- Create: `src/lifecycle/intake.mjs`
- Modify: `src/collateral/paths.mjs`
- Modify: `src/cli/parse.mjs`
- Modify: `src/cli/run.mjs`
- Modify: `src/cli/help-data.mjs`
- Modify: `src/public-api.mjs`
- Test: `test/unit/lifecycle-index.test.mjs`
- Test: `test/integration/artifact-intake.test.mjs`
- Test: `test/integration/project-lifecycle-layout.test.mjs`
- Test: `test/golden/help.test.mjs`
- Modify: `test/golden/help/all.sha256.txt`

**Interfaces:**

- Consumes: Task 1 configuration, committed catalog, pinned layout, and
  operation-scoped exact transaction APIs.
- Produces: `renderLifecycleIndexes({ config, catalog, readBytes }) -> Map`,
  `checkLifecycleIndexes({ root, head }) -> IndexCheckReceipt`,
  `resolvePlanSource({ catalog, sourceArtifactId }) -> ApprovedSpecAuthority`,
  `planArtifactIntake(input) -> IntakePlan`, and
  `applyArtifactIntake(plan, adapters) -> IntakeReceipt`, plus
  `startReviewWithLifecycle(input, adapters) -> ReviewStartupReceipt` as the
  defined integration entry point used by CLI `start`.

- [ ] **Step 1: Write failing deterministic index tests**

  Cover empty indexes, all six readiness groups, spec-before-plan ordering,
  stable chain/artifact tie-breakers, exact source-spec binding after a successor
  spec, inactive records, digest drift, and byte-identical repeated rendering.

  ```js
  const first = renderLifecycleIndexes({ config, catalog, readBytes });
  const second = renderLifecycleIndexes({ config, catalog, readBytes });
  assert.deepEqual([...first], [...second]);
  assert.match(first.get('docs/superpowers/plans/INDEX.md'), /artifact-plan-001/);
  ```

- [ ] **Step 2: Run the index test and confirm it fails**

  Run: `node --test test/unit/lifecycle-index.test.mjs`

  Expected: FAIL because `renderLifecycleIndexes` is missing.

- [ ] **Step 3: Implement catalog-derived indexes**

  Render `docs/superpowers/INDEX.md`, `specs/INDEX.md`, and `plans/INDEX.md`
  from validated catalog records. Evaluate predicates in this order:
  1. `needs-attention`: invalid schema, path/digest drift, or ambiguous current
     lineage;
  2. `inactive`: disposition is abandoned or superseded;
  3. `delivered`: approved active artifact has a verified delivery event;
  4. `planning-in-progress`: approved active spec has one active proposed plan;
  5. `ready-for-planning`: approved active spec has no planning delivery and no
     active proposed plan; and
  6. `ready-for-backlog`: approved active plan has no hydration delivery.

  Display these group keys in order:
  `needs-attention`, `ready-for-planning`, `planning-in-progress`,
  `ready-for-backlog`, `delivered`, `inactive`. A current file whose digest
  differs from its record raises `APR_ARTIFACT_DIGEST_DRIFT` and is never used
  to rewrite the record. Add `peer-review lifecycle indexes --check`, which
  loads the committed catalog, regenerates all three projections, compares them
  byte-for-byte with `HEAD`, and exits nonzero on drift for consumer-project CI.

- [ ] **Step 4: Run the index tests and confirm they pass**

  Run: `node --test test/unit/lifecycle-index.test.mjs`

  Expected: PASS.

- [ ] **Step 5: Write failing intake and no-commit tests**

  Build fixture repositories for a committed root specification, an already
  proposed artifact, an outside-layout artifact, an untracked file, a dirty
  artifact, an approved matching artifact, an approved drifting artifact, a
  path collision, unrelated staged content, and no-commit mode.

  ```js
  const before = snapshotRepository(root);
  const receipt = startReviewWithLifecycle({ root, artifactPath, noCommit: true });
  assert.equal(receipt.state, 'test-intake');
  assert.deepEqual(snapshotRepository(root), before);
  ```

- [ ] **Step 6: Run intake tests and confirm missing behavior fails**

  Run:
  `node --test test/integration/artifact-intake.test.mjs --test-name-pattern "normal intake|no-commit"`

  Expected: FAIL before the intake service and CLI adapter exist.

- [ ] **Step 7: Implement explicit normal intake planning**

  `planArtifactIntake` accepts exactly one explicit path. It verifies enabled
  config, containment, tracked/committed/clean bytes, lifecycle eligibility,
  collision freedom, and catalog consistency. It computes opaque IDs from the
  injected ID source, a UTC date shard from the injected clock, destination,
  catalog bytes, all index bytes, and the exact owned-path seal without writing.

  Specification intake may allocate a new chain. Plan intake requires
  `sourceArtifactId`, resolves it only through `loadCommittedCatalog`, requires
  an approved active specification, inherits its `chainId`, and records the
  exact source artifact path, commit, and digest. Missing, wrong-kind,
  non-approved, wrong-chain, dirty, or uncommitted sources fail closed. CLI
  grammar is `start <plan> --artifact-kind plan --source-artifact <id>`; the flag
  is refused for specifications and required for lifecycle-managed plans.

  Root inputs under `docs/superpowers/specs` or `docs/superpowers/plans` move to
  the correct `proposed/YYYY/MM` shard. Already proposed inputs remain in place.
  Inputs outside the configured lifecycle remain reviewable without an implied
  move and without a fabricated catalog record.

- [ ] **Step 8: Apply intake and review startup through distinct exact operations**

  `applyArtifactIntake` writes only planned owned bytes, uses
  `commitExactOperation` with operation ID `<review-id>:intake`, verifies the
  resulting tree, and returns:

  ```js
  {
    schema: 'ai-peer-review.intake-receipt/v1',
    artifact_id: 'artifact-spec-001',
    chain_id: 'chain-001',
    path: 'docs/superpowers/specs/proposed/2026/09/example.md',
    blob: '1111111111111111111111111111111111111111',
    commit: '2222222222222222222222222222222222222222',
    digest: 'sha256:3333333333333333333333333333333333333333333333333333333333333333',
    catalog_path: '.peer-review/artifacts/2026/09/artifact-spec-001.json'
  }
  ```

  `startReviewWithLifecycle` then creates scratch protocol authority pinned to
  the exact config digest, layout version/file map, intake commit, artifact
  path/blob/digest, and optional source specification. It renders the closed
  zero-revision JSON manifest, author handoff, and reviewer invitation at the
  pinned `.peer-review/reviews/YYYY/MM/<review-id>` paths and commits those three
  files with operation ID `<review-id>:startup`. Only after this commit does it
  install the reviewer boundary and publish `awaiting-reviewer`. Interruptions
  before/after intake commit, protocol initialization, startup commit, boundary
  capture, and event publication must retry by exact operation receipt or stop
  with all partial evidence preserved.

  Map matching approved bytes to `APR_ARTIFACT_ALREADY_APPROVED` and drift to
  `APR_APPROVED_ARTIFACT_CHANGED`.

- [ ] **Step 9: Wire the CLI without moving policy into it**

  Extend `start` with lifecycle-aware intake only when config is enabled and
  commit mode is normal. Keep one setup grammar:
  `setup --scope project --lifecycle-layout [--dry-run]`; ordinary setup does
  not enable it. Add `lifecycle indexes --check`. Persist repository-relative
  paths; resolve absolute paths only in frozen runtime values. Preserve existing
  help output for unconfigured use and regenerate only intentional golden hashes.

- [ ] **Step 10: Run named issue probes 1 and 2**

  Run:

  ```bash
  node --test --test-name-pattern "setup enables project lifecycle layout" test/integration/project-lifecycle-layout.test.mjs
  node --test --test-name-pattern "intake preserves normal and no-commit invariants" test/integration/project-lifecycle-layout.test.mjs
  ```

  Expected: each command reports one passing named probe and zero failures.

- [ ] **Step 11: Run intake regression tests and commit**

  Run:
  `node --test test/unit/lifecycle-index.test.mjs test/integration/artifact-intake.test.mjs test/integration/start-join.test.mjs test/integration/no-commit.test.mjs test/golden/help.test.mjs`

  Expected: PASS.

  ```bash
  git add src/lifecycle/indexes.mjs src/lifecycle/intake.mjs \
    schemas/lifecycle-review-manifest-v1.json schemas/intake-receipt-v1.json \
    src/collateral/paths.mjs src/cli/parse.mjs \
    src/cli/run.mjs src/cli/help-data.mjs src/public-api.mjs \
    test/unit/lifecycle-index.test.mjs test/integration/artifact-intake.test.mjs \
    test/integration/project-lifecycle-layout.test.mjs test/golden/help.test.mjs \
    test/golden/help/all.sha256.txt
  git commit -m "feat: add governed artifact intake and indexes"
  ```

### Task 3: Revision patches and monotonic review checkpoints

**Files:**

- Create: `schemas/review-checkpoint-v1.json`
- Create: `schemas/revision-receipt-v1.json`
- Create: `src/lifecycle/patches.mjs`
- Create: `src/lifecycle/checkpoints.mjs`
- Modify: `src/collateral/responses.mjs`
- Modify: `src/protocol/events.mjs`
- Modify: `src/protocol/service.mjs`
- Modify: `src/manifest/render.mjs`
- Modify: `src/cli/run.mjs`
- Test: `test/unit/revision-patch.test.mjs`
- Test: `test/integration/lifecycle-recovery.test.mjs`
- Test: `test/integration/project-lifecycle-layout.test.mjs`
- Modify: `test/golden/manifests.test.mjs`

**Interfaces:**

- Consumes: authoritative artifact bytes/digest, response seals, Task 1 catalog,
  and exact-path Git transactions.
- Produces: `createRevisionPatch(input) -> PatchEvidence`,
  `applyRevisionPatch(beforeBytes, evidence) -> Buffer`,
  `verifyRevisionPatch(input) -> true`,
  `planRevisionEvidence(input) -> RevisionPlan`,
  `applyRevisionEvidenceC1(plan, adapters) -> EvidenceReceipt`, and
  `applyManifestCheckpointC2(receipt, adapters) -> CheckpointReceipt`, plus
  `submitRevisionWithLifecycle(input, adapters) -> AuthorHandoffReceipt` as the
  configured normal-mode integration entry point.

- [ ] **Step 1: Write failing pure patch tests**

  Cover insertion, deletion, replacement, Unicode scalar content, empty input,
  empty output, missing final newline, path rename, unchanged bytes, replay,
  prior-digest mismatch, malformed hunk, overlapping hunks, and destination
  collision. The unchanged representation is a canonical patch document with
  `change: "none"`, both digests, and no hunks; it is not an absent receipt.

  ```js
  const evidence = createRevisionPatch({
    beforePath: 'docs/superpowers/specs/proposed/2026/09/a.md',
    afterPath: 'docs/superpowers/specs/proposed/2026/09/a.md',
    beforeBytes: Buffer.from('old\n'),
    afterBytes: Buffer.from('new\n'),
  });
  assert.deepEqual(applyRevisionPatch(Buffer.from('old\n'), evidence), Buffer.from('new\n'));
  ```

- [ ] **Step 2: Run patch tests and confirm the missing-module failure**

  Run: `node --test test/unit/revision-patch.test.mjs`

  Expected: FAIL because the patch module does not exist.

- [ ] **Step 3: Implement deterministic UTF-8 unified patches**

  Reject invalid UTF-8 with `APR_ARTIFACT_ENCODING_UNSUPPORTED`. Normalize no
  content bytes. Split while preserving line terminators, compute a stable
  shortest edit script, emit three lines of context and explicit
  `\\ No newline at end of file` markers, and include a closed JSON receipt with
  previous/result paths and SHA-256 digests. Replay every emitted patch in
  memory and require exact result bytes before returning evidence.

- [ ] **Step 4: Run patch tests and confirm they pass**

  Run: `node --test test/unit/revision-patch.test.mjs`

  Expected: PASS.

- [ ] **Step 5: Write failing C1/C2 and recovery tests**

  Inject checkpoints immediately before and after patch creation, response
  seals, C1 commit, C2 reservation, checkpoint write, C2 commit, reviewer-boundary
  installation, and protocol event publication. Prove exact retry reuses
  completed work; a C1 child of the authorized predecessor can receive only its
  planned C2; partial output remains preserved; conflicting bytes, prior digest,
  owned staged paths, source deletion, mode drift, or unrelated index changes
  fail closed. Include changed and unchanged FUR cases and verify both distinct
  operation journals.

  ```js
  await assert.rejects(
    () => submitRevision({ ...fixture, checkpoint: stopAfter('c1-committed') }),
    /injected interruption/
  );
  const recovered = submitRevision(fixture);
  assert.equal(recovered.evidence_commit, readHeadParent(root));
  assert.equal(recovered.checkpoint_commit, readHead(root));
  ```

- [ ] **Step 6: Run checkpoint tests and confirm they fail**

  Run:
  `node --test test/integration/lifecycle-recovery.test.mjs --test-name-pattern "revision C1 and C2"`

  Expected: FAIL before checkpoint services exist.

- [ ] **Step 7: Implement the two-commit revision transaction**

  C1 uses operation ID `<review-id>:revision:<turn>:evidence` and atomically
  commits the changed or unchanged FUR authority, reviewer response, author
  response, numbered patch, revision receipt, artifact catalog digest event, and
  all three regenerated indexes. The sealed request records before/after bytes
  and modes for every path. The catalog and indexes therefore agree with the
  resulting FUR at C1; an unchanged transition still commits the two responses,
  canonical empty patch, and receipt without pretending the FUR changed.

  C2 uses the separately reserved operation ID
  `<review-id>:revision:<turn>:checkpoint`; it updates only the JSON review
  manifest to `verified`, records C1 as `evidence_commit`, and never writes C2
  into its own bytes. Both operations carry exact predecessor commits, request
  digests, planned paths, and monotonic revision. Operation states are `writing`,
  `written`, and `verified`.

- [ ] **Step 8: Route normal author submission through revision evidence**

  In configured normal mode, `submit` calls `submitRevisionWithLifecycle` after
  current response validation. It creates or recovers C1, creates or recovers
  C2, captures the next reviewer boundary at C2, and only then appends the
  author-submission protocol event advertising C1 artifact authority and C2
  checkpoint authority. Existing unconfigured paths retain the current
  `commitExactPaths` behavior. Configured and unconfigured no-commit paths never
  call a production lifecycle transaction; they generate labeled scratch-only
  patch/response evidence and retain the current `accepted-uncommitted` model.
  Any failure leaves original and partial owned bytes visible for recovery.

- [ ] **Step 9: Run named issue probe 3 and recovery regressions**

  Run:

  ```bash
  node --test --test-name-pattern "revisions emit canonical artifact patches" test/integration/project-lifecycle-layout.test.mjs
  node --test test/unit/revision-patch.test.mjs test/integration/lifecycle-recovery.test.mjs test/integration/submit.test.mjs test/integration/phased-review.test.mjs test/integration/recovery.test.mjs test/golden/manifests.test.mjs
  ```

  Expected: PASS.

- [ ] **Step 10: Commit revision evidence and checkpoints**

  ```bash
  git add schemas/review-checkpoint-v1.json schemas/revision-receipt-v1.json \
    src/lifecycle/patches.mjs src/lifecycle/checkpoints.mjs \
    src/collateral/responses.mjs src/protocol/events.mjs \
    src/protocol/service.mjs src/manifest/render.mjs src/cli/run.mjs \
    test/unit/revision-patch.test.mjs test/integration/lifecycle-recovery.test.mjs \
    test/integration/project-lifecycle-layout.test.mjs \
    test/golden/manifests.test.mjs
  git commit -m "feat: add revision patches and review checkpoints"
  ```

### Task 4: Approval, successors, delivery, disposition, and amendments

**Files:**

- Create: `schemas/terminal-agreement-v1.json`
- Create: `schemas/delivery-receipt-v1.json`
- Create: `schemas/phase-acceptance-v1.json`
- Create: `src/lifecycle/finalization.mjs`
- Create: `src/lifecycle/successors.mjs`
- Create: `src/lifecycle/delivery.mjs`
- Create: `src/lifecycle/disposition.mjs`
- Create: `src/lifecycle/amendments.mjs`
- Modify: `src/collateral/review-record.mjs`
- Modify: `src/manifest/render.mjs`
- Modify: `src/protocol/events.mjs`
- Modify: `src/protocol/service.mjs`
- Modify: `src/cli/parse.mjs`
- Modify: `src/cli/run.mjs`
- Modify: `src/cli/help-data.mjs`
- Modify: `src/public-api.mjs`
- Test: `test/integration/artifact-finalization.test.mjs`
- Test: `test/integration/artifact-operations.test.mjs`
- Test: `test/integration/configured-no-commit.test.mjs`
- Test: `test/integration/project-lifecycle-layout.test.mjs`
- Modify: `test/integration/finalization.test.mjs`
- Modify: `test/integration/phased-review.test.mjs`

**Interfaces:**

- Consumes: accepted current artifact authority, Task 1 catalog, Task 2 indexes,
  Task 3 verified checkpoint, and exact-path Git transactions.
- Produces: `planPhaseApproval(input) -> PhaseApprovalPlan`,
  `applyPhaseApproval(plan, adapters) -> PhaseApprovalReceipt`,
  `planArtifactFinalization(input) -> FinalizationPlan`,
  `applyArtifactFinalization(plan, adapters) -> TerminalReceipt`,
  `planSuccessor(input) -> SuccessorPlan`,
  `applySuccessor(plan, adapters) -> SuccessorReceipt`,
  `planDelivery(input) -> DeliveryPlan`,
  `applyDelivery(plan, adapters) -> DeliveryReceipt`,
  `planDisposition(input) -> DispositionPlan`,
  `applyDisposition(plan, adapters) -> DispositionReceipt`,
  `planAmendment(input) -> AmendmentPlan`, and
  `applyAmendment(plan, adapters) -> AmendmentReceipt`.

- [ ] **Step 1: Write failing finalization and immutability tests**

  Cover single-phase proposed-to-approved movement, no proposed duplicate, exact
  accepted digest, immutable terminal bytes, catalog path history, deterministic
  indexes, retry, collision, unrelated staged content, and refusal after
  terminal drift.

  ```js
  const result = applyArtifactFinalization(planArtifactFinalization({ root, reviewId }), adapters);
  assert.equal(existsSync(result.proposed_path), false);
  assert.equal(digest(readFileSync(result.approved_path)), acceptedDigest);
  assert.equal(JSON.parse(readFileSync(result.agreement_path)).status, 'accepted');
  ```

- [ ] **Step 2: Run finalization tests and confirm they fail**

  Run:
  `node --test test/integration/artifact-finalization.test.mjs --test-name-pattern "approved|terminal"`

  Expected: FAIL before lifecycle finalization exists.

- [ ] **Step 3: Implement one-bundle single/final-phase acceptance**

  Verify final-phase reviewer consensus or an authorized human override,
  artifact path/blob/digest, committed normal-mode catalog authority, and
  checkpoint predecessor. Plan the proposed deletion, approved creation with
  identical bytes, terminal agreement, catalog history append, readiness switch,
  and all regenerated indexes as one sealed create/update/delete set. For an
  accepted successor, record effective predecessor supersession in this same
  operation; never do it at successor creation. Commit with operation ID
  `<review-id>:terminal:<basis>` and verify the exact tree before appending
  protocol terminal authority.

- [ ] **Step 4: Write failing non-final phase-approval tests**

  Exercise a configured `spec,plan` review. After spec acceptance, assert the
  spec moved to approved, its immutable phase manifest records path/digest/
  commit, the review remains nonterminal, and the plan phase binds the exact
  approved spec. Cover interruption before/after phase commit and before/after
  advance publication. Final plan acceptance must retain both approvals and
  write the one terminal agreement.

- [ ] **Step 5: Run the phase tests and confirm behavioral failure**

  Run:
  `node --test test/integration/artifact-finalization.test.mjs --test-name-pattern "configured spec to plan phase approval"`

  Expected: FAIL because current non-final finalization writes only the legacy
  phase manifest and does not promote lifecycle authority.

- [ ] **Step 6: Implement per-phase approval separately from review completion**

  `planPhaseApproval` applies only to an accepted non-final phase. C1 uses
  operation ID `<review-id>:phase:<cursor>:approval` to move that phase's
  proposed FUR to approved with identical bytes, append catalog/path history,
  and regenerate indexes. C2 uses
  `<review-id>:phase:<cursor>:checkpoint` to write immutable
  `phase-<NN>-<kind>-review-manifest.json` containing the accepted artifact ID,
  path, digest, blob, operation predecessor, and C1 approval commit. The manifest
  never claims its own C2; `PhaseApprovalReceipt.checkpoint_commit` reports it
  after tree verification. Protocol advance then requires a lifecycle-managed
  plan input with `sourceArtifactId` equal to the approved spec and pins that
  authority. It does not write the overall terminal agreement. Exact receipt
  recovery occurs before any new bytes are planned.

- [ ] **Step 7: Write failing successor readiness tests**

  Cover proposed, revision-requested, and abandoned successors; a second active
  successor from the same predecessor; accepted successor finalization; exact
  plan-to-source binding; historical delivery retention; and deterministic
  readiness before and after the atomic switch.

  ```js
  const created = applySuccessor(
    planSuccessor({
      root,
      predecessorArtifactId: 'artifact-spec-001',
      artifactPath: successorPath,
    }),
    adapters
  );
  assert.equal(
    currentReadySpec(loadCommittedCatalog({ root, head })).artifact_id,
    'artifact-spec-001'
  );
  ```

- [ ] **Step 8: Run successor tests and confirm behavioral failure**

  Run:
  `node --test test/integration/artifact-operations.test.mjs --test-name-pattern "successor readiness"`

  Expected: FAIL before successor planning/application exists.

- [ ] **Step 9: Implement successor creation without premature supersession**

  `planSuccessor` requires an approved active predecessor, allocates a new
  artifact ID in the same chain, records `supersedesArtifactId`, and creates a
  distinct proposed path. It does not alter predecessor disposition or current
  readiness. Refuse another active proposed successor from the same predecessor
  with `APR_SUCCESSOR_AMBIGUOUS`; an abandoned successor permits a later one.
  Only successor approval atomically marks the predecessor superseded and
  switches current readiness. Delivery history and exact plan source links stay
  attached to their original artifacts.

- [ ] **Step 10: Write failing delivery authority tests**

  Cover approved and non-approved sources, exact source commit/path/digest,
  wrong-source plans, stale/forged evidence digests, arbitrary opaque host target
  IDs, repeat delivery, interruption, and unchanged approved paths.

  ```js
  const plan = planDelivery({
    root,
    artifactId: 'artifact-plan-001',
    hostReceipt: verifiedHydrationReceipt,
  });
  const delivered = applyDelivery(plan, adapters);
  assert.equal(delivered.artifact_id, 'artifact-plan-001');
  ```

- [ ] **Step 11: Run delivery tests and confirm behavioral failure**

  Run:
  `node --test test/integration/artifact-operations.test.mjs --test-name-pattern "verified delivery"`

  Expected: FAIL before delivery planning/application exists.

- [ ] **Step 12: Implement verified delivery as metadata**

  Accept a closed host receipt with `receipt_kind` (`planning` or `hydration`),
  opaque nonempty `target_ids`, source artifact ID/path/commit/digest, result
  evidence digest, verifier kind/ID/evidence digest, and UTC verification time.
  Validate it through the configured host-receipt adapter, then compare the
  source with `loadCommittedCatalog` and committed bytes. Specification planning
  receipts must identify a lifecycle-managed plan with matching chain/source;
  plan hydration receipts may retain opaque backlog IDs but must bind the exact
  plan authority. Apply only the catalog event and indexes with operation ID
  `<artifact-id>:delivery:<receipt-digest>`; the approved path never moves.
  Exact repeat returns the existing receipt, while conflicting reuse fails.

- [ ] **Step 13: Write failing disposition and terminal-outcome tests**

  Cover artifact abandonment before approval, active review abandonment,
  reviewer-consensus acceptance, authorized human override, missing/invalid
  override grants, every terminal file becoming immutable, and no approval
  eligibility from abandonment. Verify original bytes remain unchanged after
  attempted terminal edits.

- [ ] **Step 14: Run terminal-outcome tests and confirm behavioral failure**

  Run:
  `node --test test/integration/artifact-operations.test.mjs --test-name-pattern "terminal outcome"`

  Expected: FAIL before disposition planning/application seals all outcomes.

- [ ] **Step 15: Implement disposition and terminal sealing**

  Abandonment and supersession append catalog events without erasing approval or
  delivery facts. Reviewer consensus and valid human override may approve;
  abandonment cannot. Extend configured normal-mode `abandon` and human-decision
  finalization so acceptance, override, and abandonment each write a closed
  terminal outcome, seal the digest/mode of every existing review file, update
  catalog/index state as allowed, and commit one exact operation. Preserve the
  current signed-grant/host-attestation policy; neither author nor reviewer may
  fabricate override authority.

- [ ] **Step 16: Write failing amendment authorization tests**

  Cover unknown targets, protected identity/digest/status/basis/finding fields,
  unauthorized actors, one allowed external-label correction, conflicting
  amendments, explicit amendment supersession, deterministic overlay order, and
  byte-identical original terminal evidence.

- [ ] **Step 17: Run amendment tests and confirm behavioral failure**

  Run:
  `node --test test/integration/artifact-operations.test.mjs --test-name-pattern "terminal amendment"`

  Expected: FAIL before amendment planning/application exists.

- [ ] **Step 18: Implement constrained append-only amendments**

  `planAmendment` resolves an exact terminal receipt path/digest and permits only
  `review.external_reference`, `delivery.target_label`,
  `delivery.target_url`, and `participant.model_display`. It refuses artifact
  identity/path/digest, lifecycle, disposition, acceptance basis, status,
  findings, and authority changes. Require configured human authority for the
  exact target, old value, replacement value, and reason. Create
  `.peer-review/amendments/YYYY/MM/<amendment-id>.json` exclusively. A second
  amendment of the same field must cite `supersedesAmendmentId`; otherwise it is
  a conflict. Materialization sorts by time then amendment ID and verifies the
  predecessor chain without modifying any terminal file.

- [ ] **Step 19: Add thin CLI commands and help**

  Add `artifact successor --predecessor <id> <path>`,
  `artifact deliver --artifact <id> --receipt <json-path>`,
  `artifact abandon --artifact <id> --reason <text>`, and
  `review amend --review <id> --receipt-digest <digest> --field <allowed-field>
--old-value <json> --new-value <json> --reason <text> --grant <path>`.
  CLI handlers parse values, call the matching plan/apply pair, print the closed
  receipt, and own no lifecycle policy.

- [ ] **Step 20: Write and run complete configured no-commit dialogue tests**

  Create a configured root Superpowers artifact and run start, reviewer join,
  author revision, reviewer acceptance, finalization retry, production catalog
  load, and delivery attempt in no-commit mode. Snapshot `HEAD`, complete Git
  index bytes, FUR path/bytes, `.peer-review/artifacts`, production review root,
  and all three indexes after every transition. Require every snapshot to match
  the baseline; allow only existing labeled scratch test responses, patches,
  agreement, manifest, and transient artifact snapshots. Final state is
  `accepted-uncommitted`; production catalog ingestion and delivery must refuse
  it. Also rerun unconfigured normal/no-commit golden parity.

  Run:
  `node --test test/integration/configured-no-commit.test.mjs test/integration/no-commit.test.mjs test/golden/manifests.test.mjs`

  Expected: PASS.

- [ ] **Step 21: Run named issue probe 4 and compatibility tests**

  Run:

  ```bash
  node --test --test-name-pattern "acceptance promotes immutable artifact identity" test/integration/project-lifecycle-layout.test.mjs
  node --test test/integration/artifact-finalization.test.mjs test/integration/artifact-operations.test.mjs test/integration/configured-no-commit.test.mjs test/integration/finalization.test.mjs test/integration/phased-review.test.mjs test/integration/review-record.test.mjs test/golden/help.test.mjs
  ```

  Expected: PASS.

- [ ] **Step 22: Commit lifecycle finalization services**

  ```bash
  git add schemas/terminal-agreement-v1.json schemas/delivery-receipt-v1.json \
    schemas/phase-acceptance-v1.json \
    src/lifecycle/finalization.mjs src/lifecycle/successors.mjs \
    src/lifecycle/delivery.mjs src/lifecycle/disposition.mjs \
    src/lifecycle/amendments.mjs src/collateral/review-record.mjs \
    src/manifest/render.mjs src/protocol/events.mjs src/protocol/service.mjs \
    src/cli/parse.mjs src/cli/run.mjs src/cli/help-data.mjs \
    src/public-api.mjs test/integration/artifact-finalization.test.mjs \
    test/integration/artifact-operations.test.mjs \
    test/integration/configured-no-commit.test.mjs \
    test/integration/project-lifecycle-layout.test.mjs \
    test/integration/finalization.test.mjs test/integration/phased-review.test.mjs \
    test/golden/help.test.mjs test/golden/help/all.sha256.txt
  git commit -m "feat: govern artifact approval and delivery"
  ```

### Task 5: Explicit legacy migration and end-to-end compatibility

**Files:**

- Create: `schemas/migration-receipt-v1.json`
- Create: `src/lifecycle/migration.mjs`
- Modify: `src/cli/parse.mjs`
- Modify: `src/cli/run.mjs`
- Modify: `src/cli/help-data.mjs`
- Modify: `src/public-api.mjs`
- Create: `test/integration/legacy-migration.test.mjs`
- Modify: `test/integration/project-lifecycle-layout.test.mjs`
- Modify: `test/integration/ported-behavior-parity.test.mjs`
- Modify: `test/fixtures/legacy-behavior-parity.json`
- Modify: `README.md`
- Create: `docs/project-lifecycle.md`

**Interfaces:**

- Consumes: all Task 1 through Task 4 lifecycle services and the repository
  mutation boundary.
- Produces: `planLegacyMigration(input) -> MigrationPlan`,
  `reserveLegacyMigration(plan, adapters) -> MigrationReservation`,
  `applyLegacyMigration(reservation, adapters) -> MigrationResult`, and
  `recoverLegacyMigration({ root, operationId }, adapters) -> MigrationResult`,
  plus the complete configured/unconfigured/no-commit compatibility contract.

- [ ] **Step 1: Write failing migration planning tests**

  Cover explicit legacy root and explicit review selection, default dry run,
  every source/destination/digest in stable order, active review refusal,
  destination collision including identical bytes, symlink/path escape, and a
  plan digest that changes when any operation changes.

  ```js
  const plan = planLegacyMigration({ root, legacyRoot: 'docs/peer-reviews' });
  assert.equal(plan.mode, 'dry-run');
  assert.deepEqual(
    plan.operations.map(({ source }) => source),
    [...plan.operations.map(({ source }) => source)].sort()
  );
  assert.equal(snapshotRepository(root).head, headBefore);
  ```

- [ ] **Step 2: Run migration tests and confirm they fail**

  Run:
  `node --test test/integration/legacy-migration.test.mjs --test-name-pattern "dry run|collision"`

  Expected: FAIL because migration services are missing.

- [ ] **Step 3: Implement deterministic dry-run planning**

  Require `legacyRoot` or `reviewIds`; never scan from an implicit default.
  Resolve every path physically inside the repository, classify active reviews
  from current scratch authority, compute SHA-256 for every source, map compact
  durable outputs without copying a complete FUR, sort operations by source then
  destination, and hash canonical plan bytes. A dry run writes nothing.

- [ ] **Step 4: Write failing apply, receipt, and retry tests**

  Prove an applied migration preserves every migrated source byte at its planned
  destination, removes only planned sources, writes a closed receipt, commits
  the exact bundle, verifies the Git tree, and returns the same receipt on exact
  retry. Prove changed plan digest, partial destination, active review, or any
  collision preserves all evidence and fails closed.

- [ ] **Step 5: Run apply and recovery tests before implementation**

  Run:
  `node --test test/integration/legacy-migration.test.mjs --test-name-pattern "apply|receipt|retry|interruption"`

  Expected: FAIL on the first behavioral assertion because reservation,
  application, and recovery do not exist.

- [ ] **Step 6: Implement receipted migration application**

  Require `--apply --plan-digest <sha256:...>`. Acquire the same repository
  mutation boundary as review commits. Before mutation,
  `reserveLegacyMigration` writes an operation-scoped journal containing the
  immutable plan bytes/digest, migration ID, expected predecessor commit, exact
  create/delete set, modes, actor, and receipt destination. The tracked receipt
  contains schema, migration ID, plan digest, predecessor commit, every source/
  destination/digest/mode tuple, actor, and UTC time; it deliberately does not
  contain the commit that contains itself. `MigrationResult.result_commit`
  reports that commit after exact verification.

  `applyLegacyMigration` re-plans and compares current bytes only before source
  removal, then commits the receipt and byte-preserving move with
  `commitExactOperation` under `<migration-id>:apply`. On retry,
  `recoverLegacyMigration` first loads the reserved journal and checks for the
  exact tracked receipt/result tree. A verified completed operation returns the
  existing result without requiring removed source paths. If incomplete, it
  verifies all still-present source and destination bytes against the reserved
  plan before resuming. Identical-looking destination bytes without the exact
  reservation/receipt are a collision, never a successful retry.

  Add interruption checkpoints before reservation, after reservation, before
  source removal, after files are staged, after commit, and before result return.
  Every path preserves partial evidence on mismatch. Historical file contents,
  including internal old-path text, remain byte-identical.

- [ ] **Step 7: Add migration CLI and documentation**

  Add `migrate legacy --root <path>`, `--review <id>` repeatability,
  `--apply`, and `--plan-digest`. Help states that dry run is the default,
  setup never migrates, active reviews are refused, and legacy reviews may
  finish under their original contract. Document configured layout, artifact
  lifecycle, successor rules, no-commit isolation, index authority, migration,
  and recovery in `docs/project-lifecycle.md`; link it from `README.md`.

- [ ] **Step 8: Run named issue probe 5**

  Run:
  `node --test --test-name-pattern "legacy migration is safe and compatible" test/integration/project-lifecycle-layout.test.mjs`

  Expected: one passing named probe and zero failures.

- [ ] **Step 9: Run focused compatibility and all named probes**

  Run:

  ```bash
  node --test test/integration/legacy-migration.test.mjs test/integration/ported-behavior-parity.test.mjs
  node --test test/integration/project-lifecycle-layout.test.mjs
  ```

  Expected: PASS with all five exact issue probe names present.

- [ ] **Step 10: Run the complete repository verification matrix**

  Run each command separately and inspect the full output:

  ```bash
  npm run format:check
  npm run lint
  npm test
  npm run test:slow
  npm run test:packaging
  node scripts/task-tracker/verify-epic-trail.mjs
  ```

  Expected: every command exits zero, no skipped acceptance probe, no tracked or
  untracked generated fixture, and no unexplained worktree change.

- [ ] **Step 11: Commit migration, compatibility, and documentation**

  ```bash
  git add schemas/migration-receipt-v1.json src/lifecycle/migration.mjs \
    src/cli/parse.mjs src/cli/run.mjs src/cli/help-data.mjs \
    src/public-api.mjs test/integration/legacy-migration.test.mjs \
    test/integration/project-lifecycle-layout.test.mjs \
    test/integration/ported-behavior-parity.test.mjs \
    test/fixtures/legacy-behavior-parity.json README.md \
    docs/project-lifecycle.md
  git commit -m "feat: migrate legacy review evidence safely"
  ```

## Requirement-to-child verification map

| Child task | Authority delivered                                                                                                                   | Exact issue probe                                  | Nested behavioral evidence                                                                                                         |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Task 1     | Closed config/catalog, operation-scoped create/update/delete transactions, pinned review layout, committed production loader          | `setup enables project lifecycle layout`           | `project-config`, `artifact-catalog`, `lifecycle-layout`, and `git-transaction` tests                                              |
| Task 2     | Explicit source-bound intake, startup evidence, and deterministic indexes                                                             | `intake preserves normal and no-commit invariants` | `lifecycle-index`, `artifact-intake`, start/join, no-commit, and help golden tests                                                 |
| Task 3     | Reproducible patches plus separately journaled C1/C2 revision checkpoints                                                             | `revisions emit canonical artifact patches`        | `revision-patch`, `lifecycle-recovery`, submit, phased-review, recovery, and manifest golden tests                                 |
| Task 4     | Per-phase approval, terminal outcomes, successor switch, verified delivery, disposition, amendments, and production no-commit refusal | `acceptance promotes immutable artifact identity`  | `artifact-finalization`, `artifact-operations`, `configured-no-commit`, finalization, phased-review, review-record, and help tests |
| Task 5     | Reserved dry-run-first, byte-preserving, receipt-backed migration and complete compatibility                                          | `legacy migration is safe and compatible`          | `legacy-migration`, ported parity, all five probes, packaging, and repository-wide verification                                    |

## Plan self-review

- Every child-design requirement maps to one or more tasks: explicit setup and
  closed authority model (Task 1), intake and indexes (Task 2), compact revision
  evidence and C1/C2 recovery (Task 3), approval and terminal lifecycle (Task 4),
  and migration plus complete compatibility (Task 5).
- Current readiness is keyed per artifact kind and successor lineage, while plan
  records retain exact `sourceArtifactId` authority.
- Unchanged revisions and non-final phased acceptance have explicit tests and
  deterministic representations.
- New modules are focused by responsibility; CLI and public exports own no
  lifecycle policy.
- Each task has its own red-green cycle, focused verification, exact interfaces,
  and independently reviewable commit.
- Create/update/delete transaction seals and operation-scoped journals make
  intake, C1, C2, phase approval, finalization, and migration executable without
  overloading the legacy review/turn journal key.
- Proposed successors leave their approved predecessor current until atomic
  successor approval; abandoned and competing-successor behavior is explicit.
- Per-phase artifact approval is distinct from overall phased-review completion.
- New review layout/version/config authority is pinned at creation, while active
  legacy reviews remain on their original resolver across setup changes.
- Production catalog reads require committed normal-mode provenance, and a
  complete configured no-commit dialogue proves production refusal at every
  transition.
- Acceptance, authorized override, and abandonment all seal terminal outcomes;
  amendments have a closed field allowlist and independently verified authority.
- Migration receipts contain no self-referential result commit, and recovery
  checks the reserved operation/receipt before requiring removed sources.
- Source-artifact and delivery receipts have closed plan/apply APIs with exact
  committed authority checks and opaque external identifiers.
