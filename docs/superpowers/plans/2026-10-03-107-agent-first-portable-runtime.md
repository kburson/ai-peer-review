# Agent-First Portable Runtime Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver #107's complete controller-only SAR/SPR/XPR API and portable supervised runtime with exact evidence, bounded recovery, and honest telemetry.

**Architecture:** Evolve the append-only integrity and identity core; replace synchronous native IPC with asynchronous authenticated loopback HTTP first. Add versioned run/stage/round authority, headless role wrappers, shared #30 evidence, existing #109 telemetry, and one registry driving CLI/MCP. Conflicting run/configuration/migration activation remains blocked on separately reviewed #102/#107 reconciliation.

**Tech Stack:** Node.js >=24 and built-in HTTP/crypto/filesystem/process APIs; existing MCP SDK/Zod after production audit; Node test runner; Ubuntu/macOS/Windows on Node24/26/current.

**Spec:** [2026-09-27-107-agent-first-review-runtime-design.md](../specs/2026-09-27-107-agent-first-review-runtime-design.md), complete 2,420-line artifact; SHA-256 `395bf5ce47617f827f362552d1839333a4e3964072cb4e6362e8bba3703a4c2e`.

## Story Intent

- **Beneficiary:** Users and agents requesting governed review of dirty/new artifacts.
- **Capability:** Run exactly requested SAR/SPR/XPR stages through one portable supervised API.
- **Need:** Keep the controller chat available while preserving participant identity, scope, evidence, and recovery.
- **Value or failure prevented:** Prevent native installation failures, duplicate launches, silent roster changes, and unsupported acceptance/usage claims.

## Global Constraints

Every task inherits these exact specification constraints and the remaining normative contracts in the linked spec.

- “The package ships no native addon, custom executable, post-install compilation, node-gyp requirement, per-platform artifact, or runtime binary download.”
- “Binary-free distribution applies to AIPR and its production dependency closure.”
- “Each broker binds 127.0.0.1 on port 0.”
- “Limit headers to 16 KiB, each body to 1 MiB, header/body receipt to 10 seconds and unauthenticated idle connections to 5 seconds.”
- “SAR: 6 rounds”; “SPR: 10 rounds”; “XPR: 12 rounds”.
- “Durations are finite positive safe integer milliseconds; threshold order is liveness_interval_ms <= warn_after_ms < reconcile_after_ms < hard_timeout_ms.”
- “Caps and max_rounds_limit are integers in 1..1000”; “retry counts are in 1..10, including the initial attempt.”
- “monitoring.liveness_interval_ms=15000, warn_after_ms=60000 and reconcile_after_ms=120000.”
- `hard_timeout_ms=1800000`; `broker.idle_grace_ms=60000`; `telemetry.grace_period_ms=30000`; `diagnostics.retention_ms=604800000`; `preserve_clean_logs=false`; launch attempts per candidate 2; revision attempts per round 3.
- “Every requested stage runs.” Config never inserts stages or authorizes unattended work.
- “Use SHA-256 of exact file bytes, without line-ending or Unicode normalization.”
- “The runtime never stages or commits.” Implementation commit steps below apply to source changes only.
- “Unknown values remain null/unavailable, not zero.”
- “POSIX mode bits alone are not a Windows ACL guarantee.”
- “No recovery action accepts elapsed age or an operator assertion as proof of death.”
- Controller is always outside the roster; all participants `placement=headless`; SAR is one worker, SPR/XPR two distinct sessions.
- Preserve Node `>=24` and existing nine OS/Node CI combinations, npm11/12 parser coverage, storage/grants/session/cancellation/recovery enforcement and #117/#126 regression lessons.
- Prefer built-ins; any added pure-JavaScript helper requires checked-in source/license/transitive/script/binary audit.
- No final replacement release until all 15 gates and #30/#34/#102 adoption requirements pass.

## Review Focus

1. Slow unauthenticated connections cannot starve authenticated status/cancel: Task1.
2. Pointerless Markdown with retained sidecar history must link without ignored caches or a new series: Task12.
3. Windows `0600` may conceal foreign effective ACL access or inherited rules: Task2.
4. Direct-child death can leave descendants, escaped sessions or remote writers: Tasks3/17.
5. Crash between amendment and index publication cannot duplicate usage or hide incomplete current coverage: Task14.

## Prerequisites and Ownership

This plan is complete scope decomposition, not release authorization. #102's newer accepted design at `021bed7e9cc01782f0822e99fa2d3a58aadeb16e` is `docs/superpowers/specs/2026-09-29-102-primary-runtime-authority-design.md`; native-approved plan `docs/superpowers/plans/2026-10-01-102-primary-runtime-authority.md` at `8ee1cbe` on `codex/102-primary-runtime-xpr`. Controller-provided live evidence: #132–136 closed, #137 pending PR139 at `84565bc16164d562a5d742987352db7f3a4e31d1`; remaining CI is not assumed passed. Its broader independent normal Plan XPR remains unverified; native approval and accepted design are distinct provenance.

| Conflict        | Accepted #107                                                               | Newer accepted #102                                                                                                           | Required disposition                                                  |
| --------------- | --------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| Installation    | Per-run retained compatible installations and old/new namespace coexistence | One current OS-account global canonical AIPR root/Node; images match current selection; no older fallback                     | Targeted specification review before routing/migration activation     |
| Policy          | User/project `.ai-peer-review.json` layered precedence/profile merge        | Activated primary `.ai-peer-review/config.json` exclusively owns project policy; user host bindings classified field by field | Targeted specification review before config integration/schema freeze |
| Legacy recovery | Resume old active reviews under retained installation                       | Unsupported old formats read-only/fenced after upgrade                                                                        | Explicit reviewed drain/recovery decision; no silent reinterpretation |

The historical comparison above remains provenance. The accepted reconciliation is docs/superpowers/specs/2026-10-03-107-runtime-policy-reconciliation-design.md at 4d8815b2fabf861d24d25fa9735b953865e99f55, SHA-256 4e8d38f06fb53b963089cfe5835e2722cc31a3053ac3ba7076467d93e6973405, normal XPR review-58b490491800f0c13d64191cb58071b5 finalized at 59f9628f30ea3945d92972196d7acda4350592a5. Its bounded owner Plan and separately accepted amendment are the exact references below. The separately accepted companion is docs/superpowers/plans/2026-10-05-107-runtime-contract-plan-amendment.md at f792abd2061ba344c8603b69c729d14af910cf26, blob ff1a376ef81e26ec5f2402090587cfa2438b347a, SHA-256 208a8e54a014415cdef0dda2b6d266b7745e7126d0902a34c2b7c1041b420828; normal XPR review-a4157c49c11ad9d12836d7bfea0df472, manifest SHA-256 4a4878c34cea8f9fae8e6dfc38081d15c10e315080053183f1fb6101c66e972f. Authority assurance remains unavailable, with machine reviewer consensus; no stronger assurance or broad owner-plan acceptance is inferred.

| Original requirement                   | Joint amendment disposition                                                                                                                                       | Continuing gate                                                                                                                                          |
| -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Retained per-run package/Node dispatch | Complete adopted bundle selects current-global A, or separately accepted complete coexistence B. No independent per-row choice.                                   | Actual owner adoption and current-runtime validation; no older fallback under A.                                                                         |
| Layered user/project policy            | Under A use the exact accepted #102 ownership table; preserve prospective source diagnostics. No general deep merge.                                              | #130 detailed schema acceptance, independently reviewed #102/#130 protected registration-receipt transport/read-back, and Task 7 production integration. |
| Old active/fenced recovery             | Under A drain while compatible/current; preserve stranded journals. Explicit maintenance recovery needs proved current-global registration/ownership/conformance. | Pending exact installed exclusion/rollback/drain obligations block activation.                                                                           |
| Shared evidence/analytics              | Adopt exact #30/#34/#109 bounded plan contracts and target interface identifiers, not absent field-level schema bytes, with their normal review references.       | Missing owner dispositions block contract adoption; implementation gates remain.                                                                         |

The table is effective only when the owner acceptance records select the exact same whole bundle. This amendment cannot label open owner plans accepted.

Bounded native owner dispositions select complete bundle A and preserve ordinary Plan Metadata, approval markers and broader unfinished obligations. Their exact public comment bytes (including the native owned marker) are pinned below; one common accepted Plan review is not four native transactions.

| Owner | Native source                                                                                   | Exact comment SHA-256                                            |
| ----- | ----------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| #102  | [native adoption](https://github.com/kburson/ai-peer-review/issues/102#issuecomment-5996099451) | 3885933db908da7cb243ecd870fb510525089c15aa440687673374f67ddd7295 |
| #30   | [native adoption](https://github.com/kburson/ai-peer-review/issues/30#issuecomment-5995642448)  | d1e2b6f00147513fecc55ff71096be125e693b8dce551b4278431835bdffa966 |
| #34   | [native adoption](https://github.com/kburson/ai-peer-review/issues/34#issuecomment-5995739253)  | 5b0639abddd38dfd4c3d8467931bd7f70ed65afa420706049284691dcdeaec17 |
| #109  | [native adoption](https://github.com/kburson/ai-peer-review/issues/109#issuecomment-5995680598) | ced7e2137ffac5af9cae3d150c2a59295f54a077f0f268bbdb5a07f130b44ea2 |

Full applied canonical Plan review and immutable contract-record acceptance remain pending until their own normal transactions finish. A separately accepted complete coexistence bundle B would require every coupled owner disposition; independently selecting Runtime, Policy or Prior rows refuses. Tasks1/2/4 may produce the native-free installed CI/package candidate independently of Task5 after portable parity passes. Task3 owns additional epoch/descendant assurance. Tasks7/8/18 production integration and gates8/15 still require the independently approved contract/activation pair, actual registration/read-back and remaining installed conformance; contract-only adoption grants neither activation nor publication. Global installation selection creates no machine-wide broker.

Issue #30 owns shared `ai-peer-review.record/v1`, `series-index/v1`, `patch-chain/v1`, `response-envelope/v1` implementation/migration; #107 consumes them. Existing #109 owns only the focused Codex per-attempt telemetry repair; hydrated #152 integrates shared Task13 telemetry and #153 owns Task14 aggregates/chains/amendments, reusing #109 without a duplicate repair. The preserved Task13/14 source sections retain their original issue labels as historical decomposition provenance; the current native child mapping governs implementation ownership. #34 owns outcome labels/scoring/experiments and adopts neutral telemetry contracts. #31/#32/#33 own projection/retrieval/escape analysis, not runtime authority. #102/#132–137 own runtime resolution; do not duplicate. Preserve explicit #106 manual startup until installed replacement and reviewed migration gates permit retirement.

Hydration follows both requested clean plan acceptances. Update stale #107 broker-free/manual scope only then. Numbered Tasks13/14 are explicitly existing-issue work: a hydration proposal must exclude/reuse them manually; there is no blind bulk split confirmation. Parent-only hydration is valid while decomposition awaits review.

Order: Tasks1/2/4 deliver the urgent portable broker candidate/CI; Task2/4 migrate every native production caller using the map; Task3 develops independent containment/epoch conformance; Task5 gates conflicting public activation; 6 isolated registry and 7 resolver after adoption; 8 reservation; 9/10 workers/scopes; 11 rounds/findings; 12 #30 evidence; 13/14 #109 repair plus #152/#153 shared metrics; 15/16 monitor/API; 17 recovery; 18 installed release. Each task has its own red/green cycle and independently reviewable deliverable.

## File and Interface Map

Verified source seams: `src/broker/{platform,ipc,service,client,ownership,paths,registry,launch,worker-factory,worker}.mjs` currently use native private directories/OS locks and synchronous 64KiB framing beneath asynchronous callers. `src/startup/{runtime,selection}.mjs` assumes invoker author plus reviewer and universal medium fallback. `src/protocol/{store,service,reducer,process-identity}.mjs` supplies append-only locked authority/recovery, a turn-budget reducer and OS probes. `src/provider/{claude-launch,execution-contract}.mjs` and `src/providers/*.mjs` provide reusable identity/launch hardening; Codex generalized headless launch is new work. `src/collateral/{paths,responses,review-record}.mjs` supplies containment/seals/triads. `src/config/{load,setup,installation-identity}.mjs` is v1 setup/config. `src/mcp/{server,wait}.mjs` currently only exposes handoff wait. `src/cli/{parse,run,help-data,help-topics}.mjs` owns flags/static help. Package ships `node-gyp` and native sources; CI provisions Python/compilers/Node headers and denies IP for old local IPC. Extend focused boundaries below instead of rewriting these foundations.

New signatures below are implementation contracts, not existing APIs. Create each named test helper in the task that owns it; all helpers clean their connections/processes in `t.after`. Tests use `node:test` and `node:assert/strict`.

## Shared Contract Types and Scope

Task6 creates `src/api/contracts.mjs` with JSDoc typedefs tied to the registered JSON schemas; no second validator. `ResponseEnvelope` is the closed ai-peer-review.response/v1 shape: schema/ok/mutation_occurred/retry_safe/next_action plus bounded error or run/status/revision/cursor/evidence/capability dimensions. `EventEnvelope` adds durable cursor/revision and redacted projection. `ValidatedOperation` is {value,input_validation:{duplicate_keys:"checked"|"not-observable"}}. `ParsedInput` is {value,rawText,inputValidation}; `HelpEnvelope` is its registered help result. Paths and provider/session handles are private typed authority values, not arbitrary caller strings.

Task2 defines `ElectionOutcome` as {kind:'won',lease:ElectionLease} | {kind:'owner-live',binding,withdrawalReceipt} | {kind:'indeterminate',code,blockingContender,obligations,withdrawalReceipt}; only won carries ElectionLease {contenderId,ticket,held,release}, held across the complete owner lifecycle. Task2 defines `ProtectionReceipt` {verified,source,version,canonicalRoot,principal,assurance,reason}; `Owner` {instanceId,publish,verify,release}; `ReleaseReceipt` {released,outstandingObligations}. Task3 defines `TerminationResult` {quiescent,provedObligations,outstandingObligations,evidenceRefs}; launch epoch observations include execution_host_id,boot_epoch,source/version/assurance; unknown epoch is null/reason. Task7 defines `ConfigV2` from config/v2, and `SealedRoster` {initial,allowedKinds,cascades,eligibility,caps,sources,scope,visibility}. Task8 defines `Reservation` {runId,requestDigest,artifactLease,revision,operationIds,adoptedRuntimeBinding}; StartReceipt/PreviewEnvelope are operation-specific ResponseEnvelope variants. ReplayResult is existing/conflict/absent with durable receipt; runtime binding retains exact adopted package/Node/installation/authority/adapter identities and private locator.

Task9 defines `LaunchObservation`/`IdentityObservation` from verified exact-session source/version/assurance with requested identity separate; `DistinctnessReceipt` {proved,evidenceRefs,reason}; `RoleToolConnection` owns private stdio capability/revoke lifecycle. Task10 defines `RoleScope` {fur,ownPartition,shared,context,deniedRoots,role}; `SubmissionReceipt` {actionId,payloadDigest,reviewedDigest,role,revision,sealRef}; `ContextReceipt` {suppliedInputs,projectionDigests,visibility,observedRetrievals}. Task11 `RunState` is run-state/v1; `DispatchReceipt` {operationId,attemptId,requestedStageId,stageAttemptId,round,phase,revision}; `LedgerDelta` is validated immutable findings/resolutions; `ReplacementIntent` names selected sealed candidate/class and required reconciliation.

Task12's Snapshot/Patch/Envelope/Verification/PublicationReceipt/Candidates/IndexReceipt come from #30's adopted four schemas and shared API; do not define competing shapes. Task13 `Measurement` is measurement/v1; AttemptId is opaque durable invocation ID; Receipt is attempt-metrics/v1; ControllerReceipt has controller binding/event/run IDs and measurement references with accountingKind=controller and no worker attempt_id. Task14 AggregateViews/ChainView/AmendmentReceipt are neutral coverage and amendment contracts adopted by #30/#34; include referenced IDs,accounting basis,coverage and as-of revision. Task15 MonitorReceipt/HoldReceipt/LivenessActions carry verified host surface/cursor and exact orthogonal dimensions; Task17 ActionReceipt/ObligationDelta/SeriesReceipt/CleanupEnvelope use their registered closed operation schemas; Task18 ReleaseReport contains exact15 gate results,contract conflicts and installed capability matrix.

Every task's Interfaces block is its produced API; its named arguments are consumed contracts from the defining tasks above. Fixture helpers are test-only, built in the owning task, and must reproduce the behavior of actual production APIs rather than alter semantics to satisfy assertions. Tests use exact registered defaults and stable fixture IDs. Conflicting run/configuration activation respects Tasks5/8 adoption; the bounded Tasks1/2/4 installed broker candidate/CI milestone is separately permitted, without final publication/migration authority. Test commands referencing a later helper are explicitly integration runs after that dependency exists; they are not claimed runnable against today's unchanged source.

### Task 1: Async Authenticated HTTP Transport

#### Story Intent

- **Beneficiary:** Broker clients and recovery controllers.
- **Capability:** Bounded asynchronous loopback RPC and waits.
- **Need:** Replace native framing without blocking cancellation/status.
- **Value or failure prevented:** Prevent rebinding/browser access, credential leaks and slow-client starvation.

#### Implementation Scope

**Files:** Create `src/broker/http-server.mjs`, `src/broker/http-client.mjs`, `src/broker/http-auth.mjs`, `test/helpers/portable-broker-fixture.mjs`, `test/unit/broker-http.test.mjs`, `test/integration/broker-http-concurrency.test.mjs`. Modify `src/broker/service.mjs`, `src/broker/client.mjs`, `src/broker/ipc.mjs`, `bin/peer-review-broker.mjs`; keep isolated legacy adapter during conformance.

**Interfaces:**

- **Consumes:** Task2's verified owner/endpoint binding and private storage receipt; dispatch is an authenticated asynchronous handler injected by the broker service. Task1's tests inject bindings until Task2 is implemented.
- **Produces:** `createLoopbackServer({binding,authenticate,dispatch,clock}):Promise<{port,close():Promise<void>}>`, `requestLoopback({endpoint,privateBinding,operation,body,signal}):Promise<ResponseEnvelope>`, `waitLoopback({...request,afterCursor}):AsyncIterable<EventEnvelope>`. Fixture returns `request/rawSocket/clock/flush/dispatchCalls`.

- [ ] Write failing raw HTTP tests for missing/duplicate Host, wrong literal127.0.0.1/port, absolute targets, Origin/Sec-Fetch, upgrade, wrong credential/instance/worktree, oversized headers/body, truncated UTF-8/JSON, 10-second receipt/5-second idle and auth-before-body interpretation.
- [ ] Add concurrent status test:

```js
const f = await portableBrokerFixture(t);
const slow = await f.rawSocket();
slow.write('POST /rpc HTTP/1.1\r\nHost: ');
assert.equal((await f.request({ operation: 'status', body: {} })).ok, true);
f.clock.advance(5_000);
await f.flush();
assert.equal(slow.destroyed, true);
```

- [ ] Run focused command below red; failure must be missing contract behavior, not broken setup.
- [ ] Implement injected monotonic per-socket timers from connection acceptance: unauthenticated idle closes after5000ms without received bytes, with its idle clock reset by received bytes; incomplete header/body receipt closes no later than10000ms from that receipt's start. The absolute receipt deadline cannot be renewed by byte drips. Node HTTP timeouts are defense in depth: default connectionsCheckingInterval=30000ms cannot establish these bounds. Cancel idle after successful authentication and receipt timer after complete validation; authenticated wait streaming has its own lifetime. Add real-clock tests with explicit <=250ms scheduler tolerance on an unloaded runner alongside fake-clock tests; late clocks fail or report inconclusive, never weaken bounds. Inconclusive cannot satisfy CI or conformance acceptance.
- [ ] Bound accepted sockets to256 and pending unauthenticated sockets to128, preserving capacity only for already-authenticated keep-alive control connections; reject unauthenticated excess immediately. A new connection has no authenticated priority before header validation and may be refused at the128 pending cap; advertise this limitation and test authenticated keep-alive status/cancel during full-cap saturation. Test64 simultaneous slow sockets while authenticated status/cancel completes within1000ms, exhaustion recovery and cleanup. Document these admission limits.
- [ ] Implement `http.createServer({maxHeaderSize:16384})`/`listen(0,'127.0.0.1')`, raw header counting, exact target policy and constant-time equal-length authentication before body parsing. Set receipt/idle deadlines; body/event frame <=1MiB; disable logging/CORS; reject upgrades.
- [ ] Await startup/request/dispatch/drains/close at every service/client/bin seam. Wait lifetime survives receipt timeout; waits hold no mutation lock. Once mutation bytes may be sent, return delivery uncertainty/action ID, never blindly relaunch.
- [ ] Run green and legacy IPC/readiness regressions; commit only source/tests.

- [ ] Add the following implementation invariant at this task's owning seam, then complete every enumerated boundary fixture:

```js
const server = http.createServer({ maxHeaderSize: 16_384 }, async (req, res) => {
  const auth = authenticate(req.rawHeaders, binding);
  if (!auth.ok) {
    res.writeHead(401);
    res.end();
    return;
  }
  await dispatch(req, res, auth); // authenticated body validator and bounded stream
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
```

**Verification Commands:**

```sh
node --test test/unit/broker-http.test.mjs test/integration/broker-http-concurrency.test.mjs test/integration/broker-ipc.test.mjs test/integration/broker-readiness.test.mjs
```

#### Acceptance Criteria

Authenticated requests remain responsive during64 slow sockets; injected and real clocks prove exact bounds. Task1 binding injection stays test-only: production cannot publish/listen before Task2 verified protection/ownership. Legacy adapter remains explicit during development; no native fallback in portable path.

### Task 2: Protected Storage and Exclusive Ownership

#### Story Intent

- **Beneficiary:** Concurrent worktree brokers.
- **Capability:** Verified OS protection and atomic credential-free discovery.
- **Need:** Replace native ownership without age-only takeover.
- **Value or failure prevented:** Prevent Windows ACL false assurance and path/owner substitution.

#### Implementation Scope

