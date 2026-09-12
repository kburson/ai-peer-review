# White Paper Ownership and Cross-Reference Implementation Plan

<!-- cspell:words kpburson oneline -->

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** Establish the `ai-peer-review` white paper as the single public
technical source and make Writing Studio Article 16 cite it as the article's
architectural foundation.

**Architecture:** `ai-peer-review` keeps the normative design under
`docs/design/` and moves the canonical paper under `docs/whitepapers/`.
Its closed extraction verifier explicitly authorizes that prefix plus the two
exact planning-record paths without widening retained-history rules. Writing
Studio keeps only an editorial interpretation and a public GitHub link; there
is no copied or synchronized paper. The two repository changes are committed
independently and integrated in source-before-link order.

**Tech Stack:** Markdown, Git, Prettier, Markdownlint, CSpell, Node.js test and
publication checks

## Global Constraints

- The canonical white-paper source exists only in `ai-peer-review`.
- Preserve the primary `ai-peer-review` clone's current uncommitted research
  revisions byte-for-byte before changing the design's one relative link.
- Do not modify, stash, discard, or commit unrelated dirty files in either
  primary repository.
- Writing Studio links to the public `trunk` document and contains no mirror.
- Add only `docs/whitepapers` as a standalone prefix and the approved design and
  plan as exact standalone paths; do not widen `docs/superpowers` generally.
- Do not change retained-history rules, retained path inventory, extraction
  source identity, contributor evidence, secret-scan evidence, or relicensing
  evidence.
- Do not revise the paper's prose, complete Article 16, add a publishing
  pipeline, or reorganize other documentation.
- Keep the two repository commits independent. Integrate the `ai-peer-review`
  source path before publishing the Writing Studio link.

---

### Task 1: Relocate the Canonical White Paper

**Files:**

- Move:
  `docs/design/2026-09-11-provider-neutral-runtime-orchestration-white-paper.md`
  to
  `docs/whitepapers/2026-09-11-provider-neutral-runtime-orchestration-white-paper.md`
- Modify:
  `docs/design/2026-09-11-provider-neutral-runtime-orchestration-design.md`
- Modify: `provenance/extraction-manifest.json`
- Modify: `scripts/verify-extraction.mjs`
- Modify: `test/unit/verify-extraction.test.mjs`
- Reference:
  `docs/superpowers/specs/2026-09-12-whitepaper-ownership-and-cross-reference-design.md`

**Interfaces:**

- Consumes: the exact working-tree bytes of the two provider-neutral runtime
  documents in `/Users/kpburson/projects/Vibe-Coding/ai-peer-review`.
- Produces: one canonical paper at the new path, one valid relative design link
  to it, and a closed standalone-layout authorization for exactly the new
  documentation paths.

- [ ] **Step 1: Record the primary clone's preservation boundary**

Run:

```bash
git -C /Users/kpburson/projects/Vibe-Coding/ai-peer-review status --short --branch
shasum -a 256 \
  /Users/kpburson/projects/Vibe-Coding/ai-peer-review/docs/design/2026-09-11-provider-neutral-runtime-orchestration-design.md \
  /Users/kpburson/projects/Vibe-Coding/ai-peer-review/docs/design/2026-09-11-provider-neutral-runtime-orchestration-white-paper.md
git -C /Users/kpburson/projects/Vibe-Coding/ai-peer-review diff -- \
  docs/design/2026-09-11-provider-neutral-runtime-orchestration-design.md \
  docs/design/2026-09-11-provider-neutral-runtime-orchestration-white-paper.md
```

Expected: the status names the two modified documents and the untracked
`.worktrees/` directory. Save the two SHA-256 values in the execution notes;
do not alter the primary clone.

- [ ] **Step 2: Reproduce only the approved research revisions in the isolated worktree**

Use `apply_patch` to apply the complete primary-clone diff from Step 1 to the
same two relative paths in the isolated `ai-peer-review` worktree. Do not apply
any other primary-clone change.

Run:

```bash
cmp \
  /Users/kpburson/projects/Vibe-Coding/ai-peer-review/docs/design/2026-09-11-provider-neutral-runtime-orchestration-design.md \
  docs/design/2026-09-11-provider-neutral-runtime-orchestration-design.md
cmp \
  /Users/kpburson/projects/Vibe-Coding/ai-peer-review/docs/design/2026-09-11-provider-neutral-runtime-orchestration-white-paper.md \
  docs/design/2026-09-11-provider-neutral-runtime-orchestration-white-paper.md
```

Expected: both commands exit 0 before the path/link change.

- [ ] **Step 3: Move the paper and update the normative design link**

Run:

```bash
mkdir -p docs/whitepapers
git mv \
  docs/design/2026-09-11-provider-neutral-runtime-orchestration-white-paper.md \
  docs/whitepapers/2026-09-11-provider-neutral-runtime-orchestration-white-paper.md
```

