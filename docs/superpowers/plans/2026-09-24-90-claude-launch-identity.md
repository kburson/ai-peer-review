# Claude Launch Identity Isolation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

<!-- cspell:words ENOENT EACCES MAXBUFFER -->

**Goal:** Let a Claude reviewer launched by a Codex author join and submit with its own identity, while reporting safe actionable failures without weakening review authority.

**Architecture:** Keep provider selection scoped to the Claude child environment. Normalize bounded execution evidence separately from protocol authority, then classify only after validating current authority and session continuity. Keep private resume state private and publish a closed diagnostic projection through the existing v1 result and CLI.

**Tech Stack:** Node.js >=24, ESM, `node:test`, `node:assert/strict`, existing `execFile`, `AprError`, protocol authority and atomic store helpers, JSON Schema, installed MCP SDK validator, Prettier, Markdown lint, cspell.

**Spec:** `docs/superpowers/specs/2026-09-24-90-claude-launch-identity-design.md`

## Plan Metadata

- Issue: #90, `kburson/ai-peer-review`
- Reference commit: `2134c573ccc4b300970ee28f7af4f993ae96f60a`
- Spec SHA-256: `81f889c84db146f5093e779069060370d97b665aa7367561b7349f86fbc0dd3d`
- Worktree: `/Users/kpburson/.codex/worktrees/c7f3/ai-peer-review`
- Branch at planning: `codex/90-claude-launch-identity`
- Priority: P1
- Size: S
- Estimate: 3 hours, recorded issue estimate, not a new execution forecast
- Status: internal plan SAR complete; no further required plan changes found; implementation not started

The reference commit contains the completed internal SAR. Existing external review collateral is historical input, not approval of this plan. Do not join, submit, finalize, or otherwise advance that live protocol as part of plan execution. Disposable test fixtures may exercise protocol commands locally.

## Scope

Implement the reviewed #90 spec only. Preserve command permissions, global identity selection, preflight environment proof, review transitions, and provider session provenance. Do not add provider calls, retries, broker redesign, dependencies, or unrelated repository restructuring.

## Story Intent

- **Beneficiary:** peer-review operator launching Claude from a Codex author session
- **Capability:** isolate reviewer identity and receive safe, actionable launch diagnostics
- **Need:** inherited Codex metadata misidentifies Claude, while missing reviewer authority hides the launch failure
- **Value or failure prevented:** reliable cross-provider review with attributable submissions and recoverable failures

## Global Constraints

- Remove only `CODEX_SESSION_ID`, `CODEX_THREAD_ID`, `CODEX_MODEL_ID`, and `CODEX_MODEL_DISPLAY` from fallback child environments.
- Build a fresh object; do not mutate `process.env` or the supplied environment. Apply the same rule to initial launch and resume.
- When `contract.environment` is present, the runner uses it exactly, including an empty object.
- Do not change global identity precedence or add a join-only identity override. Preserve genuine same-session rejection and existing declared-model provenance.
- Keep generated commands, model/effort selection, permission grammar, and `shell: false` unchanged.
- Bound each stdout/stderr capture to 1 MiB; never parse partial output after overflow.
- A matching new event decision plus expected Claude session evidence is required for `submitted`; process exit is never review authority.
- Keep malformed, missing, mismatched, or regressed authority on the existing integrity-error path.
- Keep raw session handles only in existing private launch state; no new raw transcript or diagnostic persistence.
- Diagnostic `message` and `next_action` are each at most 256 UTF-8 bytes; complete compact diagnostic JSON is at most 1024 UTF-8 bytes.
- `failed` retains CLI exit 1; other governed statuses retain current behavior, without implying that exit zero means submitted.
- Keep schema ID `ai-peer-review.claude-launch-result/v1`, accepting historical results without `diagnostic`; document that older strict schemas need updating for new results.
- Treat `classifyClaudeReviewerOutcome` as a published API with a deliberate behavioral break: callers using the prior four-argument shape can receive `outcome-unknown` instead of `submitted`, and `recovery: null` instead of a generated resume command. Document the required normalized evidence, explicit expected session fingerprint, and verified private-state availability in new `docs/claude-launch-api-migration.md`, linked from `README.md`. Do not describe the unchanged export name as backward-compatible behavior or silently derive expected identity from post-launch reviewer authority.
- Use offline execution doubles and disposable repositories. Never test by running a paid Claude session or mutating the live review workspace.
- Before implementation, confirm governed #90 binding, timer, plan approval, branch, and deep-dive requirements in the owning session. Do not steal another session's binding. This document does not approve a lifecycle transition.
- At each green checkpoint, stage only that task's files and use `[#90]` attribution. Do not publish, merge, or close the issue as part of generating this plan.

## File Map and Sequence

All paths below are relative to the exact worktree above. Tasks execute sequentially because they share the runner and result contract.

| File                                                  | Responsibility                                                                        | Task    |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------- | ------- |
| `src/provider/claude-launch.mjs`                      | Environment choice, authority/session checks, classification, private resume state    | 1, 3    |
| `src/provider/claude-launch-diagnostics.mjs` (new)    | Pure bounded execution normalization and public diagnostic projection                 | 2       |
| `src/cli/run.mjs`                                     | Render safe diagnostics in default text; preserve JSON/exit behavior                  | 4       |
| `src/cli/help-data.mjs`                               | Conditional resume guidance and diagnostic documentation                              | 4       |
| `schemas/claude-launch-result-v1.json`                | Nullable pre-join fingerprint, diagnostic schema, submitted constraint                | 2       |
| `test/helpers/claude-launch-fixture.mjs` (new)        | Disposable launch files and complete synthetic Claude authority                       | 1       |
| `test/unit/claude-launch-identity.test.mjs` (new)     | Environment and identity invariants, including actual CLI regression entry            | 1, 4    |
| `test/unit/claude-launch-classifier.test.mjs` (new)   | Normalization, runner outcomes, authority, state, diagnostic/schema/privacy checks    | 2, 3, 4 |
| `test/unit/claude-launch-permissions.test.mjs`        | Retain permission/platform/resume regressions; complete identity fixtures             | 3       |
| `test/integration/claude-launch-permissions.test.mjs` | Migrate both direct classifier callers and retain permission conformance              | 3       |
| `docs/claude-launch-api-migration.md` (new)           | Consumer migration for the classifier behavior and widened result schema              | 3       |
| `README.md`                                           | Link the consumer migration guide                                                     | 4       |
| `test/integration/claude-identity.test.mjs`           | Actual join/submit integration using captured child environment                       | 4       |
| `test/helpers/claude-launch-cli-regression.mjs` (new) | Reusable real-CLI disposable regression exercised by issue vc:1 and integration suite | 4       |
| `test/golden/help.test.mjs`                           | Freeze widened schema and conditional help behavior                                   | 2, 4    |

