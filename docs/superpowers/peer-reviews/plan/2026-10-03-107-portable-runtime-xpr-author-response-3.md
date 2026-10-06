# XPR Round 3 Author Response

**Status:** Frozen revised candidate for independent round4; no author acceptance.

Same dispatched GPT-6.1 Sol/high author. Independent Claude Opus5.5/high round3 remains changes-required. Requested author identity comes from dispatch; author runtime identity/native usage/cost remain unavailable. Three of12 XPR rounds consumed. No new SAR is started.

## Lineage

- Accepted SAR ancestor remains `ad4431df0c5d291a8fe909de1f9227aef165bb8964e3eb853296899e110a3c60`; all archived decisions remain immutable.
- [Reviewed before snapshot](2026-10-03-107-portable-runtime-xpr-author-response-snapshot-before-3.md): `5064e977983f0f7447d66573a89f26cd93d07cde2242aa8e5a2a8d1759c7a898`.
- [New after snapshot](2026-10-03-107-portable-runtime-xpr-author-response-after-3.md) and [plan](../../plans/2026-10-03-107-agent-first-portable-runtime.md): `848eb608c5b57da625c0847041b236d24990dedb1c29ffb5669bb2d8eeb24d00`.
- [Actual unified patch](2026-10-03-107-portable-runtime-xpr-author-response-patch-3.md).
- [Complete raw critique](2026-10-03-107-portable-runtime-xpr-reviewer-response-3.md) and [provider receipt](2026-10-03-107-portable-runtime-xpr-round-3-provider-receipt.md).

Round3 reviewer resolved PXPR-008/010/011/012/013/014, with earlier resolved IDs retained. Author dispositions for the complete remaining set PXPR-007/015/016 follow; independent confirmation is still required.

## PXPR-007

**Disposition:** Addressed with explicit producer classes, manual ingestion, named consumer and pre-capture anchor provenance.

The old matrix conflated GitHub installed checks with authorized live host/provider evidence. Task18 now requires each row to declare producer_class=ci|manual-host, required installed/epoch/provider kinds and exact coverage dimensions. Nine OS/Node CI rows produce installed binary-free/protection/ownership/lifecycle checks and offline fixtures. Registered manual hosts produce real reboot/clock/sleep/Fast Startup epoch/creation-source conformance for each advertised OS/build/architecture/source version/confined topology, plus exact advertised OS/Node/provider/model/effort/role/topology provider coverage. Node-independent epoch coverage requires explicit conformance/declared scope; otherwise additional Node rows are mandatory. Missing provider credentials/evidence remains blocked. The optional Claude CI probe covers only its actual declared row.

Public signed manual evidence is reviewed under provenance/portable-runtime/manual-host/capture_id/ with no keys/credentials/private sessions. The exact ingest-manual --source --anchors --output-root command validates and copies immutable approved bytes before assemble. New workflow portable-release-evidence.yml names assemble-portable-release-evidence as consumer: download installed CI/registration artifacts, obtain approved manual/index revision, validate anchors, ingest manual evidence, assemble, verify and publish the package-bound report/manifest. Release consumes that exact report. Final acceptance wording now requires nine CI rows AND all declared manual rows.

Trust is no longer derived from the same bundle's fingerprint. pack-bind emits a registration candidate. For CI, a pre-capture publish step obtains immutable registration artifact ID/digest/service receipt and approved run/job/workflow/source context; register-key validates that separate receipt before capture. The downstream consumer reconstructs the index from authenticated service metadata. Manual registration is committed/reviewed and pinned before capture; post-capture self-registration rejects. The required --anchors index comes from those independently obtained references, not capture content. Replacing a bundle and its self-supplied fingerprint cannot replace the trusted index. This is governed repository/host provenance within the declared same-user trust boundary, not external identity attestation or proof against a compromised host.

**Verification:** Full prior command/interface/matrix text compared with raw critique; producer/consumer and anchor sequencing checked. No GitHub runner reboot, provider run, evidence upload/commit, artifact ingestion or real key registration was performed. All script/workflow work is future implementation.

## PXPR-015

**Disposition:** Addressed by concrete release gate option(a).

Verified current release.yml publishes on signed v-tags after tests and checks matching npm/GitHub artifacts, without adoption enforcement. Task4 now owns check-release-activation.mjs and release-activation-gate.test.mjs and modifies release.yml before native removal. The wrapper requires the exact packed digest and tagged adoption record; missing Task5 checker/record, unresolved conflict, absent/invalid ActivationBinding or mismatched source/conformance refuses before npm publication or matching-artifact verification and GitHub release creation. A signed tag alone is explicitly a negative test. Existing tag/provenance/matching checks remain.

