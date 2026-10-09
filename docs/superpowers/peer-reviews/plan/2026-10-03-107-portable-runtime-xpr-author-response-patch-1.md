# XPR Round 1 Actual Unified Patch

The diff below was produced by diff -u from exact before/after snapshots. Exit1 means the files differ. Formatting changes are included; no reconstructed patch is substituted.

~~~~diff
--- docs/superpowers/peer-reviews/plan/2026-10-03-107-portable-runtime-xpr-author-response-snapshot-before-1.md	2026-10-03 12:19:27
+++ docs/superpowers/peer-reviews/plan/2026-10-03-107-portable-runtime-xpr-author-response-snapshot-after-1.md	2026-10-03 12:29:41
@@ -4,7 +4,7 @@
 
 **Goal:** Deliver #107's complete controller-only SAR/SPR/XPR API and portable supervised runtime with exact evidence, bounded recovery, and honest telemetry.
 
-**Architecture:** Evolve the append-only integrity and identity core; replace synchronous native IPC with asynchronous authenticated loopback HTTP first. Add versioned run/stage/round authority, headless role wrappers, shared #30 evidence, existing #109 telemetry, and one registry driving CLI/MCP. Public activation and conflicting configuration/migration contracts remain blocked on separately reviewed #102/#107 reconciliation.
+**Architecture:** Evolve the append-only integrity and identity core; replace synchronous native IPC with asynchronous authenticated loopback HTTP first. Add versioned run/stage/round authority, headless role wrappers, shared #30 evidence, existing #109 telemetry, and one registry driving CLI/MCP. Conflicting run/configuration/migration activation remains blocked on separately reviewed #102/#107 reconciliation.
 
 **Tech Stack:** Node.js >=24 and built-in HTTP/crypto/filesystem/process APIs; existing MCP SDK/Zod after production audit; Node test runner; Ubuntu/macOS/Windows on Node24/26/current.
 
@@ -59,13 +59,13 @@
 | Policy          | User/project `.ai-peer-review.json` layered precedence/profile merge        | Activated primary `.ai-peer-review/config.json` exclusively owns project policy; user host bindings classified field by field | Targeted specification review before config integration/schema freeze |
 | Legacy recovery | Resume old active reviews under retained installation                       | Unsupported old formats read-only/fenced after upgrade                                                                        | Explicit reviewed drain/recovery decision; no silent reinterpretation |
 
-Task5 prepares that review; it chooses neither winner. Portable transport/protection/audit can proceed behind non-public boundaries. Tasks7/8/18 conflicting integration and gates8/15 remain blocked until adopted amendment and repeat plan review. Global installation selection does not create a machine-wide broker.
+Task5 prepares that review; it chooses neither winner. Tasks1/2/4 may ship independently of Task5 after the portable parity predicate below passes; Task3 governs additional epoch/descendant claims, not native-addon removal. Tasks7/8/18 conflicting integration and gates8/15 remain blocked until adopted amendment and repeat plan review. Global installation selection does not create a machine-wide broker.
 
 Issue #30 owns shared `ai-peer-review.record/v1`, `series-index/v1`, `patch-chain/v1`, `response-envelope/v1` implementation/migration; #107 consumes them. Existing #109 (Ready for Planning) owns Tasks13/14 telemetry; never create a duplicate child. #34 owns outcome labels/scoring/experiments and adopts neutral telemetry contracts. #31/#32/#33 own projection/retrieval/escape analysis, not runtime authority. #102/#132–137 own runtime resolution; do not duplicate. Preserve explicit #106 manual startup until installed replacement and reviewed migration gates permit retirement.
 
 Hydration follows both requested clean plan acceptances. Update stale #107 broker-free/manual scope only then. Numbered Tasks13/14 are explicitly existing-issue work: a hydration proposal must exclude/reuse them manually; there is no blind bulk split confirmation. Parent-only hydration is valid while decomposition awaits review.
 
-Order: Tasks1–4 portable foundation first; Task5 contract review gates public activation; 6/7 isolated registry/resolver; 8 reservation; 9/10 workers/scopes; 11 rounds/findings; 12 #30 evidence; 13/14 #109 metrics; 15/16 monitor/API; 17 recovery; 18 installed release. Each task has its own red/green cycle and independently reviewable deliverable.
+Order: Tasks1/2/4 deliver the urgent portable broker; Task3 develops independent containment/epoch conformance; Task5 gates conflicting public activation; 6 isolated registry and 7 resolver after adoption; 8 reservation; 9/10 workers/scopes; 11 rounds/findings; 12 #30 evidence; 13/14 #109 metrics; 15/16 monitor/API; 17 recovery; 18 installed release. Each task has its own red/green cycle and independently reviewable deliverable.
 
 ## File and Interface Map
 
@@ -77,13 +77,13 @@
 
 Task6 creates `src/api/contracts.mjs` with JSDoc typedefs tied to the registered JSON schemas; no second validator. `ResponseEnvelope` is the closed ai-peer-review.response/v1 shape: schema/ok/mutation_occurred/retry_safe/next_action plus bounded error or run/status/revision/cursor/evidence/capability dimensions. `EventEnvelope` adds durable cursor/revision and redacted projection. `ValidatedOperation` is {value,input_validation:{duplicate_keys:"checked"|"not-observable"}}. `ParsedInput` is {value,rawText,inputValidation}; `HelpEnvelope` is its registered help result. Paths and provider/session handles are private typed authority values, not arbitrary caller strings.
 
-Task2 defines `ProtectionReceipt` {verified,source,version,canonicalRoot,principal,assurance,reason}; `Owner` {instanceId,publish,verify,release}; `ReleaseReceipt` {released,outstandingObligations}. Task3 defines `TerminationResult` {quiescent,provedObligations,outstandingObligations,evidenceRefs}; launch epoch observations include execution_host_id,boot_epoch,source/version/assurance; unknown epoch is null/reason. Task7 defines `ConfigV2` from config/v2, and `SealedRoster` {initial,allowedKinds,cascades,eligibility,caps,sources,scope,visibility}. Task8 defines `Reservation` {runId,requestDigest,artifactLease,revision,operationIds,adoptedRuntimeBinding}; StartReceipt/PreviewEnvelope are operation-specific ResponseEnvelope variants. ReplayResult is existing/conflict/absent with durable receipt; runtime binding retains exact adopted package/Node/installation/authority/adapter identities and private locator.
+Task2 defines `ElectionLease` {contenderId,ticket,held,release}; its winner is held across the complete owner lifecycle, not just file creation. Task2 defines `ProtectionReceipt` {verified,source,version,canonicalRoot,principal,assurance,reason}; `Owner` {instanceId,publish,verify,release}; `ReleaseReceipt` {released,outstandingObligations}. Task3 defines `TerminationResult` {quiescent,provedObligations,outstandingObligations,evidenceRefs}; launch epoch observations include execution_host_id,boot_epoch,source/version/assurance; unknown epoch is null/reason. Task7 defines `ConfigV2` from config/v2, and `SealedRoster` {initial,allowedKinds,cascades,eligibility,caps,sources,scope,visibility}. Task8 defines `Reservation` {runId,requestDigest,artifactLease,revision,operationIds,adoptedRuntimeBinding}; StartReceipt/PreviewEnvelope are operation-specific ResponseEnvelope variants. ReplayResult is existing/conflict/absent with durable receipt; runtime binding retains exact adopted package/Node/installation/authority/adapter identities and private locator.
 
 Task9 defines `LaunchObservation`/`IdentityObservation` from verified exact-session source/version/assurance with requested identity separate; `DistinctnessReceipt` {proved,evidenceRefs,reason}; `RoleToolConnection` owns private stdio capability/revoke lifecycle. Task10 defines `RoleScope` {fur,ownPartition,shared,context,deniedRoots,role}; `SubmissionReceipt` {actionId,payloadDigest,reviewedDigest,role,revision,sealRef}; `ContextReceipt` {suppliedInputs,projectionDigests,visibility,observedRetrievals}. Task11 `RunState` is run-state/v1; `DispatchReceipt` {operationId,attemptId,requestedStageId,stageAttemptId,round,phase,revision}; `LedgerDelta` is validated immutable findings/resolutions; `ReplacementIntent` names selected sealed candidate/class and required reconciliation.
 
 Task12's Snapshot/Patch/Envelope/Verification/PublicationReceipt/Candidates/IndexReceipt come from #30's adopted four schemas and shared API; do not define competing shapes. Task13 `Measurement` is measurement/v1; AttemptId is opaque durable invocation ID; Receipt is attempt-metrics/v1; ControllerReceipt has controller binding/event/run IDs and measurement references with accountingKind=controller and no worker attempt_id. Task14 AggregateViews/ChainView/AmendmentReceipt are neutral coverage and amendment contracts adopted by #30/#34; include referenced IDs,accounting basis,coverage and as-of revision. Task15 MonitorReceipt/HoldReceipt/LivenessActions carry verified host surface/cursor and exact orthogonal dimensions; Task17 ActionReceipt/ObligationDelta/SeriesReceipt/CleanupEnvelope use their registered closed operation schemas; Task18 ReleaseReport contains exact15 gate results,contract conflicts and installed capability matrix.
 
