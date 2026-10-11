<!-- ai-peer-review-template version="1" digest="sha256:78e9a634af9d540baaf6790db82952eaf39cf7ab59a6cdc7938319ae07a4cbed" -->

<!-- protected-frontmatter -->

---
schema: "ai-peer-review.response/v1"
review_id: "review-b3bc9f9920912492ddbd5c939a069104"
role: "reviewer"
turn: 1
commit_mode: "normal"
authority_assurance: "unavailable"
artifact_path: "evidence/portable-runtime/process-source/registration-reviews/190-current-wave5.md"
artifact_commit: "996a65538b9ec0b5c0ef6a185ecf146ea010819f"
artifact_blob: "38b6f737d6d53b074ef2f2009b24d8aad49602e7"
artifact_digest: "sha256:d88e363d3c9617142dbb50434d63ff47fc8436c3379292e2ec6e8040d6e356c0"
agent:
  host: "claude-code"
  provider: "anthropic"
  model_id: "claude-opus-5-5"
  model_display: "claude-opus-5-5"
  session_fingerprint: "sha256:88bcc28828fbb20c0987fd0daa8425de9bf9e8a6d707316b7e6a9f63408d3e89"
  identity_source: "runtime"
started_at: "2026-10-11T01:16:02.347Z"
submitted_at: "2026-10-11T01:17:27.111Z"
finding_ids: []
answered_finding_ids: []
acknowledged_supplement_ids: []
---

Mode: `normal`

## Summary

Independent review of the 190-current-wave5 registration subject: two Node 26 absence-only registrations (darwin 25.6.0 arm64 `source-374f07b77545a8e320130f34b2c03b43`, win32 10.0.26100 x64 `source-f8bd19ba6d2754392c1bb344c25361ac`) plus the registration index reference, all pinned at revision `663b7ff65197375e152e9ace3a0e48fa0c10c567`.

What I checked, by reading the working-tree files and the validator in `test/live/process-source/records.mjs`:

- Schema conformance against `validateProcessSourceRegistration`: both records have exactly the required keys (`schema`, `captureId`, `hostId`, `publicKey`, `keyId`, `package`, `scope`, `kinds`, `transitions`); `kinds` is `["absence"]` and `transitions` is `[]`, which is the only shape the validator allows without creation. The `package` objects have exactly the five required keys with well-formed 40-hex `sourceCommit` and `sha256:` digests.
- Scope/probe binding against `validateScope`: darwin pins `/bin/ps`, `same-user-full-selection`, `exact-ps-selection-v1`; win32 pins `C:\Windows\System32\WindowsPowerShell\v1.0\powershell.exe`, `local-cim-query`, `completed-cim-query-v1`. Both match the fixed per-platform expectations, and both probe `version` values are hashes as required for non-Linux.
- Consistency with the subject prose and table: platform, build, architecture, Node major 26, capability `absence`, source commit `11c83fa0…`, and contract digest `sha256:505bc7fe…` all match the artifact.
- Cross-sibling consistency within run 38099441145 / source `11c83fa0…`: the darwin Node 26 tarball digest (`7a5417fb…`) equals the darwin Node 24 (`3f4fbcaa…`) and Linux Node 24/26 siblings; the win32 Node 26 tarball (`55d4c05b…`) equals the win32 Node 24 sibling (`9f839054…`). That repeats the established pattern from earlier sources, where only Windows produces a distinct tarball. Inventory digest `e3c4c6c1…` and contract digest are the same across all six current-source registrations. Probe version hashes equal the Node 24 siblings on the same OS (darwin `62c342e1…`, win32 `54b68d39…`), so the recapture did not widen or swap the probe.
- Identity uniqueness: `hostId`, `publicKey`, and `keyId` for both records appear nowhere else under `evidence/`, so no key or host identity is reused from a prior wave or from the Node 24 workers.
- Index: `registration-index.json` lists exactly these two capture IDs, in strictly ascending order (`374f…` < `f8bd…`), with the canonical paths `verifyProcessSourceIndexCore` requires. The index `digest` fields are canonical-record digests (`processSourceRecordDigest`), not raw file sha256 values, so it is expected that they differ from the subject's per-blob `sha256` values.
- Secrets/scope: the records contain only public SPKI Ed25519 keys (the `MCowBQYDK2VwAyEA…` prefix), hashes, and fixed probe identifiers. There is no private key, credential, provider handle, or token. The prose limits authorization to capture, keeps Windows/macOS absence-only, keeps Linux clock controls limited to declared Linux creation registrations (none are in this wave), and explicitly does not claim class approval, ledger adoption, or production activation.

Verification limit: this session could not run shell commands, so I could not recompute the Git blob IDs, the raw sha256 values, the canonical record digests, or the `keyId = sha256(SPKI DER)` derivation. Those byte-level bindings are mechanically enforced by the immutable readers and validator described above. I found no inconsistency in anything I could inspect.

## Findings

None.

## Required changes

None.

## Optional suggestions

1. The "covered change" paragraph describes the macOS `/bin/ls` ACL observation in `src/broker/storage-protection.mjs`, but the registrations pin only the process-source probe (`/bin/ps` / PowerShell CIM). A clause stating that the `/bin/ls` and Windows ACL probes are bound by the frozen source/inventory/contract digests, not by the registration `probe` field, would stop a reader from looking for an ACL probe pin in the registration.
2. The Linux clock-control paragraph is carried over from waves that included Linux creation registrations. A one-line note that this wave declares no Linux or creation registrations, so that authorization does not apply here, would make the bounded scope immediately obvious.

## Decision

accepted
