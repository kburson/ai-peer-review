# SAR Round 01 Review

- Baseline: `fa7885559d99e9d2c486ec6b747719dd065d7596`
- Reviewed SHA-256: `018a9a475c81e97875804fe3ae35561d6e03975c09df301c1b94f8bd7faa7a76`
- Verdict: Changes required.
- Method: Sole SAR worker; repository inspection and internal consistency review.

## Findings

### SAR-001: Startup atomicity and request identity (high)

Canonical Start Request promises atomic launch and compares request bytes, but
MCP supplies objects and provider side effects cannot be rolled back. A crash
between two launches must not duplicate sessions. Evidence:
`src/broker/worker.mjs` fences launch-pending/outcome-unknown;
`src/authority/canonicalize.mjs` sorts keys. Require canonical semantic identity,
durable reservation, per-operation journals and ambiguous-outcome recovery.

### SAR-002: Fallback budget and author fencing (high)

Fallbacks creates new stages without defining cap inheritance, termination of
the previous author or partial edit disposition. Quota cycles can bypass caps
and race FUR writes. The broker worker already fences unresolved operations.
Require a finite cascade, shared requested-stage budget and reconciled checkpoint.

### SAR-003: Mutable collateral and reconstruction (high)

Evidence calls the bundle authoritative while permitting earlier responses to
be overwritten. Digests detect loss but cannot recover bytes; dirty/new initial
FUR bytes may not exist in Git. `src/protocol/service.mjs` and `store.mjs` use
exclusive snapshots. Require preserved sealed responses outside the writable
folder, reconstructible byte history, export validation and honest trust limits.

### SAR-004: Monitoring and token claims (high)

`src/mcp/server.mjs` only registers a blocking handoff tool. It does not prove
visible progress or indefinite waits in all hosts. Require host capability
negotiation, a visible fallback monitor, cursor reattachment and honest token
accounting for forced model retries. Quiet provider output is not proof of
death. SAR needs a combined worker line.

### SAR-005: Portable security and process containment (high)

`src/broker/platform.mjs` uses native private directories, locks and peer
identity. Loopback tokens alone do not sandbox file writes, establish private
Windows ACLs or terminate process trees. Specify credential protection,
browser-origin rejection, enforcement/containment capability gates and refusal
when guarantees cannot be met. Detection cannot silently replace prevention.

### SAR-006: Provider feasibility (high)

`src/provider/execution-contract.mjs` only accepts Claude reviewer execution;
`src/startup/selection.mjs` only selects a reviewer and SPR/XPR. A selector in
`src/providers/registry.mjs` does not prove headless author/SAR capabilities.
Separate desired support from tested support; validate exact model, effort,
role, permissions, launch and recovery. Clarify the binary-free package boundary
versus already-installed Node/provider runtimes.

### SAR-007: Frontmatter and evidence visibility (medium)

Mandatory frontmatter corrupts non-Markdown text and precedes the first
snapshot, losing original bytes. A reviewer with repository access can follow
the pointer to prior findings, contradicting strict independent-review claims.
Specify format-aware metadata, pre-metadata baseline, lineage conflicts, and
distinguish no supplied prior responses from enforced experimental blinding.

### SAR-008: Cap and intervention semantics (medium)

Cap exhaustion contradicts clean acceptance on the last allowed review.
intervene_review lacks action/authorization/cancellation semantics. Use explicit
states as in `src/protocol/reducer.mjs`, count review attempts, prefer clean
acceptance at the cap, and define revision-checked idempotent interventions.

### SAR-009: Request examples and migration (medium)

Only minimal attached SAR is illustrated; nested roles/sequences are undefined.
Config selectors differ from resolved provider identity. Removing native code
may strand active older reviews. Supply nested JSON examples, identity terms,
and drain/export rules without claiming current adapter support.

### SAR-010: Backlog authority and testability (medium)

The backlog table is a dated observation, not current workflow authority.
Rewriting #107 before planning conflicts with the user's clarification that
the plan should precede the rewrite. Qualify ownership and add observable
acceptance scenarios beyond the existing topic list. No issue edits are needed.
