# Project-Local SPR/XPR Broker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Read the spec and this entire plan before implementation; execute serially unless the user authorizes delegation.

**Goal:** Make author/reviewer intent the startup contract, with one authenticated, project-local broker for new cross-provider reviews and unchanged recovery for existing reviews.

**Architecture:** Resolve and seal participant selection before creating review authority. A package-owned broker serves one physical worktree, authenticates local clients, and delegates review-scoped wake decisions to the existing event/receipt/operation machinery. Provider-resource locks coordinate exclusive surfaces across projects without introducing a global scheduler. Protocol events remain authority; broker registries and leases are runtime records.

**Tech Stack:** Node.js >=24, ESM, `node:test`, existing JSON Schema and Git transaction infrastructure, local IPC, package-owned OS security bindings where Node does not expose the required primitives.

**Spec:** `docs/design/2026-09-14-project-local-spr-xpr-broker-design.md`

## Global Constraints

- `ai-peer-review` remains one npm package.
- The invoking agent session is the author by default.
- Reviewer provider and model are required. Reviewer effort defaults to `medium`.
- `--artifact-kind` remains required; valid kinds are `spec` and `plan`.
- Unsupported effort or model choices fail preflight without substitution.
- The first release implementing this contract must use a new minor version above `0.2.x` and explain the startup migration. It must not republish `0.2.2`.
- Existing reviews continue from their sealed descriptor and do not acquire new startup requirements when read, resumed, submitted, advanced, or finalized.
- New XPR startup must use the project-local broker, including explicit manual transport.
- Runtime ownership, transport capability, and SPR/XPR classification are distinct fields.
- Package version, broker protocol version, and Node major version must initially match exactly.
- The physical project root is the worktree top level, not the Git common directory.
- Unknown or `other` families cannot be compared as if they were one vendor.
- Gemini CLI and Antigravity are not supported selectors in this first release.
- The broker shuts down after 60 seconds with no runnable work, resetting the timer whenever runnable work arrives.
- Accepted reviewer responses are not terminal until author finalization completes.
- A timed-out heartbeat alone never permits stealing.
- Event authority, exact participant identity, response seals, reviewer non-mutation, author-only finalization/advance, and exact-path commits remain intact.
- No global npm installation, daemon, scheduler, launch agent, shared port fallback, automatic reviewer substitution, or duplicate wake implementation.

<!-- cspell:words LOCALAPPDATA nonblocking getpeereid PEERCRED DACL multiproject -->

## Baseline, scope, and implementation choices

Baseline inspected: `54a1677` in this worktree. The design's accepted artifact is blob `4fafa9f821cf062282a845d20b64848355f02bd1`, reviewed by record `review-814c7c140b809d00b564ed1d1868f59d`. Its document header still says draft; the terminal review manifest records reviewer consensus, not Human Authority approval. The user's instruction here authorizes planning and plan review only.

The repository declares version `0.2.2`, includes #9 durable wakeups and #10 ordered phases, and already contains a draft `docs/releases/0.3.0.md`. No issue number is attached to this new design; do not reuse #9 or #10 as its delivery issue. This plan does not create issues, authorize implementation, or authorize release.

Use the established `docs/plans/` location. Keep `.ai-peer-review.json` as the configuration surface; do not implement the separate project-local knowledge/storage design. Use `spr` and `xpr` as help topics only for the initial release, resolving the design's optional alias question without a second startup grammar.

The native security helper below is an implementation choice for review: Node's portable JavaScript APIs do not supply all peer-credential, SID/ACL, and OS-lock guarantees required here. Keep it in this npm package, load it only for broker paths, and retain legacy manual operation when unavailable. Do not claim a supported broker platform from mocked conformance tests alone.

## File and interface map

| Responsibility                           | Files                                                                                                                                   |
| ---------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Startup selection and transport planning | New `src/startup/selection.mjs`, `src/startup/runtime.mjs`; existing `src/identity/{registry,codex,claude,grok}.mjs`                    |
| Sealed runtime schema                    | New `schemas/runtime-v1.json`; existing event/protocol validators, schemas, and manifest renderer                                       |
| Physical identity and cache paths        | New `src/broker/identity.mjs`, `src/broker/paths.mjs`                                                                                   |
| OS security boundary                     | New `src/broker/platform.mjs`, `native/broker-security/{binding.gyp,addon.cc,posix.cc,windows.cc}`, `scripts/build-broker-security.mjs` |
| Authenticated IPC and ownership          | New `src/broker/{ownership,ipc}.mjs`, `schemas/broker-v1.json`                                                                          |
| Pinned runtime and project service       | New `src/broker/{runtime-image,registry,service,client}.mjs`, `bin/peer-review-broker.mjs`                                              |
| Cross-project exclusive resource locks   | New `src/broker/provider-resources.mjs`, `schemas/provider-resource-v1.json`                                                            |
| Review-scoped wake worker                | New `src/broker/worker.mjs`; reuse `src/coordinator/{decision,ledger,lease,service}.mjs` internally                                     |
| Provider control                         | New `src/providers/{registry,codex,claude,grok}.mjs`; existing `src/transport/*.mjs`                                                    |
| Agent and operator interface             | Existing `src/cli/{parse,run,help-data}.mjs`, `src/doctor.mjs`, `src/config/load.mjs`, `schemas/config-v1.json`                         |
| Distribution and migration               | Existing `src/public-api.mjs`, `package.json`, `package-lock.json`, `.github/workflows/`, README, templates, skill, release notes       |

