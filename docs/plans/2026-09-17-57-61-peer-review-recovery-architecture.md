# Peer-Review Recovery and Execution Integrity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver the approved #57-#61 architecture as five serial stories without exposing a partially governed provider-launch path.

**Architecture:** Attempt event logs remain immutable authority. Event-v2 and mixed-log compatibility establish identity, lineage, Human Authority, execution, and recovery evidence; current-turn contracts and deterministic preflight feed one record recovery transaction; the public launcher switches only in the final story.

**Tech Stack:** Node.js 24 ESM, `node:test`, JSON Schema 2020-12, append-only JSONL, filesystem locks/fsync, Git fixtures, Prettier, ESLint, markdownlint, cspell.

**Spec:** `docs/design/2026-09-17-57-61-peer-review-recovery-architecture-design.md`

**Review status:** Accepted by Claude (Opus 5) in `docs/peer-reviews/plan/2026-09-17-57-61-peer-review-recovery-architecture-review/reviewer-response-4.md`.

## Global Constraints

- One record has one built-in recovery; every higher ordinal requires its own exact single-use `additional-recovery` Human Authority grant.
- `recover-record` is separate from existing claim-oriented `recover`.
- Full-Auto, generic approval, and resume cannot mint or replace a grant.
- `authority_policy: unavailable` cannot authorize additional recovery or author rotation.
- New authority uses event-v2; event-v1 bytes remain unchanged. Mixed logs validate per envelope.
- `manifest-v1.json` is a living additive schema for terminal collateral, not protocol authority; consumers validate with the same or a newer package than the manifest producer.
- Until #61, every user-reachable `start`, `join`, `submit`, recovery, and finalization path emits event-v1 only. Event-v2 constructors and mutation services remain reachable only through `test/helpers/internal-api.mjs`.
- A legacy log's first event-v2 line is atomically preceded by `compatibility-declared` in one locked batch.
- Execution events advance sequence only. Recovery claims, author rotation, and intervention cancellation advance revision.
- Release the review lock before provider `execFile`; child `join` and `submit` use the same lock.
- Exact absolute commands and permissions have no PATH, alias, shell, or broad-glob fallback.
- Strip all inherited provider session/model variables, including same-provider Claude keys.
- Missing lineage is unavailable; contradictory lineage is invalid.
- Preserve #56 and historical #57-#61 bodies. Use no live or paid provider.
- Each story may chain one discovered defect; a second is fixed in-story or stops for human direction.

---

## Decomposition decision

Rewrite #57-#61 as five serial stories. Do not combine or replace them. The reviewed specification expanded the work to approximately 62 focused hours.

| Issue | Rewritten scope                                                                                         | Size / estimate | Depends on |
| ----- | ------------------------------------------------------------------------------------------------------- | --------------: | ---------- |
| #57   | Event-v2 compatibility, atomic batches, truthful participant evidence                                   |         L / 12h | None       |
| #58   | Validated lineage, terminal receipts, honest unavailable states                                         |         L / 10h | #57        |
| #59   | Crash-safe locks, current-turn contracts, deterministic preflight                                       |        XL / 14h | #58        |
| #60   | Sequence-only execution authority, Human-authorized recovery, author rotation, successors, and adoption |        XL / 18h | #59        |
| #61   | Atomic CLI activation, compatibility, incident regression                                               |          L / 8h | #60        |

After plan acceptance, rewrite bodies through AITM's sanctioned mutator, preserve each original defect under Story Origin, replace the obsolete no-plan/no-review instruction, set these estimates, and encode the dependency chain. Never use direct `gh issue edit --body`.

## File structure

- `src/protocol/compatibility.mjs` — event schema selection and reader/writer gates.
- `src/identity/evidence.mjs` — session/model evidence and conflicts.
- `src/protocol/record-lineage.mjs` — record graph, state, terminal receipts.
- `src/protocol/process-identity.mjs` — platform boot/process probes.
- `src/provider/execution-contract.mjs` — current-turn execution authority.
- `src/provider/preflight.mjs` — executables, permission grammar, environment receipts.
- `src/protocol/recovery.mjs` — interventions, grants, recovery, successors, adoption.
- `src/package-version.mjs` — validated runtime read of the installed creator package version for exact zero-install pins.
- `schemas/{event,protocol,participants}-v2.json` — closed v2 schemas; v1 stays byte-stable.
- `schemas/manifest-v1.json` — living additive schema for terminal collateral; existing required fields and meanings remain stable.
- `test/helpers/internal-api.mjs` — test-only access to dormant v2 and recovery services before atomic #61 CLI activation.
- `src/cli/run.mjs` remains orchestration; new domain behavior belongs in focused modules.

## Activation, rollback, and abort

- This `docs/superpowers` plan file remains off-trunk execution input. Hydrate the accepted task text into #57-#61, then create each implementation worktree from the approved code baseline rather than merging the plan file. The durable review records under `docs/peer-reviews/plan/` are tracked evidence and may remain on trunk; they are not parity-gated legacy paths.
- Before every story gate, the implementation worktree must contain no files on disk under `docs/superpowers`, `scripts/review`, `scripts/providers`, or `scripts/tests`. `test/integration/ported-behavior-parity.test.mjs` recursively reads those working-tree directories and its `publishable HEAD contains no parity-gated legacy path` assertion fails for tracked, untracked, ignored, or stashed-and-restored files alike.
- #57-#60 are revertible as runtime releases because their v2 writers and new recovery commands remain unreachable from the public CLI. A real public `start`/`join`/`submit` cycle continues to write only event-v1 bytes after each intermediate story.
- #61 is the point of no return for any workspace that receives its first event-v2 line. Reverting the installed package below that record's sealed `minimum_reader_version` is not a recovery path; the older reader must refuse with `APR_READER_UPGRADE_REQUIRED`.
- If #61 must be rolled back after v2 use, stop mutation, preserve the workspace bytes, and reinstall the exact or a newer compatible package version declared by the record. Do not rewrite or downgrade the log. A release rollback may hide #61 only for workspaces proven never to contain event-v2.
- Abort any intermediate story before merge if its full story gate fails. Do not activate part of #61: its grammar, routing, templates, and v2 writers merge and release as one atomic delivery.