-Every task's Interfaces block is its produced API; its named arguments are consumed contracts from the defining tasks above. Fixture helpers are test-only, built in the owning task, and must reproduce the behavior of actual production APIs rather than alter semantics to satisfy assertions. Tests use exact registered defaults and stable fixture IDs. Public activation respects Tasks5/8 adoption. Test commands referencing a later helper are explicitly integration runs after that dependency exists; they are not claimed runnable against today's unchanged source.
+Every task's Interfaces block is its produced API; its named arguments are consumed contracts from the defining tasks above. Fixture helpers are test-only, built in the owning task, and must reproduce the behavior of actual production APIs rather than alter semantics to satisfy assertions. Tests use exact registered defaults and stable fixture IDs. Conflicting run/configuration activation respects Tasks5/8 adoption; the bounded Tasks1/2/4 broker milestone is separately permitted. Test commands referencing a later helper are explicitly integration runs after that dependency exists; they are not claimed runnable against today's unchanged source.
 
 ### Task 1: Async Authenticated HTTP Transport
 
@@ -101,7 +101,7 @@
 **Interfaces:**
 
 - **Consumes:** Task2's verified owner/endpoint binding and private storage receipt; dispatch is an authenticated asynchronous handler injected by the broker service. Task1's tests inject bindings until Task2 is implemented.
-- **Produces:** Consumes verified instance/worktree binding and trusted credential/grant. Produces `createLoopbackServer({binding,authenticate,dispatch,clock}):Promise<{port,close():Promise<void>}>`, `requestLoopback({endpoint,privateBinding,operation,body,signal}):Promise<ResponseEnvelope>`, `waitLoopback({...request,afterCursor}):AsyncIterable<EventEnvelope>`. Fixture returns `request/rawSocket/clock/flush/dispatchCalls`.
+- **Produces:** `createLoopbackServer({binding,authenticate,dispatch,clock}):Promise<{port,close():Promise<void>}>`, `requestLoopback({endpoint,privateBinding,operation,body,signal}):Promise<ResponseEnvelope>`, `waitLoopback({...request,afterCursor}):AsyncIterable<EventEnvelope>`. Fixture returns `request/rawSocket/clock/flush/dispatchCalls`.
 
 - [ ] Write failing raw HTTP tests for missing/duplicate Host, wrong literal127.0.0.1/port, absolute targets, Origin/Sec-Fetch, upgrade, wrong credential/instance/worktree, oversized headers/body, truncated UTF-8/JSON, 10-second receipt/5-second idle and auth-before-body interpretation.
 - [ ] Add concurrent status test:
@@ -111,12 +111,14 @@
 const slow = await f.rawSocket();
 slow.write('POST /rpc HTTP/1.1\r\nHost: ');
 assert.equal((await f.request({ operation: 'status', body: {} })).ok, true);
-f.clock.advance(10_000);
+f.clock.advance(5_000);
 await f.flush();
 assert.equal(slow.destroyed, true);
 ```
 
 - [ ] Run focused command below red; failure must be missing contract behavior, not broken setup.
+- [ ] Implement injected monotonic per-socket timers from connection acceptance: unauthenticated idle closes after5000ms without received bytes, with its idle clock reset by received bytes; incomplete header/body receipt closes no later than10000ms from that receipt's start. The absolute receipt deadline cannot be renewed by byte drips. Node HTTP timeouts are defense in depth: default connectionsCheckingInterval=30000ms cannot establish these bounds. Cancel idle after successful authentication and receipt timer after complete validation; authenticated wait streaming has its own lifetime. Add real-clock tests with explicit <=250ms scheduler tolerance on an unloaded runner alongside fake-clock tests; late clocks fail or report inconclusive, never weaken bounds.
+- [ ] Bound accepted sockets to256 and pending unauthenticated sockets to128, preserving control capacity; reject unauthenticated excess immediately. Test64 simultaneous slow sockets while authenticated status/cancel completes within1000ms, exhaustion recovery and cleanup. Document these admission limits.
 - [ ] Implement `http.createServer({maxHeaderSize:16384})`/`listen(0,'127.0.0.1')`, raw header counting, exact target policy and constant-time equal-length authentication before body parsing. Set receipt/idle deadlines; body/event frame <=1MiB; disable logging/CORS; reject upgrades.
 - [ ] Await startup/request/dispatch/drains/close at every service/client/bin seam. Wait lifetime survives receipt timeout; waits hold no mutation lock. Once mutation bytes may be sent, return delivery uncertainty/action ID, never blindly relaunch.
 - [ ] Run green and legacy IPC/readiness regressions; commit only source/tests.
@@ -144,7 +146,7 @@
 
 #### Acceptance Criteria
 
-Authenticated requests remain responsive during malformed/slow traffic; all exact wire bounds apply; legacy adapter remains explicit; no native fallback in portable path.
+Authenticated requests remain responsive during64 slow sockets; injected and real clocks prove exact bounds. Task1 binding injection stays test-only: production cannot publish/listen before Task2 verified protection/ownership. Legacy adapter remains explicit during development; no native fallback in portable path.
 
 ### Task 2: Protected Storage and Exclusive Ownership
 
@@ -157,12 +159,12 @@
 
 #### Implementation Scope
 
-**Files:** Create `src/broker/storage-protection.mjs`, `src/broker/portable-ownership.mjs`, `src/broker/portable-paths.mjs`, `test/unit/storage-protection.test.mjs`, `test/integration/portable-ownership.test.mjs`. Modify `src/broker/platform.mjs`, `src/broker/ownership.mjs`, `src/broker/paths.mjs`, `src/broker/identity.mjs`.
+**Files:** Create `src/broker/storage-protection.mjs`, `src/broker/portable-ownership.mjs`, `src/broker/ownership-election.mjs`, `src/broker/portable-paths.mjs`, `test/unit/storage-protection.test.mjs`, `test/integration/portable-ownership.test.mjs`. Modify `src/broker/platform.mjs`, `src/broker/ownership.mjs`, `src/broker/paths.mjs`, `src/broker/identity.mjs`.
 
 **Interfaces:**
 
-- **Consumes:** Physical worktree identity from existing broker identity, OS protection adapter, Task17's evidence-backed stale-owner reconciliation callback; unresolved stale ownership refuses before Task17 exists.
-- **Produces:** Consumes physical roots and OS observation adapter. Produces read-only `observeStorageProtection({root,osAdapter}):Promise<ProtectionReceipt>`; setup-only `provisionProtectedRoot({root,osAdapter}):Promise<ProtectionReceipt>`; `acquirePortableOwner({worktree,paths,reconcile,protection}):Promise<Owner>` with async `publish/verify/release` and source/version/principal/ACL/assurance receipts.
+- **Consumes:** Physical worktree identity from existing broker identity, OS protection adapter, existing observeProcessIdentity and authenticated endpoint probe; Task2 owns broker-death/reclaim proof and registry reconciliation. Task17 later adds run/provider-obligation discharge, not basic broker-only stale recovery.
+- **Produces:** read-only `observeStorageProtection({root,osAdapter}):Promise<ProtectionReceipt>`; setup-only `provisionProtectedRoot({root,osAdapter}):Promise<ProtectionReceipt>`; `acquireOwnerElection({paths,contenderIdentity,observeProcessIdentity}):Promise<ElectionLease>` and `acquirePortableOwner({worktree,paths,reconcile,protection}):Promise<Owner>` with async `publish/verify/release` and source/version/principal/ACL/assurance receipts.
 
 - [ ] Write failing concurrent same-worktree/linked-worktree ownership, stale lock/no death proof, owner substitution, flush/rename crash, symlink/hardlink/parent replacement/overlapping roots tests.
 - [ ] Add actual effective-rights condition:
@@ -183,8 +185,8 @@
 `windowsFixture` is a Task2 test adapter emitting real ACL-shaped observations, not deriving ACL proof from mode.
 
 - [ ] Run command below red.
-- [ ] Implement POSIX owner/mode/type checks and Windows effective ACL projection through fixed OS PowerShell `Get-Acl -LiteralPath` arguments. Verify owner SID, explicit/inherited rules, inheritance protection and effective foreign access; setup may apply documented user-only DACL/trusted system allowances, then reread. Reject unknown/reparse state; no custom binaries/downloads.
-- [ ] Exclusive `'wx'` creation, flush, atomic rename and held owner descriptors; lstat/realpath/link-count/parent identity rechecks, O_NOFOLLOW where supported. Reclaim only proved owner death under lock; no timeout deletion.
+- [ ] Implement POSIX owner/mode/type plus macOS extended ACL enumeration/effective-rights verification through fixed stock OS probes; mode0600 cannot override a foreign ACL grant. Windows uses fixed System32 WindowsPowerShell and structured Get-Acl -LiteralPath arguments, no PATH lookup/interpolation. Current user SID is the data principal; SYSTEM and BUILTIN\\Administrators are documented trusted system allowances only when recorded and justified. Elevated-created owner may be Administrators when current user membership and effective rights are verified; owner-SID equality alone is insufficient. Reject other effective readers/writers, unknown deny/allow ordering, unprotected inheritance or reparse/alias state. Setup applies documented protected DACL then rereads; startup fully verifies ACL. Every write rechecks owner/type/link-count/parent/file identity against receipt; changed identity/ACL invalidates it and requires full observation. Test real elevated/non-elevated Windows creation and foreign explicit/inherited ACE, plus actual macOS foreign ACL grant/clear. Security-descriptor changes by the trusted account are outside the foreign-account threat boundary; do not claim cheap inode checks alone detect every ACL edit. No mode-derived ACL assurance.
+- [ ] Implement portable durable contender arbitration before any shared owner-path mutation: unique protected slots, atomic choosing/number publications, Lamport bakery order (ticket,contenderId), waiting for earlier live/choosing contenders, and a winning slot held through creation/reclaim/release. Publish choosing before directory scans; read coherent ticket states. All initial claimers/reclaimers use this same election. Ignore crashed contenders only on positively verified exact process death; unknown blocks. No TTL or recursive stale-reclaim lock. Inside the winning transaction reread owner bytes/generation, prove broker PID/start identity dead, authenticate reachable endpoint and reconcile registry plus known active/provider obligations before quarantine and exclusive wx replacement. Endpoint silence never proves death; unknown/fenced provider effects refuse replacement. Retain exact stale bytes/receipt and descriptor/parent checks. Rename alone is not compare-and-swap: a second reclaimer must never move a newly published owner. Test two reclaimers plus live newcomer, choosing/broker/quarantine-before-create crashes, restart and owner substitution; prove one owner and no stolen live generation.
 - [ ] Random32-byte credential in `.scratch/peer-review/private/`; endpoint `runtime/endpoint.json` includes fingerprint/instance/port/digest/heartbeat, never secret. Redact credential digest from tooling too. Publish after ownership/recovery; verify roots at each write.
 - [ ] Run green on all target OS jobs; commit.
 
@@ -193,10 +195,12 @@
 ```js
 const receipt = await observeStorageProtection({ root: paths.privateRoot, osAdapter });
 if (!receipt.verified) throw new Error('effective-user-protection-unproved');
