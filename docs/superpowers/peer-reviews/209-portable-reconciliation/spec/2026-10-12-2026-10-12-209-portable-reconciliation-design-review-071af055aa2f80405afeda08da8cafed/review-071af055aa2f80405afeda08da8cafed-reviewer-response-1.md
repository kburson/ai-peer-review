<!-- ai-peer-review-template version="1" digest="sha256:78e9a634af9d540baaf6790db82952eaf39cf7ab59a6cdc7938319ae07a4cbed" -->

<!-- protected-frontmatter -->

---
schema: "ai-peer-review.response/v1"
review_id: "review-071af055aa2f80405afeda08da8cafed"
role: "reviewer"
turn: 1
commit_mode: "normal"
authority_assurance: "unavailable"
artifact_path: "docs/superpowers/specs/2026-10-12-209-portable-reconciliation-design.md"
artifact_commit: "32904e0d573987455dac7916293ce1dc50bd6d6c"
artifact_blob: "cf0a1a77a71fbd28d8727f4ffca4050da0e9f93a"
artifact_digest: "sha256:3add0088ef898106cb97c1b932b51f984f75a60f47349a50d487ac6311e1961c"
agent:
  host: "claude-code"
  provider: "anthropic"
  model_id: "claude-opus-5-5"
  model_display: "claude-opus-5-5"
  session_fingerprint: "sha256:bb08761a852bbd80b75a86caf1b80d91ada22393fa0b77ab36d3c9e1b3c243a7"
  identity_source: "runtime"
started_at: "2026-10-12T19:21:54.010Z"
submitted_at: "2026-10-12T19:25:49.956Z"
finding_ids: ["R1-F001","R1-F002","R1-F003","R1-F004","R1-F005","R1-F006","R1-F007","R1-F008","R1-F009"]
answered_finding_ids: []
acknowledged_supplement_ids: []
---

Mode: `normal`

## Summary

The spec's direction is sound. The current observer is a permanent `unknown` stub (`src/broker/portable-reconciliation.mjs:7-43`), and the spec replaces it without loosening anything:

- A caller callback or copied object never grants clearance.
- Process death never discharges provider or manual effects.
- Orphan review transactions remain evidence.
- The observer performs no writes.
- Pure classifier results stay `verified:false`.

The spec's statement of the current gap is accurate. The core only accepts `status === 'clear'` with zero obligations (`src/broker/portable-ownership-core.mjs:166-174`), and the service still passes `reconcile: async () => {}` (`src/broker/portable-service.mjs:88`).

I checked the design against the stores and call sites in the tree at `32904e0`. Two parts of the design cannot work as written:

1. The spec requires every store to be observed through C1's protected root guard and protected parents, and it forbids ACL rewrites. But the project registration store and review transaction directories are not C1 protected roots. A literal implementation can never return `clear`. Alternatively, an implementer would have to silently weaken the stated guarantee.
2. The spec reasserts "every retained directory membership and relevant file generation" before publication. But worker restoration runs between owner creation and publication, and it writes to those same stores. Any project with a restorable registration would then refuse its own startup.

Four more gaps need explicit decisions:

- how restorable state maps onto the core's `clear` contract;
- provider records left by a crashed broker, which have no existing discharge route;
- startup availability when account-wide stores change in other worktrees;
- the closed vocabulary for project scratch entries.

## Findings

### R1-F001 — Project and review stores are not C1 protected roots, so the mandated observation model cannot produce `clear`

Location: "Complete protected observation", paragraphs 1 and 4, the Registry/Wake/Manual table rows, and the "No ACL rewrite" scope exclusion.

The spec puts all enumeration on "C1's genuine protected root guard" and says it "verifies current principal/protection/root/parent identity". It requires that "Child roots are opened through genuine protection observations" and that "Directory absence must be observed beneath a retained, protected physical parent."

