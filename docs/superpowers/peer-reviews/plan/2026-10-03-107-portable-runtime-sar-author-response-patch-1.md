# SAR Round 1 Actual Patch

Before: `a9756e643c4c0f2276de8f7256dec7c5a23812460ce7965ab0bc69b820c9b896`
After: `6e011dd12b644f6d4af377e92130fa51dd9a41d3c6f9e812193195f2884b9a90`

```diff
--- docs/superpowers/peer-reviews/plan/2026-10-03-107-portable-runtime-sar-initial-plan.md	2026-10-03 11:50:57
+++ docs/superpowers/peer-reviews/plan/2026-10-03-107-portable-runtime-sar-round-1-after-plan.md	2026-10-03 11:58:04
@@ -53,15 +53,15 @@
 
 This plan is complete scope decomposition, not release authorization. #102's newer accepted design at `021bed7e9cc01782f0822e99fa2d3a58aadeb16e` is `docs/superpowers/specs/2026-09-29-102-primary-runtime-authority-design.md`; accepted plan `docs/superpowers/plans/2026-10-01-102-primary-runtime-authority.md` at `8ee1cbe` on `codex/102-primary-runtime-xpr`. Controller-provided live evidence: #132–136 closed, #137 pending PR139 at `84565bc16164d562a5d742987352db7f3a4e31d1`; remaining CI is not assumed passed.
 
-| Conflict | Accepted #107 | Newer accepted #102 | Required disposition |
-| --- | --- | --- | --- |
-| Installation | Per-run retained compatible installations and old/new namespace coexistence | One current OS-account global canonical AIPR root/Node; images match current selection; no older fallback | Targeted specification review before routing/migration activation |
-| Policy | User/project `.ai-peer-review.json` layered precedence/profile merge | Activated primary `.ai-peer-review/config.json` exclusively owns project policy; user host bindings classified field by field | Targeted specification review before config integration/schema freeze |
-| Legacy recovery | Resume old active reviews under retained installation | Unsupported old formats read-only/fenced after upgrade | Explicit reviewed drain/recovery decision; no silent reinterpretation |
+| Conflict        | Accepted #107                                                               | Newer accepted #102                                                                                                           | Required disposition                                                  |
+| --------------- | --------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
+| Installation    | Per-run retained compatible installations and old/new namespace coexistence | One current OS-account global canonical AIPR root/Node; images match current selection; no older fallback                     | Targeted specification review before routing/migration activation     |
+| Policy          | User/project `.ai-peer-review.json` layered precedence/profile merge        | Activated primary `.ai-peer-review/config.json` exclusively owns project policy; user host bindings classified field by field | Targeted specification review before config integration/schema freeze |
+| Legacy recovery | Resume old active reviews under retained installation                       | Unsupported old formats read-only/fenced after upgrade                                                                        | Explicit reviewed drain/recovery decision; no silent reinterpretation |
 
 Task5 prepares that review; it chooses neither winner. Portable transport/protection/audit can proceed behind non-public boundaries. Tasks7/8/18 conflicting integration and gates8/15 remain blocked until adopted amendment and repeat plan review. Global installation selection does not create a machine-wide broker.
 
-#30 owns shared `ai-peer-review.record/v1`, `series-index/v1`, `patch-chain/v1`, `response-envelope/v1` implementation/migration; #107 consumes them. Existing #109 (Ready for Planning) owns Tasks13/14 telemetry; never create a duplicate child. #34 owns outcome labels/scoring/experiments and adopts neutral telemetry contracts. #31/#32/#33 own projection/retrieval/escape analysis, not runtime authority. #102/#132–137 own runtime resolution; do not duplicate. Preserve explicit #106 manual startup until installed replacement and reviewed migration gates permit retirement.
+Issue #30 owns shared `ai-peer-review.record/v1`, `series-index/v1`, `patch-chain/v1`, `response-envelope/v1` implementation/migration; #107 consumes them. Existing #109 (Ready for Planning) owns Tasks13/14 telemetry; never create a duplicate child. #34 owns outcome labels/scoring/experiments and adopts neutral telemetry contracts. #31/#32/#33 own projection/retrieval/escape analysis, not runtime authority. #102/#132–137 own runtime resolution; do not duplicate. Preserve explicit #106 manual startup until installed replacement and reviewed migration gates permit retirement.
 
 Hydration follows both requested clean plan acceptances. Update stale #107 broker-free/manual scope only then. Numbered Tasks13/14 are explicitly existing-issue work: a hydration proposal must exclude/reuse them manually; there is no blind bulk split confirmation. Parent-only hydration is valid while decomposition awaits review.
 
@@ -73,6 +73,18 @@
 
 New signatures below are implementation contracts, not existing APIs. Create each named test helper in the task that owns it; all helpers clean their connections/processes in `t.after`. Tests use `node:test` and `node:assert/strict`.
 
+## Shared Contract Types and Scope
+
+Task6 creates `src/api/contracts.mjs` with JSDoc typedefs tied to the registered JSON schemas; no second validator. `ResponseEnvelope` is the closed ai-peer-review.response/v1 shape: schema/ok/mutation_occurred/retry_safe/next_action plus bounded error or run/status/revision/cursor/evidence/capability dimensions. `EventEnvelope` adds durable cursor/revision and redacted projection. `ValidatedOperation` is {value,input_validation:{duplicate_keys:"checked"|"not-observable"}}. `ParsedInput` is {value,rawText,inputValidation}; `HelpEnvelope` is its registered help result. Paths and provider/session handles are private typed authority values, not arbitrary caller strings.
+
+Task2 defines `ProtectionReceipt` {verified,source,version,canonicalRoot,principal,assurance,reason}; `Owner` {instanceId,publish,verify,release}; `ReleaseReceipt` {released,outstandingObligations}. Task3 defines `TerminationResult` {quiescent,provedObligations,outstandingObligations,evidenceRefs}; launch epoch observations include execution_host_id,boot_epoch,source/version/assurance; unknown epoch is null/reason. Task7 defines `ConfigV2` from config/v2, and `SealedRoster` {initial,allowedKinds,cascades,eligibility,caps,sources,scope,visibility}. Task8 defines `Reservation` {runId,requestDigest,artifactLease,revision,operationIds,adoptedRuntimeBinding}; StartReceipt/PreviewEnvelope are operation-specific ResponseEnvelope variants. ReplayResult is existing/conflict/absent with durable receipt; runtime binding retains exact adopted package/Node/installation/authority/adapter identities and private locator.
+
+Task9 defines `LaunchObservation`/`IdentityObservation` from verified exact-session source/version/assurance with requested identity separate; `DistinctnessReceipt` {proved,evidenceRefs,reason}; `RoleToolConnection` owns private stdio capability/revoke lifecycle. Task10 defines `RoleScope` {fur,ownPartition,shared,context,deniedRoots,role}; `SubmissionReceipt` {actionId,payloadDigest,reviewedDigest,role,revision,sealRef}; `ContextReceipt` {suppliedInputs,projectionDigests,visibility,observedRetrievals}. Task11 `RunState` is run-state/v1; `DispatchReceipt` {operationId,attemptId,requestedStageId,stageAttemptId,round,phase,revision}; `LedgerDelta` is validated immutable findings/resolutions; `ReplacementIntent` names selected sealed candidate/class and required reconciliation.
+
+Task12's Snapshot/Patch/Envelope/Verification/PublicationReceipt/Candidates/IndexReceipt come from #30's adopted four schemas and shared API; do not define competing shapes. Task13 `Measurement` is measurement/v1; AttemptId is opaque durable invocation ID; Receipt is attempt-metrics/v1; ControllerReceipt has controller binding/event/run IDs and measurement references with accountingKind=controller and no worker attempt_id. Task14 AggregateViews/ChainView/AmendmentReceipt are neutral coverage and amendment contracts adopted by #30/#34; include referenced IDs,accounting basis,coverage and as-of revision. Task15 MonitorReceipt/HoldReceipt/LivenessActions carry verified host surface/cursor and exact orthogonal dimensions; Task17 ActionReceipt/ObligationDelta/SeriesReceipt/CleanupEnvelope use their registered closed operation schemas; Task18 ReleaseReport contains exact15 gate results,contract conflicts and installed capability matrix.
+
+Every task's Interfaces block is its produced API; its named arguments are consumed contracts from the defining tasks above. Fixture helpers are test-only, built in the owning task, and must reproduce the behavior of actual production APIs rather than alter semantics to satisfy assertions. Tests use exact registered defaults and stable fixture IDs. Public activation respects Tasks5/8 adoption. Test commands referencing a later helper are explicitly integration runs after that dependency exists; they are not claimed runnable against today's unchanged source.
+
 ### Task 1: Async Authenticated HTTP Transport
 
 #### Story Intent
@@ -82,10 +94,15 @@
 - **Need:** Replace native framing without blocking cancellation/status.
 - **Value or failure prevented:** Prevent rebinding/browser access, credential leaks and slow-client starvation.
 
-**Files:** Create `src/broker/http-server.mjs`, `http-client.mjs`, `http-auth.mjs`, `test/helpers/portable-broker-fixture.mjs`, `test/unit/broker-http.test.mjs`, `test/integration/broker-http-concurrency.test.mjs`. Modify `src/broker/service.mjs`, `client.mjs`, `ipc.mjs`, `bin/peer-review-broker.mjs`; keep isolated legacy adapter during conformance.
+#### Implementation Scope
 
-**Interfaces:** Consumes verified instance/worktree binding and trusted credential/grant. Produces `createLoopbackServer({binding,authenticate,dispatch,clock}):Promise<{port,close():Promise<void>}>`, `requestLoopback({endpoint,privateBinding,operation,body,signal}):Promise<ResponseEnvelope>`, `waitLoopback({...request,afterCursor}):AsyncIterable<EventEnvelope>`. Fixture returns `request/rawSocket/clock/flush/dispatchCalls`.
+**Files:** Create `src/broker/http-server.mjs`, `src/broker/http-client.mjs`, `src/broker/http-auth.mjs`, `test/helpers/portable-broker-fixture.mjs`, `test/unit/broker-http.test.mjs`, `test/integration/broker-http-concurrency.test.mjs`. Modify `src/broker/service.mjs`, `src/broker/client.mjs`, `src/broker/ipc.mjs`, `bin/peer-review-broker.mjs`; keep isolated legacy adapter during conformance.
 
+**Interfaces:**
+
+- **Consumes:** Task2's verified owner/endpoint binding and private storage receipt; dispatch is an authenticated asynchronous handler injected by the broker service. Task1's tests inject bindings until Task2 is implemented.
+- **Produces:** Consumes verified instance/worktree binding and trusted credential/grant. Produces `createLoopbackServer({binding,authenticate,dispatch,clock}):Promise<{port,close():Promise<void>}>`, `requestLoopback({endpoint,privateBinding,operation,body,signal}):Promise<ResponseEnvelope>`, `waitLoopback({...request,afterCursor}):AsyncIterable<EventEnvelope>`. Fixture returns `request/rawSocket/clock/flush/dispatchCalls`.
+
 - [ ] Write failing raw HTTP tests for missing/duplicate Host, wrong literal127.0.0.1/port, absolute targets, Origin/Sec-Fetch, upgrade, wrong credential/instance/worktree, oversized headers/body, truncated UTF-8/JSON, 10-second receipt/5-second idle and auth-before-body interpretation.
 - [ ] Add concurrent status test:
 
@@ -93,7 +110,7 @@
 const f = await portableBrokerFixture(t);
 const slow = await f.rawSocket();
 slow.write('POST /rpc HTTP/1.1\r\nHost: ');
-assert.equal((await f.request({operation:'status',body:{}})).ok, true);
+assert.equal((await f.request({ operation: 'status', body: {} })).ok, true);
 f.clock.advance(10_000);
 await f.flush();
 assert.equal(slow.destroyed, true);
@@ -104,6 +121,21 @@
 - [ ] Await startup/request/dispatch/drains/close at every service/client/bin seam. Wait lifetime survives receipt timeout; waits hold no mutation lock. Once mutation bytes may be sent, return delivery uncertainty/action ID, never blindly relaunch.
 - [ ] Run green and legacy IPC/readiness regressions; commit only source/tests.
 
+- [ ] Add the following implementation invariant at this task's owning seam, then complete every enumerated boundary fixture:
+
+```js
+const server = http.createServer({ maxHeaderSize: 16_384 }, async (req, res) => {
+  const auth = authenticate(req.rawHeaders, binding);
+  if (!auth.ok) {
+    res.writeHead(401);
+    res.end();
+    return;
+  }
+  await dispatch(req, res, auth); // authenticated body validator and bounded stream
+});
+await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
+```
+
 **Verification Commands:**
 
 ```sh
