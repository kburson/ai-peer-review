# Issue 117 Broker Recovery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task by task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Recover mixed-runtime XPR brokers safely, retire only eligible unjoined attempts with exact package-managed non-submission proof, preserve uncertain provider evidence, and require issue attribution for every new SPR/XPR.

**Architecture:** Keep the project broker's owner-only cache, lock, authenticated socket, and per-review pinned runtime authoritative. Read-only discovery ranks authenticated review chronology without claiming image compatibility. Mutation requires complete attempt evidence, exact actor authority, and the full broker/dispatch/review lock order. Package-generated reviewer commands use verified pinned execution paths; a successful review alone does not prove execution-time integrity.

**Tech Stack:** Node.js ESM, native broker-security addon, `node:test`, protocol store, broker registry, JSON Schema, governed issue #117.

**Spec:** `docs/superpowers/specs/2026-09-29-117-broker-recovery-design.md`, accepted specification review `review-05b472f0d8ed4866d16288adb821eaf2`.

## Story Intent

- **Beneficiary:** an XPR operator recovering an interrupted review
- **Capability:** inspect authenticated recovery candidates and retire an eligible unjoined attempt under exact proof authority
- **Need:** mixed pinned images and incomplete launch evidence leave reviews unable to progress safely
- **Value or failure prevented:** preserve uncertain attempts while allowing independent fresh reviews without relaunching provider requests or fabricating participation

## Global Constraints

- Execute implementation only under governed defect #117 after Plan approval and promotion to Develop. Preserve AITM #1841 workspaces and AITM hook files. This plan review does not execute implementation tasks.
- Preserve sealed provider/model/effort. Generic failures, missing output, hook denials, and absent joins are not non-submission proof. No ambiguous provider launch may be replayed.
- Keep owner-only authority and pinned runtime digests. No broad sandbox bypass, relocated authority, copied session identity, hand-edited protocol state, or registry publication.
- Retain every registration, reservation, operation/attempt, launch record, and observation on refusal or uncertainty. Known external provider observations block retirement; proof cannot rule out unobserved out-of-band invitation use.
- Before each new production or guidance change, add a focused test that fails for the missing behavior. Existing behavior is baselined honestly: a passing existing test is not a red test, and tests must not be sabotaged to fabricate a failure. Use synthetic disposable fixtures without paid provider calls.
- Implementation commits carry `[#117]` attribution in Develop or later; review artifact commits use the package-owned protocol workflow. Run delivery gates against the exact implementation SHA before any separately authorized installation or delivery.

## Baseline and prior work

At reviewed commit `1a9fa51`, socket denial classification and its help/tests already exist, including POSIX `EACCES`/`EPERM` and Windows `ERROR_ACCESS_DENIED`. These are prior work outside the accepted spec's new recovery/retirement scope; this plan does not add that error code or claim to design it anew. The concrete existing recovery is to inspect `peer-review broker status --json` from the genuine participant session and use a host-approved, exact CLI invocation for the failed command if socket access requires it. This changes the host execution permission for that command; it does not alter socket authentication, ownership, endpoint placement, or participant identity. Any new behavior in this area requires its own reviewed scope amendment.

The same baseline already pins manual Claude launch/resume commands through `pinnedPackagePrefix` to the sealed broker image. The remaining `localNpxBinMatches` realpath-only logic belongs to wake aliases. Existing pinning is useful baseline evidence, not proof that every execution-time gate is satisfied. Task 5 tests all routes and closes only demonstrated gaps.

## File Map

