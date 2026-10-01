<!-- ai-peer-review-template version="1" digest="sha256:78e9a634af9d540baaf6790db82952eaf39cf7ab59a6cdc7938319ae07a4cbed" -->

<!-- protected-frontmatter -->

---
schema: "ai-peer-review.response/v1"
review_id: "review-05b472f0d8ed4866d16288adb821eaf2"
role: "reviewer"
turn: 1
commit_mode: "normal"
authority_assurance: "unavailable"
artifact_path: "docs/superpowers/specs/2026-09-29-117-broker-recovery-design.md"
artifact_commit: "15d12a98929b7f9e9323fff64e092d5adbfe789e"
artifact_blob: "e7d759eff5c9b52684e0c5a21ff34c9e3ee76830"
artifact_digest: "sha256:d0f97497c5c943cc91ba98ecf5567d94302a16dbd34eb42929c712b88560da01"
agent:
  host: "claude-code"
  provider: "anthropic"
  model_id: "claude-opus-5-5"
  model_display: "claude-opus-5-5"
  session_fingerprint: "sha256:66d3485fe57e23ef8c01f33654561eae3e84297dd36d887c3243dd6a227da51c"
  identity_source: "runtime"
started_at: "2026-09-29T07:42:09.710Z"
submitted_at: "2026-09-29T07:46:12.310Z"
finding_ids: ["R1-F001","R1-F002","R1-F003","R1-F004","R1-F005","R1-F006","R1-F007","R1-F008","R1-F009"]
answered_finding_ids: []
acknowledged_supplement_ids: []
---

Mode: `normal`

## Summary

The design is conservative in the right places. Read-only status stays separate from mutating reconcile. Pinned images and registrations are immutable. Hook denials, session handles, `failed`, and generic errors are explicitly not non-submission proof. The #1841 attempts stay blocked instead of being retired on weak evidence. The fresh-output route is scoped honestly. The verification list is specific and asks for tests that fail first.

I checked the spec's factual claims against the tree at `15d12a9`. They hold:

- `deterministicReviewId` includes `reviews_root` and `review_path_template` but not `record_id` (`src/cli/run.mjs:944-963`).
- The 256/1024-byte diagnostic bounds match `buildClaudeLaunchDiagnostic` (`src/provider/claude-launch-diagnostics.mjs:168-173`).
- `APR_LINEAGE_UNAVAILABLE` is emitted by `src/collateral/review-record.mjs:247` and `src/cli/run.mjs:2215`.

Four areas are still underspecified. In each case, an implementation that follows the text literally could either weaken the safety claim or fail to deliver the intended behavior:

1. The retirement eligibility table treats "refused before delivery" as non-submission, but the recorded evidence cannot distinguish a local refusal from a provider refusal.
2. "Every supported dispatch route" does not say whether out-of-band use of a published invitation is covered.
3. The first-preference ranking signal ("verified evidence of mixed-image recovery support") has no defined evidence source.
4. The new abandon precondition (OS-enforced offline broker ownership) is not placed in the stated lock order.

These need clarification in the spec before the design is accepted.

## Findings

### R1-F001 — "Refused before delivery" is not distinguishable in recorded wake evidence

Location: "Evidence and eligibility" table, row 2 ("Exact launch and wake attempts durably settled as definitely not submitted/refused before delivery"), and the verification item 2 blocked-case list.

The spec treats a refusal as retirement-eligible only when it happened *before delivery*. The wake ledger has a single `refused` status (`src/coordinator/ledger.mjs:14-20`), and it is reached in two ways with very different meanings:

- A package-local refusal before any provider effect: `wake-adapter-unavailable` (`src/coordinator/service.mjs:121-128`) or the worker's `manual-recovery-fence-or-stale-revision` (`src/broker/worker.mjs:84`).
- Any adapter-reported `refused` returned from `adapter.deliver()` or `adapter.reconcile()` (`src/coordinator/service.mjs:75-89, 114, 132`). A provider adapter may legitimately report `refused` after the request reached the provider, for example a provider-side rejection of a delivered wake.

The adapter's `reason` is free text, truncated to 160 characters. The ledger does not record whether the refusal happened before or after delivery. Following the table literally therefore produces a check of `status ∈ {not-submitted, refused}`. The current tree already does exactly this (`src/cli/run.mjs:2089-2091, 2127-2129`; `src/broker/client.mjs:336`), so an adapter's post-delivery refusal would count as proof of non-submission. That contradicts the spec's rule that acknowledged or uncertain delivery is never non-submission, and its rule that "no diagnostic constitutes … retirement authority."