**Files:** Create `src/broker/storage-protection.mjs`, `src/broker/portable-ownership.mjs`, `src/broker/ownership-election.mjs`, `src/broker/portable-paths.mjs`, `src/protocol/process-source-assurance.mjs`, `src/protocol/process-source-contracts.json`, `schemas/process-source-class-v1.json`, `evidence/portable-runtime/process-source/classes/<class_id>.json`, `test/unit/process-source-assurance.test.mjs`, `test/unit/storage-protection.test.mjs`, `test/integration/portable-ownership.test.mjs`, `test/integration/portable-manual-recovery.test.mjs`, `test/integration/windows-portable-bootstrap.test.mjs`, `test/live/process-source-conformance.mjs`, `test/unit/process-source-conformance.test.mjs`, `schemas/process-source-conformance-v1.json`, `schemas/process-source-registration-v1.json`, `evidence/portable-runtime/process-source/registration-index.json`, `evidence/portable-runtime/process-source/registrations/<capture_id>.json`, `evidence/portable-runtime/process-source/<capture_id>/receipt.json`. Modify `src/broker/platform.mjs`, `src/broker/ownership.mjs`, `src/broker/paths.mjs`, `src/broker/identity.mjs`, `src/broker/client.mjs`, `src/broker/provider-resources.mjs`, `src/startup/runtime.mjs`, `src/protocol/process-identity.mjs`, `src/config/setup.mjs`, `bin/peer-review-broker.mjs`.

**Interfaces:**

- **Consumes:** Physical worktree identity from existing broker identity, OS protection adapter, existing observeProcessIdentity and authenticated endpoint probe; Task2 owns broker-death/reclaim proof and registry reconciliation. Task17 later adds run/provider-obligation discharge, not basic broker-only stale recovery.
- **Produces:** read-only `observeStorageProtection({root,osAdapter}):Promise<ProtectionReceipt>`; setup-only `provisionProtectedRoot({root,osAdapter}):Promise<ProtectionReceipt>`; `acquireOwnerElection({paths,contenderIdentity,observeProcessIdentity,signal,deadline,clock}):Promise<ElectionOutcome>` and `joinVerifiedBroker({binding,signal,deadline}):Promise<BrokerClient>` and `acquirePortableOwner({worktree,paths,reconcile,protection}):Promise<Owner>` with async `publish/verify/release` and source/version/principal/ACL/assurance receipts. Task2 also owns `runProcessSourceConformance({mode,packagePath,binding,registrationIndex,approvedRef}):Promise<ProcessSourceReceipt|ProcessSourceClass|PackReceipt|ClassVerification>` in its standalone live script; pack/bind/capture-absence/capture/review-class/verify/verify-class modes (verify accepts a single receipt or a registration-indexed receipt root plus an expected package receipt) are independent of Tasks3/18. Capture schemas keep tested tarball/source hashes, host/OS/build/architecture/Node/probe and registration/offset provenance. Runtime consumes a shipped reviewed ProcessSourceClass keyed by OS/build range, stock probe path/version/visibility/error contract, Node coverage, exact adapter/source-contract digest and semantics/precision. Individual capture host and whole-package bytes are not ordinary-user prerequisites. `verifyProcessSourceClass({ledger,host,adapterHashes,probeObservation}):SourceAssurance` and `loadProcessSourceAssurance({installation,host,probe}):Promise<SourceAssurance>` consume shipped class metadata and actual installed context; SourceAssurance separates absence/creation capabilities and carries matched contract/approval digests or bounded unavailable reasons.

- [ ] Write failing concurrent same-worktree/linked-worktree ownership, stale lock/no death proof, owner substitution, flush/rename crash, symlink/hardlink/parent replacement/overlapping roots tests.
- [ ] Add actual effective-rights condition:

```js
const r = await observeStorageProtection({
  root: privateRoot,
  osAdapter: windowsFixture({
    mode: 0o600,
    ownerMatches: true,
    inheritanceProtected: false,
    foreignRead: true,
  }),
});
assert.equal(r.verified, false);
```

`windowsFixture` is a Task2 test adapter emitting real ACL-shaped observations, not deriving ACL proof from mode.

- [ ] Run command below red.
- [ ] Implement POSIX owner/mode/type plus macOS extended ACL enumeration/effective-rights verification through fixed stock OS probes; mode0600 cannot override a foreign ACL grant. Windows uses fixed System32 WindowsPowerShell and structured Get-Acl -LiteralPath arguments, no PATH lookup/interpolation. Current user SID is the data principal; SYSTEM and BUILTIN\\Administrators are documented trusted system allowances only when recorded and justified. Elevated-created owner may be Administrators when current user membership and effective rights are verified; owner-SID equality alone is insufficient. Reject other effective readers/writers, unknown deny/allow ordering, unprotected inheritance or reparse/alias state. Setup applies documented protected DACL then rereads; startup fully verifies ACL. Every write rechecks owner/type/link-count/parent/file identity against receipt; changed identity/ACL invalidates it and requires full observation. Test real elevated/non-elevated Windows creation and foreign explicit/inherited ACE, plus actual macOS foreign ACL grant/clear. Security-descriptor changes by the trusted account are outside the foreign-account threat boundary; do not claim cheap inode checks alone detect every ACL edit. No mode-derived ACL assurance.
- [ ] Implement portable durable contender arbitration before any shared owner-path mutation: unique protected slots, atomic choosing/number publications, Lamport bakery order (ticket,contenderId), waiting for earlier live/choosing contenders, and a winning slot held through creation/reclaim/release. Publish choosing before directory scans; read coherent ticket states. All initial claimers/reclaimers use this same election. Ignore crashed contenders only on positively verified exact process death; unknown blocks. No TTL or recursive stale-reclaim lock. Inside the winning transaction reread owner bytes/generation, prove broker PID/start identity dead, authenticate reachable endpoint and reconcile registry plus known active/provider obligations before quarantine and exclusive wx replacement. Endpoint silence never proves death; unknown/fenced provider effects refuse replacement. Retain exact stale bytes/receipt and descriptor/parent checks. Rename alone is not compare-and-swap: a second reclaimer must never move a newly published owner. Test two reclaimers plus live newcomer, choosing/broker/quarantine-before-create crashes, restart and owner substitution; prove one owner and no stolen live generation.
- [ ] Make election wait bounded: callers pass AbortSignal plus absolute injected monotonic deadline. Startup uses its existing30000ms readiness budget; recovery uses its sealed operation deadline; nested calls cannot renew either. A verified authenticated live owner yields owner-live, withdraws this contender's choosing/ticket slot, then joins that exact broker as client. A live chooser without a published endpoint may wait only within remaining budget. Unknown blocker or deadline/abort yields bounded indeterminate (APR_BROKER_STALE-style), exact blocker/obligation and withdrawal receipt; no owner creation. Own-slot cleanup failure itself is retained obligation, never silently removed. Test won, concurrent start owner-live/join with one broker and zero leaked slots, hung/unknown contender indeterminate, client newcomer and deadline/abort at every election transition. Windows slot publish/read sharing violations EPERM/EBUSY retry at most3 total attempts within the same remaining deadline, then indeterminate; no age takeover.
- [ ] Define distribution now: ship reviewed process-source-contracts.json with code-validated absence classes and separately clock-conformed creation-stamp classes. Each closed class declares OS family/build range, stock probe canonical path/version/visibility/error contract, Node coverage, source semantics/precision, exact production adapter/parser/validator code contract digest and accepted class review/conformance references. Source-contract digest excludes its own ledger/approval/evidence fields; finalized class approval separately commits that contract plus accepted evidence/review digests. Capture records retain exact tested host/tarball as provenance, not runtime prerequisites. Packaging binds the shipped accepted ledger to conformed source code. A changed adapter/semantics/probe/build scope invalidates the affected class; unrelated native-file/package changes do not. No operator assertion or per-user clock procedure grants assurance.
- [ ] Separate positive PID absence from creation-stamp mismatch. A fresh unregistered installation matches its current OS/Node/stock probe and shipped adapter digest against the reviewed absence class, then performs its exact code-validated probe; no clock step or host receipt is required. Linux verifies fixed procfs/namespace visibility and readable valid kernel boot_id before exact PID-directory/stat absence; EACCES, hidden/unmounted procfs, missing subfile of a live/zombie PID or generic ENOENT/ESRCH elsewhere is unknown. Windows fixed verified System32 PowerShell uses local CIM with -ErrorAction Stop, explicit successful query completion and closed typed no-such-PID output; query/provider errors, missing executable, denial, malformed output or incidental exit3 is unknown. macOS fixed verified /bin/ps uses the reviewed exact PID selection/output/exit/stderr and visibility contract with real live/absent/error controls: Apple ps can exit1 for no selected rows, but generic exit1/empty output alone is not proof. PID absence does not depend on kern.boottime. Adopt actual stock-result contracts before advertising each class; unmatched sources return bounded unknown with doctor/help guidance, never age takeover.
- [ ] PID reuse requires same verified execution host/PID and disjoint start intervals from a matching shipped creation-stamp class with real unchanged-child clock/timezone/DST conformance. Windows CreationDate/macOS lstart remain candidates until that class passes; canonical UTC/fixed-locale parsing and precision intervals prevent formatting/within-second false mismatches. Linux start ticks require the same directly verified kernel boot_id. Clock-derived boottime/LastBootUpTime mismatch, equal/overlapping precision, denied/unclassified source or changed host is live/unknown. Seal source/class/contract/approval/precision digests; mismatch discharges only the original broker/contender, not descendant/effect obligations. Exact host/principal/boot/PID/start ownership remains per-run: class scope validates source semantics, not another host's identity. Fix macOS generic ENOENT/ESRCH death catch and Windows nonterminating-query-error-to-null ambiguity. Test errors, hung endpoint, clock-step reuse, unchanged child and overlap.
- [ ] Own executable production-independent source-class capture here. process-source-conformance.mjs pack invokes resolved Node/npm with argument arrays and names portable-candidate.tgz before Task4 exists; bind installs exact bytes, records loaded adapter/source-contract hashes and creates a protected capture key. Evidence producers use separately reviewed pre-capture registrations/index/revision; ordinary users do not. capture-absence proves real live/owned-child-exit/absence/error controls without clock changes on CI or registered manual hosts. capture holds a nonce-handshaking unchanged child through explicitly authorized real clock/timezone/DST changes on registered manual hosts until CI privilege/restoration is verified. Record UTC-minus-monotonic offsets before/during/after sustained windows and precision; reverted/inadequate/skipped steps or missing restoration/cleanup are inconclusive/nonpassing. Linux records kernel boot_id before/after without asserting Task3 reboot/descendant proof. Mocks prove protocol only.
- [ ] Save signed capture receipts locally and under evidence/portable-runtime/process-source/capture_id/receipt.json against independently reviewed capture registration. review-class validates capture signatures/code/source scope and emits a proposed class record; ordinary review accepts its finite OS/probe/Node/code/semantics coverage and promotes exact approval/source digests into the shipped ledger. Absence-class adoption needs real stock-probe controls, creation-stamp adoption additionally needs live clock/timezone/DST conformance. A new tarball may reuse accepted classes only when its exact adapter/source-contract bytes and declared installed scope match; no package digest laundering or unchecked range widening. Task4 checks native-free candidate source bytes and fresh-install recovery without host receipts; changed source contracts require Task2 recapture/review. Task18 reuses the producer/classes and retains historical tested package provenance.
- [ ] Wire production through process-source-assurance.mjs verifyProcessSourceClass/loadProcessSourceAssurance. At startup and recovery, verify shipped class approval/source digest against actual adapter hashes and fresh OS/build/Node/probe path/version/visibility before classifying the result. Runtime never imports test/live scripts, requires private capture keys/excluded evidence files, enrolls each user host or asks users to change clocks. Missing/changed class/probe stays bounded source-class-unavailable or creation-stamp-unavailable and preserves fences with explicit doctor/help limitations. Fresh supported installations get absence recovery immediately; PID reuse succeeds within clock-conformed class scope or reports its limitation. Actual installed tests start/crash/reclaim on fresh unregistered roots with no receipts, reject modified/widened/mismatched classes, and prove reuse/overlap. Production validator and JSON ledger ship in audited src inventory.
- [ ] Replace bootstrap and manual-recovery native consumers using the production mapping below. Windows bootstrap calls provisionProtectedRoot then exact protected exclusive create/reverify; manual fence holds the same Task2 winning election across reconciliation, durable manual-suspension publication and all provider-effect proof. Joining a live owner performs authenticated suspend instead. Unknown wake/manual-launch outcomes remain fenced; no restoration of legacy old-runtime routing. Add actual Windows bootstrap and #106/#117/#126 manual-recovery regressions, including competing startup/recovery and lost fence-publication response.
- [ ] Random32-byte credential in `.scratch/peer-review/private/`; endpoint `runtime/endpoint.json` includes fingerprint/instance/port/digest/heartbeat, never secret. Redact credential digest from tooling too. Publish after ownership/recovery; verify roots at each write.
- [ ] Run green on all target OS jobs; commit.

- [ ] Add the following implementation invariant at this task's owning seam, then complete every enumerated boundary fixture:

```js
const receipt = await observeStorageProtection({ root: paths.privateRoot, osAdapter });
if (!receipt.verified) throw new Error('effective-user-protection-unproved');
const election = await acquireOwnerElection({
  paths,
  contenderIdentity,
  observeProcessIdentity,
  signal,
  deadline,
  clock,
});
if (election.kind === 'owner-live')
  return joinVerifiedBroker({ binding: election.binding, signal, deadline });
if (election.kind !== 'won') throw boundedOwnershipError(election);
// Only election.lease remains held across owner mutation and owned cleanup.
const ownerFile = await fs.open(paths.lock, 'wx', 0o600);
await ownerFile.writeFile(JSON.stringify(ownerProof));
await ownerFile.sync();
// Keep ownerFile and the winning contender slot held until release.
```

**Verification Commands:**

```sh
node --test test/unit/storage-protection.test.mjs test/integration/portable-ownership.test.mjs test/integration/broker-multiproject.test.mjs test/integration/broker-endpoint.test.mjs test/integration/portable-manual-recovery.test.mjs test/integration/windows-portable-bootstrap.test.mjs test/unit/process-identity.test.mjs test/unit/process-source-conformance.test.mjs test/unit/process-source-assurance.test.mjs
node test/live/process-source-conformance.mjs pack --output .scratch/peer-review/portable-candidate.tgz
node test/live/process-source-conformance.mjs bind --package .scratch/peer-review/portable-candidate.tgz --binding .scratch/peer-review/process-source-binding.json
```

**Registered manual source-conformance step:** Review the emitted candidate, commit its registration/index in the nonpackaged evidence directory, and output the approved immutable revision/index digest in .scratch/peer-review/process-source-approved-ref.json. Check out that public index at this revision before the following capture. The capture command waits for expressly authorized real clock/timezone/DST changes and restoration on the registered host; it is not an unattended CI command.

```sh
node test/live/process-source-conformance.mjs capture-absence --binding .scratch/peer-review/process-source-binding.json --registration-index evidence/portable-runtime/process-source/registration-index.json --approved-ref .scratch/peer-review/process-source-approved-ref.json --output .scratch/peer-review/process-source-absence.json
node test/live/process-source-conformance.mjs capture --binding .scratch/peer-review/process-source-binding.json --registration-index evidence/portable-runtime/process-source/registration-index.json --approved-ref .scratch/peer-review/process-source-approved-ref.json --output .scratch/peer-review/process-source-conformance.json
node test/live/process-source-conformance.mjs verify --receipt .scratch/peer-review/process-source-conformance.json --registration-index evidence/portable-runtime/process-source/registration-index.json --approved-ref .scratch/peer-review/process-source-approved-ref.json
node test/live/process-source-conformance.mjs review-class --receipt-root evidence/portable-runtime/process-source --registration-index evidence/portable-runtime/process-source/registration-index.json --approved-ref .scratch/peer-review/process-source-approved-ref.json --output .scratch/peer-review/proposed-source-class.json
```

After ordinary review accepts the proposed class's scope/evidence, promote its exact approval/source digests into the shipped ledger and run actual fresh-root installed tests. The proposed record itself is not authority.

#### Acceptance Criteria

One broker owns one physical worktree, including competing stale reclaimers; simultaneous clients withdraw/join within budget and unknown contenders return bounded errors. Broker-only crash recovery works before Task17; live/unknown/provider-fenced ownership remains protected. Linked roots get distinct ports; actual Windows/macOS effective ACL and alias observations fail closed. Task2 owns executable class capture/review. Shipped code-validated absence classes allow fresh unregistered-user recovery without host/package receipts; creation classes require real clock/timezone/DST conformance. Exact host/run ownership is retained. Mock results cannot unlock class scope or fresh-install parity.

## Native Production Consumer Migration Map

Task2 and Task1 migrate all current platform binding consumers, not merely the addon loader. Task4 statically audits the complete src/bin import graph plus actual packed inventory; any new consumer must be added here before native removal.

| Current consumer/export                                                                                                                           | Portable replacement and owner                                                                                                                           |
| ------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| src/broker/identity.mjs canonicalPath/userId, startup/runtime.mjs and cli/run.mjs platform selection                                              | Task2 verified realpath/type/root tuple and OS principal adapter (Windows verified SID, not USERNAME); Task1 async callers                               |
| broker/ownership.mjs directory handles and exclusive lock                                                                                         | Task2 protection receipt/exclusive protected file APIs and bounded ownership election                                                                    |
| broker/client.mjs createBootstrap/missingDiscovery and bin/peer-review-broker.mjs bootstrap reads                                                 | Task2 provisionProtectedRoot for setup-only bootstrap, observeStorageProtection for reads, identity rechecks; await the new APIs                         |
| broker/client.mjs fenceManualRecovery acquireExclusive                                                                                            | Task2 same election across reconciliation/fence publication, or authenticated live-owner suspension; preserve manual-launch non-submission proof         |
| broker/provider-resources.mjs openPrivateDirectory/acquireExclusive/release/abandon                                                               | Task2 protected resource directory and resource-specific bounded election through the same algorithm; exact session/nonce resource verification retained |
| broker/ipc.mjs and broker/service.mjs listen/connect/accept/read/write/close/peerUser and stale endpoint reclaim                                  | Task1 async authenticated HTTP lifecycle replaces framing/peer-UID trust; Task2 credential/protection/owner binding, no fabricated peerUser              |
| startup/runtime.mjs, cli/run.mjs, bin/peer-review-broker.mjs platformSecurity factory                                                             | Tasks1/2 portable factory with asynchronous callers; no compatibility method backed by a native loader                                                   |
| broker/platform.mjs loadBinding/inspectPlatformSecurity, cli/run.mjs build path, doctor/help/parser and broker/runtime-image.mjs native inventory | Task4 removes build/load paths and updates capability doctor/help/inventory, coordinating current #102-owned runtime-image integration                   |

Underlying native directory verify/read/create/remove/close, exclusive verify/release/abandon, endpoint verify/reclaim/close and connection methods all map through these rows. Preserve atomic create, exact generation/bytes, close/release and recovery obligations; a POSIX file mode or renamed method is not replacement semantics.

### Task 3: Genuine Host Epoch and Descendant Termination

#### Story Intent

- **Beneficiary:** Users recovering provider/host failures.
- **Capability:** Prove quiescence of every potential writer.
- **Need:** Distinguish reboot from broker restart, sleep, PID reuse and migrated effects.
- **Value or failure prevented:** Prevent unsafe lease release or overlapping replacement writers.

#### Implementation Scope

**Files:** Create `src/providers/containment.mjs`, `src/protocol/host-epoch.mjs`, `test/helpers/descendant-writer.mjs`, `test/unit/host-epoch.test.mjs`, `test/integration/provider-containment.test.mjs`, `test/live/host-epoch-conformance.mjs`, `schemas/host-epoch-evidence-v1.json`, `schemas/conformance-run-binding-v1.json`, `schemas/conformance-host-bundle-v1.json`, `schemas/conformance-key-registration-v1.json`, `schemas/conformance-anchor-view-v1.json`, `schemas/conformance-artifact-receipt-v1.json`, `scripts/conformance-driver.mjs`, `test/unit/conformance-driver.test.mjs`. Modify `src/providers/process-lifetime.mjs`, `src/providers/conformance.mjs` and `src/protocol/process-identity.mjs`.

**Interfaces:**

- **Consumes:** Exact process observations from process-identity, provider conformance capability and protected installation key from Task2.
- **Produces:** `observeExecutionHost({osAdapter,privateKey}):Promise<{execution_host_id,boot_epoch,source,version,assurance}>`; `containProvider({launch,capability}):Promise<{scope,observe,cancel,terminationReceipt}>`; `verifyTermination({sealedScope,launchEpoch,freshObservation,processEvidence}):TerminationResult`. `bindConformanceRun({packagePath,root,osAdapter}):Promise<HostEvidenceBundle>` creates signed public run binding/key_id with a private locator retained only in protected storage; `runConformanceDriver({mode,bundle,signal}):Promise<DriverReceipt>` owns validate-producer-context/validate-consumer-inputs/pack-bind/ci-anchor/pin-manual-registration/build-anchors/register-key/capture-epoch/verify-epoch/close-binding. pack-bind emits a separate pre-capture registration candidate containing run/package/host/producer/evidence-kind/public-key fingerprint and key_id; register-key accepts it only against an independently obtained anchor; capture requires the resulting accepted registration reference. `buildCiAnchor({artifactReceipt,approvedWorkflowContext}):Promise<AnchorView>` validates service archive metadata and exact registration payload hash; `buildAnchors({manualIndex,manualRevision,processSourceIndex,processSourceRevision,ciReceipts}):Promise<AnchorView>` merges authenticated CI anchors with reviewed manual and Task2 process-source anchors and rejects collisions, self-supplied fingerprints or post-capture registration. Scope inventories local/remote writer bounds; proved/outstanding obligations stay separate.

- [ ] Write red direct-child-dead/grandchild-live, escaped process group/session, PID reuse, broker restart, sleep/resume, changed host, unknown launch epoch, remote job and failed cancel tests.
- [ ] Pin negative reboot proof:

```js
const r = verifyTermination({
  sealedScope: { execution_host_id: 'host-a', writers: 'local-only' },
  launchEpoch: { boot_epoch: 'boot-a', assurance: 'verified-os-source' },
  freshObservation: {
    execution_host_id: 'host-a',
    boot_epoch: 'boot-a',
    broker_instance_id: 'new',
  },
  processEvidence: { descendants: 'unknown' },
});
assert.equal(r.quiescent, false);
```

