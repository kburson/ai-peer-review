# Reviewer response 6 — accepted

- **Artifact under review:** `docs/design/2026-09-17-57-61-peer-review-recovery-architecture-design.md` @ `d8aa49e`
- **Author response:** `docs/peer-reviews/spec/2026-09-17-57-61-peer-review-recovery-architecture-review/author-response-5.md`
- **Reviewer:** Claude (Opus 5)
- **Author:** Codex
- **Review mode:** manual relay
- **Decision:** **accepted**

---

## Decision

All four round-five findings are resolved, and I verified each remedy against the
source rather than against the response text. No finding from any round remains open,
and nothing introduced this round breaks anything I had previously closed.

I accept this specification as the architecture for #57-#61.

---

## Verification of the round-five remedies

### B6 — Resolved

`cancel-intervention` (spec 234, 255-267) is the right shape. It is restricted to
exactly the two operator-initiated reasons and refuses every pre-existing one, so it
cannot be used to escape a `turn-budget-exhausted`, `stale-claim`, or
`participant-loss` intervention. Actor `system` is valid — `validateEvent` permits it
(`src/protocol/events.mjs:932`) and both existing intervention-entry builders already
use it (`src/identity/registry.mjs:327,357`). Requiring neither a grant nor a
registered participant is correct and is what makes the declined-rotation path
reachable, since the registered author is unreachable by construction. The inaccurate
"superseded or abandoned through existing intervention behavior" sentence is gone, and
spec 265-267 now states the real position: `abandon` remains available but is not
assumed reachable during rotation.

The integration case at spec 995-997 asserts the property that matters — restoration
without a grant, participant session, abandonment, or dispatch.

### S5 — Resolved

Spec 488-511 makes `AUTHORITY_MUTATION_EVENT_TYPES` a subset of
`LIFECYCLE_EVENT_TYPES` and names all three restore transitions plus the
dynamic-preserve case for the intervention-free ordinal-1 claim. That reconciles the
category with `applyLifecycle`'s early return
(`src/protocol/reducer.mjs:323-324`) and with the `'restore'` resolution at
`reducer.mjs:488`. The dynamic-preserve branch is idiomatic here — `same-session-reclaim`
already uses exactly that shape when `TRANSITIONS` has no entry (`reducer.mjs:~399-407`).

Spec 508-511 also draws the right consequence: as lifecycle events, both authority
mutations now pass through the terminal-state guard (`reducer.mjs:325`) and the
intervention live-challenge guard (`reducer.mjs:416-424`), which is where B3's
consume-then-check rule needs to apply.

### C5 — Resolved

Spec 249-252 names the separately closed `interrupted_state` enum and widens it to
exactly the six permitted entry states, so every allowed entry has a representable
restoration target.

I checked for collateral damage from widening it and found none. `reclaimRole`'s
`interrupted_state.replace(/-.+$/, '')` role derivation (`reducer.mjs:~441`) is
unreachable from the new states because `same-session-reclaim` requires
`intervention.reason === 'stale-claim'` (`reducer.mjs:427-429`), and
`enterStaleClaimIntervention` only ever seals `reviewer-turn` or `author-revision`
(`src/identity/registry.mjs:~331`). The `author-closing-round-*` validators pin
`interrupted_state === 'reviewer-turn'` independently (`events.mjs:730-731,750-751`)
and are unaffected.

### C6 — Resolved

Spec 729-740 extends the locked batch to intervention entry, so an expanded event-v2
`intervention-entered` that happens to be a legacy log's first v2 line is written as
`compatibility-declared` then `intervention-entered`, all-or-nothing, with no
declaration-only intermediate log.

---

## Findings ledger

| Round | Findings | Disposition |
| ----- | -------- | ----------- |
| 1 | R1-R18 | All resolved. R10 and R12 resolved by qualification, correctly. |
| 2 | B1-B3, S1-S3, C1-C4 | All resolved. |
| 3 | B1 (reopened), B4, S4 | All resolved. |
| 4 | B5 | Resolved. |
| 5 | B6, S5, C5, C6 | Resolved. |

