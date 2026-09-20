# Reviewer response 1 — revisions requested

- **Artifact under review:** `docs/design/2026-09-17-57-61-peer-review-recovery-architecture-design.md`
- **Reviewer:** Claude (Opus 5)
- **Author:** Codex
- **Review mode:** manual relay (the `peer-review` CLI transport is not in use for this review)
- **Worktree:** `ai-peer-review-worktrees/57-review-recovery-budget` @ `ac5c103` (`codex/57-review-recovery-budget`)
- **Package version inspected:** `0.2.2`
- **Decision:** revisions-requested

---

## 0. What I verified in the codebase

I read the spec end to end and then traced each of its five claimed defects and each
new mechanism against the actual source. Every file/line reference below was read in
this worktree, not inferred.

**The five incident defects are real and correctly diagnosed.** Confirmed:

| Issue | Confirmed at |
| ----- | ------------ |
| #58 first-turn pinning | `src/cli/run.mjs:4209-4241` builds `routing` purely from the invitation's embedded base64url payload; `src/cli/run.mjs:573-578` hardcodes `response` to `paths.reviewerResponse(1)`; `src/provider/claude-launch.mjs:502` prepends `--resume <handle>` to the unchanged **first-turn** `contract.command.args`, which still contain the `join`+`submit` prompt built at `claude-launch.mjs:136-142`. `readLaunchState` (`claude-launch.mjs:384-401`) pins `response` to response 1. The launcher never reads `events.jsonl`. |
| #58 denial misclassification | `deniedExactResponse(providerResult, contract.response)` (`claude-launch.mjs:272-287, 326`) compares denials only against response 1. |
| #59 bare executable | `command: { file: 'claude', ... }` (`claude-launch.mjs:247`); package rules render bare `peer-review` (`claude-launch.mjs:194-197`). |
| #59 inherited environment | `execFile(contract.command.file, args, { cwd, shell: false, encoding: 'utf8' })` (`claude-launch.mjs:506-510`) passes **no `env`**, so the child inherits `process.env` wholesale. |
| #60 unvalidated successor | `supersedeReview` (`src/cli/run.mjs:1629-1643`) checks only the identifier grammar and `!== review_id`; the reducer (`src/protocol/reducer.mjs:326-338`) adds only "registered participant" + "distinct ID". No existence, no reciprocity, no record membership. |
| #61 declaration-as-verification | `src/identity/claude.mjs:5-18` labels `source: 'runtime'` whenever `env.CLAUDE_MODEL_ID` is merely *present*; the event schema's enum is `['runtime','declared']` (`src/protocol/events.mjs:313`). |
| #57 no record authority | Nothing in `src/` counts executions. `max_turns` is per-attempt (`events.mjs:642`), and the launcher appends no events at all. |

So I agree with the spec's central claim: these are one missing boundary, not five
independent bugs. I also agree with, and will not re-litigate:

- the append-only ledger staying protocol authority (invariant 1);
- no clone-shared SQLite / daemon / remote authority (non-goals);
- preflight failure being non-spending and non-recovery-consuming;
- post-dispatch unknown outcome being spending-ambiguous;
- separating session assurance from model attribution, and mapping legacy
  `identity_source: runtime` to `legacy-unclassified` rather than to verified provenance;
- deferring the issue decomposition to planning;
- the repository gate list, which matches `package.json` exactly (`npm test`,
  `test:slow`, `test:packaging`, `lint`, `format:check` all exist).

The findings below are things that will break, or are underspecified in a way that will
force an unreviewable decision during implementation.

---

## 1. Blocking findings

### R1 — `peer-review recover` is an existing command with different semantics

**Severity: blocking. Spec §Architecture → "Record-level recovery transaction".**

The spec writes "The CLI adds:" and then defines
`peer-review recover <workspace> --mode retry-current|replace-attempt --reason <text>`.

`recover` already exists:

- `src/cli/parse.mjs:68` — `recover: frozenList(['--reclaim', '--replace-participant', '--grant'])`
- `src/cli/parse.mjs:100-101` — `peer-review recover <workspace> [--reclaim | --replace-participant <role> --grant <signed-grant>]`
- `src/cli/parse.mjs:320-331` — its constraint block
- `src/cli/run.mjs:1671-1674, 4413` — `recoverReview`, emitting `same-session-reclaim` /
  `participant-replaced` events

