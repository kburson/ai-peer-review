# Primary Runtime Authority Implementation Plan — #102

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task in this chat. The user authorized autonomous decisions while AFK and requested one chat; use native sequential execution rather than additional chats or agents.

**Goal:** Give maintainers one current globally selected AIPR runtime and one activated primary project policy while preserving prior review evidence safely.

**Architecture:** Resolve project authority through validated physical Git identity and a committed primary policy receipt. Resolve the runtime through one OS-account registration shared by all clones; package compatibility and integration contracts replace package-version equality. Revalidate the same fences before every mutation and after waits, without executing retained older images.

**Tech Stack:** ESM JavaScript, Node.js >=24, Git, closed JSON schemas, node:test, Prettier, Markdownlint, ESLint, MCP, existing manual broker and provider adapters.

**Spec:** `docs/superpowers/specs/2026-09-29-102-primary-runtime-authority-design.md`, accepted XPR `review-a3927de204393c987234f146101239f9`, artifact commit `021bed7e9cc01782f0822e99fa2d3a58aadeb16e`. Acceptance is design evidence; authority assurance is unavailable. The specification remains frozen.

## Global Constraints

- One current global runtime; no exact project package-version pin and no older installed-package or retained-image fallback.
- Each worktree retains independent project dependencies and review/Git state. Never rewrite, link, or delete consumer `node_modules`.
- Primary-owned policy must be committed, clean and activated; identical owned blobs on another branch remain valid. Unrelated merge/rebase activity alone does not invalidate authority.
- Global selection uses the OS account home/profile API, never caller `HOME`, `USERPROFILE`, `XDG_CONFIG_HOME` or `APPDATA`. Authority-bearing Git discovery scrubs caller `GIT_*` overrides.
- Activation requires safe review inventory and read-back. Explicit setup migration preserves foreign settings and active review collateral and refuses from linked checkouts.
- An unsupported journal yields bounded diagnostics, never inferred participants, decision, state or sequence. Cleanup requires proven current ownership/protocol.
- All installed tracked outputs pass destination-effective formatting/lint before atomic writes; refuse conflicts without partial changes or host-toolchain edits.
- Consumer build/CI does not require AIPR. Source CI verifies the actual tarball on supported Windows/POSIX and Node/platform combinations.

## Review Focus

1. Forged account and Git environment redirects must not select another authority record: Tasks 1 and 2 include adversarial process environments.
2. A primary branch switch or unrelated rebase can retain identical policy bytes: Task 1 distinguishes identical/dirty/unmerged policy and unrelated Git state.
3. A runner or policy can change during a wait: Task 5 repeats checks immediately before effects after waits and file replacement.
4. A closed host automatic object is split across two stores: Task 1 validates partial schemas then the assembled closed object; hints remain distinct from identity proof.
5. Formatting from the host parent directory can conflict with package defaults: Task 3 resolves destination rules, validates the entire write set, and preserves all old bytes on refusal.

## Scope

Implement the eleven accepted replacement criteria. Do not execute the superseded exact-pin plan. #130 remains responsible for its separate detailed shared-configuration design deliverable; this plan implements the accepted #102 field-ownership contract without claiming #130 complete. #107 owns portable broker/deployment work; this plan supplies the runtime tarball contract and installed verifier without replacing its transport project. Preserve #111 collateral migration and #128 JSON serialization behavior.

## Context

Current `src/config/load.mjs` resolves from cwd/environment and deep-merges project/user sections. `src/config/installation-identity.mjs` compares package versions and copied skill hashes. `src/protocol/compatibility.mjs` uses package-version floors; broker recovery can retain runtime images. Those mechanisms do not satisfy the accepted design. The code modules on this branch matched current trunk when examined; the earlier exact-pin specification and review remain historical evidence.

Reviewer round 3 optional notes become plan requirements: describe primary human-authored authority/review/host-policy separately from machine bindings, and validate each store's partial schema before assembling the closed `automatic` object. No modification of the accepted artifact is necessary.

## Acceptance Criteria