The same ambiguity affects "refused" for Claude launches. An explicit model/effort selection refusal (`APR_REVIEWER_SELECTION_REFUSED`) or a version-floor refusal comes back from a Claude process that was actually spawned. The spec does not say whether these count as "refused before delivery."

### R1-F002 — The "every supported dispatch route" scope for `manual` and `authority` stages is undefined for out-of-band invitation use

Location: "Evidence and eligibility" paragraphs 1 and 3, table row 1, and verification item 2 ("Eligible unsubmitted `manual` … attempts reach a terminal state").

The spec says a `manual` startup "is not proof that no manual reviewer was launched." It closes that gap only for *package-managed* manual launches, through a durable reservation ledger. But the invitation file is published at startup, and its whole purpose is that a human can paste it into any agent session and run `peer-review join`. That is exactly how this review was started. Such a session submits a provider request that no package ledger records. For the Claude adapter, `manualLaunchProvesNonSubmission` looks only at package-written observation and launch-state files (`src/provider/manual-launch-ledger.mjs:69-85`).

So the spec's two statements conflict unless it states its scope:

- "durable evidence proves non-submission across every supported dispatch route"
- manual-stage eligibility being a required test outcome

If human-initiated use of the invitation counts as a dispatch route, `manual`-stage eligibility is effectively unreachable once an invitation exists, and verification item 2 must change. If it does not count, the spec must say that non-submission is proven only for package-managed dispatch, and must name what protects the other routes. The candidates are protocol authority rejecting a late `join`/`submit`, plus the fact that the reservation release happens only after the terminal event. The CLI and help guidance should also say this, so that an author does not read "eligible" as "no provider was ever contacted."

### R1-F003 — The evidence source for the first ranking preference ("verified evidence of mixed-image recovery support") is undefined

Location: "Recovery authority" paragraph 2 and the #1841 paragraph ("Verify that capability against exact image evidence").

Status is read-only. It must not start a broker, initialize adapters, or append evidence. The pinned images carry no sealed capability declaration for mixed-image or recovery-only support. The only version fields in the handshake are `package_version`, `broker_protocol_version`, and `node_major` (`src/broker/ipc.mjs:78-82`), and `src/broker/runtime-image.mjs` has no capability field.

The spec forbids inferring capability from version strings or digests, and says historical pinned code is immutable. Neither #1841 image can carry new capability metadata. Status therefore has no permitted, read-only source for this preference, and ranking silently falls back to recency on every real input. The instruction to "verify that capability against exact image evidence" has the same problem: it does not say what artifact counts as that evidence or who produces it.

Implementers will either invent an unreviewed marker or skip the preference without saying so. Verification item 1 cannot test the preference branch in either case.

### R1-F004 — The new abandon precondition "OS-enforced offline broker ownership" is not placed in the lock order

Location: "Mutation and race safety" paragraph 1 ("Use the established lock order: dispatch exclusion first, then the review mutation lock. Before terminalization, broker-owned startup requires … authenticated worker settlement or OS-enforced offline broker ownership").

The stated order covers two locks. Proving offline broker ownership means taking the project broker ownership lock (`platform.acquireExclusive(paths.lock, …)` in `src/broker/ownership.mjs:89`). The broker then runs its `reconcile` callback while holding that lock (`src/broker/ownership.mjs:97`). That callback reconciles registrations and review workspaces, which needs per-workspace dispatch exclusion, giving the order broker ownership → dispatch.

If abandon takes dispatch exclusion first and then waits on broker ownership, the order is inverted. A blocking `acquireExclusive` implementation could deadlock. A try-lock implementation fails spuriously whenever a broker is starting. The spec also does not say how long abandon must hold broker ownership. If abandon releases it before the terminal event, a broker can start and dispatch between the check and the append, and the dispatch-exclusion recheck is the only guard against that.

The spec should state the full order, either broker ownership → dispatch exclusion → review mutation lock or an explicit try-lock/fail-closed rule, and should state the hold scope. Verification item 3's barriers should include abandon racing a broker start.

## Required changes

