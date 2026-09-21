# Provider Authority and Broker Reconciliation (#88) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Read the approved amendment and this entire plan before implementation; execute serially unless the operator authorizes delegation.

**Goal:** Make new broker-owned reviews provably bind both participant sessions and deliver through a production worker without deadlock, invented provider evidence, or duplicate wakeups.

**Architecture:** A package-owned evidence boundary validates official, exact-session observations separately from the pinned adapter version, then records distinct author and reviewer delivery bindings. The installed broker owns the provider-resource lease and executes reviewer launch: it reserves one durable operation under the dispatch lock, releases that lock before waiting, and permits authenticated submission without manual takeover. A production bridge supplies role-specific delivery and event-watching coordinator input to a worker reconstructed from sealed registration and pinned runtime.

**Tech Stack:** Node.js >=24, ESM, `node:test`, the existing event/receipt/operation ledger, project-local broker IPC, the package-owned native resource-lock helper, and installed subscription-backed provider surfaces. No new provider API credential or package.

**Spec:** `docs/superpowers/specs/2026-09-21-88-provider-authority-broker-reconciliation-design.md` (amends `docs/superpowers/specs/2026-09-14-project-local-spr-xpr-broker-design.md`).

## Global Constraints

- Epic #39 and child #88 stay open until the exact implementation head passes whole-branch review, all suites, supported-host CI, and one real installed-package automatic handoff. A fixture-only handoff cannot satisfy release.
- Claude Code, Codex, and Grok Build are the only candidate review partners. Gemini/Antigravity is compatibility-only, never a production selector or fallback.
- Do not add a separately billed API dependency, raise the operator's budget, retry a provider-limit error, or silently switch providers. Use only bounded, operator-authorized live conformance probes; stop after two chained newly discovered defects or failed fix rounds and check in before a third.
- A requested model or effort, environment variable, launch argument, invitation, process exit, or fixture is not independent provider observation. The provider's exact-session evidence and the executing pinned runtime's adapter-version attestation are different authorities.
- Existing sealed reviews keep their original bytes and recovery contract. Manual and `resume-only` modes never imply automatic wake. Unknown provider outcomes are not automatically retried.
- No new daemon, public coordinator command, scheduler, npm package, or publication as a side effect of this plan.

## Baseline and stop conditions

Plan baseline: `feee40da87b9fecc9de9daf009e21364d79c3018` on `feature/epic/39`. The amendment was human-approved for planning and independently critiqued by Claude Code and GPT-6 Astra; those critiques are not provider conformance or formal protocol acceptance. At baseline, `src/startup/runtime.mjs` awaits `adapter.launch` while holding `workspace/dispatch`; `src/cli/run.mjs` derives join observations from sealed values; `src/providers/claude.mjs` echoes launch settings as runtime observation; and `bin/peer-review-broker.mjs` always supplies a recovery-only worker.

Before Task 2, establish at least one candidate **author/reviewer pair** of installed surfaces that can both supply official exact-session observation, role-specific delivery, and outcome reconciliation without a new paid API credential. The pair may be SPR or XPR; Task 1 records each installed version and the pair-level result. If none qualifies, **stop**: leave #88/#39 open, report the missing fields or control operation and an explicit scope decision to the operator. Do not build a fixture-only positive path and call it complete. A later provider limit or failed health check likewise stops that provider's live run without retry or substitution.

Use a project-local `.scratch/test/` sandbox for new tests; reuse `test/helpers/internal-api.mjs` and existing review fixtures. Existing test modules that use `node:os` temporary fixtures need not be mechanically rewritten in #88. Keep new package files inside the `package.json#files` inventory. Before each task commit, run its focused tests and `npm test`; do not knowingly carry a red default suite into the next task.

## File and interface map

