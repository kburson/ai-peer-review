# Bounded contract adoption — #34

Disposition: adopt the exact bounded subsection below from the accepted owner Plan. This record selects complete coupled bundle A (current-global runtime, primary-exclusive field ownership, compatible-current drain/preservation of unsupported journals) wherever that bundle governs this owner. It does not independently choose Runtime, Policy or Prior rows.

Accepted bounded Plan: docs/superpowers/plans/2026-10-05-144-contract-owner-adoption-addendum.md at 674a5c967ed32122eb0c879f4e9991fa3792535b, blob 95a44172d2683c9c5b213c6e9b7be4cd7b690149, SHA-256 3f04358b465b4722bc0d5880c2896e19df44445a1ee3839887749f24cbb935d8. Normal XPR review-057079566301a0106537dde070ea518a was finalized at that revision; manifest SHA-256 05ea2c71b969d6893e9be17d0e32d3161f7810fd2a4a9bf1a62797d0654eda93. Review authority assurance is unavailable and its basis is machine reviewer consensus, not human approval.

Reconciliation specification: docs/superpowers/specs/2026-10-03-107-runtime-policy-reconciliation-design.md at 4d8815b2fabf861d24d25fa9735b953865e99f55, blob dcb99da9191789472bbd1840beb72448bf755fba, SHA-256 4e8d38f06fb53b963089cfe5835e2722cc31a3053ac3ba7076467d93e6973405; accepted normal review review-58b490491800f0c13d64191cb58071b5, finalization 59f9628f30ea3945d92972196d7acda4350592a5.

### #34 — observation-only analytics consumption

This bounded plan supplement adopts only the #107 neutral telemetry/evidence interface consumed by #34. It preserves umbrella Task 5 and the separate standalone specification/plan review gates. On any divergence from these bullets, the exact cited #107 `Metrics and Comparative Evaluation`, `Accounting Identity and Aggregation` and `Costs, Recovery and Privacy` sections govern.

- Consume `ai-peer-review.attempt-metrics/v1`, `ai-peer-review.measurement/v1`, `ai-peer-review.aggregate-coverage/v1` and `ai-peer-review.telemetry-amendment/v1` as normative target interfaces, not unreviewed implementation schema bytes.
- Correlate run, stage, role, attempt and provider session. Round is nullable before dispatch; pre-admission attempts have one stage or run accounting owner. Every attempt has exactly one accounting owner: round, stage or run. Cross-round continuous-session usage stays at its lowest known scope, with round links and no invented per-round allocation.
- Preserve visibility, pattern/stage ordering, exact artifact/context references and provenance. Controller observations have a separate opaque controller accounting ID and never fabricate worker attempt IDs or become participant/submission authority.
- Declare included and excluded attempt/observation IDs, units, basis and coverage for each aggregate. Use a parent's inclusive total or exclusive children, never both. Persist idempotent observation identity and suppress replay duplication. Chain views never re-sum prior rollups. A complete total remains null unless coverage is complete and compatible.
- Keep reported, derived, estimated and unavailable measurement provenance distinct. Derived values identify inputs/formula; estimates identify pricing/version dates and assumptions. Preserve native reported cost with its stated basis even when unknown; unknown estimates stay unavailable and zero needs affirmative evidence.
- Keep workers, controller observations and account totals separate. Missing supported usage stays null with source/reason; uncertainty is not zero.
- #33/#34 retain outcome labels, scoring vocabulary, weights, experiment design and blind comparison. #107 records optional versioned references and never defines quality scores.
- Preserve controlled-input equality, isolated equivalent arms, non-delivery authorization, observation-only results and explicit new normal-lifecycle selection.
- #31/#32 completion and the standalone #34 design/implementation plan remain prerequisites for the broader provider-comparison deliverable.

## Preserved authority and pending obligations

All ordinary Implementation-plan, Governing-spec, Source-plan, Source-plan-commit, Plan-review and approval markers are preserved. The exact live Plan Metadata snapshot and its body digest are retained in the preparation packet. This is a scoped successor pointer, not acceptance of the broader owner plan, draft specification, absent field-level schemas, or implementation.

Umbrella Task 5 is retained. The standalone #34 design is DRAFT and an accepted standalone Plan/review is absent. #31/#32 and ordinary standalone design/Plan gates remain prerequisites. No experiment, winner selection, delivery, scoring implementation or lesson activation is approved.

The immutable #107 specification and all 15 publication gates remain required. Contract adoption supplies no activation, production config completion, journal quarantine, operational drain, installed exclusion, release source/tag/tarball, registration, or conformance proof. #130 detailed schemas and each owning implementation remain pending. Actual #107 applied Plan acceptance, separate native owner dispositions, immutable contract-record acceptance, and release-specific activation proof remain independently verified.

Local actual-workspace lineage proof supplements pinned Git evidence and must be explicitly identified as non-retained/non-reproducible from Git alone. No private journal or raw provider handle is exported; no untrusted pinned JavaScript is executed.

## Accepted companion and continuing integration boundary

The separately accepted #107 amendment is docs/superpowers/plans/2026-10-05-107-runtime-contract-plan-amendment.md at f792abd2061ba344c8603b69c729d14af910cf26, blob ff1a376ef81e26ec5f2402090587cfa2438b347a, SHA-256 208a8e54a014415cdef0dda2b6d266b7745e7126d0902a34c2b7c1041b420828. Normal XPR review-a4157c49c11ad9d12836d7bfea0df472 finalized at that revision; manifest SHA-256 4a4878c34cea8f9fae8e6dfc38081d15c10e315080053183f1fb6101c66e972f, machine reviewer consensus with unavailable authority assurance.

This native owner disposition adopts only its accepted common-owner subsection and exact contextual rule where assigned. It does not assert that the applied full canonical #107 Plan is already accepted: that repeat review/native mapping remains pending. The accepted amendment sequence obtains these individual scoped records before applying/reviewing the complete canonical Plan. Joint contract adoption remains blocked until all separate accepted source/record transactions are verified.

The #102/#130 independently reviewed protected registration-store/receipt transport and exact read-back of the approved contract/activation pair are continuing production integration gates. This scoped record does not accept their absent detailed schema/transport bytes or claim runtime deployment. Publication alone grants no runtime activation authority. Retained local lineage-proof receipts need actual strict checker-owned producer/source verification and independent normal evidence review; they do not export original private journals or create stronger attestation.

<!-- aitm-owned-comment key="runtime-contract-adoption.144-v1" -->