- [ ] Primary resolution and classified preferences satisfy spec criteria 1–2 (Task 1).
- [ ] OS-account current-global selection and independent consumer dependencies satisfy criteria 3–4 (Task 2).
- [ ] Primary setup, activation, integration currency and atomic host validation satisfy criteria 9–10 (Task 3).
- [ ] Collateral support, preserved incompatibility and bounded cleanup satisfy criteria 5–7 (Task 4).
- [ ] CLI/MCP/hooks/broker/public API enforce fences and bounded doctor/status, including waits (Task 5).
- [ ] Actual runtime-only tarball and installed cross-platform fixtures satisfy criterion 11 (Task 6).

## Plan Metadata

- Priority: P2
- Size: XL
- Base human estimate: 56 hours before governed risk/test adjustments
- Execution: strict sequential, Tasks 1–6
- Decomposition: six independently reviewable child deliverables; keep #102 as epic

## Story Intent

- **Beneficiary:** project maintainer running reviews across linked worktrees
- **Capability:** use one current global runtime and an activated primary project policy with explicit prior-review compatibility
- **Need:** cwd-based configuration and version equality can fragment policy or resume obsolete runtime code after upgrades
- **Value or failure prevented:** upgrades preserve review evidence without per-worktree pins or silent execution of older packages

## Implementation Tasks

### Task 1: Resolve activated primary policy and classified user preferences

#### Story Intent

- **Beneficiary:** project maintainer working across linked checkouts
- **Capability:** resolve the same committed primary policy while keeping machine bindings in user preferences
- **Need:** cwd-based config and deep merging allow linked files or user values to override project authority
- **Value or failure prevented:** linked reviews use deliberate project policy without committing machine paths or treating identity hints as proof

#### Files

- Create `src/config/primary-authority.mjs` and `schemas/primary-activation-v1.json` for physical membership, registration and committed-blob receipts.
- Modify `src/git/repository.mjs` with an authority-only scrubbed discovery helper; preserve existing sealed Git transaction semantics.
- Modify `src/config/load.mjs` and `schemas/config-v1.json`; create `schemas/user-config-v2.json` for field ownership, partial store schemas and closed assembled validation.
- Test `test/unit/primary-authority.test.mjs` and `test/integration/primary-authority.test.mjs`; extend `test/helpers/repository-fixture.mjs` with explicit clean committed primary policy fixtures.

#### Interfaces

- **Consumes:** Existing `createGitRepository({ cwd })` and repository fixture utilities; no future runtime-selection interface is required for isolated resolver tests.
- **Produces:** `resolvePrimaryAuthority({ cwd }) -> Promise<PrimaryAuthority>`; `PrimaryAuthority` has `root`, `commonDir`, `configPath`, `skillPath`, `activationDigest`, `ownedBlobs`. `resolveConfigFields({ primary, user, explicitIdentity }) -> Config` validates each store and final assembled hosts.
- **Sequence:** First slice; no child predecessors.
- **Base human effort:** 12 hours; governed estimation may adjust this.

#### Execution steps

- [ ] Write behavior-driven failing tests using disposable repositories and package fixtures. The representative pseudocode below specifies assertions; implement the named fixture helpers in this task, never expose fixture overrides to production.

```js
const primary = await fixtureWithActivatedPolicy(t);
const resolved = await resolvePrimaryAuthority({ cwd: primary.linked });
assert.equal(resolved.root, primary.root);
await primary.stageOwnedConfigChange();
await assert.rejects(resolvePrimaryAuthority({ cwd: primary.linked }));
```

- [ ] Exercise this complete case matrix: ordinary/linked/custom common-dir layouts and subdirectories; forged GIT_DIR/GIT_COMMON_DIR/GIT_WORK_TREE/GIT_INDEX_FILE/config overrides; missing/moved/foreign registrations; initialized policy deletion; clean identical-blob versus pre-migration/different branches; dirty/staged/unmerged owned paths; unrelated merge/rebase; every field in host.identity/resume/reviewer_guard/automatic; policy override attempts; user setup outside Git; preference changes preserving sealed runs.
- [ ] Run the declared targeted commands and confirm the new behavior fails before source changes; a missing test file is not passing evidence.
- [ ] Implement the bounded deliverable: Resolve physical worktree and on-disk .git/common-directory membership using a sanitized environment. Require registered primary ownership and matching committed clean blobs; refuse ambiguity and unknown receipt schemas. Define a table for every current host field rather than general deep merge. Validate policy and preference partial stores before assembling the required closed automatic object. Explicit runtime identity wins over preference hints. Export root-bearing public changes deliberately and preserve the existing integration contract until Task 3 replaces its version comparison.

