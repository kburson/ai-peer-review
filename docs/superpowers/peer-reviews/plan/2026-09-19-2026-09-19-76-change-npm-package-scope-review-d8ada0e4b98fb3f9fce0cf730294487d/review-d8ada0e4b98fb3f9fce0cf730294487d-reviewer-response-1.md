<!-- ai-peer-review-template version="1" digest="sha256:78e9a634af9d540baaf6790db82952eaf39cf7ab59a6cdc7938319ae07a4cbed" -->

<!-- protected-frontmatter -->

---
schema: "ai-peer-review.response/v1"
review_id: "review-d8ada0e4b98fb3f9fce0cf730294487d"
role: "reviewer"
turn: 1
commit_mode: "normal"
authority_assurance: "unavailable"
artifact_path: "docs/superpowers/plans/2026-09-19-76-change-npm-package-scope.md"
artifact_commit: "7d12ab16e3eb0912af4340842ef63853b722b12a"
artifact_blob: "f02b3d82e4d0b5dac07cbd214bc8050de6d5efd0"
artifact_digest: "sha256:52a62532cdbbbfbe1db5e729ae7e401db9bd504d23f5ff66b36a10954dee2e30"
agent:
  host: "claude-code"
  provider: "anthropic"
  model_id: "claude-opus-5"
  model_display: "Claude Opus 5"
  session_fingerprint: "sha256:8bef3e3392cbb1a4b2dabe6ee890822f519a6563c893a3f731947ce2e108eaa8"
  identity_source: "runtime"
started_at: "2026-09-19T06:03:46.500Z"
submitted_at: "2026-09-19T06:08:17.102Z"
finding_ids: []
answered_finding_ids: []
acknowledged_supplement_ids: []
---

Mode: `normal`

## Summary

The plan's architecture is sound: it correctly treats the npm registry identity as a narrow
package-resolution concern, correctly predicts npm's scope-stripping tarball filename
(`@kburson/ai-peer-review` → `kburson-ai-peer-review-0.2.2.tgz`), correctly preserves the three
binary names, and correctly hedges on `templates/reviewer-invitation.md` (verified: that template
contains no literal package spec — its zero-install line is rendered from `src/cli/run.mjs:740`,
so only `templates/author-startup.md:37` needs a literal edit). The test-first sequencing in
Task 1 and the golden-regeneration sequencing in Task 2 are appropriate.

I verified the plan's file inventory against the actual working tree at artifact commit
`7d12ab16e3eb0912af4340842ef63853b722b12a`. Four defects block acceptance. One is a hard omission
that guarantees a red `npm test` (Finding 1). One makes the Task 3 acceptance-criteria verification
gate unsound — it can report success while the condition it guards is violated (Finding 2). Two are
under-specified instructions where the plan's own wording admits an implementation that fails
(Findings 3 and 4).

No finding concerns the goal, the scope boundaries, or the preservation constraints, all of which I
judge correct and well-drawn.

### Verification basis

Read at the sealed artifact commit: `package.json`, `package-lock.json` (root name fields),
`.github/workflows/release.yml`, `src/cli/help-data.mjs`, `src/cli/run.mjs`,
`src/templates/index.mjs`, `src/mcp/server.mjs`, `src/config/load.mjs`, `src/config/setup.mjs`,
`scripts/verify-release.mjs`, `scripts/verify-extraction.mjs`, `skills/peer-review/SKILL.md`,
`templates/author-startup.md`, `templates/reviewer-invitation.md`, `provenance/release-manifest.json`,
`test/helpers/npm-command.mjs`, `test/unit/npm-pack-report.test.mjs`, `test/unit/errors.test.mjs`,
`test/unit/verify-release.test.mjs`, `test/packaging/package.test.mjs`, `test/smoke/cli.test.mjs`,
`test/golden/help.test.mjs`, `test/golden/skill.test.mjs`, `test/golden/templates.test.mjs`,
`test/golden/templates/author-startup.md`, `test/golden/templates/reviewer-invitation.md`,
`test/golden/manifests/*`, and the `test/fixtures/npm-pack-report/` directory listing.

I did not execute any command, did not modify the artifact, and used no Git operation.

## Findings

