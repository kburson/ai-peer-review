# #169 Portable Owner Lifecycle Decomposition Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans inline. Root owns implementation and delivery; no implementer agents or parallel mutation wave. One fresh read-only whole-child code review follows each independently delivered child.

**Goal:** Join an authenticated exact live broker or create/reclaim a guarded portable owner while preserving its descriptor, election slot and unresolved obligations.

**Architecture:** Retained private-file operations provide exact-generation owner publication/quarantine. Credential-free server proof supplies a verified connection before bearer submission. A genuine owner lifecycle distinguishes completion of the original bounded startup transaction from later independent operation budgets while retaining the same slot. The final factory composes these producers with actual process observations and reconciliation, never caller assertions.

**Tech Stack:** Node>=24, built-in filesystem/crypto/HTTP primitives and reviewed fixed stock OS probes; no native broker addon or new runtime dependency.

**Spec:** docs/superpowers/specs/2026-09-27-107-agent-first-review-runtime-design.md

**Accepted source:** Original #107 Task2 in docs/superpowers/plans/2026-10-03-107-agent-first-portable-runtime.md and Task4 in docs/superpowers/plans/2026-10-06-141-protected-storage-ownership-decomposition.md, pinned atdd1e1fc70b19c8830be086bf7b2b32c42096e8b2. This plan decomposes #169 without deleting any original requirement.

## Story Intent

- **Beneficiary:** worktree broker clients and crash-recovery operators
- **Capability:** join authenticated live owners or replace only death-proven reconciled generations
- **Need:** endpoint silence and unguarded renames can steal newly published ownership
- **Value or failure prevented:** preserve live generations, uncertain provider effects and exact stale evidence

## Current Evidence and Size

Baseline084bfc5901d5b5fdb1f57c227a13b403421b5f07 includes Done166/167/168; PR174 is merged into141. Native169Plan estimate is23.5human hours, XL, forecast01M4B38XJ94TQ439P542KA7X1J. Native classification is advisory needs-decomposition-review, not must-split. This voluntary split follows actual independent storage, authentication and lifecycle interfaces. The eighteen-base-hour WBS and native23.5 result are retained; no waiver, forced threshold or reduced estimate is claimed.

C1 has no retained owner-file/quarantine operation. C3 retains a finite original startup deadline in its lease and transaction guards. #140 requestLoopback sends a bearer credential immediately; its private bindings are fixture-injected until actual owner composition. Production source classes remain unavailable until170. These facts constrain the producer seams below.

## Global Constraints

- Startup election uses the existing30000ms readiness budget. Recovery uses its sealed absolute monotonic deadline. Nested work never renews either.
- The winning slot and owner descriptor remain held through the complete owned lifecycle.
- A completed startup can begin later independent top-level operations with an actual AbortSignal and finite absolute monotonic deadline at most30000ms ahead at admission; no caller flag, unfinished startup, nested operation or new election authorizes this transition.
- Unknown process, endpoint silence, record age, malformed source or fenced registry/manual/wake/provider effects cannot confer replacement or discharge.
- Exact original-process death proves no descendant/effect/boot-epoch discharge. Those continuing #107 obligations remain separate.
- Protected paths, principal/effective ACL/type/link/parent/file identity and exact generations are checked at effects; no mode-derived Windows assurance.
- Core fixtures remain unverified. Only actual source/protection/election/file/connection producers can mint their respective opaque capabilities.
- No arbitrary owner registration function or copied JSON becomes meaningful ownership provenance.
- Credential is32random bytes exclusively under protected private storage. Public endpoint/status/doctor/errors expose neither credential bytes nor credential digest.
- Endpoint digest binds non-secret worktree/instance/version/owner facts. Server proof is a nonce-bound MAC, never a persisted credential digest.
- Preserve #140 exact Host/Origin/Sec-Fetch/target/header/body/auth-before-body/admission/timeouts and uncertainty behavior.
- No portable native compatibility fallback, legacy endpoint mutation, ordinary activation or publication from this bounded candidate.
- Host verification is affected/TIA-only; complete suites use genuine exact-head/same-attempt hosted receipts. Ceiling800seconds; native broker build remains suspended.
- Source-contract edits precede170capture. Later covered edits require actual recapture and ordinary acceptance.
- Preserve all original Scope/AC/migration-map obligations on169/141; parent acceptance waits for every child.

