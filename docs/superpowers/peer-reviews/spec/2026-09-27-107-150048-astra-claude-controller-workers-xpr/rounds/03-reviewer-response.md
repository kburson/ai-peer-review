# XPR Round 3 — Reviewer Response

- **Review:** `2026-09-27-107-150048-astra-claude-controller-workers-xpr`
- **Round:** 3
- **Phase:** critique
- **Issue:** #107
- **Pattern:** XPR (cross-family)
- **Reviewer:** headless Claude Opus 5, high effort (non-author, non-controller)
- **Reviewed bytes:** `rounds/02-after.md`, complete file, 2393 lines
- **Author response read:** `rounds/02-author-response.md`, complete file, 107 lines
- **Prior snapshots:** `initial-fur.md` 1931 lines (round 1), `rounds/01-after.md` 2266 lines (round 2)
- **Digests declared by the author:** input `82fa213f…c7825`, reviewer response `09c1ac6c…a9bc18` — **neither independently verified** (see Telemetry)

## Verdict

**changes-required**

Two open findings, both editorial-integrity defects in one region of the
verification gates. Every substantive remedy from rounds 1 and 2 is present,
correct and intact; I re-verified all fourteen previously resolved findings
against the new bytes and found no regression in any normative section.

- **XPR-008** (still-open) — parts (a) and (b) from round 2 are **resolved** in
  the normative section. The finding stays open because its own remedy is now
  self-contradictory: gate 2 requires a *byte-for-byte* comparison against the
  **corrupted** pattern that the remedy removed, and the grammar paragraph
  makes a false claim about ECMAScript `$`.
- **XPR-020** (new, low) — the round-2 patch introduced a fresh corruption,
  `APR*FINDINGS_UNRESOLVED`, into a gate line that was correct in the previous
  snapshot, plus spacing and indentation damage in the same block.

Both are confined to the gate-2 text and both close with a single literal-integrity
pass. No architecture, contract, telemetry, recovery or response-schema change
is required. Had gate 2 transcribed the corrected pattern, this round would
have been an acceptance pass.

I want to be explicit about proportionality: these are small defects. I am not
holding acceptance over prose style. I am holding it because the document now
contains two mutually exclusive normative literals for the same grammar, and a
gate that mandates the wrong one — which is a mechanical contradiction an
implementer must resolve by guessing, in exactly the place the last two rounds
were spent making guess-free.

## Carried Findings — Resolution Status

| ID | Status | Anchor in `02-after.md` |
| --- | --- | --- |
| XPR-008 | **still-open** (re-narrowed) | resolved at 590–592, 607–614; open at 2158–2159 and 593–594 |
| XPR-016 | resolved | 271, 299–319, 579–581, 1842–1850, 1854–1860, gate 6 (2241–2249) |
| XPR-017 | resolved | 560–573, gate 2 (2171–2175) |
| XPR-018 | resolved | 53–54, 272, 1645–1647, 1667–1684, 1689, gate 6 (2228–2235) |
| XPR-019 | resolved | 775–778, 1813–1822, gate 4 (2207–2211) |

### XPR-008 — STILL-OPEN (re-narrowed)

- **Severity:** medium
- **Category:** internal consistency / implementability
- **Section:** "Findings and Debate" (590–594); gate 2 (2158–2163)

**Round-2 part (a) — resolved.** The normative grammar is restored and
code-formatted exactly as requested (590–592):

> The participant allocates `finding_id` as an ASCII string matching
> `^[A-Za-z][A-Za-z0-9._-]{0,63}$` (ECMAScript regular expression, no flags).
> The total length is 1 through 64 characters inclusive.

The field name is `finding_id` throughout (confirmed at 1803), the flavor and
flag state are named, the inclusive length is stated, and whole-input matching
is required. A grep of the whole file returns exactly one remaining `*`-corrupted
identifier (see XPR-020) and no other `finding*id`.

