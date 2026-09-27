# SAR Round 1 Review

Verdict: changes-required.

Reviewed SHA-256: c262105281e099709d77a9595a4ba180b38eb391e6deac56e84013064f0edbed.

This is a manually orchestrated self-review by one worker. It is not an
independent peer review or package-protocol acceptance. The controller is
outside the participant roster. All 1,884 lines of the current specification
were read, along with the existing broker worker, provider identity paths,
package metadata, and the previous cost-metrics review manifest. Prior review
evidence was visible, so this is not a blinded pass.

## CWSAR-001: Persist Controller Accounting Without Making It a Participant

Severity: medium (P2).

Evidence: Accounting Identity and Aggregation makes agent aggregates depend on
participant IDs, while Out-of-Band Monitor and Usage requires controller tokens
to be shown separately. There is no explicit durable accounting identity for
the non-participant controller or definition of whether a complete run total
includes that overhead. A worker-only total could consequently be reported as
the complete review cost despite unknown controller consumption.

Requested change: define controller observation receipts outside the participant
roster, run attribution with unavailable reasons where attribution is impossible,
separate worker and controller subtotals, and a combined total that is complete
only when both are complete. Keep final-summary usage eligible for a late
amendment because it can arrive after the review bundle is sealed.

## CWSAR-002: Pin Review-Chain Accounting Inputs

Severity: medium (P2).

Evidence: the new paragraph requiring review-chain aggregates says only that
they link terminal follow-up runs. The amendment contract permits newer
accounting views without rewriting prior manifests. Without an explicit input
set and amendment revision, a stored chain total can silently change meaning or
include an ancestor twice when follow-up runs already carry chain totals.

Requested change: identify ordered predecessor runs and their manifest/metrics
digests, pin amendment inputs and as-of revision, aggregate per-run accounting
partitions exactly once, and record missing legacy telemetry as incomplete.
Reuse the existing amendment and coverage contracts rather than inventing a
second accounting system. Include role history for an agent reused from SAR to
author so participant rollups do not erase that transition.

## CWSAR-003: Remove the Retired Six-Journey Help Contract

Severity: low (P3).

Evidence: Errors and Self-Discovery still requires help to cover "all six user
journeys", but Required User Journeys and release gate 8 now require three
normalized journeys. This directs generated-help tests toward a retired shape.

Requested change: make the help contract refer to all three normalized journeys.

## Telemetry Availability

Requested worker: Codex, gpt-6-astra, high effort (controller request).
The instruction context identifies GPT-6, but does not independently expose the
exact model variant or runtime effort. Exact observed model and effort are null.
Provider/API duration, input/output tokens, reasoning tokens, cache tokens and
cost are null with reason `not-exposed-to-worker`; no provider receipt is
available through this worker-facing interface. Tool-clock wall observations
and their scope are recorded in metrics.json. Final process termination is
observable only by the external controller after this worker returns.