That command is the **participant-loss / stale-claim intervention**. The spec's `recover`
is a **record-level spend transaction**. These are different operations on different
authority with different failure modes, and the spec collides them onto one verb without
acknowledging the existing command exists.

This is not cosmetic. The package ships a closed command grammar, `peer-review help --all`
is the documented source of truth, and the peer-review skill instructs agents to "never
guess flags or state transitions." Two unrelated meanings of "recover" — one of which
irrevocably consumes a one-shot allowance — is precisely the ambiguity that grammar is
designed to prevent.

**Requested:** state the disposition explicitly. Either
(a) name the new transaction something else (`recover-record`, `recover-execution`,
`retry-execution`), or
(b) keep one verb and specify the full merged grammar: that `--mode` is mutually exclusive
with `--reclaim`/`--replace-participant`, what `peer-review recover <workspace>` with no
flags now means, and what `help recover` prints. Note that option (b) also needs a rule for
`--reason`, which `abandon` and `supersede` already use with different semantics
(`parse.mjs:69-70`).

---

### R2 — Lineage authority lives in a gitignored directory, and `lineage-invalid` is terminal

**Severity: blocking. Spec §Architecture → "Attempt lineage validation"; §State model.**

The attempt workspace — the event log that the lineage walk must read — is at
`.scratch/peer-review/<review-id>` (`src/collateral/paths.mjs:216-220`), and `start`
**hard-requires** that path be gitignored or it fails `APR_SCRATCH_NOT_IGNORED`
(`src/cli/run.mjs:723-730`). `.gitignore` carries `.scratch/peer-review/`.

The spec then says the record reader "walks from the root through validated successor
receipts," that any missing edge produces `lineage-invalid`, and that in `lineage-invalid`
"provider execution, recovery, **consolidation**, and supersession mutation fail closed."

Consequence: routine, sanctioned cleanup of a gitignored scratch directory — or a fresh
clone, or a different machine, or CI, or `git clean -xfd` — converts a healthy two-attempt
record into one that can never be consolidated. `consolidate` already requires the scratch
workspaces to exist (`src/collateral/review-record.mjs:115-183, 224-237`), so today that
loss costs you consolidation; under this spec it additionally yields a permanent
`lineage-invalid` verdict with no stated remedy. `adopt-record` is explicitly scoped to
legacy v1 records, so it is not the escape hatch.

This also interacts badly with `applyReviewRecord`, which **deletes the tracked attempt
sources** after publishing (`review-record.mjs:684-689`). Post-consolidation, the per-attempt
destination directories the lineage walk might otherwise inspect are gone too.

**Requested:**

1. Split the failure mode. `lineage-invalid` should mean *contradictory* evidence
   (cross-record edge, cycle, branch, digest mismatch) — genuinely fail-closed. A separate
   `lineage-unavailable` should mean *absent* evidence (successor scratch not present on
   this machine), which must remain readable and must **not** block consolidation of an
   otherwise-accepted record.
2. Say where the durable lineage receipt lives. If the only copy is in gitignored scratch,
   the record boundary is machine-local, which contradicts "one logical review record"
   spanning a human process. Either promote a minimal lineage receipt into the tracked
   review collateral (which already coexists in one directory — see R17), or state plainly
   that records are machine-local and that cross-machine recovery is out of scope.

---

### R3 — The launcher will deadlock itself if it holds the review lock across dispatch

**Severity: blocking. Spec §Architecture → "Current-event-authorized execution contract";
§"Launch state and execution events".**

The spec says the launcher "reacquires the attempt lock and proves that the contract's
sequence, revision, current actor, participant, response, and recovery status still match,"
and that "`execution-started` is appended after final preflight and **immediately before
process dispatch**."

`withReviewLock` (`src/protocol/store.mjs:151-211`) is an `O_EXCL` lockfile that is
**non-reentrant** and **non-waiting**: a second acquirer gets `APR_REVIEW_LOCKED` instantly
(`store.mjs:185-190`). The reviewer child process runs `peer-review join` and
`peer-review submit`, both of which go through `mutateReview` → `withReviewLock`
(`src/protocol/service.mjs:580`). If the launcher is still holding the lock when it spawns,
the child cannot join, cannot submit, and every launch fails.