| Responsibility                             | Files                                                                                                                                                                                                                                                                  |
| ------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Proven capability and evidence contract    | Create `src/providers/evidence.mjs`, `src/providers/conformance.mjs`; modify `src/providers/{registry,claude,codex,grok}.mjs`, `src/doctor.mjs`; test `test/unit/{provider-evidence,provider-capabilities}.test.mjs`, `test/integration/provider-conformance.test.mjs` |
| Reviewer claim and role bindings           | Create `src/broker/participant-binding.mjs`; modify `src/cli/run.mjs`, `src/startup/runtime.mjs`; test `test/integration/{provider-conformance,start-join,reviewer-guard}.test.mjs`                                                                                    |
| Broker-owned launch and manual takeover    | Modify `src/startup/runtime.mjs`, `src/broker/{registry,ipc,service,client,worker}.mjs`, `src/providers/registry.mjs`, `src/cli/run.mjs`; test `test/integration/{broker-startup,broker-ipc,reviewer-guard}.test.mjs`                                                  |
| Exact wake bridge and resident coordinator | Create `src/broker/provider-bridge.mjs`; modify `src/coordinator/service.mjs`, `src/providers/registry.mjs`; test `test/integration/{broker-worker-production,coordinator-wake}.test.mjs`                                                                              |
| Installed worker construction and lease    | Create `src/broker/worker-factory.mjs`; modify `bin/peer-review-broker.mjs`, `src/broker/{service,worker,provider-resources}.mjs`; test `test/integration/{broker-worker-production,provider-resource}.test.mjs`                                                       |
| Installed release and compatibility        | Keep `test/integration/broker-release.test.mjs` hermetic; create opt-in `test/live/installed-broker-handoff.mjs`; modify `test/integration/setup-doctor.test.mjs`, `package.json`, `.github/workflows/ci.yml`, `docs/releases/0.3.0.md`, README and help as needed     |

The public seam is `createProviderAdapter({ surface, ... })`. Add `verifyProviderEvidence({ expected, providerEvidence, adapterAttestation, authorFingerprint, now }) -> { provider, host, model_id, effort, adapter_version, session_fingerprint, assurance: 'runtime', evidence_digest }`, where `providerEvidence` contains the official source, source version, observation time, exact provider session ID, operation ID, model and effective effort acknowledgment, and `adapterAttestation` comes from the executing pinned runtime. The returned record contains no raw handle. A nonconforming surface returns an explicit unavailable reason rather than an inferred value.

The role seam is `openParticipantBinding({ workspace, role, authority, adapters, now }) -> { role, provider, host, adapter_version, session_fingerprint, handle_locator, evidence_digest }`. Owner-only package scratch holds separate `author` and `reviewer` records. Each is bound to the sealed participant and re-observed through that participant's official provider surface before automatic use. An environment-provided resume handle is at most a locator candidate, never identity evidence. On XPR, select each role's own adapter; if either role lacks a verifiable current binding, refuse `automatic-required` and retain manual recovery.

The broker seam is `createProductionReviewWorker({ registration, project, runtimeImage, owner, platform, clock }) -> ReviewWorker`. It owns the provider lease before reviewer launch or wake. The worker receives `createProviderBridge({ registration, authority, bindings, adapters, lease, owner })`, which supplies `coordinatorInput`, `observation`, `deliver`, `reconcile`, and `close`. It maps `wakeOperationKey` to the current sealed target role/session and that role's distinct provider handle. Keep coordinator wake IDs distinct from the startup reviewer-launch ID.

## Task 1: Establish conformance evidence and truthful capability policy

**Files:** Create `src/providers/conformance.mjs`, `test/unit/provider-evidence.test.mjs`; modify `src/providers/{registry,claude,codex,grok}.mjs`, `src/doctor.mjs`, `test/unit/provider-capabilities.test.mjs`, `test/integration/provider-conformance.test.mjs`. Record sanitized version/provenance findings in `docs/conformance/2026-09-21-88-installed-provider-surfaces.md` (no raw session IDs or credentials).

**Interfaces:** `evaluateSurfaceConformance({ adapterVersion, surfaceVersion, evidenceSources, operations, health }) -> { healthy, automatic, reasons }`. Every claimed field has an official source; `automatic` requires exact-session lookup, role-specific wake, outcome reconciliation, and fresh health. Reviewer startup additionally requires exact launch. `evaluateParticipantPair({ author, reviewer, health }) -> { automatic, reasons }` requires both surfaces, distinct sessions, and compatible current resident transports. A mere `--version` success sets only `installed: true`.

