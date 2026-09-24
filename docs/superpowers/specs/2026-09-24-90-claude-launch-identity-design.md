# Claude Launch Identity Isolation Design

Issue: #90

Status: ready for SAR

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
- Weaken same-provider or same-session conflict checks.
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

The builder must not remove unrelated variables such as `PATH`, `HOME`, provider credentials, Node configuration, or Claude session variables. Claude identity variables remain available so `peer-review join` can resolve the reviewer as Claude when Claude Code supplies them.

When `contract.environment` is present, the runner uses it exactly. That path represents a stronger deterministic preflight proof and must not be merged with or modified by fallback scrubbing.

### Identity selection boundary

The launch boundary sanitizer is the primary fix for this issue. It prevents the known mixed-environment failure before `peer-review join` runs.

Identity resolution should also be made robust for the reviewer boundary: when a process has both Claude and Codex identity variables, Claude reviewer execution must not be classified as Codex merely because Codex variables are present. The implementation can do this by passing an explicit identity adapter for Claude reviewer join execution, or by making adapter selection prefer the provider-local Claude runtime when the CLI is executing under Claude.

Any such change must preserve existing conflict checks. A reviewer that genuinely resolves to the same provider/session as the author must still fail closed with the existing identity conflict behavior.

### Launch outcome diagnostics

Provider process exit remains evidence, not review authority. The classifier should keep returning `submitted` only when the event log proves a reviewer submission by the expected reviewer identity.

When provider execution fails before a reviewer participant exists, the result should be a governed failed launch result with bounded diagnostics rather than an incomplete-authority exception that hides the cause. The failed result should include safe provider fields such as exit code and a bounded error/result summary. It must not expose raw session handles, unbounded stdout/stderr, or private provider transcript content.

If the provider failure is a response permission denial, the existing `permission-blocked` recovery behavior remains the preferred classification. If the provider result is ambiguous and authority did not advance, the existing `outcome-unknown` status remains available.

## Test strategy

Add `test/unit/claude-launch-identity.test.mjs`.

This file should prove:

- A Claude launch with inherited `CODEX_SESSION_ID`, `CODEX_THREAD_ID`, `CODEX_MODEL_ID`, and `CODEX_MODEL_DISPLAY` passes an `execFile` environment that omits those variables.
- The fallback environment preserves unrelated variables and Claude session variables.
- A preflight-supplied `contract.environment` is passed exactly without fallback merging or extra scrubbing.
- Mixed Claude/Codex reviewer identity selection resolves as Claude for the launch/join boundary.
- The same-session invariant still rejects a reviewer that genuinely resolves to the author's provider/session.

Add `test/unit/claude-launch-classifier.test.mjs`.

This file should prove:

- A provider failure before reviewer authority exists returns a failed launch result with actionable bounded diagnostics.
- The generic incomplete post-launch authority error no longer masks provider/join failure evidence.
- Existing submitted, permission-blocked, ambiguous, and wrong-reviewer classifications remain intact.

The issue-level verification commands already name these two files plus the full suite, slow suite, lint, format, and final commit check.

## Risks

- Over-scrubbing could break normal Claude execution by removing PATH, HOME, credentials, or Claude runtime metadata. The scrub list must stay narrow.
- Modifying identity precedence globally could disturb non-Claude flows. Prefer launch-boundary specificity unless tests prove a broader helper is safe.
- Diagnostics can become too revealing if raw provider output is copied into durable results. Keep summaries bounded and omit raw session handles.
- Returning a failed launch result when authority is incomplete must not turn provider failure into review acceptance. Submission still requires event authority.

## Dependency Map

Depends on: #37 for the existing Claude launch adapter and classifier surface.

Blocks: none.

## Verification

- `node --test test/unit/claude-launch-identity.test.mjs`
- `node --test test/unit/claude-launch-classifier.test.mjs`
- `npm test`
- `npm run test:slow`
- `npm run lint`
- `npm run format:check`
- `git log --oneline -1`
