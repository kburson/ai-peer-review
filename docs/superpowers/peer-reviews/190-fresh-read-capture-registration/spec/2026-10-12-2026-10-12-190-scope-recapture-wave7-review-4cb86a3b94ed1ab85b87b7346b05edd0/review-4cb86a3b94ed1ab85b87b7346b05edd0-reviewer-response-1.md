<!-- ai-peer-review-template version="1" digest="sha256:78e9a634af9d540baaf6790db82952eaf39cf7ab59a6cdc7938319ae07a4cbed" -->

<!-- protected-frontmatter -->

---
schema: "ai-peer-review.response/v1"
review_id: "review-4cb86a3b94ed1ab85b87b7346b05edd0"
role: "reviewer"
turn: 1
commit_mode: "normal"
authority_assurance: "unavailable"
artifact_path: "evidence/portable-runtime/process-source/registration-reviews/2026-10-12-190-scope-recapture-wave7.md"
artifact_commit: "cb2e657d5c63ce7db06c38d6579f68173a2010fc"
artifact_blob: "505971518d25446a19b766beb07fd412cb3dae17"
artifact_digest: "sha256:70ae96bd15a98bf258fcf2e90e86663c3fb36f4899e5f3d98a6b9a7e903acacd"
agent:
  host: "claude-code"
  provider: "anthropic"
  model_id: "claude-opus-5-5"
  model_display: "claude-opus-5-5"
  session_fingerprint: "sha256:2d970840e834207dd0dd90312789a4de6850e750c228dff16cd0c2647b752c27"
  identity_source: "runtime"
started_at: "2026-10-12T16:59:49.080Z"
submitted_at: "2026-10-12T17:01:35.588Z"
finding_ids: []
answered_finding_ids: []
acknowledged_supplement_ids: []
---

Mode: `normal`

## Summary

I reviewed the wave-7 registration request. It covers two absence-only registrations, Windows Node 26 and macOS Node 26, from the same run as wave 6: run 38278337597, attempt 1, executing source `89a2d7d`, under the current production contract `sha256:a3c54de6…8f22`. These are the two workers that wave 6 recorded as queued and said would need a follow-up wave.

The records are narrow, fresh and consistent with the prose. The prose follows the corrected wave-6 patterns: it states the host-hash count accurately, discloses the package tuples, and scopes the Windows forecast caveat to the guard-owned ACL query process rather than to the registration. I found nothing synthetic, widened, inconsistent or self-approving, so I accept.

What I checked using only file reads (Read/Grep/Glob):

1. **The records match the table.** Both registration JSON files match the artifact table on platform, build, architecture, Node major and capability:
   - `17ec10f5…`: win32 / 10.0.26100 / x64 / Node 26 / absence
   - `a3ddb563…`: darwin / 25.6.0 / arm64 / Node 26 / absence

   Both have `sourceCommit` `89a2d7dd93b6130b8188d90ed87f06af4e8312ce` and contract `sha256:a3c54de6bcdfad324577850e29c2f2ab4b809a74ea6f5c9a0de4e9afa6d38f22`, which matches the stated current production contract.
2. **The capability bounds are correct.** Both records have `kinds: ["absence"]` and empty `transitions`. Neither carries creation. The Linux clock-procedure paragraph is explicitly marked as not applying to this wave, and neither record could use it.
3. **The package tuples match the disclosure.**
   - Windows binds tarball `sha256:a06c5e57…332f`.
   - macOS binds `sha256:06f2a3d8…6b35`.
   - Both bind inventory `sha256:05994552…3aa3`.

   These are the same tuples that the accepted wave-6 records from the same run bind: Windows Node 24 `496ca510…` uses `a06c5e57…`, and the five Linux/macOS records use `06f2a3d8…`. So the claimed platform-specific split is consistent within this run. The prior-source tuples (`5fed440b…`, `5d96830e…`, `4cf3ce90…`) match the values stated in wave 6. The artifact correctly says no archived-member byte comparison was performed.
4. **The two-worker claim holds.** The two `hostId` values, `42d4af7f…` and `9797a570…`, are distinct. The two `keyId` and `publicKey` values are also distinct. A repo-wide grep of `evidence/` finds each new `hostId`, `keyId` and `publicKey` only in its own record, so no host or key from wave 6 or any earlier wave is reused.
5. **The probe tuples are unchanged per platform.** Windows uses PowerShell CIM `local-cim-query` / `completed-cim-query-v1` / `54b68d39…`, and macOS uses `/bin/ps` `same-user-full-selection` / `exact-ps-selection-v1` / `62c342e1…`. Both are byte-identical to the accepted wave-6 Windows Node 24 and macOS Node 24 records on the same OS builds.
6. **The index is current-only.** `registration-index.json` in the working tree lists exactly these two captures. Their paths match the artifact's capture references, and no wave-6 or historical record is mixed in, which matches "their records are excluded from this index". The wave-6 records and the receipt/host-control directories (run ID `38278337597`) are still present.
7. **The wave-6 provenance claim holds.** The wave-6 review has `reviewer-response-2` with decision `accepted`. Wave 6 named exactly these two Node 26 workers as queued, and wave 7 now covers exactly those two.
8. **The class ledger count matches.** `src/protocol/process-source-contracts.json` has exactly 26 `approvalDigest` entries, which matches "All 26 prior classes". No file under `src/` contains the new contract digest `a3c54de6…`, which is consistent with "historical for the previous contract and grant no admission".
9. **No receipts or host-controls exist yet** for `17ec10f5…` or `a3ddb563…`. This is consistent with registration acceptance proving no signed capture.
10. **There is no self-approval.** Signatures, CI run/job/attempt scope, final host controls and producer-tree verification are deferred to a later finite class approval. The Windows Node 26 C1 diagnostic refusal at `2b2970a` is kept as a failure and is not used to support this capture. The 30/15/5/800-second budgets, disabled native builds, absence of a cache or waiver, and the Linux manual-review exclusion are all unchanged. The installed journeys, CI receipts and native lifecycle delivery are stated as incomplete.

Verification limits (stated as required):

- Shell execution was denied in this session, and per instructions I did not use Git. As a result:
  - I did not recompute the raw SHA-256 or Git blob hashes for the index (`6b0dd5ca…`/`c65732bb…`) or for the two captures (`e3fd1c93…`/`3c145df9…`, `1a30f045…`/`b061c089…`).
  - I did not recompute the two canonical index digests (`dcf8bbca…`, `5191393a…`).
  - I did not confirm that the working-tree bytes equal revision `b074e1c`.
  - I did not recompute contract digest `a3c54de6…` from the 29 covered files.
- I did not independently verify any of the following:
  - the existence, outcome and job/attempt scope of GitHub run 38278337597, or which workers in it actually published;
  - the producer-freeze partition;
  - the claimed C1 results at `2b2970a`;
  - the Git comparison listing five changed source files.
- I did not verify any Ed25519 signatures, or the privacy of the hashed host identifiers.

## Findings

None.

## Required changes

None.

## Optional suggestions

None.

## Decision

accepted
