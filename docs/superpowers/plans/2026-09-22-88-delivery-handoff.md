# Issue #88 delivery handoff

## Operator instruction and current status

The operator requested delivery of #88 under epic #39 with Full-Auto. After repeated failed recovery rounds, they explicitly instructed: if this attempt fails to deliver, end with a handoff prompt for a new agent. This attempt did not deliver. No further repair was begun after the latest failure. The next agent must analyze the complete crash-recovery chain before making another isolated fix.

Work only in `/Users/kpburson/projects/Vibe-Coding/ai-peer-review-worktrees/39-project-local-spr-xpr-broker`, branch `feature/epic/39`. Do not reset, clean, replace, or recreate this checkout. There are extensive intentional uncommitted source/test repairs. Preserve and review them. #88 is OPEN/Develop; #39 is OPEN; PR [#89](https://github.com/kburson/ai-peer-review/pull/89) is OPEN/DRAFT. Last pushed head remains `e36190a1cacca38a8945fb26897aa38af9c335ed`. Before this handoff document, local HEAD was `8cb780a2cb46abc605e6862bc468a84488922de8` (recovery checkpoint documentation). Check actual HEAD because this handoff is committed separately. No implementation recovery commit or new CI candidate has been pushed.

Read AGENTS.md, `.agents/skills/task/SKILL.md`, session boot instructions, the live issue/board, and both plans. Recheck binding, branch, worktree, and provenance. AITM will be paused on handoff; resume #88 as agent through its normal CLI. The task skill limits the agent terminal step to CODE_COMPLETE; do not silently switch roles to close issues.

## Authority and constraints

Accepted plan: `docs/superpowers/plans/2026-09-21-88-provider-authority-broker-reconciliation.md`, commit `9931f83c2cf43d8892fdaa638fb59e533c7cf830`, blob `dbf44a27fd1be3e2773cac5f3618b308de29152e`, accepted SPR `review-bd65fa3d0a76ec9f39a096656662a981`.

Operator-approved recovery plan: `docs/superpowers/plans/2026-09-21-88-delivery-recovery-plan.md`, initially saved at `848e08b946d74aa12e167ece499e48e719038ea2`, checkpoint at `8cb780a2cb46abc605e6862bc468a84488922de8`. It caps speculative repair at two focused hours, followed by one candidate CI cycle and one live attempt. Do not silently reset that cap because the agent changed. Roughly an hour of additional recovery work has been used across checkpoints; user waiting is excluded, and the AITM activity timer has undercounted tool-heavy periods. Treat this as an estimate, not verified remaining budget.

- No new GitHub issue, XPR, provider substitution, quota retry, separately billed API, or budget increase.
- Keep the issue's two-new-defect/fix-round checkpoint rule.
- Windows runtime proof belongs on Windows CI, not this Mac.
- No real provider call occurred during this recovery. One bounded Claude Code 2.1.278 / Opus 5 proof remains authorized only after complete local verification and exact pushed-head Linux/macOS/Windows CI. Maximum two review turns and 12 minutes. Require both reviewer-to-author and author-to-reviewer handoffs; no fixture-only success claim.
- Keep #88/#39 open and PR draft unless both release gates are proven.
- Do not track or publish raw provider handles or logs.

Two preexisting untracked SPR files were temporarily moved out of package inputs and restored byte-for-byte. Their hashes and paths are privately recorded in `.scratch/inspect/88-preserved-spr/manifest.json`; both originals are back in their original directory. Preserve them:

`docs/superpowers/peer-reviews/plan/2026-09-21-2026-09-21-88-provider-authority-broker-reconciliation-review-bd65fa3d0a76ec9f39a096656662a981/`

Files end in `-author-startup.md` and `-reviewer-invitation.md`. These must not be accidentally staged or included as private local evidence in a release package.

## Latest failure: complete crash recovery is still missing

Command: `node --test test/integration/broker-release.test.mjs`.

Private synthetic log: `.scratch/test/88-native-recovery-failed.log`. The filename is intentionally failure-labelled; this is not passing evidence.

The native error-mapping repair compiled. The new missing-endpoint assertion passed. The installed scenario reached authenticated reviewer join and submission, killed its owned synthetic broker/provider, and called ordinary `ensureBroker`. The client now recognizes `ECONNREFUSED` and launches a replacement broker. That replacement exits with:

```text
APR_BROKER_STALE: Prior broker metadata requires reconciliation.
```

Observed synthetic calls stayed exactly `start`, `launch`; process diagnostics show original broker SIGKILL and replacement exit code 1. The run failed in approximately 22 seconds. Later unknown/reserved residency, exact acknowledgement recovery, return handoff, and finalization assertions did not execute.

Read these connected paths before coding:

1. `src/broker/client.mjs`, `ensureBroker`: only known absent/refused endpoint errors permit a replacement spawn. Do not broadly catch all `APR_BROKER_START_FAILED` errors.
2. `bin/peer-review-broker.mjs`, `runBrokerEntrypoint`: reconciles registrations, then passes only `registrationSnapshotCurrent(store, registrations)` as the ownership reconciliation callback.
3. `src/broker/ownership.mjs`, `acquireBrokerOwnership`: acquires/verifies the OS lock, runs the callback, then unconditionally rejects any prior discovery metadata. The production callback does not reconcile/remove stale metadata. This is the confirmed failure.
4. `native/broker-security/posix.cc`, `ListenPrivate`: rejects any existing socket path. After a crash, the old socket remains. Even removing discovery metadata alone is therefore insufficient. This further barrier is source evidence, not a separately executed failing test.
5. `src/broker/worker-factory.mjs` and launch reconciliation: worker reconstruction is reached only after ownership and endpoint startup succeed.

