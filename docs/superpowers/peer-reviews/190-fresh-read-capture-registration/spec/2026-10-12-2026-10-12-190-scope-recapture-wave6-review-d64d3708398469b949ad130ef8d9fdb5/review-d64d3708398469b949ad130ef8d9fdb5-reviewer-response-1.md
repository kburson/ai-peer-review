<!-- ai-peer-review-template version="1" digest="sha256:78e9a634af9d540baaf6790db82952eaf39cf7ab59a6cdc7938319ae07a4cbed" -->

<!-- protected-frontmatter -->

---
schema: "ai-peer-review.response/v1"
review_id: "review-d64d3708398469b949ad130ef8d9fdb5"
role: "reviewer"
turn: 1
commit_mode: "normal"
authority_assurance: "unavailable"
artifact_path: "evidence/portable-runtime/process-source/registration-reviews/2026-10-12-190-scope-recapture-wave6.md"
artifact_commit: "86a703595ced7c806c31eee65eb5ab30f36f8bc9"
artifact_blob: "49ce80d582a95a2db70bcbdf5c0abdcccbc7880b"
artifact_digest: "sha256:69e2fc556a4c432a2d19a7a4bba3d152629cd4a5e670bdf33df1131977a38fd5"
agent:
  host: "claude-code"
  provider: "anthropic"
  model_id: "claude-opus-5-5"
  model_display: "claude-opus-5-5"
  session_fingerprint: "sha256:1c665df6f34ae10b6ddad0bb12ebc73f09190c69c39b3a04643cf96055aa6894"
  identity_source: "runtime"
started_at: "2026-10-12T16:41:37.402Z"
submitted_at: "2026-10-12T16:44:14.790Z"
finding_ids: ["R1-F001","R1-F002","R1-F003","R1-F004"]
answered_finding_ids: []
acknowledged_supplement_ids: []
---

Mode: `normal`

## Summary

I reviewed the wave-6 registration request. It covers six registrations from run 38278337597, attempt 1, at executing source `89a2d7d`, under the new production contract `sha256:a3c54de6…8f22`.

The registration records look sound. They are narrow, fresh and not widened. Each one matches the artifact table, and none grants class acceptance or adoption. The problem is the prose. It makes one factually wrong claim about the records and one statement about the Windows worker that contradicts the request itself. It also leaves out the package-tuple disclosure that earlier waves gave, and that disclosure matters here because the Windows tarball differs from the others. The Windows worker statement must also be reconciled with the paragraph about the Windows Node 26 diagnostic. The artifact asks the reviewer to reject inconsistent or unproved material, so I am requesting wording revisions. The data does not need to change.

What I checked using only file reads (Read/Grep/Glob):

1. **The records match the table.** All six registration JSON files match the artifact table exactly on platform, build, architecture, Node major and capability:
   - `0f9002ed…`: linux / 6.17.0-1022-azure / x64 / Node 26 / absence
   - `496ca510…`: win32 / 10.0.26100 / x64 / Node 24 / absence
   - `576323d2…`: linux / x64 / Node 24 / absence
   - `bcdbc785…`: linux / x64 / Node 24 / creation
   - `c39a8d6d…`: linux / x64 / Node 26 / creation
   - `c9490e17…`: darwin / 25.6.0 / arm64 / Node 24 / absence

   All six have `sourceCommit` `89a2d7dd93b6130b8188d90ed87f06af4e8312ce`. All six have contract `sha256:a3c54de6bcdfad324577850e29c2f2ab4b809a74ea6f5c9a0de4e9afa6d38f22`, which matches the stated current production contract.
2. **Capability bounds are correct.**
   - Both Linux creation records list exactly `clock-forward`, `clock-backward`, `timezone` and `dst`.
   - All four absence records, including Windows and macOS, have empty `transitions`.
   - No Windows or macOS record carries creation.
3. **The four-worker claim holds.** There are four distinct `hostId` values:
   - Linux Node 24 absence and creation share `68517fe6…`.
   - Linux Node 26 absence and creation share `fbe76106…`.
   - Windows has `9b7fe321…`.
   - macOS has `27ba16c8…`.

   This matches "4 actual published workers" and six registrations.
4. **Keys are distinct and fresh.**
   - All six `keyId` and `publicKey` values are pairwise distinct.
   - A repo-wide grep finds every new `hostId`, `keyId` and `publicKey` only in its own record.
   - No earlier host or key is reused.
5. **The index is current-only.** `registration-index.json` in the working tree lists exactly these six captures. Their paths match the artifact's capture references, and no historical record is mixed in. The earlier registration files, approved-refs, receipts and host-controls are still present, as the artifact claims.
6. **Probe tuples are byte-identical per platform** to those in accepted earlier waves:
   - procfs-v1 for Linux.
   - PowerShell CIM `54b68d39…` for Windows.
   - `/bin/ps` `62c342e1…` for macOS.
7. **The class ledger count matches.** `src/protocol/process-source-contracts.json` has exactly 26 `approvalDigest` entries, which matches "All 26 prior classes". None of those entries uses the new contract digest `a3c54de6…`, which is consistent with "historical for the previous contract and grant no admission."
8. **No receipts or host-controls exist yet** for any of the six new captures. This is consistent with registration acceptance proving no signed capture.
9. **No self-approval.** The artifact defers signatures, CI run/job/attempt scope, final host controls and producer-tree verification to a later finite class approval. It does not claim installed journeys, CI receipts or native lifecycle delivery. The 30/15/5/800-second budgets, disabled native builds and Linux manual-review exclusion are unchanged.