+const election = await acquireOwnerElection({ paths, contenderIdentity, observeProcessIdentity });
+// Election remains held for all owner-path mutation and owned cleanup.
 const ownerFile = await fs.open(paths.lock, 'wx', 0o600);
 await ownerFile.writeFile(JSON.stringify(ownerProof));
 await ownerFile.sync();
-// Keep ownerFile open; reclamation and publication require the exact owner transaction.
+// Keep ownerFile and the winning contender slot held until release.
 ```
 
 **Verification Commands:**
@@ -207,7 +211,7 @@
 
 #### Acceptance Criteria
 
-One broker owns one physical worktree; linked roots get distinct ephemeral ports; unsafe ACL/alias/owner observations fail closed with setup guidance.
+One broker owns one physical worktree, including competing stale reclaimers. Broker-only crash recovery works before Task17; live/unknown/provider-fenced ownership remains protected. Linked roots get distinct ports; actual Windows/macOS effective ACL and alias observations fail closed.
 
 ### Task 3: Genuine Host Epoch and Descendant Termination
 
@@ -220,12 +224,12 @@
 
 #### Implementation Scope
 
-**Files:** Create `src/providers/containment.mjs`, `src/protocol/host-epoch.mjs`, `test/helpers/descendant-writer.mjs`, `test/unit/host-epoch.test.mjs`, `test/integration/provider-containment.test.mjs`, `test/live/host-epoch-conformance.mjs`. Modify `src/providers/process-lifetime.mjs`, `src/providers/conformance.mjs` and `src/protocol/process-identity.mjs`.
+**Files:** Create `src/providers/containment.mjs`, `src/protocol/host-epoch.mjs`, `test/helpers/descendant-writer.mjs`, `test/unit/host-epoch.test.mjs`, `test/integration/provider-containment.test.mjs`, `test/live/host-epoch-conformance.mjs`, `schemas/host-epoch-evidence-v1.json`, `schemas/conformance-run-binding-v1.json`. Modify `src/providers/process-lifetime.mjs`, `src/providers/conformance.mjs` and `src/protocol/process-identity.mjs`.
 
 **Interfaces:**
 
 - **Consumes:** Exact process observations from process-identity, provider conformance capability and protected installation key from Task2.
-- **Produces:** Produces `observeExecutionHost({osAdapter,privateKey}):Promise<{execution_host_id,boot_epoch,source,version,assurance}>`; `containProvider({launch,capability}):Promise<{scope,observe,cancel,terminationReceipt}>`; `verifyTermination({sealedScope,launchEpoch,freshObservation,processEvidence}):TerminationResult`. Scope inventories local/remote writer bounds; proved/outstanding obligations stay separate.
+- **Produces:** `observeExecutionHost({osAdapter,privateKey}):Promise<{execution_host_id,boot_epoch,source,version,assurance}>`; `containProvider({launch,capability}):Promise<{scope,observe,cancel,terminationReceipt}>`; `verifyTermination({sealedScope,launchEpoch,freshObservation,processEvidence}):TerminationResult`. Scope inventories local/remote writer bounds; proved/outstanding obligations stay separate.
 
 - [ ] Write red direct-child-dead/grandchild-live, escaped process group/session, PID reuse, broker restart, sleep/resume, changed host, unknown launch epoch, remote job and failed cancel tests.
 - [ ] Pin negative reboot proof:
@@ -245,9 +249,9 @@
 ```
 
 - [ ] Run command below red.
-- [ ] Extend existing OS probes into versioned genuine boot observations: Linux kernel boot ID/protected host identity; macOS full-precision actual OS boot source; Windows documented OS boot source with Fast Startup limits. HMAC raw identifiers privately. No os.uptime estimate, broker ID or retrospective epoch.
+- [ ] Separate PID/start-time identity from boot proof. Linux uses kernel boot_id/protected host identity. macOS kern.boottime and Windows LastBootUpTime are timestamps and remain non-proof observations; precision does not establish epochs. Evaluate kernel kern.bootsessionuuid only as a macOS candidate requiring installed permissions/stability/change conformance; local probe was denied, so no current assurance is claimed. Windows needs a documented boot-session counter/identifier stable under wall-clock adjustment with Fast Startup behavior verified. Until proved, boot_epoch=null/unavailable and fences remain. HMAC verified raw IDs privately; no uptime estimate/broker ID/retrospective epoch.
 - [ ] POSIX group signals/Windows taskkill are cancellation actions, not proof. Require installed provider/OS containment guarantee and exact descendant observation; escaped/migrated writer fixture must fail unsupported capability. If built-ins plus installed facilities cannot prove containment, retain fences and block advertised topology; no addon/Job Object helper/custom executable.
