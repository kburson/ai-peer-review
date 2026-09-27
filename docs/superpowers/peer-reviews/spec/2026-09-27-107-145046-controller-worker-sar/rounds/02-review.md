# SAR Round 2 Review

Verdict: changes-required.

Reviewed bytes: exact rounds/01-after.md snapshot, with digest in rounds/01.json.
Read the entire revised specification again, including its request, identity,
round, permissions, evidence, lineage, telemetry, recovery and release contracts.
Relevant broker/provider context from round 1 remains available and unchanged.

## Prior Findings

- CWSAR-001: fixed. Controller receipts have a distinct accounting identity and
  complete run totals require both controller and worker coverage.
- CWSAR-002: fixed in intent, with the concrete serialization defect below.
  Predecessor inputs, amendment revisions, once-only accounting and role history
  are explicit. The new finding refines digest framing without reopening the
  requirement for pinned chain accounting.
- CWSAR-003: fixed. Help and release verification now agree on three journeys.

## CWSAR-004: Avoid Self-Referential Aggregate Digests

Severity: medium (P2). Introduced by the round 1 revision for CWSAR-002.

Evidence: metrics.json must contain the review-chain view, while the revised
paragraph requires each input's metrics and manifest digests. If the tip is the
current run, that would put metrics.json's own digest inside its bytes and may
also create a metrics-to-manifest-to-metrics cycle. Such a seal cannot be built
using an ordinary content hash.

Requested change: embedded views reference local observations/receipts by ID;
only already sealed predecessor inputs are digest-pinned. The enclosing
manifest binds the current metrics file. A separately materialized later view
can digest-pin every sealed run, including the terminal tip. Apply the same
rule to an amendment's locally contained observations and add a release fixture.

## Telemetry Availability

Exact observed model/effort and provider duration, tokens, cache, reasoning and
cost remain null with reason `not-exposed-to-worker`. Requested identity remains
gpt-6-astra/high; broad GPT-6 identity comes only from instruction context.
Round wall timing and source are recorded in metrics.json. Process termination
cannot yet be observed by this worker.
