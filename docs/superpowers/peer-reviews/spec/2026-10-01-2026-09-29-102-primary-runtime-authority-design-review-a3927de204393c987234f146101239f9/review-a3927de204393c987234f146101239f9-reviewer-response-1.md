<!-- ai-peer-review-template version="1" digest="sha256:78e9a634af9d540baaf6790db82952eaf39cf7ab59a6cdc7938319ae07a4cbed" -->

<!-- protected-frontmatter -->

---
schema: "ai-peer-review.response/v1"
review_id: "review-a3927de204393c987234f146101239f9"
role: "reviewer"
turn: 1
commit_mode: "normal"
authority_assurance: "unavailable"
artifact_path: "docs/superpowers/specs/2026-09-29-102-primary-runtime-authority-design.md"
artifact_commit: "14a2df3e339ab5b61773abe2ccf1da33f721b046"
artifact_blob: "67f5360f2fe44fc39159dd56014ef052eda5de59"
artifact_digest: "sha256:4ac80baafb691060458f5d34e812a96ba80e31b8040cfddcdbb4f24d6c2ca6e3"
agent:
  host: "claude-code"
  provider: "anthropic"
  model_id: "claude-opus-5-5"
  model_display: "claude-opus-5-5"
  session_fingerprint: "sha256:93c0e516a25a004dfc92eea99c29c2bc2c764c2526b0f4168ec59437e698658e"
  identity_source: "runtime"
started_at: "2026-10-01T05:49:04.387Z"
submitted_at: "2026-10-01T05:50:35.669Z"
finding_ids: ["R1-F001","R1-F002","R1-F003","R1-F004","R1-F005","R1-F006","R1-F007"]
answered_finding_ids: []
acknowledged_supplement_ids: []
---

Mode: `normal`

## Summary

I reviewed the full replacement design at `14a2df3` independently. I also read the SAR and its erratum, and checked the current sources it replaces:

- `src/config/load.mjs:312-341`: `configPaths` resolves `.ai-peer-review.json` from `cwd`, and `loadConfig` deep-merges user config under project config.
- `src/config/installation-identity.mjs:28-69`: `assertProjectSetupCompatible` gates on `setup.package_version`, `setup.skill_sha256`, and per-host copied skill digests, and raises `APR_SETUP_VERSION_MISMATCH`.
- `package.json:26`: the tarball allowlist ships `scripts/verify-extraction.mjs`.

The overall direction is sound and internally consistent on its main invariants:

- one current global runner and no older-image fallback;
- review and Git state stays with the active physical worktree;
- prior review collateral is fenced fail-closed through a closed-set compatibility manifest rather than a version pin;
- old reservations are never released just to start a new review;
- consumer CI does not depend on AIPR.

The SAR findings are reflected in the text, and the SAR-01 erratum is honored (`setup --update` is preserved).

I am requesting revisions for one high-severity gap and three medium-severity gaps:

1. The design makes the primary checkout's *working tree* the project authority, without saying what happens when that tree's branch or uncommitted state changes. It also lets linked-worktree setup write into another worktree.
2. The per-clone registration of an installation *path and identity* conflicts with the stated success condition, and in-place upgrade behavior is ambiguous.
3. The user/project config merge semantics after the move are ambiguous.
4. The replacement for the current `APR_SETUP_VERSION_MISMATCH` integration staleness gate is not specified.

## Findings

### R1-F001 — Primary-checkout authority is mutable working-tree state, and setup from a linked worktree writes into another worktree (High)

Location: "Authority domains" table (Project config row), "Configuration and setup" paragraphs 1 and 3, "Central project files and format contracts" paragraphs 1 and 3, and acceptance criteria 1 and 9.

The design makes the primary checkout's `.ai-peer-review/config.json` and `.ai-peer-review/SKILL.md` the single authority for every linked worktree. Both files are **tracked** files, so their bytes are whatever the primary checkout's working tree holds at that moment, not a fixed authority:

- If the primary checkout switches to a branch that predates the `.ai-peer-review/` migration, every linked worktree loses its project config. The same happens on a branch that carries an older or different config or shared skill body. With "absent primary config" allowed for a new clone, this can look like a fresh project rather than an error.
- Uncommitted or mid-rebase edits in the primary checkout immediately become authority for reviews in other worktrees.
- A linked worktree's branch that intentionally changes `.ai-peer-review/config.json` or the shared skill (for example, a PR that adjusts review policy, or AIPR's own development) cannot be exercised before merge. Its copy is "diagnostic data only".
- The design rejects "a plain relative path into a linked worktree" because it "may select stale branch content". The registered primary has the same problem, just in a different worktree.

Separately, paragraph 3 of "Configuration and setup" says a linked-worktree `setup` / `setup --update` / `setup --remove` "resolves that target and reports it before apply". That means a command run in worktree B rewrites tracked files in primary worktree A, on A's current branch, possibly in the middle of the user's unrelated edits there. Elsewhere the design forbids cross-worktree mutation ("a shared config cannot authorize cross-worktree review mutation"). Setup is not a review mutation, but this is still an unguarded write into another worktree's working tree and index-visible state.

Concrete failure: the primary is checked out on `feature/x`, which is behind the migration. From linked worktree B, the user runs `peer-review setup --update`. AIPR writes `.ai-peer-review/config.json` and `SKILL.md` into A on `feature/x`, where the user then commits them by accident. Or, without setup, every review in B silently loses its project `authority`/`review` sections.

### R1-F002 — Per-clone registration of installation path and identity conflicts with the "no per-project edit on global update" outcome; in-place-upgrade comparison fields are ambiguous (Medium)

Location: "Problem and outcome" paragraph 3, the "Selected AIPR runner" row, "Current runtime and review compatibility" paragraph 1, and acceptance criterion 4.

The success condition is that "a global update requires no version-pin edit in each project or worktree". However, the runner is registered **per clone**, as a canonical global package path plus Node executable, and "a relocated global installation needs explicit re-registration". Under common Node managers (nvm, fnm, volta, asdf, Homebrew Node upgrades), the global package root and Node executable path change on every Node version change. In practice, that turns the registration into a per-clone path pin that must be re-registered in every clone after a routine Node upgrade. That is the per-project edit the design set out to remove, now in machine-local state rather than a tracked file.

The comparison is also ambiguous. The row says registration records "paths and installation identity", and paragraph 1 says an in-place upgrade "changes observed package metadata and installed-file digest" yet needs no edit. If "installation identity" in the registration includes the version or digest, every in-place upgrade mismatches the registration. If it does not, it is unclear what "installation identity" means or what it protects beyond the path.

### R1-F003 — User/project config merge semantics after centralization are ambiguous (Medium)

Location: "Configuration and setup" paragraph 1, and acceptance criteria 1 and 2.

Today `loadConfig` deep-merges user config under project config across all sections (`src/config/load.mjs:294-341`). The design says user config "retains its existing per-user path and merge precedence for unrelated settings", and also that "every project config section come[s] from the primary file". It does not say:

- whether a user-level `hosts`, `review`, or `authority` value still fills a field the primary file omits, or is now ignored for project operations;
- which sections count as "unrelated settings".

Criterion 1 forbids worktree-local deep merge but says nothing about user-to-project merge. Two implementers could build different precedence, and `authority` precedence is security-relevant.

### R1-F004 — The replacement for the current setup-staleness gate is unspecified (Medium)

Location: "Configuration and setup" paragraphs 3 and 4, "Central project files" paragraph 3, and "Diagnostics and rollout" paragraph 1.

