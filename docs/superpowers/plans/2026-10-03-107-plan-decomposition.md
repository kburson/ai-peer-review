# Issue 107 Plan Decomposition Evidence

The user authorized completing Plan and moving #107 to Develop on 2026-10-03. The accepted implementation plan remains unchanged at `docs/superpowers/plans/2026-10-03-107-agent-first-portable-runtime.md`, commit `60efdbbeb60c83c1c56884491ae018eaea70d282`, SHA256 `c4e8564396d86e5f9413393e30975fc7c2639135dfbdff5d8ddcca769862d016`. Sequential SAR/XPR acceptance remains recorded in its existing review manifest.

## Ownership correction

Existing #109 remains the direct child for Codex per-attempt timing/usage and explicit unavailable values. New #152 owns shared Task 13 measurement/integration; #153 owns Task 14 aggregates/chains/amendments. Their scopes exclude duplicating #109's adapter repair. Exact source titles containing Existing #109 are retained as accepted task identifiers; the user-authorized decomposition correction supersedes their issue assignments and commit destinations only. #30 retains evidence-format ownership; #34 retains analytical scoring ownership.

The native child tree was enumerated before creation and contained only #109. All 18 task proposals and governed creation dry runs passed before the first create. Canonical create-issue was used with validated split-plan proposal fragments because the installed split-plan launcher references a missing consumer bin/aitm.mjs. No installed tools were patched or creation gates bypassed.

## Native children and human allocations

| Source task                                         | Child | Human allocation | Rank |
| --------------------------------------------------- | ----- | ---------------: | ---: |
| 1: Async Authenticated HTTP Transport               | #140  |            12.5h |    2 |
| 2: Protected Storage and Exclusive Ownership        | #141  |              33h |    3 |
| 3: Genuine Host Epoch and Descendant Termination    | #142  |              33h |    4 |
| 4: Binary-Free Package Closure and CI               | #143  |            20.5h |    4 |
| 5: Reconcile Accepted Contract Owners               | #144  |              18h |    2 |
| 6: Canonical Closed API and One Help Registry       | #145  |            12.5h |    2 |
| 7: Config v2 and Finite Roster Resolution           | #146  |              21h |    3 |
| 8: Read-Only Preview and Atomic Reservation         | #147  |              21h |    5 |
| 9: Headless Identity and Private Role Tools         | #148  |              25h |    6 |
| 10: Role Scopes, Context, and Submission Seals      | #149  |              25h |    7 |
| 11: Stages, Rounds, Findings and Finite Fallback    | #150  |              29h |    8 |
| 12: #30 Shared Evidence and Portable Lineage        | #151  |              25h |    9 |
| 13: Existing #109 Attempt and Controller Metrics    | #152  |              17h |   10 |
| 14: Existing #109 Aggregates, Chains and Amendments | #153  |              17h |   11 |
| 15: Out-of-Band Monitoring and Observer Admission   | #154  |            20.5h |   12 |
| 16: Identical CLI/MCP and Small Installed Skill     | #155  |              17h |   14 |
| 17: Replay-Safe Recovery and Project Cleanup        | #156  |              25h |   13 |
| 18: Installed Release Conformance and Migration     | #157  |            41.5h |   15 |

Existing #109 retains its 8h Refine baseline; the parent Plan allocates 8.5h including rubric overhead to that repair once. Parent final repository verification adds 3h. Larger children require subdivision in their own Plan before Develop; estimates are not reduced to evade decomposition.

## Estimate and candidate priority

Forecast record `01M41MPQNYK1MMECMXZTZE6XF6` converged the parent board/body to XL / 425 human hours, replacing the provisional 80h. Adaptive AI forecast: P50 61h, P80 71.5h engaged work; Plan 5h, Develop 42.5h, Test 9.5h, Review 4h. Rubric v33: 32 outcomes, confidence 0.7095. These are forecasts rather than measured execution or calendar promises; external owner/host/reboot evidence waits are excluded.

Tasks 1/2/4 form the urgent #140 → #141 → #143 native-free candidate chain, allocated 66 human hours in the full WBS. Public activation and migration remain gated on accepted #102/#107 reconciliation (#144), #30/#34 adoption and all 15 installed-release gates.

## Rank levels and completion barriers

The user's explicit ranking rule: all child stories at a rank may execute in parallel, but none at a higher rank starts development until every lower-ranked child is complete (Done through the governed approval/closure workflow). Review or code-complete status alone does not open the next level. The parent epic is the orchestration container, not an executable lower-level child.