New test modules named in tasks are deliverables, not existing helpers. Snippets use `node:test` and `node:assert/strict`; import those and the explicitly named target functions in each new test. Existing integration fixtures are in `test/helpers/review-fixture.mjs` and `test/helpers/repository-fixture.mjs`. Preserve existing test utilities rather than inventing a parallel protocol fixture implementation.

Each task follows red/green verification and ends with an exact-path commit. Code examples define critical algorithms and assertions; the detailed matrices following them are required coverage. All new internal interfaces use camelCase arguments; sealed records use snake_case keys as shown below.

### Task 1: Resolve reviewer selection and runtime eligibility without mutation

**Files:** Create `src/startup/selection.mjs`, `src/startup/runtime.mjs`, `src/providers/registry.mjs`, `test/unit/startup-selection.test.mjs`; modify `src/cli/parse.mjs`, `src/config/load.mjs`, `schemas/config-v1.json`, `test/unit/cli-parse.test.mjs`.

**Interfaces:** `resolveSelection({ author, selector, model, effort = 'medium' }, adapters)` asynchronously returns `{ selector, provider, host, model_id, model_display, effort, classification }`. `selectRuntime({ selection, author, requestedTransport, policy, capabilities })` returns `{ ownership: 'native'|'broker', transport_mode, adapter_version }`. Adapters implement `resolveModel({ model, effort }) -> { model_id, model_display, effort }` and capability observation; Task 9 supplies production adapters.

- [ ] Add parser tests requiring the two new singleton flags and preserving all ten existing flag groups from the spec. Assert absent selection, unsupported selector, empty model/effort, invalid phase lists, and duplicate flags fail before invoking any startup dependency.

```js
assert.throws(() => parseCommand(['start', 'docs/a.md', '--artifact-kind', 'plan']), {
  code: 'APR_USAGE',
});
const parsed = parseCommand([
  'start',
  'docs/a.md',
  '--artifact-kind',
  'plan',
  '--reviewer-provider',
  'claude',
  '--reviewer-model',
  'opus',
]);
assert.equal(parsed.options.reviewerEffort, 'medium');
```

- [ ] Run `node --test test/unit/cli-parse.test.mjs test/unit/startup-selection.test.mjs`; expect missing selection enforcement/interfaces.
- [ ] Implement the closed mapping and family comparison; call the selected adapter to resolve the exact model and effort, with no fallback.

```js
export const SELECTORS = Object.freeze({
  codex: { provider: 'openai', host: 'codex' },
  claude: { provider: 'anthropic', host: 'claude-code' },
  grok: { provider: 'xai', host: 'grok' },
});
// After validating author and requested adapter against the closed families:
const classification = author.provider === selected.provider ? 'SPR' : 'XPR';
```

- [ ] Add `review.startup_transport_preference`, an optional ordered, unique array of existing transport names, to closed config validation/schema. Explicit `--transport-mode` constrains selection; otherwise existing `review.transport_mode` takes priority, then this preference list. Missing policy/capability intersection fails with `APR_TRANSPORT_UNAVAILABLE`. Never infer automatic capability from an installed executable or setup config.
- [ ] Test every selector against all three families; reject `other`, unknown authors, Google selectors, model/effort substitution, and unresolved identity. For same-family surfaces, require proven exact-session native control; otherwise select a conformant broker path or refuse while retaining `SPR`. Restricted declared identity is manual-only and cannot acquire runtime/automatic claims.
- [ ] Rerun the focused command; expect all assertions to pass. Commit the exact files above with `feat(startup): resolve explicit reviewer intent`.

### Task 2: Seal startup intent and validate reviewer registration

**Files:** Create `schemas/runtime-v1.json`, `test/unit/runtime-descriptor.test.mjs`; modify `src/protocol/events.mjs`, `src/protocol/reducer.mjs`, `src/cli/run.mjs`, `src/manifest/render.mjs`, `schemas/event-v1.json`, `schemas/protocol-v1.json`, `test/unit/events.test.mjs`, `test/integration/start-join.test.mjs`.

**Interfaces:** Export `validateRuntimeDescriptor(value)` and `assertRequestedReviewer(runtime, identity, observation)` from `src/startup/runtime.mjs`. Add optional `review-created.payload.startup.runtime`; absence means legacy, not permission to create new reviews without reviewer selection.

- [ ] Add tests using the following closed runtime record. Runtime descriptors identify requested participants, not raw resume handles.

