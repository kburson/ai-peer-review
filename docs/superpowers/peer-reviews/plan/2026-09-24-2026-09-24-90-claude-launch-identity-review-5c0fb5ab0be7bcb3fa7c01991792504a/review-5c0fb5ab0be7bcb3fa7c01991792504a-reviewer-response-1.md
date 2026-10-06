<!-- ai-peer-review-template version="1" digest="sha256:78e9a634af9d540baaf6790db82952eaf39cf7ab59a6cdc7938319ae07a4cbed" -->

<!-- protected-frontmatter -->

---
schema: "ai-peer-review.response/v1"
review_id: "review-5c0fb5ab0be7bcb3fa7c01991792504a"
role: "reviewer"
turn: 1
commit_mode: "normal"
authority_assurance: "unavailable"
artifact_path: "docs/superpowers/plans/2026-09-24-90-claude-launch-identity.md"
artifact_commit: "ff680eb52429c90d837e6d2c2cee0e6562512351"
artifact_blob: "8941caa78250611fb8f9ce857acaadc30c653e63"
artifact_digest: "sha256:d09bffd48f247f8c068a4c9f064a1b1628c30b3e3864ea9968655ff4631e9f8e"
agent:
  host: "claude-code"
  provider: "anthropic"
  model_id: "claude-opus-5"
  model_display: "Claude Opus 5"
  session_fingerprint: "sha256:56da0d8987e20f4c7a104515d7a9da2f65372d15f7e51bd853eafee39d1f55cc"
  identity_source: "runtime"
started_at: "2026-09-24T23:32:43.276Z"
submitted_at: "2026-09-24T23:39:18.268Z"
finding_ids: ["R1-F001","R1-F002","R1-F003","R1-F004"]
answered_finding_ids: []
acknowledged_supplement_ids: []
---

Mode: `normal`

## Summary

Independent review of the #90 implementation plan against its pinned spec
(`docs/superpowers/specs/2026-09-24-90-claude-launch-identity-design.md`) and against the
repository source at the recorded reference commit `2134c573`.

The architecture is sound and the decomposition is right. Scoping the identity fix to
child-environment sanitization — rather than reversing global adapter precedence or adding a
join-only override — is the correct disposition, and separating bounded execution evidence
(Task 2) from protocol authority (Task 3) is what makes the "provider exit is never review
authority" invariant enforceable rather than aspirational.

I checked the plan's load-bearing factual claims about the repository rather than accepting
them. Each of the following holds:

- The four-variable scrub list is exactly and only what the Codex adapter consumes.
  `src/identity/codex.mjs:9-10` reads `CODEX_MODEL_ID` and `CODEX_MODEL_DISPLAY`;
  `src/cli/run.mjs:4284` and `src/cli/run.mjs:4327` read `CODEX_THREAD_ID` and
  `CODEX_SESSION_ID`. No other Codex identity variable is read anywhere in `src/`, so the
  list is neither over- nor under-inclusive.
- The preflight path genuinely needs no scrub, as the plan and spec assert.
  `buildProviderChildEnvironment` (`src/provider/preflight.mjs:127-143`) is a strict
  allowlist, and no member of `PROVIDER_IDENTITY_ENVIRONMENT_KEYS` appears in
  `CLAUDE_ENVIRONMENT_ALLOWLIST`. Task 1's "use `contract.environment` exactly" is correct
  and is not a gap.
- Task 1 step 3's `Object.hasOwn(contract, 'environment')` works against the non-enumerable
  frozen property defined at `src/provider/claude-launch.mjs:275-280`, and the existing
  `env: contract.environment` spread already preserves object identity. Task 1 step 4's
  `options.env === preflight.child_environment` assertion is therefore achievable through the
  real builder-to-runner path.
- Task 2 step 6's import is real and needs no new dependency. `AjvJsonSchemaValidator`
  imports successfully from `@modelcontextprotocol/sdk/validation/ajv-provider.js`, resolving
  through the SDK's `./*` wildcard export to `dist/esm/validation/ajv-provider.js`, and `ajv`
  is a direct dependency of the installed SDK 1.30.0.
