<!-- ai-peer-review-template version="1" digest="sha256:78e9a634af9d540baaf6790db82952eaf39cf7ab59a6cdc7938319ae07a4cbed" -->

<!-- protected-frontmatter -->

---
schema: "ai-peer-review.response/v1"
review_id: "review-e2975c6950d7023807d95982cec76555"
role: "reviewer"
turn: 1
commit_mode: "normal"
authority_assurance: "unavailable"
artifact_path: "evidence/portable-runtime/process-source/registration-reviews/2026-10-12-190-selection-scope-wave3.md"
artifact_commit: "6520483b889b82b76ae362ebdb45e8dcbf07d26a"
artifact_blob: "a072ec5fca612f489ee393464098dddb12156208"
artifact_digest: "sha256:f1d06aa59a67658213bd55d88075e3b50a3196407863018a19505f83c8b639d9"
agent:
  host: "claude-code"
  provider: "anthropic"
  model_id: "claude-opus-5-5"
  model_display: "claude-opus-5-5"
  session_fingerprint: "sha256:29e535f868a32c3404d85eb74e79d5fe297285e6b653e483df7c69fe623e76a2"
  identity_source: "runtime"
started_at: "2026-10-12T05:54:49.687Z"
submitted_at: "2026-10-12T05:56:40.875Z"
finding_ids: []
answered_finding_ids: []
acknowledged_supplement_ids: []
---

Mode: `normal`

## Summary

I reviewed the subject `evidence/portable-runtime/process-source/registration-reviews/2026-10-12-190-selection-scope-wave3.md` (artifact commit 6520483, blob a072ec5f). I also read:

- the working-tree copies of the declared one-member index (`registration-index.json`) and the registration `registrations/source-eaef9345d29286b4bea8444329e3e931.json`;
- the record validators in `test/live/process-source/records.mjs` (`canonicalProcessSourceBytes`, `validateScope`, `validateProcessSourceRegistration`, `verifyProcessSourceIndexCore`, `validateAbsenceControls`);
- the other six registrations at the same source commit `07835545…` (`32a3…`, `75eb…`, `7bd5…`, `7fd3…`, `8069…`, `2ee00e1c…`);
- the accepted wave-1 and wave-2 subjects, both wave-2 reviewer responses, and the wave-2 approved-ref `approved-refs/source-2ee00e1c52f7a510fa0acde71e41d314.json`;
- the plan ledger `.superpowers/sdd/2026-10-11-190-selection-read-scope/progress.md` (lines 47 and 55–66), to corroborate the run, C1, Windows Node 26 failure and freeze claims.

What I checked and found consistent:

- **Table against record.** The table row (darwin / 25.6.0 / arm64 / Node 26 / absence) matches the record's `scope` and `kinds` exactly. `kinds` is `["absence"]` and `transitions` is `[]`, which is what `validateProcessSourceRegistration` (records.mjs:137–147) requires for an absence-only record.
- **Probe constants.** The probe is `/bin/ps` / `same-user-full-selection` / `exact-ps-selection-v1` with a `sha256:` version. These are exactly the darwin constants in `validateScope` (records.mjs:90). The probe hash `62c342e1…` is the same value as the macOS Node 24 record `2ee00e1c…` on the same 25.6.0 arm64 build. That fits an unchanged stock `/bin/ps` and the subject's description of it as a finite stock-binary hash.
- **Package pinning.** sourceCommit `07835545…`, contractDigest `sha256:340ece55…` and inventoryDigest `sha256:dae2c976…` match the subject's prose and all six other same-source records. The tarball digest `21331c1d…` is equal to the Linux records and to macOS Node 24. Only Windows Node 24 (`785b254e…`) differs. This matches the line-9 note "(identical to the Linux tarball; only Windows differs)".
- **Distinct identity.** I searched the whole repository, excluding `.scratch`. The hostId `33c96ea0…`, publicKey `…AukHNt0W…` and keyId `8a30374c…` each appear only in this record. The captureId appears only in this record, the index and the subject. No host or signing identity is shared with any earlier capture, including macOS Node 24.
- **Index shape.** The index has one entry. Its captureId matches the record, and its path is `registrations/<captureId>.json` as `verifyProcessSourceIndexCore` (records.mjs:381–389) requires. The JSON block lists one capture at the same path.
- **Different digests are expected.** The index `digest` (`bf2955db…`) differs from the JSON `sha256` (`ff4cc9dc…`). This is expected: the index uses canonical-record digests (`processSourceRecordDigest`), while the review reference uses raw blob bytes. The subject says so correctly.
- **Revision chain.** The index/capture revision `a921dd4` is the parent of the subject commit `6520483`, according to the session's recent-commit context.
- **Preserved history.** Line 3 now lists all six prior approvals correctly:
  - the five wave-1 registrations at index `c2b1bf8` (Linux Node 24/26 creation and absence, Windows Node 24 absence);
  - macOS Node 24 absence at index `eb3f510`.

  The wave-2 approved-ref pins `revision: eb3f5103…` and `indexDigest: sha256:7cb1be22…`, which matches the wave-2 subject's JSON block. All six earlier registration files are still present in the working tree. Replacing the current index therefore leaves the earlier approvals verifiable through their own pinned revisions.