Parallel levels are rank 2 (#140 transport, #144 accepted-contract reconciliation, #145 isolated registry), rank 3 (#141 portable ownership, #146 configuration), rank 4 (#142 containment/epoch, #143 packaging/CI), and rank 9 (#109 narrow Codex telemetry, #151 evidence). Remaining levels are sequential. Rank 13 recovery precedes rank 14 transport/API integration because the latter consumes intervention/cleanup/reconciliation implementations and shares src/api/service.mjs. Shared schemas/interfaces and separate recorded worktrees remain required. Actual runtime integration never treats isolated test adapters as installed capability evidence.

The installed AITM WIP admission currently enforces one active local child; equal ranks do not bypass that execution gate. No workers were dispatched during Plan preparation. Parallel execution must satisfy its admitted isolation/runtime conditions separately.

## Deep dive and story review

The substantive analysis is [owned comment 5972824343](https://github.com/kburson/ai-peer-review/issues/107#issuecomment-5972824343), posted and mirrored through the governed task verbs with posted/complete signals. It covers files, order, dependencies, tests and risks without premature product checkbox claims. Parent story review addressed all seven questions: real user/operator, supervised review capability, installation/identity/recovery need, concrete avoided failures, source grounding, distinct child contributions and standalone readability.

## Plan exit read-back

Live verification confirmed all 19 native children at Ready for Planning with the recorded level ranks. The fresh approved Explain result was ready with zero blockers, including exact 18/18 task coverage, current refinement and epic branch authority. Plan approval recorded human provenance and froze forecast 01M41MPQNYK1MMECMXZTZE6XF6. The governed promote verb advanced #107 from Plan to Develop and verified the board state, closed Plan timing row, Develop entry marker/row and final move-complete sentinel (8/8 transition checks). Implementation tests and installed conformance remain prospective.

## Estimation input

The exact input used by the governed plan-estimate command is preserved here for reproducibility; its output is the durable GitHub forecast record referenced above.

```json
{
  "schema": "aitm.plan-estimation-input/v1",
  "wbs": [
    {
      "id": "task-1",
      "description": "Async Authenticated HTTP Transport — bounded implementation and targeted regression coverage",
      "baseHumanHours": 12,
      "independentlyReviewable": true,
      "signals": {
        "modules": ["broker/http"],
        "dependencies": []
      }
    },
    {
      "id": "task-2",
      "description": "Protected Storage and Exclusive Ownership — bounded implementation and targeted regression coverage",
      "baseHumanHours": 32,
      "independentlyReviewable": true,
      "signals": {
        "modules": ["broker/ownership"],
        "dependencies": ["transport"]
      }
    },
    {
      "id": "task-3",
      "description": "Genuine Host Epoch and Descendant Termination — bounded implementation and targeted regression coverage",
      "baseHumanHours": 32,
      "independentlyReviewable": true,
      "signals": {
        "modules": ["providers/containment"],
        "dependencies": ["ownership"]
      }
    },
    {
      "id": "task-4",
      "description": "Binary-Free Package Closure and CI — bounded implementation and targeted regression coverage",
      "baseHumanHours": 20,
      "independentlyReviewable": true,
      "signals": {
        "modules": ["packaging/production-closure"],
        "dependencies": ["transport", "ownership"]
      }
    },
    {
      "id": "task-5",
      "description": "Reconcile Accepted Contract Owners — bounded implementation and targeted regression coverage",
      "baseHumanHours": 16,
      "independentlyReviewable": true,
      "signals": {
        "modules": ["runtime/contract-adoption"],
        "dependencies": ["102", "30", "34"]
      }
    },
    {
      "id": "task-6",
      "description": "Canonical Closed API and One Help Registry — bounded implementation and targeted regression coverage",
      "baseHumanHours": 12,
      "independentlyReviewable": true,
      "signals": {
        "modules": ["api/registry"],
        "dependencies": []
      }
    },
    {
      "id": "task-7",
      "description": "Config v2 and Finite Roster Resolution — bounded implementation and targeted regression coverage",
      "baseHumanHours": 20,
      "independentlyReviewable": true,
      "signals": {
        "modules": ["config/roster"],
        "dependencies": ["102", "contracts"]
      }
    },
    {
      "id": "task-8",
      "description": "Read-Only Preview and Atomic Reservation — bounded implementation and targeted regression coverage",
      "baseHumanHours": 20,
      "independentlyReviewable": true,
      "signals": {
        "modules": ["startup/run-reservation"],
        "dependencies": ["registry", "ownership", "contracts"]
      }
    },
    {
      "id": "task-9",
      "description": "Headless Identity and Private Role Tools — bounded implementation and targeted regression coverage",
      "baseHumanHours": 24,
      "independentlyReviewable": true,
      "signals": {
        "modules": ["providers/headless"],
        "dependencies": ["reservation"]
      }
    },
    {
      "id": "task-10",
      "description": "Role Scopes, Context, and Submission Seals — bounded implementation and targeted regression coverage",
      "baseHumanHours": 24,
      "independentlyReviewable": true,
      "signals": {
        "modules": ["protocol/role-scope"],
        "dependencies": ["headless", "reservation"]
      }
    },
    {
      "id": "task-11",
      "description": "Stages, Rounds, Findings and Finite Fallback — bounded implementation and targeted regression coverage",
      "baseHumanHours": 28,
      "independentlyReviewable": true,
      "signals": {
        "modules": ["protocol/run-reducer"],
        "dependencies": ["roles", "registry"]
      }
    },
    {
      "id": "task-12",
      "description": "#30 Shared Evidence and Portable Lineage — bounded implementation and targeted regression coverage",
      "baseHumanHours": 24,
      "independentlyReviewable": true,
      "signals": {
        "modules": ["evidence/lineage"],
        "dependencies": ["30", "rounds"]
      }
    },
    {
      "id": "task-13",
      "description": "Existing #109 Attempt and Controller Metrics — bounded implementation and targeted regression coverage",
      "baseHumanHours": 16,
      "independentlyReviewable": true,
      "signals": {
        "modules": ["telemetry/attempt"],
        "dependencies": ["109", "headless", "rounds"]
      }
    },
    {
      "id": "task-14",
      "description": "Existing #109 Aggregates, Chains and Amendments — bounded implementation and targeted regression coverage",
      "baseHumanHours": 16,
      "independentlyReviewable": true,
      "signals": {
        "modules": ["telemetry/aggregate"],
        "dependencies": ["attempt-metrics", "30", "34"]
      }
    },
    {
      "id": "task-15",
      "description": "Out-of-Band Monitoring and Observer Admission — bounded implementation and targeted regression coverage",
      "baseHumanHours": 20,
      "independentlyReviewable": true,
      "signals": {
        "modules": ["monitor/liveness"],
        "dependencies": ["reservation", "headless"]
      }
    },
    {
      "id": "task-16",
      "description": "Identical CLI/MCP and Small Installed Skill — bounded implementation and targeted regression coverage",
      "baseHumanHours": 16,
      "independentlyReviewable": true,
      "signals": {
        "modules": ["api/transports"],
        "dependencies": ["registry", "run-runtime"]
      }
    },
    {
      "id": "task-17",
      "description": "Replay-Safe Recovery and Project Cleanup — bounded implementation and targeted regression coverage",
      "baseHumanHours": 24,
      "independentlyReviewable": true,
      "signals": {
        "modules": ["protocol/recovery"],
        "dependencies": ["ownership", "rounds", "evidence"]
      }
    },
    {
      "id": "task-18",
      "description": "Installed Release Conformance and Migration — bounded implementation and targeted regression coverage",
      "baseHumanHours": 40,
      "independentlyReviewable": true,
      "signals": {
        "modules": ["release/installed-conformance"],
        "dependencies": ["contracts", "runtime", "installed-hosts"]
      }
    },
    {
      "id": "codex-109",
      "description": "Existing #109 Codex attempt timing, supported usage extraction and explicit unavailable metrics",
      "baseHumanHours": 8,
      "independentlyReviewable": true,
      "signals": {
        "modules": ["codex-adapter"],
        "dependencies": []
      }
    }
  ],
  "testImpact": {
    "expectedMinutes": 180,
    "isolation": "Per-child targeted suites; final exact-tarball installed matrix and full repository verification, with external host/reboot and contract-owner wait time excluded.",
    "lanes": ["unit", "integration", "mcp", "packaging", "smoke", "golden"]
  },
  "risks": [
    "80h Refine estimate was provisional; full 18-task reviewed runtime is materially larger than the native-free candidate milestone.",
    "Task 13 base excludes the existing #109 Codex adapter repair, counted once as its own 8-hour work package.",
    "Tasks 1/2/4 are the urgent candidate milestone; public activation remains blocked on reviewed #102/#107 contract reconciliation and all 15 release gates.",
    "Host epoch, Windows protection and installed provider conformance require actual capability evidence; external wait time is excluded.",
    "WBS hour judgments are an initial engineering forecast, not measured execution or a promise of delivery time. Larger children need detailed subdivision during their own Plan stage."
  ],
  "comparableIssueIds": []
}
```
