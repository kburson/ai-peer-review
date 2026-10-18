<!-- ai-peer-review-template version="1" digest="sha256:78e9a634af9d540baaf6790db82952eaf39cf7ab59a6cdc7938319ae07a4cbed" -->

<!-- protected-frontmatter -->

---
schema: "ai-peer-review.response/v1"
review_id: "review-da89bdc7292cb66cf9ea05e908c2f5fd"
role: "reviewer"
turn: 1
commit_mode: "no-commit"
authority_assurance: "unavailable"
artifact_path: "docs/superpowers/specs/2026-10-18-222-review-journal-refactoring-design.md"
artifact_commit: "fa8bf27dd7b917cbb16c988eed8666ed68a367c5"
artifact_blob: "cfd6831c94c49ac787f1dfea20ef91d1b6c70da7"
artifact_digest: "sha256:0dc6616aa4f055b823c8f61fee8a05ee4d5888fc67344ac43ffc50fa889f7805"
agent:
  host: "claude-code"
  provider: "anthropic"
  model_id: "claude-opus-5-5"
  model_display: "claude-opus-5-5"
  session_fingerprint: "sha256:c3c1aa603f6b0f5f6db59dbf72b467887b07c3bd79642f971d06a71028c7b84a"
  identity_source: "runtime"
started_at: "2026-10-18T13:40:35.205Z"
submitted_at: "2026-10-18T13:43:07.939Z"
finding_ids: []
answered_finding_ids: []
acknowledged_supplement_ids: []
---

> **LOCAL JOURNAL MODE** — authority assurance: `unavailable`

## Summary

Independent XPR of revision 5 of `docs/superpowers/specs/2026-10-18-222-review-journal-refactoring-design.md` (artifact digest `sha256:0dc6616a…7805`, commit `fa8bf27`). I checked the spec's code-facing claims against the worktree at `fa8bf27`. I could not check live GitHub issue state, remote refs or npm metadata because this session had no shell or `gh` access. Those observations (§5.1, #217 forecast numbers, issue states) are therefore unverified here.

Verified as stated:

- `src/api/validate.mjs:validateContract` has the described limits. Its `oneOf` branch returns at line 37 before sibling constraints are evaluated. It has no `$ref` or `anyOf` handling. `allOf` is supported only as if/then clauses.
- `schemas/api-response-v1.json` (`$id` `ai-peer-review.api-response/v1`) uses the transport tag `ai-peer-review.response/v1`, and `schemas/response-v1.json` uses the same tag. The contextual-dispatch concern is real.
- `schemas/manifest-v1.json` allows only the four `accepted*` terminal statuses.
- `process-source-assurance.mjs` requires `acceptance.reviewDigest` and `approvalDigest` (lines 113–197). Its hashed contract closure includes `events.mjs`, `compatibility-read.mjs`, `format-authority.mjs` and `api/validate.mjs`.
- The closed branch list in `scripts/ci/verification-scope.mjs` (lines 73–80) does not include `codex/aipr-journal-refactoring`. Other branches fall through to `all`, which includes Windows. `verify-project-receipts.mjs` imports `POSIX_REPAIR_SOURCE_BRANCHES` for its detached mapping.
- The inventoried proof files and the pinned `scripts/lib/review-grammar-v0.4.1/` directory exist.

The direction is sound and well bounded: remove the proof/approval layer, keep the coordination mechanisms and version records honestly. My main concern is the process-source contract in §5.3. The spec understates how far it reaches, and that changes the ordering of the whole cleanup. The other findings are inventory and versioning gaps that follow from it, plus one labelling error.

## Findings

**R1-F001 (major): §5.3 understates the process-source contract closure, and this decides the order of every source-touching cleanup leaf.**

§5.3 says `events.mjs`, `compatibility-read.mjs`, `format-authority.mjs` and `api/validate.mjs` "belong to its hashed source closure". That is true but badly incomplete. `src/protocol/process-source-contract-files.json` lists about 116 files, which is nearly the whole `src/` tree. It includes `src/api/*`, most of `src/broker/*`, `src/cli/{help-data,help-topics,parse}.mjs`, `src/collateral/{paths,responses}.mjs`, `src/config/*`, `src/coordinator/*`, `src/identity/*`, `src/provider/claude-launch*.mjs`, `src/provider/manual-launch-ledger.mjs`, `src/templates/index.mjs` and `src/transport/{manual,resident,registry}.mjs`.

