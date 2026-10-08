<!-- ai-peer-review-template version="1" digest="sha256:78e9a634af9d540baaf6790db82952eaf39cf7ab59a6cdc7938319ae07a4cbed" -->

<!-- protected-frontmatter -->

---
schema: "ai-peer-review.response/v1"
review_id: "review-1fd31c736787ff0000e504880749a698"
role: "reviewer"
turn: 2
commit_mode: "normal"
authority_assurance: "unavailable"
artifact_path: "docs/superpowers/plans/2026-10-08-171-portable-consumer-decomposition.md"
artifact_commit: "ff6215232a73d96250f8d3b6f55ee2996f5f8ce7"
artifact_blob: "02464ee655266b8cacc0f40b7d5a78e67f36ede6"
artifact_digest: "sha256:542ede0b72fb482ff873a3eb7446cc75e8cb49c321deb0bbd7261fa3dee9f3f9"
agent:
  host: "claude-code"
  provider: "anthropic"
  model_id: "claude-opus-5-5"
  model_display: "claude-opus-5-5"
  session_fingerprint: "sha256:30bcadcebf970eea4d15c3089f78752c74407a7bb1cc034923c1733bbfe93baf"
  identity_source: "runtime"
started_at: "2026-10-08T10:17:10.872Z"
submitted_at: "2026-10-08T10:40:02.253Z"
finding_ids: ["R2-F001","R2-F002","R2-F003"]
answered_finding_ids: []
acknowledged_supplement_ids: []
---

Mode: `normal`

## Summary

I re-reviewed the revised plan (artifact commit ff62152, blob 02464ee6) against author response 1 and the current source tree.

**Turn-1 dispositions.**

- **R1-F001 — accepted in principle.** The hand-kept ten-path list is replaced by a closure that is derived mechanically and pinned in a generated manifest (Task 1 `deriveProcessSourceContract`, Task 2 generator and manifest). Task 2 adds RED checks for missing and extra entries, and the plan states that a newly reachable guard change invalidates the class. The cycle is broken through a lazy literal import inside `portable-system.mjs`, and fresh-process import-order RED checks are added. However, following the actual lazy closure exposes a scope consequence the plan does not settle (R2-F001 below).
- **R1-F002 — resolved.** Task 3 now owns `worker-factory-core.mjs`, `worker-factory.mjs`, `worker.mjs` and `provider-bridge.mjs`. It has a RED at the real effect sites, where `launchReviewer` and `deliverToSession` must not be invoked after a rejection. Task 1 adds an inventory/lint rule for unawaited lease calls.
- **R1-F003 — mostly resolved.** The plan now says:
  - reachability is conservative, module-level and transitive;
  - neutral helpers imported from a mixed native module are forbidden;
  - injected handles are attributed by interprocedural taint analysis that does not rely on method names;
  - Task 4 owns the `ipc.mjs`/`platform.mjs` neutral-helper split into `broker-protocol.mjs`;
  - `run-core`'s `inspectPlatformSecurity` path is removed or isolated.

  One class of edge is still not modelled (R2-F002 below).
- **R1-F004 — resolved.** The Task 2, 3, 4 and 6 verification commands now include the missing integration files.
- **R1-F005 — resolved.** The interim state between Task 2 and Task 5 is stated explicitly, and Task 2 tests pin the fail-closed state.
- **R1-F006 — resolved.** Selection-store construction is definition-only.

**Estimate.** The revised base allocation of 32 hours is recorded honestly. The 36.5-hour forecast is kept as historical pending native re-estimation, nothing is reduced, and every child remains below 24 hours.

**Verification limits.** Shell execution was not available to me in this reviewer session. All observations come from reading files: import statements and the cited lines. I did not run the existing tests or derive a closure mechanically.

## Findings

### R2-F001 — The derived contract closure pulls the C3/C4 owner and HTTP stack and `package.json` into the source contract, and the plan does not decide whether that is intended (Medium)

`portable-system.mjs` lazily imports C1 (`src/broker/storage-protection.mjs`), and the plan correctly requires the walker to include that lazy closure. But C1 is not a leaf module. At module evaluation:

- `storage-protection.mjs:17` imports `ownership-election.mjs` (C3), and `storage-protection.mjs:24` imports `portable-owner-lifecycle.mjs` (C4).
- `ownership-election.mjs:7-17` imports `process-identity`, `process-source-assurance`, `owner-lifecycle-core`, `portable-owner-lifecycle` and `portable-paths`. It also has literal dynamic imports of `./portable-ownership.mjs` at lines 708 and 806.
- `portable-owner-lifecycle.mjs:8-37` imports `owner-connection`, `owner-readiness`, `runtime-inventory` and `process-source-assurance`.
- `owner-readiness.mjs:3,7` imports `http-server.mjs` and `portable-ownership.mjs`.
- `owner-connection.mjs:6-7` imports `http-auth.mjs` and `http-client.mjs`.
- `portable-ownership.mjs:18` contains `import packageJson from '../../package.json' with { type: 'json' }`. Its only use is `package_version` at line 207.

