# #107 XPR Author Response — Round 4

This is the same GPT-6.1 Sol/high author revising the exact plan reviewed by the same Claude Opus5.5/high reviewer. The complete round4 raw critique and provider receipt were read. The author proposes the three open findings as addressed; only the next independent reviewer pass can resolve them or accept the plan. No hydration, implementation, source/Git/AITM mutation, platform conformance or publication occurred.

The immutable SAR-accepted ancestor remains SHA256 `ad4431df0c5d291a8fe909de1f9227aef165bb8964e3eb853296899e110a3c60`. This revision follows the ordered SAR→XPR lineage; it does not rewrite that acceptance or restart SAR. XPR4 reviewed SHA256 `848eb608c5b57da625c0847041b236d24990dedb1c29ffb5669bb2d8eeb24d00`. The final formatted candidate is SHA256 `582ce1bcb33c8c771e9c3df1563396f865d963ca301142bfb7be28e1c3ab68d5`. Four of twelve reviewer rounds have been consumed.

## Dispositions

| Finding  | Author disposition                          | Concrete correction                                                                                                                                                                                                                                                               |
| -------- | ------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| PXPR-007 | Addressed; independent confirmation pending | Task3 owns explicit producer-context, CI-anchor, pinned manual registration, consumer-input and merged-anchor modes. Task18 names the actual upload steps and output paths, distinguishes CI/manual register-key commands, and passes merged anchors to every aggregate consumer. |
| PXPR-017 | Addressed; independent confirmation pending | Authoritative registration, source receipts, manual bundles and adoption authority move to evidence/portable-runtime outside current package files. Packaging asserts exclusion and the plan gives source/tag/pack→registration→evidence→report→release timing.                   |
| PXPR-018 | Addressed; independent confirmation pending | Task2 owns a standalone real registered manual source-conformance script, schemas and production validator/loader. Task4 consumes installed receipts for parity before native retirement; Task18 reuses this procedure rather than introducing it.                                |

PXPR-015 and PXPR-016 stay resolved as the reviewer recorded. PXPR-001/002/003/004/005/006/008/009/010/011/012/013/014 stay resolved. Nothing in this author response independently grants those dispositions or closes any open reviewer finding.

### PXPR-007 — Anchor flow and executable commands

The reported mismatch was valid: the manual-only committed index could not supply mid-run CI registrations, and the command blocks omitted the manual governance boundary. The revised plan gives each path a named producer and output:

- Task3 pack-bind emits registration-candidate.json. The manual host submits this public candidate/index to ordinary review before capture; the accepted immutable commit/index digest is emitted in manual-registration-approved-ref.json and its public index is checked out at that revision. pin-manual-registration produces manual-anchors.json, and manual register-key consumes it.
- Task18 CI validates producer context against authenticated service metadata and the reviewed workflow/source expectation. publish-registration uploads the candidate through actions/upload-artifact@v7. Its artifact-id and artifact-digest outputs feed ci-anchor, which checks the authenticated archive metadata/digest and the extracted candidate's separate payload hash. CI register-key consumes ci-anchors.json. The public service receipt is uploaded with the finalized host bundle.
- The named assemble-portable-release-evidence consumer validates its independent review/service inputs, checks out approved evidence/registration revisions and downloads the actual CI receipts/bundles. build-anchors merges reviewed manual registrations, Task2 process-source registrations and authenticated CI registrations into anchors.json. ingest-manual, assemble and verify-portable-release all explicitly consume this output. Task2's verifier copies exact signed public source receipts into the matrix; the aggregate revalidates their distinct source schema/anchors and signatures.

The approved revision files are outputs of named governance/validation steps, never caller-only pass assertions. Self-supplied bundle fingerprints cannot populate anchors; post-capture registration rejects. Source/public key continuity does not claim external host identity attestation.

