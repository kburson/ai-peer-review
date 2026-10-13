<!-- ai-peer-review-template version="1" digest="sha256:78e9a634af9d540baaf6790db82952eaf39cf7ab59a6cdc7938319ae07a4cbed" -->

<!-- protected-frontmatter -->

---
schema: "ai-peer-review.response/v1"
review_id: "review-4d62b25a01aa5d4505ae995846347002"
role: "reviewer"
turn: 1
commit_mode: "normal"
authority_assurance: "unavailable"
artifact_path: "evidence/portable-runtime/process-source/class-reviews/2026-10-12-190-fresh-read-wave6.md"
artifact_commit: "6a3f934757133b22fea1d6bd403dbc8f3fd8db3f"
artifact_blob: "a8f36d69ff5b9626aefcbfa795194fa65c87ee83"
artifact_digest: "sha256:a5a0a5cecbfab83cd39dc1191b533143351f032b03f935dc919bfad8bbd3e2b5"
agent:
  host: "claude-code"
  provider: "anthropic"
  model_id: "claude-opus-5-5"
  model_display: "claude-opus-5-5"
  session_fingerprint: "sha256:059bae93510bcac2d818e5402b70efda1d954e71c6d862f4a5986a0dcaf40407"
  identity_source: "runtime"
started_at: "2026-10-12T17:10:40.133Z"
submitted_at: "2026-10-12T17:13:14.068Z"
finding_ids: []
answered_finding_ids: []
acknowledged_supplement_ids: []
---

Mode: `normal`

## Summary

Independent review of the wave6 finite class-approval subject (`evidence/portable-runtime/process-source/class-reviews/2026-10-12-190-fresh-read-wave6.md`). The subject asks to admit exactly four class proposals (darwin/arm64/Node24 absence; linux/x64/Node24+26 absence; win32/x64/Node24 absence; linux/x64/Node24+26 creation) derived from six signed receipts captured by run 38278337597 attempt 1 at source `89a2d7dd`. I found the public evidence internally consistent, finite and not widened. Accepted with two optional wording suggestions and stated inspection limits.

What I verified (working-tree bytes, no Git, no network):