```js
const policy = validatePrimaryStore(primaryBytes);
const preferences = validateUserStore(userBytes);
const resolved = resolveOwnedFields(policy, preferences, explicitIdentity);
return validateResolvedConfig(resolved);
```

- [ ] Run the same targeted commands and destination lint/format checks; inspect failures before expanding scope. No command below has run for this plan yet.
- [ ] Review the diff for owned/foreign boundaries and commit only this child's source, tests and docs with its assigned issue number. Preserve local hook-disable changes outside protocol commits.

**Verification Commands:**

```sh
node --test test/unit/primary-authority.test.mjs
node --test test/integration/primary-authority.test.mjs
```

### Task 2: Select and verify one OS-account global runtime

#### Story Intent

- **Beneficiary:** maintainer upgrading AIPR across multiple repository clones
- **Capability:** register one current global package and Node executable for all clones
- **Need:** PATH local packages and caller-directed config roots can impersonate the selected runner
- **Value or failure prevented:** one relocation updates every clone while in-place upgrades avoid repository version-pin edits

#### Files

- Create `src/config/runtime-selection.mjs`, `src/startup/runtime-inventory.mjs`, and `schemas/runtime-selection-v1.json`.
- Modify `src/startup/runtime.mjs`, `src/config/installation-identity.mjs`, CLI parser/dispatcher registration commands and `src/doctor.mjs`.
- Create `test/unit/runtime-selection.test.mjs` and `test/integration/runtime-selection.test.mjs`; fixture-only account discovery is internal and cannot launch production providers.

#### Interfaces

- **Consumes:** `resolvePrimaryAuthority({ cwd })` for clone diagnostics; global selection must also work outside Git.
- **Produces:** `readRuntimeSelection() -> Promise<RuntimeSelection>` with `selection_id`, `packageRoot`, `nodeExecutable`; `assertSelectedRuntime({ executingPackageRoot, nodeExecutable }) -> Promise<RuntimeObservation>`; `verifyRuntimeInventory({ packageRoot, previousObservation }) -> Promise<RuntimeObservation>`; provenance version/digest/stat values do not become equality pins.
- **Sequence:** Execute after Task 1; earlier slices are required inputs.
- **Base human effort:** 10 hours; governed estimation may adjust this.

#### Execution steps

- [ ] Write behavior-driven failing tests using disposable repositories and package fixtures. The representative pseudocode below specifies assertions; implement the named fixture helpers in this task, never expose fixture overrides to production.

```js
const account = await isolatedAccountFixture(t);
await account.registerCurrentPackage();
const selected = await account.invoke({ HOME: account.forgedHome });
assert.equal(selected.packageRoot, account.registeredRoot);
await account.replacePackageInPlace();
assert.equal((await account.invoke()).selection_id, selected.selection_id);
```

- [ ] Exercise this complete case matrix: HOME/USERPROFILE/XDG_CONFIG_HOME/APPDATA spoofing; OS-account discovery unavailable; two clones and one Node-manager relocation; cwd/PATH/local/source/API impostors; paths with spaces; Node >=24; in-place package upgrade; incomplete mixed npm replacement; changed versus unchanged inventory files; worktree-local node_modules byte preservation; startup/hook timing measurements.
- [ ] Run the declared targeted commands and confirm the new behavior fails before source changes; a missing test file is not passing evidence.
- [ ] Implement the bounded deliverable: Use OS account/profile APIs for the authority root (POSIX account home .config/ai-peer-review/runtime-selection.json; verified Windows account LocalAppData location). Register canonical package and Node paths once per account; write atomically with validated argv. Compare executable module physical root and Node path, not package-version observations. Verify a sealed declared module/asset/native inventory and changed file identities on every admission; discard cached assurance across asynchronous waits. Internal fixture injection is inaccessible to production provider launch.

```js
const location = await verifiedAccountSelectionPath();
const selection = validateSelection(await readSelection(location));
assertCanonicalRunner(selection, executingPackageRoot, process.execPath);
return verifyDeclaredInventory(selection.packageRoot);
```

