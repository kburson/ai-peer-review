[12:11:48]
## Verdict

changes-required

This is my first XPR pass on the supplied plan bytes, so there are no earlier PXPR IDs to carry over. I read the brief, the complete plan, the complete spec and the dependency observations. I also used Read to check the source seams listed below. I did not compute or verify any file hash, including the spec SHA-256 the plan claims. I did not run any fixture, test or CI job.

Source checked with Read: `package.json`, `.github/workflows/ci.yml`, `native/broker-security/addon.cc`, `src/broker/{platform,ownership,ipc,identity,participant-binding}.mjs`, `src/protocol/{process-identity,record-lineage}.mjs`, `src/providers/{process-lifetime,claude-stream,codex-session}.mjs`, `src/transport/live-wait.mjs`, `src/authority/verify.mjs` and `test/helpers/npm-command.mjs`. I also confirmed that several regression test files the plan reuses exist. The source seams the plan describes match what I saw.

## Findings

### PXPR-001 — High — Task 2 (Protected Storage and Exclusive Ownership) / Task 4 gating

**Failure:** The replacement ownership model loses the property the current code relies on, and the plan postpones the fix past native retirement.

- `src/broker/ownership.mjs:108` relies on `platform.acquireExclusive`, a native OS lock: "The OS lock excludes a live broker." The kernel releases that lock automatically when the process dies.
- The portable replacement uses `'wx'` file creation plus a held descriptor. That file does not disappear when the owner dies.
- Task 2 gives stale-owner reclamation to "Task17's evidence-backed stale-owner reconciliation callback; unresolved stale ownership refuses before Task17 exists."
- Task 4 retires native after "Tasks1–3 portable lifecycle proof", but Task 17 comes after Tasks 8–16.

**Result:** A portable broker shipped after Task 4 permanently blocks a worktree after any broker crash. That regresses the "stale recovery" and "reconciliation" proof the spec requires before native removal (Migration Principles).

**A second gap:** Task 2 says "Reclaim only proved owner death under lock" but never names which lock. Two reclaimers can each prove the same death. One can then unlink the other's freshly created owner file.

**Evidence:** `ownership.mjs:89-123`; `platform.mjs` `acquireExclusive` / `reclaimStaleEndpoint`. Spec: "stale ownership needs reconciliation, never age-only takeover" and "Remove native closure only after JavaScript broker proves lifecycle, authentication, concurrency, stale recovery, reconciliation…".

**Required correction:**
- Make broker-owner death proof part of Task 2, using existing primitives:
  - identity from `observeProcessIdentity` (PID, process start, boot);
  - an authenticated instance probe on the recorded endpoint;
  - pending provider/registry obligations still go to the existing `reconcile` contract.
- Specify reclaim as compare-and-swap:
  - rename the stale owner file to a unique quarantine name;
  - re-verify that the quarantined bytes and identity equal the proved-dead owner;
  - only then create the new owner with `'wx'`;
  - add a test with two concurrent reclaimers.
- State that Task 4 requires this Task 2 deliverable. It does not require Task 17.

### PXPR-002 — High — Task 3 (Genuine Host Epoch and Descendant Termination)

**Failure:** Task 3 says to "Extend existing OS probes into versioned genuine boot observations", naming a "macOS full-precision actual OS boot source" and a "Windows documented OS boot source". The existing probes use timestamps derived from the clock:

- `process-identity.mjs:70` uses macOS `kern.boottime` as `boot_id`;
- `process-identity.mjs:105` uses Windows `Win32_OperatingSystem.LastBootUpTime` as `boot_id`.

Both values are computed as current time minus uptime. They can shift after a wall-clock adjustment or time sync with no reboot. The `terminatedByRestart` check tests `launchEpoch.boot_epoch !== freshObservation.boot_epoch`, so a clock correction would produce a false "proved restart". That would discharge writer fences and could release the FUR lease while writers are still alive.

**Evidence:** Spec: "A broker-instance change, PID absence, wall-clock estimate, os.uptime-derived timestamp or operator assertion is not a verified boot-epoch change." Spec: "Conformance must prove that the source distinguishes full restarts from broker restarts, sleep/resume and host-identity changes."

