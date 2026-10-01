# XPR Round 2 — Reviewer Response

- **Review:** `2026-09-27-107-150048-astra-claude-controller-workers-xpr`
- **Round:** 2
- **Phase:** critique
- **Issue:** #107
- **Pattern:** XPR (cross-family)
- **Reviewer:** headless Claude Opus 5, high effort (non-author, non-controller)
- **Reviewed bytes:** `rounds/01-after.md`, complete file, 2266 lines
- **Prior reviewed bytes:** `initial-fur.md`, 1931 lines (round 1)
- **Author response read:** `rounds/01-author-response.md`, complete file, 237 lines
- **Digests declared by the author:** input `78ee25ed…0235c`, reviewer response `85007f1c…6f0bc` — **neither independently verified** (see Telemetry)

## Verdict

**changes-required**

Fourteen of fifteen prior findings are resolved in the revised bytes. The
revision is substantive rather than cosmetic: each remedy adds normative text
*and* a matching release gate, and I could find no case where a remedy was
claimed in the author response but absent from the bytes.

Five findings remain open:

- **XPR-008** (still-open, narrowed) — the substantive finding-ID contract is
  correct, but the normative ID grammar in the revised bytes is corrupted and
  unimplementable, and "reserved IDs" is ambiguous in a way that inverts the
  implementation.
- **XPR-016** (new, medium) — the newly added post-reservation dispatch pause
  has no observable representation in the response contract, making its own
  gate-6 assertion untestable.
- **XPR-017** (new, low) — "replacement never replenishes … its retry
  allowance" admits two readings with materially different behaviour.
- **XPR-018** (new, low) — `host_wait_capability=unknown` has no defined
  disclosure obligation, admission consequence, or fixture.
- **XPR-019** (new, low) — the storage-layout revision dropped the requirement
  that participants receive their exact partition path.

All five are surgical text changes. None reopens the controller/headless-worker
normalization, the canonicalization contract, the telemetry boundary, the
recovery model, or any gate structure. XPR-008 is the only one I consider
blocking on its own merits; the other four are cheap to close in the same pass.

## Prior Findings — Resolution Status

| ID | Status | Anchor in `01-after.md` |
| --- | --- | --- |
| XPR-001 | resolved | 197–215, gate 1 (2045–2054) |
| XPR-002 | resolved | 266–296, 1588–1590, gate 6 (2118–2122) |
| XPR-003 | resolved | 270, 1107–1126, 1190–1191, gate 10 (2166–2169) |
| XPR-004 | resolved | 1624–1643, gate 6 (2116–2117), gate 10 (2170–2171) |
| XPR-005 | resolved | 1433–1443, 1517–1520, 1538–1556, gate 7 (2123–2125), gate 13 (2197–2202) |
| XPR-006 | resolved | 248–264, gate 14 (2206–2208) |
| XPR-007 | resolved | 633–634, 702–729, 1346–1350, 476, gate 4 (2093–2099) |
| XPR-008 | **still-open** (narrowed) | 553–554, 566 |
| XPR-009 | resolved | 423–436, 2033–2034, gate 9 (2143–2149) |
| XPR-010 | resolved | 518–537, gate 2 (2064–2068) |
| XPR-011 | resolved | 453–468, gate 9 (2150–2152) |
| XPR-012 | resolved | 339–351, 1247, 1274–1278, gate 15 (2212–2214) |
| XPR-013 | resolved | 653, 664–681, 808–809, gate 12 (2187–2191) |
| XPR-014 | resolved | 1596–1612, 1620–1622, gate 6 (2110–2115) |
| XPR-015 | resolved | 1253–1258, 1297–1298, gate 15 (2214–2216) |

### XPR-001 — resolved

The prose rule is replaced by an exact encoder (198–215). All three divergences
I raised are now closed: numbers — "The closed v1 request permits numbers only
in positive-safe-integer fields… without a sign, leading zeros, fractional part
or exponent. Thus 6, 6.0 and 6e0 have one encoding"; strings — an explicit
escape set, "lowercase \u00xx escapes" for the remaining C0 range, everything
else "directly as UTF-8, including slash", and "Reject lone UTF-16 surrogates";
ordering — "lexicographic order of unsigned UTF-16 code units, with a shorter
prefix first". The digest basis is stated as "SHA-256 over the UTF-8 bytes"
of the "validated parsed value, before defaults or configuration resolution".
I checked the integer case specifically: `6.0` validates as an integer and
encodes as `6`, while `6.5` "fail[s] [its] field schema before hashing", so the
validate-then-encode order is coherent. Gate 1 now names `6`/`6.0`/`6e0`,
`"spec.md"` versus `"spec.md"`, non-BMP encoder ordering fixtures, and
lone surrogates.

### XPR-002 — resolved

