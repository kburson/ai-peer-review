# Codex Linked-Worktree Hook Identity Implementation Plan

> **For agentic workers:** Use test-driven development in the bound #124 worktree. Keep all commits attributed to `[#124]` and preserve the existing AITM #1841 XPR records.

**Goal:** Make current Codex model observation reliable and diagnosable for peer-review commands in linked worktrees and headless sessions.

**Architecture:** Keep the active model as run-scoped hook evidence, never a project pin. Separate on-disk package installation from effective host hook activation in diagnostics. Preserve the exact child participant fingerprint and private start/join token binding while adding only an authenticated mapping if a real Codex subagent hook event proves it is necessary.

**Tech Stack:** Node.js ESM, `node:test`, Codex PreToolUse command hook, JSON project setup.

**Spec:** [Defect #124](https://github.com/kburson/ai-peer-review/issues/124), including its mirrored Deep-Dive Analysis.

## Story Intent

- **Beneficiary:** Codex agent reviewing from a linked worktree
- **Capability:** use peer-review with verified current-model evidence for each operation
- **Need:** a headless agent can lose current-model hook delivery while a review is in progress
- **Value or failure prevented:** existing XPR work can continue without false identity or a project-wide model pin

## Global Constraints

- Do not modify ai-task-manager source or the #1841 review records.
- Do not pin provider, model, or effort in `.ai-peer-review.json`.
- Do not infer identity from a prior turn, a different session, or a generic command failure.
- Preserve foreign hooks and provide idempotent package-owned teardown.
- Rebuild and install locally after delivery; do not publish to npmjs.

## Task 1: Reproduce hook delivery and command recognition

**Files:** `test/integration/provider-conformance.test.mjs`, `bin/peer-review-codex-hook.mjs`, `src/providers/codex-hook.mjs`.

- [ ] Add a failing test that passes `npx --no-install peer-review doctor --json` and `npx --no-install peer-review start ...` through the real hook executable with a valid PreToolUse event. Assert a rewritten command and private start record, respectively.
- [ ] Run `node --test test/integration/provider-conformance.test.mjs`; retain the failing output.
- [ ] Share one command recognizer between the executable and capture module so the two cannot drift. Allow the direct binary spellings and the documented `npx --no-install` spelling with exact token boundaries; keep arbitrary shell prefixes rejected.
- [ ] Rerun the targeted test and assert the new spelling passes without changing existing direct-command behavior.

## Task 2: Diagnose installed versus effective hook scope

**Files:** `test/integration/setup-doctor.test.mjs`, `src/config/setup.mjs`, `src/cli/run.mjs`, `src/doctor.mjs`, `src/cli/help-data.mjs`.

- [ ] Add a linked-worktree fixture with one physical review worktree and a distinct effective primary-clone hook layer. Assert package installation health can pass while operation readiness reports unavailable current identity and an exact host-hook recovery.
- [ ] Run `node --test test/integration/setup-doctor.test.mjs` and capture the expected failure.
- [ ] Implement a read-only effective-host hook check using a supported host signal if available; if the host exposes no trustworthy signal, report activation as unverified and require a live hook probe before review startup. Make setup's reported scope and recovery precise. Keep the package setup/teardown ownership transaction idempotent and preserve unrelated hook entries.
- [ ] Rerun targeted setup and doctor tests; assert an inactive hook cannot be described as ready.

## Task 3: Preserve exact child identity for headless commands

**Files:** `test/integration/provider-conformance.test.mjs`, `test/integration/start-join.test.mjs`, `src/providers/codex-hook.mjs`, `src/identity/codex.mjs`, `src/cli/run.mjs`.

- [ ] Capture or reproduce the exact Codex headless hook event shape, including parent hook `session_id`, child `CODEX_THREAD_ID`, model, command, and tool-use ID. Write a failing test that demonstrates the mismatch for start/join and a separate current-model delivery test for submit/doctor.
- [ ] Run the two targeted tests and retain the failing output.
- [ ] Implement only the authenticated child binding supported by the observed event. Reject parent-only, stale, wrong-tool-use, or wrong-worktree observations. For ordinary commands, inject the current event model into that command only and retain the registered child session fingerprint.
- [ ] Rerun targeted tests, including a same-child-session model change. Assert no project config model field is consulted and an absent hook still refuses with actionable recovery.

## Task 4: Discovery, package verification, and delivery

**Files:** `skills/peer-review/SKILL.md`, `src/cli/help-data.mjs`, `README.md`, `test/golden/help.test.mjs`, package test goldens only where output intentionally changes.

- [ ] Add help and skill examples for direct and `npx --no-install` invocation, installation versus host activation diagnosis, same-session model changes, and safe continuation of an existing review. Add a named error recovery for unavailable current hook evidence.
- [ ] Run `node --test test/golden/help.test.mjs`, then update only intentional golden changes.
- [ ] Run `npm run lint`, `npm run format:check`, `npm test`, `npm run test:slow`, and `npm run test:packaging` on the final tree.
- [ ] Commit as `[#124] ...`, complete the governed Test and Review gates, open one PR, wait for CI, deliver, and close #124 through AITM.
- [ ] Build a local tarball, verify its SHA-256 and package contents, globally uninstall/install the tarball, and rebuild `ai-peer-review build broker-security`; do not publish to npmjs. Coordinate one safe #1841 retry only after the existing author process proves current-operation identity.

## Plan self-review

Every #124 acceptance criterion maps to Tasks 1 through 4. Task 3 remains evidence-gated: it forbids an unverified parent-to-child identity shortcut. The package can deliver an accurate activation diagnosis even if a host restart is required to make a new hook effective in an already-running headless session.
