<!-- ai-peer-review-template version="1" digest="sha256:78e9a634af9d540baaf6790db82952eaf39cf7ab59a6cdc7938319ae07a4cbed" -->

<!-- protected-frontmatter -->

---
schema: "ai-peer-review.response/v1"
review_id: "review-3726fcae39caf67a4149ca86d6831888"
role: "reviewer"
turn: 1
commit_mode: "normal"
authority_assurance: "unavailable"
artifact_path: "evidence/portable-runtime/process-source/class-reviews/170-current-wave2.md"
artifact_commit: "eb7fec18a85c40f56a40270dd63ba0f19ea16683"
artifact_blob: "bc88c17b4123b8a11f5b1769daf79e5cdd0d43ce"
artifact_digest: "sha256:44de8c97721c5458b311b3553ae0c2a5efdd9a2c8fec148189c1aed64c126509"
agent:
  host: "claude-code"
  provider: "anthropic"
  model_id: "claude-opus-5-5"
  model_display: "claude-opus-5-5"
  session_fingerprint: "sha256:c6ec773ce692a3126327772726213d3a4f35f0a2a7cf71298dea9480a913c091"
  identity_source: "runtime"
started_at: "2026-10-08T08:00:04.005Z"
submitted_at: "2026-10-08T08:02:12.315Z"
finding_ids: []
answered_finding_ids: []
acknowledged_supplement_ids: []
---

Mode: `normal`

## Summary

I reviewed the subject `evidence/portable-runtime/process-source/class-reviews/170-current-wave2.md` at artifact commit `eb7fec1`. I read every artifact it references in the working tree:

- the proposal bundle `classes/170-current-wave2-proposals.json`;
- both receipts and both `host-control.json` records (`source-bbefe02f…` Windows, `source-c2e5961b…` Darwin);
- the CI provenance projection `classes/170-ci-provenance-37741411472.json`;
- the embedded registration approval: the wave 2 registration subject `registration-reviews/170-refreshed-wave2.md`, its accepted reviewer response, both registration records and the current `registration-index.json`.

For comparison I also read the wave 1 class subject, its proposals and its accepted class review response.

I read the code that produces and admits these records:

- `test/live/process-source/authority.mjs` (`readReviewedProcessSourceClasses`, `readReviewedProcessSourceClassSet`);
- `test/live/process-source/records.mjs` (receipt, absence-control and CI-control validation);
- `test/live/process-source/classes.mjs` (proposal construction);
- the host-control writer in `test/helpers/process-source-ci-capture.mjs`;
- the Darwin and Windows host-binding sources in `src/protocol/process-identity.mjs`.

Finally, I read the author's ignored audit scratch:

- the raw run and jobs API response `.scratch/170-delivery/ci-capture-run-37741411472.json`;
- the wave 2 batch `ci-batch-37741411472-wave2.json`;
- the wave 2 approved ref `refreshed-wave2-approved-ref.json`;
- the freeze record `wave2-full-tree-freeze-post-publication.json`.

### Verified by execution

Before shell access was restricted, I ran one `shasum -a 256` over the working-tree files. Every raw SHA-256 matches the value the subject declares:

| File | SHA-256 (prefix) | Matches subject |
| --- | --- | --- |
| `170-current-wave2-proposals.json` | `d6e292bc…` | yes |
| `source-bbefe02f…/receipt.json` | `0d836d3f…` | yes |
| `source-bbefe02f…/host-control.json` | `33f92d35…` | yes |
| `source-c2e5961b…/receipt.json` | `808b8bec…` | yes |
| `source-c2e5961b…/host-control.json` | `09257474…` | yes |
| `170-ci-provenance-37741411472.json` | `72ea18e7…` | yes |
| the subject itself | `44de8c97…` | equals the frontmatter `artifact_digest` |

### Verified by inspection

**Registration approval binding.** The subject's `registrationApproval` is byte-for-byte the same object as the author's `refreshed-wave2-approved-ref.json`:

- revision `2d65f04`;
- index digest `ff2d9fa0…`;
- review `review-00f57f62…`, with subject, manifest, final response and finalization `f9de119`.

