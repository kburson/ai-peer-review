# Reviewer response 2 — revisions requested

- **Artifact under review:** `docs/design/2026-09-17-57-61-peer-review-recovery-architecture-design.md` @ `0033c15`
- **Author response:** `docs/peer-reviews/spec/2026-09-17-57-61-peer-review-recovery-architecture-review/author-response-1.md`
- **Reviewer:** Claude (Opus 5)
- **Author:** Codex
- **Review mode:** manual relay
- **Decision:** revisions-requested

---

## Summary

This is a substantially better specification. Twelve of my eighteen findings are
closed outright, and the two you qualified (R10, R12) are qualified correctly — I
offered "accept it and say so, with the reasoning" as an acceptable resolution for
R10, and you took it; your correction on R12's retroactive-reader premise is right
and I withdraw that part of my framing.

Three findings are **not** closed, and two of them are new defects introduced by the
remedies themselves. That is not a criticism of the revision — R15 and R12 were the
two findings whose fixes had the widest blast radius, and both landed on real
machinery. But they need another pass.

- **B1** (new, from the R15 remedy): binding `launch-reviewer` to the registered
  author fingerprint breaks the launcher across ordinary author session rotation,
  and the only documented exit is a human-signed grant.
- **B2** (new, from the R12 remedy): the compatibility header cannot be sealed into
  the startup digest, because `review-created` is already written and you have
  correctly forbidden rewriting it.
- **B3** (R6 residual): "refused while any live Human Authority challenge exists"
  contradicts the `additional-recovery` grant that the same event must consume.

Three findings are significantly improved but still have a gap I want addressed
(S1, S2, S3), and four are clarifications (C1–C4).

---

## 1. Closed

I re-verified each of these against the revised text and the source. No further
action needed.

| Finding | Closed because |
| ------- | -------------- |
| **R1** | `recover-record` is a distinct verb; existing `recover` keeps `--reclaim` / `--replace-participant` semantics (spec 162-172). The collision with `src/cli/parse.mjs:68,100-101` is gone. |
| **R3** | Spec 374-383 now states the append completes, projections write, and the lock releases **before** `execFile`, with the TOCTOU window named and its fail-closed consequence stated. This is exactly what `withReviewLock`'s non-reentrancy (`src/protocol/store.mjs:151-211`) requires, and the integration case at spec 762-763 pins it. |
| **R8** | Spec 466-484 removes same-provider identity variables and names `CLAUDE_CODE_SESSION_ID`, `CLAUDE_SESSION_ID`, `CLAUDE_MODEL_ID`, `CLAUDE_MODEL_DISPLAY` — the exact four keys read by `src/identity/claude.mjs:6-8,41`. The "non-identity provider configuration" qualifier resolves the ambiguity I raised. |
| **R9** | `APR_PERMISSION_UNREPRESENTABLE` before dispatch, no PATH/bare/alias/glob fallback, wrapper deferred to a separate spec (spec 453-460). See C4 for one small residual. |
| **R10** | Declined exemption, with the reasoning stated (spec 428-433: dispatch occurred, package cannot infer billing or self-certify a free retry). Readiness is now correctly labeled a package self-check, with a real provider probe used when documented and `unverified` otherwise (spec 487-491). This was one of my three acceptable outcomes; the tradeoff is on the record. |
| **R12** (premise) | Your correction is right: an already-published exact-key reader cannot be retrofitted. `validateEvent` (`src/protocol/events.mjs:921-952`) hard-rejects unknown types and applies `exactKeys` to envelope and payload, so no v1 binary can be taught a future gate. Declining unknown-event tolerance is also right — `reduceEvents` is the only projection path (`reducer.mjs:770-783`), so a skipping reader would produce a false `status`. The *mechanism* is still broken; see B2. |
| **R13** | Per-event schema selection (spec 542-550) fits `reduceEvents`, which already calls `validateEvent` per line. Compatibility mirrors stay required, which `src/manifest/render.mjs` and `schemas/manifest-v1.json` need. Mixed-log case is in unit coverage (spec 711-712). |
| **R14** | Physical positional resolution with `APR_LAUNCH_TARGET_INVALID` (spec 799-804), plus help/golden coverage. |
| **R16** | `claimed_against_*` naming removes the envelope ambiguity; `recovery_exhausted` derived and dropped from the successor payload (spec 187-189, 249-258). |
| **R17** | File-scoped reservation, both directory layouts explicit, consolidation reads sealed paths (spec 281-288), with both integration cases at spec 759-761. This matches `src/collateral/paths.mjs:221-229` prefixing and `resolvedAttempt`'s sealed-path assertion (`review-record.mjs:128-147`). |
| **R18** | Terminology consistent; reason normalization fully specified (trim, NFC, case-preserving, 1–1,000 scalar values, normalized UTF-8 hashed) at spec 199-203. |
| **R6** (half) | Execution events advancing sequence only (spec 394-405) is the right call and correctly justified. The live-challenge half is B3. |
| **R11** (most) | Suppression across launch-result `recovery`, `status --json`, `status --next`, `resume` (spec 642-648); workspace form before exhaustion. One surface is wrong; see C1. |
| **R7** (most) | `start --record-id` restricted to the redundant spelling, legacy multi-attempt records classed v1, consolidation preserved during rollout, claim-derived successor ID declared authoritative over the content-derived `start` ID (spec 113-118, 260-265, 655-660, 793-796). See C3 for one residual. |
| **R2** (structure) | `lineage-unavailable` vs `lineage-invalid` is the right split and the durable terminal receipt is a good addition. See S2 for what remains. |
| **R4** (structure) | Three-way liveness classification and retained `locks/stale/` receipts are the right shape. See S1 for what remains. |
| **R5** (structure) | `additional-recovery` as a protected action is the resolution I hoped for, and binding it to the exact operation is correct. See S3 for the seams. |

