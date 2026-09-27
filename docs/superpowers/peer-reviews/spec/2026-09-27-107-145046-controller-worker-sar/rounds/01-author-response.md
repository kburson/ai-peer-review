# SAR Round 1 Author Response

The sole SAR worker revised the specification after recording round 1 findings.
The exact before/after bytes and generated patch are bound in rounds/01.json.

## Dispositions

- CWSAR-001: addressed. Added a separate controller accounting identity and
  trusted host observation receipts outside the worker roster. Defined run
  attribution, exclusion of unrelated chat work, ambiguous-scope handling,
  separate worker/controller subtotals, and complete combined-total coverage.
  Final reporting usage follows the existing immutable amendment path.
- CWSAR-002: addressed. Defined pinned chain inputs and as-of revisions,
  predecessor validation, once-only use of each run's own accounting partition,
  missing legacy telemetry coverage, and ordered role bindings for SAR-to-author
  continuity. Extended release gates 10 and 12 with concrete accounting fixtures.
- CWSAR-003: addressed. Updated the help contract to three normalized journeys.

No findings were rejected or deferred. These changes preserve the normalized
topology, caps, fallback cascades, reviewer research permissions, evidence layout,
and the distinction between review correctness and telemetry completeness.

The document status remains pending follow-up review and plan reconciliation;
this manual SAR does not confer package-protocol acceptance or XPR acceptance.

## Telemetry Availability

Requested model/effort: gpt-6-astra/high. Exact observed variant and effort are
null because runtime identity is not exposed. Token, reasoning, cache,
provider/API duration and cost measurements are null with machine-readable
reasons and source in metrics.json. Round wall duration includes critique,
revision, evidence capture and tool waits; it is not provider API time. The
worker cannot observe its own eventual process termination before returning.
