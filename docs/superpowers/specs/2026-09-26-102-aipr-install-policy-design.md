# AIPR Install Policy And Version Compatibility Design

## Issue And Scope

[#102](https://github.com/kburson/ai-peer-review/issues/102).

This design defines a project-owned package-version contract for the existing standalone executable, setup, and review lifecycle. It supports a shared global installation and intentional local installations. It does not implement package installation, migrate existing review formats, or change provider authority.

Review findings are recorded in [the Single Agent Review](../reviews/2026-09-26-102-aipr-install-policy-sar.md). SAR is self-review, not independent peer-review acceptance or implementation-plan approval.

## Problem And Goals

A repository can expect behavior newer than its global executable. A global upgrade can also change behavior for a project that still expects an earlier release. Installing a local dependency does not ensure that it is invoked.

The project config must declare the selected package version independently of installation location. The executing package compares its version with that declaration before review mutations or provider launches. Enforcement covers CLI commands, hooks, MCP, brokers, pinned runtime images, and exported state-writing services.

Goals:

- Keep global installation supported without a dependency installation in every worktree.
- Support explicit local installs for reproducibility, different versions, and development builds.
- Make the tracked project pin authoritative for both global and local runners.
- Refuse incompatible work before side effects while retaining diagnostics and bounded shutdown.
- Preserve physical-worktree isolation, provider identity, authority, and integrity checks.
- Supply a deliberate, reviewable adoption and update path.

Non-goals:

- Automatic npm installation, fetching, executable replacement, or fallback to another runner.
- Version ranges, general dependency resolution, or automatic review-schema migration.
- Treating version equality as a content digest or a trust attestation.
- Retrofitting enforcement into released binaries. Old executables may reject new fields or have entry points that never read config; rollout must select policy-capable components.
- Preventing a repository owner from editing or removing policy. This is a compatibility guard for a trusted checkout, not protection against arbitrary filesystem edits.

## Configuration Contract

Extend the closed `ai-peer-review.config/v1` schema with one optional, closed `tool` object:

```json
{
  "schema": "ai-peer-review.config/v1",
  "tool": {
    "package": "@kburson/ai-peer-review",
    "required_version": "0.4.0"
  }
}
```

The example version is illustrative, not a claim that that release exists. Setup uses its executing package's actual version.

Both keys are required when `tool` is present. `package` is exactly `@kburson/ai-peer-review`. `required_version` is one canonical full package version with a three-part numeric core and optional valid prerelease and build identifiers. Reject whitespace, leading `v`, partial versions, ranges, tags, URLs, and file specifiers. Equality is exact string equality including prerelease and build suffixes. No range or precedence calculation is needed. Invalid executing-package metadata fails closed.

Core numeric components are `0` or a nonzero digit followed by digits, with no leading zeroes. Prerelease identifiers follow `-` and build identifiers follow `+`; each is a nonempty dot-separated sequence of ASCII letters, digits, and hyphens. All-numeric prerelease identifiers cannot have leading zeroes; build identifiers can. Validate as strings without numeric coercion or silent normalization. For example, `1.2.3-rc.1+build.07` is valid, but `01.2.3`, `1.2.3-01`, and empty suffix identifiers are invalid.

There is no configurable `mismatch_policy` or force-version bypass. Local installation changes runner selection; it never overrides the pin.

Update `schemas/config-v1.json` and the independent validator in `src/config/load.mjs` together. Other objects remain closed. Existing configs without `tool` stay valid; older v1 readers reject the new field. Document and test that deployment limitation.

### Authority And Root Resolution

Read policy from the raw project `.ai-peer-review.json` at the physical worktree root before user/project merging. A user-level `tool` is invalid and cannot supply, override, or complete a project pin. Unrelated settings keep existing merge behavior.

Resolve the physical worktree through the existing Git abstraction. Subdirectory invocation uses that root. For workspace and invitation commands, validate the recorded worktree and require agreement with the caller's worktree. Consolidation requires every input to belong to the same root. Never consult a sibling worktree or the shared Git directory as policy authority. A daemon or exported service without a CLI caller uses its already validated bound physical root, never ambient process cwd or an unvalidated caller assertion.

Present project config must be a regular non-symlink file inside that root. Unreadable, malformed, conflicted, or invalid config is an error, never missing policy. A configured pin must be in a tracked stage-zero regular file before review mutation. Setup may create an untracked file and request Git tracking, but never stages or commits it. Working-copy contents are effective; staged bytes do not silently replace them.

### Legacy State

Missing project config or valid config without `tool` means `unconfigured`. Existing operations retain their existing requirements and behavior with an explicit warning that package-version enforcement is inactive. There is no inferred pin, user-level fallback, or unspecified grace period.

Protection is opt-in for existing projects. New project setup adopts its running version under the rules below. Removing a pin disables protection for future operations; that visible repository edit is not proof of old-review compatibility.

## Runner Identity And Selection

Read name and version from the package containing the executing module, relative to its module URL. Never substitute the target project's package metadata, a CLI argument, environment override, provider version, or PATH lookup. Hooks and brokers check their own package; pinned runtime images check metadata inside that image.

Install mode is diagnostic:

- `local`: verified installed-package resolution from this project reaches the executing package.
- `global`: positive evidence identifies the executing package as a global installation.
- `unknown`: source checkout, development link, or insufficient evidence.

Do not execute npm, scan unrelated repositories, or run candidate binaries to classify mode. Unknown mode does not prevent a valid match. A declared but uninstalled dependency is not a local executable.

Current CLI names are `peer-review` and `ai-peer-review`. No `aipr` alias is added. A global invocation never delegates automatically to a local package.

Different builds bearing an identical package version cannot be distinguished by this policy. Released fixes need distinct versions; development builds need distinguishable versions when this guard is expected to distinguish them. Existing runtime-image digests, Node-major, native-helper, broker-protocol, and evidence-format checks remain separate requirements.

## Evaluation And Entry Points

One evaluator produces `compatible`, `mismatch`, `unconfigured`, or a typed invalid/unavailable outcome, including verified root, config path, runner identity, pin, and policy observation. The observation binds physical root, executing package identity, policy state, and exact tool values; revalidation also repeats regular-file and Git tracking checks. Unrelated config edits do not alone change the tool observation, but invalid full config still refuses. Policy writes additionally compare the complete original config bytes to preserve unrelated edits. Older and newer unequal versions are both mismatches.

Classify operations by actual effects, including flags and broker verbs. New or unclassified operations cannot obtain mutation capability by default.

| Operation                                                                                                                                                                                                                       | Contract                                                                                                                          |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `help`, `explain`, usage errors                                                                                                                                                                                                 | Available without Git, config, provider identity, or broker setup.                                                                |
| `doctor`                                                                                                                                                                                                                        | Diagnose policy before identity and provider probes; report policy health independently.                                          |
| `status`, `resume`, `consolidate --dry-run`, `broker status`                                                                                                                                                                    | Read-only inspection remains available when the existing format is readable; report policy findings separately.                   |
| `setup --dry-run`                                                                                                                                                                                                               | Preview only, reporting whether application would be allowed.                                                                     |
| Project setup, including `--remove`                                                                                                                                                                                             | Gate before config, skill, adapter, or exclude-file writes; adoption exception below.                                             |
| User setup, including `--remove`                                                                                                                                                                                                | Changes only user-owned integration; cannot create project policy or mutate project reviews.                                      |
| Policy-only setup and coordination-lock recovery                                                                                                                                                                                | Separate narrowly scoped pin-update and lock-cleanup exceptions below.                                                            |
| `start`, `join`, `launch-reviewer` including resume, `request-grant`, `submit`, `advance`, `finalize`, `continue`, `supplement`, `recover` with all variants, `abandon`, `supersede`, `consolidate --apply`, `broker reconcile` | Require configured compatibility before authority requests, claims, events, files, runtime copies, adapters, or process launches. |
| `broker suspend`, `broker stop`, internal cancellation                                                                                                                                                                          | Bounded cleanup exception; cannot authorize new work.                                                                             |
| Hook capture, MCP delivery and lease activity, broker recovery and dispatch, state-writing exported APIs                                                                                                                        | Check at their own side-effect boundary against their bound project and executing package.                                        |

A wait that refreshes leases or acknowledges delivery is not read-only. Pure calculations without filesystem, transport, or provider effects need no gate. Enforce common production mutation services as well as routing, including `applyReviewRecord` and stateful adapters exposed in `src/public-api.mjs`. Do not expose a caller-settable skip flag, trusted Boolean, or replacement runner version. Test injection cannot become a production bypass. Existing path and ownership validation remains mandatory. Exported writers must derive their bound root from validated workspace or plan data, or require an explicit root that they validate themselves. Pure helpers stay root-free. Document any new required argument as a public API change and include it in release compatibility notes.

### Long-Lived Work And Cleanup

Check before worker restoration, commands, launches, resumes, deliveries, and state-changing work units. Retain the observed policy per work unit and revalidate after asynchronous external waits before accepting results or committing the next state change. Drift, including disappearance or invalidation of a previously observed pin, stops further work in that running operation.

A policy edit cannot revoke an already executed side effect. The guarantee covers admission and subsequent mutation boundaries, not an atomic transaction with arbitrary editor or Git writes. Existing locking and integrity checks remain necessary.

On drift, cancel pending work and stop or suspend owned resources while preserving evidence. Cleanup may release leases, terminate owned children, and write existing narrowly required shutdown and settlement evidence. It cannot grant authority, launch or resume providers, consume a new handoff, accept or advance review progress, or migrate a workspace. Cleanup failure is reported, never treated as review success.

Mismatch must not cause a broker to restore workers merely to serve shutdown. An already running broker must keep authenticated stop/suspend reachable after normal admission is fenced; a restart in cleanup-only mode must use verified existing ownership records and cannot invoke normal launch/resume recovery. If ownership cannot be proven, preserve evidence and refuse cleanup rather than guess or kill an unrelated process.

Stop and suspend still require exact broker handshake, runtime, root, and ownership checks. The policy exception does not let an incompatible client control another broker. Recovery can direct the operator to the recorded compatible runtime's cleanup command.

## Setup And Adoption

### Ordinary Setup

Retain explicit `--scope user|project` and existing ownership checks. User setup never writes `tool`. Project setup without `--remove` creates the current runner pin in an unconfigured project only after the activity preflight below. Removal never adopts policy or creates a missing config. Matching ordinary setup need not prove the worktree idle solely to preserve an unchanged pin; existing setup safety rules still apply. It preserves a matching pin and refuses an incompatible one without implicitly upgrading or downgrading it.

Project removal removes only owned integration material and preserves the project-owned pin, even when setup originally created it. A config containing `tool` cannot be deleted merely because the last adapter is removed. Policy removal itself is an explicit repository edit.

The existing scratch-exclude confirmation still applies. Policy and activity preflight must finish before any setup file is applied. Foreign config and adapter protections remain intact.

### Policy-Only Setup

Add paired options:

```text
peer-review setup --scope project --pin-tool-version <version> --expect-tool-version <version|absent> [--dry-run]
```

This mode changes only `tool` among project files and may create minimal project config; application may also use the transient coordination lock described below. It forbids `--scope user`, `--agent`, `--remove`, and `--confirm-scratch-exclude`; it neither installs integrations nor changes scratch exclusions. Bad combinations remain `APR_USAGE`. Both newly added pin flags are singleton value flags, and both are required together; recovery is a separate mutually exclusive mode.

The target must equal the executing package's exact version. The expectation must match the old pin, or be `absent` for a valid missing tool object or missing file. Malformed config is never absent. Dry run validates the same inputs and inspectable preconditions without writing or acquiring a filesystem lock. It reports a snapshot, not a reservation. Application always repeats the checks. If target and expected pin already equal the current runner, policy-only setup is an idempotent no-op after validation: no write, lock, or idle precondition is needed because no policy changes.

Read and validate raw project bytes; preserve unrelated fields and produce a diff. On application, revalidate activity and original bytes or absence, serialize cooperating policy writers, then use the existing atomic-file write mechanism. Refuse detected intervening changes. No guarantee is made against an uncooperative editor racing the final replacement.

A pin change declares the selected executable version; it does not prove existing protocol state can migrate. Never rewrite review schemas, launch contracts, invitations, runtime images, or evidence as part of policy setup. Use the old matching runtime when historical formats require it.

### Coordination Lock Recovery

Provide the separate mode:

```text
peer-review setup --scope project --reclaim-tool-policy-lock <sha256-digest> [--dry-run]
```

It cannot combine with pin options, `--agent`, `--remove`, or scratch confirmation. It is a cleanup exception that never changes policy or admits review work. Doctor reports the lock path, digest, and verified live/stale/unknown classification using read-only inspection. Reclamation requires an exact matching digest, safe file ownership, and proof that the recorded same-host owner is no longer the same live process. Live, foreign-host, malformed, or unverifiable ownership refuses even with a supplied digest; no force option exists. Retry only after ownership can be established. Do not reuse an existing forced-reclaim helper that permits removing an unknown or live owner's lock.

Serialize reclamation against competing acquirers, recheck the exact lock immediately before moving it, retain its original bytes with a receipt in the same worktree's Git administrative directory, and never remove a replacement lock. A failed retention leaves the lock or retained evidence discoverable and refuses new work; no blind retry can claim successful reclamation. The implementation plan must specify and test the cross-platform exclusion primitive and race cases before implementing pin updates. Dry run performs inspection only, without taking a lock or writing a receipt.

### Activity Preconditions

Before first adoption or a pin change, inspect this worktree's existing reviews, startup journals, broker registrations, and owned runtime activity without mutation. Refuse nonterminal reviews, incomplete startup, live brokers/providers/residents, and unknown or unreadable activity. Terminal or abandoned attempts may remain as immutable evidence once no associated worker or resident is live.

Use established lifecycle and ownership readers, not PID guessing, directory deletion, or provider execution. Hold a physical-worktree mutation exclusion during application preflight and the pin write. Supported review admission must use that same exclusion so a concurrent start cannot race the idle check. Admission must persist its existing startup reservation or nonterminal workspace under this exclusion before releasing it; the activity reader must recognize that reservation after a crash. Otherwise an idle check could miss admitted work that has not launched yet. Release the exclusion before long-running provider work. A refusal preserves policy and review state; cleanup of a lock acquired by the refused operation is allowed. Where reliable activity readers are missing, implementation must supply and test them before allowing adoption.

Store the coordination lock under the physical worktree's Git administrative directory, resolved with `git rev-parse --absolute-git-dir`, not in the common Git directory or review scratch. This allows first-time setup before scratch exclusions exist and keeps sibling worktrees independent. Use a bounded, ownership-verified exclusive-lock implementation with conservative stale-owner handling; never reclaim solely from PID absence or wall-clock age. Release only this operation's lock. A stale or unverifiable lock produces an actionable refusal with its exact digest and the recovery command defined above. An absent PID on its own is insufficient when host or lock provenance cannot be established; verified same-host process death or proven process-identity replacement can establish staleness. Do not require native broker compilation merely to use manual setup. Dry-run and diagnostic reads create no lock files or directories.

All new policy-capable admissions cooperate with this exclusion, including unconfigured legacy mode. Older released runners do not: operators must quiesce them during adoption. This is an explicit rollout precondition, not a cross-version locking guarantee.

Finish or abandon active legacy reviews using their existing compatible runtime before adopting policy. A new version cannot infer migration permission.

## Diagnostics And Recovery

Stable outcomes:

- `APR_TOOL_VERSION_MISMATCH`: valid pin differs from the runner.
- `APR_TOOL_POLICY_UNCONFIGURED`: warning; legacy operations are not independently forbidden.
- `APR_TOOL_POLICY_UNTRACKED`: configured pin is not in a tracked stage-zero regular file.
- `APR_TOOL_POLICY_CHANGED`: observed policy or expected old value changed.
- `APR_TOOL_POLICY_BUSY`: adoption cannot prove idle state or acquire exclusion.
- `APR_TOOL_VERSION_UNAVAILABLE`: executing-package identity cannot be established safely.
- Existing `APR_CONFIG_INVALID`: malformed policy, invalid config, or unsafe config source.

Errors retain the existing envelope and nonzero failure convention. Setup previews exit nonzero when application is blocked by policy, activity, ownership, or expected-value checks, and zero for a valid preview or validated no-op; a preview never reserves permission for a later application. Details include command/category, config path, runner package and version, pin or null, install mode, policy state, and safe recovery guidance. Lock diagnostics may additionally include its canonical path, exact digest, and bounded ownership classification/reason; never an arbitrary lock-file dump. No credentials, config dump, environment dump, or arbitrary npm output.

For otherwise readable status/resume/consolidation results, invalid, unavailable, mismatched, or untracked policy is reported as a separate diagnostic rather than preventing inspection. Such a diagnostic never authorizes a subsequent mutation. Non-Git doctor reports both unavailable project context and tool-policy health without crashing.

Preserve closed successful read-only stdout schemas. Policy warnings for status, resume, and consolidation go to stderr. Add a structured `tool-policy` doctor row, including in JSON. Doctor is unhealthy and exits nonzero for mismatch, invalid or untracked policy, unavailable package identity, and unconfigured policy. Legacy mutations can therefore remain allowed while CI requires explicit adoption. Other doctor checks stay independent.

Doctor must report policy findings even when full config or provider identity cannot load. A read-only command may still report its existing unsupported-review-format error; diagnostics do not promise interpretation of future schemas. Diagnosis and dry run must not create scratch/config directories, leases, authority challenges, runtime images, brokers, or provider sessions. Mismatch diagnosis must not execute arbitrary configured commands. When policy is not compatible, doctor skips provider execution and side-effectful health probes while still reporting independent safe filesystem/identity observations. Read-only Git invocations must disable optional index refresh writes and must not stage or commit.

Recommend the required executable or deliberate pin change after settling activity. Installing or upgrading is an operator action. Do not present a pin update as automatic evidence migration.

Only recommend verified installed candidates. Use a verified Node-plus-entrypoint invocation, or `npx --no-install peer-review` when its local resolution is verified; never invent an npm script. Global short names are convenience hints rather than identity proof. Each invocation must validate the executing package anew.

Generated invocations must retain exact-session provider-hook capture. Update strict hook recognizers and fixtures with any new supported spelling. Do not blindly emit an absolute Node invocation or no-install npx command that the hook cannot recognize, and never bypass identity checks to compensate. Use literal argument arrays for execution and platform-appropriate quoting for display.

## Worktrees, CI, And Rollout

Worktrees can check out different pins. Read each physical worktree independently, never cache by shared Git directory alone. Scratch, invitations, broker ownership, and runtime images remain local to their worktree. Local dependencies may need bootstrapping there; a compatible global executable needs no per-worktree dependency install.

CI checks out the project, provisions or selects the intended policy-capable runner, and runs doctor before review work. Compatible global packages are acceptable. Missing or mismatched runners fail without automatic fetching.

Release with a distinct package version, provision selected components, settle active reviews, deliberately adopt and track the pin, and verify doctor plus a normal command. Updating this source does not update global installations or consumers such as AITM. Old executable and hook installations cannot become policy-aware through config edits alone.

## Verification And Acceptance Criteria

The implementation plan must provide these tests. They are required coverage, not tests claimed to exist already.

| ID   | Required behavior and evidence                                                                                                                                                                                                                                                                                                                                       |
| ---- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC1  | Schema and runtime validators agree on full versions, suffixes, missing and unknown keys, wrong packages, ranges, tags, and malformed values.                                                                                                                                                                                                                        |
| AC2  | Executing package metadata is authoritative across global, local, source, and pinned-image fixtures; cwd, PATH, environment, and API inputs cannot override it; root-bearing public API changes are explicit.                                                                                                                                                        |
| AC3  | Older and newer mismatches refuse every mutating CLI variant before side effects; matching versions still satisfy existing authority and integrity gates.                                                                                                                                                                                                            |
| AC4  | Classification covers every parser command and broker verb; adding an unclassified operation fails coverage and cannot mutate by default.                                                                                                                                                                                                                            |
| AC5  | User config cannot supply policy; subdirectory invocations agree; foreign invitations/workspaces and mixed-root consolidation fail without writes.                                                                                                                                                                                                                   |
| AC6  | Missing policy has explicit legacy behavior; invalid, unreadable, symlinked, conflicted, and untracked pins cannot silently become legacy mode.                                                                                                                                                                                                                      |
| AC7  | Help/explain work without Git. Doctor reports policy independently of identity. Read-only stdout remains closed and diagnosis causes no project, runtime, lease, provider, or Git writes.                                                                                                                                                                            |
| AC8  | Project setup pins its runner, preserves matching pins, refuses mismatches before writes; user setup creates no pin; removal never adopts one and preserves existing policy and foreign content.                                                                                                                                                                     |
| AC9  | Policy-only arguments, equality, expectation, byte conflicts, dry run, idle state, and concurrent admission are tested; no-op updates are idempotent; refused changes preserve project files. Include fresh repositories without scratch exclusions, preview exit codes, per-worktree lock isolation, and recovery races involving changed/live/unknown/stale locks. |
| AC10 | Nonterminal reviews, incomplete startup, unknown activity, live workers/residents, and competing startup prevent adoption; crash-persistent admission reservations remain visible; terminal evidence is preserved without migration.                                                                                                                                 |
| AC11 | Hooks, MCP, brokers, pinned images, and exported writers cannot bypass enforcement; include drift after startup and asynchronous waits.                                                                                                                                                                                                                              |
| AC12 | Mismatched cleanup is bounded, owned, and preserves settlement evidence without new work; foreign broker ownership/protocol still refuses; cleanup-only restart cannot launch workers.                                                                                                                                                                               |
| AC13 | Recovery commands use verified candidates/scripts, preserve literal argv and hook identity, handle paths with spaces, and never fetch or execute candidates to diagnose them.                                                                                                                                                                                        |
| AC14 | Linked worktrees with different pins remain independent; cloud fixtures without local dependencies use compatible global packages and reject incompatible selected runners.                                                                                                                                                                                          |
| AC15 | Old readers reject tool fields as expected; new readers warn for legacy config. Closed schemas, golden output, help/skills, and setup removal fixtures remain consistent.                                                                                                                                                                                            |
| AC16 | Packaging tests use actual metadata and public entry points, including hooks, MCP, and native brokers, across supported Node/platform combinations without real global installs or registry calls.                                                                                                                                                                   |

## Resolved Decisions

- Exact full versions only; ranges deferred.
- Existing executable names; no new alias.
- Local detection is advisory; explicit selection still obeys the project pin.
- Policy-only setup changes pins without migrating review state.
- Legacy projects retain behavior with warnings; doctor reports lack of protection as unhealthy.
- Shutdown has a narrow exception so drift cannot prevent safe cleanup.
