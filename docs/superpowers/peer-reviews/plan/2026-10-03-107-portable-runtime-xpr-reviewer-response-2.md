[12:38:22]
## Verdict

changes-required

This is a fresh full critique of the revised plan bytes supplied in round 2. Seven findings remain open: two carried over in narrower form and five new. I read the complete revised plan, the author's round-1 response and the dependency observations, against the unchanged accepted spec. I also used Read on `src/broker/paths.mjs`, `src/broker/client.mjs` and `bin/peer-review-claude-hook.mjs`, plus the round-1 source reads. I did not compute or verify any file hash. I did not run any fixture, test, CI job or live probe. The author's verification claims are taken as stated, not confirmed.

## Disposition of round-1 findings

| ID | Disposition | Reason |
|---|---|---|
| PXPR-001 | **Resolved** | Task 2 now owns proof that the broker is dead, with a durable election (a Lamport bakery algorithm) held for the owner's whole lifetime. It no longer depends on Task 17. Concurrent-reclaimer, crash-point and substitution tests are named. Two refinements are filed as new findings PXPR-010 and PXPR-014. |
| PXPR-002 | **Resolved** | Timestamp boot sources are now explicitly non-proof. Candidate sources need conformance, and `boot_epoch` stays null until proved. Clock, NTP, sleep and Fast Startup negatives plus a real reboot are required. |
| PXPR-003 | **Resolved** | The Tasks 1/2/4 milestone has a stated parity predicate and is independent of Tasks 3/5. Legacy state is refused rather than resumed, and the handoff text is now consistent. How the refusal detects native-era state is filed as PXPR-011. |
| PXPR-004 | **Resolved** | The plan adds per-socket timers on an injected clock, a non-renewable receipt deadline and real-clock tests. It also adds a 64-socket concurrency test, admission caps and a production fence before Task 2. See advice 1. |
| PXPR-005 | **Resolved** | Trusted Windows principals and elevated owners are defined, with a fixed PowerShell location. macOS extended-ACL checks are added. Full verification happens at setup/start, with cheaper checks per write, and real-OS fixtures are required. |
| PXPR-006 | **Resolved** | Task 5 now owns its own checker. The runtime assertion and its unit test stay in Task 8. |
| PXPR-007 | **Still open (narrowed)** | Pack-first ordering and explicit verifier inputs were added, but gaps remain (below). |
| PXPR-008 | **Still open (narrowed)** | CLI watch, on-demand start, idle exit and wrapper-loss tests now have owners. The required behaviour after the broker itself is lost does not. |
| PXPR-009 | **Resolved** | The phase-2 and npm-pack steps are migrated and Linux brings `lo` up. |

## Open findings

### PXPR-007 — Medium — Task 3 / Task 18: release evidence commands still cannot run as written

**Failures:**

1. **Nothing creates the run binding.** Every capture and verify command consumes `.scratch/peer-review/conformance-run-binding.json`, and the plan says "Harness registers run binding before capture". No command, mode or interface produces that file.
2. **Task 3 and Task 18 call the same script differently.** Task 3's commands invoke `host-epoch-conformance.mjs capture --output` with no `--package` or `--run-binding`. Task 18 invokes the same script with both.
3. **The signing key's survival across reboot is unspecified.** Evidence is signed with a per-run key. Capture happens before the reboot and verify after it, so the key must persist across the reboot. The plan doesn't say where it is stored or how it is protected (presumably Task 2 private storage), or how it is destroyed after verification.
4. **The verifier takes only one platform's evidence.** It accepts a single `--conformance` and a single `--host-epoch`. The acceptance criteria require evidence for each advertised OS/provider combination. Nothing defines how per-platform evidence sets are aggregated, or how one platform's file is rejected when presented for another.
5. **The commands are POSIX-shell only.** `PACKAGE_PATH="$(…)"` and the `#` comments will not run in Windows PowerShell or cmd, yet Windows conformance is required.

**Required correction:**
- Add a `bind` mode (or a separate harness command) that creates the run binding and key in protected storage, and state when the key is retained and destroyed.
- Make the Task 3 and Task 18 invocations identical.
- Have the verifier accept a per-platform evidence manifest, and test cross-platform substitution.
- Replace the shell plumbing with a Node driver script, or give equivalent PowerShell commands.

