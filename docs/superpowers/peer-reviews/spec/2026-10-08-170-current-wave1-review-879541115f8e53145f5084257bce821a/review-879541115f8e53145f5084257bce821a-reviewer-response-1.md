<!-- ai-peer-review-template version="1" digest="sha256:78e9a634af9d540baaf6790db82952eaf39cf7ab59a6cdc7938319ae07a4cbed" -->

<!-- protected-frontmatter -->

---
schema: "ai-peer-review.response/v1"
review_id: "review-879541115f8e53145f5084257bce821a"
role: "reviewer"
turn: 1
commit_mode: "normal"
authority_assurance: "unavailable"
artifact_path: "evidence/portable-runtime/process-source/class-reviews/170-current-wave1.md"
artifact_commit: "549d5100cc0e2060058ce9ffffbfe272cee1822b"
artifact_blob: "ea1209968418dc3c009ebfa28ef7d85e5c292e8a"
artifact_digest: "sha256:3adc12c4becb9005b830abc41b95db23fc5d3c436eafcb6fd30311da970de7f0"
agent:
  host: "claude-code"
  provider: "anthropic"
  model_id: "claude-opus-5-5"
  model_display: "claude-opus-5-5"
  session_fingerprint: "sha256:33a1d7cdf86a245e44dfed904f4ed266d896c3766226675432a06a73328d118c"
  identity_source: "runtime"
started_at: "2026-10-08T07:51:08.952Z"
submitted_at: "2026-10-08T07:57:30.812Z"
finding_ids: []
answered_finding_ids: []
acknowledged_supplement_ids: []
---

Mode: `normal`

## Summary

I reviewed the subject `evidence/portable-runtime/process-source/class-reviews/170-current-wave1.md` at artifact commit `549d510`. I read every artifact it references in the working tree:

- the proposal bundle `classes/170-current-wave1-proposals.json`;
- all six receipts and all six `host-control.json` records;
- the CI provenance projection `classes/170-ci-provenance-37741411472.json`;
- the registration review subject `registration-reviews/170-refreshed-wave1.md` and its accepted final reviewer response (round 2).

I also read the code that produces and admits these records:

- `test/live/process-source/authority.mjs`, which reads the class review;
- `test/live/process-source/records.mjs`, which checks receipts, controls and CI records;
- `test/live/process-source/classes.mjs`, which builds the proposals;
- the CI worker `test/helpers/process-source-ci-capture.mjs`;
- the clock controller `test/helpers/process-source-ci-host.mjs`;
- the workflow `.github/workflows/process-source-capture.yml`.

Finally, I read the author's ignored audit scratch: the raw run and jobs API response `.scratch/170-delivery/ci-capture-run-37741411472.json`, and the full-tree freeze records `wave1-full-tree-freeze-post-publication.json` and `wave2-full-tree-freeze-post-publication.json`.

### What I verified by inspection

**Finite scope.** No proposal widens the scope. I checked this against the receipts.

- `proposeProcessSourceClassCore` requires every combination of build × architecture × Node major to have actually been tested (`classes.mjs:50-56`). It also requires one kind, one platform, one contract and one probe per class.
- The four proposals match the six receipts:
  - **Windows absence**: 10.0.26100 / x64 / Node 24. Receipt `91a42…`, Windows tarball `52dd…`.
  - **Darwin absence**: 25.6.0 / arm64 / Node 24. Receipt `8cfa6…`.
  - **Linux creation**: 6.17.0-1022-azure / x64 / Node 24 and 26. Receipts `dd573…` (Node 24) and `27cb7…` (Node 26).
  - **Linux absence**: the same Linux tuple. Receipts `4f898…` (Node 24) and `c63ac…` (Node 26).