`processSourceContractDigest()` hashes all of these files. `verifyProcessSourceClass` matches a class only if `r.contractDigest === adapterHashes.contractDigest`. So any edit to any listed file leaves every shipped class unmatched. `loadProcessSourceAssurance` still returns an installed object, but its `absence` and `creation` capabilities become `unavailable`.

The ledger shows how this has been handled so far. `src/protocol/process-source-contracts.json` holds classes for about eight different `contractDigest` generations. Each generation was re-admitted with a new `evidenceDigest` and `reviewDigest`, which is exactly the review-as-proof admission this spec removes.

The consequence goes beyond the journal files. The review-only-roles workstream (templates, manual transport, collateral responses, Claude launch restrictions, CLI submission) is also a closure edit. §7 lists "CI bootstrap, process contract/implementation, review-only roles, …" as separate work boundaries but gives no order. §5.3 asks only that the contract be *adopted* "before any affected source edit". Adopting the contract does not keep classes matching; only implementing the separation does.

That leaves two choices for every leaf that edits a closure file before the separation ships:

- (a) Re-admit classes through the review/approval chain the spec is retiring.
- (b) Ship with absence/creation capabilities unavailable. §5.3's own rule, "do not ship a knowingly broken intermediate ownership path", may forbid this. The spec does not say whether capability-unavailable counts as "broken" or as a safe, honest degradation.

**R1-F002 (moderate): The class record format, the shipped ledger and persisted seals are not covered by §4.1 versioning or by the §5 inventory.**

- `validClass` uses `exactKeys`, so `acceptance: {status, evidenceDigest, reviewDigest}` and `approvalDigest` are required by structure. Removing the "obsolete review-approval inputs" (§5.3 category 3) is a breaking change to `ai-peer-review.process-source-class/v1`. Under §4.1 it needs a new class schema version, with the v1 ledger and schema kept as history. The spec never says this for the process-source formats. §4.1 names only the event, manifest, participant and response schemas.
- The ledger `src/protocol/process-source-contracts.json` is itself in the runtime inventory. `loadProcessSourceAssurance` checks its sha256 against `runtime.inventory.entries` (lines 284–292 and 514). Any ledger change therefore also moves runtime-inventory identity.
- `sealedCreation` (lines 439–462) compares `original.creationSource` seals `{classId, contractDigest, approvalDigest, precision}` with the current assurance. Ownership or creation records written by an installed runtime appear to carry `approvalDigest`. Changing the class shape or dropping `approvalDigest` makes existing live owners' seals impossible to verify. This could block legitimate recovery or, if handled carelessly, weaken it. The spec needs an explicit decision on how in-flight and persisted ownership records are read across the change.
- The §5 table omits direct proof/admission consumers that §5.3 depends on:
  - the ledger `process-source-contracts.json`;
  - `schemas/process-source-class-v1.json`, `process-source-conformance-v1.json` and `process-source-registration-v1.json`;
  - `schemas/runtime-contract-adoption-v1.json` and `runtime-contract-evidence-approval-v1.json`;
  - `scripts/lib/runtime-review-grammar-v0.4.1.mjs`, which sits beside the pinned directory;
  - `.github/workflows/process-source-capture.yml` and `resolveCaptureWorkflowContext` / `PROCESS_SOURCE_CAPTURE_BRANCH` in `scripts/ci/verification-scope.mjs`.

  The last item matters for sequencing: §5.2's bootstrap edits the same file that hosts the capture-branch binding for #221, which §6 supersedes. §5 is labelled "initial", but these items gate §5.3's ordering and should be named now.

**R1-F003 (moderate): The current supported-host scope is much narrower than "Linux/macOS", and the spec does not decide whether the replacement keeps or broadens it.**

Every shipped class is scoped to exact builds:

- darwin `25.6.0` on arm64;
- linux `6.17.0-1022-azure` on x64 (a hosted-runner kernel);
- Node 24 or 26 only.

There is no darwin `creation` class at all. On any other Linux or macOS host today, absence and creation are `unavailable`.

§6 (#141 row: "retaining required Linux/macOS coordination guarantees") and AC 6 ("Locks are not stolen…") read as though the guarantees are general. §5.3 asks to "define the supported Linux/macOS observation/reconciliation cases" but does not say which way to go:

- (a) Keep exact-build scoping and admit hosts some non-review way. This is honest but hardly usable.
- (b) Broaden to probe-semantic classes, such as procfs start-ticks or `ps` selection, without a build pin. This strengthens what an observation means and conflicts with §3.2 ("Do not strengthen them by changing labels") unless it is explicitly decided and tested.

Either way it is a product decision that changes behavior, and the spec should require it before Develop.

**R1-F004 (minor): §4.2 calls `response-v1` participant responses "historical", but the current writer still emits them.**

This pending response's protected frontmatter is `schema: "ai-peer-review.response/v1"`, and it matches `schemas/response-v1.json` field for field. `api-response-v1.json`'s description also calls them "legacy participant responses". If the plan carries the "historical" label forward, it may treat the current participant-response format as retired, or add a new response version only to rename it, which §4.1 forbids. AC 4 depends on this being the current documented format.

## Required changes

1. **(R1-F001)** Replace the four-file list in §5.3 with a reference to `src/protocol/process-source-contract-files.json` as the closure's source of truth, and say that it covers most of `src/`. State the ordering rule explicitly: the process-observation separation must be *implemented and delivered* before, or atomically with, the first cleanup leaf that edits any closure file. This includes review-only-role work. Alternatively, define capability-unavailable as an accepted, tested interim state, with its user-visible behavior (refused takeover, recovery guidance) specified. Reflect the chosen order in §7's work boundaries.
2. **(R1-F002)** Apply §4.1 to the process-source formats:
   - Require a new class (and ledger, if affected) schema version for any record without the review-approval fields, and keep v1 as history.
   - Require an explicit compatibility decision for persisted `creationSource` seals that carry `approvalDigest`, and for runtime-inventory changes caused by ledger edits.
   - Add the omitted ledger, schemas, grammar wrapper, capture workflow and capture-branch binding to the §5 table, or at least to the §5.3 prerequisites.
3. **(R1-F003)** In §5.3, require an explicit decision between keeping exact-build host scoping and adopting broadened probe-semantic classes, with the evidence and tests each needs. Qualify the §6 #141 row and AC 6 so the guarantees apply to the supported host cases defined there, not to Linux/macOS in general.
4. **(R1-F004)** In §4.2, call `schemas/response-v1.json` the current participant-response format (the same document family as before, not historical). Keep the requirement that the tag alone must not select between it and `api-response-v1.json`.

## Optional suggestions

1. **Windows and default verification scope.** §7 calls Windows #213 "nonblocking", but §5.2 says "preserve ordinary default scope elsewhere". `resolveVerificationScope` returns `all`, which includes Windows, for any unlisted branch such as trunk, so the eventual parent-to-trunk delivery would run Windows lanes. Say whether that final delivery is in scope here, and whether those lanes count as blocking.
2. **Per-child branch growth.** §5.2 binds every cleanup child branch individually into a frozen list, which grows by one edit per child, and each edit falls under the bootstrap rule. Consider binding a single reserved owner branch, with a test-enforced issue-to-branch map, so later children do not each need a CI-scope change first. Exact-ref matching should stay.
3. **Verifiable AC 3.** "At the actual enforcement level" could be checked by listing, per host and launch mode, the enforcement level actually in force: provider path restriction vs instruction-bound. That list would also show how this manual Claude Code session is instruction-bound.
4. **Unverified observations.** Because this reviewer could not run `gh` or `git`, the author or owner should confirm the §5.1 refresh and the #217 numbers in §7 before adoption, as §5.1 already requires.

## Decision

revisions-requested
