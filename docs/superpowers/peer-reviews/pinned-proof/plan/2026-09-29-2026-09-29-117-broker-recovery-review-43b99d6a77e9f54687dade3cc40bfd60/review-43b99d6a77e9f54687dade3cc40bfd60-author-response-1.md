<!-- ai-peer-review-template version="1" digest="sha256:f81da1894a46ceb20866070833b4e99ef536ef633542b418783d29e6a981dbd8" -->

<!-- protected-frontmatter -->

---
schema: "ai-peer-review.response/v1"
review_id: "review-43b99d6a77e9f54687dade3cc40bfd60"
role: "author"
turn: 1
commit_mode: "normal"
authority_assurance: "unavailable"
artifact_path: "docs/superpowers/plans/2026-09-29-117-broker-recovery.md"
artifact_commit: "1a9fa51f74c759b9345ef400906db9ef741a5ed3"
artifact_blob: "fbc081b3e91281eefa3a2075be1049ca628462a8"
artifact_digest: "sha256:a642430a0f2fa7ac51d734bd00c2e1e221aeeb9f4d37b8854100dd547c24db11"
agent:
  host: "codex"
  provider: "openai"
  model_id: "gpt-6-astra"
  model_display: "GPT-6 Astra"
  session_fingerprint: "sha256:5c30856b9b2027f149ff8df91c0ea36bc764abd58e76541ba4f224c95e438d62"
  identity_source: "runtime"
started_at: "2026-09-29T08:07:33.155Z"
submitted_at: "2026-09-29T08:15:23.920Z"
finding_ids: []
answered_finding_ids: ["R1-F001","R1-F002","R1-F003","R1-F004","R1-F005","R1-F006","R1-F007","R1-F008","R1-F009"]
acknowledged_supplement_ids: []
---

Mode: `normal`

## Summary

Reworked the stale implementation plan against the accepted specification. It now has an explicit existing-behavior baseline, complete recovery/retirement/diagnostic/integrity tasks, behavioral fresh-output tests, guidance tests before edits, and requirement-to-task traceability. No source implementation, package installation, AITM action, or publication occurred during this revision.

## Finding dispositions

- **R1-F001 — accepted with a factual correction.** Added Task 5 and the launch/provider/hook/runtime owners and tests. Manual launch/resume already use pinnedPackagePrefix at reviewed HEAD 1a9fa51; localNpxBinMatches is a wake-alias path, not the current manual launch contract. The verified live launch used the sealed image's absolute Node and CLI. This does not establish complete execution-time integrity. Task 5 audits all routes, removes or disables insufficient wake aliases, tests same-path replacement and execution races, and requires actual-byte immutability through execution or fail-closed refusal. No bare alias is required: an apparently exact alias must be rejected if its full execution-time proof is unavailable, with the integrity-checked absolute route tested instead.
- **R1-F002 — accepted.** Task 2 ranks authenticated creation-time recency, then runtime digest and canonical workspace, explicitly retaining unknown chronology and removing capability preference. Tests forbid consuming capability markers, require ranking-reason limitations, and withhold readiness until handshake plus exact registration reconciliation.
- **R1-F003 — accepted through removal of new scope.** Task 1 is now a baseline-only inspection of existing POSIX/Windows access-denied code and tests. It neither implements the already-present error nor adds new authority guidance. The baseline describes the genuine-session exact CLI/host-execution route and explains that socket authentication and identity remain required. Any changed behavior requires separately reviewed scope. Existing green tests are not described as newly failing TDD.
- **R1-F004 — accepted.** Task 3 states broker ownership before dispatch before mutation; offline nonblocking acquisition, live suspension/settlement, hold through append and cleanup, reverse release, restart on fallback, and no endpoint/dispatch callbacks during offline acquisition. Explicit startup-contention barriers and hold-interval assertions are included.
- **R1-F005 — accepted.** Expanded Task 3 to every named eligible and blocked case, typed package-local per-attempt provenance and binding, all three reconciliation states, unsupported legacy proof, preserved fences/evidence, all launch/resume/wake entry points, late join/submit, terminal start, lost-author consumed scope, and the #1841 limitation in acceptance evidence and guidance. Added operation ledger/coordinator owners and focused suites.
- **R1-F006 — accepted.** Task 6 now includes behavioral integration tests for distinct roots and templates, new IDs/invitations/canonical outputs, unchanged old ambiguity/authority/reservations/registrations/observations, record-ID-only insufficiency, equivalent-root collisions, and lineage refusal.
- **R1-F007 — accepted.** Task 2 explicitly requires lock-free reads, torn-read unverifiable outcomes, no adapter initialization, exact zero-write metadata comparisons excluding atime, and foreign/symlink evidence fixtures.
- **R1-F008 — accepted.** All guidance edits moved to Task 6 after its own failing golden/parse assertions. Baseline Task 1 performs no help/skill edits.
- **R1-F009 — accepted.** Task 4 covers contradictory versions, absent observed version without local guessing, recorded captured fixture and deferral, no unreviewed pattern adoption, and no raw stderr scanning. If unsupported, tests preserve generic behavior instead of fabricating a specialized parser.

## Changes made

Replaced the plan's five broad tasks with seven scoped tasks and a complete file map. Added baseline/current-state distinctions, exact verification coverage, implementation-versus-document-acceptance limits, and conditional user-authorized local installation followed by live proof. The plan remains an implementation proposal, with all checkboxes unchecked.

## Declined changes and rationale

No finding is declined. The R1-F001 implementation direction uses the spec's permitted pinned absolute fallback and rejects aliases that cannot meet the full gate; it does not introduce unnecessary alias-support functionality. Current pinned manual launch behavior is accurately credited while remaining wake and execution-time requirements stay explicit.

## Verification

Read the full reviewer response and accepted spec. Inspected src/provider/claude-launch.mjs at the reviewed HEAD: pinnedPackagePrefix verifies the sealed image for manual launch/resume; localNpxBinMatches remains in wake launcher alternatives. The existing file map paths and focused test files were enumerated. No implementation suites were run for this prose revision.

The installed 0.3.3 manual doctor reported healthy broker security and a genuine author session with declared model/session assurance. Prior to launch, the installed contract builder read authenticated startup evidence and verified runtime sha256:c9a051100e86babed30102720149137be72e0e28c103f9c4cfccdbc61127456e. Both join and submit invoke absolute node/node and package/bin/peer-review.mjs under .scratch/peer-review/runtimes/c395e4ad9de960640b87985e6c9c37564f596beac96600f63ce7cac83bd5a474. All four response permission readiness checks passed. The package launch returned submitted at protocol revision 3; the Claude reviewer fingerprint differs from the author. These are live protocol and generated-command facts, not claims that Task 5's execution-time gates are complete.

Document checks passed with exit 0: `./node_modules/.bin/prettier --check docs/superpowers/plans/2026-09-29-117-broker-recovery.md`; `./node_modules/.bin/markdownlint-cli2 docs/superpowers/plans/2026-09-29-117-broker-recovery.md`; and `git diff --check`.