## Review Focus

1. A stale but protected endpoint port is rebound to another process: no bearer credential may reach an unverified replacement socket.
2. Startup completes near its deadline, or later owner work overlaps release: startup never renews, later independent work preserves the same slot, and no effect runs after release starts.
3. Two reclaimers race a newly published owner or crash after quarantine: exact generations and retained obligations prevent stealing or losing evidence.
4. A valid-looking caller owner, publication, source, reconcile result or connection is copied: structural validity cannot mint operational ownership.
5. Descriptor/protection/source/server cleanup fails after an effect: return exact outstanding obligations without exposing private bytes or claiming release.

## Shared Interfaces and Ownership

Task1 owns HeldPrivatePublication and QuarantineReceipt, plus isHeldPrivatePublication(handle):boolean as a private genuine-producer predicate:
createHeldPrivatePublication({guard,name,bytes,lease,signal,deadline}) returns an opaque retained descriptor/publication with snapshot, verify, replace, withdraw, close and retainedGeneration operations. Every operation consumes its explicit bounded context and the same genuine resource lease. quarantinePrivateFile({guard,name,expected,lease,signal,deadline}) creates a fresh owner quarantine locator under the guarded transaction, retains exact bytes/identity receipt and never treats rename as compare-and-swap. These are C1 guarded operations; fixtures cannot call them with a copied lease.

Task2 owns VerifiedOwnerConnection and EndpointAuthenticationObservation, plus isVerifiedOwnerConnection(connection):boolean as a private actual-connection predicate:
observeLoopbackOwner({endpoint,privateBinding,expected,signal,deadline}) returns verified-live/unknown/absent transport observation, with a privately registered connection only on exact proof. It sends no bearer before nonce-bound server possession proof, then submits authenticated requests on that same verified socket. Connection loss refuses rather than silently reconnecting. Probe absence is transport data, never process death. Client request/wait/close retain original budgets and obligations. Server proof binds both observed IPv4 socket address/port pairs and the exact endpoint port; the client compares the reversed tuple with its actual socket before bearer transmission. Relayed proofs refuse. The connection is scoped to one top-level operation; later operations re-observe and re-prove, without silently reconnecting within one operation.

Task3 owns the genuine portable owner lifecycle and provenance:
createPortableOwnerLifecycle({publication,credential,endpointPublication,lease,identity,source,connection,runtime,signal,deadline}) returns candidate Owner with async publish/verify/release. It verifies actual producer identities and scope; no registration hatch. Original startup/recovery context is pinned until all actual readiness/publication checks complete. Genuine completion seals the existing lease into held-owner lifetime; later operations consume independently supplied top-level contexts, reject nested renewal and preserve the same slot. isPortableBrokerOwner checks private genuine producer membership, while core fixture owners remain false. The original isAuthenticatedBrokerOwner preserves its existing native producer membership and additionally delegates to this genuine predicate without accepting an arbitrary object registration. Task3 owns the necessary asynchronous cleanup consumer migration in src/protocol/compatibility.mjs: await strict boolean verification, refuse rejection, and use immutable handshake.versions bound to genuine loaded runtime inventory and protected owner facts.

Task4 owns OwnerTransaction and final composition:
acquirePortableOwner({worktree,paths,reconcile,protection,signal,deadline}) returns Owner or joined BrokerClient and composes actual producer checks. observeAuthenticatedOwner({paths,signal,deadline}) produces privately registered live/dead/unknown owner observations with exact protected state and process/authentication evidence. isAuthenticatedOwnerObservation checks actual provenance; status distinctions remain explicit. joinVerifiedBroker({binding,signal,deadline}) consumes only exact privately verified binding/connection evidence and rereads state before joining. boundedOwnershipError carries bounded blocker/withdrawal/cleanup metadata only.