The good news: `mutateReview` (`service.mjs:569-592`) already implements exactly the
lock → re-read → `assertExpected` → validate → `appendLockedEvent` → release sequence the
spec describes, so the compare-and-append primitive exists.

**Requested:** state explicitly that the `execution-started` append completes and the lock
is **released before** `execFile`, and name the residual TOCTOU window between release and
spawn as an accepted, bounded risk (it is bounded — the contract's sequence/revision are
re-checked under the lock, and a competing writer would advance them, making the launched
child's own `join`/`submit` fail closed). Without that sentence, a correct reading of the
current text produces a launcher that never works.

---

### R4 — The crash-recovery table assumes a lock that reclaims itself; it does not

**Severity: blocking. Spec §"Failure and crash recovery".**

Every row of the interruption table promises deterministic resumption — "identical command
completes it", "same deterministic successor is created on retry", "reconcile submission
authority".

`withReviewLock`'s release path only unlinks the lockfile when the recorded token matches
(`store.mjs:202-209`), and there is no TTL, no owner-liveness check, no `--force`, and no
stale-lock error distinct from a live-contention one. A process killed mid-transaction —
which is the exact scenario every row of this table describes — leaves
`<workspace>/locks/review.lock` on disk permanently. From then on, *every* row of the table
returns `APR_REVIEW_LOCKED` instead of the promised deterministic completion, and the
package offers no documented way out.

The claim-based design makes this strictly worse than today: the crash may land *after*
`recovery-claimed` (allowance consumed) and *before* the operation completes, so the record
is in `recovery-pending` with its one allowance spent and its workspace jammed.

**Requested:** this design must own a lock-reclamation contract, because the entire recovery
transaction rests on it. At minimum: how owner liveness is determined (the lockfile already
records `pid` and `acquiredAt`, `store.mjs:165`), what error distinguishes a stale lock from
live contention, and whether reclamation is automatic or an explicit operator step. Also add
a crash-during-lock row to the table.

---

### R5 — There is no specified route out of `recovery-exhausted`

**Severity: blocking (design-level disagreement). Spec §Goals, §Non-goals, §State model,
§"Failure and crash recovery".**

This is my principal architectural disagreement, and I want to be precise about what I am
and am not objecting to. I agree the incident's root cause was an *unbounded* retry loop
with no package-owned authority. I do not agree that the answer is a hard cap of exactly one
recovery per record with no override.

Consider the shape of a real review: `max_turns` permits many reviewer turns
(`events.mjs:642`), and the record spans all of them. Under this design, a single transient
provider failure on turn 5 of an 8-turn review permanently exhausts the record. The spec's
prescribed result is `APR_RECOVERY_EXHAUSTED`, which returns "a human-intervention next
action" — but that next action is never specified anywhere in the document. As written, the
only terminal dispositions available are `abandon` and `supersede`, so the human-intervention
action appears to be "abandon the record and start over," which costs strictly more provider
spend than the recovery it refused.

The package already has the right machinery for this. Human Authority grants exist as a
closed set of protected actions (`src/cli/parse.mjs:28-59`,
`canonicalGrantParameters`/`GRANT_PARAMETER_FIELDS` in `src/authority/canonicalize.mjs`),
with challenge binding, TTL, single-consumption, and attestation strength already enforced
in the reducer (`reducer.mjs:283-309`). `continue` already uses exactly this pattern to
extend an exhausted **turn** budget — a directly analogous problem that the codebase solved
with a signed grant rather than a hard cap.

The spec's Non-goals list says "**Automatic** approval of another recovery" is out of scope,
which reads as leaving manual approval in scope — but it is then never specified, and
invariant 8 ("Full-Auto, persistence instructions, and ordinary resume behavior cannot
override recovery exhaustion") conspicuously omits human grants from its list of things that
cannot override.

**Requested:** resolve this explicitly, one way or the other.

- If a signed human grant may authorize an additional recovery, specify it: a new protected
  action (e.g. `grant-recovery`), its parameter set, and how `recovery_ordinal` and
  invariant 2 are restated (they currently hardcode `0`→`1`, and §"Attempt lineage
  validation" hardcodes "a linear chain with one or two attempts").
- If it may not, say so in invariant 8 and in Non-goals, and **specify the concrete
  human-intervention next action** that `APR_RECOVERY_EXHAUSTED` prints. "Abandon and start
  over" is a defensible answer; leaving it unstated is not.

I will accept either resolution. What I cannot accept is the current state, where the sole
documented exit is a field the spec declines to define.

---

## 2. Significant findings

### R6 — `recovery-claimed` advancing protocol revision silently invalidates live grants

**Spec §Architecture (claim payload), §"Launch state and execution events", §Open planning
questions.**

The reducer binds every outstanding Human Authority challenge to the protocol revision:
`challenge.protocol_revision !== protocol.revision` → `APR_INVALID_TRANSITION`
(`src/protocol/reducer.mjs:283-309`). It also already refuses `same-session-reclaim`,
`participant-replaced`, and `abandoned` while a live challenge exists
(`reducer.mjs:416-424`) — an established precedent for exactly this hazard.

The spec makes `recovery-claimed` revision-advancing and says nothing about outstanding
challenges. If a human has signed or requested a `continue` / `replace-participant` /
`accept-over-objections` grant and a recovery is then claimed, that grant is dead and must
be re-signed by a human.

**Requested:** state the rule. My recommendation is to follow the existing precedent — refuse
`recovery-claimed` while `hasLiveChallenge(protocol, at)` — or require the same transaction
to append `challenge-superseded` and say so.

**Related, and I believe this answers one of your Open planning questions outright:** you ask
"whether execution resolution advances protocol revision or sequence only." Given the
coupling above, `execution-started` and `execution-resolved` **must not** advance revision.
If they did, every single dispatch would invalidate any pending grant, and the launcher would
become an incidental destroyer of human authority. I suggest promoting this from an open
question to a stated invariant.

---

### R7 — Invariant "any non-root attempt must be created by the recovery transaction" silently repeals #21's design, and removes the only producer `consolidate` has

**Spec §"Review record and attempt" (lines 110-113); §"Rollout and compatibility policy".**

`docs/design/2026-09-13-21-review-record-recovery-design.md:37` states: "A replacement attempt
joins an existing human record only through an explicit `--record-id`." That flag exists
(`src/cli/parse.mjs:18`), is sealed into the startup context (`src/cli/run.mjs:709, 734`),
is checked on idempotent retry (`run.mjs:806`), and is a required field of the manifest schema
(`schemas/manifest-v1.json:9`).

`planReviewRecord` requires **at least two** workspaces sharing one `record_id`
(`src/collateral/review-record.mjs:224-256`). Today, `start --record-id <root>` is the only
supported way to produce that second workspace.

The new invariant bans it. But §"Rollout and compatibility policy" never mentions
`--record-id` — it only deprecates the invitation-path launch form and bare executables. So
the spec removes a documented public flag's only purpose without listing it as a compatibility
change, and leaves `consolidate` with no producer except the not-yet-implemented
`replace-attempt`.

One helper detail, in the spec's favour and worth stating: `deterministicReviewId`
(`run.mjs:691-708`) does **not** take `record_id` as an input, so `start --record-id <other>`
against an unchanged artifact already lands on the same `review_id` and the same scratch path,
where the `exactRetry` check at `run.mjs:806` rejects it as a collision. The bypass therefore
only opens once the artifact blob/head changes. That is worth saying explicitly rather than
leaving the reader to derive it.

**Requested:**

1. Add `start --record-id` to §"Rollout and compatibility policy" with its disposition:
   removed, rejected, or accepted-only-when-it-equals-`review_id`.
2. Say what happens to `consolidate` in the interim, and whether existing multi-attempt
   records created via `--record-id` are v1 (needing `adopt-record`) or v2.
3. Reconcile the two `review_id` derivations. §Replace-attempt says the successor ID is
   "derived deterministically from the recovery claim," while `start` derives it from
   content (`run.mjs:691-708`). State which wins for a recovery-created successor, and how
   `start`'s idempotent-retry / collision path (`run.mjs:745-834`) must treat a workspace that
   the recovery transaction created.

---

### R8 — The environment allowlist must remove **same-provider** identity variables, not just cross-provider ones

**Spec §"Executable and environment preflight".**

The allowlist policy says: "preserve required operating-system, locale, provider
authentication, and provider **configuration** variables" and "remove session and model
variables belonging to **other** providers."

The actual #56 hazard is same-provider. `src/identity/claude.mjs:6, 41` resolves the session
from `CLAUDE_CODE_SESSION_ID` / `CLAUDE_SESSION_ID`, and the model from `CLAUDE_MODEL_ID` /
`CLAUDE_MODEL_DISPLAY`. The launcher runs inside the **author's** Claude Code session and
inherits `process.env` wholesale (`claude-launch.mjs:506-510`). So the author's own
`CLAUDE_CODE_SESSION_ID` reaches a Claude **reviewer** child. If the child's own runtime does
not shadow it, the reviewer fingerprints as the author and participant distinctness — the
protocol's core integrity property — collapses silently.

A Claude author launching a Claude reviewer is the *normal* configuration, not an exotic one.
Under the current wording, `CLAUDE_CODE_SESSION_ID` is arguably "provider configuration" and
survives the allowlist. The third bullet ("remove caller-supplied session and model values
that the child could mistake for provider-observed evidence") gets there, but only if the
reader resolves the tension in its favour.

**Requested:** state it directly — the launching participant's own session and model
variables are removed for the same provider, and this is required for author↔reviewer
distinctness, not merely cross-provider hygiene. Name the specific variables for the Claude
adapter, since `sessionIdEnvKeys` is already declared in-code (`identity/claude.mjs:52`) and
the model keys are not.

---

### R9 — Mandating absolute-argv permission rules can make some hosts unlaunchable

**Spec §"Executable and environment preflight".**

"The package command is rendered as the absolute Node executable plus the absolute
package-owned `bin/peer-review.mjs`, never bare `peer-review`."

That rendered string becomes a Claude permission rule via `encodeClaudeBashRule`
(`claude-launch.mjs:125-134`), which **hard-fails** `APR_CLAUDE_PERMISSION_INVALID` if the
rendered command contains any of `* ? [ ] \ ( )`. `renderCommand` / `quoteShellArgument`
(`src/cli/help-data.mjs:390-426`) single-quotes anything outside `[A-Za-z0-9_./:@%+=,-]`.

Injecting the Node install path into that string introduces a path the package does not
control:

- `/opt/homebrew/bin/node`, `/usr/local/bin/node`, nvm paths — fine.
- `C:\Program Files\nodejs\node.exe` — survives only because `portableCommandPath`
  (`claude-launch.mjs:44-47`) rewrites separators; the space then forces quoting.
- `C:\Program Files (x86)\nodejs\node.exe` — contains `(` and `)` → **hard fail**. The
  hardening makes the host unlaunchable.

Separately, the grant must match byte-for-byte what the child actually types. A two-absolute-path,
quoted command is materially more fragile than `peer-review join <path>`, and permission
mismatch is the failure class that consumes the single recovery (see R10).

**Requested:** preflight must *prove* the rendered argv is representable in the provider's
permission grammar on the current platform, and the spec must state the documented fallback
when it is not — refuse the launch, or fall back to a resolved-but-representable form. A
hardening step whose failure mode is "this machine can no longer run reviews" needs its
escape hatch written down.

---

### R10 — The readiness proof is self-referential, and `permission-blocked` spends the only recovery

**Spec §"Executable and environment preflight"; §Recovery; §"Rollout and compatibility policy".**

The spec's preflight requirement — "Readiness proves the current response is allowed while the
artifact and neighboring response files are rejected" — describes a check that **already
exists**: the `readiness` object at `claude-launch.mjs:200-219`. It validates the rule using
`matchesClaudeEditRule` (`claude-launch.mjs:105-123`), which is the package's own
re-implementation of Claude's matcher. It proves the package agrees with itself. It cannot
prove the provider's permission engine agrees, and it did not prevent #56.

Now combine that with §Recovery: "Once dispatch may have occurred, another dispatch is a
recovery." A `permission-blocked` outcome means dispatch definitely occurred, so it consumes
the record's single allowance. The result is that a **package-side permission-encoding bug**
— the most likely residual defect class, made more likely by R9 — silently burns the user's
entire recovery budget.

**Requested:** pick one and state it.

- Add a real provider-side permission probe to preflight (the adapter's documented
  non-model capability probe may be able to validate a rule set without a model turn); or
- classify `permission-blocked` as provably-paid-but-package-caused and exempt it from the
  allowance, with the evidence required to make that classification safe; or
- accept it and say so, with the reasoning, so the tradeoff is on the record.

---

### R11 — The launcher still prints a retry command, outside the one place the spec forbids it

**Spec §"Failure and crash recovery".**

The spec requires that `APR_RECOVERY_EXHAUSTED` "never prints a retry command." That is
necessary but not sufficient. `classifyClaudeReviewerOutcome` emits, on the
`permission-blocked` path (`claude-launch.mjs:331-344`):

```
peer-review launch-reviewer <invitation> --host claude --resume
```

in the `recovery` field of `ai-peer-review.claude-launch-result/v1` — a *success-path*
result envelope, not an error. That is the exact command that produced #56's loop, and it is
also the invitation-path form this spec deprecates.

**Requested:** extend the rule to every result surface. Once the record allowance is consumed,
`recovery` in the launch-result envelope (and any `--json` status projection carrying a
suggested next command) must be suppressed or replaced with the human-intervention next action.
Also state that the suggested command, when one is emitted at all, uses the workspace form.

---

### R12 — No forward-compatibility story; mixed package versions inside one review are the normal case

**Spec §"Legacy compatibility and adoption"; §"Rollout and compatibility policy".**

Both sections address *new package reads old log*. The dangerous direction is the reverse.

`validateEvent` (`src/protocol/events.mjs:921-952`) rejects unknown event types outright and
applies `exactKeys` to both envelope and payload. `reduceEvents` (`reducer.mjs:770-783`)
re-validates **every** event on **every** read. So a `0.2.2` process that opens a workspace
containing a single `recovery-claimed` event fails with `APR_EVENT_INVALID` and cannot even
*inspect* the record — `status`, `resume`, and `explain` all go through the same reducer.

This is not hypothetical. Author and reviewer are separate sessions that install the package
independently; the generated reviewer invitation explicitly offers a zero-install path pinned
to a specific version (`npx --yes ai-peer-review@0.2.2 join ...`, `src/cli/run.mjs:~600`). A
reviewer on the pinned old version joining a review whose author has already written v2 events
is the ordinary case.

**Requested:** add a minimum-reader-version gate sealed into `review-created` (so an old reader
fails with a clear "upgrade to ≥X" rather than "your event log is invalid"), **or** specify a
read-only tolerance for unknown event types that keeps `status`/inspection working while
refusing any mutation. Also decide whether the zero-install invitation line must stop pinning
a version.

---

### R13 — `validateParticipant` has no mechanism for the new separated evidence object

**Spec §"Session assurance and model attribution".**

"New v2 participant events require the separated evidence object" — but
`validateParticipant` (`events.mjs:292-315`) applies `exactKeys` to a fixed 8-field list and is
shared by `review-created`, `reviewer-joined`, `identity-changed`, and `participant-replaced`.
`exactKeys` is all-or-nothing: adding a required field breaks every existing log; adding an
optional one has no established nested pattern. The only two precedents in the codebase are
payload-level `optionalFields` (`events.mjs:935-946`, used once, for `review-created.phases`)
and an ad-hoc `Object.hasOwn(context, 'record_id')` branch (`events.mjs:366`).

The hard case is concrete and will occur: `retry-current` on a legacy record produces **one
log** containing a v1 `review-created` author and a v2 `reviewer-joined` reviewer.

**Requested:** name the mechanism, and state the per-event (not per-log) versioning rule that
makes a mixed log valid. Also confirm that the "readable compatibility mirrors"
(`model_id`, `model_display`, `identity_source`) stay **required** on v2 events, since
`src/manifest/render.mjs` and the manifest schema consume them.

---

## 3. Clarifications and smaller items

### R14 — `launch-reviewer` positional disambiguation is unspecified

`POSITIONAL_GRAMMAR['launch-reviewer']` is `grammar(1)` (`parse.mjs:122`) and the single
positional is resolved as an invitation file (`run.mjs:4210-4211`). Supporting both
`<workspace>` and the legacy `<invitation>` on one positional needs a stated rule
(directory vs regular `.md` file, resolved how, failing with which error), plus updates to
`COMMAND_USAGE` (`parse.mjs:88-89`) and the help catalogue — both of which have golden tests.

### R15 — The actor for the three new events is unspecified

`validateEvent` requires `actor === 'system'` or a sha256 fingerprint (`events.mjs:932`).
`superseded` additionally requires a **registered participant** actor — enforced twice, in the
reducer (`reducer.mjs:326-333`) and in `supersedeReview` (`run.mjs:1633-1643`). But
`launch-reviewer` resolves **no identity at all** today (`run.mjs:4209-4241`); it is the only
command in that dispatch block that skips `resolveIdentity`.

Please name the actor for `recovery-claimed`, `execution-started`, and `execution-resolved`,
and say how the launcher obtains it. If the answer is `system`, say what prevents an
unprivileged process from appending a `recovery-claimed` (the lock and compare-and-append
serialize, but they do not authenticate).

### R16 — Claim payload duplicates envelope fields

The claim payload is specified to carry "the current protocol sequence, revision, and
authority digest." The envelope already carries `sequence` and `revision`
(`events.mjs:161-170`), and `reduceEvents` enforces their contiguity (`reducer.mjs:773-781`).
Two sources for one fact can disagree. If the intent is to record the values the claim was
*compared against*, name them distinctly (`claimed_against_sequence`) so the difference is
legible.

Same class: `recovery_exhausted: true` in the successor's sealed lineage block is derivable
from `recovery_ordinal: 1` and is already asserted by invariant 4. Consider deriving it.

### R17 — Successor collateral legitimately shares a directory with its predecessor

Not a defect — a missing test case, and a check on one of the spec's assertions.

With the default template `<kind>/<date>-<name>-<record-id>` (`paths.mjs:144`), two attempts
in one record started on the same date resolve to the **same destination directory**, with
files distinguished by a `${review_id}-` prefix (`paths.mjs:221-229`). The spec says successor
creation "fails on an existing nonidentical workspace or collateral reservation" — but shared
directory, different prefix is the *correct* outcome here, not a collision.

Please confirm the reservation mechanism (`reserveCollateral` / `releaseReservation`,
`run.mjs:821-827, 1659`) distinguishes these, and add a §Verification case for it. Note the
adjacent wrinkle: `<date>` is the *start date of that attempt*, so a successor created the
next day lands in a different directory with the same `record-id` — worth an explicit case
too, since it affects what `consolidate` sees.

### R18 — Two small wording items

- §Summary says "one initial attempt and at most one recovery operation" while §Goals says
  "one initial execution and at most one recovery." Attempt and execution are distinct terms
  in §Terminology. Please make these consistent.
- §Architecture's `recover` synopsis shows `--reason <text>` as required in both modes but
  §"Stable errors" and §"Failure and crash recovery" never mention reason normalization
  failing. Since "a different mode, reason, execution, or successor conflicts with the
  existing claim," the normalization rule is load-bearing for idempotency and should be
  specified (trim? NFC? case? length bound?).

---

## 4. Summary of what I need to change my decision

Blocking: **R1** (command collision), **R2** (lineage evidence in gitignored scratch +
terminal `lineage-invalid`), **R3** (lock released before dispatch), **R4** (stale-lock
reclamation), **R5** (a specified exit from `recovery-exhausted`).

Significant, and I expect resolution rather than deferral to planning: **R6** (revision
advance vs live grants — and the derived answer to your open question), **R7**
(`start --record-id` disposition), **R8** (same-provider env removal), **R9** (permission-rule
representability), **R10** (`permission-blocked` spending the allowance), **R11** (retry
command in the launch-result envelope), **R12** (forward compatibility), **R13** (participant
schema evolution).

R14-R18 are clarifications; I will not block on them, but they are cheap to fix now and
expensive to discover mid-implementation.

I want to restate that I think the core diagnosis is right and the boundary is the correct
one to draw. My objections are about places where the spec's own invariants collide with
mechanisms that already exist in this repository, and about R5, where I think a hard cap with
no specified exit is the wrong shape for a problem the codebase already solves with signed
human grants elsewhere.
