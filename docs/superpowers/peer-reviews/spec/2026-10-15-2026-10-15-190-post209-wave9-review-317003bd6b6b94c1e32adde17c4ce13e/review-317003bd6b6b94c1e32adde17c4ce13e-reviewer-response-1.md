<!-- ai-peer-review-template version="1" digest="sha256:78e9a634af9d540baaf6790db82952eaf39cf7ab59a6cdc7938319ae07a4cbed" -->

<!-- protected-frontmatter -->

---
schema: "ai-peer-review.response/v1"
review_id: "review-317003bd6b6b94c1e32adde17c4ce13e"
role: "reviewer"
turn: 1
commit_mode: "normal"
authority_assurance: "unavailable"
artifact_path: "evidence/portable-runtime/process-source/registration-reviews/2026-10-15-190-post209-wave9.md"
artifact_commit: "b0d89bea635ff4b4f1de538ad719222fd5669936"
artifact_blob: "5d4b87c34c58fedb989f9dfe75cc373c75117ad5"
artifact_digest: "sha256:67ce21977bf6c32a931bcb82a8aaf727f46958175325a4ad90a01b9e249d4b86"
agent:
  host: "claude-code"
  provider: "anthropic"
  model_id: "claude-opus-5-5"
  model_display: "claude-opus-5-5"
  session_fingerprint: "sha256:ccbc42daf17b416b6e410c17b3bef6e9862d51007841df97a61cbef0c58c0023"
  identity_source: "runtime"
started_at: "2026-10-15T22:47:41.720Z"
submitted_at: "2026-10-15T22:49:35.352Z"
finding_ids: []
answered_finding_ids: []
acknowledged_supplement_ids: []
---

Mode: `normal`

## Summary

I reviewed the wave-9 registration review subject (`evidence/portable-runtime/process-source/registration-reviews/2026-10-15-190-post209-wave9.md`), the working-tree `registration-index.json`, and both registration records it names (`source-3c4630b619f12de2cc9f1939c77139fa.json` for darwin Node 26 and `source-b61f670390d56751ea0341849641ce82.json` for win32 Node 26). For comparison I read the wave-8 subject and its darwin Node 24 and win32 Node 24 records (`source-335a1066…`, `source-dc1e6b6e…`). I also read the consumer verification code in `test/live/process-source/authority.mjs` (`readApprovedIndex`) and `test/live/process-source/records.mjs` (`validateProcessSourceRegistration`, `verifyProcessSourceIndexCore`, `verifyProcessSourceReceiptCore`).

Every check I could run by reading agrees with the subject:

- **Scope is narrow, not widened.** The index has exactly two entries, and the subject's JSON block has exactly two capture references. Each reference path matches the matching index entry in order. Capture IDs are sorted and unique (`3c46…` < `b61f…`), and each path has the form `registrations/<captureId>.json`. These are the shape rules `verifyProcessSourceIndexCore` enforces.
- **The table matches the records.** darwin 25.6.0 arm64 Node 26 absence, and win32 10.0.26100 x64 Node 26 absence. Both records have `kinds: ["absence"]` and `transitions: []`, so no creation or clock/timezone/DST transition is registered. That matches the statement that wave 9 has no Linux creation registration and authorizes no transitions.
- **Package binding matches.** Both records bind `sourceCommit` d754d02bbc30c6c92113e87be08c105fda08e12c, inventory `sha256:93da7ecb…d9de`, and contract `sha256:55825683…a468`, all as stated. Tarball digests match the stated per-platform tuples: darwin `sha256:0351b927…c278` and win32 `sha256:f016f655…d0e7`. These are also the same per-platform tarball values the wave-8 darwin24/win32 records bind, which fits one producer run building each platform's package once.
- **Host and key distinctness holds.** The two wave-9 records have different `hostId`s, `publicKey`s and `keyId`s. Neither `hostId` nor key appears in the wave-8 darwin24/win32 records, so the "two actual worker host hashes and two distinct protected signing keys" claim holds against the records I compared. Both public keys are 44-character base64 SPKI strings with the Ed25519 DER prefix (`MCowBQYDK2VwAyEA…`).
- **Probe scope matches its platform.** darwin uses `/bin/ps`, `same-user-full-selection`, `exact-ps-selection-v1`. win32 uses Windows PowerShell 5.1, `local-cim-query`, `completed-cim-query-v1`. The probe version digests match the respective Node 24 records on the same build, which is consistent with the same runner image.
- **Records exclude private material.** Each record has exactly the nine fields `validateProcessSourceRegistration` allows. No private key, raw host identifier, SID, user path, credential or provider handle appears.
- **Non-claims are explicit and consistent with wave 8.** The subject claims no complete six-worker run, no wave-9 signed-control success, no class admission and no installed authority. It keeps budgets at 30/15/5/800 s with the four-job portable cap, keeps #210 orphan resources open, and limits #209 evidence to its repair checks. It also states that the wave-8 Linux transition procedure gives no scope here.

### Verification limits

- This session had no permission to run Bash hashing commands and was told not to use Git. So I did **not** recompute these values: the raw-blob SHA-1 OIDs (`8f324ee8…`, `9b865707…`, `613bf33a…`), the raw-byte SHA-256 values (`18d88dec…`, `3dae99a2…`, `c56e0dd8…`), the canonical record digests in the index (`c408aece…`, `69cd8094…`), or `keyId == sha256(SPKI DER)`. I also could not confirm that revision `2e9555e` contains exactly these working-tree bytes, or that `2e9555e` descends from d754d02.
- I did not access GitHub run 38816754588. I have not independently confirmed its attempt number, its event and branch, or that its Windows Node 26 and macOS Node 26 jobs actually produced these registrations.
- Mitigation: `readApprovedIndex` mechanically refuses at adoption time if any blob OID or SHA-256 reference mismatches (`registration-review-reference-mismatch`), if a canonical index digest mismatches (`registration-index-record-mismatch`), if a keyId is not the SHA-256 of the SPKI bytes or the key is not Ed25519 (`registration-invalid`), or if an absence-only record has transitions. Run/job/attempt scope and host controls must be proved separately by the class-approval step the subject names. A digest or provenance error therefore cannot become authority without a mechanical refusal. Still, this acceptance rests on the structure and consistency checks above, not on recomputed digests or CI provenance.

## Findings

None.

## Required changes

None.

## Optional suggestions

1. `readApprovedIndex` takes a single `approvedRef` with one `revision` and one `indexDigest`. The working-tree `registration-index.json` now lists only the two wave-9 captures, while the six wave-8 captures stay tied to the index at `e8adc71`. In the later class-approval and ledger step, consider stating explicitly which approved ref (wave-8 `e8adc71` or wave-9 `2e9555e`) authorizes each of the eight post-209 captures. That would stop a reader from taking the latest index as the complete post-209 registration set.

## Decision

accepted