-- [ ] Implement live capture/verify modes; capture, actual scheduled reboot, verify same host, then broker-restart/sleep negatives. Mock epoch changes prove protocol logic only. Request explicit user scheduling before reboot.
+- [ ] Implement live capture/verify modes; capture, authorized actual reboot, verify same host, then broker-restart/sleep/Fast Startup negatives and authorized wall-clock/NTP-adjustment tests. Clock change must not appear as reboot; supported epochs must change after real reboot. Unsupported sources remain unavailable. Mock epoch changes prove protocol logic only. Request explicit user scheduling before reboot.
 - [ ] Run green; retain platform feasibility blocker if proof unavailable; commit.
 
 - [ ] Add the following implementation invariant at this task's owning seam, then complete every enumerated boundary fixture:
@@ -287,11 +291,11 @@
 
 #### Implementation Scope
 
-**Files:** Create `scripts/audit-production-closure.mjs`, `test/unit/production-closure.test.mjs`, `test/integration/portable-installed-broker.test.mjs`, `test/helpers/portable-network-policy.mjs`. Modify `package.json`, `package-lock.json`, `test/packaging/package.test.mjs`, `test/integration/broker-release.test.mjs`, `test/unit/broker-build.test.mjs`, `test/unit/broker-build-command.test.mjs`, `test/helpers/warm-packed-cache.mjs`, `test/helpers/windows-offline.mjs`, `test/helpers/assert-network.mjs`, `test/helpers/windows-offline.ps1`, `.github/workflows/ci.yml`, `.github/workflows/release.yml`, `src/doctor.mjs`, `src/config/setup.mjs`, `src/cli/parse.mjs`, `src/cli/run.mjs`, `src/cli/help-data.mjs`, `src/broker/runtime-image.mjs`, `README.md`, `test/helpers/internal-api.mjs`, `test/helpers/installed-provider/scenario.mjs`, `test/helpers/slow-broker-recovery.mjs`, `test/unit/errors.test.mjs`, `test/unit/broker-ownership.test.mjs`, `test/unit/broker-registry.test.mjs`, `test/integration/broker-readiness.test.mjs`, `test/integration/setup-doctor.test.mjs`, `test/live/installed-broker-handoff.mjs`. Retire production `scripts/build-broker-security.mjs` / `native/broker-security/` only after Tasks1–3 portable lifecycle proof.
+**Files:** Create `scripts/audit-production-closure.mjs`, `test/unit/production-closure.test.mjs`, `test/integration/portable-installed-broker.test.mjs`, `test/helpers/portable-network-policy.mjs`. Modify `package.json`, `package-lock.json`, `test/packaging/package.test.mjs`, `test/integration/broker-release.test.mjs`, `test/unit/broker-build.test.mjs`, `test/unit/broker-build-command.test.mjs`, `test/helpers/warm-packed-cache.mjs`, `test/helpers/windows-offline.mjs`, `test/helpers/assert-network.mjs`, `test/helpers/windows-offline.ps1`, `.github/workflows/ci.yml`, `.github/workflows/release.yml`, `src/doctor.mjs`, `src/config/setup.mjs`, `src/cli/parse.mjs`, `src/cli/run.mjs`, `src/cli/help-data.mjs`, `src/broker/runtime-image.mjs`, `README.md`, `test/helpers/internal-api.mjs`, `test/helpers/installed-provider/scenario.mjs`, `test/helpers/slow-broker-recovery.mjs`, `test/unit/errors.test.mjs`, `test/unit/broker-ownership.test.mjs`, `test/unit/broker-registry.test.mjs`, `test/integration/broker-readiness.test.mjs`, `test/integration/setup-doctor.test.mjs`, `test/live/installed-broker-handoff.mjs`. Retire production `scripts/build-broker-security.mjs` / `native/broker-security/` after Tasks1/2 portable parity. Task3 gates new epoch/descendant claims and final release independently.
 
 **Interfaces:**
 
-- **Consumes:** Tasks1–3 portable lifecycle APIs, actual installed package inventory and npm lock/production graph; existing test-only `test/helpers/npm-command.mjs` exports `runNpm(tool,args,options)` for package tests. The audit module consumes the parsed tree and does not import test code; no new review orchestration is required for transport conformance.
+- **Consumes:** Tasks1/2 portable lifecycle APIs, actual installed package inventory and npm lock/production graph; existing test-only `test/helpers/npm-command.mjs` exports `runNpm(tool,args,options)` for package tests. The audit module consumes the parsed tree and does not import test code; no new review orchestration is required for transport conformance.
 - **Produces:** `auditProductionClosure({lockfile,packageRoot,installedTree,packInventory}):AuditReport` and exported `productionGraph(lockfile)` enumerate all direct/transitive/optional production files/scripts/native/download risks and source/license rationale.
 
 - [ ] Write red transitive native/build/download/disguised architecture-binary fixtures and actual installed-tarball broker lifecycle/auth/concurrency/recovery tests.
@@ -307,20 +311,26 @@
 
 - [ ] Run focused tests red.
 - [ ] Audit lock graph plus installed `npm ls --omit=dev --json` tree and actual package files/scripts. SDK/Zod/Prettier undergo same audit; tooling moves dev only if runtime import inventory proves unused. No name-only denylist proof.
-- [ ] Remove node-gyp/native sources/build invocation from production runtime/tarball/export/help after portable tests pass; regenerate lock normally and inspect dependency diff. Preserve legacy history in retained installation subject to reviewed migration, no native fallback in new package.
+- [ ] Remove node-gyp/native sources/build invocation from production runtime/tarball/export/help after portable tests pass; regenerate lock normally and inspect dependency diff. Preserve exact legacy history read-only. Until Task5 adopts migration, new package refuses native-era broker ownership and active/recoverable/fenced legacy state with bounded drain/retain-original-installation guidance; never resume/reinterpret those journals or select old runtime/image fallback. No native fallback in new package.
 - [ ] Migrate all inventoried native fixtures: internal-api/registry image bytes omit helper files; runtime-image inventory verifies pure JavaScript installation bytes without changing #102 selection/routing policy; ownership/readiness tests exercise portable actual installed storage/HTTP concurrency without nativeAvailable skip gates; errors/setup-doctor assert portable help/dependencies; slow-recovery/installed-provider/live handoff use portable APIs and never build helpers. Preserve their failure/reconciliation assertions; do not delete coverage or keep CI-only native skip paths.
 
