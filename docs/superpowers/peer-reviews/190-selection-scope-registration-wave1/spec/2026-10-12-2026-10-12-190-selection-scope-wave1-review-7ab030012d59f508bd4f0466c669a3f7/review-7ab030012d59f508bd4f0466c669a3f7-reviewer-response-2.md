<!-- ai-peer-review-template version="1" digest="sha256:78e9a634af9d540baaf6790db82952eaf39cf7ab59a6cdc7938319ae07a4cbed" -->

<!-- protected-frontmatter -->

---
schema: "ai-peer-review.response/v1"
review_id: "review-7ab030012d59f508bd4f0466c669a3f7"
role: "reviewer"
turn: 2
commit_mode: "normal"
authority_assurance: "unavailable"
artifact_path: "evidence/portable-runtime/process-source/registration-reviews/2026-10-12-190-selection-scope-wave1.md"
artifact_commit: "04fc85d25c3a8c00d585549ce03c5a4cbe338085"
artifact_blob: "940f58218740c88fbb2e4a18366b58845ac8d9d5"
artifact_digest: "sha256:cc0f69a47959ad2cee80279bbbc8cf0e66c03254efa369d8f95a0dee6254b4dd"
agent:
  host: "claude-code"
  provider: "anthropic"
  model_id: "claude-opus-5-5"
  model_display: "claude-opus-5-5"
  session_fingerprint: "sha256:e38d2b20734d8cfd976665a9c74c332106d3b338b9d9404c255f0eaacef27aed"
  identity_source: "runtime"
started_at: "2026-10-12T05:13:04.377Z"
submitted_at: "2026-10-12T05:24:39.953Z"
finding_ids: []
answered_finding_ids: []
acknowledged_supplement_ids: []
---

Mode: `normal`

## Summary

I re-reviewed the revised subject `evidence/portable-runtime/process-source/registration-reviews/2026-10-12-190-selection-scope-wave1.md` (artifact commit 04fc85d, blob 940f5821) against the author response `review-7ab030012d59f508bd4f0466c669a3f7-author-response-1.md` and my turn-1 findings.

Required change 1 (number and identifier spacing) is resolved. Every token I flagged now reads plainly:

- run 38205882840 and attempt 1
- source 07835545…
- 29 mechanically derived files and all 20 existing classes
- 894 tracked inputs, checked against 0783554
- plus/minus 90-second UTC steps and January/July 12:00 UTC
- 16-read C1 under the unchanged 30-second budget
- 16 actual matching admissions, 16 unscoped versus 1 scoped acquisitions and 32 fresh snapshots
- original 40a3 candidate
- "all three OS families", which replaces the former "Final3OS"

Node versions are now written as "Node 24/26". None of the rewording changed a count, bound, permission or excluded item.

The scope table (lines 5–11) and the JSON reference block (lines 23–65) are unchanged from turn 1. I compared every value: the index revision/path/blob/sha256 and all five capture revision/path/blob/sha256 tuples. The working-tree index entry digests and the five registrations' keyId and tarballDigest values also match what I recorded at turn 1. The registration content and the turn-1 structural checks therefore still hold. Those checks were table-to-record agreement, distinct per-capture keys, the shared contract and inventory, the per-platform tarball, creation/absence transition shape, probe constants, ascending index order, and the order of the JSON block matching the index.

Both optional suggestions were also adopted:

- **Line 19.** The "unadmitted" item is now explicitly the proposed guard-owned resident Windows observation worker for operational/C1 use, distinct from these one-shot capture registrations. That removes the apparent tension with the Windows Node 24 absence registration.
- **Line 15.** The subject now says that index digest fields hash canonical registration records, while the JSON review-reference sha256 fields hash raw Git blob bytes. This matches `processSourceRecordDigest` and `reference()` in `test/live/process-source/authority.mjs`.

My turn-1 verification limits are unchanged. Under the Git ban and without shell hashing, I did not recompute the blob OIDs or raw SHA-256 values at `c2b1bf8`, and I did not replay the producer freeze. Those values remain enforced fail-closed by the immutable reader at use time. Approving this registration authorizes signed capture only. It does not authorize class acceptance, scope adoption, Windows operation, recovery or release, all of which the subject keeps as separate gates.

## Findings

None.

## Required changes

None.

## Optional suggestions

None.

## Decision

accepted