Named original factories remain; signal and deadline are additive required budget options. Missing/invalid options return operation-budget-unproved; they never substitute injected authority. The internal cleanup gate becomes async under Task3, with every actual call site awaiting its result. Missing later producer/class support stays unavailable, without a fake successful placeholder. Core schedule helpers are test-only except explicitly named unverified protocol cores.

### Task 1: Retain Guarded Owner Publications and Quarantine

#### Story Intent

- **Beneficiary:** broker ownership and recovery transactions
- **Capability:** hold private owner descriptors and quarantine only exact protected generations
- **Need:** ordinary writes close descriptors and unguarded rename can replace a newer owner
- **Value or failure prevented:** prevent generation theft and retain exact cleanup evidence

#### Implementation Scope

**Size and estimate:** M/4base human hours of the eighteen-hour WBS; native child estimation is independent.

**Files:** Extend src/broker/storage-protection.mjs and permitted broker-owner resource scope in src/broker/ownership-election.mjs. Create test/integration/owner-publication.test.mjs. Generalize the existing C1 createOwnedPublication retained-generation engine internally; keep its election wrapper and tests unchanged. Owner wrappers add genuine lease/context and reserved name-class checks. Do not create a second retained-generation implementation. Both wrappers use identical obligation shapes; protocol stores delegate to this shared mechanism.

**Interfaces:** Produce the HeldPrivatePublication and QuarantineReceipt interfaces above. Consume genuine C1 guards and C3 held owner lease. The operation context is explicit; startup only accepts the original lease budget until Task3 genuine completion.

- [ ] Core-on-real-substrate RED for retained ordinary fixture descriptor/generation; production-refusal RED for copied/wrong-resource leases and copied/wrong-resource lease, old generation, symlink/hardlink/parent/ACL replacement and simultaneous writer refusal. Assert actual retained descriptor remains open until exact owned release.
- [ ] Core-on-real-substrate RED for quarantine followed by crash and displaced-generation-retained; production-refusal RED for fake quarantine receipts. Cover uncertain rename/flush/close and destination collision. Inspect retained bytes and exact locators; no new generation is overwritten and no failed cleanup is reported absent.
- [ ] Implement exclusive create/write/fsync and private handle registration. Before each mutation verify actual lease scope, roots/principal/ACL/type/identity, current bytes and retained descriptor generation. Quarantine under the held lease to a fresh bounded owner-only locator; preserve both locators if outcome is uncertain.
- [ ] Define context-bearing operations without permitting arbitrary future deadline renewal. Until genuine lifecycle completion exists, alternate contexts refuse. Fixture cores expose unverified schedule behavior only.
- [ ] Run GREEN, affected storage/election controls and hosted full receipts, then native review/integration and commit.

```js
// Test-owned ordinary private filenames, never reserved production owner paths.
// store wraps the shared C1 retained engine on actual protected temp storage.
const publication = await createHeldPrivatePublicationCore({
  store,
  name: 'fixture-owner',
  bytes: Buffer.from('old'),
  budget: originalBudget,
});
assert.equal(publication.verified, false);
assert.equal(isHeldPrivatePublication(publication), false);
const before = await publication.snapshot(originalBudget);
await assert.rejects(publication.replace(staleSnapshot, Buffer.from('new'), originalBudget));
assert.deepEqual(await publication.snapshot(originalBudget), before);
await assert.rejects(
  createHeldPrivatePublication({
    guard,
    name: 'owner.json',
    bytes: Buffer.from('new'),
    lease: {},
    ...originalBudget,
  }),
  { code: 'APR_BROKER_STALE' }
);
```

##### Concrete Safety and Verification Boundary

Core-on-real-substrate tests use genuine C1 observations, actual test-owned descriptors and ordinary fixture filenames; the shared retained engine still rechecks protection and generations. They do not gain production reserved-name permission or a genuine lease. Production-refusal tests exercise copied/wrong-resource/core leases and substitution, and assert no owner/credential/quarantine effects. Production-positive owner creation waits for actual170classes. C1's existing election publication test cases remain unchanged and in the executable verifier.

