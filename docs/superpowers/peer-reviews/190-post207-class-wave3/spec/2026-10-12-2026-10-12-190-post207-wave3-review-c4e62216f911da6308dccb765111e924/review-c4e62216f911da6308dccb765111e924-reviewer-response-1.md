<!-- ai-peer-review-template version="1" digest="sha256:78e9a634af9d540baaf6790db82952eaf39cf7ab59a6cdc7938319ae07a4cbed" -->

<!-- protected-frontmatter -->

---
schema: "ai-peer-review.response/v1"
review_id: "review-c4e62216f911da6308dccb765111e924"
role: "reviewer"
turn: 1
commit_mode: "normal"
authority_assurance: "unavailable"
artifact_path: "evidence/portable-runtime/process-source/class-reviews/2026-10-12-190-post207-wave3.md"
artifact_commit: "e47e1e534131b1dd8a9c4a19694e259583af1b7d"
artifact_blob: "c6d46a82150cd6c6ea88fb16a2d4577c28aa028d"
artifact_digest: "sha256:118cba64c7572806c37456a189dce16e6d77d7cb89385e03d9517220ba82aabe"
agent:
  host: "claude-code"
  provider: "anthropic"
  model_id: "claude-opus-5-5"
  model_display: "claude-opus-5-5"
  session_fingerprint: "sha256:52d89e3e051e1d6ca544bc3e55cc74a3cb5c26edd086756c879f2b9698aae6ab"
  identity_source: "runtime"
started_at: "2026-10-12T12:24:02.750Z"
submitted_at: "2026-10-12T12:26:21.640Z"
finding_ids: []
answered_finding_ids: []
acknowledged_supplement_ids: []
---

Mode: `normal`

## Summary

The subject asks for approval of exactly one finite class, `source-e70fc2c68d373f60e400ef7057a3f161`. Its scope is Windows `win32` / `10.0.26100` / `x64` / Node 24, absence only. It rests on one signed receipt (`source-69a9352ab6feaa4429330696565157e0`), one host control, the CI provenance for run 38224061596 attempt 1, and the accepted registration review `review-1d46e84069a533817a7d5123ff1e38a7`.

I compared the public records in the working tree against the subject's claims and against the class reader's acceptance rules (`test/live/process-source/authority.mjs:169-389`, `test/live/process-source/records.mjs:412-515`). The records are consistent with each other, the scope is not widened, and nothing in the subject asserts coverage that the records do not carry. I accept, subject to the verification limits stated below.

What I checked (read-only file inspection):

1. **The proposal matches the receipt and the registration exactly.**
   - Proposal scope (`builds: ["10.0.26100"]`, `architectures: ["x64"]`, `nodeMajors: [24]`, platform `win32`) equals the single receipt scope and the registration record scope.
   - The probe tuple is identical in all three records: path `C:\Windows\System32\WindowsPowerShell\v1.0\powershell.exe`, visibility `local-cim-query`, error contract `completed-cim-query-v1`, version `sha256:54b68d39…4366`.
   - Capability `absence` matches receipt `kind` and registration `kinds: ["absence"]`. Registration and receipt both have `transitions: []`, and receipt `boot` is null/null. No creation or clock-change capability is claimed.
   - The package tuple is identical in the proposal `packageProvenance`, the receipt and the registration: source `2a6adf5…`, tarball `5d96830e…c9a9`, inventory `4cf3ce90…f2`, contract `340ece55…db25`.
   - Proposal `registrationRevision` (`6f736f9…`) and `registrationIndexDigest` (`a8c400d2…6911`) equal the receipt's values and the subject's `registrationApproval.revision` / `indexDigest`. The pinned registration subject's `index.sha256` is the same digest.
   - Receipt signature key ID `sha256:c99473d8…79e8` equals the registration record's `keyId`, and the receipt `hostId` equals the registration `hostId`.
2. **The finite table matches the proposal bundle.** The bundle holds exactly one proposal, and its class ID, capability, platform, build, architecture and Node major match the single table row. One receipt and one host control are declared, which satisfies the reader's rule `hostControls.length === captures.size`. The registration review covered exactly one capture, which is the same capture, so the reader's coverage rule `captures.size === registration.index.captures.length` is satisfiable.
3. **The host control satisfies the absence rules the reader enforces.** It has exactly the required keys. `verified` is `false` at both levels, as the reader requires; these flags are capture-owned and never trusted. `runId`/`runAttempt` (`38224061596`/`1`) and `codeCommit` (`2a6adf5…`) equal the provenance values. `captureId` and `kind: "absence"` equal the receipt's. `control` is `{verified: false, clockChanges: "none", restoration: "not-required"}`. This agrees with the subject's statement that Windows permits absence only, with no clock-change coverage.
4. **The CI provenance is consistent with the subject.**
   - Repository `kburson/ai-peer-review`, workflow `.github/workflows/process-source-capture.yml`, event `workflow_dispatch`, status `completed`, conclusion `success`.
   - The six job IDs are unique and every job is `completed`/`success`. The subject's "all six declared OS/Node workers" therefore matches the projection.
   - Exactly one job is Windows Node 24 (`114727111675`), so the reader's one-matching-worker rule holds.
   - The provenance `sourceCommit` equals the receipt's package `sourceCommit`.