## Rollout notes

- #61 intentionally removes accidental Claude Bedrock and Vertex launch support. The current launcher inherits the ambient environment; the governed launcher instead detects `CLAUDE_CODE_USE_BEDROCK` or `CLAUDE_CODE_USE_VERTEX` and stops before dispatch with `APR_ENVIRONMENT_INVALID`.
- Restoring either enterprise mode requires a separately versioned Claude adapter policy that classifies its complete credential/configuration family, proves none can assert reviewer session or model identity, adds only those names to the closed child environment, and extends preflight and negative-leakage tests. It is not a generic environment passthrough.

---

### Task 1: Event-v2 compatibility and atomic batches (#57)

**Files:**

- Create: `src/protocol/compatibility.mjs`
- Create: `schemas/event-v2.json`
- Create: `schemas/protocol-v2.json`
- Create: `schemas/participants-v2.json`
- Modify: `src/protocol/{events,reducer,service,store}.mjs`
- Modify: `test/helpers/review-fixture.mjs`
- Modify: `test/helpers/internal-api.mjs`
- Create: `test/unit/compatibility-authority.test.mjs`
- Test: `test/unit/{events,reducer,store}.test.mjs`
- Create: `test/integration/{v2-dormancy,release-upgrade-compatibility}.test.mjs`
- Test: `test/integration/ported-behavior-parity.test.mjs`

**Interfaces:** Produces `validateVersionedEvent`, `assertReaderWriterCompatibility`, `mutateReviewBatch`, and `appendLockedEvents`; test fixtures produce `v2Event(type, options)` without exposing a public writer.

- [ ] Write failing mixed-log, adjacent-declaration, minimum-version, and atomic-batch tests.

```js
await mutateReviewBatch(workspace, expected, (state) => [
  compatibilityDeclared(state, compatibility),
  v2Event('supplement-registered', {
    sequence: state.sequence + 2,
    revision: state.revision + 1,
    reviewId: state.review_id,
  }),
]);
assert.deepEqual(
  readEvents(workspace)
    .slice(-2)
    .map((e) => e.type),
  ['compatibility-declared', 'supplement-registered']
);
```

- [ ] Run `node --test test/unit/compatibility-authority.test.mjs test/unit/events.test.mjs test/unit/reducer.test.mjs test/unit/store.test.mjs`; expect failure because only event-v1 and one-event append exist.
- [ ] Implement per-event schema selection. Unknown events fail with `APR_READER_UPGRADE_REQUIRED`; v2 writes below the sealed minimum fail with `APR_WRITER_UPGRADE_REQUIRED`.
- [ ] Implement one-lock, one-fsynced-write batch append and reduce the full batch before projection writes. Never expose declaration alone.
- [ ] Export v2 constructors and batch mutation only through `test/helpers/internal-api.mjs`. Keep every public mutation on event-v1 until Task 9.
- [ ] Add a real public `start` → `join` → `submit` integration test that asserts every envelope remains event-v1. Add a release-upgrade test that creates a v1 record, opens it with the v2 reader, then atomically appends `compatibility-declared` plus the first v2 event through the internal API.
- [ ] Run `node --test test/unit/compatibility-authority.test.mjs test/unit/events.test.mjs test/unit/reducer.test.mjs test/unit/store.test.mjs test/integration/v2-dormancy.test.mjs test/integration/release-upgrade-compatibility.test.mjs test/integration/ported-behavior-parity.test.mjs`; expect PASS.
- [ ] Commit: `git commit -m "feat: add mixed-log compatibility authority [#57]"` with the files above staged.

### Task 2: Truthful participant evidence (#57)

**Files:**

- Create: `src/identity/evidence.mjs`
- Modify: `src/identity/{codex,claude,grok,generic,registry}.mjs`
- Modify: `src/cli/run.mjs`
- Modify: `src/protocol/events.mjs`
- Modify: `schemas/{event,participants}-v2.json`
- Create: `test/unit/model-provenance.test.mjs`
- Test: `test/unit/{identity,events}.test.mjs`
- Test: `test/integration/claude-identity.test.mjs`
- Modify: `test/integration/start-join.test.mjs`
- Test: `test/integration/{v2-dormancy,ported-behavior-parity}.test.mjs`

**Interfaces:** Produces `identityEvidence(input)`, `mergeObservedIdentity(prior, observation)`, and `v1Participant(identity)`. The identity result carries evidence for runtime decisions and v2 projection; `v1Participant` returns only the frozen eight-field event-v1 shape. V2 participants require nested `session` and `model` evidence plus compatibility mirrors.

- [ ] Write failing declaration/conflict tests.

