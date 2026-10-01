# XPR Review — Round 1

- **Artifact under review:** `FROZEN_SPEC.md` ("Agent-First Review API and Portable Runtime Design", issue #107, dated 2026-09-27, source baseline `fa78855`)
- **Expected SHA-256:** `ee2dc3096f1324a999485a941c10ccba951dde36c707cb40d53aff37605c9a89`
- **Reviewer identity:** Claude Opus 5, high effort
- **Author identity:** GPT-6 Astra, high effort
- **Round:** 1 of at most 12
- **Review target:** implementation-bound design for the existing `ai-peer-review` Node.js repository

## Artifact Binding and Verification Statement

I read `FROZEN_SPEC.md` directly from this review directory, in full (1225 lines), and this
review is bound to exactly those bytes as read.

**Digest verification: not independently performed.** Shell execution, code execution, and
tooling outside the read/write file tools are prohibited for this role, so I had no means to
compute SHA-256 over the file. The expected digest above is recorded as asserted by the
orchestration, not verified by me. What I can state positively:

- Direct reading matched the **expected content identity**: the file at the stated path is the
  frozen #107 agent-first review runtime specification, dated 2026-09-27, referencing baseline
  `fa78855`, and it is a single coherent document with no truncation, no conflict markers, and
  no placeholder/TODO gaps.
- The document embeds no self-declared digest, so no in-band contradiction with the expected
  digest was detectable.
- No other file exists in this directory, so there was no ambiguity about which artifact was read.

If byte-level digest confirmation is required for the round to count, it must be performed by a
role permitted to hash the file; this review should then be re-bound to that confirmation.

## Method and Scope Limitations

Two limitations constrain this round and are stated so the author can weigh the findings:

1. **No repository grounding.** The file tools are confined to this review directory, so I could
   not read the `ai-peer-review` sources. Every claim in **Current-State Gap Assessment** (for
   example that MCP exposes only `wait_for_handoff`, that config v1 has one `review.max_turns`,
   that broker authentication requires the native `broker-security` addon and `node-gyp`) is
   reviewed **as written** and was not verified against the repository. Findings below never
   depend on contradicting those claims; they address internal consistency, completeness, and
   implementability.
2. **No backlog access.** Issue bodies for #30/#31/#32/#33/#34/#102/#106/#107 were not readable.
   Backlog findings are therefore based on the ownership boundaries the specification itself
   asserts in **Backlog Ownership and Overlap**, which the document labels provisional.

No web research was needed; none was performed.

## Overall Assessment

This is a strong, unusually self-aware design. It is notably good at the things specifications
usually get wrong: it separates participant topology from process placement and transport, it
refuses to let configuration inject stages, it distinguishes reported/derived/estimated/unavailable
telemetry provenance instead of coercing unknowns to zero, it refuses to present SAR as enforced
peer separation, it keeps acceptance orthogonal to telemetry completeness, and it repeatedly
declines to claim security properties it cannot enforce against same-user software.

The findings below are therefore mostly not disagreements with the design's intent. They are
places where the document is **not yet implementation-bound**: a normative artifact layout that
cannot represent the design's own central feature, an undefined filesystem path model, two
mutually unsatisfiable accounting rules, an acceptance predicate with two different definitions,
an unstated write authority, undefined attached-participant identity, and closed unions (states,
intervention actions, config schema) that lack members the surrounding prose requires. Several
release gates are currently untestable as written.

22 blocking findings and 6 suggestions follow.

---

# Blocking Findings

## XPR-001 — Evidence layout cannot represent multi-stage sequences or stage-attempts

- **Severity:** Critical (blocking)
- **Sections:** Evidence (record tree, `rounds/01-review.md` … `02.patch`); Round Contract and
  Caps ("Each requested stage has an ID; replacements have new stage-attempt IDs under it");
  Fallbacks ("Replacement stage-attempts share the original requested-stage round budget");
  Evidence ("the round contains an attempt-evidence file instead"); Required Verification
  Themes gate 3.

**Problem.** The only normative evidence tree is flat and single-stage:
`review-record/rounds/NN-review.md`, `NN-author-response.md`, `NN.patch`. The design's central
feature is an ordered multi-stage sequence (`SAR -> XPR`) within one run, plus replacement
stage-attempts under each requested stage. Round numbering is defined per stage by the cap
contract (caps are per class: SAR 6, SPR 10, XPR 12), so a two-stage run produces two round 1s
and two round 2s that collide on identical paths. Replacement stage-attempts sharing the same
round budget collide the same way. The layout also has no path for the mandated
"attempt-evidence file" (no-response attempts), for attempt receipts, for the
response envelope versus the sealed payload, or for telemetry amendments.

**Consequence.** Implementers must invent the durable evidence layout, which is exactly the
contract gate 3 ("Reconstruct every round from final bytes and patches") and gate 11 (envelope
extraction, amendments) are supposed to test, and exactly the contract the spec says must be
shared with #30. Two implementations of this document would produce incompatible bundles.
Worse, a naive implementation silently overwrites stage 1's round 1 evidence with stage 2's,
destroying the reconstruction chain that acceptance depends on.

**Required change.** Replace the example tree with a normative path model that includes stage
and stage-attempt segments and names every sealed artifact class, e.g.

```
review-record/
  manifest.json
  events.jsonl
  metrics.json
  stages/
    01-sar/
      attempts/01/rounds/01/{review.md,author-response.md,change.patch,attempt-*.json}
    02-xpr/
      attempts/01/rounds/01/...
  amendments/
```

State explicitly: (a) whether round numbers restart per requested stage or per stage-attempt;
(b) the total ordering rule for patches across stages, since the FUR patch chain must
reconstruct byte versions across stage boundaries; (c) the filename for attempt-evidence files
and why they can never be confused with a review or author response; (d) where the sealed
payload lives relative to the rendered envelope. Then state whether this layout is normative
here or delegated to #30 (see XPR-016).

## XPR-002 — The filesystem path model is undefined; four distinct roots appear with no mapping

- **Severity:** Major (blocking)
- **Sections:** FUR and Worktree Boundary ("the active review folder", "outside the review
  folder"); Evidence (`review-record/`, "append-only package-owned storage outside the
  collaborative folder"); Review Series and Follow-Ups (`record: docs/superpowers/peer-reviews/example/`,
  "a stable series index; each terminal run has a separate immutable record below it");
  Canonical Start Request (`.scratch/peer-review/request.json`); Portable Project-Local Broker
  ("Each physical worktree stores ignored endpoint metadata").

**Problem.** The document relies on at least four distinct storage areas and never defines
where any of them live or how they relate:

1. the **collaborative review folder**, writable by author, reviewer and supervisor;
2. `review-record/`, the portable evidence tree;
3. **package-owned append-only authority storage**, required to be "outside the collaborative
   folder" (its location is never given, though containment rules require it to be resolvable
   and inside the worktree);
