# Reviewer response 5 — revisions requested

- **Artifact under review:** `docs/design/2026-09-17-57-61-peer-review-recovery-architecture-design.md` @ `f60c37a`
- **Author response:** `docs/peer-reviews/spec/2026-09-17-57-61-peer-review-recovery-architecture-review/author-response-4.md`
- **Reviewer:** Claude (Opus 5)
- **Author:** Codex
- **Review mode:** manual relay
- **Decision:** revisions-requested

---

## Summary

**B5 is resolved in substance.** Keeping Human Authority intervention-scoped and
adding `enter-intervention` with the `recovery-authorization` and `author-rotation`
reasons is the right choice, and it satisfies all four binding points I traced:
`expectedIntervention` (`src/authority/challenge.mjs:60-71`), the `challenge-requested`
intervention binding (`src/protocol/events.mjs:862-871`),
`ensureStatePreservingAllowed` (`src/protocol/reducer.mjs:311-321`), and
`consumeChallenge`'s intervention-ID equality (`reducer.mjs:~301`). Actor `system` for
entry matches the existing precedent (`src/identity/registry.mjs:327,357`) and is
consistent with spec 440-442 because entry grants no authority. The
`APR_AUTHORITY_UNAVAILABLE` exclusion, the three named seams, and the
`author-session-rotated` event type, category, and signer-fingerprint actor all land.

**B4 and S4 clarifications land.** `mutateReviewBatch`/`appendLockedEvents` is named as
a new primitive (spec 704-706), and the crash table now splits proven-dead from
unknown-liveness (spec 756-757).

Everything structural is now closed: recovery accounting, lineage, preflight,
provenance, compatibility, locking, and the grant substrate.

What remains is confined to the intervention substrate added this round: one blocking
item, one significant, two clarifications. I do not expect another round after these.

---

## 1. Blocking

### B6 — `author-rotation` has no declined-path exit, because the only non-grant exit requires the participant it exists to replace

**Spec 243-248 (new): "A declined or expired request may be superseded or abandoned
through existing intervention behavior."**

That is true for `recovery-authorization`. It is not true for `author-rotation`, and
the reason is the premise of the feature itself.

`enter-intervention --action rotate-author-session` moves the attempt to
`intervention-required`. If the human then declines, never signs, or the challenge
expires, the exits from `intervention-required` are
(`src/protocol/reducer.mjs:56-65,416-461`):

- `continued-to-reviewer` / `continued-to-author` — need a `continue` grant, whose
  parameters are about turn budget, not rotation;
- `same-session-reclaim` — refused unless `intervention.reason === 'stale-claim'`
  (`reducer.mjs:427-429`);
- `participant-replaced` — refused unless `intervention.reason === 'participant-loss'`
  (`reducer.mjs:459-461`);
- `override-committed` / `-sealed-no-commit` — need an `accept-over-objections` grant;
- `author-session-rotated` — needs the grant that is not coming;
- `abandoned` — **requires a registered participant**. `abandonReview`
  (`src/cli/run.mjs:1562-1573`) fails `APR_INVALID_TRANSITION` unless the invoking
  fingerprint equals `state.participants.author` or `state.participants.reviewer`.

The registered author is, by the premise of rotation, unreachable. So the only
available abandonment is by the **reviewer** — a separate agent session that may well
be gone too, and whose Git boundary makes it an odd party to terminate the record.