In the tree, only two directories are C1 protected roots: `.scratch/peer-review/private` and `.scratch/peer-review/runtime` (`src/broker/portable-paths.mjs:57-66`, which `src/broker/portable-service.mjs:70-81` provisions). The authority-bearing project stores sit outside those roots:

- The registration store is `.scratch/peer-review/broker/registrations`. It is validated with `inspectOwnedDirectoryChain`/`lstat`/`readdirSync`, not with a protection receipt (`src/broker/registry.mjs:322-345, 801-856`).
- Review transactions are discovered by plain `readdirSync` of `.scratch/peer-review` and `.scratch/peer-review/reviews` (`src/broker/registry.mjs:628-677`).
- In this worktree, the live review transaction `.scratch/peer-review/review-071af055…` is mode `0755`. So are its `dispatch/`, `provider/`, `responses/`, `startup/` and `locks/` subdirectories.
- C1 protection requires owner-only access: `provisionProtectedRoot` enforces the euid owner, `chmod -N` and `0700` (`src/broker/storage-protection.mjs:779-791`). An ordinary `0755` review directory therefore observes as unverified.

The account stores also use different mechanisms:

- Manual resources: each per-key directory is its own C1 root, but its parent `manual-resources` directory is not a provisioned root (`src/broker/manual-recovery-resource.mjs:49-60`).
- Provider resources use a separate `platform.openPrivateDirectory` chain (`src/broker/provider-resource-core.mjs:144-197`).

