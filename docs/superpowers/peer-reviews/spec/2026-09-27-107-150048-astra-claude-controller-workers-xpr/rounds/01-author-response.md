# XPR Round 1 - Author Response

- **Review:** `2026-09-27-107-150048-astra-claude-controller-workers-xpr`
- **Round:** 1
- **Phase:** revision
- **Issue:** #107
- **Role:** replacement headless author, non-controller
- **FUR:** `docs/superpowers/specs/2026-09-27-107-agent-first-review-runtime-design.md`
- **Verified input SHA-256:** `78ee25ed7133e0d50214510f7d928539267a16e983b52b34c6ddb65fbf70235c`
- **Reviewer-response SHA-256:** `85007f1c4cabb64504ac0aab29cac099db002409178d00eac8b2a94c9016f0bc`
- **Delivery:** author response and proposed patch only; no files or Git/task state changed
- **Revised digest:** pending controller application and supervisor observation

## Disposition Summary

All fifteen findings are addressed by the accompanying proposed patch.
"Addressed" describes the proposed specification changes, not a claim that
the patch has already been applied or that the reviewer has resolved a finding.

The normalized architecture remains unchanged: the originating session is a
non-participant controller; SAR has one headless worker; SPR/XPR have distinct
headless author and reviewer workers. Existing acceptance, round-budget,
fallback-class, evidence, migration and dependency-ownership decisions remain.

## Findings

### XPR-001

- **Disposition:** addressed.
- **Rationale:** The original prose did not fully specify canonical bytes.
  Equivalent parsed numbers would already normalize in many JavaScript
  implementations, but relying on an implicit serializer is insufficient.
  The non-BMP-key case belongs in serializer tests because the closed request
  schema does not admit arbitrary field names.
- **Change:** Define an exact v1 encoder: schema-valid positive safe integers
  use ordinary decimal digits; strings use specified escaping and UTF-8;
  keys sort lexicographically by unsigned UTF-16 code units; arrays preserve
  order; lone surrogates fail. Extend gate 1 with numeric, escaped-string,
  serializer-ordering and closed-schema fixtures.

### XPR-002

- **Disposition:** addressed.
- **Rationale:** A missing monitor must be detected before reservation.
  `unattended` must remain identity-bearing authorization. A rejected request
  has no reservation, so a changed retry under its ID need not inherently
  conflict; nevertheless, requiring a new ID for changed intent gives clients
  one unambiguous rule and handles uncertain delivery safely.
- **Change:** Add the preflight condition and
  `APR_MONITOR_SURFACE_REQUIRED`, with no run or lease mutation. Define an
  authorization-gated correction using a fresh request ID and
  `unattended=true`, prohibit automatic consent, distinguish post-reservation
  surface loss, and test rejection, authorized retry and exact replay.

### XPR-003

- **Disposition:** addressed.
- **Rationale:** Controller accounting needs declared capabilities and
  evidence assurance independently of worker accounting. CLI transport cannot
  infer the invoking model's usage. Missing telemetry must remain admissible
  without weakening the separate session-distinctness requirement.
- **Change:** Require controller telemetry capability, mapping version,
  per-measure availability, evidence source/version and assurance in preview
  and receipt. Define CLI-only usage as null/unavailable with reason
  `not-exposed` and source `host-transport`; complete workers cannot make the
  combined total complete. Add CLI and controller-assurance fixtures.

### XPR-004

- **Disposition:** addressed.
- **Rationale:** The monitor's unsupported zero and controller model label
  conflict with the measurement discipline. One trailing provenance label
  also obscures the source of each subtotal.
- **Change:** Remove the controller model/effort display and literal zero.
  Specify fixture inputs with unavailable controller usage and wait tokens,
  separate reported worker subtotals, incomplete coverage and source
  references. Require the registry fixture to generate the illustrated
  rendering and validate it in gates 6 and 10. No executed fixture validation
  is claimed in this author response.

### XPR-005

- **Disposition:** addressed with a bounded recovery rule.
- **Rationale:** Verified reboot evidence can prove the death of processes
  confined to that execution host. It cannot prove termination of remote jobs,
  reconcile filesystem effects, or make a broker restart equivalent to a host
  restart. Immediate unconditional lease release would weaken fail-closed
  recovery.
- **Change:** Record execution-host, boot-epoch, broker-instance and
  containment evidence before launch. Admit a verified boot change as
  `terminated-by-host-restart` for the covered local process obligations.
  Preserve remote/unknown writer and filesystem obligations. Release the
  artifact lease only after writer quiescence and required checkpoint
  reconciliation; retain a failed verdict. Add positive and negative gate-13
  fixtures and require installed OS-specific evidence conformance.

### XPR-006

- **Disposition:** addressed.
- **Rationale:** The closed preflight allowlist omitted reads required by
  lineage, installation-protection and monitor checks elsewhere in the design.
- **Change:** Enumerate read-only, lock-free artifact, frontmatter, portable
  evidence, lineage, protection, durable request/ownership, host-capability
  and adapter checks. Exclude the derived authority series cache and preserve
  the prohibitions on broker/session startup, conformance execution,
  installation, credential refresh and writes. Require locked revalidation
  for reservation and extend gate 14.

### XPR-007

- **Disposition:** addressed.
- **Rationale:** Digest checks cannot establish role attribution when another
  participant may replace the submitter's staging bytes before hashing.
  Shared collateral can remain writable without making submission staging
  shared.
