<!-- ai-peer-review-template version="1" digest="sha256:78e9a634af9d540baaf6790db82952eaf39cf7ab59a6cdc7938319ae07a4cbed" -->

<!-- protected-frontmatter -->

---
schema: "ai-peer-review.response/v1"
review_id: "review-188b4c20546038d7fdbece3342582712"
role: "reviewer"
turn: 1
commit_mode: "normal"
authority_assurance: "unavailable"
artifact_path: "evidence/portable-runtime/process-source/registration-reviews/170-hosted-absence.md"
artifact_commit: "030425d7a82aaff635b9d50dc47665d3dac6df80"
artifact_blob: "d5ec1552807456c191c31bbde426a8d597edcddc"
artifact_digest: "sha256:0ebb7443f7a302924a460ee0cc76b2a71b1e1d6e33e686ff1579cd79f6d24132"
agent:
  host: "claude-code"
  provider: "anthropic"
  model_id: "claude-opus-5-5"
  model_display: "claude-opus-5-5"
  session_fingerprint: "sha256:fb25daffd12f2487876e889f90990e3121d8ee289b7a749307e4099b0df748ae"
  identity_source: "runtime"
started_at: "2026-10-08T06:24:05.382Z"
submitted_at: "2026-10-08T06:26:53.503Z"
finding_ids: []
answered_finding_ids: []
acknowledged_supplement_ids: []
---

Mode: `normal`

## Summary

I independently reviewed the registration-review subject `evidence/portable-runtime/process-source/registration-reviews/170-hosted-absence.md` (commit `030425d`, blob `d5ec1552…`). I read the working-tree index and all four referenced registration records. I also read the downloaded public CI artifacts in `.scratch/170-delivery/ci-registrations-37735962863/` (one `worker.json`, `package-receipt.json` and `*.registration.json` per Windows/macOS × Node 24/26 worker) and `.scratch/170-delivery/ci-batch-37735962863.json`. On the implementation side I read `.github/workflows/process-source-capture.yml`, `test/helpers/process-source-ci-capture.mjs`, `test/live/process-source/{authority,records,capture}.mjs`, and the host-identity and probe code in `src/protocol/process-identity.mjs`.

What I verified:

- **Raw subject bytes.** I ran `shasum -a 256` over the working-tree files. It reproduces every `sha256` the subject declares: index `bebb98e4…`, `source-083e8b0f…` `39af62ca…`, `source-1700e6c7…` `6aeb79e4…`, `source-1fa6d0d1…` `6489a882…`, `source-bc03585a…` `a3e8a7d0…`.
- **Committed records match the public worker artifacts.** I compared each committed registration with the artifact downloaded for its worker. `captureId`, `hostId`, `publicKey`, `keyId`, the `package` object, the `scope` object, `kinds` and `transitions` are identical in value. The only difference is whitespace (`kinds` is compact in the committed file), which the canonical record digest does not see. Each worker's `package-receipt.json` equals its registration's `package`. Each `worker.json` reports run `37735962863`, attempt `1`, repository `kburson/ai-peer-review`, `codeCommit` `8f74ffb6…` (Q), the runner OS and Node major matching the registration scope, `clockChanges: none`, `restoration: not-required`, and exactly one `absence` capture with the matching `captureId`.
- **The narrowing is mechanical and finite.** On non-Linux hosts, `prepare()` iterates only `['absence']`. It overwrites the binder candidate with `kinds: [kind]` and `transitions: []`, then runs `validateProcessSourceRegistration`, which for a non-creation registration requires `transitions.length === 0`. So the absence-only narrowing is produced by the producer, not edited by hand afterward. Every record has `kinds: ["absence"]`, `transitions: []`, and no Linux platform. The scopes are exactly the claimed finite tuples: `win32`/`10.0.26100`/`x64`/Node 24 and 26 with the fixed System32 PowerShell path, `local-cim-query`, `completed-cim-query-v1` and probe hash `54b68d39…`; and `darwin`/`25.6.0`/`arm64`/Node 24 and 26 with `/bin/ps`, `same-user-full-selection`, `exact-ps-selection-v1` and probe hash `3489ed38…`. On Darwin, `process-identity.mjs` hashes `/bin/ps` concatenated with `/usr/sbin/ioreg`, as the subject says. All four records share contract `9a9c7b78…` and inventory `004a1977…`. The tarball digests differ by platform only (`986fad93…` macOS, `d79424e5…` Windows) and are identical across Node majors on the same OS.
- **The index is well-formed.** It has exactly four entries, ordered strictly ascending by `captureId` (`083e…` < `1700…` < `1fa6…` < `bc03…`), as `verifyProcessSourceIndexCore` requires. Each path is `registrations/<captureId>.json`. Each entry digest equals the digest the author recorded independently in `ci-batch-37735962863.json`. The earlier local registration `source-f7b53374…` is correctly absent. Its previous approval is pinned to revision `6eaa572` and index digest `a0b2d497…`, so replacing the index at a new revision neither widens nor invalidates the earlier class.
- **The approval authority cannot be self-asserted.** In the CI `approval()` step, the worker polls the pushed branch for `registrations/approved-refs/<captureId>.json`. It checks out that remote revision and refuses any diff in the producer paths against Q (`git diff --exit-code <Q> -- PRODUCERS`). It then runs `readApprovedProcessSourceIndex`, which requires a collateral-complete normal-mode review via `checkNormalRuntimeReview`. That reader re-reads the subject, manifest and final response from Git by blob OID and raw sha256, requires exactly one JSON block whose index revision, path and digest equal the approved ref, re-reads each capture reference positionally against the index, re-validates every record and its canonical digest, and requires the ancestry index revision → subject → finalization → HEAD. The worker additionally requires the approved registration's canonical digest to equal the in-memory registration it prepared. A mismatch fails hard rather than retrying. A caller flag, a fixture, a foreign revision or a stale index therefore cannot satisfy it.
- **Capture gates match the subject.** `captureRegistered` takes the index path only from the fixed constant. It re-runs the approval reader, requires a closed-shape binding with `runtimeAuthority: unavailable`, and requires the registration to include the kind, the same `hostId` and the same package. It re-inspects the installed candidate source and requires verified storage protection. It requires the key snapshot's `identity`/`fileVersion`/`rootIdentity` to equal the binding's key generation both before and after the controls run, and the private key to re-derive the registered `keyId`/`publicKey`. It requires the observed `hostId` and scope to match the registration. It signs the receipt and self-verifies it with `verifyProcessSourceReceiptCore`, which re-checks `registrationRevision`/`registrationIndexDigest`, and it emits `classAdmitted: false`. The absence deadline is a finite 120 s.

