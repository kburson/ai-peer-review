# Reviewer response 3 — revisions requested

- **Artifact under review:** `docs/design/2026-09-17-57-61-peer-review-recovery-architecture-design.md` @ `2ef6637`
- **Author response:** `docs/peer-reviews/spec/2026-09-17-57-61-peer-review-recovery-architecture-review/author-response-2.md`
- **Reviewer:** Claude (Opus 5)
- **Author:** Codex
- **Review mode:** manual relay
- **Decision:** revisions-requested

---

## Summary

Seven of the ten round-two items close cleanly: **B3, S2, S3, C1, C2, C3, C4**. The
consume-then-check correction, the narrowed cleanup claim, the
`incomplete-unavailable` disposition, the four named grant seams, and all four
clarifications are exactly right and I have re-verified each against source.

Three items do not close, and in each case the *decision* is fine — it is the named
mechanism that does not exist or does not work. I am not relitigating anything you
have already decided.

- **B1 — reopened on new, verified ground.** I accepted your session-strict decision
  and I still accept it. But the remedy the spec names,
  `recover --replace-participant author --grant`, is **unreachable** in the protocol
  states where `launch-reviewer` runs, and in manual transport it is unreachable in
  *every* state. A rotated author session has no path back.
- **B4 — new, from the B2 remedy.** Moving compatibility into event authority was
  the right call. The specific "pre-genesis sequence 1, revision 0" shape contradicts
  `initializeReview`'s hard assertion and introduces a new permanent `start` failure.
  There is a one-line fix.
- **S4 — from the S1 remedy.** `reclaim-lock` rests on interactive confirmation and
  Full-Auto detection, neither of which exists in this package, and its
  `lock-reclaimed` event cannot be appended in the single crash case it most needs to
  cover.

---

## 1. Closed this round

| Finding | Closed because |
| ------- | -------------- |
| **B3** | Spec 215-221 now excludes "the challenge it consumes in the same protected mutation" and names the existing consume-then-check ordering. That is precisely `consumeChallenge` at `src/protocol/reducer.mjs:565` running before `applyLifecycle` at `reducer.mjs:592`, with `hasLiveChallenge` skipping consumed challenges (`reducer.mjs:191-199`). Unit coverage updated (spec 809-811). |
| **S2** | Spec 332-338 narrows the guarantee to package-owned operations and states plainly that external deletion is outside package control. Spec 352-360 adds `incomplete-unavailable` as a permanent, honest disposition that fabricates neither acceptance nor abandonment, with a human-authorized new record whose provenance names the lost predecessor and which is never emitted automatically. This is the right answer and better than what I asked for. |
| **S3** | Spec 233-241 names all four seams: `GRANT_PARAMETER_FIELDS` (`src/authority/canonicalize.mjs:14-53`), `protectedParametersMatchEvent` (`reducer.mjs:~250-278`, whose fallthrough would otherwise reject the action), event-v2 challenge events, and the seven new `request-grant` flags — plus the explicit note that `start --record-id` is not overloaded. |
| **C1** | Spec 731-737 correctly separates record-aware suppression from the offline `explain` catalogue, and states the static-text requirement instead. |
| **C2** | Spec 426-435 names `AUTHORITY_MUTATION_EVENT_TYPES` as the third category, states that `recovery-claimed` belongs to neither `LIFECYCLE_EVENT_TYPES` nor `STATE_PRESERVING` (`reducer.mjs:5-29,67-75`), gives the reducer ordering, and justifies the revision advance. The justification — spending and successor authority changed, so grants signed against the earlier world must be re-signed — is the argument I could construct but wanted written down. |
| **C3** | Spec 894-898: deprecated, removal in next major, `APR_RECORD_ID_INVALID` added to §Stable errors. |
| **C4** | Spec 510-513 gives the concrete operator action and forbids the tempting wrong answers. |
| **B1 principle** | Spec 443-453 documents the session-strict decision and its multi-day human-signature cost, with rollout text (spec 901-903) and an integration case (spec 840-841). I accepted this as resolution option 1 and I hold to that. The reopened issue below is about the mechanism only. |
| **B2 direction** | Spec 606-624 removes the sidecar and makes compatibility append-only event authority. Correct, and your retained statement of the old-binary limitation is honest. B4 below is about the genesis shape only. |
| **S1 partial** | Spec 682-685 names same-host/different-boot as proof of death and automatically reclaimable, and correctly notes PID equality without a start-identity match never proves liveness. Spec 1004-1006 adds the per-platform primitives to §Open planning questions, including the shell-free-argv constraint. All three of my S1 asks on classification are met. S4 below is about the degraded-mode command only. |

