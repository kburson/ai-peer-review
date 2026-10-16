<!-- ai-peer-review-template version="1" digest="sha256:78e9a634af9d540baaf6790db82952eaf39cf7ab59a6cdc7938319ae07a4cbed" -->

<!-- protected-frontmatter -->

---
schema: "ai-peer-review.response/v1"
review_id: "review-9062928295c24c9f18c70572c972469c"
role: "reviewer"
turn: 1
commit_mode: "normal"
authority_assurance: "unavailable"
artifact_path: "evidence/portable-runtime/process-source/class-reviews/2026-10-15-190-repair-wave12.md"
artifact_commit: "6747f27164e88a946f80d42db63ee05947bf1582"
artifact_blob: "431be7af4d54ecb7047fd842802564137921e3bb"
artifact_digest: "sha256:09160c1e665b16d3edeff52748272058b0e81c21c8740cef48ffd2da1f02fa2a"
agent:
  host: "claude-code"
  provider: "anthropic"
  model_id: "claude-opus-5-5"
  model_display: "claude-opus-5-5"
  session_fingerprint: "sha256:a69927de3210b757a2517a4b27fa44f02ee4c3968c3e8c79360171b1be4e6912"
  identity_source: "runtime"
started_at: "2026-10-16T01:34:20.067Z"
submitted_at: "2026-10-16T01:36:53.888Z"
finding_ids: []
answered_finding_ids: []
acknowledged_supplement_ids: []
---

Mode: `normal`

## Summary

I reviewed the wave-12 class-approval artifact against the working-tree files it references:

- `classes/190-repair-wave12-proposals.json`
- the six `receipt.json` and six `host-control.json` files
- `classes/190-ci-provenance-38832691552.json`
- the six `registrations/source-*.json` records
- the accepted wave-12 registration review subject and its final reviewer response (`review-3da82674…`)
- `classes/review-index.json`
- the sibling wave-13 class artifact and the accepted wave-9 class artifact, for comparison

I used only Read, Glob and Grep. Bash was denied in this session for everything except the exact join and submit commands, so I ran no shell, Git, hashing, signature or network commands.

What I checked and found consistent:

- **Proposals versus table.** The four proposals match the table exactly: class ID, capability, platform, build, architecture and `nodeMajors`.
  - `309cdbd0…`: darwin, `25.6.0`, arm64, Node 24, absence.
  - `3b0710db…`: linux, `6.17.0-1022-azure`, x64, Node 24 and 26, creation.
  - `4d1b20fb…`: win32, `10.0.26100`, x64, Node 24, absence.
  - `b62aabd1…`: linux, `6.17.0-1022-azure`, x64, Node 24 and 26, absence.

  Every proposal binds:
  - contract `sha256:e9793b09…c66e`;
  - registration revision `29cf2f2…` and index digest `sha256:d93cf888…f411`, the same values as the JSON `registrationApproval`;
  - source `91fa4ac…`;
  - inventory `sha256:671b62eb…5ac6`.

  The Windows class binds tarball `0ac59445…`. All the others bind `8d42ec62…`. These match the registration review's tuple lines.
- **Evidence count.** The proposals carry 1 + 2 + 1 + 2 = 6 evidence digests, matching "4 finite proposals from 6 signed receipts". The receipts map cleanly onto the classes:
  - darwin absence: 4ceb;
  - linux creation: 1bc4 (Node 24) and 361b (Node 26);
  - win32 absence: 2df3;
  - linux absence: a06c (Node 24) and a2a5 (Node 26).
- **Receipts versus registrations.** In all six receipts, these fields match the corresponding registration record:
  - `captureId`, `hostId` and `keyId`;
  - `sourceCommit` and `tarballDigest`;
  - platform, build, architecture, `nodeMajor` and probe;
  - `kind`.

  Every receipt binds `registrationRevision` 29cf2f2… and `registrationIndexDigest` d93cf888…. There are four host IDs and six distinct key IDs, as the accepted registration review states:
  - Linux Node 24 shares `d8f1fecd…`;
  - Linux Node 26 shares `805b69af…`;
  - Windows is `e4e0ffe0…`;
  - darwin is `88a3499a…`.

  The two Linux boot IDs are `7bca69b3…` and `c03abb4c…`. Each matches before and after on its own host.
