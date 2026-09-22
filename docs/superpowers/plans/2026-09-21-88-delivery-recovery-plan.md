# Issue #88 Delivery Recovery Plan

**Status:** Operator authorized execution with “save the plan and and drive it to done.” This recovery sequence preserves the accepted implementation plan and its acceptance criteria. The authorization includes the single bounded live proof below, after local and exact-head CI verification.

**Goal:** Reach a finite, evidence-based decision: deliver the existing automatic two-way handoff requirement, or identify the specific provider contract that requires a design change.

**Architecture:** Retain the broker, resource leases, exact-session identity, and durable operation exclusion. Stabilize the complete installed Claude execution contract before another release attempt. Separate successful transport, completed provider turns, and actual protocol progress.

**Tech Stack:** Node.js >=24, installed Claude Code 2.1.278, subscription authentication, existing native broker IPC, GitHub Actions supported-host matrix.

**Spec:** `docs/superpowers/specs/2026-09-21-88-provider-authority-broker-reconciliation-design.md`, as amended by the live #88 acceptance criteria. The accepted plan remains `2026-09-21-88-provider-authority-broker-reconciliation.md`, commit `9931f83c2cf43d8892fdaa638fb59e533c7cf830`, blob `dbf44a27fd1be3e2773cac5f3618b308de29152e`, SPR `review-bd65fa3d0a76ec9f39a096656662a981`.

## Diagnosis

The requested outcome is clear. Its feasibility is supported by successful exact-session launch/resume and a real reviewer launch, join, and submission. Reliable unattended two-way completion is still unproven. There is no evidence that the entire objective is impossible.

The plan is poorly sequenced for its principal risk. Task 1 established individual provider primitives; the complete installed-provider interaction was deferred until Task 6, after substantial broker implementation. The primitive tests did not establish that an ordinary resumed agent could execute every authorized protocol command under the actual permission and skill environment.

The integration tests then reproduced the implementation's assumptions. The synthetic installed Claude helper directly invokes the installed Node CLI and fabricates provider transcripts. It exercises real packaging, IPC, and protocol code, but bypasses Claude's permission engine and omits skill-expansion messages. Its success cannot establish the real provider contract.

The latest failure exposes this gap in two places:

1. The capsule and permission rules prescribe `peer-review resume`; the resumed author attempted `npx peer-review resume`, which was denied. The evidence does not establish why the author selected that alias.
2. A Skill invocation produced a correlated metadata user message after its tool result. The transcript parser treated that message as a new human prompt and lost the wake's terminal response.

Correcting only the second defect would recognize a completed refusal, not complete a review. Correcting only the command prefix would leave outcome reconciliation unreliable.

Earlier npm, native IPC, Windows path, and harness failures were additional integration defects. Fixing each symptom and immediately restarting the entire release process created repeated expensive discovery. The two-defect checkpoint limited each burst but did not change that strategy. The agent should have performed this boundary analysis sooner.

## What is proven now

Baseline: `e36190a1cacca38a8945fb26897aa38af9c335ed`, branch `feature/epic/39`, PR #89 draft.

