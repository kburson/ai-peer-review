# Artifact Lifecycle and Review-Evidence Implementation Plan

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

---

### Task 1: Closed project configuration and artifact catalog foundations

**Files:**

- Create: `schemas/project-lifecycle-config-v1.json`
- Create: `schemas/artifact-record-v1.json`
- Create: `schemas/lifecycle-amendment-v1.json`
- Create: `src/lifecycle/canonical-json.mjs`
- Create: `src/lifecycle/config.mjs`
- Create: `src/lifecycle/catalog.mjs`
- Modify: `src/config/setup.mjs`
- Modify: `src/config/load.mjs`
- Modify: `src/config/guards.mjs`
- Modify: `src/public-api.mjs`
- Test: `test/unit/project-config.test.mjs`
- Test: `test/unit/artifact-catalog.test.mjs`

**Interfaces:**

- Consumes: `resolveContainedPath(root, candidate, label)` and `AprError`.
- Produces: `canonicalJson(value) -> string`,
  `loadLifecycleConfig({ root }) -> null | ProjectLifecycleConfig`,
  `planLifecycleSetup({ root, enabled, clock }) -> SetupPlan`,
  `validateArtifactRecord(value) -> ArtifactRecord`,
  `materializeCatalog(records) -> ArtifactCatalog`,
  `createArtifactRecord(input) -> ArtifactRecord`, and
  `appendArtifactEvent(record, event) -> ArtifactRecord`.

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
    applySetupPlan(first);
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
  `^sha256:[0-9a-f]{64}$`, absolute repository-relative paths through the
  containment helper, monotonically increasing timestamps, legal lifecycle
  transitions, and event-specific closed payloads.

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

- [ ] **Step 8: Run foundation tests and the existing config suite**

  Run:
  `node --test test/unit/project-config.test.mjs test/unit/artifact-catalog.test.mjs test/integration/setup-doctor.test.mjs`

  Expected: PASS.

- [ ] **Step 9: Export stable foundation APIs and commit**

  Add only the documented lifecycle functions to `src/public-api.mjs`.

  ```bash
  git add schemas/project-lifecycle-config-v1.json \
    schemas/artifact-record-v1.json schemas/lifecycle-amendment-v1.json \
    src/lifecycle/canonical-json.mjs src/lifecycle/config.mjs \
    src/lifecycle/catalog.mjs src/config/setup.mjs src/config/load.mjs \
    src/config/guards.mjs src/public-api.mjs test/unit/project-config.test.mjs \
    test/unit/artifact-catalog.test.mjs
  git commit -m "feat: add project lifecycle catalog foundations [#30]"
  ```

### Task 2: Normal intake and deterministic human indexes

**Files:**

- Create: `src/lifecycle/indexes.mjs`
- Create: `src/lifecycle/intake.mjs`
- Modify: `src/git/transaction.mjs`
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

- Consumes: Task 1 configuration/catalog APIs,
  `createGitTransactionRepository(cwd)`, and
  `commitExactPaths(repository, sealed, message, trailers)`.
- Produces: `renderLifecycleIndexes({ config, catalog, readBytes }) -> Map`,
  `planArtifactIntake(input) -> IntakePlan`, and
  `applyArtifactIntake(plan, adapters) -> IntakeReceipt`.

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
  from validated catalog records. Use these group keys in order:
  `needs-attention`, `ready-for-planning`, `planning-in-progress`,
  `ready-for-backlog`, `delivered`, `inactive`. A current file whose digest
  differs from its record raises `APR_ARTIFACT_DIGEST_DRIFT` and is never used
  to rewrite the record.

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
  const receipt = startLifecycleReview({ root, artifactPath, noCommit: true });
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

  Root inputs under `docs/superpowers/specs` or `docs/superpowers/plans` move to
  the correct `proposed/YYYY/MM` shard. Already proposed inputs remain in place.
  Inputs outside the configured lifecycle remain reviewable without an implied
  move and without a fabricated catalog record.

- [ ] **Step 8: Apply intake through the exact-path transaction**

  `applyArtifactIntake` writes only planned owned bytes, uses
  `commitExactPaths`, verifies the resulting tree, and returns:

  ```js
  {
    schema: 'ai-peer-review.intake-receipt/v1',
    artifact_id: 'artifact-spec-001',
    chain_id: 'chain-001',
    path: 'docs/superpowers/specs/proposed/2026/09/example.md',
    blob: '<git-object-id>',
    commit: '<git-object-id>',
    digest: 'sha256:<64 lowercase hex>',
    catalog_path: '.peer-review/artifacts/2026/09/artifact-spec-001.json'
  }
  ```

  Map matching approved bytes to `APR_ARTIFACT_ALREADY_APPROVED` and drift to
  `APR_APPROVED_ARTIFACT_CHANGED`.