Keep normalization internal to the provider module family: do not add exports to `src/public-api.mjs`. Existing launch/classifier exports stay in place. Direct classifier callers must supply expected-session evidence for a submission. Task 3 owns the unit and integration caller migrations and the external consumer contract; inventory callers with `rg 'classifyClaudeReviewerOutcome' src test`. The package export remains present, but its old call shape no longer guarantees its old outcomes. The migration guide must travel with the implementation, not remain only in this plan.

## Implementation Tasks

### Task 1: Isolate the initial and resumed Claude child environment

#### Story Intent

- **Beneficiary:** peer-review operator
- **Capability:** launch Claude without inherited Codex identity contamination
- **Need:** the normal runner currently inherits the author's entire environment
- **Value or failure prevented:** Claude join and submit can use their own provider session

#### Execution

**Files:** `src/provider/claude-launch.mjs`, new `test/helpers/claude-launch-fixture.mjs`, new `test/unit/claude-launch-identity.test.mjs`.

**Interfaces:** Add module export `buildClaudeLaunchEnvironment(parentEnvironment = process.env) -> object` for direct unit import only. Runner keeps its existing argument signature. Test helper exports `launchFixture(t) -> { contract, workspace, stateFile }` and `launchAuthority({ joined = true, sequence = 3, revision = 2, events = [], state } = {}) -> authority`. Default an omitted `state` to `awaiting-reviewer` without a participant and `reviewer-turn` with one; decision fixtures explicitly set `acceptance-pending` or `author-revision` with an advanced sequence/revision. Keep `protocol.review_id` equal to the fixture contract ID.

- [ ] **1. Create the disposable fixture and failing environment test.** Build the fixture with `mkdtempSync` under `.scratch/test`, regular invitation/artifact files, and `buildClaudeReviewerLaunch` using model `claude-opus-5`, effort `high`. Use `t.after` for exact-root cleanup. Authority must include reviewer `host: 'claude-code'`, `provider: 'anthropic'`, and `fingerprintSession('anthropic', 'fixture-claude-session')`; omit the participant only when `joined` is false. Do not use the shared generic participant helper, which defaults to Codex.

```js
import assert from 'node:assert/strict';
import test from 'node:test';
import { buildClaudeLaunchEnvironment } from '../../src/provider/claude-launch.mjs';

const identityKeys = [
  'CODEX_SESSION_ID',
  'CODEX_THREAD_ID',
  'CODEX_MODEL_ID',
  'CODEX_MODEL_DISPLAY',
];

test('fallback environment drops only Codex identity without mutating its input', () => {
  const parent = Object.freeze({
    PATH: '/fixture/bin',
    HOME: '/fixture/home',
    NODE_OPTIONS: '--no-warnings',
    ANTHROPIC_API_KEY: 'fixture-secret',
    CLAUDE_CODE_SESSION_ID: 'child-session',
    CLAUDE_MODEL_ID: 'claude-opus-5',
    CODEX_UNRELATED: 'keep',
    ...Object.fromEntries(identityKeys.map((key) => [key, 'author-value'])),
  });
  const child = buildClaudeLaunchEnvironment(parent);
  assert.notEqual(child, parent);
  for (const key of identityKeys) assert.equal(Object.hasOwn(child, key), false);
  for (const key of Object.keys(parent).filter((key) => !identityKeys.includes(key))) {
    assert.equal(child[key], parent[key]);
  }
  for (const key of identityKeys) assert.equal(parent[key], 'author-value');
});
```

- [ ] **2. Run red:** `node --test test/unit/claude-launch-identity.test.mjs`. Expect the missing helper export or current inherited-environment assertion to fail, not unrelated fixture setup.
- [ ] **3. Implement the small helper and use it in the common launch/resume runner.** Preserve an explicit environment object by identity. Contracts are package-generated objects; validate a present environment as a non-null object rather than silently replacing invalid data. The absent property is the fallback case.

```js
export function buildClaudeLaunchEnvironment(parentEnvironment = process.env) {
  const environment = { ...parentEnvironment };
  for (const key of [
    'CODEX_SESSION_ID',
    'CODEX_THREAD_ID',
    'CODEX_MODEL_ID',
    'CODEX_MODEL_DISPLAY',
  ])
    delete environment[key];
  return environment;
}

// In executionOptions, after validating a present contract.environment:
const environment = Object.hasOwn(contract, 'environment')
  ? contract.environment
  : buildClaudeLaunchEnvironment();
// Set executionOptions.env = environment for both launch and resume.
```

