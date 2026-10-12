<!-- ai-peer-review-template version="1" digest="sha256:78e9a634af9d540baaf6790db82952eaf39cf7ab59a6cdc7938319ae07a4cbed" -->

<!-- protected-frontmatter -->

---
schema: "ai-peer-review.response/v1"
review_id: "review-38b3401cf458bc98a92b6b06e8736706"
role: "reviewer"
turn: 1
commit_mode: "normal"
authority_assurance: "unavailable"
artifact_path: "evidence/portable-runtime/process-source/class-reviews/2026-10-12-190-post207-wave5.md"
artifact_commit: "fa5f0c8f2d43f53f4dfaa69336b6bad2d2597f0b"
artifact_blob: "8238a8e1dae96d38e1f5586094511edd65d1f469"
artifact_digest: "sha256:de5f787d92608825120f4c9fae4670a400fac14febf34c5125ff194059b400dc"
agent:
  host: "claude-code"
  provider: "anthropic"
  model_id: "claude-opus-5-5"
  model_display: "claude-opus-5-5"
  session_fingerprint: "sha256:fd721ca0e47c4f98e5759987c0656ff595eea59d3eced1c86b48819c54ce5370"
  identity_source: "runtime"
started_at: "2026-10-12T12:37:31.676Z"
submitted_at: "2026-10-12T12:39:27.616Z"
finding_ids: []
answered_finding_ids: []
acknowledged_supplement_ids: []
---

Mode: `normal`

## Summary

The subject asks for approval of exactly two finite absence classes under contract `sha256:340ece55…db25`:

- `source-338c4d64…` is darwin `25.6.0` / arm64 / Node 26, absence (receipt `source-d9411c4a…`).
- `source-b7c59fb3…` is win32 `10.0.26100` / x64 / Node 26, absence (receipt `source-48343037…`).

The classes rest on two signed receipts, two host controls, the CI provenance projection for run 38224061596 attempt 1, and accepted registration review `review-cbdf7244263d35d14a975502c0fc45ba` (registration revision `cbe0105…`, index digest `8e86cac0…ff8c`).

I compared the working-tree public records with each other, with the subject's claims, with sibling waves 3 and 4, and with the class reader's acceptance rules in `test/live/process-source/authority.mjs:240-375`. The records are mutually consistent. Scope is not widened, and the subject claims no coverage the records lack. I accept, subject to the verification limits below.

What I checked (read-only file inspection):

1. **Receipts, registrations and proposals match capture by capture.**

   | Capture     | Kind    | Platform / build / arch / Node | hostId (receipt = registration) | keyId (receipt = registration) | registrationDigest = index entry | Tarball     |
   | ----------- | ------- | ------------------------------ | ------------------------------- | ------------------------------ | -------------------------------- | ----------- |
   | `48343037…` | absence | win32 / 10.0.26100 / x64 / 26  | `676f3eff…`                     | `7101c6e7…`                    | `3ac005c1…`                      | `5d96830e…` |
   | `d9411c4a…` | absence | darwin / 25.6.0 / arm64 / 26   | `19889d43…`                     | `f8d9dec2…`                    | `245553ef…`                      | `5fed440b…` |

   - Each receipt's scope (platform, build, architecture, Node major, probe path/visibility/errorContract/version) equals its registration record byte for byte.
   - Receipt `kind` `absence` equals registration `kinds: ["absence"]`. Both registrations and both receipts have `transitions: []`, and both receipts have `boot: {before: null, after: null}`.
   - Both receipts carry source `2a6adf5…`, inventory `4cf3ce90…0f2`, contract `340ece55…db25`, `registrationRevision` `cbe0105…` and `registrationIndexDigest` `8e86cac0…`. These equal the subject's `registrationApproval.revision` / `indexDigest`, the pinned registration subject's `index` reference, and each proposal's `registrationRevision` / `registrationIndexDigest` / `packageProvenance`.
   - Each proposal's `packageProvenance` tarball matches its own platform's receipt: darwin `5fed440b…` (the Linux/macOS tuple from wave 4) and win32 `5d96830e…` (the Windows tuple from wave 3). No cross-platform tuple mixing.
   - Probe tuples equal the accepted same-platform Node 24 classes: darwin `/bin/ps` / `same-user-full-selection` / `exact-ps-selection-v1` / `62c342e1…`; win32 PowerShell / `local-cim-query` / `completed-cim-query-v1` / `54b68d39…`.
   - Semantics and precision match the per-platform absence pairs in `src/protocol/process-source-assurance.mjs:182` and `test/live/process-source/classes.mjs:67`: `darwin-ps-selection-v1` / `not-applicable` (same as wave 4's darwin class) and `windows-cim-completed-v1` / `not-applicable` (same as wave 3's win32 class).
   - Both receipts show a live child, exit code 0 with no signal, `absent`, error control `unknown` / `probe-query-error`, and cleanup `childExited: true` / `restoration: not-required`. These are the absence-only controls, with no creation or clock coverage claimed.
2. **The finite table matches the proposal bundle and partitions the evidence exactly.**
   - The bundle holds exactly two proposals with unique class IDs. Each row's capability, platform, build, architecture and Node majors match the table.
   - Each proposal lists one evidence digest (1 + 1 = 2). The subject declares two receipts and two host controls. The working-tree `registration-index.json` lists exactly these two captures, so the reader's `used.size === captures.size === registration.index.captures.length` and `hostControls.length === captures.size` checks are satisfiable.
   - The two class IDs and both evidence digests appear nowhere in the repository except this subject and its proposals file (repo-wide grep).
   - There is no overlap with sibling waves under the same contract. Wave 4's darwin class covers Node 24 only and wave 3's win32 class covers Node 24 only; these wave-5 classes cover Node 26 only.