| Area                              | Existing owners                                                                                                                                                                                       | Tests to baseline or extend                                                                                                                                                                                                                |
| --------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Prior socket access behavior      | `native/broker-security/posix.cc`, `native/broker-security/windows.cc`, `src/broker/platform.mjs`, `src/broker/client.mjs`                                                                            | `test/unit/broker-build.test.mjs`, `test/integration/broker-startup.test.mjs`, `test/golden/help.test.mjs`                                                                                                                                 |
| Recovery discovery and ownership  | `src/broker/registry.mjs`, `src/broker/client.mjs`, `src/broker/ownership.mjs`, `src/cli/run.mjs`                                                                                                     | `test/unit/broker-registry.test.mjs`, `test/unit/broker-ownership.test.mjs`, `test/integration/broker-upgrade.test.mjs`, `test/integration/broker-startup.test.mjs`                                                                        |
| Operation evidence and retirement | `src/provider/manual-launch-ledger.mjs`, `src/coordinator/ledger.mjs`, `src/coordinator/service.mjs`, `src/broker/launch.mjs`, `src/broker/worker.mjs`, `src/protocol/service.mjs`, `src/cli/run.mjs` | `test/unit/manual-launch-ledger.test.mjs`, `test/integration/coordinator-wake.test.mjs`, `test/integration/broker-release.test.mjs`, `test/integration/supersession-lineage.test.mjs`                                                      |
| Claude diagnostics                | `src/provider/claude-launch-diagnostics.mjs`, `src/provider/claude-launch.mjs`, `schemas/claude-launch-result-v1.json`, `src/cli/run.mjs`                                                             | `test/unit/claude-launch-classifier.test.mjs`, `test/integration/claude-launch-bootstrap.test.mjs`                                                                                                                                         |
| Pinned launch and hook integrity  | `src/provider/claude-launch.mjs`, `src/providers/claude.mjs`, `src/providers/claude-hook.mjs`, `src/broker/runtime-image.mjs`, `src/cli/run.mjs`                                                      | `test/unit/claude-launch-permissions.test.mjs`, `test/unit/claude-wake-permissions.test.mjs`, `test/unit/claude-hook.test.mjs`, `test/integration/claude-launch-permissions.test.mjs`, `test/integration/claude-launch-bootstrap.test.mjs` |
| Fresh outputs and guidance        | `src/cli/run.mjs`, `src/collateral/review-record.mjs`, `src/cli/help-data.mjs`, `src/errors.mjs`, `skills/peer-review/SKILL.md`                                                                       | `test/integration/supersession-lineage.test.mjs`, `test/golden/help.test.mjs`, `test/unit/cli-parse.test.mjs`                                                                                                                              |

## Task 1: Establish the existing baseline

**Interface:** Read-only evidence distinguishes prior implementation from missing accepted-spec behavior. No new socket-access implementation or guidance is authorized by this task.

- [ ] Record issue/binding, exact HEAD, package version, tracked status, accepted spec digest, and existing tests before changes. Preserve unrelated generated review artifacts.
- [ ] Inspect POSIX and Windows denial mapping, client/platform propagation, existing help, and tests. Run `node --test test/unit/broker-build.test.mjs test/integration/broker-startup.test.mjs test/golden/help.test.mjs`; record actual outcomes, platform limitations, and native-helper prerequisites. Do not describe already-green behavior as newly implemented TDD.
- [ ] Inventory existing manual launch/resume pinning and wake alias permissions at the exact HEAD. Map each remaining requirement below to an existing test or a concrete missing assertion. Where behavior already satisfies a requirement, retain passing regression evidence without unnecessary production changes.
- [ ] Make no help, explain, or skill edits here. All new guidance is driven by failing assertions in Task 6.

## Task 2: Discover and reconcile mixed pinned runtimes

**Interface:** Status is lock-free and read-only. Candidates are advisory, ranked by authenticated startup/registration creation time, then runtime digest and canonical workspace. Unknown chronology stays unknown. No capability marker participates in ranking; recency describes review creation, not code age or compatibility.

- [ ] Add missing failing fixtures in the registry, upgrade, and startup tests: equal versions with different image digests; timestamps and ties; unknown chronology; authority journal before registration; malformed/missing evidence; foreign project; symlinked evidence; torn or changing reads. Keep unverifiable evidence visible with bounded reasons and no reconcile command.
- [ ] Instrument status to assert no filesystem-writing locks, adapter initialization, broker/provider launch, reservation repair, or evidence append. Compare bytes, names, inode identity, and modification metadata across scratch and broker trees; exclude access times caused by reading. Inconsistent reads must remain unverifiable without a repairing lock.
- [ ] Assert no capability marker is consumed; every ranking reason explains the recency limitation; no candidate is labeled compatible/ready until authenticated handshake and reconciliation of the exact current registration set. Treat the #1841 Opus 5.5 report as historical context and label it the newer candidate awaiting reconciliation before live proof.
- [ ] Run `node --test test/unit/broker-registry.test.mjs test/integration/broker-upgrade.test.mjs test/integration/broker-startup.test.mjs`; record actual missing-behavior failures before changing the registry/client/CLI projection.
- [ ] Implement the missing pure inspection and deterministic ranking behavior. Reconcile verifies the chosen pinned image and sealed Node/broker protocol immediately before startup, then revalidates registrations under ownership.
- [ ] Add/complete failing tests for old-image refusal, preserved bounded failure evidence, failed-instance ownership protection, and an actionable next candidate without automatically spawning it. Prove authenticated shutdown or OS ownership before trying another image.
- [ ] Implement only demonstrated reconciliation gaps. Another-image worker is recovery-only: zero launch, resume, wake, or provider-resource acquisition. Assert old registration and pinned-image bytes are unchanged. Run the focused registry/upgrade/startup tests green.