Every part of the request is met. A preflight row exists (271); "Monitor
admission is checked before the reservation transaction. A rejection has
mutation_occurred=false, no run_id, and no reserved request ID or artifact
lease" (276–278); the retry contract is explicit — "explicit user
authorization, then start_review with a fresh request_id, unattended=true and
all other submitted fields unchanged", with `next_action` carrying that
requirement and unable to "instruct automatic consent" (279–283). The
delivery-uncertainty interaction I was worried about is handled directly:
"If an earlier request's delivery is uncertain, recover it by exact replay
before changing intent" (285–286). Post-reservation loss is separated as an
observer failure (290–296), and gate 6 tests rejection, authorized retry with
one run, and no automatic consent.

### XPR-003 — resolved

All five sub-requests are in the bytes. Capability advertisement and
disclosure: "the trusted host adapter advertises controller_telemetry_capability
as observable, partially-observable or not-observable, together with its mapping
version and per-measure availability, source and limitations. Preview and the
pre-launch receipt carry this declaration and disclose which combined totals
cannot be complete" (1107–1111). Assurance: "evidence_source, evidence_version
and assurance (verified-host-binding or not-observable)… self-reported labels
are not observed identity" (1112–1115). CLI: an explicit null/`not-exposed`/
`host-transport` declaration that "does not block the run", with "CLI cannot
infer controller tokens from subprocess duration, worker telemetry or
caller-supplied model labels" (1118–1126). A preflight row (270) and the
symmetric adapter obligation (1190–1191) are added, and gate 10 carries CLI-only
fixtures. The separation from session distinctness is stated twice (1116, 430),
which is the right cross-check.

### XPR-004 — resolved

The literal zero and the unsourced controller identity are gone (1626–1632), and
the rendering is now backed by a declared fixture (1634–1643) with "controller
model and effort null, controller usage and wait-token values null with
provenance=unavailable, reason=not-exposed and source=host-transport", per-entry
provenance and observation IDs for the two worker measures, and "no zero or
identity label is supplied by a display-only default". I verified the arithmetic
is self-consistent: 21400 + 16800 = 38200, matching the displayed `38.2k`
"derived known subtotal referencing both IDs, not another observation", with
"complete combined total is null". Gates 6 and 10 both validate it.

### XPR-005 — resolved

The deadlock now has a specified exit. Evidence is journaled before launch —
"execution_host_id, verified boot_epoch, broker_instance_id and the containment
scope covering that operation's potential writers" (1433–1435) — with the
non-proofs enumerated: "A broker-instance change, PID absence, wall-clock
estimate, os.uptime-derived timestamp or operator assertion is not a verified
boot-epoch change" (1437–1439). Discharge is correctly scoped: positive evidence
"only for the process/descendant obligations whose sealed containment contract
confines all writers to that host", with remote/migrated/other-host cases
retaining obligations (1538–1546). The lease release I asked for exists and is
correctly conditioned: "Only after all potential writers are proved quiescent
and artifact effects reconciled may the artifact lease be released…
A failed-but-fenced run remains failed after this discharge" (1551–1555). The
platform gap is converted into an adapter obligation ("Supported OS adapters
must provide this observation or another tested durable termination proof",
1441–1443) with conformance that "the source distinguishes full restarts from
broker restarts, sleep/resume and host-identity changes". Gate 13 adds both the
positive fixture and five negative ones; gate 7 adds the installed test. The
author's qualification — boot evidence covers only host-local process
obligations — is correct and I accept it.

### XPR-006 — resolved

The allowlist is rewritten as an accurate enumeration (248–264) covering every
check I identified: "physical worktree/path and FUR existence/type/byte reads;
frontmatter parsing; canonical-tree series indexes, retained manifests,
referenced reconstruction evidence and amendments; repository ignore rules and
OS storage protections", plus host monitor/wait and controller-telemetry
observations. The read-only property is now stated as a property rather than
implied by the list ("may inspect existing state but cannot create or update
it"), the derived cache exclusion is cross-referenced, `write caches` is added
to the prohibitions, and the lock question is answered: "Recheck mutable
observations under the appropriate locks at reservation; an unstable read
reports retryable uncertainty rather than acquiring a preview lock." Gate 14
extended.

### XPR-007 — resolved

The shared submission scope is partitioned exactly as requested: two storage
rows (633–634), a rewritten scope block with `roles/ROLE` and explicit
cross-role denial (702–723), and the submission-side enforcement —
"Submitted response paths must lie inside the current grant's role partition;
shared collateral and other roles' paths fail APR_SUBMISSION_SCOPE_INVALID"
(725–726), repeated in the `submit_review_turn` contract (1727–1728). The
assurance labels I asked for are recorded (`submission_scope=role-isolated`,
`shared_collateral=mutable-untrusted`, 476). Shared collateral remains writable
but is explicitly "mutable, untrusted context, not evidence of response
authorship" (729), which preserves the `APR_COLLATERAL_DIVERGED` diagnostic
without reintroducing the attribution hole. Permissions (1346–1350), SAR's
combined scope (751–753), the gap assessment (1980–1982) and Resolved Decisions
(2239–2240) are all carried through, and gate 4 tests cross-role writes,
`APR_SUBMISSION_SCOPE_INVALID` and shared-collateral overwrite.

### XPR-008 — STILL-OPEN (narrowed)

- **Severity:** medium
- **Category:** correctness / implementability
- **Section:** "Findings and Debate" (553–554, 566)

The substantive contract I asked for **is** present and correct: participant
allocation, ledger namespace and fully qualified identity `(run_id,
requested_stage_id, finding_id)`; "New findings must have IDs unused anywhere in
that ledger, including resolved history, and be unique within the submission";
atomic whole-submission validation; `APR_FINDING_ID_CONFLICT` consuming
"neither another round nor the submission grant"; replay recognized first;
replacement reviewers may "reference inherited IDs for explicit reviewer
resolutions but cannot reallocate them, overwrite their originating evidence or
resurrect them as new findings"; `target_ids` validated against missing, self
and cyclic targets. Gate 2 covers all of it. Two defects in the delivering text
keep the finding open:

**(a) The normative ID grammar is corrupted and would validate the wrong
language.** The revised bytes read, verbatim:

> The participant allocates finding*id as an ASCII string matching
> ^[A-Za-z]A-Za-z0-9.*-]{0,63}$.