- [ ] Run command below red.
- [ ] Separate PID/start-time identity from boot proof. Linux uses kernel boot_id/protected host identity. macOS kern.boottime and Windows LastBootUpTime are timestamps and remain non-proof observations; precision does not establish epochs. Evaluate kernel kern.bootsessionuuid only as a macOS candidate requiring installed permissions/stability/change conformance; local probe was denied, so no current assurance is claimed. Windows needs a documented boot-session counter/identifier stable under wall-clock adjustment with Fast Startup behavior verified. Until proved, boot_epoch=null/unavailable and fences remain. HMAC verified raw IDs privately; no uptime estimate/broker ID/retrospective epoch.
- [ ] POSIX group signals/Windows taskkill are cancellation actions, not proof. Require installed provider/OS containment guarantee and exact descendant observation; escaped/migrated writer fixture must fail unsupported capability. If built-ins plus installed facilities cannot prove containment, retain fences and block advertised topology; no addon/Job Object helper/custom executable.
- [ ] Implement a cross-platform Node conformance driver: pack-bind invokes installed npm through its resolved Node npm entrypoint with argument arrays, packs once, records the sole exact tarball path/digest, creates a per-host/run binding and signing key under Task2-verified private storage. Public bundle has no private key bytes. Flush protected key/binding before capture; persist across authorized reboot; post-reboot verify rechecks protection/run/package/host before signing. Never regenerate a missing key as if continuity survived. close-binding destroys the private key only after signed evidence verification/publication and a durable close receipt; interrupted verification retains key under diagnostics retention with explicit cleanup obligations. Fixture missing/swapped/insecure key, crash-before-bind publication, reboot continuity and idempotent close. Both Task3/18 use identical manual-host registration and host-epoch commands below; Task18 additionally lists the separate CI producer commands and consumer merge. pack-bind writes .scratch/peer-review/conformance/registration-candidate.json as well as its requested bundle; register-key validates the separately published registration anchor before capture, never trusts a fingerprint supplied only by the bundle.
- [ ] Implement anchor modes red-to-green here. validate-producer-context validates upstream pack receipt and authenticated repository/run/workflow/source/job service metadata against the reviewed producer workflow/source expectation, then emits approved-ci-context.json; it cannot accept workflow authority solely from capture inputs. ci-anchor consumes the immutable upload artifact ID/archive digest and approved repository/workflow/source/run/job identity from the CI publish step, queries the authenticated artifact service metadata, downloads/checks the archive digest and extracts/verifies the exact registration-candidate payload hash/context before emitting .scratch/peer-review/ci-anchors.json. The archive digest is not a payload digest. pin-manual-registration verifies a separately reviewed commit/index digest and accepted scope, then emits .scratch/peer-review/manual-anchors.json. build-anchors repeats CI receipt validation at consumption and merges the approved checked-out manual index into .scratch/peer-review/anchors.json; missing/duplicate/conflicting or foreign-workflow/run/package anchors refuse. Capture bundles never populate an anchor. Red fixtures cover self-signed bundle/fingerprint substitution, archive-versus-file digest confusion, forged/expired/missing receipt, wrong approved workflow commit, unreviewed manual commit and registration after capture. validate-consumer-inputs validates the ordinary accepted E/R review references and producer service context before emitting its named receipts/checking out public bytes; its independently trusted repository review/service inputs are never capture-bundle authority. Task18 implements the named producer/consumer jobs using these modes.
- [ ] Implement live capture/verify modes; capture, authorized actual reboot, verify same host, then broker-restart/sleep/Fast Startup negatives and authorized wall-clock/NTP-adjustment tests. Clock change must not appear as reboot; supported epochs must change after real reboot. Unsupported sources remain unavailable. Mock epoch changes prove protocol logic only. Request explicit user scheduling before reboot.
- [ ] Run green; retain platform feasibility blocker if proof unavailable; commit.

- [ ] Add the following implementation invariant at this task's owning seam, then complete every enumerated boundary fixture:

```js
const sameHost = launchEpoch.execution_host_id === freshObservation.execution_host_id;
const provedEpoch =
  launchEpoch.assurance === 'verified-os-source' &&
  freshObservation.assurance === 'verified-os-source' &&
  launchEpoch.boot_epoch !== null &&
  freshObservation.boot_epoch !== null;
const localOnly = sealedScope.writers === 'local-only';
const terminatedByRestart =
  sameHost && provedEpoch && localOnly && launchEpoch.boot_epoch !== freshObservation.boot_epoch;
```

**Verification Commands:**

```sh
node --test test/unit/host-epoch.test.mjs test/integration/provider-containment.test.mjs test/unit/process-identity.test.mjs test/unit/provider-process.test.mjs
node --test test/unit/conformance-driver.test.mjs
node scripts/conformance-driver.mjs pack-bind --bundle .scratch/peer-review/conformance/host-bundle.json
```

**Manual registration review:** After pack-bind, submit the public registration candidate for ordinary review into evidence/portable-runtime/registrations/run_id.json and its index. The approved commit must precede capture. The governed review/checkout step emits .scratch/peer-review/manual-registration-approved-ref.json containing the immutable commit, exact index digest and approved run/workflow/package scope; it checks out the public index from that commit. pin-manual-registration verifies these inputs and emits the local pinned anchor view. No back-to-back self-registration is valid.

```sh
node scripts/conformance-driver.mjs pin-manual-registration --bundle .scratch/peer-review/conformance/host-bundle.json --manual-index evidence/portable-runtime/registration-index.json --approved-ref .scratch/peer-review/manual-registration-approved-ref.json --output .scratch/peer-review/manual-anchors.json
node scripts/conformance-driver.mjs register-key --bundle .scratch/peer-review/conformance/host-bundle.json --anchors .scratch/peer-review/manual-anchors.json
node scripts/conformance-driver.mjs capture-epoch --bundle .scratch/peer-review/conformance/host-bundle.json
```

**Post-reboot Verification Commands (after explicitly authorized actual reboot and negative cases):**

```sh
node scripts/conformance-driver.mjs verify-epoch --bundle .scratch/peer-review/conformance/host-bundle.json
```

#### Acceptance Criteria

The verify-epoch command runs only after explicitly authorized actual reboot and clock/sleep/restart negatives; it does not schedule those actions. Driver passes the bundle's exact --package/--run-binding to both capture and verify script modes. Standalone Task3 evidence can close-binding after verified publication; release runs close after the verified per-host signed bundle is published; aggregate verification uses retained public keys and signatures, not private keys. Only verified same-host epoch change discharges sealed locally confined writers; every unknown/remote/filesystem obligation remains explicit. Live OS proof, not mocked green tests, establishes support.

### Task 4: Binary-Free Package Closure and CI

#### Story Intent

- **Beneficiary:** Users installing on supported platforms.
- **Capability:** Install/run without native builds or runtime downloads.
- **Need:** Audit the full production closure and remove native provisioning.
- **Value or failure prevented:** Prevent compiler/header/architecture requirements hidden in dependencies or CI caches.

#### Implementation Scope

**Files:** Create `scripts/audit-production-closure.mjs`, `test/unit/production-closure.test.mjs`, `test/integration/portable-installed-broker.test.mjs`, `test/helpers/portable-network-policy.mjs`, `src/broker/legacy-observation.mjs`, `test/integration/legacy-portable-boundary.test.mjs`, `test/unit/no-native-production-imports.test.mjs`, `scripts/check-release-activation.mjs`, `test/unit/release-activation-gate.test.mjs`. Modify `package.json`, `package-lock.json`, `test/packaging/package.test.mjs`, `test/integration/broker-release.test.mjs`, `test/unit/broker-build.test.mjs`, `test/unit/broker-build-command.test.mjs`, `test/helpers/warm-packed-cache.mjs`, `test/helpers/windows-offline.mjs`, `test/helpers/assert-network.mjs`, `test/helpers/windows-offline.ps1`, `.github/workflows/ci.yml`, `.github/workflows/release.yml`, `src/doctor.mjs`, `src/config/setup.mjs`, `src/cli/parse.mjs`, `src/cli/run.mjs`, `src/cli/help-data.mjs`, `src/broker/runtime-image.mjs`, `README.md`, `test/helpers/internal-api.mjs`, `test/helpers/installed-provider/scenario.mjs`, `test/helpers/slow-broker-recovery.mjs`, `test/unit/errors.test.mjs`, `test/unit/broker-ownership.test.mjs`, `test/unit/broker-registry.test.mjs`, `test/integration/broker-readiness.test.mjs`, `test/integration/setup-doctor.test.mjs`, `test/live/installed-broker-handoff.mjs`, `src/broker/client.mjs`, `src/broker/provider-resources.mjs`, `src/startup/runtime.mjs`, `bin/peer-review-broker.mjs`. Retire production `scripts/build-broker-security.mjs` / `native/broker-security/` after Tasks1/2 portable parity. Task3 gates new epoch/descendant claims and final release independently.

**Interfaces:**

- **Consumes:** Tasks1/2 portable lifecycle APIs, actual installed package inventory and npm lock/production graph; existing test-only `test/helpers/npm-command.mjs` exports `runNpm(tool,args,options)` for package tests. The audit module consumes the parsed tree and does not import test code; no new review orchestration is required for transport conformance.
- **Produces:** `auditProductionClosure({lockfile,packageRoot,installedTree,packInventory}):AuditReport` and exported `productionGraph(lockfile)` enumerate all direct/transitive/optional production files/scripts/native/download risks and source/license rationale; `observeLegacyBoundary({identity,env,home,clock,signal}):Promise<LegacyBoundaryReceipt>` returns live/indeterminate/stale/terminal-only with exact evidence and pending work; `quarantineLegacyLeftovers({receipt,election,contractRecord,activationAddendum,approvedReference,registration,installedIdentity}):Promise<QuarantineReceipt>` requires independently verified activationAuthorized for the exact current installation plus original positive ownership/death/election proof; absent proof preserves bytes and never destroys history; `verifyReleaseActivation({sourceCommit,tag,packageDigest,contractRecord,activationAddendum,approvedReference,checker}):ReleaseActivationReceipt` resolves the approved immutable pair, requires exact parent-contract digest and C/T/D equality, all independent owner/registration/conformance obligations and a publication-mode checker report with all three domains true; missing proof refuses publication.

- [ ] Write red transitive native/build/download/disguised architecture-binary fixtures and actual installed-tarball broker lifecycle/auth/concurrency/recovery tests.
- [ ] Pin full traversal:

```js
for (const p of productionGraph(lockfile)) {
  assert.equal(p.nativeArtifacts.length, 0, p.name);
  assert.equal(p.binaryDownloads.length, 0, p.name);
  assert.equal(p.requiredBuildScripts.length, 0, p.name);
}
```

- [ ] Run focused tests red.
- [ ] Audit lock graph plus installed `npm ls --omit=dev --json` tree and actual package files/scripts. SDK/Zod/Prettier undergo same audit; tooling moves dev only if runtime import inventory proves unused. No name-only denylist proof.
- [ ] Remove node-gyp/native sources/build invocation from production runtime/tarball/export/help after portable tests pass; regenerate lock normally and inspect dependency diff. Preserve exact legacy history read-only. Until Task5 adopts migration, new package refuses native-era broker ownership and active/recoverable/fenced legacy state with bounded drain/retain-original-installation guidance; never resume/reinterpret those journals or select old runtime/image fallback. No native fallback in new package.
- [ ] Observe all native-era locations read-only before portable mutation: compute the unchanged legacy physical-root/user digest and cache/endpoint selection from paths.mjs; inspect cache/ai-peer-review/brokers/digest/broker.lock and broker.json; configured/default endpointRoot/aipr/v1/base32(digest) on POSIX or the exact ai-peer-review-brokers-digest-broker.sock Windows pipe. Inventory cache provider-resources/digest/resource.lock/resource.json; .scratch/peer-review/broker/registrations, reviews/review-id and contained transaction directories with startup-request.json/events.jsonl/manual-suspension/manual-recovery fences/collateral reservation. An old broker may use a different AI_PEER_REVIEW_ENDPOINT_ROOT: compare recorded endpoint root/layout to all trusted recorded locations, not only the current environment. Missing/unmatched/unverifiable recorded root is indeterminate; do not infer native absence from the current default. Broken links/unreadable/unknown records are indeterminate. Node net bounded Unix-socket/named-pipe connection probe is read-only (no provider protocol commands): successful connection means endpoint-live and refuses; timeout/hung listener is indeterminate, connection refusal alone is not death. Combine recorded PID with Task2 exact death classification; only positive broker death plus absent/reconciled provider obligations and terminal-only authority yields stale-leftovers. A leftover lock file proves neither held kernel lock nor death; do not attempt to test flock/LockFileEx from JavaScript. Tests cover live native endpoint, stale socket+proved dead PID, hung endpoint, terminal-only journals, active/recoverable/fenced journals and unrecorded listener.
- [ ] Legacy probes are necessary but cannot stop an unmodified older runtime starting immediately afterward. Task4's native-free deliverable is a CI/installed package candidate with controlled conformance activation, not general upgrade/public activation. Stale quarantine requires the independently approved contract/activation pair, verified current installation and #102-owned selected-current registration/read-back excluding incompatible old launchers, plus actual conformance of that boundary and original positive ownership/death/election proof; contract intent or publication history alone is insufficient. Absent that proof, leave stale native artifacts intact and expose diagnostics. No same-user/operator assertion is substituted for death proof or lock exclusion. A deliberately launched incompatible old installation is outside the supported activation boundary; do not claim the new lock prevents it. Task5 reviews real native/portable start races and any supported drain/manual-recovery transition before production activation. Current legacy manual paths retain original package/state; the candidate refuses their active/fenced authority rather than silently converting it.
- [ ] Add static complete-production-graph checks: no src/bin or packed production module imports/requires/dynamically loads a .node binding, loadBinding/native helper/build path, or obsolete platform native method implementation. Verify every consumer in the migration map, including provider resources, bootstrap and manual recovery; preserve regression assertions and source import graph audit beyond string-name matching. Coordinate runtime-image.mjs changes with #102 PR139/current implementation: inspect current exact accepted/merged head before edits, sequence/rebase on its owned inventory contract and independently review overlap; never change current runtime selection/fallback policy.
- [ ] Migrate all inventoried native fixtures: internal-api/registry image bytes omit helper files; runtime-image inventory verifies pure JavaScript installation bytes without changing #102 selection/routing policy; ownership/readiness tests exercise portable actual installed storage/HTTP concurrency without nativeAvailable skip gates; errors/setup-doctor assert portable help/dependencies; slow-recovery/installed-provider/live handoff use portable APIs and never build helpers. Preserve their failure/reconciliation assertions; do not delete coverage or keep CI-only native skip paths.

- [ ] Choose release gate option(a), not a long-lived branch: Task4 targets the normal governed integration branch and modifies release.yml before native removal. Immediately before npm publication OR matching-artifact verification and GitHub release creation, run check-release-activation.mjs against the exact tagged-source packed digest and the approved immutable contract record plus exact release-specific activation addendum checked out from authenticated approved-ref/evidence revision outside packaged paths. The contract binds owner/spec/plan/schema bytes and accepted references, never C/T/D. The separate sibling binds its exact parent-contract digest and C/T/D/registration/conformance. Validate both approved objects and all operational obligations against downloaded P/D; a test fixture cannot supply release authority. Missing Task5 checker, approved pair, stale addendum, unresolved conflict, mismatched parent digest/source/tag/package, incomplete independent owner reviews or conformance fails closed. Task4 owns the wrapper and red release-workflow fixtures; Task5 later supplies accepted checker/record. After merge, all ordinary releases containing this portable change, including unrelated/#102 changes, are held until adoption; older already-reviewed tags use their original source workflow. While Task5 is pending, a v0.4 hotfix must branch from the verified pre-Task4 source commit, receive ordinary review and a new signed hotfix tag, and use that source's original workflow; it cannot bypass the gate by tagging current portable integration bytes. Preserve signed-tag/provenance/artifact-match checks. Controlled candidate means install only the CI-built tarball in isolated CI conformance jobs or registered manual-host conformance runs, never a published npm channel or ordinary production startup; private harness bindings confine candidate tests and do not supply migration/old-family exclusion authority. Tests assert signed tag alone cannot bypass this gate and a synthetic complete pair exercises refusal grammar and reaches the subsequent existing checks.
- [ ] Make portable-installed-broker.test.mjs produce exact native-free portable-candidate.tgz/digest, then install on fresh unregistered user/worktree roots with no source receipts/registration index/keys. Verify shipped class/adapter contract hashes and current OS/probe scope; start/crash/observe absent PID/reclaim within the bounded election budget on every advertised absence class. Test PID reuse against shipped clock-conformed creation classes plus overlap/unknown cases. Unavailable creation classes report exact visible PID-reuse limitation and native-equivalence=blocked; registered-host success cannot claim user parity. A missing absence class blocks that platform's supported candidate/release scope rather than wedging ordinary supported users. Native retirement leaves class evidence valid if source-contract bytes remain exact; changed source bytes require Task2 recapture/review of the native-free candidate. Keep the candidate/CI milestone independent of Tasks3/5 without claiming final release readiness from explicit limitations.
- [ ] Migrate CI phase-2 native-dependent live-host/native-broker steps and npm-pack build-warm/inventory steps to portable fixtures/audit. Preserve actual tarball extraction, installed npm ls, handoff assertions, external-provider prerequisites and diagnostics. Remove Python/MSVC/build-essential/Xcode/headers/APR_NATIVE_REQUIRED/APR_NODEDIR_BASE CI provisioning. Preserve Node24/26/current × Ubuntu/macOS/Windows and npm11.8.0/12.0.2 parser coverage, all current verification suites/release provenance.
- [ ] Offline installed proof warms JS production cache then denies external egress while allowing loopback. Existing unshare/macOS blanket IP deny blocks target transport: replace OS policy; Linux new network namespace explicitly brings lo up with `ip link set lo up` before local HTTP proof while external routes remain absent; verify local success/external failure and restore in finally. AIPR never installs provider executables; optional live CLI setup stays explicit external prerequisite.
- [ ] Run green closure/installed/pack/smoke and commit.

- [ ] Add the following implementation invariant at this task's owning seam, then complete every enumerated boundary fixture:

```js
// In test/unit/production-closure.test.mjs, using the existing test helper:
let tree;
try {
  tree = JSON.parse(
    runNpm('npm', ['ls', '--omit=dev', '--json'], { cwd: packageRoot, encoding: 'utf8' })
  );
} catch (error) {
  const diagnosticTree = error.stdout ? JSON.parse(String(error.stdout)) : null;
  throw new Error('invalid-installed-production-tree', { cause: { error, diagnosticTree } });
}
const report = auditProductionClosure({
  lockfile,
  packageRoot,
  installedTree: tree,
  packInventory,
});
assert.equal(report.failures.length, 0);
assert.equal(report.uninspectedProductionPackages.length, 0);
```

**Verification Commands:**

```sh
node --test test/unit/production-closure.test.mjs test/unit/no-native-production-imports.test.mjs test/unit/release-activation-gate.test.mjs test/integration/legacy-portable-boundary.test.mjs test/integration/portable-installed-broker.test.mjs test/unit/broker-ownership.test.mjs test/unit/broker-registry.test.mjs test/unit/errors.test.mjs test/integration/broker-readiness.test.mjs test/integration/setup-doctor.test.mjs
node test/live/process-source-conformance.mjs verify-class --package .scratch/peer-review/portable-candidate.tgz --ledger src/protocol/process-source-contracts.json
node scripts/audit-production-closure.mjs
npm ls --omit=dev --json
npm run test:packaging
npm run test:smoke
npm pack --dry-run
```

#### Acceptance Criteria

Portable parity is measured on fresh unregistered roots without host receipts: actual authentication/private storage/effective ACL, exclusive claim, absent-PID stale recovery, lifecycle and64-socket concurrency must pass on Ubuntu/macOS/Windows for each advertised absence class. PID reuse must reclaim in clock-conformed creation classes; otherwise doctor/help/report expose precise source/precision limitations and native-equivalence=blocked. Registered producer success alone cannot pass user parity. Missing absence class blocks platform scope, never a hidden first-crash wedge. Tasks1/2/4 deliver native-free candidate/CI independently of Tasks3/5 while explicit limitations remain; final replacement requires all advertised recovery/conformance gates and adopted old-family activation exclusion. Production closure contains no native/build/download/architecture binary.

### Task 5: Reconcile Accepted Contract Owners

#### Story Intent

- **Beneficiary:** #107/#102/#30/#34 implementers.
- **Capability:** Freeze one compatible authority/config/evidence contract.
- **Need:** Resolve accepted-spec contradictions before public integration.
- **Value or failure prevented:** Prevent unreviewed runtime/policy override and duplicate evidence formats.

#### Implementation Scope

**Files:** Governed follow-up creates `docs/superpowers/specs/2026-10-03-107-runtime-policy-reconciliation-design.md` and `evidence/portable-runtime/contracts/runtime-contract-adoption.json`, `test/fixtures/runtime-contract-adoption.json` (test cases only) and `scripts/check-runtime-contract-adoption.mjs`. Task4's release wrapper consumes this checker; it cannot publish while this prerequisite is absent. Add checker-only `scripts/lib/runtime-review-grammar-v0.4.1.mjs`, `schemas/runtime-review-lineage-proof-v1.json` and `evidence/portable-runtime/contracts/review-lineage/<review_id>.json`. Review inputs are the bounded owner addendum `docs/superpowers/plans/2026-10-05-144-contract-owner-adoption-addendum.md` and separately accepted `docs/superpowers/plans/2026-10-05-107-runtime-contract-plan-amendment.md`. Modify this plan after accepted amendment; #30/#34 owners update their own plans. Never modify the immutable accepted #107 spec in implementation.

**Interfaces:**

- **Consumes:** Immutable #107 spec, controller's verified #102 current artifacts and #30/#34/#109 owner plans; produces review/adoption prerequisites, no public runtime code.

- **Produces:** the following reviewed contracts and checker interfaces.

- `RuntimeContractAdoption` is an immutable reviewed document record containing owner issues #102/#30/#34/#109, exact specification/amendment/bounded plan/schema references, the complete coupled bundle, accepted normal owner review references and unresolved contract conflicts.
- `ActivationBinding` in that record freezes the exact reviewed #102 launcher/current-runtime interfaces, registration contract, exclusion/drain guarantees, prospective conformance requirements and unresolved operational obligations. It is contract intent, not deployed assurance.
- `RuntimeActivationAddendum` is an append-only sibling of the accepted contract record. It references the exact contract digest, release source/tag/tarball, registration and genuine installed exclusion/drain conformance. It has separate accepted normal reviews from #102/#107/#30 and cannot revise the contract.
- `checkRuntimeContractAdoption({record,artifacts,recordReference,approvalReview,lineageProofs,activationAddendum,mode}):Report` is document-only and reports `contractAdopted`, `activationAuthorized`, `publicationAllowed` separately. Absent activation evidence leaves the latter two false.
- An approved-ref pins the contract record and accepted review plus, for publication, one exact activation addendum and accepted review. Git revisions, blobs, bytes, complete normal manifests, accepted members, persisted attempt/event/source identity and terminal author transaction are validated. No caller assertion, fixture or latest filename grants authority.
- Task 8 alone owns runtime `assertContractAdoption({contractRecord,activationAddendum,approvedReference,registration,installedIdentity}):void`. It verifies the independently approved pair and exact current installation through #102-owned registration/read-back, as specified below; contract-only success never supplies runtime activation authority.