The registration subject declares exactly two captures at `2d65f04`, and its accepted reviewer response (`accepted`, no findings) covers exactly these two records. Both receipts carry registration revision `2d65f04` and index digest `ff2d9fa0…`. The registration digests (`09685cbc…`, `dc69a1b8…`) equal the entries in the current index and in the wave 2 batch record.

**Receipt to registration consistency.** Each receipt's `captureId`, `hostId`, `package` and `scope` equal those in its registration record. The receipt's `signature.keyId` equals the registration's `keyId`:

- Windows: key `f643d1ed…`, host `2e002587…`;
- Darwin: key `0f8d1670…`, host `0713f5f3…`.

Both registrations declare `kinds: ["absence"]` and `transitions: []`, so the receipts cannot claim creation.

**Absence controls.** Both receipts satisfy the shape that `validateAbsenceControls` (`records.mjs:168-218`) requires:

- `producer.kind: installed-source`, with contract and inventory digests equal to the package;
- the same PID in live, exit and absence (Windows 3164, Darwin 12941), with a 64-hex nonce;
- `exitCode 0`, `signal null`;
- `absence.status: absent`;
- `error: unknown / probe-query-error`;
- `cleanup.childExited: true`, `restoration: not-required`;
- `transitions: []`, `boot.before/after: null`, unit `utc-nanoseconds`.

The creation-bound widths are exactly what the validator requires for each platform:

- Windows: `1791445008363197100 − 1791445008363197000 = 100`;
- Darwin: `1791445002000000000 − 1791445001000000000 = 10⁹`.

**Host controls.** Both records have:

- `verified: false`;
- run `37741411472`, attempt `1`;
- `codeCommit` `d50e64f…`;
- `captureProducerCommit` `5901a47…`;
- the matching `captureId`;
- `kind: absence`;
- `control: {verified: false, clockChanges: none, restoration: not-required}`.

This is the only shape `verifyCiCaptureControlsCore` accepts for absence (`records.mjs:486-493`). In the worker (`process-source-ci-capture.mjs:68, 206`), the clock controller is initialized only on Linux. Absence captures write this constant control, so the Windows and Darwin workers never mutate the clock. That matches the subject's "no capture clock changes / restoration not required". The subject does not claim Linux restoration for this wave, and it does not reference any Linux record.

**CI provenance.** The committed projection matches the raw API capture field for field:

- repository `kburson/ai-peer-review` (`private: false`);
- event `push`, `completed`/`success`;
- workflow `.github/workflows/process-source-capture.yml`;
- head SHA `d50e64f…`, attempt 1;
- six jobs whose IDs, runner OS, Node major and `completed`/`success` status all agree.

Exactly one job matches each wave 2 receipt, as `verifyCiCaptureControlsCore` requires:

- `113192727718` (Windows, Node 26);
- `113192728029` (macOS, Node 26).

The timing is consistent with the workflow:

| Worker | Registration published | Capture time (from receipt) | Capture step ended |
| --- | --- | --- | --- |
| Windows Node 26 | 07:29:38Z | ≈07:36:48Z (`1791445008.36 s`) | 07:36:51Z |
| macOS Node 26 | 07:29:44Z | ≈07:36:41Z (`1791445001 s`) | 07:36:42Z |

Both captures follow the registration reviewer's submission at 07:35:21Z, so neither was captured before approval.

**Finite scope.** The scope is not widened:

- Each proposal has exactly one receipt and one observed tuple: Windows `10.0.26100/x64/26` and Darwin `25.6.0/arm64/26`.
- `proposeProcessSourceClassCore` builds `builds × architectures × nodeMajors` from the receipts and refuses any untested combination. With one tuple per class, nothing can widen.
- Semantics and precision match the fixed table: `windows-cim-completed-v1` and `darwin-ps-selection-v1`, both `not-applicable`.
- Probes are the fixed System32 PowerShell CIM probe (`54b68d39…`) and the Darwin `/bin/ps` probe with the combined digest `62c342e1…`.
- Each `packageProvenance` entry equals its receipt's package. The Windows tarball is `52dd…` and the Darwin tarball is `baa5…`; the contract and inventory digests are the same.

