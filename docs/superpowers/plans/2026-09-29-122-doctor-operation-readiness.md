# Doctor Installation and Operation Readiness Implementation Plan

> **For agentic workers:** Use test-driven development for each behavior change. Work in the bound issue worktree and keep commits attributed to `[#122]`.

**Goal:** Let an operator check package installation without a pinned model while preserving strict current-operation review identity and mutable model/effort selection.

**Architecture:** `src/doctor.mjs` evaluates an explicit installation mode with only installation rows required. `src/cli/run.mjs` chooses that mode and renders truthful scope/recovery text. Setup installs the existing provider start hooks with exact ownership and reversible teardown. Hook records and `startup-request.json` remain private per-operation authority; regression tests prove the same session can start another review with a new model and effort.

**Tech Stack:** Node.js ESM, `node:test`, peer-review hook/startup fixtures.

**Source:** [Defect #122](https://github.com/kburson/ai-peer-review/issues/122) and its mirrored deep dive.

## Constraints

- No provider, model, or effort pin in `.ai-peer-review.json`.
- Keep manual, resume-only, and automatic-required readiness strict; installation mode never authorizes review startup.
- Do not infer a current model/effort from a prior turn or another session.
- Reuse owner-only scratch startup/hook records and preserve sealed reviewer intent.
- Do not edit AITM or publish to npmjs.

## Task 1: Separate installation diagnosis

**Files:** `test/integration/setup-doctor.test.mjs`, `test/unit/cli-parse.test.mjs`, `src/doctor.mjs`, `src/cli/parse.mjs`, `src/cli/run.mjs`.

- [x] Add failing tests: installation mode is healthy with package/skill/repository/scratch/broker checks passing and identity absent; manual stays unhealthy with identity absent; a missing broker fails installation mode.
- [x] Add a failing parser assertion for `doctor --mode installation`.
- [x] Run the targeted tests and confirm the intended failures.
- [x] Implement the mode without changing review startup identity requirements.
- [x] Run the targeted tests again.

## Task 2: Make doctor output truthful and discoverable

**Files:** `test/integration/setup-doctor.test.mjs`, `test/golden/help.test.mjs`, `test/golden/help/all.sha256.txt`, `src/cli/run.mjs`, `src/cli/help-data.mjs`, `README.md`.

- [x] Add failing assertions that text says installation or session readiness and prints identity recovery when needed; a healthy broker row has no rebuild advice.
- [x] Implement text rendering and help/examples for both scopes.
- [x] Refresh the help golden only for intentional contract changes and rerun tests.

## Task 3: Protect mutable selection across starts

**Files:** `test/integration/provider-conformance.test.mjs`, `test/integration/start-join.test.mjs`; production only if the regression reveals a defect.

- [x] Add a test with one provider session and two exact start-hook observations carrying different model IDs; assert independent token-named owner-only records and exact observations.
- [x] Add a startup test that seals a changed reviewer effort for the later review without changing project config.
- [x] Run both tests; fix only demonstrated failures.
- [x] Run `npm test`, `npm run test:slow`, `npm run test:packaging`, `npm run lint`, and `npm run format:check`.

## Task 4: Wire the run-scoped provider observation

**Files:** `src/config/setup.mjs`, `src/providers/{codex,claude}-hook.mjs`, `bin/peer-review-{codex,claude}-hook.mjs`, `test/integration/setup-doctor.test.mjs`, `test/integration/provider-conformance.test.mjs`.

The regression investigation found that the package had exact start hooks but setup did not install them. Add a provider-owned `PreToolUse` hook for Codex and Claude, preserve foreign host hooks, back up modified host files, and remove only the exact package-owned hook during teardown. Recognize both `peer-review` and installed `ai-peer-review` CLI spellings. The hook supplies the current model to later CLI commands so project model identity can be ignored; exact start records remain private and operation-scoped. Fail closed when owned hook evidence changes unexpectedly.

## Delivery

- [ ] Commit as `[#122] ...`, stamp/verify ACs, run the governed Test and Review gates, open one PR, wait for CI, deliver and close.
- [ ] After merge, pack and install the local tarball globally and rebuild the broker. Leave AITM setup untouched.
