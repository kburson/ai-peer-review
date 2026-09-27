# Cost-Metrics SAR: Round 1

Verdict: changes-required.

Reviewed SHA-256: `91249388adc0ac4cb8a253b764f06fd80c145e8437dbc626fce24af94412e63a`.

This is a user-directed single-worker SAR, not package-protocol acceptance or
an independent peer review. Requested worker: gpt-6-astra, high. Exact observed
model, effort and provider usage are unavailable to this worker.

## Findings

### CMSAR-001: Define response and metrics sealing boundaries (high)

Evidence and submit_review_turn require exact submitted response bytes, while
the new evidence requirement puts a supervisor section in that same file. It
does not define which file the submission digest describes or how later metrics
can arrive without changing the sealed response. Define a canonical payload,
byte-exact framing, separate receipt authority and whole-export digest.

### CMSAR-002: Define a disjoint accounting ledger (high)

Attempt granularity alone does not disambiguate provider invocations, internal
calls, auxiliary models and session-wide cumulative counters. Subtracting a
counter across sessions or summing parent and child reports can misstate cost.
Require stable accounting identities, scope/reset semantics, idempotent
observations and explicit inclusion relationships.

### CMSAR-003: Partial totals and overlapping categories are unspecified (high)

Unknown fields are null, but known plus unknown has no defined total semantics.
Reasoning can already be in output and cache categories can overlap input.
Define coverage, non-additive fields, inconsistency handling and wall duration
versus accumulated service duration.

### CMSAR-004: Cost basis is insufficiently separated (high)

The field named marginal cost can hold provider-reported list-price equivalents
under a subscription. A provider's cost label alone does not establish actual
incremental charges. Separate reported, estimated price-equivalent, billed and
subscription-utilization measures, with currency and pricing evidence.

### CMSAR-005: Late usage and crash reconciliation lack a contract (high)

Telemetry may arrive after response sealing or cancellation. Immutable terminal
runs conflict with silently updating manifest totals; waiting forever for usage
conflicts with finalization. Specify launch-linked receipts, bounded collection,
unavailable reasons and linked immutable telemetry amendments.

### CMSAR-006: Review retries conflict with round accounting (medium)

Every dispatched critique consumes a round, but the metrics section aggregates
all attempts needed for a reviewer turn into a round. Distinguish launch retries,
critique redispatches and revision retries, including fallback and SAR's shared
session, so retries cannot evade the cap or be counted twice.

### CMSAR-007: Normalized telemetry needs a privacy boundary (medium)

Excluding raw logs does not prevent tool URLs, query strings, provider errors or
session IDs leaking through normalized diagnostics and metric receipts. Define
an allowlist, bounded sanitized errors and local correlation identifiers;
record redaction without retaining secret values or reversible encodings.

### CMSAR-008: Telemetry schemas and fault tests are underspecified (medium)

The registry defines API and participant response schemas but no normative
receipt/aggregate contract. Require versioned metric, attempt, amendment and
envelope schemas, validate adapter data before authority writes, and test the
accounting and recovery cases above.

## Execution Metrics

Exact inference boundaries, tokens (including reasoning/cache), provider/API
duration, tool/web counts and cost: null, provenance unavailable. The host does
not expose them to this worker. Recorded ledger times describe evidence writes,
not inference time. No independent supervisor measurement is claimed.
