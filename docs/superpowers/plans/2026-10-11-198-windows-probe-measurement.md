# #198 Windows probe measurement implementation plan

> **For agentic workers:** Use executing-plans inline. Do not delegate implementation.

**Goal:** Supply honest attributable probe counts and downloaded hosted evidence for #190's performance decision.

**Architecture:** Passive adapters forward real stock calls; a pure bounded core produces unverified public data. Separate hosted ordinary/limited workers install the immutable candidate. Authenticated download verifiers enforce actual provenance and native CI gates.

**Tech Stack:** Node24+, stock Windows PowerShell, GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-10-11-198-windows-probe-measurement-design.md`

## Scope

Implement standalone #198 diagnostics and its receipt support. Do not change #171 product code, #190 review state or fixed candidate bytes.

## Plan Metadata

- Priority: P0
- Size: S
- Estimate: 4 base human hours before rubric

## Story Intent

- **Beneficiary:** release evidence operator
- **Capability:** distinguish repeated stock Windows starts in actual protected guard and original operation lifetimes
- **Need:** complete primary registration exceeds its fixed budget and existing timings lack attributable repeat counts
- **Value or failure prevented:** reject unsupported performance repairs before weakening observation or claiming complete recovery

## Global Constraints

- Fixed candidate40a3e279d551719416eb750974fe30d011d6a37a; diagnostic producer HEAD is separate.
- Production budgets30000/15000/5000ms unchanged; test ceiling800000ms.
- Actual object identities; ambiguous data grants zero savings.
- No caches, native builds, fake identities, loaded source transforms or private material in public artifacts.
- Host affected tests only; full suites actual hosted CI.
- All reports verified:false, operationalAuthority:unavailable.

## Review Focus

- Concurrent unrelated queries cannot be assigned to another guard.
- Descriptor reuse and equal paths cannot merge guard lifetimes.
- Failed query or stat cannot become a removable repeat.
- Public output rejects extra/private fields and false authority.
- Actual job failure, expired artifacts or wrong merge tree cannot count as accepted evidence.

## Implementation Tasks

### Task 1: Passive bounded attribution

**Files:** Create `test/helpers/windows-probe-measurement-core.mjs`, `test/helpers/windows-probe-measurement-preload.mjs`, `test/unit/windows-probe-measurement.test.mjs`.

**Interfaces:** `createProbeMeasurement({limit})` supplies `begin`, `complete`, `registerGuard`, `checkGuard`, `closeGuard`, `report`. Real objects stay in WeakMaps; output contains closed numbers/categories only.

- [ ] Write tests using distinct actual objects, signals, overlapping queries, failed checks, closed/reused descriptors and bounded overflow. Assert only successful unambiguous repeats are removable.
- [ ] Run `node --test test/unit/windows-probe-measurement.test.mjs`; observe missing-module RED.
- [ ] Implement the bounded core and adapters forwarding original functions and original promises, with private fixed-source callsite matching.
- [ ] Run the same command; expect all tests PASS and no skips. Inspect public projection for private fields.
- [ ] Commit `[#198] Attribute passive stock probes to real guard lifetimes`.

### Task 2: Genuine collection and downloaded validation

**Files:** Create `test/helpers/windows-probe-measurement-ci.mjs`, `test/helpers/windows-limited-probe-measurement.ps1`, `.github/workflows/windows-probe-measurement.yml`, `scripts/ci/verify-windows-probe-measurement.mjs`. Extend Task1 tests for provenance/privacy/schema validation.

**Interfaces:** Closed `ai-peer-review.windows-probe-measurement/v1` reports; actual immutable candidate and producer, four unique Node/token jobs, unverified categories and zero guaranteed saving. Verifier consumes real GitHub API and freshly downloaded artifacts.

- [ ] Add RED fixtures rejecting extra fields, wrong pins, failed/missing/duplicate workers and positive invented savings.
- [ ] Implement separate checkout/actual package install, real profile ordinary/limited execution and sanitized output. Keep raw logs private.
- [ ] Implement exact actual API/run/head/job/artifact verification; report conservative residual counts and required saving threshold.
- [ ] Run affected tests and static workflow checks; commit `[#198] Collect actual Windows probe lifetimes in CI`.
- [ ] Push and create/attach draft PR to trunk; inspect actual four collection jobs and download evidence. Failed runtime outcome remains explicit.

### Task 3: Native hosted receipts and delivery

**Files:** Create `scripts/ci/run-receipt.mjs`, `scripts/ci/verify-receipts.mjs`; modify `.github/workflows/ci.yml` and `.ai-task-manager/task-tracker.json`; add meaningful receipt verifier tests.

**Interfaces:** Genuine actual-command receipts bind source tree, head, run, attempt, job, command, status and retained log hash. Native provider maps npm test/slow to successful actual hosted receipts.

- [ ] Add RED tests for wrong source tree, wrong command/run, nonzero exits and incomplete worker inventories.
- [ ] Wrap actual existing fast/slow CI commands; upload their actual logs/receipts even on failure. Keep native build exclusion and800000ms ceiling.
- [ ] Implement authenticated download verifier, exact local tracked tree/head match and all required CI job success. Configure existing native provider; do not run full host suites.
- [ ] Run affected tests, lint, format and diff checks. Commit `[#198] Consume hosted test receipts for standalone delivery`.
- [ ] Obtain green exact-head CI and genuine collection collateral. Run native verification, stamp each AC/DoD separately and obtain fresh whole-branch review; deliver through public native gates.
- [ ] Resume blocked #190 only after #198 is native Done; add actual measurement findings to the pending normal design revision without inventing saved time.