```js
const runtime = {
  schema: 'ai-peer-review.runtime/v1',
  classification: 'XPR',
  ownership: 'broker',
  transport_mode: 'manual',
  reviewer: {
    selector: 'claude',
    provider: 'anthropic',
    host: 'claude-code',
    model_id: 'fixture-opus',
    model_display: 'Fixture Opus',
    effort: 'high',
  },
  adapter_version: '1.0.0',
  project_root_digest: 'a'.repeat(64),
};
assert.throws(() => validateRuntimeDescriptor({ ...runtime, unexpected: true }), {
  code: 'APR_USAGE',
});
```

- [ ] Run `node --test test/unit/runtime-descriptor.test.mjs test/unit/events.test.mjs test/integration/start-join.test.mjs`; expect missing optional event support and registration checks.
- [ ] Include the descriptor in deterministic request identity, event payload, sealed startup context, and startup/invitation digest inputs. Extend exact-key validators and JSON schemas together. At join, compare provider, host/product surface, exact model, effort observation, and adapter version before `reviewer-joined` or any turn claim. Continue requiring a distinct session fingerprint. Reject mismatch with existing identity errors; never edit the requested identity to fit the arriving reviewer.
- [ ] Keep model effort in the runtime descriptor and adapter observation, not an unversioned extension to `participants-v1`. For manual declared registrations, explicitly label assurance and require the restricted declaration to match requested values; it supplies no conformance proof.
- [ ] Add legacy event fixtures and assert reduction/manifest output is unchanged when runtime is absent. New descriptors appear in new manifests only. Old `status`, `resume`, `submit`, `advance`, and `finalize` must not call selection or broker acquisition.
- [ ] Rerun focused tests plus `node --test test/unit/reducer.test.mjs test/unit/manifest.test.mjs`; commit exact changed files with `feat(protocol): seal requested reviewer and runtime`.

### Task 3: Canonical project identity and platform endpoint paths

**Files:** Create `src/broker/identity.mjs`, `src/broker/paths.mjs`, `test/unit/broker-identity.test.mjs`; modify `src/git/repository.mjs`, `test/unit/repository.test.mjs` only to expose/reuse physical root and common-directory canonicalization.

**Interfaces:** `canonicalProjectIdentity({ cwd, platform }) -> { tuple, digest, physicalRoot, commonDirectory, userId }`; `rootDigest(tuple) -> string`; `brokerPaths({ identity, platform, env, home }) -> { directory, endpoint, lock, metadata }`. The injected platform supplies canonical paths and the OS user ID through Task 4.

- [ ] Add deterministic digest tests and fixture tests for symlink aliases, distinct linked worktrees sharing Git storage, non-Git identity with null common directory, Unicode paths, and Windows volume/path canonicalization.

```js
const tuple = [
  'ai-peer-review.broker-root/v1',
  '/physical/project',
  '/physical/project/.git',
  '501',
];
assert.equal(
  rootDigest(tuple),
  createHash('sha256').update(JSON.stringify(tuple), 'utf8').digest('hex')
);
assert.notEqual(rootDigest(tuple), rootDigest([tuple[0], '/physical/linked', tuple[2], tuple[3]]));
```

- [ ] Run `node --test test/unit/broker-identity.test.mjs test/unit/repository.test.mjs`; expect missing module.
- [ ] Implement physical absolute path resolution once and reuse it for routing and validation. Use UID/SID strings, never display names. Do not add package/protocol/Node versions to the root tuple.
- [ ] Implement macOS `~/Library/Caches`, Linux absolute `XDG_CACHE_HOME` or `~/.cache`, Windows `%LOCALAPPDATA%`, then `ai-peer-review/brokers/<digest>/`. Windows named pipes include the digest; `broker.sock` is a logical label there. Test unsupported or overlong endpoints fail before opening, with no truncation/hash-shortening or TCP fallback.
- [ ] Test stable endpoint routing across changed version inputs; Project B can only derive B's endpoint. Rerun focused tests and commit exact files with `feat(broker): derive physical project identity`.

### Task 4: OS ownership and authenticated local IPC

**Files:** Create `src/broker/platform.mjs`, `src/broker/ownership.mjs`, `src/broker/ipc.mjs`, `schemas/broker-v1.json`, `native/broker-security/binding.gyp`, `native/broker-security/addon.cc`, `native/broker-security/posix.cc`, `native/broker-security/windows.cc`, `scripts/build-broker-security.mjs`, `test/unit/broker-ownership.test.mjs`, `test/integration/broker-ipc.test.mjs`; modify `package.json`, `package-lock.json` for helper build tooling and package file inclusion.

**Interfaces:** `platformSecurity()` exposes `canonicalPath`, `userId`, `openPrivateDirectory`, `acquireExclusive`, `listenPrivate`, and `peerUser`. Locks return `{ instanceId, nonce, verify(), release() }`; release verifies ownership. `acquireBrokerOwnership({ identity, paths, versions }, platform)` and `connectBroker({ identity, paths, versions }, platform)` return authenticated owner/client handles or stable errors. Versions are `{ package_version, broker_protocol_version, node_major }`.

- [ ] Add contract tests that substitute hostile platform observations: symlink/reparse-point resources, foreign owner, permissive directory, nonce mismatch, same PID/different instance, dead-looking heartbeat/live OS lock, and tampered metadata. No case may produce an authenticated connection or delete a foreign lock.