- [ ] Write failing tests: an installed executable with no official effort acknowledgment reports `automatic: false`; missing exact-session reconciliation or a changed surface version also reports false; an exact, fully evidenced fixture reports true only when fresh health is true. Assert `doctor --mode automatic-required` is unhealthy for all unproven production surfaces and that Gemini/Antigravity never appears in the selector table.
- [ ] Run `node --test test/unit/provider-evidence.test.mjs test/unit/provider-capabilities.test.mjs test/integration/provider-conformance.test.mjs`; observe the expected failures before implementation.
- [ ] Implement the closed evaluator. Its positive branch must be conjunctive, for example:

```js
const automatic =
  health.healthy === true &&
  evidenceSources.model === 'official-exact-session' &&
  evidenceSources.effort === 'official-exact-session' &&
  evidenceSources.session === 'official-exact-session' &&
  operations.deliverToSession === 'exact' &&
  operations.reconcile === 'exact';
const reviewerLaunchable = automatic && operations.launch === 'exact';
```

- [ ] Inspect installed versions and official local help/result schemas read-only for Claude, Codex, and Grok. Record each source, version, returned field, missing field, operation outcome, and candidate author/reviewer pair in the sanitized conformance document. If a live probe is needed, obtain the operator's bounded window first; run at most one explicit probe per surface, stop on quota errors, and do not use a separately billed API key. No positive production conformance row or pair may be written from documentation or a test double alone.
- [ ] Run `npm test` and the focused tests; commit the exact evidence-policy files and sanitized record. If there is no qualifying participant pair, stop the plan here and report the release blocker rather than changing the acceptance criterion.

## Task 2: Bind both participant sessions to independent provider evidence

**Files:** Create `src/providers/evidence.mjs`, `src/broker/participant-binding.mjs`; modify `src/providers/{registry,claude,codex,grok}.mjs`, `src/cli/run.mjs`, `src/startup/runtime.mjs`; extend `test/unit/provider-evidence.test.mjs`, `test/integration/{provider-conformance,start-join}.test.mjs`.

**Interfaces:** `verifyProviderEvidence` has the signature above. `adapter.observeCurrentSession({ operationId, expected, workspace })` obtains an official current-session record for a conformant surface. `adapter.attestVersion({ runtimeImage })` reads the executing pinned adapter identity; it must not appear inside provider-emitted evidence. `recordParticipantBinding({ workspace, role, authority, providerEvidence, adapterAttestation, handleLocator })` stores an owner-only, review-scoped role binding; `openParticipantBinding` revalidates it at use and after restart. `joinReview` receives only validated runtime evidence or an explicitly declared manual identity.

- [ ] Add failing tests in `provider-conformance.test.mjs` for ordinary CLI join where sealed model, effort, adapter version, or session differs from the actual provider record; missing/stale/provider-unbound observation; distinct author/reviewer sessions; and a declared manual join. Reject synthetic observation made by `runtimeObservationForJoin` even when all requested values match. Assert a launch-command echo from the Claude surface is not `runtime` assurance. Add an XPR fixture whose author is Codex and reviewer is Claude: the two role bindings must retain different provider families and handles after adapter recreation.
- [ ] Run `node --test test/unit/provider-evidence.test.mjs test/integration/provider-conformance.test.mjs test/integration/start-join.test.mjs`; capture red assertions.
- [ ] Replace the synthetic fallback in `src/cli/run.mjs` with the selected adapter's current-session observation. Validate source/time/operation binding and hash only the raw provider session ID. Derive `adapter_version` from the pinned executing package, then compare both authorities with the sealed descriptor before `reviewer-joined` or claim events. Preserve the declared manual path and legacy sealed-review join behavior.