- [ ] Run the same targeted commands and destination lint/format checks; inspect failures before expanding scope. No command below has run for this plan yet.
- [ ] Review the diff for owned/foreign boundaries and commit only this child's source, tests and docs with its assigned issue number. Preserve local hook-disable changes outside protocol commits.

**Verification Commands:**

```sh
node --test test/unit/runtime-selection.test.mjs
node --test test/integration/runtime-selection.test.mjs
```

### Task 3: Migrate primary setup and activate validated integration content

#### Story Intent

- **Beneficiary:** maintainer installing review integrations into an existing project
- **Capability:** regenerate owned setup files and activate committed primary policy without damaging host settings
- **Need:** copied skills version equality and unformatted atomic JSON can drift or introduce host lint failures
- **Value or failure prevented:** setup remains portable repeatable and compatible with the project toolchain across linked worktrees

#### Files

- Modify `src/config/setup.mjs`, `src/config/installation-identity.mjs`, `src/cli/parse.mjs`, `src/cli/run.mjs`.
- Create `src/config/integration-contract.mjs`, `src/config/setup-validation.mjs`, `schemas/integration-contract-v1.json` and packaged formatting/lint reference assets.
- Update `skills/peer-review/SKILL.md`, host wrapper templates and package-owned hooks to load `.ai-peer-review/skills/peer-review/SKILL.md` from the registered primary.
- Create `test/integration/primary-setup.test.mjs`, `test/unit/setup-validation.test.mjs` and `test/golden/primary-runtime.test.mjs`.

#### Interfaces

- **Consumes:** `resolvePrimaryAuthority`, `assertSelectedRuntime` and classified store validation from Tasks 1–2.
- **Produces:** `assertIntegrationCurrent({ primary, runtime }) -> Promise<IntegrationObservation>`; `validateSetupWriteSet({ writes, destinationRoot }) -> Promise<ValidatedWriteSet>`; `activatePrimaryPolicy({ cwd, expectedOwnedBlobs, inventory }) -> Promise<PrimaryAuthority>` with read-back and admission fencing.
- **Sequence:** Execute after Task 2; earlier slices are required inputs.
- **Base human effort:** 12 hours; governed estimation may adjust this.

#### Execution steps

- [ ] Write behavior-driven failing tests using disposable repositories and package fixtures. The representative pseudocode below specifies assertions; implement the named fixture helpers in this task, never expose fixture overrides to production.

```js
const host = await setupHostFixture(t, { conflictingFormatter: true });
const before = await host.readTrackedBytes();
await assert.rejects(host.setupApply(), /format|lint|conflict/i);
assert.deepEqual(await host.readTrackedBytes(), before);
await assert.rejects(host.setupApplyFromLinked(), /primary/i);
```

- [ ] Exercise this complete case matrix: legacy .ai-peer-review.json migration; primary/user ownership collisions; owned/foreign hook portions; unchanged bytes/idempotence; linked refusal and explicit primary command; dirty policy; activation requiring committed clean blobs and safe active-review inventory; unknown/live startup reservations; narrow bootstrap repair; pulled policy old/new digests; unchanged/changed integration contracts; host parent formatter and lint rules; no dependency/toolchain modification; unchanged foreign files.
- [ ] Run the declared targeted commands and confirm the new behavior fails before source changes; a missing test file is not passing evidence.
- [ ] Implement the bounded deliverable: Replace exact package-version currency with declared integration contract and normalized owned-content digests. First plan all writes and classify legacy fields; user-exclusive machine values move only in explicit maintenance for the invoking account and refuse collisions. Validate and format complete proposed write bytes using destination-effective host rules plus package reference rules before any atomic writes. Keep #128 Prettier-compatible JSON serialization. Setup never commits or activates implicitly: maintainer commits owned files, then explicit activation inventories review activity and reads the new receipt back. Block unknown activity; verified suspensions may permit activation under the accepted design. Preserve APR_SETUP_VERSION_MISMATCH as the integration diagnostic code.

```js
const planned = planSetup(options);
const checked = await validateSetupWriteSet({
  writes: planned.writes,
  destinationRoot: primary.root,
});
await assertAdmissionInventorySafe(primary.commonDir);
await applyAtomicValidatedWrites(checked); // activation is a separate committed-blob operation
```

