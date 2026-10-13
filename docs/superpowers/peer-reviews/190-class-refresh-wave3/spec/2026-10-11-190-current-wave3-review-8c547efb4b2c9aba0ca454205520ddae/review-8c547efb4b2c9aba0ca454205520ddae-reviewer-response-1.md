<!-- ai-peer-review-template version="1" digest="sha256:78e9a634af9d540baaf6790db82952eaf39cf7ab59a6cdc7938319ae07a4cbed" -->

<!-- protected-frontmatter -->

---
schema: "ai-peer-review.response/v1"
review_id: "review-8c547efb4b2c9aba0ca454205520ddae"
role: "reviewer"
turn: 1
commit_mode: "normal"
authority_assurance: "unavailable"
artifact_path: "evidence/portable-runtime/process-source/class-reviews/190-current-wave3.md"
artifact_commit: "7ea557a2a408761eb4567e238b96821f6aba7a19"
artifact_blob: "f508e878a65622f125d2f6e0f3cda9d2e0d0a7f6"
artifact_digest: "sha256:729efc93461cc43ea50c9c0fa8334d10eeac0124ae10aaad6451a593ecd5dd83"
agent:
  host: "claude-code"
  provider: "anthropic"
  model_id: "claude-opus-5-5"
  model_display: "claude-opus-5-5"
  session_fingerprint: "sha256:b67e3b7b0ace9a14f965730ed12e08da2c4a46fcbc719578a172be55dce388fb"
  identity_source: "runtime"
started_at: "2026-10-11T01:21:16.064Z"
submitted_at: "2026-10-11T01:24:47.490Z"
finding_ids: []
answered_finding_ids: []
acknowledged_supplement_ids: []
---

Mode: `normal`

## Summary

I reviewed the class subject `evidence/portable-runtime/process-source/class-reviews/190-current-wave3.md` (commit `7ea557a`, blob `f508e878…`). It proposes exactly two Linux / `6.17.0-1022-azure` / x64 / Node 26 classes under contract `sha256:505bc7fe…`:

- `source-8cf5e9d7…`: absence.
- `source-a9133fcf…`: creation.

They rest on two signed receipts, two host controls, one CI provenance projection and the accepted registration review `review-238766404366f76fe8bd15a85ffcf752`. I read every referenced public file in the working tree. I checked them against each other, against the class reader (`test/live/process-source/authority.mjs:169-389`), against the receipt, CI-control and proposal verifiers (`records.mjs`, `classes.mjs`), and against the capture producer (`test/helpers/process-source-ci-capture.mjs`, `process-source-ci-host.mjs`, `.github/workflows/process-source-capture.yml`).

What I verified:

- **Class ↔ receipt mapping and finite scope.** The table's class IDs are proposal IDs, not capture IDs. `classes.mjs:95` derives each class ID from the proposal content digest. Each proposal selects its receipt through `evidenceDigests`, and `authority.mjs:322-338` recomputes the selection. Each proposal names exactly one evidence digest. Capabilities match receipt kinds: absence → `source-8ce2d069…`, creation → `source-3e7366d8…`. Semantics and precision match the generator's Linux table (`linux-pid-directory-v1`/`not-applicable`; `linux-start-ticks-v1`/`one-tick`). Scope is singleton: one build, one architecture, Node 26, the stock `/proc` probe. `packageProvenance` equals both receipts' `package` (source `11c83fa0…`, tarball `7a5417fb…`, inventory `e3c4c6c1…`, contract `505bc7fe…`). Both proposals pin registration revision `3f8a1176…` and index digest `c917fc17…`, which equal the subject's `registrationApproval`. Nothing is widened beyond the two receipts.
- **Receipts are consistent with their registrations.** Both receipts carry host ID `cc241e29…`. Each carries the key ID of its own registration: creation `941b1070…`, absence `0c35f05c…`. Each carries the registration digest that the accepted registration review records as the index digest (`ae4afefa…`, `0087edfe…`), plus the same registration revision and index digest. Both are Ed25519. Before admission, the reader verifies the signature over canonical unsigned bytes against the registered SPKI key (`records.mjs:334-350`).
- **Creation controls match the authorized procedure.** I read all four transitions in the creation receipt:
  - All 72 samples keep PID `3562`, the same nonce and the same creation interval `[73434, 73435]` in `linux-ticks:7c9dde58…`. The width is one tick. Boot ID before equals boot ID after.
  - Clock-forward: the UTC−monotonic offset rises by about +90 s.
  - Clock-backward: the offset falls by about −90 s.
  - Timezone: `America/New_York` → `America/Detroit` → `America/New_York`, with DST unchanged.
  - DST: the baseline is about 2026-10-11 00:57 UTC (DST true). It moves to 2026-01-15 12:00:53 UTC (DST false) and back. This matches `apply('dst')` in `process-source-ci-host.mjs:171-174`, which picks January when the baseline is in DST.
  - Every `after` phase returns to the `before` offset, zone and DST.
  - `validateCreationControls` (`records.mjs:219-287`) enforces each of these properties mechanically.