```js
const identity = resolveIdentity({
  adapter: 'codex',
  role: 'author',
  joinedAt,
  env: { CODEX_THREAD_ID: 'secret', CODEX_MODEL_ID: 'gpt-6-astra' },
});
assert.equal(identity.evidence.model.assurance, 'declared');
const observed = mergeObservedIdentity(identity, {
  session_fingerprint: identity.session_fingerprint,
  model_id: 'gpt-5.6-sol',
  source: 'provider-result',
});
assert.equal(observed.evidence.model.conflict, true);
const legacy = v1Participant(observed);
assert.deepEqual(Object.keys(legacy).sort(), [
  'host',
  'identity_source',
  'joined_at',
  'model_display',
  'model_id',
  'provider',
  'role',
  'session_fingerprint',
]);
assert.equal(Object.hasOwn(legacy, 'evidence'), false);
```

- [ ] Run `node --test test/unit/model-provenance.test.mjs test/unit/identity.test.mjs test/unit/events.test.mjs test/integration/claude-identity.test.mjs`; expect failure because environment model data is still labeled `runtime` and no nested evidence exists.
- [ ] Implement official-runtime, provider-result, environment-declaration, configuration, launch-request, explicit-declaration, and legacy-unclassified sources. Only provider observation is `observed`.
- [ ] Apply `v1Participant(identity)` at all four event-v1 write seams: `review-created.author`, `reviewer-joined.reviewer`, `identity-changed.identity`, and `participant-replaced.incoming_participant`. Also project the right operand at the three `sameParticipant` comparison seams: the `start` exact-retry predicate and both `join` idempotent-retry predicates in `src/cli/run.mjs`. Keep projection explicit at each seam rather than changing the general comparison helper. Carry the evidence-bearing identity alongside for runtime checks and eventual v2 projection; never insert `evidence` into a v1 payload.
- [ ] Extend `test/integration/start-join.test.mjs` with evidence-bearing author and reviewer identities. Assert an exact `start` retry returns the existing workspace rather than `APR_OUTPUT_COLLISION`, and both no-claim and same-claim `join` retries return the existing reviewer turn.
- [ ] Leave the existing `validateParticipant` v1 branch byte-for-byte unchanged, including its eight-field `exactKeys`. Add a separate v2 validator requiring mirrors plus evidence. Keep public participant mutations on v1; exercise v2 evidence only through the internal API until Task 9. Extend `v2-dormancy.test.mjs` to assert the exact eight participant keys, not only each envelope's schema string.
- [ ] Run `node --test test/unit/model-provenance.test.mjs test/unit/identity.test.mjs test/unit/events.test.mjs test/unit/manifest.test.mjs test/integration/claude-identity.test.mjs test/integration/start-join.test.mjs test/integration/finalization.test.mjs test/integration/v2-dormancy.test.mjs test/integration/ported-behavior-parity.test.mjs`; expect PASS.
- [ ] Confirm the implementation worktree contains no files on disk under `docs/superpowers`, `scripts/review`, `scripts/providers`, or `scripts/tests`; otherwise the parity suite's `publishable HEAD contains no parity-gated legacy path` assertion will fail regardless of Git tracking state.
- [ ] Run the #57 story gate:

```bash
npm test
npm run test:slow
npm run test:packaging
npm run test:smoke
npm run lint
npm run format:check
npm pack --dry-run
```

Expected: every command exits 0, public protocol cycles remain event-v1, and the package contains the dormant v2 schemas without exposing a v2 writer.

- [ ] Commit: `git commit -m "feat: record truthful participant evidence [#57]"`.

### Task 3: Lineage and durable terminal receipts (#58)

**Files:**

- Create: `src/protocol/record-lineage.mjs`
- Modify: `src/protocol/{reducer,service}.mjs`
- Modify: `src/collateral/review-record.mjs`
- Modify: `src/manifest/render.mjs`
- Modify: `src/cli/run.mjs`
- Modify: `schemas/{event-v2,manifest-v1}.json`
- Create: `test/unit/record-lineage.test.mjs`
- Create: `test/integration/supersession-lineage.test.mjs`
- Test: `test/integration/{review-record,finalization}.test.mjs`
- Modify: `test/golden/manifests/{consensus,no-commit-consensus,no-commit-override,override}.md`
- Test: `test/golden/manifests.test.mjs`
- Test: `test/integration/ported-behavior-parity.test.mjs`

**Interfaces:** Produces `inspectRecordLineage(workspacesOrReceipt)` and `validateSuccessor({ predecessor, successor })`.

- [ ] Write failing tests distinguishing missing workspace (`lineage-unavailable`) from cross-record, branch, cycle, ordinal/grant gap, and digest conflict (`lineage-invalid`).
- [ ] Run `node --test test/unit/record-lineage.test.mjs test/integration/supersession-lineage.test.mjs`; expect failure because supersession checks syntax only and no durable lineage receipt exists.
- [ ] Validate physical repository/worktree, record/root IDs, reciprocal edges, ordinal increments, claim/grant digests, and event-log digests.
- [ ] Require readable reciprocal successor authority before standalone supersession; allow noncolliding review-ID-prefixed files in one record directory.
- [ ] Apply the living-v1 manifest policy: add optional `lineage_receipt` to closed `manifest-v1.json`, do not add it to `required`, and retain every existing field and meaning. A manifest producer and validator use the schema shipped by that package version; an older package may reject newer additive terminal collateral and must be upgraded rather than treating that rejection as protocol corruption. At terminalization, embed ordered IDs, ordinals, edges, grants, and log digests without absolute paths. Preserve through consolidation; permit inspection but never execution from the receipt.
- [ ] Treat a pre-#58 terminal manifest without `lineage_receipt` as valid legacy data. Inspect it from retained workspaces when available; after scratch loss report `incomplete-unavailable` and refuse consolidation or execution rather than fabricating a receipt.
- [ ] Regenerate the four manifest golden fixtures from the deterministic renderer and review the byte diff. Keep existing parity-owner test names stable; update `test/fixtures/legacy-behavior-parity.json` only if an intentional owner rename is separately justified in Task 10.
- [ ] Run `node --test test/unit/record-lineage.test.mjs test/unit/manifest.test.mjs test/unit/review-record.test.mjs test/golden/manifests.test.mjs test/integration/supersession-lineage.test.mjs test/integration/review-record.test.mjs test/integration/finalization.test.mjs test/integration/ported-behavior-parity.test.mjs`; expect PASS.
- [ ] Confirm the implementation worktree contains no files on disk under `docs/superpowers`, `scripts/review`, `scripts/providers`, or `scripts/tests`; otherwise the parity suite's `publishable HEAD contains no parity-gated legacy path` assertion will fail regardless of Git tracking state.
- [ ] Run the #58 story gate:

```bash
npm test
npm run test:slow
npm run test:packaging
npm run test:smoke
npm run lint
npm run format:check
npm pack --dry-run
```

Expected: every command exits 0, legacy manifests without receipts still validate, and new terminal manifests contain deterministic optional receipts.

- [ ] Commit: `git commit -m "feat: validate and retain review lineage [#58]"`.

### Task 4: Crash-safe review locks (#59)

**Files:**

- Create: `src/protocol/process-identity.mjs`
- Modify: `src/protocol/{events,reducer,store}.mjs`
- Modify: `schemas/event-v2.json`
- Modify: `test/helpers/internal-api.mjs`
- Create: `test/unit/process-identity.test.mjs`
- Test: `test/unit/store.test.mjs`
- Create: `test/integration/review-lock-recovery.test.mjs`

**Interfaces:** Produces `observeProcessIdentity`, `inspectReviewLock`, and `reclaimReviewLock`.

- [ ] Write failing live, stale, PID-reuse, different-boot, foreign-host, and unknown-liveness tests.
- [ ] Run liveness probes only after exclusive lock creation fails with `EEXIST`; uncontended mutation and the final launcher acquisition spawn no probe subprocess.
- [ ] Implement Linux `/proc/sys/kernel/random/boot_id` plus `/proc/<pid>/stat` start ticks without subprocesses. On macOS use only canonical regular, non-symlink `/usr/sbin/sysctl` and `/bin/ps`. On Windows use only canonical regular, non-reparse `C:\Windows\System32\WindowsPowerShell\v1.0\powershell.exe` with `-NoLogo -NoProfile -NonInteractive`; a nonstandard installation takes the degraded path. Invoke with `execFile`/`shell: false`. A missing, redirected, unverifiable, or failed executable yields `APR_REVIEW_LOCK_LIVENESS_UNKNOWN`; never search `PATH`.
- [ ] Extend locks with host, boot, and process-start identity. Proven death atomically renames exact-digest bytes to `locks/stale/`, fsyncs, and retries; live and unknown fail distinctly.
- [ ] Implement internal `reclaimReviewLock({ workspace, lockDigest, reason, confirmReclaim })`; retain original bytes/evidence and never dispatch. Export it through `test/helpers/internal-api.mjs`; Task 9 owns the public `reclaim-lock` grammar.
- [ ] Define optional sequence-only event-v2 `lock-reclaimed`. Append it through the internal path only when a reducible nonterminal log exists; the retained `locks/stale/` receipt remains authority. Genesis-crash and terminal/no-log reclamation succeed receipt-only. Keep public paths event-v1 before Task 9.
- [ ] Test genesis crash and terminal/no-log receipt-only reclamation.
- [ ] Run `node --test test/unit/process-identity.test.mjs test/unit/store.test.mjs test/unit/events.test.mjs test/unit/reducer.test.mjs test/integration/review-lock-recovery.test.mjs test/integration/v2-dormancy.test.mjs`; expect PASS.
- [ ] Commit: `git commit -m "feat: retain and reclaim stale review locks [#59]"`.

### Task 5: Current-turn contracts and deterministic preflight (#59)

**Files:**

- Create: `src/provider/execution-contract.mjs`
- Create: `src/provider/preflight.mjs`
- Modify: `src/provider/claude-launch.mjs`
- Modify: `src/protocol/service.mjs`
- Modify: `src/config/load.mjs`
- Modify: `src/public-api.mjs`
- Create: `test/unit/{execution-contract,provider-preflight}.test.mjs`
- Test: `test/unit/claude-launch-permissions.test.mjs`
- Create: `test/integration/{claude-reviewer-turn-rotation,claude-launch-bootstrap}.test.mjs`
- Test: `test/integration/{claude-launch-permissions,reviewer-boundary,reviewer-guard,ported-behavior-parity}.test.mjs`
- Modify, do not run: `test/live/claude-live-conformance.mjs`

**Interfaces:** Produces `buildReviewerExecutionContract(input)` and `preflightReviewerExecution(input)`. Provider capabilities include canonical resolver, minimum version, non-model probe argv, identity-key removal set, credential allowlist, and permission encoder.

- [ ] Write failing tests for turn 2, omitted join, absolute Node/package argv, version skew, unsafe symlink, Unix/Windows permission representability, and provider invocation count zero.

```js
const second = buildReviewerExecutionContract({
  workspace: turnTwo,
  host: 'claude',
  model,
  effort,
  now,
});
assert.equal(second.join_required, false);
assert.match(second.response, /reviewer-response-2\.md$/);
assert.equal(second.commands.submit.file, process.execPath);
```

