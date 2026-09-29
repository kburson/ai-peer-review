# Issue 117 Broker Recovery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task by task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Recover mixed-runtime XPR brokers safely, retire only provably unsubmitted unjoined attempts, and make broker access and Claude launch failures actionable without weakening review authority.

**Architecture:** Keep the project broker's owner-only cache, lock, authenticated socket, and per-review pinned runtime authoritative. Add read-only recovery discovery and exact-operation evidence before any state transition. Treat a sandbox-denied socket as an access failure with a scoped host-execution recovery action; never relocate authority to a world-writable path or retry a provider launch from an ambiguous outcome.

**Tech Stack:** Node.js ESM, native broker-security addon, `node:test`, existing protocol store and broker registry, JSON Schema, AITM-governed issue #117.

**Spec:** `docs/superpowers/specs/2026-09-29-117-broker-recovery-design.md`

## Story Intent

- **Beneficiary:** an XPR operator recovering an interrupted review
- **Capability:** identify an authenticated compatible broker route and safely retire an unjoined attempt when non-submission is proven
- **Need:** mixed pinned images and incomplete launch evidence currently leave the broker offline and the review unable to progress
- **Value or failure prevented:** a fresh review can start without deleting evidence, relaunching an uncertain provider request, or misrepresenting reviewer participation

## Global Constraints

- Work only under governed defect #117 after Plan approval and promotion to Develop. Preserve the AITM #1841 workspaces and hook files.
- The reviewer provider, model, and effort stay sealed. A generic nonzero exit, missing output, hook denial, or absent join never proves refusal or non-submission.
- Keep cache authority and each review's pinned runtime digest. A socket endpoint may be configured only through the existing validated endpoint-root contract; no broad sandbox bypass, copied metadata, or manual protocol edits.
- Retain every registration, reservation, launch record, and Claude session observation on a refused or ambiguous recovery path.
- Write a focused failing test before each production change. Use disposable fixtures and no paid provider calls in unit or integration suites.
- Commit with `[#117]` attribution only in Develop or later. Run the issue's verification commands and packaging gates before local global installation. Never publish to npmjs.

## File Map

| Area                                  | Existing owner                                                                                                         | New or extended tests                                                                              |
| ------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Broker access and startup error       | `native/broker-security/posix.cc`, `src/broker/client.mjs`, `src/broker/platform.mjs`                                  | `test/unit/broker-build.test.mjs`, `test/integration/broker-startup.test.mjs`                      |
| Offline candidate discovery           | `src/broker/registry.mjs`, `src/broker/client.mjs`, `src/cli/run.mjs`                                                  | `test/integration/broker-upgrade.test.mjs`, `test/integration/broker-startup.test.mjs`             |
| Exact launch and retirement authority | `src/broker/launch.mjs`, `src/provider/claude-launch.mjs`, `src/protocol/service.mjs`, `src/cli/run.mjs`               | `test/integration/broker-release.test.mjs`, `test/integration/supersession-lineage.test.mjs`       |
| Claude diagnostics                    | `src/provider/claude-launch-diagnostics.mjs`, `src/provider/claude-launch.mjs`, `schemas/claude-launch-result-v1.json` | `test/unit/claude-launch-classifier.test.mjs`, `test/integration/claude-launch-bootstrap.test.mjs` |
| Agent-facing guidance                 | `src/cli/help-data.mjs`, `src/errors.mjs`, `skills/peer-review/SKILL.md`                                               | `test/golden/help.test.mjs`, `test/unit/cli-parse.test.mjs`                                        |

## Task 1: Diagnose and classify broker socket access

**Interface:** An OS `EACCES` or `EPERM` while connecting to the authenticated broker endpoint yields a bounded `APR_BROKER_ACCESS_DENIED` result with a scoped host-execution recovery action. Authentication, version, ownership, stale endpoint, and refusal errors keep their existing classifications. `start` must not turn that access denial into a blind detached spawn or generic `APR_INTERNAL`.

- [ ] Add a failing native/platform fixture in `test/unit/broker-build.test.mjs` for a denied Unix socket connection. Assert the stable code and bounded recovery text; keep the underlying path and metadata private.
- [ ] Add a failing broker-startup test that injects an access-denied connect result and asserts no second broker spawn, no registration or review workspace, and no provider call.
- [ ] Run `node --test test/unit/broker-build.test.mjs test/integration/broker-startup.test.mjs` and record the expected failures.
- [ ] In `native/broker-security/posix.cc`, map only `EACCES` and `EPERM` from `connect()` to the new stable access code. Propagate it through the existing `AprError` boundary without changing the authenticated handshake.
- [ ] In `src/broker/client.mjs`, preserve that terminal code and its actionable recovery; never classify it as absent discovery or a launchable dead owner.
- [ ] Run the two focused tests again. Rebuild the native helper with `ai-peer-review build broker-security` before running the native integration case.
- [ ] Update `help broker`, `explain APR_BROKER_ACCESS_DENIED`, and the peer-review skill with the exact scoped host-tool access route. State that a headless participant still needs genuine session identity and that a parent invoking the CLI with a copied child ID is invalid.

## Task 2: Discover and reconcile mixed pinned runtimes

**Interface:** `broker status --json` remains read-only and returns every verifiable recovery candidate plus bounded unverifiable records. `broker reconcile <workspace>` selects the exact pinned image for that candidate and proves an authenticated handshake; a worker for another image is recovery-only with zero launch/resource acquisition.

