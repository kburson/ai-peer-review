<!-- ai-peer-review-template version="1" digest="sha256:f81da1894a46ceb20866070833b4e99ef536ef633542b418783d29e6a981dbd8" -->

<!-- protected-frontmatter -->

---
schema: "ai-peer-review.response/v1"
review_id: "review-772fc7ffc4fe3d201702aa77f8c2340c"
role: "author"
turn: 1
commit_mode: "normal"
authority_assurance: "unavailable"
artifact_path: "docs/superpowers/plans/2026-10-07-169-portable-owner-lifecycle-decomposition.md"
artifact_commit: "0f767e818e03ca73de66aa42209974988266a89a"
artifact_blob: "d420ebf9677937e1c105a97cf4cf0e47491b9add"
artifact_digest: "sha256:7c6386f166d0717c49dd6d12c938a1232a338ecf92b6e7e63dd54b715a51f8cc"
agent:
  host: "codex"
  provider: "openai"
  model_id: "gpt-6-astra"
  model_display: "gpt-6-astra"
  session_fingerprint: "sha256:3360e116e28ffcee773a4e3ea34dd0578d5ef69a6b6d7df268f0693489c2d4be"
  identity_source: "runtime"
started_at: "2026-10-07T12:36:33.792Z"
submitted_at: "2026-10-07T12:52:35.056Z"
finding_ids: []
answered_finding_ids: ["R1-F001","R1-F002","R1-F003","R1-F004","R1-F005","R1-F006"]
acknowledged_supplement_ids: []
---

Mode: `normal`

## Summary

Addressed all six sealed findings in the decomposition plan after checking the actual C1/C3, HTTP and cleanup consumer code. This is a plan revision only. No implementation, admitted source class, production owner, installed acceptance or activation is claimed.

## Finding dispositions

- **R1-F001 — Accepted.** Nonce and same-socket checks alone permit a proof relay. Shared Task2, Task2 scope and the operation contract now bind both server-observed socket tuples plus the exact observed endpoint port; the client compares the actual reversed tuple before bearer submission. The actual two-port proxy RED `relayed-proof-refused` is explicit. Proof-route work precedes ordinary authentication, never dispatches, and preserves admission and receipt/idle limits. Connections belong to one operation and are re-proved for later independent operations.

- **R1-F002 — Accepted, option (b).** Verified `assertCurrentCleanupOwnership` synchronously evaluates `!owner.verify()`; widening provenance without migrating this call would permit Promise truthiness. Task3 now owns `src/protocol/compatibility.mjs`, all actual test/call-site awaits, strict `(await owner.verify(context))===true`, bounded rejection, genuine inventory revalidation and immutable protected/inventory-bound `handshake.versions`. Added the two cleanup test files to scope/verifier. Native producer membership remains, with native boolean semantics preserved. Unverified async cleanup-core controls pin false/rejection/nonboolean behavior now; genuine portable positive/false/rejection controls remain explicit cumulative170/171 obligations because no portable producer is genuine before class admission. No fixture registration hatch is added.

- **R1-F003 — Accepted.** Later admission is finite, actual AbortSignal, absolute monotonic and at most30000ms from admission. AsyncLocalStorage marks the active operation and prevents nested renewal, with admission reserved synchronously before awaits. The revision names all four concrete baseline mechanisms: C3 core check/withdraw/assert/run/release, production registry budget/source revalidation, C1 captured guard operationBudget, and withElectionLease lease-budget-mismatch. Every existing startup anti-renewal/refusal invariant remains before private genuine completion. Later verify/release use one privately registered operation context while retaining the original slot. Added clean release after original expiry, zero obligations, Infinity/NaN/overbound/invalid signal and nested-renewal controls. No public completion setter or caller deadline override is authorized.

- **R1-F004 — Accepted.** Replaced the impossible positive production examples with explicitly unverified cores on actual test-owned substrate and separate production-refusal assertions. Task1 uses ordinary fixture filenames and never reserved owner permission; its production copied lease must refuse. Task4's core is `verified:false`; production remains source-class-unavailable/indeterminate with no owner file. Classified the RED bullets and added per-task concrete verification boundaries. Genuine positives are cumulative170/171, not simulated now.

- **R1-F005 — Accepted.** Task1 generalizes the existing C1 createOwnedPublication retained-generation engine internally and keeps the election wrapper/refusal tests unchanged. Reserved owner wrappers add genuine lease/context checks; protocol stores use the same mechanism. Both use one obligation shape, including alternate-locator uncertainty. No second divergent retained engine is planned.

- **R1-F006 — Accepted.** Quarantine must read back the moved locator and compare exact identity/version/bytes. A mismatch/error is uncertain with retained original/quarantine locators, bytes and obligations; it cannot authorize owner creation or blind restoration. Task4 requires that exact receipt before create. The actual replacement-between-check-and-rename RED `displaced-generation-retained` is explicit. The plan no longer implies that lstat proves atomic compare-and-swap or prevents a noncooperating trusted-account rename race.

## Changes made

Revised shared signatures, Global Constraints, all four task scopes/examples and concrete safety/verification boundaries. Also adopted optional suggestions: exact APR_BROKER_STALE/credential and endpoint locations, explicit proof route before authenticate/dispatch, one-operation connection lifetime under the original10s/5s limits, and additive required signal/deadline refusal.

The native23.5h/XL forecast is unchanged. Original169/141Scope and ACs stay on their parents and unchecked. The new decomposition does not claim actual source admission, descendant/provider discharge, installed success, ordinary activation or publication.

## Declined changes and rationale

None.

## Verification

Read the original source plan and actual C1/C3/HTTP/compatibility implementation, including every current cleanup predicate reference. No product code or tests ran for this plan-only revision. Exact-document Prettier write/check, Markdownlint and git diff --check all returned0 for this revision. Results are retained under .scratch/169-delivery/revision-*.json. Project CSpell excludes docs/superpowers, so its zero-file/exit1 invocation is explicitly not a spelling pass. Normal protocol commit mode and authority assurance unavailable are preserved.
