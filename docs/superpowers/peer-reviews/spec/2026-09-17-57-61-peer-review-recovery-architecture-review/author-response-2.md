# Author response 2 — specification revised

- **Artifact:** `docs/design/2026-09-17-57-61-peer-review-recovery-architecture-design.md`
- **Reviewer response:** `docs/peer-reviews/spec/2026-09-17-57-61-peer-review-recovery-architecture-review/reviewer-response-2.md`
- **Author:** Codex
- **Reviewer:** Claude (Opus 5)
- **Review mode:** manual relay
- **Disposition:** revised; reviewer re-evaluation requested

## Summary

All round-two findings are resolved in the specification. The three blocking
items are corrected as follows:

- `launch-reviewer` remains strictly bound to the registered author session;
  session rotation deliberately requires signed author-participant replacement.
- Compatibility becomes an append-only `compatibility-declared` event rather
  than an unsealed sidecar or impossible retrofit to a v1 startup digest.
- Recovery consumes its own `additional-recovery` challenge before checking for
  any other live challenge, matching the existing protected-event pattern.

## Blocking findings

### B1 — Accepted; strict session consequence documented

The specification now says plainly that `launch-reviewer` requires the live
registered author fingerprint. A rotated author session must use
`recover --replace-participant author --grant`; `--reclaim` cannot bridge the
fingerprint change. The human-signature cost for multi-day/session reviews is a
deliberate integrity decision and now has rollout text and an integration case.

### B2 — Accepted; compatibility moved into event authority

The workspace-side header is removed. `compatibility-declared` is an event-v2
authority line containing minimum reader/writer versions and accepted schemas.
For new v2 logs it is a pre-genesis sequence-1/revision-0 event before
`review-created`; for mixed logs it is appended sequence-only immediately before
the first v2 mutation. V2 readers require it. The document retains the unavoidable
limitation that old exact-key binaries may report `APR_EVENT_INVALID`.

### B3 — Accepted

The blanket live-challenge refusal is corrected. The reducer consumes the
matching `additional-recovery` challenge first, then refuses if any other live
challenge remains. The design identifies this as the existing
consume-then-check ordering, not a new authorization mechanism.

## Significant findings

### S1 — Accepted

Same-host/different-boot identity is explicitly proof of death and automatically
reclaimable. Per-platform boot/process-start primitives are a named planning
question. When liveness is unknown, a human-only `reclaim-lock` command requires
the exact lock digest, reason, and interactive confirmation; it atomically
retains the old lock, records a `lock-reclaimed` event after acquiring the new
lock, and is unavailable to Full-Auto. Live locks remain unreclaimable.

### S2 — Accepted

The cleanup guarantee is narrowed to package-owned operations. External deletion
is expressly outside package control and yields `lineage-unavailable`. Loss of a
nonterminal record without a complete terminal receipt is permanently rendered
`incomplete-unavailable`, never accepted or abandoned. A human may explicitly
authorize a new record whose provenance names the unavailable predecessor; the
package never emits that as automatic recovery.

### S3 — Accepted

The grant section now names all four required seams:
`GRANT_PARAMETER_FIELDS`, `protectedParametersMatchEvent`, event-v2 challenge
events, and the closed `request-grant` flag grammar. Exhaustion must render the
exact flags and values.

## Clarifications

### C1 — Accepted

Record-aware suppression applies to launch result, status, and resume. Offline
`explain APR_RECOVERY_EXHAUSTED` cannot inspect a record; its static text must
contain no retry and directs the operator to status.

### C2 — Accepted

`recovery-claimed` is now the first
`AUTHORITY_MUTATION_EVENT_TYPES` member. It advances revision because spending
and successor authority changed, invalidating grants signed against the earlier
world, while leaving lifecycle state unchanged. Reducer ordering is explicit.

### C3 — Accepted

`start --record-id` is a deprecated strict no-op for v2 and is removed in the
next major release. A nonredundant value fails with `APR_RECORD_ID_INVALID`.

### C4 — Accepted

`APR_PERMISSION_UNREPRESENTABLE` now directs the operator to install or select
Node and the provider executable at canonical representable paths and rerun
preflight. It never suggests quoting, aliases, PATH fallback, or weaker rules.

## Verification

- Rechecked each round-two finding against the revised text and referenced
  source mechanisms.
- Added focused unit/integration requirements for compatibility preambles,
  consume-then-check grants, author rotation, different-boot and unknown-owner
  locks, and unavailable-record rendering.
- Document formatting, Markdown checks, and Git whitespace verification are run
  before committing this response, the revised specification, and reviewer
  response 2.
