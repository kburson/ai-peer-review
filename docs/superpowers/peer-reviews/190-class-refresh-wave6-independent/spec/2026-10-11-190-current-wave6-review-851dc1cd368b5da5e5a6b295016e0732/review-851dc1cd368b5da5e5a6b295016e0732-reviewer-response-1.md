<!-- ai-peer-review-template version="1" digest="sha256:78e9a634af9d540baaf6790db82952eaf39cf7ab59a6cdc7938319ae07a4cbed" -->

<!-- protected-frontmatter -->

---
schema: "ai-peer-review.response/v1"
review_id: "review-851dc1cd368b5da5e5a6b295016e0732"
role: "reviewer"
turn: 1
commit_mode: "normal"
authority_assurance: "unavailable"
artifact_path: "evidence/portable-runtime/process-source/class-reviews/190-current-wave6.md"
artifact_commit: "7feaa7faa3155fea0f1409b0ce9025620d63b416"
artifact_blob: "20350c169f5453e2720fd40d35576d28f970d136"
artifact_digest: "sha256:185d5c578d19db7551ba797da89ea221880b370a0534dc3e468d382880ac3064"
agent:
  host: "claude-code"
  provider: "anthropic"
  model_id: "claude-opus-5-5"
  model_display: "claude-opus-5-5"
  session_fingerprint: "sha256:01e0433c6dc5002264102b074d734303769be2af31f92cd04691ce6a5b27e433"
  identity_source: "runtime"
started_at: "2026-10-11T03:24:08.842Z"
submitted_at: "2026-10-11T03:26:30.870Z"
finding_ids: []
answered_finding_ids: []
acknowledged_supplement_ids: []
---

Mode: `normal`

## Summary

I independently reviewed `evidence/portable-runtime/process-source/class-reviews/190-current-wave6.md`, a finite class review. It proposes 4 classes (darwin/arm64/Node 24 absence, win32/x64/Node 24 absence, linux/x64/Node 24+26 creation, linux/x64/Node 24+26 absence) for contract `sha256:424f35d0…`. They rest on 6 signed receipts, 6 host controls, one CI provenance projection for run 38106108578 attempt 1, and the accepted registration review `review-63524a58958ba43d0773b358b50161ad`. I read every referenced public file from the working tree. I did not read the parallel wave6 class-review responses, so this review stays independent of them. I also read:

- the registration subject `registration-reviews/190-current-wave6.md`, its manifest, and its final reviewer response;
- the class-review reader `readReviewedProcessSourceClassReview` in `test/live/process-source/authority.mjs` (L180–389);
- the CI control/provenance validator `verifyCiCaptureControlsCore` in `test/live/process-source/records.mjs` (L415–515);
- the CI producer `test/helpers/process-source-ci-capture.mjs`, the freeze helpers `test/helpers/capture-producer-freeze.mjs` and `test/live/process-source/producer-freeze.mjs`, and the workflow `.github/workflows/process-source-capture.yml`;
- the preserved authenticated GitHub API responses `.scratch/190-delivery/capture-38106108578-successful-run.json` and `…-successful-jobs.json`.

What I verified:

- **The table matches the proposals and the receipts.** The four proposals in `190-current-wave6-proposals.json` match the subject table on classId, capability, platform, build, architecture and Node majors. The six receipts fall into those classes exactly. Linux absence uses `1107b659…` (Node 24) and `933626bc…` (Node 26). Linux creation uses `5df7c494…` (Node 24) and `d7d98a80…` (Node 26). win32 absence uses `5e53dff7…`, and darwin absence uses `7f22739e…`. The darwin and win32 proposals each list one evidence digest. Each Linux proposal lists two. That gives 6 evidence digests for 6 receipts.
- **The receipts match the accepted registration wave.** All six captureIds and their platform/build/arch/Node/capability tuples equal the six rows of the accepted registration subject. Every receipt pins `registrationRevision` `d8ee6054…` and `registrationIndexDigest` `sha256:79d14246…`, matching `registrationApproval` and every proposal. Every receipt and proposal pins sourceCommit `7d4223f…` (Q), contract `424f35d0…` and inventory `262ecbb6…`. Windows carries its own tarball (`030619…`), and the others share `ebfb15c0…`. That matches the accepted registration and earlier waves.
- **Probe scope is not widened.** The probe path, visibility, errorContract and version in each proposal equal the corresponding receipt scope. They also equal the triples the registration reviewer confirmed against `validateScope`. darwin/win32 are absence-only, and only Linux claims creation (`linux-start-ticks-v1`, `one-tick`).
- **The creation controls match the authorized procedure.** I read the Node 24 creation receipt (`5df7c494…`) sample by sample:
  - **Clock steps.** clock-forward moves UTC by about +90.05 s while monotonic advances about 0.06 s. clock-backward moves it by about −89.94 s. Both "after" series return to baseline plus elapsed time.
  - **Timezone.** The zone moves America/New_York → America/Detroit → America/New_York.
  - **DST.** The dst transition moves wall time from October 2026 (`dst: true`) to 15 January 2026 around 12:00 UTC (`dst: false`), then back. That fits the "January/July opposite-DST" wording, since the baseline was in DST.
  - **Child and boot identity.** pid, nonce and creation tick bounds stay the same in every sample. Boot identity before and after is equal and matches the `linux-ticks:<boot>` unit.
  - **Cleanup.** cleanup reports `childExited: true, restoration: "verified"`.
  - **Node 26.** The Node 26 creation receipt (`d7d98a80…`) has the same structure and consistent boot identity (`3ecfaeab…`), which also matches the Node 26 absence receipt on the same host (`c035f6c0…`).
  - **Absence receipts.** All four have empty `transitions` and `restoration: "not-required"`.
