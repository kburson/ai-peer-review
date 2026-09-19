<!-- ai-peer-review-template version="1" digest="sha256:78e9a634af9d540baaf6790db82952eaf39cf7ab59a6cdc7938319ae07a4cbed" -->

<!-- protected-frontmatter -->

---
schema: "ai-peer-review.response/v1"
review_id: "review-d8ada0e4b98fb3f9fce0cf730294487d"
role: "reviewer"
turn: 2
commit_mode: "normal"
authority_assurance: "unavailable"
artifact_path: "docs/superpowers/plans/2026-09-19-76-change-npm-package-scope.md"
artifact_commit: "c996e2f1b4390e5505d621c06fe6565a1bcf2f4f"
artifact_blob: "7e96f9d52f4eb3a374f1c2c1d7f232f6589cccd5"
artifact_digest: "sha256:b8547152fa599388b236cbb7b99210169bd16ef0d5f631f79025de225e7fa432"
agent:
  host: "claude-code"
  provider: "anthropic"
  model_id: "claude-opus-5"
  model_display: "Claude Opus 5"
  session_fingerprint: "sha256:8bef3e3392cbb1a4b2dabe6ee890822f519a6563c893a3f731947ce2e108eaa8"
  identity_source: "runtime"
started_at: "2026-09-19T06:03:46.500Z"
submitted_at: "2026-09-19T06:16:26.459Z"
finding_ids: []
answered_finding_ids: []
acknowledged_supplement_ids: []
---

Mode: `normal`

## Summary

All four required changes from turn 1 are correctly implemented in the revised plan at artifact
commit `c996e2f1b4390e5505d621c06fe6565a1bcf2f4f`, and all five optional suggestions were adopted.
I verified each disposition against the revised plan text rather than against the author response's
description of it. The author declined nothing, and I found no disposition that overstates what the
revision actually does.

Two of the fixes are better than what I asked for. Task 1 Step 6 adds `test -f "$artifact"` as an
explicit guard on the deterministic-filename assumption, which converts a silent mismatch into a
loud failure — I did not request that and it is the right call. Task 3 Step 2 adds "Once the
peer-review records are committed, require the entire command output to be empty," which closes the
allowance I asked for rather than leaving it permanently open.

One new defect blocks acceptance, and it originates in my own turn-1 wording rather than in the
author's judgment. Required changes 3 and 4 were accepted verbatim and independently, but they
contradict each other: change 3's positive assertion asks for the literal
`kburson-ai-peer-review-` prefix at "all five artifact sites," while change 4's design collapses
those five sites onto a single reused `$artifact` shell variable, leaving the literal prefix at
exactly one line. An implementer resolving that contradiction in the wrong direction would inline
the literal filename five times and undo change 4. This is a single-sentence fix.

### Verification of each disposition

**Required change 1 — accepted, fully implemented.** `test/unit/errors.test.mjs` now appears in
Task 1's `**Files:**` block (plan line 33). Task 1 Step 5 adds the narrow instruction (plan lines
96-102), specifying the exact replacement for `test/unit/errors.test.mjs:12` and explicitly
preserving the version, binary, and `@kburson/ai-task-manager` assertions — matching the
surrounding lines 13, 16-17, 23 and 30 that I flagged as must-not-sweep. Both focused commands now
include the file: Step 4 (plan lines 86-87) and Step 7 (plan lines 131-132). The mis-sequencing I
reported is resolved: the red/green cycle now actually covers the assertion that would otherwise
have first failed at Task 3 Step 3.

**Required change 2 — accepted, fully implemented.** Task 3 Step 2 (plan lines 238-252) replaces
the worktree-only check with both `git status --porcelain -- provenance schemas docs/superpowers/peer-reviews`
and `git diff HEAD -- provenance schemas docs/superpowers/peer-reviews`. The pass rules are stated
explicitly and cover all three states I identified: `git diff HEAD` must be empty (closes the
staged-modification blind spot), `git status --porcelain` must show no modified, deleted, renamed,
copied, or newly added historical path (closes the untracked blind spot, and `A ` entries for
staged additions are covered by "newly added"), and only `??` entries under this review's own
record directory are permitted. The trailing sentence requiring fully empty output once the
peer-review records are committed removes the allowance rather than leaving it as a permanent hole.