Quarantine must re-open/read the fresh quarantined locator after rename and compare identity, version and exact bytes with expected. Only this post-effect observation can produce an exact QuarantineReceipt. Missing/mismatched readback or error returns uncertain with original and quarantine locators/retained bytes and obligations; it never claims an absent owner or grants replacement. Task4 checks this receipt immediately before exclusive owner creation. Add displaced-generation-retained RED: swap a new owner between final comparison and rename, then require uncertain receipt, retained new bytes and no follow-up owner creation. Do not automatically restore a path that may now contain another generation. Cooperating contenders cannot steal a generation; a noncooperating same-account replacement is detected/fenced and retained, without claiming that lstat makes rename atomic compare-and-swap.

**Verification Commands:**

```sh
node --test test/integration/owner-publication.test.mjs test/unit/storage-protection.test.mjs test/unit/ownership-election.test.mjs
```

### Task 2: Authenticate Exact Owner Connections Before Credential Submission

#### Story Intent

- **Beneficiary:** broker clients joining discovered instances
- **Capability:** prove the exact server binding and keep the verified connection before bearer submission
- **Need:** a stale loopback port or a caller readiness flag does not identify the intended server
- **Value or failure prevented:** prevent credential disclosure and joining a substituted broker

#### Implementation Scope

**Size and estimate:** M/4base human hours; actual native estimate may grow.

**Files:** Create src/broker/owner-connection.mjs and test/integration/owner-connection.test.mjs. Extend src/broker/http-server.mjs, src/broker/http-client.mjs and src/broker/http-auth.mjs with the internal proof route and strict channel verification. The proof branch precedes bearer authentication, never calls operational dispatch and retains the same pending-admission accounting and limits.

**Interfaces:** Produce VerifiedOwnerConnection and EndpointAuthenticationObservation above. Preserve all #140 operational interfaces and response schemas. Probe control is not mutation authority; actual owner/source checks remain Task4.

- [ ] Write core-on-real-socket RED, including relayed-proof-refused with an actual stale-port proxy forwarding to a different genuine server; assert unknown and no bearer bytes at the proxy. Add production-refusal for copied/fake connection objects. Cover stale/rebound port, wrong credential/instance/worktree, malformed/replayed proof, connection closed between proof and RPC, abort/deadline and hung proof. Assert no bearer bytes reach an unverified peer.
- [ ] Core-on-real-socket RED for duplicate Host/challenge headers, Origin/Sec-Fetch, absolute targets, overbounds and admission saturation. Server possession proof remains a bounded control exchange before operational body interpretation.
- [ ] Implement nonce-bound MAC proof from the protected binding and exact non-secret expected facts. Bind the MAC to server-observed localAddress/localPort/remoteAddress/remotePort, exact endpoint port and nonce; client compares its actual reversed tuple. Register only actual verified socket objects; copied evidence refuses. A subsequent request must use the same verified socket, and fallback connection creation must fail before credential submission.
- [ ] Keep request/wait/close uncertainty and original budgets. Do not infer process death from transport absence or failure. Do not expose credential or its digest in any public outcome, endpoint or error.
- [ ] Run GREEN and all #140 HTTP/readiness regressions, genuine hosted complete receipts, independent review and native integration; commit.

```js
const observed = await observeLoopbackOwner({
  endpoint,
  privateBinding,
  expected,
  signal,
  deadline,
});
assert.equal(observed.kind, 'unknown');
assert.equal(unverifiedPeer.receivedBearer, false);
assert.equal(isVerifiedOwnerConnection({ ...observed.connection }), false);
```

##### Concrete Safety and Verification Boundary

Core-on-real-socket tests exercise the actual internal proof branch and accepted #140 operational requests. Production-refusal tests cover fake/copy observations and cross-operation connection reuse. relayed-proof-refused uses two actual server ports and a proxy, and compares real socket tuple fields. Exact literal IPv4 addresses/ports are required; no alternate authority or alias is accepted. Proof never dispatches or changes public schemas. Preserve original10s receipt and5s unauthenticated idle timers, header/body bounds and admission accounting, including the proof-to-first-RPC gap. One connection serves one admitted top-level operation; later operations must re-read protected binding and independently prove a new connection. Within an operation, losing the proved socket fails before new bearer headers, with uncertainty retained for possibly sent mutations.

