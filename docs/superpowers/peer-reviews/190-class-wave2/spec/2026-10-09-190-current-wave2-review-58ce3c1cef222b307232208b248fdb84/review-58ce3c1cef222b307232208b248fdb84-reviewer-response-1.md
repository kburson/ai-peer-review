<!-- ai-peer-review-template version="1" digest="sha256:78e9a634af9d540baaf6790db82952eaf39cf7ab59a6cdc7938319ae07a4cbed" -->

<!-- protected-frontmatter -->

---
schema: "ai-peer-review.response/v1"
review_id: "review-58ce3c1cef222b307232208b248fdb84"
role: "reviewer"
turn: 1
commit_mode: "normal"
authority_assurance: "unavailable"
artifact_path: "evidence/portable-runtime/process-source/class-reviews/190-current-wave2.md"
artifact_commit: "da74e66ac6ecffab6b1a4f802b95d3a468098b23"
artifact_blob: "228dbbbf16047138dc0d5796697497d5c3ef3870"
artifact_digest: "sha256:0c83299c90cad064b2f2f68269bf334a6af34c061da08341739a9d9e381f7344"
agent:
  host: "claude-code"
  provider: "anthropic"
  model_id: "claude-opus-5-5"
  model_display: "claude-opus-5-5"
  session_fingerprint: "sha256:efc7b113ed1a12ffb2cc9e2c618fcd9b27dd27d3c90644b398814d03bd7bbfae"
  identity_source: "runtime"
started_at: "2026-10-09T14:18:41.139Z"
submitted_at: "2026-10-09T14:22:01.181Z"
finding_ids: []
answered_finding_ids: []
acknowledged_supplement_ids: []
---

Mode: `normal`

## Summary

I reviewed the class-review subject `evidence/portable-runtime/process-source/class-reviews/190-current-wave2.md` on its own (sha256 `0c83299c…`, which matches the frontmatter digest). I checked it against the working-tree evidence it pins, the wave-2 registration approval, and the capture producer and durable reader code at HEAD.

### Tool limits (stated first, as the subject asks)

- Git was forbidden to me. `shasum -a 256` was permitted. A `node -e` call to build Git blob IDs by hand was denied.
- So I did **not** verify any of the following myself:
  - Git blob IDs, or any bytes at the pinned historical revisions (`559f427`, `6c860b2`, `c460fed`, `6115866`).
  - Commit ancestry, commit timestamps, or the Q (`17c6418…`) → `captureProducerCommit` (`f5ade96…`) producer-tree freeze.
  - Ed25519 receipt signatures.
  - Canonical `processSourceRecordDigest` values: proposal `evidenceDigests` (`f742…`, `f508…`), the registration index entry digests, and the proposal recomputation.
  - GitHub Actions run/jobs API data for run 37932795095.
  - The claimed 104-test run, lint or format results.
- These checks belong to the mechanical class reader, `readReviewedProcessSourceClasses` in `test/live/process-source/authority.mjs`, which reruns at ledger admission. I read it and confirm below that it performs each one. My acceptance does not replace it.

### What I verified directly

1. **Pinned bytes.** All 6 SHA-256 pins in the JSON block match the working-tree files exactly: the proposals bundle (`4637c744…`), receipts `a0e9` (`70513c90…`) and `aa90` (`d1a89567…`), host controls `a0e9` (`cf4a2040…`) and `aa90` (`50320370…`), and CI provenance (`356dc32e…`). The registration-approval subject (`d43992ea…`), manifest (`7a2ea999…`) and final response (`bfceb7b4…`) also match their pins. So do `registration-index.json` (`9c54751a…`, equal to `indexDigest`) and the two registrations (`12d197c8…`, `960e0f2d…`), which match the registration subject's pins.

2. **Finite scope and evidence pairing.** The bundle has exactly 2 proposals and the block pins exactly 2 receipts and 2 host controls:
   - `source-311cdf00…`: darwin, build 25.6.0, arm64, Node [26], absence, `/bin/ps` probe, version `62c3…`. Backed by receipt `aa907980…`.
   - `source-b7581d68…`: win32, build 10.0.26100, x64, Node [26], absence, PowerShell CIM probe, version `54b6…`. Backed by receipt `a0e99c48…`.

   For each pair, the receipt, the registration and the proposal agree on platform, build, architecture, Node major, probe tuple, kind (`absence`), and package. Package means source Q, inventory `f53f…`, contract `bf401a6e…`, and tarball `1558…` (darwin) or `89bc…` (win32). Both proposals pin `registrationRevision` `6c860b2…` and `registrationIndexDigest` `9c54…`, the same values as the approval reference. No proposal is wider than its single receipt. The scope table in the subject matches the bundle.