1. **`test/unit/errors.test.mjs` hard-asserts the unscoped package name and is absent from every
   task's file list — `npm test` will fail after Task 1 Step 5.**

   `test/unit/errors.test.mjs:12` reads:

   ```js
   assert.equal(packageJson.name, 'ai-peer-review');
   ```

   This file is matched by `test:unit` (`node --test "test/unit/**/*.test.mjs"`), which `npm test`
   runs. It appears in no `**Files:**` block: Task 1 lists `test/unit/npm-pack-report.test.mjs` but
   not `test/unit/errors.test.mjs`; Task 2 lists only docs, renderers, and goldens; Task 3 says
   "Modify only if a missing active assertion is found: tests listed in Tasks 1–3", and this file is
   not among them.

   The failure is also mis-sequenced relative to the plan's own gates. Task 1 Step 4 runs only
   `test/unit/npm-pack-report.test.mjs test/packaging/package.test.mjs test/smoke/cli.test.mjs`;
   Task 1 Step 7 runs the same three; Task 2 Step 5 runs `test/golden/help.test.mjs
   test/golden/templates.test.mjs test/packaging/package.test.mjs`. None of these touch
   `test/unit/errors.test.mjs`. So Task 1 Step 7 and Task 2 Step 5 both report green while the
   repository is already broken, and the failure first surfaces at Task 3 Step 3's `npm test` —
   after the plan has declared the scoped packaging contract verified.

   Note the surrounding assertions in the same test are correct as-is and must not be swept:
   `errors.test.mjs:13` pins `version === '0.2.2'`, `:16-17` pin the `peer-review` and
   `peer-review-mcp` binary paths, and `:23`/`:30` reference `@kburson/ai-task-manager`, an unrelated
   devDependency. Only line 12 changes.

2. **Task 3 Step 2's historical-exclusion check uses a command that cannot observe the two states it
   must exclude, so the acceptance criterion can pass while being violated.**

   Task 3 Step 2 states: "Run `git diff -- provenance schemas docs/superpowers/peer-reviews` and
   require no changes."

   `git diff` with no commit argument compares the worktree against the *index*, and never reports
   untracked files. Two concrete false-pass paths follow:

   - **Staged modification.** If any file under those paths is modified and staged — including by the
     ordinary `git add` that Task 3 Step 4 performs, or by any earlier partial staging during a
     multi-session execution — `git diff` reports nothing. The byte-for-byte preservation guarantee
     is silently unverified.
   - **Untracked addition.** `git diff` cannot report a newly created file. This is not hypothetical
     for this path: `docs/superpowers/peer-reviews/` is precisely where the peer-review package
     writes new review records, and this very review created a new untracked directory there
     (`.../plan/2026-09-19-2026-09-19-76-change-npm-package-scope-review-d8ada0e4b98fb3f9fce0cf730294487d/`).
     At Task 3 Step 2 execution time that directory exists and `git diff` is blind to it. The step
     therefore reports "no changes" in exactly the situation where a human reading the step would
     expect it to say something.

   The constraint being guarded — "Preserve immutable historical evidence under `provenance/` and
   existing records under `docs/superpowers/peer-reviews/` byte-for-byte" (Global Constraints) — is
   about *existing* records, so new untracked review records are legitimate. But the step must
   distinguish them rather than be structurally unable to see either case.

3. **Task 1 Step 2's negative workflow assertion is under-specified: the new tarball filename is a
   superstring of the forbidden one.**

   Task 1 Step 2 requires asserting the release workflow "contains no active `package="ai-peer-review@`
   or `ai-peer-review-*.tgz` target."

   The replacement artifact name is `kburson-ai-peer-review-0.2.2.tgz`, which *contains* the
   substring `ai-peer-review-`. A natural reading of "contains no `ai-peer-review-*.tgz` target"
   implemented as an unanchored regex — for example `assert.doesNotMatch(release, /ai-peer-review-.*\.tgz/)`
   — fails against the correct scoped implementation. The plan gives the implementer a prose
   requirement whose most obvious encoding rejects the very artifact the plan mandates.

   (The companion check is not affected: the new value `package="@kburson/ai-peer-review@` does not
   contain `package="ai-peer-review@`, so that half is safe either way. The asymmetry between the two
   halves of the same sentence is what makes the instruction hazardous.)

   For reference, the current workflow has five sites carrying the unscoped artifact name that Step 6
   must convert: `.github/workflows/release.yml:47` (`shasum -a 256 ai-peer-review-*.tgz`), `:52`
   (`package="ai-peer-review@..."`), `:57` (`npm publish ai-peer-review-*.tgz`), `:66-67`
   (`gh release download --pattern` and `cmp`), and `:70` (`gh release create`).

4. **Task 1 Step 6 offers two artifact-derivation strategies without choosing, and the fragile one is
   already known-fragile in this repository.**

   Step 6 says: "define the actual artifact from npm output or the deterministic scope-stripped
   filename."

   Deriving the filename by parsing raw `npm pack` output is version-sensitive. This repository
   already documents that sensitivity in its own fixtures: `test/fixtures/npm-pack-report/npm-11-single.json`
   is a single-element *array* report while `npm-12-single.json` is a *package-keyed object* report,
   and `parseNpmPackOutput` (`test/helpers/npm-command.mjs:31-79`) exists specifically to absorb that
   divergence. The release workflow pins `npm@12.0.2` (`.github/workflows/release.yml:31`) but has no
   equivalent parser available in shell, and `npm pack` without `--json` has no stability guarantee
   across the npm upgrade the workflow performs on every run.

   Leaving the choice open means the release path — the one path in this change that cannot be
   rehearsed locally and whose failure mode is a broken or mismatched published artifact — may be
   implemented on the fragile branch. The plan should mandate the deterministic branch.