-- [ ] Remove Python/MSVC/build-essential/Xcode/headers/APR_NATIVE_REQUIRED/APR_NODEDIR_BASE CI provisioning. Preserve Node24/26/current × Ubuntu/macOS/Windows and npm11.8.0/12.0.2 parser coverage, all current verification suites/release provenance.
-- [ ] Offline installed proof warms JS production cache then denies external egress while allowing loopback. Existing unshare/macOS blanket IP deny blocks target transport: replace OS policy, verify local success/external failure and restore in finally. AIPR never installs provider executables; optional live CLI setup stays explicit external prerequisite.
+- [ ] Migrate CI phase-2 native-dependent live-host/native-broker steps and npm-pack build-warm/inventory steps to portable fixtures/audit. Preserve actual tarball extraction, installed npm ls, handoff assertions, external-provider prerequisites and diagnostics. Remove Python/MSVC/build-essential/Xcode/headers/APR_NATIVE_REQUIRED/APR_NODEDIR_BASE CI provisioning. Preserve Node24/26/current × Ubuntu/macOS/Windows and npm11.8.0/12.0.2 parser coverage, all current verification suites/release provenance.
+- [ ] Offline installed proof warms JS production cache then denies external egress while allowing loopback. Existing unshare/macOS blanket IP deny blocks target transport: replace OS policy; Linux new network namespace explicitly brings lo up with `ip link set lo up` before local HTTP proof while external routes remain absent; verify local success/external failure and restore in finally. AIPR never installs provider executables; optional live CLI setup stays explicit external prerequisite.
 - [ ] Run green closure/installed/pack/smoke and commit.
 
 - [ ] Add the following implementation invariant at this task's owning seam, then complete every enumerated boundary fixture:
 
 ```js
 // In test/unit/production-closure.test.mjs, using the existing test helper:
-const tree = JSON.parse(
-  runNpm('npm', ['ls', '--omit=dev', '--json'], { cwd: packageRoot, encoding: 'utf8' })
-);
+let tree;
+try {
+  tree = JSON.parse(
+    runNpm('npm', ['ls', '--omit=dev', '--json'], { cwd: packageRoot, encoding: 'utf8' })
+  );
+} catch (error) {
+  const diagnosticTree = error.stdout ? JSON.parse(String(error.stdout)) : null;
+  throw new Error('invalid-installed-production-tree', { cause: { error, diagnosticTree } });
+}
 const report = auditProductionClosure({
   lockfile,
   packageRoot,
@@ -344,7 +354,7 @@
 
 #### Acceptance Criteria
 
-Actual packed runtime/production closure contains no native addon/node-gyp/build/download/architecture binary and passes installed portable lifecycle on each target OS without compiler provisioning.
+Portable parity predicate: actual installed authentication/private storage/effective ACL, exclusive claim and proved broker-only stale recovery, lifecycle and64-socket concurrency pass on Ubuntu/macOS/Windows. Tasks1/2/4 then deliver native-free broker independently of Tasks3/5, with legacy active/fenced refusal. This bounded package milestone claims neither final replacement/migration nor unsupported epoch/descendant capability. Production closure contains no native/build/download/architecture binary.
 
 ### Task 5: Reconcile Accepted Contract Owners
 
@@ -357,12 +367,12 @@
 
 #### Implementation Scope
 
-**Files:** Governed follow-up creates `docs/superpowers/specs/2026-10-03-107-runtime-policy-reconciliation-design.md` and `test/fixtures/runtime-contract-adoption.json`. Modify this plan after accepted amendment; #30/#34 owners update their own plans. Never modify the immutable accepted #107 spec in implementation.
+**Files:** Governed follow-up creates `docs/superpowers/specs/2026-10-03-107-runtime-policy-reconciliation-design.md` and `test/fixtures/runtime-contract-adoption.json` and `scripts/check-runtime-contract-adoption.mjs`. Modify this plan after accepted amendment; #30/#34 owners update their own plans. Never modify the immutable accepted #107 spec in implementation.
 
 **Interfaces:**
 
-- **Consumes:** Immutable #107 spec, controller's verified #102 current artifacts and #30/#34/#109 owner plans; produces review/adoption prerequisites, no runtime code.
-- **Produces:** `RuntimeContractAdoption` contains owner issue IDs, exact reviewed spec/amendment/plan digests, runtime/policy/legacy recovery decisions, evidence/telemetry schemas and accepted review references. `assertContractAdoption(record):void` is created in Task8.
+- **Consumes:** Immutable #107 spec, controller's verified #102 current artifacts and #30/#34/#109 owner plans; produces review/adoption prerequisites, no public runtime code.
+- **Produces:** `RuntimeContractAdoption` contains owner issue IDs, exact reviewed spec/amendment/plan digests, runtime/policy/legacy recovery decisions, evidence/telemetry schemas and accepted review references. Task5 creates document-only `checkRuntimeContractAdoption({record,artifacts}):Report`, checking exact digests and authentic accepted review references; runtime `assertContractAdoption(record):void` and its unit test are created in Task8.
 
 - [ ] Read live issue/artifact ownership at verified commits; state labels alone do not prove adoption.
 - [ ] Write targeted spec follow-up with concrete global-vs-coexistence installation, exclusive-vs-layered policy, and active legacy drain/recovery cases. Do not choose silently.
@@ -382,7 +392,7 @@
 **Verification Commands:**
 
 ```sh
-node --test test/unit/runtime-contract-adoption.test.mjs
+node scripts/check-runtime-contract-adoption.mjs --record test/fixtures/runtime-contract-adoption.json
 git diff --check
 ```
 
@@ -406,7 +416,7 @@
 **Interfaces:**
 
 - **Consumes:** Validated raw/parsed transport inputs and immutable spec contracts; generated output schemas consumed by Tasks7–18.
-- **Produces:** Consumes raw CLI/MCP bytes or parsed object with observability declaration. Produces `operationRegistry`, `validateOperation(name,input,{rawText}):ValidatedOperation`, `encodeRequestCanonical(value):Buffer`, `requestDigest(value):string`, `renderHelp({topic,format}):HelpEnvelope`. Registry owns schemas, response/action unions, examples, errors and sole grammar `ai-peer-review.finding-id/v1`.
+- **Produces:** `operationRegistry`, `validateOperation(name,input,{rawText}):ValidatedOperation`, `encodeRequestCanonical(value):Buffer`, `requestDigest(value):string`, `renderHelp({topic,format}):HelpEnvelope`. Registry owns schemas, response/action unions, examples, errors and sole grammar `ai-peer-review.finding-id/v1`.
 
 - [ ] Write red canonical equivalence fixtures for whitespace/key order,6/6.0/6e0,escaped same-string filepath, UTF-16/non-BMP key sorting/prefixes, every required string escape/slash/scalar Unicode. Reject lone surrogates, invalid numeric domains, unknown fields, absent stages and raw duplicate keys; parsed-only MCP records not-observable.
 - [ ] Pin submitted filepath identity:
@@ -455,14 +465,14 @@
 
 #### Implementation Scope
 
-**Files:** Create `src/config/v2.mjs`, `src/startup/roster.mjs`, `schemas/config-v2.json`, `test/unit/config-v2.test.mjs`, `test/unit/roster-resolution.test.mjs`, `test/fixtures/config-v2-cases.json`. Modify `src/config/load.mjs`, `src/startup/selection.mjs`; setup integration only after Task5.
+**Files:** Create `src/config/v2.mjs`, `src/startup/roster.mjs`, `schemas/config-v2.json`, `test/unit/config-v2.test.mjs`, `test/unit/roster-resolution.test.mjs`, `test/fixtures/config-v2-cases.json`. Modify `src/config/load.mjs`, `src/startup/selection.mjs`; Task7 implementation and authority fixtures start only after Task5 adopted reconciliation.
 
 **Interfaces:**
 
 - **Consumes:** Task6 registry validator/canonical policy schemas and versioned installed capability observations; Task5 adopted policy authority is required for integration.
-- **Produces:** `validateConfigV2(source):ConfigV2`; `resolveConfigV2({packageDefaults,user,project}):{config,sources}` is accepted #107 isolated fixture behavior, not public override of #102. `resolveRoster({stage,config,capabilities}):SealedRoster` returns identities/sources/headless placement/caps/permissions/visibility/finite cascade and eligibility table against every reachable counterpart.
+- **Produces:** `validateConfigV2(source):ConfigV2`; `resolveConfigV2(adoptedSources):{config,sources}` follows Task5's jointly reviewed authority decision. Preserve the original #107 layered/profile requirements in Task5's comparison and gate15 traceability; do not prebuild a competing layered resolver or discard requirements without accepted amendment. `resolveRoster({stage,config,capabilities}):SealedRoster` returns identities/sources/headless placement/caps/permissions/visibility/finite cascade and eligibility table against every reachable counterpart.
 
-- [ ] Write red scalar/named-key merge, whole-profile/array replacement, package empty profiles/default null, omitted roles/model/effort, empty supplied lists/nonexistent defaults, bounds/order and unknown-key fixtures.
+- [ ] After Task5, write red adopted source-authority cases, plus scalar/named-key and whole-profile/array behavior exactly where the adopted amendment permits it; package empty profiles/default null, omitted roles/model/effort, empty supplied lists/nonexistent defaults, bounds/order and unknown-key fixtures. Adoption records disposition of every original layering requirement.
 - [ ] Pin excluded candidates/no initial downgrade:
 
 ```js
