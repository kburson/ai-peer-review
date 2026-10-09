<!-- ai-peer-review-template version="1" digest="sha256:78e9a634af9d540baaf6790db82952eaf39cf7ab59a6cdc7938319ae07a4cbed" -->

<!-- protected-frontmatter -->

---
schema: "ai-peer-review.response/v1"
review_id: "review-6eb727f6de30ed23f41d2cc748ee864b"
role: "reviewer"
turn: 1
commit_mode: "normal"
authority_assurance: "unavailable"
artifact_path: "evidence/portable-runtime/process-source/class-reviews/190-current-wave1.md"
artifact_commit: "75d9d024666601998d23666dc5133c1777c95135"
artifact_blob: "aba62e3222f303788c306805caa867a871734455"
artifact_digest: "sha256:156db01cb75bdb21fe09298739507dcb21f5024d84d485d360b2c90a6fe93ccf"
agent:
  host: "claude-code"
  provider: "anthropic"
  model_id: "claude-opus-5-5"
  model_display: "claude-opus-5-5"
  session_fingerprint: "sha256:ecb166856f7cba7fc8154648df6d5ae89f6cbf5552862c47874f71697054773a"
  identity_source: "runtime"
started_at: "2026-10-09T13:56:04.883Z"
submitted_at: "2026-10-09T14:01:29.998Z"
finding_ids: []
answered_finding_ids: []
acknowledged_supplement_ids: []
---

Mode: `normal`

## Summary

I reviewed the class-review subject `evidence/portable-runtime/process-source/class-reviews/190-current-wave1.md` on its own. I checked it against the working-tree evidence it pins and the producer and reader code that created and consumes that evidence.

**Tool limits (stated first, as the subject asks).**

- Git was forbidden to me.
- I could run one `shasum -a 256` call. Later shell calls were denied, including `node -e`, building Git blob IDs by hand, and the `peer-review help` CLI.

So I could **not** verify any of the following myself:

- Ed25519 receipt signatures.
- Git blob IDs, or any bytes at the pinned historical revisions. That includes the registration index at `8c5f286` and the Q→`captureProducerCommit` tree diff.
- Commit ancestry.
- Canonical `processSourceRecordDigest` values: the proposal `evidenceDigests`, the receipt `registrationDigest` and the index entry digests.
- The proposal recomputation.
- The GitHub Actions run/jobs API data for run 37932795095.
- The claimed 104-test run, lint or format results.

These checks remain the job of the mechanical class reader, `readReviewedProcessSourceClasses`, and of the author's audit scratch. My acceptance does not substitute for them.

**What I verified directly.**

1. **Pinned bytes.** I hashed the working-tree files with SHA-256. All 14 values match the subject's pins exactly: the proposals bundle, 6 receipts, 6 host controls and the CI provenance projection. Git blob IDs were not checked.
2. **Finite scope and evidence pairing.** There are 4 proposals:
   - Linux creation, Node 24 and 26: receipts `2e4f` and `656f`.
   - Linux absence, Node 24 and 26: `524a` and `180f`.
   - Darwin 25.6.0 arm64 absence, Node 24: `74e9`.
   - Win32 10.0.26100 x64 absence, Node 24: `79b5`.

   Each receipt's platform, build, architecture, Node major, probe tuple, kind and package (source Q `17c6418…`, inventory `f53f…`, contract `bf401a…`) matches its registration and its proposal. The Win32 tarball digest is `89bc…` and every other receipt uses `1558…`. Registration, receipt and proposal all agree on this. No proposal is wider than its receipts.
3. **Signed-key binding.** Every receipt's `signature.keyId` equals the `keyId` of its own registration, and all 6 keys are distinct. The Linux workers pair as expected: host `d577…` produced `2e4f` and `524a`, and host `2f82…` produced `656f` and `180f`. Darwin and Windows each have a distinct host. This matches 4 prepared workers yielding 6 captures.
4. **Creation receipts (2e4f, 656f).**
   - **Unchanged child:** all 294 pid/nonce/lower/upper occurrences in each receipt have one identical value (pid 3990 and 4225 respectively). The kernel boot ID is the same before and after.
   - **Transitions:** each receipt has exactly the four registered transitions.
   - **Clock steps (2e4f):** UTC jumps by about +90.0 s, then −90.0 s, against monotonic deltas of about 37 ms between samples. The `after` samples return to the baseline offset.
   - **Zone:** the zone identity changes `America/New_York`→`America/Detroit` and back.
   - **Seasonal DST:** the baseline is October, New York, `dst:true`. The `during` samples are at about 2026-01-15T12:00:52Z, `dst:false`, matching the code's `Date.UTC(year, 0, 15, 12)` target plus elapsed time since the baseline. The `after` samples return to `dst:true` at the baseline time.
   - **Samples:** six samples per phase, about 1 s apart, so each state is sustained.