- [ ] Strip Codex, Claude, and Grok session/model variables, explicitly including all four Claude identity keys. Preserve only closed OS/locale/config/credential names; receipts list names, never values. Add a negative child-process test proving an arbitrary injected variable is absent rather than copying `process.env` and deleting known keys.
- [ ] Define the Claude allowlist exactly as `HOME`, `USERPROFILE`, `APPDATA`, `LOCALAPPDATA`, `XDG_CONFIG_HOME`, `XDG_CACHE_HOME`, `TMPDIR`, `TEMP`, `TMP`, `PATH`, `SHELL`, `TERM`, `LANG`, `LC_ALL`, `LC_CTYPE`, `SystemRoot`, `SYSTEMROOT`, `COMSPEC`, `PATHEXT`, `WINDIR`, `HTTP_PROXY`, `HTTPS_PROXY`, `NO_PROXY`, `http_proxy`, `https_proxy`, `no_proxy`, `ANTHROPIC_API_KEY`, `ANTHROPIC_AUTH_TOKEN`, `ANTHROPIC_BASE_URL`, `CLAUDE_CONFIG_DIR`, `CLAUDE_CODE_API_KEY_HELPER_TTL_MS`, `SSL_CERT_FILE`, `SSL_CERT_DIR`, and `NODE_EXTRA_CA_CERTS`; platform-absent names are omitted and every other inherited name is removed unless a later adapter version explicitly adds it. Preserve `PATH` only for subprocesses the already-resolved provider may launch; package and provider executable resolution itself remains absolute and never consults `PATH`.
- [ ] Support direct Anthropic credentials, configured Claude credentials, and gateway token/base-URL authentication because those inputs cannot assert reviewer session or model identity. Detect `CLAUDE_CODE_USE_BEDROCK` or `CLAUDE_CODE_USE_VERTEX` and fail preflight with `APR_ENVIRONMENT_INVALID` in this increment; their credential families require a separately versioned adapter classification before joining the allowlist. Any later alternate authentication variable must likewise be classified before admission rather than silently inherited.
- [ ] Implement workspace-derived contract and rotating private launch state. Invitation input may locate first turn only and supplies no routing authority.
- [ ] Resolve absolute executables, enforce sealed package minimum, run shell-free non-model probes, and fail unrepresentable argv with `APR_PERMISSION_UNREPRESENTABLE` without fallback.
- [ ] Update `test/live/claude-live-conformance.mjs` to build the same closed child environment, but do not run the paid live script. Run `node --test test/unit/execution-contract.test.mjs test/unit/provider-preflight.test.mjs test/unit/claude-launch-permissions.test.mjs test/integration/claude-reviewer-turn-rotation.test.mjs test/integration/claude-launch-bootstrap.test.mjs test/integration/claude-launch-permissions.test.mjs test/integration/reviewer-boundary.test.mjs test/integration/reviewer-guard.test.mjs test/integration/setup-doctor.test.mjs test/integration/ported-behavior-parity.test.mjs test/packaging/package.test.mjs`; expect PASS without dispatch.
- [ ] Confirm the implementation worktree contains no files on disk under `docs/superpowers`, `scripts/review`, `scripts/providers`, or `scripts/tests`; otherwise the parity suite's `publishable HEAD contains no parity-gated legacy path` assertion will fail regardless of Git tracking state.
- [ ] Run the #59 story gate:

```bash
npm test
npm run test:slow
npm run test:packaging
npm run test:smoke
npm run lint
npm run format:check
npm pack --dry-run
```

Expected: every command exits 0, arbitrary inherited environment variables do not reach the fake child, and no live provider is invoked.

- [ ] Commit: `git commit -m "feat: preflight current reviewer execution [#59]"`.

### Task 6: Sequence-only execution authority (#60)

**Files:**

- Modify: `src/protocol/{events,reducer,service}.mjs`
- Modify: `src/provider/claude-launch.mjs`
- Modify: `schemas/{event,protocol}-v2.json`
- Modify: `test/helpers/internal-api.mjs`
- Create: `test/unit/execution-ledger.test.mjs`
- Create: `test/integration/execution-reconciliation.test.mjs`
- Test: `test/integration/{v2-dormancy,ported-behavior-parity}.test.mjs`

**Interfaces:** Produces `beginExecution(workspace, contract, preflight, authorIdentity, now)` and `resolveExecution(workspace, executionId, outcome, authorIdentity, now)`. `execution-started` contains `execution_id`, `contract_digest`, `preflight_digest`, nullable `recovery_id`, `authority_sequence`, `authority_revision`, `author_fingerprint`, `reviewer_fingerprint`, and `response_digest`. `execution-resolved` contains `execution_id`, `outcome`, nullable `submission_sequence`, and nullable bounded `cause_code`/`cause_digest`.

- [ ] Write failing tests proving both events preserve revision, require the registered author, deduplicate by contract digest, and prefer submission authority over process status.
- [ ] Add closed `execution-started`/`execution-resolved` payloads with IDs/digests only and normalized outcomes from the spec.
- [ ] Under lock: revalidate and append start; complete projections and release lock; only then `execFile`. Reacquire for reconciliation. Prove child `join`/`submit` can lock. Export this execution coordinator only through the internal API; do not route the public launcher through it before Task 9.
- [ ] Preserve bounded pre-join executable/identity/schema/join/permission causes; never persist raw output.
- [ ] Run `node --test test/unit/events.test.mjs test/unit/reducer.test.mjs test/unit/store.test.mjs test/unit/execution-ledger.test.mjs test/unit/claude-launch-permissions.test.mjs test/integration/execution-reconciliation.test.mjs test/integration/claude-launch-permissions.test.mjs test/integration/reviewer-boundary.test.mjs test/integration/v2-dormancy.test.mjs test/integration/ported-behavior-parity.test.mjs`; expect PASS.
- [ ] Commit: `git commit -m "feat: record reviewer execution authority [#60]"`.

