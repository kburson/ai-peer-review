---
record_kind: manual-same-agent-sar-review
round: 1
reviewer_commit: 9130dc6fa73f80b89ddc67c4f29f055f52d08600
input_revision: issue-222-plan-r2
input_sha256: 58bea1b4f965c858fe4d604794d42dcec939d24a51db9485dbb2105a3d33e2bc
requested_model: gpt-6-astra
requested_effort: high
---

# Round 1 plan review

Decision: changes required. This is manual same-agent SAR, not an independent review, native product acceptance, runtime model attestation, owner adoption or Plan approval. Review covers the complete fresh plan against accepted specification revision 13, SHA-256 `f67d8a5c22b8a36537876aee529fe9dbc0530b7137650c28f144d7b9960ad5be`, and current source at the full HEAD above. No orphan plan or protected session was consulted.

## Findings

### F1 — High: prerequisites and shared writers are incomplete

Task 15B explicitly consumes Task 12 manifests but has only 14/15A prerequisites. Task 14 does not depend on 12. Because waves are explicitly earliest eligibility rather than global barriers, 15B may execute before its required producer. Task 19B can also become eligible before 16 finishes, although both may modify `src/cli/run-core.mjs`; the file is the 6,054-line shared controller. Task 18 publication rehearsal needs actual complete cycle eligibility from 16 and a callable publisher interface, not only pure reservation helpers. Add producer and serialization dependencies, then regenerate waves mechanically from task headers and check all shared paths.

### F2 — High: several nominally bounded leaves hide independent work

The 1.75 engineering hours in 05C covers replacing installed qualification, several ownership readers/writers and atomic runtime inventory activation. Current `process-source-assurance.mjs` is 531 lines, `process-identity.mjs` 571, `portable-ownership-core.mjs` 568, `portable-owner-lifecycle.mjs` 380 and `ownership-election.mjs` 991. The 1.75 engineering hours in 15B covers start capture, revision handoff, provider boundaries and activation in a 6,054-line controller. Task 06 combines a 419-line proof module, an 825-line evidence module, development CI consumers and live process test admission. Task 01 combines all source, installed/downstream and 40-issue discovery. These are different reviewable responsibilities, not justified complete-task forecasts. Split them before forecasting; preserve a single atomic process activation delivery and inactive preparation, without resetting any attributable prior work. Similarly partition the larger issue-disposition sets and leave newly discovered additional work explicitly unregistered rather than hiding it in a residual task. A revised provisional author forecast is still not an independently inspected native forecast.

### F3 — High: a new seal cannot be placed inside an unchanged portable-owner/v1

`portable-ownership.mjs:668` writes `ai-peer-review.portable-owner/v1`; `portable-ownership-core.mjs:430–440` requires exactly `classId`, `contractDigest`, `approvalDigest`, `precision`; `portable-owner-lifecycle.mjs:175` also accepts v1 only. A new process-source seal schema alone does not version the containing persisted ownership document. The current file map omits the actual writer and `owner-lifecycle-core.mjs`. Adopt an explicit portable-owner/v2 format and version-aware readers/writers, retain v1 bytes and semantics, and test persisted old-owner operations against new observations before activation. The production observation capability must retain the current identity-bound, revalidated object behavior: copied fixture JSON cannot authorize process death.

### F4 — High: the external publisher has no adopted callable contract

Tasks 07B/19A/19B name only start/submit request changes and read-only public APIs, while 18 requires an external publisher to reserve/reconcile/release a boundary. `src/api/registry.mjs:154` derives a closed operation registry from request schemas and `src/api/validate.mjs:132` rejects unknown operations. Internal `reservePublication` helpers do not provide an operator invocation. Specify a bounded versioned publication request for reserve/report/reconcile/release, exact session/reservation/revision/cycle bindings, public adapter ownership and CLI/MCP routing. This mutates only coordination records; it must never stage or commit. Include the registry and error catalog in the assigned file set.

### F5 — Medium: the selected Git patch recipe omits its actual path representation

`git diff --no-index` over separate sealed files carries their input paths; it does not emit the promised single fixed `FUR.md` path automatically. The plan also omits the apply strip level. Adopt the concrete virtual input pair `before/FUR.md` and `after/FUR.md`, with `a/` and `b/` prefixes and `git apply -p2 --unidiff-zero` into a separate destination containing only `FUR.md`. Reject any unexpected patch pathname and prove forward/reverse exact bytes. Retain original subject paths solely in bound metadata; empty byte-identical and path-only results remain explicit.

### F6 — Medium: provenance interface and public minimization need explicit acceptance cases

Task 08's return shape omits the FUR digest/revision that its two-observation promise and downstream acknowledgement checks rely on. Task 10 currently mixes capture logic with response rendering without a clear acknowledged-context input. Define a returned FUR identity and observation digest, and bind the acknowledged HEAD/context/FUR tuple to protected submission fields. Explicit unavailable provenance must preserve a recorded participant decision without claiming complete acceptance documentation. Specification §4.5 also needs concrete export tests for credentials, private handles/paths and raw provider output in new v2 records/errors; a check that overlays contain no source contents alone does not cover these leaks.

### F7 — Medium: source freeze timing contains a backwards dependency

Task 25A says 25C freezes the source before portable collection, while 25C depends on 25B portable collection. Task 25B can also run before later source-writing 16 under the current graph. State one concrete ordering: all source-writing leaves complete; integration owner freezes the candidate; 25A/25B collect candidate evidence; 25C commits the final record and freezes the actual final SHA; exact-source rules determine which final lanes must run again, with final outcomes retained externally to avoid an endless documentation-commit cycle. Record both identities; never label candidate receipts as final-HEAD receipts.

## Coverage retained

The plan already preserves global #223 Windows precedence, finite Linux/Darwin scope and Unknown behavior, explicit v1/v2/v3 contextual dispatch, effective dirty-overlay comparison, immutable root and acceptance HEAD distinctions, exact diff reconstruction without original Git objects, downstream AITM ownership and just-in-time drift gates, native approval separation and historical cumulative time. These requirements remain mandatory during revision. Exact forward/reverse patch verification, graph/cost checks, Markdown/format checks and JavaScript syntax checks are required before a clean round.
