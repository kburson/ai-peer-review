# Runtime policy and evidence reconciliation — #107 / #144

Status: proposed follow-up for joint owner review. This document does not amend an accepted specification or authorize activation.

## Immutable inputs and owners

Task 5 of docs/superpowers/plans/2026-10-03-107-agent-first-portable-runtime.md requires this separately reviewed follow-up. The accepted #107 specification remains unchanged.

Live #102 identifies accepted replacement specification commit 021bed7e9cc01782f0822e99fa2d3a58aadeb16e, XPR review-a3927de204393c987234f146101239f9 accepted round 3, finalization 6abc0111f4c380f68e3b590ba5b7512d48aa6f3a, and plan commit 8ee1cbe1e4c09469648727df453803880a4b9c57. Its earlier exact-version-pin design is superseded. Acceptance covers design; authority assurance is unavailable and implementation/conformance are separate.

#30 owns stable artifact/chain identity, compact review evidence, exact source-spec bindings, ordered patches and immutable amendments. #34 owns controlled comparison/analytics; its current spec labels itself draft. #109 owns attributable headless attempt telemetry and has no accepted plan in its current metadata. Existing state or umbrella acceptance cannot adopt this follow-up. Each owner reviews exact follow-up bytes and updates its affected plan through governance; missing plans remain missing.

## Choices submitted for joint review

| Contract | A: current-global recommendation | B: coexistence alternative |
| --- | --- | --- |
| Runtime | #102 selects one current OS-account package and Node executable. Observation digests are provenance, not equality pins. Revalidate before effects and after waits. | Retain #107 per-run pinned older package dispatch; requires separately accepted #102 amendment. |
| Policy | Clean committed activated primary policy exclusively owns authority/review/setup/host policy. User machine preferences own classified hints/command/timing fields. Validate partial stores and assembled closed objects; no general deep merge. | Layered user/project v1/v2 policy requires separately accepted ownership/precedence rules. |
| Prior journals | Current runtime interprets only declared compatible collateral. Preserve unsupported active/fenced journals; drain already-live native owners before activation. No retained-image execution or relaunch. | Retained old installation/launcher recovery requires authentic cross-family exclusion/routing and accepted #102 amendment. |
| Evidence | Extend #30 canonical evidence through versioned #107 attempt records, preserving exact bindings and immutable amendments. | A competing evidence root requires #30 amendment and migration; silent duplication is refused. |
| Telemetry | #34/#109 share exact run/role/round/attempt/session attribution, controller timestamps, provenance, structured unavailable values and disjoint aggregate coverage. | Account totals or guessed usage/cost cannot substitute for attempt records. |

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

| Scenario | Required outcome | Proof before production activation |
| --- | --- | --- |
| Node/current selection changes during wait | Revalidate selection/integrations before effects; invalid authority refuses. | Actual #102 launcher/registration and async-boundary fixtures at exact package bytes. |
| Unsupported active/fenced journals | Preserve bytes and bounded independent diagnostics; refuse overlapping activation. No inferred cleanup ownership. | Real inventory and current ownership/protocol receipts. |
| Mixed/dirty/unactivated policy | Refuse undeclared merging or adoption. | Partial schemas, assembled closed object and committed policy read-back. |
| Old launcher after native probe | Continue excluding competing writes; probe alone grants nothing. | Real legacy launcher racing admission after probe. |
| Native/portable simultaneous start | At most one supported writer; uncertain ownership blocks. | Installed genuine-process barrier/race tests. |
| Already-live native manual drain | Preserve assurance and settlement; finish/abandon through existing live compatible owner before activation. | Genuine manual drain and unknown-outcome/lost-owner receipts. |
| Broker crash between probe/activation | Uncertain overlap refuses; deleting evidence cannot reopen permission. | Installed crash/restart around admission reservation. |
| Missing evidence/telemetry adoption | Publication and Tasks 7/8/18 integration remain blocked. Missing usage stays null with source/reason. | Exact accepted owner schema/plan bindings and accounting coverage. |

## Contract adoption versus activation proof

