<!-- ai-peer-review-template version="1" digest="sha256:78e9a634af9d540baaf6790db82952eaf39cf7ab59a6cdc7938319ae07a4cbed" -->

<!-- protected-frontmatter -->

---
schema: "ai-peer-review.response/v1"
review_id: "review-238766404366f76fe8bd15a85ffcf752"
role: "reviewer"
turn: 1
commit_mode: "normal"
authority_assurance: "unavailable"
artifact_path: "evidence/portable-runtime/process-source/registration-reviews/190-current-wave3.md"
artifact_commit: "f08fed2d7099c5180059c4bac3064aaa7e92a70b"
artifact_blob: "42567aed089e8b13b1525a796d8e8d337b0270c3"
artifact_digest: "sha256:15aedea0c76f5a37d314e88864ec79099db5fb229f73e1dd6107b7b94be2b069"
agent:
  host: "claude-code"
  provider: "anthropic"
  model_id: "claude-opus-5-5"
  model_display: "claude-opus-5-5"
  session_fingerprint: "sha256:8f5e6e6e2f4b79db5f2397e0e29c5325986fb9315b099831ef7dd220c53b324d"
  identity_source: "runtime"
started_at: "2026-10-11T00:54:13.782Z"
submitted_at: "2026-10-11T00:56:03.842Z"
finding_ids: []
answered_finding_ids: []
acknowledged_supplement_ids: []
---

Mode: `normal`

## Summary

I reviewed the registration subject `evidence/portable-runtime/process-source/registration-reviews/190-current-wave3.md` (blob `42567aed…`, commit `f08fed2`). It covers two Linux Node 26 registrations from one hosted worker, the immutable index reference, the stated source change, and the authorized Linux clock controls. I read each referenced record from the working tree and checked them against the subject, the earlier waves, the authority reader, and the capture helpers.

What I verified:

- **Index ↔ registrations.** `registration-index.json` lists exactly the two capture IDs and paths named in the subject's table and JSON block, in the same order. The index `digest` values (`ae4afefa…`, `0087edfe…`) are deliberately different from the file `sha256` values in the subject (`af3685d4…`, `41c17819…`). The index stores the canonical-record digest (`test/live/process-source/records.mjs:69`, `:400`). The subject pins raw-file sha256 and git blob values (`test/live/process-source/authority.mjs:54-67`). The two hashes measure different things, so this is not an inconsistency.
- **Record contents match the table.**
  - `source-3e7366d8…`: linux, `6.17.0-1022-azure`, x64, Node 26, kinds `["creation"]`, transitions `clock-forward`, `clock-backward`, `timezone` and `dst`.
  - `source-8ce2d069…`: same scope, kinds `["absence"]`, empty transitions.
  - Both use the stock `/proc` probe (`full-pid-namespace`, `exact-pid-directory-v1`, `procfs-v1`).
  - Both pin source commit `11c83fa0…`, the subject's source. They share tarball `7a5417fb…`, inventory `e3c4c6c1…` and contract `sha256:505bc7fe…`, matching the subject's "current production source contract".
- **One worker, two registrations.** Both records share host ID `cc241e29…` and have distinct public keys and key IDs. Wave 1 used the same pattern: one Linux worker emits a creation/absence pair under one host ID (`656f3f5a…`/`180f544f…` share `2f82e267…`, and `2e4f360c…`/`524a9193…` share `d57782b0…`). This supports "1 genuine GitHub hosted worker".
- **Historical classes cannot admit the new bytes.** The contract digest differs from both historical classes, `bf401a6e…` (waves 1 and 2) and `524b…`. Nothing in this subject tries to reuse those classes.
- **Source-change description is accurate.** I checked it against `src/broker/storage-protection.mjs` in the tree:
  - `macAclBatch` (`:575-592`) issues one fixed `/bin/ls -ldne` call over the full ancestor and leaf set.
  - `parseMacAclBatchCore` (`:472-518`) returns `verified: false`. It refuses duplicate targets, unknown or duplicate headers, orphan rows and incomplete coverage (`sections.size !== targets.length`).
  - The leaf and ancestor positive-grant policy in `parseMacRules` is unchanged.
  - `inspectWindowsReadPair` (`:788-848`) does one fresh `windowsProbe` over `[...chain, root, target]` per call. It retains nothing between calls and returns no receipt. It enforces root and file policy, a uniform principal, and a descriptor-identity re-check.
  - I saw no principal or permission cache and no deadline extension.
- **Authorized clock controls match the existing helper.** `test/helpers/process-source-ci-host.mjs` implements the procedure the subject describes:
  - NTP is toggled with `timedatectl set-ntp`.
  - The baseline zone is `America/New_York`.
  - Clock steps are ±90 s (`±90000000000n` ns).
  - The zone change is to `America/Detroit`.
  - Restoration obligations fail closed with `ci-clock-restoration-unproved`.
  - Preflight reports `privilege-and-restoration-observed` with `restoration: 'verified'`, which `records.mjs:498` requires.
  - The authorization is limited to the Linux creation record, the only one with transitions. Windows and macOS remain absence-only.
- **The authority reader enforces the pinning mechanically.** Before any approved index is used, `readApprovedIndex` (`authority.mjs:77-158`) checks several things:
  - the subject has exactly one JSON block;
  - the index revision and path are exact;
  - the capture count matches the index;
  - each capture's path matches its index entry in order;
  - each git blob and raw sha256 matches (`reference()`);
  - `verifyProcessSourceIndexCore` passes;
  - the ancestry chain `approved revision → subject → finalization → HEAD` holds.

  The subject explicitly says it does not approve itself as a class.
- **Public-only content.** The records contain only public Ed25519 SPKI keys, key IDs, host ID and digest values. I found no private binding, signing key, credential or provider handle.

Limitation: in this session I could only read files; shell hashing and Git were not available. So I did not recompute the git blob OIDs or raw sha256 values myself. Those exact values are enforced mechanically by `reference()` in `authority.mjs` at approval time, so a mismatch would make the approved index unavailable.

## Findings

None.

## Required changes

None.

## Optional suggestions

1. The source-change paragraph describes only macOS ACL batching and Windows protected-read pairing. On Linux, `inspect` sets `acl = []` (`storage-protection.mjs:756`), so neither changed path runs on the two Linux workers registered here. Consider one sentence saying these Linux captures re-admit Linux creation and absence under the changed contract digest only, and give no evidence for the macOS or Windows ACL changes. Those still need their own captures. This prevents a later class review from reading this wave as coverage of the changed code paths.
2. The sentence "Windows and macOS registrations permit absence only" refers to platforms that have no registration in this wave. Consider rewording it as a general constraint, for example "no Windows or macOS registration is included; any later one remains absence-only", so it cannot be misread as covering unlisted records.
3. Minor grammar: "1 genuine GitHub hosted workers" should be "1 genuine GitHub-hosted worker".

## Decision

accepted
