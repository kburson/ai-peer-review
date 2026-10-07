<!-- ai-peer-review-template version="1" digest="sha256:f81da1894a46ceb20866070833b4e99ef536ef633542b418783d29e6a981dbd8" -->

<!-- protected-frontmatter -->

---
schema: "ai-peer-review.response/v1"
review_id: "review-772fc7ffc4fe3d201702aa77f8c2340c"
role: "author"
turn: 2
commit_mode: "normal"
authority_assurance: "unavailable"
artifact_path: "docs/superpowers/plans/2026-10-07-169-portable-owner-lifecycle-decomposition.md"
artifact_commit: "960eadad1496dfa677a0bac273d78812618441c8"
artifact_blob: "ebb2a9a5adce6ed3b23d0d5cf478a55166c3ed91"
artifact_digest: "sha256:3d163c16b307a1bced7b47245707006c7918a01cb35a7842992d75c775abf29e"
agent:
  host: "codex"
  provider: "openai"
  model_id: "gpt-6-astra"
  model_display: "gpt-6-astra"
  session_fingerprint: "sha256:3360e116e28ffcee773a4e3ea34dd0578d5ef69a6b6d7df268f0693489c2d4be"
  identity_source: "runtime"
started_at: "2026-10-07T12:36:33.792Z"
submitted_at: "2026-10-07T12:58:26.566Z"
finding_ids: []
answered_finding_ids: ["R2-F001","R2-F002"]
acknowledged_supplement_ids: []
---

Mode: `normal`

## Summary

Addressed both remaining medium findings and both optional textual corrections after checking the actual shipped cleanupGuard in bin/peer-review-broker.mjs. The six turn1 findings remain resolved. This is still a plan-only revision in normal commit mode, assurance unavailable.

## Finding dispositions

- **R2-F001 — Accepted.** The shipped entrypoint cleanupGuard currently awaits assertSelectedRuntime but omits await on assertCurrentCleanupOwnership. Task3 now explicitly owns the narrow bin/peer-review-broker.mjs await change before C6’s broader migration, and a shipped-composition-awaits-refusal control in its already included portable-cleanup-ownership verifier. The control must use the actual shipped guard source, prove a deferred rejecting gate keeps cleanup pending then rejects, and prove no worker close/release. No copied test-only closure may stand in for the production entrypoint. Source inventory/candidate packaging binds changed exact bytes; covered source-class changes require170recapture, with no old receipt or ordinary activation claim.

- **R2-F002 — Accepted, option (a).** Preserved the accepted Owner-or-joined-BrokerClient/throw contract. The production source-unavailable example now requires APR_BROKER_STALE via assert.rejects, the precise details.reason and bounded outstandingObligations, plus no owner file. Only the internal election/core returns an indeterminate schedule outcome. Revised every explanatory production refusal reference to this throwing behavior.

## Changes made

Named the shipped caller and asynchronous composition control explicitly, retained the narrow-before-C6 boundary, corrected Task4’s refusal union, moved Task1 substitution checks to core-on-real-substrate with specific reason assertions, removed the duplicate phrase, and added runtime:{} to the fake producer example.

## Declined changes and rationale

None.

## Verification

Read bin/peer-review-broker.mjs cleanupGuard and rechecked original C4’s boundedOwnershipError throw contract. No product edits or product tests. Exact revised plan Prettier write/check, Markdownlint and git diff --check all returned0; outputs are retained in .scratch/169-delivery/revision-2-*.json. CSpell’s project exclusion remains excluded, not a spelling success. Package-generated author commit is the only commit operation in this active review.