- **Host controls are consistent.** All six host controls pin run 38106108578, attempt 1, codeCommit Q, the matching captureId and kind, and captureProducerCommit `9211d10a…`. The absence controls report `clockChanges: none`. The two creation controls report `privilege-and-restoration-observed`, `restoration: verified`, `zone: UTC`, `networkTime: yes` and `systemZone: Etc/UTC`, which are plausible originals for a GitHub ubuntu runner. Every control keeps `verified: false`, so it stays unverified data, as the subject says.
- **The CI provenance is genuine and finite.** The projection agrees with the preserved authenticated API responses on these points:
  - run id 38106108578, attempt 1, `workflow_dispatch`, completed/success;
  - head_sha Q, path `.github/workflows/process-source-capture.yml`, repository `kburson/ai-peer-review`;
  - all six job IDs with runner OS, Node major and success conclusion.

  The workflow's `max-parallel: 4` explains why only four workers fed this wave. macOS/Node 26 (`114371881544`) and Windows/Node 26 (`114371881599`) started at about 03:03, after the wave6 registration was cut. Their captures are approved separately under wave7 (`source-4658749c…`, `source-d1a6dd1e…`), so the extra jobs in the provenance are explained. They grant no coverage here: the reader requires exactly one matching job per receipt (`ci-control-worker-mismatch`), and the proposals list only Node 24 for darwin/win32.
- **The reader enforces the claims in the subject.** For each host control, `readReviewedProcessSourceClassReview`:
  - verifies the control against its receipt and the provenance;
  - requires `codeCommit ⊑ captureProducerCommit ⊑ subject.revision`;
  - replays `inspectProcessSourceProducerFreeze(before=Q, after=captureProducerCommit)`, which fails closed with `class-review-transitive-producer-changed`;
  - recomputes every proposal from its selected receipts through `proposeProcessSourceClassCore`;
  - requires every receipt to be used exactly once and the capture count to equal the registration index length;
  - structurally matches each class against its own scope.

  The CI producer also asserts the freeze before each approval and capture (`assertProducers`), and it refuses untracked producer inputs. So the producer freeze is checked twice, once on the hosted worker and once by the reader.
- **Registration and class approval stay separate.** The registration review was XPR: a codex/openai author and a claude-code/anthropic reviewer, decision `accepted`, manifest status `accepted`, reviewer response digest `2441187455…` matching `finalResponse.sha256`. Registration approval authorizes capture only. This subject is a separate ordinary class review, and the reader requires its own finalized normal review (`checkNormalRuntimeReview`, collateral complete).
- **The claims are bounded and contain no secrets.** The subject makes no claim about production activation, native-free distribution, providers, reboots or descendants. It says the older `505b` Windows reads and the JSON-serializer comparison are diagnostics only, and that Linux manual review is excluded by user direction. The public files contain only public key ids, host-id hashes, nonces and digests.

Verification limits: this session could run only the two prescribed peer-review commands and could not use git. So I did not recompute:

- the git blob ids or raw sha256 values in the JSON block;
- the `processSourceRecordDigest` evidence digests in the proposals;
- the Ed25519 signatures;
- the commit ancestry (`d8ee605`, `ec97b50`, `9211d10a`, `7feaa7f`);
- the producer-freeze diff from Q to `9211d10a…`.

I also did not open the raw CI artifact zip. Those properties rest on the mechanical reader described above, which I inspected and found to enforce each of them, and which must still pass when the class set is read. I found no textual, structural or cross-file inconsistency that contradicts any pinned value.

## Findings

None.

## Required changes

None.

## Optional suggestions

1. **NTP and zone strength in the reader.** The subject says the final host controls "prove original UTC, exact configured zone and NTP restoration". `verifyCiCaptureControlsCore` accepts `networkTime` of either `yes` or `no`, accepts any non-empty `zone`/`systemZone`, and never compares them to a pre-capture baseline. This wave's controls do report `yes` / `UTC` / `Etc/UTC`, so the evidence here is fine. A later wave that reported `networkTime: no` would still pass the reader, though. Consider requiring `networkTime === 'yes'` (or equality with a recorded baseline) for creation controls, or softening the subject wording to say the controls *report* restoration.
2. **Name the excluded jobs.** The provenance lists six successful jobs, but this subject covers only four workers. One sentence would let a reader see without cross-referencing that the macOS/Node 26 and Windows/Node 26 jobs in the same run belong to the separate wave7 subject and are not covered here. Paragraph 2 already says unrelated captures grant no coverage.

## Decision

accepted