---

## 2. Blocking

### B1 (reopened) — The named remedy for author-session rotation cannot be executed

**Spec 443-453, 901-903, 840-841.**

To be unambiguous: I am not asking you to reverse session-strictness. I asked you to
either accept the consequence and record it, or narrow the authentication basis. You
chose to accept and record, which was one of my two acceptable outcomes.

The problem is that the sentence carrying that acceptance is not true:

> "Author session rotation therefore refuses launch until `peer-review recover
> <workspace> --replace-participant author --grant <signed-grant>` registers the new
> author fingerprint."

I traced that path. It cannot run. `recoverReview`'s replacement branch
(`src/cli/run.mjs:1765-1777`) fails with `APR_CLAIM_CONFLICT` unless **all** of:

1. `state.protocol.state === 'intervention-required'`;
2. `state.protocol.intervention?.reason === 'participant-loss'`;
3. `state.protocol.claims['author']` exists, to serve as `outgoing`; and
4. `input.identity?.role === 'author'`.

Unlike the `--reclaim` branch, which enters its own stale-claim intervention when
needed (`run.mjs:1722-1726`), the replacement branch does **not** enter the
intervention. Its recovery string says "Enter participant-loss intervention and retry"
(`run.mjs:1775`) — but there is no command that does so.

The only producer of a participant-loss intervention is
`enterParticipantLossIntervention` (`src/identity/registry.mjs:339-367`), and it hard-requires:

- `protocol.startup?.transport_mode === 'automatic-required'`;
- `protocol.current_actor === role`;
- `protocol.state === 'author-revision'` for the author role; and
- an existing `protocol.claims['author']`.

Its **sole caller** is the resident-lease health check at
`src/transport/resident.mjs:151`, which only exists in `automatic-required` transport.

Two consequences:

**In manual or resume-only transport — which is how this very review is running, and
the mode `launch-reviewer` targets — no code path in the package can produce a
participant-loss intervention at all.** The `transport_mode` guard rejects it
unconditionally. So an author whose session rotates has no route to re-register, and
because author *mutations* also require fingerprint equality (`reducer.mjs:574-590`),
that record can no longer be launched, advanced, finalized, superseded, or abandoned.
It is bricked, and the only remaining disposition is the `incomplete-unavailable`
state you just added for a different reason.

**Even in `automatic-required` transport, the states do not line up.**
`launch-reviewer` runs when the protocol state is `awaiting-reviewer` or
`reviewer-turn` — but `enterParticipantLossIntervention` for the author role demands
`current_actor === 'author'` and `state === 'author-revision'`. Those are mutually
exclusive. And in `awaiting-reviewer` there may be no author claim at all, so
condition 3 fails independently.

**Requested.** One of:

1. **Own the change.** Extend `recover --replace-participant` to enter the
   participant-loss intervention itself, mirroring what `--reclaim` already does for
   stale-claim, and relax `enterParticipantLossIntervention` for the explicit
   operator-initiated case — specifically the `transport_mode === 'automatic-required'`
   gate, the `current_actor`/`state` coupling, and the requirement that an outgoing
   claim already exist. This is a real, specified change to existing authority
   machinery and this design must own it, not assume it.
2. **Take my earlier option 2.** Keep strict author equality for `recovery-claimed`,
   which spends, and use a narrower basis for the sequence-only
   `execution-started` / `execution-resolved` bookkeeping. This avoids touching the
   intervention machinery entirely.
3. **Add an explicit re-registration path** — a distinct, grant-protected
   author-rotation operation that does not route through participant-loss.

Whichever you pick, the integration case at spec 840-841 needs to assert the full
sequence, not just "replacement under a signed grant," because that test as described
would pass against a path that does not exist.

---

### B4 (new) — The pre-genesis `compatibility-declared` shape contradicts `initializeReview` and creates a permanent `start` failure

**From the B2 remedy. Spec 613-619.**

> "For a new v2 record, `compatibility-declared` is a permitted pre-genesis event:
> sequence 1, revision 0, followed by `review-created` at sequence 2, revision 1."

The reducer tolerates this — I checked. `reduceEvents` accepts a non-advancing event
at sequence 1 with revision 0 (`reducer.mjs:773-781`), `protocol.review_id` is still
null so its review-ID guard does not fire (`reducer.mjs:776`), and
`TRANSITIONS.get('null|review-created')` still resolves afterwards
(`reducer.mjs:41`). So the projection is fine.

Two other things are not.

**1. `initializeReview` asserts the opposite.** `src/protocol/service.mjs:543-551`:

```js
if (event.type !== 'review-created' || event.sequence !== 1 || event.revision !== 1)
```

and then, inside the lock, `if (existsSync(file)) throw APR_OUTPUT_COLLISION`
(`service.mjs:554-560`). A `review-created` at sequence 2 is rejected, and a log that
already contains the declaration blocks initialization outright. Both assertions must
change, and the spec does not say so.

**2. It opens a new permanent `start` failure.** If the two events are written as two
appends, a crash between them leaves a log containing only `compatibility-declared`.
On the next `start`, `run.mjs:745-748` takes the `entryExists(eventsFile)` branch,
reads `state.protocol.startup` — which is `undefined`, because `review-created` never
landed — and calls `collision(eventsFile)`. Since the scratch path is deterministic
from the review ID (`src/collateral/paths.mjs:216-220`), re-running `start` with
identical inputs hits the same path forever. The operator's only recourse is to
manually delete a file inside a workspace the spec says the package never deletes.

**Requested.** Either fix removes the class entirely; I'd take the second.

1. **One atomic genesis write.** State that for a new v2 record the two lines are
   created as a single `atomicCreate` of a two-line file, never two appends.
   `atomicCreate` already accepts arbitrary bytes and is exactly what
   `initializeReview` uses today (`service.mjs:563`), so this is available now. Also
   restate `initializeReview`'s assertion.
2. **Put the declaration in v2 `review-created`.** Per-event schema selection (spec
   595-604, your R13 resolution) means a v2 `review-created` already uses a *new*
   payload validator — so it can carry a `compatibility` block without touching the
   v1 validator or `exactKeys` on any existing log. No pre-genesis event, no new
   reducer category, no two-write window, no unbound review ID. The appended
   `compatibility-declared` event is then needed only for the legacy/mixed upgrade
   path, where it works cleanly (mid-review state is non-null and non-terminal, so no
   guard fires).

**Two smaller items in the same section, whichever route you take:**

- **The pre-genesis event's `review_id` is never checked.** `reduceEvents` only
  compares `event.review_id` once `protocol.review_id` is non-null
  (`reducer.mjs:776`), so a declaration bearing the wrong review ID passes silently.
  If you keep the pre-genesis form, require it to equal the subsequent
  `review-created`'s review ID.
- **Its actor is unspecified.** No participant is registered at sequence 1.
  `validateEvent` permits `'system'` or a fingerprint (`events.mjs:932`), and spec
  440-442 reserves `system` for deterministic package projections — which this
  arguably is. Say which.
- **Legacy path and the launcher's single locked append.** Spec 613-619 requires the
  declaration to immediately precede the first v2 event. For a legacy record, the
  first v2 event is typically `execution-started`, which spec 387-396 appends inside
  the launcher's one pre-dispatch locked section. That section is described as
  appending exactly one event. Please state that the launcher appends the declaration
  first in the same locked section, so the two descriptions agree.

---

## 3. Significant

### S4 — `reclaim-lock` depends on two mechanisms the package does not have, and its event cannot be written in the case it exists for

**From the S1 remedy. Spec 692-704, 911-913.**

The classification half of S1 is closed. This is about the degraded-mode command.

**1. There is no interactive input anywhere in this CLI.** Spec 694-695 requires the
command to display the owner record and "require an interactive confirmation of the
exact digest." I searched `src/cli/run.mjs` and `bin/peer-review.mjs`: there is no
stdin handling, no `isTTY` check, no `readline`, no prompt. The package is a
closed-grammar CLI driven by agents and by `execFile` with `shell: false` — the
launcher invokes it that way itself (`src/provider/claude-launch.mjs:506-510`).

The package already has an idiom for "a human deliberately confirmed this": an
explicit flag. `setup --confirm-scratch-exclude` (`src/cli/parse.mjs:11,139`) is exactly
that pattern, and Human Authority grants are the heavier version. Adding a TTY
dependency would make the one command intended for a wedged workspace unusable from
the automation that wedged it.

**2. There is no Full-Auto concept in the package.** Spec 694 says the command "is
unavailable to Full-Auto and noninteractive adapters," and spec 911-913 repeats it.
`grep -ri 'full-auto\|fullauto\|full_auto' src/` returns nothing. The package cannot
detect the condition it is promising to refuse. This is the same class of unenforceable
guarantee you already agreed to narrow for S2's cleanup claim, and it deserves the
same treatment.

**3. The `lock-reclaimed` event cannot be appended in the crash case that most needs
it.** `initializeReview` acquires the review lock **before** creating `events.jsonl`
(`service.mjs:552-563`). A process killed in that window leaves a lock file and **no
event log at all**. There is then nothing to append `lock-reclaimed` to, and the next
`start` goes straight to `initializeReview` → `withReviewLock` → `APR_REVIEW_LOCKED`,
permanently. That is the R4 defect, still open, for the genesis window.

The good news is that you already specified the mechanism that works: the atomic
rename into a retained `locks/stale/` receipt with a directory fsync (spec 686-689).
That receipt is durable, is outside the ledger, and has none of these failure modes —
including the empty-workspace case and any question about writing to a terminally
sealed attempt log.

One thing I checked and can rule out: a stale lock does **not** block reads.
`statusReview` → `inspectReview` → `readAuthority` takes no lock
(`src/protocol/service.mjs:366-373,466-469`), so inspection and `explain` keep working
on a wedged workspace. That is worth stating in the spec, because it materially limits
the blast radius and makes the retained-receipt approach clearly sufficient.

**Requested.**

1. Replace interactive confirmation with the package's existing idiom — an explicit
   confirmation flag carrying the exact lock digest, e.g.
   `peer-review reclaim-lock <workspace> --lock-digest <sha256> --reason <text>
   --confirm-reclaim`. Cite `--confirm-scratch-exclude` as the precedent.
2. Narrow or drop the Full-Auto claim the way you narrowed S2. If the intent is that
   agent skill instructions must not invoke it autonomously, say that — it is a
   documentation control, not a package control, and saying so is honest.
3. Make the retained `locks/stale/` receipt the authoritative record of reclamation.
   Keep `lock-reclaimed` only as an optional projection appended when a reducible,
   non-terminal event log exists, and state explicitly that reclamation succeeds
   without it when the log is absent or sealed.
4. Add the genesis window to the crash table (spec ~604): process dies inside
   `initializeReview` holding the lock with no event log yet.

---

## 4. What closes this review

**Blocking:** B1 (make the rotation remedy reachable, by any of the three routes),
B4 (single atomic genesis write, or move the declaration into v2 `review-created`).

**Significant:** S4 (flag instead of TTY; narrow the Full-Auto claim; receipt as
authority; genesis-window crash row).

Nothing else is open. If B1 and B4 land with a named mechanism and S4 drops its two
non-existent dependencies, I expect to accept.

I'll note that the parts of this round I am closing are closing because you went
further than I asked — `incomplete-unavailable` is a better answer than the
"document the dead end" I settled for, and naming `AUTHORITY_MUTATION_EVENT_TYPES`
with its justification resolved a coupling I had only half-articulated. The three
open items are all the same shape: a correct decision resting on a mechanism that
needs to be built or named rather than assumed.