**Verification Commands:**

```sh
node --test test/integration/owner-connection.test.mjs test/unit/broker-http.test.mjs test/integration/broker-http-concurrency.test.mjs
```

### Task 3: Preserve Genuine Owner Lifetime and Independent Operation Budgets

#### Story Intent

- **Beneficiary:** long-lived broker owners and recovery controllers
- **Capability:** retain one genuine owner and slot across completed startup and later bounded operations
- **Need:** an expired startup budget cannot authorize new work or force healthy owners to lose provenance
- **Value or failure prevented:** prevent deadline renewal, overlapping release and fake owner registration

#### Implementation Scope

**Size and estimate:** M/4base human hours; native child estimate remains authoritative.

**Files:** Create src/broker/portable-owner-lifecycle.mjs, test/unit/portable-owner-lifecycle.test.mjs and test/unit/portable-cleanup-ownership.test.mjs. Extend src/broker/ownership-election.mjs, src/broker/storage-protection.mjs, src/broker/ownership.mjs and src/protocol/compatibility.mjs at their genuine producer seams. Update every current assertCurrentCleanupOwnership test/call to await its result, including test/unit/collateral-compatibility.test.mjs.

**Interfaces:** Produce createPortableOwnerLifecycle and isPortableBrokerOwner above. Consume genuine Task1 publications, Task2 verified connection, actual C2 observations and actual C3 lease. The genuine completion transition is privately registered, not a caller boolean or registration function.

- [ ] Core-on-real-substrate RED for startup expiry during creation/publication/readiness and nested fresh-budget attempts; production-refusal RED for fake/copy owner or completion proof and changed source/descriptor/root. Source classes unavailable means no genuine owner.
- [ ] Core-on-real-substrate RED proving the same retained slot and owner descriptor survive a later independent top-level operation after the original startup deadline, with a new sealed operation context only after genuine completion. Failed or unfinished startup cannot use that path.
- [ ] Preserve synchronous effect/release mutual exclusion and original context through every nested action. Reserve release before awaits; concurrent release/effect refuses. Pending source/server/provider effects remain fenced and retained.
- [ ] Implement genuine lifecycle factory checks and privately registered completion. Revalidate actual source/protection/generation under each operation context. Keep the original ownership predicate meaningful through the genuine private producer predicate; fixtures and arbitrary registration remain false.
- [ ] Run GREEN, all affected storage/election/ownership-predicate controls and hosted complete receipts, independent review and native integration; commit.

```js
assert.equal(isPortableBrokerOwner({ publish() {}, verify() {}, release() {} }), false);
await assert.rejects(
  createPortableOwnerLifecycle({
    publication: {},
    credential: {},
    endpointPublication: {},
    lease: {},
    identity: {},
    source: {},
    connection: {},
    signal: new AbortController().signal,
    deadline: performance.now() + 1000,
  }),
  { code: 'APR_BROKER_STALE' }
);
```

##### Concrete Safety and Verification Boundary

All four baseline budget mechanisms must remain unchanged before genuine completion: C3 core check/withdraw/assert/run/release closures, production registry budget and assurance revalidation, C1 openProtectedRoot operationBudget captured by transaction guards, and withElectionLease lease-budget-mismatch. Change them together only after the private genuine lifecycle factory verifies actual retained owner/credential/endpoint generations, actual source, channel proof, loaded runtime/version binding and readiness under the original budget. Completion is an internal transition, not an exported mark-complete/register/boolean setter.

After genuine completion, admit verify/release at the lifecycle's public top-level boundary: actual AbortSignal, finite deadline no more than30000ms ahead, fresh sealed context with private provenance and an AsyncLocalStorage marker. No operation may mint or accept a second context inside that marker. C3 retains the same original slot/generation; all source revalidation, C1 fresh guarded observations and withdrawal consume the one admitted context. ownerElectionBudget and withElectionLease derive the privately admitted current operation context, never a caller override. A completed owner may withdraw after startup expiry using this new independent context; unfinished/failed/aborted startup may not. Unchanged168/C1 anti-renewal/refusal tests stay green.