@@ -123,18 +155,29 @@
 - **Need:** Replace native ownership without age-only takeover.
 - **Value or failure prevented:** Prevent Windows ACL false assurance and path/owner substitution.
 
-**Files:** Create `src/broker/storage-protection.mjs`, `portable-ownership.mjs`, `portable-paths.mjs`, `test/unit/storage-protection.test.mjs`, `test/integration/portable-ownership.test.mjs`. Modify `src/broker/{platform,ownership,paths,identity}.mjs`.
+#### Implementation Scope
 
-**Interfaces:** Consumes physical roots and OS observation adapter. Produces read-only `observeStorageProtection({root,osAdapter}):Promise<ProtectionReceipt>`; setup-only `provisionProtectedRoot(...)`; `acquirePortableOwner({worktree,paths,reconcile,protection}):Promise<Owner>` with async `publish/verify/release` and source/version/principal/ACL/assurance receipts.
+**Files:** Create `src/broker/storage-protection.mjs`, `src/broker/portable-ownership.mjs`, `src/broker/portable-paths.mjs`, `test/unit/storage-protection.test.mjs`, `test/integration/portable-ownership.test.mjs`. Modify `src/broker/platform.mjs`, `src/broker/ownership.mjs`, `src/broker/paths.mjs`, `src/broker/identity.mjs`.
 
+**Interfaces:**
+
+- **Consumes:** Physical worktree identity from existing broker identity, OS protection adapter, Task17's evidence-backed stale-owner reconciliation callback; unresolved stale ownership refuses before Task17 exists.
+- **Produces:** Consumes physical roots and OS observation adapter. Produces read-only `observeStorageProtection({root,osAdapter}):Promise<ProtectionReceipt>`; setup-only `provisionProtectedRoot({root,osAdapter}):Promise<ProtectionReceipt>`; `acquirePortableOwner({worktree,paths,reconcile,protection}):Promise<Owner>` with async `publish/verify/release` and source/version/principal/ACL/assurance receipts.
+
 - [ ] Write failing concurrent same-worktree/linked-worktree ownership, stale lock/no death proof, owner substitution, flush/rename crash, symlink/hardlink/parent replacement/overlapping roots tests.
 - [ ] Add actual effective-rights condition:
 
 ```js
-const r = await observeStorageProtection({root:privateRoot,osAdapter:windowsFixture({
-  mode:0o600,ownerMatches:true,inheritanceProtected:false,foreignRead:true
-})});
-assert.equal(r.verified,false);
+const r = await observeStorageProtection({
+  root: privateRoot,
+  osAdapter: windowsFixture({
+    mode: 0o600,
+    ownerMatches: true,
+    inheritanceProtected: false,
+    foreignRead: true,
+  }),
+});
+assert.equal(r.verified, false);
 ```
 
 `windowsFixture` is a Task2 test adapter emitting real ACL-shaped observations, not deriving ACL proof from mode.
@@ -145,6 +188,17 @@
 - [ ] Random32-byte credential in `.scratch/peer-review/private/`; endpoint `runtime/endpoint.json` includes fingerprint/instance/port/digest/heartbeat, never secret. Redact credential digest from tooling too. Publish after ownership/recovery; verify roots at each write.
 - [ ] Run green on all target OS jobs; commit.
 
+- [ ] Add the following implementation invariant at this task's owning seam, then complete every enumerated boundary fixture:
+
+```js
+const receipt = await observeStorageProtection({ root: paths.privateRoot, osAdapter });
+if (!receipt.verified) throw new Error('effective-user-protection-unproved');
+const ownerFile = await fs.open(paths.lock, 'wx', 0o600);
+await ownerFile.writeFile(JSON.stringify(ownerProof));
+await ownerFile.sync();
+// Keep ownerFile open; reclamation and publication require the exact owner transaction.
+```
+
 **Verification Commands:**
 
 ```sh
@@ -164,19 +218,30 @@
 - **Need:** Distinguish reboot from broker restart, sleep, PID reuse and migrated effects.
 - **Value or failure prevented:** Prevent unsafe lease release or overlapping replacement writers.
 
-**Files:** Create `src/providers/containment.mjs`, `src/protocol/host-epoch.mjs`, `test/helpers/descendant-writer.mjs`, `test/unit/host-epoch.test.mjs`, `test/integration/provider-containment.test.mjs`, `test/live/host-epoch-conformance.mjs`. Modify `src/providers/{process-lifetime,conformance}.mjs` and `src/protocol/process-identity.mjs`.
+#### Implementation Scope
 
-**Interfaces:** Produces `observeExecutionHost({osAdapter,privateKey}):Promise<{execution_host_id,boot_epoch,source,version,assurance}>`; `containProvider({launch,capability}):Promise<{scope,observe,cancel,terminationReceipt}>`; `verifyTermination({sealedScope,launchEpoch,freshObservation,processEvidence}):TerminationResult`. Scope inventories local/remote writer bounds; proved/outstanding obligations stay separate.
+**Files:** Create `src/providers/containment.mjs`, `src/protocol/host-epoch.mjs`, `test/helpers/descendant-writer.mjs`, `test/unit/host-epoch.test.mjs`, `test/integration/provider-containment.test.mjs`, `test/live/host-epoch-conformance.mjs`. Modify `src/providers/process-lifetime.mjs`, `src/providers/conformance.mjs` and `src/protocol/process-identity.mjs`.
 
+**Interfaces:**
+
+- **Consumes:** Exact process observations from process-identity, provider conformance capability and protected installation key from Task2.
+- **Produces:** Produces `observeExecutionHost({osAdapter,privateKey}):Promise<{execution_host_id,boot_epoch,source,version,assurance}>`; `containProvider({launch,capability}):Promise<{scope,observe,cancel,terminationReceipt}>`; `verifyTermination({sealedScope,launchEpoch,freshObservation,processEvidence}):TerminationResult`. Scope inventories local/remote writer bounds; proved/outstanding obligations stay separate.
+
 - [ ] Write red direct-child-dead/grandchild-live, escaped process group/session, PID reuse, broker restart, sleep/resume, changed host, unknown launch epoch, remote job and failed cancel tests.
 - [ ] Pin negative reboot proof:
 
 ```js
-const r=verifyTermination({sealedScope:{execution_host_id:'host-a',writers:'local-only'},
- launchEpoch:{boot_epoch:'boot-a',assurance:'verified-os-source'},
- freshObservation:{execution_host_id:'host-a',boot_epoch:'boot-a',broker_instance_id:'new'},
- processEvidence:{descendants:'unknown'}});
-assert.equal(r.quiescent,false);
+const r = verifyTermination({
+  sealedScope: { execution_host_id: 'host-a', writers: 'local-only' },
+  launchEpoch: { boot_epoch: 'boot-a', assurance: 'verified-os-source' },
+  freshObservation: {
+    execution_host_id: 'host-a',
+    boot_epoch: 'boot-a',
+    broker_instance_id: 'new',
+  },
+  processEvidence: { descendants: 'unknown' },
+});
+assert.equal(r.quiescent, false);
 ```
 
 - [ ] Run command below red.
@@ -185,6 +250,20 @@
 - [ ] Implement live capture/verify modes; capture, actual scheduled reboot, verify same host, then broker-restart/sleep negatives. Mock epoch changes prove protocol logic only. Request explicit user scheduling before reboot.
 - [ ] Run green; retain platform feasibility blocker if proof unavailable; commit.
 
+- [ ] Add the following implementation invariant at this task's owning seam, then complete every enumerated boundary fixture:
+
+```js
+const sameHost = launchEpoch.execution_host_id === freshObservation.execution_host_id;
+const provedEpoch =
+  launchEpoch.assurance === 'verified-os-source' &&
+  freshObservation.assurance === 'verified-os-source' &&
+  launchEpoch.boot_epoch !== null &&
+  freshObservation.boot_epoch !== null;
+const localOnly = sealedScope.writers === 'local-only';
+const terminatedByRestart =
+  sameHost && provedEpoch && localOnly && launchEpoch.boot_epoch !== freshObservation.boot_epoch;
+```
+
 **Verification Commands:**
 
 ```sh
@@ -206,18 +285,23 @@
 - **Need:** Audit the full production closure and remove native provisioning.
 - **Value or failure prevented:** Prevent compiler/header/architecture requirements hidden in dependencies or CI caches.
 
-**Files:** Create `scripts/audit-production-closure.mjs`, `test/unit/production-closure.test.mjs`, `test/integration/portable-installed-broker.test.mjs`, `test/helpers/portable-network-policy.mjs`. Modify `package.json`, `package-lock.json`, `test/packaging/package.test.mjs`, `test/integration/broker-release.test.mjs`, `test/unit/broker-build*.test.mjs`, `test/helpers/{warm-packed-cache,windows-offline,assert-network}.mjs`, `test/helpers/windows-offline.ps1`, `.github/workflows/{ci,release}.yml`, `src/doctor.mjs`, `src/config/setup.mjs`, `src/cli/{parse,run,help-data}.mjs`. Retire production `scripts/build-broker-security.mjs` / `native/broker-security/` only after Tasks1–3 portable lifecycle proof.
+#### Implementation Scope
 
-**Interfaces:** `auditProductionClosure({lockfile,packageRoot,installedTree,packInventory}):AuditReport` and exported `productionGraph(lockfile)` enumerate all direct/transitive/optional production files/scripts/native/download risks and source/license rationale.
+**Files:** Create `scripts/audit-production-closure.mjs`, `test/unit/production-closure.test.mjs`, `test/integration/portable-installed-broker.test.mjs`, `test/helpers/portable-network-policy.mjs`. Modify `package.json`, `package-lock.json`, `test/packaging/package.test.mjs`, `test/integration/broker-release.test.mjs`, `test/unit/broker-build.test.mjs`, `test/unit/broker-build-command.test.mjs`, `test/helpers/warm-packed-cache.mjs`, `test/helpers/windows-offline.mjs`, `test/helpers/assert-network.mjs`, `test/helpers/windows-offline.ps1`, `.github/workflows/ci.yml`, `.github/workflows/release.yml`, `src/doctor.mjs`, `src/config/setup.mjs`, `src/cli/parse.mjs`, `src/cli/run.mjs`, `src/cli/help-data.mjs`. Retire production `scripts/build-broker-security.mjs` / `native/broker-security/` only after Tasks1–3 portable lifecycle proof.
 
+**Interfaces:**
+
+- **Consumes:** Tasks1–3 portable lifecycle APIs, actual installed package inventory and npm lock/production graph; no new review orchestration required for transport conformance.
+- **Produces:** `auditProductionClosure({lockfile,packageRoot,installedTree,packInventory}):AuditReport` and exported `productionGraph(lockfile)` enumerate all direct/transitive/optional production files/scripts/native/download risks and source/license rationale.
+
 - [ ] Write red transitive native/build/download/disguised architecture-binary fixtures and actual installed-tarball broker lifecycle/auth/concurrency/recovery tests.
 - [ ] Pin full traversal:
 
 ```js
-for(const p of productionGraph(lockfile)){
- assert.equal(p.nativeArtifacts.length,0,p.name);
- assert.equal(p.binaryDownloads.length,0,p.name);
- assert.equal(p.requiredBuildScripts.length,0,p.name);
+for (const p of productionGraph(lockfile)) {
+  assert.equal(p.nativeArtifacts.length, 0, p.name);
+  assert.equal(p.binaryDownloads.length, 0, p.name);
+  assert.equal(p.requiredBuildScripts.length, 0, p.name);
 }
 ```
 
@@ -228,6 +312,20 @@
 - [ ] Offline installed proof warms JS production cache then denies external egress while allowing loopback. Existing unshare/macOS blanket IP deny blocks target transport: replace OS policy, verify local success/external failure and restore in finally. AIPR never installs provider executables; optional live CLI setup stays explicit external prerequisite.
 - [ ] Run green closure/installed/pack/smoke and commit.
 
