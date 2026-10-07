<!-- ai-peer-review-template version="1" digest="sha256:78e9a634af9d540baaf6790db82952eaf39cf7ab59a6cdc7938319ae07a4cbed" -->

<!-- protected-frontmatter -->

---
schema: "ai-peer-review.response/v1"
review_id: "review-a3927de204393c987234f146101239f9"
role: "reviewer"
turn: 2
commit_mode: "normal"
authority_assurance: "unavailable"
artifact_path: "docs/superpowers/specs/2026-09-29-102-primary-runtime-authority-design.md"
artifact_commit: "9b912bcc44feb6cd0920a93d515b3abbe1efd302"
artifact_blob: "b5d22c8d3ab2842c42414e2f4417d4873eef77ec"
artifact_digest: "sha256:24b2ebecec6a47a2ee0247d7832b38504d40a7bee60016fab602970b47306594"
agent:
  host: "claude-code"
  provider: "anthropic"
  model_id: "claude-opus-5-5"
  model_display: "claude-opus-5-5"
  session_fingerprint: "sha256:93c0e516a25a004dfc92eea99c29c2bc2c764c2526b0f4168ec59437e698658e"
  identity_source: "runtime"
started_at: "2026-10-01T05:49:04.387Z"
submitted_at: "2026-10-01T05:57:07.594Z"
finding_ids: ["R2-F001","R2-F002","R2-F003","R2-F004"]
answered_finding_ids: []
acknowledged_supplement_ids: []
---

Mode: `normal`

## Summary

I re-read the whole revised specification at `9b912bc` against author response 1. I also re-checked these sources:

- `src/config/load.mjs:312-341`;
- `schemas/config-v1.json`, the `hosts` / `host` definitions;
- the tracked `.ai-peer-review.json`;
- the `XDG_CONFIG_HOME` usage in `src/config/load.mjs:318-321` and `test/helpers/claude-launch-cli-regression.mjs:90-109`.

All seven round-1 findings are resolved in substance:

- **R1-F001 (resolved).** The new "Primary file activation and branch changes" section gives the primary working tree a commit-anchored activation receipt. It covers:
  - the config and shared-skill blob digests plus the integration contract;
  - refusal on dirty, staged, unmerged, or absent owned files, on merge/rebase recovery, and on a different-policy or pre-migration branch;
  - acceptance of identical blobs across branch switches;
  - revalidation at each effect boundary;
  - an explicit uninitialized state, so a missing file is never treated as a new clone.

  Linked-worktree setup apply now always refuses, with no override. Policy changes require commit plus explicit activation with an idle or suspended inventory. Linked experimental policy is confined to isolated fixtures. Acceptance criteria 1, 2, 9, and 11 carry the cases.
- **R1-F002 (resolved).** Runner selection is now one user/machine-scope `runtime-selection.json`. Its compared fields are package root, package name, and Node executable, and version and digests are named as provenance only. An in-place upgrade needs no edit, and a relocation needs one update for all clones. Criterion 4 makes the comparison and provenance split explicit.
- **R1-F003 (resolved as asked).** Project operations now take all four sections exclusively from the primary, with no user fill-in, and the deep merge is explicitly replaced. This rule exposes a new gap, described in R2-F002.
- **R1-F004 (resolved).** The "Integration currency" section defines:
  - a contract identifier with owned shared-body, wrapper, and normalized hook digests;
  - checks at every mutation and after waits;
  - the retained `APR_SETUP_VERSION_MISMATCH` code with the repair sequence;
  - no refresh for an unchanged contract;
  - narrowly scoped bootstrap and repair operations.
- **R1-F005, R1-F006, and R1-F007 (resolved).** The changes are a bounded manifest inventory with re-observation on identity change, path-only legacy and backup inventory, and status for unsupported collateral limited to fields that can be read without a parser.

The new text is internally consistent with the rest of the design, and I found no regressions in the unchanged sections. The new mechanisms introduce two medium-severity gaps, so I am requesting one more revision.

## Findings

### R2-F001 — The selection record and clone registration can be relocated by environment variables, which defeats the "env cannot impersonate" guarantee (Medium)

Location: "Global selection record and digest observations" paragraph 1, the "Authority domains" table and the paragraph after it, "Project-local dependencies" paragraph 1, and acceptance criterion 4.

`runtime-selection.json` is stored "in the existing platform user configuration directory". Today that directory comes from caller environment: `env.XDG_CONFIG_HOME`, and `env.APPDATA` on Windows (`src/config/load.mjs:318-321`). The source tests already set `XDG_CONFIG_HOME` to a fixture directory (`test/helpers/claude-launch-cli-regression.mjs:90,109`).

A caller, harness, or agent shell that exports `XDG_CONFIG_HOME=<dir>` can therefore supply a `runtime-selection.json` naming a source checkout or worktree-local package as the "selected global installation". That runner then passes the entry-point comparison and performs production review mutations. This contradicts:

- criterion 4: "cwd, PATH, env, source checkout, local dependency, and API inputs cannot impersonate it";
- "Production review mutations from that source or local installation refuse unless it is the registered current global installation. There is no caller-supplied bypass flag."

An environment variable is a bypass flag in all but name.

The clone registration has the same exposure. It lives under "the validated Git common administrative directory". If that directory is found by invoking Git with the caller's environment, `GIT_DIR`, `GIT_COMMON_DIR`, or `GIT_WORK_TREE` can point it at a fabricated registration. The design does not say whether the Git discovery used for authority scrubs these variables.

This is not a demand to defend against a malicious same-user process, which could edit the real record. The issue is that a routine and very common environment override, used by test harnesses, sandboxes, and some agent hosts, silently changes which runner and which primary are authoritative. The design explicitly promises that it does not.

### R2-F002 — Exclusive-primary sections leave no home for per-developer or per-machine host settings in a tracked, portable config (Medium)

Location: "Configuration and setup" paragraph 1, "Authority domains" (the Project config row and "The tracked primary config remains portable across machines"), and acceptance criterion 2.

The closed schema's `hosts.<host>` block carries:

- `identity` (`provider`, `host`, `model_id`, `model_display`);
- `resume.command`;
- `reviewer_guard.command` (`schemas/config-v1.json:148-185`).

These are often per-developer or per-machine choices: which model a developer runs, and a resume command or guard executable that may be an absolute path or depend on local installation. Today a developer can keep them in user config, and they reach project operations through the deep merge.

Under the revised rule, project operations take `hosts` "exclusively from the primary config: user values do not override them or fill omitted fields". The response justifies this by saying "There are no user-merged unrelated sections in the current closed schema". That is true at section granularity, but it ignores that these fields are per-user values inside a project section. The consequences are:

- Every developer's model identity and local command paths must live in the **tracked** primary config. Collaborators then share or overwrite one another's values, and the file is no longer "portable across machines".
- Alternatively, those settings become unavailable for project operations, which silently regresses anyone who relies on user-level `hosts` today.
- Each local change to them is a tracked policy edit that requires commit plus activation and an idle review inventory under the new activation rule. A developer switching models would have to fence all active reviews.

The design and the response treat project policy (`authority`, `review`, the owned `setup` fields) and per-user host preferences as one class, but they need different authority.

## Required changes

1. **R2-F001:** Specify how the user-scope selection record and the clone primary registration are located for authority purposes, and state that caller-overridable environment cannot redirect either for governed mutations. For example:
   - derive the selection-record root from the OS account (such as the passwd/profile home directory) rather than `XDG_CONFIG_HOME` or `APPDATA`, or refuse governed mutation when those variables point somewhere other than the account default;
   - scrub `GIT_DIR`, `GIT_COMMON_DIR`, `GIT_WORK_TREE`, `GIT_INDEX_FILE`, and similar variables for authority-bearing Git discovery, or refuse when they are set.

   State that source tests reach alternate records only through the explicit fixture harness. Add the environment-redirect cases (`XDG_CONFIG_HOME`/`APPDATA` selection redirect and `GIT_DIR`/`GIT_COMMON_DIR` registration redirect) to criteria 4 and 11.
2. **R2-F002:** Classify the closed-schema fields into project policy (primary-exclusive, activated) and per-user or per-machine preference. At least classify `hosts.*.identity`, `hosts.*.resume.command`, and `hosts.*.reviewer_guard`. For each preference field, state its single source for project operations and its precedence rule, such as a user value that applies only when the primary omits it, or user-exclusive. Also state that changing it does not require primary activation or review fencing, while it is still sealed into a review's provenance at start. If the decision is instead that all `hosts` fields are project policy, say so explicitly, add a migration and diagnostic for users who rely on user-level `hosts` today, and reconcile this with "portable across machines" by forbidding machine-specific paths in tracked `hosts`. Update criterion 2 accordingly.

## Optional suggestions

### R2-F003 — Scope the merge/rebase refusal to the owned files

"Primary file activation" paragraph 2 refuses project mutation whenever the primary "is in merge/rebase recovery", even when the owned files are clean and equal the activated blobs. A developer rebasing an unrelated branch in the primary would block governed reviews in every linked worktree for the rest of the rebase. The other checks already catch an in-progress operation that touches owned files: the owned-file unmerged, staged, and dirty checks, plus blob equality. Consider refusing only when an owned path is unmerged or differs, and otherwise reporting the recovery state as a doctor diagnostic. If whole-checkout refusal is intentional, a sentence of rationale would stop implementers from loosening it.

### R2-F004 — State the activation repair route for a pulled policy change

If an ordinary `git pull` in the primary brings in a reviewed policy edit from another collaborator, the next mutation in every worktree refuses because the activated-blob comparison fails. That is correct fail-closed behavior. Consider stating that this refusal and doctor name the activation command and show the old and new digests, so the repair route is as explicit as the `setup --update` route in "Integration currency".

## Decision

revisions-requested
