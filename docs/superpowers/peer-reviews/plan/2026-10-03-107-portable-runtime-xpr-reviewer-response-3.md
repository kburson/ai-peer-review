[13:05:11]
## Verdict

changes-required

This is a fresh full critique of the round-3 plan bytes. Three findings remain open: PXPR-007 (narrowed further) and two new ones, PXPR-015 and PXPR-016. I re-read the revised plan, the author's round-2 disposition and the dependency refresh against the unchanged accepted spec. I also used Read on `.github/workflows/release.yml` and the start of `src/broker/provider-resources.mjs`, plus earlier source reads. I verified no hash and executed nothing.

## Disposition of previously open findings

| ID | Disposition | Reason |
|---|---|---|
| PXPR-007 | **Still open (narrowed)** | The Node driver, the bind step, key persistence and close, identical Task 3/Task 18 invocations, a per-platform manifest and a single upstream pack are now concrete. Two gaps remain (below). |
| PXPR-008 | **Resolved** | The broker-loss direction now has an owner. The reconnect window is anchored to the last authenticated lease heartbeat, and retries cannot extend it. A successor is revalidated, and only a verified in-window successor avoids termination. Expiry cancels only the owned tree and keeps fences when descendant exit is unproved. Boundary, forged-successor, hung-transport and crash tests are named. See advice 2. |
| PXPR-010 | **Resolved** | The election now returns a closed outcome (`won` / `owner-live` / `indeterminate`), uses a deadline that nested calls cannot renew, and withdraws its own slot before joining a live owner. Windows sharing-violation retries are bounded. |
| PXPR-011 | **Resolved** | The native-era artifact inventory, read-only socket/pipe probes and an evidence-combined classification are specified. The plan admits that probes cannot exclude an old launcher started later. It gates stale quarantine and supported activation on a Task 5 `ActivationBinding`, which is an honest gate on the real #102 conflict. How that gate is enforced is filed as new finding PXPR-015. |
| PXPR-012 | **Resolved** | Gate 2's dependency now names Task 5/Task 7. `resolvePolicySources` is produced by Task 7 as a wrapper over the adopted #102 interface. |
| PXPR-013 | **Resolved** | A native-consumer migration map now exists, covering bootstrap, manual fence, provider resources, identity, IPC/service and the factory/loader. Regression fixtures are named, plus a static check over the full production import graph and the packed inventory. |
| PXPR-014 | **Resolved as scoped** | Clock-derived mismatches, host mismatches, denied probes and malformed output are classified as unknown. The plan also fixes the macOS `ENOENT`/`ESRCH` catch that could misreport a missing probe executable as a dead PID, which the author found. One consequence for macOS/Windows availability is filed as new finding PXPR-016. |

Previously resolved PXPR-001/002/003/004/005/006/009 stay resolved. One note on PXPR-003: the native-free *published package* now waits on Task 5. Only native-free CI and the installed candidate proceed independently. I am not reopening it because the brief allows gating work affected by #102. The user should still know this narrows the urgent goal; see advice 1 for a possible way to shrink the gate.

## Open findings

### PXPR-007 — Medium — Task 3 / Task 18: release evidence matrix still cannot be fully produced as written

**Failures:**

1. **The CI matrix cannot produce rows that need a reboot or a provider.**
   - The release manifest requires a host bundle for "nine OS/Node jobs plus every advertised provider/model/effort/role/topology combination".
   - GitHub-hosted runners cannot do an authorized real reboot and survive it to run `verify-epoch`.
   - The provider rows need credentials that only the optional Claude probe job has (`ci.yml:216-249`).
   - So the matrix mixes CI-produced rows with rows only a manual host can produce. Nothing says:
     - which rows require epoch evidence (presumably per advertised OS and capability, not per Node version);
     - how bundles from a manual host are ingested ("CI downloads all required actual host artifact bundles before assemble" covers CI artifacts only);
     - which job runs `assemble`.
   - As written, release is either permanently blocked or depends on an unspecified ingestion path.
2. **The meaning of "trusted" fingerprint is undefined.**
   - Tests require rejecting an "untrusted fingerprint", but each bundle is signed by a per-run key that the same harness registers inside its own run binding.
   - Verifying a signature against a fingerprint from the same bundle is circular; replacing both together is undetectable.
   - The plan honestly says this is "harness consistency under same-user trust". But then "untrusted fingerprint" has no defined source of trust.

**Required correction:**
- In `release-capability-matrix.json`, give each row a producer class (`ci` or `manual-host`) and its required evidence kinds (installed, epoch, provider).
- Specify how manual-host bundles are ingested: a committed or uploaded location, plus the exact command that places them under `--root` before `assemble`.
- Name the job or operator step that runs `assemble` and `verify-portable-release`.
- Define the trust anchor for key fingerprints. One option: at `pack-bind`, record each fingerprint in a separately published registration (a CI job log/artifact, or a committed registration file reviewed before capture), and have the verifier check bundles against that list. Otherwise drop the "untrusted fingerprint" claim and keep only the stated same-user consistency claim.

### PXPR-015 — Medium (new) — Task 4 / Task 5: the activation limit is not enforced in the release path

**Failure:** The plan says the Tasks 1/2/4 output is a candidate "without final publication/migration authority". It says supported activation and stale quarantine require the Task 5 `ActivationBinding`. Nothing enforces this:

