<!-- ai-peer-review-template version="1" digest="sha256:f81da1894a46ceb20866070833b4e99ef536ef633542b418783d29e6a981dbd8" -->

<!-- protected-frontmatter -->

---
schema: "ai-peer-review.response/v1"
review_id: "review-1fd31c736787ff0000e504880749a698"
role: "author"
turn: 1
commit_mode: "normal"
authority_assurance: "unavailable"
artifact_path: "docs/superpowers/plans/2026-10-08-171-portable-consumer-decomposition.md"
artifact_commit: "cc0634a5d9c77445b3dc9d02e4f68475b165b4f3"
artifact_blob: "45f10c1ee7b67648349da2c4b337577a5531c44e"
artifact_digest: "sha256:1f899ac9d79f20224efa12c07943eeef5aaf8b48206706efbfe58e50eb0a31ac"
agent:
  host: "codex"
  provider: "openai"
  model_id: "gpt-6-astra"
  model_display: "gpt-6-astra"
  session_fingerprint: "sha256:3360e116e28ffcee773a4e3ea34dd0578d5ef69a6b6d7df268f0693489c2d4be"
  identity_source: "runtime"
started_at: "2026-10-08T10:15:20.587Z"
submitted_at: "2026-10-08T10:37:57.774Z"
finding_ids: []
answered_finding_ids: ["R1-F001","R1-F002","R1-F003","R1-F004","R1-F005","R1-F006"]
acknowledged_supplement_ids: []
---

Mode: `normal`

## Summary

Revised the decomposition without dropping any original #171, #141 or #107 Task 2 requirement. All four required findings and both optional suggestions are addressed in the plan. The revised work breakdown is 32 base human hours; the earlier 36.5-hour native forecast remains historical pending native re-estimation after review, and mandatory splitting remains in force.

## Finding dispositions

### R1-F001 — Addressed

Tasks 1 and 2 now own mechanical source-contract closure derivation and a generated closed, sorted manifest rather than the old mirrored ten-path list. The development AST walker follows static and literal dynamic imports from process-source-assurance, includes the class schema and manifest itself, refuses unknown nonliteral imports and checks missing and extra manifest entries independently. Ordinary installed runtime uses the pinned manifest and actual installed bytes, without ESLint, capture receipts or signing inputs. A newly reachable guard change must invalidate an accepted class. Mutable class/review data stays outside the code contract. Task 5 rechecks packed and loaded bytes and genuinely recaptures the new contract.

The selection initialization cycle is explicitly broken through portable-system, a stock low-level module without module-evaluation imports of source assurance, the high-level factory or elections. Its C1 dependency is a fixed literal lazy import inside awaited methods after evaluation. The high-level factory composes source observation outside selection. The closure walker includes lazy dependencies and visited cycles. Fresh-process import-order and awaited-selection RED checks cover TDZ, recursion and top-level observations.

### R1-F002 — Addressed

Task 3 explicitly owns worker-factory-core, worker-factory, worker and provider-bridge, including release paths, delivery hooks, reviewer launch and session wake. Every operational call awaits lease verification and cleanup. RED tests exercise actual launchReviewer and deliverToSession boundaries: rejected async verification for a foreign slot, stale generation or stale observation leaves effect counters at zero. Task 1 inventories/flags unawaited acquire, beforeDelivery, releaseUnused, release and abandon at operational effect sites.

### R1-F003 — Addressed

The verifier now has conservative module-level transitive reachability from declared portable bin and operational library entries, while parsing/classifying every src/bin module. A neutral helper import from a mixed native module remains forbidden. Static and literal dynamic imports/re-exports are traversed; unresolved dynamic/property/callee origins block acceptance.

Interprocedural origin analysis seeds native platform bindings and propagates aliases, assignment, destructuring, returns and argument-to-parameter flows to fixed point. Native-tainted or unresolved handle calls remain blockers; a method name alone never establishes stock authority. Task 1 RED fixtures cover a forwarded native parameter in a module without native imports and a neutral import from a mixed native module.

Task 4 explicitly owns ipc and portable-used platform helper extraction. Neutral broker-protocol helpers move out; every portable importer moves to neutral protocol/HTTP modules. Native IPC/platform exports remain #143 residuals only when they are genuinely unreachable at the defined module granularity. run-core's inspectPlatformSecurity path must be removed or isolated with honest stock/unavailable diagnostics. Covered edits enter the derived contract before Task 5.

### R1-F004 — Addressed

Task 2 verification includes integration/runtime-selection and integration/primary-authority. Task 3 includes integration/provider-resource. Task 4 includes broker-multiproject, broker-endpoint and broker-readiness. Task 6's cumulative command includes broker-readiness. Existing verification commands remain; these additions do not authorize broad host suites.

### R1-F005 — Addressed

The shared interfaces now define the Task 2–5 interim state explicitly: changed-contract assurance is unavailable, every ordinary consumer fails closed, no native fallback or activated-path change is permitted. Task 2 process-source-assurance tests pin the negative state. Tasks 3/4 deliver code/protocol/refusal seams; actual admitted new-contract startup is a Task 5 gate.

### R1-F006 — Addressed

Selection-store construction is definition-only and performs no filesystem, principal, protection or source observation. Construction realpath/lstat/inventory/account observations move to awaited initialization/read/assert/effect paths with fresh rechecks. The earlier construction sentence is narrowed accordingly; no synchronous snapshot facade may authorize an effect.

## Changes made

The plan adds seven concrete shared-interface contracts, assigns source assurance, generator/manifest and actual lease/IPC consumers to their tasks, adds the requested negative cases and affected integration commands, and raises Task 1 to eight base hours and Task 6 to two. Original whole-story acceptance, finite class capability limits, genuine recapture, normal pre-capture registration/class review, real target-OS installation proof, TIA-only host testing and hosted exact-head receipts are retained.

## Declined changes and rationale

None. No implementation or real new-contract capture has been performed during this plan revision. Review acceptance will establish plan consensus only, not execution or operational acceptance.

## Verification

Read the complete sealed reviewer response and compared the revised ownership, boundaries and commands against the inspected current source described in the original review/deep dive. Verified the plan with repository Prettier and Markdownlint and checked whitespace with git diff --check; all returned zero. No new product tests were run or claimed: this revision changes the plan only. New RED/GREEN tests, derived graph checks, fresh captures and real OS/install journeys remain mandatory execution gates. CSpell excludes this plan directory and is not claimed as passing coverage.