**Required change 3 — accepted, implemented but now internally inconsistent.** The boundary-safe
encoding is present verbatim at plan lines 65-72. I verified the regex behaves as intended:

- Against the retired `ai-peer-review-*.tgz`: at offset 0 there is no preceding character, so
  `(?<![\w-])` succeeds, `ai-peer-review-` matches, `[^\s]*` consumes `*`, and `\.tgz` matches.
  `doesNotMatch` correctly fails. ✅
- Against the mandated `kburson-ai-peer-review-0.2.2.tgz`: the only occurrence of
  `ai-peer-review-` is preceded by the `-` of `kburson-`, which is inside the `[\w-]` class, so the
  lookbehind fails and no other start position exists. `doesNotMatch` correctly passes. ✅
- `assert.match(release, /@kburson\/ai-peer-review@/)` is satisfied by the Step 6 publish query at
  plan line 120. ✅

The encoding also composes correctly with the existing test structure: `test/packaging/package.test.mjs:226`
already binds `release` by reading `.github/workflows/release.yml`, so the new assertions drop in
without new scaffolding.

The residual problem is plan lines 74-75, addressed as Finding 1 below.

**Required change 4 — accepted, fully implemented, and improved.** Task 1 Step 6 (plan lines
104-124) mandates the deterministic branch, removes the "from npm output" alternative, and adds the
explicit prohibition "Do not parse raw `npm pack` console output in the shell workflow." The
derivation is correct: `npm pack` with no `--pack-destination` writes to the working directory, so
`test -f "$artifact"` is a valid guard, and `shasum -a 256 "$artifact" > SHA256SUMS` yields a
checksum line whose embedded filename is stable — which keeps the existing
`cmp SHA256SUMS observed-release/SHA256SUMS` verification branch (`.github/workflows/release.yml:68`)
meaningful. The reuse rule names all four downstream consumers (`npm publish`,
`gh release download --pattern`, `cmp`, `gh release create`) and line 124 adds "No package tarball
glob may remain in the release workflow," which is the stronger form of the constraint. ✅

**Optional 1 — accepted, precisely.** Task 2 Step 4 (plan lines 183-190) now distinguishes the two
goldens exactly as the mechanism requires: regenerate `test/golden/templates/author-startup.md`
from source "so its embedded template digest and rendered command update together," versus update
only the hydrated zero-install line in `test/golden/templates/reviewer-invitation.md` because its
source template carries no literal package spec. It also names both change sites in
`test/golden/templates.test.mjs` (input value and assertion regex), matching lines 22 and 80 of
that file. This removes the hand-edit trap against the stale digest at
`test/golden/templates/author-startup.md:1`. ✅

**Optional 2 — accepted.** `test/golden/help/submit.sha256.txt` is now an unconditional `Modify`
entry (plan line 151), and Step 4 states the reason — the shared help topic renderer changes both
digests. This matches `src/cli/help-data.mjs:922` living inside `topic(command)` and
`test/golden/help.test.mjs:133-137` digesting the `submit` JSON. ✅

**Optional 3 — accepted.** Task 3 Step 1 carries the keep-list (plan lines 223-236) and Task 3's
`**Files:**` block adds `Verify unchanged: scripts/verify-release.mjs` and
`Verify unchanged: test/unit/verify-release.test.mjs` (plan lines 207-208). Every item I reported
is present and correctly classified. One omission is noted as optional suggestion 1 below.