```js
assert.equal(owner.verify(), true);
assert.throws(() => platform.acquireExclusive(lockPath, { instanceId: 'second' }), {
  code: 'APR_BROKER_OWNED',
});
assert.equal(foreignOwner.release(), false);
```

- [ ] Run `node --test test/unit/broker-ownership.test.mjs test/integration/broker-ipc.test.mjs`; expect absent platform/IPC implementation.
- [ ] Implement the Node-API helper with POSIX `flock`/nonblocking exclusive file locks and peer credentials (`getpeereid` on macOS, `SO_PEERCRED` on Linux), directory-relative no-follow file operations, mode 0700 directories and 0600 resources. Windows uses canonical filesystem handles, SID checks, `LockFileEx`, a named pipe restricted by an owner-only DACL, and client-token SID verification. Retain handles through the entire owned lifetime; never treat `open('wx')` alone as the OS lock.
- [ ] Implement bounded, length-prefixed JSON request/reply framing (64 KiB maximum) over local IPC. The handshake contains the full root tuple, versions, instance ID, and nonce proof and compares the kernel-reported user. Reject unknown fields, truncated frames, wrong project, and all version mismatches before accepting any command. Metadata is discovery only. Commands are allowlisted `status`, `register`, `suspend`, `stop`, and `reconcile`; no arbitrary execution payload.
- [ ] Detect replacement/unlink of a held lock or endpoint using retained handles and path identity checks. Loss fences delivery immediately. Reacquisition after missing cache evidence requires registry/provider reconciliation; missing cache never means absence of prior ownership. If proof is unavailable, return `APR_BROKER_STALE` and preserve evidence.
- [ ] Build and run real subprocess contention and peer-credential tests on macOS/Linux/Windows. Helper build failure makes broker doctor unhealthy while legacy manual commands still load. Add a pinned compatible `node-gyp` development dependency selected and locked during implementation; use installed local tooling only, no startup download/build.
- [ ] Rerun the focused suites on each supported platform and commit the task's exact files with `feat(broker): enforce OS ownership and IPC authentication`.

### Task 5: Passive provider-resource locks across projects and versions

**Files:** Create `src/broker/provider-resources.mjs`, `schemas/provider-resource-v1.json`, `test/unit/provider-resource.test.mjs`, `test/integration/provider-resource.test.mjs`.

**Interfaces:** `providerResourceDigest({ userId, provider, resourceId }) -> string`; `acquireProviderResource({ identity, descriptor, instanceId, nonce }, platform) -> lease`; `lease.beforeDelivery(observation)` and `lease.release(reconciliation)` enforce ownership and live state. Adapter descriptors are `{ concurrent: boolean, resource_id: string|null }`.

- [ ] Add digest and contention tests across two project digests and different package/protocol versions. Digest excludes project and package version.

```js
const input = { userId: '501', provider: 'anthropic', resourceId: 'desktop-surface-1' };
assert.equal(
  providerResourceDigest(input),
  createHash('sha256')
    .update(
      JSON.stringify([
        'ai-peer-review.provider-resource/v1',
        '501',
        'anthropic',
        'desktop-surface-1',
      ])
    )
    .digest('hex')
);
```

- [ ] Run `node --test test/unit/provider-resource.test.mjs test/integration/provider-resource.test.mjs`; expect missing implementation.
- [ ] Store user-private lock/record pairs under `ai-peer-review/provider-resources/<digest>/`. The closed v1 record contains schema, resource digest, owner project-root digest, instance ID, nonce digest, and heartbeat/diagnostic timestamps. Use Task 4 OS locking. Unknown schemas, malformed records, missing evidence, and indeterminate liveness fail closed across versions.
- [ ] Require exclusive adapters to supply a trustworthy stable nonsecret resource ID; refuse automated use when absent. Concurrent-safe headless adapters keep separate exact session handles and do not claim shared quota protection. Desktop/UI defaults to exclusive until conformance proves otherwise.
- [ ] Test cache deletion while an owner is live: a second project must not deliver. Both processes inspect provider live state immediately before delivery; a failure to establish exclusivity yields `APR_PROVIDER_RESOURCE_BUSY` or the integrity/staleness error. Heartbeat expiry alone never releases ownership. Release only after operations finish or are reconciled; unresolved outcome keeps recovery obligations durable.
- [ ] Rerun focused tests and commit exact files with `feat(broker): coordinate exclusive provider resources`.

### Task 6: Preserve runtime files and register project work durably

**Files:** Create `src/broker/runtime-image.mjs`, `src/broker/registry.mjs`, `test/unit/broker-registry.test.mjs`, `test/integration/broker-upgrade.test.mjs`.

**Interfaces:** `pinRuntimeImage({ packageRoot, nodeExecutable, destination }) -> { root, entrypoint, nodeExecutable, digest, files }`; `verifyRuntimeImage(image) -> boolean`; `registerReview({ project, requestDigest, workspace, runtime }, store) -> registration`; `reconcileRegistrations({ project, store, inspectAuthority }) -> registrations`.