- **Absence receipt.** Kind `absence`, empty transitions, `cleanup.restoration: "not-required"`, same boot ID. This matches its host control (`clockChanges: "none"`, `restoration: "not-required"`).
- **Final host restoration.** The creation host control reports `prerequisites: privilege-and-restoration-observed` and `restoration: verified`. It also reports `zone: UTC`, `systemZone: Etc/UTC` and `networkTime: yes`. These are the captured originals, which `restore()` re-checks within ±0.5 s (`process-source-ci-host.mjs:56-95`). The host control is unsigned, `verified:false` worker metadata. The stronger evidence is structural. `clock.finish()` runs in `finally` and throws `ci-clock-restoration-unproved` on any unmet obligation (`process-source-ci-capture.mjs:205-209`). Under the frozen producer, that failure would make the job fail. The Linux Node 26 job `114352133074` concluded `success`.
- **CI provenance.** I compared the projection with the preserved API responses in `.scratch/190-delivery/capture-38099441145-successful-{run,jobs}.json`. The run is `38099441145`, attempt 1. `head_sha` is `11c83fa0c1b01448719bbbb336d41296fd17ec91`. The path is `.github/workflows/process-source-capture.yml`, the event is `workflow_dispatch`, the run status is `completed/success`, and the repository is public `kburson/ai-peer-review`. The response lists `total_count: 6` jobs. The six job IDs, runner OS labels and Node majors (taken from the job names `Source capture / Node N / <os>`) match the projection exactly, and all are `completed/success`. `verifyCiCaptureControlsCore` requires exactly one Linux/26 job, and there is exactly one (`114352133074`). The Linux 26 job's capture step ran 00:47:23–00:58:51Z. The creation samples span about 00:57:48–00:58:51Z. That is after registration acceptance was committed (00:57:36.201Z in the registration review's events), and consistent with the capture loop waiting for an approved ref.
- **Separation of registration and class approval.** The registration approval is a separate accepted ordinary review. Its manifest status is `accepted`, its participants are cross-provider (codex/openai author, claude-code/anthropic reviewer), and it pins the subject, manifest, final response and finalization. Its subject says it "authorizes capture only; it is not finite class approval". This class subject is a separate review, and the reader requires `class-reviews/*.md` with its own finalization (`authority.mjs:179-210`). No receipt, host control or provenance file claims approval of itself. All of them carry `verified:false`.
- **Producer freeze.** For each host control, the reader requires `codeCommit → captureProducerCommit → class subject` ancestry. It also runs `inspectProcessSourceProducerFreeze(11c83fa → 736b8aff)` (`authority.mjs:306-316`). That check runs `ls-tree` on both trees, uses rename-free `diff --name-only`, and requires an identical producer file list with no changed producer file. Only `.md`/`.json` under the two authority directories are excluded (`capture-producer-freeze.mjs:3-4,29-42`). This mechanically enforces the subject's freeze claim, including executables inside evidence folders. The worker also enforces it at capture time with an untracked-producer refusal (`process-source-ci-capture.mjs:45-52`).
- **Source-change description.** `storage-protection.mjs` matches the description: macOS uses `macAclBatch` (`:746-755`), and Windows uses `windowsProbe` with `inspectWindowsReadPair` at the pre-read and post-read boundaries (`:1073-1121`). On Linux, `acl = []` (`:756`).
- **Coverage closure.** The reader requires every declared receipt to be consumed by exactly one proposal. It also requires the receipt count to equal the registration index's capture count at `3f8a1176` (`authority.mjs:374-375`). The subject's "missing or unrelated captures grant no coverage" therefore holds mechanically. The other five successful jobs in the run belong to other registration waves and are not consumed here.
- **No secrets.** The public files contain only public key IDs, host ID, digests, PIDs, nonces and timestamps. They contain no private key, binding, credential, password or provider handle.

Inspection and tool limits: this session could only read files. Shell execution and network fetch were denied, and the user forbade Git. So I did not:

- recompute git blob OIDs or raw SHA-256 values;
- recompute `processSourceRecordDigest` evidence digests or class IDs;
- verify the Ed25519 signatures;
- run the producer-freeze diff from `11c83fa` to `736b8aff`;
- confirm commit ancestry;
- re-fetch the GitHub API to authenticate the preserved run/jobs responses independently.

The class reader enforces each of these mechanically at admission time (`reference()`, `verifyProcessSourceReceiptCore`, the proposal recompute, `ancestor()`, `inspectProcessSourceProducerFreeze`), and any mismatch makes the class review unavailable. My acceptance is conditional on those mechanical checks passing. It binds only this subject and these two exact proposals.

## Findings

None.

## Required changes

None.

## Optional suggestions

1. The source-change paragraph describes only the macOS ACL batching and the Windows read-pair changes. Both classes here are Linux, where `inspect` sets `acl = []` (`storage-protection.mjs:756`), so neither changed path ran in these captures. Consider stating that these classes re-admit Linux absence and creation under the new contract digest only, and give no evidence for the macOS or Windows ACL changes. The registration review raised the same point as optional suggestion 1.
2. "Darwin and Windows have absence only; no creation or clock-change claim is made for them" refers to platforms with no class in this subject. Consider "No Darwin or Windows class is included; any later one remains absence-only". Similarly, "Linux creation, if declared in the table" could just say "The declared Linux creation class".
3. The table lists class IDs but not the capture each one consumes. Consider adding a capture column (`source-8ce2d069…` for absence, `source-3e7366d8…` for creation) so readers can map classes to receipts without recomputing digests.
4. "Final host controls separately prove … restoration" overstates what an unsigned `verified:false` worker report can show. Consider: "the host controls report the restoration, and the successful job conclusion under the frozen producer, which fails closed on any unproved restoration, evidences it."
5. "January/July seasonal wall-time changes" could state that this capture's October DST baseline was moved to January 15 12:00 UTC only. "C5 review-class driver" is undefined in the subject. Consider naming the script path.

## Decision

accepted