**Round-2 part (b) — resolved.** The ambiguity is removed decisively (607–614):
"the complete set of the stage's already-used finding IDs, including resolved
IDs, which are unavailable for new findings. **This is an exclusion set, not a
runtime-reserved allocation pool.**" The delivery mechanism I asked about is
specified beyond what I requested — a sealed JSON string array in the read-only
context projection with exact path, entry count, SHA-256 and ledger revision,
plus "Keep large sets file-backed rather than embedding them in a bounded tool
response; never truncate the set or omit resolved history." That correctly
anticipates the unbounded-growth concern I raised only implicitly.

**(c) — open. Gate 2 mandates byte-for-byte comparison against the corrupted
pattern.** Gate 2 reads (2158–2159):

> Registry fixtures compare the published code-formatted `finding_id` grammar
> byte-for-byte with `^[A-Za-z]A-Za-z0-9.*-]{0,63}$`, compile it as ECMAScript
> without flags, and enforce whole-input matching.

- **Evidence:** The document now contains two different literals for one
  grammar: the corrected `^[A-Za-z][A-Za-z0-9._-]{0,63}$` at line 591, and the
  original corrupted `^[A-Za-z]A-Za-z0-9.*-]{0,63}$` at line 2159 — verbatim the
  string I quoted as the defect in round 2. Both are inside backticks, so this
  is not Markdown mangling: the gate's literal was transcribed from the
  pre-fix text rather than from the fix.
- **Impact:** The gate is unsatisfiable as written, and it is internally
  inconsistent with itself. A fixture that does what 2158–2159 says compares
  line 591's bytes against a different string and fails, so an implementer
  chasing a green gate has a standing incentive to "correct" line 591 back to
  the broken pattern — reinstating the original defect through the mechanism
  built to prevent it. The gate's own accept list disproves its literal: it
  requires accepting `a.b_c-9` (2161), which matches the corrected class
  `[A-Za-z0-9._-]` and cannot match the corrupted one, and requires accepting
  "a 64-character ID consisting of `A` plus 63 digits", which is only
  well-defined under the corrected `{0,63}` class. So the gate simultaneously
  names one pattern and tests another.