## Required changes

1. **Add `test/unit/errors.test.mjs` to Task 1's `**Files:**` list** (as `Modify`), and add an explicit
   instruction to Task 1 Step 5 or a new adjacent step: update `test/unit/errors.test.mjs:12` to
   `assert.equal(packageJson.name, '@kburson/ai-peer-review');` and leave lines 13, 16-17, 23 and 30
   unchanged.

   Additionally, extend the focused command in **Task 1 Step 4 and Step 7** to include this file so
   the red-then-green cycle actually covers it:

   ```bash
   node --test test/unit/npm-pack-report.test.mjs test/unit/errors.test.mjs \
     test/packaging/package.test.mjs test/smoke/cli.test.mjs
   ```

   Without this, Task 1 Step 7's stated expectation ("scoped package and release assertions pass") is
   false at the time it is asserted.

2. **Replace Task 3 Step 2's verification command with one that observes staged and untracked state.**
   For example:

   ```bash
   git status --porcelain -- provenance schemas docs/superpowers/peer-reviews
   git diff HEAD -- provenance schemas docs/superpowers/peer-reviews
   ```

   and state the pass condition explicitly: `git diff HEAD` must be empty, and `git status --porcelain`
   must show no `M`/`D`/`R` entries — permitting only new untracked (`??`) entries under
   `docs/superpowers/peer-reviews/plan/2026-09-19-2026-09-19-76-change-npm-package-scope-review-d8ada0e4b98fb3f9fce0cf730294487d/`,
   which are this review's own records. Any other entry fails the step.

3. **Specify the negative workflow assertion in Task 1 Step 2 with an explicit boundary**, so it
   cannot reject the mandated scoped filename. State the intended encoding directly in the plan, for
   example:

   ```js
   assert.doesNotMatch(release, /(?<![\w-])ai-peer-review-[^\s]*\.tgz/);
   assert.doesNotMatch(release, /package="ai-peer-review@/);
   assert.match(release, /@kburson\/ai-peer-review@/);
   ```

   and add an accompanying positive assertion that every artifact site uses the exact
   `kburson-ai-peer-review-` prefix, so the five sites listed in Finding 3 are all covered rather than
   only detected by absence.

4. **Make Task 1 Step 6 mandate the deterministic filename** and drop the "from npm output" branch.
   Concretely, direct the implementation to compute the artifact name from `package.json` in the pack
   step and reuse that single variable for `SHA256SUMS`, `npm publish`, `gh release download --pattern`,
   `cmp`, and `gh release create` — for example:

   ```bash
   version="$(node -p "require('./package.json').version")"
   artifact="kburson-ai-peer-review-${version}.tgz"
   ```

   State that the same `$artifact` value must be the only artifact operand in every subsequent step,
   and that no glob may remain in the release workflow.

## Optional suggestions

1. **Task 2 Step 4 permits a golden edit that will fail.** The step says "Regenerate or update only
   the golden template/help outputs derived from the active sources." For `test/golden/templates/author-startup.md`
   the "update" option is wrong. That golden's line 1 carries a concrete rendered digest
   (`digest="sha256:19ffedd45cc89730c41b5fc6fc80931986ec73850cc5212040204307170085e4"`), and
   `src/templates/index.mjs:103` computes `template_digest` from the raw template bytes at hydration
   time. Changing `templates/author-startup.md:37` therefore changes line 1 as well, and
   `test/golden/templates.test.mjs:64` compares the full byte sequence via `assert.deepEqual`. An
   implementer who hand-edits only line 37 of the golden — the obvious minimal diff — gets a red test.

   The asymmetry is worth stating explicitly, because the sibling golden behaves differently:
   `templates/reviewer-invitation.md` has no literal package spec, so its bytes are unchanged and
   `test/golden/templates/reviewer-invitation.md:1` keeps its current digest, while only its line 40
   (the hydrated `zero_install_join_display` value) changes. Recommend wording Step 4 as "regenerate
   `author-startup` from source; for `reviewer-invitation` update only the hydrated zero-install line."

   Note also that `test/golden/templates.test.mjs` has two sites to change, not one: the input value
   at `:22` and the assertion regex at `:80`.

