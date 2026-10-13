<!-- ai-peer-review-template version="1" digest="sha256:78e9a634af9d540baaf6790db82952eaf39cf7ab59a6cdc7938319ae07a4cbed" -->

<!-- protected-frontmatter -->

---
schema: "ai-peer-review.response/v1"
review_id: "review-d78eaced00dc6bc0f0dcff9c21885a27"
role: "reviewer"
turn: 1
commit_mode: "normal"
authority_assurance: "unavailable"
artifact_path: "docs/superpowers/specs/2026-10-12-190-posix-read-pair-design.md"
artifact_commit: "86e3bd766cca35bf5aa72134bc67d0b7cf9acf18"
artifact_blob: "3628c87b8569b4384e76733603ebd3d62b11aced"
artifact_digest: "sha256:ff734fee9a8e672a6cdd4323bd6485a28a2f9f4c080e7638390c4bfe8c98c7da"
agent:
  host: "claude-code"
  provider: "anthropic"
  model_id: "claude-opus-5-5"
  model_display: "claude-opus-5-5"
  session_fingerprint: "sha256:aba3939cb10852e81c08dd53b270d2a597b6729050bfdc0e4c11ee476461d0cf"
  identity_source: "runtime"
started_at: "2026-10-12T15:27:20.340Z"
submitted_at: "2026-10-12T15:31:38.768Z"
finding_ids: []
answered_finding_ids: []
acknowledged_supplement_ids: []
---

Mode: `normal`

## Summary

I reviewed the artifact at commit `86e3bd7` independently against the current
source:

- `src/broker/storage-protection.mjs`: `inspectAncestors`, `inspect`,
  `inspectWindowsReadPair`, `parseMacAclBatchCore`/`parseMacRules`,
  `macAclBatch`, `openProtectedRoot` (`verify`, `readObserved`, `matchFile`,
  `close`).
- `src/config/runtime-selection-core.mjs`: `installation`,
  `assertSelectedWithin`, `finish`, and the scope finalizer/witness.
- `src/startup/runtime-inventory.mjs`: `observeRuntimeInventory`, both the
  replay and the full path.
- `test/helpers/selection-scope-operation-report.mjs`: the closed name set and
  the 15/30 delta rule.

I also read the preserved predecessor review `review-500bb9bb…` (reviewer
response 2). All three of its required changes are now reflected in the
artifact:

- the `processInventory ?? previousObservation?.inventory` fallback on the final
  scan;
- the pure target-list builder with parser-level `acl-positive-grant-unproved`;
- the 2 → 1 scan projection, with the unchanged scan sites listed and the call
  count required before adoption.

Both of its optional suggestions are also taken: separate adoption, and the
statement that nothing reads the discarded intermediate.

Points I verified as sound:

- **Root fingerprint equality.** The pair can reproduce the bound fingerprint
  exactly. `inspect(root,'directory')` already queries the ancestors with
  `ancestor: true` and the root with `ancestor: false`. `parseMacRules` returns
  the same `{subject, kind, rights}` list whichever flag is used; the flag only
  changes what is refused. The observation key order
  `root, kind, type, principal, identity, ancestry, acl, trustedAllowances` and
  the `{path, identity, mode, uid[, acl]}` ancestry entries are reproducible.
- **Root policy.** Applying the leaf policy to the root is strictly stricter
  than the ancestor policy. Every ancestor-dangerous right is a
  non-inherit-flag right. The root already receives the leaf policy today
  through `verify()`, so no currently-accepted root becomes refused.
- **Root owner/mode.** The pair's root check (`uid === euid`, mode `0700`)
  subsumes the root-as-ancestor check (`uid ∈ {euid, 0}`, sticky rule) that
  `inspect(file)` applies today.
- **Command count.** The 4 → 2 per-read count is correct. Today a successful
  POSIX read is `verify` + `inspect(file)` + `verify` + `matchFile`, which is
  four `inspect` calls and, on macOS, four `/bin/ls -ldne` calls. The
  missing-file cost is unchanged at one command.
- **Inventory merge.** The merge is safe in ordering terms. The removed
  `verifyRuntimeInventory` result at `runtime-selection-core.mjs:534` is
  discarded. The remaining `installation(op)` runs after the second snapshot.
  `assertProtectedSnapshotUnchanged(reselectedRead.snapshot)` then brackets it
  before any result is minted, in both scoped and unscoped modes. The identity
  tuple includes `ctimeNs`, so an ABA revert between the two former scan points
  is still caught.
- **Diagnostic deltas.** The 15/30 deltas stay binding. Reads contribute equally
  to both modes (32 snapshots each), so moving POSIX reads from
  `inspect`/`matchFile` to a new helper leaves the
  `observeStorageProtection`/`openProtectedRoot`-driven deltas unchanged.