The next repair needs a coherent dead-owner takeover contract under the verified OS lock: validate recorded identity/runtime, reconcile durable registration/provider state, safely replace exact stale discovery/socket artifacts, preserve live-owner exclusion and symlink/identity protections, then reconstruct pending workers. Do not infer ownership from PID absence, blindly unlink paths, delete the broker directory, or bypass `ensureBroker` by directly starting the entrypoint. Determine whether this remains an implementation omission within the accepted design or needs a plan amendment before changing authority semantics.

The systemic gap is that earlier tests covered clean startup, graceful shutdown, and injected worker state, but not the full installed crash-to-reconnect path. Two adjacent failure layers were only reached serially by the new crash regression. Audit the entire chain rather than fixing one failing line and immediately rerunning a real provider.

## Saved uncommitted repairs

- `src/provider/claude-launch.mjs`, `src/providers/claude.mjs`: shared pinned command/permission contract, finite plain/npx aliases only when the installed binary resolves correctly, offline npm resolution, exact role/action grants. Preserves ordinary skills/settings and identity hook.
- `src/providers/claude-stream.mjs`: correlate Skill metadata only to its completed call within the same wake; preserve session/model, unrelated-user, duplicate-marker, incomplete-tool, and terminal-turn checks.
- `test/helpers/installed-handoff-evidence.mjs`, live harness, lifecycle helper and tests: separate transport acknowledgement from protocol progress; fail promptly on refusal/no progress; cleanup preserves broker-owned deadline timers and labels unconfirmed provider settlement unproven; receipt emitted after cleanup.
- `src/broker/{launch,worker,worker-factory,provider-bridge}.mjs`, `src/providers/registry.mjs`: retain pre/post-join pending/unknown launches without wakes; independently reopen joined binding; reconcile only exact durable adapter acknowledgement; missing evidence stays unknown without relaunch; original settlement preserves concurrent exact acknowledgement.
- `native/broker-security/{posix,windows}.cc`: preserve POSIX ENOENT/ECONNREFUSED, including asynchronous SO_ERROR; Windows maps only ERROR_FILE_NOT_FOUND to ENOENT. Other failures remain closed. Native patch independently reviewed, Mac compiled/missing-endpoint assertion passed; Windows not yet run.
- `test/helpers/installed-provider/{claude,scenario,restart-scenario}.mjs`, `test/integration/broker-release.test.mjs`: stronger synthetic permission model, actual local npx, Skill metadata, repeated cold startup, and actual owned-broker termination followed by normal client restart. Pending the confirmed ownership blocker, the crash scenario has never fully passed.
- New contract document: `docs/conformance/2026-09-21-88-managed-turn-contract.md`.

## Verification limits

Before the last native patch: default suite 436 unit passes, one conditional native skip, 19 golden passes; 48 worker/lifecycle/coordinator tests; 18 permission/launch tests; full lint passed. Earlier slow and packaging suites passed before the latest restart additions. These are partial, stale results for the final candidate. The current packed crash test is RED. Do not claim release proof or a green complete candidate.

Relevant private logs:

- `.scratch/test/88-candidate-default.log`
- `.scratch/test/88-final-contract.log`
- `.scratch/test/88-checkpoint-lint.log`
- `.scratch/test/88-native-missing-red.log`
- `.scratch/test/88-native-recovery-failed.log`

Old e36190a CI was green but is not current-candidate evidence: runs `35677108399` and `35677112159`. The earlier real attempt at that head failed on denied author command and Skill metadata parsing. Private evidence: `/private/var/folders/j0/f32tkg_96mb236vycdn8bj5w0000gn/T/apr-installed-handoff-N3vAXz`. Do not publish its raw contents. No new provider attempt occurred after those failures.

## Completion sequence if repair becomes proven

1. Finish the complete installed crash-recovery path with meaningful negative tests and independent review; require the ordinary packed regression to pass, without weakening it.
2. Run default, slow, packaging, lint, format, focused broker tests, and pack inventory. Run lint after test scratch cleanup, not concurrently with it.
3. Commit only intended changes, push, and require Linux/macOS/Windows success on the exact pushed SHA. Do not rerun a failed job merely to get green.
4. Arrange canonical AITM verification so it invokes the live test only once. The issue's vc:11 is now the literal `npm run test:live:broker-handoff -- --provider claude`; AITM does not shell-expand a provider environment variable.
5. The intended single live invocation is `npx aitm test 88`, with `APR_LIVE_EVIDENCE_ROOT` set to this authorized worktree's absolute `.scratch/test` path. The harness's default scratch would otherwise be inside AITM's temporary verification checkout and may be removed. Verify this arrangement before use. Do not run the live test independently and then accidentally invoke it again through AITM.
6. Preserve the two original untracked files while satisfying canonical clean-worktree verification; temporary byte-for-byte relocation to private ignored scratch was used and restored previously. Never bypass the clean gate or track private startup material.
7. Require exact durable role wakes and protocol submissions, produce one sanitized receipt, and use normal issue workflow. If either gate remains unproven, leave issues open and PR draft and report the specific blocker. No package publication is authorized.
