<!-- ai-peer-review-template version="1" digest="sha256:78e9a634af9d540baaf6790db82952eaf39cf7ab59a6cdc7938319ae07a4cbed" -->

<!-- protected-frontmatter -->

---
schema: "ai-peer-review.response/v1"
review_id: "review-05b472f0d8ed4866d16288adb821eaf2"
role: "reviewer"
turn: 2
commit_mode: "normal"
authority_assurance: "unavailable"
artifact_path: "docs/superpowers/specs/2026-09-29-117-broker-recovery-design.md"
artifact_commit: "90c52cf4283247df813e25af81a847d6ed4c03a9"
artifact_blob: "7ce62fbdcf33252525da6011dd65a8a3354b37b9"
artifact_digest: "sha256:e1913f494b40f3ab219b7f701c25bd3f7f4c840d9c1db2da9d8345015566eee4"
agent:
  host: "claude-code"
  provider: "anthropic"
  model_id: "claude-opus-5-5"
  model_display: "claude-opus-5-5"
  session_fingerprint: "sha256:66d3485fe57e23ef8c01f33654561eae3e84297dd36d887c3243dd6a227da51c"
  identity_source: "runtime"
started_at: "2026-09-29T07:42:09.710Z"
submitted_at: "2026-09-29T07:51:54.274Z"
finding_ids: ["R2-F001","R2-F002"]
answered_finding_ids: []
acknowledged_supplement_ids: []
---

Mode: `normal`

## Summary

I re-read the full revised specification at `90c52cf` against author response 1 and the current tree.

All nine round-1 findings are resolved:

- **R1-F001:** Refusal evidence now requires a typed package-local pre-dispatch receipt. It is bound to operation, request, runtime, and evidence. It uses a closed reason set drawn from the two package-local sites (`src/coordinator/service.mjs:121-128`, `src/broker/worker.mjs:84`). Bare labels, adapter refusals, and spawned-Claude selection/version refusals are explicitly blocked. Verification item 2 lists all of these.
- **R1-F002:** Proof scope is limited to package-managed dispatch. Known external observations block retirement. The terminal join/submit protections and the no-cancellation limitation are stated, and CLI/help must repeat them. I accept the author's factual correction that this review was package-launched; the scope concern was general and is now resolved.
- **R1-F003:** The capability-preference branch is removed. The #1841 recovery claim is historical context only. Verification item 1 asserts that no capability marker is consumed.
- **R1-F004:** The full lock order is now stated:
  - broker ownership, then dispatch exclusion, then review mutation;
  - nonblocking fail-closed try-lock;
  - ownership held through append and cleanup;
  - no endpoint or callback during offline acquisition;
  - live settlement before workspace locks;
  - restart on fallback.

  This matches the ownership-then-reconcile ordering in `src/broker/ownership.mjs:89-97`. Verification item 3 covers the race.
- **R1-F005–R1-F009:** Each resolved through the option the author chose: a stated consumed-scope limitation, deferral with recorded evidence, lock-free status reads with a defined zero-write comparison, a recency limitation in the ranking reason, and fuller identity-input guidance.

The revision also adds a new scope rule: a bare `peer-review` alias is permitted when it resolves to the exact installed entrypoint. This loosens a command permission. The spec does not define where or when the resolution is evaluated, and no verification item covers it (R2-F001). I also have one small clarification about how per-attempt pre-dispatch receipts compose within a single wake operation (R2-F002, optional).

## Findings

### R2-F001 — The bare `peer-review` alias rule does not say where resolution happens and has no verification

Location: "Status and scope" paragraph 2 ("A bare `peer-review` command is permitted only when its resolved executable is the exact installed package entrypoint"), and the Verification section, which has no matching item.

Round 1 stated that this issue "will not … loosen the package-generated absolute `node` and CLI paths." The revision replaces that with a conditional loosening, but does not say *where* "resolved executable" is evaluated.

The current builder resolves the alias once, when it generates the command. It walks the *launcher's* `PATH` (`exactPackageAlias`, `src/provider/claude-launch.mjs:37-52`, fed by `pathEnvironment = process.env.PATH`) and emits the string permission `Bash(peer-review join …)`. The reviewer's Claude Bash tool then resolves `peer-review` again at execution time, in its own shell environment. That environment can differ from the launcher's `PATH`: shell-profile snapshots, version managers such as nvm/asdf/volta, and Homebrew prefixes can all change it. Nothing re-verifies the resolution when the command runs.

The result is a concrete failure mode. The permission and hook allow a bare `peer-review join/submit` that runs a *different* installed package from the one validated at generation time. For example, an older global install earlier on the reviewer shell's `PATH` could append protocol events under a different image. The spec itself warns that equal version strings do not imply equal images. A same-path global reinstall between generation and execution also changes the contents behind an unchanged realpath.

This conflicts with the spec's own image-exactness stance. The rule should be pinned down and tested before the scope sentence is accepted.

## Required changes

1. (R2-F001) Define the alias resolution contract, and add a verification outcome for it. At minimum:
   - Evaluate resolution in the environment the reviewer's Bash tool will actually use, or re-verify at hook/execution time. Otherwise fall back to absolute `node` plus CLI paths.
   - State what "exact installed package entrypoint" means: realpath equality and/or content/version identity with the review's pinned image. Say whether a reinstall between generation and execution invalidates the alias.
   - Add verification that covers:
     - an accepted exact alias;
     - a `PATH` shadowed by a different install;
     - a non-symlink or foreign `peer-review` first on `PATH`;
     - a reviewer environment that differs from the launcher `PATH`;
     - fallback to absolute paths.

     Assert that no hook permits a bare command whose execution-time resolution differs.

## Optional suggestions

### R2-F002 — State that a pre-dispatch receipt certifies only its own attempt within an operation

Location: "Evidence and eligibility" paragraph 2 (typed package-local pre-dispatch receipt).

A single wake operation can be attempted more than once. In `reconcileWake`, an operation that already exists as `reserved` from an earlier interrupted `deliver` first goes through `adapter.reconcile()`. If that reports `not-submitted`, it then goes through `deliverReserved`, which can record `refused`/`wake-adapter-unavailable` (`src/coordinator/service.mjs:103-137, 152-162`). A package-local receipt from the last attempt says nothing about the earlier interrupted `deliver` of the same operation ID.

Table row 2 says "attempts" in the plural, so a careful implementer will probably cover this. Consider adding one sentence: a pre-dispatch receipt qualifies only if every prior attempt of the same operation is independently proven undelivered. The adapter-reported `not-submitted` from `reconcile()` does not count as that proof. Consider also adding the case to verification item 2's blocked list.

## Decision

revisions-requested