5. **The registration review was genuinely accepted, and it preceded the capture.**
   - The pinned final response (`reviewer-response-2.md`) is a reviewer turn 2 with decision `accepted`, submitted at `2026-10-12T08:51:49.208Z`, on artifact commit `373a984…`, which equals `registrationApproval.review.subject.revision`.
   - The receipt's live-child creation window, `1791795310629073000` UTC ns, decodes to about 2026-10-12 08:55:10 UTC. That is after the acceptance timestamp, which is consistent with "each capture followed genuine accepted and finalized ordinary registration review".
   - The registration reviewer, the author and this reviewer are separate sessions. This review is not self-approval.
6. **The contract claims hold.** `src/protocol/process-source-contract-files.json` lists exactly 29 files. The list includes `src/config/selection-read-scope.mjs`, `src/config/runtime-selection*.mjs` and `src/config/primary-admission.mjs`, which matches "selection read scopes … selection-store … primary registration/activation integration". It does **not** include `src/broker/registry.mjs`, which matches "the #207 change is outside this process-source closure".
7. **No overlap or widening across waves.**
   - The existing approved class set (`classes/review-index.json`, waves 1–7) was approved under the older contract (`424f35d0…`, per the wave-7 subject). The reader's set-overlap rule keys on contract equality, so this class cannot collide with those classes.
   - Sibling post-#207 waves cover Linux/darwin Node 24/26 (wave 4) and darwin/win32 Node 26 (wave 5). The win32 Node 26 class in wave 5 does not intersect this win32 Node 24 class.
   - No other class or proposal file names `source-e70fc2c6…` or evidence digest `bc6fbc0b…54bd4`.
8. **Remaining incompleteness is stated honestly.** The subject explicitly withholds Windows C1 performance, the resident Windows worker, installed recovery and journeys, whole-child review, exact-head hosted receipts, provider effect, native-free distribution, reboot and descendant claims, and production activation. It keeps the 30/15/5/800-second budgets with no renewal, permission cache or source-unavailable waiver.

### Verification limits

- Bash was denied in this session beyond the two prescribed `peer-review` commands, and Git use was prohibited. I therefore did not, and could not:
  - compute SHA-256 or Git blob hashes for any reference in the JSON block, including the subject, manifest, final response, proposals, receipt, host control and provenance;
  - verify the finalization digest `9d38e27d…ab09`;
  - read the registration index as of revision `6f736f9`. The working-tree `registration-index.json` has since moved on to a later wave, so I relied on the pinned registration subject and the prior reviewer's turn-2 statement that it listed only `source-69a9352a…`;
  - confirm ancestry: `6f736f9 → 373a984 → e4c5e16 → HEAD`, `2a6adf5 → captureProducerCommit 8b874df → subject revision`, and the proposals/receipt revision `761e27b` before the subject revision;
  - replay the 899-input producer freeze between `2a6adf5` and `8b874df`;
  - run `proposeProcessSourceClassCore` to confirm that the class ID, the evidence digest `bc6fbc0b…` and the proposal digest recompute exactly. I also could not confirm the "paused checkpoint" match the subject mentions.
- I did not verify the Ed25519 receipt signature or the derivation of `hostId`/`keyId`.
- I did not access GitHub for run 38224061596 or its jobs, or the ignored audit scratch with raw authenticated responses. The provenance projection is unverified data, as the subject itself states.
- The checks the reader enforces mechanically (`reference()` blob/sha256 checks, `ancestor()`, `inspectProcessSourceProducerFreeze`, the proposal recomputation and the structural `verifyProcessSourceClass` match) remain the binding gate at ledger adoption. My acceptance does not substitute for them.

## Findings

None.

## Required changes

None.

## Optional suggestions

1. Paragraph 1 reads "these exact 1 finite proposals from 1 signed receipts". Consider using the singular form ("this exact finite proposal from one signed receipt") in generated text when the count is 1.
2. Paragraph 6 ("Linux creation, only when declared above …") is shared boilerplate across the post-#207 waves. It does not apply to this Windows-only wave. Its sentence "Signed restoration and final host controls prove original UTC, configured zone and NTP restoration" could be misread as a claim about this wave's host control, which actually records `clockChanges: "none"` and `restoration: "not-required"`. Consider omitting the paragraph when no Linux creation class is declared, or adding a sentence that states this wave's actual host-control values.
3. Paragraph 4 says the proposals "match the paused checkpoint exactly", but the JSON block pins no checkpoint artifact. Either pin it, or state that the reader recomputes the proposals from the pinned receipts and registrations, which is the check that actually binds.
4. This appears to be the first class approval under contract `340ece55…`; earlier approved classes are under `424f35d0…`. Consider naming, in a later wave, which of the 29 closure files changed relative to the last approved contract. That would let class reviewers tie "source changes" to concrete paths rather than only to the qualitative description in paragraph 2.

## Decision

accepted