- [ ] **Step 9: Wire the CLI without moving policy into it**

  Extend `start` with lifecycle-aware intake only when config is enabled and
  commit mode is normal. Add `lifecycle setup --dry-run` and
  `lifecycle setup --apply` command grammar; require the explicit
  `--lifecycle-layout` selection for apply. Preserve existing help output for
  unconfigured use and regenerate only intentional golden hashes.

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
    src/git/transaction.mjs src/collateral/paths.mjs src/cli/parse.mjs \
    src/cli/run.mjs src/cli/help-data.mjs src/public-api.mjs \
    test/unit/lifecycle-index.test.mjs test/integration/artifact-intake.test.mjs \
    test/integration/project-lifecycle-layout.test.mjs test/golden/help.test.mjs \
    test/golden/help/all.sha256.txt
  git commit -m "feat: add governed artifact intake and indexes [#30]"
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
  `verifyRevisionPatch(input) -> true`,
  `planRevisionEvidence(input) -> RevisionPlan`,
  `applyRevisionEvidenceC1(plan, adapters) -> EvidenceReceipt`, and
  `applyManifestCheckpointC2(receipt, adapters) -> CheckpointReceipt`.

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

  Inject checkpoints immediately before and after patch creation, response seal,
  C1 commit, checkpoint write, and C2 commit. Prove exact retry reuses completed
  work; a C1 child of the authorized predecessor can receive only its planned
  C2; partial output remains preserved; conflicting bytes, prior digest, owned
  staged paths, or unrelated index changes fail closed.

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

  C1 atomically creates the numbered patch, author response, response seals, and
  revision receipt. C2 updates the manifest checkpoint to `verified` and records
  C1 as `evidence_commit`; it never writes C2 into its own bytes. Use operation
  states `writing`, `written`, and `verified`, an opaque operation ID, exact
  predecessor commit/digest, planned paths, and monotonic revision number.

  Preserve the existing non-final phase transition: an accepted spec phase may
  advance to plan review without creating terminal agreement for the whole
  phased review. Only the final accepted phase becomes terminally eligible.

- [ ] **Step 8: Route normal author submission through revision evidence**

  In configured normal mode, `submit` calls the lifecycle service after current
  response validation and before the protocol event advertises the new artifact
  authority. Existing unconfigured and no-commit paths remain byte-for-byte
  compatible. Failure leaves the original file and every partial owned output
  visible for recovery.

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
  git commit -m "feat: add revision patches and review checkpoints [#30]"
  ```

### Task 4: Approval, successors, delivery, disposition, and amendments

**Files:**

- Create: `schemas/terminal-agreement-v1.json`
- Create: `schemas/delivery-receipt-v1.json`
- Create: `src/lifecycle/finalization.mjs`
- Create: `src/lifecycle/successors.mjs`
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
- Test: `test/integration/project-lifecycle-layout.test.mjs`
- Modify: `test/integration/finalization.test.mjs`
- Modify: `test/integration/phased-review.test.mjs`

**Interfaces:**

- Consumes: accepted current artifact authority, Task 1 catalog, Task 2 indexes,
  Task 3 verified checkpoint, and exact-path Git transactions.
- Produces: `planArtifactFinalization(input) -> FinalizationPlan`,
  `applyArtifactFinalization(plan, adapters) -> TerminalReceipt`,
  `createSuccessor(input) -> SuccessorPlan`,
  `recordDelivery(input) -> DeliveryPlan`,
  `changeDisposition(input) -> DispositionPlan`, and
  `appendAmendment(input) -> AmendmentPlan`.

- [ ] **Step 1: Write failing finalization and immutability tests**

  Cover proposed-to-approved movement, no proposed duplicate, exact accepted
  digest, immutable terminal bytes, catalog path history, deterministic indexes,
  final versus non-final phase acceptance, retry, collision, unrelated staged
  content, and refusal after terminal drift.

  ```js
  const result = finalizeLifecycleReview({ root, reviewId });
  assert.equal(existsSync(result.proposed_path), false);
  assert.equal(digest(readFileSync(result.approved_path)), acceptedDigest);
  assert.equal(JSON.parse(readFileSync(result.agreement_path)).status, 'accepted');
  ```

- [ ] **Step 2: Run finalization tests and confirm they fail**

  Run:
  `node --test test/integration/artifact-finalization.test.mjs --test-name-pattern "approved|terminal"`

  Expected: FAIL before lifecycle finalization exists.

- [ ] **Step 3: Implement one-bundle accepted finalization**

  Verify final-phase reviewer consensus, artifact path/blob/digest, catalog
  authority, and checkpoint predecessor. Plan the proposed deletion, approved
  creation with identical bytes, terminal agreement, catalog history append,
  and all regenerated indexes as one sealed owned-path set. Commit it with
  `commitExactPaths` and verify the resulting tree before appending protocol
  terminal authority.

- [ ] **Step 4: Implement successors and delivery metadata**

  `createSuccessor` allocates a new artifact ID, retains `chainId`, sets
  `supersedesArtifactId`, writes new proposed bytes, and marks the predecessor
  `superseded` without erasing its lifecycle or deliveries. `recordDelivery`
  requires approved bytes and appends an opaque receipt containing host, target
  identifiers, source path/commit/digest, result identifiers, and UTC time; it
  never moves the artifact.

- [ ] **Step 5: Implement disposition and append-only amendments**

  Abandonment and supersession are append-only events. `appendAmendment` creates
  `.peer-review/amendments/YYYY/MM/<amendment-id>.json` with the review ID,
  affected receipt digest, reason, actor, authority evidence, replacement field
  and value, and time. Refuse an existing destination even when bytes match;
  materializers overlay amendments without rewriting original evidence.

- [ ] **Step 6: Add thin CLI commands and help**

  Add `artifact successor`, `artifact deliver`, `artifact abandon`, and
  `review amend` grammar with explicit IDs and paths. CLI handlers parse values,
  call one service, print its closed receipt, and do not implement lifecycle
  policy.

- [ ] **Step 7: Run named issue probe 4 and compatibility tests**

  Run:

  ```bash
  node --test --test-name-pattern "acceptance promotes immutable artifact identity" test/integration/project-lifecycle-layout.test.mjs
  node --test test/integration/artifact-finalization.test.mjs test/integration/finalization.test.mjs test/integration/phased-review.test.mjs test/integration/review-record.test.mjs test/golden/help.test.mjs
  ```

  Expected: PASS.

- [ ] **Step 8: Commit lifecycle finalization services**

  ```bash
  git add schemas/terminal-agreement-v1.json schemas/delivery-receipt-v1.json \
    src/lifecycle/finalization.mjs src/lifecycle/successors.mjs \
    src/lifecycle/amendments.mjs src/collateral/review-record.mjs \
    src/manifest/render.mjs src/protocol/events.mjs src/protocol/service.mjs \
    src/cli/parse.mjs src/cli/run.mjs src/cli/help-data.mjs \
    src/public-api.mjs test/integration/artifact-finalization.test.mjs \
    test/integration/project-lifecycle-layout.test.mjs \
    test/integration/finalization.test.mjs test/integration/phased-review.test.mjs \
    test/golden/help.test.mjs test/golden/help/all.sha256.txt
  git commit -m "feat: promote immutable artifacts and record delivery [#30]"
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
  `applyLegacyMigration(plan, adapters) -> MigrationReceipt`, and the complete
  configured/unconfigured/no-commit compatibility contract.

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