+- [ ] Add the following implementation invariant at this task's owning seam, then complete every enumerated boundary fixture:
+
+```js
+const tree = JSON.parse(await runNpm(['ls', '--omit=dev', '--json']));
+const report = auditProductionClosure({
+  lockfile,
+  packageRoot,
+  installedTree: tree,
+  packInventory,
+});
+assert.equal(report.failures.length, 0);
+assert.equal(report.uninspectedProductionPackages.length, 0);
+```
+
 **Verification Commands:**
 
 ```sh
@@ -243,7 +341,6 @@
 
 Actual packed runtime/production closure contains no native addon/node-gyp/build/download/architecture binary and passes installed portable lifecycle on each target OS without compiler provisioning.
 
-
 ### Task 5: Reconcile Accepted Contract Owners
 
 #### Story Intent
@@ -253,21 +350,26 @@
 - **Need:** Resolve accepted-spec contradictions before public integration.
 - **Value or failure prevented:** Prevent unreviewed runtime/policy override and duplicate evidence formats.
 
+#### Implementation Scope
+
 **Files:** Governed follow-up creates `docs/superpowers/specs/2026-10-03-107-runtime-policy-reconciliation-design.md` and `test/fixtures/runtime-contract-adoption.json`. Modify this plan after accepted amendment; #30/#34 owners update their own plans. Never modify the immutable accepted #107 spec in implementation.
 
-**Interfaces:** `RuntimeContractAdoption` contains owner issue IDs, exact reviewed spec/amendment/plan digests, runtime/policy/legacy recovery decisions, evidence/telemetry schemas and accepted review references. `assertContractAdoption(record):void` is created in Task8.
+**Interfaces:**
 
+- **Consumes:** Immutable #107 spec, controller's verified #102 current artifacts and #30/#34/#109 owner plans; produces review/adoption prerequisites, no runtime code.
+- **Produces:** `RuntimeContractAdoption` contains owner issue IDs, exact reviewed spec/amendment/plan digests, runtime/policy/legacy recovery decisions, evidence/telemetry schemas and accepted review references. `assertContractAdoption(record):void` is created in Task8.
+
 - [ ] Read live issue/artifact ownership at verified commits; state labels alone do not prove adoption.
 - [ ] Write targeted spec follow-up with concrete global-vs-coexistence installation, exclusive-vs-layered policy, and active legacy drain/recovery cases. Do not choose silently.
 - [ ] Record expected outcomes for changed Node/current selection, unsupported active/fenced journals, mixed policies and evidence adoption. Review through authorized governance; unresolved conflicts block Tasks7/8 integration,18 migration/release.
 - [ ] After actual acceptance, revise affected plan contracts/gates and repeat plan review. Adoption fixture must prove owners and exact reviewed digests:
 
 ```js
-assert.equal(adoption.runtimePolicy.issue,102);
-assert.equal(adoption.evidence.issue,30);
-assert.equal(adoption.analytics.issue,34);
-assert.equal(adoption.unresolvedConflicts.length,0);
-assert.ok(adoption.reviewedDigests.every(d=>/^[a-f0-9]{64}$/.test(d)));
+assert.equal(adoption.runtimePolicy.issue, 102);
+assert.equal(adoption.evidence.issue, 30);
+assert.equal(adoption.analytics.issue, 34);
+assert.equal(adoption.unresolvedConflicts.length, 0);
+assert.ok(adoption.reviewedDigests.every((d) => /^[a-f0-9]{64}$/.test(d)));
 ```
 
 - [ ] Commit separately reviewed follow-up material through ordinary governance.
@@ -292,16 +394,21 @@
 - **Need:** Bind retries to exact canonical submitted content.
 - **Value or failure prevented:** Prevent duplicate-key ambiguity, silently accepted fields and invalid help examples.
 
-**Files:** Create `src/api/{registry,validate,canonical-json,errors}.mjs`; `schemas/{start-request,api-response,status-request,wait-request,intervention-request,submit-turn-request,help-request,cleanup-request,series-reconcile-request,finding-id}-v1.json`; `test/unit/api-registry.test.mjs`, `request-canonical.test.mjs`; `test/golden/api-help.test.mjs`; `test/fixtures/api-contracts.json`. Modify `src/cli/{help-data,help-topics}.mjs`, `src/errors.mjs`. Preserve historical schema readers.
+#### Implementation Scope
 
-**Interfaces:** Consumes raw CLI/MCP bytes or parsed object with observability declaration. Produces `operationRegistry`, `validateOperation(name,input,{rawText}):ValidatedOperation`, `encodeRequestCanonical(value):Buffer`, `requestDigest(value):string`, `renderHelp({topic,format}):HelpEnvelope`. Registry owns schemas, response/action unions, examples, errors and sole grammar `ai-peer-review.finding-id/v1`.
+**Files:** Create `src/api/contracts.mjs`, `src/api/registry.mjs`, `src/api/validate.mjs`, `src/api/canonical-json.mjs`, `src/api/errors.mjs`; `schemas/start-request-v1.json`, `schemas/api-response-v1.json`, `schemas/status-request-v1.json`, `schemas/wait-request-v1.json`, `schemas/intervention-request-v1.json`, `schemas/submit-turn-request-v1.json`, `schemas/help-request-v1.json`, `schemas/cleanup-request-v1.json`, `schemas/series-reconcile-request-v1.json`, `schemas/finding-id-v1.json`; `test/unit/api-registry.test.mjs`, `test/unit/request-canonical.test.mjs`; `test/golden/api-help.test.mjs`; `test/fixtures/api-contracts.json`. Modify `src/cli/help-data.mjs`, `src/cli/help-topics.mjs`, `src/errors.mjs`. Preserve historical schema readers.
 
+**Interfaces:**
+
+- **Consumes:** Validated raw/parsed transport inputs and immutable spec contracts; generated output schemas consumed by Tasks7–18.
+- **Produces:** Consumes raw CLI/MCP bytes or parsed object with observability declaration. Produces `operationRegistry`, `validateOperation(name,input,{rawText}):ValidatedOperation`, `encodeRequestCanonical(value):Buffer`, `requestDigest(value):string`, `renderHelp({topic,format}):HelpEnvelope`. Registry owns schemas, response/action unions, examples, errors and sole grammar `ai-peer-review.finding-id/v1`.
+
 - [ ] Write red canonical equivalence fixtures for whitespace/key order,6/6.0/6e0,escaped same-string filepath, UTF-16/non-BMP key sorting/prefixes, every required string escape/slash/scalar Unicode. Reject lone surrogates, invalid numeric domains, unknown fields, absent stages and raw duplicate keys; parsed-only MCP records not-observable.
 - [ ] Pin submitted filepath identity:
 
 ```js
-assert.deepEqual(encodeRequestCanonical(parsedA),encodeRequestCanonical(parsedB));
-assert.notEqual(requestDigest({...valid,filepath:'./spec.md'}),requestDigest(valid));
+assert.deepEqual(encodeRequestCanonical(parsedA), encodeRequestCanonical(parsedB));
+assert.notEqual(requestDigest({ ...valid, filepath: './spec.md' }), requestDigest(valid));
 ```
 
 `parsedA/parsedB/valid` are validated exact fixtures in `test/fixtures/api-contracts.json`.
@@ -312,6 +419,16 @@
 - [ ] Validate Markdown literal/code-node/rendered spelling. Sole published finding grammar matches registry; gate2 owns its assertions with code separators; unresolved code identical. Inject underscore substitution, grammar corruption, de-indented continuation and missing separator; each fails. Do not transcribe another expected regex.
 - [ ] Run green/goldens and commit.
 
+- [ ] Add the following implementation invariant at this task's owning seam, then complete every enumerated boundary fixture:
+
+```js
+export function requestDigest(value) {
+  const bytes = encodeRequestCanonical(value);
+  return createHash('sha256').update(bytes).digest('hex');
+}
+// validateOperation has already rejected invalid numeric domains and lone surrogates.
+```
+
 **Verification Commands:**
 
 ```sh
@@ -331,18 +448,23 @@
 - **Need:** Make changed turn/round semantics and policy sources explicit.
 - **Value or failure prevented:** Prevent silent selection defaults, topology downgrade and unbounded retries.
 
-**Files:** Create `src/config/v2.mjs`, `src/startup/roster.mjs`, `schemas/config-v2.json`, `test/unit/config-v2.test.mjs`, `roster-resolution.test.mjs`, `test/fixtures/config-v2-cases.json`. Modify `src/config/load.mjs`, `src/startup/selection.mjs`; setup integration only after Task5.
+#### Implementation Scope
 
-**Interfaces:** `validateConfigV2(source):ConfigV2`; `resolveConfigV2({packageDefaults,user,project}):{config,sources}` is accepted #107 isolated fixture behavior, not public override of #102. `resolveRoster({stage,config,capabilities}):SealedRoster` returns identities/sources/headless placement/caps/permissions/visibility/finite cascade and eligibility table against every reachable counterpart.
+**Files:** Create `src/config/v2.mjs`, `src/startup/roster.mjs`, `schemas/config-v2.json`, `test/unit/config-v2.test.mjs`, `test/unit/roster-resolution.test.mjs`, `test/fixtures/config-v2-cases.json`. Modify `src/config/load.mjs`, `src/startup/selection.mjs`; setup integration only after Task5.
 
+**Interfaces:**
+
+- **Consumes:** Task6 registry validator/canonical policy schemas and versioned installed capability observations; Task5 adopted policy authority is required for integration.
+- **Produces:** `validateConfigV2(source):ConfigV2`; `resolveConfigV2({packageDefaults,user,project}):{config,sources}` is accepted #107 isolated fixture behavior, not public override of #102. `resolveRoster({stage,config,capabilities}):SealedRoster` returns identities/sources/headless placement/caps/permissions/visibility/finite cascade and eligibility table against every reachable counterpart.
+
 - [ ] Write red scalar/named-key merge, whole-profile/array replacement, package empty profiles/default null, omitted roles/model/effort, empty supplied lists/nonexistent defaults, bounds/order and unknown-key fixtures.
 - [ ] Pin excluded candidates/no initial downgrade:
 
 ```js
-const r=resolveRoster({stage:xprStage,config:profile,capabilities:fixtureMatrix});
-assert.equal(r.initial.kind,'xpr');
-assert.deepEqual(r.allowedKinds,['xpr','spr']);
-assert.equal(r.eligibility['codex-reviewer']['codex-author'].kind,'spr');
+const r = resolveRoster({ stage: xprStage, config: profile, capabilities: fixtureMatrix });
+assert.equal(r.initial.kind, 'xpr');
+assert.deepEqual(r.allowedKinds, ['xpr', 'spr']);
+assert.equal(r.eligibility['codex-reviewer']['codex-author'].kind, 'spr');
 ```
 
 These are schema-valid conformance fixture selections, not installed support claims.
@@ -354,6 +476,17 @@
 - [ ] New-runtime v1/mixed config rejects `APR_CONFIG_MIGRATION_REQUIRED` with legacy keys/changed semantics/prospective sources/caps; never convert max_turns numerically. Removed on_missing_surface rejects; config cannot consent unattended. Conditional rules/alternative roster extension unsupported in v1.
 - [ ] Run green and commit isolated resolver; integration remains gated.
 