### Task 7: Authorization interventions and author rotation (#60)

**Files:**

- Modify: `src/authority/canonicalize.mjs`
- Create: `src/protocol/recovery.mjs`
- Modify: `src/protocol/{events,reducer}.mjs`
- Modify: `src/identity/registry.mjs`
- Modify: `schemas/event-v2.json`
- Modify: `test/helpers/{internal-api,intervention-fixture}.mjs`
- Create: `test/unit/recovery-authority.test.mjs`
- Create: `test/integration/{recovery-intervention,author-rotation}.test.mjs`
- Test: `test/integration/{recovery,v2-dormancy,ported-behavior-parity}.test.mjs`

**Interfaces:** Produces `enterAuthorizationIntervention`, `cancelAuthorizationIntervention`, `rotateAuthor`, and protected actions `additional-recovery` and `rotate-author-session`. Modifies the existing reducer-internal `protectedParametersMatchEvent` with explicit branches for both actions; it does not export that function. Exports only the three mutation services through `test/helpers/internal-api.mjs` until Task 9.

- [ ] Write failing exact-parameter/replay tests for all seven additional-recovery fields and all rotate-author fields. Include an unmatched-action test proving `protectedParametersMatchEvent` rejects an unknown action while both new closed actions reach their explicit matching branches.
- [ ] Cover six interrupted states, both new reasons, exact-ID cancellation, same-mutation challenge closure, refusal for old reasons, and unavailable authority.
- [ ] Implement the three internal mutation services without adding CLI grammar. Entry is system-authored and grants nothing; Task 9 owns `enter-intervention`, `cancel-intervention`, and `rotate-author` parsing, help, and routing.
- [ ] Implement consume-own-grant → reject other live challenges → mutate authority → advance revision → clear/restore. Rotation changes only author identity and records both fingerprints.
- [ ] Run `node --test test/unit/authority-canonicalize.test.mjs test/unit/reducer.test.mjs test/unit/recovery-authority.test.mjs test/integration/authority.test.mjs test/integration/recovery.test.mjs test/integration/recovery-intervention.test.mjs test/integration/author-rotation.test.mjs test/integration/v2-dormancy.test.mjs test/integration/ported-behavior-parity.test.mjs`; expect PASS.
- [ ] Commit: `git commit -m "feat: authorize recovery and author rotation [#60]"`.

### Task 8: Record recovery, successors, and legacy adoption (#60)

**Files:**

- Modify: `src/protocol/{recovery,record-lineage}.mjs`
- Modify: `src/collateral/paths.mjs`
- Modify: `test/helpers/internal-api.mjs`
- Create: `test/unit/review-recovery-budget.test.mjs`
- Create: `test/integration/{review-recovery-budget,legacy-record-adoption}.test.mjs`
- Test: `test/integration/{v2-dormancy,release-upgrade-compatibility}.test.mjs`

**Interfaces:** Produces `claimRecordRecovery`, `reconcileRecordRecovery`, `createRecoverySuccessor`, and `adoptLegacyRecord`.

- [ ] Test ordinal 1 without grant, ordinal 2 with one exact grant, replay refusal, concurrency, unavailable authority, both recovery modes, and live-challenge consume-then-check.
- [ ] Test deterministic claim-derived successor IDs, internal creation rather than public `start`, same/next-day destination behavior, reciprocal receipts, collisions, and every crash checkpoint.
- [ ] Test the dormant v2 startup validator for `--record-id`: it accepts only the generated root review ID and every other value fails with `APR_RECORD_ID_INVALID`, while the still-public v1 `start` behavior and existing v1 records remain unchanged until Task 9.
- [ ] Implement internal author-only `recoverRecord`. Normalize reason via NFC, Unicode boundary trim, 1-1,000 scalar limit, and normalized UTF-8 digest. Preflight before claim; lock/revalidate before append. Export through the internal API only; Task 9 owns public `recover-record`.
- [ ] Built-in claim dynamically preserves lifecycle; granted claim restores intervention state. After claim, only the sealed mode/target may finish.
- [ ] Implement internal `adoptLegacyRecord({ workspaces, current })` with complete explicit set, additive receipt, conservative consumption, and immutable v1 bytes. Task 9 owns public `adopt-record`.
- [ ] Run `node --test test/unit/review-recovery-budget.test.mjs test/unit/record-lineage.test.mjs test/unit/store.test.mjs test/integration/review-recovery-budget.test.mjs test/integration/legacy-record-adoption.test.mjs test/integration/supersession-lineage.test.mjs test/integration/review-lock-recovery.test.mjs test/integration/v2-dormancy.test.mjs test/integration/release-upgrade-compatibility.test.mjs`; expect PASS.
- [ ] Confirm the implementation worktree contains no files on disk under `docs/superpowers`, `scripts/review`, `scripts/providers`, or `scripts/tests`; otherwise the parity suite's `publishable HEAD contains no parity-gated legacy path` assertion will fail regardless of Git tracking state.
- [ ] Run the #60 story gate:

```bash
npm test
npm run test:slow
npm run test:packaging
npm run test:smoke
npm run lint
npm run format:check
npm pack --dry-run
```

Expected: every command exits 0, public commands still emit only event-v1, and no new recovery or intervention command appears in parser/help/smoke output.

- [ ] Commit: `git commit -m "feat: transact record recovery and adoption [#60]"`.

### Task 9: Atomic public CLI activation (#61)

**Files:**