**Required correction:**
- Accept only boot identifiers whose inequality means a kernel boot. Examples: Linux `/proc/sys/kernel/random/boot_id`, and macOS `kern.bootsessionuuid` (I have not independently verified it). Windows needs a conformance-verified kernel boot counter or identifier, or it reports `assurance=unknown`.
- Classify timestamp-derived sources as non-proving. Inequality between them must never yield `terminatedByRestart`.
- Add negative fixtures for:
  - a wall-clock adjustment or NTP step between capture and verify;
  - sleep/resume;
  - Windows Fast Startup, with whatever the conformance shows.
- Add a live negative step: change system time, then verify reports no epoch change.
- Keep the existing PID-reuse probes separate. Their equality-based use does not by itself grant discharge.

### PXPR-003 — High — Prerequisites and Ownership / Task 4 / Review and Execution Handoff

**Failure:** The plan never gives an executable path to the user's urgent goal (no native build in the package or CI) that is separate from final-release gating.

1. **Contradiction about what Task 5 blocks.**
   - Prerequisites says "Portable transport/protection/audit can proceed behind non-public boundaries."
   - The Handoff says "Implementation still requires separately governed Plan approval and Task5 resolution", with no carve-out for Tasks 1–4.
2. **Task 4 depends on Task 3 without saying how much.**
   - Task 4 requires "Tasks1–3 portable lifecycle proof".
   - Task 3 explicitly allows that containment/boot proof may be infeasible ("retain platform feasibility blocker").
   - The native helper never provided descendant containment or boot proof. Its contract is private directories, exclusive lock, private endpoint and peer user (`addon.cc:370-393`). So Task 3 is not a parity requirement for native removal. As written, an infeasible Task 3 could block native removal indefinitely.
3. **No policy for a native-free package before the final release.**
   - The plan forbids only the "final replacement release".
   - It never says whether a non-final, native-free package may ship, or what it must satisfy.
   - Shipping Task 4 implicitly settles the "Legacy recovery" conflict for native-era active broker reviews, because the new package cannot run the native IPC adapter.

**Required correction:**
- State that Tasks 1, 2 and 4 are exempt from the Task 5 gate.
- Define Task 4's native-removal predicate as parity with the native contract:
  - Task 1 authentication and bounds;
  - Task 2 protection, ownership and stale reclamation (PXPR-001);
  - installed lifecycle and concurrency on every CI OS.
- Keep Task 3 as a separate topology-advertisement and release gate.
- Specify how a non-final, native-free package treats native-era state: if native-era broker ownership or active/fenced legacy journals exist, it refuses with a fail-closed error and drain/retain guidance, never resuming or reinterpreting them. This refusal is compatible with both the #107 "retain old installation" and #102 "read-only/fenced" positions, so it does not preempt Task 5.
- Require that package to make no final-replacement or journey-support claims.

### PXPR-004 — Medium — Task 1 (Async Authenticated HTTP Transport)

**Failure:**

1. **The test clock cannot drive Node's built-in timeouts.**
   - The concurrency test advances an injected `f.clock` by 10 000 ms and expects the slow socket destroyed.
   - The implementation step only says "Set receipt/idle deadlines" with `http.createServer`.
   - Node's built-in `headersTimeout` / `requestTimeout` use real timers, and Node checks them every `connectionsCheckingInterval` (default 30 s). So the 10-second bound can actually be enforced 30+ seconds late, and fake time cannot exercise it.
2. **One slow socket cannot show resistance to starvation.** Review Focus 1 claims slow unauthenticated connections cannot starve status/cancel. A single slow connection does not test that.
3. **The activation boundary is unclear.** Task 1 modifies `service.mjs`, `client.mjs` and `bin/peer-review-broker.mjs` before Task 2 provides verified private storage. Nothing says whether the HTTP listener and its credential stay dormant until Task 2.

**Evidence:** Spec limits: "header/body receipt to 10 seconds and unauthenticated idle connections to 5 seconds". Spec: "Deterministic tests advance fake time with zero logical threshold tolerance."