+- [ ] Add the following implementation invariant at this task's owning seam, then complete every enumerated boundary fixture:
+
+```js
+const sources = [packageDefaults, user, project];
+for (const source of sources) validateConfigV2(source);
+const resolved = resolveConfigV2({ packageDefaults, user, project });
+const roster = resolveRoster({ stage, config: resolved.config, capabilities });
+assert.equal(roster.initial.kind, stage.kind);
+// This isolated spec fixture resolver cannot override adopted project policy routing.
+```
+
 **Verification Commands:**
 
 ```sh
@@ -373,20 +506,25 @@
 - **Need:** Return immediate durable receipt before provider launch.
 - **Value or failure prevented:** Prevent duplicate sessions, cache-writing preview and competing legacy writers.
 
-**Files:** Create `src/startup/run.mjs`, `contract-adoption.mjs`, `src/protocol/run-store.mjs`, `artifact-lease.mjs`, `test/unit/runtime-contract-adoption.test.mjs`, `test/integration/run-start.test.mjs`, `preview-readonly.test.mjs`, `test/helpers/run-fixture.mjs`. Modify `src/startup/runtime.mjs`, `src/protocol/store.mjs`, `src/broker/registry.mjs`.
+#### Implementation Scope
 
-**Interfaces:** `previewRun({request,binding,deps}):Promise<PreviewEnvelope>`; `startRun(...):Promise<StartReceipt>`; `reserveRun({requestDigest,artifact,policy,contractAdoption}):Promise<Reservation>`; `lookupRequest({worktree,requestId,digest}):ReplayResult`; `assertContractAdoption(record):void`. Fixture returns start/preview/snapshotTree/launchCount/faultAt/clock/authority.
+**Files:** Create `src/startup/run.mjs`, `src/startup/contract-adoption.mjs`, `src/protocol/run-store.mjs`, `src/protocol/artifact-lease.mjs`, `test/unit/runtime-contract-adoption.test.mjs`, `test/integration/run-start.test.mjs`, `test/integration/preview-readonly.test.mjs`, `test/helpers/run-fixture.mjs`. Modify `src/startup/runtime.mjs`, `src/protocol/store.mjs`, `src/broker/registry.mjs`.
 
+**Interfaces:**
+
+- **Consumes:** Task6 request identity, Task7 sealed policy/roster, Task2 physical protection/ownership, Task12 read-only portable lineage API and Task15 host surface observation; isolated test adapters until those modules exist.
+- **Produces:** `previewRun({request,binding,deps}):Promise<PreviewEnvelope>`; `startRun({request,binding,deps}):Promise<StartReceipt>`; `reserveRun({requestDigest,artifact,policy,contractAdoption}):Promise<Reservation>`; `lookupRequest({worktree,requestId,digest}):ReplayResult`; `assertContractAdoption(record):void`. Fixture returns start/preview/snapshotTree/launchCount/faultAt/clock/authority.
+
 - [ ] Write red no-write/spawn/lock/conformance/cache/credential-refresh preview spies; exactly permitted spec preflight reads only. Never consult derived authority series cache. Existing identical authenticated replay returns durable status before new capabilities/config, even if now unavailable.
 - [ ] Pin atomic replay:
 
 ```js
-const before=f.snapshotTree();
+const before = f.snapshotTree();
 await f.preview(request);
-assert.deepEqual(f.snapshotTree(),before);
-const [a,b]=await Promise.all([f.start(request),f.start(request)]);
-assert.equal(a.run_id,b.run_id);
-assert.equal(f.launchCount(),0); // reservation receipt precedes dispatch
+assert.deepEqual(f.snapshotTree(), before);
+const [a, b] = await Promise.all([f.start(request), f.start(request)]);
+assert.equal(a.run_id, b.run_id);
+assert.equal(f.launchCount(), 0); // reservation receipt precedes dispatch
 ```
 
 - [ ] Run below red.
@@ -395,6 +533,17 @@
 - [ ] Reserve ID/lease/run header in one journaled locked transaction; mutable observations rechecked under artifact/series locks. Seal runtime binding through adopted #102 interface; uncertain legacy active/fenced overlap refuses. Return starting receipt then journal operation before external launch; each crash settles by reconciliation, never blind relaunch. Post-reservation errors carry mutation=true/run ID.
 - [ ] Keep public activation rejected by incomplete Task5 adoption. Exported records/run ID confer no grants. Run green plus lock/recovery regressions and commit.
 
+- [ ] Add the following implementation invariant at this task's owning seam, then complete every enumerated boundary fixture:
+
+```js
+const parsed = validateOperation('start', request, { rawText });
+const digest = requestDigest(parsed.value);
+const prior = lookupRequest({ worktree, requestId: request.request_id, digest });
+if (prior.kind === 'existing') return prior.receipt;
+assertContractAdoption(contractAdoption);
+return await reserveRun({ requestDigest: digest, artifact, policy, contractAdoption });
+```
+
 **Verification Commands:**
 
 ```sh
@@ -414,19 +563,24 @@
 - **Need:** Separate controller and worker identities/submissions.
 - **Value or failure prevented:** Prevent same-session peer review, inherited identity and credential leakage.
 
-**Files:** Create `src/providers/headless-contract.mjs`, `src/broker/role-wrapper.mjs`, `role-tools.mjs`, `src/identity/session-distinctness.mjs`, `test/unit/session-distinctness.test.mjs`, `test/integration/headless-role-tools.test.mjs`. Modify `src/broker/{worker-factory,worker,launch,participant-binding,provider-bridge}.mjs`, `src/providers/{registry,conformance,codex,claude,grok}.mjs`, `src/provider/{claude-launch,execution-contract}.mjs`, `src/identity/evidence.mjs`.
+#### Implementation Scope
 
-**Interfaces:** `launchHeadless({operationId,role,selection,scope,privateToolPipes}):Promise<LaunchObservation>`; `observeExactSession(handle):Promise<IdentityObservation>`; `proveDistinctness({controller,workers,freshCreationEvidence}):DistinctnessReceipt`; `createRoleWrapper({childBinding,brokerBinding,grant}):RoleToolConnection`. HMAC worktree fingerprint over verified host/exact handle; compare common private provider/session namespace, not differently salted fingerprints.
+**Files:** Create `src/providers/headless-contract.mjs`, `src/broker/role-wrapper.mjs`, `src/broker/role-tools.mjs`, `src/identity/session-distinctness.mjs`, `test/unit/session-distinctness.test.mjs`, `test/integration/headless-role-tools.test.mjs`. Modify `src/broker/worker-factory.mjs`, `src/broker/worker.mjs`, `src/broker/launch.mjs`, `src/broker/participant-binding.mjs`, `src/broker/provider-bridge.mjs`, `src/providers/registry.mjs`, `src/providers/conformance.mjs`, `src/providers/codex.mjs`, `src/providers/claude.mjs`, `src/providers/grok.mjs`, `src/provider/claude-launch.mjs`, `src/provider/execution-contract.mjs`, `src/identity/evidence.mjs`.
 
+**Interfaces:**
+
+- **Consumes:** Task8 durable launch operation/run header, Task7 roster, Task2 protected key/storage, Task3 containment and Task10 scope contract. Only test scope adapters until Task10 passes.
+- **Produces:** `launchHeadless({operationId,role,selection,scope,privateToolPipes}):Promise<LaunchObservation>`; `observeExactSession(handle):Promise<IdentityObservation>`; `proveDistinctness({controller,workers,freshCreationEvidence}):DistinctnessReceipt`; `createRoleWrapper({childBinding,brokerBinding,grant}):RoleToolConnection`. HMAC worktree fingerprint over verified host/exact handle; compare common private provider/session namespace, not differently salted fingerprints.
+
 - [ ] Write red controller-worker collision,worker-worker collision,unproved separation,equal-model/distinct-session,exact resume,same-model/new-session cases for all topologies.
 - [ ] Pin stdout spoof rejection:
 
 ```js
-const w=await f.launchSolo();
-w.stdout.write(JSON.stringify({tool:'submit_review_turn',arguments:forged}));
+const w = await f.launchSolo();
+w.stdout.write(JSON.stringify({ tool: 'submit_review_turn', arguments: forged }));
 await f.flush();
-assert.equal(f.authority.submissionCount(),0);
-assert.equal(w.environmentHasBrokerCredential(),false);
+assert.equal(f.authority.submissionCount(), 0);
+assert.equal(w.environmentHasBrokerCredential(), false);
 ```
 
 Task9 extends runFixture with role pipe/launch methods and a schema-valid forged payload lacking binding.
@@ -437,6 +591,15 @@
 - [ ] Collision errors are exact `APR_CONTROLLER_WORKER_SESSION_COLLISION`/`APR_WORKER_SESSION_COLLISION`/`APR_SESSION_DISTINCTNESS_UNPROVED`; fence/reconcile launched processes before any affected grant. Controller control grants cannot submit; monitor only redacted reads. Partial second launch fences first worker; unsupported identity/tool/permission/cancel/recovery fails preflight.
 - [ ] Run green existing Claude permission/identity/conformance regressions and commit.
 
+- [ ] Add the following implementation invariant at this task's owning seam, then complete every enumerated boundary fixture:
+
+```js
+const distinctness = proveDistinctness({ controller, workers, freshCreationEvidence });
+if (!distinctness.proved) throw new Error('APR_SESSION_DISTINCTNESS_UNPROVED');
+const tools = createRoleWrapper({ childBinding, brokerBinding, grant });
+// Wrapper-owned binding supplies credentials; child stdout never supplies authorization.
+```
+
 **Verification Commands:**
 
 ```sh
@@ -447,7 +610,6 @@
 
 Every worker has exact observed identity/distinctness and private tool binding; CLI never assigns controller participant role; claimed adapter support requires installed conformance.
 
-
 ### Task 10: Role Scopes, Context, and Submission Seals
 
 #### Story Intent
@@ -457,20 +619,25 @@
 - **Need:** Attribute exact payloads to bound roles and preserve immutable supplied context.
 - **Value or failure prevented:** Prevent reviewer edits, cross-role impersonation and collateral tampering.
 
-**Files:** Create `src/protocol/role-scope.mjs`, `submission.mjs`, `context-projection.mjs`, `test/integration/role-scope.test.mjs`, `submission-seals.test.mjs`. Modify `src/collateral/paths.mjs`, `src/broker/role-tools.mjs`, `src/providers/headless-contract.mjs`.
+#### Implementation Scope
 
-**Interfaces:** `buildRoleScope({run,role,fur,roots}):RoleScope`; `sealSubmission({request,grant,binding}):Promise<SubmissionReceipt>`; `materializeContext({sealedInputs,role,visibility}):Promise<ContextReceipt>`. Every critique/revision/resume/replacement handoff supplies exact absolute `submission_partition_path` / `shared_collateral_path`, schema/next action, reviewed snapshot digest; critique also complete used-ID context path/count/digest/ledger revision. Portable records omit absolute paths.
+**Files:** Create `src/protocol/role-scope.mjs`, `src/protocol/submission.mjs`, `src/protocol/context-projection.mjs`, `test/integration/role-scope.test.mjs`, `test/integration/submission-seals.test.mjs`. Modify `src/collateral/paths.mjs`, `src/broker/role-tools.mjs`, `src/providers/headless-contract.mjs`.
 
+**Interfaces:**
+
+- **Consumes:** Task9 verified role/session/tool binding, Task8 FUR lease, Task6 turn/response schemas and #30 sealed snapshot inputs through Task12.
+- **Produces:** `buildRoleScope({run,role,fur,roots}):RoleScope`; `sealSubmission({request,grant,binding}):Promise<SubmissionReceipt>`; `materializeContext({sealedInputs,role,visibility}):Promise<ContextReceipt>`. Every critique/revision/resume/replacement handoff supplies exact absolute `submission_partition_path` / `shared_collateral_path`, schema/next action, reviewed snapshot digest; critique also complete used-ID context path/count/digest/ledger revision. Portable records omit absolute paths.
+
 - [ ] Write red provider sandbox tests denying reviewer FUR,authority/private/raw-log,other-role staging,sibling context,symlink/hardlink/parent rename/delete escapes; own staging/shared/repository scoped read/permitted research succeed. Validation cache/artifact writes separately scoped.
 - [ ] Pin correctable scope rejection:
 
 ```js
-const before=f.authority.current();
-const rejected=await f.submit({...critique,response_path:f.sharedPath});
-assert.equal(rejected.error.code,'APR_SUBMISSION_SCOPE_INVALID');
-assert.deepEqual(f.authority.current(),before);
-assert.equal(rejected.next_action.tool,'submit_review_turn');
-assert.equal((await f.submit({...critique,response_path:f.reviewerPartitionFile})).ok,true);
+const before = f.authority.current();
+const rejected = await f.submit({ ...critique, response_path: f.sharedPath });
+assert.equal(rejected.error.code, 'APR_SUBMISSION_SCOPE_INVALID');
+assert.deepEqual(f.authority.current(), before);
+assert.equal(rejected.next_action.tool, 'submit_review_turn');
+assert.equal((await f.submit({ ...critique, response_path: f.reviewerPartitionFile })).ok, true);
 ```
 
 Task10 extends runFixture with exact granted partition paths/current submission methods; correction preserves phase/revision/round/grant after no mutation.
@@ -482,6 +649,15 @@
 - [ ] Verify sealed context before read-only projection; shared divergence yields nonblocking `APR_COLLATERAL_DIVERGED`,bad seal/projection blocks. Record supplied digests/retrievals/unknown access; default fresh reviewer independent context excludes prior responses,not strict repository blinding. External writes/uploads/install/destructive/wider filesystem actions require authority; permitted public read-only research needs no per-query consent.
 - [ ] Run green existing reviewer/communication regressions and commit.
 
+- [ ] Add the following implementation invariant at this task's owning seam, then complete every enumerated boundary fixture:
+
+```js
+const scope = buildRoleScope({ run, role, fur, roots });
+const receipt = await sealSubmission({ request, grant, binding });
+// sealSubmission rechecks scope, exact session, bytes and revision under the mutation lock.
+assert.equal(receipt.payloadDigest, request.response_digest);
+```
+
 **Verification Commands:**
 
 ```sh
