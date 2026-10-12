<!-- ai-peer-review-template version="1" digest="sha256:78e9a634af9d540baaf6790db82952eaf39cf7ab59a6cdc7938319ae07a4cbed" -->

<!-- protected-frontmatter -->

---
schema: "ai-peer-review.response/v1"
review_id: "review-50328619d14ac754669d742d3931524a"
role: "reviewer"
turn: 1
commit_mode: "normal"
authority_assurance: "unavailable"
artifact_path: "evidence/portable-runtime/process-source/class-reviews/2026-10-12-190-post207-wave4.md"
artifact_commit: "7c71f0d4afa6e407d9ac2179b68bdfc4e451b607"
artifact_blob: "bf1a7ce24311f7d1d0f1e4705a35cdb7119cc3fd"
artifact_digest: "sha256:870acae1ca53d715eb85edc1feb60c3c2eaff11b4e9a036a6804d7b7a3855c1c"
agent:
  host: "claude-code"
  provider: "anthropic"
  model_id: "claude-opus-5-5"
  model_display: "claude-opus-5-5"
  session_fingerprint: "sha256:1b02606647793ed7b9148a576a4dda54eeff5e031479059da7f941919d394259"
  identity_source: "runtime"
started_at: "2026-10-12T12:30:05.053Z"
submitted_at: "2026-10-12T12:33:21.217Z"
finding_ids: []
answered_finding_ids: []
acknowledged_supplement_ids: []
---

Mode: `normal`

## Summary

The subject asks for approval of exactly three finite classes under contract `sha256:340ece55…db25`:

- `source-615217f7…` is Linux `6.17.0-1022-azure` / x64 / Node 24 and 26, absence.
- `source-73901801…` is darwin `25.6.0` / arm64 / Node 24, absence.
- `source-ab75a4b8…` is Linux `6.17.0-1022-azure` / x64 / Node 24 and 26, creation.

The classes rest on five signed receipts, five host controls, CI provenance for run 38224061596 attempt 1, and the accepted registration review `review-b4675e5ea00233412385f82396f08c39`.

I compared the working-tree public records with each other, with the subject's claims, and with the class reader's acceptance rules:

- `test/live/process-source/authority.mjs:169-389`
- `test/live/process-source/records.mjs:412-515`
- `test/live/process-source/creation.mjs`
- `test/helpers/process-source-ci-host.mjs:166-176`

The records agree with each other. The scope is not widened. The subject claims no coverage that the records lack. I accept, subject to the verification limits stated below.

What I checked (read-only file inspection):

1. **Receipts, registrations and proposals match capture by capture.**

   | Capture        | Kind     | Platform / build / arch / Node        | hostId      | keyId (receipt = registration) | boot (before = after) |
   | -------------- | -------- | ------------------------------------- | ----------- | ------------------------------ | --------------- |
   | `16bc77b6…`    | creation | linux / 6.17.0-1022-azure / x64 / 24  | `769cf77b…` | `ab7c837a…`                    | `6b1aa768…` = = |
   | `fc9482e6…`    | absence  | linux / 6.17.0-1022-azure / x64 / 24  | `769cf77b…` | `0299d4dd…`                    | `6b1aa768…` = = |
   | `3b3170e1…`    | creation | linux / 6.17.0-1022-azure / x64 / 26  | `012979f2…` | `6534c810…`                    | `09c0a478…` = = |
   | `55832d07…`    | absence  | linux / 6.17.0-1022-azure / x64 / 26  | `012979f2…` | `a413a2c0…`                    | `09c0a478…` = = |
   | `3628b759…`    | absence  | darwin / 25.6.0 / arm64 / 24          | `58e77774…` | `6cba20d9…`                    | null / null     |

   - In every case the receipt scope, hostId and keyId equal the working-tree registration record.
   - The receipt `kind` equals the registration `kinds`.
   - Both creation registrations permit exactly `clock-forward, clock-backward, timezone, dst`. All three absence registrations and absence receipts have `transitions: []`.
   - There are three hosts and five distinct key IDs. This matches the registration subject's description.
   - All five receipts carry the same package tuple: source `2a6adf5…`, tarball `5fed440b…7da`, inventory `4cf3ce90…0f2`, contract `340ece55…db25`. All five also carry `registrationRevision` `6cf84a6…` and `registrationIndexDigest` `6899ab44…a913`. These values equal the subject's `registrationApproval.revision` / `indexDigest`, the pinned registration subject's `index` reference, and every proposal's `registrationRevision` / `registrationIndexDigest` / `packageProvenance`.
   - The tarball differs from the Windows tuple (`5d96830e…`) in wave 3 and wave 5. The inventory and contract are identical across them. This is consistent with platform-specific packing of the same source, and the wave-4 registration subject declares the shared `5fed440b…` tuple explicitly.
   - The probe tuples match the receipts and the proposals:
     - Linux: `/proc`, `full-pid-namespace`, `exact-pid-directory-v1`, `procfs-v1`.
     - darwin: `/bin/ps`, `same-user-full-selection`, `exact-ps-selection-v1`, `sha256:62c342e1…940f`.