**Required correction:**
- Implement the receipt and idle deadlines as per-socket timers driven by the injected clock, or set `connectionsCheckingInterval` accordingly.
- Add a real-timer conformance test proving enforcement within a stated tolerance.
- Change the concurrency test to N concurrent slow or partial-header sockets (state N, e.g. 64). Status and cancel must still succeed, and the plan must document any connection cap.
- State that the portable listener is unreachable from shipped entry points until Task 2's protection receipt gates it.

### PXPR-005 — Medium — Task 2 (Windows ACL and macOS ACL protection)

**Failure:**

1. **Elevated owners.** Under an elevated token, such as GitHub Windows runners or an admin shell, Windows commonly assigns new objects the owner `BUILTIN\Administrators`, not the user SID. A strict "owner SID matches" check would fail closed on CI and for many users. The plan does not define which owners are acceptable.
2. **"Trusted system allowances" is undefined.** It is unclear whether Administrators or other admin users count as "foreign read".
3. **macOS extended ACLs.** macOS ACL entries are not reflected in mode bits. A `0600` file with an `everyone allow read` ACE passes "POSIX owner/mode/type checks". By contrast, Linux POSIX ACLs are masked by mode 0600/0700.
4. **Per-write cost.** "verify roots at each write" with a PowerShell `Get-Acl` spawn (about 1 s each) is impractical.
5. **Fixture-only coverage.** Only the `windowsFixture` adapter is tested. No test verifies the ACL actually produced on a real Windows host.

**Evidence:** Spec: "verified OS-user access protections… POSIX mode bits alone are not a Windows ACL guarantee". The existing `process-identity.mjs` already uses a fixed `powershell.exe` path.

**Required correction:**
- Specify the exact accepted principal set and owner rule. That includes an elevated-owner case and whether Administrators/SYSTEM are allowances, with fail-closed reasons.
- Add a macOS ACL check, for example a fixed `/bin/ls -led` invocation parsed strictly, or report unknown.
- Distinguish ACL establishment and verification (at setup and broker start) from cheaper per-write physical-identity rechecks (lstat, inode, parent identity).
- Add real-OS integration tests on Windows and macOS CI that inject a foreign ACE and require `verified=false`.

### PXPR-006 — Medium — Task 5 (Reconcile Accepted Contract Owners) verification

**Failure:** Task 5's verification command runs `node --test test/unit/runtime-contract-adoption.test.mjs`. That file and `assertContractAdoption` are created in Task 8 ("`assertContractAdoption(record):void` is created in Task8"; Task 8 Files list). So the verifier cannot run when Task 5 is delivered. It also conflates review adoption with a code test, even though the Task 5 acceptance criteria say tests are not adoption.

**Required correction:**
- Make Task 5's verifier executable at its own step:
  - `git diff --check`;
  - a governed spec-review acceptance reference for the reconciliation document;
  - validation of `test/fixtures/runtime-contract-adoption.json` with a checker created in Task 5, or JSON-schema validation through an existing tool.
- Move the `assertContractAdoption` unit test explicitly to Task 8's verifier, which already lists it.

### PXPR-007 — Medium — Task 18 (Installed Release Conformance) verifier and evidence provenance

**Failure:**

- `node scripts/verify-portable-release.mjs --gates test/fixtures/release-gates.json` runs before `node test/live/installed-runtime-conformance.mjs --output …`.
- The verifier receives neither the conformance output nor the packed tarball digest, yet `verifyPortableRelease({packageDigest,capabilityEvidence,…})` needs both.
- Task 3's manual capture → reboot → verify produces `.scratch/peer-review/host-epoch-{before,after}.json`. No task defines how that evidence is identified, made traceable to its source and checked by the release verifier: host, OS build, package digest, Node version, timestamps and source/version/assurance. Left undefined, gate 7 rests on an operator's word, which the spec forbids as proof ("No recovery action accepts … an operator assertion as proof of death").

