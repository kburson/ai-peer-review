<!-- ai-peer-review-template version="1" digest="sha256:78e9a634af9d540baaf6790db82952eaf39cf7ab59a6cdc7938319ae07a4cbed" -->

<!-- protected-frontmatter -->

---
schema: "ai-peer-review.response/v1"
review_id: "review-8cae4328f7a9e2b5fc34aae68b1d225f"
role: "reviewer"
turn: 1
commit_mode: "normal"
authority_assurance: "unavailable"
artifact_path: "evidence/portable-runtime/process-source/registration-reviews/170-refreshed-wave1.md"
artifact_commit: "ebb8c02ba47e93b5888ae33c01e8e62409f8e9ba"
artifact_blob: "48fdb269581a297daf374388ace3506371a7e62d"
artifact_digest: "sha256:b31e352780cfe8853927187b22219c6bc4ee934d9af8473fc2b42e7e0bfc814c"
agent:
  host: "claude-code"
  provider: "anthropic"
  model_id: "claude-opus-5-5"
  model_display: "claude-opus-5-5"
  session_fingerprint: "sha256:b910acba92aa9952fc4e8319abe4d37369ab7a3f3a6c5f72c24bb1ebd0574a18"
  identity_source: "runtime"
started_at: "2026-10-08T07:17:54.154Z"
submitted_at: "2026-10-08T07:23:13.096Z"
finding_ids: ["R1-F001","R1-F002","R1-F003","R1-F004","R1-F005","R1-F006"]
answered_finding_ids: []
acknowledged_supplement_ids: []
---

Mode: `normal`

## Summary

I independently reviewed the subject `evidence/portable-runtime/process-source/registration-reviews/170-refreshed-wave1.md` (artifact commit `ebb8c02`, blob `48fdb269…`). Inputs I read:

- the working-tree registration index and all six referenced registration records;
- the downloaded public CI artifacts in `.scratch/170-delivery/ci-registrations-37741411472/`: one `worker.json` and one `package-receipt.json` per Linux 24/26, macOS 24 and Windows 24 worker, plus every `*.registration.json`;
- `.github/workflows/process-source-capture.yml`, `test/helpers/process-source-ci-capture.mjs` and `test/helpers/process-source-ci-host.mjs`;
- `test/live/process-source/{records,authority,capture,creation,clock}.mjs`, and the import lists of every module under `test/live/process-source/` and of `test/live/process-source-conformance.mjs`;
- `observeProcessSourceContext`, `darwinExecutionHostBinding`, `linuxExecutionHostBinding` and `observeExecutionHostIdentity` in `src/protocol/process-identity.mjs`;
- the prior hosted-absence subject and its reviewer response, so that I did not re-raise settled points.

What I verified:

- **Raw subject bytes.** `shasum -a 256` over the working-tree files reproduces every `sha256` the subject declares: index `e3c7d95c…`, `27cb7cbf…` → `6fb98df9…`, `4f898ac0…` → `58cd6033…`, `8cfa6f57…` → `6f9c187c…`, `91a42345…` → `1397cc51…`, `c63ac929…` → `34fc6f2f…`, `dd5736e0…` → `9eaba912…`.
- **Committed records equal the public worker artifacts.** For all six records, `captureId`, `hostId`, `publicKey`, `keyId`, `package`, `scope`, `kinds` and `transitions` are identical in value to the artifact registrations. Only whitespace differs, and the canonical digest ignores it. Each worker's `package-receipt.json` equals its registrations' `package`. Each `worker.json` reports run `37741411472`, attempt `1`, repository `kburson/ai-peer-review`, `codeCommit` `d50e64f9…` (Q), and the runner OS and Node major that the scope declares. The capture lists are exact: Linux 24 has `4f898ac0…` absence and `dd5736e0…` creation; Linux 26 has `c63ac929…` absence and `27cb7cbf…` creation; macOS 24 has `8cfa6f57…` absence; Windows 24 has `91a42345…` absence. Both Linux workers report `prerequisites: privilege-and-restoration-observed` and `restoration: verified`, with `verified: false`. macOS and Windows report `clockChanges: none` and `restoration: not-required`.
- **Finite scope matches the subject.** Every record carries contract `524b96e3…`, inventory `67d89771…` and source commit `d50e64f9…`. Linux and Darwin share tarball `baa5416c…`; Windows has `52dd0693…`. This matches the earlier observation that the tarball differs by platform while inventory and contract stay identical. The Linux records are `6.17.0-1022-azure`/`x64`/Node 24 or 26 with `/proc`, `full-pid-namespace`, `exact-pid-directory-v1` and `procfs-v1`. Absence records have `kinds: ["absence"]` and `transitions: []`. Creation records have `kinds: ["creation"]` and all four transitions. `validateProcessSourceRegistration` enforces exactly that shape. Windows is `10.0.26100`/`x64`/Node 24 with the fixed System32 PowerShell path, `local-cim-query`, `completed-cim-query-v1` and `54b68d39…`. Darwin is `25.6.0`/`arm64`/Node 24 with `/bin/ps`, `same-user-full-selection`, `exact-ps-selection-v1` and `62c342e1…`. `observeProcessSourceContext` (`process-identity.mjs:171-182`) hashes `/bin/ps ‖ /usr/sbin/ioreg ‖ /usr/sbin/sysctl` on Darwin, as the subject says. No Node 26 Windows or macOS record is present.
- **Darwin host binding changed as claimed.** `observeExecutionHostIdentity` (`process-identity.mjs:258-280`) now derives the Darwin `hostId` from `IOPlatformUUID` plus `sysctl -n kern.bootsessionuuid`, through `darwinExecutionHostBinding`. Both values must be canonical non-zero UUIDs read from canonical stock executables with empty stderr. No clock-derived boot time is used. This addresses the cloned-identity collision the prior review recorded (`ad07705d…` was shared by both macOS workers). It cannot be confirmed empirically with only one macOS worker in this wave. The Linux `hostId` binds machine-id, boot_id, and the pid and time namespaces. The absence and creation records on each Linux worker share a `hostId` and use distinct keys, which is expected for one host. The two Linux workers have different `hostId`s.
- **Producer narrowing is mechanical.** `prepare()` iterates `['absence','creation']` on Linux and only `['absence']` elsewhere. It binds a separate candidate (separate key and `captureId`) per kind, overwrites `kinds` with `[kind]`, sets `transitions` to the binder's transitions for creation and `[]` for absence, and then validates.
- **Privilege and restoration implementation.** `initializeCiClockHost` refuses unless `process.platform` is linux and the GitHub-hosted environment matches this repository, workflow and run. Under one 60 s deadline it:
  - records the original UTC/monotonic sample, NTP state and `timedatectl` zone;
  - disables NTP and polls `timedatectl show --property=NTP` until convergence, bounded by the same deadline;
  - steps the clock forward 2 s with `sudo -n /usr/bin/date --set` and requires an observed offset delta of 1.5–2.5 s;
  - in `finally`, restores wall time to the original plus elapsed monotonic time, then restores the zone, then restores NTP;
  - re-verifies the restored offset within ±0.5 s, plus the Node-observed zone and DST, the `timedatectl` NTP state and the `timedatectl` zone. Any miss throws `ci-clock-restoration-unproved` before packing.

  `prepare()` writes `restoration: 'verified'` only on that success path. The capture-time `creation()` repeats the prerequisite and brackets the driver child between `begin()` and `finish()`. `finish()` runs in `finally` and fails closed. The host-control record is published only after `finish()` has verified restoration. The driver (`creation.mjs`) requires a nonce-owned child whose `creation` digest never changes, windows of at least 6 samples over at least 5 s with offset spread within 0.5 s and a stable zone and DST, observed change and observed restoration for each transition, a clean child exit, observed absence, an unchanged `boot_id`, an unchanged `hostId` and probe, and unchanged installed source. `verifyProcessSourceReceiptCore` re-checks the transition order and the same windows from the signed receipt.
- **Approval authority cannot be self-asserted.** This is unchanged from the prior review. `approval()` requires an approved ref on the pushed branch whose collateral `readApprovedProcessSourceIndex` validates under normal mode. That check includes the blob OID and raw SHA-256 of the subject, the single JSON block equal to the approved index revision and digest, positional capture references, the canonical index-entry digests, and the ancestry index revision → subject → finalization → HEAD. The approved record's canonical digest must also equal the worker's in-memory registration. `captureRegistered` uses the index registration, not the binding candidate. It re-derives the public key from the protected private key, with the key generation unchanged before and after the controls.

Verification limits:

- **No Git or arbitrary code execution.** Git is forbidden by the task, and a `node` invocation to recompute digests was denied. I therefore did not resolve any blob OID, recompute the canonical index-entry digests (`9c0d3c84…`, `cfc64603…`, `e01bedb9…`, `f8f0d065…`, `20088759…`, `1318ff77…`), confirm `26ebc56` → `ebb8c02` ancestry, or validate the Ed25519 SPKI and `keyId` pairs. I also could not inspect Q's bytes, or which paths changed in `d50e64f..26ebc56..ebb8c02`. The worker-side reader enforces the digest and ancestry checks and fails closed. The changed-path question is the subject of R1-F001.
- **No first-hand CI provenance.** I did not access GitHub. That the artifacts are authentic outputs of run `37741411472` attempt 1, that the Linux prerequisite actually ran, and the workers' current waiting state all rest on the author's authenticated download and on the unverified worker metadata. I did not rerun the 99 tests.
- **No capture exists yet.** Whether the controls, clock transitions and final restoration will be genuine is evidenced only by the code paths reviewed above.

The registrations themselves are exact, finite and consistent with the public artifacts. Two statements in the subject, however, are not supported by the implementation as written, and this approval authorizes privileged clock mutation on the basis of them.

## Findings

### R1-F001 — The producer freeze does not cover the code the spawned creation driver actually runs (High)

Location: subject paragraph 4 ("the worker verifies unchanged producer bytes against Q before capture"); `test/helpers/process-source-ci-capture.mjs:17-24,121-122,142-157`.

`approval()` runs `git checkout --detach <remote>` and then `git diff --exit-code <Q> -- PRODUCERS`. `PRODUCERS` lists only `test/live/process-source-conformance.mjs`, `test/live/process-source/`, and four `test/helpers/process-source-*` files.

For absence captures this does not matter. They run in-process through `runProcessSourceConformance`, whose modules were already loaded from Q's checkout when the capture step started.

For the two Linux creation captures, however, `creation()` spawns a new Node process from the approval checkout: `spawn(process.execPath, [DRIVER, 'capture', …], { cwd: ROOT })`. That child loads, from the approval revision rather than from Q, these repository modules outside `PRODUCERS`:

- `src/api/canonical-json.mjs`: `parseRawJson` and `assertScalarString`. These feed the canonical record bytes, which drive the registration and receipt digests and the Ed25519 signing input.
- `scripts/check-runtime-contract-adoption.mjs` and its transitive imports: `checkNormalRuntimeReview`, the normal-mode review collateral authority used by `readApprovedProcessSourceIndex`.
- `src/startup/runtime-inventory.mjs`: `readBoundedOrdinaryFile`.
- `src/protocol/process-source-assurance.mjs`: `processSourceContractDigest` and `verifyProcessSourceClass`. `package.mjs` uses the contract digest when it inspects the installed candidate.
- `test/helpers/npm-command.mjs`.

The installed candidate (`process-identity.mjs` and so on) is bound by tarball and inventory, but these repository-local verifiers are not. So the Q-to-approval freeze does not cover the code that validates review authority, canonicalizes and signs the creation receipts. This is the same capture path that is authorized to step the system clock and the zone. The parent's clock mutations stay limited to the four hard-coded kinds in Q's in-memory `process-source-ci-host.mjs`, so the privilege surface is not widened. The integrity of the evidence the creation receipts carry, however, rests on bytes that were neither tested at Q nor frozen. The subject presents the freeze as a basis for approval, and the reviewer charge asks for producer freezing to be inspected. As written, the claim is broader than the implementation for the creation records `dd5736e0…` and `27cb7cbf…`.

### R1-F002 — The subject does not enumerate the exact clock and zone mutations it authorizes (Medium)

Location: subject paragraph 3 ("expressly authorized driver-supervised clock-forward, clock-backward, timezone and DST transitions"); `process-source-ci-host.mjs:147-190`.

The subject authorizes privileged mutations by label only. The implementation performs more than the four labels suggest:

- **Baseline mutation.** `begin()` disables NTP and changes the system zone from the original to `America/New_York` before any transition. This mutation is not among the four registered transitions.
- **`clock-forward` / `clock-backward`.** These step the system clock ±90 s from the baseline.
- **`timezone`.** This switches `America/New_York` → `America/Detroit`. The two zones have identical current rules, so the UTC offset does not change. The driver and the verifier deliberately require `dst` to stay equal (`creation.mjs:37`, `records.mjs:273-274`). This transition therefore evidences a change of zone identity, not a change of UTC offset.
- **`dst`.** This is not a DST boundary crossing at a fixed instant. It sets the wall clock to 15 January or 15 July of the baseline year at 12:00 UTC. From an October baseline, that is a jump of roughly nine months backward that also flips `isDST`. The UTC offset change is therefore exercised only by this combined jump.
- **Final restore.** `finish()` returns to the captured original UTC, zone and NTP state.

