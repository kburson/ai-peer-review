# Runtime policy and evidence reconciliation — #107 / #144

Status: proposed follow-up for joint owner review. This document does not amend an accepted specification or authorize activation.

## Immutable inputs and owners

Task 5 of docs/superpowers/plans/2026-10-03-107-agent-first-portable-runtime.md requires this separately reviewed follow-up. The accepted #107 specification remains unchanged.

Live #102 identifies accepted replacement specification commit 021bed7e9cc01782f0822e99fa2d3a58aadeb16e, XPR review-a3927de204393c987234f146101239f9 accepted round 3, finalization 6abc0111f4c380f68e3b590ba5b7512d48aa6f3a, and plan commit 8ee1cbe1e4c09469648727df453803880a4b9c57. Its earlier exact-version-pin design is superseded. Acceptance covers design; authority assurance is unavailable and implementation/conformance are separate.

Issue #30 owns stable artifact/chain identity, compact review evidence, exact source-spec bindings, ordered patches and immutable amendments. #34 owns controlled comparison/analytics; its current spec labels itself draft. #109 owns attributable headless attempt telemetry and has no accepted plan in its current metadata. Existing state or umbrella acceptance cannot adopt this follow-up. Each owner reviews exact follow-up bytes and updates its affected plan through governance; missing plans remain missing.

## Choices submitted for joint review

| Coupled contract | A: current-global recommendation                                                                                                                                                                                                                | B: coexistence alternative                                                                                                 |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Runtime          | #102 selects one current OS-account package and Node executable. Observation digests are provenance, not equality pins. Revalidate before effects and after waits.                                                                              | Retain #107 per-run pinned older package dispatch; requires separately accepted #102 amendment.                            |
| Policy           | Clean committed activated primary policy exclusively owns authority/review/setup/host policy. User machine preferences own classified hints/command/timing fields. Validate partial stores and assembled closed objects; no general deep merge. | Layered user/project v1/v2 policy requires separately accepted ownership/precedence rules.                                 |
| Prior journals   | Current runtime interprets only declared compatible collateral. Preserve unsupported active/fenced journals; drain already-live native owners before activation. No retained-image execution or relaunch.                                       | Retained old installation/launcher recovery requires authentic cross-family exclusion/routing and accepted #102 amendment. |

Runtime, Policy and Prior journals form one atomic bundle: owners select the complete A bundle or the complete B bundle. Per-row combinations are not permitted. Any mixed bundle, absent selection or partially accepted B amendment is an unresolved contract conflict and blocks contractAdopted. B requires a separately reviewed complete coexistence contract adopted by #102/#107; the current follow-up recommends the complete A bundle.

The following constraints apply to both bundles. #30 canonical evidence integration preserves exact artifact/chain bindings, ordered patches and immutable amendments; a competing evidence root needs its own #30 amendment and migration. #34/#109 require exact run/role/round/attempt/session attribution, controller timestamps, provenance, structured unavailable values and disjoint aggregate coverage. Account totals and guessed usage/cost never substitute for attempt records. These are common constraints, not alternative B choices.

Recommendation A explicitly proposes a #107 amendment. It becomes effective only after joint acceptance; preserve the old spec. Amend affected #107 plan gates after acceptance and repeat plan review. #102/#30/#34/#109 owners amend their own affected plans.

## Legacy endpoint tombstone alternative

A Node net listener could occupy a verified legacy socket/pipe and reject old handshakes. At source revision 1ee86150657b518019b30b3ec9c8a1967d8a9057:

- src/broker/client.mjs launches on ENOENT, ECONNREFUSED, APR_BROKER_OWNED, or APR_BROKER_STALE with missing discovery.
- src/broker/ipc.mjs validates protected broker.json before connecting. Missing discovery can trigger launch without reaching the listener.
- src/broker/paths.mjs selects AI_PEER_REVIEW_ENDPOINT_ROOT on POSIX, XDG_CACHE_HOME on Linux, and LOCALAPPDATA for Windows authority storage. A default-root tombstone cannot cover arbitrary verified configured roots.
- Already-live native owners retain their endpoint/lock. Never displace their endpoint or metadata.
- A portable broker crash releases the listener; an old launcher can race restart. A one-time native probe is no reservation.

Tombstone-only exclusion is insufficient today. No endpoint changes occur in #144. A tombstone can supplement the smallest #102-owned supported launcher/admission boundary only after joint review and real installed conformance verifies missing-discovery, error, root and crash behavior. No kernel-lock proof is invented.

## Operational outcomes and required installed conformance

