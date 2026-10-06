# Cost-Metrics SAR: Round 1 Author Response

All eight findings are addressed; none are disputed.

- CMSAR-001: Defined a participant-only submission digest, byte-framed exported
  envelope, separate sealed receipts and a distinct whole-file inventory digest.
- CMSAR-002: Added invocation/operation/observation identities, counter scopes
  and epochs, supersession and disjoint parent/child accounting partitions.
- CMSAR-003: Defined known subtotals, null incomplete totals, coverage and
  unattributed usage, overlapping categories and concurrent duration semantics.
- CMSAR-004: Separated native reported costs, actual charges, price equivalents,
  subscription utilization, currency conversion and pricing provenance.
- CMSAR-005: Added journal-linked collection, bounded grace, unavailable reasons,
  immutable late amendments and the distinction between absent telemetry and
  failure to persist required evidence.
- CMSAR-006: Bound critique retries to new rounds, revision retries to the same
  round and startup attempts to no round; reconnection is not redispatch.
- CMSAR-007: Defined allowlisted normalized counters, safe diagnostics,
  credential exclusions and finite restricted debug retention.
- CMSAR-008: Added shared versioned schemas, adapter validation, status/error
  completeness fields and concrete envelope/accounting/recovery/privacy gates.

The manifest and round patch header bind exact before/after FUR digests.

## Execution Metrics

Requested worker: gpt-6-astra / high. Actual model and effort are unobserved.
Provider invocation boundaries, tokens, reasoning/cache counters, API duration,
tool/web totals and cost are null/unavailable. This response shares the same
worker execution as the critique; it does not create an invented second billed
attempt. No independent supervisor measurement is claimed.