@@ -501,19 +677,24 @@
 - **Need:** Keep stage-wide counters/ledger across interruptions and replacements.
 - **Value or failure prevented:** Prevent acceptance after final-round edit,author-only closure and fallback cap reset.
 
-**Files:** Create `src/protocol/run-reducer.mjs`, `findings.mjs`, `dispatch.mjs`, `fallback.mjs`, `schemas/run-event-v1.json`, `run-state-v1.json`, `test/unit/run-reducer.test.mjs`, `findings.test.mjs`, `test/integration/run-sequence.test.mjs`, `replacement-budget.test.mjs`. Modify `src/protocol/{events,service}.mjs`, `src/broker/worker.mjs`.
+#### Implementation Scope
 
-**Interfaces:** `reduceRun(events):RunState`; `admitCritique({run,stageAttempt,revision}):DispatchReceipt`; `admitRevision(...):DispatchReceipt`; `validateFindings({ledger,submission}):LedgerDelta`; `selectFallback({sealedRoster,currentCounterpart,usedCandidates,classification}):ReplacementIntent`. Ledger key `(run_id,requested_stage_id,finding_id)` spans replacements; new requested stages have separate ledgers.
+**Files:** Create `src/protocol/run-reducer.mjs`, `src/protocol/findings.mjs`, `src/protocol/dispatch.mjs`, `src/protocol/fallback.mjs`, `schemas/run-event-v1.json`, `schemas/run-state-v1.json`, `test/unit/run-reducer.test.mjs`, `test/unit/findings.test.mjs`, `test/integration/run-sequence.test.mjs`, `test/integration/replacement-budget.test.mjs`. Modify `src/protocol/events.mjs`, `src/protocol/service.mjs`, `src/broker/worker.mjs`.
 
+**Interfaces:**
+
+- **Consumes:** Task8 run journal/lease, Task9 role identity, Task10 sealed submission/context receipts, Task7 finite roster/caps, Task12 evidence verification before terminal acceptance.
+- **Produces:** `reduceRun(events):RunState`; `admitCritique({run,stageAttempt,revision}):DispatchReceipt`; `admitRevision({run,stageAttempt,revision}):DispatchReceipt`; `validateFindings({ledger,submission}):LedgerDelta`; `selectFallback({sealedRoster,currentCounterpart,usedCandidates,classification}):ReplacementIntent`. Ledger key `(run_id,requested_stage_id,finding_id)` spans replacements; new requested stages have separate ledgers.
+
 - [ ] Write red clean-last-round/final-revision,failed/interrupted critique,prelaunch no round,revision retries/exhaustion and no reset on resume/replacement/extend-cap tests; every requested later stage runs after earlier acceptance,none after exhaustion.
 - [ ] Pin fresh-pass rule:
 
 ```js
-await f.critique({verdict:'changes-required',findings:[finding],round:6});
-await f.revise({dispositions:[{finding_id:finding.finding_id,state:'addressed'}]});
-assert.equal(f.state().status,'intervention-required');
-assert.equal(f.state().accepted,false);
-assert.equal(f.dispatchedStageKinds().includes('xpr'),false);
+await f.critique({ verdict: 'changes-required', findings: [finding], round: 6 });
+await f.revise({ dispositions: [{ finding_id: finding.finding_id, state: 'addressed' }] });
+assert.equal(f.state().status, 'intervention-required');
+assert.equal(f.state().accepted, false);
+assert.equal(f.dispatchedStageKinds().includes('xpr'), false);
 ```
 
 Task11 extends runFixture with critique/revise/state/dispatchedStageKinds; finding comes from schema-valid api-contracts fixture.
@@ -526,6 +707,15 @@
 - [ ] Revision exhaustion retains receipts/fence/lease/checkpoint; no new revision in exhausted round. Replacement needs independent sealed quota proof or explicit authority, fresh critique consumes next round and gets fresh configured allowance. Extend-cap adds rounds only,never replacement/revision permission. Preserve compatible solo→author session reuse, fresh independent reviewers and recorded visibility/role transition. Later request new immutable linked run; multi-artifact phases remain distinct.
 - [ ] Run green and commit.
 
+- [ ] Add the following implementation invariant at this task's owning seam, then complete every enumerated boundary fixture:
+
+```js
+const delta = validateFindings({ ledger, submission });
+assert.equal(activeDispatch.round, submission.round);
+// The critique dispatch was admitted before provider invocation.
+// Apply validated delta atomically to that existing phase; do not dispatch another critique.
+```
+
 **Verification Commands:**
 
 ```sh
@@ -545,22 +735,27 @@
 - **Need:** Retain one mutable FUR with immutable responses/patches/anchors.
 - **Value or failure prevented:** Prevent patch collisions, lost dirty baselines and cache-dependent history.
 
-**Files:** #30 owns proposed `src/evidence/{snapshots,patches,envelopes,export,series}.mjs` and `schemas/{record,series-index,patch-chain,response-envelope}-v1.json` after adoption. #107 creates `src/protocol/evidence-port.mjs`, `src/startup/lineage.mjs`, `test/integration/run-evidence.test.mjs`, `portable-lineage.test.mjs`, `test/helpers/evidence-fixture.mjs`. Modify `src/collateral/review-record.mjs`/`src/protocol/record-lineage.mjs` at versioned seams. If #30 adopts different paths, update interface here; never implement parallel layout.
+#### Implementation Scope
 
-**Interfaces:** Shared API `snapshotBytes(bytes):Snapshot`; `createReversiblePatch(before,after):Patch`; `applyVerifiedPatch(anchor,patch,{direction}):Buffer`; `renderResponseEnvelope({payload,receiptRefs}):Envelope`; `verifyRecord(record):Verification`; `publishRecord({series,run,sealedInventory,operationId}):Promise<PublicationReceipt>`; `discoverSeries({repository,artifactPath}):Promise<Candidates>`; `publishSeriesIndex({expectedRevision,entry,operationId}):Promise<IndexReceipt>`. Exact IDs ai-peer-review.record/v1,series-index/v1,patch-chain/v1,response-envelope/v1,all prefixed.
+**Files:** #30 owns proposed `src/evidence/snapshots.mjs`, `src/evidence/patches.mjs`, `src/evidence/envelopes.mjs`, `src/evidence/export.mjs`, `src/evidence/series.mjs` and `schemas/record-v1.json`, `schemas/series-index-v1.json`, `schemas/patch-chain-v1.json`, `schemas/response-envelope-v1.json` after adoption. #107 creates `src/protocol/evidence-port.mjs`, `src/startup/lineage.mjs`, `test/integration/run-evidence.test.mjs`, `test/integration/portable-lineage.test.mjs`, `test/helpers/evidence-fixture.mjs`. Modify `src/collateral/review-record.mjs`/`src/protocol/record-lineage.mjs` at versioned seams. If #30 adopts different paths, update interface here; never implement parallel layout.
 
+**Interfaces:**
+
+- **Consumes:** Task5 #30 contract adoption, Task8 artifact/series locks, Task10 exact response payloads, Task11 stage/round/attempt identities and Task13 metrics receipts when available.
+- **Produces:** Shared API `snapshotBytes(bytes):Snapshot`; `createReversiblePatch(before,after):Patch`; `applyVerifiedPatch(anchor,patch,{direction}):Buffer`; `renderResponseEnvelope({payload,receiptRefs}):Envelope`; `verifyRecord(record):Verification`; `publishRecord({series,run,sealedInventory,operationId}):Promise<PublicationReceipt>`; `discoverSeries({repository,artifactPath}):Promise<Candidates>`; `publishSeriesIndex({expectedRevision,entry,operationId}):Promise<IndexReceipt>`. Exact IDs ai-peer-review.record/v1,series-index/v1,patch-chain/v1,response-envelope/v1,all prefixed.
+
 - [ ] Write red CRLF/no-newline/empty patch/dirty-new/binary-valid text fixtures; init/recovery/intervening delta; SAR→XPR/replacement collision-free changes; corrupt payload/receipt/patch/anchor; delimiter-like participant response text.
 - [ ] Pin cache-free cross-mode linkage:
 
 ```js
-const clone=await evidenceFixture(t,{transfer:'sidecar-records-only',localAuthority:false});
-const before=clone.furBytes();
-const p=await clone.preview(request); // omitted mode defaults frontmatter on Markdown
-assert.equal(p.series_id,clone.originalSeriesId);
-assert.deepEqual(clone.furBytes(),before);
-const r=await clone.start(request);
-assert.equal(r.series_id,clone.originalSeriesId);
-assert.equal(r.predecessor_run_id,clone.originalRunId);
+const clone = await evidenceFixture(t, { transfer: 'sidecar-records-only', localAuthority: false });
+const before = clone.furBytes();
+const p = await clone.preview(request); // omitted mode defaults frontmatter on Markdown
+assert.equal(p.series_id, clone.originalSeriesId);
+assert.deepEqual(clone.furBytes(), before);
+const r = await clone.start(request);
+assert.equal(r.series_id, clone.originalSeriesId);
+assert.equal(r.predecessor_run_id, clone.originalRunId);
 ```
 
 Fixture builds actual fresh clone and linked-worktree variants with canonical transferred index/records/anchor,no authority/cache. Add explicit frontmatter,reverse sidecar follow-up,ambiguous tips negatives.
@@ -573,6 +768,16 @@
 - [ ] After reservation lock/recheck,journal user initial bytes and bounded frontmatter merge once,preserve unrelated metadata,reversible init patch,round1 post-merge digest. Sidecar never writes FUR; cross-mode reuses existing series/predecessor,intervening drift captured. Index published only after terminal sealed record under series lock with idempotent operation; derivative cache rebuilt only after reservation. Export/imported history never resumes active authority or grants roles.
 - [ ] Run green no-commit/record regressions and commit through shared ownership.
 
+- [ ] Add the following implementation invariant at this task's owning seam, then complete every enumerated boundary fixture:
+
+```js
+const before = snapshotBytes(initialBytes);
+const after = snapshotBytes(revisedBytes);
+const patch = createReversiblePatch(before.bytes, after.bytes);
+assert.deepEqual(applyVerifiedPatch(after.bytes, patch, { direction: 'reverse' }), before.bytes);
+const envelope = renderResponseEnvelope({ payload, receiptRefs });
+```
+
 **Verification Commands:**
 
 ```sh
@@ -592,25 +797,43 @@
 - **Need:** Measure outside worker self-report with native provenance.
 - **Value or failure prevented:** Prevent missing telemetry as zero,bogus observed identity and unrelated-chat allocation.
 
+#### Implementation Scope
+
 **Ownership:** Existing #109; exclude this task from new-child hydration.
 
-**Files:** Create `src/telemetry/{measurements,receipts,provider-mapping,controller-binding,privacy}.mjs`, `schemas/{measurement,attempt-metrics,aggregate-coverage}-v1.json`, `test/unit/telemetry-measurements.test.mjs`, `test/integration/attempt-metrics.test.mjs`, `test/fixtures/telemetry-native.json`. Modify `src/providers/{claude-stream,codex-session}.mjs`, `src/broker/role-wrapper.mjs`, `src/protocol/dispatch.mjs`, `src/api/registry.mjs`.
+**Files:** Create `src/telemetry/measurements.mjs`, `src/telemetry/receipts.mjs`, `src/telemetry/provider-mapping.mjs`, `src/telemetry/controller-binding.mjs`, `src/telemetry/privacy.mjs`, `schemas/measurement-v1.json`, `schemas/attempt-metrics-v1.json`, `schemas/aggregate-coverage-v1.json`, `test/unit/telemetry-measurements.test.mjs`, `test/integration/attempt-metrics.test.mjs`, `test/fixtures/telemetry-native.json`. Modify `src/providers/claude-stream.mjs`, `src/providers/codex-session.mjs`, `src/broker/role-wrapper.mjs`, `src/protocol/dispatch.mjs`, `src/api/registry.mjs`.
 
