<!-- ai-peer-review-template version="1" digest="sha256:78e9a634af9d540baaf6790db82952eaf39cf7ab59a6cdc7938319ae07a4cbed" -->

<!-- protected-frontmatter -->

---
schema: "ai-peer-review.response/v1"
review_id: "review-d78eaced00dc6bc0f0dcff9c21885a27"
role: "reviewer"
turn: 2
commit_mode: "normal"
authority_assurance: "unavailable"
artifact_path: "docs/superpowers/specs/2026-10-12-190-posix-read-pair-design.md"
artifact_commit: "edd2413ea4f40659824199c5c1cdc8c691249e29"
artifact_blob: "7e2929c1505cffaac33ad47bbfa7879d51079c26"
artifact_digest: "sha256:3a4fae814b85411f7dd7d86559da35d14ae2f5e8cbfcc87c1bbe538df620668f"
agent:
  host: "claude-code"
  provider: "anthropic"
  model_id: "claude-opus-5-5"
  model_display: "claude-opus-5-5"
  session_fingerprint: "sha256:aba3939cb10852e81c08dd53b270d2a597b6729050bfdc0e4c11ee476461d0cf"
  identity_source: "runtime"
started_at: "2026-10-12T15:27:20.340Z"
submitted_at: "2026-10-12T15:38:00.038Z"
finding_ids: []
answered_finding_ids: []
acknowledged_supplement_ids: []
---

Mode: `normal`

## Summary

I re-reviewed the revised artifact at commit `edd2413`. I checked it against
author response 1 and against the current source:
`src/broker/storage-protection.mjs`, in particular `verify` (lines 988-1001),
`readObserved` (lines 1058-1145) and `close` (lines 2029-2049).

**Both turn-1 required changes are resolved.**

1. **After-read ENOENT.** Artifact lines 45-49 now require a fresh guard
   `verify` before `ENOENT` is preserved in either phase, explicitly including
   after the bounded read. Root or ancestor loss refuses with a non-`ENOENT`
   error, so only a namespace that still verifies can report a missing leaf.
   This keeps today's POSIX semantics, where after-phase `verify()` precedes
   `matchFile`. It also closes the gap in the Windows after-phase at
   `storage-protection.mjs:1115`, which is currently unwrapped. The
   implementation is straightforward: `verify()` already maps every inner
   failure to `root-protection-changed`, and the outer catch turns that into a
   non-`ENOENT` refusal.
2. **Closed guard.** Artifact lines 49-50 retain the `closed` refusal
   immediately before and after each pair call, and require that a concurrent
   `close()` never returns successful data. That restores the deterministic
   refusal the POSIX after-phase `verify()` gives today. It no longer depends on
   descriptor-close races in `close()`'s held-file iteration.

**Required controls.** The artifact adds the ones I asked for, on macOS and
hosted Linux/Windows (lines 53-57):

- genuine root or ancestor removal or rename between the bounded read and the
  after-phase pair;
- a concurrent close.

The expected outcomes are stated: a non-`ENOENT` refusal, no successful return,
and descriptor obligations either discharged or truthfully retained.

**Windows.** The author chose to apply both corrections to Windows rather than
document the asymmetry. That is the stronger option and is within the bounded
read-pair change. It adds cost only on the missing-path branch, where `verify()`
runs one root inspection. It does not change success-path counts, so the
16/32/16→1/15/30 coverage gate is unaffected.

**Optional suggestions.** All four are addressed:

- the Linux ACL-key wording (lines 41-43);
- `statfs`/`access` are now named (line 22);
- second-store identity replay versus full rehash is documented (lines 102-105);
- the count-gate spacing is fixed (lines 121-122).

**No regressions.** The rest of the design is unchanged from turn 1, where I had
verified it against source. That covers root fingerprint reproducibility, root
policy strictness, the 4 → 2 command projection, inventory-scan ordering and
bracketing, and the fallback replay binding. The revision introduces no new
public port, error shape, budget change or retained observation.

## Findings

None.

## Required changes

None.

## Optional suggestions

1. **Close-race control assertion.** In the concurrent-close control, also
   assert that the descriptor opened by the in-flight read, between `open` and
   `heldFiles.set`, is either closed or reported as a `descriptor-close-pending`
   obligation. It must not remain open and untracked after `close()` resolves.
   The artifact's "discharged or truthfully retained" already implies this.
   Making the assertion concrete would pin the narrowest window.

## Decision

accepted