1. SHA-256 of every JSON reference in the subject's evidence block matches the on-disk file: proposals (`8e94385b…`), CI provenance (`26213f96…`), all six `receipt.json` (`a3bda2e5…`, `90685044…`, `eae13adc…`, `96ba7a84…`, `305dcfe3…`, `222e9434…`) and all six `host-control.json` (`d5a27316…`, `5a3b5bef…`, `8c2c0eec…`, `3f103bcc…`, `08b9cd12…`, `ff9b5666…`), plus the registration-review subject (`8abd6294…`).
2. Receipts vs. proposals and the subject's table: each receipt's platform/build/architecture/nodeMajor/probe/kind matches its proposal. Linux 24/26 absence (`576323d2`, `0f9002ed`) and Linux 24/26 creation (`bcdbc785`, `c39a8d6d`) merge into two-Node classes; darwin (`c9490e17`) and Windows (`496ca510`) are single Node24 classes. Proposal evidence-digest counts (1+2+1+2) equal the six receipts. No Windows/macOS Node26, Windows/macOS creation, or other platform/build/architecture appears.
3. Package binding: all six receipts and all four proposals carry source `89a2d7dd…`, inventory `0599455…`, contract `a3c54de…`. Linux/macOS tarball `06f2a3d8…`, Windows tarball `a06c5e57…`, as the subject and the registration review state.
4. Hosts and keys: four distinct `hostId` values (Linux Node24 absence+creation share `68517fe6…`; Linux Node26 absence+creation share `fbe76106…`; Windows `9b7fe321…`; macOS `27ba16c8…`) and six distinct signing `keyId`s, as the registration review states. The darwin registration record's `keyId`/`hostId`/package/scope match its receipt.
5. Every receipt pins `registrationRevision` `ff45983f…` and `registrationIndexDigest` `sha256:60a4ce3d…`, identical to the subject's `registrationApproval`.
6. Host controls: all six carry `runId` 38278337597, `runAttempt` 1, `codeCommit` `89a2d7dd…`, `captureProducerCommit` `a4cf59eb…`, `verified: false`, and the matching `captureId`/`kind`. Absence controls show `clockChanges: none`, `restoration: not-required`. Both creation controls show `prerequisites: privilege-and-restoration-observed` and restoration `verified`, zone `UTC`, systemZone `Etc/UTC`, networkTime `yes`.
7. CI provenance projection: `verified: false`, repository `kburson/ai-peer-review`, workflow `.github/workflows/process-source-capture.yml`, event `workflow_dispatch`, run completed/success, six unique job IDs covering exactly one job for each Linux/Windows/macOS × Node24/26 pair, all completed/success. Because each (OS, Node) pair has exactly one job, `verifyCiCaptureControlsCore` (`test/live/process-source/records.mjs:412`) maps each receipt to one job.
8. Creation receipt content (`bcdbc785`, read in full; `c39a8d6d` checked for the DST-phase values): one PID/nonce and an unchanged creation tick interval across every sample; clock-forward ≈ +90 s and clock-backward ≈ −90 s during-phases; a New York → Detroit zone identity change; and a DST phase that moves to 2026-01-15 (`dst: false`) from an October baseline (`dst: true`). Boot ID is the same before and after. The absence receipts have empty transitions.
9. Class reader (`test/live/process-source/authority.mjs:169-389`): with `hostControls`/`ciProvenance` present, it verifies receipts against the approved registration index, then host controls against provenance. It replays `inspectProcessSourceProducerFreeze` from `codeCommit` to `captureProducerCommit`, recomputes each proposal and compares digests, checks finite-scope matching, and requires used captures = receipts = registration index captures. This matches the subject's description that the reader replays the complete producer freeze, not a fixed path list.
10. Post-capture claims: `.github/workflows/ci.yml:28-30` adds branch/repository-scoped `concurrency` with `cancel-in-progress`. The capture workflow is not the edited file. `.prettierignore:44-50` lists exactly the six wave6 registration paths under a preservation comment.

The subject's non-claims are explicit and consistent with the registration review: no Windows C1 performance, resident Windows worker, installed recovery, production activation, provider effect, native-free distribution, reboot or descendant claim. Windows/macOS are absence-only, and seasonal wall times are not claimed as an isolated DST instant. I found no synthetic, widened, inconsistent or self-approved material in the inspected bytes.

Inspection limits (not verified by me):

- I did not use Git (by instruction). So I did not check the Git blob IDs or the `revision` ancestry of any reference. I did not read the registration index at `ff45983f` (the working-tree index now holds only the two wave7 captures). I did not replay the producer freeze `89a2d7dd → a4cf59eb`, compare job definitions against the prior workflow, or check whether the subject's commit-history statements are true.
- I did not verify Ed25519 signatures, recompute `processSourceRecordDigest` values, or recompute proposals. I did not run the class reader, which cannot run until this review is finalized.
- I made no authenticated GitHub API calls. Run/job IDs and conclusions in the provenance projection are unverified data, as the subject itself says.
- I did not inspect the registration review's manifest, final response or finalization bytes. I did not inspect the five other registration records beyond the darwin one, or hash the six registration files.
- For the Node26 creation receipt I only checked the DST-phase UTC values, not every sample.

## Findings

None.

## Required changes

None.

## Optional suggestions

1. The subject says Linux creation "covers … January/July seasonal wall times." The procedure (`test/helpers/process-source-ci-host.mjs:173`) picks January when the baseline is in DST and July otherwise. Both creation receipts started from an October (DST) baseline, so only January was observed. Consider rewording to "an opposite-season (January or July) wall time; this run observed January from an October DST baseline" so the subject does not read as having observed both.
2. Host controls and provenance bind a capture to a job only by the unique (runnerOS, nodeMajor) pair, not by job ID. This is sound while each pair has exactly one job. Consider stating that dependency in the subject, or binding `jobId` in future host controls, so a future matrix with duplicate (OS, Node) pairs cannot be mapped ambiguously.

## Decision

accepted