- **Change:** Partition collaboration into role-owned submission directories
  and a shared collateral directory. Enforce cross-role write denial and
  require response submissions from the bound role's directory. Shared
  collateral remains writable by both participants but cannot be submitted
  as attributed response content. Carry this rule through storage, permissions,
  submission validation, assurance, current-state assessment and gate 4.

### XPR-008

- **Disposition:** addressed.
- **Rationale:** Stable IDs require explicit allocation, namespace and
  collision semantics, especially across replacement reviewers.
- **Change:** Define participant-allocated IDs unique within the requested
  stage ledger, their character/length constraints and fully qualified
  identity. Return `APR_FINDING_ID_CONFLICT` atomically for new-finding
  collisions, without consuming another round or grant. Supply reserved IDs
  to replacement reviewers; inherited identities may only be referenced for
  permitted resolutions. Validate lineage targets and add collision fixtures.

### XPR-009

- **Disposition:** addressed.
- **Rationale:** Grant separation does not prove session separation.
  Controller usage availability also cannot serve as a proxy for controller
  session identity.
- **Change:** Require distinctness evidence before issuing participant grants,
  using verified session comparison or a conformance-tested fresh-session
  creation guarantee where controller identity is unavailable. Add distinct
  fencing codes for controller/worker collision, worker/worker collision and
  unproved distinctness. Extend gate 9 with same-session, same-model and
  CLI-with-unavailable-telemetry cases.

### XPR-010

- **Disposition:** addressed.
- **Rationale:** Exhausted revision attempts need a deterministic disposition
  that cannot silently advance the round, discard partial edits or reset the
  retry counter.
- **Change:** Specify `intervention-required` with
  `APR_REVISION_ATTEMPTS_EXHAUSTED`, retained lease/fences, attempt receipts
  and a checkpoint requiring `resolve-checkpoint` when partial bytes or
  pending effects exist. Exhaustion itself cannot trigger replacement or
  authorize another same-round attempt. Preserve separately justified sealed
  quota/capacity fallback after reconciliation, and require a fresh critique
  under the existing round budget. Add gate-2 fixtures.

### XPR-011

- **Disposition:** addressed.
- **Rationale:** The participant needs a concrete role-bound tool channel
  without access to broker credentials. A discoverable unauthenticated
  loopback port alone would not establish per-child authority.
- **Change:** Specify a wrapper-hosted MCP stdio tool connection over private
  inherited pipes, separate from provider output. The pipe capability binds
  the child to its wrapper; the wrapper supplies the broker credential and
  sealed role grant. Reject and diagnose direct unauthenticated broker access.
  Keep alternative socket channels outside v1 pending an explicit isolated
  capability contract, and extend gate 9.

### XPR-012

- **Disposition:** addressed.
- **Rationale:** Distinct names make the request array and profile map easier
  to validate and document without changing fallback policy.
- **Change:** Keep request `fallback_kinds`; rename the profile map to
  `fallback_kinds_by_class`. Specify JSON Pointers for collection-level and
  indexed-element failures, including escaped profile names and source
  identity. State that SAR's only legal array is `["sar"]`; add gate-15
  fixtures.

### XPR-013

- **Disposition:** addressed.
- **Rationale:** A current aggregate needs an explicit portable amendment
  inventory. Immutable run manifests cannot be retroactively edited to
  provide it.
- **Change:** Add ordered amendment IDs, relative manifest paths and digests
  to each run entry in the derivative series index. Publish amendments before
  atomically publishing their index references, with replay-safe recovery.
  Pin index revision/as-of time in current views. Missing or corrupt
  amendments make current telemetry coverage incomplete/unverifiable while
  preserving the original verdict. Add transfer and publication-crash tests.

### XPR-014

- **Disposition:** addressed with a qualified prediction contract.
- **Rationale:** A wait lasting one `hard_timeout_ms` cannot guarantee one
  wakeup across a multi-operation sequence. Conversely, short waits can meet
  the guarantee when the adapter renews them entirely outside inference.
  An exact future re-entry count is unknowable without a known run duration.
- **Change:** Define `host_wait_capability` from out-of-band rendering,
  durable cursor handling and renewal/reconnection across the entire run
  without inference. Record observed ceilings and evidence. Require exactly
  one terminal wakeup on a conforming fault-free fixture, without excusing
  periodic re-entry. For constrained hosts disclose re-entry cadence and a
  duration-dependent count, leaving unknown counts null. Test a deterministic
  60-second-ceiling, 150-second fixture with two re-entries.

### XPR-015

- **Disposition:** addressed.
- **Rationale:** The single-valued configuration key encodes no configurable
  policy and unnecessarily enlarges the closed v2 surface.
- **Change:** Remove `monitoring.on_missing_surface` from the skeleton and
  prose. Retain explicit request-level unattended authorization, default false,
  and the prohibition on configuration granting that authority. Require the
  removed key to fail closed-schema validation.

## Remaining Debate and Verification

No finding is intentionally left without a specification change.

The proposed remedies preserve three qualifications for the next reviewer:
boot changes prove only the covered host-local process obligations; private
stdio is the v1 participant channel rather than an unauthenticated socket;
and an unknown-duration run cannot carry a fabricated exact re-entry count.

The patch has not been applied. No implementation tests, schema validation or
post-draft review were performed. The controller must apply the patch, observe
the revised digest and return the result for the independent reviewer pass.
Author dispositions do not resolve the reviewer ledger.