Task4 uses the normal governed integration branch. Once merged, ordinary releases containing this change, including unrelated/#102 work, wait for accepted adoption; older source/tag workflows retain their existing behavior. Controlled candidate is precisely the CI-built tarball installed in isolated CI or registered manual-host conformance runs with private harness bindings, without a published channel or ordinary production startup. The binding does not grant migration or old-family exclusion. Task18 adds the full15-gate matrix report requirement; Task4 adoption enforcement is immediate and cannot await that later integration.

This does narrow urgent delivery to native-free CI/installed candidates until the conflict is reconciled; the plan states that publication dependency explicitly, with transport/native elimination work continuing first. No long-lived release branch or unsupported publication exception is introduced.

**Verification:** Current release workflow read completely. Proposed wrapper, workflow position, red tests and dependency inspected. No workflow edit outside this plan, signed tag, publish or release action occurred.

## PXPR-016

**Disposition:** Addressed conditionally on genuine source conformance; parity is not presumed.

Verified primary sources support candidate creation-stamp semantics: Microsoft's CreationDate is a read-only creation-date property and its ProcessId notes explicitly describe PID reuse; XNU exposes stored p_start through proc_starttime. Neither demonstrates current installed clock-step invariance or the exact ps data path. [Microsoft Win32_Process](https://learn.microsoft.com/en-us/windows/win32/cimwin32prov/win32-process), [Apple XNU proc_starttime source](https://github.com/apple-oss-distributions/xnu/blob/main/bsd/kern/kern_proc.c). Linux proc starttime is relative to boot, supporting its separate boot-bound classification. [Linux proc_pid_stat documentation](https://man7.org/linux/man-pages/man5/proc_pid_stat.5.html)

Task2 now separates the cases precisely. Same verified host/PID plus different installed-conformed recorded-at-creation stamp can prove the original process gone independently of positive boot proof. Windows CreationDate/macOS lstart remain candidates until unchanged-live-process clock-step conformance passes. Canonical UTC/fixed-locale parsing and timezone/DST tests prevent formatting changes from becoming mismatches. Linux boot-relative ticks require the same genuinely verified boot. Equal/overlapping precision intervals, including one-second macOS lstart, are live/unknown; unstable/unclassified source or timestamp boot mismatch remains unknown.

The owner receipt seals source/version/semantics/precision/conformance digest. Fixtures cover macOS/Windows PID reuse and intervening clock step, equal-within-precision, unchanged-live-process clock negatives and existing absence/missing/denied probe cases. A mismatch discharges only the original broker/contender identity, not unknown descendant/effect obligations. Task4's parity requires reused-PID recovery and those live negatives, not only PID absence. If a source is unstable/unavailable, platform reclaim limitation and parity=blocked remain explicit rather than asserting native equivalence.

**Verification:** Local process-identity source from round2 and primary platform sources reviewed. No PID reuse stress, clock/DST change, platform conformance or support claim is made here.

## Advice

1. **Legacy endpoint tombstone:** Retained as a Task5 design alternative, not adopted implementation. Current client launchable errors and missing-discovery branch were read. A failing handshake alone may still interact with absent discovery, and an occupied endpoint does not cover already-running brokers or post-crash time. Task5 must test error classification/discovery, configured roots and crash windows before claiming exclusion. This may help shorten the reviewed boundary, but no endpoint is created here.
2. **reconcile_after_ms dual meaning:** Adopted. Task6 generated help/config examples now explain liveness reconciliation threshold and wrapper reconnect-window meaning. Task5 explicitly reviews retention versus a versioned split; no unreviewed key/default is introduced.
3. **Different legacy endpoint root:** Adopted. Task4 compares current roots with trusted recorded endpoint/layouts; missing, unmatched or unverifiable recorded roots are indeterminate. Current environment/default alone cannot prove native absence.
4. **Reboot command sequence:** Adopted. Tasks3/18 have separately labelled pre-reboot and post-reboot blocks. The named evidence consumer's ingestion/assembly commands are separate from registered manual-host capture. No comment or shell-specific control flow is needed to communicate the required authorized real event.

## Verification and Freeze

Targeted final plan Prettier/Markdownlint and18-task parser are recorded in verification-3.md, alongside exact snapshot hashes and actual-patch reconstruction. CSpell excludes these docs; not evaluated. Raw reviewer output/earlier evidence remain untouched.

No source/Git/AITM mutation, new agent, product implementation, issue hydration, external publication, OS protection change, provider launch or reboot occurred in this author turn. All15 gates and the #102/#107/#30/#34 adoption requirements remain. Candidate is frozen for same-reviewer round4; all three open IDs await independent confirmation.