- [ ] Run the same targeted commands and destination lint/format checks; inspect failures before expanding scope. No command below has run for this plan yet.
- [ ] Review the diff for owned/foreign boundaries and commit only this child's source, tests and docs with its assigned issue number. Preserve local hook-disable changes outside protocol commits.

**Verification Commands:**

```sh
node --test test/unit/setup-validation.test.mjs
node --test test/integration/primary-setup.test.mjs
node --test test/golden/primary-runtime.test.mjs
```

### Task 4: Declare collateral support and fence obsolete runtime images

#### Story Intent

- **Beneficiary:** review operator continuing work after a global upgrade
- **Capability:** continue supported review formats and preserve incompatible review evidence without older-code execution
- **Need:** package-version floors and pinned-image recovery mix format compatibility with executable selection
- **Value or failure prevented:** upgrades never silently replay obsolete code or fabricate state from unreadable journals

#### Files

- Create `schemas/runtime-compatibility-v1.json` and packaged `provenance/runtime-compatibility.json`.
- Modify `src/protocol/compatibility.mjs`, `src/protocol/service.mjs`, `src/broker/runtime-image.mjs`, startup and recovery paths.
- Create `test/unit/collateral-compatibility.test.mjs` and `test/integration/collateral-compatibility.test.mjs`; preserve #111 migrated collateral layout.

#### Interfaces

- **Consumes:** `assertSelectedRuntime`/`verifyRuntimeInventory` and integration observation; existing sealed event/manifest integrity validators remain mandatory.
- **Produces:** `readRuntimeCompatibility() -> RuntimeCompatibilityManifest`; `assertCollateralCompatible({ manifest, operation, metadata }) -> void`; `inspectUnsupportedReview({ workspace }) -> BoundedDiagnostic` containing canonical path and readable schema identifiers only; `assertCurrentCleanupOwnership({ owner, protocol, runtime }) -> void`.
- **Sequence:** Execute after Task 3; earlier slices are required inputs.
- **Base human effort:** 8 hours; governed estimation may adjust this.

#### Execution steps

- [ ] Write behavior-driven failing tests using disposable repositories and package fixtures. The representative pseudocode below specifies assertions; implement the named fixture helpers in this task, never expose fixture overrides to production.

```js
const old = await incompatibleReviewFixture(t);
const before = await old.snapshotEvidence();
await assert.rejects(old.continueWithCurrent(), /incompatible|unsupported/i);
assert.deepEqual(await old.snapshotEvidence(), before);
assert.equal(await old.executedRetainedImageCount(), 0);
```

- [ ] Exercise this complete case matrix: supported active and terminal formats; unsupported/unknown schemas; malformed journal and invalid metadata; preserved legacy collateral; fresh independent review identity/paths for the same artifact; current runtime ownership/protocol proved versus foreign/unknown cleanup; recovery never executes old images; existing integrity failures still refuse even if a format is supported.
- [ ] Run the declared targeted commands and confirm the new behavior fails before source changes; a missing test file is not passing evidence.
- [ ] Implement the bounded deliverable: Define closed explicit read/write support for durable event/manifest/response/startup layouts in the packaged manifest. Remove package version as the primary collateral gate while preserving sealed provenance, role, identity and integrity checks. Retained images remain evidence and cannot become executable fallbacks. Unsupported status does not parse unknown events heuristically; only independent readable reasons and schema identifiers may appear. Cleanup terminates only proven current owned resources and preserves settlement evidence; otherwise refuse without launching workers.

```js
assertSelectedRuntimeIdentity(runtime);
assertCollateralCompatible({ manifest: readRuntimeCompatibility(), operation, metadata });
assertExistingReviewIntegrity(review);
return continueWithExecutingCurrentPackage(review);
```

- [ ] Run the same targeted commands and destination lint/format checks; inspect failures before expanding scope. No command below has run for this plan yet.
- [ ] Review the diff for owned/foreign boundaries and commit only this child's source, tests and docs with its assigned issue number. Preserve local hook-disable changes outside protocol commits.

**Verification Commands:**

```sh
node --test test/unit/collateral-compatibility.test.mjs
node --test test/integration/collateral-compatibility.test.mjs
```

### Task 5: Enforce authority fences across every operation and async boundary

