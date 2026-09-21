# Provider Authority and Broker Reconciliation (#88) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Read the approved amendment and this entire plan before implementation; execute serially unless the operator authorizes delegation.

**Goal:** Make new broker-owned reviews provably bind to the actual reviewer session and deliver through a production worker without deadlock, invented provider evidence, or duplicate wakeups.

**Architecture:** A package-owned provider evidence boundary validates official, exact-session observations separately from the pinned adapter version. Startup reserves one durable provider operation under the dispatch lock, releases that lock before waiting, and allows an authenticated reviewer submission without invoking manual takeover. The installed broker reconstructs a review-scoped worker from sealed registration and pinned runtime, leases its provider resource, and bridges the existing wake ledger to an exact provider session and operation.

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

Before Task 2, establish at least one candidate installed surface that can supply all required official session-bound observation, exact delivery, and outcome-reconciliation semantics without a new paid API credential. Task 1 records what each installed version actually exposes. If none qualifies, **stop**: leave #88/#39 open, report the missing fields or control operation and an explicit scope decision to the operator. Do not build a fixture-only positive path and call it complete. A later provider limit or failed health check likewise stops that provider's live run without retry or substitution.

Use a project-local `.scratch/test/` sandbox for new tests; reuse `test/helpers/internal-api.mjs` and existing review fixtures. Existing test modules that use `node:os` temporary fixtures need not be mechanically rewritten in #88. Keep new package files inside the `package.json#files` inventory. Before each task commit, run its focused tests and `npm test`; do not knowingly carry a red default suite into the next task.

## File and interface map

| Responsibility                              | Files                                                                                                                                                                                                                                                                  |
| ------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Proven capability and evidence contract     | Create `src/providers/evidence.mjs`, `src/providers/conformance.mjs`; modify `src/providers/{registry,claude,codex,grok}.mjs`, `src/doctor.mjs`; test `test/unit/{provider-evidence,provider-capabilities}.test.mjs`, `test/integration/provider-conformance.test.mjs` |
| Reviewer claim and CLI authority            | Modify `src/cli/run.mjs`, `src/startup/runtime.mjs`; test `test/integration/{provider-conformance,start-join,reviewer-guard}.test.mjs`                                                                                                                                 |
| Durable startup operation and lock lifetime | Modify `src/startup/runtime.mjs`, `src/broker/registry.mjs`, `src/providers/registry.mjs`; test `test/integration/broker-startup.test.mjs`                                                                                                                             |
| Explicit manual takeover                    | Modify `src/cli/run.mjs`, `src/broker/client.mjs`, `src/broker/worker.mjs`; test `test/integration/{broker-startup,reviewer-guard}.test.mjs`                                                                                                                           |
| Installed worker construction and lease     | Create `src/broker/worker-factory.mjs`; modify `bin/peer-review-broker.mjs`, `src/broker/{service,worker,provider-resources}.mjs`; test `test/integration/{broker-worker-production,provider-resource}.test.mjs`                                                       |
| Exact wake bridge and restart               | Create `src/broker/provider-bridge.mjs`; modify `src/coordinator/service.mjs`, `src/providers/registry.mjs`; test `test/integration/{broker-worker-production,coordinator-wake}.test.mjs`                                                                              |
| Installed release and compatibility         | Modify `test/integration/broker-release.test.mjs`, `test/integration/setup-doctor.test.mjs`, `.github/workflows/ci.yml`, `docs/releases/0.3.0.md`, README and installed skill/help only where behavior changes                                                         |

The public seam is `createProviderAdapter({ surface, ... })`. Add `verifyProviderEvidence({ expected, providerEvidence, adapterAttestation, authorFingerprint, now }) -> { provider, host, model_id, effort, adapter_version, session_fingerprint, assurance: 'runtime', evidence_digest }`, where `providerEvidence` contains the official source, source version, observation time, exact provider session ID, operation ID, model and effective effort acknowledgment, and `adapterAttestation` comes from the executing pinned runtime. The returned record contains no raw handle. A nonconforming surface returns an explicit unavailable reason rather than an inferred value.

