# Scoped npm Package Identity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publish and consume the package as `@kburson/ai-peer-review` while preserving its repository, executable, protocol, configuration, and historical-provenance identities.

**Architecture:** Treat the npm registry identity as a narrow package-resolution concern. One scoped package constant is reflected through the manifest/lockfile, active generated commands, consumer documentation, and release workflow; npm's scope-stripped tarball filename is asserted separately. Historical release evidence and runtime/protocol identifiers remain unchanged and are protected by regression tests.

**Tech Stack:** Node.js 24+, npm 11/12 pack reports, GitHub Actions YAML, Node's built-in test runner, existing golden and packaging fixtures.

**Spec:** GitHub issue [#76](https://github.com/kburson/ai-peer-review/issues/76) and its mirrored Deep-Dive Analysis.

## Global Constraints

- Registry identity: `@kburson/ai-peer-review`.
- Packed filename at version `0.2.2`: `kburson-ai-peer-review-0.2.2.tgz`.
- Preserve `publishConfig.access: public`.
- Preserve executable names `ai-peer-review`, `peer-review`, and `peer-review-mcp`.
- Preserve repository identity `kburson/ai-peer-review`, protocol/schema strings, `APR_*` errors, `.ai-peer-review.json`, `.scratch/peer-review`, Git transaction paths, and template markers.
- Preserve immutable historical evidence under `provenance/` and existing records under `docs/superpowers/peer-reviews/` byte-for-byte.
- Do not publish, unpublish, deprecate, or rename any external resource.
- Keep version `0.2.2` for this implementation-only story. The existing `v0.2.2` tag cannot be retargeted to the rename commit, so an actual scoped release requires a later version bump and a coordinated refresh of every version-pinned generated command. Track that follow-up with the package-derived specifier work described in `docs/superpowers/plans/2026-09-17-57-61-peer-review-recovery-architecture.md`; do not publish from this story.

---

### Task 1: Implement the scoped packaging and release contract test-first

**Files:**

- Modify: `test/packaging/package.test.mjs`
- Modify: `test/smoke/cli.test.mjs`
- Modify: `test/unit/npm-pack-report.test.mjs`
- Modify: `test/unit/errors.test.mjs`
- Modify: `test/fixtures/npm-pack-report/npm-11-single.json`
- Modify: `test/fixtures/npm-pack-report/npm-12-single.json`
- Modify: `test/fixtures/npm-pack-report/missing-filename.json`
- Modify: `test/fixtures/npm-pack-report/missing-files.json`
- Modify: `test/fixtures/npm-pack-report/multiple.json`
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `.github/workflows/release.yml`

**Interfaces:**

- Consumes: `parseNpmPackOutput(output, { expectedPackageName, requireFilename })` from `test/helpers/npm-command.mjs`.
- Produces: scoped root package metadata plus regression expectations for pack name, `kburson-ai-peer-review-<version>.tgz`, clean consumer import, unchanged executable names, and scoped release workflow tokens.

- [ ] **Step 1: Update pack-report fixtures and parser callers to the scoped identity**

Use `@kburson/ai-peer-review` for report `name` and object keys while retaining filename fixtures such as `kburson-ai-peer-review-0.2.2.tgz`.

- [ ] **Step 2: Add packaging assertions for manifest and artifact identity**

Assert:

```js
assert.equal(packageJson.name, '@kburson/ai-peer-review');
assert.equal(packageJson.publishConfig.access, 'public');
assert.equal(result.name, '@kburson/ai-peer-review');
assert.equal(result.filename, `kburson-ai-peer-review-${packageJson.version}.tgz`);
```

Also assert the release workflow contains `@kburson/ai-peer-review@`, uses the scope-stripped tarball filename for every artifact operation, and contains no active `package="ai-peer-review@` or `ai-peer-review-*.tgz` target.

Encode the negative tarball assertion with a boundary so the correct
`kburson-ai-peer-review-<version>.tgz` value does not match the retired prefix:

```js
assert.doesNotMatch(release, /(?<![\w-])ai-peer-review-[^\s]*\.tgz/);
assert.doesNotMatch(release, /package="ai-peer-review@/);
assert.match(release, /@kburson\/ai-peer-review@/);
```

Add positive assertions covering all five artifact sites in the workflow and requiring the exact
`kburson-ai-peer-review-` prefix, rather than relying only on absence checks.

- [ ] **Step 3: Extend the clean-consumer packaging test**

Install the produced tarball into the existing disposable consumer, dynamically import `@kburson/ai-peer-review`, and execute all three retained binary names from `node_modules/.bin`.

- [ ] **Step 4: Run focused tests and confirm the old implementation fails**

Run:

```bash
node --test test/unit/npm-pack-report.test.mjs test/unit/errors.test.mjs \
  test/packaging/package.test.mjs test/smoke/cli.test.mjs
```

Expected: failures identify the unscoped manifest/pack report, stale release workflow, or unresolvable scoped import.

- [ ] **Step 5: Change only the root package identities**

Set both root `name` fields to `@kburson/ai-peer-review`; do not alter dependency package names, version, binaries, repository URLs, or protocol-facing strings.

Update only the package-name assertion at `test/unit/errors.test.mjs:12` to:

```js
assert.equal(packageJson.name, '@kburson/ai-peer-review');
```

Leave its version, binary, and `@kburson/ai-task-manager` dependency assertions unchanged.

- [ ] **Step 6: Normalize release variables**

In the pack step, derive one deterministic scope-stripped artifact name from `package.json` and use
that exact variable for every artifact operation:

```bash
version="$(node -p "require('./package.json').version")"
artifact="kburson-ai-peer-review-${version}.tgz"
npm pack
test -f "$artifact"
shasum -a 256 "$artifact" > SHA256SUMS
```

Do not parse raw `npm pack` console output in the shell workflow. In the publish step, query:

```bash
package="@kburson/ai-peer-review@$(node -p "require('./package.json').version")"
```

Reuse the same `$artifact` value for `npm publish`, `gh release download --pattern`, `cmp`, and
`gh release create`. No package tarball glob may remain in the release workflow.

- [ ] **Step 7: Run focused packaging tests**

Run:

```bash
node --test test/unit/npm-pack-report.test.mjs test/unit/errors.test.mjs \
  test/packaging/package.test.mjs test/smoke/cli.test.mjs
```

Expected: scoped package and release assertions pass.

### Task 2: Migrate active consumer and generated guidance

**Files:**

- Modify: `README.md`
- Modify: `skills/peer-review/SKILL.md`
- Modify: `templates/author-startup.md`
- Modify: `templates/reviewer-invitation.md` only if its active source text requires a literal package-name change
- Modify: `src/cli/help-data.mjs`
- Modify: `src/cli/run.mjs`
- Modify: `test/golden/templates.test.mjs`
- Modify: `test/golden/templates/author-startup.md`
- Modify: `test/golden/templates/reviewer-invitation.md`
- Modify: `test/golden/help/all.sha256.txt`
- Modify: `test/golden/help/submit.sha256.txt`

**Interfaces:**

- Consumes: scoped registry identity and current package version `0.2.2`.
- Produces: active install/import/npx/setup/help text that resolves `@kburson/ai-peer-review`, while local execution continues to use `peer-review`.

- [ ] **Step 1: Write failing golden assertions**

Require generated commands to match the scoped version-pinned form:

```js
/npx --yes @kburson\/ai-peer-review@0\.2\.2/;
```

Assert active guidance does not contain the unscoped registry form.

- [ ] **Step 2: Update runtime renderers and templates**

Replace registry-resolution operands in `help-data.mjs`, `run.mjs`, and active templates with `@kburson/ai-peer-review@0.2.2`. Do not change the displayed local executable `peer-review`.

- [ ] **Step 3: Update README and skill guidance**

Use:

```bash
npm install --save-dev @kburson/ai-peer-review
npx --yes @kburson/ai-peer-review@0.2.2 --help
```

Use `from '@kburson/ai-peer-review'` for JavaScript imports. Add a concise migration note telling existing consumers to uninstall `ai-peer-review`, install `@kburson/ai-peer-review`, and retain the same binary/config/runtime paths.

- [ ] **Step 4: Refresh deterministic active fixtures**

Regenerate `test/golden/templates/author-startup.md` from its changed source so its embedded template
digest and rendered command update together. `templates/reviewer-invitation.md` itself contains no
literal package spec and remains unchanged; update only the hydrated zero-install line in its golden.
Update both the input value and assertion regex in `test/golden/templates.test.mjs`. Regenerate both
`test/golden/help/all.sha256.txt` and `test/golden/help/submit.sha256.txt`, because the shared help
topic renderer changes both digests. Do not edit historical review records.

- [ ] **Step 5: Run golden and focused package tests**

Run:

```bash
node --test test/golden/help.test.mjs test/golden/templates.test.mjs test/packaging/package.test.mjs
```

Expected: generated active guidance is scoped and deterministic.

### Task 3: Prove compatibility boundaries and finish governed verification

**Files:**

- Verify unchanged: `provenance/release-manifest.json`
- Verify unchanged: `scripts/verify-release.mjs`
- Verify unchanged: `test/unit/verify-release.test.mjs`
- Verify unchanged: `schemas/**`
- Verify unchanged: existing `docs/superpowers/peer-reviews/**`
- Modify only if a missing active assertion is found: tests listed in Tasks 1–3

**Interfaces:**

- Consumes: all implementation outputs from Tasks 1–2.
- Produces: exact evidence for issue #76's five acceptance criteria and functional Definition of Done.

- [ ] **Step 1: Audit active stale package-resolution references**

Search active source, templates, tests, README, workflow, and skill files for unscoped `npm install`,
`npx --yes`, import, registry query, publish, and tarball glob forms. Classify every remaining
`ai-peer-review` occurrence as executable, repository/product name, config/runtime path,
protocol/schema ID, or historical evidence. The expected non-registry keep-list is:

- MCP server/product identity in `src/mcp/server.mjs`.
- Config ownership and paths in `src/config/load.mjs` and `src/config/setup.mjs`.
- Immutable v0.2.0 release verification in `scripts/verify-release.mjs` and
  `test/unit/verify-release.test.mjs`.
- The retained `ai-peer-review` binary invocation in `test/smoke/cli.test.mjs`; only that file's
  expected package name changes.
- Protocol/schema identifiers under `schemas/**` and `test/golden/manifests/**`.

In `test/fixtures/npm-pack-report/`, leave `empty.json`, `malformed.txt`, and
`unexpected-name.json` unchanged. In `test/unit/npm-pack-report.test.mjs`, update the expected-name
error regexes but retain the literal JSON string `"ai-peer-review"` in the unsupported-outer-value
test because it is payload shape, not package identity.

- [ ] **Step 2: Verify historical/protocol exclusions**

Run:

```bash
git status --porcelain -- provenance schemas docs/superpowers/peer-reviews
git diff HEAD -- provenance schemas docs/superpowers/peer-reviews
```

Require `git diff HEAD` to be empty. Require `git status --porcelain` to contain no modified,
deleted, renamed, copied, or newly added historical/protocol path. The only permitted `??` entries
are this review's own records under
`docs/superpowers/peer-reviews/plan/2026-09-19-2026-09-19-76-change-npm-package-scope-review-d8ada0e4b98fb3f9fce0cf730294487d/`;
any other entry fails the step. Once the peer-review records are committed, require the entire
command output to be empty.

- [ ] **Step 3: Run the issue verification commands**

Run in this order:

```bash
npm run format:check
npm run lint
npm test
npm run test:slow
npm run test:packaging
git log --oneline -1
```

- [ ] **Step 4: Commit with issue attribution**

Stage only the plan, package metadata, release workflow, active guidance/renderers, and corresponding tests/goldens. Commit with an issue-attributed subject such as:

```bash
git commit -m "[#76] Scope the npm package under @kburson"
```

- [ ] **Step 5: Record governed evidence**

Create the commit trace, stamp each acceptance criterion and functional DoD item through `npx aitm`, and enter Test only after the tree is clean and exact-SHA verification is green.
