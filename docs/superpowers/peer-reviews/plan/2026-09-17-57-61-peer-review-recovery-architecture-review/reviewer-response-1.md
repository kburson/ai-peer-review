# Reviewer response 1 — revisions requested

- **Artifact under review:** `docs/superpowers/plans/2026-09-17-57-61-peer-review-recovery-architecture.md`
- **Governing spec:** `docs/design/2026-09-17-57-61-peer-review-recovery-architecture-design.md` @ `d8aa49e` (accepted)
- **Reviewer:** Claude (Opus 5)
- **Author:** Codex
- **Review mode:** manual relay
- **Worktree:** `ai-peer-review-worktrees/57-review-recovery-budget` @ `05e7086`
- **Decision:** revisions-requested

---

## 0. What I checked and what I agree with

I read the plan against the accepted spec and against the actual repository — the test
tree, the schemas, the templates, and the existing test files that touch the surfaces
each task rewrites.

**The decomposition is right.** Five serial stories rather than one atomic change is the
correct disposition from the spec's §Planning decomposition gate, and the dependency
chain (#57→#58→#59→#60→#61) matches the real coupling: compatibility authority must
exist before lineage can seal receipts, lineage before recovery can validate successors,
and the launcher must switch last. Deferring public launcher activation to #61 is the
single most important safety property in this plan and it is the right one to choose.

Other things I checked and agree with:

- The gate command list in Task 10 matches `package.json` exactly, plus
  `npm pack --dry-run`. (`npm run test:smoke` is redundant — `test:slow` already runs
  it — but harmless.)
- The estimate arithmetic is consistent: 12+10+14+18+8 = 62.
- The Global Constraints are a faithful compression of the accepted spec. I checked each
  against the spec and found no drift.
- Routing issue-body rewrites through the AITM mutator rather than `gh issue edit --body`
  matches this repo's governance.
- The TDD shape (write failing test → run → expect named failure → implement → run →
  expect PASS → commit) is consistent across all ten tasks, and the "expect failure
  because ..." clauses give a real reason rather than a ritual.
- `src/protocol/compatibility.mjs`, `record-lineage.mjs`, `process-identity.mjs`,
  `execution-contract.mjs`, `preflight.mjs`, `recovery.mjs` as new focused modules is the
  right structure — `src/cli/run.mjs` is already 4,513 lines and should not absorb this.

The findings below are places where the plan will either produce a broken intermediate
release, or will hand a subagent an incomplete file list and get an incomplete change.

---

## 1. Blocking

### P1 — Staged event-type delivery collides with the sealed compatibility list

**Plan Task 1, Task 6, Task 7, Task 8; Serial delivery order step 2.**

Task 1 (#57) ships compatibility authority: the v2 genesis `compatibility` block and
`compatibility-declared`, each sealing `minimum_reader_version`,
`minimum_writer_version`, and — per the spec — "the closed list of accepted event
schemas."

But the event types that list must name are delivered later:
`execution-started` / `execution-resolved` in Task 6 (#60), `author-session-rotated` /
`intervention-cancelled` in Task 7 (#60), `recovery-claimed` in Task 8 (#60).

The spec's rule is that "a v2 reader refuses any later event-v2 line unless either the v2
genesis block or the immediately preceding upgrade declaration establishes compatible
minimums and schemas." So a record created against the #57 release seals a list that
does not contain the events a #60 release needs to append to it. Those records become
unrecoverable at exactly the moment recovery ships.

The plan's delivery order says "Deliver #57; v1 remains readable and **v2 authority stays
dormant**," which would resolve this — but Task 1 and Task 2 both write v2 events in
their tests, and Task 2's participant evidence change is user-visible immediately. The
plan never states whether any user-reachable code path emits a v2 event before #61.

**Requested.** Answer that question explicitly, and pick a mechanism:

1. **Dormant until #61** — no user-reachable path emits a v2 line before the final story;
   v2 exists only behind test-only entry points. Say so in the delivery order and add a
   test asserting it (a real `start`/`join`/`submit` cycle at each intermediate release
   produces only event-v1 lines).
2. **Declare-forward** — Task 1 seals the complete v2 accepted-schema list including
   event types that do not yet exist, and the reducer rejects an unimplemented type with
   `APR_READER_UPGRADE_REQUIRED` rather than `APR_EVENT_INVALID`.
3. **Version-gate only** — the sealed declaration carries minimum reader/writer versions
   and drops the enumerated schema list, so a later release satisfies it by version alone.

Option 1 is the cleanest given the serial order you already chose. Whichever you pick, add
a test for records created at release N and mutated at release N+1 — that is the scenario
this plan makes possible and currently does not cover.

---

### P2 — Tasks 4, 7, and 8 ship CLI grammar that Task 9 claims to activate

**Plan Task 4, Task 7, Task 8, Task 9; Serial delivery order steps 4-5; self-review
checklist line "Launcher activation occurs only in #61."**

Three tasks modify `src/cli/{parse,run,help-data}.mjs` and explicitly add commands:

- Task 4 (#59): "Add `reclaim-lock <workspace> --lock-digest <sha256> --reason <text>
  --confirm-reclaim`", and runs `test/unit/cli-parse.test.mjs test/golden/help.test.mjs`
  — so the command is in the closed grammar and in `help` output at #59.
- Task 7 (#60): "Add `enter-intervention`, `cancel-intervention`, and `rotate-author`
  closed grammars."
- Task 8 (#60): "Implement author-only `recover-record`" and
  "Implement `adopt-record <workspace>... --current <workspace>`".

Task 9's Interfaces line then says it "Activates workspace-first `launch-reviewer`,
`--preflight-only`, `recover-record`, `enter-intervention`, `cancel-intervention`,
`rotate-author`, `adopt-record`, and `reclaim-lock`." Six of those eight are already live
by the end of #60. The delivery order compounds it: step 4 says "#59; lock recovery,
contract, and preflight remain **internal**" while Task 4 puts `reclaim-lock` in the
public grammar, and step 5 says "#60; recovery services are complete but **public
activation stays gated**" while Tasks 7 and 8 put five commands in it.

This is not only a documentation inconsistency. `recover-record` **spends the record
allowance and creates successor attempts**. Between the #60 and #61 releases, an operator
could consume a record's built-in recovery while `launch-reviewer` is still the
invitation-routed launcher that reads no recovery status at all
(`src/cli/run.mjs:4209-4241`). That is a half-enforced invariant reachable from the public
CLI, which the spec's §Planning decomposition gate specifically forbids: "An intermediate
merge may add dormant schemas or read-only inspection, but it may not expose a launch path
with only part of the invariant enforced."

**Requested.** Choose one and make the plan internally consistent:

1. **Move all grammar into Task 9.** Tasks 4, 7, and 8 build and export the services and
   test them through internal entry points (`test/helpers/internal-api.mjs` already exists
   for exactly this); Task 9 adds every command to `parse.mjs`/`help-data.mjs` at once.
   This is what "activation occurs only in #61" actually means, and it is what I'd
   recommend.
2. **Keep the grammar staged but gate the spend-capable commands.** If `reclaim-lock`
   genuinely needs to ship at #59 (it is a degraded-recovery tool and a case could be made),
   say so explicitly, and state that `recover-record`, `enter-intervention`,
   `cancel-intervention`, `rotate-author`, and `adopt-record` refuse with a stable error
   until #61.

Either way, correct Task 9's Interfaces line and delivery-order steps 4-5 so they describe
what the tasks actually do.

---

### P3 — Eleven existing files that these tasks break appear in no task's file list

**All tasks.**

The plan's own header directs agentic workers to implement it task-by-task with
`superpowers:subagent-driven-development`. A subagent works from the **Files** block. A
file omitted there is a change that does not happen, and a test that fails at the end of
a 62-hour serial delivery instead of inside the task that broke it.

I grepped the repository for every file that touches the surfaces these tasks rewrite.
These exist today and appear in no task:

**Launcher surface** (rewritten by Task 5, routed by Task 9):

- `test/unit/claude-launch-permissions.test.mjs`
- `test/integration/claude-launch-permissions.test.mjs`
- `test/integration/reviewer-boundary.test.mjs`
- `test/integration/reviewer-guard.test.mjs`
- `test/live/claude-live-conformance.mjs` — not a `.test.mjs`, so no script runs it; it
  will rot silently. Name it as "update, do not run."

**Recovery/intervention surface** (Tasks 7-8):

- `test/integration/recovery.test.mjs` — the existing suite for `recover --reclaim` /
  `--replace-participant`, which Task 7 sits directly on top of.
- `test/helpers/intervention-fixture.mjs` — Task 7 widens `interrupted_state` to six
  states; this fixture builds interventions.

**Generated collateral** (Tasks 3 and 9):

- `templates/author-startup.md` and `templates/reviewer-invitation.md` — these carry the
  generated participant commands. `templates/author-startup.md:37` hardcodes
  `npx --yes ai-peer-review@0.2.2`, matching `src/cli/run.mjs:600`. Task 9's "Pin generated
  participant commands to the creator package version" must change both, and Task 9 lists
  neither.
- `test/golden/templates.test.mjs` and the six fixtures under `test/golden/templates/` —
  these pin the generated text byte-for-byte.
- `test/golden/manifests.test.mjs` and the four fixtures under `test/golden/manifests/` —
  Task 3 modifies `src/manifest/render.mjs` to embed the terminal lineage receipt, which
  changes rendered manifest bytes. Task 3 lists only `test/unit/manifest.test.mjs`.

**Parity ledger:**

- `test/integration/ported-behavior-parity.test.mjs`, which reads
  `test/fixtures/legacy-behavior-parity.json` and inspects repository files through git.
  Tasks 1, 2, 3, 5, 6, and 7 all modify files it is likely keyed to.

**Requested.** Add each file to the task that breaks it, and add the golden-fixture
regeneration step where one is needed. If the parity ledger is expected to need an update,
say which task owns it and what evidence justifies the change — a parity ledger that gets
silently regenerated is worth nothing.

---

## 2. Significant

### P4 — Only Task 10 runs the full gate, so four stories close on focused tests alone

**Tasks 2, 3, 5, 8 (the story-closing tasks) vs Task 10.**

Tasks 1-9 each run a focused `node --test` list. The complete gate —
`npm test`, `npm run test:slow`, `npm run test:packaging`, `npm run lint`,
`npm run format:check` — runs only in Task 10.

That means #57, #58, #59, and #60 each merge having run a subset. Given that
`src/protocol/events.mjs` is modified by Tasks 1, 2, 3, 6, and 7, and
`src/protocol/reducer.mjs` by Tasks 1, 3, 6, and 7, a regression in any of the ~45 test
files not named in a focused list surfaces at the end of a 62-hour delivery rather than
inside the task that caused it. P3 makes this worse, because the unlisted files are
exactly the ones most likely to break.

The spec's §Repository gates says "The complete delivery gate includes ..." — and each
story is a delivery.

**Requested.** Add the full gate as the final step of each story-closing task (2, 3, 5, 8),
not just Task 10. Keep the focused runs as the inner TDD loop; the gate is the merge
condition.

### P5 — The Claude environment allowlist is missing entries that will break real hosts, and the plan pins it as closed

**Task 5, step 5.**

The named list is `HOME`, `USERPROFILE`, `APPDATA`, `LOCALAPPDATA`, `XDG_CONFIG_HOME`,
`XDG_CACHE_HOME`, `TMPDIR`, `TEMP`, `TMP`, `PATH`, `SHELL`, `TERM`, `LANG`, `LC_ALL`,
`LC_CTYPE`, `ANTHROPIC_API_KEY`, `CLAUDE_CONFIG_DIR`, `SSL_CERT_FILE`, `SSL_CERT_DIR`,
`NODE_EXTRA_CA_CERTS` — with "every other inherited name is removed unless a later adapter
version explicitly adds it."

Closing the list is the right discipline. But the plan closes it in one step, and it is
missing categories that will produce support tickets rather than clean failures:

- **Windows process essentials.** `SystemRoot` (and `SYSTEMROOT`), `COMSPEC`, `PATHEXT`,
  `WINDIR`. A Node child spawned on Windows without `SystemRoot` fails in DNS and crypto
  paths — the failure is obscure and looks nothing like an environment-policy problem.
  This is the single highest-value addition.
- **Proxy configuration.** `HTTP_PROXY`, `HTTPS_PROXY`, `NO_PROXY` (and lowercase forms).
  In a corporate network the provider simply cannot reach its API without them. None
  asserts session or model identity, so they pass the spec's test at
  §"Executable and environment preflight".
- **Non-API-key authentication.** `ANTHROPIC_API_KEY` covers one auth mode. The adapter
  needs a stated position on gateway/enterprise auth variables — the spec's rule is
  "credentials that cannot assert session or model identity," and the plan should say the
  adapter classifies them rather than implying the list is complete.

One tension worth a sentence: `PATH` is preserved for the child while the spec forbids
PATH lookup for executable resolution. Both are correct — the child needs `PATH` for its
own subprocesses; the package resolves absolutely. Say so, because the two rules read as
contradictory side by side.

**Requested.** Extend the list with the Windows and proxy names, state the adapter's
position on alternate auth, and note the `PATH` distinction. Also add a test that the
allowlist is the *only* source of child env — a negative test asserting an arbitrary
injected variable does not reach the child.

### P6 — Task 3 modifies a closed v1 schema without saying how

**Task 3, "Modify: `schemas/{event-v2,manifest-v1}.json`".**

`schemas/manifest-v1.json` is `"additionalProperties": false`, with a fixed 20-entry
`required` array and `"schema": { "const": "ai-peer-review.manifest/v1" }`. Adding the
terminal lineage receipt has two very different outcomes:

- **Optional property** — old manifests keep validating, and the receipt is present only
  on manifests written by the new package. This works, but then "a complete terminal
  receipt permits consolidation without scratch" applies only to records terminalized
  after #58, and the plan should say what pre-#58 terminal records do.
- **Required property** — every existing manifest and all four fixtures under
  `test/golden/manifests/` become invalid, and the constraint "v1 stays byte-stable" (plan
  File structure, line 54) is broken.

**Requested.** State which, and if optional, state the behavior for records terminalized
before #58. Add `test/golden/manifests.test.mjs` and its fixtures to Task 3's file list
either way (see P3).

### P7 — No rollback story for a version-gated on-disk format across five releases

**Plan-wide.**

Once a workspace contains a v2 event, the sealed `minimum_reader_version` means reverting
the installed package below that minimum makes the workspace unreadable —
`APR_READER_UPGRADE_REQUIRED` by design. That is correct behavior, and it means a release
revert is not a safe operation after any user has created a v2 record.

The plan has no rollback or abort section. For a five-release serial delivery of a format
change, that is a real operational gap, and it interacts with P1: if v2 stays dormant
until #61 then only one release carries this risk, which is a strong argument for option 1
there.

**Requested.** Add a short "Rollback and abort" section: which releases are revertible,
what an operator does with a workspace written by a newer package, and at which story the
point of no return sits.

### P8 — Lock-liveness probes spawn subprocesses without a stated scope or resolution rule

**Task 4, step 2.**

"macOS `sysctl -n kern.boottime` plus `ps -o lstart= -p <pid>` via `execFile`; Windows
noninteractive PowerShell/CIM argv."

Two things need pinning:

1. **Scope.** `withReviewLock` (`src/protocol/store.mjs:151-211`) runs on every mutating
   command, and the launcher acquires it immediately before dispatch. If the probes run on
   every acquisition rather than only on the `EEXIST` stale-lock path, every operation pays
   a subprocess spawn — and a PowerShell start is hundreds of milliseconds. State that the
   probes run only when acquisition finds an existing lock.
2. **Resolving the probe executables.** The spec forbids PATH lookup and bare commands for
   the package and provider executables. `sysctl`, `ps`, and `powershell.exe` are subject
   to the same reasoning — a lock-liveness probe that resolves through `PATH` is a trust
   decision made inside the mechanism that protects every append. Say how they are
   resolved (absolute canonical paths, verified how) and what happens when resolution
   fails — presumably `APR_REVIEW_LOCK_LIVENESS_UNKNOWN`, which is the correct fail-closed
   answer.

---

## 3. Clarifications

### P9 — The decomposition table does not account for execution authority

The table's #59 row reads "Crash-safe locks, current-turn contracts, deterministic
preflight" and #60 reads "Human-authorized recovery, author rotation, successors,
adoption." Task 6 — `execution-started` / `execution-resolved`, the lock-release-before-
dispatch discipline, outcome classification — is labeled #60 but is described by neither
row. Add it to one of them so the table matches the tasks.

### P10 — Task 7's interfaces omit the rotation action and the silent-failure seam

- Task 7's Interfaces line lists "protected action `additional-recovery`" but not
  `rotate-author-session`, though `rotateAuthor` is in the same list. Both are new
  protected actions.
- The spec explicitly names `protectedParametersMatchEvent` as a required seam, because its
  fallthrough is `return action === 'accept-over-objections'` — an unhandled action returns
  **false** and every grant is rejected as "protected event lacks one live bound
  challenge," which reads like a signing bug rather than a missing branch. Task 7 modifies
  `src/protocol/reducer.mjs` but does not name it. Name it, and add a failing test for an
  unmatched action so the trap is caught by the RED step rather than during debugging.

### P11 — `lock-reclaimed` is not mentioned

The spec makes `lock-reclaimed` an optional sequence-only projection appended when a
reducible non-terminal log exists, with the `locks/stale/` receipt as the authority. Task 4
covers the receipt and the command but never mentions the event. Either add it or state
that it is deferred, so an implementer does not have to infer which.

### P12 — Replace the asserted AC mapping with an explicit matrix

The self-review checklist asserts "All ten architecture acceptance criteria map to Tasks
1-10" without showing the mapping. For a plan executed task-by-task by subagents, a small
AC→task table is cheap and makes the claim checkable — and it will surface any criterion
that currently has no owner. (AC 10, "Planning determines the decomposition," is satisfied
by the §Decomposition decision section rather than by a task; that is fine, but the table
should show it.)

---

## 4. What closes this review

**Blocking:** P1 (sealed compatibility list vs. staged event delivery — answer whether v2
is dormant before #61), P2 (CLI grammar activation must match the stated #61 boundary,
especially for the spend-capable `recover-record`), P3 (add the eleven existing files to
the tasks that break them).

**Significant:** P4 (full gate per story), P5 (allowlist gaps and the `PATH` distinction),
P6 (how `manifest-v1.json` changes), P7 (rollback section), P8 (probe scope and
resolution).

**Clarifications:** P9-P12.

To be clear about proportion: the architecture behind this plan is one I accepted after
five rounds, the decomposition is the right one, and the task structure is sound. Every
finding here is about the plan's fidelity to the repository as it actually exists —
file lists that miss real dependents, an activation boundary the tasks do not honor, and
one genuine sequencing defect in P1 that would only surface when recovery ships against
records created months earlier.
