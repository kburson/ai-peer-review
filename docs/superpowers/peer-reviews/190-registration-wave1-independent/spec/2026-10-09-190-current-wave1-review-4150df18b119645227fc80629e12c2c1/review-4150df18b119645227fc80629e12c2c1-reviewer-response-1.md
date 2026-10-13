<!-- ai-peer-review-template version="1" digest="sha256:78e9a634af9d540baaf6790db82952eaf39cf7ab59a6cdc7938319ae07a4cbed" -->

<!-- protected-frontmatter -->

---
schema: "ai-peer-review.response/v1"
review_id: "review-4150df18b119645227fc80629e12c2c1"
role: "reviewer"
turn: 1
commit_mode: "normal"
authority_assurance: "unavailable"
artifact_path: "evidence/portable-runtime/process-source/registration-reviews/190-current-wave1.md"
artifact_commit: "5e02025b0faf9d6fae1c72fa4a2fa303104ae52c"
artifact_blob: "2c92fd04de4fb198e44b2e0f742c06427f628430"
artifact_digest: "sha256:4c2e4daa5910630a3f1da3204f8b7d911b92c53d032a39a92127f0bec123b97f"
agent:
  host: "claude-code"
  provider: "anthropic"
  model_id: "claude-sonnet-5-5"
  model_display: "claude-sonnet-5-5"
  session_fingerprint: "sha256:178f8392def0a12f77adf5086eeb6bbe541e3c648626343f2796883037f05a5e"
  identity_source: "runtime"
started_at: "2026-10-09T13:06:56.608Z"
submitted_at: "2026-10-09T13:07:42.005Z"
finding_ids: []
answered_finding_ids: []
acknowledged_supplement_ids: []
---

Mode: `normal`

## Summary

I read the artifact, the working-tree registration index, and all six registration JSON files. I checked them for internal consistency against the artifact's scope table and prose. Shell hashing was denied in this session and Git is forbidden to the reviewer, so I did not recompute any sha256 or Git blob. I also did not check the GitHub Actions run 37932795095. Those parts of the artifact's pins are unverified by me. They remain a mechanical check for the author's tooling and for class review.

What I verified:

- The index lists exactly six captures. Each index path matches an existing file in `registrations/`. Each file's `captureId` equals its index entry and its filename.
- Platform, build, architecture, Node major and kind match the artifact table for all six:
  - 180f: linux x64 Node 26 absence
  - 2e4f: linux x64 Node 24 creation
  - 524a: linux x64 Node 24 absence
  - 656f: linux x64 Node 26 creation
  - 74e9: darwin arm64 25.6.0 Node 24 absence
  - 79b5: win32 x64 10.0.26100 Node 24 absence
- Every registration pins the same `sourceCommit` 17c64188…, `inventoryDigest` f53f4cbf… and `contractDigest` bf401a6e…. The contract digest equals the current contract the artifact names. The tarball digest is 1558… for all Linux and Darwin entries and 89bc… for Windows. A platform-specific tarball for Windows is plausible, and I flagged it only for class review.
- Scope is finite and matches the stated controls:
  - Linux uses `/proc`, `full-pid-namespace`, `exact-pid-directory-v1` and `procfs-v1`.
  - Darwin uses `/bin/ps`, `same-user-full-selection` and `exact-ps-selection-v1`, with a digest-pinned probe version.
  - Windows uses the PowerShell CIM query with a digest-pinned version.
- Only the two Linux creation registrations (2e4f and 656f) carry transitions: `clock-forward`, `clock-backward`, `timezone` and `dst`. These map one-to-one to the clock and zone controls in the prose. Every absence registration has `transitions: []`. Darwin and Windows therefore authorize no clock change, as the artifact states.
- Each registration carries only a public key and a key ID. The files contain no private bindings, credentials or provider handles.
- Each registration has a distinct `keyId` and public key. The two Linux pairs on the same worker (2e4f with 524a, and 180f with 656f) share a `hostId` but not a key. That is consistent with one prepared worker running one absence and one creation capture. The three other `hostId` values are distinct.
- The artifact authorizes nothing beyond existing Linux creation controls on disposable workers after privilege and restoration preflight. It leaves no activation, provider, reboot or descendant claim. It treats missing authority as unavailable, never as skipped success. I found no widened or synthetic coverage.

## Findings

None.

## Required changes

None.

## Optional suggestions

1. Add the expected tarball digest per platform (1558… for Linux and Darwin, 89bc… for Windows) to the artifact prose. A class reviewer could then confirm that the Windows difference is intended without reading the JSON.
2. State in the artifact that two of the six registrations share a `hostId` with another registration, which is why four workers yield six captures. This matches the "4 actual prepared workers" claim. A reader would otherwise have to infer it from the JSON.
3. Class review should recompute the six registration sha256 values and the index sha256, and compare them to the pinned values. The index's per-entry `digest` values should be rechecked at the same time. I could not do this in this session.

## Decision

accepted
