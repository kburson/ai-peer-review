# XPR Round 1 — Reviewer Response

- **Review:** `2026-09-27-107-150048-astra-claude-controller-workers-xpr`
- **Round:** 1
- **Phase:** critique
- **Issue:** #107
- **Pattern:** XPR (cross-family)
- **Reviewer:** headless Claude Opus 5, high effort (non-author, non-controller)
- **FUR reviewed:** `initial-fur.md` — "Agent-First Review API and Portable Runtime Design"
- **Reviewed snapshot:** complete file, 1931 lines
- **Declared baseline SHA-256:** `78ee25ed7133e0d50214510f7d928539267a16e983b52b34c6ddb65fbf70235c` (declared in `reviewer-brief.md`; **not independently verified** — see Telemetry)

## Verdict

**changes-required**

Fifteen open findings: three high, one medium-high, seven medium, four low. The
central architecture decision under review — one visible non-participant
controller plus headless workers for SAR/SPR/XPR, with an external observation
boundary — is sound, well motivated, and internally coherent at the level of
role topology. The defects below are concentrated in four places:

1. the controller side of the observation boundary, which is asserted as a
   telemetry source but is given no capability declaration, no identity
   evidence rule, and no preflight disclosure (XPR-003, XPR-004);
2. request identity and canonicalization, where the stated canonicalization
   rule cannot deliver the idempotency property the design depends on
   (XPR-001), and the documented unattended-authorization path self-conflicts
   with request identity (XPR-002);
3. fail-closed recovery, which has no admissible termination evidence for the
   ordinary host-restart case and therefore can strand an artifact lease
   permanently (XPR-005); and
4. write-scope partitioning and enumerated-rule consistency inside otherwise
   careful sections (XPR-006, XPR-007, XPR-008, XPR-010, XPR-011).

None of these require re-opening the accepted controller/headless-worker
normalization. All are addressable within the current structure.

## Prior-Finding Resolution Status

| Source | Status | Basis |
| --- | --- | --- |
| This XPR, prior rounds | **none exist** | Round 1 is the first round of this review; there is no prior reviewer response in `rounds/` to carry forward. |
| Prior SAR `2026-09-27-107-145046-controller-worker-sar/manifest.json` | **not-observable** | The path is outside this review folder and my file tools are confined to the working directory (`--restricted`); the read was attempted and denied. I therefore make no claim about whether those findings are resolved in this FUR. The FUR's own Document Status asserts it was "Revised after the accepted XPR with the controller-only/headless-worker normalization"; that assertion is author-reported, not reviewer-verified. |

No finding below is asserted to be a re-raise of a prior finding. If the
controller can supply the prior manifest inside this folder, I will reconcile
IDs in round 2.

## Findings

### XPR-001 — Canonicalization rule cannot guarantee the idempotency property it is required to provide

- **Severity:** high
- **Category:** correctness / implementability
- **Section:** "Canonical Start Request" (snapshot lines ~199–213); "Required Verification Themes" gate 1 (~1773–1777)
- **Evidence:** The spec defines canonical bytes as "validated JSON with
  recursively sorted object keys, preserved array order and string values, and
  insignificant JSON whitespace removed. Canonicalization is over the parsed
  value." It then asserts the property "Equivalent parsed values produce
  identical canonical bytes, without overstating validation." Gate 1 tests only
  "whitespace/key order".
