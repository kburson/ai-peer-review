# XPR Round 1 Author Response

**Status:** Revised candidate ready for independent re-review; author does not accept the plan or close reviewer findings.

**Issue:** #107. **Author:** same dispatched GPT-6.1 Sol / high participant as plan creation and SAR. **Reviewer:** independent requested Claude Opus 5.5 / high, as recorded in the controller's provider receipt. Requested author model/effort comes from dispatch; author runtime identity, native token counts and cost are unavailable to this worker. No usage or stronger identity assurance is invented.

## Ordered Lineage

The accepted SAR ancestor remains immutable at SHA256 `ad4431df0c5d291a8fe909de1f9227aef165bb8964e3eb853296899e110a3c60`. This XPR revision descends from that accepted artifact; the ancestor's SAR acceptance is not an assertion that later revised bytes were self-reviewed or independently accepted.

- Before snapshot: [xpr-author-response-snapshot-before-1.md](2026-10-03-107-portable-runtime-xpr-author-response-snapshot-before-1.md), exact ancestor bytes.
- After snapshot: [xpr-author-response-snapshot-after-1.md](2026-10-03-107-portable-runtime-xpr-author-response-snapshot-after-1.md), SHA256 `771e011fb573853188bfb7965e73d4a29116ce3636e583344d298611eae9b409`.
- Actual unified patch: [xpr-author-response-patch-1.md](2026-10-03-107-portable-runtime-xpr-author-response-patch-1.md), generated from those snapshots, including formatting changes.
- Revised plan: [2026-10-03-107-agent-first-portable-runtime.md](../../plans/2026-10-03-107-agent-first-portable-runtime.md), same exact after digest.
- Reviewed input and raw critique: [round-1-reviewer-response.md](2026-10-03-107-portable-runtime-xpr-round-1-reviewer-response.md).
- Independent provider observation: [round-1-provider-receipt.md](2026-10-03-107-portable-runtime-xpr-round-1-provider-receipt.md).

Round1 consumed of12. Every disposition below is an author proposal for reviewer confirmation; none is independently resolved yet. Hydration, Plan approval and implementation remain controller-owned and unperformed.

## Findings

### PXPR-001

**Disposition:** Addressed with a stronger serialized reclaim design; suggested rename-only compare-and-swap is not adopted.

Verified `src/broker/ownership.mjs` relies on a native OS lock excluding a live broker. Exclusive file creation alone persists after death, so deferral to Task17 was insufficient. Task2 now owns broker-only proof using exact process observations, authenticated endpoint probing and registry/provider-obligation reconciliation, followed by a protected pure-JavaScript election held across owner lifetime and reclaim. All initial claimers and reclaimers use durable Lamport bakery contender ordering; crashed contenders require positive exact death proof, never age. Unknown process/provider obligations block.

A rename followed by comparing moved bytes can already displace a newly published live generation if a competing reclaimer wins first. The plan instead serializes shared owner-path changes before rereading/quarantining bytes and exclusive replacement. New inventory `src/broker/ownership-election.mjs` and ElectionLease interface make this concrete. Tests include two reclaimers plus live newcomer, choosing/broker/quarantine-before-create crashes, restart and substitution. This is planned algorithm work requiring mutual-exclusion conformance, not a claim the implementation already exists. Task17 remains responsible for richer run/provider recovery.

**Verification:** Native ownership source inspected; plan Task2 and Task4 dependency text checked. No production ownership fixture was run.

### PXPR-002

**Disposition:** Addressed; platform candidate suggestions retain unknown assurance until live conformance.

Verified current `src/protocol/process-identity.mjs` uses Linux boot_id, macOS kern.boottime and Windows LastBootUpTime with process creation data. PID identity stays separate from reboot proof. Task3 no longer promotes full-precision timestamps into genuine epochs. It requires an installed, documented stable boot identifier, negative clock/NTP/sleep/broker-restart/Fast Startup tests and actual authorized reboot change.