The derived closure of `process-source-assurance.mjs` therefore grows from ten files to roughly the whole portable owner, election and #140 HTTP stack, plus `package.json`. Two consequences are left undecided.

1. **`package.json` conflicts with an existing test property.** `test/unit/process-source-assurance.test.mjs:125-150` ("source contract … excludes ledger and unrelated package bytes") rewrites `package.json` and asserts the contract digest is unchanged. A faithful closure walker that follows static JSON imports puts `package.json` in the manifest. Then:
   - that test fails;
   - every version bump or dependency edit invalidates every accepted class and forces genuine multi-OS recapture plus normal class review for each release.

   A walker that silently skips JSON imports would violate the plan's own "unknown imports refuse / no omitted files" rule.

   Failure scenario: the Task 2 implementer has to choose between breaking an existing pinned property and adding an unreviewed exclusion. Either choice changes what an approved class binds, without plan authority.
2. **Owner and HTTP edits become covered edits that the plan does not budget for.** Task 4 composes the #140 HTTP and owner lifecycle and may legitimately touch `owner-readiness`, `http-server`, `owner-connection` or `portable-ownership`. Under the derived closure, each of those edits is a contract edit. Task 4's "Update the source closure for any resulting covered edits" sentence handles the mechanics. However, the plan still describes the frozen set as "selection-core/wrapper edits" (Global Constraints) and calls `portable-system` a module with "only stock OS/path and protection operations". That understates what actually enters the contract and what Task 5 must recapture.

### R2-F002 — The verifier does not model process-spawn and URL entry edges, so a reachable native build path passes a module-level check (Medium)

Two places start other repository scripts by URL rather than by import:

- `src/cli/run-core.mjs:5220-5231` (the `build` command) resolves `new URL('../../scripts/build-broker-security.mjs', import.meta.url)` and runs it with `execFile(process.execPath, [script, '--nodedir', nodeRoot])`. `run-core.mjs` is module-reachable from `bin/peer-review.mjs`.
- `src/broker/client-core.mjs:290` resolves `bin/peer-review-broker.mjs` the same way and spawns it.

Neither is an import or a dynamic-import edge. The revised reachability definition ("static and literal dynamic import/re-export edges", taint seeded from `platformSecurity`/`inspectPlatformSecurity`/`loadBinding`) would not see either one.

The Global Constraint says "no native build/load/download … on portable operational paths". Original #141 Task 6 says the legacy build/load branches "must already be unreachable from C6 portable operations".

Failure scenario: Task 6 default enforcement passes with `peer-review build broker-security` still live in the portable CLI module and spawning the native toolchain. No inventory row, owner or disposition records it. This is exactly the "edge reaches native code or lacks an owner" case of Review Focus 4.

The broker-entry spawn is benign once `bin/peer-review-broker.mjs` is migrated. It still needs to be a modelled edge so that the broker entry's closure is attributed to the client path that launches it.

## Required changes

1. **R2-F001.** Settle what the derived closure covers:
   - State explicitly that the derived closure includes C1's transitive evaluation-time imports: the C3/C4 owner and election stack and the #140 HTTP modules. Replace the "selection-core/wrapper edits" and "only stock OS/path and protection operations" wording with "edits to any module in the derived closure".
   - Decide the policy for JSON and other non-JS imports. Either:
     - (a) include `package.json` in the contract, update the existing `process-source-assurance.test.mjs` "excludes unrelated package bytes" property accordingly, and record that every version or dependency edit requires recapture; or
     - (b) in Task 2 (or Task 4), remove the `package.json` import from closure modules. For example, supply `package_version` from the pinned runtime inventory or as an injected value outside the contract. Then keep the existing exclusion test and make the walker refuse any JSON import other than the class schema and the manifest.

   Whichever option you choose, add a RED check for it.
2. **R2-F002.** Model process-spawn edges in the verifier:
   - Extend the Task 1 walker so that a literal `new URL(<relative>, import.meta.url)` or `fileURLToPath(...)` target that flows into `execFile`/`spawn`/`fork`/`Worker` (or into an injected launcher such as `io.buildBrokerSecurity`) is treated as a process-entry edge. Unresolved spawn targets in reachable modules should be blockers.
   - Inventory `scripts/build-broker-security.mjs` and `bin/peer-review-broker.mjs` as targets of these edges.
   - Give the `build` command an explicit Task 4 disposition: remove it from the portable CLI, or move it to a separate #143-owned entry that no portable entry reaches. #143 owner text alone is not enough.
   - Add a Task 1 RED fixture in which a reachable module spawns a native-build script by URL.

## Optional suggestions

### R2-F003 — Document why the lazy C1 import cannot recurse at evaluation time

The lazy C1 import from `portable-system` runs only after selection modules finish evaluating. Its transitive `process-source-assurance` → `runtime-selection` edge therefore lands on already-evaluated modules, and no TDZ is possible. A one-line rationale next to the fresh-process import-order RED would help a later reviewer see why the cycle is safe, rather than merely tested.

## Decision

revisions-requested