Use `apply_patch` to replace the design's related-evidence link with exactly:

```markdown
[runtime orchestration white paper](../whitepapers/2026-09-11-provider-neutral-runtime-orchestration-white-paper.md),
```

- [ ] **Step 4: Prove the move preserved the paper and resolved the link**

Run:

```bash
test ! -e docs/design/2026-09-11-provider-neutral-runtime-orchestration-white-paper.md
cmp \
  /Users/kpburson/projects/Vibe-Coding/ai-peer-review/docs/design/2026-09-11-provider-neutral-runtime-orchestration-white-paper.md \
  docs/whitepapers/2026-09-11-provider-neutral-runtime-orchestration-white-paper.md
test -f docs/design/../whitepapers/2026-09-11-provider-neutral-runtime-orchestration-white-paper.md
rg -n \
  'provider-neutral-runtime-orchestration-white-paper\.md' \
  docs/design docs/whitepapers
! rg -n \
  '\]\(2026-09-11-provider-neutral-runtime-orchestration-white-paper\.md\)' \
  docs/design
```

Expected: the old path is absent, `cmp` exits 0, the relative-link target
exists, operational documentation links target the new path, and no design
document retains the old same-directory relative link.

- [ ] **Step 5: Add a focused failing standalone-layout test**

In `validManifest()` in `test/unit/verify-extraction.test.mjs`, add
`docs/whitepapers` to `standalone_path_rules.prefixes` and these two entries to
`standalone_path_rules.exact`:

```js
'docs/superpowers/plans/2026-09-12-whitepaper-ownership-and-cross-reference.md',
'docs/superpowers/specs/2026-09-12-whitepaper-ownership-and-cross-reference-design.md',
```

Add this test after `rejects a foreign path in standalone HEAD`:

```js
test('accepts the bounded standalone white-paper documentation paths', async () => {
  await verifyExtraction({
    root: '/repo',
    manifest: validManifest(),
    runGit: fakeGit({
      current: [
        'LICENSE',
        'docs/whitepapers/2026-09-11-provider-neutral-runtime-orchestration-white-paper.md',
        'docs/superpowers/plans/2026-09-12-whitepaper-ownership-and-cross-reference.md',
        'docs/superpowers/specs/2026-09-12-whitepaper-ownership-and-cross-reference-design.md',
      ].join('\n'),
    }),
  });
});
```

Add this case to the manifest-mutation rejection table:

```js
[
  'widened standalone path rules',
  (manifest) => manifest.standalone_path_rules.prefixes.push('private'),
  /standalone path rules/,
],
```

Run:

```bash
node --test \
  --test-name-pattern='bounded standalone white-paper' \
  test/unit/verify-extraction.test.mjs
```

Expected: FAIL because the verifier's frozen expected standalone rules do not
yet authorize the new paths.

- [ ] **Step 6: Implement the minimal closed-layout authorization**

In both `provenance/extraction-manifest.json` and
`EXPECTED_STANDALONE_PATH_RULES` in `scripts/verify-extraction.mjs`:

- add `docs/whitepapers` to `prefixes`; and
- add the two exact planning-record paths from Step 5 to `exact`.

Do not change `retained_path_rules`, `legacy_retained_path_rules`,
`retained_path_inventory`, or any extraction identity/evidence field.

Run:

```bash
node --test \
  --test-name-pattern='bounded standalone white-paper|foreign path in standalone HEAD|widened standalone path rules' \
  test/unit/verify-extraction.test.mjs
node scripts/verify-extraction.mjs
```

Expected: the focused acceptance and rejection tests pass, and the executable
verifier exits 0 against the current worktree.

- [ ] **Step 7: Run the `ai-peer-review` quality gates**

Run:

```bash
npm run format:check
npm run lint
npm test
npm run test:slow
git diff --check
```

Expected: every command exits 0. The test summaries report zero failures.

- [ ] **Step 8: Commit the bounded implementation**

Run:

```bash
git status --short
git add \
  docs/design/2026-09-11-provider-neutral-runtime-orchestration-design.md \
  docs/whitepapers/2026-09-11-provider-neutral-runtime-orchestration-white-paper.md \
  provenance/extraction-manifest.json \
  scripts/verify-extraction.mjs \
  test/unit/verify-extraction.test.mjs
git diff --cached --check
git diff --cached --stat
git commit -m "docs: organize canonical runtime white paper"
```

Expected: the staged patch contains the research revisions, relative-link
update, three synchronized standalone-rule changes, and focused regression
test, with no unrelated paths. A previously committed pure rename may appear in
branch history rather than this staged patch.

### Task 2: Link Writing Studio Article 16 to the Canonical Paper

