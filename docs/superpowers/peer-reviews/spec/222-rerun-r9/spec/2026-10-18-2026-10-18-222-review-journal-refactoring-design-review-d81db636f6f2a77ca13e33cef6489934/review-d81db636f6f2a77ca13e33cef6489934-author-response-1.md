<!-- ai-peer-review-template version="1" digest="sha256:f81da1894a46ceb20866070833b4e99ef536ef633542b418783d29e6a981dbd8" -->

<!-- protected-frontmatter -->

---
schema: "ai-peer-review.response/v1"
review_id: "review-d81db636f6f2a77ca13e33cef6489934"
role: "author"
turn: 1
commit_mode: "no-commit"
authority_assurance: "unavailable"
artifact_path: "docs/superpowers/specs/2026-10-18-222-review-journal-refactoring-design.md"
artifact_commit: "d213adfdc9e1b3f8f35c1dd018ba017bf969503e"
artifact_blob: "83f702202f3c269647812690a9e95791a5e24837"
artifact_digest: "sha256:51647cfa5aca488971682b37df073c5d5ecfbb25e5c608fe7253df7ec0b1e259"
agent:
  host: "codex"
  provider: "openai"
  model_id: "gpt-6-astra"
  model_display: "gpt-6-astra"
  session_fingerprint: "sha256:25d20e0e1f971863fb5c1464b5de6c7af7aa3b3fc25ba427e1f1796b26f9de9f"
  identity_source: "runtime"
started_at: "2026-10-18T14:41:16.348Z"
submitted_at: "2026-10-18T14:48:41.183Z"
finding_ids: []
answered_finding_ids: ["R1-F001","R1-F002","R1-F003","R1-F004","R1-F005","R1-F006","R1-F007"]
acknowledged_supplement_ids: []
---

> **LOCAL JOURNAL MODE** — authority assurance: `unavailable`

## Summary

Revised the specification from issue-222-r9 to issue-222-r10 in response to the complete renewed XPR. This is a documentation revision only. No product code, schemas, native protocol records or protected response fields were edited. All new requirements remain prospective versioned implementation work subject to owner adoption and fresh planning.

Revision basis: the actual current worktree HEAD at writing was `d213adfdc9e1b3f8f35c1dd018ba017bf969503e`, now recorded in the FUR frontmatter. This author's model declaration uses the installed adapter's supported `CODEX_MODEL_ID=gpt-6-astra` environment input; it is not independent model-execution attestation. The native session is the inherited distinct author session, not a copied reviewer or parent handle.

Exact revision association for external archival:

- Predecessor: issue-222-r9, SHA-256 `51647cfa5aca488971682b37df073c5d5ecfbb25e5c608fe7253df7ec0b1e259`, sealed native `artifacts/start.md` in this review workspace.
- Result: issue-222-r10, SHA-256 `f2edf6b05a941ae6287d32be7a5e822439fccfc7d8ceb83476d1f3f89c84fc44`, exact current FUR bytes at author submission. Native submission will seal the result in `artifacts/turn-1.md`.
- The external parent publisher may generate the uniquely named forward r9-to-r10 diff from those exact snapshots, verify reverse recovery and publish the completed cycle. This participant has not generated an archival patch, committed a cycle, or claimed implementation of §4.4. No new field has been inserted into response-v1.

## Finding dispositions

### R1-F001 — Addressed

§4.4 now defines retained states as review submissions, cycle results and explicit between-review FUR publications, not every editor save or unrelated repository commit. It requires an explicit origin or predecessor review/publication link with retained manifest path/digest and revision identity/digest; linked records are immutable so later manifest updates cannot invalidate the link. Differing intake bytes require a boundary diff and are labelled external/unreviewed until actually accepted. The new workflow preserves each intermediate FUR state it explicitly commits, while uncommitted drafts may be collapsed into the next boundary. This preserves the owner's per-committed-revision requirement without inventing historical intermediate drafts.

Legacy predecessors use a manifest identifier plus exact digest without editing historical bytes. Reconstruction begins with the actual retained chain head, including an unreviewed head, and reports recorded acceptances separately. Historical missing bytes remain gaps, not fictitious full-chain compliance. AC 14 covers the new cases.

### R1-F002 — Addressed

AIPR is explicitly the diff producer within declared review-documentation paths. Exact sealed predecessor/result bytes and their recorded digests are its inputs, never HEAD/index/later worktree substitution. Boundary inputs supplied by the external publisher must also be verified and sealed. Coordination inputs remain available until verified diff/records are durable and publication settled, without becoming a permanent snapshot-archive requirement. The manifest records patch format/version, direction, path and digest. AC 13 verifies ownership and byte-source behavior.

### R1-F003 — Addressed, with a source-reference correction