Two separate corruptions: the field name is `finding*id`, whereas every other
occurrence in the document is `finding_id` (e.g. 1731, "Each resolution names
finding_id, state and rationale"); and the character class has lost its opening
bracket, so what is written is not a malformed regex an implementer would notice
— it is a *valid* regex with entirely wrong meaning. Read as JavaScript,
`^[A-Za-z]A-Za-z0-9.*-]{0,63}$` matches one letter, then the literal text
`A-Za-z0-9`, then any run of characters, then `-`, then zero to sixty-three
literal `]` characters. It accepts almost nothing a reviewer would emit and
rejects every ID in this very document (`XPR-001` fails it). An implementer who
pastes the published grammar ships validation that rejects all conforming
submissions, and the failure surfaces only against a live participant. The
likely intended form is `^[A-Za-z][A-Za-z0-9._-]{0,63}$`, which is consistent
with the author response's "character/length constraints" — but the reviewer
cannot adopt an inferred grammar as the contract.

- **Impact:** The one normative sentence defining the ID space is unusable,
  in a paragraph whose entire purpose is to make IDs mechanically checkable.
  Both corruptions are consistent with Markdown underscore/emphasis mangling of
  unfenced literal text, which means the same hazard applies to any future
  regex or identifier added to this document as bare prose.
- **Request:** Restore the intended field name `finding_id` and the intended
  pattern, and wrap both in backticks (`` `finding_id` ``, `` `^[A-Za-z][A-Za-z0-9._-]{0,63}$` ``)
  so the literal survives Markdown rendering. State the pattern's flavor
  (ECMAScript) and whether the 64-character total is inclusive. Add a
  registry fixture asserting that the published grammar accepts a
  representative ID set (including `XPR-001`-style IDs) and rejects an empty
  string, a leading digit, and an over-length ID — so a future corruption of
  this literal fails a test rather than shipping.

**(b) "reserved IDs" is ambiguous in a way that inverts the implementation.**
Line 566 reads: "Every critique handoff supplies the stage's reserved IDs and
permitted inherited finding context, including resolved IDs."

- **Impact:** Two readings are available and they are opposites. Under the
  reading consistent with the rest of the paragraph, "reserved" means
  *already-taken and therefore unavailable* — a blocklist the reviewer must
  avoid. Under the other reading, the runtime *reserves a pool of IDs for the
  reviewer to use* — which would contradict "The participant allocates
  finding_id" two paragraphs earlier. A handoff that ships the wrong one either
  starves the reviewer of usable IDs or hands it a list it wrongly treats as
  assignable, and in both cases the first new finding of a replacement reviewer
  is affected. The word "supplies … reserved IDs" in a handoff payload reads
  more naturally as the allocation sense, which is the wrong one.
- **Request:** Replace "the stage's reserved IDs" with the intended meaning,
  e.g. "the stage's already-used finding IDs, which are unavailable for new
  findings". If the runtime does not in fact supply the full historical ID set
  (which would grow unbounded), say what it supplies instead and how a
  participant discovers unavailability — the `APR_FINDING_ID_CONFLICT` retry
  loop is the fallback but should not be the primary mechanism.

### XPR-009 — resolved

Distinctness is now proved before grants rather than assumed: "Before any
participant grant is issued, the trusted adapters must prove worker session
distinctness from the controller and from every other simultaneous worker"
(423–425). Two details make this materially better than what I asked for:
comparison must occur "in a common provider/session namespace, not display
labels or differently salted fingerprints" — correctly anticipating that the
worktree-scoped keyed fingerprint (416–418) is not comparable across salts —
and the unobservable-controller case has a defined alternative proof ("a
versioned provider guarantee of fresh session creation after the request, with
inherited/default resume disabled and observed creation evidence"), with
"If neither proof is available, admission fails closed". The three distinct
fencing codes exist (432–435), no grants issue for the affected roster, and
"Lack of controller usage telemetry alone does not block admission" correctly
prevents XPR-003's remedy from becoming an admission blocker. Gate 9 covers
controller collision, SPR worker collision, equal model labels with distinct
proved sessions, unproved separation, and the CLI case; the
verification-themes list now names distinctness (2033–2034).

### XPR-010 — resolved

The disposition is fully specified (518–537): per-attempt consumption
"including the initial attempt"; `intervention-required` with
`APR_REVISION_ATTEMPTS_EXHAUSTED`; "retain the FUR lease and fence the writer
and unresolved operations"; sealed receipts; a checkpoint with `checkpoint_id`
and `expected_current_digest` requiring quiescence and `resolve-checkpoint`;
and the case I had not thought to ask for — "If exact bytes remain at the sealed
baseline and no effects are pending, record that verified no-change disposition
instead of inventing a checkpoint." The negative boundaries are equally
explicit: not acceptance, not an automatic failed verdict, no counter reset on
resume, no automatic replacement, and replacement consuming "the next round from
the existing requested-stage budget". Gate 2 extended. One phrase in this
otherwise complete remedy is ambiguous and is raised separately as XPR-017.

### XPR-011 — resolved

The channel is named and bounded (453–468): "a wrapper-hosted MCP stdio tool
connection over private inherited pipes bound to exactly one launched child",
separate from stdout/stderr so that "ordinary provider output is never
interpreted as tool authorization"; adapters that cannot support it "fail [the]
capability check". The authorization model is stated exactly as the security
property I asked for — "Possession of the inherited channel is the child's
capability to invoke its wrapper's role tools, not a broker credential" — with
the wrapper holding the credential and grant and validating run/phase/revision
per call, revocation on grant/session/ownership expiry, "No discoverable
unauthenticated loopback tool listener is permitted in v1", sockets deferred
behind a conformance-tested contract, and direct child calls to the broker
rejected before dispatch with credential-free diagnostics. Gate 9 tests that
prompts, environment and readable files contain no credentials, plus stale and
rebound pipe capabilities.

### XPR-012 — resolved

The names are now distinct (339–340, 1247, 1277–1278: "Request stages retain the
array field fallback_kinds; the map name is not a request-field alias"), the
pointer rules are exact for both shapes including `~0`/`~1` escaping and the
wrong-map-type and empty-array cases (345–351), and "SAR's only legal array is
["sar"]" is stated outright (342). `duplicate-free` was added to the array
constraints, which I had not raised. Gate 15 extended.

### XPR-013 — resolved

Amendments are discoverable from the trackable index exactly as requested:
"Each run entry in series-index/v1 also carries an ordered amendments array…
amendment_id, repository-relative manifest_path and manifest_sha256; []
explicitly means no amendments published at that index revision" (664–667). The
publication ordering and crash semantics are specified ("Seal and publish an
amendment before atomically appending its index reference under the series lock,
with a publication operation ID for idempotent recovery. A crash between these
steps leaves a pending publication, not an unreferenced amendment silently
included in current totals", 667–671), and the consumer rule closes the stale-view
hole: an unresolvable referenced amendment makes coverage "explicitly
incomplete/unverifiable, with a null complete total", while "do not label
superseded base metrics current" and "'Current' means current at the supplied
index revision" (674–681). Index receipts bind the whole list (671–672), and
gate 12 adds both the omitted-`amendments/` transfer and the publication-crash
replay.

### XPR-014 — resolved

`host_wait_capability` is defined with a real predicate (1596–1602): a tested
out-of-band surface, durable cursor delivery, and "either a run-lifetime wait or
adapter renewal/reconnection across every wait ceiling and phase/stage boundary
entirely outside inference", with "The guarantee spans the entire run, not just
one hard_timeout_ms operation" — which is a better answer than the minimum-ceiling
threshold I proposed, and the author's rationale for rejecting my proposal is
correct. Disclosure fields are enumerated (1604–1607). Crucially, the gate is no
longer unfalsifiable: "Unexpected periodic re-entry on a host advertised as
single-wakeup is a capability violation: record the diagnostic and observed
degradation, and fail the corresponding conformance gate rather than exempting
those wakeups" (1620–1622). I checked the disclosed formula against its own
fixture: `max(0, ceil(D/W)-1)` with D=150000, W=60000 gives `ceil(2.5)-1 = 2`,
matching gate 6's "two expected re-entries"; and with D=120000 the stated
equal-boundary precedence yields one re-entry plus terminal delivery, so the
tie-break and the formula agree. `expected_reentry_count` stays null with reason
`unknown-duration` otherwise. The residual `unknown` enum gap is raised
separately as XPR-018.

### XPR-015 — resolved

The key is gone from the skeleton (1253–1258) and the prose states the closed-schema
consequence: "There is no monitoring.on_missing_surface key in v2; the closed
schema rejects it" (1297–1298), with request-level authorization and the
config prohibition retained. Gate 15 asserts the removed key fails validation
and that "no configuration value can authorize unattended operation".

## New Findings

### XPR-016 — The post-reservation dispatch pause has no observable representation, making its own gate assertion untestable

- **Severity:** medium
- **Category:** completeness / verification
- **Section:** "Canonical Start Request" (271, 290–296); "Round Contract and Caps" (539–544); "Agent-First MCP and CLI" (1744–1774); gate 6 (2121–2122)
- **Evidence:** The XPR-002 remedy introduces a new runtime condition: "After
  reservation, surface loss is an observer failure, not a new preflight
  rejection: retain the run/lease, report mutation_occurred=true when returning
  the error, and pause new dispatches until a visible observer reattaches.
  Already admitted work may finish and seal under normal supervision." The
  preflight table's right-hand column describes the same condition as "Pause new
  dispatches; retain lease and reconcile". Gate 6 asserts "Post-reservation
  surface loss retains authority, pauses new dispatches and resumes only under
  the specified rule." But the run-state enum is unchanged — "starting, running,
  awaiting-participant, reconciling, intervention-required, accepted, cancelled
  and failed" — and the document declares that new conditions do not get new
  states: "Fencing and liveness are orthogonal response fields, not extra run
  states." The response registry's three orthogonal dimensions are liveness,
  participants and fencing; a dispatch-admission hold is none of those.
- **Impact:** A controller or observer calling `get_review_status` cannot
  distinguish a run that is progressing normally from one that is silently
  refusing to dispatch the next critique or revision. Both report `running`
  with healthy liveness, live participants and inactive fencing; the only
  difference is an absence of future progress, which is exactly what the
  monitor's quiet/stalled vocabulary is designed *not* to treat as meaningful.
  Three concrete consequences: (a) the user whose monitor died sees no
  machine-readable reason why the review stopped advancing, which defeats the
  purpose of rejecting silent unattended operation in the first place; (b)
  gate 6's assertion is not mechanically checkable, because there is no field
  whose value the fixture can assert — "pauses new dispatches" is observable
  only as the negative fact that nothing happened; (c) the table's word
  "reconcile" invites an implementer to report `status=reconciling`, which the
  document assigns to broker recovery ("Broker restart before reconciliation →
  reconciling, broker_health=recovering"), so two implementations can disagree
  about the coarse state for the same condition.
- **Request:** Add the pause to the response contract as an explicit orthogonal
  dimension — for example a `dispatch_admission` field with a stable reason code
  (`awaiting-visible-observer`) alongside the outstanding action needed to clear
  it — and state which coarse `status` the run reports while paused, explicitly
  ruling out `reconciling` if that is not intended. Add a fixture row to the
  "Required observable tuples" table for observer loss with `unattended=false`,
  and restate gate 6's assertion in terms of that field so it can pass or fail
  on an observed value rather than on absence of progress.

### XPR-017 — "replacement never replenishes … its retry allowance" admits two opposite readings

- **Severity:** low
- **Category:** internal consistency / correctness
- **Section:** "Round Contract and Caps" (534–537); "Configuration" (1262–1264, 1293)
- **Evidence:** The XPR-010 remedy closes with: "Any replacement starts a new
  stage-attempt with a fresh critique consuming the next round from the existing
  requested-stage budget. No remaining round means intervention until authorized
  extend-cap or cancel; replacement never replenishes either the consumed round
  or its retry allowance." The governing policy is named
  `max_revision_attempts_per_round` and is bounded "in 1..10, including the
  initial attempt".
- **Impact:** The pronoun in "its retry allowance" is unresolved. Reading A (the
  one I believe is intended): the *exhausted round's* allowance is never
  restored, so the replacement cannot resume revising round N — it must spend
  round N+1 on a fresh critique, which then carries its own full allowance,
  consistent with the policy being per-round. Reading B: a replacement
  stage-attempt inherits no revision allowance at all, so the replacement author
  can be dispatched for a critique and then be structurally unable to revise,
  driving straight back into `APR_REVISION_ATTEMPTS_EXHAUSTED` and producing a
  run that cannot make progress under any authorized action short of
  `extend-cap`, which grants rounds rather than attempts. Because the sentence
  sits immediately after a clause about the replacement and the surrounding
  paragraph is otherwise scrupulous about what does and does not reset, an
  implementer has no basis to choose. Gate 2's "a replacement uses the remaining
  stage budget, never a reset cap" speaks to the round budget only and does not
  disambiguate the allowance.
- **Request:** State the scope explicitly: the revision-attempt allowance is
  per round, a new round under any stage-attempt receives the full configured
  allowance, and neither the consumed round nor the exhausted round's allowance
  is ever restored. Note separately whether any authorized intervention can
  grant additional revision attempts *within* an exhausted round (the current
  text implies not, since `resume` is barred and `extend-cap` addresses rounds) —
  if not, say so, so operators understand that the only authorized paths past
  revision exhaustion are replacement, extend-cap or cancel. Add a gate-2
  assertion that the replacement's fresh round admits a full revision allowance.

### XPR-018 — `host_wait_capability=unknown` has no disclosure obligation, admission consequence, or fixture

- **Severity:** low
- **Category:** completeness / verification
- **Section:** "Out-of-Band Monitor and Usage" (1593–1594, 1596–1612, 1614–1619); gate 6 (2110–2115)
- **Evidence:** "host_wait_capability is single-wakeup, model-reentry-required
  or unknown." The two named values then receive complete treatment:
  `single-wakeup` gets a predicate and a violation rule; `model-reentry-required`
  gets "For a host requiring periodic model re-entry, disclose its observed
  re-entry cadence before launch" plus the `max(0, ceil(D/W)-1)` fixture. The
  third member is never mentioned again. Gate 6 specifies a single-wakeup fixture
  and a `model-reentry-required` fixture (W=60000, D=150000) and no `unknown`
  fixture.
- **Impact:** `unknown` is the value a real host most often warrants — a
  visible monitor may be verified (so monitor admission passes under the XPR-002
  rule) while the wait ceiling and reattachment behaviour are simply not
  measurable. In that state nothing says what the receipt must disclose, whether
  the run is admissible without unattended authorization, or what wakeup
  behaviour the user should expect. The gap interacts with the surrounding
  claims: the design still asserts, in prose, "On capable hosts the controller
  model wakes only for intervention or terminal state" and "In a fault-free SAR,
  SPR, or XPR on a capable host, exactly one post-receipt model wakeup delivers
  terminal status," but "capable host" is now a colloquialism sitting beside a
  three-valued enum, so it is undefined whether `unknown` counts as capable.
  Since round 1's complaint was precisely that "capable host" was undefined,
  leaving the term in prose next to the new enum reintroduces a smaller version
  of the same ambiguity.
- **Request:** Give `unknown` the same treatment as its siblings: state what
  preview and receipt disclose (capability `unknown`, `ceiling_kind=unknown`,
  `observed_wait_ceiling_ms` null with reason, `expected_reentry_count` null),
  whether it is admissible with `unattended=false`, and that no single-wakeup
  guarantee may be advertised for it. Replace the two remaining "capable host"
  phrases with `host_wait_capability=single-wakeup` so the guarantee is stated
  against the enum. Add an `unknown`-capability fixture to gate 6 asserting the
  disclosure and the absence of a single-wakeup claim.

### XPR-019 — The storage-layout revision dropped the requirement that participants receive their exact partition path

- **Severity:** low
- **Category:** completeness
- **Section:** "Storage Layout" (633–634); "FUR and Worktree Boundary" (725–726); "Agent-First MCP and CLI" (1725–1728); "Findings and Debate" (560–563)
- **Evidence:** The pre-revision collaborative-folder row read "Author, reviewer
  and supervisor write; **exact path supplied to participants**". The XPR-007
  remedy replaces that row with two rows whose authority columns are "Author,
  reviewer and supervisor write; never attributed submission staging" and "Bound
  role writes its own partition; package reads/seals; cross-role writes denied".
  The path-disclosure clause survives only in the unrelated "Supplied context"
  row ("scoped participant read-only projection, exact path supplied"). Nothing
  else requires the runtime to tell a participant where its partition is: the
  submission contract states only that the path must lie "within the bound
  role's submission partition", and the enforcement is a rejection,
  `APR_SUBMISSION_SCOPE_INVALID`.
- **Impact:** Participants are now required to write into a path that is more
  structured than before (`collaboration/R/roles/ROLE/`, where `ROLE` is a
  protocol-internal token from the set author/reviewer/solo/supervisor) while
  the one clause that guaranteed they would be told the path was removed. A
  participant left to infer it must reconstruct an authority-adjacent path from
  the specification — exactly the pattern the document rejects elsewhere
  ("participants receive receipt IDs, never direct authority paths"). The
  practical failure is a first submission rejected for scope on every new
  adapter. Secondarily, and unlike its two sibling correctable-submission errors,
  `APR_SUBMISSION_SCOPE_INVALID` has no stated round/grant consumption
  semantics: `APR_FINDINGS_UNRESOLVED` says "do not advance or consume another
  round", and `APR_FINDING_ID_CONFLICT` says "It consumes neither another round
  nor the submission grant", while the scope error says only "rejected before
  sealing". The general rule that failures do not advance (and that only
  advancing consumes the grant) probably covers it, but the asymmetry invites an
  implementer to treat a scope rejection as consuming.
- **Request:** Restore the disclosure requirement on the role-staging row (and
  the shared row if shared paths are also supplied), or state it once in the
  submission contract: every critique/revision handoff supplies the exact
  absolute-or-worktree-relative path of the bound role's partition and of shared
  collateral, alongside the reserved-ID and context information already listed
  at 566. For consistency, state explicitly that
  `APR_SUBMISSION_SCOPE_INVALID` consumes neither a round nor the submission
  grant and returns `next_action submit_review_turn` for the same
  phase/revision.

## New-Findings Summary

| ID | Severity | Category | Area |
| --- | --- | --- | --- |
| XPR-008 | medium | correctness / implementability | corrupted finding-ID grammar; "reserved IDs" ambiguity (**still-open**) |
| XPR-016 | medium | completeness / verification | dispatch pause unobservable; gate 6 untestable |
| XPR-017 | low | internal consistency | retry-allowance scope on replacement |
| XPR-018 | low | completeness / verification | `host_wait_capability=unknown` untreated |
| XPR-019 | low | completeness | partition path no longer supplied to participants |

## Fresh-Review Coverage

To be explicit about what this round examined beyond the prior ledger, since a
verdict of changes-required on four small findings should not be read as a light
pass:

- **Full re-read of the revised bytes.** All 2266 lines, in seven contiguous
  ranges, not a diff against round 1. Line counts grew from 1931 to 2266
  (+335), and I checked every section that the author response did not claim to
  touch for collateral damage.
- **Arithmetic and formulas re-derived, not accepted.** The monitor fixture's
  21400 + 16800 = 38200 subtotal; `max(0, ceil(D/W)-1)` at D=150000/W=60000 → 2
  and at D=120000 → 1 with the stated equal-boundary precedence; threshold
  ordering `15000 <= 60000 < 120000 < 1800000`; the two-missed-interval stale
  rule against `warn_after_ms`.
- **Cross-section consistency of each remedy.** Every remedy was checked for
  propagation into all the places the old rule appeared: XPR-007 into storage,
  scope block, permissions, SAR combined scope, `submit_review_turn`, manifest
  assurance labels, gap assessment and Resolved Decisions; XPR-012 into the
  config skeleton, prose, pointer rules and gate 15; XPR-015 into skeleton,
  prose and gate. I found no remedy that changed one site and left a
  contradicting sibling, which is the failure mode I expected most.
- **Gate-to-remedy mapping.** All fifteen remedies have a corresponding gate
  assertion; gate dependency attributions (3/10/11/12 → #30/#34, 8 → #102) are
  still accurate after the edits; no gate was renumbered or orphaned.
- **Newly introduced text audited on its own terms.** The five new normative
  blocks — canonical encoder, monitor-admission/retry contract, controller
  telemetry declaration, boot-epoch evidence, role partitions — were reviewed as
  if they were fresh specification, which is where XPR-016 through XPR-019 came
  from. I specifically checked the boot-epoch remedy for a re-entrant
  contradiction with "No recovery action accepts elapsed age or an operator
  assertion as proof of death" (none: the non-proof list explicitly excludes
  wall-clock and `os.uptime` derivations) and for binary-free implementability
  on the three supported platforms (plausible via readable kernel state or
  already-installed OS tools; the document also permits "another tested durable
  termination proof", so I raise no finding).
- **Areas re-confirmed sound and unchanged:** round/cap arithmetic and the
  final-round acceptance rule; the acceptance predicate and its
  duplicate/supersede/split conditions; patch-chain ordering and reconstruction;
  loopback transport hardening; lineage cross-mode rules; migration and pinned
  `runtime_binding`; the disjoint accounting partition and never-zero discipline.

## Telemetry

Reported per the brief: only values I can observe. Unavailable values are
`null` with a reason and the collection source that would supply them. No value
is reported as zero in place of unknown.

### Observed

| Measure | Value | Provenance | Source |
| --- | --- | --- | --- |
| Review round | 2 | reported | this response |
| Reviewer role | reviewer (XPR, non-author, non-controller) | reported | reviewer-brief.md |
| Requested reviewer identity | `claude` / `claude-opus-5` / high effort | reported (requested, **not** observed) | reviewer-brief.md |
| Revised bytes reviewed | `rounds/01-after.md`, 2266 lines, read in 7 contiguous ranges covering 1–2266 | reported | this session's file reads |
| Prior bytes reviewed (round 1) | `initial-fur.md`, 1931 lines | reported | round 1 of this session |
| Observed line-count delta | +335 lines (1931 → 2266) | derived from the two line counts above | this session's file reads |
| Author response read | `rounds/01-author-response.md`, 237 lines, complete | reported | this session's file reads |
| Read tool calls this round | 8 (1 author response, 7 revised-bytes ranges) | reported | this session's tool calls |
| Write tool calls this round | 1 (`rounds/02-reviewer-response.md`) | reported | this session's tool calls |
| Files modified this round | 1, this response only | reported | this session's tool calls |
| Web research performed | none | reported | this session's tool calls |
| Prior findings re-evaluated | 15 of 15 | reported | this response |
| Prior findings resolved | 14 | reported | this response |
| Prior findings still-open | 1 (XPR-008) | reported | this response |
| New findings allocated | 4 (XPR-016 … XPR-019) | reported | this response |
| Open findings at end of round 2 | 5 | derived (1 still-open + 4 new) | this response |

### Unavailable

| Measure | Value | Reason | Collection source that would supply it |
| --- | --- | --- | --- |
| Verification of declared input digest `78ee25ed…0235c` | null | not-observable — no hashing or shell tool is available under the current restricted tool set | controller/broker artifact digest observation at snapshot capture |
| Verification of declared reviewer-response digest `85007f1c…6f0bc` | null | not-observable — same as above; I cannot confirm the author hashed my round-1 file rather than a variant | supervisor seal over the sealed round-1 payload |
| Confirmation that `01-after.md` equals the applied FUR | null | not-observable — the FUR at `docs/superpowers/specs/2026-09-27-107-agent-first-review-runtime-design.md` is outside this review folder and my file tools are confined to the working directory; the author states "The patch has not been applied" and the revised digest is "pending controller application" | controller, by applying the patch and publishing the supervisor-observed revised digest |
| Observed reviewer session handle / fingerprint | null | not-exposed — the model has no read access to its own provider session handle; per the FUR's own rule a self-asserted label is not identity evidence | provider adapter exact-session observation surface (#88/#90) |
| Input / output tokens | null | not-exposed — per-turn usage is not surfaced to the model in-session | provider usage envelope captured by the broker/provider adapter outside the model turn |
| Reasoning/thinking tokens | null | not-exposed — hidden reasoning counters are not visible to the model | provider usage envelope via provider adapter |
| Cache-read / cache-creation tokens | null | not-exposed — same as above | provider usage envelope via provider adapter |
| Marginal cost, currency, cost basis | null | not-exposed — no pricing or billing surface is reachable from this session | provider billing/usage envelope or host session-usage surface at the controller/broker boundary |
| Wall-clock duration of this round | null | not-exposed — no clock or shell is available in this session (date known only to day granularity) | controller-observed start/end timestamps at the supervision boundary |
| API / queue duration | null | not-exposed — provider-reported durations are emitted outside the model turn | provider response metadata via provider adapter |
| Stop reason / terminal reason | null | not-observable-from-inside — determined after this turn completes | provider process exit record / session API via participant wrapper |
| Round-1 cumulative usage for comparison | null | not-exposed — no per-round usage was observable in round 1 either, so no delta can be derived | broker-sealed attempt receipts across both rounds |
| Prior SAR finding resolution status | null | not-observable — `../2026-09-27-107-145046-controller-worker-sar/manifest.json` remains outside the working directory; the round-1 read attempt was denied and the restriction is unchanged | controller, by placing the prior manifest inside this review folder |
| Controller-side usage for this round | null | not-observable-by-reviewer — the reviewer is outside the controller's accounting scope by design | host adapter controller accounting ID |

### Telemetry notes

- Every unavailable value is `null` with a reason and a named collection source;
  none is reported as zero. In particular I report no zero-cost, zero-duration
  or zero-token figure, and no derived total over incomplete coverage — the
  same discipline the revised bytes now apply to their own monitor fixture at
  1634–1643.
- The only quantitative deltas I can offer this round are structural (line
  counts, finding counts), because they are the only measures inside my
  observation boundary. This continues to be first-hand evidence for the
  design's central claim: as a headless participant I can observe my inputs and
  outputs and nothing about my own cost, tokens, duration or termination.
- I confirmed the author's own telemetry-relevant disclaimers rather than
  restating them: the response says "No implementation tests, schema validation
  or post-draft review were performed" and "No executed fixture validation is
  claimed", and I found no place in the revised bytes asserting that any gate
  has been run. That honesty is correct and is not a finding.

## Next Action

Author response for round 2: address XPR-008(a), XPR-008(b), XPR-016, XPR-017
and XPR-019, and XPR-018, with per-finding dispositions and a revised patch.
Four of the five are single-sentence or single-field corrections; XPR-016 adds
one response field, one tuple-table row and one gate assertion. If those land
as described, I expect round 3 to be an acceptance pass — subject to the
standing limitation that I cannot verify digests or confirm that the reviewed
bytes match the applied FUR, which the controller should resolve by publishing
the supervisor-observed revised digest with the next snapshot.
