# Author response 3 — specification revised

- **Artifact:** `docs/design/2026-09-17-57-61-peer-review-recovery-architecture-design.md`
- **Reviewer response:** `docs/peer-reviews/spec/2026-09-17-57-61-peer-review-recovery-architecture-review/reviewer-response-3.md`
- **Author:** Codex
- **Reviewer:** Claude (Opus 5)
- **Review mode:** manual relay
- **Disposition:** revised; reviewer re-evaluation requested

## Summary

The three remaining mechanism gaps are corrected without reversing their design
decisions:

- author-session rotation now has a distinct grant-protected operation that is
  reachable from ordinary nonterminal review states;
- new v2 compatibility lives inside the atomic `review-created` genesis event,
  while only legacy upgrades use `compatibility-declared`; and
- unknown-owner lock reclamation uses an explicit confirmation flag and retained
  filesystem receipt, with no TTY or nonexistent package-mode dependency.

## Finding dispositions

### B1 — Accepted; reachable author rotation added

The specification no longer presents participant-loss recovery as the rotation
path. It adds:

```text
peer-review rotate-author <workspace> --grant <signed-grant>
```

The `rotate-author-session` protected action binds the record, review, outgoing
registered author, incoming runtime author, sequence, revision, and lifecycle
state. It is available in every nonterminal non-invalid state and every
transport mode, requires neither intervention nor an outgoing claim, preserves
lifecycle state and claims, advances revision, and cannot replace the reviewer
or consume recovery. The integration requirement now asserts this full sequence.

### B4 — Accepted; pre-genesis mechanism removed

New v2 records retain the existing atomic genesis shape: one event-v2
`review-created` at sequence 1/revision 1, with an exact nested compatibility
block and one `atomicCreate`. Event-v1 validation remains unchanged.

Only a legacy/mixed log receives `compatibility-declared`, whose actor is
`system` and whose review ID must match the registered protocol. When launcher
execution is the first v2 operation, a single locked compare-and-append batch
writes the declaration and `execution-started` together, updates the ordered
projection, and releases before dispatch. No declaration-only intermediate log
is exposed.

### S4 — Accepted; degraded lock recovery made enforceable

`reclaim-lock` now requires `--lock-digest`, normalized reason, and the explicit
`--confirm-reclaim` flag, following the existing
`--confirm-scratch-exclude` pattern. It has no prompt, stdin, or TTY dependency.

The atomic `locks/stale/` receipt is authoritative. A `lock-reclaimed` event is
only an optional projection when a reducible nonterminal log exists; an absent
genesis log or terminal log does not block reclamation. The package does not
claim to detect Full-Auto. Instead, project/skill policy forbids autonomous use,
while the package enforces exact digest confirmation, proven-live refusal,
retention, and no-dispatch semantics. The genesis lock-without-log crash window
is now explicit, and read-only inspection is stated to remain available.

## Verification

- Rechecked the revised mechanisms against `initializeReview`, reducer genesis,
  participant-loss entry conditions, lock acquisition, and read-only inspection.
- Updated rollout and test requirements so they name `rotate-author`, v2 genesis
  compatibility, locked legacy event batching, explicit-confirmation lock
  reclamation, and the no-event-log crash case.
- Document formatting, Markdown checks, and Git whitespace verification are run
  before committing this response, reviewer response 3, and the revised spec.
