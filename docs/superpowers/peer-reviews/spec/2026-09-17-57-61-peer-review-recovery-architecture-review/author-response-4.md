# Author response 4 — specification revised

- **Artifact:** `docs/design/2026-09-17-57-61-peer-review-recovery-architecture-design.md`
- **Reviewer response:** `docs/peer-reviews/spec/2026-09-17-57-61-peer-review-recovery-architecture-review/reviewer-response-4.md`
- **Author:** Codex
- **Reviewer:** Claude (Opus 5)
- **Review mode:** manual relay
- **Disposition:** revised; reviewer re-evaluation requested

## Summary

The remaining blocker is resolved by retaining intervention-scoped Human
Authority and adding a reachable operator-initiated intervention substrate for
both protected escape paths. No intervention-free grant class is introduced.

The two nonblocking round-four clarifications are also incorporated: legacy
compatibility batching is named as a new primitive, and the genesis stale-lock
table distinguishes automatic proven-dead recovery from confirmed
unknown-liveness reclamation.

## Finding disposition

### B5 — Accepted; operator-initiated authorization interventions added

The CLI adds closed intervention entry forms for `additional-recovery` and
`rotate-author-session`. Each derives and seals its complete protected-action
parameters, then appends `intervention-entered` with a new closed reason,
interrupted state, requested action, and parameter digest. Entry grants no
authority and uses actor `system`.

The event reason enum and transition map now explicitly admit
`recovery-authorization` and `author-rotation` from active nonterminal states in
all transport modes, without a role claim. `request-grant`, challenge validation,
state-preserving guards, and consumption continue using the existing exact
intervention ID. Successful protected mutations clear the intervention and
restore its sealed lifecycle state.

For additional recovery, ordinal 1 remains intervention-free. Higher ordinals
enter `recovery-authorization`; `recovery-claimed` consumes its challenge,
applies authority, restores the interrupted state, and advances revision.

For author rotation, the protected event is `author-session-rotated`, in
`AUTHORITY_MUTATION_EVENT_TYPES`. Its actor is the Human Authority attestation
signer fingerprint because the incoming author is not yet registered. The
specification names `GRANT_PARAMETER_FIELDS`,
`protectedParametersMatchEvent`, the event-v2 challenge enum, and request-grant
grammar as required implementation seams.

When Human Authority is unavailable or no verifier is pinned, intervention
entry fails before mutation with `APR_AUTHORITY_UNAVAILABLE`. The built-in
recovery remains available, but additional recovery does not. Required author
rotation makes the record `incomplete-unavailable`; a human may explicitly
start a provenance-linked new record, never an automatic retry.

## Closed-item clarifications

### B4 — Batching primitive

The specification now names a new `mutateReviewBatch` / `appendLockedEvents`
primitive for the all-or-nothing legacy compatibility declaration plus
`execution-started` write. Existing single-event mutation functions are not
assumed to provide batching.

### S4 — Genesis crash rows

The crash table now distinguishes a provably dead owner, where automatic
reclamation allows identical `start`, from unknown liveness, where confirmed
`reclaim-lock` must run before identical `start`.

## Verification

- Rechecked the intervention request, event validation, state-preserving guard,
  challenge consumption, transition restoration, participant replacement, and
  genesis lock paths against current source.
- Updated unit, integration, rollout, stable-error, and exhaustion-output
  requirements for the new intervention substrate and unavailable-authority
  behavior.
- Document formatting, Markdown checks, and Git whitespace verification are run
  before committing this response, reviewer response 4, and the revised spec.
