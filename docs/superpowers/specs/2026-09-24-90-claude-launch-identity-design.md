# Claude Launch Identity Isolation Design

<!-- cspell:words ENOENT EACCES -->

Issue: #90

Status: internal SAR complete; no further required design changes found

## Context

`peer-review launch-reviewer --host claude` can be invoked from a Codex-authored review session. The launch command starts Claude Code and authorizes it to run `peer-review join <invitation>` and `peer-review submit <workspace>`. When the Claude child process inherits Codex identity environment variables, `peer-review join` can resolve the reviewer as Codex rather than Claude.

The reproduced failure had these observable outcomes:

- With inherited Codex model metadata, Claude's join resolved as the Codex author and failed the author/reviewer distinct-session invariant with `APR_IDENTITY_CONFLICT`.
- Without enough Codex model metadata, join failed earlier with `APR_IDENTITY_REQUIRED` for the Codex adapter.
- With the Codex identity environment stripped, Claude joined as `host: claude-code`, `provider: anthropic`, `model_id: claude-opus-5`, then submitted its reviewer response.

Claude availability was not the blocker. The failure is a provider-boundary identity contamination bug.

## Goals

- Ensure a Claude reviewer launched from a Codex author session runs `peer-review join` as Claude, not Codex.
- Strip inherited Codex identity variables from the Claude child process environment without requiring operators to run `env -u CODEX_*` manually.
- Preserve the author/reviewer distinct-session invariant after identity resolution.
- Preserve exact preflight child environments when deterministic preflight has already produced one.
- Surface actionable Claude/provider or join failure diagnostics when Claude exits before reviewer authority is established.
- Cover the regression without requiring a paid provider call.

## Non-goals

- Change Claude model names, effort validation, or tool permission grammar.
- Weaken existing participant distinctness or registered-session checks.
- Change global identity precedence or add a join-only identity override.
- Rework the broader SPR/XPR broker, runtime orchestration, or automatic transport design.
- Add a generic provider environment sanitizer beyond the verified Claude launch boundary.
- Treat provider process success as review submission without protocol authority.

## Current behavior

`configuredIdentityContext()` in `src/cli/run.mjs` chooses an identity adapter by checking Codex environment variables before Claude environment variables:

```text
CODEX_THREAD_ID || CODEX_SESSION_ID
  ? codex
  : CLAUDE_CODE_SESSION_ID || CLAUDE_SESSION_ID
    ? claude
    : ...
```

When Claude Code is spawned from Codex, the child environment can contain both provider families. Because Codex wins precedence, the `peer-review join` command inside Claude evaluates reviewer identity through the wrong adapter.

`runClaudeReviewerLaunch()` in `src/provider/claude-launch.mjs` executes Claude with `execFile()`. It passes `contract.environment` only when a preflight-bound execution contract provides one. For the normal launch path, no environment option is supplied, so Node inherits the author shell environment.

`classifyClaudeReviewerOutcome()` requires complete post-launch reviewer authority before it classifies provider result details. If Claude fails before `peer-review join` registers a reviewer, the classifier throws the generic incomplete-authority `APR_CLAUDE_RESULT_INVALID` error and masks the underlying provider or join failure.

## Architecture

### Claude child environment builder

Add a small package-owned environment builder in `src/provider/claude-launch.mjs`.

For generated Claude launch contracts that do not already carry a deterministic `contract.environment`, the runner constructs a child environment from `process.env` and removes only these Codex identity variables:

```text
CODEX_SESSION_ID
CODEX_THREAD_ID
CODEX_MODEL_ID
CODEX_MODEL_DISPLAY
```

Build a fresh object; do not mutate `process.env` or the supplied environment. Apply the same rule to initial launch and resume.

The builder must not remove unrelated variables such as `PATH`, `HOME`, provider credentials, Node configuration, or Claude session variables. Claude identity variables remain available so `peer-review join` can resolve the reviewer as Claude when Claude Code supplies them.

