<!-- ai-peer-review-template version="1" digest="sha256:78e9a634af9d540baaf6790db82952eaf39cf7ab59a6cdc7938319ae07a4cbed" -->

<!-- protected-frontmatter -->

---
schema: "ai-peer-review.response/v1"
review_id: "review-b3f16c9e8c7564dbe3eee41c6fbe8510"
role: "reviewer"
turn: 1
commit_mode: "normal"
authority_assurance: "unavailable"
artifact_path: "evidence/portable-runtime/process-source/class-reviews/2026-10-15-190-post209-wave8.md"
artifact_commit: "5357a5f82c90d880a46fe25d8e009c42df5bb534"
artifact_blob: "67ab34ef5ce5a1a84c69950ce0573c0c42924488"
artifact_digest: "sha256:687d8cb2152c99dfb42ff1bc87ed9de0a8b51ea68cf659e186ff89cf024be623"
agent:
  host: "claude-code"
  provider: "anthropic"
  model_id: "claude-opus-5-5"
  model_display: "claude-opus-5-5"
  session_fingerprint: "sha256:453232d1bec6cf4835f47ace98e66828b0c9bb985189e6c63a2b5a2225c816b1"
  identity_source: "runtime"
started_at: "2026-10-15T22:57:56.167Z"
submitted_at: "2026-10-15T23:00:23.496Z"
finding_ids: []
answered_finding_ids: []
acknowledged_supplement_ids: []
---

Mode: `normal`

## Summary

The artifact asks for normal class approval of exactly four finite proposals (win32 Node24 absence, darwin Node24 absence, Linux Node24/26 absence, Linux Node24/26 creation) derived from six signed receipts in hosted run 38816754588 attempt 1 at source d754d02. I cross-checked the working-tree copies of every referenced public record and found the claims internally consistent, finite and not widened.

What I checked against the actual files:

- **Proposals vs. table.** `classes/190-post209-wave8-proposals.json` contains exactly four proposals. Class IDs, capability, platform, build, architecture and Node majors match the artifact table. Every proposal binds contract `sha256:55825683…a468`, inventory `sha256:93da7ecb…d9de`, registration revision `e8adc716…` and index digest `sha256:169aaa11…c11a`. Evidence digest counts (1, 1, 2, 2) sum to the six declared captures.
- **Receipts vs. proposals.** The six receipts are win32 N24 absence (`dc1e…`), darwin N24 absence (`335a…`), Linux N24 absence (`6efc…`), Linux N26 absence (`73ca…`), Linux N24 creation (`3313…`) and Linux N26 creation (`525d…`). Each binds the same registration revision/index digest, source commit, inventory and contract. Tarballs are `0351b927…` for Linux/darwin and `f016f655…` for win32, matching the per-proposal `packageProvenance`. The win32 and darwin probe path, visibility, errorContract and version match the proposal scopes. The Linux probe is `/proc`/`procfs-v1` in both.
- **Registrations vs. receipts.** For all six captures, the receipt `hostId` and signature `keyId` equal the registration's `hostId` and `keyId`. The six keyIds are distinct. Each Linux worker's absence and creation captures share one host hash (`670cde…` for N24, `3b3d35…` for N26), so there are four distinct host hashes. This matches the accepted registration review's description.
- **Registration approval.** The pinned registration review `review-021b8018…` subject lists exactly these six captures with matching platform/Node/capability. Its manifest records `status: accepted`, and its reviewer response decides `accepted`.
- **Host controls.** All six host controls carry run 38816754588, attempt 1, codeCommit d754d02 and one common captureProducerCommit `9ff45690…`. The four absence controls record `clockChanges: none` and `restoration: not-required`. Both Linux creation controls record `privilege-and-restoration-observed`, `restoration: verified`, zone UTC, systemZone Etc/UTC and `networkTime: yes`, the same shape as earlier accepted waves. Both creation receipts keep one PID/nonce/creation-tick window through all four transitions. Their boot identity is unchanged before and after, and cleanup reports child exited with restoration verified.
- **Clock coverage.** Both creation receipts show forward ≈+90 s and backward ≈−90 s UTC steps, a New York→Detroit zone change and back, and a seasonal wall-time step from mid-October (DST) to mid-January (standard) and back. The artifact correctly states that this does not prove an isolated fixed-instant DST transition.
- **CI projection.** `190-ci-provenance-38816754588.json` lists six completed/successful jobs (Linux/macOS/Windows × Node 24/26) under `verified: false`. The artifact treats it as unverified data and does not present it as a capability.
- **Wave separation.** Wave 9 covers only darwin N26 and win32 N26 under registration revision `2e9555e6…`. No capture overlaps wave 8. The current working-tree `registration-index.json` contains only the two wave-9 captures, which matches the artifact's statement that the latest index is not the complete eight-capture set.
- **Scope language.** The artifact grants no general operational capability, installed journey, provider settlement, Windows performance forecast, worker admission, budget change, cache, deadline renewal or waiver. It keeps all prior 32 classes as history only and leaves #210 and Linux manual review excluded.

Verification limits (stated explicitly):

- Bash was restricted to the two prescribed peer-review commands, and Git use was prohibited. So I could not recompute any sha256 or Git blob ID, resolve any pinned revision (`7eb4a006…`, `e8adc716…`, `ca5f2d03…`, `35744474…`), or confirm that working-tree bytes equal the pinned blobs. All my comparisons are against working-tree content.
- I did not verify any Ed25519 signature, the canonical registration/evidence digests, the finalization digest or the complete producer-input freeze through `captureProducerCommit`.
- I did not query GitHub. Run, job and attempt identities, conclusions and the CI projection are taken from the repository files. The host controls bind run/attempt but not individual job IDs, so I could not map a capture to a specific job.
- These mechanical checks belong to the genuine normal class reader and approval digest, which the artifact correctly requires before ledger adoption. Within the material I could inspect, I found no inconsistency, widening or synthetic substitution.

## Findings

None

## Required changes

None

## Optional suggestions

1. Paragraph 5 says the Linux creation class covers "January/July seasonal wall times". In both creation receipts, the observed seasonal step went from the actual mid-October (DST) time to a mid-January (standard) wall time and back; no July wall time was observed. Consider wording such as "an opposite-DST seasonal wall time (January from an October DST baseline)" in future subjects, so the claim describes observed evidence rather than the procedure. The existing caveat about isolated DST transitions already limits the impact, and earlier accepted waves use the same wording.

## Decision

accepted