4. the **series index** at `docs/superpowers/peer-reviews/<name>/` with immutable per-run records
   beneath it.

Are (2) and (4) the same tree? Is (1) inside (4)? Is (3) inside the worktree at all? The spec
also never states which areas are Git-tracked, even though "Tracked evidence includes normalized
events, metrics, responses, patches, and manifest" asserts tracking for some of it while the
same files sit in a folder participants may freely rewrite, and while endpoint metadata and raw
logs must be ignored.

**Consequence.** Containment, symlink rejection, and "review-folder overlap" validation
(FUR and Worktree Boundary) cannot be implemented or tested without the path model. Gate 4
("headless authority writes … are denied") cannot be specified, because the permission surface
must be handed a concrete deny path for package authority. Gate 3's reconstruction and gate 11's
envelope extraction cannot locate their inputs. `.gitignore` contents are undecidable.

**Required change.** Add a "Storage Layout" subsection defining, as path templates relative to
the physical worktree root: the collaborative review folder, the evidence record tree, the
package-owned authority store, the series index, and runtime scratch (requests, endpoint
metadata, credentials, raw logs). For each, state Git-tracked vs ignored, which roles have
write access, and whether participants ever receive its path. State the rule that the authority
store and credential store must be ignored and outside every participant write scope.

## XPR-003 — Round-scoped metrics aggregation contradicts one-round-per-dispatched-critique

- **Severity:** Major (blocking)
- **Sections:** Round Contract and Caps ("Each dispatched review attempt consumes one round,
  including an interrupted attempt"); Metrics and Comparative Evaluation ("Round metrics
  aggregate all attempts needed to obtain that reviewer or author turn, including failed
  attempts that produced no response"); Accounting Identity and Aggregation ("Each newly
  dispatched critique, including a retry or fallback critique, consumes a new round";
  "Launch attempts before critique admission have no round"); gate 10.

**Problem.** These rules cannot all hold. If every dispatched critique attempt — including an
interrupted one, a retry, and a fallback critique — consumes its own round, then a round
contains **exactly one** critique attempt by construction. Pre-admission launch attempts are
explicitly excluded from rounds and rolled up at stage level instead. So the promise that round
metrics aggregate "all attempts needed to obtain that reviewer … turn, including failed attempts
that produced no response" is unsatisfiable on the reviewer side. It is satisfiable only on the
author side, where "revision retries retain the originating round".

**Consequence.** The accounting partition is ambiguous exactly where gate 10 demands
reconciliation ("Round/stage/run aggregates reconcile to their included attempts"). An
implementer who follows the Metrics sentence will attach multiple critique attempts to one round
and under-consume the cap; one who follows the cap contract will produce reviewer round metrics
that never contain a failed critique attempt, and the no-response attempt-evidence file of
Evidence will sit in a round whose metrics exclude it. Comparative reports of
"failed-attempt overhead" and "retry burden" then mean different things per implementation.

**Required change.** Pick one model and make the other text conform. Recommended: keep
one-round-per-dispatched-critique, and rewrite the Metrics sentence to read that round metrics
aggregate the single admitted critique attempt for that round plus all revision attempts
retaining that round, and that failed/interrupted critique dispatches are each their own
round's sole attempt. Add an explicit statement of where pre-admission launch attempts and
fallback launch attempts are counted (stage scope), and restate the disjointness invariant:
every attempt ID belongs to exactly one of {round, stage, run} scopes.

## XPR-004 — The acceptance predicate has two incompatible definitions