-**Interfaces:** `allocateAttempt({operation,stageAttempt,round,role,owner}):AttemptId` durable before invocation; `mapProviderTelemetry({source,version,event,attempt}):Measurement[]`; `sealMetricsReceipt({attempt,observations,responseCreated}):Promise<Receipt>`; `observeController({binding,eventId,runAttribution}):ControllerObservation`. Measurement id/scope/epoch/delta-or-cumulative/value/unit/provenance/unavailable reason explicit. #30 packages receipt refs; #34 owns analysis vocabulary.
+**Interfaces:**
 
+- **Consumes:** Task8 operation IDs, Task11 admitted dispatch/round owner, Task9 verified observed identity and trusted worker wrapper; Task12 #30 receipt references.
+- **Produces:** `allocateAttempt({operation,stageAttempt,round,role,owner}):AttemptId` durable before invocation; `mapProviderTelemetry({source,version,event,attempt}):Measurement[]`; `sealMetricsReceipt({attempt,observations,responseCreated}):Promise<Receipt>`; `sealControllerReceipt({controllerBinding,eventId,runId,observations}):Promise<ControllerReceipt>`; `observeController({binding,eventId,runAttribution}):ControllerObservation`. Measurement id/scope/epoch/delta-or-cumulative/value/unit/provenance/unavailable reason explicit. #30 packages receipt refs; #34 owns analysis vocabulary.
+
 - [ ] Write red success/failure/timeout/interruption/no-response/crash,cache/reasoning/tool/auxiliary/unknown/malformed/conflicting native counters and controller dedup/unrelated chat tests.
 - [ ] Pin unknown controller measure:
 
 ```js
-const receipt=await sealMetricsReceipt({attempt,observations:[{
- id:'obs-controller-1',scope:'controller-run',value:null,unit:'tokens',
- provenance:'unavailable',reason:'not-exposed',source:'host-transport'
-}],responseCreated:false});
-assert.equal(receipt.observations[0].value,null);
-assert.equal(receipt.participantPayload,null);
+const receipt = await sealControllerReceipt({
+  controllerBinding,
+  eventId: 'host-event-1',
+  runId,
+  observations: [
+    {
+      id: 'obs-controller-1',
+      scope: 'controller-run',
+      value: null,
+      unit: 'tokens',
+      provenance: 'unavailable',
+      reason: 'not-exposed',
+      source: 'host-transport',
+    },
+  ],
+});
+assert.equal(receipt.observations[0].value, null);
+assert.equal(receipt.accountingKind, 'controller');
+assert.equal(Object.hasOwn(receipt, 'attempt_id'), false);
 ```
 
-A controller receipt uses its separate accounting binding rather than a fabricated worker attempt; test constructors distinguish that type.
+A controller receipt uses its separate verified host binding and event ID, never an allocated worker attempt. The test supplies a valid `controllerBinding` fixture plus `runId` from `runFixture`.
 
 - [ ] Run below red.
 - [ ] Capture at trusted launch/session/exit boundaries requested vs observed provider/model/effort/tier/aux models,UTC/monotonic wall/native API/total/queue duration,tokens/cache/reasoning/tool/web counts,cost/currency/basis/pricing,stop/terminal/retry/fallback/response-created. Native counters retained when inconsistent; no inferred ordinary input/reasoning/billed charges. Estimates need dated source/category/model/tier/assumptions; unknown prices unavailable.
@@ -619,6 +842,15 @@
 - [ ] Allowlist counters/units/enums/sanitized labels/opaque IDs. Exclude prompts/reasoning/tool args/results/URLs/credentials/raw handles/environment and hashes of secrets. Seal available normalized observations before raw logs deletion; ignored diagnostic logs access restricted/finite.
 - [ ] Run green and commit under #109.
 
+- [ ] Add the following implementation invariant at this task's owning seam, then complete every enumerated boundary fixture:
+
+```js
+const attemptId = allocateAttempt({ operation, stageAttempt, round, role, owner });
+const measurements = mapProviderTelemetry({ source, version, event, attempt: attemptId });
+await sealMetricsReceipt({ attempt: attemptId, observations: measurements, responseCreated });
+// Controller events call sealControllerReceipt, never allocateAttempt.
+```
+
 **Verification Commands:**
 
 ```sh
@@ -638,24 +870,29 @@
 - **Need:** Count once with reproducible as-of inputs.
 - **Value or failure prevented:** Prevent parent/child/cumulative overlap,self-referential digests and late verdict mutation.
 
+#### Implementation Scope
+
 **Ownership:** Existing #109; exclude this task from new-child hydration.
 
-**Files:** Create `src/telemetry/{aggregate,chain,amendments}.mjs`, `schemas/telemetry-amendment-v1.json`, `test/unit/telemetry-accounting.test.mjs`, `test/integration/telemetry-amendments.test.mjs`. Modify #30-owned `src/evidence/{series,export}.mjs` by agreed integration,`src/protocol/evidence-port.mjs`,`src/api/registry.mjs`.
+**Files:** Create `src/telemetry/aggregate.mjs`, `src/telemetry/chain.mjs`, `src/telemetry/amendments.mjs`, `schemas/telemetry-amendment-v1.json`, `test/unit/telemetry-accounting.test.mjs`, `test/integration/telemetry-amendments.test.mjs`. Modify #30-owned `src/evidence/series.mjs`, `src/evidence/export.mjs` by agreed integration,`src/protocol/evidence-port.mjs`,`src/api/registry.mjs`.
 
-**Interfaces:** `aggregateMetrics({observations,attempts,controller,partition}):AggregateViews`; `materializeChainView({tip,predecessors,indexRevision,amendments,asOf}):ChainView`; `publishAmendment({baseManifestDigest,corrections,priorAmendments,operationId}):Promise<AmendmentReceipt>`. Included/excluded IDs,basis/units/currency/known subtotal/missing scopes/complete total separate.
+**Interfaces:**
 
+- **Consumes:** Task13 idempotent observations/receipts, Task12 #30 immutable run/index/export, Task5 #34-neutral schema adoption.
+- **Produces:** `aggregateMetrics({observations,attempts,controller,partition}):AggregateViews`; `materializeChainView({tip,predecessors,indexRevision,amendments,asOf}):ChainView`; `publishAmendment({baseManifestDigest,corrections,priorAmendments,operationId}):Promise<AmendmentReceipt>`. Included/excluded IDs,basis/units/currency/known subtotal/missing scopes/complete total separate.
+
 - [ ] Write red inclusive parent/exclusive child,reasoning/output/cache overlap,aux models,cumulative reset/missing baseline,replay/supersession,partial/mixed coverage,continuous session,concurrent durations,currency/subscription/billing/privacy/chain cycles fixtures.
 - [ ] Pin missing amendment import:
 
 ```js
-const before=f.baseManifestDigest();
+const before = f.baseManifestDigest();
 await f.publishAmendment(correction);
-const clone=await f.cloneExport({omitReferencedAmendments:true});
-const current=await clone.currentMetrics();
-assert.equal(current.coverage.verifiable,false);
-assert.equal(current.completeTotal,null);
-assert.equal(clone.verdict(),'accepted');
-assert.equal(f.baseManifestDigest(),before);
+const clone = await f.cloneExport({ omitReferencedAmendments: true });
+const current = await clone.currentMetrics();
+assert.equal(current.coverage.verifiable, false);
+assert.equal(current.completeTotal, null);
+assert.equal(clone.verdict(), 'accepted');
+assert.equal(f.baseManifestDigest(), before);
 ```
 
 Task14 extends evidenceFixture with immutable publication/export/metrics methods and correction superseding a versioned observation.
@@ -667,6 +904,17 @@
 - [ ] Chain pins terminal tip/predecessor manifests/metrics/ordered amendments/index-as-of, rejects duplicate/cyclic/unverifiable input,count each run partition once not rollups. Embedded current-run/amendment uses local observation refs,no own metrics/enclosing manifest self-digest; post-seal derived view can pin all inputs. Legacy gaps incomplete.
 - [ ] Publish immutable amendments/R/A manifest/receipts/metrics referencing original digest/prior amendment/supersession,then ordered index reference under series lock; crash between steps pending operation replay publishes once. Missing referenced tree/corruption yields current incomplete/unverifiable,not superseded base-as-current; original verdict/as-of views unchanged. #34 scoring/outcome refs remain separate; run green/commit #109.
 
+- [ ] Add the following implementation invariant at this task's owning seam, then complete every enumerated boundary fixture:
+
+```js
+const views = aggregateMetrics({ observations, attempts, controller, partition });
+assert.equal(
+  views.combined.completeTotal,
+  views.combined.coverage.complete ? views.combined.knownSubtotal : null
+);
+await publishAmendment({ baseManifestDigest, corrections, priorAmendments, operationId });
+```
+
 **Verification Commands:**
 
 ```sh
@@ -677,7 +925,6 @@
 
 No duplicate observation accounting; missing controller/amendment/native semantics stays explicit; immutable verdict/base evidence and complete verified as-of views coexist.
 
-
 ### Task 15: Out-of-Band Monitoring and Observer Admission
 
 #### Story Intent
@@ -687,23 +934,31 @@
 - **Need:** Distinguish silence,stale observer,death and lost surface.
 - **Value or failure prevented:** Prevent invisible unauthorized work and misleading zero-token guarantees.
 
-**Files:** Create `src/monitor/{status,observer,liveness,render}.mjs`, `src/host/wait-capability.mjs`, `test/helpers/host-monitor-fixture.mjs`, `test/unit/liveness-clock.test.mjs`, `test/integration/monitor-admission.test.mjs`, `zero-turn-wait.test.mjs`. Modify `src/mcp/wait.mjs`, `src/transport/live-wait.mjs`, `src/protocol/run-reducer.mjs`, `src/api/registry.mjs`.
+#### Implementation Scope
 
-**Interfaces:** `observeRun({run,cursor,grant,host}):AsyncIterable<RedactedEvent>`; `verifyVisibleObserver(host):MonitorReceipt`; `setObserverHold({run,expectedRevision,receipt}):Promise<HoldReceipt>`; `tickLiveness({clock,observations,policy}):LivenessActions`; `renderMonitor(statusFixture):string`. Clock now/setTimeout/clearTimeout/epoch monotonic; UTC audit separate.
+**Files:** Create `src/monitor/status.mjs`, `src/monitor/observer.mjs`, `src/monitor/liveness.mjs`, `src/monitor/render.mjs`, `src/host/wait-capability.mjs`, `test/helpers/host-monitor-fixture.mjs`, `test/unit/liveness-clock.test.mjs`, `test/integration/monitor-admission.test.mjs`, `test/integration/zero-turn-wait.test.mjs`. Modify `src/mcp/wait.mjs`, `src/transport/live-wait.mjs`, `src/protocol/run-reducer.mjs`, `src/api/registry.mjs`.
 
+**Interfaces:**
+
+- **Consumes:** Task8 run/admission journal, Task11 dispatch state, Task14 accounting/as-of view and independently verified host surface/wait observations.
+- **Produces:** `observeRun({run,cursor,grant,host}):AsyncIterable<RedactedEvent>`; `verifyVisibleObserver(host):MonitorReceipt`; `setObserverHold({run,expectedRevision,receipt}):Promise<HoldReceipt>`; `tickLiveness({clock,observations,policy}):LivenessActions`; `renderMonitor(statusFixture):string`. Clock now/setTimeout/clearTimeout/epoch monotonic; UTC audit separate.
+
 - [ ] Write red exact fake-time warning60000,reconcile120000,stale after two missed15000 intervals,active-operation timeout1800000 tests; restart clock epoch reconciles deadlines without renewed budget. Quiet proved-live stays running; scheduler lateness diagnostic.
 - [ ] Pin observer-only hold:
 
 ```js
 await f.loseLastVisibleSurface();
-assert.equal(f.state().status,'running');
-assert.equal(f.state().fencing.active,false);
-assert.deepEqual(f.state().dispatch_admission,{held:true,
- reason_code:'awaiting-visible-observer',required_action:'reattach-visible-observer'});
-await f.finishAlreadyAdmittedWork();
-assert.equal(f.newDispatchCount(),0);
+assert.equal(f.state().status, 'running');
+assert.equal(f.state().fencing.active, false);
+assert.deepEqual(f.state().dispatch_admission, {
+  held: true,
+  reason_code: 'awaiting-visible-observer',
+  required_action: 'reattach-visible-observer',
+});
+await f.finishAlreadyAdmittedWork();
+assert.equal(f.newDispatchCount(), 0);
 await f.transportReconnect();
-assert.equal(f.state().dispatch_admission.held,true);
+assert.equal(f.state().dispatch_admission.held, true);
 ```
 
 hostMonitorFixture wraps runFixture with verified/detached/transport-only events and wait-renewal/model-wakeup counters.
