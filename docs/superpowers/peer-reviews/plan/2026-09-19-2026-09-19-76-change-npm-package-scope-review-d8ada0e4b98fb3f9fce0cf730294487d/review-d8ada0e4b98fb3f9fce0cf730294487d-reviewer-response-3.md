<!-- ai-peer-review-template version="1" digest="sha256:78e9a634af9d540baaf6790db82952eaf39cf7ab59a6cdc7938319ae07a4cbed" -->

<!-- protected-frontmatter -->

---
schema: "ai-peer-review.response/v1"
review_id: "review-d8ada0e4b98fb3f9fce0cf730294487d"
role: "reviewer"
turn: 3
commit_mode: "normal"
authority_assurance: "unavailable"
artifact_path: "docs/superpowers/plans/2026-09-19-76-change-npm-package-scope.md"
artifact_commit: "03b091b44ea9b9aae1bc1249cacfe447a2c2908b"
artifact_blob: "fa59476e34963fe00ee4d2df19bdb00e23d0c9e7"
artifact_digest: "sha256:1036880f69bb843005a2a72cd0e704a83fcebfbc711abd6998836cde818ba7d1"
agent:
  host: "claude-code"
  provider: "anthropic"
  model_id: "claude-opus-5"
  model_display: "Claude Opus 5"
  session_fingerprint: "sha256:8bef3e3392cbb1a4b2dabe6ee890822f519a6563c893a3f731947ce2e108eaa8"
  identity_source: "runtime"
started_at: "2026-09-19T06:03:46.500Z"
submitted_at: "2026-09-19T06:20:23.361Z"
finding_ids: []
answered_finding_ids: []
acknowledged_supplement_ids: []
---

Mode: `normal`

## Summary

The turn-2 required correction is implemented exactly and correctly at artifact commit
`03b091b44ea9b9aae1bc1249cacfe447a2c2908b`, and all three optional clarifications were adopted. I
traced every new assertion regex against the precise shell text Step 6 mandates and confirmed each
one matches, that the new positive assertions do not collide with the boundary-safe negative
assertion retained from turn 2, and that the contradiction I introduced in turn 1 is fully
dissolved. Nothing carried forward from turns 1 or 2 remains open.

One defect blocks acceptance, and it is not a regression: it has been in Task 1 Step 3 unchanged
since the original sealed plan, and I did not catch it in turn 1 or turn 2. Step 3 directs the
implementer to "execute all three retained binary names," but `bin/peer-review-mcp.mjs` parses no
arguments at all — it unconditionally starts an MCP stdio server. The natural implementation,
`peer-review-mcp --help`, is therefore either vacuous or hangs, depending on how the child's stdin
is closed on each of the three CI platforms. The fix is a two-sentence substitution that preserves
everything Step 3 is trying to prove.

I am raising it now rather than letting it pass because the failure lands in
`test/smoke/cli.test.mjs`, which runs on `ubuntu-latest`, `macos-latest`, and `windows-latest`
(`test/packaging/package.test.mjs:181-197`), and because a hang there produces no diagnostic — only
a timed-out job. That is worth one more short round.

### Verification of the turn-2 required correction

**Required change 1 — accepted, implemented exactly as specified.** Plan lines 74-88 replace the
contradictory five-literal-prefix instruction with a definition-once / reuse-everywhere pair. The
prose (lines 74-76) and the encoding (lines 78-88) agree with each other and with Step 6's design.
I checked each of the six regexes against the exact shell text Step 6 mandates at plan lines
122-137 and against the current `.github/workflows/release.yml` lines they replace:

| Assertion | Target text after Step 6 | Replaces | Result |
| --- | --- | --- | --- |
| `/artifact="kburson-ai-peer-review-\$\{version\}\.tgz"/` | `artifact="kburson-ai-peer-review-${version}.tgz"` (plan line 124) | new line | ✅ |
| `/shasum -a 256 "\$artifact" > SHA256SUMS/` | `shasum -a 256 "$artifact" > SHA256SUMS` (plan line 127) | `release.yml:47` | ✅ |
| `/npm publish "\$artifact"/` | `npm publish "$artifact" --access public --provenance` | `release.yml:57` | ✅ |
| `/gh release download[^\n]*--pattern "\$artifact"/` | `gh release download "$RELEASE_TAG" --dir observed-release --pattern "$artifact" --pattern SHA256SUMS` | `release.yml:66` | ✅ |
| `/cmp "\$artifact" observed-release\/"\$artifact"/` | `cmp "$artifact" observed-release/"$artifact"` | `release.yml:67` | ✅ |
| `/gh release create[^\n]*"\$artifact"/` | `gh release create "$RELEASE_TAG" "$artifact" SHA256SUMS --verify-tag --generate-notes` | `release.yml:70` | ✅ |

I also confirmed `observed-release/"$artifact"` is valid shell — an unquoted literal prefix
concatenated with a quoted expansion — so the `cmp` regex describes a working command, not just a
matching string.

**No collision between the new positive assertions and the retained negative one.** This was the
specific risk in combining turn-1 changes 3 and 4, so I re-verified it against the post-Step-6
workflow rather than assuming turn 2's result still holds:

- `assert.doesNotMatch(release, /(?<![\w-])ai-peer-review-[^\s]*\.tgz/)` against
  `artifact="kburson-ai-peer-review-${version}.tgz"`: the sole occurrence of `ai-peer-review-` is
  preceded by the `-` of `kburson-`, which is inside `[\w-]`, so the lookbehind fails and there is
  no other start position. Correctly passes. ✅
- The same negative assertion against `package="@kburson/ai-peer-review@$(node -p ...)"`: the
  pattern requires a trailing hyphen (`ai-peer-review-`) and the text has `ai-peer-review@`. No
  match. Correctly passes. ✅
- `assert.doesNotMatch(release, /package="ai-peer-review@/)` against
  `package="@kburson/ai-peer-review@`: the literal `package="ai-peer-review@` is absent. Correctly
  passes. ✅
- `assert.match(release, /@kburson\/ai-peer-review@/)` is satisfied by plan line 133. ✅

So the full six-assertion set is simultaneously satisfiable by exactly one workflow shape — the one
Step 6 mandates. That is what the turn-2 finding asked for.

**Optional 1 — accepted.** `Verify unchanged: scripts/verify-extraction.mjs` is now in Task 3's
`**Files:**` block (plan line 220), sitting alongside `scripts/verify-release.mjs`. This protects
the signature-verified relicensing declaration text at `scripts/verify-extraction.mjs:124` and the
release gate at `.github/workflows/release.yml:33`. ✅

