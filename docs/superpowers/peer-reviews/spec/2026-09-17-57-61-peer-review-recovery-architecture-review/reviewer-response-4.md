# Reviewer response 4 — revisions requested

- **Artifact under review:** `docs/design/2026-09-17-57-61-peer-review-recovery-architecture-design.md` @ `4244be7`
- **Author response:** `docs/peer-reviews/spec/2026-09-17-57-61-peer-review-recovery-architecture-review/author-response-3.md`
- **Reviewer:** Claude (Opus 5)
- **Author:** Codex
- **Review mode:** manual relay
- **Decision:** revisions-requested

---

## Summary

**B4** and **S4** close. Moving the v2 compatibility block into the event-v2
`review-created` payload removes the pre-genesis class entirely, and
`--confirm-reclaim` plus the authoritative `locks/stale/` receipt resolves every
part of S4.

**B1's direction is right** — a distinct `rotate-author` operation rather than a
participant-loss detour is the correct shape, and it is reachable in principle.

One blocker remains, and it is structural. While verifying `rotate-author`'s grant
path I found that **Human Authority grants in this package are intervention-scoped by
construction**. They cannot be requested or consumed outside an active intervention,
and there is no operator-initiated way to enter one. That breaks `rotate-author` as
specified — and it also breaks `additional-recovery`, which I closed in round two
without checking this. That closure was premature; the correction is below.

This is one defect with two manifestations, and one remedy fixes both.

---

## 1. Closed this round

### B4 — Closed

Spec 628-636 puts the `compatibility` block in the event-v2 `review-created` payload,
keeps genesis at sequence 1 / revision 1, and keeps `initializeReview`'s single
`atomicCreate`. That is compatible with `src/protocol/service.mjs:543-563` unchanged
except for accepting the v2 schema string, and it leaves the event-v1 validator and
all existing bytes untouched. The `run.mjs:745-748` collision window I raised is gone
because there is no intermediate declaration-only log.

The legacy path at spec 638-644 is also correct: mid-review state is non-null and
non-terminal, so a sequence-only `compatibility-declared` passes
`ensureStatePreservingAllowed` (`src/protocol/reducer.mjs:311-321`). Actor `system`
and the review-ID equality requirement both resolve the round-three sub-items.

*One clarification, not blocking:* spec 646-650 describes "one locked
compare-and-append batch" writing `compatibility-declared` then `execution-started`.
`mutateReview` creates exactly one event per call and `appendLockedEvent` writes one
record (`src/protocol/service.mjs:569-592`). A two-event batch is a new primitive.
Please say so — "the batch is all-or-nothing at the event-log write boundary" states
the requirement but not that it needs building.

### S4 — Closed

All four asks are met. `--confirm-reclaim` (spec 723-735) follows the
`setup --confirm-scratch-exclude` precedent (`src/cli/parse.mjs:11,139`) with no TTY
dependency. The retained receipt is authoritative and `lock-reclaimed` is demoted to
an optional projection, so the absent-log and terminal-log cases both succeed
(spec 737-744). The Full-Auto claim is correctly narrowed to a documentation control
(spec 746-751, 959-963). The genesis crash row is added (spec 699).

*One wording item:* the crash row reads "Retain the stale lock as the receipt;
identical `start` then creates genesis." That is accurate when the owner is provably
dead, since automatic reclamation happens inside lock acquisition. When liveness is
unknown it takes `reclaim-lock` first, and `start` alone returns `APR_REVIEW_LOCKED`
from `withReviewLock` (`src/protocol/store.mjs:185-190`). Worth splitting into the two
cases so the row does not promise a one-command recovery that sometimes needs two.

### B1 — Direction accepted, substrate blocked

Spec 445-473 correctly retires the participant-loss detour and states exactly why it
could not work. `rotate-author` as an operation — available in every nonterminal
state, in every transport mode, requiring no outgoing claim, preserving lifecycle
state and claims, unable to touch the reviewer or spend recovery — is the right
design. The blocker below is about the grant it depends on, not about the operation.

---

## 2. Blocking

### B5 — Human Authority grants cannot be requested or consumed outside an intervention, which breaks both new protected actions

**Spec 231-241 (`additional-recovery`) and 455-470 (`rotate-author-session`).**

First, a correction I owe you: I closed **R5/S3** in round two on the strength of the
grant machinery being reusable. It is not reusable in the way both of us assumed. The
same constraint that killed B1's previous remedy also applies to `additional-recovery`,
and I should have found it then.

**The constraint.** Every protected action except `pin-verifier` is bound to an active
intervention at four independent points:

1. **Request refuses outside an intervention.** `expectedIntervention`
   (`src/authority/challenge.mjs:60-71`) throws `APR_CHALLENGE_STATE` —
   "Protected action ... requires an active intervention" — unless
   `protocol.state === 'intervention-required'` and
   `protocol.intervention?.intervention_id` is set. `requestChallenge` calls it
   unconditionally for every non-`pin-verifier` action (`challenge.mjs:89`), and
   `requestGrant` is the only path the `request-grant` command has
   (`src/cli/run.mjs:4186-4191`).
2. **The event refuses a null intervention ID.** `validateEvent`'s
   `challenge-requested` case (`src/protocol/events.mjs:862-871`) requires
   `intervention_id !== null` for every action other than `pin-verifier`.
3. **The reducer refuses the append outside an intervention.**
   `challenge-requested` is in `STATE_PRESERVING`, and
   `ensureStatePreservingAllowed` (`reducer.mjs:311-321`) throws unless
   `protocol.state === 'intervention-required'`.