When `contract.environment` is present, the runner uses it exactly. That path represents a stronger deterministic preflight proof and must not be merged with or modified by fallback scrubbing.

### Identity selection boundary

Use child-environment sanitization as the sole identity-selection change for #90. Do not reverse global adapter precedence, add a provider marker, or introduce an explicit adapter override only for join. The package knows it is launching Claude because it constructs the Claude execution contract; it does not infer the child provider from inherited variables.

Both generated `join` and `submit` commands execute inside the same Claude child and inherit its sanitized environment. Resume passes through the same runner and sanitizer. Preserve the existing command strings and exact permissions. Preflight-bound launches retain their exact environment; their existing allowlist already excludes parent provider identity variables. Do not inject additional identity fields into that environment.

Claude Code must supply its own session through the existing supported Claude runtime/environment sources. Model metadata continues to use the Claude adapter's existing runtime/environment or configured declared-model fallback, with truthful provenance. The launcher must never copy a Codex session into a Claude variable, invent a session/model, or treat the launch model argument as observed runtime identity. With no other provider candidates, missing Claude session or missing both runtime and configured model metadata must retain the existing identity-required behavior. If unrelated inherited provider metadata causes the unchanged resolver to select another provider, the runner must reject that participant as the expected Claude reviewer. Sanitization does not authenticate shell metadata or authorize a fallback provider.

Outside the generated launch environment, existing CLI adapter precedence, explicit adapter handling, and the identity registry's ambiguity checks remain unchanged. Mixed variables in an unrelated shell are not evidence of Claude execution. The positive regression starts with a mixed parent environment, sanitizes it, supplies the simulated Claude child's own session, and exercises real CLI join and submit resolution. It does not require a mixed environment before sanitization to resolve as Claude. Shell startup scripts that reintroduce provider variables are outside the supported sanitization guarantee; a resulting identity mismatch must not be reported as a successful Claude launch.

Keep `assertDistinctParticipants` and registered-session checks intact. Additionally, retain the runner's comparison between the provider session fingerprint and the registered reviewer, including resume session equality. Inherited Claude metadata is preserved for compatibility, but is not sufficient proof of the launched session: a mismatch with the returned provider session must fail closed. Session fingerprints remain provider-qualified; this change adds no new same-provider prohibition.

### Runner failure and authority ordering

The fix includes `runClaudeReviewerLaunch`, not just direct calls to `classifyClaudeReviewerOutcome`. Parsing or missing resumable metadata must not hide a definite startup failure.

1. Validate the launch contract and inspect pre-launch authority. For resume, validate the existing private launch state before starting the provider.
2. Execute the provider with the selected environment and bounded output capture. Preserve a numeric exit code when known; otherwise use null. Keep spawn error codes and signal/timeout evidence separate instead of manufacturing exit code 1 for every exception. Bound each stdout/stderr capture to 1 MiB; never parse partial output after overflow.
3. Inspect post-launch event authority after either process resolution or rejection, before treating provider parsing/session errors as terminal. Missing, corrupt, mismatched, or regressed authority remains an integrity error. Absence of a reviewer in an otherwise valid pre-join state is allowed; it is not equivalent to corrupt authority.
4. Parse a bounded JSON object when available. Treat empty, malformed, oversized, or non-object output as unavailable structured evidence. Preserve only the small internal facts needed for classification, identity checks, and exact response-denial recognition. Malformed optional fields must not throw incidental JavaScript errors.
5. Validate any supplied session identifier and compare it with the resume state and registered reviewer before writing private state or reporting submission. A supplied invalid identifier or a changed resume session retains `APR_CLAUDE_SESSION_INVALID`; a valid handle whose fingerprint conflicts with the reviewer retains `APR_IDENTITY_CONFLICT`. An absent handle is different from a supplied invalid handle.
6. Classify using the precedence below, then persist eligible private resume state. Do not weaken the authority or identity checks to obtain a diagnostic result.