2. **The finite table matches the proposal bundle and partitions the evidence exactly.**
   - The bundle holds exactly three proposals with unique class IDs. Each row's capability, platform, build, architecture and Node majors match the table.
   - The evidence-digest counts are 2 + 1 + 2 = 5, and the subject declares five receipts.
   - Each class's Node set is the union of its receipts' Node majors: Linux absence = `fc9482e6` (24) + `55832d07` (26); darwin absence = `3628b759` (24); Linux creation = `16bc77b6` (24) + `3b3170e1` (26).
   - No receipt can be claimed by two classes, so the reader's `used.size === captures.size` holds.
   - The registration subject lists exactly these five captures, so `captures.size === registration.index.captures.length` is satisfiable.
   - Semantics and precision are consistent with capability and platform: `linux-pid-directory-v1` / `not-applicable`, `darwin-ps-selection-v1` / `not-applicable`, `linux-start-ticks-v1` / `one-tick`.
3. **The host controls satisfy `verifyCiCaptureControlsCore`.**
   - There are five controls, one per receipt, at the required paths. Each has exactly the required keys and `verified: false` at every level.
   - Every control has `runId` / `runAttempt` = `38224061596` / `1` and `codeCommit` = `2a6adf5…`, which equal the provenance values. Every control has `captureProducerCommit` `a87614a…`.
   - Each `captureId` and `kind` equals its receipt's.
   - The three absence controls are `{clockChanges: "none", restoration: "not-required"}`.
   - The two creation controls are `{prerequisites: "privilege-and-restoration-observed", restoration: {restoration: "verified", zone: "UTC", networkTime: "yes", systemZone: "Etc/UTC"}}`. This agrees with the subject's "original UTC, configured zone and NTP restoration".
4. **The CI provenance is consistent with the subject.**
   - Provenance fields: repository `kburson/ai-peer-review`, workflow `.github/workflows/process-source-capture.yml`, event `workflow_dispatch`, `completed` / `success`, and `sourceCommit` equal to every receipt's package source.
   - There are six unique job IDs, all `completed` / `success`. This matches "all six declared OS/Node workers".
   - Exactly one job matches each receipt's OS and Node: Linux 24 `114727112235`, Linux 26 `114727111739`, macOS 24 `114727112534`. The reader's one-matching-worker rule therefore holds.
5. **The creation receipts show the claimed Linux coverage and nothing more.**
   - Each creation receipt observes one nonce-owned child with an unchanged PID, nonce and tick bounds (`5201` / `228448–228449` and `5251` / `229631–229632`) in every sample of every window. The boot ID is identical before and after.
   - Clock-forward: the UTC−monotonic offset moves about +90 s during the transition (for example, `…6340.797` → `…6430.836` s).
   - Clock-backward: the offset moves about −90 s.
   - Timezone: `America/New_York` → `America/Detroit` with `dst` unchanged.
   - DST: same zone, with `dst` going true → false. The wall clock goes to `1768478453…` ns, which is 2026-01-15 12:00 UTC.
   - Each `after` window returns to New York with `dst: true` and the baseline offset.
   - Exit is code 0 with no signal. Absence is `absent`, the error control is `unknown`, and cleanup is `childExited: true, restoration: verified`.
   - The subject's caveat holds: these are seasonal wall-time samples, not an isolated fixed-instant DST transition (see optional suggestion 1).