The spec must therefore say how each store is actually observed. Read literally, either production never reaches `clear` (today's refusal, with extra steps), or an implementer quietly substitutes ordinary `lstat` reads and still claims the "protected" guarantee. The two are not equivalent. Ordinary project scratch can be changed by any process running as the same user, while C1 roots also reject foreign principals and ACL drift.

### R1-F002 — Publication-time reobservation conflicts with worker restoration, which writes to the observed stores

Location: "Production boundary" paragraph 3 ("asserts it immediately before quarantine, creation and publication"), "State classification and restoration" paragraph 1, and "Original context and concurrency" paragraph 2.

The production order is:

1. `preparePortableOwner` reconciles, quarantines and creates (`src/broker/portable-ownership-core.mjs:166-204`).
2. `startBroker` adds a worker for every registration, settles the workers, and starts the server (`src/broker/service-core.mjs:297-299`).
3. Only then does it call `owner.publish()` (`src/broker/service-core.mjs:301`).

Restoration in step 2 is not read-only:

- `worker.start()` runs `reconcileLaunch()` and may start the coordinator (`src/broker/worker.mjs:160-169`). The coordinator performs wake/launch effects and appends review events.
- `settleWorkers` calls `worker.suspend()` on `recovery-only` workers, and `suspend()` runs `persistRecovery()` (`src/broker/service-core.mjs:129-143`, `src/broker/worker.mjs:199-207`). That writes the per-review suspension/fence state the spec lists under "Manual".

If the publication assertion "freshly reobserves every retained directory membership and relevant file generation", the broker's own restored workers will have changed those generations. Startup will then refuse whenever there is at least one restorable or recovery-only registration, and that is exactly the case the repair exists to enable. If the assertion skips them, the spec never says which generations are exempt, or why the exemption is safe.

There is a related gap. The service re-derives its worker set independently with `reconcileRegistrations` (`src/broker/portable-service.mjs:105-106`), and nothing binds that set to the set the observation classified as restorable. A registration that appears or changes between the observation and `registry.list()` would be restored without ever having been classified.

### R1-F003 — The mapping from dispositions to the core's `clear` contract is not specified

Location: "Production boundary" paragraph 2 and "State classification and restoration" paragraph 1.

The core proceeds only when `status === 'clear'` and `outstandingObligations` is empty (`src/broker/portable-ownership-core.mjs:169-174`). The spec names several registry dispositions: empty, terminal/preserved, durably manually fenced, and restorable. It does not say which of them yield `status:'clear'` with zero obligations.

It also does not say where the restorable set (and its retained generations) is carried for R1-F002's binding. That cannot be the frozen public observation, because the spec keeps that bounded and private. If restorable registrations surface as obligations, the core refuses. If they are folded into `clear`, the spec must say so and must say how the private record carries them to the service. This decision determines whether the repair enables startup in the common case at all.

### R1-F004 — Provider records left by a crashed broker have no existing discharge route, so the project is blocked permanently

Location: "State classification and restoration" paragraphs 2–3, and the #190 crash/reclaim journeys under "Verification and delivery".

A provider-resource record binds `owner_project_root_digest`, `instance_id` and `nonce_digest` (`src/broker/provider-resource-core.mjs:199-231`). Reacquisition refuses any prior record whose instance or nonce differs, with "Foreign provider-resource evidence requires explicit recovery" (`src/broker/provider-resource-core.mjs:443-456`). Only the live lease holder can remove the record (`src/broker/provider-resource-core.mjs:606-622`). I found no other producer of `reconciled-recovery` and no explicit-recovery command for a dead holder.

The spec makes same-project provider records blockers "unless the existing producer establishes the exact permitted disposition", and it forbids any new discharge rule. Together these mean that any broker crash while it holds a provider resource blocks portable startup for that project permanently, with no named recovery route.

That is a defensible safety stance, but the spec has to state it. It also affects #190: its "real installed startup/crash/reclaim" journey must either crash only while no provider resource is held, or it will fail on this blocker by design.

### R1-F005 — Account-wide store churn from other worktrees can cause spurious refusals that are reported as not retry-safe, inside a 30 s budget

Location: "Complete protected observation" paragraph 3 ("Names … and membership must remain unchanged"), and "Original context and concurrency" paragraph 2 ("Their concurrent changes invalidate the reconciliation observation").

`manual-resources` and `provider-resources` are account-wide (`src/broker/manual-recovery-resource.mjs:49-50`, `src/broker/provider-resource-core.mjs:158-162`). Under the spec's membership-equality rule, any other worktree acquiring or releasing a resource between observation and publication invalidates this worktree's startup. That window covers worker restoration (R1-F002). `boundedOwnershipError` always reports `retrySafe:false` (`src/broker/portable-ownership.mjs:114-115`), so a harmless foreign change surfaces as a non-retryable failure.

There is also a cost problem. Every genuine protection observation spawns a subprocess: `/bin/ls -ldne` on macOS (`src/broker/storage-protection.mjs:455`), or `windowsProbe` on Windows. Opening each per-key manual root therefore costs one or more processes, all inside the single 30000 ms startup budget. The #189 Windows timing history makes that a realistic failure mode. The spec bounds the entry count but does not say how the budget is shared, or what a user sees when the count bound or deadline is the reason for refusal.

### R1-F006 — The closed vocabulary for `.scratch/peer-review` entries and incomplete review directories is undefined

Location: "Complete protected observation" paragraphs 3 and 5 ("Classify unrecognized entries … as unresolved"; "Unknown authority-bearing names are never silently dropped").

Today's reader excludes `reviews`, `broker` and `runtimes`, and it silently ignores directories that have neither `startup-request.json` nor `events.jsonl` (`src/broker/registry.mjs:631-642`). It does not list `private` or `runtime`, which are the C1 roots in the same directory.

The spec makes unknown entries unresolved but does not enumerate the known non-review entries. It also does not define how a review directory created before `startup-request.json` was written should be classified, for example after a crash between `mkdir` and the journal write. Read literally, such an empty directory blocks startup forever. Read against current behavior, it is silently dropped, which the spec forbids.

## Required changes

1. (R1-F001) Add a per-store observation authority table that states, for every store:
   - its exact root;
   - the authority mechanism used: a C1 protected root receipt (private/runtime, per-key manual roots); the provider `openPrivateDirectory` chain; or ordinary owned-directory identity checks for project scratch, registrations and review transactions;
   - the tamper model that mechanism actually provides.

   Restate "Directory absence … beneath a retained, protected physical parent" and the C1 enumeration operation so they apply only where a protected parent really exists. For ordinary project scratch, specify the substitute: a retained directory identity with stable before/after enumeration, plus the existing `inspectOwnedDirectoryChain`/`physicalDirectory` checks. State explicitly that this does not claim C1 principal protection. Keep "No ACL rewrite".
2. (R1-F002) Specify how the owner-effect assertion relates to worker restoration. Recommended:
   - (a) The private observation carries the exact restorable/fenced registration set with its generations.
   - (b) The service restores exactly that set. It binds `registry.list()` to it, or asserts equality, rather than re-deriving it independently.
   - (c) Before publication, the assertion requires unchanged namespace membership (no new registration, review transaction or same-project resource) and unchanged generations for non-restored entries and account resources.
   - (d) For restored workspaces, the assertion delegates to each worker's own retained generation, written under the held broker election, instead of the pre-restoration snapshot.

   Add a RED control in which a restorable registration plus a recovery-only suspension still reaches publication, and one in which a new registration that appears after observation refuses.
3. (R1-F003) State which dispositions produce `status:'clear'` with zero obligations: empty, terminal/preserved, durably fenced, and restorable. State that restorable entries are carried only in the private record, never as public obligations, and that every other disposition produces bounded obligations and a non-clear status.
4. (R1-F004) State that a same-project provider-resource record from a non-live instance is a terminal operator obligation with no automatic or startup-time discharge. Name its bounded refusal reason and its existing recovery route; if none exists, record a follow-up issue. Constrain the #190 crash/reclaim journey to crash points with no held provider resource, or record that journey's expected refusal for a held resource.
5. (R1-F005) Scope invalidation for account stores:
   - Changes to entries associated with this project, and any newly added entry, require fresh association validation and refuse only if the entry is same-project or ambiguous.
   - Changes to a previously validated foreign entry trigger revalidation, not unconditional refusal.

   Also state the entry-count bound, how the 30000 ms budget is shared across per-root protection observations, and the distinct refusal reasons for count overflow and deadline exhaustion.
6. (R1-F006) Enumerate the closed set of known non-review entries under `.scratch/peer-review`: at least `private`, `runtime`, `runtimes`, `broker` and `reviews`. Define the disposition of a review directory without `startup-request.json` or `events.jsonl`, consistent with the existing startup-transaction rules. Add a RED control for that case.

## Optional suggestions

### R1-F007 — Name the account roots by their stock derivations

Manual resources live under `operations.accountHome()/.cache/ai-peer-review/manual-resources` (`src/broker/manual-recovery-resource.mjs:49-50`). Provider resources live under `platform.cacheRoot/ai-peer-review/provider-resources` (`src/broker/provider-resource-core.mjs:144-162`). These roots can differ by platform. The spec should say that each is derived from its existing stock producer, never from a caller-supplied path.

### R1-F008 — Clarify compatibility for the legacy `reconcile` key

`preparePortableOwner` requires the exact key set `deadline,paths,protection,reconcile,signal,worktree` (`src/broker/portable-ownership.mjs:454-458`). "Remove the service's misleading empty callback" while "preserv[ing] compatibility with the legacy reconcile input" can be read two ways: the key stays required (and the service passes something), or the key-set check changes. State which.

### R1-F009 — Pin the publication assertion to concrete steps

Publication runs in several steps: `ready`, `publishEndpoint`, then `lifecycle.publish` (`src/broker/portable-ownership-core.mjs:209-219`). Say that the assertion runs at least immediately before `publishEndpoint`, which is the first discoverable effect, and again before `lifecycle.publish`. That makes the "immediately before … publication" requirement testable at a specific call site.

## Decision

revisions-requested
