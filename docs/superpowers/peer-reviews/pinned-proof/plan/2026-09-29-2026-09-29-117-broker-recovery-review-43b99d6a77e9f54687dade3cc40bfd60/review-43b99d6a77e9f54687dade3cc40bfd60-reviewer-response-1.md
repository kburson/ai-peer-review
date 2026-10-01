<!-- ai-peer-review-template version="1" digest="sha256:78e9a634af9d540baaf6790db82952eaf39cf7ab59a6cdc7938319ae07a4cbed" -->

<!-- protected-frontmatter -->

---
schema: "ai-peer-review.response/v1"
review_id: "review-43b99d6a77e9f54687dade3cc40bfd60"
role: "reviewer"
turn: 1
commit_mode: "normal"
authority_assurance: "unavailable"
artifact_path: "docs/superpowers/plans/2026-09-29-117-broker-recovery.md"
artifact_commit: "1a9fa51f74c759b9345ef400906db9ef741a5ed3"
artifact_blob: "fbc081b3e91281eefa3a2075be1049ca628462a8"
artifact_digest: "sha256:a642430a0f2fa7ac51d734bd00c2e1e221aeeb9f4d37b8854100dd547c24db11"
agent:
  host: "claude-code"
  provider: "anthropic"
  model_id: "claude-opus-5-5"
  model_display: "claude-opus-5-5"
  session_fingerprint: "sha256:dc9c2018cf6fe91df2b70e4b78e3a4dea131ca588375796be5c9752a715453d9"
  identity_source: "runtime"
started_at: "2026-09-29T08:08:59.830Z"
submitted_at: "2026-09-29T08:11:12.626Z"
finding_ids: ["R1-F001","R1-F002","R1-F003","R1-F004","R1-F005","R1-F006","R1-F007","R1-F008","R1-F009"]
answered_finding_ids: []
acknowledged_supplement_ids: []
---

Mode: `normal`

## Summary

I reviewed the plan against its governing spec, `docs/superpowers/specs/2026-09-29-117-broker-recovery-design.md`, and against the tree at `1a9fa51`. Every path in the File Map exists. The plan keeps the right global constraints: sealed reviewer selection, no evidence deletion, a failing test before each change, no paid provider calls in the suites, and no npm publication. Tasks 3 and 4 correctly treat hook denials, generic exits, and missing joins as non-proof.

The plan is not ready to execute. Its Self-Review says "Every section of the #117 design is mapped to Tasks 1–5", and that claim is false in several places:

1. The spec's required launch-integrity gate (Status paragraph, Verification item 6) has no task. The current code still uses the realpath-equality alias check that the spec calls insufficient.
2. Task 2 ranks candidates first by "proven mixed-image recovery support". The spec explicitly prohibits that capability-preference branch; it was removed from the spec after spec review R1-F003.
3. Task 1 implements scope the spec does not contain, and that scope is already present at the reviewed commit. Its "add failing test / record expected failures" steps cannot be carried out as written.
4. Task 3 leaves out the first stage of the spec's lock order (project broker ownership through a nonblocking try-lock, or live-broker suspension). Its test list also omits most of the blocked and eligible cases in spec Verification items 2 and 3.
5. Spec Verification item 4 (fresh-output route behavior) is covered only by help text. No behavioral test checks it.

Findings R1-F001 through R1-F006 are blocking. R1-F007 through R1-F009 are smaller alignment gaps that should be fixed in the same revision.

## Findings

### R1-F001 — The spec's launch-integrity gate and Verification item 6 are not mapped to any task

Location: the plan as a whole; File Map; Self-Review. Spec: the "Status and scope" paragraph ("A bare `peer-review` command requires verified execution-time binding … This is a required launch-integrity gate …") and Verification item 6.

The spec makes execution-time alias binding a required gate. The hook must resolve the command in the actual reviewer shell environment. The first executable must be the expected symlink, and its canonical target must be the sealed entrypoint. Entrypoint and package content must be verified against the sealed runtime digest, and runtime identity must be held until execution. The hook must fail closed when any of this cannot be established. The spec also states that "the current generation-time alias check and a successful live review do not establish that it is implemented."

