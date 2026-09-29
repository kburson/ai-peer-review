# Doctor Installation and Operation Readiness Implementation Plan

> **For agentic workers:** Use test-driven development for each behavior change. Work in the bound issue worktree and keep commits attributed to `[#122]`.

**Goal:** Let an operator check package installation without a pinned model while preserving strict current-operation review identity and mutable model/effort selection.

**Architecture:** `src/doctor.mjs` evaluates an explicit installation mode with only installation rows required. `src/cli/run.mjs` chooses that mode and renders truthful scope/recovery text. The existing provider hooks and `startup-request.json` remain the private per-operation authority; regression tests prove the same session can start another review with a new model and effort.

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

- [ ] Add failing tests: installation mode is healthy with package/skill/repository/scratch/broker checks passing and identity absent; manual stays unhealthy with identity absent; a missing broker fails installation mode.
- [ ] Add a failing parser assertion for `doctor --mode installation`.
- [ ] Run the targeted tests and confirm the intended failures.
- [ ] Implement the mode without changing review startup identity requirements.
- [ ] Run the targeted tests again.

## Task 2: Make doctor output truthful and discoverable

**Files:** `test/integration/setup-doctor.test.mjs`, `test/golden/help.test.mjs`, `test/golden/help/all.sha256.txt`, `src/cli/run.mjs`, `src/cli/help-data.mjs`, `README.md`.

- [ ] Add failing assertions that text says installation or session readiness and prints identity recovery when needed; a healthy broker row has no rebuild advice.
- [ ] Implement text rendering and help/examples for both scopes.
- [ ] Refresh the help golden only for intentional contract changes and rerun tests.

## Task 3: Protect mutable selection across starts

**Files:** `test/integration/provider-conformance.test.mjs`, `test/integration/start-join.test.mjs`; production only if the regression reveals a defect.

- [ ] Add a test with one provider session and two exact start-hook observations carrying different model IDs; assert independent token-named owner-only records and exact observations.
- [ ] Add a startup test that seals a changed reviewer effort for the later review without changing project config.
- [ ] Run both tests; fix only demonstrated failures.
- [ ] Run `npm test`, `npm run test:slow`, `npm run test:packaging`, `npm run lint`, and `npm run format:check`.

## Delivery

- [ ] Commit as `[#122] ...`, stamp/verify ACs, run the governed Test and Review gates, open one PR, wait for CI, deliver and close.
- [ ] After merge, pack and install the local tarball globally and rebuild the broker. Leave AITM setup untouched.