5. **Absence receipts.** Each has `transitions: []`, live/exit(0)/absent/error controls, and `cleanup.restoration: not-required`. The matching host controls report `clockChanges: none`. Windows and Darwin make no clock or creation claim.
6. **Host controls.** All six share runId 37932795095, attempt 1, codeCommit Q and `captureProducerCommit` `21cd5fc…`. Each `kind` matches its receipt. The two creation controls report `prerequisites: privilege-and-restoration-observed` and `restoration: verified`, with UTC zone, `systemZone: Etc/UTC` and NTP `yes`.
7. **Registration approval.** All six `registrations/approved-refs/*.json` are field-for-field identical to the subject's `registrationApproval`: the revision, the index digest, review `review-4150…`, subject `5e02025`, and manifest/finalResponse/finalization `038115b`.
   - The pinned finalResponse sha256 `b1c85599…` equals the digest recorded in that review's manifest turn 1.
   - The manifest shows `status: accepted`, author `codex`/openai `gpt-6.1-sol` and reviewer `claude-code`/anthropic `claude-sonnet-5-5`. That makes it a genuine cross-provider normal review, separate from this class review.
   - Timing is consistent with approval before capture: the reviewer submitted at 13:07:42Z, the author finalized at about 13:08:42Z, and the earliest capture creation bound is 1791551362 s, about 13:09:22Z.
   - The eight registration files are excluded byte-for-byte from the formatter (`.prettierignore` lines 27–34).
8. **CI provenance projection.** It records run 37932795095 attempt 1, `workflow_dispatch`, completed/success, workflow path `.github/workflows/process-source-capture.yml` and source Q. It lists 6 unique successful jobs, one per {Linux, macOS, Windows} × {24, 26}.
   - The workflow at the working tree declares `workflow_dispatch` and `max-parallel: 4`. That matches 4 first-wave workers and 2 later ones.
   - Each wave-1 receipt maps to exactly one (OS, Node) job, as `verifyCiCaptureControlsCore` requires.
9. **Producer logic (as read at HEAD; I assume the Q bytes are the same but did not verify it).**
   - `process-source-ci-capture.mjs` freezes every tracked file except `*.md`/`*.json` under the two authority folders, refuses untracked producers, and re-asserts the freeze before each approval and capture.
   - It writes `host-control.json` only after `clock.finish()` has returned.
   - In `process-source-ci-host.mjs`, `restore()` throws unless all of these hold: the UTC/monotonic offset is within ±0.5 s of the original, zone/DST are equal, NTP equals its original value, and the configured system zone equals its original value. A throw fails the step, which fails the job.
   - So a successful job, plus a host control, means the in-process restoration check passed. One context (signal plus the 800 s deadline) is used from `begin` through `finish`.
10. **Post-capture C5 reader correction.**
    - `records.mjs:437` now allows only `push` and `workflow_dispatch`.
    - The unit test at `process-source-conformance.test.mjs:1279–1295` accepts `workflow_dispatch`. It rejects `pull_request`, `workflow_run`, `schedule`, `repository_dispatch` and the empty string.
    - `records.mjs` is not among the 28 files in `src/protocol/process-source-contract-files.json`, so the production contract is unaffected.
    - `scripts/bootstrap-portable-runtime.mjs` is the one new entry in both `package.json` `files` and the closed list in `scripts/verify-extraction.mjs`. It is also outside the contract.
11. **Class separation.**
    - `190-current-wave2-proposals.json` contains no creation class.
    - Wave-1 Darwin/Windows classes cover Node 24 only. A Node 26 class for the same platform would not overlap under `readReviewedProcessSourceClassSet`.
    - The historical 170/524b classes use a different contract digest.
    - The reader's coverage check requires every capture in the approved index to be consumed, so all 6 must be used.

I found no synthetic, self-approved, widened or changed evidence. Within my limits, the subject's claims are supported by the records and code I could inspect. The two items below are non-blocking.

## Findings

None.

## Required changes

None.

## Optional suggestions

1. **Align the durable reader's freeze re-check with the capture-time freeze.** `authority.mjs:308–317` excludes the whole `evidence/portable-runtime/process-source` and `docs/superpowers/peer-reviews` trees. `capture-producer-freeze.mjs` exempts only `*.md`/`*.json` there, and the subject says executables in those folders remain frozen.

   No non-Markdown/JSON files exist under `evidence/portable-runtime/process-source` at HEAD, so this gap is latent. Still, the durable reader is weaker than the CI guard it is meant to confirm.

   Two possible fixes:
   - Narrow the exclusions to `':(exclude,glob)evidence/portable-runtime/process-source/**/*.md'`, `…/*.json`, and the same pair for `docs/superpowers/peer-reviews`.
   - Diff the name lists and check them with `captureProducerFiles`.

   In either case, add `--no-ext-diff --no-textconv`, or use `git diff-tree --quiet`, so local diff configuration cannot affect the exit code.
2. **Say what supports the restoration claim.** "final host-control records independently prove original UTC, exact configured zone and NTP restoration" could be reworded to state its basis:
   - `host-control.json` is unsigned and marked `verified:false`.
   - It is written by the same supervisor, and only after `restore()` has passed its ±0.5 s offset check and its zone, DST, NTP and system-zone equality checks.
   - That pass is evidenced only by the job's `success` conclusion in the CI provenance projection, whose raw API responses remain in ignored scratch.
3. **Optionally bind the branch in provenance.** Record `head_branch` (or `headRef`) in the CI provenance projection so the reader can confirm `codex/190-installed-journeys` directly, rather than inferring it from the in-job `GITHUB_REF_NAME` guard at Q.
4. **Explain the Win32 tarball digest in one sentence.** It differs (`89bc…` against `1558…`) while the inventory digest is the same. A future reviewer should not have to infer that this is a platform-pack artifact and not changed source.
5. **Make the seasonal-jump wording specific.** "January/July seasonal wall-clock jump" could say that both actual captures had a DST-active October baseline and so jumped to 15 January 12:00 UTC. The July branch was not exercised.

## Decision

accepted
