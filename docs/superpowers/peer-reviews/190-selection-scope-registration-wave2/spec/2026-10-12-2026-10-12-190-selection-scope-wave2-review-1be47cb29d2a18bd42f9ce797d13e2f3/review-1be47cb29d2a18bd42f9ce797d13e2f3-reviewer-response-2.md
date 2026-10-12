<!-- ai-peer-review-template version="1" digest="sha256:78e9a634af9d540baaf6790db82952eaf39cf7ab59a6cdc7938319ae07a4cbed" -->

<!-- protected-frontmatter -->

---
schema: "ai-peer-review.response/v1"
review_id: "review-1be47cb29d2a18bd42f9ce797d13e2f3"
role: "reviewer"
turn: 2
commit_mode: "normal"
authority_assurance: "unavailable"
artifact_path: "evidence/portable-runtime/process-source/registration-reviews/2026-10-12-190-selection-scope-wave2.md"
artifact_commit: "ca1ffbc0367c50bcc0d9e98de878a816f75707b0"
artifact_blob: "41f5d31c368a3e767ccf34ad4f4d1f1cd89e3b73"
artifact_digest: "sha256:f0163f2f663d0dda000ccb2f4042a9437c0898d821fd3833d2524df14ad97b23"
agent:
  host: "claude-code"
  provider: "anthropic"
  model_id: "claude-opus-5-5"
  model_display: "claude-opus-5-5"
  session_fingerprint: "sha256:13ea9d1330ae1a36ff9c1d4739b5b21856cff839c721cbb21e2bd5f76a652fe4"
  identity_source: "runtime"
started_at: "2026-10-12T05:37:34.877Z"
submitted_at: "2026-10-12T05:44:18.308Z"
finding_ids: []
answered_finding_ids: []
acknowledged_supplement_ids: []
---

Mode: `normal`

## Summary

I re-reviewed the revised subject `evidence/portable-runtime/process-source/registration-reviews/2026-10-12-190-selection-scope-wave2.md` (artifact commit ca1ffbc, blob 41f5d31c). I checked it against `review-1be47cb29d2a18bd42f9ce797d13e2f3-author-response-1.md` and against my turn-1 finding and suggestion.

Required change 1 (misstated preserved history) is resolved. Line 3 now reads: "the five previously approved wave-1 registrations (Linux Node 24/26 creation and absence, Windows Node 24 absence; approved index revision c2b1bf8) remain immutable separately referenced history." This matches wave 1 exactly:

- Linux Node 26 creation and absence (`32a3…`, `75eb…`)
- Linux Node 24 absence and creation (`7bd5…`, `7fd3…`)
- Windows Node 24 absence (`8069…`)

Revision `c2b1bf8` is the revision pinned by the wave-1 approved-refs, which I read at turn 1 (`approved-refs/source-32a383ae…json`, `revision: c2b1bf82…`, `indexDigest: sha256:bc00b0e2…`). The sentence now accurately states which earlier approvals stay in force, including the Linux Node 26 creation registration that carries clock authority.

Optional suggestion 1 was also adopted. Line 9 now says "exact tarball (identical to the Linux tarball; only Windows differs)". That matches the record's `tarballDigest` `sha256:21331c1d…`, which is equal to the wave-1 Linux records, while Windows is `785b254e…`. The wording does not imply that any host or signing identity is shared, and the hostId, publicKey and keyId are still unique to this record.

I compared the rest of the subject with the turn-1 version and found no other changes:

- **Table.** The single darwin / 25.6.0 / arm64 / Node 24 / absence row is unchanged.
- **JSON reference block.** The index (revision `eb3f5103…`, blob `8cc88b4b…`, sha256 `7cb1be22…`) and the capture (revision `eb3f5103…`, blob `10132189…`, sha256 `2b7670ff…`) are unchanged.
- **Prose.** Paragraphs 11, 13 and 15 are unchanged. They cover the freeze, the C1 results, the authority bounds and the remaining gates.
- **Working-tree data.** The index entry digest is still `231eaef4…`. The registration record's identity, package, scope, kinds and transitions all match what I validated at turn 1.

The turn-1 structural checks therefore still hold. Those checks were:

- the darwin probe constants in `validateScope`;
- absence-only with an empty transitions array;
- the shared source, contract and inventory;
- unique host and key identity;
- one-entry index shape and path rule;
- the canonical-versus-raw digest distinction;
- `eb3f510` as an ancestor of the subject;
- wave-1 approvals staying verifiable through their own pinned revision;
- ledger corroboration of the C1 run (38205749683) and capture run (38205882840) claims.

Verification limits are unchanged from turn 1. Under the Git ban and without shell hashing, I did not recompute the blob OIDs or raw SHA-256 values at `eb3f510`, did not recompute the canonical digest, did not confirm ancestry with Git, and did not replay the 894-input producer freeze. The immutable reader's `reference()` and `ancestor()` checks enforce those at use time and fail closed. The macOS preflight "restoration not-required" claim is still supported only by the subject and the ledger until the later class review enforces it through `validateAbsenceControls`. Approving this registration authorizes the signed macOS Node 24 absence capture only. It does not authorize class acceptance, scope adoption, Windows operation, installed recovery or release, which the subject keeps as separate gates.

## Findings

None.

## Required changes

None.

## Optional suggestions

None.

## Decision

accepted