@@ -479,17 +489,17 @@
 - [ ] Explicit provider/model primary then deduplicated configured fallback; unspecified role picks eligible profile. Omitted model/effort profile then unique versioned exact adapter default; explicit unsupported value never substitutes. Selector/host/provider distinct; syntax-safe identifiers passed through, no stale hardcoded catalogs.
 - [ ] Request `fallback_kinds` array/profile `fallback_kinds_by_class` map; nonempty/unique/include requested class; SAR only["sar"], two-party only SPR/XPR. Exact escaped JSON Pointers/source paths/member indexes. Initial roster matches requested class; finite table against all reachable counterpart choices seals active/conditional/excluded reasons, exclusions consume no try.
 - [ ] New-runtime v1/mixed config rejects `APR_CONFIG_MIGRATION_REQUIRED` with legacy keys/changed semantics/prospective sources/caps; never convert max_turns numerically. Removed on_missing_surface rejects; config cannot consent unattended. Conditional rules/alternative roster extension unsupported in v1.
-- [ ] Run green and commit isolated resolver; integration remains gated.
+- [ ] Run green and commit adopted resolver and integration; unresolved Task5 adoption blocks this task.
 
 - [ ] Add the following implementation invariant at this task's owning seam, then complete every enumerated boundary fixture:
 
 ```js
-const sources = [packageDefaults, user, project];
-for (const source of sources) validateConfigV2(source);
-const resolved = resolveConfigV2({ packageDefaults, user, project });
+const adoptedSources = resolvePolicySources(contractAdoption, installation);
+for (const source of adoptedSources) validateConfigV2(source);
+const resolved = resolveConfigV2(adoptedSources);
 const roster = resolveRoster({ stage, config: resolved.config, capabilities });
 assert.equal(roster.initial.kind, stage.kind);
-// This isolated spec fixture resolver cannot override adopted project policy routing.
+// Source authority is adopted by #102/#107 before this implementation exists.
 ```
 
 **Verification Commands:**
@@ -941,12 +951,12 @@
 
 #### Implementation Scope
 
-**Files:** Create `src/monitor/status.mjs`, `src/monitor/observer.mjs`, `src/monitor/liveness.mjs`, `src/monitor/render.mjs`, `src/host/wait-capability.mjs`, `test/helpers/host-monitor-fixture.mjs`, `test/unit/liveness-clock.test.mjs`, `test/integration/monitor-admission.test.mjs`, `test/integration/zero-turn-wait.test.mjs`. Modify `src/mcp/wait.mjs`, `src/transport/live-wait.mjs`, `src/protocol/run-reducer.mjs`, `src/api/registry.mjs`.
+**Files:** Create `src/monitor/status.mjs`, `src/monitor/observer.mjs`, `src/monitor/liveness.mjs`, `src/monitor/render.mjs`, `src/host/wait-capability.mjs`, `test/helpers/host-monitor-fixture.mjs`, `test/unit/liveness-clock.test.mjs`, `test/integration/monitor-admission.test.mjs`, `test/integration/zero-turn-wait.test.mjs`, `src/cli/watch.mjs`, `src/broker/lifecycle.mjs`, `test/integration/cli-watch.test.mjs`, `test/integration/broker-lifecycle.test.mjs`, `test/integration/wrapper-loss.test.mjs`. Modify `src/mcp/wait.mjs`, `src/transport/live-wait.mjs`, `src/protocol/run-reducer.mjs`, `src/api/registry.mjs`, `src/cli/parse.mjs`, `src/cli/run.mjs`, `src/broker/service.mjs`, `src/broker/role-wrapper.mjs`.
 
 **Interfaces:**
 
 - **Consumes:** Task8 run/admission journal, Task11 dispatch state, Task14 accounting/as-of view and independently verified host surface/wait observations.
-- **Produces:** `observeRun({run,cursor,grant,host}):AsyncIterable<RedactedEvent>`; `verifyVisibleObserver(host):MonitorReceipt`; `setObserverHold({run,expectedRevision,receipt}):Promise<HoldReceipt>`; `tickLiveness({clock,observations,policy}):LivenessActions`; `renderMonitor(statusFixture):string`. Clock now/setTimeout/clearTimeout/epoch monotonic; UTC audit separate.
+- **Produces:** `observeRun({run,cursor,grant,host}):AsyncIterable<RedactedEvent>`; `verifyVisibleObserver(host):MonitorReceipt`; `setObserverHold({run,expectedRevision,receipt}):Promise<HoldReceipt>`; `tickLiveness({clock,observations,policy}):LivenessActions`; `renderMonitor(statusFixture):string`; `watchRun({run,cursor,readGrant,sink,signal}):Promise<MonitorReceipt>` streams redacted read-only progress to CLI using registered wait/status operations, not a tenth logical API operation; `ensureBroker({worktree,protection,owner,clock}):Promise<BrokerHandle>` and `tickBrokerIdle({activity,obligations,clock}):IdleDecision`; `reconcileWrapperLoss({binding,containment,run}):Promise<TerminationResult>`. Clock now/setTimeout/clearTimeout/epoch monotonic; UTC audit separate.
 
 - [ ] Write red exact fake-time warning60000,reconcile120000,stale after two missed15000 intervals,active-operation timeout1800000 tests; restart clock epoch reconciles deadlines without renewed budget. Quiet proved-live stays running; scheduler lateness diagnostic.
 - [ ] Pin observer-only hold:
@@ -968,7 +978,10 @@
 
 hostMonitorFixture wraps runFixture with verified/detached/transport-only events and wait-renewal/model-wakeup counters.
 
+- [ ] Add actual CLI watch integration: launch process, receive stage/round/usage progress at durable cursor, disconnect/reconnect without new run/worker/model wake, reject monitor mutation/private data and preserve stale last-known state. A hosted verified visible surface adapter and CLI watch consume the same read-only event projection; neither is inferred from polling.
+- [ ] Add lifecycle/wrapper-loss red tests: no broker before first mutating start, one on-demand broker under Task2 arbitration, no idle exit while any active/recoverable/fenced work or pending cleanup exists, idle shutdown after configured60000ms, configured override exact boundary, and two simultaneous starts. Status/preview remain broker-free when absent. Kill wrapper while descendant writes: revoke tool/session binding, fence dispatch, issue cancellation to sealed exact containment tree, and retain artifact lease until Task3 proves every writer dead and Task17 resolves effects; direct-child death alone cannot release it.
 - [ ] Run below red.
+- [ ] Implement watch rendering/durable cursor, on-demand startup and configured idle lifecycle in the named production files. Broker exit persists obligations and retains ownership until cleanup is proved; wrapper supervision observes its lease/IPC/process independently from provider output. Wrapper loss always initiates owned-tree cancellation and evidence-backed reconciliation; unproved containment remains fenced.
 - [ ] Journal observer hold/clearance with revision/cursor; loss holds only NEW critique/revision admission,already admitted work may finish/seal,status starting/running absent other condition,no integrity fence solely for surface loss. Verified authorized visible reattach clears only hold; polling/reconnect not proof; terminal closes hold,no dispatch; unattended sealed run no hold.
 - [ ] Expose spec liveness fields broker heartbeat/health,last protocol/observation/stale; participant placement/phase/role_state/process health/provider output age/null reasons; fences with obligations/recovery; all exact status tuples for disconnect/quiet/death/restart/second-launch fail. Unreachable observer keeps last-known values with stale marker.
 - [ ] single-wakeup requires visible progress/durable cursor/run-lifetime wait OR renewal across every ceiling/operation/stage entirely outside inference. Fault-free SAR/SPR/XPR exactly one post-receipt terminal wake. W60000/D150000 deterministic host has two reentries plus terminal; equal boundary terminal wins. Unknown-duration count null; unknown capability count null/unknown-capability even given duration; unknown ceiling/reattach null/not-observable,no fabricated cadence. Unknown wait with verified surface/unattended=false admitted.
@@ -987,12 +1000,12 @@
 **Verification Commands:**
 
 ```sh
-node --test test/unit/liveness-clock.test.mjs test/integration/monitor-admission.test.mjs test/integration/zero-turn-wait.test.mjs
+node --test test/unit/liveness-clock.test.mjs test/integration/monitor-admission.test.mjs test/integration/zero-turn-wait.test.mjs test/integration/cli-watch.test.mjs test/integration/broker-lifecycle.test.mjs test/integration/wrapper-loss.test.mjs
 ```
 
 #### Acceptance Criteria
 
