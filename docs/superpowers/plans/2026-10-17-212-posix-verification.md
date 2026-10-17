# Explicit POSIX verification #212 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans inline. The human approved this concrete bounded design before this plan was transcribed; no new design approval or execution choice is needed.

**Goal:** Verify #190 on Linux/macOS with truthful scope and preserve all-platform defaults elsewhere.

**Architecture:** One CI-only closed scope resolver supplies workflow matrices and the native project gate. Existing receipt validators continue binding every lane to source, run, attempt, runtime, fingerprint, inventory and log. The scoped report requires its actual matching workflow scope job and all seven selected receipt workers.

**Tech Stack:** Node ESM, GitHub Actions, js-yaml, node:test, native AITM.

**Spec:** docs/superpowers/specs/2026-10-17-212-posix-verification-design.md

## Story Intent

- **Beneficiary:** maintainer verifying the approved correction on Linux and macOS
- **Capability:** obtain explicit platform-scoped CI receipts retaining every selected verification check
- **Need:** Windows is explicitly deferred and current workflows unconditionally schedule it
- **Value or failure prevented:** avoid false all-platform acceptance and allow trustworthy POSIX verification

## Global Constraints

- Four elapsed hours: start2026-10-17T07:33:22Z; deadline2026-10-17T11:33:22Z, including pause and all waits.
- Existing branch codex/190-installed-journeys and existing209 worktree; no new checkout or reset.
- Exact #190 push/PR/manual must schedule zero Windows workers; others default all.
- Keep original800000ms lane/control budgets, portable cap4, installed timeout20min and cap4.
- Preserve uncertain review2bdf/Claude1c82, runtime98/selection and all provider/consumer state.
- No product runtime edits, native binary downloads/builds, all-platform/release claims or application implementation.

## Review Focus

- A PR head ref differs from merge ref: use actual source branch and source SHA.
- Manual all input on #190 must not reactivate Windows.
- A Linux/macOS job subset from another scope must fail the default all verifier.
- Skipped Windows declarations are not executed workers; any scheduled Windows job fails the scoped gate.
- Native provider selection must keep all-platform requirements for unrelated branches.

### Task 1: Safe workflow scope

**Files:** scripts/ci/verification-scope.mjs; .github/workflows/ci.yml; .github/workflows/installed-portable-journeys.yml; test/unit/hosted-ci-receipts.test.mjs.

**Interfaces:** `resolveVerificationScope({eventName,branch,requestedScope='all'})` returns all|linux-macos; `scopePlatforms(scope)` returns the literal runner list. Workflow scope job emits scope and os outputs; dependent jobs consume them.

- [ ] Write table tests for #190 push/PR/manual and other branch/trunk/manual defaults; expand parsed workflow jobs with real resolver output, including standalone Windows if conditions and exact six plus phase2/four installed workers. Mutate/drop Windows gates in expansion fixture to prove failure.
- [ ] Run `node --test test/unit/hosted-ci-receipts.test.mjs`; Expected: fail because the resolver and workflow scope do not exist.
- [ ] Implement closed resolver validation and scope-job CLI using context environment, never interpolate untrusted branch into shell code. Use output os JSON for two CI matrices and installed matrix; gate all three standalone Windows job types before strategy expansion. Add choice input all/linux-macos default all. #190 branch takes precedence over manual all.
- [ ] Run affected tests; Expected: pass zero-Windows expansions and unchanged ordinary defaults. Format and commit `[#212] Select explicit POSIX workflow scope`.

### Task 2: Honest scoped evidence

**Files:** scripts/ci/verify-receipts.mjs; test/unit/ci-receipts.test.mjs.

**Interfaces:** `workers(scope='all')`, `verificationLanes(mode='all',scope='all')`, `verifyCloudReceipts({projectDir,mode,scope='all'})`. CLI accepts optional --lane fast|slow and --scope all|linux-macos. The project native entry selects scope from actual branch through the resolver.

- [ ] Add tests asserting literal seven POSIX identities, five complete lanes for each and unchanged37 all-platform identities. Require matching scope job, reject missing/duplicate selected workers/lanes, successful wrong scope, running Windows, stale/duplicate/expired artifact and unchanged lane mutation checks. Exercise orchestration with controlled external GitHub transport only; pure validation remains real.
- [ ] Run `node --test test/unit/ci-receipts.test.mjs`; Expected: fail because scope is ignored or unsupported.
- [ ] Filter only explicit selected workers, validate closed scope before IO, validate matching successful scope job and no executed Windows job for POSIX. Preserve all current lane validation and exact-source run-selection behavior. Return scope and Windows deferred/unverified. Keep default all API and CLI semantics.
- [ ] Run both affected files; Expected: pass. Commit `[#212] Bind receipts to declared platform scope`.

### Task 3: Native gate and authentic hosted proof

**Files:** .ai-task-manager/task-tracker.json; scripts/ci/verify-project-receipts.mjs; test/unit/hosted-ci-receipts.test.mjs; governed VC2 and Plan Metadata for #190/#212.

**Interfaces:** project wrapper obtains actual Git branch and calls verifier with resolved scope. Provider classification `test-cloud-declared-platforms` replaces misleading full-only classification; declared npm coverage refers to it. Other branches select all.

- [ ] Add failing native-policy tests for branch-specific scope selection and actual provider command/classification binding. Run affected tests; Expected: missing wrapper or old provider wiring fails.
- [ ] Implement wrapper and explicit provider wiring. Amend issue VC2 through native issue-body and document scope/Windows deferral in Plan Metadata, without stamping any evidence before execution.
- [ ] Run affected tests plus full lint/format and full npm test on clean committed source. Expected: zero failures; preserve honest original skips.
- [ ] Conduct one fresh independent Astra high whole-change review before publish; fix only Critical/Important once with RED/GREEN, defer minors in ledger. No automatic re-review.
- [ ] Confirm event expansion proves zero Windows before push, publish approved existing source branch and observe actual GitHub job inventory. Collect authentic exact-head seven-worker receipt and four installed-worker proof. No live optional probe. Native Develop-final and Test only on exact clean head using approved scoped provider.
- [ ] Stop on verified scope or original deadline; save checkpoint with source/run/attempt/status and remaining items, notify owning #40 chat, pause timer. Do not advance Review/approve/Close/merge or install/select consumer here.

## Review and authority

Human approval is direct message01a148c7-496a-7462-b23d-1c84c515c035 in owning chat01a14554-367b-7413-92a0-08dc0286fb9e, verified through read_thread. The approved proposal already covers these interfaces and scope; inline transcription does not reopen that design decision. Fresh code review is distinct from sealed #40 XPR acceptance. This prerequisite does not recertify #143/#157 or all #190 behavior.