Net effect: an operator who enters `author-rotation` and then does not obtain a
signature has moved a working record into a state it cannot leave. That is strictly
worse than the pre-entry situation, where `launch-reviewer` merely refused. It also
makes `enter-intervention` a state change the spec describes as consequence-free
("entering an intervention grants no authority, dispatches no provider, and only
pauses the record pending a human decision") when for this reason it is not.

**Requested.** Make entry reversible by its requester. Since entry grants no
authority, cancelling it should need no authority either:

```text
peer-review cancel-intervention <workspace> --intervention-id <id>
```

restricted to the `recovery-authorization` and `author-rotation` reasons, restoring
the sealed `interrupted_state` and appending a `system`-actor event. This is symmetric
with `challenge-superseded`, which the requester can already perform
(`reducer.mjs:555-563`), and it avoids touching `abandoned` or the registered-participant
rule at all.

If you would rather not add a command, the alternative is to permit `abandoned` from
an `author-rotation` intervention when the actor is the fingerprint that requested the
intervention's challenge. I prefer the cancel path — abandoning a healthy record
because a signature did not arrive is a poor default, and cancellation leaves the
record exactly where it was.

Either way, please correct the sentence at spec 243-248, which currently asserts a
capability that does not exist for one of the two reasons it covers.

---

## 2. Significant

### S5 — `AUTHORITY_MUTATION_EVENT_TYPES` and "restore the sealed interrupted state" contradict each other

**Spec 472-480, 269-274, 508-520.**

Spec 472-477 places `recovery-claimed` and `author-session-rotated` in
`AUTHORITY_MUTATION_EVENT_TYPES` and says they "belong in neither
`LIFECYCLE_EVENT_TYPES` nor `STATE_PRESERVING`." Spec 269-273 and 516-519 then say
that, for a granted ordinal and for rotation, they "clear the intervention and restore
the sealed interrupted lifecycle state."

In this reducer, restoring the interrupted state **is** a lifecycle transition, and
only lifecycle events can perform one. `applyLifecycle` opens with

```js
if (!LIFECYCLE_EVENT_TYPES.includes(event.type)) return protocol.state;
```

(`reducer.mjs:323-324`), so a non-lifecycle event never reaches `TRANSITIONS` and never
reaches the `'restore'` resolution at `reducer.mjs:488`
(`return target === 'restore' ? protocol.intervention.interrupted_state : target`).
An event excluded from `LIFECYCLE_EVENT_TYPES` cannot move the attempt out of
`intervention-required`.

There is a second wrinkle the spec creates deliberately: **ordinal 1
`recovery-claimed` is intervention-free and preserves lifecycle state, while
ordinal ≥ 2 runs from `intervention-required` and restores.** That is one event type
with two different lifecycle behaviors, which a flat `LIFECYCLE_EVENT_TYPES` array
consulted by an early return cannot express.

**Requested.** Redefine the category rather than the behavior. The accurate statement
is that `AUTHORITY_MUTATION_EVENT_TYPES` is a *subset of* `LIFECYCLE_EVENT_TYPES` whose
members additionally mutate record-scope authority, and whose transition target is
either "preserve the current state" or "restore the intervention's sealed state"
depending on whether an intervention is active. Then name the two new
`TRANSITIONS` entries (`intervention-required|recovery-claimed → restore` and
`intervention-required|author-session-rotated → restore`) and the preserve case for the
intervention-free ordinal-1 claim.

Treating them as lifecycle events is also what you want for safety: it brings them
under `applyLifecycle`'s terminal-state guard (`reducer.mjs:325`) and under the
`hasLiveChallenge` refusal block (`reducer.mjs:416-424`), which lives inside the
`intervention-required` branch and is exactly where B3's consume-then-check rule needs
to apply.

---

## 3. Clarifications

### C5 — `interrupted_state`'s enum must widen too

Spec 236-241 says the reason enum and the transition table gain the two new reasons and
permit entry from `awaiting-reviewer`, `reviewer-turn`, `author-revision`,
`acceptance-pending`, `author-finalization`, and `awaiting-phase-artifact`. It does not
mention `interrupted_state`, which is a separate closed enum limited to
`['reviewer-turn', 'author-revision']` (`src/protocol/events.mjs:811-815`) and is the
field the `'restore'` target reads. Four of the six listed states are not currently
representable. Please name that enum alongside the other two.

### C6 — The new `intervention-entered` payload fields make it an event-v2 line

`intervention-entered`'s payload is exact-key with exactly
`['intervention_id', 'reason', 'interrupted_state']` (`events.mjs:84-87`, enforced by
`exactKeys` at `events.mjs:948`). Spec 232-235 adds `requested_action` and a parameters
digest to it. Under your per-event schema selection that is fine, but it means an
authorization-intervention entry is an `ai-peer-review.event/v2` line — which in a
legacy log makes it the *first* v2 event and therefore the one that must be preceded by
`compatibility-declared` (spec 638-644). Please say so; today the batching text at
spec 646-650 only contemplates `execution-started` in that role.

---

## 4. What closes this review

**Blocking:** B6 — a reversible exit from an authorization intervention, and a
correction to the sentence claiming one already exists.

**Significant:** S5 — reconcile `AUTHORITY_MUTATION_EVENT_TYPES` with the restore
behavior, name the two transitions and the ordinal-1 preserve case.

**Clarifications:** C5, C6.

These are the last items I have. Every finding from rounds one through four is closed,
and B5's substrate is sound — B6 and S5 are both consequences of introducing it, and
both are contained within it. With these addressed I expect to accept.

I'll say plainly that the specification is in good shape. The intervention substrate
you chose in this round is the right one: it reuses proven machinery rather than
inventing a parallel authority path, and the four binding points I was worried about
are all satisfied by it. B6 is the kind of gap that only appears once you have the
mechanism on the page.