§4.4 explicitly defines a revision cycle as the reviewer response on N plus the submitting participant's response introducing N+1 (or unchanged N), and a final acceptance cycle as the reviewer acceptance plus an unchanged-FUR closing acknowledgment. A missing response remains incomplete rather than fabricated.

The selected publication model is **deferred publication with one dedicated external commit per completed cycle**, in chain order. It is not batching. If the working FUR advances, the external publisher obtains the exact earlier result from sealed bytes or verified reconstruction and verifies staged/result digest agreement. A recorded participant decision, completed collateral and published cycle are separate facts. New-format lifecycle contracts must explicitly permit external HEAD changes while preserving stale-submission checks; neither legacy commit mode is silently converted.

The cited run-core.mjs:2838–2871 block is specifically phase advance, not ordinary author submission. Ordinary legacy normal-mode author submission at roughly 3842–3914 assembles reviewer response, revised artifact and author response and calls `effectCommitExactPaths`. This strengthens the need for an explicit role/mode boundary but does not support the broad claim that the author must precommit before every ordinary handoff. The spec therefore preserves old normal-mode Git-bound behavior under compatible legacy maintenance and states that it cannot be treated as the new no-Git participant boundary. Existing no-commit records also keep their sealed contract. These are future versioned changes, not actions being performed in this review.

### R1-F004 — Addressed

§4.2 now distinguishes supported unchanged participant response-v1 from new mandatory response-v2 provenance. §4.3 assigns protected metadata capture to AIPR at submission, from the reviewer-bound checkout, with reviewer acknowledgment of the evaluated context and stale HEAD/FUR checks. The reviewer does not edit protected frontmatter. Same-worktree HEAD equality is explicitly valid; another checkout/time is not a substitute. Separate-checkout review is unsupported until an explicit binding contract exists. Available versus unavailable provenance is discriminated and cannot collide with legacy null/no-commit. A recorded decision can survive incomplete provenance without being advertised as complete documentation. AC 11 covers these cases.

### R1-F005 — Addressed

New-format intake and revision handoff validate revision frontmatter and retained lineage. Missing/malformed fields, changed bytes retaining an ID, or historical ID reuse for different bytes refuse without rewriting the FUR. Byte-identical reuse is allowed, with original review/turn/version checks for retries. Legacy predecessor identification is an explicit historical case, not an authoring bypass. AC 11 includes these refusals.

### R1-F006 — Addressed

Diff generation must verify forward and reverse application against the sealed endpoint digests before success. Encoding, CRLF, final-newline and supported path/addition/deletion behavior are required exactness cases. A binary-safe Git patch is identified only as a candidate; the bounded plan must choose and behavior-test a concrete versioned representation. This avoids asserting a patch format guarantee from its name alone.

### R1-F007 — Addressed

§4.3 explicitly states that post-squash acceptance-object loss is the expected missing-history case. The workflow can plan before squash while the objects exist or obtain an explicit owner disposition before relying on prior acceptance afterward. It does not invent a requirement to retain turn commits, nor imply that a FUR-only chain restores repository history.

## Changes made

Updated the FUR writing-basis commit and revision ID; clarified response format compatibility in §4.2; revised provenance ownership and validation in §4.3; replaced §4.4 with explicit lineage, input, cycle and external-publication contracts; aligned ACs 11, 13 and 14. Retained repository-diff checks, immutable historical records, Linux/macOS scope, protected sessions, native Unknown timing, cumulative budgets, owner adoption and fresh-plan requirements. No implementation plan or tooling was added.

## Declined changes and rationale

No requested behavior is declined. Corrected the phase-advance/ordinary-submission distinction in R1-F003 as documented above. Selected the reviewer's deferred-exact-byte-publication option, preserving dedicated commits rather than batching. Concrete patch-format selection is deferred to the bounded plan with required round-trip evidence instead of asserting untested support now.

## Verification

- Read the complete sealed reviewer-response-1.md and current author template before changes.
- Inspected `src/collateral/responses.mjs` metadata keys and protected-field checks at the referenced locations; confirmed arbitrary reviewer frontmatter edits are disallowed.
- Inspected `src/cli/run-core.mjs` initial snapshots, phase advance, no-commit handoff and normal-mode commit transaction. Confirmed the source-reference distinction above and exact snapshot availability.
- `git rev-parse HEAD` returned the full writing-basis commit recorded above.
- `git diff --check` passed after the specification revision.
- Computed SHA-256 from the native start snapshot and current FUR; values are recorded above. Confirmed exact new FUR frontmatter and revision identity.
- This is a specification-only edit. No product tests, launch enforcement changes, patch tooling or new-format validation are claimed. Native lifecycle validation and the same actual reviewer will assess the revised bytes.
- Historical engagement bound 4037.9 seconds and the prior continuation's conservative 1336 seconds remain additive with subsequent work. Root owns cumulative accounting; this author did not overwrite its timer or convert Unknown to zero.