3. **Signed-key and host binding.** Each receipt's `signature.keyId` and `hostId` equal its own registration's values (`9f96…`/`cd34…` for win32, `0ff7…`/`05e7…` for darwin). These keys and host IDs appear nowhere else under `evidence/`, so they are distinct from all wave-1 workers. Each receipt's `registrationDigest` equals its entry in `registration-index.json` (`7552…`, `ae5a…`).

4. **Absence receipts.** Each receipt has the following:
   - `transitions: []` and boot `null`/`null`;
   - a live control, an owned exit (code 0, signal null), an absence with the same pid (5352 on win32, 13701 on darwin), and an `unknown`/`probe-query-error` error control;
   - `cleanup.childExited: true` with restoration `not-required`.

   The creation windows are 100 ns on win32 (FILETIME granularity) and 1 s on darwin (`ps` granularity). That fits each platform's semantics and the `not-applicable` precision. Neither receipt makes a clock, creation or restoration claim.

5. **Host controls.** Both controls carry run 37932795095, attempt 1, `codeCommit` Q, `captureProducerCommit` `f5ade96…` (distinct from wave 1's `21cd5fc…`), their own capture ID, kind `absence`, and `clockChanges: none` / `restoration: not-required`. That is exactly the absence shape that `verifyCiCaptureControlsCore` requires.

6. **CI provenance.** The projection shows the following:
   - `workflow_dispatch`, `completed`/`success`, and the fixed workflow path and repository;
   - 6 unique successful jobs.

   Exactly one job matches each wave-2 receipt: Windows/26 (`113827394640`) and macOS/26 (`113827394689`). So the `ci-control-worker-mismatch` predicate passes for both.

7. **Registration approval, timing and separation.**
   - **Approval references.** Both `registrations/approved-refs/*.json` files are byte-identical (sha256 `53037ab3…`). Field for field they equal the subject's `registrationApproval`: review `review-3775b88f…`, subject `c460fed`, and manifest/finalResponse/finalization `6115866`.
   - **Manifest.** It shows `status: accepted`, normal mode, XPR, and `acceptance_basis: reviewer-consensus`. The author is codex/openai `gpt-6.1-sol` and the reviewer is claude-code/anthropic `claude-sonnet-5-5`, so the review is genuinely cross-provider and separate from this class review. The turn-1 response digest `bfceb7b4…` equals the pinned final response.
   - **Timing.** The registration reviewer submitted at 13:18:21Z and the author claimed finalization at 13:20:26.6Z. Both captures' lower creation bound is 1791552038 s, which is 2026-10-09T13:20:38Z. That is consistent with approval before capture. The 12-second gap fits the capture helper's loop in `process-source-ci-capture.mjs:119–149`, which fetches every 10 s. That loop refuses to capture until the approved reference exists on the fetched remote branch, `assertProducers` passes after `checkout --detach`, and `readApprovedProcessSourceIndex` re-proves the registration digest.
   - **Commit times.** I could not check the commit timestamps of `6115866` without Git.
   - **Formatter exclusions.** `.prettierignore` lines 26–34 hold exactly 8 registration exclusions, including `a0e9…` and `aa90…`.

8. **Class separation.** The wave-1 bundle's darwin and win32 absence classes cover Node [24] only, and this bundle covers Node [26] only. The overlap check in `readReviewedProcessSourceClassSet` (authority.mjs:404–417) therefore does not fire. This bundle has no creation or Linux class. The reader's coverage check (authority.mjs:374) requires every capture in the wave-2 index, which has exactly 2 entries, to be consumed. The shared CI provenance file lists all 6 jobs, but each class review binds only the jobs matching its own receipts.

9. **Source freeze, at capture and in the durable reader.**
   - **At capture.** `assertProducers` runs at prepare, before each capture, and after `checkout --detach` to the approved remote. It compares tracked producer files (everything except `*.md`/`*.json` under the two authority trees) against Q, refuses changed paths, and refuses untracked producer files. `captureProducerCommit` is HEAD at the time the host control is written, which is the approved remote checkout.
   - **In the durable reader.** At HEAD, authority.mjs:306–316 now calls `inspectProcessSourceProducerFreeze`, defined in `test/live/process-source/producer-freeze.mjs`. It applies the same `captureProducerFiles` filter to `ls-tree` of Q and of `captureProducerCommit`, plus `git diff --no-ext-diff --no-textconv --no-renames --name-only -z`. That makes the durable reader exactly as strict as the worker freeze, including executables inside the evidence trees, and it is not affected by repository diff configuration. This resolves optional suggestion 1 from both wave-1 class reviews.
   - **Tests.** `test/unit/process-source-producer-freeze.test.mjs` covers these cases with real temporary Git histories:
     - Markdown/JSON-only changes are allowed.
     - A `.mjs` added under the evidence tree is refused, as is a `.sh` under peer-reviews, a changed producer, and a new helper.
     - A `textconv`/`diff.external` configuration has no effect.
   - **Not run by me.** I did not run that test or the replay against `f5ade96`.

10. **Post-capture C5 correction.**
    - **Event filter.** `records.mjs:437` accepts only `push`/`workflow_dispatch`. All other provenance, control and per-kind predicates read as described in the subject, and both wave-2 records satisfy them by inspection.
    - **Bootstrap admission.** `scripts/bootstrap-portable-runtime.mjs` is the single new entry in `package.json` `files`, `scripts/verify-extraction.mjs` and `provenance/extraction-manifest.json`.
    - **Contract scope.** `src/protocol/process-source-contract-files.json` lists none of `records.mjs`, `authority.mjs`, `producer-freeze.mjs` or `capture-producer-freeze.mjs`, so the production contract is untouched.

11. **Class reader coverage.** `readReviewedProcessSourceClasses` performs these checks:
    - It resolves every reference by blob ID and sha256 at its revision, and requires ancestry to the subject.
    - It re-proves the normal registration review and index.
    - It verifies each receipt against its registration (`verifyProcessSourceReceiptCore`).
    - It requires one host control per receipt at the canonical path and runs `verifyCiCaptureControlsCore`.
    - It requires ancestry Q → `captureProducerCommit` → subject and replays the freeze.
    - It recomputes each proposal from its selected receipts and requires a `matched` finite-scope structural check.
    - It requires full one-to-one coverage.

    These are exactly the items I could not compute myself.

I found no synthetic, self-approved, widened, changed or unsupported evidence. Within the limits above, the subject's claims are supported by the records and code I could inspect. The items below are non-blocking and mostly concern wording carried over from the wave-1 subject.

## Findings

None.

## Required changes

None.

## Optional suggestions

1. **Disclose the durable-reader freeze change among the post-capture changes.** The post-capture paragraph lists only the C5 event filter and the bootstrap inventory admission. Since the wave-1 subject was written, `authority.mjs` has also started calling the new `producer-freeze.mjs`, which replays the exact capture-time freeze at durable admission. This change only strengthens the reader and is outside the 28-file contract. Still, the subject asks the reviewer to "inspect this scoped current admission-reader correction", so naming the change, with a sentence such as "the class reader now replays the exact capture-time producer freeze per host control", would make the disclosure complete. The sentence "The author rechecked complete immutable producer trees per receipt" could then say the reader does this mechanically too.
2. **Trim or scope the copied Linux-creation paragraph.** This subject has no creation class and no clock-mutating control. The paragraph beginning "Linux creation exists only in the first-wave proposals…" belongs to wave 1. It still contains "final host-control records independently prove original UTC, exact configured zone and NTP restoration", which both wave-1 reviewers flagged as overstated: the JSON is unsigned and `verified:false`, and the proof is the worker's `restore()` check bound to authenticated job success. For wave 2, a single sentence would be accurate: "This subject contains only Node 26 absence classes; both host controls are `clockChanges: none` / `restoration: not-required`."
3. **Name wave 2's own `captureProducerCommit`.** Stating `f5ade96…` in the prose, alongside the shared run, would show the reader that wave 2's freeze is a separate Q → `f5ade96` replay, not wave 1's `21cd5fc`.
4. **Fix the typo "passed104tests"**, which is still present.
5. **Record the approval → capture interval.** One sentence noting that the registration was finalized at about 13:20:26Z and both captures began at about 13:20:38Z, gated by the 10-second approved-reference poll, would let later readers confirm the order without reconstructing epoch arithmetic. Recording finalization commit `6115866`'s commit time in the author's audit notes would also help.
6. **Before ledger admission**, run `readReviewedProcessSourceClasses` (and `readReviewedProcessSourceClassSet` together with the wave-1 reference) on this exact subject revision and keep the output. It covers the blob, signature, canonical-digest, ancestry and Q → `f5ade96` freeze checks that this session could not perform.

## Decision

accepted