- Each class has the evidence count its scope implies: 1, 1, 2 and 2 receipts.
- Every receipt carries contract `sha256:524b96e3…`, inventory `67d89771…`, source `d50e64f…`, registration revision `26ebc56` and index digest `e3c7d95c…`.
- The Windows tarball digest differs from the others (`52dd…` against `baa5…`). It is recorded in that class's `packageProvenance` and does not affect the contract or inventory digests.
- The Linux absence and creation receipts from the same worker share a host ID: `41e6…` for Node 24 and `bb7d…` for Node 26. They have separate key IDs. This matches "separate capabilities from separate registered keys/receipts".
- The two Darwin host IDs differ (`6e04…` for wave 1, `0713…` for wave 2), and so do the two Windows host IDs (`3ae2…` and `2e00…`).
- Wave 1 and wave 2 classes cannot conflict. Their Windows and Darwin Node majors are disjoint, so `readReviewedProcessSourceClassSet`'s overlap check (`authority.mjs:410-421`) will not fire between them.

**Linux creation controls.** I inspected both creation receipts directly.

In `27cb7…` every sample keeps the same values: PID 4365, nonce `4327…`, creation ticks `131062–131063`, and unit `linux-ticks:c0638445-…`. The boot ID is identical before and after.

Each transition matches the mutations authorized in the registration review:

| Transition | During the change | After restoration |
| --- | --- | --- |
| Clock forward | +≈90.04 s UTC jump, with monotonic time advancing only ≈49 ms | Back to the original offset within ≈0.06 s |
| Clock backward | −≈90 s | Restored |
| Timezone | `America/New_York` → `America/Detroit`, DST unchanged | Back to `America/New_York` |
| DST | UTC jumps to `1768478453…` (≈53 s after 2026‑01‑15 12:00 UTC), DST false, zone unchanged | DST true again |

Each phase has six samples spanning more than 5 s.

`dd573…` has the same structure. A count of its `America/Detroit` samples, `"dst": false` samples, transition kinds and boot fields gives exactly the expected totals.

`validateCreationControls` (`records.mjs:219-287`) enforces all of this mechanically: an unchanged PID, nonce and creation value; strictly increasing monotonic time; windows of at least 5 samples covering at least 5 s; offsets stable to within 0.5 s; a forward step of at least 60 s and a backward step of at most −60 s; the zone/DST rules for each transition kind; and restoration to within 0.5 s with the same zone and DST state.

**Final host restoration.** The two creation host-control records each contain `prerequisites: privilege-and-restoration-observed` and `restoration: verified`, with zone `UTC`, NTP `yes` and system zone `Etc/UTC`.

Those values can only come from `restore()` in `process-source-ci-host.mjs:56-96`. That function pushes an obligation, and `finish()` then throws, unless all of the following hold:

- the UTC-minus-monotonic offset is back within 0.5 s of the originally observed value;
- the zone and DST state match the original observation;
- `timedatectl` reports the original NTP state and the original system zone.

`finish()` runs in a `finally` block (`process-source-ci-capture.mjs:191-195`). If it throws, the capture step fails and so does the job. The worker writes `host-control.json` only after a successful capture and `verify` (`:216-235`).

The reader requires the `verified` restoration shape for creation receipts and `clockChanges: none, restoration: not-required` for absence receipts (`records.mjs:486-513`).

**CI provenance.** The raw run/jobs response in scratch matches the committed projection field for field:

- run `37741411472`, attempt `1`, event `push`, `completed`/`success`, workflow path `.github/workflows/process-source-capture.yml`, head SHA `d50e64f…`;
- repository `kburson/ai-peer-review`, which is `private: false`;
- six jobs whose IDs, names (OS and Node), `completed`/`success` status and run-level `head_sha` all match the projection.

The timing is also consistent:

| Capture | Receipt timestamp | Matching job's capture step |
| --- | --- | --- |
| Darwin Node 24 | creation lower bound `1791444464 s` = 2026‑10‑08T07:27:44Z | macOS‑24 ended 07:27:45Z |
| Windows Node 24 | `1791444468.5 s` = 07:27:48Z | Windows‑24 ended 07:27:56Z |
| Linux Node 26 creation | last sample ≈ 07:28:50Z | Linux‑26 ended 07:28:50Z |

`verifyCiCaptureControlsCore` requires exactly one successful job per (runner OS, Node major) and requires the run ID, attempt and commit to equal the host-control record's.