The approval states that it "authorizes no ordinary user-host clock change". Approved scope should be exact, though, and a later class reviewer reading "timezone" coverage may infer offset-change coverage that was never observed. The subject should bind the concrete mutations and magnitudes rather than labels alone.

## Required changes

1. **R1-F001.** Do one of the following:
   - **(a)** Keep this run, and amend the subject to state the actual freeze boundary: `PRODUCERS` only, with the spawned creation driver loading the listed repository modules from the approval revision. Add mechanical evidence that `git diff --name-only d50e64f9 ebb8c02` touches no path in the creation driver's transitive repository-local import closure (`src/api/canonical-json.mjs`, `src/startup/runtime-inventory.mjs`, `src/protocol/process-source-assurance.mjs`, `scripts/check-runtime-contract-adoption.mjs` and its imports, `test/helpers/npm-command.mjs`). Ideally list the exact changed paths, which should be evidence and review documents only. Commit to keeping the approval/finalization commit equally evidence-and-docs-only, and require the class review to recheck `Q..<approval revision>` for those paths before admitting either creation receipt.
   - **(b)** Widen the worker freeze for future runs to the whole tree, excluding only `evidence/portable-runtime/process-source/` and `docs/superpowers/peer-reviews/`. For example: `git diff --exit-code <Q> -- . ':!evidence/portable-runtime/process-source' ':!docs/superpowers/peer-reviews'`. Then re-register under a fresh run.

   Option (a) suffices for this wave.
2. **R1-F002.** In the subject, enumerate the authorized Linux mutations exactly:
   - NTP disabled during the session;
   - baseline zone set to `America/New_York`;
   - `clock-forward` +90 s and `clock-backward` −90 s from the baseline;
   - `timezone` `America/New_York` → `America/Detroit`, offset-preserving;
   - `dst` as a wall-clock jump to 15 January or 15 July at 12:00 UTC of the baseline year;
   - restoration to the baseline after each transition, and to the original UTC, zone and NTP state at the end.

   Also state that the `timezone` transition evidences zone-identity change only, and that a UTC-offset change is covered only by the `dst` jump.

## Optional suggestions

### R1-F003 — Note in the class review where the final restoration evidence lives

The signed receipt's `controls.cleanup.restoration: 'verified'` (`creation.mjs:138`) is asserted by the driver after restoring each transition to the baseline (`America/New_York`, NTP off). It is not asserted after the final restore to the original system state. The final restore is evidenced only by the unsigned `host-control.json` `control.restoration`, which is published only when `finish()` succeeds. The class review should state which artifact proves which restoration.

### R1-F004 — Windows host identity remains hardware-only

The Windows `hostId` is still derived only from `Win32_ComputerSystemProduct.UUID`, with no boot-session qualifier. The earlier Windows pair had distinct IDs, so no collision has been observed. The per-capture key remains the real per-worker binding. Consider stating this asymmetry, or adding a boot-session qualifier before the Windows Node 26 wave.

### R1-F005 — The CI clock guard depends on environment variables

`initializeCiClockHost` decides that it is running on a disposable host using `GITHUB_ACTIONS`, `RUNNER_ENVIRONMENT`, `RUNNER_OS`, `GITHUB_REPOSITORY`, `GITHUB_WORKFLOW` and `GITHUB_RUN_ID`, plus `sudo -n`. A developer host with passwordless sudo and spoofed variables would pass. This needs deliberate action, but the subject's phrase "CI refusal before any ordinary-host effect" is stronger than an environment-variable check. Consider wording it as "refuses unless the GitHub-hosted environment is asserted".

### R1-F006 — Liveness window

As in the prior wave, `approval()` polls for at most 40 minutes inside a 60-minute job, and each Linux worker needs two sequential approvals plus a creation run of up to about 13 minutes. A revision round may let these workers expire. That outcome is fail-closed: the keys are destroyed and these six records can never be captured. Any re-run needs fresh records and a fresh review.

## Decision

revisions-requested