```js
const observed = await adapter.observeCurrentSession({ operationId, expected, workspace });
const attested = adapter.attestVersion({ runtimeImage });
const runtimeObservation = verifyProviderEvidence({
  expected,
  providerEvidence: observed,
  adapterAttestation: attested,
  authorFingerprint: state.participants.author.session_fingerprint,
  now,
});
```

- [ ] Ensure `src/providers/claude.mjs` no longer fills `model_id`, `effort`, or adapter provenance from `base`/environment as observed facts. Implement a positive provider-specific adapter only for the surface proven in Task 1; leave other production selectors honestly manual/recovery-only. Test requested-versus-actual mismatch through `run()` rather than injected `joinReview` alone.
- [ ] Record the author's binding at startup and the reviewer's at authenticated join using each role's official surface and sealed participant fingerprint. Store a raw handle only in owned scratch behind a locator; never derive identity or automatic capability from the existing `handoffs/<role>-resume.json` environment-sourced handle alone. On restart, load both records, re-observe the exact sessions, and refuse automatic delivery if either record is missing, stale, mismatched, or points to a different provider family. Add an XPR first reviewer-to-author binding test and a tampered-author-handle refusal test.
- [ ] Run focused tests plus `npm test`; commit. Do not add raw provider handles or credentials to tracked collateral or CLI JSON.

## Task 3: Broker-owned launch, authenticated submit, and explicit takeover

**Files:** Modify `src/startup/runtime.mjs`, `src/broker/{registry,ipc,service,client,worker}.mjs`, `src/providers/registry.mjs`, `src/cli/run.mjs`; extend `test/integration/{broker-startup,broker-ipc,provider-conformance,reviewer-guard}.test.mjs`.

**Interfaces:** Add closed broker command `launch` with only a workspace argument; the broker reads sealed registration and startup intent itself. `startup-request.json` retains v1 legacy reads; new records add an optional, closed `provider_operation` object `{ operation_id, intent_digest, status, session_fingerprint }`. The ID is derived once from request digest and reviewer role. `worker.launchReviewer({ operationId, intentDigest })` verifies its still-owned provider lease immediately before the provider call. Until Task 5 supplies the production worker, the installed recovery-only factory has no such method and `launch` refuses without provider action; injected worker tests establish the protocol seam. `submitReviewTurn` is an ordinary authenticated protocol action and does not call `fenceManualRecovery`; explicit `broker suspend` remains the manual-takeover path.

- [ ] Add failing tests with a deferred provider launch: the broker must own the resource before calling it; while launch awaits, `joinReview` and authenticated `submitReviewTurn` complete without a manual fence; one launch call is recorded. Assert zero provider calls if registration is recovery-only, broker ownership is lost, or the lease is lost between reservation and dispatch. Add tests for submit racing explicit takeover, revision change before fence publication, and bounded provider timeout producing unknown outcome.
- [ ] Run `node --test test/integration/broker-startup.test.mjs test/integration/broker-ipc.test.mjs test/integration/reviewer-guard.test.mjs`; observe the current lock/fence/lease failures.
- [ ] Route startup's provider launch through the authenticated broker `launch` command, not `request.adapter.launch` in the caller. Add `createReviewWorker.launchReviewer` as a guarded delegation to `adapter.launchReviewer` only while its resource lease verifies; a recovery-only worker has no launch capability. In the broker, reserve intent under `workspace/dispatch`, release the lock, then invoke through that worker method. Keep the broker command queue free of the dispatch lock during the provider wait. On settlement reacquire the lock and re-read request digest, operation ID, event revision, suspension/fence, and lease ownership; a legitimate early reviewer submit may advance protocol state without invalidating the same acknowledged launch.

```js
const operation = await withReviewLock(dispatchPath, () =>
  reserveProviderLaunch(workspace, intent)
);
const outcome = await worker.launchReviewer({
  operationId: operation.operation_id,
  intentDigest: operation.intent_digest,
});
await withReviewLock(dispatchPath, () => settleProviderLaunch(workspace, operation, outcome));
```

