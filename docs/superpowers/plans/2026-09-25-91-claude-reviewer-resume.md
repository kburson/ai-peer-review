# Claude Reviewer Turn-2 Resume Implementation Plan

> **For agentic workers:** Execute the checked steps in order, using the existing issue #91 binding and exact worktree. Do not dispatch parallel agents for these coupled changes.

**Goal:** Resume a registered Claude reviewer on the current pending response and submit with its recorded declared identity.

**Architecture:** Protocol status supplies the current pending response on resume. Saved Claude launch state supplies the private session handle, model, and effort, while validation continues to bind review, invitation, and fingerprint. The submit CLI selects the registered declared model source for a matching Claude reviewer session; response sealing retains strict participant comparison and reports the mismatched field.

**Tech Stack:** Node.js 24+, ESM, `node:test`, existing protocol authority and `AprError` helpers.

**Spec:** [Issue #91](https://github.com/kburson/ai-peer-review/issues/91), including its mirrored Deep-Dive Analysis.

## Global Constraints

- Preserve exact reviewer session fingerprint, role, host, provider, and identity-source checks.
- Never grant Claude edit permission to an old response or a neighboring response.
- Keep the raw Claude session handle in private launch state only.
- Do not edit a live review workspace or run a paid Claude provider call for this fix.
- Use `[#91]` attribution for every commit.

## Plan Metadata

- Issue: #91 in `kburson/ai-peer-review`
- Priority: P1
- Size: S at Refine; converge the Plan estimate with AITM before Develop.
- Worktree: `/Users/kpburson/.codex/worktrees/663c/ai-peer-review`
- Branch: `codex/91-claude-reviewer-resume`

## Story Intent

- **Beneficiary:** peer-review operator
- **Capability:** resume and submit a later Claude reviewer turn with the registered identity
- **Need:** turn-1 launch state and ambient model variables can contradict turn-2 protocol and declared identity
- **Value or failure prevented:** multi-turn cross-provider reviews complete without manual environment surgery or weakened identity checks

## File Map

| File                                               | Responsibility                                                                       |
| -------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `src/provider/claude-launch.mjs`                   | Current pending-response launch contract and saved-session validation                |
| `src/cli/run.mjs`                                  | Route current response on resume and preserve registered declared identity on submit |
| `src/collateral/responses.mjs`                     | Safe field-specific identity conflict diagnostics                                    |
| `test/unit/claude-reviewer-resume-submit.test.mjs` | Turn-2 resume, exact permission, and declared submit regression                      |
| `test/unit/identity-conflict-diagnostics.test.mjs` | Conflict details and privacy regression                                              |

## Implementation Tasks

### Task 1: Resume the current reviewer response

**Files:** `src/provider/claude-launch.mjs`, `src/cli/run.mjs`, `test/unit/claude-reviewer-resume-submit.test.mjs`.

- [ ] Add a failing test that advances authority from reviewer turn 1 through author revision and asserts the resumed Claude command permits only `reviewer-response-2.md`.
- [ ] Run `node --test test/unit/claude-reviewer-resume-submit.test.mjs` and confirm the test fails on the old response path.
- [ ] On `launch-reviewer --resume`, derive the pending reviewer response from current status authority. Validate the saved session state against the review, invitation, model, effort, fingerprint, and an authorized earlier response turn. Build the exact new edit rule and persist the current response after a valid provider result.
- [ ] Re-run the targeted test and existing `claude-launch-permissions` and `claude-launch-classifier` unit tests.

### Task 2: Preserve declared Claude identity on submit

**Files:** `src/cli/run.mjs`, `test/unit/claude-reviewer-resume-submit.test.mjs`.

- [ ] Add failing CLI tests for the registered declared reviewer with matching session handle, both with ambient Claude model variables and with them unset; add a different-handle refusal.
- [ ] Run the targeted test and confirm the ambient-variable case fails with `APR_IDENTITY_CONFLICT`.
- [ ] Resolve the declared reviewer using the configured model source when the registered Claude reviewer is declared. Keep normal runtime identity resolution for runtime-registered reviewers and all existing fingerprint checks.
- [ ] Re-run the targeted test and existing identity and submit tests.

### Task 3: Explain identity conflicts precisely

**Files:** `src/collateral/responses.mjs`, `test/unit/identity-conflict-diagnostics.test.mjs`.

- [ ] Add failing tests for mismatched role, host, provider, fingerprint, and identity source, including no raw handle in diagnostics.
- [ ] Run `node --test test/unit/identity-conflict-diagnostics.test.mjs` and confirm the current generic error fails those assertions.
- [ ] Identify the first mismatched field in the existing strict comparison and include registered and resolved identity sources in safe error details and recovery text.
- [ ] Re-run the targeted test and response sealing unit tests.

### Task 4: Final verification and delivery evidence

- [ ] Run `node --test test/unit/claude-reviewer-resume-submit.test.mjs`.
- [ ] Run `node --test test/unit/identity-conflict-diagnostics.test.mjs`.
- [ ] Run `npm test`, `npm run test:slow`, `npm run lint`, and `npm run format:check`.
- [ ] Commit with `[#91]`, run `git log --oneline -1`, and use AITM Test, Review, PR, CI, delivery, and close gates at the exact accepted head.