The broker seam is `createProductionReviewWorker({ registration, project, runtimeImage, owner, platform, clock }) -> ReviewWorker`. The worker receives `createProviderBridge({ registration, authority, adapter, lease })`, which maps the existing `wakeOperationKey` to the sealed target role/session and a separate provider launch handle. Keep the coordinator ledger's operation ID distinct from the startup request digest.

## Task 1: Establish conformance evidence and truthful capability policy

**Files:** Create `src/providers/conformance.mjs`, `test/unit/provider-evidence.test.mjs`; modify `src/providers/{registry,claude,codex,grok}.mjs`, `src/doctor.mjs`, `test/unit/provider-capabilities.test.mjs`, `test/integration/provider-conformance.test.mjs`. Record sanitized version/provenance findings in `docs/conformance/2026-09-21-88-installed-provider-surfaces.md` (no raw session IDs or credentials).

**Interfaces:** `evaluateSurfaceConformance({ adapterVersion, surfaceVersion, evidenceSources, operations, health }) -> { healthy, automatic, reasons }`. Every claimed field has an official source; `automatic` requires exact launch or wake, exact-session lookup, outcome reconciliation, and fresh health. A mere `--version` success sets only `installed: true`.

- [ ] Write failing tests: an installed executable with no official effort acknowledgment reports `automatic: false`; missing exact-session reconciliation or a changed surface version also reports false; an exact, fully evidenced fixture reports true only when fresh health is true. Assert `doctor --mode automatic-required` is unhealthy for all unproven production surfaces and that Gemini/Antigravity never appears in the selector table.
- [ ] Run `node --test test/unit/provider-evidence.test.mjs test/unit/provider-capabilities.test.mjs test/integration/provider-conformance.test.mjs`; observe the expected failures before implementation.
- [ ] Implement the closed evaluator. Its positive branch must be conjunctive, for example:

```js
const automatic =
  health.healthy === true &&
  evidenceSources.model === 'official-exact-session' &&
  evidenceSources.effort === 'official-exact-session' &&
  evidenceSources.session === 'official-exact-session' &&
  operations.launch === 'exact' &&
  operations.deliver === 'exact' &&
  operations.reconcile === 'exact';
```

- [ ] Inspect installed versions and official local help/result schemas read-only for Claude, Codex, and Grok. Record each source, version, returned field, missing field, and operation outcome in the sanitized conformance document. If a live probe is needed, obtain the operator's bounded window first; run at most one explicit probe per surface, stop on quota errors, and do not use a separately billed API key. No positive production conformance row may be written from documentation or a test double alone.
- [ ] Run `npm test` and the focused tests; commit the exact evidence-policy files and sanitized record. If there is no qualifying installed surface, stop the plan here and report the release blocker rather than changing the acceptance criterion.

## Task 2: Bind reviewer claims to independent provider evidence

**Files:** Create `src/providers/evidence.mjs`; modify `src/providers/{registry,claude,codex,grok}.mjs`, `src/cli/run.mjs`, `src/startup/runtime.mjs`; extend `test/unit/provider-evidence.test.mjs`, `test/integration/{provider-conformance,start-join}.test.mjs`.

**Interfaces:** `verifyProviderEvidence` has the signature above. `adapter.observeCurrentSession({ operationId, expected, workspace })` obtains an official current-session record for a conformant surface. `adapter.attestVersion({ runtimeImage })` reads the executing pinned adapter identity; it must not appear inside provider-emitted evidence. `joinReview` receives only a validated runtime evidence projection or an explicitly declared manual identity.

- [ ] Add failing tests in `provider-conformance.test.mjs` for ordinary CLI join where sealed model, effort, adapter version, or session differs from the actual provider record; missing/stale/provider-unbound observation; a distinct author/reviewer session; and a declared manual join. Reject synthetic observation made by `runtimeObservationForJoin` even when all requested values match. Assert a launch-command echo from the Claude surface is not `runtime` assurance.
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
- [ ] Run focused tests plus `npm test`; commit. Do not add raw provider handles or credentials to tracked collateral or CLI JSON.

