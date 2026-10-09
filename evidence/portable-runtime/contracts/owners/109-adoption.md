# Bounded contract adoption — #109

Disposition: adopt the exact bounded subsection below from the accepted owner Plan. This record selects complete coupled bundle A (current-global runtime, primary-exclusive field ownership, compatible-current drain/preservation of unsupported journals) wherever that bundle governs this owner. It does not independently choose Runtime, Policy or Prior rows.

Accepted bounded Plan: docs/superpowers/plans/2026-10-05-144-contract-owner-adoption-addendum.md at 674a5c967ed32122eb0c879f4e9991fa3792535b, blob 95a44172d2683c9c5b213c6e9b7be4cd7b690149, SHA-256 3f04358b465b4722bc0d5880c2896e19df44445a1ee3839887749f24cbb935d8. Normal XPR review-057079566301a0106537dde070ea518a was finalized at that revision; manifest SHA-256 05ea2c71b969d6893e9be17d0e32d3161f7810fd2a4a9bf1a62797d0654eda93. Review authority assurance is unavailable and its basis is machine reviewer consensus, not human approval.

Reconciliation specification: docs/superpowers/specs/2026-10-03-107-runtime-policy-reconciliation-design.md at 4d8815b2fabf861d24d25fa9735b953865e99f55, blob dcb99da9191789472bbd1840beb72448bf755fba, SHA-256 4e8d38f06fb53b963089cfe5835e2722cc31a3053ac3ba7076467d93e6973405; accepted normal review review-58b490491800f0c13d64191cb58071b5, finalization 59f9628f30ea3945d92972196d7acda4350592a5.

### #109 — attributable attempt telemetry

This is #109's bounded consumption/adapter contract for the shared #107 telemetry interfaces. Live #109 specifically owns Codex headless telemetry repair and controller lifecycle timing for every Codex attempt. #152/#153 retain the broader all-provider, controller and aggregate integration implementation of #107 Tasks 13/14. This addendum accepts or completes none of those implementations. On any divergence from these bullets, the exact cited #107 `Metrics and Comparative Evaluation`, `Accounting Identity and Aggregation` and `Costs, Recovery and Privacy` sections govern.

- The controller records dispatch, first-progress, terminal and wall-duration evidence for every Codex attempt, including failures, permission interruptions, cancellation and timeout, even when provider usage is unavailable.
- Each attempt has its own run/stage/role/attempt/session identity. Round is nullable before dispatch; pre-admission attempts are stage-owned or run-owned. Every attempt has exactly one accounting owner: round, stage or run. Cross-round continuous-session usage stays at the lowest known scope without fabricated per-round allocation. Retries/replacements retain distinct records.
- Codex capability-driven collection uses supported structured host/runtime surfaces for attributable observations; missing capability, absent report and partial coverage remain distinct null/source/reason values. It does not scrape UI or substitute host/account totals.
- Measurements carry reported, derived, estimated or unavailable provenance. Derived values identify their input observations and formula. Versioned estimates record price source, model/tier, token categories, effective date, cache/tool charges and assumptions.
- Preserve native provider-reported cost with its stated basis even when that basis is unknown. Retention of reported cost needs no current-price lookup. Keep actual incremental/billed charges, list-price-equivalent estimates, currencies and subscription utilization distinct; unknown price produces an unavailable estimate. Zero requires affirmative evidence for that measure.
- Controller observations use a separate opaque controller accounting ID and never fabricate worker attempt IDs. Record counter epoch and delta/cumulative semantics; missing baselines/resets make attributable deltas unavailable. Persist observation IDs and suppress replay duplication.
- Aggregates declare included/excluded attempt and observation IDs, units, accounting basis and coverage. Use inclusive parent totals or exclusive children, never both. Keep ambiguous semantics and inconsistent native counters visible. Chain views never re-sum prior rollups; complete totals remain null until coverage is complete and compatible.
- Persist late telemetry as an immutable sibling amendment referencing exact run/attempt and predecessor receipts, linked through the #30 series-index. Corrections supersede observations explicitly without rewriting the original verdict/manifest. Incomplete coverage is a subtotal, not an acceptance failure solely because a provider cannot report a metric.
- Reuse the four shared neutral target interfaces emitted by #107, packaged by #30 and consumed by #34; no duplicate analysis/configuration language. Their production schema bytes and #152/#153 broader integration remain independently governed.

## Preserved authority and pending obligations

All ordinary Implementation-plan, Governing-spec, Source-plan, Source-plan-commit, Plan-review and approval markers are preserved. The exact live Plan Metadata snapshot and its body digest are retained in the preparation packet. This is a scoped successor pointer, not acceptance of the broader owner plan, draft specification, absent field-level schemas, or implementation.

#109 owns only Codex headless adapter repair and its attributable lifecycle/usage consumption. #152/#153 retain broader all-provider, shared integration, aggregates and chains. No whole #109 implementation Plan acceptance or repair completion is asserted.

The immutable #107 specification and all 15 publication gates remain required. Contract adoption supplies no activation, production config completion, journal quarantine, operational drain, installed exclusion, release source/tag/tarball, registration, or conformance proof. #130 detailed schemas and each owning implementation remain pending. Actual #107 applied Plan acceptance, separate native owner dispositions, immutable contract-record acceptance, and release-specific activation proof remain independently verified.

Local actual-workspace lineage proof supplements pinned Git evidence and must be explicitly identified as non-retained/non-reproducible from Git alone. No private journal or raw provider handle is exported; no untrusted pinned JavaScript is executed.

## Accepted companion and continuing integration boundary

The separately accepted #107 amendment is docs/superpowers/plans/2026-10-05-107-runtime-contract-plan-amendment.md at f792abd2061ba344c8603b69c729d14af910cf26, blob ff1a376ef81e26ec5f2402090587cfa2438b347a, SHA-256 208a8e54a014415cdef0dda2b6d266b7745e7126d0902a34c2b7c1041b420828. Normal XPR review-a4157c49c11ad9d12836d7bfea0df472 finalized at that revision; manifest SHA-256 4a4878c34cea8f9fae8e6dfc38081d15c10e315080053183f1fb6101c66e972f, machine reviewer consensus with unavailable authority assurance.

This native owner disposition adopts only its accepted common-owner subsection and exact contextual rule where assigned. It does not assert that the applied full canonical #107 Plan is already accepted: that repeat review/native mapping remains pending. The accepted amendment sequence obtains these individual scoped records before applying/reviewing the complete canonical Plan. Joint contract adoption remains blocked until all separate accepted source/record transactions are verified.

The #102/#130 independently reviewed protected registration-store/receipt transport and exact read-back of the approved contract/activation pair are continuing production integration gates. This scoped record does not accept their absent detailed schema/transport bytes or claim runtime deployment. Publication alone grants no runtime activation authority. Retained local lineage-proof receipts need actual strict checker-owned producer/source verification and independent normal evidence review; they do not export original private journals or create stronger attestation.

<!-- aitm-owned-comment key="runtime-contract-adoption.144-v1" -->