- [ ] Read live issue/artifact ownership at verified commits; state labels alone do not prove adoption.
- [ ] Write targeted spec follow-up with concrete global-vs-coexistence installation, exclusive-vs-layered policy, and active legacy drain/recovery cases. Do not choose silently.
- [ ] Evaluate a legacy-endpoint tombstone as an explicit alternative in the targeted spec review: Node net could occupy the verified legacy socket/pipe while portable broker is alive, making old clients fail handshake instead of launching. Verify exact v0.4 launchable error codes/missing-discovery branch, configured roots, already-live native owner and broker-crash window. This is not adopted or sufficient exclusion today; no endpoint mutation before jointly reviewed activation decision. Prefer the smallest conformed boundary that satisfies #102/#107 without inventing kernel-lock proof.
- [ ] Record expected outcomes for changed Node/current selection, unsupported active/fenced journals, mixed policies and evidence adoption. Include old launcher started after native probe, native/portable simultaneous start and retained manual recovery/drain scenarios with actual conformance requirements. Review through authorized governance; unresolved conflicts block supported production activation, Tasks7/8 integration and18 migration/release.
- [ ] After actual acceptance, revise affected plan contracts/gates and repeat plan review. The immutable authoritative contract is ordinarily reviewed at a pinned evidence revision outside package files and binds owner/spec/amendment/bounded Plan/schema references, actual native owner dispositions and accepted reviews. It never binds a future tag/tarball. Later C/T/D belongs only to the separately accepted activation sibling; test fixtures cannot authorize adoption or publication. The checker must prove owners and exact reviewed digests:

```js
assert.equal(adoption.runtimePolicy.issue, 102);
assert.equal(adoption.evidence.issue, 30);
assert.equal(adoption.analytics.issue, 34);
assert.equal(adoption.telemetry.issue, 109);
assert.equal(adoption.unresolvedConflicts.length, 0);
assert.ok(adoption.reviewedDigests.every((d) => /^[a-f0-9]{64}$/.test(d)));
const report = checkRuntimeContractAdoption({
  record: adoption,
  artifacts,
  recordReference,
  approvalReview,
  lineageProofs,
  mode: 'adoption-only',
});
assert.equal(report.contractAdopted, true);
assert.equal(report.activationAuthorized, false);
assert.equal(report.publicationAllowed, false);
```

- [ ] Commit separately reviewed follow-up material through ordinary governance.

**Verification Commands:**

```sh
node scripts/check-runtime-contract-adoption.mjs --mode adoption-only --record evidence/portable-runtime/contracts/runtime-contract-adoption.json --approved-ref .scratch/peer-review/evidence-approved-ref.json
git diff --check
```

#### Acceptance Criteria

Actual owner adoption/review evidence resolves conflicts; tests alone are not adoption. Gate remains blocked when the decision record is incomplete. Contract-only completion requires actual bounded owners, an independently accepted immutable contract and authentic retained lineage proof; activationAuthorized/publicationAllowed remain false. Default mode and all release consumers retain the stronger publication requirement.

#### Contextual response compatibility and owner proof

The accepted bounded owner Plan is `docs/superpowers/plans/2026-10-05-144-contract-owner-adoption-addendum.md` at `bdd842694a0494da963c538de686d1c85d689d4d`, blob `95a44172d2683c9c5b213c6e9b7be4cd7b690149`, SHA-256 `3f04358b465b4722bc0d5880c2896e19df44445a1ee3839887749f24cbb935d8`. Its normal Plan XPR `review-057079566301a0106537dde070ea518a` finalized at `674a5c967ed32122eb0c879f4e9991fa3792535b`, with authority assurance unavailable. That acceptance approves the bounded proposals, not four actual native owner dispositions, their broader plans, or implementation.

Bind both response schema artifacts from `66b1a7a5fe061336bcf484d26fab3973a3b19c77`:

- API artifact `schemas/api-response-v1.json`, SHA-256 `7eb93ca43014ff4f57c3e3b93e8d2d1e996bb68b6585ff356a07cf31445e9292`, schema artifact ID `ai-peer-review.api-response/v1`.
- Historical artifact `schemas/response-v1.json`, SHA-256 `744390c3aa12d92e08051054a75812a0b348787d59069d09d4f9e762ea4c76d9`, schema artifact ID `ai-peer-review.response/v1`.

Both payloads retain `ai-peer-review.response/v1`. The supported API boundary selects its API artifact through the operation registry; historical participant evidence selects its historical artifact. Never dispatch solely on the shared payload tag, reinterpret the historical reader, or weaken either closed grammar. Contract adoption requires this exact contextual rule and both byte references in the actual #30 historical-evidence and #102 runtime native dispositions and in the accepted applied #107 plan. Tests alone do not adopt it.

Actual owner proof binds each genuine native owner transaction/source, exact disposition bytes, owner issue, bounded subsection, selected complete bundle, accepted Plan reference and remaining obligations. Additive pointers preserve every ordinary Implementation-plan, Governing-spec, Plan-review and approval marker. One common accepted Plan review repeated four times is not four owner transactions. The unverified broad #102 independent Plan review remains recorded provenance; this bounded adoption requires its own accepted bounded Plan reference and genuine native disposition, not invented acceptance of the broader six-slice plan.

Normative target interfaces and reserved identifiers from #107 do not freeze absent field-level schema bytes. Detailed #30/#130 schema implementation and broader #34/#109/#152/#153 work retain their own gates. #109's native disposition is bounded to Codex consumption/repair; #152/#153 retain broader shared telemetry integration.

Version-bound actual-workspace lineage proof is generated from complete original private events before the immutable contract record is reviewed. A retained, ordinarily reviewed public proof receipt binds the exact facts and verifier/source identity; original journals and provider handles remain private. Local verification and Git-reproducible consumer verification are distinct as specified below. The receipt supplements and never replaces the pinned contract, review bytes and terminal author transaction. No fixture, lossy projection, copied private journal or caller claim supplies it. Raw event byte hashes and the exact producer's canonical receipt algorithm remain distinct. An approved-ref never executes untrusted pinned JavaScript.

#### Strict producer provenance and retained lineage proof

Task 5 creates checker-only `scripts/lib/runtime-review-grammar-v0.4.1.mjs` and `schemas/runtime-review-lineage-proof-v1.json`. The grammar is reviewed checked-in checker source, not selected executable code. It carries the complete closed producer-0.4.1 event/startup/runtime grammar and reduction/receipt semantics required by the actual normal protocol, including the exact optional author shape, all persisted event/attempt/identity transitions, terminal coherence and recursively sorted canonical event digest with the producer's terminal-event exclusion rule. It preserves full input bytes and rejects unknown keys/types/version profiles, missing events, fabricated actors, altered author fields and incoherent receipts. Repository 0.4.0 public runtime grammar remains unchanged and its real incompatibility remains a required negative.

The supported profile pins the actual reviewed producer package identity and every relevant producer module digest (startup grammar, event validator/reducer, record-lineage inspector and receipt algorithm), plus the checker importer source digest. The local generated receipt binds those exact observed installation/module bytes and producer package identity to the actual review's startup-request and request-digest-linked runtime snapshot, original event/attempt bytes and manifest. Verify snapshot manifest raw/canonical digests, exact declared inventory, every regular-file byte/size/mode, entrypoint/Node selection and the snapshot module hashes; preserve the linkage to the launch receipt and protocol startup. Independently hashing an unrelated installation is insufficient. Missing startup/snapshot/launch linkage remains a blocking provenance prerequisite. A package version string, adapter version, source hash list or caller declaration alone cannot select a trusted profile. The profile/provenance receipt is independently inspected from actual installed source and ordinary-reviewed evidence; unknown package/module identity refuses. The selector supplies immutable data references only; the checker never imports/runs selector-chosen JavaScript, a scratch runtime package, or an untrusted pinned revision.

Task 5 creates document-only `verifyRuntimeReviewLineage({workspace,reviewReference,producerProfile}):RuntimeReviewLineageProof` as the local full-verification seam. It reads original private event/attempt bytes, verifies the complete profile and closed reducer, exact author/reviewer identity, accepted normal decision, manifests/member/artifact bytes and terminal author Git transaction, then emits only reviewed public facts. Output path: `evidence/portable-runtime/contracts/review-lineage/<review_id>.json`; schema identifier: `ai-peer-review.runtime-review-lineage-proof/v1`. No raw event text, scratch state, private handle, credential or provider prompt is exported. Public facts include exact producer/package/module/importer identity, raw event/attempt byte digests, canonical receipt digest/algorithm identity, artifact/manifest/accepted-member refs, terminal commit/parent/blob/trailer pins, verified identity fingerprints and unchanged assurance, check outcomes, observation time and reproducibility classification.

The two verification boundaries are explicit:

- **Local generation/adoption:** complete actual-workspace/source replay is mandatory before a referenced proof receipt can be reviewed into the contract evidence. Missing workspace, strict source mismatch or any incomplete lineage refuses. Exact public receipt bytes are ordinarily reviewed with the immutable evidence; caller-written proof JSON is not accepted. The contract-record review's own terminal lineage can only be generated after its finalization and is bound separately by the governed approved-evidence transaction, avoiding self-referential record digests.
- **Git/CI adoption or publication:** verify the pinned normally reviewed receipt's immutable bytes, genuine generator/source profile, complete declared checks, exact target review/manifest/member/artifact/terminal references and approved evidence provenance. Do not require unavailable original private journals on the GitHub runner; explicitly report original private-event replay as unavailable here and consumed evidence as retained reviewed local verification. Missing/stale/mismatched/unreviewed receipt refuses. This remains the delivered unavailable/manual assurance, not external attestation or a claim the original events are reproducible from Git.

Tests pin unmodified real 0.4.1 normal collateral, stripped/altered author fields, unknown producer package/module identity, incoherent raw-versus-canonical digest claims, missing persisted events, wrong generator/source, unreviewed receipt and stale target references. Actual authentic positive receipt requires real local complete-event verification; fixtures prove refusal/grammar only.

#### Task 5 verification boundary and native mapping

Task 5 Verification Command 1 uses the explicit contract-only command:

```sh
node scripts/check-runtime-contract-adoption.mjs --mode adoption-only --record evidence/portable-runtime/contracts/runtime-contract-adoption.json --approved-ref .scratch/peer-review/evidence-approved-ref.json
git diff --check
```

`--mode adoption-only` exits zero only for authentic complete contract adoption, and emits `activationAuthorized:false` and `publicationAllowed:false` even if other evidence is present. Missing owner/plan/schema/lineage/decision evidence exits blocked. An unknown mode refuses. Omitting mode retains the stronger publication requirement; release consumers may neither pass adoption-only nor infer publication from its exit code.

After repeat acceptance of the final affected canonical plan, root uses native `issue-body` to change only #144 scope/VC1 and its source-plan amendment pointer. Preserve original Source-plan-commit and record the exact accepted amendment/final plan commit separately. Retain the existing AC and its `vc:1 vc:2` evidence mapping and all full-suite/lint/format/commit verifiers. No AC is ticked by a draft amendment.

Task 5 completes only after actual owners adopt, the contract record is independently reviewed and immutable, and the new VC1 proves those exact records. Later activation obligations remain visible pending dependencies. Default publication refusal remains a required negative check.

### Task 6: Canonical Closed API and One Help Registry

#### Story Intent

- **Beneficiary:** Host agents constructing CLI/MCP requests.
- **Capability:** Discover and validate one versioned operation schema.
- **Need:** Bind retries to exact canonical submitted content.
- **Value or failure prevented:** Prevent duplicate-key ambiguity, silently accepted fields and invalid help examples.

#### Implementation Scope

**Files:** Create `src/api/contracts.mjs`, `src/api/registry.mjs`, `src/api/validate.mjs`, `src/api/canonical-json.mjs`, `src/api/errors.mjs`; `schemas/start-request-v1.json`, `schemas/api-response-v1.json`, `schemas/status-request-v1.json`, `schemas/wait-request-v1.json`, `schemas/intervention-request-v1.json`, `schemas/submit-turn-request-v1.json`, `schemas/help-request-v1.json`, `schemas/cleanup-request-v1.json`, `schemas/series-reconcile-request-v1.json`, `schemas/finding-id-v1.json`; `test/unit/api-registry.test.mjs`, `test/unit/request-canonical.test.mjs`; `test/golden/api-help.test.mjs`; `test/fixtures/api-contracts.json`. Modify `src/cli/help-data.mjs`, `src/cli/help-topics.mjs`, `src/errors.mjs`. Preserve historical schema readers.

**Interfaces:**

- **Consumes:** Validated raw/parsed transport inputs and immutable spec contracts; generated output schemas consumed by Tasks7–18.
- **Produces:** `operationRegistry`, `validateOperation(name,input,{rawText}):ValidatedOperation`, `encodeRequestCanonical(value):Buffer`, `requestDigest(value):string`, `renderHelp({topic,format}):HelpEnvelope`. Help explicitly documents monitoring.reconcile_after_ms's liveness threshold and wrapper reconnect-window meanings pending Task5 adoption. Registry owns schemas, response/action unions, examples, errors and sole grammar `ai-peer-review.finding-id/v1`.

- [ ] Write red canonical equivalence fixtures for whitespace/key order,6/6.0/6e0,escaped same-string filepath, UTF-16/non-BMP key sorting/prefixes, every required string escape/slash/scalar Unicode. Reject lone surrogates, invalid numeric domains, unknown fields, absent stages and raw duplicate keys; parsed-only MCP records not-observable.
- [ ] Pin submitted filepath identity:

```js
assert.deepEqual(encodeRequestCanonical(parsedA), encodeRequestCanonical(parsedB));
assert.notEqual(requestDigest({ ...valid, filepath: './spec.md' }), requestDigest(valid));
```

`parsedA/parsedB/valid` are validated exact fixtures in `test/fixtures/api-contracts.json`.

- [ ] Run below red.
- [ ] Implement raw duplicate-key parser (not text regex), then closed schema. Canonical encode validated submitted value before defaults, exact UTF-16 sorting/UTF-8 scalar escaping/integer decimal/no whitespace/no normalization.
- [ ] Generate schemas/MCP definitions/help/errors/monitor/config/turn/envelope examples and golden outputs from registry. Every safe issue includes JSON Pointer/rule/received/expected/correction, bounded truncation count, mutation/retry safety and next action. Credentials/raw handles forbidden.
- [ ] Validate Markdown literal/code-node/rendered spelling. Sole published finding grammar matches registry; gate2 owns its assertions with code separators; unresolved code identical. Inject underscore substitution, grammar corruption, de-indented continuation and missing separator; each fails. Do not transcribe another expected regex.
- [ ] Run green/goldens and commit.

- [ ] Add the following implementation invariant at this task's owning seam, then complete every enumerated boundary fixture:

```js
export function requestDigest(value) {
  const bytes = encodeRequestCanonical(value);
  return createHash('sha256').update(bytes).digest('hex');
}
// validateOperation has already rejected invalid numeric domains and lone surrogates.
```

**Verification Commands:**

```sh
node --test test/unit/request-canonical.test.mjs test/unit/api-registry.test.mjs test/golden/api-help.test.mjs
```

#### Acceptance Criteria

Transport forms share exact canonical identity and schemas; all registry examples validate; malformed raw JSON fails before mutation.

### Task 7: Config v2 and Finite Roster Resolution

#### Story Intent

- **Beneficiary:** Users selecting models, profiles and fallback policy.
- **Capability:** Resolve exact supported roster/caps/cascades before mutation.
- **Need:** Make changed turn/round semantics and policy sources explicit.
- **Value or failure prevented:** Prevent silent selection defaults, topology downgrade and unbounded retries.

#### Implementation Scope

**Files:** Create `src/config/v2.mjs`, `src/startup/roster.mjs`, `schemas/config-v2.json`, `test/unit/config-v2.test.mjs`, `test/unit/roster-resolution.test.mjs`, `test/fixtures/config-v2-cases.json`. Modify `src/config/load.mjs`, `src/startup/selection.mjs`; Candidate schema and isolated authority fixtures may proceed after applicable Task5 accepted contract. Production config completion and runtime integration additionally require #130 independently accepted versioned partial-store, assembled closed-object, inheritance and installation-receipt schemas and reviewed #102/#130 transport/read-back; field-ownership adoption does not invent them.

**Interfaces:**

- **Consumes:** Task6 registry validator/canonical policy schemas and versioned installed capability observations; Task5 adopted policy authority plus #130 accepted detailed schemas and #102/#130 reviewed registration transport/read-back are required for production integration.
- **Produces:** `validateConfigV2(source):ConfigV2`; `resolvePolicySources(contractAdoption,installation):PolicySources` is Task7's wrapper around the adopted #102-owned source classification/primary authority interface, returning validated ordered sources and provenance without reimplementing runtime selection; `resolveConfigV2(adoptedSources):{config,sources}` follows Task5's jointly reviewed authority decision. Under complete bundle A, the exact accepted #102 primary/user field-ownership table replaces cross-store authority deep merge. Preserve ordinary within-owned-policy scalar, named-key/profile/array semantics, exact source pointers, bounds, defaults, caps and fallback requirements; gate15 traces that explicit disposition. `resolveRoster({stage,config,capabilities}):SealedRoster` returns identities/sources/headless placement/caps/permissions/visibility/finite cascade and eligibility table against every reachable counterpart.

- [ ] After Task5, write red adopted source-authority cases, plus scalar/named-key and whole-profile/array behavior exactly where the adopted amendment permits it; package empty profiles/default null, omitted roles/model/effort, empty supplied lists/nonexistent defaults, bounds/order and unknown-key fixtures. Adoption records disposition of every original layering requirement.
- [ ] Pin excluded candidates/no initial downgrade:

```js
const r = resolveRoster({ stage: xprStage, config: profile, capabilities: fixtureMatrix });
assert.equal(r.initial.kind, 'xpr');
assert.deepEqual(r.allowedKinds, ['xpr', 'spr']);
assert.equal(r.eligibility['codex-reviewer']['codex-author'].kind, 'spr');
```

These are schema-valid conformance fixture selections, not installed support claims.

- [ ] Run below red.
- [ ] Validate sources before resolution and cross-field references afterward. Implement exact default leaves from Global Constraints,1..1000 cap limits/1..10 retries, threshold order, source provenance; stage overrides only affect that stage. Adopt reviewed #102 policy-source interface before public integration; no general deep merge of host-private policy.
- [ ] Explicit provider/model primary then deduplicated configured fallback; unspecified role picks eligible profile. Omitted model/effort profile then unique versioned exact adapter default; explicit unsupported value never substitutes. Selector/host/provider distinct; syntax-safe identifiers passed through, no stale hardcoded catalogs.
- [ ] Request `fallback_kinds` array/profile `fallback_kinds_by_class` map; nonempty/unique/include requested class; SAR only["sar"], two-party only SPR/XPR. Exact escaped JSON Pointers/source paths/member indexes. Initial roster matches requested class; finite table against all reachable counterpart choices seals active/conditional/excluded reasons, exclusions consume no try.
- [ ] New-runtime v1/mixed config rejects `APR_CONFIG_MIGRATION_REQUIRED` with legacy keys/changed semantics/prospective sources/caps; never convert max_turns numerically. Removed on_missing_surface rejects; config cannot consent unattended. Conditional rules/alternative roster extension unsupported in v1.
- [ ] Run green and commit adopted candidate resolver; unresolved Task5 adoption blocks it. Production integration/config completion additionally waits for accepted #130 detailed schemas and #102/#130 reviewed protected registration-receipt transport/read-back.

- [ ] Add the following implementation invariant at this task's owning seam, then complete every enumerated boundary fixture:

```js
const adoptedSources = resolvePolicySources(contractAdoption, installation);
for (const source of adoptedSources) validateConfigV2(source);
const resolved = resolveConfigV2(adoptedSources);
const roster = resolveRoster({ stage, config: resolved.config, capabilities });
assert.equal(roster.initial.kind, stage.kind);
// Source authority is adopted by #102/#107 before this implementation exists.
```

**Verification Commands:**

```sh
node --test test/unit/config-v2.test.mjs test/unit/roster-resolution.test.mjs test/unit/provider-capabilities.test.mjs
```

#### Acceptance Criteria

Exact immutable intent/roster/policy sources seal once; unsupported/malformed policy fails before reservation; #102 conflict never becomes undocumented implementation choice.

### Task 8: Read-Only Preview and Atomic Reservation

#### Story Intent

- **Beneficiary:** Controllers retrying uncertain delivery.
- **Capability:** Validate without mutation and reserve one run/artifact lease.
- **Need:** Return immediate durable receipt before provider launch.
- **Value or failure prevented:** Prevent duplicate sessions, cache-writing preview and competing legacy writers.

#### Implementation Scope

**Files:** Create `src/startup/run.mjs`, `src/startup/contract-adoption.mjs`, `src/protocol/run-store.mjs`, `src/protocol/artifact-lease.mjs`, `test/unit/runtime-contract-adoption.test.mjs`, `test/integration/run-start.test.mjs`, `test/integration/preview-readonly.test.mjs`, `test/helpers/run-fixture.mjs`. Modify `src/startup/runtime.mjs`, `src/protocol/store.mjs`, `src/broker/registry.mjs`.

**Interfaces:**

- **Consumes:** Task6 request identity, Task7 sealed policy/roster, Task2 physical protection/ownership, Task12 read-only portable lineage API and Task15 host surface observation; isolated test adapters until those modules exist.
- **Produces:** `previewRun({request,binding,deps}):Promise<PreviewEnvelope>`; `startRun({request,binding,deps}):Promise<StartReceipt>`; `reserveRun({requestDigest,artifact,policy,contractBinding}):Promise<Reservation>`; `lookupRequest({worktree,requestId,digest}):ReplayResult`; `assertContractAdoption({contractRecord,activationAddendum,approvedReference,registration,installedIdentity}):void`. Fixture returns start/preview/snapshotTree/launchCount/faultAt/clock/authority.

