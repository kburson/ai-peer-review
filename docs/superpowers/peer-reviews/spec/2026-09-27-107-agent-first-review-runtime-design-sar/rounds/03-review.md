# SAR Round 03 Review

- Reviewed SHA-256: `b7cef1580597ffcdb5fc1c1e1fc3182fbc0ed6e63711d0637b119376ec5830e7`
- Verdict: Changes required.
- Prior findings SAR-001 through SAR-014: corrections verified against this
  version. Two remaining API consistency findings follow.

## Findings

### SAR-015: Attached participants have no defined turn-submission surface (high)

The API lists start, wait, status and controller interventions, but nothing for
the local SAR worker or attached author to seal findings/revisions. The round
contract requires those transitions and cannot be implemented by status/wait.
`src/mcp/server.mjs` currently exposes only handoff waiting, while
`src/protocol/service.mjs` provides distinct protocol sealing operations.
Define an authenticated, phase-scoped submission operation shared by inline,
managed and CLI paths, with exact digest and revision checks. Controller-only
authority must not authorize participant verdicts.

### SAR-016: Error example violates the newly specified response envelope (medium)

Agent-First MCP and CLI requires schema, mutation_occurred, retry_safe and
next_action on every response, but Errors and Self-Discovery nests mutation and
retry fields only inside error and omits the envelope schema and next action.
An agent following the example would not meet the contract. Align the example
and ensure every registry example is schema-validated. Also make the general
reviewer-denial wording explicitly two-party so it does not contradict SAR's
declared combined scope.
