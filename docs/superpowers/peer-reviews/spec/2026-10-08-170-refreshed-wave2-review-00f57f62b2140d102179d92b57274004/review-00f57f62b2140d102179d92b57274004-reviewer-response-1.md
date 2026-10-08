<!-- ai-peer-review-template version="1" digest="sha256:78e9a634af9d540baaf6790db82952eaf39cf7ab59a6cdc7938319ae07a4cbed" -->

<!-- protected-frontmatter -->

---
schema: "ai-peer-review.response/v1"
review_id: "review-00f57f62b2140d102179d92b57274004"
role: "reviewer"
turn: 1
commit_mode: "normal"
authority_assurance: "unavailable"
artifact_path: "evidence/portable-runtime/process-source/registration-reviews/170-refreshed-wave2.md"
artifact_commit: "1f473e4d28c37ac1d39ae06e6d6696c2655bcaee"
artifact_blob: "2dbc4f1b29db30b5357312f61a3b956292de67ea"
artifact_digest: "sha256:9de1be99971b6cf54036e21772cc8eede656c4d07b72a2c7e8cfa1b91bb54b2f"
agent:
  host: "claude-code"
  provider: "anthropic"
  model_id: "claude-opus-5-5"
  model_display: "claude-opus-5-5"
  session_fingerprint: "sha256:e82e5af5f36215ea1ff8c59903502e1957b2ee51ec032b99cc7907a4c238ba26"
  identity_source: "runtime"
started_at: "2026-10-08T07:34:11.684Z"
submitted_at: "2026-10-08T07:35:21.247Z"
finding_ids: []
answered_finding_ids: []
acknowledged_supplement_ids: []
---

Mode: `normal`

## Summary

I reviewed the subject `170-refreshed-wave2.md` (artifact commit 1f473e4, blob 2dbc4f1b), the working-tree copies of the declared index and the two registration records, the first-wave subject and registrations for comparison, the approval reader in `test/live/process-source/authority.mjs`, and the host-identity code in `src/protocol/process-identity.mjs`.

What I checked, and what I found:

- **Subject shape.** There is exactly one fenced JSON block. It has schema `ai-peer-review.process-source-registration-review/v1` and keys `schema`, `index` and `captures`. The index path is `evidence/portable-runtime/process-source/registration-index.json`. All three references use the same revision, 2d65f04a. The capture order (bbefe02f…, then c2e5961b…) matches the order of the index entries. The reader `readApprovedIndex` requires all of this: one JSON block, exact keys, `declared.index.revision === approvedRef.revision`, the `sha256:`-prefixed index digest equal to `approvedRef.indexDigest`, the same capture count, and each capture's revision and path equal to the matching index position.
- **Index.** The index has exactly two entries. The paths and capture IDs agree with each other, and each entry digest is a `sha256:` canonical record digest. Those digests differ from the raw-file sha256 values in the subject. That is expected and matches the stated convention: index entries hash canonical records, subject references hash raw files.
- **Windows record (source-bbefe02f…).**
  - Scope: win32, 10.0.26100, x64, Node 26.
  - Probe: `C:\Windows\System32\WindowsPowerShell\v1.0\powershell.exe`, `local-cim-query`, `completed-cim-query-v1`, version sha256:54b68d39…. This is identical to the first-wave Windows Node 24 record.
  - Package: Q d50e64f9, tarball sha256:52dd0693… (same as the first-wave Windows Node 24 record), inventory sha256:67d89771… and contract sha256:524b96e3….
  - `kinds: ["absence"]` and `transitions: []`.
  - The hostId (2e002587…) differs from the first-wave Windows Node 24 record (3ae2d1cc…).
- **Darwin record (source-c2e5961b…).**
  - Scope: darwin, 25.6.0, arm64, Node 26.
  - Probe: `/bin/ps`, `same-user-full-selection`, `exact-ps-selection-v1`, version sha256:62c342e1…. This is identical to the first-wave Darwin Node 24 record.
  - Package: Q, tarball sha256:baa5416c… (same as the first-wave Darwin and Linux records), with the same inventory and contract digests.
  - `kinds: ["absence"]` and `transitions: []`.
  - The hostId (0713f5f3…) differs from the first-wave Darwin Node 24 record (6e0407ba…). This addresses the earlier cloned-hardware collision, where the 8f74ff Darwin Node 24 and Node 26 records shared hostId ad07705d….
- **Darwin host binding.** `darwinExecutionHostBinding` hashes `darwin:<IOPlatformUUID>:<kern.bootsessionuuid>`. It reads `ioreg` and `sysctl` from canonical stock paths, rejects any stderr output, rejects zero UUIDs, and requires exactly one IOPlatformUUID match. This matches the artifact's claim. Windows still hashes the single `Win32_ComputerSystemProduct` UUID through fixed System32 PowerShell, as the artifact says.
- **Scope of the authorization.** The prose limits this approval to absence-only unchanged nonce-child live, clean-owned-exit, absence and error controls. It explicitly excludes any clock, timezone or DST change; source-class admission; PID-reuse creation assurance; provider or descendant discharge; Windows creation or reboot claims; and runtime activation. It does not use caller flags as admission. The records are consistent with this: neither declares `creation` or any transition.
- **Authority chain.** The approval reader re-derives every reference from immutable Git objects: blob OID and raw sha256. It checks the normal-review collateral through `checkNormalRuntimeReview`. It enforces the ancestry index revision → subject revision → finalization → HEAD. It verifies the index and registrations with `verifyProcessSourceIndexCore`. It returns `verified: false` with `registrationAuthority: 'reviewed'` and never trusts approval flags owned by the capture. So a mismatch between this subject's literal values and the committed bytes would fail closed at capture time instead of being admitted.

Verification limits, stated plainly:

- Under the Reviewer Git boundary, and because shell execution was unavailable in this reviewer session, I could not independently recompute the raw sha256 values, the Git blob OIDs, or the canonical index-entry digests. I also could not confirm that the bytes at revision 2d65f04 are identical to the working-tree copies I read. I relied on the fail-closed mechanical recheck described above for those values.
- I did not observe the authenticated hosted run 37741411472 attempt 1, the worker job logs, the downloaded public artifacts, or the worker's run/attempt/Q/Node/package/scope equality check. These are author-attested.
- I did not perform the full-tree comparison from Q through the approval and captureProducerCommit. The artifact correctly frames that comparison as an author-repeated mechanical obligation, and it does not claim the worker's PRODUCERS check covers the whole transitive closure.
- I did not test protection of the C1 private keys or the 40-minute and 60-minute bounds.
- Acceptance here binds only these exact two registration records and this index revision. It is not class admission and not evidence of capture success.

## Findings

None.

## Required changes

None.

## Optional suggestions

1. Unlike the first-wave subject, this subject does not list the exact changed paths since Q at the time of review. If future waves add that list, a reviewer can cross-check the evidence-only boundary without Git access.
2. The tarball digests differ between Windows (52dd0693…) and Darwin/Linux (baa5416c…), while the inventory and contract digests are identical. This is consistent with the first wave and is presumably a per-platform pack-byte difference. A one-sentence statement that the binder pins the tarball per platform would save a future reviewer from re-deriving that.

## Decision

accepted