- [ ] **Step 5: Implement receipted migration application**

  Require `--apply --plan-digest <sha256:...>`. Acquire the same repository
  mutation boundary as review commits, re-plan from current bytes, compare the
  digest, write only the sealed owned paths, and commit through
  `commitExactPaths`. The receipt contains schema, migration ID, plan digest,
  predecessor/result commits, every source/destination/digest tuple, actor, and
  UTC time. Exact completed work is reused only after receipt and tree checks.

- [ ] **Step 6: Add migration CLI and documentation**

  Add `migrate legacy --root <path>`, `--review <id>` repeatability,
  `--apply`, and `--plan-digest`. Help states that dry run is the default,
  setup never migrates, active reviews are refused, and legacy reviews may
  finish under their original contract. Document configured layout, artifact
  lifecycle, successor rules, no-commit isolation, index authority, migration,
  and recovery in `docs/project-lifecycle.md`; link it from `README.md`.

- [ ] **Step 7: Run named issue probe 5**

  Run:
  `node --test --test-name-pattern "legacy migration is safe and compatible" test/integration/project-lifecycle-layout.test.mjs`

  Expected: one passing named probe and zero failures.

- [ ] **Step 8: Run focused compatibility and all named probes**

  Run:

  ```bash
  node --test test/integration/legacy-migration.test.mjs test/integration/ported-behavior-parity.test.mjs
  node --test test/integration/project-lifecycle-layout.test.mjs
  ```

  Expected: PASS with all five exact issue probe names present.

- [ ] **Step 9: Run the complete repository verification matrix**

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

- [ ] **Step 10: Commit migration, compatibility, and documentation**

  ```bash
  git add schemas/migration-receipt-v1.json src/lifecycle/migration.mjs \
    src/cli/parse.mjs src/cli/run.mjs src/cli/help-data.mjs \
    src/public-api.mjs test/integration/legacy-migration.test.mjs \
    test/integration/project-lifecycle-layout.test.mjs \
    test/integration/ported-behavior-parity.test.mjs \
    test/fixtures/legacy-behavior-parity.json README.md \
    docs/project-lifecycle.md
  git commit -m "feat: migrate legacy review evidence safely [#30]"
  ```

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