**Optional 4 — accepted.** Global Constraint (plan line 22) records the version-bump consequence,
cross-references the package-derived specifier follow-up in
`docs/superpowers/plans/2026-09-17-57-61-peer-review-recovery-architecture.md`, and closes with "do
not publish from this story." I could not independently confirm the existence of the `v0.2.2` tag,
because verifying it requires a Git command and the Reviewer Git boundary forbids one. The
constraint is safe regardless of how that resolves: it only forbids publishing from this story and
mandates a bump before any scoped release, which is correct whether or not the tag already exists.
The npm-side premise is independently evidenced —
`docs/superpowers/specs/2026-09-14-project-local-spr-xpr-broker-design.md:348` reasons about the
contents of the public `ai-peer-review@0.2.2` tarball. ✅

**Optional 5 — accepted.** Task 3 Step 1 (plan lines 233-236) names `empty.json`, `malformed.txt`,
and `unexpected-name.json` as unchanged, directs updating the expected-name error regexes in
`test/unit/npm-pack-report.test.mjs` (covering lines 70 and 84 of that file), and justifies
retaining the literal JSON string `"ai-peer-review"` in the unsupported-outer-value test at line 59
as "payload shape, not package identity" — which is the correct reason, since that path throws
before `expectedPackageName` is ever compared. ✅

### Verification basis

Read at revised artifact commit `c996e2f1b4390e5505d621c06fe6565a1bcf2f4f`: the full revised plan
and `review-d8ada0e4b98fb3f9fce0cf730294487d-author-response-1.md`. Re-checked the revised plan's
claims against `test/unit/errors.test.mjs`, `test/unit/npm-pack-report.test.mjs`,
`test/packaging/package.test.mjs`, `test/smoke/cli.test.mjs`, `test/golden/help.test.mjs`,
`test/golden/templates.test.mjs`, `test/golden/templates/author-startup.md`,
`src/cli/help-data.mjs`, `src/templates/index.mjs`, `scripts/verify-extraction.mjs`,
`scripts/verify-release.mjs`, and `.github/workflows/release.yml`, all carried forward from turn 1
at the same content.

I did not execute any command, did not modify the artifact, and used no Git operation.

## Findings

1. **Task 1 Step 2's positive assertion and Task 1 Step 6's single-variable design contradict each
   other; satisfying Step 2 as written would undo Step 6.**

   Plan lines 74-75 state:

   > Add positive assertions covering all five artifact sites in the workflow and requiring the exact
   > `kburson-ai-peer-review-` prefix, rather than relying only on absence checks.

   Plan lines 106-124 (Step 6) mandate the opposite shape: one `artifact` variable defined once, then
   reused. After Step 6, the five artifact operations in `.github/workflows/release.yml` read
   approximately:

   ```bash
   shasum -a 256 "$artifact" > SHA256SUMS
   npm publish "$artifact" --access public --provenance
   gh release download "$RELEASE_TAG" --dir observed-release --pattern "$artifact" --pattern SHA256SUMS
   cmp "$artifact" observed-release/"$artifact"
   gh release create "$RELEASE_TAG" "$artifact" SHA256SUMS --verify-tag --generate-notes
   ```

   None of those five lines contains the literal string `kburson-ai-peer-review-`. It appears exactly
   once, at the `artifact="kburson-ai-peer-review-${version}.tgz"` definition (plan line 111). A test
   asserting the literal prefix at five sites therefore cannot pass against a correct Step 6
   implementation.

   The failure mode is concrete and it is the one Step 6 exists to prevent. Task 1 is test-first:
   Step 2 writes the assertions, Step 6 writes the workflow. An implementer who writes Step 2
   literally, then reaches Step 6 and finds the test red, has two exits — weaken the test, or inline
   `kburson-ai-peer-review-0.2.2.tgz` at all five sites to make it pass. The second exit reintroduces
   exactly the five-site duplication that required change 4 removed, and reintroduces it in the one
   workflow that cannot be rehearsed locally.

   This is my error, not a misreading by the author. My turn-1 required change 3 said "add an
   accompanying positive assertion that every artifact site uses the exact `kburson-ai-peer-review-`
   prefix," and I wrote that before required change 4 collapsed those sites onto one variable. The
   author accepted both faithfully and verbatim; the contradiction is in what I asked for.

   The correct assertion pair expresses the same guarantee under the Step 6 design: the prefix is
   defined once with the exact expected value, and every artifact operation consumes that definition
   rather than a literal or a glob.