- [ ] Add tests for atomic image creation, incomplete copies, dependency loss, changed source package, changed Node executable, conflicting registration, and same request retry. Test that two independent starts are not deduplicated solely by artifact path.

```js
const first = registerReview(request, store);
assert.deepEqual(registerReview(request, store), first);
assert.throws(() => registerReview({ ...request, requestDigest: 'different' }, store), {
  code: 'APR_OUTPUT_COLLISION',
});
```

- [ ] Run `node --test test/unit/broker-registry.test.mjs test/integration/broker-upgrade.test.mjs`; expect absent implementation.
- [ ] Before launch, create an immutable package-owned runtime image from the currently installed local files, including the transitive module closure, native helper, and Node executable or a verified immutable installed runtime. Keep images outside the mutable installation under the project-digest cache directory; record file hashes and licenses. Copy to a temporary sibling, verify hashes, then rename atomically. Do not fetch or install packages. An executable that cannot be preserved fails broker preflight rather than silently using another Node.
- [ ] Store recovery registrations in `.scratch/peer-review/broker/registrations/` as atomically written runtime records referencing review ID, exact workspace, request digest, and runtime image. Treat events and output reservation as authority. Scan contained existing workspaces to reconcile registrations after interruption; ignore unsafe/foreign paths. Scratch/cache loss must lead to explicit recovery when outstanding operations cannot be proven absent.
- [ ] Acquire/probe the stable endpoint before considering a new image active. On version mismatch print `APR_BROKER_INCOMPATIBLE`, observed versions, and the exact status/recovery command; never kill, repin, replace, or start a second broker. Preserve old image files until its verified lock release and operation reconciliation. Missing image files fence automatic work; manual recovery remains available.
- [ ] Test old broker draining from its image while its original installation is replaced, all three independent version mismatches, and refusal to reclaim before release. Rerun focused suites and commit exact files with `feat(broker): preserve runtime and recovery registrations`.

### Task 7: Project service lifecycle and internal review workers

**Files:** Create `src/broker/service.mjs`, `src/broker/worker.mjs`, `src/broker/client.mjs`, `bin/peer-review-broker.mjs`, `test/unit/broker-lifecycle.test.mjs`, `test/integration/broker-multiproject.test.mjs`; modify `src/coordinator/service.mjs`, `test/integration/coordinator-wake.test.mjs`.

**Interfaces:** `runBroker({ identity, owner, versions, registry, workerFactory, clock, server }) -> Promise<void>`; `ensureBroker({ project, versions, runtimeImage, platform }) -> client`; `createReviewWorker({ registration, adapter, resourceLease, clock }) -> { start(), reconcile(), suspend(), close(), workState() }`. `workState()` returns `'runnable'|'automatic-wait'|'recovery-only'|'terminal'`. `clock` exposes `now()`, `setTimeout(fn, ms)`, and `clearTimeout(id)`.

- [ ] Add fake-clock tests: no exit at 59,999 ms, exit at 60,000 ms; new work resets the deadline; supported automatic wait stays resident; recovery-only can suspend after durable recording; reviewer acceptance leaves author finalization actionable.

```js
clock.advance(59_999);
assert.equal(exited, false);
clock.advance(1);
assert.equal(exited, true);
```

- [ ] Run `node --test test/unit/broker-lifecycle.test.mjs test/integration/broker-multiproject.test.mjs`; expect missing service.
- [ ] Implement one serialized acquisition path per canonical root. The helper entrypoint accepts a package-created bootstrap file with the exact project/image identity, validates it, and binds local IPC. Launch using an argument array and `shell: false`; return only after authenticated readiness or `APR_BROKER_START_FAILED`. Concurrent starts connect to the winning compatible instance.
- [ ] Wrap `reconcileWake`, `runCoordinator`, and the existing decision/ledger/lease modules as internal review workers. Preserve each review's own coordinator lease, operation key, receipt validation, participant observation, and response state. Do not copy wake algorithms into `worker.mjs`. Refactor subscription lifetime out of `runCoordinator` only as needed to support broker-owned close/suspend.
- [ ] Derive terminal status from `reduceEvents`/`statusReview`, including abandoned/superseded outcomes; no new protocol lifecycle states. A pending automatic handoff or author finalization is live work. Recovery suspension is runtime status only. Close watchers and provider adapters and persist recovery obligations before releasing owned locks. Do not spend model turns to wait.
- [ ] Test two roots with different package versions run concurrently, multiple reviews share one broker, and linked worktrees remain separate. A foreign project registration is refused even when the workspace path exists. Rerun focused suites plus `node --test test/integration/coordinator-wake.test.mjs` and commit exact files with `feat(broker): supervise project-local review workers`.

### Task 8: Transactional startup and fenced manual recovery

**Files:** Modify `src/cli/run.mjs`, `src/startup/runtime.mjs`, `src/broker/client.mjs`, `src/broker/registry.mjs`, `src/protocol/service.mjs`, `test/integration/start-join.test.mjs`, `test/integration/status-resume.test.mjs`, `test/integration/recovery.test.mjs`; create `test/integration/broker-startup.test.mjs`.

