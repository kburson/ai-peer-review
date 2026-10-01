# Issue 132 primary-authority implementation report

## Outcome

Task 1 of issue 102 now has physical Git authority discovery, a strict read-only
primary activation resolver, closed primary/user partial stores, field ownership,
and validated v2 assembly. The loader retains its synchronous public API and the
planned async resolver is exported. Registered linked callers share activated
primary policy; active review worktree state stays separate.

## Decisions and review

- Preserve sealed transaction Git behavior. The separate discovery runner strips
  caller Git environment overrides and checks ordinary on-disk markers, linked
  administrative backlinks and common-directory identity.
- Require activated config/skill HEAD blobs, complete stage-zero index entries,
  working bytes and ordinary non-symlink paths. Unknown receipts, moved/foreign
  primary registrations and missing initialized files refuse. New committed
  policy reports old/new blobs and an activation dry-run command without writes.
- Ignore an unrelated missing/prunable worktree entry. Require the caller and
  primary to exist and validate; do not prune someone else's recovery state.
- Resolve every host field by ownership. Primary owns guard/protocol policy;
  user owns executable/timing bindings and identity hints. Explicit selections
  win over hints. Validate partial stores before the complete automatic object.
- Declare assembled config v2, including portable setup format 3, without an
  exact package-version field. User setup never replaces primary setup.
- Consume the validated config snapshot instead of a second unchecked project
  read. Preference values are cloned so subsequent edits do not rewrite it.
- Windows account/DACL reads use the existing native security handle contract;
  absent native capability refuses. Windows execution is not claimed on this
  macOS host and remains part of the final installed matrix.
- Keep legacy unregistered setup loading only for the staged migration boundary.
  The strict primary resolver never falls back. Setup migration and universal
  mutation/after-wait fences must land before the epic is release-ready.

The source review checked fixed owned paths, foreign boundaries, index stages,
canonical main membership, schema closure and user-policy rejection. No review
worker or additional chat was created. All later plan slices remain outstanding.

## Verification

Behavioral RED evidence preceded implementation: primary partial automatic
policy rejection and real linked/subdirectory loading returned no primary
max-turns value. Additional RED/GREEN regressions covered lost registration,
moved primary, declared assembled schema and unrelated prunable worktrees.

The complete verification run passed:

| Lane        | Passed | Skipped | Failed |
| ----------- | -----: | ------: | -----: |
| Unit        |    545 |       2 |      0 |
| Golden      |     22 |       0 |      0 |
| Integration |    389 |       2 |      0 |
| MCP         |     39 |       0 |      0 |
| Smoke       |      3 |       0 |      0 |

`npm test`, `npm run test:slow`, `npm run lint`, `npm run format:check`, changed-file
Prettier API checks, and `git diff --check` passed. Process-inspection checks
required execution outside the filesystem sandbox. The installed release
scenario passed with synthetic provider fixtures; this is not a live provider
handoff claim. The four skips retain their existing explicit conditions.

Early runs failed OS process probes under sandbox restrictions. Later failures
identified a recovered root backup, stale unrelated worktree metadata, and five
tests depending on this checkout's package 0.4.1 setup while source is 0.4.0.
Preserved the backup byte-for-byte by rename into the recovery evidence folder.
Broker/doctor tests now use disposable real repositories and preserve exact
routing assertions, including a new foreign-clone rejection. No mismatch gate or
baseline assertion was removed.

## Workspace recovery changes

The user explicitly requested disabling blocking hooks. A separate recovery
commit preserves removal of AITM hook commands in this branch while retaining
the AIPR integrity hook. Original bytes remain in ignored hook-recovery backups.
The recovered legacy setup JSON was formatted with identical parsed values;
its old package/skill metadata was not silently relabeled as current.

Registration/activation writes and safe active-review inventory belong to Task 3;
selected-global runtime checks belong to Task 2. This child does not claim those
interfaces or epic completion. Exact-SHA governed Test evidence is the next
lifecycle boundary after committing the verified source.

## Governed Test correction

The first committed-SHA isolated Test run failed the extraction verifier because
`docs/primary-authority-api.md` falls outside the frozen standalone path inventory.
The earlier complete suite preceded that document's commit, so it did not prove
the final HEAD inventory. Reproduced the executable verifier failure. A precise
allowlist extension also required changing the frozen extraction manifest; that
experimental edit was discarded. Moved the API documentation into the existing
`docs/superpowers/reviews/` boundary instead. Extraction rules, manifest and tests
remain unchanged. Exact-SHA Test must rerun after this correction.