@@ -715,6 +970,15 @@
 - [ ] Display controller/solo or controller/author/reviewer separately,elapsed/phase/stage/round/cap,quiet/health/provider/protocol/stale; structured registry fixture generates21400/16800/38200 known subtotal with controller identity/usage unknown/combined null. Monitor/status/export use same metrics/amendment revision,no independent envelope sum.
 - [ ] Disconnect detaches not cancels; repeated cursor no extra wake; unexpected periodic reentry invalidates advertised single-wakeup conformance. Record actual host reentries/controller overhead separately. Run green/commit.
 
+- [ ] Add the following implementation invariant at this task's owning seam, then complete every enumerated boundary fixture:
+
+```js
+const actions = tickLiveness({ clock, observations, policy });
+const surface = verifyVisibleObserver(host);
+await setObserverHold({ run, expectedRevision, receipt: surface });
+// Hold is journaled; status polling alone never clears it.
+```
+
 **Verification Commands:**
 
 ```sh
@@ -734,18 +998,23 @@
 - **Need:** Recover transport failures without bypassing protocol.
 - **Value or failure prevented:** Prevent divergent flags,exposed grants and large payload context injection.
 
-**Files:** Create `src/api/service.mjs`, `src/cli/json-input.mjs`, `test/integration/api-transport-parity.test.mjs`, `test/mcp/run-tools.test.mjs`, `docs/cli.md` if absent. Modify `src/mcp/server.mjs`, `src/cli/{parse,run,help-topics}.mjs`, `src/public-api.mjs`, `bin/{peer-review,peer-review-mcp}.mjs`, `skills/peer-review/SKILL.md`, `README.md`.
+#### Implementation Scope
 
-**Interfaces:** `dispatchApiOperation({name,request,transportBinding}):Promise<ResponseEnvelope>`; `parseJsonInput({inline,requestFile,cwd}):ParsedInput`; `createReviewMcpServer({registry,dispatch,hostAdapter}):McpServer`. Nine tools: start_review,preview_review,wait_for_review,get_review_status,intervene_review,submit_review_turn,get_peer_review_help,cleanup_brokers,reconcile_review_series; each takes one versioned object identical to CLI form.
+**Files:** Create `src/api/service.mjs`, `src/cli/json-input.mjs`, `test/integration/api-transport-parity.test.mjs`, `test/mcp/run-tools.test.mjs`, `docs/cli.md` if absent. Modify `src/mcp/server.mjs`, `src/cli/parse.mjs`, `src/cli/run.mjs`, `src/cli/help-topics.mjs`, `src/public-api.mjs`, `bin/peer-review.mjs`, `bin/peer-review-mcp.mjs`, `skills/peer-review/SKILL.md`, `README.md`.
 
+**Interfaces:**
+
+- **Consumes:** Task6 operation registry, Task8 start/preview, Task10 submissions, Task15 wait/status, Task17 intervention/cleanup/series reconcile. Unimplemented operations remain unavailable until their owning task passes.
+- **Produces:** `dispatchApiOperation({name,request,transportBinding}):Promise<ResponseEnvelope>`; `parseJsonInput({inline,requestFile,cwd}):ParsedInput`; `createReviewMcpServer({registry,dispatch,hostAdapter}):McpServer`. Nine tools: start_review,preview_review,wait_for_review,get_review_status,intervene_review,submit_review_turn,get_peer_review_help,cleanup_brokers,reconcile_review_series; each takes one versioned object identical to CLI form.
+
 - [ ] Write red inline/file/MCP parity for every operation,exact cross-transport lost-response replay,closed outputs/next actions and read-only no-broker behavior.
 - [ ] Pin fallback replay:
 
 ```js
-await f.mcpStart(request,{loseReceipt:true});
-const cli=await f.cli(['start','--request',f.savedRequestPath]);
-assert.equal(cli.run_id,f.onlyRunId());
-assert.equal(f.providerLaunchCount(),f.expectedRosterSize());
+await f.mcpStart(request, { loseReceipt: true });
+const cli = await f.cli(['start', '--request', f.savedRequestPath]);
+assert.equal(cli.run_id, f.onlyRunId());
+assert.equal(f.providerLaunchCount(), f.expectedRosterSize());
 ```
 
 Fixture runs actual public CLI process/MCP client with verified monitor and saved identical raw request.
@@ -756,6 +1025,14 @@
 - [ ] MCP unavailable/unconfigured/stale/disconnected/sandbox-blocked may fall back CLI; broker failure cannot bypass identity/phase/grant/fence/integrity or make controller author.
 - [ ] Installed skill: recognize intent,query help when uncertain,construct request,prefer MCP/fallback CLI,obey structured next actions. No policy catalog duplication; model examples are pinned offline fixtures,real installed admission separate. Keep explicit legacy facade until Task18 gate. Run green existing MCP/smoke/golden and commit.
 
+- [ ] Add the following implementation invariant at this task's owning seam, then complete every enumerated boundary fixture:
+
+```js
+const parsed = parseJsonInput({ inline, requestFile, cwd });
+const response = await dispatchApiOperation({ name, request: parsed.value, transportBinding });
+return response; // same envelope returned to CLI and MCP; binding is never serialized
+```
+
 **Verification Commands:**
 
 ```sh
@@ -778,21 +1055,26 @@
 - **Need:** Preserve failed verdicts,partial bytes and artifact ownership.
 - **Value or failure prevented:** Prevent stale-PID kills,unsafe lease release and unsupported cancellation claims.
 
-**Files:** Create `src/protocol/{intervention,recovery-obligations}.mjs`, `src/startup/series-reconcile.mjs`, `src/broker/{project-index,cleanup}.mjs`, `test/integration/{run-recovery,series-reconcile,project-cleanup}.test.mjs`. Modify `src/broker/{registry,service,ownership}.mjs`, `src/protocol/store.mjs`, `src/authority/verify.mjs`, `src/api/service.mjs`; preserve #117/#126 regression behavior.
+#### Implementation Scope
 
-**Interfaces:** `interveneRun({run,action,controllerGrant,authorizationReceipt}):Promise<ActionReceipt>`; `reconcileObligations({operation,evidenceRefs}):ObligationDelta`; `reconcileSeries(request):Promise<SeriesReceipt>`; `cleanupBrokers(request):Promise<CleanupEnvelope>`. Closed actions cancel,resume,replace-participant,extend-cap,reconcile-operation,resolve-checkpoint,acknowledge-unresolved; action_id/expected_revision/validated parameters and verified user authority/reason where required.
+**Files:** Create `src/protocol/intervention.mjs`, `src/protocol/recovery-obligations.mjs`, `src/startup/series-reconcile.mjs`, `src/broker/project-index.mjs`, `src/broker/cleanup.mjs`, `test/integration/run-recovery.test.mjs`, `test/integration/series-reconcile.test.mjs`, `test/integration/project-cleanup.test.mjs`. Modify `src/broker/registry.mjs`, `src/broker/service.mjs`, `src/broker/ownership.mjs`, `src/protocol/store.mjs`, `src/authority/verify.mjs`, `src/api/service.mjs`; preserve #117/#126 regression behavior.
 
+**Interfaces:**
+
+- **Consumes:** Task3 exact host/descendant termination receipts, Task8 locked run/lease/action authority, Task10/12 seals/patches, Task15 observer dimensions.
+- **Produces:** `interveneRun({run,action,controllerGrant,authorizationReceipt}):Promise<ActionReceipt>`; `reconcileObligations({operation,evidenceRefs}):ObligationDelta`; `reconcileSeries(request):Promise<SeriesReceipt>`; `cleanupBrokers(request):Promise<CleanupEnvelope>`. Closed actions cancel,resume,replace-participant,extend-cap,reconcile-operation,resolve-checkpoint,acknowledge-unresolved; action_id/expected_revision/validated parameters and verified user authority/reason where required.
+
 - [ ] Write red every action/replay/stale revision/authorization/unknown effects/checkpoint/series repair/cleanup case; fault each persisted discharge and never clear unknown obligations.
 - [ ] Pin failed recovery:
 
 ```js
-await f.acknowledgeUnresolved({reason:'termination unproved'});
-assert.equal(f.state().status,'failed');
-assert.equal(f.leaseHeld(),true);
+await f.acknowledgeUnresolved({ reason: 'termination unproved' });
+assert.equal(f.state().status, 'failed');
+assert.equal(f.leaseHeld(), true);
 await f.reconcileWithVerifiedHostRestart();
-assert.equal(f.state().status,'failed');
-assert.equal(f.pendingFilesystemCheckpoint(),true);
-assert.equal(f.leaseHeld(),true);
+assert.equal(f.state().status, 'failed');
+assert.equal(f.pendingFilesystemCheckpoint(), true);
+assert.equal(f.leaseHeld(), true);
 ```
 
 Task17 adds recovery methods whose evidence originates Task3 verified receipt,not operator assertion.
@@ -806,6 +1088,16 @@
 - [ ] Dry-run read-only; apply action_id replay safe and authenticated current instance/activity/fences recheck under ownership lock. Target physical/private protection verified before trusted credential read; credential/digest never output. Refuse active/recoverable/failed-fenced; removed/unreadable root without verified endpoint unreconciled,no forced PID stop. Stale lock/index never death authority.
 - [ ] Run green recovery/manual regressions and commit.
 
+- [ ] Add the following implementation invariant at this task's owning seam, then complete every enumerated boundary fixture:
+
+```js
+const delta = reconcileObligations({ operation, evidenceRefs });
+if (delta.outstandingObligations.length > 0) {
+  return { status: 'failed', leaseHeld: true, fencing: delta.outstandingObligations };
+}
+// Artifact checkpoint/effect obligations are reconciled separately before release.
+```
+
 **Verification Commands:**
 
 ```sh
@@ -825,27 +1117,49 @@
 - **Need:** Prove real provider/OS integration before retirement.
 - **Value or failure prevented:** Prevent mocks as feasibility evidence and unsafe legacy journal replay.
 
-**Files:** Create `test/live/installed-runtime-conformance.mjs`, `test/integration/runtime-migration.test.mjs`, `full-runtime-sequence.test.mjs`, `test/fixtures/release-gates.json`, `scripts/verify-portable-release.mjs`, `docs/releases/agent-first-portable-runtime.md`, `docs/provider-capabilities.md` if absent. Modify `.github/workflows/{ci,release}.yml`, `test/packaging/package.test.mjs`, `src/doctor.mjs`, `README.md`, `skills/peer-review/SKILL.md`.
+#### Implementation Scope
 
-**Interfaces:** `verifyPortableRelease({packageDigest,capabilityEvidence,contractAdoption,gates}):ReleaseReport`; conformance pins OS/Node/package/adapter/provider CLI/model/effort/role/topology/protection/identity/tool/containment/telemetry/recovery/evidence versions and unavailable reasons.
+**Files:** Create `test/live/installed-runtime-conformance.mjs`, `test/integration/runtime-migration.test.mjs`, `test/integration/full-runtime-sequence.test.mjs`, `test/fixtures/release-gates.json`, `scripts/verify-portable-release.mjs`, `docs/releases/agent-first-portable-runtime.md`, `docs/provider-capabilities.md` if absent. Modify `.github/workflows/ci.yml`, `.github/workflows/release.yml`, `test/packaging/package.test.mjs`, `src/doctor.mjs`, `README.md`, `skills/peer-review/SKILL.md`.
 
+**Interfaces:**
+
+- **Consumes:** All prior completed task APIs/fixtures, #30/#34/#102 adopted contracts, actual installed provider/OS capability reports and exact packed package digest.
+- **Produces:** `verifyPortableRelease({packageDigest,capabilityEvidence,contractAdoption,gates}):ReleaseReport`; conformance pins OS/Node/package/adapter/provider CLI/model/effort/role/topology/protection/identity/tool/containment/telemetry/recovery/evidence versions and unavailable reasons.
+
 - [ ] Write red all15-gates/adoption/capability completeness tests; missing/blocked installed evidence cannot render passed.
 - [ ] Pin release predicate:
 
 ```js
