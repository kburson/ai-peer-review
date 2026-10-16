# #190 simple local handoff implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans inline. Root remains the implementer. No implementer delegation or parallel mutation wave; retain the existing fresh whole-child final review.

**Goal:** Automate passing an artifact and response-note filepaths between two trusted local agents, with exact role write boundaries and simple restartable turns.

**Architecture:** Reuse the current review journal, turn protocol and provider adapters. Resolve one project and an exact write allowlist, use normal filesystem access, and retain only authentication, locking and recovery needed for a correct handoff. Remove application-level ACL/source-class challenges from that local path.

**Tech Stack:** Node >=24, existing Node filesystem/crypto/process primitives, existing provider permission controls, node:test and hosted supported-OS CI. No new native component or persistent query worker.

**Spec:** [2026-10-16-190-trusted-local-storage-design.md](../specs/2026-10-16-190-trusted-local-storage-design.md).

## Governing authority and constraints

The user's 2026-10-16 clarification selects this simple local workflow. It replaces the earlier draft protection-admission scope design as well as the guard-owned and operation-owned PowerShell proposals. Update and normally review the governing documents before runtime implementation. Record the exact amendment in #190 through AITM; preserve original source-plan provenance alongside the amendment instead of claiming the old plan approved it.

- Reviewer writes only its exact current response-notes file. Author writes only the artifact and its exact current response. Neither participant writes any path outside its role allowlist, including other tracked/untracked/ignored/new files, coordination state, `.git`, another response or anything outside the project.
- Automation writes only its fixed project-local coordination records and designated responses. It never supplies an approval or participant identity of its own.
- Retain project/review/role/session/turn/version authentication, exclusive state-transition locking, atomic writes, exact-retry idempotency and truthful pending-turn recovery. The new production local handoff makes no Git writes/automatic commits, including to a linked worktree's outside common Git directory. Do not relabel the legacy no-commit test mode as production evidence.
- Use ordinary OS-granted filesystem access; no ACL, SID, protection-receipt, host enrollment or source-class challenge for this handoff. Keep inexpensive containment, physical-target and expected-version checks needed for the allowlist.
- Use existing exact provider/tool write controls for automatically launched participants. A reviewer may run read-only with exact automation publication of notes. An author lacking exact artifact/current-response edit support uses an existing human-launched session with the same explicit role instructions. Existing human-launched participants remain supported as instruction-bound, not provider-enforced; do not invent another wrapper/permission system or silently broaden an automated launch.
- No native addon, custom executable, compilation, binary download, native fallback, persistent PowerShell process or new orchestration framework.
- Keep budgets 30000/15000/5000/800000 ms, existing turn limits and portable cap four. Keep affected host tests, exact-head hosted complete CI and final whole-child review.
- Preserve historical evidence and unresolved provider state. Broader #107/class/epoch/release claims remain separate and are not marked complete.

## Review focus

1. An existing dirty unrelated tracked file must remain byte-for-byte unchanged across both participant turns (Task1).
2. A target changes after startup: automation rejects an outside-project publication at write time; provider/manual edits with changed physical identity/containment are refused at sealing/advance. Do not claim interception of an independent editor (Task1).
3. A provider lacks exact edit restrictions: an automated reviewer uses existing read-only execution plus exact notes publication; an unsupported automated author routes to an existing instruction-bound session. Label actual enforcement accurately (Task1).
4. An agent exits after notes are saved but before acknowledgement: resume the same pending handoff without a duplicate turn or fabricated acceptance (Task2).
5. Existing primary/source protection machinery is still reachable indirectly during local startup: actual installed tests must expose the residual ACL/source-class dependency (Tasks2–3).

## Task 1: Exact local paths and participant write permissions

**Files:** Reuse/modify `src/collateral/paths.mjs`, `src/provider/claude-launch.mjs` and its existing core, `src/providers/claude.mjs`, `src/providers/codex.mjs` and the existing permission helpers only where required. Extend `test/unit/paths.test.mjs`, `test/unit/claude-launch-permissions.test.mjs`, `test/integration/claude-launch-permissions.test.mjs` and the provider's real scope controls. Do not add a generalized storage-admission manager.

**Interfaces:** Preserve `resolveContainedPath(root, candidate, label)`, `resolveReviewPaths(...)` and current provider launch/submit interfaces. Derive the allowlist from the existing sealed project/artifact/response record; no caller-defined additional writable roots.

