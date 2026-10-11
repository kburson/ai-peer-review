<!-- ai-peer-review-template version="1" digest="sha256:78e9a634af9d540baaf6790db82952eaf39cf7ab59a6cdc7938319ae07a4cbed" -->

<!-- protected-frontmatter -->

---
schema: "ai-peer-review.response/v1"
review_id: "review-7d2f2333b91289f390c755a5ecadaae3"
role: "reviewer"
turn: 1
commit_mode: "normal"
authority_assurance: "unavailable"
artifact_path: "evidence/portable-runtime/process-source/class-reviews/190-current-wave4.md"
artifact_commit: "24614f1689659109b62bf4df1bec61f563b4d4d4"
artifact_blob: "cf71194cd7f01e9894726bdffd7bc14a1deb72f8"
artifact_digest: "sha256:605e129c9df7bf4a14115816e86d8a2ca85866ee8d3ff17b00654d1d33ffd3a9"
agent:
  host: "claude-code"
  provider: "anthropic"
  model_id: "claude-opus-5-5"
  model_display: "claude-opus-5-5"
  session_fingerprint: "sha256:1df7b7acfa938bdfd5d2f5968f9cf7b9ecf869788fa50991be3119048307f823"
  identity_source: "runtime"
started_at: "2026-10-11T01:28:35.698Z"
submitted_at: "2026-10-11T01:31:04.363Z"
finding_ids: []
answered_finding_ids: []
acknowledged_supplement_ids: []
---

Mode: `normal`

## Summary

I independently reviewed the finite class-review subject `evidence/portable-runtime/process-source/class-reviews/190-current-wave4.md`. It asks for approval of exactly four Node 24 class proposals: win32/darwin/linux absence, plus linux creation. I read every public file the subject references, as they exist in the worktree: the proposals bundle, the four signed receipts, the four host controls, the CI provenance projection, the referenced registration review subject (`registration-reviews/190-current-wave4.md`), and the four registrations it pins. I also read the covered source change in `src/broker/storage-protection.mjs`, and I checked how the sibling wave3 and wave5 class subjects are separated from this one.

All four proposals, receipts, registrations and host controls are consistent with each other and with the finite scope the subject declares. The Linux creation clock procedure in the signed receipt matches what the accepted registration review authorized. I found nothing synthetic, widened or self-approving. I am accepting with the inspection limits stated below.

### Inspection and tool limits (stated as required by the subject)

- Git use is forbidden by the reviewer boundary, and shell command execution was denied in this session. So I could **not** recompute any `sha256` or Git blob ID. I also could not check revisions `e3f2b6b`, `137c39a`, `c6b6485`, `5879d23` or `24614f1`, verify the Ed25519 signatures against the registered public keys, or replay the producer freeze from Q `11c83fa` through captureProducerCommit `a3bc24c`. I read worktree bytes only. I cannot prove that they equal the pinned blobs at the pinned revisions.
- I could not view the authenticated GitHub API responses or the downloaded artifacts in ignored audit scratch. CI provenance was checked only as the closed public projection.
- So the mechanical properties (digest/blob binding, signature validity, registration-approval finalization digests, the complete-producer-tree freeze, and how proposal `classId`/`evidenceDigests` are derived from receipts) depend on the immutable class reader's independent replay, as the subject itself requires ("The class reader must independently replay this freeze"). This acceptance does not attest to those properties beyond what follows from reading the content.

### What was checked by reading

1. **Finite scope / one-to-one mapping.** The table's four classes correspond exactly to the four proposals, and each proposal matches exactly one receipt and one registration:
   - win32 10.0.26100 x64 / absence: `source-9f839054…` → `source-0f7fa1c2…`
   - darwin 25.6.0 arm64 / absence: `source-3f4fbcaa…` → `source-5ac1958c…`
   - linux 6.17.0-1022-azure x64 / absence: `source-3234c860…` → `source-67ab4926…`
   - linux 6.17.0-1022-azure x64 / creation: `source-6cabf7ee…` → `source-cdcbfb4b…`

   Platform, build, architecture, `nodeMajor: 24`, probe path/visibility/errorContract/version, capability kind, semantics and precision all match. The proposal scopes use single-element arrays, so no build, architecture or Node widening is present. No Node 26 class is proposed. Node 26 is handled separately in wave3 (Linux) and wave5 (Darwin/Windows), with disjoint class IDs.