6. **Registration acceptance was genuine, finalized and earlier than the captures.**
   - The pinned manifest has status `accepted`, `acceptance_basis: reviewer-consensus` and `final_commit` `faa376d…`, which equals `registrationApproval.review.subject.revision`. Its turn-1 reviewer-response digest `27e2b400…20b3e` equals the subject's `finalResponse.sha256`.
   - The final response is reviewer turn 1 with decision `accepted`, submitted `2026-10-12T09:07:05.370Z`.
   - The darwin live child's creation window is `1791796332–1791796333` s, which is 2026-10-12 09:12:12 UTC. The Linux creation samples begin at about 09:12:14 UTC. Both are after acceptance, which is consistent with "each capture followed genuine accepted and finalized ordinary registration review".
   - The registration author was codex `gpt-6.1-sol` and the registration reviewer was claude-code session `e4633a1b…`. This review runs in a separate session (`1b026066…`), so it is not self-approval.
7. **The contract claims hold.**
   - `src/protocol/process-source-contract-files.json` lists exactly 29 files.
   - The list includes `src/config/selection-read-scope.mjs`, `runtime-selection*.mjs` and `primary-admission.mjs`.
   - It excludes `src/broker/registry.mjs`, which matches "the #207 change is outside this process-source closure".
8. **There is no overlap, reuse or widening.**
   - Neither the three class IDs nor any of the five evidence digests appear in any other file under `evidence/portable-runtime/process-source`, apart from this subject and its proposals file.
   - Sibling wave 5 covers darwin Node 26 and win32 Node 26 under a different registration (`cbe0105…`). Its darwin class (Node 26) does not intersect this darwin class (Node 24).
   - Wave 3 is win32 Node 24 only.
   - Earlier approved classes are under the older contract, so the reader's contract-keyed overlap rule cannot collide with them.
9. **Remaining incompleteness is stated honestly.** The subject explicitly withholds all of the following:
   - Windows C1 performance and the resident Windows worker;
   - installed start/crash/reclaim journeys, whole-child review and exact-head hosted receipts;
   - provider effect, native-free distribution, reboot and descendant claims;
   - production activation.

   It keeps the 30/15/5/800-second budgets with no renewal, cache or source-unavailable waiver.

### Verification limits

- Bash was denied in this session beyond the two prescribed `peer-review` commands, and Git use was prohibited. I therefore did not, and could not:
  - compute SHA-256 or Git blob hashes for any reference in the JSON block, including proposals, receipts, host controls, provenance, the registration subject, manifest and final response;
  - verify the finalization digest `891c1c10…8b6`;
  - read the registration index or the registration records as of `6cf84a6`. I compared against the working-tree registration records and the pinned subject;
  - confirm ancestry: `2a6adf5 → a87614a → 7c71f0d`, `6cf84a6 → faa376d → 970f494 → HEAD`, and the evidence revision `761e27b` before the subject revision;
  - replay the 899-input producer freeze between `2a6adf5` and `a87614a`;
  - run `proposeProcessSourceClassCore` to confirm that the class IDs, the evidence digests and each proposal digest recompute exactly. I also could not confirm the "paused checkpoint" match.
- I did not verify the Ed25519 signatures or the derivation of `hostId` / `keyId`.
- I did not access GitHub for run 38224061596 or its job IDs, or the ignored audit scratch. The provenance projection is unverified data, as the subject states.
- The reader's mechanical checks remain the binding gate at ledger adoption, and my acceptance does not substitute for them. Those checks are `reference()` blob/sha256, `ancestor()`, `inspectProcessSourceProducerFreeze`, the proposal recomputation, `verifyProcessSourceReceiptCore` (signatures) and the structural `verifyProcessSourceClass` match.

## Findings

None.

## Required changes

None.

## Optional suggestions

1. Paragraph 6 says Linux creation covers "January/July seasonal wall times". The CI helper (`test/helpers/process-source-ci-host.mjs:171-174`) moves the clock to 15 January when the baseline is in DST and to 15 July otherwise. Both creation receipts therefore observe only an October (DST) baseline and a 15 January (standard-time) wall time. No July sample exists. Consider "one opposite-season wall time (15 January for this October baseline)".
2. Paragraph 5 says the "exact authenticated run and job IDs must be checked". Neither the receipts nor the host controls carry a job ID. `verifyCiCaptureControlsCore` binds a capture to the provenance only by run/attempt and a unique `runnerOS` + `nodeMajor` match. Consider stating that job binding is by OS/Node uniqueness within the run, or adding the job ID to a future host-control schema so the binding is exact.
3. As in wave 3, the "paused checkpoint" that the proposals reportedly match is not pinned in the JSON block. Either pin it, or say that the reader's recomputation from the pinned receipts and registrations is the binding check.

## Decision

accepted