3. **The host controls are shaped as `verifyCiCaptureControlsCore` requires.**
   - There are two controls, one per receipt, at `…/<captureId>/host-control.json`. Each has `verified: false` at both levels.
   - Both have `runId` / `runAttempt` = `38224061596` / `1` and `codeCommit` = `2a6adf5…`, equal to the provenance and receipt package source. Both have `captureProducerCommit` `6abecb99…`. This is later than wave 4's `a87614a…`, as expected for later captures.
   - Each `captureId` and `kind` equals its receipt's. Both controls are `{clockChanges: "none", restoration: "not-required"}`.
4. **The CI provenance is consistent with the subject.**
   - Repository `kburson/ai-peer-review`, workflow `.github/workflows/process-source-capture.yml`, event `workflow_dispatch`, `completed` / `success`, and `sourceCommit` equal to both receipts' package source.
   - There are six unique job IDs, all `completed` / `success`, which matches "all six declared OS/Node workers".
   - Exactly one job matches each receipt's OS and Node: macOS 26 `114727111617` and Windows 26 `114727111771`. The reader's one-matching-worker rule therefore holds.
   - This is the same provenance file (blob `0ab68846…`, sha256 `deda1e0f…`) pinned by wave 4.
5. **Registration acceptance was genuine, finalized and earlier than the captures.**
   - The pinned manifest has status `accepted`, `acceptance_basis: reviewer-consensus` and `final_commit` / `startup_commit` `eea3ca1…`, which equals `registrationApproval.review.subject.revision`. Its `artifact_history` blob `96066626…` and digest `5813d718…` equal the subject reference.
   - The manifest's turn-1 reviewer-response digest `39815ea6…9ffd` equals the subject's `finalResponse.sha256`. That response is reviewer turn 1, decision `accepted`, submitted `2026-10-12T09:26:12.616Z`. The author claim recorded in the manifest is at `09:26:55Z`.
   - The Windows live child's creation lower bound is `1791797272.765` s, which is 2026-10-12 09:27:52 UTC. The darwin lower bound is `1791797275` s, which is 09:27:55 UTC. Both are after registration acceptance and the author's finalization claim. This is consistent with "each capture followed genuine accepted and finalized ordinary registration review".
   - The registration author was codex `gpt-6.1-sol` (session `3360e116…`), and the registration reviewer was claude-code session `956af94f…`. This review runs in a separate session (`fd721ca0…`), so it is not self-approval.
6. **The prose is consistent with waves 3 and 4.** Apart from the counts, the table and the JSON references, the subject's body is identical to the accepted wave-4 subject. The "Linux creation, only when declared above" paragraph correctly applies to nothing here, because no creation row is declared. The incompleteness statements are kept intact: Windows C1, the resident Windows worker, installed journeys, whole-child review, exact-head hosted receipts, provider/native-free/reboot/descendant claims and production activation all remain unproven, and the 30/15/5/800-second budgets remain with no renewal, cache or source-unavailable waiver.

### Verification limits

- Bash was denied in this session beyond the two prescribed `peer-review` commands, and Git use was prohibited. I therefore did not, and could not:
  - compute SHA-256 or Git blob hashes for any reference in the JSON block, or confirm that working-tree bytes equal the pinned revisions (`761e27b…`, `cbe0105…`, `eea3ca1…`, `5266fa7…`);
  - verify the finalization digest `53efedcf…00be`;
  - recompute the canonical registration digests (`3ac005c1…`, `245553ef…`) or the index digest `8e86cac0…`;
  - confirm ancestry `2a6adf5 → 6abecb9 → subject revision`, or that `761e27b` / `cbe0105` precede the subject revision;
  - replay the 899-input producer freeze between `2a6adf5` and `6abecb9`;
  - run `proposeProcessSourceClassCore` to confirm that the class IDs, the evidence digests (`910ae504…`, `92779b91…`) and each proposal recompute exactly. I also could not confirm the "paused checkpoint" match.
- I did not verify the Ed25519 signatures, the derivation of `hostId` / `keyId` from the public keys, or the privacy of the hashed host identifiers.
- I did not access GitHub for run 38224061596 or its job IDs, or the ignored audit scratch. The provenance projection is unverified data, as the subject states.
- The reader's mechanical checks remain the binding gate at ledger adoption, and my acceptance does not substitute for them. Those checks are `reference()` blob/sha256, `ancestor()`, `inspectProcessSourceProducerFreeze`, proposal recomputation, `verifyProcessSourceReceiptCore` (signatures) and the structural `verifyProcessSourceClass` match.

## Findings

None.

## Required changes

None.

## Optional suggestions

1. This carries over wave-4 suggestion 2. Paragraph 5 says the "exact authenticated run and job IDs must be checked", but neither receipt nor host control carries a job ID. The binding to jobs `114727111617` / `114727111771` is only through run/attempt plus a unique `runnerOS` + `nodeMajor` match in the provenance. Consider saying so, or adding the job ID to a future host-control schema.
2. This carries over wave-4 suggestion 3. The "paused checkpoint" that the proposals reportedly match is not pinned in the JSON block. Either pin it, or say that the reader's recomputation from the pinned receipts and registrations is the binding check.
3. Paragraph 6 (Linux creation, "January/July seasonal wall times") is boilerplate that applies to no row in this wave. Consider replacing it with a one-line statement that this wave declares no creation class, so a reader doesn't look for Linux evidence that isn't part of the subject.

## Decision

accepted