- **Request:** Two changes. First, delete the second transcription: have the
  gate reference the grammar by its registry identifier (e.g. "the registry's
  `finding_id` pattern as published in Findings and Debate") and assert
  equality between the registry value and the published document literal,
  rather than restating the regex a second time. A single source of truth
  removes this failure mode permanently rather than fixing one instance of it.
  Second, if a literal must appear in the gate, make it byte-identical to line
  591 and add the assertion that the two document occurrences are equal.

**(d) — open. The stated justification for whole-input matching is false for the
specified configuration.** Lines 593–594 read:

> Require the matched span to consume the entire input without trimming;
> ECMAScript `$` can also match before a final line terminator, which is not a
> valid identifier character.

- **Evidence:** The same sentence pair specifies "ECMAScript regular
  expression, **no flags**" (591). In ECMAScript, `$` asserts end-of-input and
  matches before a line terminator only when the `m` (multiline) flag is set;
  without flags, `/^[A-Za-z][A-Za-z0-9._-]{0,63}$/.test("A\n")` is `false`. The
  quoted behaviour is that of Python, Perl and PCRE, not of flagless
  ECMAScript.
- **Impact:** Behaviourally none, and I want that on the record: the *rule*
  ("consume the entire input without trimming") is correct and gate 2's
  trailing-newline rejection case (2163) passes under flagless ECMAScript
  either way. The defect is that a normative paragraph asserts a false property
  of the exact regex engine it mandates, in the one place the specification is
  being precise about validation mechanics. A reader who trusts it will believe
  flagless ECMAScript needs a defensive anchor it does not need, and a reader
  who checks it loses confidence in the surrounding precision. It also risks
  the opposite error — someone "restoring" the documented behaviour by adding
  `m`, which would genuinely accept `"A\n"`.
- **Request:** Reattribute or delete the clause. The accurate version is
  worth keeping as a portability note, e.g.: "Require the matched span to
  consume the entire input without trimming. Flagless ECMAScript `$` already
  asserts end-of-input; implementations in flavors where `$` may match before a
  trailing newline (Python, PCRE) must use an explicit end-of-input anchor, and
  a line terminator is never a valid identifier character." Keep gate 2's
  trailing-newline case either way.

### XPR-016 — resolved

The pause is now a first-class observable, implemented more completely than I
asked. The response registry gains a fourth orthogonal dimension (1842–1850):
"`dispatch_admission`: `held` (boolean), `reason_code` and `required_action`",
with the observer hold using exactly the values I proposed
(`awaiting-visible-observer`, `reattach-visible-observer`), nulls when not held,
and the scope limit "This dimension describes the additional visibility hold,
not permission to bypass phase, cap, identity, fence or terminal checks."

My specific concerns are each answered in the bytes:

- **Coarse status is pinned and `reconciling` is explicitly excluded** (303–306):
  "coarse `status` remains `starting` until startup completes and `running`
  thereafter, including when admitted work has finished and the next dispatch is
  held. Surface loss alone does not select `reconciling`, `awaiting-participant`
  or `intervention-required`, and does not create an integrity fence."
- **The ambiguous word "reconcile" is gone from the preflight table**, whose
  post-reservation column now reads "Hold dispatch admission awaiting a visible
  observer; retain lease" (271).
- **Clearing requires real proof, not transport recovery** (310–315): the hold is
  journaled with run revision/cursor, cleared "only after verifying an
  authorized visible surface has reattached", and "restoring transport or polling
  status alone is not that proof". Correctly, `reattach-visible-observer` is
  defined as a host-adapter requirement rather than a new `intervene_review`
  action, which keeps the closed action union closed.
- **The state enum sentence is updated** (579–581): "Fencing, liveness and
  dispatch admission are orthogonal response fields, not extra run states."
- **The tuple table gains a column and a row** (1857–1864), with a preamble
  (1854–1855) disambiguating which fixtures retain a verified surface, and the
  new row carrying the exact three field values with `status=running` and
  `Fencing inactive`. The pre-existing observer-disconnect row reports "Last
  known value with stale marker", which correctly distinguishes the disconnected
  observer's vantage point from the broker-reachable case in the new row.
- **Gate 6 is now assertable on values** (2241–2249), including the negative
  cases I wanted: "Transport-only reconnection or status polling cannot clear
  it. A sealed unattended run does not acquire this observer hold."

I also checked the terminal interaction, which the author added unprompted:
"A terminal transition closes the observer hold without permitting further
dispatches" (318–319), consistent with "Already admitted work may finish and
seal" (293–294). A run whose last critique was already admitted can therefore
still reach `accepted` while held, which is the right outcome.

### XPR-017 — resolved

The pronoun ambiguity is replaced by an explicit scope rule (560–565):
"replacement never restores a consumed round or that round's exhausted revision
allowance. Revision-attempt counters are scoped to `(requested_stage_id,
round)`, not to a participant or stage-attempt. Every newly admitted round,
including a replacement's fresh round, receives the full sealed
`max_revision_attempts_per_round` allowance if revision is needed, including its
initial revision attempt." That is Reading A, stated unambiguously.

The secondary question I raised is answered directly (567–573): "No v1
intervention grants additional revision attempts within an exhausted round.
`extend-cap` authorizes additional rounds only; it neither resets a revision
counter nor independently authorizes participant replacement." Gate 2 pins it
numerically (2171–2175): with `max_revision_attempts_per_round=3`, exhaust round
N, authorize replacement, fresh critique in round N+1, three attempts there
including the initial one, "a fourth is denied", and "Round N remains exhausted
through replacement, resume and extend-cap". I verified the arithmetic and the
negative case are mutually consistent with 541–542 and with the 1..10 config
bound at 1345.

### XPR-018 — resolved

`unknown` now receives the same treatment as its siblings (1667–1684), including
the precedence rule I did not think to ask for: "`expected_reentry_count` is
null with reason `unknown-capability`, even when a duration is supplied; this
takes precedence over the known-capability duration formula above." The
null-versus-false distinction is handled correctly ("Report an unobservable
`outside_inference_reattach` as null with that reason, not false"), and partial
knowledge is preserved without capability inflation ("Preserve any independently
verified component observation, such as a finite ceiling, with its evidence
without promoting the overall capability").

The admission consequence is stated (1678–1681): "Unknown wait capability alone
does not reject a run or require unattended authorization: `unattended=false` is
admissible when a visible monitor surface is verified", with the separate
missing-surface path preserved — which is the correct separation of the two
axes. A preflight row is added (272). The anti-substitution clause is a good
addition: "do not introduce periodic model polling as a substitute for unknown
wait behavior."

The terminology cleanup is complete: a grep for "capable host" across all 2393
lines returns **zero** matches. The three former occurrences now read
`host_wait_capability=single-wakeup` (53–54, 1645–1647, 1689). Gate 6 adds the
`unknown` fixture with every disclosed field and the surface-removal case
(2228–2235).

### XPR-019 — resolved

Both parts are in the bytes. Path delivery is now mandatory and explicitly
anti-inference (1813–1822): "Every critique/revision handoff, including resume
and replacement, also supplies `submission_partition_path` and
`shared_collateral_path` as exact absolute paths in the originating physical
worktree, bound to the current role grant and checked against the enforced write
scope. SAR receives the solo partition. Participants use these supplied paths
rather than constructing them from run IDs, role names or storage templates."
The author also closed a leak I would have raised next: "These local handoff
paths do not add absolute paths to portable evidence", which preserves "No
absolute worktree path… is exported" (707–708).

The consumption semantics are stated where the sibling codes state theirs
(775–778): "This correctable scope rejection consumes neither another round nor
the submission grant and does not advance the phase or revision. It returns
`next_action=submit_review_turn` for the same phase/revision, naming the exact
permitted role partition so the participant can correct its submission." Gate 4
(2207–2211) tests path delivery including SAR solo paths, and that "a corrected
submission succeeds without an additional round or dispatch."

## New Findings

### XPR-020 — Round-2 patch corrupted previously-correct gate text

- **Severity:** low
- **Category:** internal consistency / regression
- **Section:** gate 2 (2152, 2160–2163, 2171)
- **Evidence:** Line 2152 now reads "Clean verdicts with unresolved disputed IDs
  fail with `APR*FINDINGS_UNRESOLVED`." The same line in the previous snapshot
  (`01-after.md` line 2058) read `APR_FINDINGS_UNRESOLVED`, which is the correct
  code used at line 638 of the current bytes. A whole-file grep for `*`-bearing
  identifiers returns this as the only remaining instance, so it is an isolated
  regression rather than a pattern — but it is a regression in text that was
  previously correct, introduced by the same patch that fixed the identical
  defect elsewhere. The same block carries three further corruptions of the same
  family: the continuation lines 2160–2163 lose the gate list's three-space
  indentation and start at column 0, which terminates the numbered list item in
  a Markdown renderer; and inline code loses its surrounding spaces at 2161
  ("`` `a.b_c-9`and a 64-character ID consisting of`A`plus 63 digits ``") and at
  2171 ("`` With`max_revision_attempts_per_round=3` ``").
- **Impact:** `APR*FINDINGS_UNRESOLVED` is not a valid stable error code and does
  not match the code the gate is meant to assert, so a fixture generated from
  this line tests a nonexistent identifier. The indentation break means gate 2's
  most detailed assertions — the `finding_id` grammar cases and the
  revision-allowance fixture — may render outside the gate they belong to, which
  matters because this document is the input to plan and registry authoring and
  is read rendered. Individually trivial; collectively they show that the
  round-2 patch was not passed through a literal-integrity check, which is also
  the root cause of XPR-008(c).
- **Request:** Restore `APR_FINDINGS_UNRESOLVED`, re-indent 2160–2163 to the
  gate's continuation indentation, and restore the missing spaces at 2161 and
  2171. Then run one mechanical pass over the whole document asserting that
  (i) every `APR_*` code and every schema/field identifier appears with
  underscores intact, and (ii) every identifier and regex literal is inside
  backticks. Both checks are cheap to automate and belong in the same offline
  help/registry validation the design already requires at 1920–1930, so the next
  patch cannot reintroduce this class.

## Findings Summary

| ID | Severity | Category | Status |
| --- | --- | --- | --- |
| XPR-008 | medium | internal consistency / implementability | still-open — parts (a),(b) resolved; (c) gate literal, (d) false `$` claim |
| XPR-020 | low | internal consistency / regression | open — new |

Open findings at end of round 3: **2**. Resolved to date: **17** of 19 allocated
IDs (XPR-001 … XPR-007, XPR-009 … XPR-019).

## Regression Check on Previously Resolved Findings

All fourteen findings resolved in round 2 were re-verified against the new bytes
by locating their normative anchors and their gates. All remain resolved; the
only damage found anywhere in the document is the gate-2 text covered by
XPR-008(c) and XPR-020.

| ID | Re-verified anchor | Intact |
| --- | --- | --- |
| XPR-001 canonical encoder | 197–215; gate 1 (2139–2148) | yes — encoder rules and all gate cases unchanged |
| XPR-002 monitor admission/retry | 277–297; 1640–1642 | yes — fresh-ID correction, `mutation_occurred=false`, no-auto-consent intact |
| XPR-003 controller telemetry | 1159–1178; 1242–1243; gate 10 (2293–2296) | yes — capability enum, assurance fields, CLI rule intact |
| XPR-004 monitor fixture | 1696–1715 | yes — no literal zero, no controller model; 21400+16800=38200 still consistent |
| XPR-005 host-restart evidence | 1485–1495; 1590–1608; gates 7/13 | yes — non-proof list, containment scoping, lease-release ordering intact |
| XPR-006 pre-reservation allowlist | 248–264; gate 14 (2330–2335) | yes |
| XPR-007 role-isolated staging | 681–682; 750–781; 1398–1402; 496–499; gate 4 | yes — and now reinforced by XPR-019's path delivery |
| XPR-009 session distinctness | 446–459; gate 9 (2270–2279) | yes — three fencing codes and fresh-session alternative intact |
| XPR-010 revision exhaustion | 541–573; gate 2 (2166–2175) | yes — normative text clean; only the 2171 spacing defect, which does not change meaning (logged under XPR-020) |
| XPR-011 participant channel | 476–491; gate 9 (2277–2279) | yes |
| XPR-012 fallback naming | 362–374; 1299–1301; 1329–1330; gate 15 (2339–2341) | yes — pointer rules and `["sar"]` restriction intact |
| XPR-013 amendment inventory | 701; 712–729; 860–861; gate 12 (2314–2318) | yes |
| XPR-014 wait capability | 1649–1665; 1692–1694; gate 6 | yes — and extended by XPR-018's `unknown` rules |
| XPR-015 removed config key | 1305–1310; 1349–1350; gate 15 (2341–2343) | yes — grep confirms the key appears only in the two prohibition sentences |

## Fresh-Review Coverage

- **Full re-read of the revised bytes.** All 2393 lines in eight contiguous
  ranges, plus two targeted greps to verify literals across the whole file
  (`capable host` → 0 matches; `*`-corrupted identifiers → 1 match;
  `^[A-Za-z]` grammar literals → 2 matches, disagreeing; `dispatch_admission`
  → 4 matches; `on_missing_surface` → 2 prohibition-only matches). Line count
  grew 2266 → 2393 (+127).
- **New text audited as fresh specification.** The four new normative blocks —
  the `dispatch_admission` hold (299–319, 1842–1850), the `unknown` wait
  capability (1667–1684), the revision-counter scope (560–573), and the handoff
  path contract (1813–1822) — were reviewed independently of whether they
  satisfied the prior findings. Specific interactions I checked and found sound:
  a held run can still reach `accepted` when its final critique was already
  admitted; the hold does not create an integrity fence and does not gate
  control/recovery operations; `hard_timeout_ms` continues to bound admitted
  work while held; the already-used-ID exclusion set cannot go stale mid-round
  because only one critique is admitted per round and collisions are checked
  atomically against the live ledger; and supplying absolute handoff paths does
  not violate the portable-evidence prohibition on absolute paths.
- **Arithmetic and enum completeness re-derived.** `max(0, ceil(D/W)-1)` at
  D=150000/W=60000 → 2, matching gate 6; the 64-character boundary case (`A`
  plus 63 digits) against `{0,63}`; threshold ordering `15000 <= 60000 < 120000
  < 1800000`; all three `host_wait_capability` members now have disclosure
  rules, admission consequences and fixtures; all four response dimensions
  appear in the tuple table.
- **Areas re-confirmed sound and unchanged:** round/cap arithmetic and the
  final-round acceptance rule; the acceptance predicate and its
  duplicate/supersede/split conditions; patch-chain ordering and reconstruction;
  loopback transport hardening and its stated threat model; lineage cross-mode
  discovery; migration, pinned `runtime_binding` and the manual-XPR retirement
  gate; the disjoint accounting partition and never-zero discipline; gate
  dependency attributions (3/10/11/12 → #30/#34, 8 → #102).

## Telemetry

Reported per the brief: only values I can observe. Unavailable values are `null`
with a reason and the collection source that would supply them. No value is
reported as zero in place of unknown.

### Observed

| Measure | Value | Provenance | Source |
| --- | --- | --- | --- |
| Review round | 3 | reported | this response |
| Reviewer role | reviewer (XPR, non-author, non-controller) | reported | reviewer-brief.md |
| Requested reviewer identity | `claude` / `claude-opus-5` / high effort | reported (requested, **not** observed) | reviewer-brief.md |
| Revised bytes reviewed | `rounds/02-after.md`, 2393 lines, read in 8 contiguous ranges covering 1–2393 | reported | this session's file reads |
| Observed line-count delta | +127 lines (2266 → 2393) | derived from this and the round-2 line count | this session's file reads |
| Cumulative line-count delta | +462 lines (1931 → 2393) across three snapshots | derived from the three observed line counts | this session's file reads |
| Author response read | `rounds/02-author-response.md`, 107 lines, complete | reported | this session's file reads |
| Read tool calls this round | 9 (1 author response, 8 revised-bytes ranges) | reported | this session's tool calls |
| Search tool calls this round | 2 greps over the full revised bytes | reported | this session's tool calls |
| Write tool calls this round | 1 (`rounds/03-reviewer-response.md`) | reported | this session's tool calls |
| Files modified this round | 1, this response only | reported | this session's tool calls |
| Web research performed | none | reported | this session's tool calls |
| Carried findings re-evaluated | 5 of 5 (XPR-008, XPR-016 … XPR-019) | reported | this response |
| Carried findings resolved this round | 4 | reported | this response |
| Carried findings still-open | 1 (XPR-008) | reported | this response |
| Prior resolved findings re-verified | 14 of 14, all intact | reported | this response |
| New findings allocated | 1 (XPR-020) | reported | this response |
| Open findings at end of round 3 | 2 | derived (1 still-open + 1 new) | this response |
| Grammar literals found for `finding_id` | 2, disagreeing (lines 591, 2159) | reported | grep over the revised bytes |
| `capable host` occurrences remaining | 0 | reported | grep over the revised bytes |

### Unavailable

| Measure | Value | Reason | Collection source that would supply it |
| --- | --- | --- | --- |
| Verification of declared input digest `82fa213f…c7825` | null | not-observable — no hashing or shell tool is available under the current restricted tool set | controller/broker artifact digest observation at snapshot capture |
| Verification of declared reviewer-response digest `09c1ac6c…a9bc18` | null | not-observable — same as above; I cannot confirm the author hashed my round-2 file rather than a variant | supervisor seal over the sealed round-2 payload |
| Confirmation that `02-after.md` equals the applied FUR | null | not-observable — the FUR at `docs/superpowers/specs/2026-09-27-107-agent-first-review-runtime-design.md` is outside this review folder and my file tools are confined to the working directory; the author again states no patch was applied and the revised digest is "pending controller application" | controller, by applying the patch and publishing the supervisor-observed revised digest |
| Observed reviewer session handle / fingerprint | null | not-exposed — the model has no read access to its own provider session handle; per the FUR's own rule a self-asserted label is not identity evidence | provider adapter exact-session observation surface (#88/#90) |
| Input / output tokens | null | not-exposed — per-turn usage is not surfaced to the model in-session | provider usage envelope captured by the broker/provider adapter outside the model turn |
| Reasoning/thinking tokens | null | not-exposed — hidden reasoning counters are not visible to the model | provider usage envelope via provider adapter |
| Cache-read / cache-creation tokens | null | not-exposed — same as above | provider usage envelope via provider adapter |
| Marginal cost, currency, cost basis | null | not-exposed — no pricing or billing surface is reachable from this session | provider billing/usage envelope or host session-usage surface at the controller/broker boundary |
| Wall-clock duration of this round | null | not-exposed — no clock or shell is available in this session (date known only to day granularity) | controller-observed start/end timestamps at the supervision boundary |
| API / queue duration | null | not-exposed — provider-reported durations are emitted outside the model turn | provider response metadata via provider adapter |
| Stop reason / terminal reason | null | not-observable-from-inside — determined after this turn completes | provider process exit record / session API via participant wrapper |
| Per-round or cumulative usage trend across rounds 1–3 | null | not-exposed — no per-round usage was observable in any round, so no trend or delta can be derived | broker-sealed attempt receipts across all three rounds |
| Prior SAR finding resolution status | null | not-observable — `../2026-09-27-107-145046-controller-worker-sar/manifest.json` remains outside the working directory; the round-1 read attempt was denied and the restriction is unchanged | controller, by placing the prior manifest inside this review folder |
| Controller-side usage for this round | null | not-observable-by-reviewer — the reviewer is outside the controller's accounting scope by design | host adapter controller accounting ID |
| Whether gate fixtures have been executed | null | not-observable — no test runner is available to me, and the author states "no implementation or registry tests were run" | installed conformance and registry validation runs |

### Telemetry notes

- Every unavailable value is `null` with a reason and a named collection source;
  none is reported as zero. The only quantitative measures inside my observation
  boundary remain structural — line counts, finding counts, and grep match
  counts — and I report those rather than estimating anything I cannot see.
- Three rounds in, the pattern is itself the evidence for the design's central
  claim: I can observe my inputs, my outputs and the bytes I was given, and
  nothing about my own cost, tokens, duration or termination. The external
  observation boundary the specification mandates is the only place those values
  could come from.
- The author's verification boundary statement is accurate and I did not treat
  it as a finding: "No files were written, no patch was applied, and no
  implementation or registry tests were run." Notably, XPR-008(c) is exactly the
  class of defect an executed registry fixture would have caught, which is an
  argument for running gate 2's grammar comparison before the next submission
  rather than after.

## Next Action

Author response for round 3: address XPR-008(c), XPR-008(d) and XPR-020. All
three are literal corrections in a single region plus one automatable integrity
check:

1. replace gate 2's second grammar transcription with a registry reference (or
   make it byte-identical to line 591 and assert equality of the two);
2. correct or reattribute the ECMAScript `$` clause at 593–594;
3. restore `APR_FINDINGS_UNRESOLVED` at 2152, the indentation at 2160–2163 and
   the inline-code spacing at 2161 and 2171, then add the underscore/backtick
   integrity checks to the existing offline registry validation.

No other change is requested. If those land as described, round 4 should be an
acceptance pass — subject to the standing limitation, unchanged across all three
rounds, that I cannot verify digests or confirm that the reviewed bytes match
the applied FUR. The controller should resolve that by publishing the
supervisor-observed revised digest with the next snapshot.