#### Story Intent

- **Beneficiary:** review operator using CLI hooks MCP or broker integrations
- **Capability:** receive the same current-runtime and primary-policy enforcement at every mutation boundary
- **Need:** entry-point differences and drift during waits can bypass otherwise correct startup checks
- **Value or failure prevented:** no integration mutates a review under stale policy or an unselected executable

#### Files

- Create `src/startup/authority-fence.mjs` with one operation classification table.
- Modify `src/cli/parse.mjs`, `src/cli/run.mjs`, `src/mcp/server.mjs`, `src/mcp/wait.mjs`, broker service/launch and provider hook entrypoints.
- Modify exported writers in `src/public-api.mjs` and `src/protocol/service.mjs`; update doctor/help/status and corresponding golden outputs.
- Create `test/unit/authority-classification.test.mjs`, `test/integration/authority-entrypoints.test.mjs`, `test/mcp/authority-fence.test.mjs`; extend `test/golden/primary-runtime.test.mjs`.

#### Interfaces

- **Consumes:** All authority, selection, integration and collateral interfaces from Tasks 1–4.
- **Produces:** `assertOperationAuthority({ operation, cwd, reviewWorkspace }) -> Promise<AuthorityFence>`; `AuthorityFence` seals selection/inventory/activation/integration digests. `revalidateOperationAuthority(fence) -> Promise<AuthorityFence>` is called immediately before effects and after any wait; unclassified operations fail closed.
- **Sequence:** Execute after Task 4; earlier slices are required inputs.
- **Base human effort:** 8 hours; governed estimation may adjust this.

#### Execution steps

- [ ] Write behavior-driven failing tests using disposable repositories and package fixtures. The representative pseudocode below specifies assertions; implement the named fixture helpers in this task, never expose fixture overrides to production.

```js
const waiting = await waitBoundaryFixture(t);
const effect = waiting.startMutatingOperation();
await waiting.changeActivatedPolicy();
waiting.releaseWait();
await assert.rejects(effect);
assert.equal(waiting.sideEffects.length, 0);
```

- [ ] Exercise this complete case matrix: parser command and broker verb total coverage; exported writers; CLI setup/register exceptions limited to bootstrap repair; MCP stdio; provider hooks; broker recovery; async wait replacement of runtime/policy/contract; unchanged-contract upgrade; stdout closed schemas; help/explain outside Git; doctor independent health rows; unknown journal status never inventing authoritative fields.
- [ ] Run the declared targeted commands and confirm the new behavior fails before source changes; a missing test file is not passing evidence.
- [ ] Implement the bounded deliverable: Centralize named read/maintenance/mutation/cleanup classifications without weakening existing gates. Every normal mutation resolves current runtime, primary policy and integration before effects; review mutation also checks packaged collateral support. Carry sealed observations across async calls and revalidate after waits immediately before effects. Maintenance exceptions expose only explicit registration/setup/activation repair and cannot start reviews. Keep readable status stdout schemas stable; attach independent diagnostics through existing error/output channels. Test all public mutation call paths rather than only dispatcher calls.

```js
let fence = await assertOperationAuthority({ operation, cwd, reviewWorkspace });
await waitForOwnedEvent();
fence = await revalidateOperationAuthority(fence);
return performValidatedMutation(fence);
```

- [ ] Run the same targeted commands and destination lint/format checks; inspect failures before expanding scope. No command below has run for this plan yet.
- [ ] Review the diff for owned/foreign boundaries and commit only this child's source, tests and docs with its assigned issue number. Preserve local hook-disable changes outside protocol commits.

**Verification Commands:**

```sh
node --test test/unit/authority-classification.test.mjs
node --test test/integration/authority-entrypoints.test.mjs
node --test test/mcp/authority-fence.test.mjs
node --test test/golden/primary-runtime.test.mjs
```

### Task 6: Ship the runtime contract and verify actual installed artifacts

#### Story Intent

- **Beneficiary:** release maintainer and consuming project operator
- **Capability:** install only runtime assets and verify global upgrades without adding consumer CI dependencies
- **Need:** source checkout checks can miss tarball omissions development assets or installation-specific failures
- **Value or failure prevented:** published packages behave consistently across supported hosts while consumer builds remain independent of AIPR

#### Files

