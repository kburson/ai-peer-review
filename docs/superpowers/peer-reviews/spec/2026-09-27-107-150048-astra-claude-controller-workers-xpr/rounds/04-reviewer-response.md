# XPR Round 4 — Reviewer Response (Clean Pass)

- **Review:** `2026-09-27-107-150048-astra-claude-controller-workers-xpr`
- **Round:** 4
- **Phase:** critique
- **Issue:** #107
- **Pattern:** XPR (cross-family)
- **Reviewer:** headless Claude Opus 5, high effort (non-author, non-controller)
- **Reviewed bytes:** `rounds/03-after.md`, complete file, 2420 lines
- **Author response read:** `rounds/03-author-response.md`, complete file, 70 lines
- **Prior snapshots:** `initial-fur.md` 1931 lines (r1), `rounds/01-after.md` 2266 lines (r2), `rounds/02-after.md` 2393 lines (r3)
- **Digests declared by the author:** input `c1fcfdbb…88445c`, reviewer response `f997d973…8b6350` — **neither independently verified** (see Telemetry)

## Verdict

**accepted**

No open findings. No disputed findings. No deferred findings. No new findings.

Both carried findings are resolved in the reviewed bytes, and all eighteen
previously resolved findings remain resolved. I re-read the complete
specification and ran whole-file literal-integrity checks; the two defect
classes that kept rounds 3 and 4 open — a second, divergent transcription of the
`finding_id` grammar, and underscore-to-asterisk corruption of registered
identifiers — are both eliminated at the source and are now guarded by explicit
negative fixtures so they cannot silently recur.

Acceptance is a statement about this specification's internal correctness,
completeness, consistency, implementability, security posture, recovery model,
telemetry discipline and verification coverage, evaluated against the reviewed
bytes. It is not a claim that any gate has been executed; the author states
plainly that no fixtures were run, and that limitation is disclosed rather than
resolved. The standing observation-boundary limits on my side — I cannot compute
digests, and I cannot see the applied FUR — are recorded in Telemetry as
unavailable measurements with their collection sources. They are properties of
this reviewer's sandbox, not defects in the document, and I am not recording
them as findings or deferrals.

## Carried Findings — Resolutions

### XPR-008 — resolved (state: fixed)

All four parts are closed in `03-after.md`.

**(a) Grammar literal — fixed.** Lines 590–593:

> The participant allocates `finding_id` as an ASCII string governed by registry
> grammar `ai-peer-review.finding-id/v1`. The registry entry owns the validation
> pattern; its sole published pattern in this document is
> `^[A-Za-z][A-Za-z0-9._-]{0,63}$` (ECMAScript regular expression, no flags).

A whole-file grep for `^[A-Za-z]` returns **exactly one** match, at line 593,
and it is the correct pattern. The field name is `finding_id` with the
underscore intact at 590, 605, 1807.

**(b) Exclusion-set semantics — fixed** (unchanged and intact at 611–617): "the
complete set of the stage's already-used finding IDs, including resolved IDs,
which are unavailable for new findings. This is an exclusion set, not a
runtime-reserved allocation pool."