## Task 3: Prove each attempt and make unjoined retirement race safe

**Interface:** Non-submission means absence of package-managed delivery, not a claim that no external provider was contacted. Exact sealed author authority, absent reviewer claim/participant/decision, complete attempt histories, and a durable fence are required. Known session/tool observations and uncertain legacy coverage remain blocking.

- [ ] Add failing eligibility cases for `manual`, `authority`, and `registered` stages, each with exact author and positive complete proof. Cover wrong author, reviewer already joined/claimed/decided, missing/corrupt legacy histories, unavailable observation, and timeout with unchanged fences/evidence.
- [ ] Define and test typed package-local pre-dispatch receipts bound to attempt identity, operation/intent, review/request, pinned runtime digest, and source evidence digest. Only the package may attest local provenance before calling an adapter. Closed reasons are `wake-adapter-unavailable` and `manual-recovery-fence-or-stale-revision`; a matching free-text reason is not provenance.
- [ ] Add blocked cases for bare legacy `refused`; adapter refusal after delivery or without typed proof; spawned-Claude model/effort/version refusal; foreign proof; stale receipt; acknowledged launch/wake; session/tool observation even when broker operation is null; earlier unknown operation followed by a settled latest operation; and an interrupted earlier attempt followed by local refusal within the same operation. A `not-submitted` label from adapter reconciliation cannot erase the earlier attempt.
- [ ] Run `node --test test/unit/manual-launch-ledger.test.mjs test/integration/coordinator-wake.test.mjs test/integration/broker-release.test.mjs test/integration/supersession-lineage.test.mjs` and record real missing-behavior failures.
- [ ] Implement durable exact attempt reservation before each package-managed provider effect and crash-surviving settlement. Reconciliation returns exactly `definitely-not-submitted`, `submitted`, or `outcome-unknown`; it observes only, never launches/resumes, submits invitations, registers participants, or clears fences. Bind and recheck receipts to all identities above plus observed session fingerprint, source/version, and source digest. Legacy manual launches without supported exact proof report unsupported/unknown truthfully, retaining every original attempt.
- [ ] Extend shared dispatch exclusion and terminal/fence rechecks to manual launch, resume, broker dispatch, and wake entry points. Neither the latest attempt status nor startup stage alone can establish eligibility. Re-read and compare full histories and evidence digests under the review mutation lock.
- [ ] Add deterministic races for both join/abandon outcomes, manual launch/abandon, resume/abandon, wake/fence, evidence replacement, and abandon/broker startup. Assert one valid terminal event, no release on refusal, no provider effect after terminalization, and rejection of late `join`/`submit`.
- [ ] Implement the full lock order: project broker ownership → workspace dispatch exclusion → review mutation. Offline ownership uses a nonblocking OS try-lock before workspace locks, fails closed on contention/uncertainty, and remains held through validation, terminal append, and owned cleanup. Never start an endpoint or run dispatch/reconciliation callbacks during offline acquisition; release in reverse order. With a live broker, authenticated durable suspension and worker settlement precede workspace locks; fallback releases workspace locks and starts over. Test the hold interval and nonblocking contention explicitly.
- [ ] Test and implement exact owned-reservation cleanup after a durable terminal event. Cover crash between append/cleanup, same actor/reason retry without a duplicate event, conflicting retry refusal, and retained foreign/replaced/malformed/symlink reservations. Lost sealed-author authority leaves cleanup pending and scope consumed; no new actor cleanup authority is invented.
- [ ] Test terminal exact `start` retry: remains terminal, performs no broker/provider startup, and neither recreates nor releases the reservation. Ensure legacy pinned callers lacking compatible exclusion cannot be declared safe. Run the focused tests plus `test/unit/broker-ownership.test.mjs` green.
- [ ] Record in acceptance evidence that current #1841 hook denials/absent joins cannot retire either observed attempt. The new package-managed proof scope does not cancel unknown external sessions; terminal authority only prevents protocol continuation. Task 6 repeats this in CLI guidance.

## Task 4: Preserve actionable Claude failure diagnostics