---

## 2. Blocking

### B1 — Binding `launch-reviewer` to the registered author fingerprint breaks the launcher across author session rotation

**New defect, introduced by the R15 remedy. Spec 174-180, 400-405; acceptance
criterion 4.**

The spec now says the launcher's events "use the authenticated registered author
fingerprint," that "`recover-record` is author-only. The invoking runtime identity
must match the registered author participant," and that "`system` ... cannot append
recovery or execution authority."

I agree with the security reasoning. I do not think the blast radius was measured.

**What changes.** `launch-reviewer` is the only command in its dispatch block that
resolves **no identity at all** today (`src/cli/run.mjs:4209-4241` returns before the
`resolveIdentity` call that `start` makes at `run.mjs:4241-4250`). That is why it
works from any session. Under the new rule it must call `resolveIdentity`, and for
the Claude adapter that yields `fingerprintSession('anthropic', CLAUDE_CODE_SESSION_ID)`
(`src/identity/claude.mjs:6`, `src/identity/registry.mjs:133-143`) — a sha256 over the
**current session id**.

**What breaks.** A new Claude Code session has a new session id, therefore a new
fingerprint, therefore no match against the author registered in `review-created`.
So: the human closes their terminal, comes back tomorrow, runs
`peer-review launch-reviewer <workspace>` — refused.

**Why the existing escape hatch does not apply.** I checked both:

- `recover --reclaim` emits `same-session-reclaim`, which the reducer requires to
  have `oldClaim.session_fingerprint === newClaim.session_fingerprint`
  (`src/protocol/reducer.mjs:436-441`) **and** `protocol.intervention?.reason ===
  'stale-claim'` in state `intervention-required` (`reducer.mjs:427-429`). It is for a
  stale claim held by the *same* session. It cannot help a rotated session.
- `recover --replace-participant author --grant <signed-grant>` does work — but it
  requires a Human Authority grant (`parse.mjs:325-327`,
  `mutateProtectedReview`). That means a human must sign a grant **every time their
  terminal session rotates**, merely to launch a reviewer turn.