- [ ] **Step 1: Pin path/role violations in RED.** Add cases to the actual existing path/permission tests. Use two agents/roles and real owned fixture files: artifact, reviewer response, author response, unrelated dirty tracked file, untracked/ignored file, new-file destination, coordination journal and outside-project sentinel. Before a turn, record sentinel bytes. Ask the reviewer to write the artifact, another response, unrelated tracked/untracked/ignored/new file, coordination journal, `.git` and outside sentinel. Where provider enforcement is advertised, each attempt must be denied and leave bytes unchanged. For an existing manual session, verify the supplied role instructions and observed compliant turn, label it instruction-bound and do not claim enforced denial. The author may edit only the artifact/current author response. For automation writes, add a symlink replacement before publication and require refusal before writing. For independent provider/manual edits, replace a target before submission and require the pre-seal check to refuse advancement; do not assert interception or rollback of that editor. Pure permission-string tests are useful but do not replace actual enforcement.

```js
assert.equal(resolveContainedPath(root, artifact, 'artifact').absolute, artifact);
assert.throws(() => resolveContainedPath(root, outside, 'response'));
assert.equal(reviewerResult.artifactChanged, false);
assert.equal(reviewerResult.unrelatedTrackedChanged, false);
assert.equal(reviewerResult.outsideChanged, false);
assert.equal(reviewerResult.responseWritten, true);
assert.equal(authorResult.artifactChanged, true);
assert.equal(authorResult.unrelatedTrackedChanged, false);
```

Use current fixture/result interfaces rather than inventing product result fields; these booleans are assertions derived from actual before/after bytes. Run the named path/permission tests; expect the missing behavior RED before its change.

- [ ] **Step 2: Apply the smallest existing-provider change.** Bind exact project-contained paths at launch and publication. Give the reviewer only its exact response write permission, or keep it read-only and have the existing wrapper publish its returned notes to that exact file. Give the author only its artifact/current-response edits. Keep protocol-owned journal writes behind the exact existing commands. Do not grant a generic write-capable shell, blanket project edits or permission-changing commands. Recheck physical containment for automation publication; recheck independent provider/manual target identity/containment before accepting a submission. Reject a mismatch without claiming that an independent write was prevented. If an automated author lacks exact scope, return the existing manual-session handoff with explicit instructions and an accurate enforcement label. Do not prohibit existing trusted manual joins or grant broader automatic write tools.

- [ ] **Step 3: Run affected scope tests and commit.** Run `node --test test/unit/paths.test.mjs test/unit/claude-launch-permissions.test.mjs test/integration/claude-launch-permissions.test.mjs`, plus affected existing Codex controls and real provider scope probes. Expected: permitted writes work and dirty unrelated bytes remain unchanged. Provider-enforced variants deny prohibited writes; manual variants explicitly remain instruction-bound. Missing evidence blocks only an advertised enforcement claim, not the trusted manual-session handoff. Lint/format changed paths, commit `[#190] Enforce simple local review write boundaries`, and native commit-trace.

## Task 2: Normal filesystem handoff with essential state integrity

**Files:** Modify the actual local path through `src/cli/run-core.mjs`, `src/startup/runtime.mjs`, `src/startup/authority-fence.mjs`, `src/config/primary-operations.mjs`, `src/broker/client.mjs`, `src/broker/service.mjs`, `src/broker/registry.mjs` and existing protocol store/lock helpers only where the dependency trace shows it is necessary. Reuse `src/protocol/service.mjs` and current turn/submit interfaces. Extend `test/integration/submission.test.mjs`, `test/integration/authority-entrypoints.test.mjs`, existing handoff/recovery tests and installed helpers. Do not rewrite unrelated subsystems.

**Interfaces:** Existing start/join/submit/status/recover methods and journal schemas remain the default. A local review consumes project/artifact/response paths, existing identity/grants and current turn; it does not consume ProtectionReceipt or accepted ProcessSourceClass as permission to hand off notes.

- [ ] **Step 1: Pin the current overextended dependency in RED.** Add a genuine installed local start/join/submit loop whose account can read/write the project but has no capture enrollment or class receipt. The current ACL/source-class challenge must fail this test before implementation. Observe stock ACL process launches without returning substituted probe data. Require zero ACL challenges on the local path, correct turn identity and the allowed write results from Task1. Keep pure protocol fixtures explicitly narrower than installed evidence.

- [ ] **Step 2: Remove the challenge from the local handoff path.** Use normal Node opens/reads/exclusive creation/atomic replacement and actual I/O errors. Preserve existing lock ownership, expected journal revision, artifact digest and response seals. Implement real durable journal-only submission as the production local default; do not call `commitExactPaths` or any other Git writer. An explicitly requested legacy Git-writing mode refuses on this local path with a clear unsupported result rather than silently committing or routing through the old no-commit fixture mode. Keep legacy Git-bound records readable as history; do not silently reinterpret them as new local records or automatically restore their providers. Use existing artifact snapshots/baselines to show the reviewer the prior reviewed bytes/diff without commits, rather than creating a new diff subsystem. Do not route the trusted local path through C1/C2/C3 protection/source enrollment merely to advance a turn. Keep any existing loopback request authentication and exact worktree/instance binding. Keep selected tool/project identity needed to invoke the correct automation, without repeatedly hashing whole installations or requiring an OS source class. Do not introduce a new trust flag, cache, policy service, worker, transport or grant schema.