### PXPR-008 — Medium — Task 15: behaviour after the broker is lost

**Failure:** The spec says: "Participant wrappers monitor its lease and terminate only the exact owned provider process tree … after permanent broker loss. An unproved descendant exit retains the fence even if the direct child is dead."

Task 15 tests only the opposite direction: "Kill wrapper while descendant writes". Nothing tests a broker killed while a wrapper is alive. The plan also never defines "permanent" loss. A broker restart must not make wrappers kill their workers; the spec's "Broker restart before reconciliation" tuple expects reconciliation, not automatic termination.

**Required correction:**
- Add a red test for broker death. The wrapper detects the loss through its lease or IPC.
- Inside a bounded reconnect window, a verified restarted broker leads to reconnect and revalidation, with no kill.
- After the window expires, the wrapper terminates the owned containment tree and records an obligation receipt.
- If descendant death is unproved, the fence stays.
- Define the permanence criterion (for example, lease expiry measured on the injected clock without a verified successor) and its configuration source.

### PXPR-010 — Medium (new) — Task 2: election wait and withdrawal semantics are undefined

**Failure:** `acquireOwnerElection(...):Promise<ElectionLease>` has no signal, deadline or outcome union. The plan says "unknown blocks" and "waiting for earlier live/choosing contenders". The winning slot is held for the broker's whole lifetime. Read literally:

- a second simultaneous start (spec gate 5: "Two simultaneous starts in one worktree acquire one broker") waits behind a live owner indefinitely instead of withdrawing and connecting to it as a client;
- a contender whose death is unknown would hang CLI and MCP callers rather than fail closed.

The test "two reclaimers plus live newcomer" does not state what the newcomer should observe.

**Required correction:**
- Give the election an `AbortSignal` and a deadline on the injected clock.
- Return a closed outcome: `won`, `owner-live` (withdraw the slot and connect), or `indeterminate` (a bounded `APR_BROKER_STALE`-style error naming the blocking contender and the obligation).
- Assert each outcome in tests, including withdrawal of the slot after a client-only join.

### PXPR-011 — Medium (new) — Task 4: how the new package detects native-era state is unspecified

**Failure:** Native-era state does not live where the new state lives.

- **Native-era (source):** the lock and discovery files are `<cache>/ai-peer-review/brokers/<digest>/broker.{lock,json}`, outside the worktree. The endpoint is a POSIX Unix socket under `<endpointRoot>/aipr/v1/` or a Windows named pipe (`src/broker/paths.mjs:192-223`).
- **Portable (plan):** credentials go under `.scratch/peer-review/private/` and the endpoint record under `.scratch/peer-review/runtime/`.

The two lock namespaces never collide, so the "refuses native-era broker ownership" rule is the only thing that excludes them. The plan doesn't say how the refusal works:

- The native OS lock is released by the kernel when the process dies, but the lock file remains. Pure JavaScript cannot test whether a native flock or `LockFileEx` lock is held.
- Without a defined liveness predicate, the new package either (a) refuses forever on any worktree that ever ran v0.4, or (b) treats a leftover file as absence and runs alongside a live native broker.

**Required correction:**
- Enumerate the native-era artifacts that are probed.
- Define liveness evidence: connecting to the Unix socket or named pipe with Node's `net` module, plus `observeProcessIdentity` on the recorded PID.
- Also check for active, recoverable or fenced legacy journals.
- Refuse only when a native broker is live or indeterminate, or when legacy work is active, recoverable or fenced. Quarantine provably stale leftovers with an evidence receipt.
- Add tests for: a live native endpoint, a stale socket file, a hung listener, and terminal-only legacy state.

### PXPR-012 — Low (new) — Gate traceability and an undefined interface after Task 7 moved

**Failures:**

1. **Gate 2's dependency is understated.** Task 7 is now explicitly blocked on Task 5. Gate 2 names Task 7 as an owner (role-count-changing fallback policy, exclusions computed at seal time, counterpart eligibility), but its Dependency cell says only "registered sole grammar". The table therefore implies gate 2 can complete before adoption.
2. **`resolvePolicySources` has no owner.** Task 7's invariant calls `resolvePolicySources(contractAdoption, installation)`, but no task's Interfaces block produces it.