Submission requires exactly one new reviewer decision after the pre-launch sequence, from the registered Claude reviewer and matching the expected launch session. The expected session comes from a valid provider handle or, on resume, the already validated private handle. Multiple decisions, a wrong actor, or a registered reviewer outside the Claude/Anthropic provider boundary remain errors, including when the provider handle is absent. A matching authoritative decision takes precedence over nonzero process exit or response denial. If a first launch has a new decision but no usable provider handle, the runner cannot establish that it belongs to this launch: return `outcome-unknown` with a session-unavailable diagnostic and direct the operator to status; do not claim submission. On resume, a missing returned handle may use the validated prior handle, while a different returned handle must fail closed.

With no new decision, apply this table in order:

| Evidence                                                                                    | Status               | Diagnostic category                |
| ------------------------------------------------------------------------------------------- | -------------------- | ---------------------------------- |
| Structured denial of Edit/Write at the exact response path                                  | `permission-blocked` | `response-permission-denied`       |
| Known failure to spawn, such as ENOENT or EACCES                                            | `failed`             | `spawn-failed`                     |
| Known nonzero numeric process exit                                                          | `failed`             | `provider-failed`                  |
| Supported structured error evidence, even at exit zero                                      | `failed`             | `provider-failed` or `join-failed` |
| Signal, timeout, capture overflow, or execution rejection without definite failure evidence | `outcome-unknown`    | `execution-interrupted`            |
| Empty, malformed, oversized, or non-object JSON without definite failure evidence           | `outcome-unknown`    | `invalid-provider-output`          |
| Valid envelope missing a usable session, without definite failure evidence                  | `outcome-unknown`    | `session-unavailable`              |
| No decision and no stronger evidence                                                        | `outcome-unknown`    | `no-submission`                    |

Supported structured error evidence means a boolean `is_error: true`, a nonempty string or nonempty object in top-level `error`, or an allowlisted APR code in top-level `error.code`. Arbitrary success `result` prose is not evidence of failure or submission. Within a definite provider-failure result, an allowlisted APR code selects `join-failed` over generic `provider-failed` even when the exit code is nonzero. The join code is diagnostic evidence only; it never establishes participant authority. A nonzero exit with malformed output is still a definite process failure. Interruption does not prove that the reviewer did no work.

### Result shape and private resume state

Extend `schemas/claude-launch-result-v1.json` with optional `diagnostic` and allow `session_fingerprint: null` for non-submitted results. New runner results always include the diagnostic object for non-submitted outcomes; submitted results may omit it. Continue accepting historical v1 results without the new field. A submitted result must still carry a valid registered reviewer fingerprint. This is an explicit widening of the published v1 schema for previously unrepresentable pre-join outcomes; update schema consumers and fixtures together. Old strict schema copies will need the updated schema to validate new results.

For non-submitted results, expose the registered reviewer's fingerprint if present, otherwise null; never substitute a fabricated fingerprint or an unregistered provider session. Keep the current review ID, protocol revision, and response path derived from validated authority and contract.

Write or update the package-owned private launch state only when a valid handle is available and all authority, contract, and identity checks pass. A valid provider session before join may be recorded privately for same-session continuation, but does not establish a reviewer or submission. Do not create or overwrite state when the handle is absent, output is unusable, or integrity checks fail. Preserve prior resume state unchanged when execution yields no usable structured output or identity validation fails. A definite provider failure with valid matching session metadata may still record that session for later continuation; recording it does not change the failed status. A private-state write failure remains an explicit error; do not print a recovery command that depends on an unsuccessful write.

Return the existing exact `--resume` recovery command for an exact response permission denial only when matching private resume state is usable. Without such state retain `permission-blocked`, set `recovery: null`, and instruct the operator through the diagnostic to inspect status. All other outcomes retain `recovery: null`. Do not automatically retry, replace a reviewer, append review decisions, or imply that provider exit constitutes acceptance.

