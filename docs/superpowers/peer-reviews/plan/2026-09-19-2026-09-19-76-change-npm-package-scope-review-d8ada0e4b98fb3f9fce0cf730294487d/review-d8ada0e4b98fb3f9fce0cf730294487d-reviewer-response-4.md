<!-- ai-peer-review-template version="1" digest="sha256:78e9a634af9d540baaf6790db82952eaf39cf7ab59a6cdc7938319ae07a4cbed" -->

<!-- protected-frontmatter -->

---
schema: "ai-peer-review.response/v1"
review_id: "review-d8ada0e4b98fb3f9fce0cf730294487d"
role: "reviewer"
turn: 4
commit_mode: "normal"
authority_assurance: "unavailable"
artifact_path: "docs/superpowers/plans/2026-09-19-76-change-npm-package-scope.md"
artifact_commit: "1a80a386b24430492d779d89de0597ff386c78c9"
artifact_blob: "d3246dced444411b6df8e5cc88fb19aeea70247a"
artifact_digest: "sha256:3be18cdced2b76a20896cdbe1a044e46fbd72c1fb893920560a28bbf6622024d"
agent:
  host: "claude-code"
  provider: "anthropic"
  model_id: "claude-opus-5"
  model_display: "Claude Opus 5"
  session_fingerprint: "sha256:8bef3e3392cbb1a4b2dabe6ee890822f519a6563c893a3f731947ce2e108eaa8"
  identity_source: "runtime"
started_at: "2026-09-19T06:03:46.500Z"
submitted_at: "2026-09-19T06:24:04.031Z"
finding_ids: []
answered_finding_ids: []
acknowledged_supplement_ids: []
---

Mode: `normal`

## Summary

Accepted. The turn-3 required change is implemented exactly at artifact commit
`1a80a386b24430492d779d89de0597ff386c78c9`, both turn-3 optional clarifications were adopted, and
no blocking defect remains. I verified the new Step 3 wording, the continuation-normalization
addition, and the Task 2 Step 2 narrowing against the repository rather than against the author
response's description of them, and I re-confirmed that every fix from turns 1 through 3 survives
the turn-4 edit intact.

The plan is now implementable as written. Its file inventory is complete against the actual tree —
I exhaustively enumerated every `ai-peer-review` occurrence in `**/*.mjs` and every
`npx --yes` / `npm install` / `ai-peer-review@` form across the repository, and every file that
breaks under the rename is listed and instructed. Its test-first sequencing exercises each modified
test at the step that modifies it. Its release-workflow assertions are mutually satisfiable by
exactly one workflow shape. Its historical-preservation gate can actually observe the states it
guards. Its keep-list correctly separates registry identity from the executable, config, protocol,
and provenance identities that must not move.

Three optional suggestions follow. None blocks: two are one-sentence precision improvements to
instructions whose natural implementations are already correct, and one is an accuracy note on a
justifying aside. I am recording them rather than requiring them because each would change wording
only, and none can produce wrong work along the path an implementer would naturally take. I have
flagged the reasoning for the first explicitly, since it is the closest call.

### Verification of the turn-3 required change

**Required change 1 — accepted, implemented verbatim and extended usefully.** Plan lines 96-103
replace the unbounded instruction with the exact substitution I proposed:

- "Assert that all three retained binary names — `ai-peer-review`, `peer-review`, and
  `peer-review-mcp` — are present in the consumer's `node_modules/.bin`." This preserves the
  guarantee the step actually needs: scoping must not disturb the `bin` map at `package.json:10-14`.
  All three entries come from that one map, so existence of all three is sufficient proof. ✅
- "Execute only `ai-peer-review --help` and `peer-review --help`, and assert each prints
  `Commands:`." This matches the assertion style already in `test/smoke/cli.test.mjs:28-36` and
  `:42-46`, so the new code is consistent with the file it lands in. ✅
- "Do not execute `peer-review-mcp`: `bin/peer-review-mcp.mjs` parses no arguments and
  unconditionally starts an MCP stdio server, so invoking it from a synchronous packaging smoke test
  is either vacuous or blocking." The rationale is carried into the plan rather than left implicit,
  which prevents a later contributor from "restoring" the third invocation. ✅

The author also added a clause I did not request — "End-to-end MCP execution remains covered in
`test/mcp/` with a protocol-aware transport test" — which routes the reader somewhere rather than
leaving a coverage gap unexplained. That directory exists and is wired into `test:slow` via
`package.json:39-40`. See optional suggestion 3 for a precision note on the characterization.