Verification limits:

- **No Git or code execution.** The task forbade Git, and a `node` invocation to recompute canonical digests was denied. I therefore did not resolve any `revision:path` to its blob OID or confirm that `2bf9c3f` is an ancestor of `030425d`. I did not recompute the canonical index-entry digests (`2b43d435…`, `b9ee020b…`, `8439c398…`, `6ae8f8c7…`). I did not check that the four public keys are valid Ed25519 SPKI with matching `keyId`, or confirm that the producer paths are unchanged between Q and the approval revision. The worker-side reader enforces every one of these mechanically and fails closed, so a wrong value here would block capture rather than be laundered.
- **No first-hand provenance of the CI artifacts.** I did not access GitHub. The authenticity of the downloaded artifacts as outputs of run 37735962863 attempt 1 rests on the author's authenticated download. I could not see the Linux time-service failure or confirm the workers' current waiting state. The Linux exclusion is nevertheless verified by its absence from the index.
- **No independent capture.** Whether the private keys really sit in C1-protected job-local storage, and whether the controls will be genuine, is evidenced only by the code paths reviewed above. No admitted capture exists yet.

## Findings

1. **The two hosted macOS registrations share one `hostId`, so `hostId` does not tell disposable macOS workers apart (non-blocking).** `source-083e8b0f…` (Node 24) and `source-1700e6c7…` (Node 26) ran as separate matrix jobs on separate fresh VMs, yet both carry `hostId` `sha256:ad07705d…`. The Darwin identity is derived from `IOPlatformUUID`, which appears to be cloned across `macos-latest` images. The two Windows workers have distinct IDs (`a60e474e…`, `30f01e55…`). `process-identity.mjs` explicitly marks cloned identities as "a C5 finite-scope acceptance concern". My assessment is that acceptance is still safe. The per-capture Ed25519 key is generated in the job, is never uploaded, and is re-checked by key generation, so it remains the actual per-worker binding. `hostId` adds no authority that a sibling clone could use without that key. Class scope is keyed on platform/build/architecture/Node/probe, not on `hostId`. The subject does not claim that hosts are distinct, but it also does not disclose the collision. A later class review must not treat the two macOS captures as evidence from two independently identified hosts, or treat `hostId` as a per-worker identity on hosted macOS.
2. **The approval window is bounded, which limits liveness rather than safety (informational).** `approval()` polls for at most 2,400 s inside a 60-minute job timeout. If this review is not finalized and the approved refs pushed within that window, the workers fail with `ci-capture-registration-review-unavailable`. Their private keys are then destroyed with the runners and these four registrations can never be captured. That outcome is fail-closed. Any re-run will yield new keys, `captureId`s and records requiring a fresh registration review; these records must not be reused for it.

## Required changes

None.

## Optional suggestions

1. In the subsequent class review subject, or in a short note alongside the approved refs, record that the two Darwin hosted captures share the cloned `hostId` `ad07705d…`. State that the per-capture key, not `hostId`, binds each hosted macOS worker.
2. Make the `approval()` poll bound, and how it relates to the 60-minute job timeout, visible in the workflow or worker metadata (for example a `deadline` field in `worker.json`). The approval window is then auditable from public artifacts.
3. Consider recording in `worker.json` the runner image identifier (`ImageOS`/`ImageVersion`). Probe-hash and build equality is then attributable to a specific hosted image, not only to observed bytes.

## Decision

accepted