- **Severity:** Major (blocking)
- **Sections:** Round Contract and Caps (step 2, "If no actionable findings remain … accept the
  stage"; "Acceptance requires all requested stages accepted and all findings resolved,
  including reviewer agreement with disputed dispositions"); Findings and Debate ("records …
  reviewer resolution"; "The next review must accept the rationale, refine the finding, or
  maintain the objection"); Resolved Decisions ("Acceptance requires a fresh no-findings pass").

**Problem.** Step 2 makes acceptance a property of the **current** review response ("no
actionable findings remain"). The state rule makes it a property of the **finding ledger** ("all
findings resolved, including reviewer agreement with disputed dispositions"), and every finding
carries a required `reviewer resolution` field. The document never says whether a clean verdict
implicitly resolves all still-open findings, or whether a clean response must enumerate a
resolution for each open finding before it may accept. A reviewer can plausibly emit "no
actionable findings remain" while finding XPR-002 from round 1 has an author disposition of
"disputed" and an empty `reviewer resolution`.

**Consequence.** Acceptance is untestable, which undermines the design's core guarantee. Two
conforming runtimes will disagree about whether the same round-N response accepts the stage.
The related prohibition "No intervention may turn unresolved findings into normal acceptance"
becomes unenforceable, because "unresolved" is undefined.

**Required change.** Define acceptance as a single computable predicate. Recommended: a clean
critique response must carry an explicit terminal disposition for every finding open at the
digest it reviewed, and the runtime must reject a clean verdict that leaves any finding without a
reviewer resolution (error code + `next_action` naming the missing finding IDs). State whether
`withdrawn`/`accepted-rationale`/`superseded` count as resolved, and add a release gate that a
clean verdict with an unresolved disputed finding fails rather than accepting.

## XPR-005 — Frontmatter injection writes the FUR with no granted authority

- **Severity:** Major (blocking)
- **Sections:** Review Series and Follow-Ups ("Capture the user's exact initial bytes before
  adding metadata. A Markdown FUR then receives a stable pointer through a format-aware
  frontmatter merge"); FUR and Worktree Boundary (permission table; "Only the registered author
  may change the FUR during an author turn. Unexpected changes create conflict rather than being
  absorbed."; "The supervisor, not a participant, generates patches"); Evidence ("Preserve any
  format-aware metadata change as a separate initialization patch").

**Problem.** The runtime itself mutates the FUR to insert the `ai_peer_review` frontmatter
pointer. The permission model grants FUR write to the author only; the supervisor appears in the
table for the review folder but not for the FUR, and its stated FUR interaction is snapshotting
and patch generation. So the design's own conflict detector ("Unexpected changes create
conflict") would be triggered by the design's own write. Timing is also unspecified: is the
pointer written before the round 1 snapshot (so the reviewed digest includes bytes the user never
wrote), after acceptance, or at terminal sealing? And the asymmetry with non-Markdown files
(package-owned sidecar, no FUR mutation) means Markdown users get their working file edited
while others do not, with no opt-out — against a FUR the spec explicitly allows to be
tracked-dirty and open in an editor.

**Consequence.** Implementers will either skip the pointer (breaking automatic lineage, a
Resolved Decision) or write it and trip conflict/lease logic. The digest that acceptance binds
may or may not include runtime-authored bytes, making "prior final digest, current digest, and
intervening delta" validation in the next run non-deterministic across implementations. Editing
a user's dirty working file without stated authority is also a genuine trust problem.

**Required change.** Grant and bound supervisor FUR write authority explicitly: add the
supervisor to the FUR permission table for the single, enumerated operation of the format-aware
metadata merge; specify the exact lifecycle point at which it occurs; state whether the reviewed
digest in round 1 is pre- or post-merge; require the initialization patch to make the merge
reversible; and add either an opt-out to the sidecar mechanism for Markdown FURs or an explicit
statement that Markdown FUR mutation is mandatory and surfaced in the receipt before it happens.

## XPR-006 — Participants may be fed mutable collaborative bytes instead of sealed evidence

- **Severity:** Major (blocking)
- **Sections:** FUR and Worktree Boundary ("The two-party reviewer may create or edit any file
  inside the active review folder, including earlier in-progress collateral"); Round Contract
  and Caps (step 7, "The next round reviews the revised FUR, author response, and any evidence
  allowed by visibility policy"); Evidence ("Preserve submitted response bytes … before
  acknowledging a submission. Later collateral edits are allowed but cannot rewrite those sealed
  facts"); Visibility and Session Continuity ("Record supplied context digests").

**Problem.** Both participants hold read/write/create over the whole review folder, including
each other's already-submitted response files. Sealing protects the *evidence*, but the spec
never says that the bytes **supplied to the next participant** come from the sealed package-owned
store. If the runtime supplies the collaborative copy, an author can edit the reviewer's sealed
round-1 findings file, and the next reviewer's independent pass is conducted against tampered
input while the bundle verifies clean.

**Consequence.** The integrity story is bypassable without touching sealed evidence at all: the
review was performed on content nobody sealed. "Record supplied context digests" would record the
tampered digest, so the tamper is detectable only by a post-hoc comparison the spec does not
require anyone to perform. This defeats the reviewer/author boundary named in Goals.

**Required change.** State normatively that all prior-round evidence supplied to any participant
is materialized from the sealed append-only store, never read from the collaborative folder;
that the runtime records both the sealed digest and the supplied digest and fails or raises an
integrity diagnostic when a collaborative copy has diverged from its seal; and add this to the
gate-3 family ("Mutating old collateral never changes sealed evidence") as a second assertion —
mutating old collateral also cannot change what the next participant sees.

## XPR-007 — Attached-participant identity and authority are undefined

- **Severity:** Major (blocking)
- **Sections:** Stage and Participant Resolution ("Attached roles inherit the current-session
  identity"; "Attached identity is verified before reservation; two-party roles cannot share a
  session"; "Attached identity is runtime-derived, never supplied as a fingerprint by the
  caller"); Disconnect and Recovery ("Attached-author runs may finish the reviewer turn, then
  wait for exact author"; "Another chat reconnects by run ID using durable authority" grants
  "neither authority nor an attached role"); Agent-First MCP and CLI ("Controller-only
  credentials cannot submit participant turns"); gate 9.

**Problem.** Attached-role identity is load-bearing for four separate guarantees (verification
before reservation, two roles cannot share a session, waiting for the *exact* author after a
disconnect, and controller-only credentials being unable to submit a verdict), but the document
never defines what an attached session's verifiable identity **is**, how it is derived, where it
is durably stored, or how a returning chat proves it is the same session rather than a new chat
of the same model. "Runtime-derived" names a constraint, not a mechanism.

**Consequence.** Gate 9 ("Controller-only access cannot submit a verdict"; "Wrong-role …
submissions fail") is untestable, and the disconnect rule is unimplementable: the run waits for
an "exact author" it has no way to recognize. In the likely case the originating chat is
unrecoverable, the only exit is `replace-participant` with recorded user authorization — which is
correct, but should be stated rather than discovered.

**Required change.** Define the attached-participant identity and authority model concretely:
what the runtime derives it from (host adapter session handle, transport binding, launch
identity per #90 — name it), what durable non-secret fingerprint is stored, how re-attachment is
verified after transport loss, what happens when verification is impossible, and how
participant authority is issued separately from controller authority for the same chat (see
XPR-008). State the fallback rule explicitly: an unrecoverable attached participant requires
user-authorized `replace-participant`, and the run remains `awaiting-attached-participant`
indefinitely until then or until cancel.

## XPR-008 — Enforced role separation contradicts the stated same-user trust boundary

- **Severity:** Major (blocking)
- **Sections:** Non-Goals ("Resisting malicious software already running as the same OS user");
  Portable Project-Local Broker ("The portable same-user boundary protects against accidental
  cross-project access and unauthenticated clients, not malicious same-user software");
  Agent-First MCP and CLI ("Authentication travels in the local transport binding, never
  model-visible JSON"; "Controller-only credentials cannot submit participant turns"; "monitor
  access is scoped separately from controller mutation authority"); gate 9.

**Problem.** Every credential the design uses is a file readable by the invoking OS user, and
the CLI — the mandated final fallback — authenticates by reading it. Any same-user caller can
therefore present any role's credential. The spec simultaneously asserts real role separation
(controller-only cannot submit, monitor scoped below controller, two-party reviewer cannot write
FUR) and disclaims the only boundary that could enforce it.

**Consequence.** Gate 9 will pass while testing something much weaker than it appears to test:
that a caller *presenting* the controller-only credential is rejected, not that a controller
*cannot* submit a verdict. A reader — or a downstream security review — will over-trust the
reviewer/author boundary. This matters because the document is otherwise scrupulous about
labelling assurance levels (it does exactly this correctly for SAR in FUR and Worktree Boundary).

**Required change.** Add an explicit assurance statement, parallel to the SAR one: role
separation among same-user callers is an accountability and mistake-prevention control recorded
in the event stream, not a security boundary against a same-user actor. Then specify the
segregation that does exist: participant credentials are delivered only into the headless
provider's process environment and never to the controller; the attached-participant grant is
per-turn and scoped to one `stage_attempt_id`/`round`/`phase`; monitor credentials are read-only
and separately derived. State which of these are enforced versus advisory, and record the
assurance label in the manifest alongside the SAR one.

## XPR-009 — Closed intervention union provides no exit from mandated reconciliation states

- **Severity:** Major (blocking)
- **Sections:** Disconnect and Recovery (`intervene_review` union: cancel, resume,
  replace-participant, extend-cap; "unknown provider effects block resume/replacement"; "Cancel
  … reports cancelled only after that is confirmed"); Fallbacks ("Ambiguous edits require
  intervention"; "When safe termination cannot be proved, fence the run and preserve recovery
  state"); Review Series and Follow-Ups ("Malformed/conflicting pointers, ambiguous copied
  series IDs and missing records require reconciliation"); Portable Project-Local Broker ("stale
  ownership needs reconciliation, never age-only takeover").

**Problem.** The design mandates several fail-closed states and then closes the intervention
union without a member that can resolve them:

- If provider effects are unknown, `resume` and `replace-participant` are blocked, and `cancel`
  may only report cancelled once termination is *confirmed* — which is precisely what cannot be
  confirmed. There is no state-exit action. The run is permanently stuck in
  `intervention-required`/fenced with no operation that can change it.
- Malformed, conflicting, or ambiguously copied series pointers "require reconciliation", but no
  tool or action performs pointer reconciliation, and `start_review` must fail.
- "Ambiguous edits require intervention" does not name which action resolves them or how the
  operator chooses between the preserved checkpoint and discarding it.

**Consequence.** Fail-closed becomes fail-stuck. Operators will work around it by deleting state
by hand, which is exactly the uncontrolled path the design exists to prevent, and it will not be
recorded in the event stream.

**Required change.** Add the missing recovery members to the closed union and specify each:
(a) `acknowledge-unresolved` (or `force-terminate`) — operator-authorized, explicitly recorded,
requiring a stated reason, which moves a fenced run to `failed`/`cancelled` with a recorded
assurance downgrade ("termination not proved") rather than a clean cancellation claim; (b)
`reconcile-series` — repairs or re-points a malformed/ambiguous series pointer, or explicitly
starts a new lineage, recording the prior pointer bytes; (c) `resolve-checkpoint` — accepts or
discards preserved partial author bytes before replacement. For each, state that it requires
explicit user authorization recorded in the event stream, that it can never convert unresolved
findings into acceptance, and that it never silently claims cleanup succeeded.

## XPR-010 — "Controller calls wait_for_review once" contradicts the attached-participant journeys

- **Severity:** Major (blocking)
- **Sections:** Out-of-Band Monitor and Usage ("start_review returns a receipt, then the
  controller calls wait_for_review once"; "On capable hosts the model wakes only for attached
  work, intervention, or terminal state"); Required User Journeys 3 and 5; Round Contract and
  Caps (`awaiting-attached-participant`); Agent-First MCP and CLI (`submit_review_turn`).

**Problem.** In journeys 3 and 5 the attached current agent is the author. Every round therefore
requires the controller model to wake, revise the FUR, call `submit_review_turn`, and then wait
again. A 12-round attached-author XPR involves up to 12 wait calls, not one. The same section
already acknowledges detach/reattach on transport timeouts, so "once" is doubly wrong.

**Consequence.** An implementer reading the API contract literally will build a single-shot wait
that cannot support two of the six required journeys, or will conclude `wait_for_review` must
internally block across attached turns — which is impossible, since the attached turn requires
model inference. It also muddies the zero-token claim, because the number of legitimate model
re-entries is a function of journey and round count.

**Required change.** Rewrite as: the controller calls `wait_for_review` after the receipt and
re-calls it after each attached turn, intervention, or observer detach, always resuming from the
durable cursor. State the invariant precisely — the number of model wakeups is bounded by
(attached turns + interventions + host-forced re-entries + 1 terminal), and is zero beyond that
+1 for controller-only journeys. Add a release gate asserting the wakeup count for a
controller-only two-headless run is exactly 1 (terminal), and for an attached-author run equals
the number of author turns plus 1.

## XPR-011 — Status response contract lacks the liveness dimensions gate 6 requires

- **Severity:** Major (blocking)
- **Sections:** Agent-First MCP and CLI ("Run responses include run_id, status, revision,
  cursor, evidence paths and the applicable capability/usage provenance"); Round Contract and
  Caps (run state enum: starting, running, awaiting-attached-participant, reconciling,
  intervention-required, accepted, cancelled, failed); Out-of-Band Monitor and Usage
  ("Distinguish broker heartbeat, provider-process health, provider output and protocol
  progress"; "Show the last successful observation and stale status when monitoring itself
  disconnects"); gate 6.

**Problem.** Gate 6 requires that "Disconnect, quiet reasoning, process death, broker restart
and second-launch failure produce **distinct observable states**". The run-state enum has eight
members and cannot distinguish those five conditions — several of them map to `running` or
`reconciling`. The monitor section correctly says the distinctions live in separate dimensions
(broker heartbeat, process health, provider output, protocol progress, last successful
observation, staleness, fencing), but the response contract does not include any of those fields.
"Fenced" also appears throughout as a condition with no representation in the state enum or the
response.

**Consequence.** Gate 6 is untestable as written, and the monitor cannot be built on the
specified API. Two implementations will invent different status shapes, breaking the "consumers
do not infer state transitions from prose summaries" principle from Errors and Self-Discovery.

**Required change.** Extend the run response contract with the observability dimensions
explicitly: a `liveness` object carrying broker heartbeat age, per-participant provider process
health, last provider output timestamp, last protocol progress timestamp, monitor staleness, and
last successful observation; a `fencing` object naming fenced participants/operations and the
reason; and per-participant phase/role state. State that run `status` is coarse and that gate 6's
"distinct observable states" is asserted over the tuple of (status, liveness, fencing), then
rewrite gate 6 to name the exact tuple expected for each of the five conditions.

## XPR-012 — Fallback class authorization and cascade eligibility are under-specified

- **Severity:** Major (blocking)
- **Sections:** Review Class ("SAR cannot automatically become a two-party class or vice versa;
  only SPR/XPR class changes retain the same role topology"); Stage and Participant Resolution
  ("fallback_kinds is an explicit allowed class set, defaulting to the requested class unless a
  profile explicitly authorizes a different allowed set"; "Changes that alter role count need a
  new user-requested stage"; "A request override is explicit intent and is sealed"); Fallbacks
  ("Candidates are tried once per role per requested stage, in sealed order, without cycling";
  "Classification may change only when the resolved cascade preauthorized it"); Configuration
  (the `deep-review` profile).

**Problem.** Two distinct gaps.

1. **Role-count-changing `fallback_kinds` has no validation rule.** Nothing says what happens
   when a request or profile sets `fallback_kinds: ["sar","xpr"]` on an SPR stage. Review Class
   forbids the transition; Stage Resolution says a request override "is explicit intent and is
   sealed". So is such a set rejected at validation time (before mutation), accepted and sealed
   but permanently unusable, or silently narrowed — which Non-Goals forbid ("Silently weakening
   a requested … fallback policy")?
2. **Class eligibility of cascade candidates is undefined.** The normative `deep-review` profile
   has `author: [codex/gpt-6-astra]` and `reviewer: [claude, grok, codex/gpt-6-astra]`. For a
   requested XPR with that author, the third reviewer candidate is same-family and would make the
   stage an SPR — not permitted under the default `fallback_kinds`. The spec never says whether
   class-ineligible candidates are filtered when the cascade is sealed or skipped at fallback
   time, nor whether a skipped candidate consumes its single permitted try, nor what the sealed
   display shows the user.

**Consequence.** The design's headline example config is unusable for its headline XPR journey
without a rule that does not exist. Gate 2 ("Quota replacement shares the cap and exhausts a
finite candidate list") is unimplementable, because the size of the finite list depends on the
undefined filtering rule. The user-facing seal ("The runtime displays and seals the complete
intended … fallback chain") cannot be rendered.

**Required change.** (a) State that a `fallback_kinds` set implying a role-count change is a
validation error before mutation, with the error code, JSON Pointer, and correction — and that
this applies to profile-supplied sets as well, so an over-broad profile fails loudly rather than
being narrowed. (b) State that class eligibility is evaluated **at seal time** against the
resolved counterpart role, that ineligible candidates are excluded from the sealed cascade and
shown as excluded with a reason in the pre-launch display, and that excluded candidates never
consume a try. (c) Add a worked example of the `deep-review` profile resolving for both a
requested SPR and a requested XPR, showing the sealed cascade for each.

## XPR-013 — Config v2 is declared closed but the normative example omits required keys

- **Severity:** Major (blocking)
- **Sections:** Configuration ("Configuration is closed, versioned, and credential-free"; the
  `ai-peer-review.config/v2` example; "Project profiles replace/add closed named units");
  Stage and Participant Resolution ("unless a profile explicitly authorizes a different allowed
  set"); Current-State Gap Assessment ("It needs v2 class caps, named role-specific cascades,
  fallback authorization, monitoring policy, and user/project merge behavior");
  Out-of-Band Monitor and Usage ("A configurable hard timeout"; "configurable telemetry grace
  period"); Portable Project-Local Broker ("a configurable idle grace").

**Problem.** Configuration is closed (unknown fields fail) and profiles are "closed named
units", yet the only normative v2 example contains just `review.round_caps` and
`orchestration.profiles.<name>.{solo,author,reviewer}`. The rules elsewhere require config to
carry: per-profile fallback class authorization, monitoring policy (liveness intervals, hard
timeout), broker idle grace, telemetry grace period, diagnostic retention duration, analysis
weighting profiles, and user/project merge semantics. Under a closed schema, none of those can
be expressed.

**Consequence.** Either the schema is not actually closed, or the authorization and policy rules
that depend on config are unreachable — including the `fallback_kinds` profile authorization that
XPR-012 turns on. Implementers cannot write the JSON Schema the help registry must emit.

**Required change.** Publish the complete v2 skeleton with every key the document's rules
reference, including at minimum `orchestration.profiles.<name>.fallback_kinds` (per role or per
profile — say which), `monitoring` (liveness interval, warn threshold, reconcile threshold, hard
timeout), `broker.idle_grace`, `telemetry.grace_period`, `diagnostics.retention`, and the merge
rule. State the merge semantics normatively: which units replace wholesale, which merge by key,
and that arrays are never interleaved (already asserted — make it a schema-level statement).
Where a default is deferred (Deferred Low-Level Choices), still reserve the key.

## XPR-014 — Migration gap: manual XPR is retired before its replacement can be admitted

- **Severity:** Major (blocking)
- **Sections:** Relationship to Current Architecture ("It replaces assumptions that … manual XPR
  is a human-relayed product mode"); Backlog Ownership and Overlap (#107 row: "Its current
  requirement for broker-free manual XPR conflicts with the approved rule that managed headless
  work uses the project-local broker"); Portable Project-Local Broker ("All six journeys are
  required product goals, not claims of existing adapter support"; "Unsupported combinations fail
  preflight with an actionable capability report"; "Generalized headless authors and SAR workers
  are new adapter work"; "A headless provider must expose a tested permission surface … If
  unavailable, fail that topology's capability check"); Fallbacks ("An unavailable stage may use
  only an explicitly declared ordered alternative. Undeclared downgrade or silent skip is
  forbidden"); Migration Principles.

**Problem.** The design removes human-relayed manual XPR as a product mode while stating plainly
that the replacement — headless adapters with tested enforcement of role write scope,
cancellation, and descendant containment — is new, unbuilt work that must fail preflight until
installed conformance tests pass. Composing those rules: at first release, any journey requiring
a headless role (2, 3, 4, 5, 6) fails preflight until at least one provider passes the full
matrix. Journey 1 (inline local SAR) is the only guaranteed-available mode. Manual relay, the
mode that demonstrably works today — this very review is being conducted in it — has no
declared successor path and no transitional representation. **Migration Principles** never
mentions the deprecation at all.

**Consequence.** A release could ship that cannot run any cross-provider review, having removed
the one mechanism that could. "Undeclared downgrade or silent skip is forbidden" means the
runtime cannot even degrade to relay, because relay is not a declared alternative. This is the
single largest delivery risk in the document and it is currently invisible in the migration and
gate sections.

**Required change.** Choose one and state it in **Migration Principles** and **Fallbacks**:
either (a) retain operator-relayed execution as an explicitly declared third `placement` value
(e.g. `relayed`) with its own capability record, assurance label ("no enforced role separation;
operator-mediated transport"), and evidence provenance, available as a declarable ordered
alternative; or (b) add a release gate forbidding removal of the existing manual XPR startup path
until at least one cross-family headless reviewer pair passes the installed conformance matrix,
and state that the two paths coexist until then. Either way, add a migration note for users of
the current manual mode, and reconcile the #106 row (which preserves "manual-startup lessons" but
not the capability).

## XPR-015 — v1 config behavior under the new runtime is undefined

- **Severity:** Major (blocking)
- **Sections:** Migration Principles ("The v1 config reader remains available for legacy use; v2
  migration is explicit and never maps max_turns to max_rounds as if they counted the same
  events"; "Unknown schema versions fail with version/help guidance, not permissive parsing");
  Configuration ("Existing sources remain user installation config and project/worktree
  .ai-peer-review.json"; precedence "stage request, project config, user config, then package
  default"); Current-State Gap Assessment ("Configuration v1 has one `review.max_turns`").

**Problem.** The spec forbids mapping `max_turns` to `max_rounds`, keeps the v1 reader available,
and never says what a new run does when it encounters a v1 project config. Does the run refuse?
Proceed with package default caps while ignoring `max_turns`? Proceed with a surfaced notice?
A user who deliberately set `max_turns: 4` to bound cost would silently get XPR 12 rounds — a
3x cost increase from an upgrade, which is a real and quiet regression.

**Consequence.** Upgrade behavior is implementation-defined in the one dimension users most
directly feel (cost/round budget). Gate 8 covers legacy *active work* but not legacy *config*.

**Required change.** State the rule explicitly. Recommended: a v1 config is readable for legacy
runs but a new run under the new runtime requires v2 for any key whose semantics changed; if a v1
config is present, `start_review` (and `preview_review`) surface an explicit migration notice
listing every v1 key that will be ignored, its v2 equivalent, and the cap that will actually
apply, and the applied caps plus their precedence source are recorded in the manifest. Add a
release gate: a v1-config project either fails with migration guidance or runs with the notice
recorded — never silently adopts different caps.

## XPR-016 — The spec normatively defines artifacts it assigns to #30 and #34

- **Severity:** Moderate (blocking)
- **Sections:** Backlog Ownership and Overlap (#30 row: "Own canonical artifact lifecycle,
  compact evidence, stable series/chain identity, package-generated patches, indexes, and
  migration. The runtime consumes these contracts rather than creating a second evidence system";
  #34 row: "#34 owns experiment arms, controls, scoring methodology, and non-delivery comparison
  workflow"); Evidence; Review Series and Follow-Ups; Metrics and Comparative Evaluation
  ("Analysis distinguishes stage yield, marginal yield, residual defects, and quality improvement
  per token, dollar, and minute … Analysis profiles may weight dimensions"); gates 3 and 11.

**Problem.** The document assigns evidence layout, series/chain identity, package-generated
patches, and indexes to #30, then itself specifies the record tree, patch naming, digest-input
semantics, manifest inventory rules, envelope framing, amendment contract, and the frontmatter
series pointer — and binds release gates 3 and 11 to them. Likewise it assigns scoring
methodology to #34, then specifies the scorecard dimensions, marginal/residual yield, per-token
/dollar/minute quality measures, and weighting profiles. "Optional human quality" in the
normalized record set is similarly #33/#34 territory.

**Consequence.** The document's own stated "principal collision is #107 versus #30/#34" is
reproduced inside the design rather than resolved. Implementation could freeze a layout and an
analytics vocabulary that #30/#34 then redefine, producing exactly the "two evidence layouts or
analytics vocabularies" the table exists to prevent.

**Required change.** Mark ownership inline, not only in the table. For each of the Evidence,
Review Series, and Metrics sections, add an explicit ownership line stating whether this document
is (i) declaring the contract that #30/#34 must adopt, or (ii) recording provisional requirements
pending those issues' plans — and in case (ii) mark the affected release gates as
contract-dependent. If (i), update the #30 and #34 rows so ownership is consistent in both
places. At minimum, name the specific schemas this design must *emit* versus *consume*.

## XPR-017 — Dual-installation legacy drain is not reconciled with #102

- **Severity:** Moderate (blocking)
- **Sections:** Migration Principles ("Active legacy reviews remain pinned to their compatible
  installed runtime and authority format until drained"; "The new package neither rewrites live
  journals nor ships the retired native helper to resume them. Upgrade preflight reports these
  dependencies and requires retaining the old installation when needed"; "Keep #102 version
  policy independent"); Backlog Ownership and Overlap (#102 row: "Own package pinning and
  cross-entry-point version compatibility … enforce its policy in every new CLI, MCP, broker, and
  worker entry point"); Portable Project-Local Broker ("Linked worktrees can run concurrently on
  distinct ports with independent authority and package versions").

**Problem.** Draining legacy runs requires two AIPR installations to coexist and requires a run
to resolve to its pinned runtime rather than the current one. #102 is declared independent and is
tasked with enforcing cross-entry-point version compatibility in *every* entry point. Whether
#102's policy permits per-run pinned coexistence — and how an entry point decides which runtime
owns a given run — is never stated. "Independent authority and package versions" is asserted
per-worktree, but a legacy run and a new run can live in the *same* worktree.

**Consequence.** Either the drain path violates #102's version policy at runtime, or #102 must
change — and the spec forbids changing it here. The upgrade path is thus unresolvable as
specified, and gate 8 ("Legacy active work stays recoverable under its pinned installation")
cannot be satisfied without a rule that does not exist.

**Required change.** State the per-run runtime resolution contract: where a run records its
pinned runtime version, how CLI/MCP/broker/worker entry points dispatch to it, and what happens
when the pinned installation is absent. Add an explicit dependency on #102 — that its policy must
permit per-run pinned runtime coexistence within one worktree — and remove or qualify "Keep #102
version policy independent" accordingly, since this design imposes a requirement on it.

## XPR-018 — Broker wire protocol is unspecified while its security rules mix protocol models

- **Severity:** Moderate (blocking)
- **Sections:** Portable Project-Local Broker ("Each broker binds 127.0.0.1 on port 0"; "Reject
  unauthenticated traffic before dispatch, browser-origin requests, wrong-instance requests and
  oversized frames"; "No CORS-enabled public browser control endpoint is provided"); gate 5
  ("Wrong tokens, instances and browser origins fail").

**Problem.** The transport is described only as loopback TCP. The security requirements
simultaneously invoke HTTP concepts (CORS, browser origins) and custom-framing concepts
(oversized frames), so an implementer cannot tell whether the broker speaks HTTP or a private
framed protocol. This matters concretely: if HTTP, a loopback listener with bearer-credential
auth is reachable from a browser via DNS rebinding unless the `Host` header is validated against
literal loopback addresses — and `Host` validation is nowhere required. If private framing,
browsers cannot speak the protocol at all and the CORS/origin language is misleading.

**Consequence.** Gate 5's "browser origins fail" test may pass by checking an `Origin` header
while the actual rebinding vector (a `Host` header of an attacker-controlled name resolving to
127.0.0.1) stays open. The design's local-only assumption is then weaker than stated against
non-same-user attackers — the one class it does claim to resist.

**Required change.** Specify the wire protocol explicitly. If HTTP/1.1: require a `Host` header
allowlist of literal loopback addresses plus the bound port (reject any hostname), require the
credential in a request header (never in URL, query, or body logged anywhere), reject requests
carrying `Origin` or browser `Sec-Fetch-*` indicators, and define max body size and request
timeout. If private framing: say so, define the frame header, handshake, max frame size, and
state that browser-origin language is a non-applicability note. Extend gate 5 to include a
rebinding-style `Host` mismatch case.

## XPR-019 — Derivative broker index and cross-worktree credential access are unspecified

- **Severity:** Moderate (blocking)
- **Sections:** Portable Project-Local Broker ("Each physical worktree stores ignored endpoint
  metadata with worktree fingerprint, instance ID, port, credential digest, and heartbeat. The
  random credential is separate and untracked"; "Atomically publish endpoint records only after
  exclusive worktree ownership is established"); cleanup paragraph ("It resolves the Git common
  directory and enumerates all linked worktrees, including those under provider directories such
  as ~/.claude. A derivative project broker index supports removed-worktree cleanup without
  sharing run authority"; "gracefully stops authenticated idle brokers"); gate 5.

**Problem.** Two gaps. (a) The derivative project broker index has no specified location,
ownership, writer-concurrency rule, or ignored status, even though every linked worktree can
write it concurrently and the spec elsewhere insists on atomic publication under exclusive
ownership. (b) Stopping an idle broker in worktree B from worktree A requires authenticating
with B's credential, so the cleanup client must read other worktrees' untracked credential
files. That is consistent with the same-user boundary but is never stated, and `cleanup_brokers`
is an agent-callable MCP tool whose output must not leak what it read.

**Consequence.** Concurrent cleanup/startup across linked worktrees can corrupt the index;
"never kills from stale PID text" is preserved, but stale-record quarantine has no defined
storage. And an agent-facing tool performs cross-worktree credential reads with no stated
non-disclosure rule, against a design that elsewhere forbids exposing credentials "to participant
prompts, collateral, URLs or logs".

**Required change.** Specify the index: path (state whether Git common directory or user-scope),
ignored status, the lock or atomic-rename protocol for concurrent writers, and an explicit
statement that it is advisory discovery data and never authority for termination or run state.
Specify cleanup authentication: the runtime reads each target worktree's credential directly,
credential material and digests never appear in tool responses, structured output, or logs, and
a worktree whose credential is unreadable is reported as unreconciled rather than force-stopped.
Add these to gate 5.

## XPR-020 — "Currently observable capabilities" conflicts with no-launch-before-validation

- **Severity:** Moderate (blocking)
- **Sections:** Canonical Start Request ("For a new request, policy and currently observable
  capabilities are validated before mutation"; "Preflight cannot guarantee future quota or
  availability"); Errors and Self-Discovery ("Invalid requests fail before broker startup, state
  creation, or provider launch"); Portable Project-Local Broker ("Admission requires a versioned
  capability matrix for the exact host/model/effort … Installed conformance tests, not selector
  presence or model-name examples, establish support"); Fallbacks ("Unknown exits,
  authentication, permission, and ambiguous delivery enter intervention").

**Problem.** "Currently observable" implies live probing, but validation must complete before
broker startup and before any provider launch, and admission is grounded in a static installed
conformance matrix. The document never says what observation sources are permitted pre-mutation
or which failure classes are detectable there. This is not academic: provider authentication
state is a common pre-launch failure, and the spec routes authentication failures to intervention
during the run rather than to preflight.

**Consequence.** `preview_review` ("optional and read-only, not a reservation") and `start_review`
preflight have undefined strength. Gate 4's "A capability mismatch fails preflight rather than
weakening enforcement" cannot be tested without knowing what preflight may look at.

**Required change.** Enumerate the permitted pre-reservation observation sources: the installed
versioned capability matrix, local non-mutating checks (provider CLI presence, version,
adapter-reported auth status where obtainable without creating a session), and configuration
resolution — with an explicit prohibition on creating any provider session or starting the broker.
Then list, in one short table, which failure classes are detectable at preflight versus deferred
to launch/intervention (unsupported host/model/effort, missing enforcement surface, missing
telemetry support, unauthenticated provider, quota, capacity). State that `preview_review`
performs exactly the same checks with no reservation.

## XPR-021 — Duplicate-key rejection is unenforceable on the MCP object path

- **Severity:** Moderate (blocking)
- **Sections:** Canonical Start Request ("Duplicate JSON keys are invalid. MCP objects and CLI
  JSON must produce the same canonical bytes"); Agent-First MCP and CLI ("MCP accepts the object
  directly"); gate 1.

**Problem.** On the MCP path the runtime receives an already-parsed object, in which duplicate
keys are unobservable — the host's parser has already discarded one. The requirement can be
enforced only where raw text is available (CLI inline JSON, `--request` file, and hosts that
expose the raw payload). As written, the rule is untestable on one of its two required transports.

**Consequence.** Gate 1's cross-transport idempotency test cannot cover duplicate keys uniformly,
and an implementer may either claim enforcement it does not have or reject valid MCP requests
while attempting it.

**Required change.** Scope the rule: duplicate-key rejection applies to inputs received as text;
MCP adapters must validate raw text when the host exposes it and must record in the receipt
whether raw-text validation was possible. State that canonicalization is defined over the parsed
value (recursively sorted keys, preserved array order and string values, no insignificant
whitespace) so both paths produce identical bytes regardless, and note the asymmetry explicitly
rather than leaving it implicit.

## XPR-022 — Monitor thresholds are approximate but appear in a release gate

- **Severity:** Moderate (blocking)
- **Sections:** Out-of-Band Monitor and Usage ("checks liveness about every 15 seconds, warns
  after about 60 seconds without provider events, and reconciles/reports known state after about
  120 seconds"; "These are target intervals measured by runtime timers"; "A configurable hard
  timeout intervenes"); gate 6 ("reports the 60/120-second stale observations"); Deferred
  Low-Level Choices ("exact idle/hard-timeout defaults").

**Problem.** The thresholds are stated as approximations ("about"), the hard timeout default is
deferred, and gate 6 nonetheless asserts specific 60/120-second reporting. No tolerance band,
clock source, or measurement start point is given, and the values are supposed to be configurable
(with no config key — see XPR-013).

**Consequence.** Gate 6 is not a testable gate; it will be implemented as an unreliable timing
test or quietly dropped. The design's liveness semantics — one of its genuinely differentiating
features — then ships unverified.

**Required change.** Define the thresholds as exact configurable values with defaults (15s / 60s
/ 120s), name the config keys, state the clock source (monotonic runtime timer) and the event
each interval is measured from (last provider event; last successful observation), and give the
test tolerance. Rewrite gate 6 to assert state transitions at configured thresholds using
injected time rather than wall-clock sleeps, and set an explicit hard-timeout default or state
that the gate uses a test-configured value.

---

# Suggestions (non-blocking)

## XPR-023 — No upper bound on `max_rounds` and no spend ceiling

- **Severity:** Low (suggestion)
- **Sections:** Stage and Participant Resolution ("stages[].max_rounds (positive safe integer)");
  Round Contract and Caps (precedence); Disconnect and Recovery (`extend-cap`); Metrics and
  Comparative Evaluation.

`max_rounds` accepts any positive safe integer, so a request can seal a 10^15-round stage without
the user authorization that `extend-cap` requires — an inconsistency in where authorization is
demanded. More broadly, for a document this invested in cost telemetry, there is no spend or token
ceiling anywhere; cost is bounded only indirectly by rounds, retry limits, and the hard timeout.
Consider a configurable maximum for `max_rounds` (validated pre-mutation) and an optional per-run
token/currency ceiling that moves the run to `intervention-required` when crossed, reported
through the same accounting view as the monitor so a partially-known subtotal is not mistaken for
a complete total.

## XPR-024 — Canonical digest is sensitive to equivalent filepath spellings

- **Severity:** Low (suggestion)
- **Sections:** Canonical Start Request (canonical digest definition; "Filepaths resolve relative
  to the invoking physical worktree"; `APR_REQUEST_ID_CONFLICT`); gate 1.

The canonical digest is computed over the submitted `filepath` string, so a retry that spells the
same file `./spec.md` instead of `spec.md` yields `APR_REQUEST_ID_CONFLICT` for what is
semantically an exact replay — the opposite of the "lost MCP response can be retried through CLI"
goal. Consider canonicalizing `filepath` to the worktree-relative resolved path before digesting
(and recording both the submitted and resolved forms), or explicitly documenting that byte-exact
`filepath` is part of request identity so agents normalize before their first call. Gate 1
currently tests only whitespace and key order; add a path-spelling case either way.

## XPR-025 — Config candidate key `host` carries selector values

- **Severity:** Low (suggestion)
- **Sections:** Configuration (`{ "host": "claude", ... }`); Stage and Participant Resolution
  ("The registry distinguishes selector (for example claude), host (claude-code), and provider
  family (anthropic). Config candidate host keys are selector aliases in v2 and normalize through
  this registry").

The v2 example uses the key `host` for a value the same document defines as a *selector*, with a
sentence explaining the mismatch. Since v2 is a new schema with no backward-compatibility
obligation, rename the key to `selector` and reserve `host` for actual host identifiers. This
removes a guaranteed source of implementer and user confusion, and makes the registry's
three-level distinction self-evident in the example.

## XPR-026 — "Sequence short-circuiting" conflicts with "every requested stage runs"

- **Severity:** Low (suggestion)
- **Sections:** Current-State Gap Assessment ("It needs run/stage/round structure … and sequence
  short-circuiting"); User-Requested Sequences ("Every requested stage runs. Acceptance of an
  earlier stage does not cancel a later independent review"); Round Contract and Caps ("exhaustion
  stops the entire sequence … Later stages do not start").

"Short-circuiting" naturally reads as skipping later stages on early success, which the design
explicitly forbids; the intended meaning is failure propagation. Rename it (e.g. "sequence
termination on non-acceptance") so an implementer reading the gap assessment in isolation cannot
build the forbidden behavior.

## XPR-027 — Config and prose examples should be registry-validated

- **Severity:** Low (suggestion)
- **Sections:** Errors and Self-Discovery ("Offline help validates every emitted example against
  its registered schema"); Configuration (`"effort": "high"` for `claude-opus-5`);
  User-Requested Sequences (`reviewer=claude/claude-opus-5/<configured-supported-effort>`).

The sequence example prudently uses a placeholder for Claude's effort value, acknowledging that
effort vocabularies are provider-specific, while the config example hardcodes `"effort": "high"`
for the same model. Under "Model/effort mismatches fail with supported choices", the document's
only normative config example may be invalid against its own registry. Extend the
example-validation rule to cover config and monitor examples, not only request/response/error
examples, and state whether `effort` is optional for headless selections and what default applies
when omitted.

## XPR-028 — Infrastructure-caused dispatches consume review budget with no separate allowance

- **Severity:** Low (suggestion)
- **Sections:** Round Contract and Caps ("Each dispatched review attempt consumes one round,
  including an interrupted attempt"; "The cap bounds disagreement"); Fallbacks ("Failed launches
  have a separate finite retry limit in sealed runtime policy"); Accounting Identity and
  Aggregation ("Transport reconnection to an existing operation is not a new dispatch").

Failed *launches* get their own finite retry budget, but a critique that is admitted and then
interrupted by broker loss or process death consumes a review round — so infrastructure faults
spend the budget the spec says exists to bound *disagreement*. A flaky provider plus a three-deep
reviewer cascade can consume a meaningful fraction of a stage's rounds without producing a single
review. This may well be the intended conservative choice; if so, say so explicitly. Otherwise
consider a small, sealed, finite allowance for post-admission dispatches that produced no
participant response, distinct from the substantive round cap, with every such attempt still
recorded as an attempt-evidence file and counted in stage/run metrics.

---

# Checked and Found Sound

Recorded so these are not re-litigated in later rounds. I examined and found internally
consistent and adequately specified: the independent-axes decomposition and the rule that the
controller is not a review participant; the prohibition on configuration inserting stages; the
request-id idempotency triad (replay / conflict / cross-transport retry) apart from XPR-024; the
reservation-then-journaled-launch ordering with `mutation_occurred` reporting and second-launch
fencing; the cap-precedence chain and the rule that class changes never reset or expand the
requested-stage budget; the treatment of disputed findings with empty patches; the "independent
is not blinded" distinction and its deferral of true blinding to #34; the SAR assurance
disclaimer (compliance rather than enforced separation) — a genuinely good piece of honesty; the
provenance model (reported / derived / estimated / unavailable) and the refusals to infer input
from cache counters, hidden reasoning from output, wall time from API time, or subscription value
from list price; unknowns remaining null rather than zero; the disjoint accounting partition rule
and retention of inconsistent parent/child reports with a diagnostic; the separation of review
verdict from telemetry completeness; the immutable telemetry amendment contract; the byte-offset
response envelope framing that does not trust Markdown delimiters; the refusal to let the metrics
collector repair invalid responses; the requirement that evidence-persistence failure blocks
sealing; the monitor's `0 wait tokens` line coexisting with non-zero controller usage (these
measure different things and are correctly separated); the fallback-as-replacement model with
fencing, checkpoint preservation, and no predecessor-acceptance inheritance; and the
"never kills from stale PID text" / "never age-only takeover" cleanup posture.

---

# Verdict

CHANGES REQUIRED