**Optional 1 — accepted, and the implementation is correct.** Plan lines 80 and 88 add
continuation normalization:

```js
const normalizedRelease = release.replace(/\\\r?\n\s*/g, ' ');
```

I verified the behavior: the pattern consumes a backslash, an optional carriage return, a newline,
and following indentation, replacing them with a single space — which is exactly how a POSIX shell
joins a continued line. The two `gh release` site regexes changed from `[^\n]*` to `.*?`, which is
functionally equivalent for existence testing since JavaScript's `.` already excludes `\n` without
the `s` flag; the substantive change is the normalization, and it resolves the brittleness I raised.
Both target commands remain matched in their current single-line form
(`.github/workflows/release.yml:66` and `:70`), so the assertions pass before and after any future
wrapping. ✅

One ordering detail I checked rather than assumed: `assert.match(release, /artifact="kburson-ai-peer-review-\$\{version\}\.tgz"/)`
at plan line 79 deliberately runs against the un-normalized `release`, which is correct — the
artifact definition is a single line by construction and should not be joined with its neighbors
before matching. ✅

**Optional 2 — accepted.** Plan lines 194-196 narrow Task 2 Step 2 from "active templates" to
`templates/author-startup.md`. All three statements about `templates/reviewer-invitation.md` now
agree: the file list marks it `Verify unchanged` (plan line 168), Step 2 no longer implies it
changes, and Step 4 states why it does not (plan lines 212-213). ✅

### Confirmation that nothing regressed

I re-read the full revised plan and confirmed every earlier fix is present and unaltered:

| Item | Origin | Location in revised plan | Status |
| --- | --- | --- | --- |
| `test/unit/errors.test.mjs` in file list | turn 1 | line 33 | ✅ |
| …in both focused commands | turn 1 | lines 110-111, 155-156 | ✅ |
| …narrow line-12 instruction | turn 1 | lines 120-126 | ✅ |
| `git status --porcelain` + `git diff HEAD` gate | turn 1 | lines 265-279 | ✅ |
| Boundary-safe negative assertions | turn 1 | lines 68-72 | ✅ |
| Deterministic `$artifact` + `test -f` guard + no-glob | turn 1 | lines 128-148 | ✅ |
| Definition-once / reuse-everywhere assertions | turn 2 | lines 74-89 | ✅ |
| `scripts/verify-extraction.mjs` protected | turn 2 | line 233 | ✅ |
| Keep-list lead-in "includes at least" | turn 2 | line 250 | ✅ |
| `templates/reviewer-invitation.md` verify-unchanged | turn 2 | line 168 | ✅ |
| Golden split: regenerate vs hydrated-line-only | turn 1 opt | lines 211-213 | ✅ |
| Both help digests unconditional | turn 1 opt | lines 174-175, 214-216 | ✅ |
| Version-bump constraint | turn 1 opt | line 22 | ✅ |
| Fixture and literal exclusions | turn 1 opt | lines 260-263 | ✅ |

I also re-confirmed the coverage property that makes the plan self-checking: Task 3 Step 3 runs
`npm test` (reaching `test/unit/**` and `test/golden/**`, hence `errors.test.mjs`,
`npm-pack-report.test.mjs`, `help.test.mjs`, `templates.test.mjs`, `skill.test.mjs`),
`npm run test:slow` (reaching `test/smoke/cli.test.mjs` and `test/mcp/**`), and
`npm run test:packaging` (reaching `test/packaging/package.test.mjs`). Every file the plan modifies
is exercised by that sequence, and every file it modifies is reached by a focused command at the
task that modifies it.

### Verification basis

Read at revised artifact commit `1a80a386b24430492d779d89de0597ff386c78c9`: the full revised plan
and `review-d8ada0e4b98fb3f9fce0cf730294487d-author-response-3.md`. Read this turn to check the
turn-3 clause about MCP coverage: `test/mcp/` directory listing and
`test/mcp/server.test.mjs` (transport and stdio-runner tests at lines 242-269). Carried forward at
unchanged content from earlier turns: `package.json`, `package-lock.json` root name fields,
`.github/workflows/release.yml`, `bin/peer-review-mcp.mjs`, `src/cli/help-data.mjs`,
`src/cli/run.mjs`, `src/templates/index.mjs`, `src/mcp/server.mjs`, `src/config/load.mjs`,
`src/config/setup.mjs`, `scripts/verify-extraction.mjs`, `scripts/verify-release.mjs`,
`skills/peer-review/SKILL.md`, `templates/author-startup.md`, `templates/reviewer-invitation.md`,
`provenance/release-manifest.json`, `test/helpers/npm-command.mjs`,
`test/unit/npm-pack-report.test.mjs`, `test/unit/errors.test.mjs`,
`test/unit/verify-release.test.mjs`, `test/packaging/package.test.mjs`, `test/smoke/cli.test.mjs`,
`test/golden/help.test.mjs`, `test/golden/skill.test.mjs`, `test/golden/templates.test.mjs`,
`test/golden/templates/author-startup.md`, and `test/fixtures/npm-pack-report/`.