The current runtime refuses with `APR_SETUP_VERSION_MISMATCH` when `setup.package_version`, `setup.skill_sha256`, or any copied host `SKILL.md` digest differs from the installed package (`src/config/installation-identity.mjs:28-69`). The design removes `package_version` as a gate and turns host skills into thin wrappers that load a primary shared body. It says the version field "must not silently bless a stale copied skill or hook", that "a global AIPR upgrade may require one primary or user-scope integration refresh if the integration contract changed", and that doctor shows "copied integration compatibility". It never defines how the runtime decides that a wrapper, shared body, or hook is current or stale after a global upgrade:

- whether there is a declared integration-contract version in owned metadata or the wrapper, or digest comparison against regenerated bytes;
- whether the check runs on every governed mutation (as today) or only in doctor;
- whether `APR_SETUP_VERSION_MISMATCH` is retired, renamed, or retained with new semantics;
- how the check treats the primary shared body, which can legitimately differ per branch (see R1-F001).

Without this, the in-place-upgrade path either loses today's fail-closed staleness gate or keeps a byte-equality gate that reintroduces a refresh after every upgrade.

## Required changes

1. **R1-F001:** State the authority source for the primary project files. For example, either:
   - accept the primary *working tree* as authority and define how missing, pre-migration, or dirty primary state is diagnosed and refused (not treated as a new clone) for linked-worktree project mutation; or
   - choose another source, such as a committed ref or a primary-owned snapshot.

   Whichever is chosen, state explicitly how a linked-worktree branch that changes `.ai-peer-review/config.json` or `SKILL.md` is tested before merge, or that it is not supported. Make linked-worktree `setup`, `setup --update`, and `setup --remove` refuse by default with a command to run in the primary, or require an explicit cross-worktree acknowledgement after a dry-run that shows the primary's branch and dirty state. Add the branch-switch, dirty-primary, and cross-worktree-setup cases to acceptance criteria 1 and 9 and to the installed-artifact matrix in 11.
2. **R1-F002:** Define exactly which registration fields are compared at each entry point and which are provenance only, so that an in-place upgrade provably needs no registration change. Then either:
   - move selected-installation registration to one user/machine-scope record shared by all clones (keeping only the primary path and Git identity per clone), with the clone record referencing it; or
   - keep it per clone, explicitly accept that a Node-manager relocation needs re-registration in every clone, and revise the success statement and criterion 4 to say so.

   If #130's machine-local receipts own this, state the dependency.
3. **R1-F003:** Specify user-versus-primary precedence per config section, at least for `authority`, `hosts`, `review`, and `setup`. Say whether user values may fill fields the primary omits for project operations, and add that rule to criterion 2.
4. **R1-F004:** Specify the integration-currency check that replaces `assertProjectSetupCompatible`. Cover:
   - what is compared: a contract version or regenerated-byte digest for wrappers, the shared body, and owned hook portions;
   - at which boundaries it runs;
   - the error code and recovery command;
   - how it avoids requiring a refresh on upgrades that do not change the integration contract.

   Add the matching acceptance criterion.

## Optional suggestions

### R1-F005 — Bound the package-digest revalidation

"Current runtime and review compatibility" paragraph 1 seals "the executing process's package-file digest" and re-compares the on-disk installation "before later effects". Define the digest scope, for example the file list declared in the compatibility manifest rather than a full tree walk, and the cost expectation for frequent effect boundaries such as hook invocations. That keeps the revalidation from becoming a performance regression or a source of partial-read races during npm replacement.

### R1-F006 — Include stray legacy copies in the migration inventory

The migration inventory covers the old and new config paths. Linked worktrees on pre-migration branches will continue to carry a tracked `.ai-peer-review.json`, and this checkout also has an untracked `.ai-peer-review.json.bak`. State whether doctor reports these once as known-legacy, and how, instead of raising a conflict diagnostic on every invocation from such a worktree.

### R1-F007 — Clarify read-only status for unparseable reviews

"Read-only status" for an unsupported review needs the current package to locate and summarize collateral it cannot parse. State the minimum, format-independent fields that status may report, such as the review path, the declared schema identifiers if readable, and the reason. That makes it clear status never tries a best-effort parse of an unknown journal.

## Decision

revisions-requested