- **Impact:** The stated rule is insufficient for the asserted property, and
  three concrete divergences follow directly from it:
  - **Number formatting is unspecified.** `{"max_rounds": 6}` and
    `{"max_rounds": 6.0}` (or `6e0`) parse to equivalent values in JS but
    serialize differently unless a normalization is mandated. A client that
    retries through CLI after a lost MCP response — the exact scenario the
    section is designed to support ("a lost MCP response can be retried through
    CLI without duplicate launch") — can emit a different numeric form and
    receive `APR_REQUEST_ID_CONFLICT` instead of the existing run.
  - **String escaping is unspecified.** "preserved … string values" describes
    the parsed value, not the output encoding. `"spec.md"` and
    `"spec.md"` are the same parsed string; without a mandated minimal
    escaping rule they can produce different canonical bytes.
  - **Key sort collation is unspecified.** Sorting by UTF-16 code unit versus
    Unicode code point differs for non-BMP and surrogate-range keys. Two
    conformant implementations (or an MCP adapter and the CLI) can disagree.
  The failure is not cosmetic: the design's cross-transport idempotency,
  duplicate-launch prevention, and `APR_REQUEST_ID_CONFLICT` semantics all rest
  on canonical-byte equality.
- **Request:** Replace the prose rule with a normative reference to a fully
  specified canonicalization (RFC 8785 / JCS is the obvious candidate) or
  specify, explicitly: number normalization (including the integer-only
  restriction if you prefer to simply reject non-integer numerics in v1),
  minimal string escaping, and code-point key ordering. Extend gate 1 to
  include fixtures for `6` vs `6.0`, `s` vs `s`, and a non-BMP key,
  asserting a single run and no second launch.

### XPR-002 — The documented unattended-authorization path conflicts with request identity and has no defined position relative to reservation

- **Severity:** high
- **Category:** correctness / completeness
- **Section:** "Out-of-Band Monitor and Usage" (~1354–1356); "Configuration" (~1098–1102); "Canonical Start Request" (~205–213, 217–231); gate 6 (~1824)
- **Evidence:** "If no visible surface can be established, report the
  limitation before launch and require an explicit unattended choice." "a start
  request may carry `unattended=true` as explicit authority to proceed without a
  visible monitor. Otherwise the default is false. Config cannot authorize
  unattended operation on the user's behalf." Separately: "The submitted
  filepath string is part of request identity"; "reuse with different canonical
  content returns `APR_REQUEST_ID_CONFLICT`"; "Clients retain the original
  request for retries."
- **Impact:** The only remedy for the missing-surface condition is to resubmit
  with `unattended=true`, which necessarily changes the canonical request
  content. Under the stated identity rule, resubmitting under the same
  `request_id` must return `APR_REQUEST_ID_CONFLICT`, so the documented remedy
  is unreachable without minting a new `request_id` — and that requirement is
  stated nowhere, so a conforming host agent will deadlock on its first
  progress-incapable host. Compounding this, the section places the check only
  "before launch", and launch is explicitly *after* the reservation transaction
  ("Provider launch is a journaled operation after that transaction"). It is
  therefore undefined whether the missing-surface rejection reports
  `mutation_occurred=false` (pre-reservation) or `true` with a run ID
  (post-reservation), and undefined whether the reserved request ID and artifact
  lease must be released. The preflight condition table does not contain a
  monitor-surface row, so neither answer can be derived from it.
- **Request:** (a) Add a monitor-surface row to the preflight condition table
  and state explicitly that the check is pre-reservation, with
  `mutation_occurred=false`; (b) state the required client behaviour on that
  error — either a new `request_id`, or an explicit carve-out making
  `unattended` non-identity-bearing (with the security consequences stated);
  (c) have the error's `next_action`/correction name the exact retry shape;
  (d) extend gate 6 to assert the full loop — rejection, authorized retry,
  single run, no duplicate reservation.

### XPR-003 — Controller telemetry is asserted as a first-class accounting scope but has no capability declaration, preflight disclosure, or identity-evidence rule

- **Severity:** high
- **Category:** telemetry / completeness
- **Section:** "Accounting Identity and Aggregation" (~922–939); "Costs, Recovery and Privacy" (~995–997); preflight condition table (~238–244); "Worker Identity and Role Grants" (~353–362); gate 10 (~1853–1856)
- **Evidence:** "Controller observations use a separate opaque controller
  accounting ID… The trusted host adapter records them in the same
  measurement/receipt and amendment contracts." "Persist separate worker and
  controller subtotals and coverage… A combined run cost/token total is complete
  only when both scopes have complete, compatible coverage." Adapter capability
  advertisement is specified only for provider adapters: "Adapters must
  advertise telemetry capabilities and mapping versions separately from review
  capabilities," and the preflight table's only telemetry row is "Missing
  telemetry support → Admit with unavailable coverage," which the surrounding
  text ties to provider candidates.
- **Impact:** Three concrete consequences:
  - There is no requirement for the **host** adapter to advertise whether it
    can report controller usage at all, so the receipt cannot disclose before
    launch that the combined run total will be permanently incomplete. This is
    exactly the disclosure discipline the design demands everywhere else
    ("Missing usage support … is visible before launch and in every affected
    receipt").
  - In the **CLI fallback path** there is no host adapter in the loop at all —
    the CLI is invoked *by* the controller and cannot observe the controller's
    own token consumption. The design states CLI "is always the final fallback"
    and "accepts the identical request and response schemas," which implies
    identical telemetry obligations that CLI structurally cannot meet. The
    resulting permanent incompleteness is never acknowledged.
  - Controller usage attribution requires trusting host-supplied numbers with
    no identity assurance, while the symmetric worker rule is strict: "A
    caller-supplied fingerprint, model name or unverified environment variable
    is not identity evidence… If launch-time exact-session verification is
    unavailable, that candidate fails preflight." No equivalent
    evidence-source/assurance field is defined for the controller accounting
    scope.
- **Request:** (a) Require the host adapter to advertise a controller-telemetry
  capability (observable / partially observable / not-observable) plus mapping
  version, and add a preflight row for it; (b) require the receipt to disclose,
  before launch, that the combined run total will be incomplete when controller
  usage is not observable; (c) state explicitly that CLI-transport controller
  usage is `unavailable` with reason `not-exposed` and source `host-transport`,
  and that this does not block the run; (d) add a controller-scope assurance
  field paralleling the participant record's `evidence source/version` and
  `assurance`; (e) extend gate 10 with a CLI-transport fixture.

### XPR-004 — The normative monitor example asserts a literal zero for a value the spec forbids zeroing, and renders a controller model with no defined observation source

- **Severity:** medium-high
- **Category:** internal consistency / telemetry
- **Section:** "Out-of-Band Monitor and Usage" (~1369–1375); "Metrics and Comparative Evaluation" (~857–860); "Errors and Self-Discovery" (~1560–1562); "Summary" (~52)
- **Evidence:** The example monitor renders
  `Controller  GPT-6 Sol / medium     supervising · 0 wait tokens` and
  `Usage       controller 3.1k · author 21.4k · reviewer 16.8k reported`.
  Elsewhere: "Unknown values remain null/unavailable, not zero"; "Zero cost
  requires affirmative evidence for that particular measure"; "Host-forced model
  re-entry is disclosed and measured rather than called zero-token waiting";
  "controller usage is unavailable if the host cannot report it". And crucially:
  "Rendered monitor examples derive from validated structured status fixtures,
  not unvalidated display-only strings," which makes this example schema-bearing
  rather than decorative.
- **Impact:** (a) `0 wait tokens` is precisely the affirmative-zero claim the
  telemetry rules prohibit without evidence; because the example is required to
  validate against a status fixture, it establishes a zero-valued field where
  the schema should carry `null` plus reason, or a `reported`-provenance zero
  with a named source. (b) The controller line displays a model and effort
  (`GPT-6 Sol / medium`) that appear nowhere else in the document — no request
  field, no participant record, no registry entry, no resolution rule seals
  controller model/effort, and per XPR-003 no observation surface produces it.
  As written, the only possible source is the controller's self-report, which
  the Worker Identity rules reject as identity evidence. (c) The three `Usage`
  figures carry one trailing `reported` label for a row the spec requires to
  distinguish provenance per field or coherent field group.
- **Request:** Regenerate the example from an actual conformant status fixture:
  show controller wait tokens as `unavailable (not-exposed)` or as a
  provenance-tagged measured value; either add a sealed, provenance-labelled
  controller identity record (requested vs observed, with assurance) or remove
  model/effort from the controller line; and label provenance per usage entry.
  Add the fixture to the gate-6/gate-10 set.

### XPR-005 — Fail-closed recovery has no admissible termination evidence after host restart, permanently stranding the artifact lease

- **Severity:** medium-high
- **Category:** recovery / completeness
- **Section:** "Disconnect and Recovery" (~1318–1323, 1339–1343); "Portable Project-Local Broker" (~1221–1231, 1262–1263); gate 13 (~1872–1876)
- **Evidence:** `acknowledge-unresolved` "may set `status=failed` and
  `assurance=termination-unproved`, but retains every unresolved fence,
  artifact lease and cleanup obligation. It cannot mark cancelled, release the
  FUR for another run… Later verified `reconcile-operation` may discharge those
  obligations." And: "No recovery action accepts elapsed age or an operator
  assertion as proof of death"; "neither an index entry nor its PID proves
  ownership, idleness, process identity or termination authority"; "When safe
  termination cannot be proved, fence the run and preserve recovery state."
- **Impact:** After an ordinary host restart or power loss, the provider
  process tree is gone but *no admissible evidence of that fact exists* in the
  specified evidence vocabulary: PIDs are explicitly non-probative, age is
  explicitly non-probative, and operator assertion is explicitly non-probative.
  `reconcile-operation` requires the adapter to "re-observe exact
  process/session identity, descendants and side effects" — impossible for a
  process that no longer exists and whose session handle is unresolvable. The
  run is therefore stuck at `failed` + fenced forever, and because the artifact
  lease is never released, **no subsequent review of that FUR can ever start**.
  This turns a routine reboot into an unrecoverable per-artifact dead end. The
  document anticipates external remediation in general terms ("Fail-closed can
  require external remediation") but specifies no remediation for this case, and
  gate 13 tests only that obligations are *retained*, never that they can be
  discharged.
- **Request:** Add a machine/boot-epoch observation to the admissible-evidence
  set: record the OS boot identifier (and broker instance epoch) with each
  launch journal entry, and specify that a *verified* boot-epoch change is
  positive evidence that the recorded process tree no longer exists — distinct
  from elapsed age and from operator assertion. Define the resulting
  disposition: fences discharged as `terminated-by-host-restart`, artifact lease
  releasable, verdict unchanged (`failed`), side-effect obligations for
  *filesystem* effects retained separately from *process* obligations. Add a
  gate-13 fixture that reboots (or simulates a boot-epoch change) and asserts
  the lease becomes releasable without altering the verdict.

### XPR-006 — The pre-reservation observation allowlist contradicts work the spec mandates before reservation

- **Severity:** medium
- **Category:** internal consistency / implementability
- **Section:** "Canonical Start Request" (~232–236); "Storage Layout" (~509–511, 519–525); "Review Series and Follow-Ups" (~719–723, 748–750, 761–767)
- **Evidence:** "Pre-reservation observations are **limited to** the installed,
  versioned capability matrix; configuration; local CLI presence/version checks;
  and adapter auth or permission checks documented as read-only and
  session-free." (emphasis added). Yet the spec also requires, before
  reservation: "Ignore rules and OS protections are installation prerequisites
  checked before reservation"; "Before allocating any new series, start and
  preview must perform this discovery regardless of the requested or resolved
  `lineage_mode`"; lineage default resolution requires knowing whether the FUR
  is Markdown ("defaulting to frontmatter for Markdown and sidecar otherwise;
  frontmatter on non-Markdown fails validation") and validating any existing
  frontmatter pointer ("A new review validates the pointer, previous terminal
  record, prior final digest, current digest, and intervening delta").
- **Impact:** At least four mandated pre-reservation observations are excluded
  by the closed list: FUR existence/type/byte reads, frontmatter-pointer
  parsing, series/record discovery under `docs/superpowers/peer-reviews/`, and
  ignore-rule/OS-protection checks. An implementer following the allowlist
  literally cannot implement `preview_review` as specified; an implementer
  following the other sections violates a rule stated as exhaustive. Because
  the allowlist is also the security boundary for "never start a broker, create
  a provider session, run conformance tests, install software or refresh
  credentials," leaving it inaccurate weakens the one place a reviewer would
  look to audit read-only-ness.
- **Request:** Extend the allowlist to enumerate the repository-local reads the
  design actually requires (FUR bytes and type, frontmatter pointer, series
  indexes and retained manifests under the canonical tree, ignore-rule and OS
  protection checks), each marked read-only and lock-free, while keeping the
  existing prohibitions intact. State explicitly that the derived
  `authority/series-index.json` cache is not consulted pre-reservation (already
  stated in Storage Layout — cross-reference it here).

### XPR-007 — The review folder is one shared read/write scope, so an author's unsealed submission bytes are reviewer-writable

- **Severity:** medium
- **Category:** security / integrity
- **Section:** "FUR and Worktree Boundary" (~543–556); "Agent-First MCP and CLI" (~1457–1466); "Worker Identity and Role Grants" (~379–385); "Storage Layout" (~498)
- **Evidence:** The scope table grants `review folder: author read/write/create;
  reviewer read/write/create`, and the prose is explicit: "The two-party
  reviewer may create or edit **any file inside the active review folder,
  including earlier in-progress collateral**, but cannot edit the FUR."
  Submissions are by reference into that same folder: `submit_review_turn`
  carries "response path/digest within the review folder," and "The runtime
  reads/seals response bytes itself."
- **Impact:** The reviewer holds write access to the path from which the
  author's response will be sealed, and vice versa. Sealing is digest-checked
  against the submitter's declared digest, so a naive overwrite yields a
  mismatch and fails closed — but the protection depends entirely on the
  submitter having computed the digest over its *own* bytes. An author that
  writes, then re-reads, then digests (an entirely ordinary agent pattern, and
  the only pattern available to an agent that cannot retain exact bytes) will
  seal reviewer-substituted content under its own role attribution. The design
  otherwise takes role separation seriously — "Two-party reviewers require
  enforced FUR denial," `per-role write_scope=enforced-provider-sandbox`,
  "Package-owned protocol authority therefore lives outside the collaborative
  folder" — so the unpartitioned submission staging area is an outlier, and it
  weakens exactly the cross-role attribution the XPR pattern exists to provide.
  Note this is *not* covered by the same-user-accountability disclaimer: that
  disclaimer concerns malicious same-user software, whereas this is a normal
  in-protocol write by an enforced-sandbox participant.
- **Request:** Partition the collaborative folder by role for submission
  staging — e.g. `collaboration/R/roles/{author,reviewer,supervisor}/` with
  write enforcement per role — require submitted response paths to lie within
  the submitting role's partition, and keep the shared area for genuinely
  shared collateral. State whether cross-role shared-area writes remain
  permitted and record the assurance claim. Extend gate 4 (currently
  "Two-party reviewer FUR writes, headless authority writes and path-alias
  escapes are denied") with a cross-role submission-partition write denial.

### XPR-008 — Finding ID allocation, namespace, and collision rules are undefined for participant-supplied stable IDs

- **Severity:** medium
- **Category:** correctness / completeness
- **Section:** "Findings and Debate" (~433–457); "Agent-First MCP and CLI" (~1459–1462); gate 2 (~1781)
- **Evidence:** "Every finding has a stable lifetime ID"; "Critique responses
  contain verdict, stable findings and resolutions"; "Each resolution names
  `finding_id`, state and rationale, plus `target_ids` for
  duplicate/superseded/split lineage"; "later independent stages create new
  IDs". Nothing states who allocates IDs, in what namespace, or what happens on
  collision.
- **Impact:** IDs are evidently participant-authored (this very response uses
  `XPR-001…`), and the ledger spans rounds and replacement stage-attempts with
  inherited open findings. Without an allocation rule, three concrete failures
  are reachable: (a) a replacement reviewer, which by design has no memory of
  the predecessor's numbering, reuses an ID that already exists in the inherited
  ledger, silently overwriting or resurrecting a previously resolved finding;
  (b) a reviewer emits a new finding with an ID matching a `fixed` historical
  finding, so the "explicit reviewer resolution" check passes vacuously and the
  new defect is recorded as already resolved; (c) `target_ids` in
  duplicate/superseded/split lineage cannot be validated as acyclic if
  identifiers are not guaranteed unique — the acyclicity requirement presumes an
  injective ID space that is never established.
- **Request:** Specify the finding-ID contract: namespace (per requested stage
  ledger), character/length constraints, uniqueness enforcement at submission
  (reusing an existing ID for a new finding must fail with a stable code and a
  correction, not merge), and whether the runtime or the participant allocates.
  State the replacement-reviewer rule explicitly: inherited IDs are read-only
  for resolution and new findings must use fresh IDs. Add a gate-2 fixture for
  a colliding ID from a replacement reviewer.

### XPR-009 — No verification gate covers the central topology invariants: worker session ≠ controller session, and roles must not share a session

- **Severity:** medium
- **Category:** verification
- **Section:** "Stage and Participant Resolution" (~263–266); "Non-Goals" (~82–84); "Required User Journeys" (~138–141); gate 9 (~1837–1843); "Required Verification Themes" (~1760–1767)
- **Evidence:** The normative invariants are stated once: "Two-party roles
  cannot share a session, and no worker session may equal the controller
  session. A mismatch fences the operation." Gate 9 tests grant separation ("A
  controller grant cannot submit a participant turn"), exact-session resume, and
  wrong-role/stale submissions — but never session *distinctness*. The
  verification-themes paragraph lists "participant/session identity" without
  naming distinctness, and gate 6's controller-wakeup test does not touch it.
- **Impact:** The invariant is the load-bearing enforcement behind the entire
  document — it is what makes "the controller never becomes an author, reviewer,
  or SAR worker" and the Non-Goal "Counting the controller as an author or
  reviewer merely because it supervises" true in the implementation rather than
  in prose. It is also the most plausible thing to get wrong in practice: SPR
  runs both roles in one provider family, and a controller running on the same
  provider as a worker (the explicitly anticipated case — "Even when the
  controller and a participant use the same model, they remain separate
  sessions") is exactly where an adapter could hand back a reused session. Grant
  separation does not detect it: a reused session with a correctly scoped
  participant grant passes every gate-9 assertion while conflating the two
  telemetry identities the design was normalized to separate. There is
  consequently no release gate for the design's headline decision.
- **Request:** Add explicit gate-9 fixtures: (a) an adapter that returns a
  session handle equal to the controller's must fence the operation before
  admitting participant work; (b) an SPR whose author and reviewer resolve to
  the same session handle must fence; (c) both cases must produce distinct
  stable fencing reason codes and must not produce participant grants. Name
  session distinctness in the verification-themes list.

### XPR-010 — The outcome of exhausting `max_revision_attempts_per_round` is unspecified

- **Severity:** medium
- **Category:** completeness / recovery
- **Section:** "Configuration" (~1067–1070, 1095–1096); "Round Contract and Caps" (~419–424); "Fallbacks" (~1126–1137); "Metrics and Comparative Evaluation" (~957–961)
- **Evidence:** Config defines `retries.max_revision_attempts_per_round: 3`
  and bounds it ("retry counts are in 1..10, including the initial attempt").
  "revision retries retain the originating round and use the sealed finite retry
  policy." The launch-side counterpart states its terminal outcome explicitly —
  "Each selection has at most `max_launch_attempts_per_candidate` reconciled
  launch attempts… **Exhaustion requires intervention**" — but no sentence
  states what happens when revision attempts are exhausted.
- **Impact:** Four distinct dispositions are consistent with the surrounding
  text and they are not equivalent: (a) `intervention-required` by analogy with
  launch exhaustion; (b) participant replacement via the fallback path, which
  would require "a fresh review of current FUR" and therefore consume a new
  round; (c) the round is consumed and the run advances without an author
  response, which the Round Contract's step sequence does not permit; (d) the
  stage fails. Each implies a different fencing state and a different treatment
  of partial author bytes ("Preserve partial author bytes as a recovery
  checkpoint, but do not treat them as a sealed revision" is written for
  fallback, not for retry exhaustion). Implementations will diverge, and the
  divergence is observable in run status and in accounting ownership of the
  exhausted attempts.
- **Request:** State the disposition for revision-retry exhaustion in "Round
  Contract and Caps" alongside the existing round-consumption rules: the
  terminal run state, whether the FUR lease and fences are retained, the
  disposition of partial author bytes (checkpoint ID and required
  `resolve-checkpoint`), and whether automatic participant replacement is
  permitted. Add a gate-2 or gate-13 fixture.

### XPR-011 — The participant-to-broker submission channel is unspecified, and the stated constraints exclude the obvious implementations

- **Severity:** medium
- **Category:** implementability / security
- **Section:** "Worker Identity and Role Grants" (~376–381); "Portable Project-Local Broker" (~1192–1214, 1216–1220); "Agent-First MCP and CLI" (~1449–1452, 1468–1472)
- **Evidence:** "Secrets remain in the host bridge or participant wrapper,
  outside model-visible JSON and **provider-readable files/environment**. A
  wrapper supplies role-bound submission tools and never hands its controller
  credential to a provider child." Also: "Do not expose credentials to
  participant prompts, collateral, URLs or logs"; "Authentication travels in the
  local transport binding, never model-visible JSON"; "Credentials travel only
  in the Authorization header." And: "Pure JavaScript IPC is not a filesystem
  sandbox."
- **Impact:** A headless provider process must reach its role-bound submission
  tool somehow, and every channel a provider CLI ordinarily offers is excluded
  or unaddressed by the above: environment variables and credential files are
  explicitly forbidden as provider-readable; prompt/collateral injection is
  forbidden; direct loopback calls with the broker credential are forbidden
  because the wrapper must not hand its credential to the child. The remaining
  viable design — the wrapper exposes an unauthenticated-to-the-child local
  tool surface (e.g. MCP over the child's stdio, or a per-child socket whose
  authorization is the wrapper's own broker binding) — is workable but is never
  named, and its authorization model (the child's *only* credential is the
  stdio/socket capability itself) has security properties the document never
  states. Since "Every headless wrapper uses the same transition contract under
  its role binding" is a conformance requirement and gate 9 asserts submission
  "through broker-owned role tools," an unspecified channel means adapters will
  each invent one, with divergent secret handling.
- **Request:** Name the permitted participant-to-wrapper channel(s)
  normatively (I recommend wrapper-hosted MCP over the child's stdio as the
  default, with a per-child loopback socket as the documented alternative),
  state that the channel capability *is* the participant's authorization and
  that the wrapper — not the child — holds the broker credential and attaches
  the role grant on the child's behalf, and state the required behaviour when
  the child attempts to contact the broker directly (reject, and record a
  diagnostic). Add this to gate 4 or gate 9.

### XPR-012 — `fallback_kinds` names two different shapes, and the error-pointer rule assumes one of them

- **Severity:** low
- **Category:** internal consistency / implementability
- **Section:** "Stage and Participant Resolution" (~256–259, 276–278, 285–292); "Configuration" (~1051–1053, 1079–1081)
- **Evidence:** In the request the field is a class **array**: "`fallback_kinds`
  is an explicit allowed class set"; "`fallback_kinds` must be nonempty, include
  the requested class, and contain only `sar` for SAR or only `spr`/`xpr` for a
  two-party stage." In config the same name is a class-keyed **map**:
  `"fallback_kinds": { "sar": ["sar"], "spr": ["spr"], "xpr": ["xpr"] }`, with
  "`fallback_kinds` is keyed by requested class, not by role."
- **Impact:** One identifier with two incompatible types in a design whose
  premise is closed, machine-generated schemas driving "CLI help, MCP tool
  schemas/descriptions, JSON Schemas, examples, error documentation, and golden
  tests." The error-location rule is written as if there were one shape — "Its
  JSON Pointer names the stages array index and `fallback_kinds` field, or the
  exact profile source field" — which for the map form is ambiguous about
  whether the pointer targets the map, the class key, or the offending element.
  Secondarily, for a SAR stage the request-level field is provably a no-op (the
  only legal value is `["sar"]`), which is worth saying outright rather than
  leaving callers to derive it from two separate constraints.
- **Request:** Either give the two forms distinct names (e.g. request
  `fallback_kinds` array vs config `fallback_kinds_by_class` map) or make both
  the map form. Specify the JSON Pointer precisely for each shape, including the
  class key and element index. State explicitly that SAR's only legal value is
  `["sar"]`.

### XPR-013 — Telemetry amendments are not discoverable from the trackable series index

- **Severity:** low
- **Category:** telemetry / completeness
- **Section:** "Storage Layout" (~504, 519–525); "Evidence" (~633–635); "Accounting Identity and Aggregation" (~941–955); "Review Series and Follow-Ups" (~800–804)
- **Evidence:** Amendments are published to a sibling tree,
  `…/S/amendments/R/A/`, "separate from sealed run." The index's binding
  contract enumerates run-level artifacts only: "Index receipts bind its entries
  to sealed run manifests"; each binding records "`lineage_mode`, `series_id`,
  the canonical repository-relative `artifact_path` and record path, plus the
  selected terminal run ID and manifest SHA-256." Portability is defined as "the
  FUR, series index and referenced evidence" travelling together.
- **Impact:** A consumer that reads the series index and the referenced run
  records — the specified portable set — has no record telling it that
  amendments exist for a run. It will compute a "current aggregate view" from
  superseded metrics while believing coverage is current, since the
  amendment-resolution requirement ("A current aggregate view resolves
  amendments once and exposes its revision/as-of time") gives it no discovery
  input. Detection depends on either scanning the sibling tree by convention or
  possessing a separately materialized chain view that pins "applied amendment
  IDs/digests"; neither is required to accompany the index. Worse, an export
  that omits `amendments/` still validates, because nothing references them.
- **Request:** Extend the `series-index/v1` binding to record, per run, the
  ordered applied amendment IDs and digests (or a single amendment-set digest
  plus count), and state that an index entry whose amendments are unresolvable
  in the checkout yields explicit incomplete coverage rather than a silently
  stale current view. Add a gate-12 fixture: transfer index + runs without
  `amendments/` and assert the view reports incomplete/unverifiable rather than
  superseded-as-current.

### XPR-014 — "Capable host" is undefined, making the single-wakeup guarantee untestable

- **Severity:** low
- **Category:** verification
- **Section:** "Out-of-Band Monitor and Usage" (~1347–1367); "Goals" (~77); gate 6 (~1822–1823)
- **Evidence:** "On capable hosts the controller model wakes only for
  intervention or terminal state"; "In a fault-free SAR, SPR, or XPR **on a
  capable host**, exactly one post-receipt model wakeup delivers terminal
  status"; "each call covers one wait interval, not the entire conversation";
  "Host progress rendering and wait-duration limits are validated separately
  from provider capabilities." Gate 6 asserts: "Fault-free SAR, SPR, and XPR
  wake the controller once for terminal status unless an actionable intervention
  or host-forced re-entry occurs."
- **Impact:** No criterion defines capability. Because every additional wakeup
  can be classified as a "host-forced re-entry," the gate as written is
  unfalsifiable: a host with a 60-second wait ceiling produces dozens of wakeups
  across a 12-round XPR and still passes. The design's stated goal ("Eliminate
  polling model turns while continuously informing the user") therefore has no
  enforceable acceptance criterion, and the "capable host" label cannot be
  awarded or withheld by any test.
- **Request:** Define the capability predicate explicitly — a progress surface
  that renders out of band, plus an adapter that reattaches outside inference,
  plus a minimum single-wait duration (state the number, e.g. ≥ the resolved
  `hard_timeout_ms`, so one wait can span a whole active operation). Require the
  receipt to record `host_wait_capability` and the observed wait ceiling, and
  restate gate 6 as: on a fixture host meeting the predicate, exactly one
  post-receipt wakeup; on a fixture host below it, the receipt discloses the
  expected re-entry count before launch.

### XPR-015 — `monitoring.on_missing_surface` is a single-valued key whose existence contradicts the surrounding authorization rule

- **Severity:** low
- **Category:** simplification / internal consistency
- **Section:** "Configuration" (~1062, 1098–1102)
- **Evidence:** The skeleton contains
  `"on_missing_surface": "require-unattended-authorization"`, and the prose
  states "`on_missing_surface` has the single v2 value shown," immediately
  followed by "**Config cannot authorize unattended operation on the user's
  behalf.**"
- **Impact:** The key is inert in v2 — it cannot be varied, so it encodes no
  policy — while its presence in a closed, exhaustively enumerated
  configuration ("This skeleton enumerates every v2 runtime configuration key
  specified here") advertises a future value space whose only plausible members
  are the config-granted unattended behaviours the next sentence forbids. Since
  unknown keys fail and all objects are closed, the key also becomes permanent
  surface area that migration must carry.
- **Request:** Either remove the key from v2 and rely on the prose rule, or
  keep it and state which future values are admissible and that none may
  authorize unattended operation — so the enumeration and the prohibition stop
  pointing in opposite directions.

## Findings Summary

| ID | Severity | Category | Area |
| --- | --- | --- | --- |
| XPR-001 | high | correctness / implementability | request canonicalization & idempotency |
| XPR-002 | high | correctness / completeness | unattended authorization vs request identity |
| XPR-003 | high | telemetry / completeness | controller telemetry capability & identity |
| XPR-004 | medium-high | internal consistency / telemetry | monitor fixture asserts zero; unsourced controller identity |
| XPR-005 | medium-high | recovery / completeness | no termination evidence after host restart; stranded lease |
| XPR-006 | medium | internal consistency | pre-reservation allowlist vs mandated checks |
| XPR-007 | medium | security / integrity | shared review-folder write scope for submissions |
| XPR-008 | medium | correctness / completeness | finding-ID allocation & collision |
| XPR-009 | medium | verification | no gate for session distinctness |
| XPR-010 | medium | completeness / recovery | revision-retry exhaustion undefined |
| XPR-011 | medium | implementability / security | participant submission channel unspecified |
| XPR-012 | low | internal consistency | `fallback_kinds` dual shape |
| XPR-013 | low | telemetry / completeness | amendments not discoverable from index |
| XPR-014 | low | verification | "capable host" undefined |
| XPR-015 | low | simplification | inert `on_missing_surface` key |

## Areas Reviewed and Found Sound

Recorded so the author can see what was examined and not merely what failed;
no action requested on these.

- **Controller/participant normalization.** The observability argument in
  "Summary" (an agent cannot be the sole authority for measuring its own
  complete resource use) is coherent and is carried through consistently in
  Review Model, Required User Journeys, Accounting Identity, and Resolved
  Decisions. The Non-Goals correctly forbid the attached-participant escape
  hatch.
- **Round/cap arithmetic.** "Each dispatched review attempt consumes one
  round," "A clean review at the cap may accept," "A final-round revision
  cannot claim acceptance without a subsequent clean review pass," and
  "Round numbers … increase across all its replacement stage-attempts" are
  mutually consistent, and the `APR_FINDINGS_UNRESOLVED` path correctly does
  not consume a second round.
- **Acceptance predicate.** The conjunction of clean verdict, digest equality
  against both snapshot and live bytes, no new open findings, explicit reviewer
  resolution of every ledger entry, acyclic duplicate/supersede targets, and
  persisted seals is tight; "Author dispositions alone never close findings" and
  "Deferral … is not a terminal resolution" close the two obvious loopholes.
- **Evidence and reconstruction.** Sealing before acknowledgement, byte-offset
  envelope framing instead of Markdown delimiters, metrics outside the
  participant content digest, `changes/C.patch` global ordering, the terminal
  byte anchor, and the immutable-amendment contract together give a defensible
  integrity story (subject to XPR-013).
- **Never-zero telemetry discipline.** The provenance vocabulary, the disjoint
  accounting partition rule, cumulative-vs-delta epochs, coverage-gated totals,
  and separate worker/controller subtotals are unusually rigorous (the defects
  raised are gaps in *who supplies* controller values, not in the rules).
- **Loopback transport hardening.** Port 0, literal `127.0.0.1` Host check,
  `Sec-Fetch-*`/Origin rejection, no upgrade, no CORS, Authorization-header-only
  credentials, authenticate-before-dispatch, and the 16 KiB/1 MiB/10 s/5 s
  bounds are a correct DNS-rebinding and local-attacker posture for the stated
  threat model, and the threat model itself is honestly scoped.
- **Lineage cross-mode rules.** The frontmatter↔sidecar interchangeability
  rules, mandatory discovery before series allocation, and
  `APR_LINEAGE_UNRESOLVED` over newest-timestamp selection are correct and well
  gated by gate 3.
- **Migration.** Pinned `runtime_binding`, refusal to map `max_turns` to
  `max_rounds`, `APR_CONFIG_MIGRATION_REQUIRED` for mixed layers, and the
  manual-XPR retirement gate are appropriately conservative.

## Telemetry

Reported per the brief: only values I can observe. Unavailable values are
`null` with a reason and the collection source that would supply them. No value
is reported as zero in place of unknown.

### Observed

| Measure | Value | Provenance | Source |
| --- | --- | --- | --- |
| Review round | 1 | reported | reviewer-brief.md + this response |
| Reviewer role | reviewer (XPR, non-author, non-controller) | reported | reviewer-brief.md |
| Requested reviewer identity | `claude` / `claude-opus-5` / high effort | reported (requested, **not** observed) | reviewer-brief.md |
| FUR bytes reviewed | complete file, 1931 lines, read in 3 contiguous ranges (1–1044, 1044–1543, 1544–1931) | reported | this session's file reads |
| Files read | 2 (`reviewer-brief.md`, `initial-fur.md`) | reported | this session's tool calls |
| Read/search tool calls | 6 (1 glob, 4 reads, 1 glob denied by sandbox restriction) | reported | this session's tool calls |
| Write tool calls | 1 (`rounds/01-reviewer-response.md`) | reported | this session's tool calls |
| Files modified | 1, this response only | reported | this session's tool calls |
| Web research performed | none | reported | this session's tool calls |
| Findings emitted | 15 (3 high, 1 medium-high, 7 medium, 4 low) | reported | this response |

### Unavailable

| Measure | Value | Reason | Collection source that would supply it |
| --- | --- | --- | --- |
| Observed reviewer session handle / fingerprint | null | not-exposed — the model has no read access to its own provider session handle; per the FUR's own rule, a self-asserted model name is not identity evidence | provider adapter exact-session observation surface (#88/#90), recorded by the broker at launch |
| Input tokens | null | not-exposed — per-turn usage is not surfaced to the model in-session | provider usage envelope captured by the broker/provider adapter outside the model turn |
| Output tokens | null | not-exposed — same as above | provider usage envelope via broker/provider adapter |
| Reasoning/thinking tokens | null | not-exposed — hidden reasoning counters are not visible to the model | provider usage envelope via broker/provider adapter |
| Cache-read / cache-creation tokens | null | not-exposed — same as above | provider usage envelope via broker/provider adapter |
| Marginal cost, currency, cost basis | null | not-exposed — no pricing or billing surface is reachable from this session; this is the exact failure mode the FUR's motivating local-SAR experiment describes | provider billing/usage envelope or host session-usage surface, collected at the controller/broker boundary |
| Wall-clock duration of this review | null | not-exposed — no clock or shell is available in this session (no execution tool; date known only to day granularity) | controller-observed start/end timestamps at the supervision boundary |
| API / queue duration | null | not-exposed — provider-reported durations are emitted outside the model turn | provider response metadata via provider adapter |
| Stop reason / terminal reason | null | not-observable-from-inside — determined after this turn completes | provider process exit record / session API, via participant wrapper |
| Baseline SHA-256 verification of `initial-fur.md` | null | not-observable — no hashing or shell tool is available under the current restricted tool set, so the declared baseline `78ee25ed…0235c` could be neither confirmed nor refuted | controller/broker artifact digest observation at snapshot capture |
| Prior SAR finding resolution status | null | not-observable — `../2026-09-27-107-145046-controller-worker-sar/manifest.json` is outside the working directory and the read was denied by the `--restricted` file-tool confinement | controller, by placing the prior manifest inside this review folder or relaxing the read boundary |
| Controller-side usage for this round | null | not-observable-by-reviewer — by design the reviewer is outside the controller's accounting scope | host adapter controller accounting ID (the gap raised as XPR-003) |

### Telemetry notes

- Every unavailable value above is `null` with a reason and a named collection
  source; none is reported as zero. In particular I have not asserted a zero
  wait-token, zero-cost, or zero-duration figure — the same discipline XPR-004
  asks the FUR's monitor example to adopt.
- My own position in this run is direct evidence for the FUR's central claim:
  as a headless participant I can observe my inputs and my outputs but none of
  my own cost, token, duration, or termination telemetry. The external
  observation boundary is necessary, not merely tidier. XPR-003 asks only that
  the *controller* side of that boundary be held to the same declaration and
  disclosure standard the FUR already imposes on the worker side.

## Next Action

Author response for round 1: address XPR-001 through XPR-015 with
per-finding dispositions (addressed / partially addressed / disputed with
rationale), revise the FUR accordingly, and return for round 2 review.
Disputes are legitimate and will be evaluated on rationale; XPR-005, XPR-009,
and XPR-014 in particular may be resolvable by adding verification and
evidence-vocabulary text rather than by changing the architecture.