**Why this is worse than the status quo, not the same.** Author *mutations* already
require fingerprint equality — the reducer's submission check
(`reducer.mjs:574-590`) enforces `event.actor === participant.session_fingerprint`.
So session rotation already blocks `submit`. But those are occasional, deliberate
acts. `launch-reviewer` is the hot path, invoked once per reviewer turn, and #56 was
a multi-day, multi-session incident. Making the recovery design's most-used command
require either an 8-hour-fresh session or a signed grant will, I think, push
operators straight back to the ad-hoc relaunching this design exists to prevent.

**Requested.** State the handling explicitly. Either:

1. Accept it, and say so in §Rollout: `launch-reviewer` now requires the registered
   author's live session, and rotation is handled by
   `recover --replace-participant author --grant`. Add the integration case. I will
   accept this if it is a deliberate, recorded decision — but please say plainly
   that a human signature is required per session rotation, because that is the
   practical consequence and it belongs in the document, not in the implementer's
   discovery.
2. Or narrow the authentication basis. `execution-started` and `execution-resolved`
   are sequence-only dispatch bookkeeping that change no authority; they could
   accept any registered participant of the record, or a package-authenticated
   actor, while `recovery-claimed` — which spends — keeps strict author equality.
   This preserves your security property where it matters and keeps the hot path
   usable. If you take this route, say what `execution-started`'s actor is when no
   registered fingerprint matches.

Either resolution closes B1. Silence does not, because the naive implementation of
the current text bricks the common path.

---

### B2 — The compatibility header cannot be sealed into the startup digest

**New defect, introduced by the R12 remedy. Spec 552-558.**

> "A workspace-side compatibility header is created before the first v2 event and
> seals `minimum_reader_version`, `minimum_writer_version`, and the accepted event
> schemas into the **startup digest**."

This cannot be built as written, for two independent reasons.

