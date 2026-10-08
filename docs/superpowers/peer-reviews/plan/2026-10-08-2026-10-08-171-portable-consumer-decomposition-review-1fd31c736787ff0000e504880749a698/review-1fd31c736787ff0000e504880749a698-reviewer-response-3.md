<!-- ai-peer-review-template version="1" digest="sha256:78e9a634af9d540baaf6790db82952eaf39cf7ab59a6cdc7938319ae07a4cbed" -->

<!-- protected-frontmatter -->

---
schema: "ai-peer-review.response/v1"
review_id: "review-1fd31c736787ff0000e504880749a698"
role: "reviewer"
turn: 3
commit_mode: "normal"
authority_assurance: "unavailable"
artifact_path: "docs/superpowers/plans/2026-10-08-171-portable-consumer-decomposition.md"
artifact_commit: "d146eec71bf636ed93d5ad7aae7773f9a7e4f148"
artifact_blob: "dd4d331c3fc20bbe60bf2b80d57d5423ce743e25"
artifact_digest: "sha256:94724c40f140e8cb2be97d6099e2241fcd8f1ed5293a85cdae799fd8a21b9d80"
agent:
  host: "claude-code"
  provider: "anthropic"
  model_id: "claude-opus-5-5"
  model_display: "claude-opus-5-5"
  session_fingerprint: "sha256:30bcadcebf970eea4d15c3089f78752c74407a7bb1cc034923c1733bbfe93baf"
  identity_source: "runtime"
started_at: "2026-10-08T10:17:10.872Z"
submitted_at: "2026-10-08T10:42:49.012Z"
finding_ids: ["R3-F001"]
answered_finding_ids: []
acknowledged_supplement_ids: []
---

Mode: `normal`

## Summary

I re-reviewed the revised plan (artifact commit d146eec, blob dd4d331c) against author response 2 and the current source tree. All turn-1 resolutions still hold in this revision. Both turn-2 required findings and the optional suggestion are resolved, and I verified the author's factual claims against source.

**R2-F001 — resolved.** Shared Interfaces now state that the derived contract includes all of C1's transitive evaluation-time imports and literal lazy imports. That covers C3/C4 owner and election, process observations, readiness/connection and the #140 HTTP modules. `portable-system` is described as a direct interface, not a leaf closure. Global Constraints now say "Edits to any module in the derived closure invalidate 524b".

The non-JS policy is explicit:

- only the class schema and the generated manifest are pinned data inputs;
- any other JSON or non-JS import inside the closure refuses generation;
- Task 2 removes `portable-ownership.mjs`'s static `package.json` import.

I confirmed the substitution the plan names is real and already in use in the same module:

- `portable-ownership.mjs:469-471` sets `package_version` from `verifyRuntimeInventorySync({ packageRoot: loadedInstallation }).packageVersion`;
- `runtime-inventory.mjs:250` returns `packageVersion: metadata.version`, read at runtime and not through a module import;
- the only static JSON use to remove is at line 207.

I checked the imports of the rest of the closure: `storage-protection`, `ownership-election`, `portable-owner-lifecycle`, `owner-readiness`, `owner-connection`, `portable-ownership-core`, `portable-reconciliation`, `owner-lifecycle-core`, `owner-publication-core`, `portable-paths`, `http-server`, `http-client`, `http-auth`, `process-identity`, `runtime-inventory`, `canonical-json` and `errors`. None of them imports JSON or `protocol/compatibility.mjs`, the other `package.json` importer. So `portable-ownership.mjs` is the only extraction currently needed. Task 2 also owns any further mixed-metadata split the derivation reveals.

This choice keeps the existing "excludes unrelated package bytes" property (`process-source-assurance.test.mjs:125-150`). Installed-current inventory still independently verifies metadata, dependencies and selection authority. The Task 2 RED cases cover:

- an unexpected JSON import;
- a covered owner/HTTP edit changing the digest;
- a metadata-only edit leaving the code digest unchanged;
- a stale or tampered inventory refusing the real owner effect.

**R2-F002 — resolved.** The Task 1 walker now treats literal `new URL(relative, import.meta.url)` and `fileURLToPath` targets, and path/alias bindings, that flow into `execFile`/`spawn`/`fork`/`Worker` or an injected launcher as process-entry edges. The flow is tracked through arguments, parameters and arrays. Unresolved targets on reachable modules block. Stock external probe executables get a separate, finite provenance classification and cannot excuse a repository native-build launch.

Both `scripts/build-broker-security.mjs` and `bin/peer-review-broker.mjs` are inventoried, and there is a URL-spawned native-build RED fixture. Task 4 removes the native `build` command and `io.buildBrokerSecurity` from the portable CLI, returning an honest unsupported-command response. Any #143 legacy entry stays separate and unreachable. These match the real sites at `run-core.mjs:5220-5231` and `client-core.mjs:290`.

**R2-F003 — resolved.** The evaluation-order rationale is added: the back-edge from the lazy C1 import lands on modules that have already finished evaluating, so there is no TDZ. The import-order RED check exercises the awaited invocation.

**Carried forward:**

- **Estimate.** The 32-hour base WBS (8+6+4+6+6+2) is recorded. The 36.5-hour forecast is historical pending native re-estimation; nothing is reduced, and every child stays below 24 hours.
- **Original obligations.** Original #171, #141 Task 6 and #107 Task 2 obligations, genuine recapture, real target-OS journeys and all 15 later #107 release gates remain owned.

**Verification limits.** Shell execution was not available to me, so all checks were done by reading the cited files and import statements. I ran no test, generator or closure derivation. This acceptance establishes plan consensus only. It is not implementation, capture or installed-operational acceptance.

## Findings

None.

## Required changes

None.

## Optional suggestions

### R3-F001 — Note the call-site context for the line-207 package-version substitution

`portable-ownership.mjs:207` sits in a different function from the acquisition path at line 469, which already holds `loadedInstallation`. When Task 2 makes the substitution, take the version from the same freshly verified installed inventory used for that owner observation. Do not add a second, unrelated inventory read that could observe a different generation. A one-phrase note in the Task 2 Files entry would make this explicit.

## Decision

accepted