- [ ] **Step 3: Pin duplicate and interrupted-turn behavior.** Use existing submission/recovery fixtures, then actual installed controls:

```js
assert.equal(afterExactRetry.sequence, afterFirstSubmit.sequence);
assert.equal(afterExactRetry.currentRole, afterFirstSubmit.currentRole);
assert.equal(afterRestart.pendingTurn, beforeRestart.pendingTurn);
assert.equal(actualReviewerAcceptance.actor, expectedReviewerSession);
assert.equal(unknownLaunch.automaticRelaunches, 0);
assert.equal(afterHandoff.gitHead, beforeHandoff.gitHead);
assert.equal(afterHandoff.gitIndexDigest, beforeHandoff.gitIndexDigest);
assert.equal(explicitLegacyGitMode.status, 'unsupported');
```

Derive observations from existing real journal/events. Test crash after response publication/before acknowledgement, same-role duplicate submission, wrong role/session/project/version, busy/live lock, uncertain owner death and ordinary filesystem denial. Missing acknowledgement/agent exit never becomes acceptance; unknown launch/lock state stays pending and is surfaced for explicit recovery. No elapsed-age-only lock steal or unrelated process kill.

- [ ] **Step 4: Verify and commit the local path.** Run affected submission, protocol lock, handoff, path and recovery tests with existing canonical routing. Then lint/format changed paths. Expected: complete simple turns with essential negatives intact and no ACL/source-class/native path dependency. Preserve separate legacy conformance tests as historical/broader capability controls; do not use their evidence to claim the local handoff or silently skip a failing relevant control. Commit `[#190] Use normal filesystem access for trusted local handoffs`; native commit-trace. Keep existing budgets.

## Task 3: Prove the real two-agent workflow and update #190 delivery evidence

**Files:** Adapt `test/helpers/installed-portable-journey.mjs`, existing installed handoff helpers and `.github/workflows/installed-portable-journeys.yml` to the amended local claim. Preserve earlier failed runs, public capture/class artifacts and immutable review outputs. Update relevant user documentation and governed #190 Scope/Plan Metadata/verifier references to the exact amendment.

**Interfaces:** Existing provider runner, journal and role response paths from Tasks1–2. No standalone process-source capture/class approval is a prerequisite to the local handoff.

- [ ] **Step 1: Run actual installed local journeys.** Install exact candidate bytes on supported Linux/macOS/Windows and the existing Node matrix. Prove actual reviewer notes → author artifact revision/notes → reviewer acceptance on the authorized local host. Record which participants are provider-enforced and which existing sessions are instruction-bound; no sandbox denial claim is inferred from manual compliance. Across the existing OS/Node CI matrix, exercise ordinary installed filesystem/turn/restart behavior without demanding live provider credentials on every worker. Verify no other tracked/outside file changed, no ACL challenge or native component was invoked, and original budgets were not renewed. Retain the existing Linux manual-input exclusion explicitly where applicable; do not claim a real-provider result from a mock.

- [ ] **Step 2: Run interruption and concurrency controls.** Restart the automation with a pending handoff, retry the exact completed submission, and contend for the same review lock. Verify a single state owner, no duplicate turn, no fabricated acceptance and no unrelated process termination. Unavailable enforced-scope proof remains an incomplete enforcement claim; the existing trusted manual-session route remains supported. Verify the no-Git-write behavior against both ordinary and linked-worktree repositories.

- [ ] **Step 3: Finish normal verification and review.** Run affected host tests and full lint/format; use authentic exact-head hosted receipts for the complete suites. Require the existing one fresh whole-child review. Verify package/runtime absence of new native addons, binaries, downloads or build steps on this local operational path. Preserve separately owned broader release gates without claiming them satisfied. No newly introduced generic security or conformance subsystem is required for this acceptance.

- [ ] **Step 4: Reconcile the governed issue.** Through AITM, record the user's explicit revised scope, exact amendment/review/commit/run references and new verifier evidence. Preserve the original pinned source-plan pointer as history; never reuse its approval as approval of the amendment. Change checkboxes only after their amended actual verifier succeeds. Follow native lifecycle actions and report `CODE_COMPLETE`; no raw state jumps, agent close or fabricated human approval.

## Self-review and execution

The role table maps to Task1; handoff/authentication/locking/recovery to Task2; actual installed/provider/no-Git/budget/no-native evidence to Task3. Every review-focus input has an explicit check. Earlier complicated protection sessions and workers are not implementation tasks. Root continues inline after the governing amendment is recorded and reviewed; the user has already selected the scope and execution method.