- [ ] **4. Add runner-boundary assertions.** Seed only the four parent variables in `process.env`, save their original values, and restore them in `t.after`; keep these tests non-concurrent. Capture `options.env` in injected `execFile`. Return valid JSON with `session_id: 'fixture-claude-session'`, so setup reaches the existing successful runner path. Confirm `process.env` is unchanged. Repeat with `resume: true` after a first launch writes valid private state. Confirm `--resume` uses the same handle. For explicit environment, construct a real `buildClaudeReviewerLaunchFromExecution` contract using the ready preflight/permission fixture from `test/unit/claude-launch-permissions.test.mjs`; pass it intact to the runner and assert `options.env === preflight.child_environment`. Repeat with a frozen environment and `{}`. Verify its non-enumerable environment survives the actual builder-to-runner path and is absent from serialized contract output; a hand-built copied contract alone is insufficient.
- [ ] **5. Run green:** `node --test test/unit/claude-launch-identity.test.mjs test/unit/claude-launch-permissions.test.mjs test/unit/provider-preflight.test.mjs`. Inspect all failures before proceeding.
- [ ] **6. Commit the three task files:** `git commit -m "[#90] Isolate Claude launch identity environment"` after exact-path staging and the governed attribution check.

### Task 2: Define bounded execution evidence, diagnostics, and the result schema

#### Story Intent

- **Beneficiary:** peer-review operator inspecting a failed launch
- **Capability:** receive useful diagnostic categories without exposing provider content
- **Need:** provider errors contain arbitrary text and the v1 result cannot represent an absent reviewer
- **Value or failure prevented:** actionable failures with bounded public output and honest identity absence

#### Execution

**Files:** new `src/provider/claude-launch-diagnostics.mjs`, new `test/unit/claude-launch-classifier.test.mjs`, `schemas/claude-launch-result-v1.json`, `test/golden/help.test.mjs`.

**Interfaces:**

- `normalizeClaudeExecution({ execution, error = null })` returns only `{ exit_code, spawn_code, interrupted, output_valid, output_issue, session_id_present, session_id, permission_denials, provider_failed, join_code }`.
- `buildClaudeLaunchDiagnostic({ category, exit_code = null, code = null })` returns a frozen object with exactly `category`, `exit_code`, `code`, `message`, `next_action`.
- `output_issue` is exactly `none`, `empty`, `invalid-json`, `invalid-envelope`, `oversized`, or `capture-overflow`. `output_valid` is true only for `none`.
- Normalized evidence is transient and private. `session_id_present` distinguishes absence from invalid supplied null/empty/non-string values. Do not persist or serialize the evidence object.

- [ ] **1. Write red normalization/privacy tests.** Include this concrete first case, then use the case matrix below. Imports are from the new provider module.

```js
const evidence = normalizeClaudeExecution({
  execution: {
    exit_code: 1,
    stdout: JSON.stringify({ error: { code: 'APR_IDENTITY_REQUIRED', message: 'PRIVATE' } }),
    stderr: 'PRIVATE',
  },
});
assert.equal(evidence.provider_failed, true);
assert.equal(evidence.join_code, 'APR_IDENTITY_REQUIRED');
assert.equal(evidence.session_id_present, false);
const diagnostic = buildClaudeLaunchDiagnostic({
  category: 'join-failed',
  exit_code: evidence.exit_code,
  code: evidence.join_code,
});
assert.doesNotMatch(JSON.stringify(diagnostic), /PRIVATE/);
assert.ok(Buffer.byteLength(JSON.stringify(diagnostic), 'utf8') <= 1024);
for (const key of ['message', 'next_action']) {
  assert.ok(Buffer.byteLength(diagnostic[key], 'utf8') <= 256);
}
```

| Input variation                                                                          | Required normalized fact                              |
| ---------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| `error.code = 'ENOENT'` or `'EACCES'`, empty output                                      | known spawn code, numeric exit null                   |
| `error.code = 2`, malformed output                                                       | numeric exit 2, structured output unavailable         |
| non-integer/absent exit metadata                                                         | numeric exit null, never guessed zero                 |
| `is_error: true`, nonempty top-level error string/object                                 | provider failure                                      |
| error absent, empty string/object, success result prose                                  | no structured failure                                 |
| nested `error.details.code` or code embedded in result text                              | join code null                                        |
| signal, killed/timeout, `ERR_CHILD_PROCESS_STDIO_MAXBUFFER`, unknown execution rejection | interrupted flag; output unusable on capture overflow |
| empty, invalid JSON, arrays, null, or >1 MiB UTF-8                                       | structured output unavailable                         |
| malformed permission list or entries                                                     | safe empty/filtered list; no incidental exception     |
| absent session versus supplied null/empty/object                                         | absent versus present retained for runner validation  |

- [ ] **2. Run red:** `node --test test/unit/claude-launch-classifier.test.mjs`. Expect missing exports or newly specified facts to fail.
- [ ] **3. Implement pure normalization.** Read rejected execution streams from `error.stdout`/`error.stderr` and numeric exit from `error.code`; read resolved execution streams and numeric exit from `execution.stdout`/`execution.stderr`/`execution.exit_code`. Never let an error's numeric exit be lost by looking only at the resolved result. Enforce `Buffer.byteLength` before JSON parsing for both injected stdout/stderr. Explicit `ERR_CHILD_PROCESS_STDIO_MAXBUFFER` means `output_issue: 'capture-overflow'` and `interrupted: true`, even if the retained prefix happens to be valid JSON. An oversized injected result with no capture-overflow evidence means `output_issue: 'oversized'`, not a claim that the process was killed. Both make output unavailable and clear every parsed session, denial, and error fact. Keep trustworthy numeric exit metadata, so nonzero exit still wins over uncertainty. Distinguish interruption from the quality of structured output; a signal with bounded valid output may retain that output's facts. Never recursively inspect error objects. Retain only string `tool`/`path` denial fields and validate their path later with the existing exact-response helper. Use `Number.isSafeInteger` for exits. Restrict join codes to `APR_IDENTITY_REQUIRED`, `APR_IDENTITY_CONFLICT`, `APR_IDENTITY_AMBIGUOUS`; restrict public spawn codes to ENOENT/EACCES. Unknown string spawn errors without proof of failed dispatch are interruption evidence, not invented exit 1. Add this regression pair with valid-looking JSON so parsing before overflow handling cannot accidentally pass:

```js
const prefix = JSON.stringify({ session_id: 'untrusted-prefix', is_error: true });
const overflow = normalizeClaudeExecution({
  error: Object.assign(new Error('PRIVATE'), {
    code: 'ERR_CHILD_PROCESS_STDIO_MAXBUFFER',
    stdout: prefix,
    stderr: '',
  }),
});
assert.equal(overflow.output_issue, 'capture-overflow');
assert.equal(overflow.interrupted, true);
assert.equal(overflow.output_valid, false);
assert.equal(overflow.session_id_present, false);
assert.equal(overflow.provider_failed, false);
const oversized = normalizeClaudeExecution({
  execution: { stdout: JSON.stringify({ result: 'x'.repeat(1024 * 1024) }), stderr: '' },
});
assert.equal(oversized.output_issue, 'oversized');
assert.equal(oversized.interrupted, false);
assert.equal(oversized.output_valid, false);
```

- [ ] **4. Implement fixed diagnostic copy.** Select message/action from this closed table; validate category and code rather than accepting arbitrary fields. For permission denial, use the neutral instruction below; the renderer separately prints an available recovery command.

| Category                     | Message                                                      | Next action                                                                                     |
| ---------------------------- | ------------------------------------------------------------ | ----------------------------------------------------------------------------------------------- |
| `spawn-failed`               | Claude could not be started.                                 | Check the Claude installation and executable access, then inspect review status.                |
| `provider-failed`            | Claude reported a provider failure.                          | Check provider availability and authentication, then inspect review status.                     |
| `join-failed`                | The provider reported a reviewer identity failure.           | Check supported Claude session and model metadata or configuration, then inspect review status. |
| `response-permission-denied` | Claude was denied access to the exact reviewer response.     | Inspect review status; use the printed recovery command only when one is available.             |
| `execution-interrupted`      | Claude execution ended without a definite completion result. | Inspect review status before considering another launch.                                        |
| `invalid-provider-output`    | Claude did not return usable structured output.              | Inspect review status before considering another launch.                                        |
| `session-unavailable`        | The launched Claude session could not be established.        | Inspect review status before considering another launch.                                        |
| `no-submission`              | No new reviewer submission was recorded.                     | Inspect review status before considering another launch.                                        |

```js
// The category lookup owns message and next_action; never interpolate provider text.
const diagnostic = Object.freeze({ category, exit_code, code, message, next_action });
if (
  Buffer.byteLength(message, 'utf8') > 256 ||
  Buffer.byteLength(next_action, 'utf8') > 256 ||
  Buffer.byteLength(JSON.stringify(diagnostic), 'utf8') > 1024
) {
  throw new AprError('APR_CLAUDE_RESULT_INVALID', 'Claude diagnostic exceeds its public bound.', {
    recovery: 'Preserve the review and correct the package diagnostic definition.',
  });
}
return diagnostic;
```

- [ ] **5. Widen the schema without changing its ID.** Keep existing required fields. Set fingerprint to `oneOf` digest string/null, then add an `if` status submitted / `then` fingerprint string constraint. Add optional closed `diagnostic` with all five fields required, the exact eight category enum values, allowed code enum plus null, integer-or-null exit, and `maxLength: 256` for the two strings. Runtime/tests enforce UTF-8 bounds beyond schema character lengths. Historical results without diagnostic remain valid.

```json
{
  "if": { "properties": { "status": { "const": "submitted" } }, "required": ["status"] },
  "then": {
    "properties": {
      "session_fingerprint": { "type": "string", "pattern": "^sha256:[0-9a-f]{64}$" }
    }
  }
}
```

- [ ] **6. Exercise the actual schema with the installed SDK validator.** Import `AjvJsonSchemaValidator` from `@modelcontextprotocol/sdk/validation/ajv-provider.js`, already supplied by the direct SDK dependency. Read the exact schema with `readFileSync`; use `new AjvJsonSchemaValidator().getValidator(schema)` and assert `.valid`. Only draft-compatible keywords already listed above are needed; do not introduce a new dependency. Assert historical success, new failed/null reviewer and diagnostics pass; submitted/null reviewer, extra diagnostic keys, unknown category/code and excessive strings fail. Assert all five fields and UTF-8 bounds against every generated category.
- [ ] **7. Run green:** `node --test test/unit/claude-launch-classifier.test.mjs test/golden/help.test.mjs`. Then exact-path stage the four task files and commit `[#90] Define safe Claude launch diagnostics and result schema`.

### Task 3: Classify from authority and validated session evidence before persisting recovery

#### Story Intent

- **Beneficiary:** peer-review operator recovering a launch
- **Capability:** distinguish failure, uncertainty, denied response access, and proven submission
- **Need:** parsing and mandatory reviewer/session assumptions hide startup failures
- **Value or failure prevented:** truthful outcomes without false acceptance or unusable resume instructions

#### Execution

**Files:** `src/provider/claude-launch.mjs`, `test/unit/claude-launch-classifier.test.mjs`, `test/unit/claude-launch-permissions.test.mjs`, `test/integration/claude-launch-permissions.test.mjs`, new `docs/claude-launch-api-migration.md`.

**Interfaces:** Runner signature stays unchanged. Extend classifier arguments with `expectedSessionFingerprint = null` and `resumeAvailable = false`; retain `before`, `after`, `providerResult`, `contract`. `providerResult` is the normalized evidence from Task 2. A direct caller without expected session evidence cannot prove submission. The runner derives this fingerprint from valid returned session metadata or validated prior resume state, never from the newly registered reviewer alone.

- [ ] **1. Write a runner test that fails before reaching the old classifier.** Use Task 1's physical fixture, no reviewer in either authority observation, and an injected ENOENT rejection. Assert the result and absence of private state.