| Scenario                                   | Required outcome                                                                                                                                                                 | Proof before production activation                                                                                                                         |
| ------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Node/current selection changes during wait | Revalidate selection/integrations before effects; invalid authority refuses.                                                                                                     | Actual #102 launcher/registration and async-boundary fixtures at exact package bytes.                                                                      |
| Unsupported active/fenced journals         | Preserve bytes and bounded independent diagnostics; refuse overlapping activation. No inferred cleanup ownership.                                                                | Real inventory and current ownership/protocol receipts.                                                                                                    |
| Mixed/dirty/unactivated policy             | Refuse undeclared merging or adoption.                                                                                                                                           | Partial schemas, assembled closed object and committed policy read-back.                                                                                   |
| Old launcher after native probe            | Continue excluding competing writes; probe alone grants nothing.                                                                                                                 | Real legacy launcher racing admission after probe.                                                                                                         |
| Native/portable simultaneous start         | At most one supported writer; uncertain ownership blocks.                                                                                                                        | Installed genuine-process barrier/race tests.                                                                                                              |
| Already-live native manual drain           | Preserve assurance and settlement; finish/abandon through existing live compatible owner before activation.                                                                      | Genuine manual drain and unknown-outcome/lost-owner receipts.                                                                                              |
| Broker crash between probe/activation      | Uncertain overlap refuses; deleting evidence cannot reopen permission.                                                                                                           | Installed crash/restart around admission reservation.                                                                                                      |
| Upgrade before compatible drain            | Preserve stranded journals; explicit current-global maintenance recovery only with proved compatibility/ownership. Refuse the exact overlapping namespace while proof is absent. | Genuine operator selection/rollback, account-wide affected inventory, same-owner drain/abandon, reselection and independent-clone non-overlap conformance. |
| Missing evidence/telemetry adoption        | Publication and Tasks 7/8/18 integration remain blocked. Missing usage stays null with source/reason.                                                                            | Exact accepted owner schema/plan bindings and accounting coverage.                                                                                         |

## Contract adoption versus activation proof

Task 4 candidate packaging, wrapper implementation and red release-gate fixtures are delivered independently of Task 5. Contract adoption precedes release authorization and publication, not candidate packaging. It can freeze reviewed interfaces and guarantees at exact current owner source revisions without claiming that a publishable tag/tarball or installed activation conformance already exists.

RuntimeContractAdoption therefore exposes separate report domains: contractAdopted checks exact accepted owner/amendment/plan/schema bytes; activationAuthorized additionally requires complete source/tag/tarball, registration and deployed exclusion/drain conformance. A resolved contract decision never clears pending operational proof. Task 4 publication, Task 8 runtime assertion, quarantine and production activation require activationAuthorized. Missing later package proof remains explicitly pending and cannot be manufactured from fixtures.

ActivationBinding names #102-owned supported launcher/current-runtime interfaces, exact current source/registration contracts, old-family exclusion/drain guarantees, prospective conformance requirements and unresolved overlap obligations. An absent binding authorizes neither activation nor quarantine. Pending conformance is distinct from an unresolved contract choice; both are visible.

The authoritative contract-adoption record lives under evidence/portable-runtime/contracts at a pinned reviewed evidence revision outside package runtime files. test/fixtures contains examples only. The approved-ref input identifies immutable Git evidence and exact record/review digests; caller JSON assertions, booleans, paths or hashes alone cannot prove review acceptance.

A review reference is authentic here only when complete normal protocol collateral proves the actual accepted reviewer event, distinct registered author/reviewer sessions, exact submitted subject bytes, complete persisted attempt/event/source lineage and the author-owned terminal Git transaction. Both manifest and accepted member must report the same delivered collateral assurance enum. unavailable, cryptographic-local, cryptographic-external, hardware-presence and host-verified are admissible and reported unchanged; unverified-test, no-commit and fabricated or incomplete lineage are refused. unavailable is sufficient for contractAdopted and, only with every independent operational proof complete, activationAuthorized. This is the manually orchestrated assurance boundary: it does not become human approval or prevention-grade identity proof. Higher assurance is never inferred from normal commit mode.

The contract record is immutable once adopted. Later activation evidence is an append-only sibling addendum keyed by the exact release tag/source/package digest and referencing the exact contract-record digest. No in-place rewrite or self-reference replaces an accepted record. #102 reviews the launcher, registration and installed conformance binding; #107 reviews the portable release integration; #30 reviews the immutable amendment/chain linkage. Each addendum carries its own exact accepted normal-review evidence and unresolved obligations.

An approved-ref selects one exact contract-record reference/review and, for publication, one exact activation-addendum reference/review. It names immutable evidence revisions and digests, never latest-by-filename or booleans. A later activation addendum cannot amend contract decisions; changed contract decisions require a new separately reviewed contract amendment and repeat affected plan review. An older-tag addendum remains historical authority only for its exact source/tag/package and contract digest, and grants no authority to a different release or a currently mismatched installation. Current-runtime revalidation still applies.