No plan task, File Map row, or test covers this. The tree at `1a9fa51` still uses the approach the spec rejects: `localNpxBinMatches` in `src/provider/claude-launch.mjs:198-212` compares only `realpathSync(bin) === realpathSync(entry)`. The spec says launcher-PATH or realpath equality alone is insufficient, and that a same-path reinstall must invalidate the alias. The hook and launch owners (`src/provider/claude-launch.mjs`, `src/providers/claude.mjs`, and `src/providers/claude-hook.mjs` if it takes part in the permission decision) are also missing from the File Map.

Impact: a developer following the plan would deliver #117 without the gate the spec requires. The Task 5 live XPR could then pass and be taken as evidence of launch integrity, which the spec expressly rejects.

### R1-F002 — Task 2's candidate ranking reintroduces the capability preference the spec prohibits

Location: Task 2, third step ("Rank candidates by proven mixed-image recovery support, then authenticated chronology, then digest/path").

The spec's "Recovery authority" section says: "This issue introduces no capability-preference branch or capability marker: existing images contain no authenticated mixed-image capability declaration." Ranking must use authenticated startup/registration creation time as a recency heuristic, with runtime digest and canonical workspace as tie breakers. The spec also requires that each candidate's ranking reason state that recency orders reviews, not image age or compatibility. Verification item 1 requires tests asserting that "no unsupported capability marker is consumed".

The plan puts capability support first. That is the exact ranking the spec review (spec R1-F003) flagged because the evidence source was undefined, and the spec then removed it. The plan also omits these spec requirements:

- the ranking-reason limitation text;
- the rule that no candidate may be labeled compatible or ready before an authenticated handshake plus reconciliation of the exact registration set;
- the requirement to label the #1841 Opus 5.5 image "the newer candidate awaiting reconciliation";
- a test that no capability marker is consumed.

### R1-F003 — Task 1 adds scope the spec does not contain, and that scope is already implemented

Location: Task 1 (all steps); Global Constraints third bullet; Self-Review ("The new headless access finding …").

The spec does not mention `APR_BROKER_ACCESS_DENIED`, sandbox-denied sockets, "scoped host-execution recovery", or the rule against a parent invoking the CLI with a copied child session ID. The plan adds a new stable error code, a native change, and new agent guidance with no spec amendment and no reviewed contract. The recovery action is described only as "the exact scoped host-tool access route", so what it permits is undefined. Given the spec's emphasis on not weakening authority, the plan should not hand an implementer an undefined authority-adjacent instruction.

The behavior is also already in the tree at `1a9fa51`:

- `native/broker-security/posix.cc:419-424` maps `EACCES`/`EPERM` from `connect()` to `APR_BROKER_ACCESS_DENIED`.
- `native/broker-security/windows.cc:649,659` maps `ERROR_ACCESS_DENIED` the same way.
- `src/broker/platform.mjs:268` propagates the code.
- `src/cli/help-data.mjs:215,431,792` carries the help entries.
- Tests already exist in `test/unit/broker-build.test.mjs:96,188`, `test/integration/broker-startup.test.mjs:1784-1796`, and `test/golden/help.test.mjs:165-166`.

Task 1's "Add a failing … fixture" and "record the expected failures" steps therefore cannot succeed as written, and the plan's own test-first constraint cannot be met for this task. The File Map also names only `posix.cc`, although the Windows mapping exists and needs the same classification review.

### R1-F004 — Task 3's retirement lock order omits the project broker-ownership stage

Location: Task 3, fifth step ("Extend protocol abandonment under dispatch exclusion then review mutation lock"); second step (barrier list).

The spec's "Mutation and race safety" section defines the complete order as project broker ownership, then per-workspace dispatch exclusion, then the review mutation lock. For offline retirement it requires:

- an OS-enforced ownership lock taken with a nonblocking try-lock before any workspace lock;
- fail-closed behavior on contention or indeterminate ownership;
- ownership held through evidence validation, terminal append, and owned cleanup;
- no endpoint start or reconciliation callback during acquisition.

For a live broker, it requires authenticated durable suspension and worker settlement before workspace locks, and a restart from scratch if the code falls back to offline ownership.

The plan names only the last two stages. It also omits the abandon-versus-broker-startup ownership-contention barrier and the "no dispatch callbacks during offline acquisition" assertion from spec Verification item 3. A developer following the plan could correctly implement exactly what it says and still leave a window in which a starting broker dispatches the review while abandonment is being evaluated.

### R1-F005 — Task 3's tests omit most of the eligibility and blocking cases in spec Verification items 2 and 3

Location: Task 3, first, third, fourth, and sixth steps.

The plan lists five scenarios. The spec requires coverage of many more that the plan does not name:

- Eligible terminalization at each of the `manual`, `authority`, and `registered` stages, under exact author and proof authority.
- The typed package-local pre-dispatch receipt, with its closed reasons (`wake-adapter-unavailable`, `manual-recovery-fence-or-stale-revision`) and its bindings (operation/intent, review/request, runtime digest, evidence digest). The plan never names the receipt type, so there is no step that builds it.
- These blocked cases:
  - bare legacy `refused` entries;
  - adapter refusals after delivery, or without typed pre-delivery proof;
  - spawned-Claude selection and version refusals;
  - foreign proof;
  - stale receipts;
  - acknowledged launch or wake;
  - an interrupted attempt followed by a local refusal *within the same operation*.
- The reconcile three-state result (`definitely-not-submitted`, `submitted`, `outcome-unknown`), the truthful unsupported outcome for legacy manual launches, and preserved evidence and fences on unavailable observation and on timeout.
- Rejection of late `join`/`submit` after terminalization.
- Lost-author cleanup-pending retention, reported as a consumed output scope.
- A terminal exact `start` retry that does not start a broker or recreate a reservation. The plan says only "exact start retry cases".
- Every package-managed launch, resume, and wake entry point honoring the shared exclusion and rechecking terminal and fence state before provider effects. The plan covers only the manual launch path.
- The #1841 limitation (current hook denials cannot retire either attempt) stated in CLI guidance and in acceptance evidence.

The plan also says "unknown stays unknown", but it never requires the three named result states, so an implementation could collapse `submitted` into `outcome-unknown`.

### R1-F006 — Spec Verification item 4 (fresh-output route) has no behavioral test

Location: Task 5, first step (help assertions only).

The spec requires evidence that the fresh-output route creates a different review ID and invitation while leaving the ambiguous old reviews and reservations intact. It also requires that changing only the record ID is not advertised as sufficient, and that output-collision and lineage checks remain enforced. The plan checks only help text for the "independent fresh-output route". No task adds an integration test that runs `start` with a distinct `--reviews-root` or `--review-path-template` against a fixture holding a reserved ambiguous review, and then asserts a distinct ID and paths, intact old reservations, and enforced collision checks.

### R1-F007 — Task 2 leaves out the spec's read-only status mechanics

Location: Task 2, first and third steps.

The spec requires status to read without locks, to report a torn, changed, or inconsistent observation as unverifiable, and to not initialize provider adapters. Its zero-write check compares bytes, names, inode identity, and modification metadata across the scratch and broker trees, and excludes access-time changes. The plan says only "zero status writes" and "without mutation". A lock-taking or adapter-initializing status would pass the plan's tests as written. The plan should name these assertions, plus the foreign-project and symlinked unverifiable fixtures, which it currently groups under "malformed evidence".

### R1-F008 — Help and skill text changes come before their failing tests

Location: Task 1, last step; Task 5, first and second steps.