```js
const fx = launchFixture(t);
let inspections = 0;
const result = await runClaudeReviewerLaunch({
  contract: fx.contract,
  inspectAuthority: () => {
    inspections++;
    return launchAuthority({ joined: false });
  },
  execFile: async () => {
    throw Object.assign(new Error('PRIVATE'), { code: 'ENOENT' });
  },
});
assert.equal(inspections, 2);
assert.equal(result.status, 'failed');
assert.equal(result.session_fingerprint, null);
assert.equal(result.recovery, null);
assert.equal(result.diagnostic.category, 'spawn-failed');
assert.equal(existsSync(fx.stateFile), false);
assert.doesNotMatch(JSON.stringify(result), /PRIVATE/);
```

- [ ] **2. Run red:** `node --test test/unit/claude-launch-classifier.test.mjs test/integration/claude-launch-permissions.test.mjs`. Confirm the old JSON/session gate causes the new runner test to fail; retain the integration result as the baseline for the caller migration below.
- [ ] **3. Reorder the runner and enforce output limits.** Set `maxBuffer: 1024 * 1024` in `execFile` options; preserve `cwd`, `shell: false`, encoding, and Task 1 environment choice. Capture the execution value or error without converting unknown failures into exit 1. Always inspect post-launch authority after execution settles, then normalize evidence and validate session information. Before invoking `execFile`, validate the pre-launch projection, nonnegative safe sequence/revision, contract review ID, and validated prior resume state; refuse invalid preconditions without dispatch. After execution, use the existing `authorityProjection` with reviewer optional only for a valid `awaiting-reviewer` state. Still validate review IDs, event arrays, safe sequence/revision, no regression, and expected reviewer presence for decisions. Missing reviewer in `reviewer-turn` or a decision-bearing state is malformed authority, not the new nullable pre-join case. Keep authoritative inspection failures outside the governed failure conversion. Remove the now-unused private `parseProviderResult` function after the runner switches to `normalizeClaudeExecution`; verify there are no remaining references and do not suppress `no-unused-vars` to keep dead parsing code.

```js
let execution;
let executionError = null;
try {
  execution = await execFile(contract.command.file, args, executionOptions);
} catch (cause) {
  executionError = cause;
}
const after = inspectAuthority(contract.workspace);
const providerResult = normalizeClaudeExecution({ execution, error: executionError });
// Validate authority and supplied session fields before calling the classifier.
```

- [ ] **4. Validate identity before any write.** A present invalid session stays `APR_CLAUDE_SESSION_INVALID`; a changed resume handle stays the same error. Compare a valid handle's Anthropic fingerprint to any registered reviewer; require `host: claude-code`, `provider: anthropic` if a reviewer exists, even without a handle. Fail conflicts with `APR_IDENTITY_CONFLICT`. Do not manufacture identity when metadata is absent. For a first-launch decision without expected handle evidence, return unknown/session-unavailable; for resume, validated prior handle can prove continuity if returned handle is absent.
- [ ] **5. Implement the exact outcome precedence.** Keep the existing exact path matcher, including Windows-normalized response denial paths. More than one new decision, wrong actor, or malformed authority is an error. One matching new expected reviewer decision wins over exit and denial. With no new decision use the table below; unknown/stale decisions cannot prove submission.

| Condition in order                                   | Result                                                                                |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------- |
| exact response denial                                | permission-blocked                                                                    |
| known spawn failure                                  | failed/spawn-failed                                                                   |
| nonzero numeric exit or supported structured error   | failed/join-failed when allowlisted APR code exists, otherwise failed/provider-failed |
| interruption without definite failure                | outcome-unknown/execution-interrupted                                                 |
| unusable structured output without stronger evidence | outcome-unknown/invalid-provider-output                                               |
| absent usable session                                | outcome-unknown/session-unavailable                                                   |
| otherwise                                            | outcome-unknown/no-submission                                                         |

Use Task 2 diagnostic builder for every non-submitted result. Return the registered reviewer fingerprint or null, never the fingerprint of an unregistered provider handle. New submitted results may omit diagnostics. Direct-classifier tests pass explicit expected fingerprint. Update both `test/unit/claude-launch-permissions.test.mjs` and `test/integration/claude-launch-permissions.test.mjs` in this task. In the integration file, retain the raw `conformantClaude(...).turn(...)` results separately for the existing controls/analysis assertions, but pass normalized Task 2 evidence to both classifier calls. The denied call passes `resumeAvailable: true` to keep its exact-command assertion; this direct-classifier test models usable private state, while runner tests prove actual persistence. The corrected submission call passes `expectedSessionFingerprint: reviewer.session_fingerprint`, from the fixture reviewer identity established before execution, to retain its submitted assertion. Explicitly supply the expected fingerprint to the denial call too. Normalize each result as follows (use `deniedProviderResult` and `correctedProviderResult` respectively):

```js
const normalizedDenied = normalizeClaudeExecution({
  execution: {
    exit_code: deniedProviderResult.exit_code,
    stderr: '',
    stdout: JSON.stringify({
      session_id: 'same-claude-session',
      permission_denials: deniedProviderResult.permission_denials,
    }),
  },
});
const denied = classifyClaudeReviewerOutcome({
  before: beforeDenied,
  after: afterDenied,
  contract,
  providerResult: normalizedDenied,
  expectedSessionFingerprint: reviewer.session_fingerprint,
  resumeAvailable: true,
});
const normalizedCorrected = normalizeClaudeExecution({
  execution: {
    exit_code: correctedProviderResult.exit_code,
    stderr: '',
    stdout: JSON.stringify({
      session_id: 'same-claude-session',
      permission_denials: correctedProviderResult.permission_denials,
    }),
  },
});
const corrected = classifyClaudeReviewerOutcome({
  before: beforeCorrected,
  after: afterCorrected,
  contract,
  providerResult: normalizedCorrected,
  expectedSessionFingerprint: reviewer.session_fingerprint,
  resumeAvailable: true,
});
```

Import `normalizeClaudeExecution` from the new internal provider module in that integration test. Do not feed the raw `analysis`/`controls` object directly into the classifier. Preserve the integration file's second, real CLI route test, which already returns provider JSON with its raw fixture session ID.

