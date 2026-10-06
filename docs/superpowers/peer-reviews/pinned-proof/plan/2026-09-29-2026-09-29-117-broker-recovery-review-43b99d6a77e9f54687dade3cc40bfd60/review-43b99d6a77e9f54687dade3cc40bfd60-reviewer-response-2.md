<!-- ai-peer-review-template version="1" digest="sha256:78e9a634af9d540baaf6790db82952eaf39cf7ab59a6cdc7938319ae07a4cbed" -->

<!-- protected-frontmatter -->

---
schema: "ai-peer-review.response/v1"
review_id: "review-43b99d6a77e9f54687dade3cc40bfd60"
role: "reviewer"
turn: 2
commit_mode: "normal"
authority_assurance: "unavailable"
artifact_path: "docs/superpowers/plans/2026-09-29-117-broker-recovery.md"
artifact_commit: "fb69dc911e0ac9bf5ea7dcc8140277581a1ff5db"
artifact_blob: "af140324d6e3beb73fbfe78ad8dcea1e976b6c1f"
artifact_digest: "sha256:3a8281ec90154a6723b15beb3febdd9bebc0aa93028fa88064365c3af69ca3bf"
agent:
  host: "claude-code"
  provider: "anthropic"
  model_id: "claude-opus-5-5"
  model_display: "claude-opus-5-5"
  session_fingerprint: "sha256:dc9c2018cf6fe91df2b70e4b78e3a4dea131ca588375796be5c9752a715453d9"
  identity_source: "runtime"
started_at: "2026-09-29T08:08:59.830Z"
submitted_at: "2026-09-29T08:17:11.994Z"
finding_ids: ["R2-F001","R2-F002","R2-F003"]
answered_finding_ids: []
acknowledged_supplement_ids: []
---

Mode: `normal`

## Summary

I re-reviewed the revised plan at `fb69dc9` against the accepted spec, the author's response to round 1, and the source tree. All nine round-1 findings are resolved:

- **R1-F001 (launch-integrity gate).** New Task 5 covers every case in spec Verification item 6. It rejects aliases that cannot meet the full execution-time proof and falls back to the integrity-checked absolute route. The spec permits this ("use exact absolute Node plus pinned CLI paths … instead"). I checked the author's factual correction. At `src/provider/claude-launch.mjs:486-490`, manual `join`/`submit` use `pinnedPackagePrefix` (`:38-56`), which verifies the sealed image. The realpath-only `localNpxBinMatches` (`:198-212`) is reached only through `wakeLaunchers` (`:217-239`). The correction is accurate.
- **R1-F002 (ranking).** Task 2 now ranks by recency, then runtime digest, then canonical workspace. It keeps unknown chronology explicit, prohibits capability markers, requires the ranking-reason limitation, and withholds readiness until the handshake and exact registration reconciliation. The #1841 labeling matches the spec.
- **R1-F003 (unspecified socket-access scope).** Task 1 is now a read-only baseline. It adds no new access-denied scope and names `posix.cc` and `windows.cc`. It correctly states that already-green tests are not TDD evidence. The recovery wording matches the existing assertion at `test/golden/help.test.mjs:166`.
- **R1-F004 (lock order).** Task 3 now states the full order: broker ownership, then dispatch exclusion, then the review mutation lock. It includes the offline nonblocking try-lock, live suspension and settlement, the hold interval, reverse release, restart on fallback, no callbacks during acquisition, and an abandon-versus-broker-startup barrier.
- **R1-F005 (test coverage).** Task 3 now lists every eligible and blocked case from spec Verification items 2 and 3. It adds the typed pre-dispatch receipt with its closed reasons and bindings, the three reconcile states, and exclusion across all entry points. It also covers late join/submit, terminal `start`, lost-author consumed scope, and the #1841 limitation.
- **R1-F006 (fresh-output route).** Task 6 adds behavioral tests for distinct roots and templates, record-ID-only insufficiency, equivalent-root collisions, and lineage refusal.
- **R1-F007 to R1-F009.** Task 2 now has the lock-free, torn-read, zero-write, and foreign/symlink assertions. All guidance edits now come after their failing assertions in Task 6. Task 4 adds contradictory data, the no-guessed-version rule, deferral in acceptance evidence, and the ban on unreviewed patterns.