Verification limits (stated as required):

- Shell execution was denied in this session, and per instructions I did not use Git. As a result:
  - I did not recompute the raw SHA-256 or Git blob hashes for the index (`7c62dbeb…`/`60a4ce3d…`) or the six captures.
  - I did not recompute the six canonical index digests.
  - I did not confirm that the working-tree bytes equal revision `ff45983`.
  - I did not recompute contract digest `a3c54de6…` from the 29 covered files.
- I did not independently verify any of the following:
  - the existence, outcome and job/attempt scope of GitHub run 38278337597;
  - the producer-freeze partition;
  - the claimed C1 results at `2b2970a`;
  - which matrix workers were queued, missing or failed in this run.
- I did not verify any Ed25519 signatures, or the privacy of the hashed host identifiers.

## Findings

### R1-F001 — "Distinct actual host hash" per registration is factually wrong

The artifact says: "Each registration binds its distinct actual host hash and protected public signing key". The records show six registrations on only four host hashes. `576323d2…` and `bcdbc785…` share `hostId` `sha256:68517fe6…`, and `0f9002ed…` and `c39a8d6d…` share `sha256:fbe76106…`. Only the signing keys are distinct per registration.

Wave 4 described the same layout correctly: "Linux Node 24 creation/absence share one host, Linux Node 26 creation/absence share another … Each registration has its own distinct protected signing key". As written, wave 6's sentence misstates the record content that acceptance would pin. A later class approval that relies on this prose could wrongly treat same-host absence and creation as independent hosts. This matters most for the Linux creation clock procedure, which runs on the same host as the subsequent absence capture.

### R1-F002 — The Windows "not approved" statement contradicts the request to accept the Windows registration

The artifact says: "The Windows worker is not approved without a complete ordinary/limited forecast with variability and cleanup margin." Yet the same artifact asks for acceptance of the Windows registration `source-496ca510ee051288c0dbf3d0bff299ad`, and says "Acceptance permits these exact signed captures only."

Read literally, the reviewer is being asked to approve a worker the artifact says is not approved. Waves 4 and 5 used the narrower and consistent wording "remains excluded from source admission". That wording separates registration acceptance from source admission. Wave 6 also changes the C1 facts: Windows Node 24 now passed at `2b2970a`, and only Windows Node 26 refused. Without clearer wording it is unclear whether the remaining exclusion applies to Windows as a whole or only to Node 26. It is also unclear what a Windows Node 24 pass changes.

### R1-F003 — Package tuples are undisclosed, and the Windows tarball differs without explanation

The artifact says each registration binds an "exact package tarball/inventory/contract", but it never states those values. The records show:

- Five registrations (Linux and macOS) share tarball `sha256:06f2a3d86fb62751e78c728bbc2145d96b2521caa7494e3093b5462a5b406b35`.
- The Windows registration has a different tarball, `sha256:a06c5e57c252f690349d48abecd4eed28cde07e855d0cf4116c047ddee1a332f`.
- All six share inventory `sha256:0599455245de5bac7190cb16fdf583c55ec30ec952c81d8e021ea32df90d3aa3`.

Earlier waves had the same Windows-specific tarball split, but each disclosed the exact tuples and compared them with the previous accepted tuples. This wave does neither, so the reviewer has to infer that the Windows divergence is the expected platform-specific packing rather than a different package build. The artifact also gives no comparison of `89a2d7d` packaging inputs against the prior `2a6adf5` tuples (`5fed440b…`/`5d96830e…`, inventory `4cf3ce90…`). Similarly, it does not say whether an archived-member byte comparison was performed.

## Required changes

1. **R1-F001:** Replace "Each registration binds its distinct actual host hash" with wording that matches the records. Use the wave-4 pattern:
   - six registrations on four actual worker hosts;
   - Linux Node 24 absence/creation share one host hash, and Linux Node 26 absence/creation share another;
   - Windows Node 24 and macOS Node 24 each have their own;
   - all six signing keys are distinct.
2. **R1-F002:** Reword the Windows sentence so it clearly applies to source admission, for example "The Windows worker remains excluded from source admission …". State explicitly whether the Windows Node 24 C1 pass at `2b2970a` changes that status. Make clear that registration acceptance of `source-496ca510…` is still permitted and grants no source admission.
3. **R1-F003:** State the exact tarball and inventory digests: the Linux/macOS tuple, the Windows tuple and the shared inventory. Say that the Windows tarball difference is the established platform-specific packing, with the inventory and contract identical. Also say whether the tarballs and inventory differ from the prior `2a6adf5` tuples, and why, or that no archived-member byte comparison was performed.

## Optional suggestions

### R1-F004 — Name the absent matrix workers for this run

The artifact says this wave "covers 4 actual published workers only", but does not name which matrix members are absent from run 38278337597. Presumably these are Windows Node 26 and macOS Node 26, given the six-worker matrix in waves 4 and 5. Naming them, together with their queued, missing or failed state, would make "grant no coverage" auditable without consulting the run. It would also make clear whether any of them needs a follow-up registration wave. This is not required for acceptance.

## Decision

revisions-requested