- [ ] **6. Persist only validated recovery.** First classify with recovery unavailable to complete integrity validation; then write eligible private state using existing `atomicWrite` and validated contract paths. Eligible means valid structured output, valid handle (returned or validated prior), and successful authority/session checks. A valid failed provider session before join may be recorded. Unusable output, absent usable handle, and integrity errors preserve existing bytes and create nothing. After the state step, set `resumeAvailable` to exactly whether usable private state exists for this validated session, whether newly written or preserved. If true, call the classifier again with the same immutable before/after observations and normalized evidence and `resumeAvailable: true`; only a permission-blocked result may gain the generated resume command. This condition is not whether a write happened: valid preserved prior state takes the same branch. If false, retain the first result with null recovery. Do not mutate a frozen result or inspect authority a third time to construct recovery. Preserve the original classification and revision. Propagate write failure; do not return a command that depends on the failed write. Do not append decisions or retry the provider.
- [ ] **7. Add the complete runner matrix.** Use nested tests with independent disposable fixtures and real fingerprints; each case asserts public status, diagnostic category, fingerprint/null, inspection count, and state existence or unchanged bytes. Cover every Task 2 input plus: matching decision/nonzero exit; matching decision/denial; first decision/no handle; resume decision/no returned handle; invalid supplied handle; changed handle; wrong actor/provider; multiple/stale decisions; missing/corrupt/mismatched/regressed authority; exact versus neighbor denial; permission denial without handle/state; valid pre-join handle; byte-preserving failed resume; and private-state write failure. Include a malformed pre-launch case with an `execFile` call counter of zero and a valid unchanged pre-join case with two inspections. To inject an actual atomic-write failure portably on an initial launch, make the final `launch-state.json` destination a directory with a sentinel file, while its parent directories remain valid. The contained-path lookup can then succeed, but atomic rename of the temporary regular file onto that directory must fail with `APR_ATOMIC_WRITE_FAILED`. Assert the sentinel remains, no temporary file remains, and no result/recovery is returned. A regular file at the parent `provider` path instead tests a path-resolution refusal and does not reach the atomic writer. Keep that case separate if retained. Do not depend on permission bits, which can pass under privileged users.

```js
mkdirSync(fx.stateFile, { recursive: true });
const sentinel = path.join(fx.stateFile, 'sentinel');
writeFileSync(sentinel, 'preserve');
await assert.rejects(
  runClaudeReviewerLaunch({
    contract: fx.contract,
    inspectAuthority: () => launchAuthority(),
    execFile: async () => ({
      exit_code: 0,
      stderr: '',
      stdout: JSON.stringify({ session_id: 'fixture-claude-session' }),
    }),
  }),
  { code: 'APR_ATOMIC_WRITE_FAILED' }
);
assert.equal(readFileSync(sentinel, 'utf8'), 'preserve');
assert.deepEqual(readdirSync(path.dirname(fx.stateFile)), ['launch-state.json']);
```

- [ ] **8. Document the public API migration.** Create `docs/claude-launch-api-migration.md` with a before/after behavior table for prior four-argument callers, explaining the deliberate submitted-to-unknown and populated-to-null recovery changes. Include the exact normalized evidence fields from Task 2, their meanings, and a migrated public import example:

```js
import { classifyClaudeReviewerOutcome } from '@kburson/ai-peer-review';
const outcome = classifyClaudeReviewerOutcome({
  before,
  after,
  contract,
  providerResult: normalizedEvidence,
  expectedSessionFingerprint: verifiedSessionFingerprint,
  resumeAvailable: privateStateUsable,
});
```

Define `normalizedEvidence` as caller-owned bounded execution facts with the exact Task 2 shape; the package's normalization helper is internal and must not be advertised as a public import. Define `verifiedSessionFingerprint` as evidence of the launched provider session established independently of the current review participant projection. Define `privateStateUsable` as successful private-state validation/persistence, not provider exit or a denied write. Do not suggest blindly passing true or copying `after.state.participants.reviewer.session_fingerprint`. Include both public behavior migration and the v1 schema widening/older-validator caveat. Explain that ordinary CLI users receive runner-computed evidence and do not set these fields. Include compatibility assertions in the classifier unit tests: valid new decision with the old four-argument call remains unknown/session-unavailable; exact denial without explicit resume availability has null recovery; correctly evidenced calls retain submitted and recoverable-denial outcomes.

- [ ] **9. Run green:** `node --test test/unit/claude-launch-classifier.test.mjs test/unit/claude-launch-identity.test.mjs test/unit/claude-launch-permissions.test.mjs test/integration/claude-launch-permissions.test.mjs`. Also run `./node_modules/.bin/eslint src/provider/claude-launch.mjs src/provider/claude-launch-diagnostics.mjs` and targeted Prettier/Markdown lint on the new migration guide. Stage only the five Task 3 files and commit `[#90] Preserve launch failures and enforce authoritative recovery`.

### Task 4: Verify the real CLI identity flow and expose safe diagnostics to operators

#### Story Intent

- **Beneficiary:** peer-review operator using the normal CLI
- **Capability:** get consistent Claude attribution and useful explanations in text and JSON
- **Need:** helper-only tests miss join/submit resolution, and the text renderer currently drops diagnostics
- **Value or failure prevented:** the reproduced bug is caught at the command boundary and failures are visible in normal use

#### Execution

**Files:** `src/cli/run.mjs`, `src/cli/help-data.mjs`, `test/unit/claude-launch-identity.test.mjs`, `test/unit/claude-launch-classifier.test.mjs`, `test/integration/claude-identity.test.mjs`, new `test/helpers/claude-launch-cli-regression.mjs`, `test/golden/help.test.mjs`, `README.md`.

**Interfaces:** Keep exported CLI `run(argv, io)` and all generated commands unchanged. New test-only helper exports `exerciseClaudeLaunchCli(t, { resume = false } = {}) -> Promise<void>`; it creates, runs, and cleans one disposable real CLI review. Import it in both the issue vc:1 unit file and integration file so vc:1 genuinely demonstrates join/submit behavior. No public identity-context export is needed. Use fresh collectors for each CLI call and a fixed fixture clock within the active claim interval. The helper accepts no live workspace path.