Core-on-real-substrate RED pins long-lived verify and clean release after original expiry (same slot and descriptor until release; then withdrawn/closed, zero obligations), nested renewal, Infinity/NaN/over30000ms deadlines, non-AbortSignal, and release/effect overlap. Core factory drives ready/publication ports before marking protocol completion; verified is always false. Production-refusal tests pin every fake producer and incomplete readiness. Genuine portable-positive tests are deferred to170/171cumulative execution, not skipped into an alleged genuine success now.

The synchronous cleanup consumer cannot accept a Promise as proof. Task3 changes assertCurrentCleanupOwnership to async, requires (await owner.verify(context))===true, maps rejection to the existing bounded unsupported refusal, then revalidates genuine runtime inventory and strict handshake.versions. Native owners keep their genuine membership and exact synchronous verification result, awaited by the async gate. Portable handshake.versions is immutable and derives from the genuine runtime argument (isVerifiedRuntimeInventory plus fresh exact inventory verification) and protected owner versions, not a supplied dictionary. Task4 passes the actual loaded candidate inventory; copied/runtime-shaped objects refuse. assertCurrentCleanupOwnership({owner,protocol,runtime,context}) receives the bounded context explicitly for a portable owner; missing portable context refuses. All existing consumers/call sites are awaited before effects; synchronous native owners retain their exact verification semantics. Pin Promise-resolves-false, rejects and nonboolean refusal in an explicitly unverified cleanup-check core plus actual production fake/copy/refusal controls; run genuine portable false/rejected verification controls cumulatively once170can produce genuine owners. No unverified core grant reaches cleanup.

**Verification Commands:**

```sh
node --test test/unit/portable-owner-lifecycle.test.mjs test/unit/ownership-election.test.mjs test/integration/owner-publication.test.mjs test/unit/portable-cleanup-ownership.test.mjs test/unit/collateral-compatibility.test.mjs
```

### Task 4: Compose Exact Portable Owner Creation, Reclaim and Join

#### Story Intent

- **Beneficiary:** worktree broker clients and crash-recovery operators
- **Capability:** join actual authenticated owners or replace only exact death-proven reconciled generations
- **Need:** concurrent startup and incomplete stale recovery can steal ownership or discard provider effects
- **Value or failure prevented:** preserve live owners, uncertain effects and exact recovery evidence

#### Implementation Scope

**Size and estimate:** M/6base human hours; reassess natively before Develop.

**Files:** Create src/broker/portable-ownership.mjs and test/integration/portable-ownership.test.mjs. Extend test/integration/owner-publication.test.mjs, test/integration/owner-connection.test.mjs and test/unit/portable-owner-lifecycle.test.mjs only for cumulative composition.

**Interfaces:** Produce final acquirePortableOwner, observeAuthenticatedOwner, joinVerifiedBroker and boundedOwnershipError above, composing Tasks1–3. Consume actual C2 process/source observations and actual guarded registry/manual/wake/provider reconciliation; injected assertions cannot authorize production.

- [ ] Core-on-real-substrate RED for same-worktree contention and linked distinct roots/endpoints, live-owner join with exact newcomer withdrawal, stale/no-death proof, changed generation, choosing/broker/quarantine-before-create crashes, flush/rename errors and two reclaimers plus live newcomer.
- [ ] Under the same held election reread exact owner/endpoint bytes and file/root/parent identities, independently prove exact original broker death and authenticate any reachable endpoint. Conflicting live endpoint/process evidence remains unknown. Reconcile all known registry/manual/wake/provider obligations; missing cache is not proof of absence and unknown/fenced effects refuse.
- [ ] Quarantine only the exact retained generation with receipt, then exclusive create/write/fsync of owner and32-byte credential. Retain descriptor and slot through readiness/publication/lifecycle/release. Original-process proof never discharges descendants/effects.
- [ ] Publish only after actual recovery/readiness and exact authenticated binding. Endpoint includes non-secret fingerprint/instance/port/digest/heartbeat and accepted owner/version facts; no credential or credential digest in endpoint/status/doctor/errors. Verify and release recheck genuine identities/protection/source and preserve failures.
- [ ] Keep production unavailable without actual admitted source/protection and valid completion/reconciliation evidence. Core schedules remain explicitly unverified. Run GREEN, original169VC, all affected producer regressions and genuine full CI, then fresh review/native delivery and commit.