- Participants really do carry `host` and `provider` (`src/protocol/events.mjs:300-322`), so
  Task 3 step 4's `host: claude-code` / `provider: anthropic` boundary check is implementable
  against real authority and not only against fixtures.
- Task 3 step 7's atomic-write-failure fixture is sound. `atomicWrite`
  (`src/protocol/store.mjs:263-296`) creates its temporary as a random sibling in the same
  directory, unlinks it in the catch, and throws `APR_ATOMIC_WRITE_FAILED`. Both the sentinel
  assertion and the single-entry `readdirSync` assertion hold, and renaming a regular file
  onto a directory does fail as the plan requires.
- `--host` is present in the `launch-reviewer` flag list (`src/cli/parse.mjs:64`), so Task 4
  step 3's exact argv parses.
- The eight diagnostic categories in Task 2 step 4 match the spec's classification table plus
  `session-unavailable`, and the five-code allowlist matches the spec exactly. The plan's
  outcome-precedence table (Task 3 step 5) is a faithful ordering of the spec's table,
  including the join-code-over-provider-failure refinement for nonzero exits.

Both findings below are coverage gaps in the task decomposition around a published API whose
observable contract this plan changes. Neither disputes the design.

## Findings

### R1-F001 — Task 3 breaks an integration test that no task owns or runs

Task 3 changes `classifyClaudeReviewerOutcome` so that (a) recovery is gated behind a new
`resumeAvailable` argument defaulting to `false`, and (b) `submitted` requires a new
`expectedSessionFingerprint` argument defaulting to `null`, because "a direct caller without
expected session evidence cannot prove submission."

`test/integration/claude-launch-permissions.test.mjs` calls the classifier directly with the
current four-argument shape at lines 173 and 193, and then asserts the exact behavior Task 3
removes:

- `test/integration/claude-launch-permissions.test.mjs:188` —
  `assert.match(denied.recovery.command, /launch-reviewer .* --host claude --resume$/)`. Under
  the new `resumeAvailable = false` default, `recovery` is `null`, so this throws a TypeError
  rather than failing an assertion.
- `test/integration/claude-launch-permissions.test.mjs:200-201` —
  `assert.equal(corrected.status, 'submitted')` and
  `assert.equal(corrected.session_fingerprint, provider.session)`. With
  `expectedSessionFingerprint` defaulting to `null`, this call can no longer prove submission
  and becomes `outcome-unknown` with a `session-unavailable` diagnostic.

The shape mismatch compounds both: this file's `providerResult` comes from
`conformantClaude(...).turn(legacyContract(contract))` and carries `controls` and `analysis`
fields, not the normalized evidence object Task 2 defines and Task 3 declares the classifier's
`providerResult` to be.

This file appears nowhere in the plan. It is absent from the File Map and Sequence table, from
every task's **Files:** list, and from every task's red and green `node --test` command. It is
also outside every task's exact-path staging instruction — Task 3 step 8 says "Stage only the
three task files" and Task 4 step 6 says "Stage only the seven task files" — so an implementer
following the plan literally is not authorized to touch it in any task.

Its only gate is `npm run test:integration`, reached through `npm run test:slow`, which the
plan schedules solely in Final Implementation Verification. `npm test` is
`test:unit && test:golden` and does not include it. The plan therefore produces four green
task commits followed by a red final gate, with no task owning the fix.

The plan does contain a pointer at line 77 — "update in-repository call sites found by
`rg 'classifyClaudeReviewerOutcome' src test`" — which would surface this file. But the
concrete remediation sentence at line 347 names only "existing permission tests" in the
context of Task 3's **Files:** list, which contains only
`test/unit/claude-launch-permissions.test.mjs`. The `rg` instruction and the exact-path
staging discipline are in direct conflict, and the staging discipline is the one stated as a
per-task gate.

### R1-F002 — The classifier contract change is an undocumented published-API break

`classifyClaudeReviewerOutcome` is a published export. It is re-exported from
`src/public-api.mjs:30`, and `src/public-api.mjs` is the package's only `exports` entry in
`package.json`. `test/packaging/package.test.mjs:179` freezes it in the public export list.