**Fixture isolation:** In test setup only, save and clear all supported provider identity keys (`CODEX_SESSION_ID`, `CODEX_THREAD_ID`, `CODEX_MODEL_ID`, `CODEX_MODEL_DISPLAY`, `CLAUDE_CODE_SESSION_ID`, `CLAUDE_SESSION_ID`, `CLAUDE_MODEL_ID`, `CLAUDE_MODEL_DISPLAY`, `GROK_SESSION_ID`, `GROK_MODEL_ID`), then seed the explicit fixture parent. Set both `XDG_CONFIG_HOME` and `APPDATA` to an empty directory under the disposable root and carry those values through author/child `io.env` and the captured runner environment. `configPaths` uses APPDATA first on Windows and XDG_CONFIG_HOME elsewhere; HOME alone does not isolate configuration. Restore every modified process variable with `t.after`, and disable concurrency for these tests. Production sanitization still removes only the four Codex keys. Missing-model tests use no project Claude model configuration and no runtime model aliases; configured-fallback tests deliberately add only their own fixture configuration.

- [ ] **1. Implement real-CLI regression cases and prove their sensitivity.** Start from the existing fixture and response-section editing pattern in `test/integration/claude-identity.test.mjs`, creating a Codex author with explicit fixture model/session. Use `run(['start', 'docs/artifact.md', '--artifact-kind', 'spec', '--reviewer-provider', 'claude', '--reviewer-model', 'claude-opus-5', '--reviewer-effort', 'high'], authorIo)`, then obtain invitation/workspace from existing status helpers. Run the real `launch-reviewer` route with injected `execFile`; inside the double capture the runner's actual `options.env`, add only the simulated child's genuine `CLAUDE_CODE_SESSION_ID` and model variables, and execute actual CLI join and submit with that environment. Do not inject `identityContext.adapter`, a declared reviewer, or synthetic reviewer authority into this regression.

```js
// Inside exerciseClaudeLaunchCli's injected execFile, after real join:
const response = statusReview(workspace).paths.response;
replaceSection(response, 'Summary', 'The fixture artifact is ready.');
replaceSection(response, 'Findings', 'None.');
replaceSection(response, 'Required changes', 'None.');
replaceSection(response, 'Optional suggestions', 'None.');
replaceSection(response, 'Decision', 'accepted');
// childIo.env is the captured launch environment plus the simulated Claude runtime.
const submittedCode = await run(['submit', workspace, '--decision', 'accepted'], childIo);
assert.equal(submittedCode, 0);
return {
  exit_code: 0,
  stderr: '',
  stdout: JSON.stringify({ session_id: 'fixture-claude-session', permission_denials: [] }),
};
```

Define `replaceSection` and CLI output collectors in the new helper using the existing integration implementation. Assert join and submit exit codes, participant provider/host, actual decision actor, and final runner `submitted`. Apply the complete fixture isolation above when invoking the runner because it copies `process.env`, not just test `io.env`. Register both initial and resumed cases in the two test entry files:

```js
for (const resume of [false, true]) {
  test(`actual Claude CLI attribution, resume=${resume}`, async (t) => {
    await exerciseClaudeLaunchCli(t, { resume });
  });
}
```

Task 1 may already make the positive integration case pass. Do not claim it was initially red. In a fresh disposable review control, deliberately pass the fixture parent Codex identity before sanitization plus child Claude metadata to actual CLI join, asserting `APR_IDENTITY_CONFLICT` because it resolves to the exact author. The sanitized case must then succeed without any explicit adapter override. Add the clean-parent control as well. These controls prove the test observes the original identity-selection defect without temporarily editing production source.

For the resume scenario, the first launch joins and returns an exact response denial with the valid handle without submitting. Invoke real `launch-reviewer --resume`; assert the handle and captured environment again, then submit as the already joined Claude participant without another join. Never finalize or alter the live review.

- [ ] **2. Add negative CLI/identity cases.** Run a Codex author with inherited Claude metadata outside launch and prove existing Codex selection. Check existing explicit-adapter precedence and registry ambiguity tests in `test/unit/identity.test.mjs` without changing production selection. Missing child Claude session/model must fail as specified; configured model fallback must report declared provenance. Reusing the genuine author's provider/session must remain a conflict. A wrong-provider registration must be rejected by the runner. Keep all relevant assertions in vc:1 or its imported regression helper.
- [ ] **3. Add text/JSON tests and run red.** Use `run(['launch-reviewer', invitation, '--host', 'claude', '--model', 'claude-opus-5', '--effort', 'high'], io)` with fixture repository, injected failure and valid before/after authority. Capture stdout/stderr; repeat with `--json`. Assert failed exit 1, diagnostic category/code/message/action present in both outputs, and response path preserved. Assert no `Next: ... --resume` without valid state. Use secret sentinels in nested errors, result prose, unknown codes and large multi-byte data; assert no sentinel in either stream. Run `node --test test/unit/claude-launch-identity.test.mjs test/unit/claude-launch-classifier.test.mjs test/integration/claude-identity.test.mjs test/golden/help.test.mjs`.
- [ ] **4. Render only the safe diagnostic projection.** Extend `writeClaudeLaunchResult`; leave the JSON path emitting the runner's safe result. Do not read raw provider evidence in the renderer.

```js
if (value.diagnostic) {
  const diagnostic = value.diagnostic;
  lines.push(`Diagnostic: ${diagnostic.category}`);
  if (diagnostic.exit_code !== null) lines.push(`Exit code: ${diagnostic.exit_code}`);
  if (diagnostic.code !== null) lines.push(`Code: ${diagnostic.code}`);
  lines.push(diagnostic.message, `Action: ${diagnostic.next_action}`);
}
// Retain the existing recovery.command line only when recovery is non-null.
```