- [ ] Add failing mixed-image fixtures to `test/integration/broker-upgrade.test.mjs` and `test/integration/broker-startup.test.mjs`. Cover same package version with different runtime digests, advisory ranking, a journal without registration, malformed evidence, and zero status writes.
- [ ] Run those two test files and confirm the failures are about the missing candidate projection and startup behavior.
- [ ] Extend `src/broker/registry.mjs` to inspect sealed startup authority, registration, journal, and runtime-image verification without mutation. Rank candidates by proven mixed-image recovery support, then authenticated chronology, then digest/path; represent unknown chronology explicitly.
- [ ] Extend `src/cli/run.mjs` broker status and reconcile projection with complete candidates, reasons, exact quoted commands, and bounded failure evidence. Do not launch another broker while a failed instance may still own its lock.
- [ ] Assert old-image refusal is preserved and newer-image recovery-only reconciliation does not rewrite old registration/image bytes or dispatch the old review.
- [ ] Run `node --test test/integration/broker-upgrade.test.mjs test/integration/broker-startup.test.mjs` green.

## Task 3: Record exact manual launch evidence and guard unjoined retirement

**Interface:** A package-managed manual Claude launch reserves an operation before provider spawn, records its exact outcome, and shares dispatch exclusion with `abandon`. Unjoined retirement requires the sealed author, absent reviewer claim/decision, complete operation history, and positive non-submission proof for every route. Legacy or observed Claude sessions remain blocked when exact proof is unavailable.

- [ ] Add failing tests to `test/integration/broker-release.test.mjs` and `test/integration/supersession-lineage.test.mjs` for a truly pre-dispatch attempt, a session/tool-observed manual attempt, missing legacy history, earlier unknown operation followed by a settled latest operation, and a joined reviewer.
- [ ] Add deterministic barriers for join/abandon, manual launch/abandon, wake/fence, and evidence replacement. Assert at most one terminal event and no provider effect after terminalization.
- [ ] Run those test files and confirm the failure is the absent exact-operation and retirement guard behavior.
- [ ] Implement the durable manual launch reservation and settlement in the existing provider/broker launch boundary. Keep every attempt and its evidence digest; unknown stays unknown. Extend reconcile for read-only exact provider observation without replay.
- [ ] Extend protocol abandonment under dispatch exclusion then review mutation lock. Re-read expected review ID, author, revision, sequence, complete operation history, and owned reservation before event append and cleanup.
- [ ] Add crash-after-event cleanup retry and exact start retry cases. Retain foreign, malformed, or symlinked reservations on refusal.
- [ ] Run the focused broker release and lineage tests green.

## Task 4: Preserve actionable Claude failure diagnostics

**Interface:** A documented structured provider version-floor error includes bounded observed/required versions and an update action. Explicit model/effort rejection retains `APR_REVIEWER_SELECTION_REFUSED` only under the existing no-session and unchanged-authority guards. All ambiguous outcomes require reconciliation.

- [ ] Capture and sanitize an actual supported structured Claude version-floor envelope as a fixture; record the allowed fields in the test. If no supported envelope can be established, leave version-floor specialization out and report the unsupported case rather than guessing.
- [ ] Add failing classifier and launch-bootstrap tests for the structured version floor, malformed/injected/oversized envelope, generic nonzero exit, absent JSON, hook denial, explicit selection refusal with and without a session, and an authenticated reviewer decision despite nonzero exit.
- [ ] Run `node --test test/unit/claude-launch-classifier.test.mjs test/integration/claude-launch-bootstrap.test.mjs` and confirm the expected failures.
- [ ] Extend the existing diagnostic normalizer, result schema, and CLI renderer together. Keep each public message/action at 256 UTF-8 bytes and total diagnostic JSON at 1024 bytes; never echo raw stderr, prompt, path, or session handle.
- [ ] Run the two focused test files green.

## Task 5: Help, end-to-end proof, and local package

- [ ] Add failing golden help/parse assertions for offline status versus reconcile mutation, candidate ranking and recovery-only limits, refusal evidence, independent fresh-output route, `APR_LINEAGE_UNAVAILABLE`, and scoped broker access recovery.
- [ ] Update `src/cli/help-data.mjs`, `src/errors.mjs`, and `skills/peer-review/SKILL.md`. Run `node --test test/golden/help.test.mjs test/unit/cli-parse.test.mjs` green.
- [ ] Run `node --test test/integration/broker-upgrade.test.mjs test/integration/broker-startup.test.mjs`, `node --test test/integration/broker-release.test.mjs test/integration/supersession-lineage.test.mjs`, and the two Claude test files. Then run `npm test`, `npm run test:packaging`, `npm run test:slow`, `npm run lint`, and `npm run format:check`.
- [ ] Commit only after the defect is in Develop and all source changes are verified. Record commit trace, run the governed Test/Review workflow, and inspect the exact commit SHA.
- [ ] Run a real manual XPR on this committed #117 specification or plan with a distinct headless `gpt-6-astra` high author and a package-launched headless `claude-opus-5-5` reviewer. Verify the reviewer decision in protocol authority, not process exit alone. Preserve any ambiguous attempt and reconcile before retrying.
- [ ] Build the tarball, verify its SHA-256 and installed contents in a disposable prefix, then run the user-authorized global uninstall/install of the exact local tarball. Rebuild the native helper with `npx ai-peer-review build broker-security`; run global doctor and version checks. Do not publish to npmjs or alter AITM.

## Self-Review

Every section of the #117 design is mapped to Tasks 1–5. The new headless access finding is a runtime boundary, not proof that the package can bypass a sandbox. The live AITM #1841 review attempts remain untouched. The acceptance gate is a protocol-authenticated XPR decision plus packaged local installation evidence.