**(c) Second transcription in gate 2 — fixed.** Gate 2 now resolves the registry
entry instead of restating the regex (2181–2184): "Registry fixtures resolve
grammar `ai-peer-review.finding-id/v1`, assert equality with its sole published
pattern in Findings and Debate, compile the registry value as ECMAScript without
flags, and enforce whole-input matching." The direction is correct — the
*registry* value is compiled and the document literal is checked against it, so
there is one source of truth rather than two peers. The prohibition is stated
three times and is mutually consistent: at 597–598 ("Other documentation and
verification gates reference the registry grammar identifier rather than
transcribing the pattern again"), at 1942–1944 ("assert that Findings and Debate
contains exactly one published pattern matching the registry entry and that
gate 2 references that entry without a second pattern transcription"), and at
2200–2202 ("no second regex transcription is used as an expected value"). This
is the durable fix I asked for rather than a one-off correction of the bad
literal.

**(d) False ECMAScript `$` claim — fixed.** Lines 594–597 now read: "Require the
matched span to consume the entire input without trimming. Without flags,
ECMAScript `$` asserts end-of-input; trailing line terminators are rejected.
Multiline mode is not permitted." That is correct for the specified flagless
expression, and the added multiline prohibition forecloses the one way an
implementer could reintroduce the behaviour the old sentence wrongly described.
Gate 2's rejection case for "an otherwise valid ID followed by a newline"
(2185–2187) is retained, so the defensive assertion survives the corrected
rationale.

I verified the grammar's own accept/reject list against the pattern rather than
taking it on trust: `A`, `XPR-001` and `a.b_c-9` all match
`^[A-Za-z][A-Za-z0-9._-]{0,63}$`; `A` plus 63 digits is exactly 64 characters
and matches the `1..64` inclusive bound; the empty string, a leading digit, a
65-character ID and any non-ASCII character all fail. The stated bound and the
pattern's `1 + {0,63}` arithmetic agree.

### XPR-020 — resolved (state: fixed)

**Corrupted error code — fixed.** `APR_FINDINGS_UNRESOLVED` is restored and
code-formatted at both sites: the acceptance contract (642) and gate 2 (2175).
A whole-file enumeration of `APR_[A-Z_]+` returns 25 occurrences across 20
distinct codes, **all with underscores intact**, and a grep for
asterisk-separated identifiers returns **zero** matches anywhere in the 2420
lines.

**Indentation and spacing — fixed.** Gate 2's continuation lines 2181–2202 are
back inside the numbered item at the three-space indentation used by the
surrounding gates, and the inline-code separators are restored at 2184
("`a.b_c-9` and a 64-character ID consisting of `A` plus 63 digits") and 2195
("With `max_revision_attempts_per_round=3`").

**Recurrence prevention — fixed, and stronger than requested.** A new normative
block extends offline validation to literal and Markdown integrity (1936–1953),
covering every element I asked for plus two I did not:

- exact registry spelling for "Registered error codes, schema/field identifiers
  and grammar literals … including underscores";
- a rule against the failure mode itself — "never obtain their canonical bytes
  by rendering and reparsing prose. Compare the source code-node contents and
  rendered code text against the registry";
- the single-published-pattern assertion for `ai-peer-review.finding-id/v1`;
- Markdown structure parsing: "assert that gate 2's grammar and
  revision-allowance assertions remain within numbered item 2, with spaces
  separating inline code from adjacent prose words";
- cross-reference consistency: "Assert that the unresolved-findings gate names
  the same registered error code as the acceptance contract" — which is exactly
  the check that would have caught the round-2 regression; and
- four negative fixtures, one per defect class observed in this review: "an
  underscore-to-asterisk substitution, a changed grammar character class, a
  de-indented continuation and a removed inline-code separator; each must fail
  the corresponding integrity assertion."

The block closes with the correct scope limit — "These checks supplement
schema/example validation and do not redefine protocol behavior" — and is hooked
into a release gate at 2200–2202, so it is enforced rather than aspirational.

## Full Finding Ledger

Every ID allocated in this review, with its terminal reviewer resolution in the
specification's own vocabulary. No ID is open, disputed, deferred, duplicated,
superseded or split; none was withdrawn or closed on accepted-rationale.

| ID | Severity as raised | Resolution | Resolved in |
| --- | --- | --- | --- |
| XPR-001 | high | fixed | `01-after.md` |
| XPR-002 | high | fixed | `01-after.md` |
| XPR-003 | high | fixed | `01-after.md` |
| XPR-004 | medium-high | fixed | `01-after.md` |
| XPR-005 | medium-high | fixed | `01-after.md` |
| XPR-006 | medium | fixed | `01-after.md` |
| XPR-007 | medium | fixed | `01-after.md` |
| XPR-008 | medium | fixed | `01-after.md` (parts a,b) and `03-after.md` (parts c,d) |
| XPR-009 | medium | fixed | `01-after.md` |
| XPR-010 | medium | fixed | `01-after.md` |
| XPR-011 | medium | fixed | `01-after.md` |
| XPR-012 | low | fixed | `01-after.md` |
| XPR-013 | low | fixed | `01-after.md` |
| XPR-014 | low | fixed | `01-after.md` |
| XPR-015 | low | fixed | `01-after.md` |
| XPR-016 | medium | fixed | `02-after.md` |
| XPR-017 | low | fixed | `02-after.md` |
| XPR-018 | low | fixed | `02-after.md` |
| XPR-019 | low | fixed | `02-after.md` |
| XPR-020 | low | fixed | `03-after.md` |

Twenty findings allocated, twenty fixed. Three high, two medium-high, six
medium, nine low.

## Regression Verification

Every previously resolved finding was re-located in the new bytes and
re-checked. All remain resolved; the round-3 patch touched only the two regions
it claimed to touch, and I found no collateral damage.

| ID | Anchor in `03-after.md` | Intact |
| --- | --- | --- |
| XPR-001 canonical encoder | 197–215; gate 1 (2162–2171) | yes |
| XPR-002 monitor admission/retry | 271, 277–297; 1644–1646; gate 6 (2265–2268) | yes |
| XPR-003 controller telemetry | 270, 1163–1182, 1246–1247; gate 10 (2320–2323) | yes |
| XPR-004 monitor fixture | 1700–1719; gate 6 (2263–2264) | yes; 21400+16800=38200 re-derived |
| XPR-005 host-restart evidence | 1489–1499, 1594–1612; gates 7/13 | yes |
| XPR-006 pre-reservation allowlist | 248–264; gate 14 (2357–2362) | yes |
| XPR-007 role-isolated staging | 685–686, 754–785, 1402–1406, 498–499; gate 4 | yes |
| XPR-009 session distinctness | 446–459; gate 9 (2297–2303) | yes |
| XPR-010 revision exhaustion | 541–573; gate 2 (2190–2199) | yes |
| XPR-011 participant channel | 476–491; gate 9 (2304–2306) | yes |
| XPR-012 fallback naming | 362–374, 1303–1305, 1333–1334; gate 15 (2366–2368) | yes |
| XPR-013 amendment inventory | 705, 716–733, 864–865; gate 12 (2341–2345) | yes |
| XPR-014 wait capability | 1653–1669, 1696–1698; gate 6 | yes; `max(0, ceil(D/W)-1)` re-derived → 2 at D=150000, W=60000 |
| XPR-015 removed config key | 1309–1314, 1353–1356; gate 15 (2368–2370) | yes |
| XPR-016 dispatch admission | 271, 299–319, 579–581, 1846–1854, 1858–1868; gate 6 (2268–2276) | yes |
| XPR-017 revision-counter scope | 560–573; gate 2 (2195–2199) | yes |
| XPR-018 unknown wait capability | 53–54, 272, 1649–1651, 1671–1688, 1693; gate 6 (2255–2262) | yes; grep confirms 0 remaining "capable host" |
| XPR-019 handoff path delivery | 777–782, 1817–1826; gate 4 (2234–2238) | yes |

## Fresh Full Review

This was a complete re-review, not a diff check.

**Coverage.** All 2420 lines read in eight contiguous ranges, plus two
whole-file integrity greps. Structural measures: 2393 → 2420 lines (+27 this
round; +489 across the review).

**Mechanical checks run against the bytes.**

| Check | Result |
| --- | --- |
| `APR_[A-Z_]+` occurrences | 25 across 20 distinct codes, all underscores intact |
| Asterisk-corrupted identifiers | 0 matches |
| `^[A-Za-z]` grammar literals | 1 (line 593), correct pattern, sole occurrence as the document requires |
| `ai-peer-review.finding-id/v1` references | 3 (591 normative, 1942 integrity check, 2181 gate 2) — no fourth site restates the regex |
| "capable host" | 0 matches; all three former sites use `host_wait_capability=single-wakeup` |
| `monitoring.on_missing_surface` | 2 matches, both prohibitions |

**Arithmetic and enum completeness re-derived, not accepted.** Grammar length
bound versus `1 + {0,63}`; the six accept/reject cases in gate 2 against the
published pattern; `max(0, ceil(D/W)-1)` at both D=150000 and the equal-boundary
case; the monitor fixture's 21400 + 16800 = 38200 subtotal against its displayed
`38.2k`; threshold ordering `15000 <= 60000 < 120000 < 1800000`; all three
`host_wait_capability` members carrying disclosure rules, admission
consequences and fixtures; all four response dimensions present in the tuple
table; gate dependency attributions (3/10/11/12 → #30/#34, 8 → #102) still
accurate after four patches.

**New text audited as fresh specification.** The round-3 additions — the
registry-grammar indirection (590–598), the corrected anchor semantics
(594–597), the literal/Markdown integrity block (1936–1953) and the rewritten
gate-2 assertions (2181–2202) — were reviewed independently of whether they
satisfied XPR-008 and XPR-020. Specific interactions checked: the
"registry entry owns the pattern" and "sole published pattern in this document"
statements are consistent because 1942–1944 asserts equality between them rather
than leaving two independent authorities; compiling the registry value while
comparing the document literal makes the document a validated mirror rather than
a second source; `ai-peer-review.finding-id/v1` follows the established
`ai-peer-review.<name>/vN` convention used by the other fourteen registry IDs;
and the integrity checks are scoped as validation that cannot alter protocol
behaviour.

**Interaction re-checks across sections.** A held run can still reach `accepted`
when its final critique was already admitted (318–319 with 293–294); the
observer hold creates no integrity fence and does not gate control or recovery
operations; a run already in `awaiting-participant` keeps that status when the
surface is lost (305–308); the exclusion set cannot go stale mid-round because
one critique is admitted per round and collisions are checked atomically against
the live ledger; a `split` parent's resolution is well-defined because the
predicate requires both an explicit resolution and all children resolved; and
absolute handoff paths do not violate the portable-evidence prohibition on
absolute paths (1824–1825 with 711–712).

**Areas confirmed sound.** Controller/headless-worker normalization and its
observability rationale; round and cap arithmetic including the final-round
acceptance rule; the acceptance predicate with its duplicate/supersede/split
conditions; finding-ID allocation, collision and lineage; role-isolated staging
with shared untrusted collateral; patch-chain ordering, byte-offset envelope
framing and reconstruction from the terminal anchor; the disjoint accounting
partition, never-zero provenance discipline, separate worker/controller subtotals
and the immutable amendment path with index discoverability; loopback transport
hardening with an honestly scoped threat model; boot-epoch termination evidence
with its enumerated non-proofs and lease-release ordering; lineage cross-mode
discovery and `APR_LINEAGE_UNRESOLVED` over timestamp selection; configuration
closure, merge semantics and bounds; migration with pinned `runtime_binding` and
the manual-XPR retirement gate; and fifteen release gates that each map to a
normative rule.

I looked specifically for reasons to keep this round open and did not find one.
Two candidates I considered and rejected as non-defects rather than leaving
unstated: the registry inventory sentence at 1955–1957 does not list the grammar
entry, but "also defines" is non-exhaustive and two normative references
establish the entry unambiguously; and the integrity checks name sections of
this design document, which is ordinary documentation-test coupling and is
explicitly scoped as validation. Neither changes an implementation decision.

## Telemetry

Reported per the brief: only values I can observe. Unavailable values are `null`
with a reason and the collection source that would supply them. No value is
reported as zero in place of unknown.

### Observed

| Measure | Value | Provenance | Source |
| --- | --- | --- | --- |
| Review round | 4 | reported | this response |
| Verdict | accepted | reported | this response |
| Reviewer role | reviewer (XPR, non-author, non-controller) | reported | reviewer-brief.md |
| Requested reviewer identity | `claude` / `claude-opus-5` / high effort | reported (requested, **not** observed) | reviewer-brief.md |
| Reviewed bytes | `rounds/03-after.md`, 2420 lines, read in 8 contiguous ranges covering 1–2420 | reported | this session's file reads |
| Observed line-count delta | +27 lines (2393 → 2420) | derived from this and the round-3 line count | this session's file reads |
| Cumulative line-count delta | +489 lines (1931 → 2420) across four snapshots | derived from the four observed line counts | this session's file reads |
| Author response read | `rounds/03-author-response.md`, 70 lines, complete | reported | this session's file reads |
| Read tool calls this round | 9 (1 author response, 8 reviewed-bytes ranges) | reported | this session's tool calls |
| Search tool calls this round | 2 greps over the full reviewed bytes | reported | this session's tool calls |
| Write tool calls this round | 1 (`rounds/04-reviewer-response.md`) | reported | this session's tool calls |
| Files modified this round | 1, this response only | reported | this session's tool calls |
| Web research performed | none, in any round | reported | this session's tool calls |
| Carried findings re-evaluated | 2 of 2 (XPR-008, XPR-020) | reported | this response |
| Carried findings resolved this round | 2 | reported | this response |
| Prior resolved findings re-verified | 18 of 18, all intact | reported | this response |
| New findings allocated | 0 | reported | this response |
| Open / disputed / deferred findings | 0 / 0 / 0 | reported | this response |
| Total findings across the review | 20 allocated, 20 fixed | derived from the four response ledgers | this response |
| Rounds consumed | 4 of the 12-round maximum | reported | reviewer-brief.md and this response |
| `APR_*` codes with intact underscores | 25 of 25 | reported | grep over the reviewed bytes |
| Grammar-pattern transcriptions | 1 (required: exactly 1) | reported | grep over the reviewed bytes |

### Unavailable

| Measure | Value | Reason | Collection source that would supply it |
| --- | --- | --- | --- |
| Verification of declared input digest `c1fcfdbb…88445c` | null | not-observable — no hashing or shell tool is available under the current restricted tool set | controller/broker artifact digest observation at snapshot capture |
| Verification of declared reviewer-response digest `f997d973…8b6350` | null | not-observable — same as above; I cannot confirm the author hashed my round-3 file rather than a variant | supervisor seal over the sealed round-3 payload |
| Confirmation that `03-after.md` equals the applied FUR | null | not-observable — the FUR at `docs/superpowers/specs/2026-09-27-107-agent-first-review-runtime-design.md` is outside this review folder and my file tools are confined to the working directory; the author again reports no patch applied and the revised digest "pending controller application" | controller, by applying the patch and publishing the supervisor-observed revised digest |
| Independent confirmation of the author's read-only Node grammar check | null | not-observable — I have no execution tool, so I verified the accept/reject cases analytically against the published pattern instead | any environment that can run the registry fixture |
| Execution status of any release gate or integrity fixture | null | not-observable — no test runner is available to me, and the author states the added integrity checks "have not been implemented or executed" | installed conformance and offline registry validation runs |
| Observed reviewer session handle / fingerprint | null | not-exposed — the model has no read access to its own provider session handle; per the specification's own rule a self-asserted label is not identity evidence | provider adapter exact-session observation surface (#88/#90) |
| Input / output tokens | null | not-exposed — per-turn usage is not surfaced to the model in-session | provider usage envelope captured by the broker/provider adapter outside the model turn |
| Reasoning/thinking tokens | null | not-exposed — hidden reasoning counters are not visible to the model | provider usage envelope via provider adapter |
| Cache-read / cache-creation tokens | null | not-exposed — same as above | provider usage envelope via provider adapter |
| Marginal cost, currency, cost basis | null | not-exposed — no pricing or billing surface is reachable from this session | provider billing/usage envelope or host session-usage surface at the controller/broker boundary |
| Wall-clock duration of this round, and of the review | null | not-exposed — no clock or shell is available in this session (date known only to day granularity) | controller-observed run and round boundaries at the supervision boundary |
| API / queue duration | null | not-exposed — provider-reported durations are emitted outside the model turn | provider response metadata via provider adapter |
| Stop reason / terminal reason | null | not-observable-from-inside — determined after this turn completes | provider process exit record / session API via participant wrapper |
| Total review cost, tokens or duration across rounds 1–4 | null | not-exposed — no per-round usage was observable in any round, so no total or trend can be derived | broker-sealed attempt receipts aggregated across the four rounds |
| Prior SAR finding resolution status | null | not-observable — `../2026-09-27-107-145046-controller-worker-sar/manifest.json` remains outside the working directory; the round-1 read attempt was denied and the restriction is unchanged in every round | controller, by placing the prior manifest inside this review folder |
| Controller-side usage for this review | null | not-observable-by-reviewer — the reviewer is outside the controller's accounting scope by design | host adapter controller accounting ID |

### Telemetry notes

- Every unavailable value is `null` with a reason and a named collection source;
  none is reported as zero, and I report no total over incomplete coverage. The
  only quantitative measures inside my observation boundary across all four
  rounds have been structural: line counts, finding counts and grep match
  counts.
- Four rounds in, this reviewer's position remains first-hand evidence for the
  specification's central claim. I can observe my inputs, my outputs and the
  bytes handed to me, and nothing whatsoever about my own cost, tokens, duration
  or termination. Every telemetry row above that matters for cost or efficiency
  analysis is null for exactly the reason the design gives at lines 30–39 and
  1071–1077: the measuring boundary has to sit outside the participant session.
  An acceptance verdict produced under these conditions is precisely the case
  the design's own rule covers — "acceptance requires review evidence integrity,
  not complete provider counters" (1235–1236) — and the incompleteness above is
  the honest coverage report that rule requires, not a defect and not a
  deferral.
- The author's verification boundary statement is accurate and is not a finding:
  files read and hashed, a read-only Node check of the grammar, no files
  written, no patch applied, no integrity or conformance fixtures executed. I
  verified the grammar's behaviour analytically rather than relying on that
  check.

## Next Action

None from the reviewer. This ledger is closed with twenty findings fixed and
none open, disputed or deferred.

For the controller, three items remain outside reviewer authority and should be
discharged before this acceptance is treated as sealed evidence, per the
specification's own finalization rules:

1. apply the round-3 patch and publish the supervisor-observed revised FUR
   digest, so the accepted bytes are bound to an artifact digest rather than to
   an unverified snapshot copy;
2. record this acceptance against that digest with the reviewed-digest binding
   the round contract requires, confirming it equals both the active snapshot
   and the unchanged FUR bytes; and
3. carry the disclosed limitations into the manifest as explicit coverage —
   reviewer-side telemetry unavailable with reasons and sources, and no gate or
   integrity fixture executed at specification time.

Implementation planning can proceed on the accepted specification, subject to
the reconciliation the document itself requires before schema freeze: #30 for
the record, series-index, patch-chain and response-envelope contracts, #34 for
the attempt-metrics, measurement, aggregate-coverage and telemetry-amendment
contracts, and #102 for per-run pinned installation routing.