**Interfaces:** `prepareStartup(input, deps) -> { artifact, selection, runtime, requestDigest, paths }`; `activateStartup(prepared, deps) -> normalCliResult` in `src/startup/runtime.mjs`. Existing `startReview` remains the protocol creation service and accepts the validated descriptor; public CLI uses prepare/activate. Direct new-start callers must also supply required selection.

- [ ] Add fault-injection tests at preflight, broker connect, reservation, authority creation, registration, and reviewer launch. Assert invalid arguments produce no files/process/provider calls and XPR cannot create authority without compatible broker registration preparation, even with manual transport.

```js
await assert.rejects(startWithUnavailableBroker({ transportMode: 'manual' }), {
  code: 'APR_BROKER_START_FAILED',
});
assert.equal(createdEvents.length, 0);
assert.equal(providerCalls.length, 0);
```

Define `startWithUnavailableBroker`, `createdEvents`, and `providerCalls` in this suite by calling `run`/`startReview` through the existing injection seams and a failing `ensureBroker` dependency; no live provider is involved.

- [ ] Run `node --test test/integration/broker-startup.test.mjs test/integration/start-join.test.mjs test/integration/recovery.test.mjs`; expect missing routing and fault recovery.
- [ ] Implement order: parse/resolve identity, model/effort/capabilities, validate artifact/paths/authority/transport, acquire broker when required, reserve the exact request, create review authority, register workspace, then dispatch the reviewer. Broker preparation is reversible runtime setup; no provider work precedes durable request/authority registration. Preserve the existing output reservation and exact Git/no-commit boundaries.
- [ ] Journal request preparation and launch outcome under the review scratch workspace. A crash before authority permits reconciliation of the exact reserved request; a crash after authority returns the same review/next action. Known pre-dispatch failures may release only owned empty reservations. An ambiguous launch never auto-retries or deletes its journal. Distinct new requests still use existing output collision rules.
- [ ] Preserve all legacy manual operations without a live broker. For registered new reviews, offline protocol submission remains available but automatic delivery must first be fenced: request authenticated suspension, wait for in-flight operation settlement, then record the fence; if broker is dead, verify OS ownership and reconcile provider outcome. Unknown outcome returns its existing error and exact reconciliation command, never a duplicate wake. A later worker revalidates event revision and the fence before delivery.
- [ ] Test preserved `--phases`, reviews-root/template, record ID, issue, turn/claim limits, bootstrap grant, no-commit/test authority, and explicit transports end to end. `automatic-required` still requires every resident/capability/health row. Rerun suites and commit exact task paths with `feat(startup): route new reviews through sealed runtime`.

### Task 9: Provider adapters, exact model launch, and native SPR

**Files:** Create `src/providers/codex.mjs`, `src/providers/claude.mjs`, `src/providers/grok.mjs`, `test/unit/provider-capabilities.test.mjs`, `test/integration/provider-conformance.test.mjs`; modify `src/providers/registry.mjs`, `src/identity/registry.mjs`, `src/transport/registry.mjs`, `src/doctor.mjs`, `src/cli/run.mjs`.

**Interfaces:** Each adapter exports `resolveModel`, `observeCapabilities`, `launchReviewer`, `observeSession`, `deliver`, `reconcile`, and `close`. Launch consumes `{ invitationPath, expected, effort, operationId }`, returns `{ status, observation }`, and stores raw handles only in package scratch. `observeCapabilities` reports exact supported surfaces, model/effort resolution, native session control, transport, adapter version, and Task 5 resource descriptor.

- [ ] Add fixture adapter tests for alias resolution, unsupported model/effort, actual launched model mismatch, exact same-provider session selection, unavailable surfaces, and provider resource contention.

```js
const resolved = await adapter.resolveModel({ model: 'opus', effort: 'high' });
assert.equal(resolved.model_id, 'fixture-opus-exact');
await assert.rejects(adapter.resolveModel({ model: 'missing', effort: 'high' }), {
  code: 'APR_TRANSPORT_UNAVAILABLE',
});
assert.notEqual(observation.session_fingerprint, author.session_fingerprint);
```

- [ ] Run `node --test test/unit/provider-capabilities.test.mjs test/integration/provider-conformance.test.mjs`; expect missing adapters.
- [ ] Implement adapters using the installed provider's official, verified invocation/resume interfaces and documented capability evidence. Capture exact model and effort before reviewer work, then verify runtime observation before claiming the reviewer turn. Use argument arrays, exact invocation handles, pointer-only invitation payloads, and no fallback model. Never send author scratch context or raw handles in tracked collateral.
- [ ] Enable native SPR only where launch/resume/monitor targets the exact second session on both selected surfaces. Broker reuse for SPR preserves classification. A selector may be recognized while its locally unavailable control path fails doctor/preflight; do not advertise untested Grok or desktop automation as healthy. Explicit manual delivery can route a broker-registered invitation without an automated provider-control claim.
- [ ] Exercise acknowledgement, definitely-not-submitted, outcome-unknown, provider quota failure, expired lease, changed process instance, incompatible adapter versions, and native/automatic end-to-end gates. Use existing intervention and reconciliation semantics. Automate fixture suites offline; document optional live conformance commands and run only on the explicitly selected provider surface.
- [ ] Rerun focused suites plus `node --test test/integration/automatic-required.test.mjs test/unit/transport.test.mjs` and commit exact paths with `feat(providers): launch exact requested reviewer sessions`.

