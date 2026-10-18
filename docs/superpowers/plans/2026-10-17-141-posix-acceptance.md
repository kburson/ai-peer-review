# #141 Linux/macOS acceptance continuation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans inline. Follow native issue gates; no concurrent state mutations.

**Goal:** Reconcile and verify #141 for Linux/macOS, resolve actual in-scope defects, and close only after all surviving guarantees have genuine evidence.

**Architecture:** Keep the existing runtime and scanner. Add conservative platform attribution as a separate development diagnostic. Repair readiness fixtures and exact CI scope; retain source-class proof as a real independent gate.

**Tech Stack:** Node >=24, JavaScript ESM, ESLint AST, current AITM, GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-10-17-141-posix-acceptance-design.md` and the owner's direct continuation instruction.

## Global Constraints

- Linux/macOS only; Windows #213 indefinitely deferred, unscheduled and nonblocking.
- No historical report relabeling, broad analyzer rewrite or unsupported defect count.
- No uncertain-review/session operations or timing reconstruction.
- Original budgets 30000/15000/5000/800000ms and portable cap four.
- Host affected checks; hosted full suites with exact-source receipts.
- Current source-class conformance remains #141-owned and blocking when required evidence is absent.

## Review Focus

- An exported or escaped Windows-named helper still reachable on POSIX must not be excluded.
- A shared source file containing one Windows-only branch must retain all other findings.
- Listener readiness must not bypass owner publication/restoration.
- Detached native Test scope must refuse stale/missing local or remote refs.
- A data/classifier/fixture success must not imply real OS conformance or class admission.

### Task 1: Current platform analysis and governed requirements

**Files:** Create `scripts/analyze-posix-runtime.mjs`, `test/unit/posix-runtime-analysis.test.mjs`, `docs/superpowers/plans/2026-10-17-141-posix-analysis.md`; update exact standalone path declarations in `scripts/verify-extraction.mjs`, `provenance/extraction-manifest.json` and its test fixture. Reconcile live issue through `aitm issue-body`.

**Interfaces:** Consumes fresh `inspectPortableConsumerInventory({root,inventory})`; produces `attributeFindings({root,blockers})` with every input finding retained and a `possiblePlatforms` field. CLI output is analysis-only and never asserts graph acceptance.

- [ ] Write tests for literal Windows, Linux and macOS branches; shared calls; private Windows caller propagation; exported declaration/arrow; escaped callback; shadowed process; immutable alias; mutable alias; mixed source rows and unchanged row membership.
- [ ] Run `node --test test/unit/posix-runtime-analysis.test.mjs`; Expected: RED missing API.
- [ ] Implement the conservative postprocessor. For any unresolved test expression, retain all platforms. For exported/escaped functions, retain caller uncertainty. Keep all raw flags false and preserve the historical hash.
- [ ] Run the focused tests; Expected: GREEN. Run fresh CLI to retained scratch output; compare source hashes and input count.
- [ ] Publish current analysis and native deep dive. Replace live Scope/AC/VC sections with exact fresh-base operations, preserving protected markers and original immutable provenance. Leave unmet requirements unchecked.
- [ ] Commit `[#141] Reconcile POSIX requirements and current analysis` and native commit-trace.

### Task 2: Repair actual verification boundaries

**Files:** Modify `test/integration/broker-multiproject.test.mjs`, `test/helpers/suite-plan.mjs`, `test/unit/ci-native-build-policy.test.mjs`, `scripts/ci/verification-scope.mjs`, `scripts/ci/verify-project-receipts.mjs`, `test/unit/hosted-ci-receipts.test.mjs`.

**Interfaces:** Consumes runtime `runBroker({onReady})`; fixture `server.ready` resolves only from that callback. Exact #141 source branch is `feature/child/141`; eventual parent delivery branch is `codex/107-install-ready-package`.

- [ ] Retain RED baseline: 159 affected tests, 156 pass, three readiness failures. Add CI coverage/ref negative controls and run them RED.
- [ ] Change fixture `start` to install its handler only; add `onReady: resolveReady` and pass it in all four broker constructions. Do not edit production readiness guards.
- [ ] Include exactly `test/integration/broker-multiproject.test.mjs` in portable coverage. Keep unrelated native tests excluded.
- [ ] Add issue141 detached selection only with exact source branch plus source/local/published SHA equality. Add exact parent push scope with fork/tag/suffix negatives.
- [ ] Run affected POSIX files and focused CI tests; Expected: GREEN. Commit and native trace.

### Task 3: Conformance and terminal gates

**Files:** Retain fresh package/binding/analysis evidence under `.scratch/141-continuation` and `.scratch/peer-review`; no legacy evidence rewrites.

**Interfaces:** Consumes package/bind/source-class driver and native AITM evidence. Genuine conformance/approval is a prerequisite, not inferred from Task1 or Task2.

- [ ] Pack a fresh uniquely named candidate through the existing driver and bind its exact bytes. Expected: honest `verified:false` package/registration candidate; never approval.
- [ ] Resolve genuine current POSIX source-class capture and ordinary approval through compatible sanctioned authority. Refusals remain blockers; do not broaden activation or manufacture a normal-review record.
- [ ] One fresh independent whole-change review, then one evidence-backed fix pass if required. Keep declined claims explicit.
- [ ] Lint/format and exact-head hosted Linux/macOS full CI; authenticate every selected receipt and installed proof where applicable. No Windows allocations.
- [ ] Only after all required conformance and child mapping evidence is complete: native AC/Scope evidence, epic reconciliation/deliverable, Test, Review, Full-Auto approval, native delivery and Close. Expected: Closed/Done and stopped timer. If separate authority is needed, pause and report a concrete decision with #141 still incomplete.