- [ ] Write red no-write/spawn/lock/conformance/cache/credential-refresh preview spies; exactly permitted spec preflight reads only. Never consult derived authority series cache. Existing identical authenticated replay returns durable status before new capabilities/config, even if now unavailable.
- [ ] Pin atomic replay:

```js
const before = f.snapshotTree();
await f.preview(request);
assert.deepEqual(f.snapshotTree(), before);
const [a, b] = await Promise.all([f.start(request), f.start(request)]);
assert.equal(a.run_id, b.run_id);
assert.equal(f.launchCount(), 0); // reservation receipt precedes dispatch
```

- [ ] Run below red.
- [ ] Validate/authenticate/canonical ID lookup first, then session-free policy/capability/FUR/type/digest/physical protection/portable lineage/monitor observations. Unknown auth/quota disclosed; known invalid auth rejects; review capability absence rejects; telemetry gaps admitted.
- [ ] Missing verified visible monitor/unattended=false rejects `APR_MONITOR_SURFACE_REQUIRED` with mutation=false/no run/no lease/no reserved ID. Correction requires explicit user consent,fresh ID,unchanged other fields and unattended=true; uncertain original delivery exact-replayed first. No automatic consent.
- [ ] Reserve ID/lease/run header in one journaled locked transaction; mutable observations rechecked under artifact/series locks. Seal runtime binding through adopted #102 interface; uncertain legacy active/fenced overlap refuses. Return starting receipt then journal operation before external launch; each crash settles by reconciliation, never blind relaunch. Post-reservation errors carry mutation=true/run ID.
- [ ] Keep public activation rejected unless independently verified activationAuthorized covers the stored approved contract/addendum pair, exact current installed package/Node, #102 protected registration/read-back and all conformance obligations. A Task5 adoption-only pass or publication history cannot authorize runtime effects. Exported records/run ID confer no grants. Run green plus lock/recovery regressions and commit.

- [ ] Add the following implementation invariant at this task's owning seam, then complete every enumerated boundary fixture:

```js
const parsed = validateOperation('start', request, { rawText });
const digest = requestDigest(parsed.value);
const prior = lookupRequest({ worktree, requestId: request.request_id, digest });
if (prior.kind === 'existing') return prior.receipt;
assertContractAdoption({
  contractRecord,
  activationAddendum,
  approvedReference,
  registration,
  installedIdentity,
});
const contractBinding = {
  contractRecord,
  activationAddendum,
  approvedReference,
  registration,
  installedIdentity,
};
return await reserveRun({ requestDigest: digest, artifact, policy, contractBinding });
```

**Verification Commands:**

```sh
node --test test/integration/run-start.test.mjs test/integration/preview-readonly.test.mjs test/unit/runtime-contract-adoption.test.mjs test/integration/review-lock-recovery.test.mjs
```

#### Acceptance Criteria

Preview is lock-free/session-free/read-only; reservation is replay safe and exclusive; immediate receipt precedes launch; unresolved contract/ownership blocks public start.

#### Task 8 external registered authority transport

The activation addendum binds P's exact digest D and therefore cannot be embedded in P. Keep all authoritative records/addenda outside packaged paths. #102-owned setup/registration stores the independently verified public contract/addendum pair and approved immutable provenance in a protected OS-account selected-current registration store, separate from P and user project policy. #130 owns the versioned closed installation/registration-receipt schema; #102/#130 independently review its exact transport/read-back contract and Task 8 consumes it. Missing schema/interface acceptance or registration is a production integration blocker, not a caller fallback.

The setup/registration transaction validates normal contract/addendum acceptance, immutable approved evidence refs, exact pair linkage, complete independent activation/conformance obligations and the actual installed current package inventory/source identity before writing the protected receipt. At every effect and after waits, #102 selected-current read-back verifies registration ownership/integrity, stored pair/provenance, current Node/package selection and running installation bytes against those exact accepted release references. A caller path, environment value, arbitrary network response, stale receipt, ordinary policy field or publication status never grants authority. Remote retrieval, if later supported by the owners, must retain the same authenticated immutable approval and byte verification; this Plan adopts no unauthenticated fetch.

Task 8 consumes the genuine read-back through `assertContractAdoption({contractRecord,activationAddendum,approvedReference,registration,installedIdentity}):void`, before reservation under existing locks and mutable-observation revalidation. It independently requires activationAuthorized for the stored approved pair and exact running package. The invariant uses this named argument object and carries the verified registration/pair into `reserveRun`'s sealed contract binding. No local setup receipt certifies deployed conformance by itself. Unknown/missing/tampered/swapped registration, contract/addendum mismatch, current selection change, older-tag addendum or installed digest drift refuses new effects. Preview retains all existing read-only/session-free/no credential refresh/write limits; genuine identical replay still precedes new capability/config checks.

### Task 9: Headless Identity and Private Role Tools

#### Story Intent

- **Beneficiary:** Users requesting SAR/SPR/XPR.
- **Capability:** Launch externally supervised exact sessions with role authority.
- **Need:** Separate controller and worker identities/submissions.
- **Value or failure prevented:** Prevent same-session peer review, inherited identity and credential leakage.

#### Implementation Scope

**Files:** Create `src/providers/headless-contract.mjs`, `src/broker/role-wrapper.mjs`, `src/broker/role-tools.mjs`, `src/identity/session-distinctness.mjs`, `test/unit/session-distinctness.test.mjs`, `test/integration/headless-role-tools.test.mjs`. Modify `src/broker/worker-factory.mjs`, `src/broker/worker.mjs`, `src/broker/launch.mjs`, `src/broker/participant-binding.mjs`, `src/broker/provider-bridge.mjs`, `src/providers/registry.mjs`, `src/providers/conformance.mjs`, `src/providers/codex.mjs`, `src/providers/claude.mjs`, `src/providers/grok.mjs`, `src/provider/claude-launch.mjs`, `src/provider/execution-contract.mjs`, `src/identity/evidence.mjs`.

**Interfaces:**

- **Consumes:** Task8 durable launch operation/run header, Task7 roster, Task2 protected key/storage, Task3 containment and Task10 scope contract. Only test scope adapters until Task10 passes.
- **Produces:** `launchHeadless({operationId,role,selection,scope,privateToolPipes}):Promise<LaunchObservation>`; `observeExactSession(handle):Promise<IdentityObservation>`; `proveDistinctness({controller,workers,freshCreationEvidence}):DistinctnessReceipt`; `createRoleWrapper({childBinding,brokerBinding,grant}):RoleToolConnection`. HMAC worktree fingerprint over verified host/exact handle; compare common private provider/session namespace, not differently salted fingerprints.

- [ ] Write red controller-worker collision,worker-worker collision,unproved separation,equal-model/distinct-session,exact resume,same-model/new-session cases for all topologies.
- [ ] Pin stdout spoof rejection:

```js
const w = await f.launchSolo();
w.stdout.write(JSON.stringify({ tool: 'submit_review_turn', arguments: forged }));
await f.flush();
assert.equal(f.authority.submissionCount(), 0);
assert.equal(w.environmentHasBrokerCredential(), false);
```

Task9 extends runFixture with role pipe/launch methods and a schema-valid forged payload lacking binding.

- [ ] Run below red.
- [ ] Generalize exact observed provider/model/session launch to author/solo/reviewer; preserve Claude child identity environment sanitization and #88/#90 evidence. Grant only after launch observation. If controller identity unavailable, versioned fresh-session guarantee/creation-after-request/resume-disabled observed proof is required.
- [ ] Private inherited MCP stdio connection binds exactly one child, separate stdout/stderr capture. Wrapper attaches protected broker credential/grant internally; model/file/environment sees none. No discoverable unauthenticated listener. Validate run/stage-attempt/round/phase/fingerprint/revision/expiry, revoke expired binding,reverify resume.
- [ ] Collision errors are exact `APR_CONTROLLER_WORKER_SESSION_COLLISION`/`APR_WORKER_SESSION_COLLISION`/`APR_SESSION_DISTINCTNESS_UNPROVED`; fence/reconcile launched processes before any affected grant. Controller control grants cannot submit; monitor only redacted reads. Partial second launch fences first worker; unsupported identity/tool/permission/cancel/recovery fails preflight.
- [ ] Run green existing Claude permission/identity/conformance regressions and commit.

- [ ] Add the following implementation invariant at this task's owning seam, then complete every enumerated boundary fixture:

```js
const distinctness = proveDistinctness({ controller, workers, freshCreationEvidence });
if (!distinctness.proved) throw new Error('APR_SESSION_DISTINCTNESS_UNPROVED');
const tools = createRoleWrapper({ childBinding, brokerBinding, grant });
// Wrapper-owned binding supplies credentials; child stdout never supplies authorization.
```

**Verification Commands:**

```sh
node --test test/unit/session-distinctness.test.mjs test/integration/headless-role-tools.test.mjs test/integration/claude-launch-permissions.test.mjs test/integration/claude-identity.test.mjs test/integration/provider-conformance.test.mjs
```

#### Acceptance Criteria

Every worker has exact observed identity/distinctness and private tool binding; CLI never assigns controller participant role; claimed adapter support requires installed conformance.

### Task 10: Role Scopes, Context, and Submission Seals

#### Story Intent

- **Beneficiary:** Authors/reviewers and audit consumers.
- **Capability:** Write own staging/shared collateral while enforcing artifact/authority boundaries.
- **Need:** Attribute exact payloads to bound roles and preserve immutable supplied context.
- **Value or failure prevented:** Prevent reviewer edits, cross-role impersonation and collateral tampering.

#### Implementation Scope

**Files:** Create `src/protocol/role-scope.mjs`, `src/protocol/submission.mjs`, `src/protocol/context-projection.mjs`, `test/integration/role-scope.test.mjs`, `test/integration/submission-seals.test.mjs`. Modify `src/collateral/paths.mjs`, `src/broker/role-tools.mjs`, `src/providers/headless-contract.mjs`.

**Interfaces:**

- **Consumes:** Task9 verified role/session/tool binding, Task8 FUR lease, Task6 turn/response schemas and #30 sealed snapshot inputs through Task12.
- **Produces:** `buildRoleScope({run,role,fur,roots}):RoleScope`; `sealSubmission({request,grant,binding}):Promise<SubmissionReceipt>`; `materializeContext({sealedInputs,role,visibility}):Promise<ContextReceipt>`. Every critique/revision/resume/replacement handoff supplies exact absolute `submission_partition_path` / `shared_collateral_path`, schema/next action, reviewed snapshot digest; critique also complete used-ID context path/count/digest/ledger revision. Portable records omit absolute paths.

- [ ] Write red provider sandbox tests denying reviewer FUR,authority/private/raw-log,other-role staging,sibling context,symlink/hardlink/parent rename/delete escapes; own staging/shared/repository scoped read/permitted research succeed. Validation cache/artifact writes separately scoped.
- [ ] Pin correctable scope rejection:

```js
const before = f.authority.current();
const rejected = await f.submit({ ...critique, response_path: f.sharedPath });
assert.equal(rejected.error.code, 'APR_SUBMISSION_SCOPE_INVALID');
assert.deepEqual(f.authority.current(), before);
assert.equal(rejected.next_action.tool, 'submit_review_turn');
assert.equal((await f.submit({ ...critique, response_path: f.reviewerPartitionFile })).ok, true);
```

Task10 extends runFixture with exact granted partition paths/current submission methods; correction preserves phase/revision/round/grant after no mutation.

- [ ] Run below red.
- [ ] Provider sandbox plus physical rechecks enforce FUR/own-role/shared writes for author/solo,own-role/shared only for reviewer. Package alone writes authority/private/context/export; roots may not overlap/alias; recursive unrestricted worktree grant is invalid. Missing enforcement rejects capability.
- [ ] Seal exact payload bytes append-only outside collaborative roots before ack; reject empty/binary-invalid schema,wrong role/phase/digest/revision/session/expired grant/conflicting replay before advancing. Supervisor never edits role staging. Shared payload path invalid; return same-phase exact permitted partition.
- [ ] SAR critique uses immutable snapshot and detects premature FUR edits as conflict; its one author-capable worker phase separation is compliance, not independently enforced reviewer isolation. Preserve `role_authority=same-user-accountability`, `write_scope=enforced-provider-sandbox`, `submission_scope=role-isolated` and mutable-untrusted collateral claims separately.
- [ ] Verify sealed context before read-only projection; shared divergence yields nonblocking `APR_COLLATERAL_DIVERGED`,bad seal/projection blocks. Record supplied digests/retrievals/unknown access; default fresh reviewer independent context excludes prior responses,not strict repository blinding. External writes/uploads/install/destructive/wider filesystem actions require authority; permitted public read-only research needs no per-query consent.
- [ ] Run green existing reviewer/communication regressions and commit.

- [ ] Add the following implementation invariant at this task's owning seam, then complete every enumerated boundary fixture:

```js
const scope = buildRoleScope({ run, role, fur, roots });
const receipt = await sealSubmission({ request, grant, binding });
// sealSubmission rechecks scope, exact session, bytes and revision under the mutation lock.
assert.equal(receipt.payloadDigest, request.response_digest);
```

**Verification Commands:**

```sh
node --test test/integration/role-scope.test.mjs test/integration/submission-seals.test.mjs test/integration/reviewer-boundary.test.mjs test/integration/communication-policy.test.mjs
```

#### Acceptance Criteria

No participant can change package authority or another role's staging; exact attributed payload/context seals survive collateral edits; correction consumes no extra round/grant.

### Task 11: Stages, Rounds, Findings and Finite Fallback

#### Story Intent

- **Beneficiary:** Users requiring clean governed review.
- **Capability:** Execute exact ordered stages and explicit finding closure under finite budgets.
- **Need:** Keep stage-wide counters/ledger across interruptions and replacements.
- **Value or failure prevented:** Prevent acceptance after final-round edit,author-only closure and fallback cap reset.

#### Implementation Scope

**Files:** Create `src/protocol/run-reducer.mjs`, `src/protocol/findings.mjs`, `src/protocol/dispatch.mjs`, `src/protocol/fallback.mjs`, `schemas/run-event-v1.json`, `schemas/run-state-v1.json`, `test/unit/run-reducer.test.mjs`, `test/unit/findings.test.mjs`, `test/integration/run-sequence.test.mjs`, `test/integration/replacement-budget.test.mjs`. Modify `src/protocol/events.mjs`, `src/protocol/service.mjs`, `src/broker/worker.mjs`.

**Interfaces:**

- **Consumes:** Task8 run journal/lease, Task9 role identity, Task10 sealed submission/context receipts, Task7 finite roster/caps, Task12 evidence verification before terminal acceptance.
- **Produces:** `reduceRun(events):RunState`; `admitCritique({run,stageAttempt,revision}):DispatchReceipt`; `admitRevision({run,stageAttempt,revision}):DispatchReceipt`; `validateFindings({ledger,submission}):LedgerDelta`; `selectFallback({sealedRoster,currentCounterpart,usedCandidates,classification}):ReplacementIntent`. Ledger key `(run_id,requested_stage_id,finding_id)` spans replacements; new requested stages have separate ledgers.

- [ ] Write red clean-last-round/final-revision,failed/interrupted critique,prelaunch no round,revision retries/exhaustion and no reset on resume/replacement/extend-cap tests; every requested later stage runs after earlier acceptance,none after exhaustion.
- [ ] Pin fresh-pass rule:

```js
await f.critique({ verdict: 'changes-required', findings: [finding], round: 6 });
await f.revise({ dispositions: [{ finding_id: finding.finding_id, state: 'addressed' }] });
assert.equal(f.state().status, 'intervention-required');
assert.equal(f.state().accepted, false);
assert.equal(f.dispatchedStageKinds().includes('xpr'), false);
```

Task11 extends runFixture with critique/revise/state/dispatchedStageKinds; finding comes from schema-valid api-contracts fixture.

- [ ] Run below red.
- [ ] Implement states starting/running/awaiting-participant/reconciling/intervention-required/accepted/cancelled/failed with orthogonal fencing/liveness/admission. Critique dispatch durably consumes stage-global round including no-response interruption; revision consumes `(requested_stage_id,round)` allowance including initial. Pre-admission launch has null round. Cap exhausted intervenes entire sequence; final clean may accept,final edit cannot.
- [ ] Acceptance needs current clean verdict,snapshot/FUR/reviewed digest equality,no added open finding,every prior open/disputed/inherited finding explicit reviewer resolution,all seals/receipts,reconstruction,no conflict/fence. Author disposition alone/deferral never closes.
- [ ] Registry grammar whole-input no flags/trimming; complete used-ID file includes resolved history,not allocation pool. Atomic uniqueness validates unused ledger IDs and submission duplicates; collisions `APR_FINDING_ID_CONFLICT`; absent resolution `APR_FINDINGS_UNRESOLVED`,correct same phase/revision without grant/round consumption. Missing/self/cyclic lineage rejects; duplicate/superseded targets require terminal closure,split all children. Preserve category,severity,digest,rationale/evidence,author disposition,reviewer resolution,lineage; cross-stage links informational only.
- [ ] Automatic fallback only versioned positively classified quota/capacity; auth/permission/unknown effects intervene. Fence/reconcile/quiesce outgoing writer and partial checkpoint first. Each candidate selected once per role in sealed order,initial-inclusive launch retry bound,no cycling; actual counterpart table/live capability rechecked. Allowed SPR/XPR class change creates new stage-attempt,next stage-global round; topology never changes role count.
- [ ] Revision exhaustion retains receipts/fence/lease/checkpoint; no new revision in exhausted round. Replacement needs independent sealed quota proof or explicit authority, fresh critique consumes next round and gets fresh configured allowance. Extend-cap adds rounds only,never replacement/revision permission. Preserve compatible solo→author session reuse, fresh independent reviewers and recorded visibility/role transition. Later request new immutable linked run; multi-artifact phases remain distinct.
- [ ] Run green and commit.

- [ ] Add the following implementation invariant at this task's owning seam, then complete every enumerated boundary fixture:

```js
const delta = validateFindings({ ledger, submission });
assert.equal(activeDispatch.round, submission.round);
// The critique dispatch was admitted before provider invocation.
// Apply validated delta atomically to that existing phase; do not dispatch another critique.
```

**Verification Commands:**

```sh
node --test test/unit/run-reducer.test.mjs test/unit/findings.test.mjs test/integration/run-sequence.test.mjs test/integration/replacement-budget.test.mjs
```

#### Acceptance Criteria

All stages/counters/findings remain immutable and bounded across replacement; only subsequent clean exact-byte pass accepts; no unauthorized identity/cap reset.

### Task 12: #30 Shared Evidence and Portable Lineage

#### Story Intent

- **Beneficiary:** Auditors and controllers in fresh checkouts.
- **Capability:** Reconstruct exact versions and link verified follow-ups across lineage modes.
- **Need:** Retain one mutable FUR with immutable responses/patches/anchors.
- **Value or failure prevented:** Prevent patch collisions, lost dirty baselines and cache-dependent history.

#### Implementation Scope

**Files:** #30 owns proposed `src/evidence/snapshots.mjs`, `src/evidence/patches.mjs`, `src/evidence/envelopes.mjs`, `src/evidence/export.mjs`, `src/evidence/series.mjs` and `schemas/record-v1.json`, `schemas/series-index-v1.json`, `schemas/patch-chain-v1.json`, `schemas/response-envelope-v1.json` after adoption. #107 creates `src/protocol/evidence-port.mjs`, `src/startup/lineage.mjs`, `test/integration/run-evidence.test.mjs`, `test/integration/portable-lineage.test.mjs`, `test/helpers/evidence-fixture.mjs`. Modify `src/collateral/review-record.mjs`/`src/protocol/record-lineage.mjs` at versioned seams. If #30 adopts different paths, update interface here; never implement parallel layout.

**Interfaces:**

- **Consumes:** Task5 #30 contract adoption, Task8 artifact/series locks, Task10 exact response payloads, Task11 stage/round/attempt identities and Task13 metrics receipts when available.
- **Produces:** Shared API `snapshotBytes(bytes):Snapshot`; `createReversiblePatch(before,after):Patch`; `applyVerifiedPatch(anchor,patch,{direction}):Buffer`; `renderResponseEnvelope({payload,receiptRefs}):Envelope`; `verifyRecord(record):Verification`; `publishRecord({series,run,sealedInventory,operationId}):Promise<PublicationReceipt>`; `discoverSeries({repository,artifactPath}):Promise<Candidates>`; `publishSeriesIndex({expectedRevision,entry,operationId}):Promise<IndexReceipt>`. Exact IDs ai-peer-review.record/v1,series-index/v1,patch-chain/v1,response-envelope/v1,all prefixed.

- [ ] Write red CRLF/no-newline/empty patch/dirty-new/binary-valid text fixtures; init/recovery/intervening delta; SAR→XPR/replacement collision-free changes; corrupt payload/receipt/patch/anchor; delimiter-like participant response text.
- [ ] Pin cache-free cross-mode linkage:

```js
const clone = await evidenceFixture(t, { transfer: 'sidecar-records-only', localAuthority: false });
const before = clone.furBytes();
const p = await clone.preview(request); // omitted mode defaults frontmatter on Markdown
assert.equal(p.series_id, clone.originalSeriesId);
assert.deepEqual(clone.furBytes(), before);
const r = await clone.start(request);
assert.equal(r.series_id, clone.originalSeriesId);
assert.equal(r.predecessor_run_id, clone.originalRunId);
```

Fixture builds actual fresh clone and linked-worktree variants with canonical transferred index/records/anchor,no authority/cache. Add explicit frontmatter,reverse sidecar follow-up,ambiguous tips negatives.

- [ ] Run below red after shared adoption.
- [ ] Seal snapshots/payloads before export. Normative run layout: manifest/events/metrics/patch-chain,anchors/terminal.bin,changes/C.patch,payloads/P.bin,receipts/T.json,attempts/T/attempt-evidence.json and stages/STAGE_ID/attempts/STAGE_ATTEMPT_ID/rounds/ROUND/{review.md,author-response.md,round.json}. Global increasing change_sequence includes init/checkpoint/between-run delta,adjacent digests match; stage boundary adds no patch.
- [ ] Envelope byte offset/length/digest extracts exact payload independent of Markdown delimiters; supervisor receipt section outside participant digest. Whole-file inventory distinct,paths/sizes/digests except own manifest. Clean pass no author/patch; empty revision empty patch/equal digest; no-response only typed run-scope attempt evidence with round ID links or null-round owner. Required persistence failure blocks seal.
- [ ] Verify every prior version from durable terminal anchor and reversible patches before acceptance,including retained cancelled/intervened runs; no unretained Git dependency. Retention never deletes last anchor. Accepted digest/current drift separate; later edits don't rewrite acceptance.
- [ ] Discover BOTH modes under canonical physical docs/superpowers/peer-reviews before new series even pointerless default-mode start. Validate retained selected-tip manifest/anchor/chain/path,modes share series namespace. No digest-only joins/newest timestamp/absolute cached path trust. Missing binding with retained manifest,escaping path,bad pointer,conflicting tips/copy ambiguity returns APR_LINEAGE_UNRESOLVED with exact repair/repoint/new-lineage operation.
- [ ] After reservation lock/recheck,journal user initial bytes and bounded frontmatter merge once,preserve unrelated metadata,reversible init patch,round1 post-merge digest. Sidecar never writes FUR; cross-mode reuses existing series/predecessor,intervening drift captured. Index published only after terminal sealed record under series lock with idempotent operation; derivative cache rebuilt only after reservation. Export/imported history never resumes active authority or grants roles.
- [ ] Run green no-commit/record regressions and commit through shared ownership.