- Modify: `src/cli/{parse,run,help-data}.mjs`
- Modify: `src/provider/claude-launch.mjs`
- Modify: `src/public-api.mjs`
- Create: `src/package-version.mjs`
- Modify: `src/templates/index.mjs`
- Modify: `schemas/{event,protocol,participants}-v2.json`
- Modify: `templates/{author-startup,reviewer-invitation}.md`
- Modify: `test/helpers/internal-api.mjs`
- Test: `test/unit/cli-parse.test.mjs`
- Create: `test/unit/package-version.test.mjs`
- Test: `test/unit/claude-launch-permissions.test.mjs`
- Test: `test/golden/help.test.mjs`
- Modify: `test/golden/templates.test.mjs`
- Modify: `test/golden/templates/{author-startup,reviewer-invitation}.md`
- Test: `test/smoke/cli.test.mjs`
- Modify: `test/integration/start-join.test.mjs`
- Test: `test/integration/{status-resume,v2-dormancy,release-upgrade-compatibility,claude-launch-permissions,reviewer-boundary,reviewer-guard,recovery}.test.mjs`
- Modify, do not run: `test/live/claude-live-conformance.mjs`

**Interfaces:** Activates workspace-first `launch-reviewer`, `--preflight-only`, `recover-record`, `enter-intervention`, `cancel-intervention`, `rotate-author`, `adopt-record`, and `reclaim-lock`. Produces `packageVersion()` and `creatorPackageSpecifier()` from the installed `package.json`.

- [ ] Add all new public grammar atomically: workspace-first `launch-reviewer` plus `--preflight-only`, `recover-record`, `enter-intervention`, `cancel-intervention`, `rotate-author`, `adopt-record`, and `reclaim-lock`. Test workspace/invitation disambiguation and `APR_LAUNCH_TARGET_INVALID`; close every command grammar and conflict.
- [ ] Test no retry command across launch result, status JSON/next, resume, and static explain at exhaustion. Render exact intervention/grant/cancel/abandon actions only when eligible.
- [ ] Route the sole launcher: resolve → registered live author/rotation → lineage → compatibility → contract → preflight → execution start under lock → unlock → dispatch → reconcile. Switch public mutation builders from event-v1 to event-v2 and finalize the sealed accepted-schema list with every event type implemented by Tasks 1-8.
- [ ] Update `test/integration/v2-dormancy.test.mjs` from its intermediate-release assertion to prove #61 public `start`/`join`/`submit` emits authorized event-v2, while `release-upgrade-compatibility.test.mjs` proves a record created by the prior v1-only release receives `compatibility-declared` immediately before its first v2 event.
- [ ] Implement `packageVersion()` by reading the installed root `package.json` relative to `src/package-version.mjs`, requiring package name `ai-peer-review` and a valid exact version; `creatorPackageSpecifier()` returns `ai-peer-review@<version>`. Use that source in `run.mjs`, `help-data.mjs`, and every zero-install command renderer instead of the `0.2.2` literal or a build-time duplicate.
- [ ] Add `zero_install_status_help_display` to the closed `author-startup` and `reviewer-invitation` catalogs in `src/templates/index.mjs`; keep `zero_install_join_display` and build both values from `creatorPackageSpecifier()`. Replace the author template's literal status-help command with `{{zero_install_status_help_display}}`. The reviewer invitation continues to surface only its versioned join command; workspace-first launch is an author-side CLI action, not a new invitation variable.
- [ ] Add `zero_install_status_help_display` to the fixed `values` map in `test/golden/templates.test.mjs`. Keep the golden fixture's explicit test version: the golden suite proves closed catalog hydration and bytes, not the runtime wiring of `creatorPackageSpecifier()`.
- [ ] Extend `test/integration/start-join.test.mjs` to read the installed root `package.json`, execute the real startup generation path, and assert both generated files contain `ai-peer-review@${packageJson.version}`. This is the end-to-end regression guard against a stale literal in `run.mjs` or either source template.
- [ ] Add every stable error from the spec; export only read-only inspection/builders. Regenerate and review only `author-startup.md` and `reviewer-invitation.md` goldens. Run the all-template golden test and require the other four fixtures to remain byte-identical.
- [ ] Update the live conformance script for workspace-first launch and the closed environment, but do not run it. Run `node --test test/unit/cli-parse.test.mjs test/unit/package-version.test.mjs test/unit/claude-launch-permissions.test.mjs test/golden/help.test.mjs test/golden/templates.test.mjs test/smoke/cli.test.mjs test/integration/start-join.test.mjs test/integration/status-resume.test.mjs test/integration/v2-dormancy.test.mjs test/integration/release-upgrade-compatibility.test.mjs test/integration/claude-launch-permissions.test.mjs test/integration/reviewer-boundary.test.mjs test/integration/reviewer-guard.test.mjs test/integration/recovery.test.mjs test/packaging/package.test.mjs`; expect PASS.
- [ ] Commit: `git commit -m "feat: activate governed reviewer recovery [#61]"`.

### Task 10: Incident regression and package delivery (#61)

**Files:**

- Create: `test/integration/incident-56-recovery-chain.test.mjs`
- Modify if an existing owner test is intentionally renamed: `test/fixtures/legacy-behavior-parity.json`
- Test: `test/integration/ported-behavior-parity.test.mjs`
- Modify: `test/packaging/package.test.mjs`
- Modify: `test/golden/skill.test.mjs`
- Modify: `README.md`
- Modify: `skills/peer-review/SKILL.md`

**Interfaces:** Consumes all earlier interfaces; produces no runtime API.

- [ ] Reproduce initial attempt, failed later turn, built-in recovery, exhaustion, one exact signed additional recovery, and grant replay refusal.