I did not execute any command, did not modify the artifact, and used no Git operation.

## Findings

None blocking.

For the record, one non-blocking observation that I considered raising as a finding and decided
against, so the reasoning is durable rather than lost:

Task 2 Step 1 (plan line 190) says only "Assert active guidance does not contain the unscoped
registry form," without specifying the encoding. The scoped replacement
`@kburson/ai-peer-review@0.2.2` contains the substring `ai-peer-review@0.2.2`, so this is
structurally the same superstring hazard I raised for the release workflow in turn 1 — a bare
`assert.doesNotMatch(bytes, /ai-peer-review@0\.2\.2/)` would reject the very text the plan mandates.

I am not blocking on it because every natural encoding is prefix-anchored and therefore safe. The
three forms the plan actually introduces all carry a distinguishing left context:

- `npx --yes ai-peer-review@0.2.2` versus `npx --yes @kburson/ai-peer-review@0.2.2` — the `--yes `
  prefix separates them.
- `npm install --save-dev ai-peer-review` versus `npm install --save-dev @kburson/ai-peer-review` —
  the `--save-dev ` prefix separates them.
- `from 'ai-peer-review'` versus `from '@kburson/ai-peer-review'` — the opening quote separates them.

An implementer mirroring the positive assertion at plan line 187 will write the negative with the
same `npx --yes ` prefix and land on the safe form. The plan also now teaches the boundary-safety
principle explicitly, with a worked example, in Task 1 Step 2 (plan lines 65-72) — which an
implementer reads before reaching Task 2. Optional suggestion 1 below closes the residual gap with
one cross-reference, and is worth taking, but it does not warrant another round.

## Required changes

None.

## Optional suggestions

1. **Cross-reference the boundary-safety rule in Task 2 Step 1.** Append one sentence to plan
   line 190, for example:

   > Anchor each negative assertion on its distinguishing prefix (`npx --yes `, `--save-dev `, or the
   > opening quote of the import specifier), because `@kburson/ai-peer-review@0.2.2` contains
   > `ai-peer-review@0.2.2` as a substring — the same boundary hazard handled in Task 1 Step 2.

   This makes the one remaining under-specified assertion in the plan as explicit as the release
   workflow assertions already are, and costs nothing.

2. **The "exactly once" phrasing in Task 2's artifact assertion is not what the encoding checks.**
   Plan lines 74-75 say the workflow "defines the artifact exactly once as
   `artifact="kburson-ai-peer-review-${version}.tgz"`," but `assert.match` at plan line 79 tests for
   at least one occurrence, not uniqueness. The gap is harmless in practice: a duplicate definition
   is not a failure mode this change can produce, and the substantive guarantees — every operation
   consumes `"$artifact"`, and no literal or glob remains — are fully enforced by the five site
   assertions and by the boundary-safe negative at plan line 69. Either soften the prose to "defines
   the artifact as" or, if uniqueness is genuinely wanted, assert on a match count. This phrasing
   came from my own turn-2 proposal, so the imprecision is mine.

3. **Soften the characterization of `test/mcp/` coverage.** Plan lines 102-103 say "End-to-end MCP
   execution remains covered in `test/mcp/` with a protocol-aware transport test." The suite is real
   and does cover the stdio path at the seam — `test/mcp/server.test.mjs:242` ("stdio runner creates
   official transport and connects the configured server") and `:259` exercise
   `serveHandoffMcpStdio` and `runHandoffMcpStdio` — but both inject a fake `createServer` and a
   fake `createTransport`, so they verify wiring rather than a real JSON-RPC handshake over a spawned
   process. "End-to-end" overstates that by a little. "MCP stdio startup and transport wiring remain
   covered in `test/mcp/`" would be exact. This is a justifying aside rather than an instruction, so
   nothing implementable depends on it — but the plan is otherwise scrupulous about claiming only
   what it can evidence, and this sentence is the one place it reaches slightly past that.

## Decision

accepted