### Task 10: Phase integration and retirement of public coordinator surface

**Files:** Modify `src/public-api.mjs`, `src/cli/parse.mjs`, `src/cli/run.mjs`, `src/cli/help-data.mjs`, `src/broker/worker.mjs`, `test/integration/phased-review.test.mjs`, `test/unit/coordinator-decision.test.mjs`, `test/integration/coordinator-wake.test.mjs`, `test/packaging/package.test.mjs`, `test/mcp/server.test.mjs`.

**Interfaces:** New public broker CLI: `peer-review broker status`, `peer-review broker reconcile <workspace>`, `peer-review broker suspend <workspace>`, `peer-review broker stop`, with optional `--json`. All derive project identity from cwd; no endpoint override. Public root exports may expose `brokerStatus` and `reconcileBrokerReview` from `src/broker/client.mjs`; no coordinator/wake internals.

- [ ] Add phase tests for spec acceptance → author finalize → author advance plan → same reviewer → final acceptance. Assert exact recipient, verified receipt, monotonically increasing turns, per-phase limits, and unchanged terminal manifests. Include crashes after author commit but before event/delivery append.

```js
assert.equal(afterSpecAcceptance.protocol.state, 'author-finalization');
assert.equal(afterSpecFinalize.protocol.state, 'awaiting-phase-artifact');
assert.equal(afterPlanAdvance.protocol.current_actor, 'reviewer');
assert.equal(afterPlanAdvance.participants.reviewer.session_fingerprint, reviewerFingerprint);
```

- [ ] Run `node --test test/integration/phased-review.test.mjs test/integration/coordinator-wake.test.mjs test/packaging/package.test.mjs`; establish failures for the new broker boundary/public export expectations.
- [ ] Route #10 wake consumption through `createReviewWorker`; preserve the existing `decideWake` phase cases and delivery receipts. Update tests to import internal functions directly when testing internals. Remove all coordinator exports from `src/public-api.mjs` and coordinator command grammar/help/run dispatch in this same task. Keep source modules internally where reused; removal from the public API does not require deleting durable ledger code or historical schema readers.
- [ ] Implement broker operations with authenticated instance/nonce verification. `suspend` fences one review, `stop` refuses runnable or unreconciled operations, and `reconcile` never replays an ambiguous provider action. Offline status explains recovery evidence even when broker is absent. Add exact error recoveries for all five design startup errors; `APR_BROKER_STALE` cannot suggest deleting a lock.
- [ ] Rerun focused phase/wake/packaging/MCP suites and commit exact files with `refactor(broker): internalize coordinator and preserve phase routing`.

### Task 11: Offline help, generated handoffs, and migration documentation

**Files:** Modify `README.md`, `docs/manual-cross-provider-peer-review.md`, `docs/design/2026-09-11-provider-neutral-runtime-orchestration-design.md`, `docs/design/2026-09-13-9-durable-co-review-wakeups-design.md`, `docs/releases/0.3.0.md`, `skills/peer-review/SKILL.md`, `src/templates/index.mjs`, `templates/author-startup.md`, `templates/reviewer-invitation.md`, `src/cli/help-data.mjs`, `test/golden/help.test.mjs`, `test/golden/skill.test.mjs`, `test/golden/templates.test.mjs`, affected files in `test/golden/help/` and `test/golden/templates/`.

**Interfaces:** Complete offline start help and `spr`/`xpr` help topics; versioned result envelope includes resolved runtime and reviewer effort for new starts. Existing result consumers retain their documented fields. Generated commands use absolute artifact/invitation/workspace paths, shell-safe rendering, and explicit resolved effort.

- [ ] Add golden assertions for required reviewer flags, invoking session as author, default medium effort printed explicitly, native SPR eligibility, broker-required manual XPR, all retained start flags, broker operations, stable recovery commands, and missing-selection errors.

```js
const text = helpRequest('start', 'text');
assert.match(text, /--reviewer-provider/);
assert.match(text, /--reviewer-model/);
assert.match(text, /medium/);
assert.doesNotMatch(text, /--runtime/);
```

- [ ] Run `node --test test/golden/help.test.mjs test/golden/skill.test.mjs test/golden/templates.test.mjs`; expect stale contract failures.
- [ ] Rewrite active examples around the complete new startup command and broker status/recovery. Explain normal/no-commit assurance, human sponsorship versus participant identity, same-provider capability limits, manual recovery fences, and no automatic fallback. Remove public coordinator commands from active help, README, skill, and generated handoffs.
- [ ] Add supersession notices to older designs without rewriting historical review evidence. Preserve sealed invitations/responses/manifests byte-for-byte. Historical #9 plans may retain old commands as historical records, clearly linked from the supersession notice; they are not the new operator guide.
- [ ] Regenerate only changed golden fixtures using the repository's existing generation pattern; inspect their diffs and exercise command round-trips including spaces and Windows paths. Update the draft 0.3.0 release note with startup breaking changes and migration for existing reviews.
- [ ] Rerun golden tests and `node --test test/smoke/cli.test.mjs test/integration/communication-policy.test.mjs`; commit exact changed paths with `docs: publish intent-first broker workflow`.