- **Registration approval lineage.** The JSON `registrationApproval` names the wave-12 registration subject at `0581204…`. The working-tree copy lists exactly these six capture IDs and blobs at revision `29cf2f2…`. The final reviewer response pinned at `f05d217…` (`review-3da82674…`) is present and records `accepted` with no findings. Its own verification limits are stated, and they defer the same mechanical checks to this class review. As the artifact says, the working-tree `registration-index.json` now lists only the two wave-13 captures (321b…, e7af…). The wave-12 index exists only at its immutable revision.
- **Creation receipts (1bc4, 361b).** Each receipt has one PID, one nonce and one creation tick window across all 72 samples:
  - 1bc4: PID 4066, ticks 131008–131009;
  - 361b: PID 4278, ticks 113541–113542.

  The 221 PID/lower/upper occurrences per file are all identical. The `utcNs` values show the claimed transitions:
  - the clock-forward "during" samples are about +90 s after "before", and "after" returns to the base time;
  - the clock-backward "during" samples are about −90 s;
  - the timezone "during" samples are `America/Detroit` between `America/New_York` samples;
  - the DST "during" samples are at about 2026-01-15 UTC with `dst:false`, between about 2026-10-16 UTC samples with `dst:true`.

  This matches the "October-to-January-to-October" wording and the disclaimer that no fixed-instant DST transition is proved. Exit code is 0. Absence is `absent`. The negative control is `unknown` / `probe-access-error`. Cleanup records `childExited:true` and `restoration:"verified"`.
- **Absence receipts.** All four absence receipts have exit 0, `absent`, an `unknown` negative control (`probe-access-error` on Linux, `probe-query-error` on win32 and darwin) and `restoration:"not-required"`.
- **Host controls.** All six bind run `38832691552`, attempt `1`, `codeCommit` 91fa4ac… and `captureProducerCommit` `09b2602…`.
  - The two creation controls record `privilege-and-restoration-observed` and `restoration:"verified"`, with zone `UTC`, NTP `yes` and system zone `Etc/UTC`. This is the same shape as earlier accepted creation controls (for example source-7fd35237…).
  - The absence controls record `not-required`.
  - Every control keeps `verified:false`, consistent with "explicitly unverified data".
- **CI projection.** The projection lists run 38832691552, attempt 1, `workflow_dispatch`, completed/success. It has six completed/success jobs covering Linux, Windows and macOS × Node 24 and 26. `verified:false` is kept. Wave 12 uses four of those workers (Linux 24, Linux 26, Windows 24, macOS 24), and wave 13 uses the remaining two (Windows 26, macOS 26). The two waves do not overlap.
- **Prior run.** The three failed-wait capture IDs and their platforms match the wave-11 registration review table: ac9a darwin Node 26, be99 win32 Node 24, c8bb win32 Node 26. The artifact grants them no authority.
- **Prior class count.** `classes/review-index.json` lists 14 accepted class reviews. Their proposal files contain 4+2+2+4+2+4+2 + 1+3+2 + 4+2 + 4+2 = 38 classes, which matches "All 38 previously accepted classes".
- **Scope language.** Creation is limited to Linux. Windows and macOS are absence-only. No general capability, activation, reboot or descendant guarantee is granted. Budgets (30/15/5/800, four-job cap), the #209/#210 statements and the incomplete installed-journey list are carried forward unchanged from accepted wave 9. The text is identical to the sibling wave-13 artifact except for the wave-specific scope paragraph.

**Verification limits.** I could not independently verify any of the following in this session. Accepting this review does not attest to them; the genuine normal class reader must check them mechanically.

1. Any SHA-1 blob or SHA-256 value in the JSON block, the proposal `evidenceDigests`, the receipt `registrationDigest` values, or `registrationIndexDigest`. No hashing was possible.
2. The Ed25519 signatures on the six receipts against the registered public keys.
3. That revisions `29cf2f2…`, `0581204…`, `f05d217…` and `629e9f1…` contain these bytes, that `09b2602…` lies on the line from 91fa4ac… with only non-producer changes, and the 91fa4ac/edc0585 tree comparison with `assertCaptureProducerFiles`. Git was not permitted.
4. The authenticated GitHub run, job and attempt identities and conclusions for 38832691552, and the outcome of 38826982156. No network or `gh` was used. The host controls do not bind job IDs, so I could not tie each capture to a specific job.
5. The 117-file closure, the contract-digest derivation, and the regression and repair claims in the source paragraph.
6. Key protection and provenance, and the actual host privilege/restoration behaviour beyond what the signed and unverified records state.

## Findings

None.

## Required changes

None.

## Optional suggestions

1. The host-control records carry `runId` and `runAttempt` but no job ID. The CI projection lists six job IDs, but nothing in the reviewed material says which capture ran on which job. The class reader can presumably derive this from the authenticated artifacts. Consider recording the job ID per capture (or per host control) in future waves, so that a reader-only review can check the four-worker/two-worker split against specific jobs.

## Decision

accepted
