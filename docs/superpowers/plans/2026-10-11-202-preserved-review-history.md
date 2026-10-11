# Preserved review history implementation plan

> **For agentic workers:** Use superpowers:executing-plans inline. Root is the sole implementer. Steps use checkbox syntax.

**Goal:** Preserve obsolete review attempts without blocking current migration or granting them execution authority.

**Architecture:** An account-private clone catalog measures exact scratch targets and records explicit history or temporary holds. Inventory and effect admission consume that catalog; primary-only maintenance owns creation and release.

**Tech Stack:** Node 24+, existing protected storage and clone admission, SHA-256, Node test runner.

**Spec:** `docs/superpowers/specs/2026-10-11-202-preserved-review-history-design.md`

## Global Constraints

## Story Intent

- **Beneficiary:** Review operators upgrading existing clones
- **Capability:** Preserve obsolete attempts as non-executable history and checkpoint current reviews safely during migration
- **Need:** Migration currently cannot distinguish preserved obsolete activity from current review authority and demands settlement before its own recovery tools can run
- **Value or failure prevented:** Prevent permanently blocked upgrades without losing evidence or granting historical attempts current execution authority

## Global Constraints

- Preserve all original target bytes, uncertain launches and participant identity.
- No automatic historical classification from age, filename or issue state.
- Current selected installation executes; retained images remain evidence.
- Keep activated-primary guards for normal operations and new reviews.
- Host affected/TIA only; full hosted CI with genuine receipts. No native CI builds or deadline increases.

## Review Focus

- A history entry must never authorize reviewer/provider execution.
- A held current review must retain its sealed identity and uncertainty.
- Catalog tampering, changed target bytes or replaced parents must refuse.
- Passive scratch reports and prunable empty worktrees must not acquire review authority.
- Concurrent maintenance and nested effects must revalidate inside existing clone exclusion.

### Task 1: Measure and preserve exact historical targets

**Files:** Create `src/config/review-history.mjs` and focused `test/unit/review-history.test.mjs`; modify primary inventory.

**Interfaces:** Consume actual discovered clone/worktree paths. Produce `preserveReviewHistory`, `readReviewPreservation`, `assertReviewNotPreserved`, and snapshot validation used by maintenance and effect guards.

- [ ] Write tests that create a real disposable Git clone and obsolete scratch target. Verify dry-run, exact unchanged target bytes and read-back catalog; then mutate a target byte and expect refusal.
- [ ] Run `node --test test/unit/review-history.test.mjs`; expected RED before the new exports exist.
- [ ] Implement bounded streaming snapshots and protected, closed-schema private records; never follow link targets or accept caller digests.
- [ ] Re-run the targeted command; expected GREEN, including wrong clone/path, unsafe record and symlink controls.
- [ ] Commit the catalog and tests with `[#202]` attribution.

### Task 2: Integrate explicit maintenance and execution exclusion

**Files:** Primary maintenance/operations/inventory, CLI parse/help/run dispatch, startup authority fence, affected primary tests.

**Interfaces:** Consume Task1 protected catalog. Produce native preserve-history/hold-review/release-review command paths, inventory exemptions for exact validated snapshots, and effect refusal for history or held reviews.

- [ ] Add regression cases that assert `inspectPrimaryReviewInventory` rejects an obsolete unfinished review before explicit preservation and succeeds after preservation without rewriting the review.
- [ ] Add hold tests: `assertReviewNotPreserved(commonDir, workspace)` refuses while held; release refuses without activated primary; released records retain history and permit ordinary guards.
- [ ] Run affected tests; expected RED against unchanged inventory/dispatch.
- [ ] Integrate catalog reads before inventory authority checks and before nested effects. Keep unknown entries blocked; hash passive top-level files. Preserve prunable entries only when their review scratch is absent.
- [ ] Update finite CLI argument/flag validation and help together. Release must use actual current primary integration.
- [ ] Run focused history, primary setup/authority and CLI help tests; expected GREEN. Run lint, formatting and extraction checks.
- [ ] Commit the integration and tests with `[#202]` attribution.

### Task 3: Hosted verification and real upgrade recovery

**Files:** Installation documentation and retained `.scratch/202-delivery` evidence.

**Interfaces:** Consume committed Task2 implementation and genuine hosted receipts. Produce delivered installed package, verified preservation and migrated primary, then same-recorded-session #190 resume.

- [ ] Document history versus holds, exact native commands and refusal/recovery semantics.
- [ ] Push a draft PR, complete whole-branch review, fix significant findings through RED→GREEN, and obtain exact-head hosted CI receipts.
- [ ] Use native AITM Test, Review, approval, delivery reconciliation and Close. Do not run host full suites or standard Test-stage restamping that launches them.
- [ ] Pack/install the delivered runtime outside Git and perform its ordinary documented installation bootstrap.
- [ ] Inspect native preservation dry-runs for proven obsolete paths; apply history records and a separate hold for the genuine pending #190 review. Preserve every original byte and unknown outcome.
- [ ] Register/migrate/commit/activate primary through supported workflow, release only the genuine pending hold, and resume its original reviewer using the exact native command. Historical attempts remain excluded.
- [ ] Record actual outcomes, retain failures and continue #190/#107; migration success alone does not complete either story.