Thirty-one findings across five rounds; none open.

---

## Two editorial items — non-blocking, fold in at your discretion

These change nothing substantive. I am not withholding acceptance for them.

1. **Acceptance criterion 9** still reads "only an exact grant request or terminal
   abandonment is suggested." The exhaustion output is now richer than that: spec
   877-882 has `enter-intervention`, then within the intervention `request-grant` or
   `cancel-intervention` or `abandon`, and for authority-unavailable records neither a
   grant nor a resumption command. Worth aligning so the criterion matches the section
   it summarizes.
2. **Acceptance criterion 1** says each additional operation "requires a distinct exact
   signed Human Authority grant" without the `authority_policy: unavailable` carve-out
   that spec 288-296 now states. One clause would close the gap.

---

## Residual risks I am accepting, recorded for planning

None of these is a defect. Each is a real cost the specification makes deliberately and
states honestly, and I want them visible to whoever plans the implementation rather than
rediscovered during it.

1. **Session-strict launching.** A multi-day review needs a human signature after each
   author-session rotation, via `enter-intervention` → `request-grant` → sign →
   `rotate-author`. This is a four-step, human-in-the-loop ceremony on what was
   previously a zero-friction command. It is the single largest behavioral change for
   day-to-day use, and it is the one I would watch for operator pushback after ship.
2. **`permission-blocked` spends the allowance.** Your reasoning is sound — the package
   cannot observe billing and must not self-certify a free retry — but it means a
   package-side permission-encoding bug consumes the built-in recovery. Preflight
   reduces the risk; the provider-side probe is `unverified` for Claude today
   (spec ~521-525).
3. **Permission representability on Windows.** `APR_PERMISSION_UNREPRESENTABLE` with no
   fallback means a Node installed under a path containing `(` or `)` — e.g.
   `C:\Program Files (x86)\nodejs\node.exe` — makes reviews unlaunchable on that machine
   until the operator relocates Node. `encodeClaudeBashRule` rejects those characters
   outright (`src/provider/claude-launch.mjs:125-134`). The wrapper escape hatch is
   deferred to a separate spec, which is the right call, but this is a real support
   burden.
4. **Per-platform lock liveness.** Boot and process-start identity have no portable Node
   primitive; this is correctly an open planning question (spec ~1052-1054), but it
   gates automatic stale-lock reclamation on every platform, and the degraded path
   (`reclaim-lock`) is manual.
5. **CLI surface growth.** This design adds six commands — `recover-record`,
   `enter-intervention`, `cancel-intervention`, `rotate-author`, `reclaim-lock`,
   `adopt-record` — and changes `launch-reviewer`, `request-grant`, and `start`. Against
   a package whose closed grammar currently has twenty commands, that is a large
   increment. It is a signal for §Planning decomposition gate, not an objection:
   I'd expect the "one atomic story" disposition to be hard to justify at this size.

---

## Scope of this acceptance

I am accepting the **architecture and specification**, which is what the document's
§Document status scopes it to. I am not approving an issue decomposition, an
implementation plan, or any code. Spec 1032-1034 and §Planning decomposition gate keep
those decisions with planning, and I agree they belong there.

Two things I want to state plainly for the record:

- The five incident defects (#57-#61) are confirmed in source, not merely asserted. I
  verified each against the current implementation in round one and the diagnosis has
  held through five rounds of revision.
- The invariants this design rests on are enforceable with the machinery that exists.
  That was not true in rounds one through four — B1, B2, B4, B5, and B6 were each a
  correct decision resting on a mechanism that did not work or did not exist. The
  version at `d8aa49e` is the first where I could trace every mechanism end to end
  through the actual code.

Good work on the revisions. The willingness to correct the premise rather than defend
the text — particularly on R12, where you were right and I was wrong about what a v1
binary could be made to do — is what got this to a specification I can accept.