- [ ] Add the following implementation invariant at this task's owning seam, then complete every enumerated boundary fixture:

```js
const before = snapshotBytes(initialBytes);
const after = snapshotBytes(revisedBytes);
const patch = createReversiblePatch(before.bytes, after.bytes);
assert.deepEqual(applyVerifiedPatch(after.bytes, patch, { direction: 'reverse' }), before.bytes);
const envelope = renderResponseEnvelope({ payload, receiptRefs });
```

**Verification Commands:**

```sh
node --test test/integration/run-evidence.test.mjs test/integration/portable-lineage.test.mjs test/integration/no-commit.test.mjs test/integration/review-record.test.mjs
```

#### Acceptance Criteria

Exact exported bytes reconstruct every retained version and response; fresh path-preserving checkout links history without ignored state; #107 uses #30's one adopted implementation.

### Task 13: Existing #109 Attempt and Controller Metrics

#### Story Intent

- **Beneficiary:** Users and #34 analysis consumers.
- **Capability:** Observe every attempt and separate controller usage.
- **Need:** Measure outside worker self-report with native provenance.
- **Value or failure prevented:** Prevent missing telemetry as zero,bogus observed identity and unrelated-chat allocation.

#### Implementation Scope

**Ownership:** Existing #109; exclude this task from new-child hydration.

**Files:** Create `src/telemetry/measurements.mjs`, `src/telemetry/receipts.mjs`, `src/telemetry/provider-mapping.mjs`, `src/telemetry/controller-binding.mjs`, `src/telemetry/privacy.mjs`, `schemas/measurement-v1.json`, `schemas/attempt-metrics-v1.json`, `schemas/aggregate-coverage-v1.json`, `test/unit/telemetry-measurements.test.mjs`, `test/integration/attempt-metrics.test.mjs`, `test/fixtures/telemetry-native.json`. Modify `src/providers/claude-stream.mjs`, `src/providers/codex-session.mjs`, `src/broker/role-wrapper.mjs`, `src/protocol/dispatch.mjs`, `src/api/registry.mjs`.

**Interfaces:**

- **Consumes:** Task8 operation IDs, Task11 admitted dispatch/round owner, Task9 verified observed identity and trusted worker wrapper; Task12 #30 receipt references.
- **Produces:** `allocateAttempt({operation,stageAttempt,round,role,owner}):AttemptId` durable before invocation; `mapProviderTelemetry({source,version,event,attempt}):Measurement[]`; `sealMetricsReceipt({attempt,observations,responseCreated}):Promise<Receipt>`; `sealControllerReceipt({controllerBinding,eventId,runId,observations}):Promise<ControllerReceipt>`; `observeController({binding,eventId,runAttribution}):ControllerObservation`. Measurement id/scope/epoch/delta-or-cumulative/value/unit/provenance/unavailable reason explicit. #30 packages receipt refs; #34 owns analysis vocabulary.

- [ ] Write red success/failure/timeout/interruption/no-response/crash,cache/reasoning/tool/auxiliary/unknown/malformed/conflicting native counters and controller dedup/unrelated chat tests.
- [ ] Pin unknown controller measure:

```js
const receipt = await sealControllerReceipt({
  controllerBinding,
  eventId: 'host-event-1',
  runId,
  observations: [
    {
      id: 'obs-controller-1',
      scope: 'controller-run',
      value: null,
      unit: 'tokens',
      provenance: 'unavailable',
      reason: 'not-exposed',
      source: 'host-transport',
    },
  ],
});
assert.equal(receipt.observations[0].value, null);
assert.equal(receipt.accountingKind, 'controller');
assert.equal(Object.hasOwn(receipt, 'attempt_id'), false);
```

A controller receipt uses its separate verified host binding and event ID, never an allocated worker attempt. The test supplies a valid `controllerBinding` fixture plus `runId` from `runFixture`.

- [ ] Run below red.
- [ ] Capture at trusted launch/session/exit boundaries requested vs observed provider/model/effort/tier/aux models,UTC/monotonic wall/native API/total/queue duration,tokens/cache/reasoning/tool/web counts,cost/currency/basis/pricing,stop/terminal/retry/fallback/response-created. Native counters retained when inconsistent; no inferred ordinary input/reasoning/billed charges. Estimates need dated source/category/model/tier/assumptions; unknown prices unavailable.
- [ ] Every invocation has receipt; pre-admission null round owner stage/run,continuous session lowest known scope with dispatch links,no guessed allocation. Crash pending not zero; reconcile terminal observations once without relaunch; grace expires unavailable. Required receipt failure blocks evidence; malformed telemetry quarantined bounded,valid payload authority preserved.
- [ ] Controller opaque ID outside roster/grants. Host advertises observable/partial/not-observable per-measure source/version/limits before reservation; verified host-binding assurance/identity independent from worker separation proof. CLI-only null/not-exposed/host-transport,caller labels never observed identity; preserve earlier verified host facts on replay,later binding recorded/amended. Unrelated/mixed session total ambiguous-scope.
- [ ] Allowlist counters/units/enums/sanitized labels/opaque IDs. Exclude prompts/reasoning/tool args/results/URLs/credentials/raw handles/environment and hashes of secrets. Seal available normalized observations before raw logs deletion; ignored diagnostic logs access restricted/finite.
- [ ] Run green and commit under #109.

- [ ] Add the following implementation invariant at this task's owning seam, then complete every enumerated boundary fixture:

```js
const attemptId = allocateAttempt({ operation, stageAttempt, round, role, owner });
const measurements = mapProviderTelemetry({ source, version, event, attempt: attemptId });
await sealMetricsReceipt({ attempt: attemptId, observations: measurements, responseCreated });
// Controller events call sealControllerReceipt, never allocateAttempt.
```

**Verification Commands:**

```sh
node --test test/unit/telemetry-measurements.test.mjs test/integration/attempt-metrics.test.mjs
```

#### Acceptance Criteria

Every success/failure invocation and observable controller event produces honest sanitized receipt; no participant asserts supervisor metrics or missing coverage becomes zero.

### Task 14: Existing #109 Aggregates, Chains and Amendments

#### Story Intent

- **Beneficiary:** #34 consumers and current-status readers.
- **Capability:** Query disjoint coverage-aware aggregates and immutable corrections.
- **Need:** Count once with reproducible as-of inputs.
- **Value or failure prevented:** Prevent parent/child/cumulative overlap,self-referential digests and late verdict mutation.

#### Implementation Scope

**Ownership:** Existing #109; exclude this task from new-child hydration.

**Files:** Create `src/telemetry/aggregate.mjs`, `src/telemetry/chain.mjs`, `src/telemetry/amendments.mjs`, `schemas/telemetry-amendment-v1.json`, `test/unit/telemetry-accounting.test.mjs`, `test/integration/telemetry-amendments.test.mjs`. Modify #30-owned `src/evidence/series.mjs`, `src/evidence/export.mjs` by agreed integration,`src/protocol/evidence-port.mjs`,`src/api/registry.mjs`.

**Interfaces:**

- **Consumes:** Task13 idempotent observations/receipts, Task12 #30 immutable run/index/export, Task5 #34-neutral schema adoption.
- **Produces:** `aggregateMetrics({observations,attempts,controller,partition}):AggregateViews`; `materializeChainView({tip,predecessors,indexRevision,amendments,asOf}):ChainView`; `publishAmendment({baseManifestDigest,corrections,priorAmendments,operationId}):Promise<AmendmentReceipt>`. Included/excluded IDs,basis/units/currency/known subtotal/missing scopes/complete total separate.

- [ ] Write red inclusive parent/exclusive child,reasoning/output/cache overlap,aux models,cumulative reset/missing baseline,replay/supersession,partial/mixed coverage,continuous session,concurrent durations,currency/subscription/billing/privacy/chain cycles fixtures.
- [ ] Pin missing amendment import:

```js
const before = f.baseManifestDigest();
await f.publishAmendment(correction);
const clone = await f.cloneExport({ omitReferencedAmendments: true });
const current = await clone.currentMetrics();
assert.equal(current.coverage.verifiable, false);
assert.equal(current.completeTotal, null);
assert.equal(clone.verdict(), 'accepted');
assert.equal(f.baseManifestDigest(), before);
```

Task14 extends evidenceFixture with immutable publication/export/metrics methods and correction superseding a versioned observation.

- [ ] Run below red.
- [ ] Implement observation identity/source epoch/semantics; cumulative difference requires observed baseline in same scope/epoch. Preserve conflicting reports/explicit deterministic basis. Disjoint metric partition uses inclusive parent OR exclusive children,not both. Complete null unless full compatible coverage; mixed provenance remains visible.
- [ ] Persist round/agent/stage/run/chain views over same observations. Failed critiques own distinct rounds,revision retries same round,prelaunch/unallocated session lowest stage/run scope. Agent keyed stable participant ID with solo→author role history,no duplicate role usage. Separate controller/worker totals and combined null unless both complete.21400+16800=38200 known worker subtotal from disjoint IDs; controller unknown,complete combined null.
- [ ] Wall run boundary distinct from summed resource durations; never add API/queue/wall unless disjoint defined. Currencies partitioned; conversion derived with rate/source/time. Reported dollar equivalent not marginal bill; subscriptions separate utilization ledger; zero requires affirmative evidence.
- [ ] Chain pins terminal tip/predecessor manifests/metrics/ordered amendments/index-as-of, rejects duplicate/cyclic/unverifiable input,count each run partition once not rollups. Embedded current-run/amendment uses local observation refs,no own metrics/enclosing manifest self-digest; post-seal derived view can pin all inputs. Legacy gaps incomplete.
- [ ] Publish immutable amendments/R/A manifest/receipts/metrics referencing original digest/prior amendment/supersession,then ordered index reference under series lock; crash between steps pending operation replay publishes once. Missing referenced tree/corruption yields current incomplete/unverifiable,not superseded base-as-current; original verdict/as-of views unchanged. #34 scoring/outcome refs remain separate; run green/commit #109.

- [ ] Add the following implementation invariant at this task's owning seam, then complete every enumerated boundary fixture:

```js
const views = aggregateMetrics({ observations, attempts, controller, partition });
assert.equal(
  views.combined.completeTotal,
  views.combined.coverage.complete ? views.combined.knownSubtotal : null
);
await publishAmendment({ baseManifestDigest, corrections, priorAmendments, operationId });
```

**Verification Commands:**

```sh
node --test test/unit/telemetry-accounting.test.mjs test/integration/telemetry-amendments.test.mjs test/integration/attempt-metrics.test.mjs
```

#### Acceptance Criteria

No duplicate observation accounting; missing controller/amendment/native semantics stays explicit; immutable verdict/base evidence and complete verified as-of views coexist.

### Task 15: Out-of-Band Monitoring and Observer Admission

#### Story Intent

- **Beneficiary:** Originating user/reconnecting controller.
- **Capability:** Visible progress without polling inference turns.
- **Need:** Distinguish silence,stale observer,death and lost surface.
- **Value or failure prevented:** Prevent invisible unauthorized work and misleading zero-token guarantees.

#### Implementation Scope

**Files:** Create `src/monitor/status.mjs`, `src/monitor/observer.mjs`, `src/monitor/liveness.mjs`, `src/monitor/render.mjs`, `src/host/wait-capability.mjs`, `test/helpers/host-monitor-fixture.mjs`, `test/unit/liveness-clock.test.mjs`, `test/integration/monitor-admission.test.mjs`, `test/integration/zero-turn-wait.test.mjs`, `src/cli/watch.mjs`, `src/broker/lifecycle.mjs`, `test/integration/cli-watch.test.mjs`, `test/integration/broker-lifecycle.test.mjs`, `test/integration/wrapper-loss.test.mjs`, `test/integration/broker-loss.test.mjs`. Modify `src/mcp/wait.mjs`, `src/transport/live-wait.mjs`, `src/protocol/run-reducer.mjs`, `src/api/registry.mjs`, `src/cli/parse.mjs`, `src/cli/run.mjs`, `src/broker/service.mjs`, `src/broker/role-wrapper.mjs`.

**Interfaces:**

- **Consumes:** Task8 run/admission journal, Task11 dispatch state, Task14 accounting/as-of view and independently verified host surface/wait observations.
- **Produces:** `observeRun({run,cursor,grant,host}):AsyncIterable<RedactedEvent>`; `verifyVisibleObserver(host):MonitorReceipt`; `setObserverHold({run,expectedRevision,receipt}):Promise<HoldReceipt>`; `tickLiveness({clock,observations,policy}):LivenessActions`; `renderMonitor(statusFixture):string`; `watchRun({run,cursor,readGrant,sink,signal}):Promise<MonitorReceipt>` streams redacted read-only progress to CLI using registered wait/status operations, not a tenth logical API operation; `ensureBroker({worktree,protection,owner,clock}):Promise<BrokerHandle>` and `tickBrokerIdle({activity,obligations,clock}):IdleDecision`; `reconcileWrapperLoss({binding,containment,run}):Promise<TerminationResult>`; `observeBrokerLease({binding,clock,policy,observations}):BrokerLossDecision` and `reconcileBrokerLoss({binding,successor,containment,clock}):Promise<BrokerLossReceipt>`. Clock now/setTimeout/clearTimeout/epoch monotonic; UTC audit separate.

- [ ] Write red exact fake-time warning60000,reconcile120000,stale after two missed15000 intervals,active-operation timeout1800000 tests; restart clock epoch reconciles deadlines without renewed budget. Quiet proved-live stays running; scheduler lateness diagnostic.
- [ ] Pin observer-only hold:

```js
await f.loseLastVisibleSurface();
assert.equal(f.state().status, 'running');
assert.equal(f.state().fencing.active, false);
assert.deepEqual(f.state().dispatch_admission, {
  held: true,
  reason_code: 'awaiting-visible-observer',
  required_action: 'reattach-visible-observer',
});
await f.finishAlreadyAdmittedWork();
assert.equal(f.newDispatchCount(), 0);
await f.transportReconnect();
assert.equal(f.state().dispatch_admission.held, true);
```

hostMonitorFixture wraps runFixture with verified/detached/transport-only events and wait-renewal/model-wakeup counters.

- [ ] Add actual CLI watch integration: launch process, receive stage/round/usage progress at durable cursor, disconnect/reconnect without new run/worker/model wake, reject monitor mutation/private data and preserve stale last-known state. A hosted verified visible surface adapter and CLI watch consume the same read-only event projection; neither is inferred from polling.
- [ ] Add lifecycle/wrapper-loss red tests: no broker before first mutating start, one on-demand broker under Task2 arbitration, no idle exit while any active/recoverable/fenced work or pending cleanup exists, idle shutdown after configured60000ms, configured override exact boundary, and two simultaneous starts. Status/preview remain broker-free when absent. Kill wrapper while descendant writes: revoke tool/session binding, fence dispatch, issue cancellation to sealed exact containment tree, and retain artifact lease until Task3 proves every writer dead and Task17 resolves effects; direct-child death alone cannot release it.
- [ ] Add the other-direction broker-loss red tests: kill broker while wrapper/provider/descendant survive, keep wrapper-private capability/lease receipt and fence new dispatch; do not immediately kill an admitted worker. Use a bounded reconnect window from last authenticated lease heartbeat, lasting the sealed monitoring.reconcile_after_ms (default120000ms) on injected monotonic clock; Task6 registry help/config examples document its dual meaning as liveness reconciliation threshold and wrapper broker-loss window, and Task5 reviews whether to retain or explicitly version/split it; no new config key or connection retry can extend it. Within window, authenticate successor as the same physical worktree's verified Task2 owner and revalidate exact run revision/session/tool binding with fresh grant under recovery authority: reconnect without provider kill/new attempt. Unknown/mismatched successor remains untrusted. Permanent loss means that exact lease deadline expires with no verified successor; then cancel only the exact owned containment tree and durably record broker-loss/cancellation/descendant obligations through wrapper-owned protected capability. Unproved descendant exit keeps the fence/lease even after direct-child death. Test successor just before deadline, expiry boundary, forged successor, hung transport, changed clock epoch, restart before reconciliation and kill/receipt crash. Task17 integrated recovery clears only positively discharged obligations; it does not relabel stale heartbeat as death.
- [ ] Run below red.
- [ ] Implement watch rendering/durable cursor, on-demand startup and configured idle lifecycle in the named production files. Broker exit persists obligations and retains ownership until cleanup is proved; wrapper supervision observes its lease/IPC/process independently from provider output. Wrapper loss always initiates owned-tree cancellation and evidence-backed reconciliation; unproved containment remains fenced.
- [ ] Journal observer hold/clearance with revision/cursor; loss holds only NEW critique/revision admission,already admitted work may finish/seal,status starting/running absent other condition,no integrity fence solely for surface loss. Verified authorized visible reattach clears only hold; polling/reconnect not proof; terminal closes hold,no dispatch; unattended sealed run no hold.
- [ ] Expose spec liveness fields broker heartbeat/health,last protocol/observation/stale; participant placement/phase/role_state/process health/provider output age/null reasons; fences with obligations/recovery; all exact status tuples for disconnect/quiet/death/restart/second-launch fail. Unreachable observer keeps last-known values with stale marker.
- [ ] single-wakeup requires visible progress/durable cursor/run-lifetime wait OR renewal across every ceiling/operation/stage entirely outside inference. Fault-free SAR/SPR/XPR exactly one post-receipt terminal wake. W60000/D150000 deterministic host has two reentries plus terminal; equal boundary terminal wins. Unknown-duration count null; unknown capability count null/unknown-capability even given duration; unknown ceiling/reattach null/not-observable,no fabricated cadence. Unknown wait with verified surface/unattended=false admitted.
- [ ] Display controller/solo or controller/author/reviewer separately,elapsed/phase/stage/round/cap,quiet/health/provider/protocol/stale; structured registry fixture generates21400/16800/38200 known subtotal with controller identity/usage unknown/combined null. Monitor/status/export use same metrics/amendment revision,no independent envelope sum.
- [ ] Disconnect detaches not cancels; repeated cursor no extra wake; unexpected periodic reentry invalidates advertised single-wakeup conformance. Record actual host reentries/controller overhead separately. Run green/commit.

- [ ] Add the following implementation invariant at this task's owning seam, then complete every enumerated boundary fixture:

```js
const actions = tickLiveness({ clock, observations, policy });
const surface = verifyVisibleObserver(host);
await setObserverHold({ run, expectedRevision, receipt: surface });
// Hold is journaled; status polling alone never clears it.
```

**Verification Commands:**

```sh
node --test test/unit/liveness-clock.test.mjs test/integration/monitor-admission.test.mjs test/integration/zero-turn-wait.test.mjs test/integration/cli-watch.test.mjs test/integration/broker-lifecycle.test.mjs test/integration/wrapper-loss.test.mjs test/integration/broker-loss.test.mjs
```

#### Acceptance Criteria

Actual CLI/verified hosted progress, durable cursor and exact tuple/timing truth persist through detach/reattach without model polling. On-demand broker and60000ms idle exit are tested; wrapper loss and permanent broker lease loss cancel only the owned tree and retain unproved fences; verified in-window broker successor reconnects without killing the provider. Host-specific guarantees require installed evidence.

### Task 16: Identical CLI/MCP and Small Installed Skill

#### Story Intent

- **Beneficiary:** Agents choosing preferred MCP or CLI fallback.
- **Capability:** Use all logical operations through identical closed objects.
- **Need:** Recover transport failures without bypassing protocol.
- **Value or failure prevented:** Prevent divergent flags,exposed grants and large payload context injection.

#### Implementation Scope

**Files:** Create `src/api/service.mjs`, `src/cli/json-input.mjs`, `test/integration/api-transport-parity.test.mjs`, `test/mcp/run-tools.test.mjs`, `docs/cli.md` if absent. Modify `src/mcp/server.mjs`, `src/cli/parse.mjs`, `src/cli/run.mjs`, `src/cli/help-topics.mjs`, `src/public-api.mjs`, `bin/peer-review.mjs`, `bin/peer-review-mcp.mjs`, `skills/peer-review/SKILL.md`, `README.md`.

**Interfaces:**

- **Consumes:** Task6 operation registry, Task8 start/preview, Task10 submissions, Task15 wait/status, Task17 intervention/cleanup/series reconcile. Unimplemented operations remain unavailable until their owning task passes.
- **Produces:** `dispatchApiOperation({name,request,transportBinding}):Promise<ResponseEnvelope>`; `parseJsonInput({inline,requestFile,cwd}):ParsedInput`; `createReviewMcpServer({registry,dispatch,hostAdapter}):McpServer`. Nine tools: start_review,preview_review,wait_for_review,get_review_status,intervene_review,submit_review_turn,get_peer_review_help,cleanup_brokers,reconcile_review_series; each takes one versioned object identical to CLI form.

- [ ] Write red inline/file/MCP parity for every operation,exact cross-transport lost-response replay,closed outputs/next actions and read-only no-broker behavior.
- [ ] Pin fallback replay:

```js
await f.mcpStart(request, { loseReceipt: true });
const cli = await f.cli(['start', '--request', f.savedRequestPath]);
assert.equal(cli.run_id, f.onlyRunId());
assert.equal(f.providerLaunchCount(), f.expectedRosterSize());
```

Fixture runs actual public CLI process/MCP client with verified monitor and saved identical raw request.