2. **Contract / package binding.** Every proposal, receipt and registration pins contract `sha256:505bc7fe…` (equal to the subject's stated current contract), source commit Q `11c83fa…`, and inventory `sha256:e3c4c6c1…`. The Windows tarball digest (`55d4c05b…`) differs from the POSIX tarball digest (`7a5417fb…`), but inventory and contract are identical. The difference is carried consistently through the registration, receipt and proposal, so it is a per-platform pack artifact and not a scope change.
3. **Registration binding.** All receipts and proposals pin registration revision `137c39a…` and index digest `sha256:35d9e2e2…`, matching `registrationApproval`. Each receipt's `keyId` and `hostId` equal its registration's values. Both Linux receipts share `hostId` `d91bbe7a…`, which is consistent with the registration's "3 genuine hosted workers" for 4 captures. Registration `kinds` (absence ×3, creation ×1) and Linux creation `transitions` (`clock-forward`, `clock-backward`, `timezone`, `dst`) match the receipts.
4. **Absence receipts.** All three have a live child (pid/nonce/creation bounds), a clean exit (code 0, no signal), `absence.status: absent`, a fail-closed `error.status: unknown` (probe-access-error on Linux, probe-query-error on Darwin/Windows), `cleanup.childExited: true`, `restoration: not-required`, and `transitions: []`. Their host controls report `clockChanges: none` and `restoration: not-required`. No clock or creation claim is made for Darwin or Windows, as the subject states.
5. **Linux creation receipt vs authorized procedure.** I read all four transitions in the signed receipt:
   - **±90-second UTC steps.** The forward step is +90.0 s (UTC 1791680565.127 → 1791680655.153 across about 33 ms of monotonic time). The backward step is −90.0 s (1791680580.756 → 1791680490.791). Each "during" window holds for six samples (about 5 s). Each "after" window returns to the baseline-consistent UTC: the UTC delta equals the monotonic delta within a millisecond.
   - **Zone change.** America/New_York changes to America/Detroit during the window and returns to New_York afterwards.
   - **Seasonal wall time.** The baseline is October 2026 with `dst: true`. "During" is UTC 1768478452 (2026-01-15 about 12:00:52 UTC) with `dst: false`, which fits the authorized "January/July seasonal wall times at 12:00 UTC to observe opposite DST" because the baseline is in summer time. "After" returns to the October baseline with `dst: true`.
   - **Invariants.** pid 3740, nonce, and the creation interval `linux-ticks:5b8f5306…` [90322, 90323] (one-tick precision) stay unchanged across all 72 samples. Boot identity before and after is equal (`5b8f5306…`), and monotonic time increases throughout.
   - **Restoration.** `cleanup.restoration: verified`. The host control reports `prerequisites: privilege-and-restoration-observed`, restoration `verified`, zone `UTC`, systemZone `Etc/UTC`, `networkTime: yes`. This matches the subject's "signed restoration is to capture baseline; final host controls report original UTC, exact configured zone and NTP restoration".
   - **No overclaim.** The subject explicitly does not claim an isolated fixed-instant DST transition, and the receipt does not show one.
6. **CI provenance projection.** Repository `kburson/ai-peer-review`, run `38099441145`, attempt `1`, source Q, `.github/workflows/process-source-capture.yml`, `workflow_dispatch`, completed/success. All six jobs (macOS, Linux and Windows on Node 24 and 26) completed successfully. All four host controls pin the same run, attempt and code commit and the same captureProducerCommit `a3bc24c…`. The projection and every host control carry `verified: false`, so they are data, not self-asserted capability. The run-38099198335 timing regression is explicitly excluded from class coverage.
7. **Registration/class separation and no self-approval.** The class subject points to a distinct, finalized registration review (`review-37eea1d1…`), with separate subject, manifest, final response and finalization pins. The registration subject states that it "authorizes capture only; it is not finite class approval". The class subject states that proposals generated by the public driver "remain unverified data without this separate ordinary class approval". Sibling waves 3 and 5 use different capture IDs, different captureProducerCommits (`736b8af…`, `780478f…`) and disjoint class IDs, so this review consumes none of them.
8. **Secrets.** The referenced public files contain no private key, binding, credential, password or provider handle. Registrations contain only the Ed25519 SPKI public key.
9. **Covered source change (context only; it does not create class coverage).** In `src/broker/storage-protection.mjs`:
   - The Windows script requests `AccessControlSections 'Access,Owner,Group'` through stock `[System.IO.File|Directory]::GetAccessControl` and `File.GetAttributes`, and parses the DACL via `RawSecurityDescriptor` (lines 219–289).
   - `inspectWindowsReadPair` (lines 790–860) performs one fresh `windowsProbe([...chain, root, target])` per call and retains nothing.
   - On Darwin, `inspect` uses a single `macAclBatch` `/bin/ls -ldne` invocation over the complete ancestor chain plus leaf (lines 747–755). `parseMacAclBatchCore` refuses missing, duplicate and unknown sections.
   - I saw no cache, native build, deadline increase or renewal.
10. **Excluded gates.** Installed journeys, broker startup/crash/absence/reclaim, manual/privilege/cleanup, whole-child review, hosted complete-suite receipts, AITM Test/Review, parent acceptance, production activation and native-free distribution all remain explicitly outside scope. Linux manual review is excluded by user direction and is not presented as completed.

## Findings

None.

## Required changes

None.

## Optional suggestions

1. The subject's source-change sentence ("fresh stock macOS observations query exact complete ancestor/leaf paths in one fixed ls invocation") is accurate for the observation path (`inspect` → `macAclBatch`). However, the provisioning path (`provisionProtectedRoot` / `prepareParent` → `inspectAncestors(..., defer=false)`, line 709) still calls the per-path `macAcl` once per ancestor. Future subjects could say "observation/inspection" explicitly so readers do not infer that provisioning pre-checks are batched too. This has no effect on the process-source classes under review.
2. "Retaining raw DACL bytes and policy" could be read as saying the observation record carries the raw descriptor bytes. The script parses the binary form through `RawSecurityDescriptor` and emits decoded ACE records. Future wording such as "parses the raw DACL binary form" would be more precise.
3. "January/July seasonal wall-time changes" could be read as both months being exercised. The signed receipt shows a single change to January, which is opposite to the October summer-time baseline. Future subjects could say "January or July (whichever is opposite to the baseline)", matching the registration subject's intent.

## Decision

accepted