Task 3 changes its observable behavior for callers using the existing published argument shape:
a caller that passes `{ before, after, providerResult, contract }` and previously received
`submitted` with a real `session_fingerprint` will now receive `outcome-unknown` with a
`session-unavailable` diagnostic, and a caller that previously received a `permission-blocked`
result with a populated `recovery` will now receive `recovery: null`. No argument becomes
invalid; the result is simply different.

The plan is careful about the other published break in the same change. Task 2 step 5 and the
Global Constraints both flag the schema widening explicitly — "Keep schema ID
`ai-peer-review.claude-launch-result/v1`, accepting historical results without `diagnostic`;
document that older strict schemas need updating for new results." The classifier change gets
no equivalent treatment, and its remediation is scoped to "in-repository call sites."

That asymmetry matters in the wrong direction. The schema break fails loudly at validation.
This one is silent: an external consumer keeps receiving a well-formed, schema-valid result
object that now reports a different outcome for the same review state. A plan that documents
the louder break while leaving the quieter one implicit will ship the quieter one unannounced.

Note that `test/packaging/**` is in neither `npm test` nor `npm run test:slow`, so the
packaging golden is not a gate that would catch anything here either — though since the plan
correctly instructs not to add exports, that golden should stay green.

## Required changes

1. Add `test/integration/claude-launch-permissions.test.mjs` to the File Map and Sequence
   table with Task 3 as its owning task, add it to Task 3's **Files:** list, and update
   Task 3 step 8 to stage four files rather than three. Update the direct-caller sentence at
   line 347 to name the file explicitly instead of the generic "existing permission tests," and
   state which behavior each of its two direct calls must adopt: the denial call must pass
   `resumeAvailable: true` to keep asserting the generated `--resume` command, and the
   submission call must pass the explicit expected session fingerprint to keep asserting
   `submitted`. Also state that both calls must supply normalized Task 2 evidence rather than
   the `conformantClaude` provider-result shape currently passed through `legacyContract`.
2. Add `node --test test/integration/claude-launch-permissions.test.mjs` to Task 3 step 8's
   green command so the breakage is caught inside Task 3's own red/green loop rather than at
   Final Implementation Verification after four commits.
3. Document the `classifyClaudeReviewerOutcome` behavior change as a published-API break, at
   the same level of explicitness as the schema widening. Add it to Global Constraints
   alongside the existing schema-ID constraint, stating that direct callers using the prior
   four-argument shape will observe `outcome-unknown` instead of `submitted` and
   `recovery: null` instead of a generated recovery command, and name where that change is to
   be recorded for consumers. Widen the remediation scope from "in-repository call sites" to
   include the external contract.

## Optional suggestions

### R1-F003 — Name the removal of the orphaned `parseProviderResult`

Task 3 step 3 replaces the runner's use of `parseProviderResult`
(`src/provider/claude-launch.mjs:585-620`) with `normalizeClaudeExecution`. That leaves
`parseProviderResult` as a module-scope function that is neither exported nor called. The
repository's `eslint.config` sets `'no-unused-vars': ['error', { argsIgnorePattern: '^_' }]`
for all `**/*.mjs` outside `node_modules`, `coverage`, and `.scratch`, so `npm run lint` fails
at Final Implementation Verification. Naming its removal in Task 3 step 3 turns a
final-gate surprise into a one-line instruction.

### R1-F004 — State the re-classification trigger as a single condition

Task 3 step 6 introduces the second classifier call as something that happens "After
successful persistence." Two sentences later it establishes that "If a valid prior state
already exists and remains usable, it can support recovery without replacement" — a branch in
which no persistence occurs but the second call is still required to attach recovery. As
written, an implementer reading the steps in order can reasonably gate the second call on a
write having happened, and silently lose recovery on a resumed permission-blocked launch that
correctly preserved usable prior state. Restating the trigger once as a single condition —
recovery is available when usable private state exists after this step, whether newly written
or preserved — removes the ambiguity without changing the specified behavior.

## Decision

revisions-requested