**Producer closure.** All six host-control records give `captureProducerCommit` `4af17d7`. The author's wave‑1 post-publication freeze record shows Q `d50e64f` → head `4af17d7`. Every changed path is under `evidence/portable-runtime/process-source/` or `docs/superpowers/peer-reviews/`, and the full non-evidence tree diff exited 0. The wave‑2 record extends the same result to `5901a47`.

The reader repeats this mechanically for each control, without trusting the author's record. It checks that `codeCommit` is an ancestor of `captureProducerCommit`, which is an ancestor of the subject revision, and runs `git diff --exit-code codeCommit captureProducerCommit -- . ':!evidence/portable-runtime/process-source' ':!docs/superpowers/peer-reviews'` (`authority.mjs:305-320`). This closes registration finding R1‑F001, which asked for a recheck through each worker's actual `captureProducerCommit`.

**Authority implementation.** The reader:

- re-reads every reference by Git blob ID and SHA‑256;
- re-runs the normal-review check on the registration approval and on this class review;
- verifies each receipt against its registered Ed25519 key (`records.mjs:334-350`);
- rejects duplicate captures, unmatched host controls and foreign receipts (a receipt with no matching registration fails registration validation);
- requires every registered capture to be consumed exactly once (`authority.mjs:378-379`);
- rebuilds each proposal and requires a canonical-digest match;
- derives the approval, evidence and review digests only from the finalized normal-review proof.

The capture records carry `verified: false` throughout, and the reader never trusts them as approval.

### Verification limits

- In this session Bash and WebFetch were denied apart from the two prescribed peer-review commands, and Git is forbidden by the reviewer boundary. I therefore did **not** independently:
  - recompute SHA‑256 values or Git blob IDs;
  - verify Ed25519 signatures or canonical receipt digests (including the proposals' `evidenceDigests` and `classId`);
  - run `git diff` or the ancestry checks;
  - query GitHub.
- My CI confirmation rests on the author's raw API capture in ignored scratch, not on a fresh authenticated query.
- The `host-control.json` and provenance records are unsigned. Their authenticity rests on the author's download of the public artifacts from that run, together with this review.
- The reader's digest, signature, ancestry and full-tree-diff checks are mechanical and fail closed. They will run at admission regardless of my limits.
- Everything listed above under "verified by inspection" was confirmed by reading bytes and code, not by execution.

## Findings

None.

## Required changes

None.

## Optional suggestions

1. **Close the downgrade path.** `readReviewedProcessSourceClasses` treats `hostControls`/`ciProvenance` as optional (`authority.mjs:214-229`). This is needed for the earlier local-absence class. As a result, a future class subject could cite CI-produced *creation* receipts without the final-restoration record and pass the mechanical reader, and only the human review would catch it. This subject includes both records, so it is unaffected. A later revision could require `hasCi` whenever any receipt has `kind: creation` or a CI-origin registration.
2. **Tighten the subject's wording.** Paragraph 3 says "each referenced host-control record proves final original UTC, exact Etc/UTC zone and NTP state restoration". Only the two Linux creation records carry that restoration. The four absence records state `clockChanges: none` / `restoration: not-required`, and `clockChanges: none` is a constant written by the worker, not an observation. On Linux it also excludes the earlier prepare-phase privilege probe: a +2 s step that was itself verified as restored. Future subjects could say "each referenced creation host-control record". The reader also accepts any well-formed `zone` and `systemZone` text. "Exact Etc/UTC" is therefore an observed value of these two records (restoration is to the original observation), not a reader-enforced constant. The subject could say so.
3. **Bind host controls to workers mechanically.** The host-control record could carry the GitHub job ID and the receipt digest. The reader could then bind each control to one specific provenance job and receipt, instead of relying on (OS, Node major) uniqueness and `captureId`.
4. **Bound the clock-step size.** `validateCreationControls` accepts any forward step of at least 60 s and any backward step of at most −60 s. The approved mutation is ±90 s. An upper bound, such as at most 120 s in magnitude, would make the receipt check match the authorized mutation exactly.

## Decision

accepted