The default checker/publication command requires the complete selected record set and refuses while release/activation proof is absent. A separately reviewed Task 5 plan amendment will define an explicit adoption-only verification mode that can succeed on contractAdopted while reporting activationAuthorized/publicationAllowed false. That mode cannot be used by release publication, runtime activation or quarantine. Task 5 Verification Command 1 and issue mapping change only after actual acceptance and repeat plan review; the existing default gate is not inverted.

The document-only checker refuses unknown owners, unavailable bytes, digest drift, non-accepted reviews, stale subject bindings, fixture authority, unresolved decisions and missing activation proof. Tests prove byte binding/refusal, never owner adoption. Task 8 owns runtime assertContractAdoption; Task 4 consumes its publication prerequisite.

## Required acceptance

1. #102/#107 accept the complete A or B bundle at the exact follow-up digest, including unsupported/fenced/manual recovery and old-launcher races. Mixed or partial choices block contract adoption.
2. #30 accepts canonical evidence integration and names its reviewed plan. #34 separately accepts analytics integration; its draft is not adopted by implication. #109 accepts exact attempt correlation and telemetry plan.
3. Authentic review references bind reviewed artifact digests and reviewer/source identity, preserving assurance limitations.
4. A jointly adopted ActivationBinding freezes interfaces/guarantees. Production remains blocked until genuine later exact package/live conformance satisfies every obligation.
5. Amend affected owner plans only after acceptance and repeat plan review. #130 remains the detailed schema owner described below; accepting this bounded ownership contract does not adopt its missing detailed schemas.

Until these are proven, the inventory remains blocked. This proposal is reviewable material, not an accepted activation decision.

## API and historical participant response compatibility

The accepted #107 API envelope uses payload tag ai-peer-review.response/v1,
which is already used by the historical participant response document
schemas/response-v1.json. Preserve that historical reader unchanged.

For joint review, the proposed bounded interpretation is: the already committed
API artifact schemas/api-response-v1.json has distinct JSON Schema identifier
ai-peer-review.api-response/v1 while its payload retains the exact accepted
ai-peer-review.response/v1 tag. API operation registry entry points explicitly
select the API artifact; participant readers explicitly select the historical
artifact. No supported in-repository API/participant consumer dispatches solely by the shared payload tag.

At input HEAD 66b1a7a5fe061336bcf484d26fab3973a3b19c77, the API artifact has
SHA-256 7eb93ca43014ff4f57c3e3b93e8d2d1e996bb68b6585ff356a07cf31445e9292;
the historical artifact has SHA-256
744390c3aa12d92e08051054a75812a0b348787d59069d09d4f9e762ea4c76d9.
These exact bytes are provisional for this reconciliation until explicit joint
adoption; committing Task 6 did not adopt this follow-up. Adoption binds both
digests. The tag-only dispatch prohibition governs supported in-repository
API/participant entry points. External consumers must select the documented
operation/schema artifact boundary; a payload tag alone cannot certify their
correct behavior or compatibility.

Cross-boundary tests must reject a historical participant submission as an API
response and reject an API envelope as a participant response. Sharing the
payload tag is not authority to reinterpret historical evidence. This ruling
requires explicit joint adoption; it does not silently edit the accepted #107
specification or authorize a new global tag-only resolver.

## Current owner source and bounded plan status

At #102 PR #139 source 84565bc16164d562a5d742987352db7f3a4e31d1, inspected
exports include assertSelectedRuntime/readRuntimeSelection/registerRuntimeSelection
in src/config/runtime-selection.mjs; withPrimaryAdmissionFence and its Sync
variant in src/config/primary-admission.mjs; resolvePrimaryAuthority and its Sync
variant in src/config/primary-authority.mjs; and inspectPrimaryReviewInventory /
assertPrimaryInventoryObservation in src/config/primary-inventory.mjs.
PR #139 is open and unmerged at this observation. These exact interfaces are
review inputs, not delivered source or old-family exclusion proof.

The #30 owner plan at a607b26b7471759fa58de63239e1113ab54641a3 has digest
2d436e187e4ee2a0d22fda275d90801b67c82ad7ca8b4b688dcf105dd649ff6f.
Its independent plan review review-ae95793f08da8e886f60ba09a30ce53d requests
revisions; do not label that complete plan accepted. #30 accepted specification
review-2a69dff2dd2992f3d33854e7ca31e888 binds digest
7323748682db6b92f8f6d7014b9acb16ffab09f65c73846a211f12873a42a0bb at
1860a95c4ab6ebf859a2fe57146c720220c62480. #34 current owner metadata binds
the umbrella plan at that same revision; its standalone accepted plan is absent.
Issue #109 has no accepted plan metadata.