The official [upload-artifact documentation](https://github.com/actions/upload-artifact) confirms artifact ID/digest outputs and the archive/publication interface. Those facts support the proposed workflow shape; no upload, authenticated service call or CI permission test was executed. The documentation also says hidden paths are excluded by default. Because the shown public output paths sit under .scratch, both uploads now explicitly include hidden files and require a closed public-only inventory check. Injected private collateral must refuse upload; only enumerated public payloads are uploaded.

### PXPR-017 — Nonpackaged authority and release ordering

I verified current package.json includes both docs/ and provenance/, while evidence/ is absent. The old evidence location was therefore packaged and circular. The revised inventory places registrations/index, Task2 source receipts, manual-host bundles and authoritative adopted contract authority under evidence/portable-runtime. Task18's packaging tests must reject that path in actual inventory, including a future files change, and verify controlled excluded-evidence-only changes leave packaged bytes unchanged.

The plan explicitly binds release ordering:

1. Reviewed source C is tagged T through ordinary release authorization and packed once to P/digest D.
2. Registration R pins D/run/key/host before manual capture.
3. Reviewed evidence/adoption E adds finalized public receipts and the actual accepted Task5 authority bound to C/T/D.
4. The consumer runs C's code and consumes immutable P plus only the public evidence subtree from approved E/R. It publishes the complete report bound to C/T/D/E.
5. release.yml consumes that report, the approved adoption authority and the exact P/D before publication, registry artifact comparison or GitHub release creation.

The tag is not moved to E, the consumer does not repack at E, and no signature/digest includes itself. An early tag-triggered run without complete evidence stays blocked until an ordinary authorized rerun at T. Current release.yml was checked: its signed tag/source verification, package packing and artifact digest matching remain required, with the new adoption/evidence gates preceding release actions. This is a planned workflow migration, not an assertion that current release.yml already implements it.

### PXPR-018 — Owned live source producer and production consumption

The critique correctly identified missing early ownership of the conformance required by Task2's classifier and Task4 parity. Task2 now creates test/live/process-source-conformance.mjs, its closed receipt/registration schemas, unit tests and registered manual-host public registration/receipt inventories. Its bind/capture/verify implementation is independent of the Task3 driver and Task18 workflows.

The procedure runs on explicitly registered Ubuntu/macOS/Windows manual hosts until CI clock privileges and restoration are separately verified. It loads the exact isolated packed candidate's process-identity adapter, records installed module/probe/package hashes, and holds a nonce-handshaking unchanged child across authorized real clock steps and timezone/DST changes. It observes actual UTC-versus-monotonic offsets throughout each sustained window. It then exits/waits the owned child and verifies the stock probe's precise no-such-PID result, with missing-executable/denied/malformed controls. Linux's boot-relative source records the directly observed kernel boot_id before/after that child without asserting Task3 cross-reboot or descendant capability. Mocked/incomplete/changed/reverted steps cannot grant assurance. Restoration/cleanup obligations remain explicit.

The output source receipt is signed against a separately reviewed pre-capture registration and saved both locally and as reviewed public evidence. Task4's actual installed candidate fixture produces portable-candidate.tgz, and its parity gate verifies these exact receipts before native retirement. Task18 imports this same producer and repeats capture when its release package or installed context differs; old candidate evidence cannot fill a different digest.

The plan also wires consumption into production: Task2 creates process-source-assurance.mjs in src, with verifyProcessSourceReceipt/loadProcessSourceAssurance. Explicit setup imports reviewed public proof into verified protected installation storage. Runtime process observation and election/death classification reload and verify the receipt against fresh installed host/OS/build/Node/module/probe/package/source/precision scope. Missing/unreviewed/foreign/changed proof remains source-assurance-unknown and retains fences. Sealed identities preserve exact receipt/registration digests. The production closure ships the shared pure JavaScript validator; it never imports test/live scripts or downloads conformance. Actual installed reload/tamper/scope/death tests are required.

I checked current process-identity source: Linux uses proc start ticks/boot_id, macOS uses boottime plus ps lstart and currently conflates generic probe errors with death, and Windows reads CreationDate/LastBootUpTime. This confirms the seams that need classification/provenance correction; it proves none of the proposed creation-stamp stability or source assurance. No new platform parity claim is made.

## Nonblocking Advice

1. **Authoritative adoption outside test fixtures — adopted.** Task5 owns evidence/portable-runtime/contracts/runtime-contract-adoption.json at an independently reviewed evidence revision. test/fixtures/runtime-contract-adoption.json contains positive/negative examples only. Task4's wrapper and Task18's consumer require the authoritative record and approved revision bound to exact source/tag/package plus accepted owner reviews.
2. **Observed clock offset and synchronization reversal — adopted.** Task2's real manual capture records offsets before/during/after and a sustained window. Reversion, inadequate achieved step, skipped DST transition or missing restoration is inconclusive and nonpassing. CI permission assertions remain unverified.
3. **Old-release hotfix route — adopted.** Task4 explicitly says v0.4 hotfix work must branch from verified pre-Task4 source, receive ordinary review/new signed tag and run that source's original workflow. Tagging current portable integration bytes cannot bypass the adoption gate. This plan authorizes no such branch or release action.

## Verification and Artifacts

The current plan passes targeted Prettier, Markdownlint and the actual AITM parser:18 tasks, ok=true, no errors/violations. The final actual unified patch has15 hunks and reconstructs the exact final after snapshot including LF. The plan and after snapshot have the same SHA256. CSpell is not evaluated because the repository deliberately excludes docs/superpowers; no config bypass was attempted. These are documentation checks; proposed implementation commands were not executed.

- [Reviewed before snapshot](2026-10-03-107-portable-runtime-xpr-author-response-snapshot-before-4.md)
- [Final after snapshot](2026-10-03-107-portable-runtime-xpr-author-response-snapshot-after-4.md)
- [Actual final patch](2026-10-03-107-portable-runtime-xpr-author-response-patch-4.md)
- [Raw checks and reconstruction record](2026-10-03-107-portable-runtime-xpr-author-response-verification-4.md)
- [Complete reviewer response](2026-10-03-107-portable-runtime-xpr-reviewer-response-4.md)
- [Provider receipt](2026-10-03-107-portable-runtime-xpr-round-4-provider-receipt.md)

An intermediate checked candidate before the primary-source hidden-upload correction is retained byte-for-byte at snapshot-intermediate-4.md (SHA256427de9e2be75d49340b588cc83e1cfbd0dbb61081ad3f766538df99fb81f58f7) and patch-intermediate-4.md (SHA256ed79a111bf41a675d9663849ef5bc31ac35e720115210d41d6e258c6004249b6), both with the same author-response prefix. The final canonical snapshot/patch above represent the candidate handed to the next reviewer.

Requested author model/effort is known through dispatch, not native author runtime attestation. Author provider tokens/cost are unavailable because this headless worker has no usage receipt. The separate reviewer receipt preserves its actual reported model/session/usage scope; no inferred per-round totals are invented.

The plan is frozen for the controller's same-session Claude round5. Hydration remains forbidden until clean exact-byte XPR acceptance. #102/#107 policy/runtime conflict, actual installed protection/source/epoch/containment and all15 release gates remain implementation/adoption blockers as declared; source-free documentation acceptance cannot discharge them.