## Required changes

1. **Reconcile plan lines 74-75 with Step 6's single-variable design.** Replace those two lines with
   an instruction that asserts the definition once and the reuse everywhere. For example:

   > Add positive assertions that the workflow defines the artifact exactly once as
   > `artifact="kburson-ai-peer-review-${version}.tgz"`, and that each of the five artifact
   > operations — `shasum`, `npm publish`, `gh release download --pattern`, `cmp`, and
   > `gh release create` — references `"$artifact"` rather than a literal filename or a glob.

   A concrete encoding, consistent with the `release` binding already present at
   `test/packaging/package.test.mjs:226`:

   ```js
   assert.match(release, /artifact="kburson-ai-peer-review-\$\{version\}\.tgz"/);
   for (const site of [
     /shasum -a 256 "\$artifact" > SHA256SUMS/,
     /npm publish "\$artifact"/,
     /gh release download[^\n]*--pattern "\$artifact"/,
     /cmp "\$artifact" observed-release\/"\$artifact"/,
     /gh release create[^\n]*"\$artifact"/,
   ])
     assert.match(release, site);
   ```

   Keep the three boundary-safe negative/positive assertions at plan lines 68-72 unchanged; they are
   correct and independently verified above. Only the prose at lines 74-75 needs to change.

## Optional suggestions

1. **Add `scripts/verify-extraction.mjs` to Task 3's `Verify unchanged` list.** Task 3 now correctly
   protects `scripts/verify-release.mjs`, but its sibling is equally exposed and carries a higher
   blast radius. `scripts/verify-extraction.mjs` contains six `ai-peer-review` occurrences that a
   rename sweep could reach — schema identifiers at lines 213 and 354, the config filename
   `.ai-peer-review.json` at line 53, a spec path at line 120, the identifier
   `ai-peer-review-relicensing` at line 237, and, most importantly, the verbatim signed relicensing
   declaration text at line 124. That line 124 string is signature-verified; altering a single byte
   breaks verification. The file also runs on every release
   (`.github/workflows/release.yml:33`, `node scripts/verify-extraction.mjs --require-legacy-removed`)
   and on every CI job, so a stray edit blocks the release gate rather than failing quietly. Adding
   one `Verify unchanged: scripts/verify-extraction.mjs` line makes the protection explicit.

2. **Signal that the Task 3 Step 1 keep-list is representative rather than exhaustive.** The list is
   introduced as "The expected non-registry keep-list is:", which reads as complete. At least one
   active occurrence is outside it: `test/unit/execution-contract.test.mjs:42` builds a synthetic
   install path `path.join(root, 'opt', 'ai-peer-review', 'bin', 'peer-review.mjs')`. It falls
   cleanly under the step's own "config/runtime path" classification, so the taxonomy handles it —
   but an implementer treating the list as exhaustive may pause on it or, worse, "fix" it. Either
   add the file or change the lead-in to "includes at least:". I did not enumerate this occurrence in
   turn 1 either, so the omission carried forward from my report.

3. **Retire the now-resolved conditional in Task 2's `**Files:**` block.** Plan line 144 still reads
   "Modify: `templates/reviewer-invitation.md` only if its active source text requires a literal
   package-name change," while Step 4 (plan lines 186-187) now states definitively that the file
   "contains no literal package spec and remains unchanged." The conditional evaluates to false, so
   nothing breaks, but the two statements answer the same question at different confidence levels.
   Changing line 144 to `Verify unchanged: templates/reviewer-invitation.md` would make the file list
   agree with the step that resolved it.

## Decision

revisions-requested