-Visible progress and exact tuple/timing truth persist through detach/reattach; no model polling; host-specific guarantees require installed evidence.
+Actual CLI/verified hosted progress, durable cursor and exact tuple/timing truth persist through detach/reattach without model polling. On-demand broker and60000ms idle exit are tested; wrapper loss cancels the owned tree and retains unproved fences. Host-specific guarantees require installed evidence.
 
 ### Task 16: Identical CLI/MCP and Small Installed Skill
 
@@ -1124,14 +1137,14 @@
 
 #### Implementation Scope
 
-**Files:** Create `test/live/installed-runtime-conformance.mjs`, `test/integration/runtime-migration.test.mjs`, `test/integration/full-runtime-sequence.test.mjs`, `test/fixtures/release-gates.json`, `scripts/verify-portable-release.mjs`, `docs/releases/agent-first-portable-runtime.md`, `docs/provider-capabilities.md` if absent. Modify `.github/workflows/ci.yml`, `.github/workflows/release.yml`, `test/packaging/package.test.mjs`, `src/doctor.mjs`, `README.md`, `skills/peer-review/SKILL.md`.
+**Files:** Create `test/live/installed-runtime-conformance.mjs`, `test/integration/runtime-migration.test.mjs`, `test/integration/full-runtime-sequence.test.mjs`, `test/fixtures/release-gates.json`, `schemas/installed-conformance-evidence-v1.json`, `test/unit/portable-release-evidence.test.mjs`, `scripts/verify-portable-release.mjs`, `docs/releases/agent-first-portable-runtime.md`, `docs/provider-capabilities.md` if absent. Modify `.github/workflows/ci.yml`, `.github/workflows/release.yml`, `test/packaging/package.test.mjs`, `src/doctor.mjs`, `README.md`, `skills/peer-review/SKILL.md`.
 
 **Interfaces:**
 
 - **Consumes:** All prior completed task APIs/fixtures, #30/#34/#102 adopted contracts, actual installed provider/OS capability reports and exact packed package digest.
-- **Produces:** `verifyPortableRelease({packageDigest,capabilityEvidence,contractAdoption,gates}):ReleaseReport`; conformance pins OS/Node/package/adapter/provider CLI/model/effort/role/topology/protection/identity/tool/containment/telemetry/recovery/evidence versions and unavailable reasons.
+- **Produces:** `verifyPortableRelease({packagePath,conformance,hostEpoch,runBinding,contractAdoption,gates}):ReleaseReport`; conformance pins OS/Node/package/adapter/provider CLI/model/effort/role/topology/protection/identity/tool/containment/telemetry/recovery/evidence versions and unavailable reasons.
 
-- [ ] Write red all15-gates/adoption/capability completeness tests; missing/blocked installed evidence cannot render passed.
+- [ ] Write red all15-gates/adoption/capability completeness tests plus absent/swapped/tampered/foreign-OS/Node/package/run evidence, invalid signatures and mocked-only positive claims; missing/blocked installed evidence cannot render passed. Versioned closed evidence records exact tarball SHA256, OS/build/architecture, Node path/version, provider/adapter source/version, capture timestamps, run ID/nonce, identity/protection/epoch assurance and unavailable reasons. Task3 creates host-epoch/run-binding schemas and live capture; Task18 creates installed-conformance schema/harness and validates all three contracts; coordinate shared references with #30, no competing review records. Node crypto signs evidence with a per-run key whose public-key fingerprint and package/OS/Node binding are registered before capture in the supplied run-binding receipt. Verify signature, exact context and every evidence reference, not merely existence or operator status. This establishes harness consistency under same-user trust, not an independent external attestation.
 - [ ] Pin release predicate:
 
 ```js
@@ -1155,8 +1168,10 @@
 
 ```js
 const report = verifyPortableRelease({
-  packageDigest,
-  capabilityEvidence,
+  packagePath,
+  conformance,
+  hostEpoch,
+  runBinding,
   contractAdoption,
   gates,
 });
@@ -1168,7 +1183,7 @@
 **Verification Commands:**
 
 ```sh
-node --test test/integration/runtime-migration.test.mjs test/integration/full-runtime-sequence.test.mjs
+node --test test/unit/portable-release-evidence.test.mjs test/integration/runtime-migration.test.mjs test/integration/full-runtime-sequence.test.mjs
 npm test
 npm run test:integration
 npm run test:mcp
@@ -1177,36 +1192,40 @@
 npm run format:check
 npm run lint
 node scripts/audit-production-closure.mjs
-node scripts/verify-portable-release.mjs --gates test/fixtures/release-gates.json
-node test/live/installed-runtime-conformance.mjs --output .scratch/peer-review/installed-conformance.json
-npm pack --dry-run
+npm pack --pack-destination .scratch/peer-review --json > .scratch/peer-review/package-pack.json
+PACKAGE_PATH="$(node --input-type=module -e 'import fs from "node:fs"; import path from "node:path"; const a=JSON.parse(fs.readFileSync(".scratch/peer-review/package-pack.json","utf8")); if(a.length!==1) throw new Error("expected-one-package"); console.log(path.resolve(".scratch/peer-review",a[0].filename));')"
+node test/live/installed-runtime-conformance.mjs --package "$PACKAGE_PATH" --run-binding .scratch/peer-review/conformance-run-binding.json --output .scratch/peer-review/installed-conformance.json
+node test/live/host-epoch-conformance.mjs capture --package "$PACKAGE_PATH" --run-binding .scratch/peer-review/conformance-run-binding.json --output .scratch/peer-review/host-epoch-before.json
+# After an explicitly authorized actual reboot and the clock/sleep/restart negatives:
+node test/live/host-epoch-conformance.mjs verify --input .scratch/peer-review/host-epoch-before.json --output .scratch/peer-review/host-epoch-after.json
+node scripts/verify-portable-release.mjs --package "$PACKAGE_PATH" --conformance .scratch/peer-review/installed-conformance.json --host-epoch .scratch/peer-review/host-epoch-after.json --run-binding .scratch/peer-review/conformance-run-binding.json --gates test/fixtures/release-gates.json
 ```
 
 #### Acceptance Criteria
 
-All15 gates/adoptions/advertised installed conformance pass under nine OS/Node jobs before final replacement claim; unproved Windows/descendant/boot combinations remain explicit support blockers.
+The actual pack precedes evidence capture and verification; resolve PACKAGE_PATH from the single filename reported by npm pack, never select an arbitrary tarball. Harness registers run binding before capture. All15 gates/adoptions/advertised installed conformance pass under nine OS/Node jobs before final replacement claim; unproved Windows/descendant/boot combinations remain explicit support blockers.
 
 ## Requirement and Release-Gate Traceability
 
 `test/fixtures/release-gates.json` inventories all numbered gates and every concrete assertion in the spec's gate item. `verify-portable-release` refuses omissions/blocked status; these are required tests,not optional summaries.
 