## Task 3: Reserve one launch operation and release the dispatch lock before waiting

**Files:** Modify `src/startup/runtime.mjs`, `src/broker/registry.mjs`, `src/providers/registry.mjs`; extend `test/integration/{broker-startup,provider-conformance}.test.mjs`.

**Interfaces:** `startup-request.json` retains v1 legacy reads; new records add an optional, closed `provider_operation` object `{ operation_id, intent_digest, status, session_fingerprint }`. The operation ID is derived once from the sealed request digest and reviewer role, not from a retry's clock. `reserveProviderLaunch` writes intent while locked; `settleProviderLaunch` conditionally records `definitely-not-submitted`, `acknowledged`, or `outcome-unknown` for that same ID.

- [ ] Write a failing `broker-startup.test.mjs` test with a deferred `adapter.launch`: while launch has not resolved, `joinReview` and authenticated `submitReviewTurn` must complete; the launch is called once. Add crash/retry tests for reserved, acknowledged, definitely-not-submitted, and outcome-unknown states; an unknown outcome never calls launch again. Existing v1 journal fixtures remain readable without adding bytes to sealed events.
- [ ] Run `node --test test/integration/broker-startup.test.mjs test/integration/provider-conformance.test.mjs`; observe the deadlock/unknown-outcome failures.
- [ ] Split `activateStartup` into two short dispatch-lock transactions with the provider await outside both:

```js
const operation = await withReviewLock(dispatchPath, () =>
  reserveProviderLaunch(workspace, intent)
);
const outcome = await adapter.launch({ ...request, operationId: operation.operation_id });
await withReviewLock(dispatchPath, () => settleProviderLaunch(workspace, operation, outcome));
```

- [ ] Re-read exact event revision, manual suspension/fence, request digest, and operation record in the settlement transaction. A reviewer submit may already have advanced the protocol; accept the same acknowledged operation without rewinding state. An interrupted or ambiguous launch stays `outcome-unknown` until official exact-operation reconciliation, not a repeat launch.
- [ ] Run focused tests plus `npm test`; commit. Preserve the old journal and sealed-review recovery path.

## Task 4: Separate ordinary authenticated submit from manual takeover

**Files:** Modify `src/cli/run.mjs`, `src/broker/client.mjs`, `src/broker/worker.mjs`; extend `test/integration/{broker-startup,reviewer-guard}.test.mjs`.

**Interfaces:** `submitReviewTurn` checks sealed participant, current claim, response seal, revision, and provider operation ownership without calling `fenceManualRecovery`. `fenceManualRecovery` remains the explicit broker `suspend`/offline takeover path. A takeover first requests suspension, waits for in-flight work or returns the exact unknown-outcome intervention, then publishes the durable fence under `dispatch`.

- [ ] Add failing tests for reviewer submit before launch resolves, submit during a queued broker wake, manual takeover racing submit, and a changed revision between suspension and fence publication. In the ordinary authenticated path, assert no `manual-suspension.json` or `manual-fence.json`; in explicit takeover, assert the fence is durable before any later worker delivery.
- [ ] Run `node --test test/integration/broker-startup.test.mjs test/integration/reviewer-guard.test.mjs`; observe the current automatic fencing failure.
- [ ] Remove `fenceRegisteredDelivery` from ordinary `submitReviewTurn`; retain the exact claim and response checks. Make the offline takeover entrypoint explicit and ensure `fenceManualRecovery` uses the same operation-state authority as Task 3. Keep `createReviewWorker`'s last-moment fence/revision check, including after an awaited observation.
- [ ] Run focused tests plus `npm test`; commit. A manual takeover must never turn an unknown provider outcome into permission to retry.

## Task 5: Construct a production broker worker and acquire its resource