4. **Consumption requires the *same* intervention.** `consumeChallenge` requires
   `challenge.intervention_id === protocol.intervention?.intervention_id`
   (`reducer.mjs:~301`), else `APR_INVALID_TRANSITION`.

**And there is no way to enter an intervention on demand.** I traced all three
producers of `intervention-entered`:

- `enterStaleClaimIntervention` — reachable only through `recover --reclaim`
  (`run.mjs:1722-1726`), and reclaim requires an identical session fingerprint
  (`reducer.mjs:436-441`), so it cannot serve a rotated session.
- `enterParticipantLossIntervention` (`src/identity/registry.mjs:339-367`) — requires
  `transport_mode === 'automatic-required'`, `current_actor === role`, and
  `state === 'author-revision'` for the author; sole caller is the resident-lease
  health path (`src/transport/resident.mjs:151`). This is the mechanism spec 445-449
  already, correctly, rules out.
- `author-closing-round-committed` / `-sealed-no-commit` — turn-budget exhaustion only
  (`events.mjs:727-732,747-752`).

**The two manifestations.**

*`rotate-author-session`.* Spec 462-465 says it "is available in every nonterminal
non-invalid record state, in manual, resume-only, and automatic-required transport,
without requiring an outgoing claim or participant-loss intervention," and spec 468-470
says it "preserves current lifecycle state and claims." Its challenge cannot be
requested from `reviewer-turn` or `awaiting-reviewer` (point 1), cannot be appended
there (point 3), and could not be consumed while preserving lifecycle state even if it
existed (point 4). The operation is unreachable for exactly the same structural reason
the previous remedy was.

*`additional-recovery`.* Spec 243-248 makes `request-grant --action
additional-recovery` "the sole provider-resumption path" at exhaustion. But a record
reaches `recovery-exhausted` while its *attempt* sits in `reviewer-turn` or
`awaiting-reviewer` — `retry-current` explicitly preserves lifecycle state. So the
grant cannot be requested, and `recovery-exhausted` collapses back to the hard cap with
no exit that I raised as R5 in round one, with `abandon` as the only action.

**A third case, independent of the above.** `requestChallenge` refuses outright when
`authority_policy === 'unavailable'` or no verifier is pinned
(`challenge.mjs:77-87`) — a supported configuration (`validateAuthority`,
`events.mjs:519-522`). For such a review, *no* grant of any kind can ever be issued.
That means `additional-recovery` is unavailable and `recovery-exhausted` is genuinely
terminal, and a rotated author has no remedy at all. The spec presents both grants as
universally available paths; it should state this exclusion and what those records do
instead.

**Requested.** Pick one substrate and specify it; either fixes both actions at once.

1. **Operator-initiated intervention (my recommendation).** Add one or two new
   `intervention-entered` reasons — the enum is closed at
   `events.mjs:806-810` (`turn-budget-exhausted`, `stale-claim`, `participant-loss`) —
   for example `recovery-authorization` and `author-rotation`, plus a command that
   enters one from any nonterminal state. Both new actions then ride the existing,
   proven grant path with no change to points 1–4. The cost you must state: the attempt
   transitions to `intervention-required` and back, so "preserves current lifecycle
   state" (spec 468) becomes "restores the interrupted state," which is what
   `TRANSITIONS`' `'restore'` target already does (`reducer.mjs:63-64,488`).
2. **An intervention-free grant class.** Permit `intervention_id: null` for these two
   actions, bound instead to `(review_id, protocol_revision, parameters_digest)`. This
   requires coordinated changes at all four points above, and the spec must name each,
   because a partial change fails closed in a way that looks like a grant-signing bug.

**Whichever you choose, three seams need naming for `rotate-author-session`**, exactly
as spec 233-241 does for `additional-recovery`:

- `GRANT_PARAMETER_FIELDS` (`src/authority/canonicalize.mjs:14-53`) — the closed,
  exact-key catalog.
- `protectedParametersMatchEvent` (`reducer.mjs:~250-278`) — its fallthrough is
  `return action === 'accept-over-objections'`, so an unhandled action returns
  **false** and every rotation grant is rejected as "protected event lacks one live
  bound challenge." This is the single most likely silent failure in the whole feature.
- `validateChallenge`'s action enum (`events.mjs:628`) and the `request-grant` flag
  grammar (`src/cli/parse.mjs:28-59`).

**And two small items on the rotation event itself:**

- **Name the event and its category.** Spec 466-470 describes a revision-advancing
  mutation that preserves lifecycle state, which is the `AUTHORITY_MUTATION_EVENT_TYPES`
  category you introduced for `recovery-claimed` (spec 428-437). Say so, and name the
  event type.
- **Name the actor.** The incoming author is not yet registered, so it cannot be the
  actor. The existing precedent solves this cleanly: `participant-replaced` uses
  `attestation.signer_fingerprint` as the event actor (`run.mjs:1795`). Adopting that
  resolves the chicken-and-egg and is consistent with spec 440-442's rule that `system`
  cannot append this class of authority.

---

## 3. What closes this review

**Blocking:** B5 only — choose a grant substrate that works outside an intervention,
specify it for both `additional-recovery` and `rotate-author-session`, state the
`authority_policy: unavailable` exclusion, and name the three seams plus the rotation
event's type, category, and actor.

Nothing else is open. B4 and S4 are closed, and B1's operation design is accepted
pending its substrate.

For what it's worth, I think the remedy is small relative to how late it surfaced: one
new intervention reason and one entry command make both protected actions work with no
change to the grant machinery's four binding points. The reason it matters is that the
spec now leans on Human Authority grants for its two most important escape hatches —
the only exit from `recovery-exhausted` and the only exit from a rotated author
session — and neither can currently be issued.
