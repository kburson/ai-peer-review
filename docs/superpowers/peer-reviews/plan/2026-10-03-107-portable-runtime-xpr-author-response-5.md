# #107 XPR Author Response — Round 5

The same GPT-6.1 Sol/high author read the complete Claude Opus5.5/high round5 raw response and provider receipt, verified the reported seams, and revised the plan. The author proposes PXPR-019/020 as addressed; independent resolution and acceptance remain the reviewer's responsibility. Five of twelve reviewer rounds have been consumed.

Reviewed before SHA256: `582ce1bcb33c8c771e9c3df1563396f865d963ca301142bfb7be28e1c3ab68d5`. Frozen candidate SHA256: `c4e8564396d86e5f9413393e30975fc7c2639135dfbdff5d8ddcca769862d016`.

SAR accepted exact ancestor `ad4431df0c5d291a8fe909de1f9227aef165bb8964e3eb853296899e110a3c60` before XPR began. Its acceptance remains immutable and does not assert review of later changed bytes. The handoff now explicitly requires ordered SAR-ancestor acceptance followed by XPR-final-descendant acceptance with all intervening exact snapshots/patches preserved. Hydration authority will be the final independently accepted XPR digest and this lineage, not a claim that both stages reviewed the same final bytes.

## Dispositions

| ID                | Author disposition                          | Correction                                                                                                                                                       |
| ----------------- | ------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| PXPR-020 — High   | Addressed; independent verification pending | Task2 distributes reviewed source classes with distinct absence/creation requirements; Task4 measures fresh unregistered install recovery without host receipts. |
| PXPR-019 — Medium | Addressed; independent verification pending | Task18 names tag producer/pack-once/nine-job workflow, consumer dispatch inputs/permissions and release exact-run downloads/publication of P.                    |

PXPR-007/017/018 remain resolved as recorded by round5, and all previously resolved IDs remain resolved. This author response does not reopen or independently close findings.

## PXPR-020 — Ordinary User Recovery

The host-specific loader introduced a real availability regression. It would classify a crashed broker as unknown on ordinary installations lacking an individually reviewed capture. Registered conformance hosts could mask it. That rule is removed from the plan.

Task2 now owns a shipped process-source-contracts.json ledger and closed ProcessSourceClass schema. Classes declare finite OS family/build range, canonical stock probe path/version/visibility/error contract, Node coverage, exact adapter/parser/validator source-contract digest and semantics/precision plus accepted review/conformance references. Runtime verifies actual installed adapter/source bytes and current OS/probe context against this ledger. The source-contract digest excludes its own ledger/approval/evidence fields; class approval separately commits the source contract and accepted evidence/reviews. Captured host/tarball Q remain historical provenance. Unrelated package/native-file changes do not invalidate a class; source-contract changes or coverage widening require fresh conformance/review.

The two proof kinds have separate prerequisites:

- **Positive PID absence:** a shipped reviewed code-validated stock-probe class and its actual successful exact result. It needs no host receipt or clock-step exercise. Runtime still checks exact sealed ownership host/principal/PID context and the class's visibility/error contract. Missing executable/denied/query failure/malformed output is unknown, never absence.
- **Creation-stamp mismatch:** a matching distributed class with actual unchanged-child clock/timezone/DST conformance, canonical parsing and disjoint precision intervals. Linux boot-relative ticks additionally need the same directly verified kernel boot_id. Equal/overlapping intervals, class mismatch, unknown host or clock-derived boot-time changes do not prove death.

I independently checked current process-identity source and primary semantics rather than accepting proposed stock syntax unchanged. Current macOS code catches generic ENOENT/ESRCH as death, while Windows queries without ErrorAction Stop and treats null as absence. The revised plan explicitly fixes these ambiguities. Primary checks support the constraints:

- [Linux kernel proc documentation](https://docs.kernel.org/filesystems/proc.html) describes per-process directories and visibility controls. The plan requires verified fixed procfs/namespace visibility and valid current kernel boot_id; missing live/zombie subfiles, hidden/unmounted procfs and generic errors are not sufficient.
- [Apple ps source](https://github.com/apple-oss-distributions/adv_cmds/blob/main/ps/ps.c) exits1 when no selected rows remain, and also uses error exits. The plan therefore requires the full reviewed fixed command/selection/output/exit/stderr/visibility contract and real live/absent/error controls. It does not blindly declare generic exit1 or blank text as death.
- [Microsoft Get-CimInstance](https://learn.microsoft.com/en-us/powershell/module/cimcmdlets/get-ciminstance?view=powershell-5.1) supports ErrorAction; the [5.1 common-parameter documentation](https://github.com/MicrosoftDocs/PowerShell-Docs/blob/main/reference/5.1/Microsoft.PowerShell.Core/About/about_CommonParameters.md) specifies Stop handling for nonterminating errors. The proposed fixed System32 query must complete successfully with a closed typed absence result; query/provider failures or incidental exit3 cannot stand in for that result.

These checks establish design constraints, not installed probe conformance. The exact absence result contract still requires actual target installation controls during Task2 implementation. No process probe, PID reuse, clock change or platform assurance was performed here.

Task2 keeps its real producer: it owns pack before Task4 exists, then bind/capture-absence/capture/review-class/verify/verify-class. Evidence-producing capture hosts retain protected signing keys and independently reviewed registration; ordinary users need none of these. Absence-class evidence is collected without clock changes, creation classes with explicitly authorized real clock/timezone/DST tests. Ordinary review accepts finite class coverage and promotes exact class/source/approval digests into the shipped ledger; proposed or mocked records cannot grant assurance.

Production verifyProcessSourceClass/loadProcessSourceAssurance consume the shipped ledger and actual installed scope, never excluded evidence files, test scripts or per-user registration. Task4 installs the actual native-free candidate on fresh unregistered roots with no receipts/keys/index, then starts/crashes/reclaims an absent PID within bounded election budget on every advertised absence class. Conformed PID reuse must recover; unsupported creation scope is visible in doctor/help/report with native-equivalence=blocked. Missing absence class blocks that platform rather than silently wedging ordinary supported users. These are planned tests; no implementation success is claimed.

Task18 consumes the distributed classes and historical captures separately from release D's installed/epoch/provider bundles. It checks exact current adapter/source-contract scope, not a matching historical capture tarball. Class review K precedes source freeze C, preventing another package/evidence cycle. Exact per-run host/boot/PID/start ownership binding and descendant/effect fences remain unchanged.

## PXPR-019 — Workflow and Release Inputs

Source verification confirmed branch-only CI cannot produce tag evidence, and current release.yml independently packs its own artifact with only tag as dispatch input. The plan now defines the missing interfaces explicitly.

1. **Producer:** portable-runtime-producer.yml runs on signed v\* tag push or dispatch(tag). pack resolves immutable C/T, uses Node24/npm12.0.2, preserves signed-tag/source verification, packs once to P/D and uploads P plus the upstream pack receipt. Its nine Ubuntu/macOS/Windows × Node24/26/current installed jobs depend on pack and download that exact artifact. They perform the complete registration/anchor/capture/export/publication sequence on P without repacking. Current Node is recorded and class coverage must match.
2. **Consumer:** portable-release-evidence.yml dispatch requires tag, immutable approved evidence_ref E and producer_run_id. Its named assemble-portable-release-evidence job grants contents: read/actions: read, downloads P and all host/registration artifacts from that exact same-repository producer run, validates workflow/source/tag/service metadata and E/R governance, then runs the existing explicit consumer sequence. Its report/manifest binds C/T/D/E, both run IDs and exact consumed immutable artifact IDs/digests.
3. **Release:** release.yml dispatch requires tag, evidence_ref, producer_run_id and consumer_run_id. The publish job adds actions: read to existing contents/id-token permissions and npm environment protection. It downloads P from the producer and report/manifest from the named consumer run. release-inputs validates exact context/digests and approved E; check-release-activation consumes the same E/D. Existing registry comparison/npm/GitHub release steps publish downloaded P itself, with a fresh D check. The portable path removes independent npm pack. A tag push without complete exact-run inputs is blocked rather than choosing latest-successful evidence.

The plan includes trigger/input/permissions/matrix/download sketches and executable release-input validation/gate commands, with owned pack-release/release-inputs/schema/workflow tests. Red cases cover stale report, foreign repository/workflow/run/source/tag, wrong E, missing permissions/inputs, missing matrix artifacts, swapped P, archive-versus-payload confusion and repack digest mismatch. All service-reading jobs explicitly require actions: read.

The primary [download-artifact documentation](https://github.com/actions/download-artifact) describes cross-run repository/run-id/token inputs and actions: read requirements. That supports the proposed download interface. Actual repository token rights, artifact access, signed-tag run association and every claimed report binding must be verified during implementation; none was exercised here.

## Nonblocking Advice

1. **Task2 owns its own pack — adopted.** Its script pack mode and explicit verification command produce portable-candidate.tgz before Task4 exists using resolved Node/npm argument arrays.
2. **Artifact-service permissions — adopted.** Every producer/consumer/release service-reading job explicitly grants actions: read; producer/consumer also contents: read and release retains existing write/id-token/environment controls.
3. **Native-removal candidate bytes — adopted through class scope.** Task4 checks the native-free candidate's exact adapter/source contract against accepted classes. Removing unrelated native/package bytes does not require per-package recapture; changed source-contract bytes do, before affected classes are advertised.

## Verification and Frozen Artifacts

Targeted Prettier and Markdownlint pass. The actual AITM extractPlanTasks/validateSplitTasks parser returns18 tasks, ok=true, no errors/violations. The genuine12-hunk unified patch reconstructs the exact after snapshot including final LF; plan and after hashes match. CSpell is excluded by repository configuration and not evaluated. All15 release gates and #102/#30/#34/#109 ownership/blockers remain present.

- [Before snapshot](2026-10-03-107-portable-runtime-xpr-author-response-snapshot-before-5.md)
- [After snapshot](2026-10-03-107-portable-runtime-xpr-author-response-snapshot-after-5.md)
- [Actual patch](2026-10-03-107-portable-runtime-xpr-author-response-patch-5.md)
- [Verification](2026-10-03-107-portable-runtime-xpr-author-response-verification-5.md)
- [Full raw reviewer response](2026-10-03-107-portable-runtime-xpr-reviewer-response-5.md)
- [Actual provider receipt](2026-10-03-107-portable-runtime-xpr-round-5-provider-receipt.md)

Author model/effort is known by dispatch; native author runtime attestation and provider tokens/cost are unavailable because this headless worker exposes no such receipt. Reviewer usage/model/session data remains as reported in its separate receipt, with no invented totals.

This is documentation-only work. No source/Git/AITM mutations, agents, implementation, package/clock/provider conformance, publication or hydration occurred. The candidate is frozen for the same Claude session's round6. No independent acceptance is asserted; current product/adoption feasibility gates remain blocked until their actual work and evidence exist.
