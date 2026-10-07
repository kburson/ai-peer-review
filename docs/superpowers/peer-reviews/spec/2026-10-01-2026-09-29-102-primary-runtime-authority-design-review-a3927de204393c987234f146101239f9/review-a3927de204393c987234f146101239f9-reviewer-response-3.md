<!-- ai-peer-review-template version="1" digest="sha256:78e9a634af9d540baaf6790db82952eaf39cf7ab59a6cdc7938319ae07a4cbed" -->

<!-- protected-frontmatter -->

---
schema: "ai-peer-review.response/v1"
review_id: "review-a3927de204393c987234f146101239f9"
role: "reviewer"
turn: 3
commit_mode: "normal"
authority_assurance: "unavailable"
artifact_path: "docs/superpowers/specs/2026-09-29-102-primary-runtime-authority-design.md"
artifact_commit: "021bed7e9cc01782f0822e99fa2d3a58aadeb16e"
artifact_blob: "1dfe8089d93ea18e45394fb98303937feedab885"
artifact_digest: "sha256:7130694f89335165a63d29196a56f3665c605fc5b85dde73105a6766da338a4f"
agent:
  host: "claude-code"
  provider: "anthropic"
  model_id: "claude-opus-5-5"
  model_display: "claude-opus-5-5"
  session_fingerprint: "sha256:93c0e516a25a004dfc92eea99c29c2bc2c764c2526b0f4168ec59437e698658e"
  identity_source: "runtime"
started_at: "2026-10-01T05:49:04.387Z"
submitted_at: "2026-10-01T06:00:51.387Z"
finding_ids: ["R3-F001","R3-F002"]
answered_finding_ids: []
acknowledged_supplement_ids: []
---

Mode: `normal`

## Summary

I re-read the full revised specification at `021bed7` against author response 2. I re-checked the `hosts` / `host` / `automatic` definitions in `schemas/config-v1.json` (lines 74-209) to confirm that the new field-ownership table is complete. All four round-2 items are resolved.

- **R2-F001 (resolved).** "Global selection record and digest observations" now places the authority-bearing selection record under the home directory reported by the OS account API (the POSIX account database, or the Windows account/profile API). It explicitly excludes `HOME`, `USERPROFILE`, `XDG_CONFIG_HOME`, and `APPDATA`, and refuses if the account directory cannot be verified. Environment-directed locations stay available only for non-authoritative preferences.

  Authority-bearing Git discovery removes caller `GIT_*` directory, worktree, index, object, and config overrides. It also validates the returned common directory against the physical worktree's on-disk `.git` identity and its worktree membership. Alternate records are confined to an internal fixture harness that cannot launch production provider work. Criteria 4 and 11 name both redirect families. This closes the bypass without breaking user preference relocation.
- **R2-F002 (resolved).** The new "Field ownership and host preferences" table classifies every field in the current `host` definition:
  - `identity`;
  - `resume.command`;
  - `reviewer_guard.enabled` and `reviewer_guard.command`;
  - `automatic.adapter_version` and `automatic.capability`;
  - `automatic.server_command`, `tool_timeout_ms`, `heartbeat_interval_ms`, and `lease_ttl_ms`.

  The classification matches the schema. The split is principled:
  - Policy, capability, and guard enablement stay primary-exclusive and activated.
  - Machine paths, timings, and identity hints are user-exclusive.
  - Identity hints are never identity proof, and user bindings cannot widen capability, disable a required guard, or substitute a non-selected runner.

  Preference changes need no activation or fencing. New runs seal resolved preferences, and active runs change model only through the existing resume protocol. Migration moves machine values to the invoking user's untracked config only after an explicit, collision-checked inventory. The tracked file is again portable. Criterion 2 is updated and criterion 11 covers precedence and continuity.
- **R2-F003 (resolved).** An unrelated primary merge/rebase whose activated owned blobs are clean and identical is now diagnostic-only. Changed, staged, or unmerged owned paths still refuse. Criteria 1 and 11 reflect this.
- **R2-F004 (resolved).** A pulled or committed policy drift is diagnosed with old/new owned digests, the primary-only activation command, and the inventory prerequisite. Neither pull nor doctor activates policy implicitly.

I found no new defects. The new text is consistent with these earlier sections, all unchanged from round 2 except for the targeted edits:

- activation;
- integration currency;
- selection locator / provenance split;
- collateral-compatibility fence;
- runtime-image rule;
- setup boundaries.

This acceptance covers the design only. It does not claim that any mechanism is implemented. As the spec states, `configPaths` / `loadConfig` still resolve from `cwd` and environment and deep-merge user config (`src/config/load.mjs:312-341`), and `assertProjectSetupCompatible` still gates on package-version equality. Changing them is implementation-plan work under the acceptance criteria.

## Findings

None.

## Required changes

None.

## Optional suggestions

### R3-F001 — Align the stale "user-authored `hosts`" sentence in the setup paragraph

"Configuration and setup", the setup paragraph after the field-ownership table, still says: "User-authored `authority`, `hosts`, and `review` settings remain under user control and are validated, not reset to package defaults." Here "user" means the human editing the primary file, but after the field split, the primary file holds only the policy fields of `hosts`. Consider rewording to "Human-authored primary `authority`, `review`, and host-policy fields …" so that this sentence does not appear to contradict the user-exclusive bindings in the table.

### R3-F002 — Say how the split `hosts.<host>.automatic` object is validated

Today `automatic` is one closed object whose six fields are all required (`schemas/config-v1.json:188-209`). After the split, `adapter_version` and `capability` come from the primary file and the four bindings come from user config. Consider stating that each store validates its own partial schema, and that the closed `automatic` object is assembled and validated only after field-level resolution. Otherwise a literal reuse of the current schema would reject both partial files.

## Decision

accepted