-| Gate | Required fixture classes                                                                                                                                                                                          | Owning tasks/test suites                                | Dependency                           |
-| ---- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- | ------------------------------------ |
-| 1    | canonical bytes/equivalent numeric/string forms,UTF-16/escapes/surrogates,duplicates/unknown keys,filepath distinction,concurrent replay/crash after every launch journal                                         | 6/8/16 request-canonical/run-start/api-transport-parity | authenticated namespace              |
-| 2    | cap final clean-vs-revision,replacement shared budget/finite counterpart policy,finding grammar/IDs/history/lineage/resolution corrections,revision exhaustion/reset negatives,Markdown literal negative fixtures | 6/7/11/17 findings/replacement-budget/api-help          | registered sole grammar              |
-| 3    | collateral/sealed context,CRLF/dirty/new/no-newline/empty reconstruction,collision-free changes,init/sidecar/fresh-clone/cross-mode linkage,no-response paths                                                     | 10/12 submission-seals/run-evidence/portable-lineage    | #30 adoption                         |
-| 4    | enforced FUR/authority/cross-role/alias/parent denial,own/shared/research allowed,exact handoff paths,scope correction unchanged grant/round                                                                      | 9/10 headless-role-tools/role-scope                     | installed sandbox                    |
-| 5    | same-root one broker/linked endpoints,HTTP token/Host/browser/slow/size,active/fenced/stale-PID cleanup,index atomicity/secret redaction                                                                          | 1/2/17 broker-http/portable-ownership/project-cleanup   | protection/ownership                 |
-| 6    | status tuples/exact clock thresholds,whole-run single wake/W-D reentry/unknown wait,usage fixture,preflight surface reject/fresh consent ID,observer hold/verified clear                                          | 8/15/16 liveness-clock/monitor-admission/zero-turn-wait | verified host capability             |
-| 7    | installed pure-JS closure,OS protection/role denial/descendant/real boot evidence,no required native build/download                                                                                               | 1–4/9/10/18 portable-installed-broker/live conformance  | feasibility gate                     |
-| 8    | legacy original claims/recoverability/adopted routing/no overlap,new config migration/manual retention,all installed journeys/registry parity                                                                     | 5/7/8/16/18 runtime-migration                           | **blocked #102/#107 spec conflict**  |
-| 9    | headless no-commit submit/grants/replay/resume/collisions/distinctness,CLI telemetry gap distinct from fresh identity,secret-free pipes/forged traffic                                                            | 9–11/17 session-distinctness/headless-role-tools        | exact session/private tools          |
-| 10   | every attempt outcome/native conflicting counters/owners,controller exclusion/dedup/CLI provenance/worker-combined coverage                                                                                       | 13/14/15 attempt-metrics/telemetry-accounting           | existing #109;#30/#34 adoption       |
-| 11   | byte-offset extraction/tampered annotation,immutable amendment/replay-once                                                                                                                                        | 12/14 run-evidence/telemetry-amendments                 | #30/#34 adoption                     |
-| 12   | partitions/resets/baselines/session/concurrency/currency/subscription/privacy,chain cycles/self-digests/reuse/legacy gaps,missing amendment/crash publication                                                     | 13/14 telemetry-accounting/telemetry-amendments         | #30/#34 adoption                     |
-| 13   | every action/replay/failed obligations/checkpoint/series repair,verified same-host local reboot,broker/sleep/different host/unknown/remote negative proofs                                                        | 3/12/17 host-epoch/run-recovery/series-reconcile        | installed positive termination       |
-| 14   | lock-free/session-free preflight/no cache/credentials/conformance writes,review capability rejects/telemetry admits,reservation rechecks                                                                          | 8/12/15 preview-readonly                                | physical/protection/portable lineage |
-| 15   | exact config precedence/profile-array/source pointers,bounds/defaults/model errors,SAR fallback,removed monitor key/no config consent                                                                             | 5/7 config-v2/roster-resolution                         | **policy-source adoption blocked**   |
+| Gate | Required fixture classes                                                                                                                                                                                          | Owning tasks/test suites                                                  | Dependency                           |
+| ---- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- | ------------------------------------ |
+| 1    | canonical bytes/equivalent numeric/string forms,UTF-16/escapes/surrogates,duplicates/unknown keys,filepath distinction,concurrent replay/crash after every launch journal                                         | 6/8/16 request-canonical/run-start/api-transport-parity                   | authenticated namespace              |
+| 2    | cap final clean-vs-revision,replacement shared budget/finite counterpart policy,finding grammar/IDs/history/lineage/resolution corrections,revision exhaustion/reset negatives,Markdown literal negative fixtures | 6/7/11/17 findings/replacement-budget/api-help                            | registered sole grammar              |
+| 3    | collateral/sealed context,CRLF/dirty/new/no-newline/empty reconstruction,collision-free changes,init/sidecar/fresh-clone/cross-mode linkage,no-response paths                                                     | 10/12 submission-seals/run-evidence/portable-lineage                      | #30 adoption                         |
+| 4    | enforced FUR/authority/cross-role/alias/parent denial,own/shared/research allowed,exact handoff paths,scope correction unchanged grant/round                                                                      | 9/10 headless-role-tools/role-scope                                       | installed sandbox                    |
+| 5    | same-root one broker/linked endpoints,HTTP token/Host/browser/slow/size,active/fenced/stale-PID cleanup,index atomicity/secret redaction                                                                          | 1/2/15/17 broker-http/portable-ownership/broker-lifecycle/project-cleanup | protection/ownership                 |
+| 6    | status tuples/exact clock thresholds,whole-run single wake/W-D reentry/unknown wait,usage fixture,preflight surface reject/fresh consent ID,observer hold/verified clear                                          | 8/15/16 liveness-clock/monitor-admission/zero-turn-wait/cli-watch         | verified host capability             |
+| 7    | installed pure-JS closure,OS protection/role denial/descendant/real boot evidence,no required native build/download                                                                                               | 1–4/9/10/15/18 portable-installed-broker/wrapper-loss/live conformance    | feasibility gate                     |
+| 8    | legacy original claims/recoverability/adopted routing/no overlap,new config migration/manual retention,all installed journeys/registry parity                                                                     | 5/7/8/16/18 runtime-migration                                             | **blocked #102/#107 spec conflict**  |
+| 9    | headless no-commit submit/grants/replay/resume/collisions/distinctness,CLI telemetry gap distinct from fresh identity,secret-free pipes/forged traffic                                                            | 9–11/17 session-distinctness/headless-role-tools                          | exact session/private tools          |
+| 10   | every attempt outcome/native conflicting counters/owners,controller exclusion/dedup/CLI provenance/worker-combined coverage                                                                                       | 13/14/15 attempt-metrics/telemetry-accounting                             | existing #109;#30/#34 adoption       |
+| 11   | byte-offset extraction/tampered annotation,immutable amendment/replay-once                                                                                                                                        | 12/14 run-evidence/telemetry-amendments                                   | #30/#34 adoption                     |
+| 12   | partitions/resets/baselines/session/concurrency/currency/subscription/privacy,chain cycles/self-digests/reuse/legacy gaps,missing amendment/crash publication                                                     | 13/14 telemetry-accounting/telemetry-amendments                           | #30/#34 adoption                     |
+| 13   | every action/replay/failed obligations/checkpoint/series repair,verified same-host local reboot,broker/sleep/different host/unknown/remote negative proofs                                                        | 3/12/17 host-epoch/run-recovery/series-reconcile                          | installed positive termination       |
+| 14   | lock-free/session-free preflight/no cache/credentials/conformance writes,review capability rejects/telemetry admits,reservation rechecks                                                                          | 8/12/15 preview-readonly                                                  | physical/protection/portable lineage |
+| 15   | exact config precedence/profile-array/source pointers,bounds/defaults/model errors,SAR fallback,removed monitor key/no config consent                                                                             | 5/7 config-v2/roster-resolution                                           | **policy-source adoption blocked**   |
 
 Section coverage: Review Model/Journeys/Sequences→8/9/11/16/18; Canonical Request/Errors/Self-Discovery→6/8/16; Resolution/Config/Fallback→7/11; Identity/Grants→9/10; Round/Findings/Visibility→10/11/12; Storage/FUR/Evidence/Series→2/8/10/12/17; Metrics/Privacy→existing #109 Tasks13/14; Permissions/Research→9/10 installed conformance; Broker/Disconnect/Recovery/Cleanup→1–4/15/17; Migration/Gaps/Ownership→5/18. Downstream #31/32/33/34 consume truth/context/outcome references,not authority or runtime-defined scoring.
 
@@ -1214,6 +1233,6 @@
 
 Every code task uses its shown failing assertions plus enumerated adversarial fixtures,red run,minimal implementation,green run and small source commit. Formatter/lint run destination-effective; regressions require systematic debugging rather than weakening checks. Proposed function/type contracts must be reconciled with owner-adopted schemas before freeze.
 
-Plan acceptance means actionable decomposition with honest blockers,not that product gates already passed. Freeze final formatted bytes before acceptance digest. SAR is manually orchestrated single-worker critique/revision; XPR has separate reviewer. Controller hydrates #107 only after both requested stages accept exact plan bytes. Implementation still requires separately governed Plan approval and Task5 resolution.
+Plan acceptance means actionable decomposition with honest blockers,not that product gates already passed. Freeze final formatted bytes before acceptance digest. SAR is manually orchestrated single-worker critique/revision; XPR has separate reviewer. Controller hydrates #107 only after both requested stages accept exact plan bytes. Implementation requires separately governed Plan approval. Tasks1/2/4 do not require Task5 resolution; conflicting configuration/routing/migration and final replacement release do.
 
 Recommended later execution is subagent-driven development because security/provider/evidence/telemetry boundaries each merit a fresh review. Drafting this plan authorizes no implementation or issue creation.
~~~~