A joint acceptance must explicitly identify which owner contract subset and
plan amendment it adopts. It cannot transform broader requested-revision plans
or a draft standalone specification into complete acceptance. After joint
acceptance, affected owner plan addenda need their own repeat review and exact
digests. These missing records remain contract-adoption blockers.

## Timing of legacy drain under recommendation A

Legacy drain occurs before replacing or re-registering the selected current
installation, while that legacy runtime is still the selected compatible
runtime. An already-live owner is not an exception to #102 current-global
selection after replacement.

After a global selection change or in-place upgrade, an older process must
fence further effects when its sealed process image is no longer current.
An unsupported prior journal stays preserved/fenced and cannot be settled by
relaunching an old retained image. A pre-policy legacy launcher that cannot
enforce that fence is an unresolved competing-writer obligation: production
activation stays blocked until genuine quiescence/exclusion is proven.
No old PID absence, endpoint absence, one-time probe, or copied version label
can establish that proof. This follow-up authorizes no process termination,
endpoint replacement, or private-journal rewrite.

An operator may replace the global package before drain; the contract cannot
prevent npm or Node-manager activity. A stranded journal remains read-only.
The proposed supported recovery under A is an explicit operator selection of
one compatible package as the sole current-global installation, with normal
registration/current-image checks and account-wide affected-owner inventory,
then owned compatible drain/abandon before explicitly selecting the newer
current package again. This is a deliberate current-global maintenance change,
not automatic fallback to a retained per-run image or a version-label shortcut.
It is available only when exact source/registration and genuine installed
rollback/drain conformance prove that boundary. No such deployment proof is
claimed by this document. When compatibility or ownership cannot be proven,
there is no supported blind settlement operation: preserve the unknown journal
and report the specific unresolved overlap obligation.

The activation refusal is scoped to the validated primary clone and related
worktrees/output reservations that can overlap the unresolved writer. It does
not itself fence unrelated independently validated primary clones. An unknown
owner/root prevents narrowing that scope; refuse every activation whose
non-overlap cannot be proven. Current-global selection checks still apply to
every clone, and an operator selection change inventories all affected live
owners before recovery. A preserved journal alone is not proof of a live writer
or proof of terminality. An independently named new review is permitted only
with the accepted #102 independent-path/ownership/non-overlap gates intact.

## Detailed shared configuration boundary

The accepted #102 replacement design delegates detailed portable shared policy,
primary-workspace inheritance and untracked installation receipts to #130.
Live #130 has empty Plan Metadata and no accepted detailed schema; its draft
work cannot be adopted by implication. Contract adoption in Task 5 may rely on
the accepted #102 complete field-ownership table alone for this bounded ownership
contract; #130 is a declared detailed-schema dependency, not an inferred
acceptor of missing schema bytes. #130 must independently adopt the versioned
partial-store, assembled closed-object, inheritance and installation-receipt
schemas before Task 7 can declare its production config contract complete or
integrate it into runtime activation. Draft candidate schema/test work may
proceed, but Task 5 acceptance does not clear that pending integration gate.

The authoritative source is docs/superpowers/specs/2026-09-29-102-primary-runtime-authority-design.md
at commit 021bed7e9cc01782f0822e99fa2d3a58aadeb16e, section
"Configuration and setup / Field ownership and host preferences", Git blob
1dfe8089d93ea18e45394fb98303937feedab885, SHA-256
7130694f89335165a63d29196a56f3665c605fc5b85dde73105a6766da338a4f.
The complete cited table governs on any divergence from the following summary.
Its rows classify identity hints, resume.command, reviewer_guard.enabled,
reviewer_guard.command, automatic.adapter_version/capability and
automatic.server_command/tool_timeout_ms/heartbeat_interval_ms/lease_ttl_ms.
No omitted host field receives implicit ownership or deep-merge behavior.

Primary project policy exclusively owns authority, review, portable setup
metadata, `hosts.<host>.reviewer_guard.enabled`, and automatic.adapter_version /
automatic.capability. User machine preferences own identity hints,
resume.command, reviewer_guard.command, automatic.server_command,
tool_timeout_ms, heartbeat_interval_ms and lease_ttl_ms subject to selected
runtime, provider capability and duration constraints. User hints never prove
participant identity; preferences neither fill missing primary policy nor
silently redirect an existing sealed run. No general deep merge is introduced.

The current installed 0.4.1 linked-worktree setup maintenance is used only to
run the existing review protocol. It cannot prove that future #102 primary-only
setup/activation, global runner selection or clone-wide inheritance is deployed.
Detailed schema and installed production conformance remain explicit obligations.