**Files:** Create `src/broker/worker-factory.mjs`, `test/integration/broker-worker-production.test.mjs`; modify `bin/peer-review-broker.mjs`, `src/broker/{service,worker,provider-resources}.mjs`; extend `test/integration/provider-resource.test.mjs`.

**Interfaces:** `createProductionReviewWorker({ registration, project, runtimeImage, owner, platform, clock })` verifies registration and pinned runtime, selects the exact adapter version, obtains `acquireProviderResource` for an exclusive surface (or a proven concurrent descriptor), and returns `createReviewWorker({ registration, adapter: bridge, resourceLease, clock })`. The resource identity uses `platform.userId()`, the closed provider family, and `providerResourceDigest({ userId, provider, resourceId })`; `owner.instanceId` and `owner.nonce` come from `acquireBrokerOwnership`. Unsupported or incompatible surfaces return an explicit recovery-only worker, never an apparently automatic one.

- [ ] Add failing tests that launch the actual `bin/peer-review-broker.mjs` assembly rather than passing an injected worker. Assert an eligible registered review gets a provider-capable worker; restart reconstructs the same review/adapter/session binding; incompatible version, missing image, missing lease, and lease loss refuse dispatch. Assert two projects contend on Grok's declared exclusive resource and that a proven concurrent surface retains distinct sessions.
- [ ] Run `node --test test/integration/broker-worker-production.test.mjs test/integration/provider-resource.test.mjs`; observe recovery-only baseline and lease failures.
- [ ] Replace the entrypoint's unconditional `recoveryAdapter(registration)` factory with the new package-owned factory. Use `verifyRuntimeImage`, `inspectStartupAuthority`, and the registration's sealed request/runtime digest before selecting any adapter. Pass `identity`, `instanceId`, `nonce`, and the adapter's verified resource descriptor to `acquireProviderResource`; call `beforeDelivery` immediately before provider action and release only the owned lease after a terminal or reconciled state.
- [ ] Keep `runBroker`'s registration/restart path singular: both initial registration and `registry.list()` reconstruction call the same factory, and worker construction failure remains fail-closed. Never add a public coordinator command or global scheduler.
- [ ] Run focused tests, `npm test`, and `npm run test:packaging`; commit. Check package inventory contains both new broker modules.

## Task 6: Bridge exact wake operations and reconcile restart ambiguity

**Files:** Create `src/broker/provider-bridge.mjs`; modify `src/coordinator/service.mjs`, `src/providers/registry.mjs`, `src/broker/worker-factory.mjs`; extend `test/integration/{broker-worker-production,coordinator-wake}.test.mjs`.

**Interfaces:** `createProviderBridge({ registration, authority, adapter, lease })` exposes `observation`, `deliver`, `reconcile`, and `close` to `createReviewWorker`. Each delivery input contains the coordinator's `operation_id`, `capsule_digest`, expected revision, target role, and target session fingerprint. The bridge separately resolves the startup provider handle from `registration.request_digest`, verifies that handle's fingerprint matches the sealed target, then issues one exact provider wake; `reconcile` queries the same provider operation before any retry.

- [ ] Add failing tests for successful role-specific author/reviewer wake, wrong target session, changed capsule/revision, restart with a reserved operation, provider `definitely-not-submitted`, provider `acknowledged`, and provider `outcome-unknown`. Assert two different wake IDs never alias the startup launch ID, and ambiguity never generates a second provider call.
- [ ] Run `node --test test/integration/broker-worker-production.test.mjs test/integration/coordinator-wake.test.mjs`; observe the recovery-only/missing-bridge failures.
- [ ] Implement the bridge against the existing `reserveWakeOperation`/`reconcileWake` machinery. Its `deliver` checks the current sealed authority, lease, manual fence, exact capsule digest, and provider session fingerprint immediately before provider action. Its `reconcile` uses the official exact-session/operation surface and returns only `acknowledged`, `not-submitted`, or `outcome-unknown`; `not-submitted` permits one ledger-controlled retry, while unknown does not.
- [ ] Prove coordinator residence and transport health for both participants before advertising `automatic-required`. A `resume-only` adapter may provide a manual recovery command but never enters the automatic bridge. Keep the broker's worker `close()`/lease release ordered after coordinator settlement.
- [ ] Run focused tests plus `npm test`; commit. Preserve legacy manual wake receipts and terminal agreement semantics.

