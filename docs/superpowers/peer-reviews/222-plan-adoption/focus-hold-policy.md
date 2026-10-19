# Hydration focus policy history and withdrawal

## Owner-directed hydration focus

The owner requested: “relax the wip limit -- lock everything that is not 222-hydration.”

Execution is reserved to the existing 51 `222-hydration` stories (#225–#275), subject to their accepted dependency waves, native approvals, worker limits and four-human-hour ceiling. This focus change does not start implementation or grant Plan approval. Documentation-only #222 remains an administrative exception so it can finish its already authorized closeout.

All other currently open issues are to receive a native blocked-by edge on #275. That final reconciliation task has a verified prerequisite closure covering all 51 hydration stories. Existing blockers and lifecycle states are preserved. This is a scheduling hold, not a newly asserted technical prerequisite. Future new issues outside this cohort must receive the same hold through the native block verb. Closed history is untouched.

Cohort tasks responsible for scoped backlog disposition (including #227, #263 and #264–#271) may remove this hold edge where necessary to perform an accepted administrative supersession, split or reconciliation. They must record that disposition; removing the hold for that purpose does not authorize implementation of the old scope. The parent #141 can host its existing children while its own lifecycle advancement is held.

The sanctioned project configuration now reads `gatePlanRefineWip = false`. Actual `aitm plan 222` still refuses with `wip-budget-exceeded` for #214: the installed guard does not consult this setting. The requested WIP relaxation therefore remains ineffective, and #222 has not entered Plan or Done. No guard patch, direct state jump, false approval or source implementation was performed.

The final focus-hold verification receipt records per-issue results, including any native enforcement gaps. #124 retains its existing cross-repository dependency on kburson/ai-task-manager#1847; the installed dependency adapter rejects that relationship rather than adding #275. Its visible hold label records the owner policy without claiming the missing native edge. Administrative worktree relocations, if required for unavailable recorded checkouts, are retained as append-only native history.

## Recovery verification

After the API reset, all 39 hold labels and 38 native #275 edges were read back. #124 remains the sole missing edge because the installed native dependency adapter rejects its existing cross-repository dependency; that relationship and its other session's occupancy claim were preserved. #217's native hold was applied using the registered administrative block command without taking over its existing occupancy. All 51 cohort stories remain Backlog with unchanged issue bodies, ranks and prerequisites. The interrupted #157 administrative timer was paused successfully, retaining Unknown accounting. A fresh native Plan attempt for #222 still refused the WIP gate despite the saved configuration.

## Owner withdrawal of hold labels and current closeout policy

The owner subsequently withdrew `222-hydration-hold` labels and is removing them. **Do not reapply these labels**, apply them to new issues, or treat the historical label observations above as current policy. Retain the `222-hydration` cohort identification label. Existing native dependency edges are separate records and were not removed by the label withdrawal. No additional hold edge or label is authorized by this closeout.

The owner authorized separate AITM #2031 to repair publication and make ordinary WIP capacity warning-only while preserving native dependencies and ownership. Delivered source head `71c4fc17e1259973b66eebaf09742638cb8d11d4`, [PR #2032](https://github.com/kburson/ai-task-manager/pull/2032), passed all unit, integration and slow CI lanes, independent review and native Test/Review. AITM verified squash `5a4d02fc0c1125be72bcdaad5cc62d5eddba7bf8` and closed #2031 through the state machine. The corrected Explain path also retains the capacity warning without changing dependency refusals. The native #222 Ready for Planning → Plan transition emitted a warning for #214 and succeeded. The historical WIP refusal receipts above remain true observations of the previous runtime.

Only documentation-only #222 may complete its already authorized closeout. All 51 implementation stories remain unstarted in Backlog; owner authorization to implement, native leaf forecasts, JIT analysis, ownership and dependencies remain required. #214 is not demoted. The accepted spec r13, plan r6 and retired orphan remain unchanged.
