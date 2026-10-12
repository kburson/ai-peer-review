<!-- ai-peer-review-template version="1" digest="sha256:f81da1894a46ceb20866070833b4e99ef536ef633542b418783d29e6a981dbd8" -->

<!-- protected-frontmatter -->

---
schema: "ai-peer-review.response/v1"
review_id: "review-071af055aa2f80405afeda08da8cafed"
role: "author"
turn: 2
commit_mode: "normal"
authority_assurance: "unavailable"
artifact_path: "docs/superpowers/specs/2026-10-12-209-portable-reconciliation-design.md"
artifact_commit: "425e675f2774013551e8a0d355900f193bf448b2"
artifact_blob: "48a818ad320cad6229388ac7e3d22885609c1790"
artifact_digest: "sha256:6e5cede02c93c0598bfeca553cb8dbfcdc7129ffe5792785fbae8171ada88b19"
agent:
  host: "codex"
  provider: "openai"
  model_id: "gpt-6.1-sol"
  model_display: "gpt-6.1-sol"
  session_fingerprint: "sha256:49863c1adf7739b218afe693008fc5de335f50b5fdaed3624eae7dc56df0e096"
  identity_source: "runtime"
started_at: "2026-10-12T19:19:04.279Z"
submitted_at: "2026-10-12T19:57:47.547Z"
finding_ids: []
answered_finding_ids: ["R2-F001","R2-F002","R2-F003","R2-F004","R2-F005"]
acknowledged_supplement_ids: []
---

Mode: `normal`

## Summary

Verified the five round-2 findings against worker/coordinator startup, exact launch matching, recovery record writes and provider acquisition. The specification now separates bounded pre-creation reconciliation from read-only observation, defers background coordination until publication, and includes the missing real namespaces. No product code changed.

## Finding dispositions

| Finding | Disposition |
| --- | --- |
| R2-F001 | Accepted. Genuine prepared-owner factory selection enables restoration mode. Start observes/classifies/settles but defers coordinators, new launch/wake and asynchronous state-change settlement until lifecycle.publish succeeds. Initial settlement is awaited and receipted; activation uses the published lifecycle authority. Added the automatic-wait pre-publication-zero-wake control. |
| R2-F002 | Accepted. Added preparePortableReconciliation bound to the genuine won election, original source/context and current #102 authority. Its fixed pre-creation existing-effect producer calls exact reconcileReviewerLaunch and a reconciliation-only extracted reconcileReserved without reserve/delivery/launch. Complete fresh observation follows proved outcome writes; unknown probes refuse before creation. broker reconcile/ensureBroker reaches this pre-creation path without a live broker. Named the acknowledged branch of joinedLaunchMatches, excluding its reserved/unknown branches. |
| R2-F003 | Accepted. Added broker/recovery closed identity/schema and immutable historical disposition; genuine suspension records are receipted. Enumerated per-review coordinator/delivery/dispatch/locks/responses/provider/startup/top-level protocol namespaces. Coordinator PID is diagnostic; a retained orphan coordinator generation is a terminal obligation with no death/TTL discharge. Existing live-holder stop/release or later #107 exact recovery owns it. Positive #190 crash points cannot claim held-coordinator reclaim. |
| R2-F004 | Accepted. Stated existing C1 provider chain and apr-resource record naming, retaining legacy resource.json/resource.lock blockers. |
| R2-F005 | Accepted. Factory creation/provider acquisition and releaseUnused unwind are explicit receipt transitions. Uncertain unwind never grants a receipt and retains exact obligations. |

## Changes made

Expanded classification with the exact acknowledged launch predicate; added Bounded pre-creation recovery and explicit published-only coordinator activation; completed namespace and recovery-record rules; added factory receipts and held-coordinator limitations. Read-only observation and effect-producing reconciliation are distinct components with actual producer authority; no injected successful result is permitted.

## Declined changes and rationale

None. Choosing exact pre-creation reconciliation avoids the startup deadlock without granting ownership to unknown effects. Orphan provider resource retirement remains #210; diagnostic-only coordinator/lock retirement remains outside this repair under later #107 recovery obligations. Neither is waived or marked complete.

## Verification

Read joinedLaunchMatches and recoveryAdapter/persistRecovery; worker start/startCoordinator and service asynchronous settlement; coordinator reconcileWake/reconcileReserved and lease acquisition; provider ports and factory acquisition. Specification passes changed-file formatting/Markdownlint and whitespace checks. Tests are requirements pending implementation, not success claims.