-assert.equal(report.requiredGateCount,15);
-assert.equal(report.complete,report.gates.every(g=>g.status==='passed')
- && report.contractConflicts.length===0
- && report.advertisedCapabilities.every(c=>c.installedConformance==='passed'));
+assert.equal(report.requiredGateCount, 15);
+assert.equal(
+  report.complete,
+  report.gates.every((g) => g.status === 'passed') &&
+    report.contractConflicts.length === 0 &&
+    report.advertisedCapabilities.every((c) => c.installedConformance === 'passed')
+);
 ```
 
 - [ ] Run focused migration/sequence tests below red.
 - [ ] Install actual tarball,fresh and linked worktrees; SAR,SPR,XPR,SAR→XPR no commits,exact clean pass/evidence reconstruction. Each advertised OS/provider/model/effort/role proves live installed launch/identity/private tool/scoped permissions/external telemetry/cancel/descendant/restart conformance. Missing prerequisite unavailable,never skipped-as-passed.
-- [ ] Consume reviewed #102 current runtime/Node/image and primary policy contracts; before Task5 amendment gate8 blocked,never old fallback implementation. Preserve original legacy terminal schemas/claims; active/fenced recovery/drain uses explicitly reviewed migration. v1/mixed/unknown new config rejects with prospective sources,no inferred turn cap.
+- [ ] Consume the actual jointly accepted Task5 runtime/Node/image and configuration-authority decision through #102-owned interfaces. Do not prescribe either design as the winner. Until amendment adoption, gate8 remains blocked and neither old-fallback routing nor policy-source override is implemented. Preserve original legacy terminal schemas/claims; active/fenced recovery/drain uses explicitly reviewed migration. v1/mixed/unknown new config rejects with prospective sources,no inferred turn cap.
 - [ ] Keep #106 explicit manual startup until installed cross-family author/reviewer replacement passes on EVERY advertised platform plus reviewed legacy recovery/config migration decision. Notes identify tested replacement,invocation changes,retained recovery and explicit config migration. No controller-as-author/uncertain same-worktree ownership.
 - [ ] Fault every reservation/launch/turn/seal/checkpoint/amendment/index/ownership transition and replay exact operation IDs; bad authority/payload/receipt/anchor returns bounded recovery,not seal.
 - [ ] Run complete appropriate suites,production audit and release verifier,record raw results/exact tarball digest. No publish/tag/deploy from this plan absent normal release authorization. Commit source/verification/docs.
 
+- [ ] Add the following implementation invariant at this task's owning seam, then complete every enumerated boundary fixture:
+
+```js
+const report = verifyPortableRelease({
+  packageDigest,
+  capabilityEvidence,
+  contractAdoption,
+  gates,
+});
+assert.equal(report.requiredGateCount, 15);
+assert.equal(report.contractConflicts.length, 0);
+assert.equal(report.complete, true);
+```
+
 **Verification Commands:**
 
 ```sh
@@ -871,23 +1185,23 @@
 
 `test/fixtures/release-gates.json` inventories all numbered gates and every concrete assertion in the spec's gate item. `verify-portable-release` refuses omissions/blocked status; these are required tests,not optional summaries.
 
-| Gate | Required fixture classes | Owning tasks/test suites | Dependency |
-| --- | --- | --- | --- |
-| 1 | canonical bytes/equivalent numeric/string forms,UTF-16/escapes/surrogates,duplicates/unknown keys,filepath distinction,concurrent replay/crash after every launch journal | 6/8/16 request-canonical/run-start/api-transport-parity | authenticated namespace |
-| 2 | cap final clean-vs-revision,replacement shared budget/finite counterpart policy,finding grammar/IDs/history/lineage/resolution corrections,revision exhaustion/reset negatives,Markdown literal negative fixtures | 6/7/11/17 findings/replacement-budget/api-help | registered sole grammar |
-| 3 | collateral/sealed context,CRLF/dirty/new/no-newline/empty reconstruction,collision-free changes,init/sidecar/fresh-clone/cross-mode linkage,no-response paths | 10/12 submission-seals/run-evidence/portable-lineage | #30 adoption |
-| 4 | enforced FUR/authority/cross-role/alias/parent denial,own/shared/research allowed,exact handoff paths,scope correction unchanged grant/round | 9/10 headless-role-tools/role-scope | installed sandbox |
-| 5 | same-root one broker/linked endpoints,HTTP token/Host/browser/slow/size,active/fenced/stale-PID cleanup,index atomicity/secret redaction | 1/2/17 broker-http/portable-ownership/project-cleanup | protection/ownership |
-| 6 | status tuples/exact clock thresholds,whole-run single wake/W-D reentry/unknown wait,usage fixture,preflight surface reject/fresh consent ID,observer hold/verified clear | 8/15/16 liveness-clock/monitor-admission/zero-turn-wait | verified host capability |
-| 7 | installed pure-JS closure,OS protection/role denial/descendant/real boot evidence,no required native build/download | 1–4/9/10/18 portable-installed-broker/live conformance | feasibility gate |
-| 8 | legacy original claims/recoverability/adopted routing/no overlap,new config migration/manual retention,all installed journeys/registry parity | 5/7/8/16/18 runtime-migration | **blocked #102/#107 spec conflict** |
-| 9 | headless no-commit submit/grants/replay/resume/collisions/distinctness,CLI telemetry gap distinct from fresh identity,secret-free pipes/forged traffic | 9–11/17 session-distinctness/headless-role-tools | exact session/private tools |
-| 10 | every attempt outcome/native conflicting counters/owners,controller exclusion/dedup/CLI provenance/worker-combined coverage | 13/14/15 attempt-metrics/telemetry-accounting | existing #109;#30/#34 adoption |
-| 11 | byte-offset extraction/tampered annotation,immutable amendment/replay-once | 12/14 run-evidence/telemetry-amendments | #30/#34 adoption |
-| 12 | partitions/resets/baselines/session/concurrency/currency/subscription/privacy,chain cycles/self-digests/reuse/legacy gaps,missing amendment/crash publication | 13/14 telemetry-accounting/telemetry-amendments | #30/#34 adoption |
-| 13 | every action/replay/failed obligations/checkpoint/series repair,verified same-host local reboot,broker/sleep/different host/unknown/remote negative proofs | 3/12/17 host-epoch/run-recovery/series-reconcile | installed positive termination |
-| 14 | lock-free/session-free preflight/no cache/credentials/conformance writes,review capability rejects/telemetry admits,reservation rechecks | 8/12/15 preview-readonly | physical/protection/portable lineage |
-| 15 | exact config precedence/profile-array/source pointers,bounds/defaults/model errors,SAR fallback,removed monitor key/no config consent | 5/7 config-v2/roster-resolution | **policy-source adoption blocked** |
+| Gate | Required fixture classes                                                                                                                                                                                          | Owning tasks/test suites                                | Dependency                           |
+| ---- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- | ------------------------------------ |
+| 1    | canonical bytes/equivalent numeric/string forms,UTF-16/escapes/surrogates,duplicates/unknown keys,filepath distinction,concurrent replay/crash after every launch journal                                         | 6/8/16 request-canonical/run-start/api-transport-parity | authenticated namespace              |
+| 2    | cap final clean-vs-revision,replacement shared budget/finite counterpart policy,finding grammar/IDs/history/lineage/resolution corrections,revision exhaustion/reset negatives,Markdown literal negative fixtures | 6/7/11/17 findings/replacement-budget/api-help          | registered sole grammar              |
+| 3    | collateral/sealed context,CRLF/dirty/new/no-newline/empty reconstruction,collision-free changes,init/sidecar/fresh-clone/cross-mode linkage,no-response paths                                                     | 10/12 submission-seals/run-evidence/portable-lineage    | #30 adoption                         |
+| 4    | enforced FUR/authority/cross-role/alias/parent denial,own/shared/research allowed,exact handoff paths,scope correction unchanged grant/round                                                                      | 9/10 headless-role-tools/role-scope                     | installed sandbox                    |
+| 5    | same-root one broker/linked endpoints,HTTP token/Host/browser/slow/size,active/fenced/stale-PID cleanup,index atomicity/secret redaction                                                                          | 1/2/17 broker-http/portable-ownership/project-cleanup   | protection/ownership                 |
+| 6    | status tuples/exact clock thresholds,whole-run single wake/W-D reentry/unknown wait,usage fixture,preflight surface reject/fresh consent ID,observer hold/verified clear                                          | 8/15/16 liveness-clock/monitor-admission/zero-turn-wait | verified host capability             |
+| 7    | installed pure-JS closure,OS protection/role denial/descendant/real boot evidence,no required native build/download                                                                                               | 1–4/9/10/18 portable-installed-broker/live conformance  | feasibility gate                     |
+| 8    | legacy original claims/recoverability/adopted routing/no overlap,new config migration/manual retention,all installed journeys/registry parity                                                                     | 5/7/8/16/18 runtime-migration                           | **blocked #102/#107 spec conflict**  |
+| 9    | headless no-commit submit/grants/replay/resume/collisions/distinctness,CLI telemetry gap distinct from fresh identity,secret-free pipes/forged traffic                                                            | 9–11/17 session-distinctness/headless-role-tools        | exact session/private tools          |
+| 10   | every attempt outcome/native conflicting counters/owners,controller exclusion/dedup/CLI provenance/worker-combined coverage                                                                                       | 13/14/15 attempt-metrics/telemetry-accounting           | existing #109;#30/#34 adoption       |
+| 11   | byte-offset extraction/tampered annotation,immutable amendment/replay-once                                                                                                                                        | 12/14 run-evidence/telemetry-amendments                 | #30/#34 adoption                     |
+| 12   | partitions/resets/baselines/session/concurrency/currency/subscription/privacy,chain cycles/self-digests/reuse/legacy gaps,missing amendment/crash publication                                                     | 13/14 telemetry-accounting/telemetry-amendments         | #30/#34 adoption                     |
+| 13   | every action/replay/failed obligations/checkpoint/series repair,verified same-host local reboot,broker/sleep/different host/unknown/remote negative proofs                                                        | 3/12/17 host-epoch/run-recovery/series-reconcile        | installed positive termination       |
+| 14   | lock-free/session-free preflight/no cache/credentials/conformance writes,review capability rejects/telemetry admits,reservation rechecks                                                                          | 8/12/15 preview-readonly                                | physical/protection/portable lineage |
+| 15   | exact config precedence/profile-array/source pointers,bounds/defaults/model errors,SAR fallback,removed monitor key/no config consent                                                                             | 5/7 config-v2/roster-resolution                         | **policy-source adoption blocked**   |
 
 Section coverage: Review Model/Journeys/Sequences→8/9/11/16/18; Canonical Request/Errors/Self-Discovery→6/8/16; Resolution/Config/Fallback→7/11; Identity/Grants→9/10; Round/Findings/Visibility→10/11/12; Storage/FUR/Evidence/Series→2/8/10/12/17; Metrics/Privacy→existing #109 Tasks13/14; Permissions/Research→9/10 installed conformance; Broker/Disconnect/Recovery/Cleanup→1–4/15/17; Migration/Gaps/Ownership→5/18. Downstream #31/32/33/34 consume truth/context/outcome references,not authority or runtime-defined scoring.
 
@@ -898,4 +1212,3 @@
 Plan acceptance means actionable decomposition with honest blockers,not that product gates already passed. Freeze final formatted bytes before acceptance digest. SAR is manually orchestrated single-worker critique/revision; XPR has separate reviewer. Controller hydrates #107 only after both requested stages accept exact plan bytes. Implementation still requires separately governed Plan approval and Task5 resolution.
 
 Recommended later execution is subagent-driven development because security/provider/evidence/telemetry boundaries each merit a fresh review. Drafting this plan authorizes no implementation or issue creation.
-
```
