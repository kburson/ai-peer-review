<!-- ai-peer-review-template version="1" digest="sha256:f81da1894a46ceb20866070833b4e99ef536ef633542b418783d29e6a981dbd8" -->

<!-- protected-frontmatter -->

---
schema: "ai-peer-review.response/v1"
review_id: "review-071af055aa2f80405afeda08da8cafed"
role: "author"
turn: 1
commit_mode: "normal"
authority_assurance: "unavailable"
artifact_path: "docs/superpowers/specs/2026-10-12-209-portable-reconciliation-design.md"
artifact_commit: "32904e0d573987455dac7916293ce1dc50bd6d6c"
artifact_blob: "cf0a1a77a71fbd28d8727f4ffca4050da0e9f93a"
artifact_digest: "sha256:3add0088ef898106cb97c1b932b51f984f75a60f47349a50d487ac6311e1961c"
agent:
  host: "codex"
  provider: "openai"
  model_id: "gpt-6.1-sol"
  model_display: "gpt-6.1-sol"
  session_fingerprint: "sha256:49863c1adf7739b218afe693008fc5de335f50b5fdaed3624eae7dc56df0e096"
  identity_source: "runtime"
started_at: "2026-10-12T19:19:04.279Z"
submitted_at: "2026-10-12T19:39:33.126Z"
finding_ids: []
answered_finding_ids: ["R1-F001","R1-F002","R1-F003","R1-F004","R1-F005","R1-F006","R1-F007","R1-F008","R1-F009"]
acknowledged_supplement_ids: []
---

Mode: `normal`

## Summary

Verified all nine findings against the actual substrate, registry, worker/service ordering and resource code. Revised the design to use each store's actual authority mechanism, bind the exact startup registration set, and distinguish legitimate production worker transitions from unrelated mutations. No product code changed or passing installed result claimed.

## Finding dispositions

| Finding | Disposition and evidence |
| --- | --- |
| R1-F001 | Accepted. Added exact per-store roots/mechanisms and threat limits. Public project/review stores use retained ordinary physical containment/identity observations around existing exact authority readers, not fabricated C1 protected receipts. C1 private/runtime and resource protection remains mandatory. No ACL rewrite. |
| R1-F002 | Accepted. Added a concrete restoration contract: private exact startup set, production worker membership and producer-issued before/after generation receipts, including recovery-only suspension/close and any newly acquired genuine held provider lease. Publication compares restored entries against those exact receipts; other entries remain unchanged. New or unbound mutations refuse. |
| R1-F003 | Accepted. Empty, exact terminal/preserved, durably fenced and legitimately restorable dispositions yield clear/zero public obligations. Restorable entries live exclusively in the private observation and are supplied to startup through readPreparedPortableRegistrations. Unknown dispositions remain bounded blockers. |
| R1-F004 | Accepted. Documented provider-resource-retained as a terminal operator obligation with no present orphan-discharge route. Created [#210](https://github.com/kburson/ai-peer-review/issues/210) through the sanctioned defect wrapper to track that deferred operation. It does not block #209 or authorize automatic discharge. Positive #190 crash/reclaim excludes held provider resources; a held-resource crash must retain and refuse honestly. |
| R1-F005 | Accepted. Validated foreign resource changes/additions trigger fresh association checks, not unconditional invalidation. Same-project/ambiguous changes refuse unless tied to a genuine restoration receipt. Stated 4096 total entries, depth16, 1048576 bytes/file and a single original 30000ms deadline, with distinct overflow/deadline/abort reasons and retained close failures. |
| R1-F006 | Accepted with conservative disposition. Enumerated reserved private/runtime/runtimes/broker/reviews namespaces and closed review identities. Empty/uninitialized review directories remain review-initialization-unproved, not silently absent or automatically deleted. Reserved journals without events use existing rules only with complete independent effect inventory. Added the corresponding test requirements. |
| R1-F007 | Accepted. Stock manual and provider root derivations are explicit in the authority table; no caller home/path is accepted. |
| R1-F008 | Accepted. Fixed key set drops mandatory reconcile; a legacy reconcile key is optionally accepted, ignored and never invoked. The service omits it; other keys refuse. |
| R1-F009 | Accepted. Rechecks are explicitly immediately before publishEndpoint and lifecycle.publish, using the genuine restoration generations. |

## Changes made

Revised Production boundary; replaced Complete protected observation with a per-store authority table, ordinary-versus-protected mechanisms, bounds, namespace grammar and foreign association rules; expanded classification; added Restoration and publication generations; constrained held-provider crash evidence. Follow-up #210 is a separately tracked Backlog defect, not an acceptance waiver or extra required provider discharge in this repair.

## Declined changes and rationale

None. For empty/uninitialized directories, chose explicit conservative refusal because an absent journal/history does not prove no external effect. No operator cleanup or orphan-provider discharge is fabricated.

## Verification

Checked registry.mjs physicalDirectory/inspectOwnedDirectoryChain and review discovery, portable-service/service-core startup order, worker-factory/worker transitions, manual resource settlement and provider record reacquisition/removal. Changed specification passes Prettier, Markdownlint and git diff --check. Original baseline actual guarded refusal test passed one test with zero skips. Sanctioned creation of #210 succeeded and tethered it to the project. Product RED/GREEN and actual installed acceptance remain pending; no fixture is elevated.