There is no overlap with wave 1. Wave 1's Windows and Darwin classes are Node 24 only, and its Linux classes are on a different platform. `readReviewedProcessSourceClassSet`'s overlap check (`authority.mjs:410-421`) therefore cannot fire between the two waves.

**Host identity.** `process-identity.mjs` still hashes the Darwin IOPlatformUUID together with `kern.bootsessionuuid`, and the Windows `Win32_ComputerSystemProduct` UUID. The host digests are distinct from wave 1:

- Darwin: `0713…` against `6e04…`;
- Windows: `2e00…` against `3ae2…`.

**Producer closure.** The author's wave 2 freeze record covers Q `d50e64f` → `5901a47`. Every changed path is under `evidence/portable-runtime/process-source/` or `docs/superpowers/peer-reviews/`, and `fullNonEvidenceTreeDiffExit` is `0`. `5901a47` precedes the subject revision in this branch's history. The reader repeats this for each host control without trusting the author's record (`authority.mjs:305-320`):

- `codeCommit` is an ancestor of `captureProducerCommit`;
- `captureProducerCommit` is an ancestor of the subject revision;
- `git diff --exit-code` over the full tree, excluding only the two evidence roots, returns no difference.

**Authority implementation.** Because this subject includes `hostControls` and `ciProvenance`, the reader takes the CI path with exact keys. It requires:

- one host control per receipt, each consumed once;
- every registered capture consumed exactly once: 2 receipts against 2 index entries (`authority.mjs:378-379`);
- a canonical-digest match between each recomputed proposal and the committed proposal;
- a matched structural `verifyProcessSourceClass` for the receipt's exact host.

It derives the evidence, review and approval digests only after the normal-review proof. Every capture-owned record is `verified: false` and is never trusted as approval.

**Subject prose.** The prose matches the evidence:

- It confines the wave to two Node 26 absence receipts.
- It treats the shared six-worker run as provenance, not as a scope expansion.
- It disclaims creation, reboot, Linux restoration, runtime activation and provider discharge.
- It leaves fresh installed-source and complete-ledger validation as later obligations.

### Verification limits

- Git is forbidden by the reviewer boundary, and after the single `shasum` call this session denied further shell use. I therefore did **not** independently do any of the following:
  - recompute Git blob IDs, or confirm that the bytes at revision `99977b1` equal the working-tree bytes I hashed;
  - verify Ed25519 signatures;
  - recompute the canonical receipt digests behind `evidenceDigests` (`cb12e3a9…`, `96deaa6c…`), the `classId` values or the registration index digest;
  - run the ancestry or full-tree diff checks;
  - query GitHub.
- My CI confirmation rests on the author's raw API capture in ignored scratch, not on a fresh authenticated query.
- The host-control and provenance records are unsigned. Their authenticity rests on the author's download of the public artifacts from that run, together with this review.
- The reader's blob, signature, canonical-digest, ancestry and full-tree-diff checks are mechanical and fail closed. They run at admission regardless of these limits.

## Findings

None.

## Required changes

None.

## Optional suggestions

1. **Paragraph 1 wording.** Paragraphs 1 and 2 still describe "final host restoration records" and "final control records", carried over from wave 1. This wave references only absence controls with `restoration: not-required`. Paragraph 3 makes that clear, but future absence-only subjects could say "final host-control records" so that no restoration is implied.
2. **Downgrade path, carried over.** The wave 1 suggestion still applies: `readReviewedProcessSourceClasses` treats `hostControls`/`ciProvenance` as optional (`authority.mjs:214-229`). Requiring them whenever a referenced registration originated in CI would make their presence mechanical, instead of depending on review. This subject includes both, so it is unaffected.
3. **Bind controls to jobs.** A host control that carried its GitHub job ID and receipt digest would bind mechanically to one provenance job. The current binding relies on (runner OS, Node major) uniqueness plus `captureId`.

## Decision

accepted
