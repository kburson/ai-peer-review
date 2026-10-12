<!-- ai-peer-review-template version="1" digest="sha256:78e9a634af9d540baaf6790db82952eaf39cf7ab59a6cdc7938319ae07a4cbed" -->

<!-- protected-frontmatter -->

---
schema: "ai-peer-review.response/v1"
review_id: "review-cbdf7244263d35d14a975502c0fc45ba"
role: "reviewer"
turn: 1
commit_mode: "normal"
authority_assurance: "unavailable"
artifact_path: "evidence/portable-runtime/process-source/registration-reviews/2026-10-12-190-scope-recapture-wave5.md"
artifact_commit: "eea3ca1a9811ce3facc94e94bad2c55a7ce0de14"
artifact_blob: "96066626ee2d366e9e749a52ceae59ec0886e7c9"
artifact_digest: "sha256:5813d718cd538dc1dda541075b625b54f10dcd2563ad1d850dec0dfe6b188b7b"
agent:
  host: "claude-code"
  provider: "anthropic"
  model_id: "claude-opus-5-5"
  model_display: "claude-opus-5-5"
  session_fingerprint: "sha256:956af94f9a7132c1c5b33a3a41c9d1479b9d77dd9d581c1609d0add9bf1ee882"
  identity_source: "runtime"
started_at: "2026-10-12T09:24:25.393Z"
submitted_at: "2026-10-12T09:26:12.616Z"
finding_ids: []
answered_finding_ids: []
acknowledged_supplement_ids: []
---

Mode: `normal`

## Summary

I reviewed the wave-5 registration request for the two Node 26 workers (Windows `source-48343037d80c01b6c72e6d54be29a3ab` and macOS `source-d9411c4a10e179d8f0ba6c9aae0c8751`) from run 38224061596, attempt 1, at executing source `2a6adf5`. The request is narrow, consistent with the working-tree records and with accepted waves 3 and 4, and does not widen scope. Both records permit `absence` only, with empty `transitions`. Neither grants creation, a clock change, a privileged transition, class acceptance or integration adoption.

What I checked using only file reads (Read/Grep/Glob):

1. **Records match the table.** Both registration JSON files match the artifact table exactly on platform, build, architecture, Node major and capability. The Windows record is `win32`/`10.0.26100`/`x64`/26/absence. The macOS record is `darwin`/`25.6.0`/`arm64`/26/absence. Both have `sourceCommit` `2a6adf5b057084ada54ca0708e0a0f02482ce85a` and contract `sha256:340ece55…db25`, which matches the stated current production contract.
2. **Package tuple claims hold.**
   - Windows Node 26 has tarball `5d96830e…c9a9` and inventory `4cf3ce90…f2`. These are identical to accepted Windows Node 24 `source-69a9352ab6feaa4429330696565157e0` (wave 3).
   - macOS Node 26 has tarball `5fed440b…7da` and the same inventory. These are identical to the wave-4 Linux/macOS tuple (e.g. `source-3628b7593de5ba8cb83452e629ec05fa`).
   - Across the registrations directory, the new tarballs and the new inventory appear only in the eight `2a6adf5` records. They differ from the 9fe6817 tuples (Windows `785b254e…`, Linux/macOS `21331c1d…`, inventory `dae2c976…`), which is consistent with "differ from every prior 9fe6817 package."
3. **Hosts and keys are fresh and distinct.**
   - The new `hostId`, `keyId` and `publicKey` values appear nowhere else in the repository except their own record (repo-wide grep).
   - They are distinct from each other and from the other four 2a6adf5 workers. They are also distinct from the unreviewed wave-2 Node 26 records `source-184fd40e…` and `source-c9b4d0b5…`, which use different hosts/keys and the old 9fe6817 package. No old key is reused, as the artifact claims.
4. **Probe tuples are unchanged per platform.** Each probe path, visibility, error contract and version digest is byte-identical to the accepted same-platform Node 24 record:
   - Windows: PowerShell `local-cim-query`/`completed-cim-query-v1`/`54b68d39…`.
   - macOS: `/bin/ps` `same-user-full-selection`/`exact-ps-selection-v1`/`62c342e1…`.
5. **The index is current-only.** `registration-index.json` in the working tree lists exactly the two wave-5 captures, with paths that match the artifact's capture references. No other or historical record is mixed in.
6. **History is disclosed consistently.** Earlier runs 38211666754 (failure), 38205882840 (failure) and 38211337118 (canceled) are described the same way as in waves 3 and 4. So are the unreviewed old Node 26 records, which carry no approval. The first four workers of this run are explicitly outside this wave. I found signed `receipt.json` and `host-control.json` files present for all six earlier controls (`69a9352…`, `16bc77b6…`, `3628b759…`, `3b3170e1…`, `55832d07…`, `fc9482e6…`). For both Linux creation controls, the `host-control.json` records UTC/`Etc/UTC`/NTP restoration as claimed. No receipt or host-control exists yet for either wave-5 capture, which is consistent with "preparation/registration acceptance proves no signed capture."
7. **No self-approval.** The artifact reserves signature, CI run/job/attempt scope, final host-control and producer-tree verification for a later finite class approval. It does not claim installed journeys, CI receipts or native lifecycle delivery. It keeps the Windows source-admission exclusion, the C1 feasibility failures, the 30/15/5/800-second budgets and the disabled native builds.

Verification limits (stated as required):

- Shell execution was unavailable to this reviewer. I did **not** recompute the raw SHA-256 or Git blob hashes for the index (`b1d28a56…`/`8e86cac0…`) or the two captures (`bfed311d…`/`8a3659cc…` and `93dc519c…`/`7dc2e918…`). I also did not recompute the canonical index digests (`3ac005c1…` and `245553ef…`), or confirm that the working-tree bytes equal revision `cbe0105`. Per instructions, I did not use Git.
- I did not independently verify the existence or outcome of GitHub run 38224061596, its job/attempt scope, the producer-freeze count (899 vs 898), or the claim that only `src/broker/registry.mjs` changed among packaging inputs. The artifact itself says no archived-member byte comparison was done.
- I did not verify the Ed25519 signatures on the earlier receipts or the privacy of the hashed host identifiers.

These checks belong to the later class-approval stage, which the artifact correctly defers. The registration content I could inspect shows no synthetic, widened, inconsistent or self-approved material.

## Findings

None.

## Required changes

None.

## Optional suggestions

1. In the paragraph about the first four workers, "Six signed controls … are validated and retained" could note that the retained `host-control.json` files still carry `"verified": false` pending finite class approval. This would stop a reader from taking "validated" to mean ledger-level verification. It is wording only and is not required for acceptance.

## Decision

accepted