Apple XNU declares the read-only `kern.bootsessionuuid` interface separately from boottime, supporting its candidacy, not proof of current installed behavior. Our stock sysctl probe returned Operation not permitted; the plan records no current UUID assurance. [Apple XNU source](https://github.com/apple-oss-distributions/xnu/blob/main/bsd/kern/kern_sysctl.c) Windows Fast Startup restores the kernel image from hibernation, so it receives separate conformance; no Windows boot identifier is asserted available. [Microsoft Fast Startup documentation](https://learn.microsoft.com/en-us/windows-hardware/drivers/kernel/distinguishing-fast-startup-from-wake-from-hibernation)

**Verification:** Current process source and primary documentation inspected; local macOS candidate probe failed closed. No reboot, clock change or Windows/macOS live conformance was performed.

### PXPR-003

**Disposition:** Addressed with explicit urgent milestone and retained final blockers.

Tasks1/2/4 now deliver the portable broker independently of Tasks3/5 once real installed auth/protection/effective ACL/ownership/stale broker recovery/lifecycle/concurrency passes all target OSs. Native-addon exports were inspected: private directory, OS lock, local socket and peer-user functions, not descendant or epoch guarantees. Task3 therefore gates additional recovery claims and final release without delaying native removal itself.

Until Task5 jointly resolves #102/#107, new package refuses native-era broker and active/recoverable/fenced state, preserves exact legacy history read-only and provides bounded drain/retain-original-installation guidance. It neither routes to older images nor resumes/reinterprets old journals. Prerequisites, Task4, architecture and execution handoff agree on this carveout. All15 gates and owner adoption still gate final replacement.

**Verification:** Native export list inspected; checked plan entry/order/handoff and Task4 predicate for consistent dependency. No package release or migration was performed.

### PXPR-004

**Disposition:** Addressed with executable test obligations and production activation fence.

Task1 specifies injected per-socket monotonic clocks: five-second unauthenticated inactivity, ten-second absolute receipt deadline, byte-drip behavior, timer cancellation and distinct authenticated wait lifetime. Node's default connectionsCheckingInterval is30000ms; built-in request/header timeouts alone cannot prove the required bounds. [Node24 HTTP documentation](https://nodejs.org/download/release/latest-v24.x/docs/api/http.html)

Real-clock tests with explicit <=250ms unloaded-runner scheduler tolerance supplement fake clocks; lateness fails or is inconclusive. The plan includes64 simultaneous slow sockets with authenticated status/cancel under1000ms, bounded connection admission/exhaustion cleanup. Production listener/endpoint publication requires Task2 verified authority; injected bindings are only fixtures.

**Verification:** Official Node option documentation checked, test sketch and acceptance criteria revised. No real HTTP timing or load test was run.

### PXPR-005

**Disposition:** Addressed with explicit trusted principals and macOS ACL scope.

Task2 now states Windows data principal/current SID, documented SYSTEM/Administrators allowances, verified elevated group owner/membership/effective rights, fixed System32 PowerShell location and structured arguments. Object owner is token-derived and can be a valid group, so strict user SID equality alone is inadequate. [Microsoft object-owner documentation](https://learn.microsoft.com/en-us/windows/win32/secauthz/owner-of-a-new-object)

macOS extended ACL/effective-rights observation is explicit. Setup/start performs full OS security checks; per-write descriptor/parent/type/link integrity checks do not claim to detect every trusted-account ACL edit. Foreign ACL grants, inheritance, unknown ordering and alias observations fail closed. Actual elevated/non-elevated Windows and macOS foreign ACL fixtures are required.

**Verification:** Microsoft primary documentation checked and existing protection seams inspected. OS ACL fixture work is future implementation; no Windows rights assurance is claimed.

### PXPR-006

**Disposition:** Addressed by moving the verifier into the owning task.

Task5 creates `scripts/check-runtime-contract-adoption.mjs` for document/adoption digests and authentic accepted review references. Its verification command names that owned checker plus git diff --check. Task8 still owns runtime assertContractAdoption and its unit test; Task5 no longer invokes an unavailable future test.

**Verification:** Task5/Task8 file inventories, produced contracts and commands checked; current AITM parser validates all18 task blocks. The proposed checker does not exist yet and was not executed.

### PXPR-007

**Disposition:** Addressed with ordered concrete inputs and versioned harness evidence.

Task18 packs the actual tarball first, resolves the single filename from npm's JSON receipt, then captures installed conformance and host epoch before invoking the release verifier. Explicit --package, --conformance, --host-epoch and --run-binding inputs bind evidence to exact package/OS/build/Node/provider/adapter/capture context. Task3 owns host-epoch/run-binding schemas; Task18 owns installed-conformance schema and completeness/tamper verifier tests.

Per-run Node crypto signatures, pre-capture registered public-key fingerprint/run binding and exact references establish harness consistency under the stated same-user trust boundary; they are not external identity attestation. Missing, swapped, unsigned, mismatched, mocked-only or unavailable positive evidence blocks support/release claims. Authorized real reboot and negatives remain required.

**Verification:** Command order, schemas/interfaces and explicit negative fixtures checked. No tarball, provider conformance, host proof or verifier result was fabricated.

### PXPR-008

**Disposition:** Addressed with owned production seams, interfaces and red tests.

Task15 explicitly owns `src/cli/watch.mjs`, `src/broker/lifecycle.mjs`, real CLI-watch, broker-lifecycle and wrapper-loss integration tests, and relevant broker/wrapper/CLI modifications. watchRun streams durable redacted cursors through existing wait/status operations, with a verified hosted surface consuming the same projection. It adds no tenth API operation.

On-demand startup, broker-free absent status/preview, configured60000ms idle shutdown, simultaneous startup and refusal to exit while active/recoverable/fenced are covered. Wrapper lease/process loss revokes bindings, fences dispatch and cancels the exact owned containment tree; Task3 must prove every writer dead and Task17 separately reconcile effects before release. Gate5/6/7 traceability includes these tests.

**Verification:** Complete accepted spec's monitor/lifecycle/disconnect coverage mapped to Task15 inventory and commands. No lifecycle/descendant test was run.

### PXPR-009

**Disposition:** Addressed without deleting installed audit coverage.

Task4 explicitly migrates native-dependent CI phase-2 and npm-pack build-warm/inventory steps, preserving tarball extraction, npm ls, handoff tests, provider prerequisites and diagnostics. Linux network-namespace fixture brings lo up before loopback HTTP proof while external routes remain absent; Windows/macOS policies retain separate local-success/external-failure tests and restoration.

**Verification:** CI native anchors and packed-cache/npm test helper source inspected; plan inventory/implementation changed. No CI job or firewall mutation was performed.

## Nonblocking Advice

1. **Interfaces wording:** Adopted. Tasks1/2/3/6 no longer nest consumed text inside produced contract.
2. **Defer layered resolver:** Adopted. Task7 starts after Task5; resolveConfigV2 accepts adoptedSources. Original #107 layering requirements remain explicitly compared and dispositioned in the reviewed amendment and gate15; no silent narrowing or premature conflicting golden fixtures.
3. **npm ls diagnostic stdout:** Adopted. The exact runNpm(tool,args,options) signature remains. Nonzero installed tree errors capture diagnostic stdout and throw an invalid-tree failure, rather than turn missing/extraneous dependencies into a clean audit. Source uses execFileSync and supports that error channel.

## Verification and Remaining Gates

Targeted plan Prettier and Markdownlint pass; installed AITM extractPlanTasks/validateSplitTasks reports18 tasks, ok=true, no errors/violations. Actual unified patch reconstruction matches exact before/after bytes. CSpell deliberately excludes docs/superpowers; not evaluated, with no configuration change.

These are documentation checks only. No source changes, Git mutations, AITM transitions, issue hydration, native build/setup, provider launch, OS ACL modification, reboot, clock change or product implementation occurred. #102/#107 adoption and unproved platform capability remain implementation/release blockers explicitly represented by the plan. The nine findings await independent reviewer confirmation on the exact new digest; author requests the next Claude pass and freezes the plan.