**Files:**

- Modify:
  `collections/agentic-delivery/articles/16-the-provider-neutral-orchestration-thesis.md`
  in `/Users/kpburson/projects/Vibe-Coding/writing-studio`.

**Interfaces:**

- Consumes: the canonical public paper URL produced by Task 1.
- Produces: one contextual editorial link; no copied technical content.

- [ ] **Step 1: Create a clean Writing Studio worktree without disturbing its primary clone**

Run:

```bash
git -C /Users/kpburson/projects/Vibe-Coding/writing-studio status --short --branch
git -C /Users/kpburson/projects/Vibe-Coding/writing-studio check-ignore -q .worktrees
git -C /Users/kpburson/projects/Vibe-Coding/writing-studio worktree add \
  /Users/kpburson/projects/Vibe-Coding/writing-studio/.worktrees/whitepaper-cross-reference \
  -b codex/whitepaper-cross-reference trunk
npm ci
```

Run `npm ci` from the new worktree. Expected: the primary status retains its
existing Article 15 and `collections/notes/` changes, `.worktrees` is ignored,
and the new worktree starts from local Writing Studio `trunk`.

- [ ] **Step 2: Add the contextual Article 16 reference**

After the first paragraph under `## Why This Article Exists`, use `apply_patch`
to add exactly:

```markdown
The article is the editorial counterpart to `ai-peer-review`'s
[Provider-Neutral Runtime Orchestration for Governed AI Peer Review](https://github.com/kburson/ai-peer-review/blob/trunk/docs/whitepapers/2026-09-11-provider-neutral-runtime-orchestration-white-paper.md).
The white paper owns the technical runtime architecture; this article translates
that architecture into a product and delivery argument.
```

- [ ] **Step 3: Verify the source boundary and Writing Studio quality gates**

Run from the Writing Studio worktree:

```bash
rg -n \
  'github\.com/kburson/ai-peer-review/blob/trunk/docs/whitepapers/2026-09-11-provider-neutral-runtime-orchestration-white-paper\.md' \
  collections/agentic-delivery/articles/16-the-provider-neutral-orchestration-thesis.md
test "$(rg -l 'Provider-Neutral Runtime Orchestration for Governed AI Peer Review' collections | wc -l | tr -d ' ')" -eq 1
npm run format:check
npm run lint
npm test
git diff --check
```

Expected: the URL appears once in Article 16, no mirrored white-paper document
exists under `collections/`, and every quality command exits 0.

- [ ] **Step 4: Commit only the Article 16 reference**

Run:

```bash
git add collections/agentic-delivery/articles/16-the-provider-neutral-orchestration-thesis.md
git diff --cached --check
git diff --cached --stat
git commit -m "docs: cite runtime orchestration white paper"
```

Expected: the staged patch contains only the contextual Article 16 paragraph.

### Task 3: Verify Cross-Repository Delivery Order

**Files:**

- Verify:
  `ai-peer-review/docs/whitepapers/2026-09-11-provider-neutral-runtime-orchestration-white-paper.md`
- Verify:
  `writing-studio/collections/agentic-delivery/articles/16-the-provider-neutral-orchestration-thesis.md`

**Interfaces:**

- Consumes: the independent commits from Tasks 1 and 2.
- Produces: a handoff that makes the source-before-link dependency explicit.

- [ ] **Step 1: Inspect exact repository deltas and primary-clone preservation**

Run:

```bash
git status --short --branch
git log --oneline --decorate trunk..HEAD
git diff --stat trunk...HEAD
git -C /Users/kpburson/projects/Vibe-Coding/writing-studio/.worktrees/whitepaper-cross-reference status --short --branch
git -C /Users/kpburson/projects/Vibe-Coding/writing-studio/.worktrees/whitepaper-cross-reference log --oneline --decorate trunk..HEAD
git -C /Users/kpburson/projects/Vibe-Coding/writing-studio/.worktrees/whitepaper-cross-reference diff --stat trunk...HEAD
git -C /Users/kpburson/projects/Vibe-Coding/ai-peer-review status --short --branch
git -C /Users/kpburson/projects/Vibe-Coding/writing-studio status --short --branch
```

Expected: both implementation worktrees are clean; each branch contains only
its planned commits; both primary clones retain their original unrelated dirty
state.

- [ ] **Step 2: Record the integration dependency**

Handoff the two branches with this exact order:

1. integrate `codex/whitepaper-organization` into `ai-peer-review` `trunk`;
2. confirm the public GitHub paper URL resolves; then
3. integrate `codex/whitepaper-cross-reference` into Writing Studio `trunk`.

Do not claim the remote URL is live from local-file evidence alone. Pushing,
pull-request creation, or branch integration requires the user's explicit
delivery choice after exact ref and diff evidence is shown.