```js
await consumeBuiltInRecovery(incident);
await assert.rejects(() => dispatchAgainWithoutGrant(incident), {
  code: 'APR_RECOVERY_EXHAUSTED',
});
assert.equal(fakeProvider.invocations, 2);
await authorizeOneExactAdditionalRecovery(incident);
assert.equal((await dispatchGrantedOperation(incident)).status, 'submitted');
```

- [ ] Prove revision/path/PID/attempt/author-session changes and Full-Auto-like input cannot bypass; permission-blocked counts as dispatched.
- [ ] Fault-inject every claim/successor/supersession/lock boundary. Prove stale receipts, exact resumption, declined cancellation, unavailable exhaustion, and scratch loss as `incomplete-unavailable`.
- [ ] Audit the legacy parity ledger after Tasks 1, 2, 3, 5, 6, and 7. New tests do not require ledger entries. Modify a ledger owner only when the named owning test was intentionally renamed or removed, and record the replacement test plus rationale in the fixture; never regenerate the ledger wholesale.
- [ ] Run `node --test test/unit/compatibility-authority.test.mjs test/unit/model-provenance.test.mjs test/unit/record-lineage.test.mjs test/unit/process-identity.test.mjs test/unit/execution-contract.test.mjs test/unit/provider-preflight.test.mjs test/unit/execution-ledger.test.mjs test/unit/recovery-authority.test.mjs test/unit/review-recovery-budget.test.mjs test/integration/v2-dormancy.test.mjs test/integration/release-upgrade-compatibility.test.mjs test/integration/supersession-lineage.test.mjs test/integration/review-lock-recovery.test.mjs test/integration/claude-reviewer-turn-rotation.test.mjs test/integration/claude-launch-bootstrap.test.mjs test/integration/execution-reconciliation.test.mjs test/integration/recovery-intervention.test.mjs test/integration/author-rotation.test.mjs test/integration/review-recovery-budget.test.mjs test/integration/legacy-record-adoption.test.mjs test/integration/incident-56-recovery-chain.test.mjs test/integration/ported-behavior-parity.test.mjs`; expect PASS with no network or provider invocation.
- [ ] Document built-in/granted recovery, rotation, cancellation, lock reclaim, adoption, version pins, preflight-only, the living additive `manifest-v1` consumer-version policy, and prohibition on autonomous `reclaim-lock`. Document that #61 refuses Bedrock and Vertex before dispatch and that restoration requires a separately versioned credential/configuration classification with closed-environment tests. Assert all modules/schemas/help ship.
- [ ] Confirm the implementation worktree contains no files on disk under `docs/superpowers`, `scripts/review`, `scripts/providers`, or `scripts/tests`; otherwise the parity suite's `publishable HEAD contains no parity-gated legacy path` assertion will fail regardless of Git tracking state.
- [ ] Run:

```bash
npm test
npm run test:slow
npm run test:packaging
npm run test:smoke
npm run lint
npm run format:check
npm pack --dry-run
```

Expected: every command exits 0; packed output contains v2 schemas and no scratch, lock, environment, handle, transcript, or credential evidence.

- [ ] Commit: `git commit -m "test: prove bounded and granted recovery [#61]"`.

## Serial delivery order

1. Rewrite and approve #57-#61 from this accepted plan before implementation.
2. Deliver #57; v1 remains readable, every user-reachable mutation remains a v1 writer, and v2 authority is available only through test-only internal exports.
3. Deliver #58; lineage and terminal receipts add no launch mutation.
4. Deliver #59; lock reclaim, execution contracts, and preflight remain internal and add no public grammar.
5. Deliver #60; execution and recovery services are complete behind test-only internal exports, while all new command grammar and public v2 writing remain absent.
6. Deliver #61 atomically: add every new grammar and template, switch public writers to v2, route the sole launcher through the complete invariant, and run incident plus full gates.
7. Close only through governed review and approval; then record the combined architecture as delivered.

## Architecture acceptance-criteria matrix

| AC  | Requirement summary                                              | Owning plan work                                 |
| --- | ---------------------------------------------------------------- | ------------------------------------------------ |
| 1   | One built-in recovery; exact grants for higher ordinals          | Tasks 7, 8, 9, and 10                            |
| 2   | Successful turns and proven no-dispatch retries are free         | Tasks 6, 8, and 10                               |
| 3   | Unknown post-dispatch outcomes consume recovery                  | Tasks 6, 8, and 10                               |
| 4   | Launch uses current event authority and rejects stale routing    | Tasks 5, 6, and 9                                |
| 5   | Compatibility, executable, permission, and environment preflight | Tasks 1, 5, 9, and 10                            |
| 6   | Same-record, reciprocal, acyclic successor lineage               | Tasks 3, 8, and 10                               |
| 7   | Session assurance and model attribution remain distinct          | Tasks 2, 5, and 9                                |
| 8   | Mixed-log validation and conservative explicit adoption          | Tasks 1, 3, 8, and 9                             |
| 9   | Exhaustion suppresses retry and renders exact safe actions       | Tasks 7, 8, 9, and 10                            |
| 10  | Planning determines governed issue decomposition                 | Decomposition decision and serial delivery order |

## Plan self-review checklist

- The explicit acceptance-criteria matrix gives every criterion an owner.
- Event-v2, batches, grants, reversible interventions, rotation, lock recovery, receipts, version pins, and unavailable states have implementation and tests.
- Every mutation has stale-authority, idempotency, concurrency, and crash coverage.
- Every public command has parser, help, smoke, error, and packaging coverage.
- V1 bytes stay immutable; mixed logs require compatibility authority.
- Launcher activation occurs only in #61.
- No task invokes a live provider or changes #56 evidence.