### Task 12: Release compatibility, packaging, and full verification

**Files:** Modify `package.json`, `package-lock.json`, `docs/releases/0.3.0.md`, `test/packaging/package.test.mjs`, `test/smoke/cli.test.mjs`, and the existing CI workflow that runs the Node/platform matrix. Add `test/integration/broker-release.test.mjs` for installed-package scenarios.

**Interfaces:** One installable package containing the broker entrypoint, OS helper source/build assets or verified platform binaries, schemas, and internal workers. The package root exposes only intended public APIs. No global install or external broker package is required.

- [ ] Before choosing the release number/removal policy, read registry metadata and inspect published tarballs without running their scripts. Record package version, integrity, file list, and public parse/export contents in the release evidence. The design's 2026-09-14 observation is not a permanent publication fact.

```bash
npm view ai-peer-review versions --json
npm view ai-peer-review@0.2.2 dist --json
npm pack ai-peer-review@0.2.2 --ignore-scripts --json --pack-destination .scratch/release-audit
```

Create `.scratch/release-audit` first; inspect any later published version as well. If the coordinator surface has shipped, stop release for an explicit compatibility decision. If 0.3.0 is already published, choose the next unused minor above 0.2.x; never republish or relabel 0.2.2.

- [ ] Write installed-tarball tests that start two independent projects, exercise legacy review recovery with no helper/broker, reject mismatched live runtime, verify Node-major handshake mismatch, and inspect packaged exports/help for absent coordinator entries. Assert runtime images preserve transitive imports and native assets after source installation replacement.
- [ ] Run `node --test test/integration/broker-release.test.mjs test/packaging/package.test.mjs`; expect failures until package files/build assets/version notes are correct.
- [ ] Implement packaging and CI matrix changes. Require real macOS/Linux/Windows IPC/security tests and Node 24 plus supported newer Node lanes. Native helper availability is a reported platform capability; do not skip a required platform and call the broker supported. Validate fresh install without unexpected network downloads or lifecycle execution beyond the documented helper build.
- [ ] Run the complete relevant matrix after all prior tasks are green.

```bash
npm run lint
npm run format:check
npm test
npm run test:slow
npm run test:packaging
npm pack --dry-run
node --test test/unit/verify-extraction.test.mjs test/unit/verify-release.test.mjs
git diff --check
```

The extraction/release verifiers validate historical provenance (the current release verifier pins 0.2.0); keep those records intact and run their regression tests above. Do not rewrite historical provenance to assert a new release. Any failure gets an exact reproduction and scoped correction, then rerun the affected suite.

- [ ] Inspect final diff and commit exact package/CI/release/test paths with `release: prepare project-local broker minor release`. Record local verification against this commit and require hosted CI on the exact delivery SHA. Publishing, merging, and issue lifecycle transitions remain separate authorized delivery actions; this plan does not execute them.

## Acceptance coverage and review checkpoints

| Design acceptance requirement                                       | Tasks and decisive evidence                                   |
| ------------------------------------------------------------------- | ------------------------------------------------------------- |
| Invoking session is author; explicit reviewer/model; default effort | 1, 2, 9, 11: parser, identity, adapter, golden tests          |
| Full invocation succeeds without runtime flag; retained flags       | 1, 8, 11: conformant startup fixture and command round-trip   |
| Resolved provider classification and exact selectors                | 1, 2: family matrix, generic/Google refusal, join mismatch    |
| Current-project broker only, including manual XPR                   | 3, 4, 7, 8: endpoint containment and unavailable-broker cases |
| Existing manual reviews remain operable; no duplicate wake          | 2, 6, 8, 10: legacy histories and crash/fence reconciliation  |
| Independent projects and versions; multiple reviews per root        | 3, 7, 12: real subprocess and installed-package tests         |
| Symlink/Windows/worktree identity and stable upgrade routing        | 3, 4, 6: canonical identity and incompatible-owner tests      |
| Cross-version provider locks, stale/foreign/cache-loss refusal      | 4, 5: OS lock/peer checks and live provider state fixtures    |
| 60-second idle timer, reset, recovery durability, author finalize   | 7: fake clock plus process exit integration                   |
| Public coordinator retirement with #10 behavior intact              | 10, 11, 12: phase, export, help, packaged surface checks      |
| Historical docs point to replacement startup contract               | 11: supersession links and active documentation scan          |
| New minor release and publication compatibility gate                | 12: registry/tarball audit, version and release evidence      |

Review each task's evidence before proceeding. Tasks 4–6 establish security and upgrade prerequisites; do not advertise successful broker delivery before those pass. Task 8's startup wiring is incomplete until Task 9 production adapters and Task 10 phase integration pass. The release is one integrated delivery; intermediate task commits are not independent public releases.