**Interface:** Only supported structured provider facts may specialize a version-floor diagnostic. Ambiguity and authenticated reviewer decisions retain their established precedence; diagnostics never authorize retry or retirement.

- [ ] Capture and sanitize an actual supported structured envelope before selecting fields. Record its source and exact allowlisted fields in a fixture and acceptance evidence. If no supported structured fields or previously reviewed narrow pattern exist, defer specialization and record the fixture/deferral; generic behavior stays. A new message-text pattern requires separate review; never scan raw stderr.
- [ ] Add failing classifier/bootstrap cases for valid observed-below-required versions, malformed/injected/oversized/contradictory data, absent observed version with no guessed local-version fallback, generic nonzero exit, absent JSON, hook denial, explicit model/effort rejection with and without a session, and authenticated reviewer decision despite process failure.
- [ ] Run `node --test test/unit/claude-launch-classifier.test.mjs test/integration/claude-launch-bootstrap.test.mjs`; only implement supported missing behavior after the expected failures. If specialization is deferred, do not fabricate a failing feature requirement or parser.
- [ ] Update normalizer, result schema/validation, and renderer together. Keep message/action each at 256 UTF-8 bytes and total diagnostic JSON at 1024 bytes. Never echo arbitrary provider text, prompt, path, stderr, or session handle. Assert no diagnostic adds retry/non-submission authority. Run the focused tests green.

## Task 5: Enforce pinned reviewer execution integrity

**Interface:** Package-owned Claude permissions and hooks (`src/provider/claude-launch.mjs` and `src/providers/claude-hook.mjs`) enforce this gate; AITM hooks are unchanged. Prefer the existing absolute Node and CLI paths from the verified sealed image. Bare aliases must be rejected unless every execution-time condition in the spec is proven; no new bare-alias capability is required.

- [ ] Baseline the current pinned manual launch/resume path and inventory all wake/execution permission alternatives, including `localNpxBinMatches` and any bare aliases in `src/providers/claude.mjs`. A realpath-only alias check is insufficient.
- [ ] Add missing failing permission/hook/integration cases for accepted exact pinned absolute commands; changed package/Node/image digest; same-path reinstall; validation-to-execution content change; different install shadowing PATH; regular-file/foreign first executable; reviewer-shell PATH differing from launcher PATH; and integrity-checked absolute fallback. Verify no provider effect under unknown or changed integrity.
- [ ] For the spec's accepted-exact-alias case, test that acceptance is conditional on actual reviewer-shell resolution, expected first symlink/canonical target, sealed content identity, and immutability through execution. If the implementation has no mechanism to establish all facts, assert even an apparently exact alias is rejected and exercise the pinned absolute route instead. Do not create a fake assurance fixture that bypasses the production predicate.
- [ ] Run `node --test test/unit/claude-launch-permissions.test.mjs test/unit/claude-wake-permissions.test.mjs test/unit/claude-hook.test.mjs test/integration/claude-launch-permissions.test.mjs test/integration/claude-launch-bootstrap.test.mjs` and record real gaps.
- [ ] Tighten all identified routes so authority verifies the sealed runtime, actual executed bytes, and command scope immediately before effects, with immutability held/enforced through execution. A same-path reinstall or changing bytes invalidates authorization. Remove/disable insufficient wake-alias permissions or replace them with exact pinned commands; do not treat realpath or package version equality as content proof. Fail closed when execution-time identity cannot be guaranteed.
- [ ] Re-run focused tests green and inspect generated join/submit/resume/wake contracts. Keep build-time validation and successful live-review evidence separate from execution-time integrity evidence; name any platform limitation as a blocker instead of claiming the gate complete.

## Task 6: Verify independent fresh outputs and then update guidance

- [ ] Add a failing integration case in `test/integration/supersession-lineage.test.mjs`: retain a reserved ambiguous old review, start under a distinct `--reviews-root` and separately a distinct `--review-path-template`, and assert different review ID, invitation, and canonical outputs. Old authority, blocked status, reservation, registration, and observations remain unchanged.
- [ ] Cover record-ID-only changes not establishing independent identity, equivalent raw-root spellings resolving to the same destination, output collisions, and missing lineage. Existing collision/lineage refusal remains enforced. Run the lineage suite red, implement only missing behavior, then green.
- [ ] Before editing help/explain/skill text, add failing golden/parse assertions covering read-only status versus mutating reconcile; recency-only ranking limitations; readiness proof and recovery-only workers; full refusal/attempt evidence; package-managed proof scope and external-contact limitation; #1841 observed launches remaining blocked; lost-author consumed scope; independent fresh-output verification; `APR_LINEAGE_UNAVAILABLE`; and no retry authority from diagnostics.
- [ ] Run `node --test test/golden/help.test.mjs test/unit/cli-parse.test.mjs` to establish actual missing guidance. Then update `src/cli/help-data.mjs`, `src/errors.mjs`, and `skills/peer-review/SKILL.md`; run green. Existing access-denied guidance is baseline regression coverage, not new unreviewed scope.