```js
// Protocol ports backed by owned real temporary files and sockets;
// installed source assurance is deliberately unavailable, not injected as genuine.
const result = await acquirePortableOwnerCore({ ports, budget: { signal, deadline } });
assert.equal(result.verified, false);
await result.publish();
assert.equal(await result.verify(), true); // protocol state only
assert.equal(isPortableBrokerOwner(result), false);
const released = await result.release();
assert.equal(released.released, true);
assert.deepEqual(released.outstandingObligations, []);
const production = await acquirePortableOwner({
  worktree,
  paths,
  reconcile,
  protection,
  signal,
  deadline,
});
assert.equal(production.kind, 'indeterminate');
assert.equal(production.reason, 'source-class-unavailable');
assert.equal(await testStore.ownerExists(), false);
```

##### Concrete Safety and Verification Boundary

All positive schedules before170use acquirePortableOwnerCore, actual test-owned storage/sockets and verified:false. The testStore fixture owns `ownerExists():Promise<boolean>` by actual lstat of its test-owned owner pathname. It supplies all named ports from the explicit core interface; no missing future method or production capability is assumed. Separately exercise acquirePortableOwner production source-class-unavailable/indeterminate and prove no reserved owner file created. Production observes/fences genuine storage substitutions even when source assurance is unavailable.

boundedOwnershipError returns APR_BROKER_STALE with exact bounded blocker/withdrawal obligations. Credential is exclusively in .scratch/peer-review/private/; endpoint is in the sibling runtime/endpoint.json. Post-quarantine mismatch or uncertainty never reaches create. After169lands its bounded transaction seam, whole141acceptance under170/171must execute genuine admitted-class/installed composition and portable cleanup controls using these169test paths in cumulative verifiers. Native169delivery covers the original C4 seam/protocol and production refusals; genuine positive class/installed acceptance remains original C5/C6, avoiding a circular169→170→169delivery gate. Retain all original Scope/ACs and protocol limitations.

**Verification Commands:**

```sh
node --test test/integration/portable-ownership.test.mjs test/unit/ownership-election.test.mjs test/integration/owner-publication.test.mjs test/integration/owner-connection.test.mjs test/unit/portable-owner-lifecycle.test.mjs
```

## Dependency and Delivery Sequence

166/167/168/140 are completed source dependencies. Execute Tasks1→2→3→4 sequentially in native tracked children under169, each integrating into169 through authenticated CI and native merge-back. No parallel implementation. Native child estimates/decomposition decisions remain independent; never shrink a result to avoid24hours.

Root169 retains every original Task4 box and runs its original command plus cumulative producer commands after all children reach Review/Done. Then169 integrates into141;170actual source/capture/adoption and171installed consumers remain required. Whole141 and107 release/activation/provider discharge are not settled by this decomposition.

Preserve source-class unavailable results, failed cleanup/captures and unknown timing. Do not delete execution collateral or worktrees while remaining sibling delivery needs them.

## Explicit Protocol Test Seams and Operation Contracts

Production-positive class support is unavailable until170. Each earlier child must therefore test actual protected filesystem/socket substrate and production refusals, plus explicitly unverified protocol scheduling. This is useful delivered behavior; it never admits a source class or makes a core lease a production lease. Add internal companion modules src/broker/owner-publication-core.mjs (Task1), src/broker/owner-lifecycle-core.mjs (Task3) and src/broker/portable-ownership-core.mjs (Task4) when their injected schedules need separation from genuine producers. Production factories import deterministic transitions but independently validate their genuine capability inputs; no injection or registration option is exposed by them. Internal protocol exports always return verified:false and are rejected by every production predicate.