Every new path in the File Map exists in the tree. This includes `src/provider/manual-launch-ledger.mjs`, `src/coordinator/ledger.mjs`, `src/broker/ownership.mjs`, and the new focused test files (`test/unit/broker-registry.test.mjs`, `test/unit/manual-launch-ledger.test.mjs`, `test/unit/claude-wake-permissions.test.mjs`, `test/unit/claude-hook.test.mjs`, `test/integration/claude-launch-permissions.test.mjs`, `test/integration/coordinator-wake.test.mjs`). The traceability table maps each spec verification item to a task, and I found no remaining uncovered requirement that would make the plan unsafe to execute.

Three small gaps remain. They are optional suggestions: the implementer can close them without another review round.

## Findings

None.

## Required changes

None.

## Optional suggestions

### R2-F001 — Name the concrete unpinned wake and fallback launchers in Task 5

Location: Task 5, first and fifth steps; Baseline section, second paragraph.

Task 5 correctly tells the implementer to inventory "all wake/execution permission alternatives, including `localNpxBinMatches` and any bare aliases in `src/providers/claude.mjs`." At `1a9fa51`, three routes relevant to spec Verification item 6 sit in `src/provider/claude-launch.mjs`, not `src/providers/claude.mjs`:

1. `wakeLaunchers` (`:218-221`) always permits a bare `['peer-review']` launcher. It does no check at all, not even the realpath check.
2. The first wake launcher is `[process.execPath, <currently running package>/bin/peer-review.mjs]` (`:219`). That is the executing package, not the review's sealed pinned image. A wake after an upgrade would therefore authorize a different runtime than the review's own.
3. `packageCommand` (`:58-61`) falls back to `[process.execPath, PACKAGE_BIN]` when `runtimeImage` is absent (`:486-488`). So "manual launch/resume already use `pinnedPackagePrefix`" holds only when a runtime image is supplied.

Name these three routes explicitly in the Task 5 inventory, and add a failing case for each: bare wake alias, current-process wake launcher after an upgrade, and manual launch without a runtime image. That way the step "Remove/disable insufficient wake-alias permissions or replace them with exact pinned commands" has concrete targets. Also qualify the Baseline sentence to say pinning applies when a sealed runtime image is present.

### R2-F002 — Add a regression test that retirement cannot go through intervention

Location: Task 3, first and third steps.

The spec says: "Existing intervention-required abandonment retains its separate authority contract; this extension must not route an ineligible unjoined review through intervention to bypass these checks." The plan does not mention intervention. Today `src/protocol/reducer.mjs:43-69` has no `awaiting-reviewer → intervention-required` transition, so the bypass cannot be reached now. The risk is regression: Task 3 changes protocol abandonment. A single blocked case would lock this in. It should assert that an ineligible `awaiting-reviewer` review cannot enter `intervention-required` or reach `abandoned` through the intervention route. `help-data.mjs:81` already lists both abandonment states, so the guidance assertions in Task 6 could also check that the two contracts are described separately.

### R2-F003 — Small spec-trace items to add to existing steps

Location: Task 3, fifth step; Task 6, third step; Task 2, first step.

These spec sentences are not yet named anywhere in the plan:

1. Spec "Reconciliation and the #1841 route": reconcile observation must also run "for already fenced recovery-only workspaces." Add that fixture to Task 3's reconciliation tests.
2. Spec "CLI and agent guidance": help "must avoid saying that an unjoined review was never launched merely because the broker journal lacks a provider operation." Add this negative assertion to Task 6's golden list. Task 3 already covers the behavioral side through its `provider_operation: null` blocked case.
3. Spec "Recovery authority": status enumerates interrupted journals at both the `authority` and `manual` stages. Task 2 names only "authority journal before registration". Add an interrupted `manual`-stage journal fixture.

## Decision

accepted