- **Windows Node 26 exclusion.** Ledger lines 59 and 64 record that Windows Node 26 job 114669155183 failed in prepare (`package-host-unclassified`) before any public registration. No signed receipt or registration exists for it, and the whole six-job run cannot be called green. The subject says exactly this ("failed before registration and grants no coverage; the complete run is not green"). It also says the absence registration "does not manufacture successful CI provenance". I found no `registrations/` record for a Windows Node 26 capture.
- **Authority scope.** The subject keeps the authority bounded:
  - it permits absence only;
  - it authorizes no creation stamp, clock change, privileged action, reboot, descendant, provider or production activation;
  - it grants no class acceptance or scope adoption;
  - it keeps the Windows resident worker unadmitted;
  - it lists the remaining #190/#107 gates as incomplete;
  - capture cannot approve itself.

Verification limits:

- I was told not to use Git, and shell execution (including running `records.mjs` under node) was denied in this session. So I did not recompute:
  - the git blob OIDs (`81b8516e…`, `023ece08…`);
  - the raw SHA-256 values (`c4236892…`, `ff4cc9dc…`) at `a921dd4`;
  - the canonical index digest `bf2955db…`;
  - the Ed25519 SPKI and keyId binding.

  I also did not confirm ancestry with `merge-base` and did not replay the 894-input producer freeze. The immutable reader's `reference()` and `ancestor()` checks, and the key check in `validateProcessSourceRegistration`, re-check these at use time and fail closed.
- The macOS Node 26 preflight claim ("no clock change, restoration not-required") rests only on the subject and the ledger. No public receipt or host-control exists yet for `source-eaef9345…`, which is expected before registration approval. The later class review enforces it through `validateAbsenceControls` (`restoration === 'not-required'` for absence).

## Findings

1. **Medium (misstated C1 evidence).** Line 13 says: "Explicit 16-call C1 feasibility at source 0783554 passed Linux/macOS Node 26/26 but failed Windows Node 24/26 at the original 30-second deadline." "Node 26/26" is not a meaningful pair. It also understates the actual evidence.
   - The ledger (progress.md:47) records C1 run 38205749683 as "Linux24/26 and macOS24/26 PASS, Windows24/26 FAIL".
   - The accepted wave-2 subject (line 13) says "passed Linux/macOS Node 24/26".
   - The ledger itself (progress.md:63, 66) records this as a known author-generation error: a blanket "Mac24→26" replacement also rewrote the generic "Node 24/26".

   This subject becomes an immutable accepted authority reference, and its C1 sentence is part of the stated basis for keeping the Windows worker unadmitted. It must therefore match the real run. The table, the JSON block and the record data are not affected; the error is in the prose only.

## Required changes

1. On line 13, change "passed Linux/macOS Node 26/26" to "passed Linux/macOS Node 24/26", matching C1 run 38205749683 and the accepted wave-2 wording. Do not change the table, the JSON reference block, the index or the registration. The references at `a921dd4` must stay byte-identical. Then re-check the rest of the prose for any other unintended 24→26 substitution. I found none: line 3's "Linux Node 24/26", "Windows Node 24" and "macOS Node 24 absence at index eb3f510" are correct.

## Optional suggestions

None.

## Decision

revisions-requested