**Optional 2 — accepted.** The keep-list lead-in at plan line 237 now reads "includes at least:",
which correctly signals the list is representative. Combined with the step's own classification
taxonomy ("executable, repository/product name, config/runtime path, protocol/schema ID, or
historical evidence"), the occurrence I named in turn 2 —
`test/unit/execution-contract.test.mjs:42`, a synthetic `opt/ai-peer-review/bin/peer-review.mjs`
install path — is now unambiguously handled as a config/runtime path without needing its own bullet. ✅

**Optional 3 — accepted.** Task 2's `**Files:**` block line 157 is now
`Verify unchanged: templates/reviewer-invitation.md`, matching the definitive statement in Step 4
(plan lines 199-200). The file list and the step that resolved the question now agree. ✅

### Closing verification of items carried across all three turns

Because this is an acceptance-candidate turn, I re-confirmed the turn-1 and turn-2 fixes are still
present and were not disturbed by the turn-3 edit: `test/unit/errors.test.mjs` in Task 1's file
list (plan line 33) and in both focused commands (plan lines 99-100, 144-145), with the narrow
line-12 instruction intact (plan lines 109-115); Task 3 Step 2's `git status --porcelain` plus
`git diff HEAD` checks with their explicit pass rules (plan lines 252-266); Task 1 Step 6's
deterministic derivation, the `test -f "$artifact"` guard, and the no-glob rule (plan lines
117-137); Task 2 Step 4's split between regenerating `author-startup` from source and updating only
the hydrated line in the `reviewer-invitation` golden (plan lines 196-203); both help digests
unconditional (plan lines 163-164); and the version-bump constraint (plan line 22). All intact.

I also confirmed Task 3 Step 3's command list covers every file the plan modifies: `npm test`
reaches `test/unit/**` and `test/golden/**` (so `errors.test.mjs`, `npm-pack-report.test.mjs`,
`help.test.mjs`, `templates.test.mjs`, `skill.test.mjs`, `manifests.test.mjs`), `npm run test:slow`
reaches `test/smoke/cli.test.mjs`, and `npm run test:packaging` reaches
`test/packaging/package.test.mjs`. No modified test file is left unexercised.

One incidental confirmation on `npm run lint`: it runs `cspell` over `**/*.{md,mjs,js,json}`, and
the token `kburson` already appears throughout the repository — `@kburson/ai-task-manager` in
`package.json:31,54`, the vendored tarball filename, and the `kburson/ai-peer-review` repository
URLs — so the scope introduces no new dictionary term and the lint gate carries no hidden risk.

### Verification basis

Read at revised artifact commit `03b091b44ea9b9aae1bc1249cacfe447a2c2908b`: the full revised plan
and `review-d8ada0e4b98fb3f9fce0cf730294487d-author-response-2.md`. Read in full this turn to close
the last unverified plan claim: `test/smoke/cli.test.mjs` and `bin/peer-review-mcp.mjs`. Re-checked
`.github/workflows/release.yml`, `package.json`, and `test/packaging/package.test.mjs` carried
forward from earlier turns at the same content.

I did not execute any command, did not modify the artifact, and used no Git operation.

## Findings

1. **Task 1 Step 3 requires executing `peer-review-mcp`, which accepts no arguments and starts a
   long-running stdio server; the obvious implementation is vacuous at best and hangs CI at worst.**

   Plan line 92 states:

   > Install the produced tarball into the existing disposable consumer, dynamically import
   > `@kburson/ai-peer-review`, and execute all three retained binary names from `node_modules/.bin`.

   The three binaries are `ai-peer-review`, `peer-review`, and `peer-review-mcp`
   (`package.json:10-14`). The first two resolve to `bin/peer-review.mjs`, which has a CLI parser
   and a bounded `--help` path — `test/smoke/cli.test.mjs:28-35` and `:42-45` already exercise both
   that way, asserting `/Commands:/`.

   The third does not. `bin/peer-review-mcp.mjs` is 24 lines and contains no argument handling
   whatsoever:

   ```js
   const packageJson = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
   await runHandoffMcpStdio({ repositoryRoot: process.cwd(), version: packageJson.version });
   ```

   It reads `package.json`, then unconditionally awaits an MCP stdio server bound to the process's
   stdin/stdout. `--help` is not parsed, not recognized, and not rejected — it is silently ignored,
   and the server starts regardless.

   Two outcomes follow, and which one occurs depends on platform stdin semantics rather than on
   anything the plan controls:

   - **Vacuous pass.** `runNpm` wraps `execFileSync` (`test/helpers/npm-command.mjs:22-29`), and
     `execFileSync` called without an `input` option gives the child a stdin pipe that is closed
     immediately. If the SDK's stdio transport treats EOF as a clean shutdown, the process exits 0
     and the assertion passes — having proven only that the file is executable, not that the binary
     works. The existing `/Commands:/` assertion cannot be reused, because the MCP server emits no
     such output.
   - **Hang.** If the transport instead waits for a JSON-RPC message, `execFileSync` blocks. Node's
     test runner applies no default timeout, so the job runs to the CI wall clock. This is the
     outcome with no diagnostic attached.

   The step is reached inside Task 1, whose Step 4 and Step 7 both run `test/smoke/cli.test.mjs`
   (plan lines 99-100 and 144-145), so the plan's own gates do execute it — but a hang is precisely
   the failure mode those gates handle worst, and `test/smoke/cli.test.mjs` runs on all three
   platforms per the CI matrix asserted at `test/packaging/package.test.mjs:181-197`.

   What Step 3 actually needs to establish for this change is narrower than "execute": scoping the
   package must not disturb bin installation. That is fully provable by asserting all three
   `node_modules/.bin` entries exist and executing only the two that have a bounded, asserting exit
   path. Nothing about the scope rename can break `peer-review-mcp` while leaving the other two
   working, since all three come from the same `bin` map in the same manifest.

   This is not a regression from turn 2 — the sentence is unchanged from the original sealed plan at
   `7d12ab16e3eb0912af4340842ef63853b722b12a`, and I did not flag it in turn 1 or turn 2. The
   remaining two clauses of Step 3 are sound: the "existing disposable consumer" is real
   (`test/smoke/cli.test.mjs:13-41` packs, creates a throwaway `host` directory with its own
   `package.json`, and installs the tarball into it), and the dynamic import is well-founded, since
   `package.json:15` declares `"exports": "./src/public-api.mjs"` and the tarball install at
   `test/smoke/cli.test.mjs:38` brings in `@modelcontextprotocol/sdk` and `zod` so that module
   graph resolves.

## Required changes

1. **Replace the "execute all three" clause in Task 1 Step 3 with an existence check for all three
   plus execution of the two that terminate.** For example, replace plan line 92 with:

   > Install the produced tarball into the existing disposable consumer and dynamically import
   > `@kburson/ai-peer-review` to confirm the scoped specifier resolves. Assert that all three
   > retained binary names — `ai-peer-review`, `peer-review`, and `peer-review-mcp` — are present in
   > the consumer's `node_modules/.bin`. Execute only `ai-peer-review --help` and `peer-review --help`
   > and assert each prints `Commands:`. Do not execute `peer-review-mcp`: `bin/peer-review-mcp.mjs`
   > parses no arguments and unconditionally starts an MCP stdio server, so invoking it from a
   > synchronous test is either vacuous or blocking.

   This preserves every guarantee the step was reaching for — the scoped import resolves, the bin
   map survives scoping intact for all three names, and the two user-facing CLIs run from a clean
   consumer — while removing the unbounded invocation. It also keeps the step consistent with the
   assertion style already in `test/smoke/cli.test.mjs`, which pairs each execution with a
   `/Commands:/` match rather than relying on exit status alone.

   If you would rather keep `peer-review-mcp` exercised end-to-end, that belongs in `test/mcp/`
   with an explicit JSON-RPC handshake and an explicit timeout, not in the packaging smoke path —
   and it is orthogonal to this change, since the scope rename cannot affect that binary
   differently from the other two.

## Optional suggestions

1. **The two `gh release` assertions couple the test to single-line shell formatting.** Plan lines
   83 and 85 use `[^\n]*`, which cannot cross a newline:

   ```js
   /gh release download[^\n]*--pattern "\$artifact"/,
   /gh release create[^\n]*"\$artifact"/,
   ```

   Both target commands are single-line today (`.github/workflows/release.yml:66` and `:70`), so
   these pass as written. But if either command is later wrapped with a `\` continuation — a
   plausible edit, since the `gh release download` line is already 118 characters — the assertion
   fails with a message that points at the package scope rather than at the reformatting that
   actually broke it. If pinning single-line form is deliberate, a one-line comment in the test
   saying so would save the next maintainer a wrong diagnosis; if it is incidental, `[\s\S]*?`
   bounded to the step would be more robust. Either resolution is fine — this is a maintenance
   ergonomics note, not a correctness problem with the current plan.

2. **Task 2 Step 2 still says "active templates" plural.** Plan line 183 reads "Replace
   registry-resolution operands in `help-data.mjs`, `run.mjs`, and active templates," while Step 4
   (plan lines 199-200) and the file list (plan line 157) now both establish that only
   `templates/author-startup.md` changes and `templates/reviewer-invitation.md` does not. The
   plural is resolved correctly in two other places, so nothing breaks; narrowing line 183 to name
   `templates/author-startup.md` directly would make all three statements agree. Purely editorial.

## Decision

revisions-requested