Two behaviours that the current POSIX path gets from calling `verify()` around
each phase are not carried into the proposed pair. The Windows template the
design extends does not have them either. Both are cheap to keep, but the
design needs to say so explicitly, because it claims that "all current checks"
and the after-read checks remain.

## Findings

1. **After-read ENOENT would bypass fresh root verification and could misreport a vanished root as a missing file (correctness).**
   Today, the POSIX after-read phase calls `await verify()` first, then
   `matchFile` (`storage-protection.mjs:1130-1131`). So whenever the after phase
   surfaces `ENOENT`, a fresh root verification has already succeeded. If the
   root itself vanished, `verify()` throws `root-protection-changed`, which
   becomes `private-file-unproved` instead of `ENOENT`.

   The Windows template wraps only the before-phase pair with
   `if (error.code === 'ENOENT') await verify()` (lines 1069-1074). The
   after-phase pair at line 1115 is unwrapped. Any `ENOENT` from it reaches the
   outer catch, which rethrows raw `ENOENT` (line 1142). That includes `ENOENT`
   from `inspectAncestors(root)` or `sameCanonical(root)` when the root or an
   ancestor was removed after the read.

   The design says that "Missing file handling still freshly verifies the root
   before preserving ENOENT". It does not say this applies to the after phase.
   An implementation that mirrors the Windows `readObserved` branch would
   therefore regress POSIX. It would report "file absent" for a root that
   disappeared mid-read, with no fresh root verification. Callers that treat
   `ENOENT` as absence would then act on an unverified namespace.

2. **The `closed`-guard refusal performed by `verify()` is not listed among the per-phase checks (correctness / preservation).**
   `verify()` refuses `protected-root-closed` when `close()` has run
   (line 990). Today the POSIX path runs it in both phases. The after-phase run
   is the one that deterministically refuses a read when `close()` ran
   concurrently with the descriptor open/read. The top-of-function check at
   line 1063 does not cover that window.

   The Windows pair has no `closed` check after line 1063. In that case it
   relies on descriptor side effects: `directory.stat` or `file.stat` failing
   after `close()` closed them. That is race-dependent. `close()` awaits each
   held-file close before closing the directory, and a file opened but not yet
   placed in `heldFiles` (between lines 1085 and 1096) is not closed by an
   in-progress `close()` iteration.

   The design's per-phase list (ancestry, root, file, effective identity,
   owner/mode, link count, access, descriptor identities, fingerprint, retained
   directory descriptor) omits this check. Dropping it would be a silent loss of
   a current check, contrary to "Preserve all current checks".

## Required changes

1. **After-phase ENOENT.** In the read-pair paragraph, state that the after-read
   phase uses the same rule as the before phase. Any `ENOENT` from the POSIX pair
   in either phase first runs a fresh `verify()` and preserves `ENOENT` only if
   that succeeds. Add an affected C1 control on macOS and on hosted Linux:
   remove or rename the root (or an ancestor) after the bounded read and before
   the after-phase pair. The read must refuse with a non-`ENOENT` error, and the
   descriptor cleanup obligation must be honoured.
2. **Closed-guard check.** State that each POSIX pair phase retains the
   `closed` refusal now provided by `verify()`, for example by checking `closed`
   immediately before or after each pair call. Add a control that calls
   `close()` concurrently with an in-flight read and requires refusal, never a
   successful return.

   Whether the Windows branch receives the same two corrections can stay out of
   scope. If so, say so explicitly so the asymmetry is deliberate.

## Optional suggestions

1. **Linux ACL key wording.** Line 41 says the file ancestry includes the root
   "with its actual identity, mode, owner and ACL". On Linux, the root entry in
   today's `inspect(file)` ancestry has no `acl` key, because it is an ancestor
   produced by `inspectAncestors`. No consumer reads the file ancestry; only
   `identity` and `fileVersion` are compared. Still, state "ACL (macOS only;
   Linux ancestry entries, including the root entry, keep no ACL key)" so the
   "same file generation observation" claim is literally true.
2. **"Stock filesystem checks" wording.** Line 23's "Linux retains both existing
   stock filesystem checks" is ambiguous, since Linux runs no stock command.
   Name them as `statfs` and `access`, which lines 33-35 already describe.
3. **Second-store replay.** Note one side effect of the final-scan fallback. In
   a second store whose `processInventory` is null, the final scan today is a
   full rehash. With
   `previousObservation: processInventory ?? previousObservation?.inventory` it
   becomes the identity-replay path. That path checks generations, metadata and
   closure, and refuses a changed digest. It does not rehash file bytes. This
   matches every subsequent in-store call and is probably intended, but say so,
   so that "one final current-source validation" is not read as a full rehash.
4. **Editorial.** Line 107-108 has missing spaces: "exact16", "admissions,32",
   "unchanged15/30".

## Decision

revisions-requested