- Modify `package.json` runtime files/scripts boundary and `test/packaging/package.test.mjs`; keep source-only release verifiers outside the shipped file list.
- Create shipped `src/installed/verify-deployment.mjs` and `bin/verify-deployment.mjs`; expose an installed diagnostic command.
- Create `test/packaging/primary-runtime.test.mjs`, installed authority fixtures and `test/smoke/consumer-without-aipr.test.mjs`.
- Modify source CI jobs to inspect npm-pack tarballs and installed fixtures on Node/platform matrix; update installation/migration docs and #107 contract notes.

#### Interfaces

- **Consumes:** Selected-runtime/inventory and compatibility/contract assets from Tasks 2–5; existing offline package fixture helpers.
- **Produces:** Installed `verify-deployment` checks shipped runtime manifest/reference assets and entrypoints without registry access or project mutation; source tests assert exact tarball entries and absence of tests/fixtures/development scripts/source-release tools.
- **Sequence:** Execute after Task 5; earlier slices are required inputs.
- **Base human effort:** 6 hours; governed estimation may adjust this.

#### Execution steps

- [ ] Write behavior-driven failing tests using disposable repositories and package fixtures. The representative pseudocode below specifies assertions; implement the named fixture helpers in this task, never expose fixture overrides to production.

```js
const tarball = await packFixture(t);
const installed = await installTarballFixture(t, tarball);
assert.equal(await installed.verifyDeployment(), 0);
assert.equal(
  tarball.entries.some((p) => p.startsWith('package/test/')),
  false
);
assert.equal(await consumerWithoutAiprFixture(t).build(), 0);
```

- [ ] Exercise this complete case matrix: actual npm-pack artifact and manifest; installed global/local/source identities; two clones and Node/global relocation; active/terminal supported and unsupported reviews; ordinary/linked/custom layouts; paths with spaces; Windows/POSIX; Node supported matrix; no real global install/registry mutation; retained native broker assets necessary until #107 portable transport ships; consumer CI without package or doctor.
- [ ] Run the declared targeted commands and confirm the new behavior fails before source changes; a missing test file is not passing evidence.
- [ ] Implement the bounded deliverable: Define an explicit runtime-only files boundary. Include compatibility/inventory/integration and format/lint reference assets plus an installed deployment verifier; exclude tests, fixtures and development npm scripts/tooling. Keep source CI responsible for pack/release verification and keep required current native runtime files until #107 supplies its replacement. Exercise installed hooks/MCP/broker entrypoints from tarball fixtures; do not invent a portable broker implementation under this task. Fail on missing assets or leaked development entries.

```js
const entries = await inspectPackedEntries(tarball);
assertRuntimeAllowlist(entries);
assertNoDevelopmentScripts(await readPackedPackageJson(tarball));
await verifyInstalledEntrypoints(installedRoot);
```

- [ ] Run the same targeted commands and destination lint/format checks; inspect failures before expanding scope. No command below has run for this plan yet.
- [ ] Review the diff for owned/foreign boundaries and commit only this child's source, tests and docs with its assigned issue number. Preserve local hook-disable changes outside protocol commits.

**Verification Commands:**

```sh
node --test test/packaging/primary-runtime.test.mjs
node --test test/packaging/package.test.mjs
node --test test/smoke/consumer-without-aipr.test.mjs
```

## Integration and execution decision

Use strict sequential child work in the existing chat. No agent fan-out or new chats. Each child must complete its independent review/verification before a dependent child proceeds. The user is AFK; routine choices use this plan, while real permission refusals remain refusals and must be reported accurately. Do not merge or claim implementation complete from planning evidence.

Keep source-owned verification separate from consumer behavior. Final implementation verification runs the existing unit/golden suite, affected integration/MCP/package tests, and repository lint/format checks at the accepted exact source SHA. Installed matrix checks must run against the actual tarball, not source module substitutes.

## Self-review record

All eleven specification criteria map to the six unchecked acceptance entries above. Every task has distinct stakeholder intent, a bounded file/interface set, meaningful refusal tests and executable prospective verifiers. Runtime observations never become version/digest pins; preference hints never become session identity. The host automatic object is validated after field-level assembly, preserving the round-3 clarification. No implementation test or source change is claimed by this plan.