**Required correction:**
- Mark gate 2's fallback-policy assertions as dependent on Task 5/Task 7 adoption.
- Assign `resolvePolicySources` to a producing task (or to the adopted #102 interface) and list it in that task's Interfaces block.

### PXPR-013 — Medium (new) — Tasks 2/4: production callers of the native API are not inventoried

**Failure:** The native helper is used outside ownership and transport. In `src/broker/client.mjs`:

- `createBootstrap` uses `platformSecurity().openPrivateDirectory` on Windows (lines 55-64);
- `fenceManualRecovery` takes recovery ownership with `platform.acquireExclusive(paths.lock, …)` and relies on "the same OS-enforced broker lock across reconciliation and fence publication" (lines 288-299). That is the #106/#117 manual-recovery path.

Task 4's file list covers tests and helpers, but not these production callers or their replacement semantics. Task 1 modifies `client.mjs` only for transport. If Task 2 replaces `platform.mjs` but leaves the old API surface, these calls either fail with `APR_BROKER_START_FAILED` after native removal, or silently lose OS-lock exclusion. Either breaks parity with the native contract, which is the condition for removing native code.

**Required correction:**
- Enumerate every production consumer of `platformSecurity` and its exports, and map each one to its portable replacement:
  - recovery ownership goes through the Task 2 election;
  - the bootstrap private directory goes through `provisionProtectedRoot`.
- Add regression tests for the manual-recovery fence and the Windows bootstrap.
- Add a static check that no production module loads the native binding after Task 4.

### PXPR-014 — Medium (new) — Task 2: the death predicate can treat a clock change as proof of death

**Failure:** Task 2 proves "broker PID/start identity dead" using the existing `observeProcessIdentity`. That function builds `boot_id` from macOS `kern.boottime` and Windows `LastBootUpTime` (`process-identity.mjs:70,105`). Both are derived from the wall clock, which is why PXPR-002 classified them as non-proof.

If the predicate treats an identity mismatch as death, a wall-clock step can make a live but unresponsive broker look dead. A hung broker leaves its endpoint silent, so the endpoint probe gives no signal. The result is reclamation and two brokers owning one worktree, which violates gate 5. Task 3 separates boot proof from PID identity, but Task 2 does not define how its own predicate handles a mismatch.

**Required correction:** State the predicate exactly:
- **dead** only when the probe reports `status:'dead'` (no such PID), or when the same PID has a different start time on the same verified boot;
- a mismatch in clock-derived fields is **unknown**, and unknown refuses.

Add macOS and Windows fixtures for a clock step with a hung owner.

## Complete open finding set

PXPR-007, PXPR-008, PXPR-010, PXPR-011, PXPR-012, PXPR-013, PXPR-014.

Resolved: PXPR-001, PXPR-002, PXPR-003, PXPR-004, PXPR-005, PXPR-006, PXPR-009.

## Nonblocking advice

1. **Task 1 admission caps.** A new connection is unauthenticated until its headers are parsed. So if all 128 unauthenticated slots fill, new status/cancel connections are refused for up to the 10-second receipt bound. "Preserving control capacity" therefore holds only for clients that reuse an authenticated keep-alive connection; say so. Also state whether an "inconclusive" real-clock result counts as passing in CI (it should not).
2. **Task 2 on Windows.** Atomic rename and slot reads can fail with transient `EPERM`/`EBUSY` sharing violations. Bound the retries and treat exhaustion as `indeterminate`.
3. **Coordination with #102.** Task 4 modifies `src/broker/runtime-image.mjs`, which may overlap the #102 work in progress (PR #139). Sequence or rebase deliberately.

## Limits

- This verdict reviews the document only. No fixture, CI job, ACL probe, reboot or provider run was performed or is implied.
- Platform behaviour cited here is from source reading and platform knowledge and needs the conformance work the plan prescribes: Unix socket and named-pipe connectivity from Node, clock-derived boot fields, and Windows sharing violations.
- I did not verify the plan, spec or snapshot digests the author cites.