**Required correction:**
- Order the commands: `npm pack` → installed conformance → per-OS live epoch evidence → verifier.
- Give the verifier explicit `--package`, `--conformance` and `--host-epoch` inputs.
- Define a versioned evidence schema for live conformance and epoch records, bound to the exact package digest and environment. The verifier must reject missing, mismatched or unsigned-by-run records.

### PXPR-008 — Medium — Spec coverage (Tasks 15/16/9)

**Failure:** No task delivers a concrete visible monitor surface or two broker-lifecycle duties.

1. **No visible monitor surface.** Every `unattended=false` start must reject `APR_MONITOR_SURFACE_REQUIRED` unless a verified visible surface exists. Task 15 offers only `verifyVisibleObserver(host)` and `renderMonitor`. No task delivers:
   - an MCP progress surface for a named host;
   - the spec's "CLI watch" surface;
   - the "local read-only monitor" with its "separate redacted projection".

   Task 16's CLI operations omit watch. Without one of these, every attended start is rejected.
2. **Broker on-demand start and idle exit.** Spec: "starts on first managed run… exits after a configurable idle grace" using `broker.idle_grace_ms`. No task explicitly owns this for the portable broker.
3. **Wrapper-side termination after broker loss.** Spec: "Participant wrappers monitor its lease and terminate only the exact owned provider process tree… after permanent broker loss." Neither Task 9's wrapper nor Task 3's containment explicitly owns it.

**Required correction:** Assign each item to a task. Each needs:
- files and interfaces;
- a red test, e.g. a CLI watch fixture with a durable cursor, idle-grace fake-time exit, or a wrapper killed-broker fixture that retains the fence when descendant exit is unproved;
- a gate-table row (gates 5/6/7).

### PXPR-009 — Low — Task 4 CI scope

**Failure:** Task 4 names "Node24/26/current × Ubuntu/macOS/Windows and npm11.8.0/12.0.2" coverage. Two other places also depend on native provisioning:

- the `phase-2-boundary` job reuses `*python`, `*posix-compiler`, `*node-development`, `*warm-broker` and `*offline-broker` (`ci.yml:200-204`);
- the npm-pack job's step "Verify packed builder, dependency and source inventory" asserts builder inventory.

Separately, Linux `unshare --net` brings up a namespace whose loopback interface is down.

**Required correction:**
- List `phase-2-boundary` and the npm-pack inventory step in the migration, preserving `verify-extraction.mjs --require-legacy-removed` and `npm ls --omit=dev --json`.
- State the Linux offline policy explicitly: bring `lo` up, then assert a loopback connection succeeds and external egress fails.

## Open finding set

PXPR-001, PXPR-002, PXPR-003, PXPR-004, PXPR-005, PXPR-006, PXPR-007, PXPR-008, PXPR-009. No finding is resolved; this is the first XPR pass.

## Nonblocking advice

- The Interfaces blocks of Tasks 1, 2, 3 and 6 begin "Produces: Consumes …", which repeats the consumed contract. Remove that wording so produced and consumed contracts stay distinct.
- Task 7 builds the isolated #107 layered-merge resolver even though #102 may supersede it. Consider deferring it until Task 5 resolves, to avoid golden fixtures for a contract that might be reversed.
- `test/helpers/npm-command.mjs` `runNpm` uses `execFileSync`. `npm ls` exits non-zero on missing or extraneous packages, so the Task 4 snippet should capture the error's stdout or use `--all` handling deliberately.

## What was correctly addressed

- The #102 conflict is surfaced rather than silently resolved, and gates 8 and 15 are marked blocked.
- Task 5 picks no winner.
- #30, #34 and #109 ownership is respected, with no duplicate child for #109.
- The final release stays gated on all 15 gates and owner adoption.

## Limits

- This acceptance or rejection reviews the document only. It does not prove that any fixture, CI job or installed provider/OS capability works.
- I did not verify the plan's spec SHA-256 or line count.
- The macOS `kern.bootsessionuuid` example and the Windows behaviour notes (elevated object owner, `LastBootUpTime` derivation, `connectionsCheckingInterval` default) are from my platform knowledge. Conformance must confirm them before implementation relies on them.
- Model identity and usage observations belong to the controller's receipts, not this text.