- [ ] Run below red.
- [ ] Generate tool schemas/descriptions/help from registry; async dispatch and durable waits use broker,not MCP lifetime owner. Stable bounded envelope includes schema/ok/mutation_occurred/retry_safe/next_action,run/status/revision/cursor/evidence and capability/usage dimensions; no raw handles/credentials/large content.
- [ ] Status/wait/help/intervene/submit/cleanup/reconcile CLI normalizes identical objects. Filepaths resolve invoking physical worktree independent of request file location. Read/monitor capabilities only authorized redacted data; credentials in transport binding never JSON.
- [ ] MCP unavailable/unconfigured/stale/disconnected/sandbox-blocked may fall back CLI; broker failure cannot bypass identity/phase/grant/fence/integrity or make controller author.
- [ ] Installed skill: recognize intent,query help when uncertain,construct request,prefer MCP/fallback CLI,obey structured next actions. No policy catalog duplication; model examples are pinned offline fixtures,real installed admission separate. Keep explicit legacy facade until Task18 gate. Run green existing MCP/smoke/golden and commit.

- [ ] Add the following implementation invariant at this task's owning seam, then complete every enumerated boundary fixture:

```js
const parsed = parseJsonInput({ inline, requestFile, cwd });
const response = await dispatchApiOperation({ name, request: parsed.value, transportBinding });
return response; // same envelope returned to CLI and MCP; binding is never serialized
```

**Verification Commands:**

```sh
node --test test/integration/api-transport-parity.test.mjs test/mcp/run-tools.test.mjs
npm run test:mcp
npm run test:smoke
npm run test:golden
```

#### Acceptance Criteria

Cross-transport exact replay launches no duplicate; all nine operations are self-discoverable and equally governed; source authentication stays outside model-visible objects.

### Task 17: Replay-Safe Recovery and Project Cleanup

#### Story Intent

- **Beneficiary:** Operators resolving interrupted work/idle brokers.
- **Capability:** Discharge only proved obligations through authenticated operations.
- **Need:** Preserve failed verdicts,partial bytes and artifact ownership.
- **Value or failure prevented:** Prevent stale-PID kills,unsafe lease release and unsupported cancellation claims.

#### Implementation Scope

**Files:** Create `src/protocol/intervention.mjs`, `src/protocol/recovery-obligations.mjs`, `src/startup/series-reconcile.mjs`, `src/broker/project-index.mjs`, `src/broker/cleanup.mjs`, `test/integration/run-recovery.test.mjs`, `test/integration/series-reconcile.test.mjs`, `test/integration/project-cleanup.test.mjs`. Modify `src/broker/registry.mjs`, `src/broker/service.mjs`, `src/broker/ownership.mjs`, `src/protocol/store.mjs`, `src/authority/verify.mjs`, `src/api/service.mjs`; preserve #117/#126 regression behavior.

**Interfaces:**

- **Consumes:** Task3 exact host/descendant termination receipts, Task8 locked run/lease/action authority, Task10/12 seals/patches, Task15 observer dimensions.
- **Produces:** `interveneRun({run,action,controllerGrant,authorizationReceipt}):Promise<ActionReceipt>`; `reconcileObligations({operation,evidenceRefs}):ObligationDelta`; `reconcileSeries(request):Promise<SeriesReceipt>`; `cleanupBrokers(request):Promise<CleanupEnvelope>`. Closed actions cancel,resume,replace-participant,extend-cap,reconcile-operation,resolve-checkpoint,acknowledge-unresolved; action_id/expected_revision/validated parameters and verified user authority/reason where required.

- [ ] Write red every action/replay/stale revision/authorization/unknown effects/checkpoint/series repair/cleanup case; fault each persisted discharge and never clear unknown obligations.
- [ ] Pin failed recovery:

```js
await f.acknowledgeUnresolved({ reason: 'termination unproved' });
assert.equal(f.state().status, 'failed');
assert.equal(f.leaseHeld(), true);
await f.reconcileWithVerifiedHostRestart();
assert.equal(f.state().status, 'failed');
assert.equal(f.pendingFilesystemCheckpoint(), true);
assert.equal(f.leaseHeld(), true);
```

Task17 adds recovery methods whose evidence originates Task3 verified receipt,not operator assertion.

- [ ] Run below red.
- [ ] Cancel fences new work,reconciles/stops owned descendants/effects,reports cancelled only after confirmation. Resume exact session/binding/fresh grant; unverified worker awaiting-participant. Replacement/extend-cap requires explicit authorization unless sealed fallback positive classification; no action converts unresolved findings to acceptance.
- [ ] Checkpoint action requires ID/expected_current_digest/quiescence/retain-partial OR restore-sealed target; seal both versions,authorized supervisor recovery patch/disposition,fresh critique. Unknown writers block even operator-authorized write. Acknowledge may set failed/termination-unproved but retains all fences/lease/cleanup; later reconcile discharges obligations without verdict change.
- [ ] Same-host verified boot change discharges ONLY sealed local confined writer obligations; remote/migrated/unknown epoch remain. Revoke bindings before replacement; reboot never resumes session. FUR effects separately compared/preserved/checkpoint-resolved before lease release; absent old handle not required when positive reboot proof.
- [ ] Pre-start series recovery has no run ID; action ID/filepath/expected pointer digest-or-absent/index revision/user authorization/reason,repair-pointer/repoint/new-lineage. Artifact/series locks,no live/fenced owner,preserve old pointer/index receipts,bounded reversible initialization/sidecar change; stale/unverified target rejects,no history rewrite/fabricated evidence.
- [ ] Git common directory index `G/ai-peer-review/brokers/FINGERPRINT.json` advisory only,no credentials. Exclusive temporary create/flush/rename per-entry owner lock,revision check,no second lock while acquiring; invalid/stale entries quarantined with exact bytes/receipt. Enumerate linked roots including provider directories; independent clones separate.
- [ ] Dry-run read-only; apply action_id replay safe and authenticated current instance/activity/fences recheck under ownership lock. Target physical/private protection verified before trusted credential read; credential/digest never output. Refuse active/recoverable/failed-fenced; removed/unreadable root without verified endpoint unreconciled,no forced PID stop. Stale lock/index never death authority.
- [ ] Run green recovery/manual regressions and commit.

- [ ] Add the following implementation invariant at this task's owning seam, then complete every enumerated boundary fixture:

```js
const delta = reconcileObligations({ operation, evidenceRefs });
if (delta.outstandingObligations.length > 0) {
  return { status: 'failed', leaseHeld: true, fencing: delta.outstandingObligations };
}
// Artifact checkpoint/effect obligations are reconciled separately before release.
```

**Verification Commands:**

```sh
node --test test/integration/run-recovery.test.mjs test/integration/series-reconcile.test.mjs test/integration/project-cleanup.test.mjs test/integration/recovery.test.mjs test/integration/manual-xpr-startup.test.mjs
```

#### Acceptance Criteria

Every action/replay preserves exact authority; only proved termination AND reconciled filesystem effects release lease; failed verdict unchanged; cleanup never trusts stale PID/age.

### Task 18: Installed Release Conformance and Migration

#### Story Intent

- **Beneficiary:** Users upgrading installed AIPR.
- **Capability:** Use each advertised journey with portable enforceable recovery.
- **Need:** Prove real provider/OS integration before retirement.
- **Value or failure prevented:** Prevent mocks as feasibility evidence and unsafe legacy journal replay.

#### Implementation Scope

**Files:** Create `schemas/runtime-activation-addendum-v1.json`, `evidence/portable-runtime/contracts/activation/<release_tag>/<package_digest>.json`, `test/live/installed-runtime-conformance.mjs`, `test/integration/runtime-migration.test.mjs`, `test/integration/full-runtime-sequence.test.mjs`, `test/fixtures/release-gates.json`, `schemas/installed-conformance-evidence-v1.json`, `schemas/release-evidence-manifest-v1.json`, `test/fixtures/release-capability-matrix.json`, `test/unit/portable-release-evidence.test.mjs`, `scripts/verify-portable-release.mjs`, `.github/workflows/portable-runtime-producer.yml`, `.github/workflows/portable-release-evidence.yml`, `test/unit/portable-release-workflow.test.mjs`, `evidence/portable-runtime/registration-index.json`, `evidence/portable-runtime/registrations/<run_id>.json`, `evidence/portable-runtime/manual-host/<capture_id>/bundle.json` and its referenced public evidence payloads, `docs/releases/agent-first-portable-runtime.md`, `docs/provider-capabilities.md` if absent. Modify `.github/workflows/ci.yml`, `.github/workflows/release.yml`, `test/packaging/package.test.mjs`, `src/doctor.mjs`, `README.md`, `skills/peer-review/SKILL.md`, `scripts/conformance-driver.mjs`.

**Interfaces:**

- **Consumes:** All prior completed task APIs/fixtures, #30/#34/#102/#109 actual bounded contracts, independently approved immutable contract/activation pair, #102/#130 accepted registration-receipt schema/transport/read-back, actual installed provider/OS capability reports and exact packed package digest.
- **Produces:** `ingestManualEvidence({source,anchors,outputRoot}):IngestionReceipt`; `assembleReleaseEvidence({hostBundles,expectedMatrix,anchors}):ReleaseEvidenceManifest`; `verifyPortableRelease({manifest,expectedMatrix,anchors,contractRecord,activationAddendum,approvedReference,gates}):ReleaseReport`; conformance pins OS/Node/package/adapter/provider CLI/model/effort/role/topology/protection/identity/tool/containment/telemetry/recovery/evidence versions and unavailable reasons.

- [ ] Write red all15-gates/adoption/capability completeness tests plus absent/swapped/tampered/foreign-OS/Node/package/run evidence, invalid signatures and mocked-only positive claims; missing/blocked installed evidence cannot render passed. Versioned closed evidence records exact tarball SHA256, OS/build/architecture, Node path/version, provider/adapter source/version, capture timestamps, run ID/nonce, identity/protection/epoch assurance and unavailable reasons. Task3 creates host-epoch/run-binding schemas and live capture; Task18 creates installed-conformance schema/harness and validates all three contracts; coordinate shared references with #30, no competing review records. Node crypto signs evidence with a per-run key whose public-key fingerprint and package/OS/Node binding are registered before capture in the supplied run-binding receipt. Verify signature, exact context and every evidence reference, not merely existence or operator status. This establishes harness consistency under same-user trust, not an independent external attestation. Extend Task3 driver with pack-release/release-inputs/capture-installed/export-host/assemble modes and closed workflow/run binding schemas: every host bundle binds its exact package/run/OS/build/Node/provider/role/topology dimensions, protected key_id/public fingerprint and signed evidence digests. Expected release-capability-matrix explicitly inventories nine OS/Node jobs plus every advertised provider/model/effort/role/topology combination, without becoming a selector allowlist. Release manifest references every required per-host bundle and its immutable digest plus one expected release tarball digest anchored by the upstream pack job; no single platform report can satisfy another row. In matrix CI, pack once upstream and supply that tarball to pack-bind via --package; driver validates and binds it rather than repacking. Standalone default pack-bind packs once locally; exact digest must match upstream artifact for release aggregation. Test missing/duplicate/swapped OS/Node/architecture/provider rows, wrong package, cross-platform substitution, untrusted fingerprint, incomplete live source and replayed evidence. CI downloads all required actual host artifact bundles before assemble; missing platform/provider prerequisite stays blocked, never omitted/skipped-as-passed. export-host locally verifies signatures/protection/binding and publishes finalized signed bundle before close-binding destroys key with durable receipt; aggregate uses public keys/digests only.

- [ ] Separate evidence producers in release-capability-matrix; every row declares producer_class=ci|manual-host, required_evidence_kinds drawn from installed/epoch/provider/process-source, exact coverage dimensions and referenced registration anchor. CI's nine Ubuntu/macOS/Windows × Node24/26/current rows require installed binary-free/protection/ownership/lifecycle checks and offline fixtures, not real reboot or authenticated provider evidence. Task2's distributed source class and historical captures are a distinct process-source kind, imported after exact current adapter-contract and declared class-scope validation. Absence coverage is produced without clock changes; creation coverage needs actual authorized clock/timezone/DST controls. Manual-host epoch rows require actual authorized reboot/clock/sleep/Fast Startup epoch per advertised OS/build/architecture/source-version/confined-topology; separate process-source rows reuse Task2's executable registered manual procedure and signed receipts for actual PID absence and unchanged-process clock/timezone/DST checks, with approved class coverage keyed to exact adapter/source contract and finite OS/probe/Node scope rather than current whole-tarball digest; changed source contracts require recapture/review, while unrelated package changes reuse the approved class; captured Node is recorded and any Node-independent epoch coverage must be explicitly conformed and declared, otherwise add Node-specific rows. Manual-host installed+provider rows cover every advertised OS/Node/provider/model/effort/role/topology with credentials privately provisioned. The optional existing Claude CI probe may contribute only its exact declared provider coverage; it cannot fill missing provider/epoch rows.
- [ ] Define separate anchors and commands as the single executable flow below. CI pack-bind's public registration candidate is uploaded before capture by publish-registration using actions/upload-artifact@v7 with overwrite=false. Its immutable artifact-id and artifact-digest outputs plus repository/workflow/source/run/job context are passed to Task3's ci-anchor mode; the separate local output .scratch/peer-review/ci-anchors.json is the CI register-key input. ci-anchor checks authenticated service metadata/archive digest and extracted candidate hash, not bundle-supplied trust. Its public service receipt is published alongside the finalized host bundle for the consumer to revalidate. Task3's manual-host flow explicitly reviews/commits the candidate and index before capture, outputs the pinned approved revision/index digest, and produces .scratch/peer-review/manual-anchors.json for manual register-key. The consumer's build-anchors command takes those manual registrations and Task2 source registrations at their independently approved evidence revisions, plus authenticated CI registration receipts, producing .scratch/peer-review/anchors.json. ingest-manual, assemble and verify-portable-release all use this merged output, never the manual-only committed index.
- [ ] Store registrations/index, Task2 process-source receipts, manual-host public signed bundles/payloads and authoritative adopted contract record under evidence/portable-runtime/, outside every current package.json files entry (docs/ and provenance/ are packaged and cannot hold this authority). Ordinary review excludes private keys, credentials and raw private sessions. Packaging inventory must assert no evidence/portable-runtime file is shipped, including after future files changes; red fixture adds evidence/ to files and fails. Bind installed/epoch/provider evidence to independently produced release D, and source captures to their historical tested Q plus reviewed source-contract class; neither commits its own resulting tarball/evidence digest. Test changing only excluded evidence bytes leaves the controlled package's contents/digest unchanged; the actual release tarball always comes from its pinned source commit.
- [ ] State release ordering explicitly: (0) Task2 source classes are captured on test candidate Q and accepted at review K before C freezes the shipped ledger; Q's historical digest is preserved, while source-contract hashes must match C. A changed contract requires new Q/K before source/tag freeze; (1) reviewed source commit C receives the authorized signed release tag T and upstream packs exactly once at C to tarball P/digest D; (2) registration review commit R in excluded evidence paths pins D/run/key/host scope before manual capture; (3) only after C/T/D and genuine required captures exist, Task18 assembles the release-specific activation sibling. Ordinary evidence review commit E includes finalized public bundles, the immutable contract reference and separately accepted #102/#107/#30 activation sibling keyed to its parent-contract digest and exact C/T/D; it never rewrites the contract. (4) assemble-portable-release-evidence checks out C for executable code, retrieves immutable original P/D, and obtains only public excluded evidence at approved E plus registration references at R. The governed review step outputs .scratch/peer-review/evidence-approved-ref.json with exact E/index/contract/addendum/review/proof-receipt refs and accepted E/R provenance, never a caller-only pass assertion. It builds anchors and generates the aggregate report for D; (5) release.yml consumes that authenticated workflow report/manifest, approved E and the same P/D before all publication/artifact-verification/release steps. An early tag-triggered run with no complete evidence remains blocked and can be rerun through the ordinary authorized release dispatch at T after E; it must not repack at E or move T to the evidence commit. No source or evidence digest includes its own signature/digest field. Registration/evidence revisions are independent authorities within repository trust; none asserts external identity.
- [ ] Name the consumer: portable-release-evidence.yml job assemble-portable-release-evidence downloads all nine installed CI bundles and their public service registration receipts, authenticates the approved producer workflow/source/run context and immutable artifact metadata, checks out approved manual evidence/registration/adoption revisions, then executes build-anchors, ingest-manual, assemble and verify-portable-release in that order, passing the exact immutable contract/addendum pair from authenticated approved-ref. Parent-contract digest and addendum C/T/D must match P under verification; adoption-only report/contract alone refuses. ingest-manual validates schema/package/scope/payload hashes/signatures/pre-capture registration against merged anchors before copying public bytes into output-root; conflicting capture IDs/digests refuse. Task2 approved source classes and historical capture receipts are verified through their independently reviewed registration/class approvals; verify-class matches the current installed adapter/source-contract digest and finite platform scope, then copies exact class/capture public bytes into evidence-matrix/process-source. Capture tarball digests remain historical provenance, while current installed/epoch/provider bundles still bind D. build-anchors merges source registration/class anchors as distinct kinds; assemble/verify revalidate class scope/code/approval and referenced capture signatures, never require a new per-host/per-package class receipt or trust a verifier status alone. The job publishes one exact C/T/D/E-bound manifest/report used by release.yml; absence of manual source/epoch/provider inputs is blocked. Task4 adoption gate remains mandatory before publication; Task18 additionally requires all15 gates and the exact capability matrix for D.

- [ ] Make workflow connections executable. Create portable-runtime-producer.yml triggered by signed v\* tag push or workflow_dispatch(tag); pack-release at the resolved immutable C/T uses Node24/npm12.0.2, preserves existing signed-tag/source verification, packs exactly once and emits P at release-candidate.tgz plus upstream-pack-receipt.json with C/T/D, tool versions and authenticated producer run/workflow/job identity. Upload these as portable-package-run_id. Its installed matrix depends on pack and downloads this exact artifact; Ubuntu/macOS/Windows × Node24/26/current are nine jobs, with actual current Node recorded. They run the CI producer sequence below on P without repacking. Branch/PR CI retains existing suites and Task4 native-free fixtures; it is not the release tag producer. Every artifact-service reader grants actions: read; missing permissions or missing producer artifacts block.
- [ ] Give portable-release-evidence.yml workflow_dispatch inputs tag, evidence_ref (immutable approved E) and producer_run_id. Its assemble-portable-release-evidence job grants contents: read/actions: read, resolves T to C, downloads P/pack receipt and all nine host/registration artifacts from that exact producer run using authenticated same-repository cross-run artifact access, and verifies the run's approved workflow/source/tag/artifact IDs/digests before ordinary E/R validation and the consumer commands below. Emit the exact consumer run ID and a portable-release-report artifact containing manifest/report plus C/T/D/E, producer_run_id, consumer_run_id, registration/evidence revisions and all consumed immutable artifact IDs/digests. Never choose latest-successful by name alone.
- [ ] Extend release.yml workflow_dispatch inputs tag, evidence_ref, producer_run_id and consumer_run_id, all required for portable publication. Tag-push runs may validate/start production but must remain blocked without these approved exact-run inputs; no automatic selection of a stale report. The publish job grants actions: read in addition to existing contents: write/id-token: write and npm environment controls. Download P/pack receipt from producer_run_id and report/manifest from consumer_run_id; check authenticated same-repository workflow/run/source/tag context, complete gate result and exact C/T/D/E plus both run IDs/artifact digests. Check out C for code and only approved public E for evidence/adoption. Run check-release-activation against that same E/D and exact approved immutable contract/addendum pair before registry comparison, npm publish or GitHub release; parent-contract digest, exact addendum C/T/D and all independent owner/registration/conformance gates must pass. An adoption-only report cannot supply release identity/activation. Publish downloaded P itself: remove release.yml's independent npm pack step for portable releases, and verify its bytes still hash D immediately before every existing publication/artifact-match action. Node/npm differences in consumer/release jobs cannot substitute another tarball.
- [ ] Own pack-release, release-inputs and workflow-input validation modes in the Task18 driver/verifier with closed schemas and test/unit/portable-release-workflow.test.mjs. Red fixtures cover branch-only producer run, missing trigger/input/permissions, unresolved/changed tag, stale consumer report, wrong E, foreign repository/workflow/source/run, missing/duplicate matrix row, swapped P/artifact ID/archive-versus-payload digest, repack digest mismatch and falsely successful gate report; each refuses publication. Positive fixture uses exact producer/consumer service metadata and downloaded P. The driver modes read workflow inputs through named environment fields, preserve provenance and never create/tag/publish themselves.

- [ ] Pin release predicate:

```js
assert.equal(report.requiredGateCount, 15);
assert.equal(
  report.complete,
  report.gates.every((g) => g.status === 'passed') &&
    report.contractConflicts.length === 0 &&
    report.advertisedCapabilities.every((c) => c.installedConformance === 'passed')
);
```

- [ ] Run focused migration/sequence tests below red.
- [ ] Install actual tarball,fresh and linked worktrees; SAR,SPR,XPR,SAR→XPR no commits,exact clean pass/evidence reconstruction. Each advertised OS/provider/model/effort/role proves live installed launch/identity/private tool/scoped permissions/external telemetry/cancel/descendant/restart conformance. Missing prerequisite unavailable,never skipped-as-passed.
- [ ] Consume the actual complete bundle A owner decision plus release-specific accepted activation sibling through #102 protected selected-current registration/read-back and independently accepted #102/#130 schema/transport interfaces. Contract-only adoption does not clear gate8. No older-runtime/image fallback or policy-source override is implemented; every actual current installation and conformance obligation remains required. Preserve original legacy terminal schemas/claims; active/fenced recovery/drain uses explicitly reviewed compatible current-global maintenance with genuine registration/ownership/conformance; otherwise preserve unsupported journals and unresolved overlap obligations. v1/mixed/unknown new config rejects with prospective sources,no inferred turn cap.
- [ ] Keep #106 explicit manual startup until installed cross-family author/reviewer replacement passes on EVERY advertised platform plus reviewed legacy recovery/config migration decision. Notes identify tested replacement,invocation changes,retained recovery and explicit config migration. No controller-as-author/uncertain same-worktree ownership.
- [ ] Fault every reservation/launch/turn/seal/checkpoint/amendment/index/ownership transition and replay exact operation IDs; bad authority/payload/receipt/anchor returns bounded recovery,not seal.
- [ ] Run complete appropriate suites,production audit and release verifier,record raw results/exact tarball digest. No publish/tag/deploy from this plan absent normal release authorization. Commit source/verification/docs.

- [ ] Add the following implementation invariant at this task's owning seam, then complete every enumerated boundary fixture:

```js
const report = verifyPortableRelease({
  manifest,
  expectedMatrix,
  anchors,
  contractRecord,
  activationAddendum,
  approvedReference,
  gates,
});
assert.equal(report.requiredGateCount, 15);
assert.equal(report.contractConflicts.length, 0);
assert.equal(report.complete, true);
```