## Task 7: Prove installed release, truthful doctor output, and exact-head CI

**Files:** Modify `test/integration/{broker-release,setup-doctor,provider-conformance}.test.mjs`, `.github/workflows/ci.yml`, `docs/releases/0.3.0.md`, README, and any changed help/skill golden fixtures. Add `test/live/provider-control-conformance.mjs` only for the qualifying installed provider identified in Task 1; keep it opt-in and bounded.

**Interfaces:** `doctor --mode automatic-required` reports provider field provenance, exact adapter/surface version, fresh health, and a specific unavailable reason; it never infers automatic support from binary installation. The installed-package test uses `npm pack --ignore-scripts`, offline install, explicit native-helper build, and the installed broker entrypoint.

- [ ] Add a failing installed-package test that starts a real broker-owned automatic review from the packed package, joins the actual selected provider session, submits one reviewer response, and observes a role-specific wake through the production worker. It must fail if the worker is an injected fixture or if the provider result lacks official model/effort/session evidence. The release receipt must use normal commit mode and real authority; a visibly labeled no-commit test run can test mechanics but is not normal acceptance evidence.
- [ ] Add/extend doctor tests for all three selectors: unsupported versions, missing effort acknowledgment, quota limit, lease busy, and no Gemini production selector. The selected live conformance script must accept an explicit local invocation, cap turns/time, redact handles, and exit nonzero on quota without retry. Do not run it in ordinary CI where provider accounts are unavailable.
- [ ] Run the focused installed/doctor tests red, implement only the necessary package/help/docs wiring, then run `npm test`, `npm run test:slow`, `npm run test:packaging`, `npm run lint`, and `npm run format:check`. Run `npm pack --dry-run --json` and inspect included files. Run supported-host CI for the exact pushed head on Linux, macOS, and Windows; do not substitute an earlier green SHA.
- [ ] Record one bounded, sanitized real-provider automatic-handoff receipt from the installed package, with exact package head, adapter/surface versions, evidence sources, operation outcome, and no secrets. If the installed provider cannot prove the gate, leave #88/#39 open and request an explicit scope decision. Do not publish npm or close the epic from this task.
- [ ] Commit docs/tests after verification. Request a fresh whole-branch code review of the exact head and resolve no more than two chained defects or failed fix rounds before checking in with the operator.

## Self-review and acceptance map

| Amendment gate                                                       | Plan tasks and decisive test                                                                           |
| -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Independent model/effort/session and adapter provenance              | 1–2; `test/unit/provider-evidence.test.mjs`, `test/integration/provider-conformance.test.mjs`          |
| No new paid API budget or provider substitution                      | 1, 7; sanitized conformance record, opt-in bounded live script                                         |
| Dispatch lock released before provider wait; durable unknown outcome | 3; `test/integration/broker-startup.test.mjs`                                                          |
| Authenticated submit distinct from manual takeover                   | 4; `test/integration/broker-startup.test.mjs`, `test/integration/reviewer-guard.test.mjs`              |
| Pinned production worker and provider lease                          | 5; `test/integration/broker-worker-production.test.mjs`, `test/integration/provider-resource.test.mjs` |
| Exact wake, role/session mapping, restart reconciliation             | 6; `test/integration/coordinator-wake.test.mjs`                                                        |
| Real installed-provider automatic handoff and cross-platform head    | 7; `test/integration/broker-release.test.mjs`, opt-in live receipt, CI matrix                          |
| Legacy recovery and Gemini exclusion                                 | 2, 7; existing legacy fixtures, doctor/selector tests                                                  |

This plan is proposed implementation authority only after its own review and the issue's governed Plan approval. It does not itself promote #88's Backlog board state, authorize provider spending, or waive any release gate.