Task 5 precedes the native-free release packaging tasks. Contract adoption can freeze reviewed interfaces and guarantees at exact current owner source revisions. It cannot truthfully claim that a later release tag/tarball or installed conformance already exists.

RuntimeContractAdoption therefore exposes separate report domains: contractAdopted checks exact accepted owner/amendment/plan/schema bytes; activationAuthorized additionally requires complete source/tag/tarball, registration and deployed exclusion/drain conformance. A resolved contract decision never clears pending operational proof. Task 4 publication, Task 8 runtime assertion, quarantine and production activation require activationAuthorized. Missing later package proof remains explicitly pending and cannot be manufactured from fixtures.

ActivationBinding names #102-owned supported launcher/current-runtime interfaces, exact current source/registration contracts, old-family exclusion/drain guarantees, prospective conformance requirements and unresolved overlap obligations. An absent binding authorizes neither activation nor quarantine. Pending conformance is distinct from an unresolved contract choice; both are visible.

The authoritative adoption record lives under evidence/portable-runtime/contracts at a pinned reviewed evidence revision outside package runtime files. test/fixtures contains examples only. The approved-ref input identifies immutable Git evidence and exact record/review digests; caller JSON assertions, booleans, paths or hashes alone cannot prove review acceptance.

The document-only checker refuses unknown owners, unavailable bytes, digest drift, non-accepted reviews, stale subject bindings, fixture authority, unresolved decisions and missing activation proof. Tests prove byte binding/refusal, never owner adoption. Task 8 owns runtime assertContractAdoption; Task 4 consumes its publication prerequisite.

## Required acceptance

1. #102/#107 accept A or B at the exact follow-up digest, including unsupported/fenced/manual recovery and old-launcher races.
2. #30 accepts canonical evidence integration and names its reviewed plan. #34 separately accepts analytics integration; its draft is not adopted by implication. #109 accepts exact attempt correlation and telemetry plan.
3. Authentic review references bind reviewed artifact digests and reviewer/source identity, preserving assurance limitations.
4. A jointly adopted ActivationBinding freezes interfaces/guarantees. Production remains blocked until genuine later exact package/live conformance satisfies every obligation.
5. Amend affected owner plans only after acceptance and repeat plan review.

Until these are proven, the inventory remains blocked. This proposal is reviewable material, not an accepted activation decision.

## API and historical participant response compatibility

The accepted #107 API envelope uses payload tag ai-peer-review.response/v1,
which is already used by the historical participant response document
schemas/response-v1.json. Preserve that historical reader unchanged.

For joint review, the proposed bounded interpretation is: the new
schemas/api-response-v1.json has distinct JSON Schema identifier
ai-peer-review.api-response/v1 while its payload retains the exact accepted
ai-peer-review.response/v1 tag. API operation registry entry points explicitly
select the API artifact; participant readers explicitly select the historical
artifact. No consumer dispatches solely by the shared payload tag.

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
#109 has no accepted plan metadata.

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

## Detailed shared configuration boundary

The accepted #102 replacement design delegates detailed portable shared policy,
primary-workspace inheritance and untracked installation receipts to #130.
Live #130 has empty Plan Metadata and no accepted detailed schema; its draft
work cannot be adopted by implication. Task5 freezes #102's accepted field
ownership table and requires separately adopted versioned schemas when available.

Primary project policy exclusively owns authority, review, portable setup
metadata, hosts.<host>.reviewer_guard.enabled, and automatic.adapter_version /
automatic.capability. User machine preferences own identity hints,
resume.command, reviewer_guard.command, automatic.server_command,
tool_timeout_ms, heartbeat_interval_ms and lease_ttl_ms subject to selected
runtime, provider capability and duration constraints. User hints never prove
participant identity; preferences neither fill missing primary policy nor
silently redirect an existing sealed run. No general deep merge is introduced.

The current installed0.4.1 linked-worktree setup maintenance is used only to
run the existing review protocol. It cannot prove that future #102 primary-only
setup/activation, global runner selection or clone-wide inheritance is deployed.
Detailed schema and installed production conformance remain explicit obligations.