## Task 7: Delivery verification, local package, and headless proof

- [ ] Run all focused Task 2–6 suites, including broker upgrade/startup, broker release/lineage, Claude classifier/bootstrap, permission/hook, and help/parse. Then run `npm test`, `npm run test:packaging`, `npm run test:slow`, `npm run lint`, and `npm run format:check`. Record exact commands, result counts, and implementation SHA; distinguish unsupported/deferred diagnostics and remaining gates.
- [ ] Inspect exact implementation commits and issue attribution through the governed Test/Review workflow. Implementation is not complete solely because this plan or spec was accepted.
- [ ] Build a local tarball, inspect packaged contents, install in a disposable prefix, verify native helper/runtime and SHA-256, and retain evidence. Only after separate user authorization perform global uninstall/install of that exact tarball and rebuild its native helper with its exact installed CLI; verify version and doctor. Do not publish or alter AITM. This task does not grant reinstall permission by itself.
- [ ] Run a fresh, separately scoped live manual XPR against a committed #117 artifact using a genuine distinct headless `gpt-6-astra` high author and package-launched `claude-opus-5-5` high reviewer. Inspect exact sealed pinned commands before dispatch. Record actual model/session assurance, runtime digest, and protocol reviewer decision; process exit is insufficient.
- [ ] Preserve every ambiguous attempt. Observe/reconcile exact evidence without replay; an independent review requires distinct output scope and verified new identity, and does not resolve the old uncertainty. Complete ordinary author response/finalization through the package-owned protocol. Keep model/session handles private and durable response/manifest evidence self-contained.

## Task 8: Require and carry issue attribution

- [ ] Add failing CLI and direct startup tests: omitting `--issue` or a positive programmatic issue refuses before adapter capability, broker, or protocol effects; valid IDs start SPR and XPR and remain in sealed startup context.
- [ ] Add failing normal-mode author revision and finalization tests for `[#N]` subjects, unchanged peer-review trailers, and exact retry behavior. Keep a legacy null-issue fixture readable without resealing it.
- [ ] Require the issue in `src/cli/parse.mjs` and `src/startup/runtime.mjs` before provider selection; validate direct `startReview` calls before preflight. Construct commit subjects in `src/cli/run.mjs` and `src/manifest/render.mjs` from the sealed context issue, with legacy recovery retaining its original message.
- [ ] Update `src/cli/help-data.mjs`, `src/cli/help-topics.mjs`, both package-owned peer-review skill sources, and startup examples to show `--issue <N>` and the missing-issue recovery action. Refresh existing test fixtures with explicit issue IDs, then run parser, startup, submit, finalization, help, full package, and packaging suites.
- [ ] Rebuild and inspect the local tarball, globally reinstall the user-authorized package, prove a live headless XPR with explicit issue ID, and record its revision/finalization commit subjects. Refresh #117 exact-head AITM evidence and PR CI after the final source commits.

## Self-Review and traceability

| Accepted specification requirement                                               | Plan coverage               |
| -------------------------------------------------------------------------------- | --------------------------- |
| Recovery ranking, lock-free status, mixed-image readiness and ownership          | Task 2; verification item 1 |
| Exact evidence, route scope, typed per-attempt proof and truthful reconciliation | Task 3; verification item 2 |
| Full lock order, races, terminal authority and cleanup limits                    | Task 3; verification item 3 |
| Independent fresh-output behavior and collision/lineage preservation             | Task 6; verification item 4 |
| Supported diagnostics, bounds, precedence and deferral                           | Task 4; verification item 5 |
| Execution-time pinned integrity and fail-closed alias handling                   | Task 5; verification item 6 |
| CLI/skill explanation and implementation/package/live evidence                   | Tasks 6–7                   |

Task 1 documents prior access-denied work and baseline pinning without adding unreviewed requirements or pretending existing passing tests fail. The implementation gate includes every accepted-spec verification item, not merely a successful live XPR. Current #1841 attempts remain untouched and blocked on exact evidence.