**Verification Commands:**

```sh
node --test test/unit/portable-release-evidence.test.mjs test/unit/portable-release-workflow.test.mjs test/integration/runtime-migration.test.mjs test/integration/full-runtime-sequence.test.mjs
npm test
npm run test:integration
npm run test:mcp
npm run test:packaging
npm run test:smoke
npm run format:check
npm run lint
node scripts/audit-production-closure.mjs
```

**Registered manual-host preparation:** Use the exact upstream packed tarball at .scratch/peer-review/release-candidate.tgz; standalone conformance may use a locally packed candidate but cannot fill release rows for another digest. Run pack-bind, submit/review/commit its candidate/index at R, and output/check out the approved revision/index digest in .scratch/peer-review/manual-registration-approved-ref.json before register-key. This is the explicit ordinary governance step from Task3, performed before capture.

```sh
node scripts/conformance-driver.mjs pack-bind --package .scratch/peer-review/release-candidate.tgz --bundle .scratch/peer-review/conformance/host-bundle.json
node scripts/conformance-driver.mjs pin-manual-registration --bundle .scratch/peer-review/conformance/host-bundle.json --manual-index evidence/portable-runtime/registration-index.json --approved-ref .scratch/peer-review/manual-registration-approved-ref.json --output .scratch/peer-review/manual-anchors.json
node scripts/conformance-driver.mjs register-key --bundle .scratch/peer-review/conformance/host-bundle.json --anchors .scratch/peer-review/manual-anchors.json
node scripts/conformance-driver.mjs capture-installed --bundle .scratch/peer-review/conformance/host-bundle.json
node scripts/conformance-driver.mjs capture-epoch --bundle .scratch/peer-review/conformance/host-bundle.json
```

**Workflow trigger and input sketches (implemented and tested by this task):**

Producer portable-runtime-producer.yml:

```yaml
on:
  push:
    tags: ['v*']
  workflow_dispatch:
    inputs:
      tag:
        required: true
        type: string
permissions:
  contents: read
  actions: read
jobs:
  pack:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6
        with:
          ref: ${{ inputs.tag || github.ref }}
          fetch-depth: 0
      - uses: actions/setup-node@v6
        with:
          node-version: 24
      - run: npm install --global npm@12.0.2
      - run: npm ci
      - name: Pack immutable tagged source once
        env:
          RELEASE_TAG: ${{ inputs.tag || github.ref_name }}
          GH_TOKEN: ${{ github.token }}
        run: node scripts/conformance-driver.mjs pack-release --output .scratch/peer-review/release-candidate.tgz --receipt .scratch/peer-review/upstream-pack-receipt.json
      - uses: actions/upload-artifact@v7
        with:
          name: portable-package-${{ github.run_id }}
          path: |
            .scratch/peer-review/release-candidate.tgz
            .scratch/peer-review/upstream-pack-receipt.json
          include-hidden-files: true
          if-no-files-found: error
          overwrite: false
  installed:
    needs: pack
    runs-on: ${{ matrix.os }}
    strategy:
      fail-fast: false
      matrix:
        os: [ubuntu-latest, macos-latest, windows-latest]
        node: [24, 26, node]
    steps:
      - uses: actions/checkout@v6
        with:
          ref: ${{ inputs.tag || github.ref }}
          fetch-depth: 0
      - uses: actions/setup-node@v6
        with:
          node-version: ${{ matrix.node }}
      - run: npm ci
      - uses: actions/download-artifact@v8
        with:
          name: portable-package-${{ github.run_id }}
          path: .scratch/peer-review
      # Then execute the complete CI producer steps below on this exact P.
```

Consumer portable-release-evidence.yml:

```yaml
on:
  workflow_dispatch:
    inputs:
      tag:
        required: true
        type: string
      evidence_ref:
        required: true
        type: string
      producer_run_id:
        required: true
        type: string
permissions:
  contents: read
  actions: read
jobs:
  assemble-portable-release-evidence:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6
        with:
          ref: ${{ inputs.tag }}
          fetch-depth: 0
      - uses: actions/download-artifact@v8
        with:
          name: portable-package-${{ inputs.producer_run_id }}
          path: .scratch/peer-review
          github-token: ${{ github.token }}
          repository: ${{ github.repository }}
          run-id: ${{ inputs.producer_run_id }}
      - uses: actions/setup-node@v6
        with:
          node-version: 24
      - run: npm ci
      # Download every installed-run/job artifact and registration receipt
      # from this exact producer run, preserving separate artifact identities.
      # Validate approved E/R and execute the named consumer commands below.
      - uses: actions/upload-artifact@v7
        with:
          name: portable-release-report-${{ github.run_id }}
          path: |
            .scratch/peer-review/release-report.json
            .scratch/peer-review/release-evidence-manifest.json
          include-hidden-files: true
          if-no-files-found: error
          overwrite: false
```

release.yml adds required portable dispatch inputs evidence_ref, producer_run_id and consumer_run_id alongside tag. Its existing publish job explicitly downloads the package artifact as above from producer_run_id and portable-release-report-consumer_run_id from consumer_run_id using actions/download-artifact@v8 with github-token/repository/run-id. The following executable release-side modes read RELEASE_TAG/EVIDENCE_REF/PRODUCER_RUN_ID/CONSUMER_RUN_ID from workflow input env and authenticate service metadata with GH_TOKEN; the verified E checkout step produces evidence-approved-ref.json. Tag push without these inputs fails closed. These modes run before existing publish-or-registry-compare/GitHub-release steps, which use release-candidate.tgz and D rather than a repack.

```sh
node scripts/conformance-driver.mjs release-inputs --package .scratch/peer-review/release-candidate.tgz --pack-receipt .scratch/peer-review/upstream-pack-receipt.json --report .scratch/peer-review/release-report.json --manifest .scratch/peer-review/release-evidence-manifest.json --output .scratch/peer-review/release-input-binding.json
node scripts/check-release-activation.mjs --package .scratch/peer-review/release-candidate.tgz --binding .scratch/peer-review/release-input-binding.json --record evidence/portable-runtime/contracts/runtime-contract-adoption.json --approved-ref .scratch/peer-review/evidence-approved-ref.json
```

**CI producer steps (portable installed matrix, no reboot/clock changes):** The upstream pack job supplies release-candidate.tgz and independently verified source/tag/digest inputs. The producer records the registration service receipt as .scratch/peer-review/ci-registration-receipt.json and uploads it with its finalized host bundle; archive metadata is authenticated again by the consumer. The named steps/paths run in portable-runtime-producer.yml's installed matrix, not branch-only ci.yml. All service-reading producer/consumer/release jobs explicitly grant actions: read plus the needed contents permissions.

```yaml
- name: Validate producer context
  id: validate-producer-context
  env:
    GH_TOKEN: ${{ github.token }}
  run: node scripts/conformance-driver.mjs validate-producer-context --pack-receipt .scratch/peer-review/upstream-pack-receipt.json --output .scratch/peer-review/approved-ci-context.json
- name: Bind exact upstream package
  run: node scripts/conformance-driver.mjs pack-bind --package .scratch/peer-review/release-candidate.tgz --bundle .scratch/peer-review/conformance/host-bundle.json
- name: Publish pre-capture registration
  id: publish-registration
  uses: actions/upload-artifact@v7
  with:
    name: registration-${{ github.run_id }}-${{ strategy.job-index }}
    path: .scratch/peer-review/conformance/registration-candidate.json
    if-no-files-found: error
    overwrite: false
    include-hidden-files: true
- name: Build separate CI anchor
  env:
    GH_TOKEN: ${{ github.token }}
    REGISTRATION_ARTIFACT_ID: ${{ steps.publish-registration.outputs.artifact-id }}
    REGISTRATION_ARTIFACT_DIGEST: ${{ steps.publish-registration.outputs.artifact-digest }}
  run: node scripts/conformance-driver.mjs ci-anchor --bundle .scratch/peer-review/conformance/host-bundle.json --approved-context .scratch/peer-review/approved-ci-context.json --receipt-output .scratch/peer-review/ci-registration-receipt.json --output .scratch/peer-review/ci-anchors.json
- name: Accept anchored key before capture
  run: node scripts/conformance-driver.mjs register-key --bundle .scratch/peer-review/conformance/host-bundle.json --anchors .scratch/peer-review/ci-anchors.json
- name: Capture installed CI cases
  run: node scripts/conformance-driver.mjs capture-installed --bundle .scratch/peer-review/conformance/host-bundle.json
- name: Export finalized signed host bundle
  run: node scripts/conformance-driver.mjs export-host --bundle .scratch/peer-review/conformance/host-bundle.json --output-dir .scratch/peer-review/evidence-matrix
- name: Publish bundle and separate registration receipt
  uses: actions/upload-artifact@v7
  with:
    name: installed-${{ github.run_id }}-${{ strategy.job-index }}
    path: |
      .scratch/peer-review/evidence-matrix
      .scratch/peer-review/ci-registration-receipt.json
    if-no-files-found: error
    overwrite: false
    include-hidden-files: true
- name: Close verified published binding
  run: node scripts/conformance-driver.mjs close-binding --bundle .scratch/peer-review/conformance/host-bundle.json
```

Both uploads explicitly include hidden paths because their public artifacts are staged under .scratch. The driver verifies a closed public-payload inventory before upload; any private key/locator, credential, raw session or extra unexpected file refuses publication. Upload only the enumerated candidate/evidence/receipt paths, never the private parent directory; fixture hidden-path omission and injected private collateral. The approved-ci-context.json is generated by a named validate-producer-context pre-capture step from the approved workflow commit, upstream C/T/D pack receipt and authenticated repository/run/job metadata; schema and driver unit tests reject caller-supplied or bundle-only workflow authority. ci-anchor reads artifact outputs from the named environment fields, emits public receipts without GH_TOKEN, and validates permissions/metadata; missing service access is blocked. Script argument arrays and Node npm entrypoints preserve OS portability; GitHub expressions above are workflow inputs, not local shell variables.

**Post-reboot Verification Commands (registered manual host, after authorized reboot and negative cases):**

```sh
node scripts/conformance-driver.mjs verify-epoch --bundle .scratch/peer-review/conformance/host-bundle.json
node scripts/conformance-driver.mjs export-host --bundle .scratch/peer-review/conformance/host-bundle.json --output-dir .scratch/peer-review/evidence-matrix
node scripts/conformance-driver.mjs close-binding --bundle .scratch/peer-review/conformance/host-bundle.json
```

**Evidence Consumer Verification Commands (assemble-portable-release-evidence job):**

The job obtains approved-evidence-review.json from ordinary reviewed repository evidence at pinned E, authenticated against accepted review/commit references independently of the captures, and upstream-pack-receipt.json plus ci-registration-receipts from the trusted artifact service. Its validate-consumer-inputs step authenticates producer artifacts/pack service metadata and the ordinary reviewed E/R references, emitting upstream-pack-receipt.json, approved-ci-context.json, evidence-approved-ref.json and process-source-approved-ref.json (the source-registration revision/index digest drawn from E's reviewed pre-capture R references). It downloads service receipts into ci-registration-receipts, finalized CI bundles into evidence-matrix, and checks out only the approved public evidence subtree. Tests reject missing/wrong E/R/source revisions before the following commands; these inputs cannot be fabricated by capture bundles. validate-consumer-inputs also resolves the exact immutable activation addendum selected by authenticated approved-ref, verifies original path/revision/blob/digest and materializes identical bytes at .scratch/peer-review/runtime-activation-addendum.json. It validates retained reviewed local lineage-proof receipt refs against genuine reviewed generator/source/target pins, explicitly reports unavailable original private-event replay in Git/CI and never exports journals or stronger assurance. Scratch copies have no independent authority/latest-by-name semantics; downstream consumers recheck original approved immutable refs and exact release, refusing missing/unknown/mismatched selection. Workflows invoke Node with argument arrays, never free-text code.

```sh
node scripts/conformance-driver.mjs validate-consumer-inputs --pack-receipt .scratch/peer-review/upstream-pack-receipt.json --evidence-review .scratch/peer-review/approved-evidence-review.json --ci-receipts .scratch/peer-review/ci-registration-receipts --output-dir .scratch/peer-review
node scripts/conformance-driver.mjs build-anchors --manual-index evidence/portable-runtime/registration-index.json --approved-ref .scratch/peer-review/evidence-approved-ref.json --process-source-index evidence/portable-runtime/process-source/registration-index.json --process-source-approved-ref .scratch/peer-review/process-source-approved-ref.json --ci-receipts .scratch/peer-review/ci-registration-receipts --approved-context .scratch/peer-review/approved-ci-context.json --output .scratch/peer-review/anchors.json
node test/live/process-source-conformance.mjs verify-class --package .scratch/peer-review/release-candidate.tgz --ledger src/protocol/process-source-contracts.json --class-root evidence/portable-runtime/process-source/classes --capture-root evidence/portable-runtime/process-source --registration-index evidence/portable-runtime/process-source/registration-index.json --approved-ref .scratch/peer-review/process-source-approved-ref.json --output-root .scratch/peer-review/evidence-matrix/process-source
node scripts/conformance-driver.mjs ingest-manual --source evidence/portable-runtime/manual-host --anchors .scratch/peer-review/anchors.json --output-root .scratch/peer-review/evidence-matrix
node scripts/conformance-driver.mjs assemble --root .scratch/peer-review/evidence-matrix --matrix test/fixtures/release-capability-matrix.json --anchors .scratch/peer-review/anchors.json --output .scratch/peer-review/release-evidence-manifest.json
node scripts/verify-portable-release.mjs --manifest .scratch/peer-review/release-evidence-manifest.json --matrix test/fixtures/release-capability-matrix.json --anchors .scratch/peer-review/anchors.json --contract-adoption evidence/portable-runtime/contracts/runtime-contract-adoption.json --activation-addendum .scratch/peer-review/runtime-activation-addendum.json --approved-ref .scratch/peer-review/evidence-approved-ref.json --gates test/fixtures/release-gates.json --output .scratch/peer-review/release-report.json
```

#### Acceptance Criteria

All shown conformance commands run through Node scripts on POSIX/PowerShell/cmd; workflow expressions are resolved by GitHub Actions. Task2's independent script produces reviewed source classes before Task4 fresh-install parity and is reused here. Capture host/package provenance is distinct from distributable class assurance. pack-bind produces the exact package and protected run/key binding before capture; capture/verify pass identical package/run-binding inputs from bundle. verify-epoch runs only after explicitly authorized actual reboot and negative live cases. Each host exports a uniquely named finalized bundle; the named consumer job retrieves CI artifacts, builds the independently validated anchor index from the registration service receipts plus approved committed manual registrations, and ingests manual bundles before aggregate verification. Missing platform evidence blocks the verifier. All aggregate consumers use the explicit merged anchors.json output; CI/manual register-key consume their separate validated local views. Authoritative evidence/adoption stays outside packed paths, and release consumes C's exact tarball after R/E review and the complete package-bound consumer report. close-binding removes key only after verified signed host publication, retaining public verification continuity. All15 gates/adoptions/advertised conformance require the nine fresh-install CI rows, every advertised reviewed absence/creation source class AND every declared manual-host epoch/provider row before final replacement claim; unproved Windows/descendant/boot combinations remain explicit support blockers.

#### Task 18 activation sibling production and release consumption

Task 18 creates `schemas/runtime-activation-addendum-v1.json` with identifier `ai-peer-review.runtime-activation-addendum/v1`, coordinated with #30 immutable sibling linkage and independently accepted #102/#107/#30 binding. Store the authoritative release-specific document at `evidence/portable-runtime/contracts/activation/<release_tag>/<package_digest>.json`, outside every shipped path. The schema/record bind the exact immutable parent contract digest, C/T/D, registration/conformance references, accepted owner reviews, unresolved operational obligations and assurance; no in-place contract rewrite or self-reference.

Task18 coordinates the immutable sibling with #30 and separate normal #102/#107/#30 reviews; missing detailed schema/interface/registration or conformance remains blocked. The contract is never amended in place and no reference includes its own resulting digest.

## Requirement and Release-Gate Traceability

`test/fixtures/release-gates.json` inventories all numbered gates and every concrete assertion in the spec's gate item. `verify-portable-release` refuses omissions/blocked status; these are required tests,not optional summaries.

| Gate | Required fixture classes                                                                                                                                                                                          | Owning tasks/test suites                                                  | Dependency                                                                                                                                                                                                     |
| ---- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1    | canonical bytes/equivalent numeric/string forms,UTF-16/escapes/surrogates,duplicates/unknown keys,filepath distinction,concurrent replay/crash after every launch journal                                         | 6/8/16 request-canonical/run-start/api-transport-parity                   | authenticated namespace                                                                                                                                                                                        |
| 2    | cap final clean-vs-revision,replacement shared budget/finite counterpart policy,finding grammar/IDs/history/lineage/resolution corrections,revision exhaustion/reset negatives,Markdown literal negative fixtures | 6/7/11/17 findings/replacement-budget/api-help                            | registered sole grammar; fallback-policy assertions blocked on Task5/7 adoption                                                                                                                                |
| 3    | collateral/sealed context,CRLF/dirty/new/no-newline/empty reconstruction,collision-free changes,init/sidecar/fresh-clone/cross-mode linkage,no-response paths                                                     | 10/12 submission-seals/run-evidence/portable-lineage                      | #30 adoption                                                                                                                                                                                                   |
| 4    | enforced FUR/authority/cross-role/alias/parent denial,own/shared/research allowed,exact handoff paths,scope correction unchanged grant/round                                                                      | 9/10 headless-role-tools/role-scope                                       | installed sandbox                                                                                                                                                                                              |
| 5    | same-root one broker/linked endpoints,HTTP token/Host/browser/slow/size,active/fenced/stale-PID cleanup,index atomicity/secret redaction                                                                          | 1/2/15/17 broker-http/portable-ownership/broker-lifecycle/project-cleanup | protection/ownership                                                                                                                                                                                           |
| 6    | status tuples/exact clock thresholds,whole-run single wake/W-D reentry/unknown wait,usage fixture,preflight surface reject/fresh consent ID,observer hold/verified clear                                          | 8/15/16 liveness-clock/monitor-admission/zero-turn-wait/cli-watch         | verified host capability                                                                                                                                                                                       |
| 7    | installed pure-JS closure,OS protection/role denial/descendant/real boot evidence,no required native build/download                                                                                               | 1–4/9/10/15/18 portable-installed-broker/wrapper-loss/live conformance    | feasibility gate                                                                                                                                                                                               |
| 8    | legacy original claims/recoverability/adopted routing/no overlap,new config migration/manual retention,all installed journeys/registry parity                                                                     | 5/7/8/16/18 runtime-migration                                             | exact whole-bundle native owner adoption; exact release C/T/D/registration; independently reviewed #102/#130 protected transport/read-back; genuine installed old-family exclusion/drain/migration conformance |
| 9    | headless no-commit submit/grants/replay/resume/collisions/distinctness,CLI telemetry gap distinct from fresh identity,secret-free pipes/forged traffic                                                            | 9–11/17 session-distinctness/headless-role-tools                          | exact session/private tools                                                                                                                                                                                    |
| 10   | every attempt outcome/native conflicting counters/owners,controller exclusion/dedup/CLI provenance/worker-combined coverage                                                                                       | 13/14/15 attempt-metrics/telemetry-accounting                             | existing #109;#30/#34 adoption                                                                                                                                                                                 |
| 11   | byte-offset extraction/tampered annotation,immutable amendment/replay-once                                                                                                                                        | 12/14 run-evidence/telemetry-amendments                                   | #30/#34 adoption                                                                                                                                                                                               |
| 12   | partitions/resets/baselines/session/concurrency/currency/subscription/privacy,chain cycles/self-digests/reuse/legacy gaps,missing amendment/crash publication                                                     | 13/14 telemetry-accounting/telemetry-amendments                           | #30/#34 adoption                                                                                                                                                                                               |
| 13   | every action/replay/failed obligations/checkpoint/series repair,verified same-host local reboot,broker/sleep/different host/unknown/remote negative proofs                                                        | 3/12/17 host-epoch/run-recovery/series-reconcile                          | installed positive termination                                                                                                                                                                                 |
| 14   | lock-free/session-free preflight/no cache/credentials/conformance writes,review capability rejects/telemetry admits,reservation rechecks                                                                          | 8/12/15 preview-readonly                                                  | physical/protection/portable lineage                                                                                                                                                                           |
| 15   | adopted primary/user source-ownership classification/profile-array/source pointers,bounds/defaults/model errors,SAR fallback,removed monitor key/no config consent                                                | 5/7 config-v2/roster-resolution                                           | exact ownership adoption; separately accepted #130 detailed schemas; Task7 source/defaults/profile-array conformance                                                                                           |

Section coverage: Review Model/Journeys/Sequences→8/9/11/16/18; Canonical Request/Errors/Self-Discovery→6/8/16; Resolution/Config/Fallback→7/11; Identity/Grants→9/10; Round/Findings/Visibility→10/11/12; Storage/FUR/Evidence/Series→2/8/10/12/17; Metrics/Privacy→existing #109 Tasks13/14; Permissions/Research→9/10 installed conformance; Broker/Disconnect/Recovery/Cleanup→1–4/15/17; Migration/Gaps/Ownership→5/18. Downstream #31/32/33/34 consume truth/context/outcome references,not authority or runtime-defined scoring.

## Review and Execution Handoff

Every code task uses its shown failing assertions plus enumerated adversarial fixtures,red run,minimal implementation,green run and small source commit. Formatter/lint run destination-effective; regressions require systematic debugging rather than weakening checks. Proposed function/type contracts must be reconciled with owner-adopted schemas before freeze.

Plan acceptance means actionable decomposition with honest blockers,not that product gates already passed. Freeze final formatted bytes before acceptance digest. SAR is manually orchestrated single-worker critique/revision; XPR has separate reviewer. Controller hydrates #107 only after SAR accepts its exact ancestor and the subsequent XPR accepts the exact final descendant with immutable ordered review lineage. SAR acceptance does not claim review of later XPR revisions; the final XPR digest is the hydrated authority, with the SAR ancestor and every intervening patch/snapshot preserved. Implementation requires separately governed Plan approval. Tasks1/2/4 native-free candidate/CI work does not require Task5 resolution; supported cross-family production activation, conflicting configuration/routing/migration, stale-artifact quarantine and final replacement release do.

Recommended later execution is subagent-driven development because security/provider/evidence/telemetry boundaries each merit a fresh review. Drafting this plan authorizes no implementation or issue creation.