- [ ] Remove `fenceRegisteredDelivery` from ordinary `submitReviewTurn` while preserving sealed participant, active claim, response seal, revision, and launch-operation ownership checks. Explicit manual takeover requests suspension, waits for in-flight work or returns exact unknown-outcome intervention, and publishes a durable fence under the dispatch lock. Worker delivery rechecks fence, revision, and lease immediately before use. The broker's serialized command queue may wait for a bounded launch to settle; it must not turn a timeout into a retry.
- [ ] Add crash/retry tests for reserved, acknowledged, definitely-not-submitted, and outcome-unknown launch states; unknown never launches again. Migrate existing positive launch fixtures to an injected eligible broker worker and assert the installed recovery-only worker refuses launch until Task 5. Existing v1 journals and sealed events remain readable without byte changes. Run focused tests plus `npm test`; commit this combined red-to-green checkpoint before starting the bridge.

## Task 4: Bridge both roles to exact wake operations and a resident coordinator

**Files:** Create `src/broker/provider-bridge.mjs`, `test/integration/broker-worker-production.test.mjs`; modify `src/coordinator/service.mjs`, `src/providers/registry.mjs`; extend `test/integration/coordinator-wake.test.mjs`.

**Interfaces:** `createProviderBridge({ registration, authority, bindings, adapters, lease, owner })` exposes `coordinatorInput`, `observation`, `deliver`, `reconcile`, `launchReviewer`, and `close` to `createReviewWorker`. `coordinatorInput.observe()` returns a fresh observation for the current sealed role on every event; `runCoordinator` calls it before `reconcileWake`. A conformant adapter adds `deliverToSession({ binding, wakeOperationId, capsule, expectedRevision })` and `reconcileDelivery({ binding, wakeOperationId, capsuleDigest })`; these use the role's officially re-observed handle, not `storedOperation(wakeOperationId)` from reviewer launch. Each wake retains its coordinator operation ID, capsule digest, revision, target role, and target session fingerprint. The reviewer launch handle is never used for an author wake.

- [ ] Add failing tests with injected broker lease and two different provider families: reviewer submit makes the event watcher deliver the first wake to the author without a `broker reconcile` call; the author response wakes the reviewer. Assert both provider handles and session fingerprints differ. Add wrong-role/session, changed capsule/revision, absent coordinator input, lease loss, and restart-with-reserved-operation refusals.
- [ ] Run `node --test test/integration/broker-worker-production.test.mjs test/integration/coordinator-wake.test.mjs`; observe the missing role bridge and unattended delivery failures.
- [ ] Implement `coordinatorInput` using the existing coordinator lease and subscription rather than a second watcher. Change `runCoordinator` to call `await input.observe()` for each reconciliation and pass that result to `reconcileWake`; a static observation cannot remain authoritative across role changes. The observation reopens the sealed current-role binding, verifies current resident/transport health for both participants, and supplies the selected role's session fingerprint. Key the bridge's `adapters` map by `provider:host`. `deliver` checks event authority, owned role-specific provider lease, manual fence, capsule digest, revision, target role, and the officially re-observed handle immediately before action.

```js
const observation = await input.observe();
last = await reconcileWake({ ...input, observation });
```

```js
const binding = openParticipantBinding({
  workspace,
  role: input.target_role,
  authority,
  adapters,
  now,
});
if (binding.session_fingerprint !== input.target_session_fingerprint)
  throw new AprError('APR_IDENTITY_CONFLICT', 'Wake target differs from sealed participant.');
return adapters.get(`${binding.provider}:${binding.host}`).deliverToSession({
  wakeOperationId: input.operation_id,
  binding,
  capsule: input.capsule,
  expectedRevision: input.expected_revision,
});
```

- [ ] `reconcile` calls that role adapter's `reconcileDelivery` for the same provider session and wake operation after restart and returns only `acknowledged`, `not-submitted`, or `outcome-unknown`; unknown never triggers a second call. Test accepted, definitely-not-submitted, and ambiguous outcomes, and assert no wake ID aliases the startup reviewer-launch ID. A `resume-only` adapter remains manual recovery, not automatic residence.
- [ ] Run focused tests plus `npm test`; commit. This task makes the bridge independently testable; the installed broker still uses its recovery-only factory until Task 5.

