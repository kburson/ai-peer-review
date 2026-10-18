# #141 current Linux/macOS analysis

## Evidence identity and limits

Initial source: `504985612abea0cc7803ea4ddfc67f97f6d8323a`; runtime source fingerprint `9ce88349388cd60c9273fe341232a51fe94975c4eb4250e4e001253c96a0ad38`. The current scan was actually rerun against those bytes. It produced 186 modules, 28,908 edges and 6,935 findings with `verified:false`, `coverageComplete:false`, `passed:false`.

The raw fresh output happens to be byte-identical to the preserved historical report, SHA-256 `af68d1380c0dfbcae54ca431bfb881aa94e752250e9b9473d9353b2acc3ceafe`. That equality is observed, not a reason to skip the fresh scan. The old report itself remains unchanged, failed and without platform attribution. Neither 6,935 nor the retained subtotal below is a confirmed runtime defect count.

Reproduce the current annotation with `node scripts/analyze-posix-runtime.mjs --full`; retain stdout in the owned scratch directory. The diagnostic checks clean runtime source, stable source fingerprint/HEAD and the historical report hash. It retains every finding and records possible platforms, source hash and source span. It never imports or executes analyzed runtime source. Its output is analysis-only; it cannot grant broader runtime acceptance.

## Proven Windows-only exclusions

The reviewed diagnostic rerun at `0d6765239b5813d3abda0ef7fcfac1ff022b1764` proves 13 `unknown-handle-origin` rows Windows-only. The initial 25-row exclusion was superseded after independent review found destructuring and logical-operand limitations; the corrected diagnostic conservatively retains those 12 additional rows. Proof comes from literal `process.platform` branch conditions and private direct callers, not filenames. Examples include the Windows replacement-script encoding/publication path and guarded Windows ACL ancestor observation in the shared storage module. Every other row in that same module remains present.

Twenty-nine focused controls cover literal Windows/Linux/macOS paths, mixed files, private callers, exported functions/arrows, escaped callbacks, shadowed process, immutable/mutable aliases, source replacement and invalid paths/locations. Unknown, exported, escaped or parameter-dependent cases remain shared. This conservative exclusion set is not a claim that every Windows-specific expression has been resolved; unresolved attribution is retained rather than guessed.

Windows SID/DACL, fixed PowerShell/CIM, Windows retry/sharing/reparse/bootstrap and Windows clock-conformance obligations are outside current acceptance/remediation under #213. Preserve historical evidence. Future support needs fresh requirements and analysis of then-current source. No Windows runtime worker, native build or query was run here.

## Analyzer limitations and retained shared findings

| Fresh category                       | Retained shared/unresolved | Assessment                                                                                                                                                                                  |
| ------------------------------------ | -------------------------: | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Unknown handle origin                |                      6,873 | Tool origin uncertainty, not proof of handle misuse. Includes 861 `freeze` calls in the raw scan. Security-sensitive shared calls remain reviewable; no blanket runtime pass.               |
| Unresolved process entry             |                         24 | Dynamic Node/Git/provider/stock-probe boundaries remain shared and require their actual bounded runtime contracts. An unresolved target alone is not a defect.                              |
| Unawaited resource lease             |                         11 | Actual rows include awaited callback delegation, returned promises and synchronous `os.release`. Retain runtime cleanup obligations; the name/parent check alone does not establish a leak. |
| Reachable native load                |                          5 | These exact rows are module-resolution lookups: `createRequire.resolve`, resolver `resolve`/`resolve.paths`, not actual addon loading.                                                      |
| Aggregate reachable native operation |                          3 | Aggregated module flags from the preceding resolution classification, in owned-content-digest, setup-validation and dependency-closure. Not proof of a native fallback.                     |
| External implementation dependency   |                          5 | jsonc-parser, prettier, MCP SDK and zod are real JavaScript dependency boundaries. This scanner does not inspect their implementation; wider package closure remains #143-owned.            |
| Observed graph mismatch              |                          1 | The committed broad inventory snapshot differs from current analysis. Keep its failed result; do not rewrite it as passing.                                                                 |

Total retained: 6,922 shared/unresolved analysis rows. This is not a remediation backlog or an assertion that they are all false positives. Four independently executed minimal scanner probes reproduce ordinary JSON, require-resolution, awaited delegation and synchronous-release limitations. Actual native platform/legacy entry implementations remain retained source; the current public entry graph does not report them as reachable. A future reachable POSIX fallback would remain in scope even if stored beside Windows or legacy code.

## Actionable current blockers

1. **Current POSIX source-class conformance gap.** The ledger retains 30 Linux/macOS classes and 14 historical Windows classes; the latter are excluded from current renewal. Current source-contract digest is `sha256:7158727bf1dec0c8dc7a57ca1c0db0767d0903d761ed4d914bf8cd4354123184`. No shipped class matches it, including the relevant Linux/macOS subset. With the actual macOS25.6.0/arm64/Node26 stock probe context, the production data validator reports both absence and creation unavailable. This is a functional/conformance gap for the original broader #141 guarantee, with safe fail-closed behavior. Historical Windows classes do not enter current remediation. Do not edit old class digests or infer current conformance from local handoff success. Genuine current capture and ordinary class acceptance remain required.
2. **Multiproject verification fixture drift.** The affected baseline ran 159 tests:156 passed and three multiproject cases failed. They resolve fixture readiness at listener installation while production correctly fences dispatch until restoration/publication. Bind readiness to the existing broker `onReady` callback. Preserve all authentication/isolation assertions and the early-request refusal; restore this exact native-free file to real hosted coverage.
3. **Native Test platform-scope adapter.** The current source ref already schedules POSIX CI, but detached #141 Test is not yet recognized by the exact-ref adapter. Add the issue141/source-branch pair only with actual HEAD/local/published equality. Scope the exact #107 parent branch before eventual delivery. Missing or stale refs never become proof.

No unsafe production runtime defect is established merely by the raw scanner count. These concrete gaps, the retained shared uncertainties and required real OS/class evidence define the remaining work. The analysis does not claim that required runtime acceptance is complete.

## Actual admission refusals

Legacy primary inspection returned `APR_SETUP_VERSION_MISMATCH`. Its documented setup update dry-run then returned `APR_PRIMARY_AUTHORITY_UNAVAILABLE`: the primary admission root is absent and dry-run will not provision it. No setup write, primary enrollment/activation, election cleanup or provider/review operation followed.

The current local handoff is journal-only, while the existing source-registration/class authority validates genuine normal-review collateral through `checkNormalRuntimeReview`; a journal-only acceptance cannot be relabeled as that proof. A compatible sanctioned authority path must be restored or separately decided. Do not change these validators or close #141 to conceal the gap.

## Ownership and preservation

Current POSIX protection, ownership and basic source-class guarantees remain #141-owned. Native-free package closure belongs to #143; epoch/descendants to #142; broader recovery/provider-obligation discharge to #156; release conformance to #157; activation/publication remains #102/#107 with #144's separate contract. These are live owners, not blanket waivers for reachable #141 defects.

Preserve the original uncertain review and Claude session exactly as specified in the design, all historical timing rows and every Unknown value. No timing repair, clock change, provider replay, termination or inferred acceptance occurred. No original evidence was relabeled.
