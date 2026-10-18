---
record_kind: manual-same-agent-sar-review
round: 2
reviewer_commit: 9130dc6fa73f80b89ddc67c4f29f055f52d08600
input_revision: issue-222-plan-r3
input_sha256: 1e52ff2b91d075c1a32b99766841997815c8537173ead74e31a73d103aa35fae
requested_model: gpt-6-astra
requested_effort: high
---

# Round 2 plan review

Decision: changes required. Re-read the revised task contracts, dependency graph and all specification acceptance criteria against current source. The seven first-round corrections are present, but three remaining coverage and ownership details need a final plan revision. This is the same reviewing/authoring agent, not independent peer review.

## Findings

### R2-F1 — Medium: generated-document format inventory is not explicit

Specification §4.1 requires every newly emitted durable review document to name a documented schema/format. Task 01A inventories source consumers but does not explicitly inventory emitted document families, writer paths, format identifiers and corresponding readers. Task 15A creates versioned prompt paths, which do not by themselves put a format identifier inside generated startup/invitation documents. Add these inventory columns and explicit protected format identifiers for the newly generated prompt documents. Context/divergence records must identify their enclosing manifest-v2 record semantics or their own adopted format, not rely on filenames. Historical formats remain unchanged.

### R2-F2 — Medium: public API adapter ownership is underspecified

The inspected `src/public-api.mjs` exports concrete functions; the schema registry is a contract catalogue, not an executing dispatcher. The new 19A/19D adapters must explicitly export and invoke the named journal operations, and 19B must wire both the `src/cli/run.mjs` authority wrapper and MCP handler to those adapters. Several output descriptions still call reconstruction entirely read-only despite the explicit separate output destination. State the bounded destination write consistently, keep public operation authentication in the owning operation adapter, and test real dispatch rather than mere registry presence. New file paths and public schema fields should be fixed before implementation.

### R2-F3 — Medium: remaining shared state and delivery accounting need an explicit final check

Task 19C promises the final shared package inventory but each earlier closure-changing source delivery may require coherent generated installed inventory under the existing integrity checks. A blanket prohibition on earlier inventory maintenance would make otherwise reviewed leaves unusable. Distinguish per-delivery generated inventory refresh (single assigned integration writer, serialized and included in each leaf's delivery allocation) from 19C's final package-surface reconciliation. If refreshing/required exact-head lanes do not fit that leaf's complete forecast, stop for a separately bounded delivery plan before registration; never defer necessary integrity to 19C. In addition, include the present manual SAR time in retained cumulative accounting rather than leaving only older review windows named.

## Rechecked first-round results

- All 50 task IDs are unique, component estimates sum to their stated totals, the graph is acyclic and the producer/serialization edges are explicit. The graph remains provisional scheduling data, not native issue ownership.
- The round-1 patch was actually applied forward and backward with exact bytes. The temporary Git-discovery failure is recorded and corrected, with no permanent per-revision snapshot requirement.
- Finite host scopes and old seals remain conservative. Owner-v2 helpers and the real writer/readers are now included before atomic activation.
- Candidate/final SHA timing, global Windows precedence, preserved Unknown accounting, downstream ownership/verification and owner approval gates remain explicit.

The resulting plan still requires independent native whole-task forecast inspection before execution; same-agent SAR cannot supply that independence. No production tests are justified for this prose-only revision.