## Task 5: Assemble the installed worker under a broker-owned resource lease

**Files:** Create `src/broker/worker-factory.mjs`; modify `bin/peer-review-broker.mjs`, `src/broker/{service,worker,provider-resources}.mjs`; extend `test/integration/{broker-worker-production,provider-resource}.test.mjs`.

**Interfaces:** `createProductionReviewWorker({ registration, project, runtimeImage, owner, platform, clock })` verifies sealed registration and pinned runtime, loads both role bindings and exact adapter versions, and obtains one `acquireProviderResource` lease per distinct exclusive role surface before launch or wake (or a proven concurrent descriptor). Acquire multiple exclusive resources in sorted digest order to avoid cross-project deadlock. A composite lease exposes `beforeDelivery(role)` and `release()` to `createReviewWorker({ registration, adapter: bridge, resourceLease, clock })`, with the Task 4 bridge and Task 3 `launchReviewer` method. Each resource identity uses `platform.userId()`, that role's closed provider family, and `providerResourceDigest({ userId, provider, resourceId })`; `owner.instanceId` and `owner.nonce` come from `acquireBrokerOwnership`.

- [ ] Add failing tests through the actual `bin/peer-review-broker.mjs` assembly, not an injected worker. Assert registration creates a provider-capable worker with `coordinatorInput` and role leases, then a newly submitted response triggers delivery without an explicit reconcile command. Restart must reconstruct both role bindings and the same wake operation. Missing image, incompatible adapter, recovery-only registration, broker death, and lease loss before launch must result in zero provider calls. Two projects contend on Grok's declared exclusive resource; an XPR pair needing two exclusive resources acquires in stable order and releases both on partial failure; a proven concurrent surface retains distinct sessions.
- [ ] Run `node --test test/integration/broker-worker-production.test.mjs test/integration/provider-resource.test.mjs`; observe the installed recovery-only baseline.
- [ ] Replace the entrypoint's unconditional `recoveryAdapter(registration)` with the package-owned factory. Use `verifyRuntimeImage`, `inspectStartupAuthority`, request/runtime digest, exact adapter version, and current role observations before capability promotion. Pass the verified resource descriptor, `owner.instanceId`, and `owner.nonce` to `acquireProviderResource`; call `beforeDelivery` immediately before action. A nonconformant review remains recovery-only and cannot execute Task 3's broker `launch` command.
- [ ] Keep one factory for first registration and `registry.list()` restart. Release only the owned lease after terminal or reconciled recovery; never infer permission from a timed-out heartbeat. Ensure worker/coordinator shutdown settles before release. No public coordinator command or global scheduler is added.
- [ ] Run focused tests, `npm test`, and `npm run test:packaging`; commit. Check the package inventory includes `participant-binding.mjs`, `provider-bridge.mjs`, and `worker-factory.mjs`.

## Task 6: Prove the installed release without running live accounts in default CI

**Files:** Keep `test/integration/broker-release.test.mjs` hermetic; create `test/live/installed-broker-handoff.mjs`; modify `test/integration/{setup-doctor,provider-conformance}.test.mjs`, `package.json`, `.github/workflows/ci.yml`, `docs/releases/0.3.0.md`, README, and changed help/skill goldens.

**Interfaces:** `doctor --mode automatic-required` reports provider field provenance, exact adapter/surface version, fresh health, and a specific unavailable reason; it never infers automatic support from binary installation. The ordinary installed-package integration test packs, installs offline, builds the native helper, and verifies production assembly using deterministic provider doubles. The separate `npm run test:live:broker-handoff -- --provider <claude|codex|grok>` release command invokes an actual installed subscription-backed provider and fails closed if no provider is selected, unavailable, quota-limited, skipped, or lacks a real handoff receipt. It is not part of `npm test`, `npm run test:slow`, or accountless CI.