- [ ] **5. Update help copy and freeze it in golden tests.** Replace unconditional resume guidance with: `On permission-blocked with usable private session state, run the exact printed peer-review launch-reviewer invitation --host claude --resume command; otherwise inspect review status before retrying.` Explain bounded diagnostics and null pre-join fingerprint in the launch result description. Test the conditional wording, unchanged schema ID, four status values, and historical result compatibility. Add a `README.md` link labeled "Claude launch API migration" to `docs/claude-launch-api-migration.md` near the documented usage so consumers can find the Task 3 contract. Verify the target exists and describes both classifier behavior and schema validation changes. Do not edit previously sealed spec/review collateral to describe new behavior.
- [ ] **6. Run green:** rerun the four files from Step 3 plus `node --test test/unit/identity.test.mjs test/unit/model-provenance.test.mjs test/unit/provider-preflight.test.mjs`. Confirm no test launches a real provider. Stage only the eight Task 4 files and commit `[#90] Verify Claude CLI attribution and surface safe launch diagnostics`.

## Acceptance and Traceability

| Source requirement                                              | Implementing tasks       | Required evidence                                                      |
| --------------------------------------------------------------- | ------------------------ | ---------------------------------------------------------------------- |
| Issue AC1, AC2: Claude identity and four-variable isolation     | 1, 4                     | vc:1 actual runner environment through join and submit, initial/resume |
| Issue AC3: distinct-session invariant                           | 3, 4                     | vc:1 conflict and negative identity cases                              |
| Issue AC4: actionable pre-join failures                         | 2, 3, 4                  | vc:2 full runner failures and both CLI renderers                       |
| Issue AC5: offline regression/control                           | 1–4                      | vc:1/vc:2 with injected execution and disposable CLI fixtures          |
| Exact preflight environment, no parent mutation                 | 1                        | identity/preflight unit files                                          |
| Failure/uncertainty/authority precedence and session validation | 2, 3                     | full runner matrix, malformed authority and new-event boundaries       |
| Private state, no fabricated resume, write-failure behavior     | 3                        | filesystem assertions and exact recovery checks                        |
| v1 compatibility and nullable reviewer                          | 2, 3                     | schema validator cases plus golden help                                |
| Privacy and 256/1024-byte limits, 1 MiB captures                | 2–4                      | byte bounds, overflow controls, sentinel tests in both streams         |
| Unchanged permissions, Windows normalization, model provenance  | 1, 3, 4                  | existing permission, preflight, identity and model tests               |
| External findings R1-F001, R1-F002, R1-F003                     | 3; 1/4; 2/4 respectively | each finding maps to implementation and regression evidence above      |

## Final Implementation Verification

Run in the exact worktree after all four tasks. These are execution gates, not results claimed by this planning document. Preserve per-command exit codes and failing output; do not mark issue checkboxes until their mapped commands actually pass.

```bash
node --test test/unit/claude-launch-identity.test.mjs
node --test test/unit/claude-launch-classifier.test.mjs
node --test test/unit/claude-launch-permissions.test.mjs
node --test test/integration/claude-launch-permissions.test.mjs
node --test test/integration/claude-identity.test.mjs
npm test
npm run test:slow
npm run test:packaging
npm run lint
npm run format:check
git diff --check
git status --short
git log --oneline -1
```

`npm test` includes unit and golden tests; `test:slow` includes integration, MCP, and smoke. `test:packaging` is a separate required gate that checks the published export/package surface; it is included explicitly because neither other suite invokes it. No paid-provider smoke check is required. Review the final diff for unintended adapter precedence, permission, schema-ID, public API export, or protocol mutations. Keep #90 attribution and existing governance gates; report remaining failures honestly instead of inferring acceptance from a green subset.

## XPR Revision Record

Claude Opus 5 round 1 requested two required changes and offered two related suggestions. All four are incorporated: Task 3 now owns and tests the existing integration classifier callers, documents the published API behavior change for external consumers, removes the obsolete parser, and uses usable private state as the single recovery trigger. Task 4 links the migration guide; final verification includes packaging. No implementation was performed during this revision.

## Plan Self-Review

The initial author check established spec/issue coverage and canonical Story Intent headings. The subsequent requested internal SAR was performed in this same GPT-6 Astra session, reviewing the plan against the pinned spec and source. This is not independent XPR or approval from Claude.

| Finding                                                                                           | Required correction                                                                                                                                  | Disposition         |
| ------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------- |
| SAR-P001: preflight testing stopped at a hand-built contract                                      | Pass a real preflight-bound builder result into the runner, including an empty environment                                                           | Addressed in Task 1 |
| SAR-P002: output size and capture interruption were conflated                                     | Define output_issue, rejected-stream extraction, and valid-prefix overflow versus oversized-result tests                                             | Addressed in Task 2 |
| SAR-P003: authority prerequisites and recovery result construction were underspecified            | Refuse invalid authority before dispatch; restrict missing reviewer to awaiting-reviewer; reuse the same observations when attaching proven recovery | Addressed in Task 3 |
| SAR-P004: the write-failure fixture could fail in path resolution                                 | Use a directory at the final state-file destination and assert APR_ATOMIC_WRITE_FAILED plus byte/sentinel preservation                               | Addressed in Task 3 |
| SAR-P005: real CLI tests could inherit identity/configuration and report false red/green evidence | Isolate provider aliases and platform configuration; use explicit contaminated-parent and clean-parent controls; restore all process state           | Addressed in Task 4 |

Pass 1 found and revised these implementation/test gaps. Pass 2 checked the revised interfaces, ordering, fixtures, spec traceability, and permission scope. The final pass found no further required changes. All five SAR findings are addressed in this plan; implementation and independent XPR remain pending.

The plan changes no source, makes no review-protocol transitions, and does not claim implementation tests passed. Validate this Markdown with targeted Prettier and Markdown lint. Because the repository excludes this directory from cspell, check its contents through `cspell --no-progress stdin://plan-design.md` with this file on standard input.