- `release.yml` publishes to npm on any signed `v*` tag after unit, integration, packaging and smoke tests (`release.yml:3-5, 52-62`).
- Task 4 edits `release.yml` only to remove native provisioning.
- Once Task 4 merges to `main`, any ordinary signed release, including one cut for unrelated or #102 work, publishes the native-free package to users with no adopted binding. That is exactly the old/new coexistence exposure the plan says needs Task 5.
- "Controlled conformance activation" names no mechanism.
- The plan never says where Task 4 lands (feature branch or `main`), or how unrelated releases proceed meanwhile.

**Required correction:** Choose and specify one of:
- (a) Task 4 adds a `release.yml` gate that refuses to publish unless `check-runtime-contract-adoption.mjs` verifies an adopted `ActivationBinding`, with a red test or fixture for the refusal; or
- (b) Task 4 integrates on a long-lived branch kept separate from `main`, with a stated rule for how releases from `main` continue meanwhile.

Also define "controlled conformance activation" concretely, for example "installed only from the CI-built tarball inside conformance jobs; no published channel".

### PXPR-016 — Medium (new) — Task 2: process-start classification wedges reclaim on macOS/Windows

**Failure:** Task 2 accepts death only from (i) a verified no-such-PID observation, or (ii) "different verified process start on the same genuinely verified boot". The plan states macOS and Windows have no verified boot source yet (Task 3).

That makes the common case on those platforms permanently unknown: after a crash or reboot, the recorded broker PID is reused by another process. The plan offers no recovery path, rightly forbidding age-based takeover and operator assertions. So a Windows worktree whose old broker PID was reused cannot reclaim its broker. The native OS lock never had that problem because the kernel released it, so the portable parity claim (Task 4 acceptance) is overstated for macOS/Windows. A CI test of only the PID-absent case would still pass.

The boot condition is stronger than needed. A live process keeps its PID for its whole lifetime, so an OS-recorded creation time that differs from the sealed one proves the original process no longer exists on that host, whichever boot it is. The comparison is only sound if the creation time is fixed at process creation and not re-derived from uptime:

- Linux `/proc/<pid>/stat` start time counts ticks since boot, so it does need the verified `boot_id`, which Linux has.
- Windows `Win32_Process.CreationDate` and macOS `ps -o lstart` report stored creation timestamps. Whether they stay unchanged across wall-clock steps needs installed conformance; it is not asserted here.

**Required correction:** Change the classification to accept "same host, same PID, different start time, using a start-time source that conformance classifies as recorded at creation" as death proof for the original process, independent of boot proof. Keep:
- boot-relative sources (Linux ticks) tied to the verified boot;
- equal-within-precision results (macOS one-second `lstart`) as live/unknown;
- clock-derived boot-field mismatches as non-evidence.

Add PID-reuse reclaim fixtures for macOS and Windows, including a clock step between sealing and the probe. If conformance shows a platform's creation-time source is unstable, record that platform's reclaim limitation explicitly in the Task 4 parity predicate instead of claiming parity.

## Gate and focus re-check

- **Gates 1–15:** each maps to owning tasks and suites. Gates 2/8/15 carry the Task 5 dependency, and gates 3/10/11/12 carry #30/#34 adoption. Gate 5 now includes broker lifecycle; gates 6/7 include CLI watch, wrapper loss and broker loss. No unmapped gate assertion found.
- **Bounded election, native consumers, broker-loss window, #102 adoption:** acceptable apart from PXPR-015 and PXPR-016.

## Complete open finding set

PXPR-007, PXPR-015, PXPR-016.

## Nonblocking advice

1. **A Task 5 option for old/new exclusion.** A running portable broker could also listen with Node's `net` on the legacy native endpoint (the POSIX Unix socket path or the Windows named pipe from `paths.mjs`), as a "tombstone". Old v0.4 clients launch a native broker only on `ENOENT`/`ECONNREFUSED`/`APR_BROKER_OWNED` or missing discovery (`client.mjs:182-185`). A tombstone that accepts connections and fails the handshake would make old launchers fail instead of starting a competing broker. This covers only the window while the portable broker is alive, not old brokers already running. It could shrink the gap Task 5 must close and let the native-free package ship sooner.
2. **Reusing `reconcile_after_ms` as the broker-loss window.** This avoids a new config key, but it gives that key a second meaning. Document the dual meaning in the help registry so the Task 5 reconciliation can confirm or split it.
3. **The legacy endpoint probe and configured roots.** The probe can only use the current process's `AI_PEER_REVIEW_ENDPOINT_ROOT`. An old broker started with a different configured root would be missed, so treat an unmatched recorded endpoint root as indeterminate.
4. **Task 18 command list.** `capture-epoch` and `verify-epoch` appear back to back. Given the no-comment rule, consider splitting the pre-reboot and post-reboot commands into separately labelled code blocks.

## Limits

- This verdict reviews the document only. No fixture, CI job, reboot, clock change, provider launch or ACL probe was run or is implied.
- The platform statements in PXPR-016 (Windows `CreationDate` and macOS `lstart` being recorded at creation, Linux start-tick boot dependency) and the advice-1 tombstone behaviour come from platform knowledge and the cited source. They need the conformance the plan prescribes.
- I did not verify the digests the author cites for the snapshots or plan.