- [ ] Add a failing hermetic `broker-release.test.mjs` assertion that the packed package uses the production factory and a role-specific coordinator bridge, not an injected test worker or the recovery stub. Add a separate failing opt-in live harness that performs the actual packed-package automatic review, joins the selected provider session, submits one reviewer response, and observes a role-specific wake without a `broker reconcile` command. The live release receipt requires normal commit mode and real authority; a labeled no-commit run tests mechanics only.
- [ ] Add doctor tests for unsupported versions, absent effort acknowledgment, quota limit, lease busy, and no Gemini production selector. The live script accepts one explicit local provider choice, caps turns and elapsed time, redacts handles, never uses a separately billed API key, and exits nonzero on limit or missing evidence without retry. Add the exact `test:live:broker-handoff` package script; do not put the live test under `test/integration/**/*.test.mjs` or the default CI matrix.
- [ ] Run hermetic installed/doctor tests red, implement package/help/docs wiring, then run `npm test`, `npm run test:slow`, `npm run test:packaging`, `npm run lint`, and `npm run format:check`. Run `npm pack --dry-run --json` and inspect included files. Run supported-host CI for the exact pushed head on Linux, macOS, and Windows; do not substitute an earlier green SHA.
- [ ] In an operator-approved provider window, run the separate live release command once. Record a bounded, sanitized receipt with exact package head, both role providers/sessions as digests, adapter/surface versions, evidence sources, coordinator wake operation, and outcome; store no raw handles or secrets in tracked collateral. If it cannot prove the gate, leave #88/#39 open and request a scope decision. Do not publish npm or close the epic from this task.
- [ ] Commit docs/tests after verification. Request whole-branch code review of the exact head and stop for an operator check-in after no more than two chained newly discovered defects or failed fix rounds.

## Self-review and acceptance map

| Amendment gate                                                       | Plan tasks and decisive test                                                                           |
| -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Independent model/effort/session and adapter provenance              | 1–2; `test/unit/provider-evidence.test.mjs`, `test/integration/provider-conformance.test.mjs`          |
| No new paid API budget or provider substitution                      | 1, 6; sanitized conformance record, opt-in bounded live script                                         |
| Dispatch lock released before provider wait; durable unknown outcome | 3; `test/integration/broker-startup.test.mjs`                                                          |
| Authenticated submit distinct from manual takeover                   | 3; `test/integration/broker-startup.test.mjs`, `test/integration/reviewer-guard.test.mjs`              |
| Pinned production worker and provider lease                          | 5; `test/integration/broker-worker-production.test.mjs`, `test/integration/provider-resource.test.mjs` |
| Exact wake, both role sessions, coordinator, restart reconciliation  | 2, 4–5; `test/integration/coordinator-wake.test.mjs`, installed worker test                            |
| Real installed-provider automatic handoff and cross-platform head    | 6; hermetic `test/integration/broker-release.test.mjs`, opt-in live receipt, CI matrix                 |
| Legacy recovery and Gemini exclusion                                 | 2, 6; existing legacy fixtures, doctor/selector tests                                                  |

## Astra SAR repair map

| Important finding                              | Plan repair                                                                                                              |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Reviewer handle cannot wake the author         | Task 2 records separate role bindings; Task 4 selects each role's own adapter and session; Task 5 tests XPR restart.     |
| Production bridge omits coordinator startup    | Task 4 supplies `coordinatorInput.observe()` and an event-triggered wake test; Task 5 verifies the installed entrypoint. |
| Startup launch escapes the broker lease        | Task 3 routes launch through a broker worker and refuses recovery-only launch; Task 5 supplies and tests the real lease. |
| Serial checkpoints cannot become green         | Task 3 combines lock and submit/takeover work; Task 4 builds the bridge before Task 5 installs the factory.              |
| Live provider would run in default integration | Task 6 keeps the installed integration hermetic and adds a separate fail-closed live release command.                    |

This plan is proposed implementation authority only after its own review and the issue's governed Plan approval. It does not itself promote #88's Backlog board state, authorize provider spending, or waive any release gate.
