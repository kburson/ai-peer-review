# Issue 15 Codex Checkpoint Ref Boundary Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow Codex checkpoint refs to advance during a review without
weakening any artifact, checkout, index, worktree, or retained-ref guard.

**Architecture:** Canonicalize the ref inventory inside the read-only repository
adapter using one frozen exact-prefix exclusion. Keep the existing closed
reviewer-boundary schema and all-or-nothing submit comparison, and provide
fail-closed legacy guidance because old aggregate digests cannot be migrated
safely.

**Tech Stack:** Node.js 22 ESM, built-in `node:test`, literal-argument Git CLI,
Markdown package documentation, GitHub Actions, npm trusted publishing.

## Global Constraints

- Exclude only `refs/codex/turn-diffs/checkpoints/**`.
- The exclusion must not be configurable or attacker-controlled.
- Preserve reviewer read-only enforcement and every non-ref boundary check.
- Preserve all non-excluded refs in `refs_digest`.
- Existing 0.2.1 reviews fail closed and restart with their old evidence intact.
- The old unsubmitted response never becomes accepted evidence automatically.
- Release as patch version 0.2.2 only after merge and hosted CI.
- Remove transient `docs/superpowers/` delivery collateral from publishable
  `HEAD` before extraction verification and release.

---

### Task 1: Canonical stable-ref inventory

**Files:**

- Modify: `test/unit/repository.test.mjs`
- Modify: `src/git/repository.mjs`

**Interfaces:**

- Consumes: `createGitRepository().reviewerBoundary(cwd, allowedResponse)`.
- Produces: the unchanged boundary object shape whose `refs_digest` excludes
  only exact Codex checkpoint refs.

- [ ] **Step 1: Write failing repository tests**

Add tests that create `refs/codex/turn-diffs/checkpoints/<session>/<turn>` with
`git update-ref`, assert the complete boundary stays equal, advance the same ref
and assert equality again, then create each lookalike and retained control ref
and assert `refs_digest` changes.

```js
const before = repository.reviewerBoundary(fixture.root, 'reviews/response.md');
git(fixture.root, ['update-ref', 'refs/codex/turn-diffs/checkpoints/session/turn-1', fixture.head]);
assert.deepEqual(repository.reviewerBoundary(fixture.root, 'reviews/response.md'), before);
```

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```bash
node --test test/unit/repository.test.mjs
```

Expected: the boundary equality assertion fails because `refs_digest` changes.

- [ ] **Step 3: Implement the exact frozen policy**

In `src/git/repository.mjs`, add a module-private frozen prefix list containing
only `refs/codex/turn-diffs/checkpoints/`. Request explicit ref-name ordering,
parse complete `refname\0objectname\0\n` records, reject malformed output, remove
only exact prefix matches, and hash a canonical NUL-delimited retained inventory.
Do not accept configuration or export a mutation seam.

- [ ] **Step 4: Run the focused test and verify GREEN**

Run:

```bash
node --test test/unit/repository.test.mjs
```

Expected: all repository tests pass.

- [ ] **Step 5: Commit the boundary unit**

```bash
git add src/git/repository.mjs test/unit/repository.test.mjs
git commit -m "fix: ignore Codex checkpoint refs in reviewer boundary [#15]"
```

### Task 2: Submission reproduction and fail-closed legacy recovery

**Files:**

- Modify: `test/integration/reviewer-boundary.test.mjs`
- Modify: `src/cli/run.mjs`
- Modify: `src/cli/help-data.mjs`
- Modify: `test/unit/errors.test.mjs`

**Interfaces:**

- Consumes: `submitReviewTurn()` and the repository boundary from Task 1.
- Produces: successful submission across an excluded checkpoint update and
  explicit restart guidance for ambiguous retained/legacy ref-only mismatches.

- [ ] **Step 1: Write failing integration and error-contract tests**

Add one integration test that joins a reviewer, creates and advances a Codex
checkpoint ref, submits the unchanged accepted response, and asserts
`acceptance-pending`. Add a retained-ref control that updates
`refs/heads/reviewer-boundary-control`, expects
`APR_REVIEWER_GIT_VIOLATION`, and proves the response and event bytes did not
change. Add a ref-only mismatch assertion requiring recovery text to preserve
the workspace and restart under the fixed policy.

- [ ] **Step 2: Run focused tests and verify RED**

Run:

```bash
node --test test/integration/reviewer-boundary.test.mjs test/unit/errors.test.mjs
```

Expected: checkpoint submission fails and legacy recovery text is absent.

- [ ] **Step 3: Implement precise mismatch diagnostics**

In `assertReviewerRepository()`, compare named boundary fields so that the
existing violation remains fail closed. When all non-ref values and artifact
authority match but `refs_digest` differs, return recovery guidance explaining
that a retained ref changed or the review uses the legacy all-ref policy, and
that the operator must preserve the old workspace and restart. Keep the same
stable error code and do not mutate event authority.

- [ ] **Step 4: Run focused tests and verify GREEN**

Run:

```bash
node --test test/integration/reviewer-boundary.test.mjs test/unit/errors.test.mjs
```

Expected: every focused test passes.

- [ ] **Step 5: Commit submission behavior**

```bash
git add src/cli/run.mjs src/cli/help-data.mjs \
  test/integration/reviewer-boundary.test.mjs test/unit/errors.test.mjs
git commit -m "fix: explain legacy reviewer-boundary restart [#15]"
```

### Task 3: Operator documentation and package contract

**Files:**

- Modify: `README.md`
- Modify: `skills/peer-review/SKILL.md`
- Modify: `test/golden/skill.test.mjs`

**Interfaces:**

- Consumes: exact policy and recovery semantics from Tasks 1 and 2.
- Produces: package-visible reviewer rules and tested skill guidance.

- [ ] **Step 1: Write the failing packaged-skill test**

Require the skill to mention the exact excluded namespace, all-other-refs
retention, and evidence-preserving 0.2.1 restart.

- [ ] **Step 2: Run the skill test and verify RED**

Run:

```bash
node --test test/golden/skill.test.mjs
```

Expected: required policy and recovery phrases are absent.

- [ ] **Step 3: Document the policy and recovery**

Add concise README and skill sections that define the exact exclusion, retained
surfaces, non-configurability, and legacy restart sequence. State that old
responses remain unsubmitted draft evidence.

- [ ] **Step 4: Run the skill and documentation checks**

Run:

```bash
node --test test/golden/skill.test.mjs
npm run format:check
npm run lint
```

Expected: all commands pass without errors.

- [ ] **Step 5: Commit documentation**

```bash
git add README.md skills/peer-review/SKILL.md test/golden/skill.test.mjs
git commit -m "docs: define reviewer stable-ref policy [#15]"
```

### Task 4: Verify, review, and prepare patch release

**Files:**

- Modify: `package.json`
- Modify: `package-lock.json`
- Delete before release: `docs/superpowers/specs/2026-09-12-15-codex-checkpoint-ref-boundary-design.md`
- Delete before release: `docs/superpowers/plans/2026-09-12-15-codex-checkpoint-ref-boundary.md`

**Interfaces:**

- Consumes: Tasks 1-3 and the repository CI/release contracts.
- Produces: a publishable 0.2.2 commit with no transient collateral.

- [ ] **Step 1: Run the complete local gate**

Run:

```bash
npm run format:check
npm run lint
npm test
npm run test:integration
npm run test:mcp
npm run test:packaging
npm run test:smoke
node scripts/verify-extraction.mjs --require-legacy-removed
npm pack --dry-run
git diff --check
```

Expected: every command exits zero.

- [ ] **Step 2: Review the exact branch delta**

Compare `origin/trunk...HEAD`, verify each issue acceptance criterion against
code/tests/docs, and resolve every critical or important finding. Multi-agent
review is used only when allowed by the active platform instructions; otherwise
perform a clean-context self-review and rely on hosted CI as an additional gate.

- [ ] **Step 3: Remove transient planning collateral**

Delete both `docs/superpowers/` files, remove empty directories, and rerun the
extraction verifier to prove the publishable layout is closed.

- [ ] **Step 4: Bump the patch version without tagging**

Run:

```bash
npm version 0.2.2 --no-git-tag-version
```

Verify only `package.json` and `package-lock.json` received the version change.

- [ ] **Step 5: Re-run the complete local gate and commit**

Run the Step 1 gate again, then commit the package version and transient-file
removals:

```bash
git add -A
git commit -m "chore: prepare ai-peer-review 0.2.2 [#15]"
```

### Task 5: Merge, publish, and verify public delivery

**Files:** None beyond Git/GitHub/npm release state.

**Interfaces:**

- Consumes: the verified issue branch and tag-driven release workflow.
- Produces: merged issue #15, signed `v0.2.2`, GitHub release, and public
  `ai-peer-review@0.2.2`.

- [ ] **Step 1: Push and open the issue PR**

Push the named branch, create a PR that links `Fixes #15`, and record the exact
head SHA.

- [ ] **Step 2: Verify hosted CI for that exact SHA**

Wait for every required PR check and inspect failures rather than retrying
blindly.

- [ ] **Step 3: Merge and verify trunk**

Merge through GitHub, fetch `origin/trunk`, and verify the PR merge commit is the
remote trunk head and all post-merge CI checks pass for that exact SHA.

- [ ] **Step 4: Create and push the signed release tag**

Create annotated signed tag `v0.2.2` at the verified remote trunk head, verify
it locally against `provenance/allowed-signers`, then push only that exact tag.

- [ ] **Step 5: Verify the tag-triggered release**

Wait for the release workflow to pass. Verify the GitHub release tag and assets,
the public npm version/dist-tag/tarball/integrity/provenance metadata, tarball
checksum equivalence, and a fresh zero-install CLI smoke command.

- [ ] **Step 6: Verify issue closure**

Confirm issue #15 is closed, its project item reflects completion if automation
updates it, and the public package is usable for the downstream AITM upgrade.
