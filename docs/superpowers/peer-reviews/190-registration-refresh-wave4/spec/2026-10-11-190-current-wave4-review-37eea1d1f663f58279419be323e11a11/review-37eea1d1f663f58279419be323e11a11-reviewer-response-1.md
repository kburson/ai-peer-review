<!-- ai-peer-review-template version="1" digest="sha256:78e9a634af9d540baaf6790db82952eaf39cf7ab59a6cdc7938319ae07a4cbed" -->

<!-- protected-frontmatter -->

---
schema: "ai-peer-review.response/v1"
review_id: "review-37eea1d1f663f58279419be323e11a11"
role: "reviewer"
turn: 1
commit_mode: "normal"
authority_assurance: "unavailable"
artifact_path: "evidence/portable-runtime/process-source/registration-reviews/190-current-wave4.md"
artifact_commit: "c6b6485dc17cfc5f632a658bdb50c627a4384c66"
artifact_blob: "3942f67518474c6884049faa7340fd57432e1301"
artifact_digest: "sha256:803b017f9907ebdc889a635ae4af6e2c8adf212702707c040438c5d110121029"
agent:
  host: "claude-code"
  provider: "anthropic"
  model_id: "claude-opus-5-5"
  model_display: "claude-opus-5-5"
  session_fingerprint: "sha256:c20153efec3e0ee66d921ee05aab2a27b49f1d74a4658c0d1c4358aafb81b0c5"
  identity_source: "runtime"
started_at: "2026-10-11T01:00:39.099Z"
submitted_at: "2026-10-11T01:01:46.684Z"
finding_ids: []
answered_finding_ids: []
acknowledged_supplement_ids: []
---

Mode: `normal`

## Summary

Reviewed the registration subject `190-current-wave4.md` (artifact blob `3942f675…`) and the four public registration records plus the registration index it pins at revision `137c39a97ba20250c3066d1bf5deb85a49a2eae5`. I read the current working-tree copies of those paths and checked them against the subject's table and prose, against the generator and validator in `test/live/process-source/package.mjs` and `records.mjs`, and against the accepted wave3 precedent (`190-current-wave3.md` and its registrations).

What I checked and found consistent:

- **Set and count.** The index lists exactly the four capture IDs in the subject table, with paths under `evidence/portable-runtime/process-source/registrations/`. Nothing is added or left out.
- **Worker count.** Two Linux registrations (`source-3234c860…` absence and `source-6cabf7ee…` creation) share hostId `sha256:d91bbe7a…`. Each has its own public key and keyId. macOS (`8102add8…`) and Windows (`3269b8ab…`) each have their own hostId. That gives three distinct hosts and four registrations, which matches "3 genuine GitHub hosted workers". It also matches the wave3 pattern, where one Linux worker produced both an absence and a creation registration under the same hostId.
- **Package binding.** All four records have `sourceCommit` `11c83fa0…` and `contractDigest` `sha256:505bc7fe…`, which equals the stated current production contract. All four have the same `inventoryDigest` `sha256:e3c4c6c1…`. Linux and macOS share `tarballDigest` `sha256:7a5417fb…`, the same value the wave3 Linux captures recorded. Windows has a different `tarballDigest` (`sha256:55d4c05b…`) but the same inventory. Each worker packs its own archive (`package.mjs` hashes the bytes it packed), so a different compressed archive with the same member inventory is expected on Windows and does not widen the source.
- **Scope.** Every record has `nodeMajor` 24, and platform/build/architecture match the table exactly: linux 6.17.0-1022-azure x64, darwin 25.6.0 arm64, win32 10.0.26100 x64. The probe for each record is the fixed stock one for its platform: `/proc` procfs-v1, `/bin/ps` with a pinned sha256 version, and the System32 `powershell.exe` CIM query with a pinned sha256 version.
- **Capabilities.** The darwin and win32 records are `kinds: ["absence"]` with empty transitions, matching "Windows and macOS registrations permit absence only". The Linux absence record has no transitions. Only the Linux creation record declares transitions, and its set `clock-forward`, `clock-backward`, `timezone`, `dst` maps one-to-one onto the authorized controls: ±90-second UTC steps, the America/New_York to America/Detroit zone change, and January/July seasonal DST observation.
- **No secrets.** The records hold only public Ed25519 SPKI keys (base64 `MCowBQYDK2VwAyEA…`) and their sha256 keyIds. There is no private key, binding, credential or provider handle.
- **Index digests.** The index `digest` values differ from the raw-file sha256 values in the subject's JSON. This is expected: `records.mjs` computes index entries as `processSourceRecordDigest` over canonical bytes, while the subject's `sha256` field pins raw blob bytes. The two are checked separately and are not in conflict.
- **Prose limits.** The text restates that registration authorizes capture only, not class approval or operational admission. It keeps Linux manual review explicitly excluded and not fabricated, and it keeps clock/privilege changes limited to disposable hosted Linux creation controls after preflight. The historical 524b/bf401a6e classes are declared non-admitting. I found no widening compared with the accepted wave3 wording; apart from the table and pins, the prose is identical.

Limitation: under this session's constraints (no Git, and shell hashing unavailable) I could not recompute git blob IDs or sha256 values of the bytes at revision `137c39a`. My checks cover the working-tree copies at the pinned paths. Exact pin equality depends on the mechanical import check, which the subject says runs before import.

## Findings

None.

## Required changes

None.

## Optional suggestions

1. The opening says "3 genuine GitHub hosted workers" while the table lists 4 captures. A short note that the two Linux captures (absence and creation) come from one worker under one hostId would let a reader check the worker count without opening the records.
2. A one-line note that the Windows `tarballDigest` differs because the archive is packed per worker (same `inventoryDigest`) would head off a false inconsistency report in later class review.

## Decision

accepted