### Public diagnostics

Use a closed diagnostic object with exactly these fields:

- `category`: one of the categories in the classification table, also allowing `session-unavailable` when a decision cannot be attributed to this launch.
- `exit_code`: a known safe integer process exit code, otherwise null; never infer zero merely because an injected execution result lacks the field.
- `code`: null or one of `ENOENT`, `EACCES`, `APR_IDENTITY_REQUIRED`, `APR_IDENTITY_CONFLICT`, `APR_IDENTITY_AMBIGUOUS`. Spawn codes come from the execution error; APR codes come only from an exact top-level `error.code` match in valid provider JSON. For provider-failure outcomes, APR codes select `join-failed`; they do not override submission or response-denial precedence and are reported as provider-reported, not authenticated protocol events.
- `message`: package-authored text, at most 256 UTF-8 bytes.
- `next_action`: package-authored guidance, at most 256 UTF-8 bytes.

Bound the complete compact serialized diagnostic object to 1024 UTF-8 bytes. Enforce limits in code and tests; schema string-length constraints alone do not enforce byte limits. Reject unknown fields. Use fixed messages/actions selected by category and allowlisted code, with no interpolation of provider text or environment values. For spawn failures direct the operator to check Claude installation/access; for join failures direct them to check supported Claude identity metadata/configuration; for generic provider failure direct them to check provider availability/authentication and review status. For interrupted, invalid-output, and session-unavailable outcomes direct them to inspect review status before considering another launch. Permission guidance references the generated recovery command only when present.

Never copy provider `error` text, `result`, stdout/stderr, nested fields, transcript excerpts, raw handles, credentials, or arbitrary exception messages into public output. Unknown error objects receive a generic package-authored explanation. Do not recursively search free text for APR codes or secrets. This omission policy is stronger than truncating or attempting to redact arbitrary prose. Do not add raw diagnostic files to tracked artifacts or a new transcript persistence path.

Render the same safe category, known exit/code, message, and next action in default text output and `--json`. Keep the existing response path and valid recovery command. Preserve CLI exit behavior: `failed` returns 1; other governed statuses retain current exit behavior, with no implication that exit zero means submitted. Integrity exceptions retain their existing error path. Test both renderers, not just the returned classifier object.

## Test strategy

No paid provider calls are needed. Use injected execution results and authority observations for runner tests, and disposable review fixtures for CLI identity tests. Tests that directly construct a provider-selected identity do not prove this regression is fixed.

Add `test/unit/claude-launch-identity.test.mjs` to prove:

- Initial and resumed launches omit all four Codex identity variables while preserving unrelated variables and Claude metadata; neither the parent environment nor input object is mutated.
- A preflight-supplied environment is passed exactly, including an empty object, with no fallback merging or extra scrub.
- A mixed parent environment flows through the actual runner environment into CLI join and submit, with a simulated genuine Claude session and supported model metadata. Both resolve the same Claude reviewer and produce matching authoritative attribution. Exercise resumed execution as well.
- A Codex author outside the launch path with inherited Claude variables remains Codex; explicit adapter precedence and registry ambiguity behavior remain unchanged.
- Missing Claude session/model metadata fails as specified; configured declared-model fallback preserves its declared provenance. Genuine same-session conflict, returned-session mismatch, wrong-provider registration, and changed resume identity retain their required failures.

The CLI portion may extend `test/integration/claude-identity.test.mjs` using its existing disposable repository pattern; include that file explicitly in verification if used.

Add `test/unit/claude-launch-classifier.test.mjs` covering both the classifier and full runner:

- Pre-join spawn ENOENT/EACCES, nonzero empty/malformed output, structured errors with no session, zero-exit structured failure, and absence of a reviewer return their specified governed status and safe diagnostics. Definite failure is not masked by a parser or missing-session exception.
- Signals/timeouts, capture overflow, oversized multi-byte JSON, malformed optional denial arrays, missing exit codes, and unknown execution rejections have deterministic bounded outcomes. No partial overflow output is trusted.
- Exactly one new expected reviewer decision wins over nonzero exit and response denial; stale decisions, multiple decisions, wrong actor/provider, corrupt/missing/mismatched/regressed authority, and session mismatches cannot become submitted.
- A first-launch decision without expected session evidence remains unknown; resume can use validated prior session evidence when the returned handle is absent. No handle is fabricated.
- Exact response denial supports same-session recovery only with usable private state. Neighbor-path denials do not qualify. Failure before a usable handle creates no state, preserves existing state, and emits no resume command. Private-state write failure does not advertise recovery.
- Registered fingerprint versus null, submitted fingerprint requirements, historical v1 results, and new diagnostics conform to the updated schema. Unknown diagnostic fields are rejected.
- Default CLI text and JSON contain the same safe explanation. Secret/handle/transcript sentinels in top-level strings and nested error/result objects, unknown code values, and large multi-byte content never appear in public output. Assert 256-byte string and 1024-byte object bounds with `Buffer.byteLength`, not character counts.

Retain existing permission, Windows path, submission, and private-resume tests. The issue-level verification includes the two named unit files, existing launch tests, any extended CLI integration file, full suite, slow suite, lint, format, and final commit check. These are implementation gates, not claims that source changes or tests have been completed during this design-only SAR.

## Risks

- Over-scrubbing could break normal Claude execution by removing PATH, HOME, credentials, or Claude runtime metadata. The scrub list must stay narrow.
- Global precedence changes could disturb non-Claude flows; #90 explicitly leaves those rules unchanged and tests the scoped sanitized-child path.
- Provider output is untrusted. Public diagnostics use fixed package text and a finite code allowlist; arbitrary prose is omitted.
- Returning a failed launch result when authority is incomplete must not turn provider failure into review acceptance. Submission still requires event authority.

## Dependency Map

Depends on: #37 for the existing Claude launch adapter and classifier surface.

Blocks: none.

## Internal SAR record

This is an internal same-session design review by GPT-6 Astra as author and reviewer. The prior external response is evidence only; this SAR does not submit, finalize, or otherwise advance that protocol.

- R1-F001 addressed by the runner ordering, outcome precedence, absent-reviewer schema, private-state rules, and full-runner regression matrix.
- R1-F002 addressed by selecting sanitization as the sole scoped mechanism for initial join, submit, and resume. The earlier alternative global preference/join-only override is removed, with negative non-Claude and incomplete-identity coverage.
- R1-F003 addressed by the closed bounded diagnostic schema, omission policy, exact code allowlist, both CLI renderers, and byte/privacy assertions.

Review pass 1 reconciled the findings against current source and revised the requirements. Review pass 2 clarified diagnostic precedence for nonzero exits with join codes, preservation versus update of valid private session state, and missing-Claude-session behavior with unrelated provider metadata. Review pass 3 rechecked the complete contract, schema compatibility, recovery prerequisites, privacy rules, and regression coverage; no further required design changes were found. All three external findings are addressed in this design. External protocol acceptance and implementation completion are not implied.

## Verification

For this design-only revision, run targeted Prettier, Markdown lint, and spelling checks on this spec. The configured spelling command excludes `docs/superpowers/**`; check the spec text through `cspell --no-progress stdin://sar-design.md` with the spec supplied on standard input. The commands below are required after implementation:

- `node --test test/unit/claude-launch-identity.test.mjs`
- `node --test test/unit/claude-launch-classifier.test.mjs`
- `node --test test/unit/claude-launch-permissions.test.mjs`
- `node --test test/integration/claude-identity.test.mjs` (if extended)
- `npm test`
- `npm run test:slow`
- `npm run lint`
- `npm run format:check`
- `git log --oneline -1`