1. (R1-F001) Split non-submission refusal evidence by where the refusal happened:
   - Define which recorded outcomes count as pre-delivery. For example: an explicit, closed set of package-local refusal reasons, or a new adapter contract under which `refused` means pre-delivery and anything else must be `acknowledged` or `outcome-unknown`.
   - State that adapter-reported refusals without that guarantee, provider selection refusals, and version-floor refusals from a spawned Claude process are not non-submission proof.
   - Add these cases to verification item 2's blocked list.
2. (R1-F002) State the dispatch-route scope for non-submission. Either:
   - declare out-of-band invitation use in scope, and adjust manual-stage eligibility and verification item 2 to match; or
   - declare proof limited to package-managed dispatch, name the protocol-authority protections that cover other routes, and require CLI/help wording that does not claim no provider contact.
3. (R1-F003) Define the concrete, read-only evidence artifact for "mixed-image recovery support." For example, a prior authenticated reconcile receipt bound to the candidate runtime digest and the exact registration set. Alternatively, remove the preference and rank by recency only. Update the #1841 paragraph and verification item 1 to match.
4. (R1-F004) Extend the lock-order statement to cover broker ownership: its position relative to dispatch exclusion and the review mutation lock, blocking versus try-lock and fail-closed behavior, and hold scope through the terminal append. Add an abandon-versus-broker-startup barrier to verification item 3.

## Optional suggestions

### R1-F005 — Cleanup-pending recovery depends on an author session that may no longer exist

Location: "Mutation and race safety" paragraph 4 ("an exact retry by the same actor/reason must finish owned cleanup").

The actor is the sealed author session fingerprint. If the process crashes between the durable terminal event and the reservation release, and the author session has ended, no party can ever finish the cleanup. The spec already says an exact `start` retry must not recreate or release the reservation. The terminal review then holds its collateral reservation permanently. Under the spec's own rule, reusing that output scope "requires qualifying terminalization," which is present, yet the stale reservation blocks it.

This is a liveness gap, not a safety gap. Consider naming a recovery path: any authenticated author of the same review, or a bounded `broker reconcile` step, may release an owned reservation once a terminal event exists. Alternatively, state explicitly that the reservation is permanently retained and that the output scope is permanently consumed.

### R1-F006 — The Claude version-floor diagnostic needs a defined outcome if fixture capture finds no structured envelope

Location: "Claude launch diagnostics" paragraph 1.

The spec correctly requires a captured provider fixture before implementation and forbids searching stderr. Version-floor failures from CLI tools are often emitted as plain-text stderr, or as an unstructured message inside a generic error envelope. The spec does not say what happens if the captured fixture shows no allowlistable code or fields. "Narrowly specified structured-message pattern" could be read as permitting a regex over a message string, which comes close to the forbidden stderr search.

Consider stating that if no structured code or field is observed, the version diagnostic is deferred and the decision is recorded in acceptance evidence. The generic classification would stay unchanged, and no message-text pattern would be adopted without its own review. This keeps the rest of the issue deliverable without pressure to loosen the parser.

### R1-F007 — Clarify how status reads under concurrent writers without writing lock files

Location: "Recovery authority" paragraph 1 ("Reading status must not repair reservations, append evidence…"), and verification item 1 ("zero status writes").

Taking any review or dispatch lock creates or touches lock files, so a strict "zero writes" assertion rules out lock-based consistent reads. Consider stating that status reads without locks, and that a torn or changing read is reported as unverifiable rather than retried under a lock. Also consider defining exactly which filesystem changes the zero-writes test compares, for example a byte/inode snapshot of the scratch and broker directories.

### R1-F008 — Note that recency ranks reviews, not images

Location: "Recovery authority" paragraph 2.

Creation time orders *reviews*. A later review can pin an *older* image, for example one started from a different installed package or worktree. The spec already calls recency a heuristic. Consider adding one sentence saying the ranking reason printed by status names this limitation, so that "newest" is not read as "newest code."

### R1-F009 — Record the fresh-output identity inputs in guidance

The deterministic review ID also changes when `artifact_head` or `author_fingerprint` changes (`src/cli/run.mjs:946-962`), and `reviews_root` feeds the ID as the raw, un-normalized argument. Help could say that the new review ID and paths must be verified by inspection, as the spec already requires, rather than predicted from which flag changed. It could also warn that equivalent spellings of the same root (for example a trailing slash) can yield a new ID for the same destination directory. Output-collision checks then become the real guard.

## Decision

revisions-requested