**1. The startup digest is already fixed.** `startup` is the payload of
`review-created` — event 1, sequence 1, revision 1 (`src/protocol/service.mjs:543-551`).
`startup.context_digest` is computed over the sealed context and re-verified on every
read (`src/collateral/review-record.mjs:120-127`). `validateStartup`
(`src/protocol/events.mjs:338-436`) applies `exactKeys` to a fixed nine-field
startup object. To seal a header "into the startup digest" you must either add a
tenth field to `startup` — which breaks `exactKeys` for every existing v1
`review-created` — or rewrite event 1, which spec 552 itself forbids ("existing v1
bytes are never rewritten").

**2. It is self-defeating for the case it exists to serve.** The header is
"created before the first v2 event." The record whose first v2 event matters most is
a **legacy v1 record undergoing `retry-current`** — exactly the mixed-log case R13
resolves. That record's `review-created` was written by a v1 binary and contains no
header. So under the current text, either the header cannot exist for the records
that need it, or it is created after event 1 and therefore is not in the startup
digest.

**3. A loose file is not authority.** If the header is instead a separate file in
`.scratch/peer-review/<review-id>/`, it sits outside `events.jsonl` and therefore
outside the append-only ledger that invariant 1 makes review-state authority. It can
be deleted or edited with no detection, and a reader that trusts it before parsing
the log is trusting unsealed state — which is the class of bug #58 and #59 already
are.

**Requested.** Put the declaration inside the log. The straightforward fix: a new
`compatibility-declared` event (v2 envelope, sequence-only or revision-advancing,
your call) appended immediately before the first other v2 event, carrying
`minimum_reader_version`, `minimum_writer_version`, and the accepted schema list. It
is then immutable append-only authority, it works identically for records created by
v1 and v2 writers, and a v2 reader can require it to precede any v2 event.

The cost you must state: a v1 binary reading that log still fails with
`APR_EVENT_INVALID` rather than `APR_READER_UPGRADE_REQUIRED`, because the header
event is itself unknown to it. That is unavoidable and you already argued it
correctly in your R12 response — the gate is for v2 readers and for preflight on
*newly generated* commands, not a retrofit. Please make that scope explicit at spec
552-567, since the current text reads as though the gate protects v1 readers.

---

### B3 — "Refused while any live challenge exists" contradicts the grant it must consume

**R6 residual; self-contradiction. Spec 214-217 vs 219-227.**

Spec 214-217: "`recovery-claimed` advances protocol revision and is refused while
**any** live Human Authority challenge exists."

Spec 219-227: for ordinal ≥ 2, the same `recovery-claimed` event "verifies and
consumes one signed `additional-recovery` grant" — a grant whose challenge is by
definition live at the moment of the claim.

As written, no ordinal-2 recovery can ever be appended.

The codebase already has the correct pattern, and it is one line of wording away.
`applyProjection` calls `consumeChallenge` (`src/protocol/reducer.mjs:565`) **before**
`applyLifecycle` (`reducer.mjs:592`), which is where the `hasLiveChallenge` refusal
lives (`reducer.mjs:416-424`). `consumeChallenge` sets `challenge.consumed_at`
(`reducer.mjs:308`), and `hasLiveChallenge` excludes consumed challenges
(`reducer.mjs:191-199`). That is exactly how `participant-replaced` manages to be in
the refusal list *and* consume its own `replace-participant` grant.

**Requested.** Restate as: `recovery-claimed` is refused while any live Human
Authority challenge **other than the one it consumes** exists, and note that this is
the existing consume-then-check ordering rather than new machinery. Please also fix
the corresponding unit-coverage line (spec 717), which currently reads as a blanket
refusal.

---

## 3. Significant — improved, gap remains

### S1 — Lock liveness has no portable primitive, and the fail-closed path has no operator exit

**R4 residual. Spec 604, 609-625.**

The three-way classification is right. The problem is what it rests on and where it
dead-ends.

**Feasibility.** "Host identity, boot identity, and a platform-derived process-start
identity" are not uniformly available to Node without native code:

- Host: `os.hostname()`. Fine everywhere.
- Boot identity: exact on Linux (`/proc/sys/kernel/random/boot_id`) and derivable on
  macOS (`kern.boottime`). `os.uptime()` is the only portable source and it is
  second-granularity and NTP-perturbed, so it is not a stable identity. Windows has
  no portable primitive.
- Process-start identity: Linux `/proc/<pid>/stat` field 22; macOS via `ps`/`proc_pidinfo`;
  Windows needs `GetProcessTimes`, i.e. native code or spawning a shell helper —
  and spawning a helper during lock acquisition, inside a package that mandates
  `shell: false` and exact-argv discipline (spec 700-701), is a new surface this
  design does not otherwise sanction.

**The dead end.** Spec 616 makes unavailable or ambiguous liveness fail closed, and
spec 621-624 forbids "manual deletion or a force flag," requiring instead "explicit
operator restoration of the original environment." On a platform without a
process-start primitive, every crashed lock lands in
`APR_REVIEW_LOCK_LIVENESS_UNKNOWN` **permanently**, with the specification explicitly
denying the operator any way out. That reinstates the R4 defect on those platforms
rather than fixing it.

**The unclassified common case.** A machine reboot is the single most likely way a
lock becomes stale. After a reboot the host identity matches but the boot identity
does not — and a differing boot identity is *proof* the recorded process is dead,
since no process survives a reboot. Spec 613-616's three buckets do not name this
case. It should be an explicit fourth condition classified as provably absent and
automatically reclaimable, because otherwise the most common real scenario is at the
mercy of how an implementer reads "provably absent."

**Requested.**

1. Name "same host, different boot identity" as provably absent and automatically
   reclaimable.
2. Name the per-platform primitive for boot and process-start identity, or add it to
   §Open planning questions alongside the executable-identity and environment-allowlist
   items that are already there — those two are per-platform for the same reason and
   this one is no different.
3. Define the degraded mode where no primitive exists. "Restore the original
   environment" is impossible by definition after a reboot, so a documented,
   evidence-preserving operator action is required. It need not be a `--force` flag;
   a distinct command that retains the lock to `locks/stale/`, records who reclaimed
   it and why, and refuses to dispatch a provider or touch recovery accounting
   (as spec 625 already requires of reclamation) would satisfy me.

---

### S2 — "Routine cleanup must refuse" is not enforceable, and a nonterminal unavailable record has no exit

**R2 residual. Spec 317-333, 585-589.**

The `lineage-unavailable` / `lineage-invalid` split and the tracked terminal receipt
are good, and they resolve the post-consolidation and fresh-clone cases I raised.
Two things remain.

**1. Spec 319-321 asserts something the package cannot enforce.** "Routine cleanup
must refuse to remove those workspaces while a recovery is pending or before terminal
lineage has been published." The workspaces are in `.scratch/peer-review/`, which
`start` *requires* to be gitignored or it fails `APR_SCRATCH_NOT_IGNORED`
(`src/cli/run.mjs:723-730`). Routine cleanup of a gitignored path is `git clean -xfd`,
`rm -rf`, a CI fresh checkout, or an OS temp reaper. The package owns none of them,
and it ships no `clean` command to constrain. As written this reads as a guarantee
and is a wish.

Please narrow it: package-owned operations (`consolidate --apply`'s source removal at
`src/collateral/review-record.mjs:684-689`, and any future cleanup) must refuse; deletion
by external tooling is outside the package's control and yields `lineage-unavailable`,
which is exactly what the new state is for. That is an honest and sufficient claim.

**2. A nonterminal `lineage-unavailable` record has no stated disposition.** Spec 585
says such a record "cannot launch," and spec 311-315 says recovery and supersession
mutation remain unavailable. Consider the realistic sequence: `replace-attempt`
completes, the predecessor appends `superseded` (terminal — and after that
`ensureStatePreservingAllowed` at `reducer.mjs:311-321` refuses *any* further event on
it), and then the successor's scratch workspace is lost. The record now has no
terminal acceptance, no launchable attempt, and no mutable attempt. `abandon` needs
`intervention-required` state on a live workspace, so it is unavailable too.

I am not asking you to make that recoverable — you scoped cross-machine recovery of
nonterminal records out and I accept that. I am asking you to state the terminal
disposition. If the honest answer is "the record is permanently unresolvable and the
human starts a new record," say so, and say how the abandoned evidence is rendered,
so an operator meeting this state has a documented action instead of a dead end.

---

### S3 — The `additional-recovery` grant needs four concrete extensions the spec does not name

**R5 residual. Spec 219-227.**

The design is right. These are the seams it lands on, all verified in source, and I
raise them because the spec's §Planning decomposition gate asks planning to map
dependency seams and this grant crosses four modules:

1. **`GRANT_PARAMETER_FIELDS`** (`src/authority/canonicalize.mjs:14-53`) is a closed,
   exact-key catalog. Adding `additional-recovery` with your seven parameters is
   additive and straightforward.
2. **`protectedParametersMatchEvent`** (`src/protocol/reducer.mjs:~250-278`) is a closed
   switch whose fallthrough is `return action === 'accept-over-objections'` — so a new
   action defaults to **false** and every grant is rejected as "protected event lacks
   one live bound challenge." This function is precisely where your binding to
   "record, attempt, triggering execution, mode, ordinal, normalized reason, and
   successor" is enforced. It must be named.
3. **The challenge action enum** lives in `validateChallenge`
   (`src/protocol/events.mjs:628`), inside the **v1** event validator, and is reached
   through `challenge-requested` — an existing v1 event type. Spec 552 says new
   payloads use `ai-peer-review.event/v2`. State explicitly that a
   `challenge-requested` / `challenge-superseded` carrying `additional-recovery` is a
   v2 event, or the v1 validator must change and your "v1 bytes are never rewritten /
   v1 validator unchanged" position (spec 542-544) weakens.
4. **`request-grant` flags.** Its flag list (`src/cli/parse.mjs:28-59`) has none of
   `record_id`, `current_review_id`, `triggering_execution_id`, `mode`,
   `resulting_recovery_ordinal`, `normalized_reason_digest`, `successor_review_id`.
   Roughly seven new flags join a closed grammar, and `--record-id` would then exist
   on both `start` and `request-grant` with different meanings. Since spec 229-234
   makes `APR_RECOVERY_EXHAUSTED` print "the exact `request-grant --action
   additional-recovery` parameters," that generated command line must be spelled out
   somewhere — it is the operator's entire interface to the escape hatch.

**Requested:** name these four in the spec (a short paragraph under
§Additional-recovery, or as a §Planning seam). I will not block on the exact spelling
of the flags.

---

## 4. Clarifications

### C1 — `explain` cannot be record-aware without a grammar change

Spec 644 lists `explain` among the surfaces where retry suppression applies. `explain`
takes one positional error code and no workspace (`src/cli/parse.mjs:74,108,135`); it is
an offline static error-catalog lookup. It cannot know whether *this* record is
exhausted. Either drop it from the list, or say its static text for
`APR_RECOVERY_EXHAUSTED` must never contain a provider retry command — which I
suspect is what you meant, and which is a real and worthwhile requirement.

### C2 — `recovery-claimed` is a new event category; name it and justify the revision advance

Every event in the codebase today is either revision-advancing **and** in
`LIFECYCLE_EVENT_TYPES` (`reducer.mjs:5-29`), or non-advancing **and** in
`STATE_PRESERVING` (`reducer.mjs:67-75`). `recovery-claimed` is the first event that
advances protocol revision without being a protocol-state transition — in
`retry-current` the attempt stays in `reviewer-turn` throughout. Please say so
explicitly, because `ensureStatePreservingAllowed` and `applyLifecycle` both branch on
those two sets and an implementer will have to invent the third case.

Related: now that B3 is resolved and nothing is silently invalidated, please state
*why* `recovery-claimed` advances revision at all. I can construct the argument —
forcing any other outstanding grant to be re-signed after a recovery is defensible,
since the world materially changed — but it is the one remaining coupling between
recovery accounting and Human Authority binding, and it is currently unexplained.
Sequence-only, matching the execution events, is the obvious alternative.

### C3 — `start --record-id` is now a strict no-op

Spec 114-115 accepts the flag only when its value equals the generated initial
`review_id` — which is already the default when the flag is omitted
(`src/cli/run.mjs:709`). A flag whose only legal value reproduces the default cannot
change behavior. Keeping it for compatibility is reasonable, but please mark it
deprecated with a removal path in §Rollout, and name the error code for the rejected
case (it is not in the §Stable errors list at spec 627-637).

### C4 — `APR_PERMISSION_UNREPRESENTABLE` needs an actionable recovery string

Every `AprError` carries a recovery string (`src/errors.mjs`), and the package's
convention is that it names the operator's next action. For this error the honest
action is "install Node at a path your provider's permission grammar can express" —
which is a heavy remedy and exactly why it should be written down rather than
discovered. Worth one sentence, given spec 453-460 deliberately removes every
fallback.

---

## 5. What closes this review

**Blocking:** B1 (author identity on the launcher — either resolution is acceptable,
but it must be stated), B2 (compatibility declaration must live in the event log),
B3 (live-challenge self-contradiction).

**Significant:** S1 (lock liveness primitives, the post-reboot case, and a degraded-mode
operator exit), S2 (narrow the cleanup claim; state the terminal disposition for a
nonterminal unavailable record), S3 (name the four grant seams).

**Clarifications:** C1–C4. I will not block on these.

Nothing here requires re-opening a design decision you have already made. B2 and B3
are mechanism corrections to remedies I agree with; B1 asks you to record a
consequence, not to reverse the security property; S1–S3 ask for the per-platform and
per-module specifics that the rest of this document supplies everywhere else.

I want to note for the record that your R10 and R12 qualifications improved my
understanding of the problem, not just the document — the billing-inference argument
for keeping `permission-blocked` spending is stronger than the exemption I floated,
and your point that unknown-event tolerance would make read-only projections unsafe
is correct given `reduceEvents` is the sole projection path.
