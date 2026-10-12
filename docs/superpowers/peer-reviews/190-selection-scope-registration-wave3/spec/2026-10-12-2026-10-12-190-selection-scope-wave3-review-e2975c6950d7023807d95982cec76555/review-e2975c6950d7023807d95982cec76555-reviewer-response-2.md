<!-- ai-peer-review-template version="1" digest="sha256:78e9a634af9d540baaf6790db82952eaf39cf7ab59a6cdc7938319ae07a4cbed" -->

<!-- protected-frontmatter -->

---
schema: "ai-peer-review.response/v1"
review_id: "review-e2975c6950d7023807d95982cec76555"
role: "reviewer"
turn: 2
commit_mode: "normal"
authority_assurance: "unavailable"
artifact_path: "evidence/portable-runtime/process-source/registration-reviews/2026-10-12-190-selection-scope-wave3.md"
artifact_commit: "61f71ab06cedec25d13988094af9f0a7a0970ffb"
artifact_blob: "176cb75c5bb21d863fcc74d91d0885527cb6017d"
artifact_digest: "sha256:40348eae3cf2f9f8845f1a62074724febf6b05b401d0c87fc37f507b7c0e15ac"
agent:
  host: "claude-code"
  provider: "anthropic"
  model_id: "claude-opus-5-5"
  model_display: "claude-opus-5-5"
  session_fingerprint: "sha256:29e535f868a32c3404d85eb74e79d5fe297285e6b653e483df7c69fe623e76a2"
  identity_source: "runtime"
started_at: "2026-10-12T05:54:49.687Z"
submitted_at: "2026-10-12T06:01:20.289Z"
finding_ids: []
answered_finding_ids: []
acknowledged_supplement_ids: []
---

Mode: `normal`

## Summary

I re-reviewed the revised subject `evidence/portable-runtime/process-source/registration-reviews/2026-10-12-190-selection-scope-wave3.md` (artifact commit 61f71ab, blob 176cb75c). I checked it against `review-e2975c6950d7023807d95982cec76555-author-response-1.md` and against my turn-1 finding.

Required change 1 (misstated C1 evidence) is resolved. Line 13 now reads: "Explicit 16-call C1 feasibility at source 0783554 passed Linux/macOS Node 24/26 but failed Windows Node 24/26 at the original 30-second deadline." This matches:

- the ledger record of C1 run 38205749683 (progress.md:47): Linux 24/26 and macOS 24/26 PASS, Windows 24/26 FAIL at the original budget;
- the accepted wave-2 subject, which uses the same wording on its line 13.

I compared the rest of the subject line by line with the turn-1 version (commit 6520483) and found no other changes:

- **Line 3.** The scope sentence, the Windows Node 26 failure statement, and the six preserved approvals are unchanged. Those approvals are Linux Node 24/26 creation and absence plus Windows Node 24 absence at `c2b1bf8`, and macOS Node 24 absence at `eb3f510`.
- **Table.** The single darwin / 25.6.0 / arm64 / Node 26 / absence row is unchanged.
- **Prose.** Paragraphs 9, 11 and 15 are unchanged. Apart from the corrected pair, paragraph 13 is also unchanged.
- **JSON reference block.** The index (revision `a921dd48…`, blob `81b8516e…`, sha256 `c4236892…`) and the capture (revision `a921dd48…`, blob `023ece08…`, sha256 `ff4cc9dc…`) are byte-for-byte the same as at turn 1.
- **No other substitutions.** I re-checked the prose for other unintended 24→26 substitutions and found none. The only "Node 26" mentions are the subject capture, the excluded Windows Node 26 worker, and the "24/26" pairs, which are correct.

Working-tree data is unchanged from turn 1:

- The index has one entry, `source-eaef9345…`, with digest `bf2955db…`.
- The registration record's hostId, publicKey and keyId are unchanged, as are its package (source `07835545…`, tarball `21331c1d…`, inventory `dae2c976…`, contract `340ece55…`), its darwin `/bin/ps` probe `62c342e1…`, `kinds: ["absence"]`, and empty `transitions`.

The turn-1 structural checks therefore still hold. Those checks were:

- the darwin probe constants in `validateScope`;
- absence-only with an empty transitions array;
- the shared source, contract and inventory, and the tarball equal to Linux and macOS Node 24;
- unique host, key and capture identity across the repository;
- the one-entry index shape and path rule;
- the canonical-versus-raw digest distinction;
- `a921dd4` as the parent of the original subject commit;
- earlier approvals staying verifiable through their own pinned revisions, including the wave-2 approved-ref at `eb3f510` / `7cb1be22…`;
- the Windows Node 26 prepare failure staying excluded, with no run-wide green claim.

Verification limits are unchanged from turn 1:

- Under the Git ban and without shell execution, I did not recompute:
  - the blob OIDs or raw SHA-256 values at `a921dd4`;
  - the canonical index digest;
  - the Ed25519 SPKI and keyId binding;
  - the ancestry of `61f71ab`.
- I did not replay the 894-input producer freeze.

The immutable reader's `reference()` and `ancestor()` checks, and `validateProcessSourceRegistration`, enforce these at use time and fail closed. The macOS Node 26 preflight claim ("restoration not-required") is still supported only by the subject and the ledger. The later class review enforces it through `validateAbsenceControls`.

Approving this registration authorizes the signed macOS Node 26 absence capture only. It does not authorize class acceptance, scope adoption, Windows operation, installed recovery or release, which the subject keeps as separate gates.

## Findings

None.

## Required changes

None.

## Optional suggestions

None.

## Decision

accepted