Task1 core createHeldPrivatePublicationCore({store,name,bytes,budget}) consumes store.createExclusive(name,bytes), read(name), replace(expected,bytes), quarantine(expected,destination), unlink(expected) and close(descriptor). Snapshots contain exact copied bytes plus descriptor/file/root/parent generation; effects require an exact expected snapshot. The core is a retained transaction mechanism with no source/class or protection assurance. Production createHeldPrivatePublication additionally validates the actual guard and private C3 lease; it cannot accept this core as an authorization handle. Quarantine receipt includes original locator, fresh quarantine locator, exact bytes/identity and uncertain outcome/cleanup obligations. HeldPrivatePublication.snapshot(context), verify(context), replace(expected,bytes,context), withdraw(expected,context), close(context), retainedGeneration() have explicit contracts: only retainedGeneration is read-only last-known metadata and accepts no fresh context. Descriptor close alone does not prove name withdrawal.

Task2 connection exposes request({operation,body,actionId,signal,deadline}), wait({afterCursor,signal,deadline}) and close({signal,deadline}). Actual socket is private; request and wait cannot accept an agent/socket override. The nonce proof includes domain separation, exact instance/worktree/owner-version facts, fresh client nonce, the server-observed IPv4 local/remote address/port tuple and exact observed endpoint port. The client compares that tuple with its own reversed socket tuple before transmitting a bearer; a relay cannot substitute its upstream tuple. Server proof route is internal HTTP control, outside adopted public operational schemas, bounded by existing header/admission limits; no operational dispatch occurs. Verify the proof with timing-safe comparison. The HTTP agent only returns the proved live socket and refuses allocation of a replacement socket before headers. No request retries after socket loss.

Task3 createOwnerLifecycleCore({ports,budget}) consumes publication verify/withdraw/close, endpoint verify/withdraw/close, source observation and ready-connection verification ports. Its publish() drives those ports under the original startup context before completing; verify(context) and release(context) require completion for an independently supplied context, reject overlap synchronously and retain one original slot. It returns verified:false and cannot be passed to the production factory. An expired or aborted original startup never completes. All later-operation contexts require finite monotonic deadlines within30000ms and an actual AbortSignal; an AsyncLocalStorage marker reserves admission synchronously and rejects context renewal from inside an active lifecycle operation, including callbacks. Test scheduling with a mutable test-only monotonic clock and retained state: after publish succeeds, advance beyond startup deadline, verify under a distinct top-level context and assert the slot still exists; start release then verify and assert refusal before any port effect. No completion setter is exported. The production completion transition runs the same checks against genuine Task1/2 and actual C2/C3 producers.

Task4 acquirePortableOwnerCore({ports,budget}) consumes bounded election, read-state, original-process observation, endpoint observation, reconcile, quarantine and owner-creation ports. Its fixture results are always unverified; arbitrary reconcile:true never enables production. Production reconciliation reads the guarded actual registry/manual/wake/provider records and validates each applicable producer's evidence. Missing implementation of a later producer returns unavailable/unknown rather than allowing creation. Preserve owner-live.owner from C3; construct a verified binding only from privately registered authenticated owner evidence, never treat it as a caller binding object.

For each task, begin with its named executable command, observe the intended missing-export or violated invariant RED, implement the defined producer seam, rerun the complete affected command to GREEN, and commit [#child] with exact trace. Add tests named copied-capability-refused, changed-generation-preserved, original-budget-never-renewed and cleanup-obligation-retained where the task owns those invariants. Server authentication tests additionally retain real accepted requests to prove existing #140 compatibility. Keep test-only scheduling flags/observers out of production options.

## Semantic and Coverage Self-Review

All seven native intent questions are yes for each selected task: the named clients, owners and recovery controllers are real beneficiaries; their capability, gap and avoided failure are distinct; the original169Scope and accepted107Task2 ground the claims; each task is readable independently. Task1 owns generation/descriptor/quarantine, Task2 credential-safe connection, Task3 lifetime/deadline/provenance, Task4 original169composition. ReviewFocus1 belongs toTask2,2 toTask3,3 toTask1/4,4 toall producer boundaries,5 toTask1/3/4. Original169boxes remain parent obligations rather than being deleted. No source-class admission, installed journey, descendant discharge, normal activation or publication is claimed.
