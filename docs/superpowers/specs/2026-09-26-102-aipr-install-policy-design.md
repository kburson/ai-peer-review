# AIPR Install Policy And Version Compatibility Design

## Issue

[#102](https://github.com/kburson/ai-peer-review/issues/102)

## Problem

`ai-peer-review` can be installed globally and used across many repositories, but each repository still carries its own review configuration, protocol state, collateral, and provider metadata. That split is convenient for a single operator, yet it creates version drift risk for teams, local worktrees, and ephemeral cloud environments.

A global executable can silently be older than the repository's expected protocol behavior, as seen when a fixed trunk behavior still failed through a stale global `ai-peer-review@0.2.2` install. A project-local dev dependency avoids drift, but requiring every repository and every worktree to install a separate copy is heavier than necessary for general use.

The package needs an explicit install policy: support global use as the default shared executable model, allow local project installs as an intentional override, and make the tracked project configuration authoritative about the compatible tool version.

## Goals

- Let operators keep one global `aipr` or `peer-review` install for normal use across many repositories.
- Let individual projects opt into a local dev dependency when they need stricter reproducibility, a different version, or unreleased behavior.
- Store the project's required AIPR compatibility contract in a tracked repo-local config file.
- Detect and explain version mismatches before mutating review state.
- Make behavior clear across ordinary clones, local git worktrees, CI, and ephemeral cloud agents.
- Preserve the existing project-local evidence model: configuration and durable collateral belong to the target repository, not to the global executable installation.

## Non-Goals

- Remove support for global installs.
- Require every project to install `@kburson/ai-peer-review` as a dev dependency.
- Make npm enforce global package versions through `package.json`; npm does not provide that contract.
- Share scratch review workspaces across git worktrees.
- Allow newer or older binaries to migrate project protocol state implicitly.
- Change provider identity, authority, or response-sealing semantics.

## Terminology

- **AIPR executable:** the running `aipr`, `ai-peer-review`, or `peer-review` binary.
- **Project config:** the tracked repository config, currently `.ai-peer-review.json`.
- **Required version:** the project-declared compatible package version or semver range.
- **Runner version:** the package version of the executable currently handling the command.
- **Local install:** a project dependency under the repository's package manager install, normally exposed through `node_modules/.bin`.
- **Global install:** a package installed outside the project and resolved from the operator's machine or cloud image.

## Proposed Configuration Contract

Extend the tracked project config with an explicit tool compatibility section. The exact field names should be finalized during implementation, but the configuration should be structurally close to:

```json
{
  "schema": "ai-peer-review.config/v1",
  "tool": {
    "package": "@kburson/ai-peer-review",
    "required_version": "0.3.0",
    "mismatch_policy": "fail-mutating"
  }
}
```

The config remains tracked in Git. That makes the project's expected tool contract travel with clones, branches, code review, CI, and cloud environments.

`required_version` may start as an exact version. A later implementation may support a semver range, but exact versions are simpler and safer for the first iteration because AIPR owns protocol state and durable evidence formats.

`mismatch_policy` defaults to `fail-mutating` when absent. Mutating commands refuse incompatible versions; read-only diagnostic commands remain available so operators can understand and repair the mismatch.

## Resolution Policy

When a command runs inside a repository, AIPR should resolve the project root, read the tracked project config, then compare the runner version against the declared required version.

The policy is:

1. If a project-local AIPR install is being invoked, treat it as the selected runner and still compare it against the tracked config.
2. If a global AIPR install is being invoked, compare the global runner version against the tracked config.
3. If the runner version equals the required version, proceed normally.
4. If the runner version is older than the required version, fail closed for mutating commands.
5. If the runner version is newer than the required version, warn for read-only commands and fail mutating commands unless an explicit migration or config update path has validated compatibility.
6. If no project config exists, allow setup/help/doctor commands to explain the missing config and generate one. Other mutating commands retain their existing config requirements.

A newer binary is not automatically safe. It may write newer schema, produce different launch behavior, or change recovery contracts. Advancing the required version should be an explicit tracked change.

## Command Categories

Read-only commands may run with mismatch diagnostics:

- `help`
- `explain`
- `doctor`
- `status`
- `resume`
- dry-run setup or migration commands

Mutating commands should fail when the runner is incompatible:

- `setup` without dry run
- `start`
- `join`
- `submit`
- `advance`
- `finalize`
- `continue`
- `supplement`
- `recover`
- `abandon`
- `supersede`
- `consolidate` without dry run
- provider launch or wake commands that can update private state or protocol state

Implementation should centralize this classification so new commands cannot silently skip the version gate.

## Local Override Model

Projects may intentionally install AIPR as a dev dependency. This is useful when:

- the project needs a different version than the machine's shared global install;
- a team wants lockfile-backed reproducibility;
- a branch is testing unreleased behavior;
- CI should avoid relying on a preinstalled global package;
- cloud agents should use the repository's exact dependency set.

A global binary should not try to replace itself in-process with a local binary. Instead, diagnostics should tell the operator the project declares or contains a local install and recommend exact commands such as:

```sh
npx --no-install peer-review status <workspace>
npm run peer-review -- status <workspace>
```

Generated recovery commands should prefer the executable form that matches the current validated runner. If a project-local install is active, generated commands should preserve local execution where possible. If a global install is active and compatible, generated commands may use the global binary.

## Setup Behavior

`peer-review setup` should initialize or update the tracked project config. On first setup, it should write the current runner version into `tool.required_version` unless the user supplies an explicit version.

Setup should also detect common install modes:

- global runner, no local package: write config for the global runner version and explain that the repository now requires that version;
- local runner from `node_modules/.bin`: write config for the local package version;
- both local and global available: prefer the currently invoked runner but report the other version if it differs.

Setup must not write machine-specific global install paths into tracked config. The config records the package contract, not a local executable path.

## Worktree Behavior

Tracked config follows Git into every worktree. Scratch protocol state remains physical-worktree-local.

This means:

- a worktree can read the same required AIPR version as the main checkout;
- untracked `.scratch/peer-review/...` state stays isolated per worktree;
- generated invitations and launch contracts continue to bind absolute paths to the physical worktree where they were created;
- operators must not reuse invitations or resume commands generated in one worktree from another worktree unless the command explicitly supports relocation;
- a local dev dependency install may need bootstrapping per worktree if `node_modules` is not shared.

Global install works well with worktrees because one global executable can satisfy the tracked version contract for all worktrees. Local install remains available for worktrees that need isolated dependencies.

## Ephemeral And Cloud Environments

Cloud images may preinstall a global AIPR package. That is acceptable, but the repository config remains authoritative.

Cloud startup should follow this order:

1. Check out the repository.
2. Install project dependencies if the project requires local execution.
3. Otherwise use the image's global AIPR install.
4. Run `peer-review doctor` or an equivalent startup check to compare runner version and project config.
5. Fail before mutating review state if the image version does not satisfy the tracked config.

For cloud agents, mismatch diagnostics should be deterministic and actionable. They should report the runner version, required version, install mode, config path, and one or more exact recovery commands.

## Diagnostics

Version mismatch errors should use a stable APR code, for example `APR_TOOL_VERSION_MISMATCH`.

Error details should include:

- runner package name;
- runner version;
- install mode: `global`, `local`, or `unknown`;
- config path;
- required version;
- command category: `read-only` or `mutating`;
- suggested recovery command where safe.

Diagnostics must not include credentials, environment dumps, full shell startup files, or arbitrary npm output.

Example mutating failure:

```text
APR_TOOL_VERSION_MISMATCH: Project requires @kburson/ai-peer-review 0.3.0, but the running global install is 0.2.2.
Recovery: Upgrade the global package or run the project-local peer-review binary, then retry this command.
```

Example newer-runner failure:

```text
APR_TOOL_VERSION_MISMATCH: Project config requires @kburson/ai-peer-review 0.3.0, but the running install is 0.4.0.
Recovery: Run the explicit config migration/update command before mutating review state.
```

## Migration And Compatibility

Existing configs without `tool.required_version` should remain readable. The first implementation should support a migration path:

- `peer-review doctor` reports the missing requirement and suggests setup/migration.
- `peer-review setup` can add the current runner version.
- mutating commands may continue under a temporary compatibility window only if the existing code already treats config as valid; otherwise they fail with a clear setup requirement.

Do not silently add `required_version` during unrelated mutating commands. The project policy must be a visible tracked change.

## Testing Strategy

Add unit and integration coverage for:

- exact matching version allows mutating commands;
- older global runner fails mutating commands before writing state;
- newer runner fails mutating commands until config migration is explicit;
- read-only commands emit diagnostics without mutating state;
- setup writes tracked config without machine-specific paths;
- local install diagnostics recommend local command forms;
- global install diagnostics recommend global upgrade when no local install exists;
- worktree fixtures share tracked config while keeping scratch state local;
- cloud-like fixtures with no local dependencies can use a compatible global runner;
- missing config is handled by setup/help/doctor without crashing.

Tests should not require publishing or installing real global npm packages. Use injected package-version and install-mode providers where practical, plus one packaging-level test that exercises the real package metadata path.

## Acceptance Criteria

- A tracked project config can declare the required AIPR package version.
- The running executable compares its package version to that config before mutating review state.
- Older and newer mismatches fail closed for mutating commands with stable diagnostics.
- Read-only diagnostic commands remain available during mismatch.
- Global installs remain supported for compatible projects.
- Project-local dev dependency installs remain supported and can intentionally override global policy.
- Worktree behavior is documented and covered by tests.
- Ephemeral/cloud environment behavior is documented and covered by tests or deterministic fixtures.

## Open Questions

- Should `required_version` be exact-only in the first release, or accept semver ranges immediately?
- Should generated commands use `aipr`, `peer-review`, or preserve the exact invoked binary name?
- Should local install detection be advisory only, or should a compatible local install be preferred when a global binary is invoked from the same project?
- What migration command should explicitly advance `tool.required_version` after a package upgrade?