2. **Drop the conditional on `test/golden/help/submit.sha256.txt`.** Task 2's file list says "Modify
   `test/golden/help/submit.sha256.txt` only if its rendered command content changes." It always
   changes. `src/cli/help-data.mjs:922` builds the zero-install example inside `topic(command)`, which
   runs for every command including `submit`, and `test/golden/help.test.mjs:133-137` digests
   `JSON.stringify(helpRequest('submit', 'json'))`. Both `all.sha256.txt` and `submit.sha256.txt` are
   unconditionally affected by the single edit at line 922. Stating this as certain removes a decision
   point that can only be gotten wrong.

3. **Give Task 3 Step 1 a concrete expected answer.** The step asks the implementer to "classify every
   remaining `ai-peer-review` occurrence". I performed that classification; publishing the result in
   the plan converts an open-ended audit into a checkable list. The non-registry occurrences that must
   survive unchanged are:

   - Runtime/protocol identity: `src/mcp/server.mjs:59` (`createServer({ name: 'ai-peer-review' })`) —
     this is the advertised MCP server name; renaming it would break MCP clients and is not a registry
     concern.
   - Config ownership and paths: `src/config/load.mjs:227`, `src/config/load.mjs:301`,
     `src/config/setup.mjs:186`, `src/config/setup.mjs:265`, `src/config/setup.mjs:276`.
   - Historical release evidence: `scripts/verify-release.mjs:60` (pins `manifest.package === 'ai-peer-review'`
     and `manifest.version === '0.2.0'`) and its fixture `test/unit/verify-release.test.mjs:31`. These
     verify the immutable 0.2.0 release and must stay unscoped. Task 3's "Verify unchanged" list omits
     `scripts/`; adding `scripts/verify-release.mjs` there would make the intent explicit.
   - Executable name: `test/smoke/cli.test.mjs:30` invokes `['--yes', '--package', tarball, 'ai-peer-review', '--help']`,
     where `ai-peer-review` is the *binary*, not the package. Only `test/smoke/cli.test.mjs:25`
     (`expectedPackageName`) changes in that file.
   - Schema identifiers throughout `test/golden/manifests/*` and `schemas/**`
     (`ai-peer-review.manifest/v1`, `ai-peer-review.lineage-receipt/v1`, `ai-peer-review.cli-result/v1`,
     and siblings).

   I also confirmed two files the plan might be expected to touch but correctly does not:
   `skills/peer-review/SKILL.md` contains no occurrence of `ai-peer-review` at all (so Task 2's listing
   of it is a no-op unless the migration note is added there), and `test/golden/skill.test.mjs` asserts
   only phrase presence with no digest, so adding install guidance to `SKILL.md` will not break it.

4. **Record the version-bump consequence.** The plan pins version `0.2.2` and hardcodes `@0.2.2` into
   `src/cli/help-data.mjs`, `src/cli/run.mjs`, `templates/author-startup.md`, `README.md`, and two
   golden fixtures. Two facts in the repository interact with that:

   - `ai-peer-review@0.2.2` is already published on npm. `docs/superpowers/specs/2026-09-14-project-local-spr-xpr-broker-design.md:348`
     reasons about the contents of "the public `ai-peer-review@0.2.2` tarball", and a prior review
     record reports `npm view ai-peer-review@0.2.2 version dist.tarball --json` resolving.
   - `.github/workflows/release.yml:43` enforces `test "$(git rev-parse "$RELEASE_TAG^{}")" = "$(git rev-parse HEAD)"`,
     so a tag may only be released from the exact commit it points at.

   Together these mean the rename commit cannot itself ship under tag `v0.2.2`; a bump is required to
   actually release the scoped package. Whenever that bump happens, every hardcoded `@0.2.2` literal
   introduced by Task 2 becomes stale guidance pointing agents at a version that predates the scope
   change. This is outside the stated scope ("Do not publish, unpublish, deprecate, or rename any
   external resource"), so I am not requesting a change — but the plan should say so explicitly, and
   ideally cross-reference the existing proposal to derive the specifier from `package.json`
   (`docs/superpowers/plans/2026-09-17-57-61-peer-review-recovery-architecture.md:429`), so the next
   release does not silently ship a stale pointer.

5. **Mention the fixtures that intentionally stay unscoped.** Task 1's file list names five files in
   `test/fixtures/npm-pack-report/`. The directory also contains `empty.json`, `malformed.txt`, and
   `unexpected-name.json`, which correctly need no change. Saying so prevents an implementer from
   "completing" the sweep by editing `unexpected-name.json`, whose whole purpose is to carry a
   mismatched name. Related: `test/unit/npm-pack-report.test.mjs:70` and `:84` embed the expected
   package name inside error-message regexes and do need updating, while `:59`'s `'"ai-peer-review"'`
   is a JSON string literal used to exercise the unsupported-outer-value path and must stay as-is.

## Decision

revisions-requested