Task 1's last step edits `help broker`, `explain`, and the skill. The golden and parse tests that should fail first are not written until Task 5. That order breaks the plan's own constraint: "Write a focused failing test before each production change." Guidance changes should be driven by the task's own failing golden assertion, or moved entirely into Task 5.

### R1-F009 — Task 4 is missing three spec requirements

Location: Task 4, first and second steps.

The spec requires:

- tests for *contradictory* version data;
- a rule that an error without a provider-observed version must not fall back to a guessed locally installed version;
- if no supported envelope is found, recording the fixture and the deferral in *acceptance evidence*.

The plan says only "report the unsupported case". The spec also forbids adopting a new message-text pattern without separate review. The plan should state this so the fixture step does not quietly turn into stderr pattern matching.

## Required changes

1. (R1-F001) Add a task for the launch-integrity gate, and add its owners to the File Map (`src/provider/claude-launch.mjs`, `src/providers/claude.mjs`, and any hook module involved in reviewer Bash permission). Write failing tests for every case in spec Verification item 6:
   - an accepted execution-time exact alias;
   - a different install shadowing PATH;
   - a regular-file or foreign first executable;
   - a reviewer-shell PATH that differs from the launcher PATH;
   - a same-path reinstall with changed contents;
   - a change between validation and execution;
   - the exact absolute-path fallback.

   Implement resolution in the reviewer shell environment, digest-bound content verification, and fail-closed rejection before provider effects. Replace or tighten the realpath-only `localNpxBinMatches`. Correct the Self-Review claim.
2. (R1-F002) Replace the Task 2 ranking with the spec's order: authenticated creation-time recency, then runtime digest, then canonical workspace; unknown chronology reported explicitly. Remove "proven mixed-image recovery support". Add assertions that:
   - no capability marker is consumed;
   - each ranking reason states that recency orders reviews, not image compatibility;
   - no candidate is labeled compatible or ready before an authenticated handshake and reconciliation of the exact registration set.
3. (R1-F003) Either remove Task 1 and document the existing access-denied behavior as out-of-spec prior work, or amend the spec (a separate reviewed change) so the behavior has a governing contract. If Task 1 stays, rewrite it as verification of existing behavior at `1a9fa51`, not TDD of new code. Name both `posix.cc` and `windows.cc`. Define the recovery action concretely: which command, what scope, and why it does not weaken socket authority.
4. (R1-F004) State the full lock order in Task 3:
   - project broker ownership first (nonblocking try-lock offline; authenticated suspension and worker settlement when live), then dispatch exclusion, then the review mutation lock;
   - ownership held through terminal append and owned cleanup;
   - release in reverse order;
   - restart from scratch on fallback.

   Add the abandon-versus-broker-startup contention barrier and a "no dispatch or reconciliation callback during offline acquisition" assertion.
5. (R1-F005) Expand Task 3's failing-test list to cover every case in spec Verification items 2 and 3 listed in R1-F005. Name the typed pre-dispatch receipt and the three reconcile result states as implementation steps. Extend the exclusion and terminal recheck to every package-managed launch, resume, and wake entry point. Add the #1841 limitation to CLI guidance and to acceptance evidence.
6. (R1-F006) Add an integration test for the fresh-output route covering spec Verification item 4: distinct review ID, invitation, and canonical paths; intact old reservations and blocked status; enforced collision and lineage checks; and no guidance that changing only `--record-id` is sufficient.

## Optional suggestions

1. (R1-F007) Add explicit Task 2 assertions: lock-free status reads, torn-read reported as unverifiable, no provider-adapter initialization, zero-write comparison of bytes, names, inode, and mtime (excluding atime) across the scratch and broker trees, and foreign-project and symlinked unverifiable fixtures.
2. (R1-F008) Move each help, explain, and skill edit behind a golden or parse assertion that fails first, in the same task.
3. (R1-F009) In Task 4, add contradictory-version fixtures and a no-guessed-local-version test. Require recording the fixture and any deferral in acceptance evidence, and restate that no new message-text or stderr pattern may be adopted without separate review.

## Decision

revisions-requested