| Claim                                                | Evidence                                                                                                                                                     | Limit                                                     |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------- |
| Packed release passes supported-host CI              | [Push run](https://github.com/kburson/ai-peer-review/actions/runs/35677108399), [PR run](https://github.com/kburson/ai-peer-review/actions/runs/35677112159) | Synthetic provider; optional real-provider job skipped    |
| Real reviewer starts and submits                     | Latest sanitized #88 checkpoint receipt                                                                                                                      | Author did not submit; no return wake                     |
| Exact author session receives the wake               | Private evidence summarized in that receipt                                                                                                                  | Command refused; provider turn misclassified              |
| Automatic two-way handoff                            | No passing receipt                                                                                                                                           | Required release gate remains unmet                       |
| Prior intermittent Windows startup failure explained | Diagnostic instrumentation added; current runs passed                                                                                                        | Earlier failure did not recur; root cause remains unknown |

Windows verification belongs on GitHub's Windows runners. The operator's Mac is not expected to reproduce Windows locally.

## Provider assumptions that must become explicit

The official [headless documentation](https://code.claude.com/docs/en/headless) explains that ordinary print-mode sessions load installed context and customizations. The [CLI reference](https://code.claude.com/docs/en/cli-reference) distinguishes permission grants from tool availability. Consequently, a Bash allowlist alone does not establish which skills or instructions the agent will load.

The repair must cover startup and resume together: installed launcher, exact tools, inherited permission denies, skill expansion, identity hooks, session identity, and terminal-message correlation. A fresh version check is evidence of a supported executable, not proof that an account and session can perform an authorized handoff.

Do not use `--bare` as a shortcut: the documented authentication behavior conflicts with the required subscription-backed execution. Do not use unrestricted Bash or bypass permissions. Do not disable the identity hook to simplify testing. Do not assume new prompt flags erase instructions retained by a resumed session.

A bounded agent can refuse or fail. The broker must report that truthfully without duplicating an operation. “Automatic” cannot mean guaranteed successful LLM behavior for every arbitrary local customization.

## Recovery sequence

This is a decision plan, not an authorization for a redesigned architecture. Execute the existing scope only after the current planning checkpoint is resolved. Use the executing-plans skill for implementation. Preserve the issue's two-new-defect/fix-round stop rule.

### 1. Establish the complete contract and reproduce the failures offline

**Time cap:** 45 minutes of focused work.

**Files:** `src/provider/claude-launch.mjs`, `src/providers/claude.mjs`, `src/providers/claude-stream.mjs`, `src/coordinator/decision.mjs`, `test/unit/claude-wake-permissions.test.mjs`, `test/unit/claude-wake.test.mjs`, `test/helpers/installed-provider/claude.mjs`.

- [ ] Map every command for reviewer join, role resume, submit, no-artifact-change, and finalization to its prompt, launcher, permission rule, and expected protocol event.
- [ ] Add failing permission regressions for the observed plain-command/npx mismatch, quoting and spaces, exact workspace boundaries, and forbidden unrelated commands. The chosen launcher must resolve the installed package; no network-fetching fallback.
- [ ] Reconstruct synthetic transcript fixtures with the real observed message structure: wake marker, Skill call, matching result, correlated skill metadata, denied Bash result, and terminal assistant response. Use synthetic handles and paths, never raw logs.
- [ ] Add negative cases for an unrelated user prompt, wrong tool reference, wrong session/model, repeated wake marker, missing terminal response, and truncated transcript.
- [ ] Identify the supported settings/skills policy without silently narrowing the accepted normal-author behavior. Any required exclusion of ordinary author sessions is a scope decision.

**Exit evidence:** The observed defects fail deterministically offline. Every protocol operation has a documented permission and completion contract. If that contract cannot be stated without broad permissions or a scope waiver, stop this repair route.

### 2. Make one coherent adapter and harness repair

**Time cap:** 75 additional minutes of focused work. Steps 1 and 2 have a combined two-hour ceiling; new findings do not reset it.

**Files:** The files above, plus `test/live/installed-broker-handoff.mjs` and `test/integration/broker-release.test.mjs`.

- [ ] Derive command instructions and exact permission grants from one shared command representation. If multiple installed aliases are retained, enumerate and test the finite set; do not allow arbitrary npx commands.
- [ ] Correlate skill metadata only to a Skill invocation within the same wake. Preserve rejection of unrelated input and unknown transcript structures.
- [ ] Make streaming observation and restart reconciliation agree on the same terminal-turn fixtures.
- [ ] Keep provider terminal completion separate from protocol progress. A terminal refusal must not count as author submission or successful delivery.
- [ ] Strengthen the synthetic installed helper to check the generated command against the modeled permission contract before executing it. Label this as a model of permissions, not proof of Claude's real permission engine.
- [ ] Make the live harness stop promptly on terminal refusal or irreconcilable outcome and emit a sanitized stage/reason receipt. Retain the absolute time bound and cleanup only processes owned by that disposable run.
- [ ] Review the complete diff against launch, join, resume, submit, finalization, restart, and unknown-outcome boundaries before pushing.

Focused regression command:

```sh
node --test test/unit/claude-wake-permissions.test.mjs test/unit/claude-wake.test.mjs test/integration/claude-launch-permissions.test.mjs test/integration/broker-release.test.mjs
```

**Exit evidence:** All demonstrated failure cases are covered, safety negatives pass, and the synthetic installed two-way handoff passes. If a third chained defect appears or two fix rounds fail, stop under #88's checkpoint. Do not push a succession of speculative single-symptom fixes.

### 3. Verify one release candidate

**Budget:** One complete local verification pass and one exact-head supported-host CI cycle. Queue duration is external; record it separately.

- [ ] Run `npm test`, `npm run test:slow`, `npm run test:packaging`, `npm run lint`, and `npm run format:check`, plus pack inventory.
- [ ] Exercise bounded repeated cold broker startup with diagnostics in supported-host CI to investigate the previous intermittent startup failure. A pass does not retrospectively explain that failure.
- [ ] Push the reviewed candidate and require Linux, macOS, and Windows success for that exact SHA.
- [ ] Do not rerun a failed job simply to obtain green. Classify the failure and apply the remaining fix-round limit.
- [ ] Preserve two preexisting untracked SPR files; keep raw evidence private.

**Exit evidence:** Exact candidate SHA, local command results, complete CI URLs, and explicit residual-risk disposition. Any source edit invalidates that candidate's release evidence.

### 4. Perform one final bounded real proof

**Budget:** One operator-authorized Claude window, maximum two review turns and 12 minutes, only after Step 3. No separate paid “probe” outside that window.

- [ ] Use the packed candidate, installed qualifying Claude surface, subscription authentication, and exact session evidence.
- [ ] Require reviewer launch/join/submission, reviewer-to-author wake, ordinary author submission, and author-to-reviewer return wake.
- [ ] Verify each against durable protocol events and provider evidence, not assistant prose.
- [ ] Emit one sanitized receipt tied to the candidate SHA. Keep raw handles/logs private.
- [ ] Arrange AITM verification evidence before running so later workflow commands do not accidentally launch another provider attempt. Never replace the live verifier with a fixture or synthetic success.

**Exit evidence:** Both release gates proven on the same implementation. Agent reports completion evidence for orchestrator review; it does not close #88/#39 itself.

## Hard decision at the end

**Success:** Deliver the reviewed candidate and receipts through the existing issue workflow.

**Failure:** Keep #88/#39 open and PR #89 draft. No automatic second live attempt, quota retry, provider substitution, increased budget, XPR, or new issue. Report the failed contract and the evidence that invalidated it.

If the repaired adapter still cannot execute a complete authorized turn, stop the present approach. The next design decision is whether to move protocol actions behind a typed, package-owned tool surface instead of relying on free-form shell-command selection. That requires its own security/identity design and plan review within existing issue authority; it is not a promised quick fallback. A manual-only scope reduction would also require an explicit acceptance change and would not satisfy today's automatic-handoff criterion.

This plan caps additional speculative implementation at two focused hours, followed by one CI candidate and one bounded real attempt. The cap is a decision deadline, not a promise that every remaining defect can be fixed within it.
