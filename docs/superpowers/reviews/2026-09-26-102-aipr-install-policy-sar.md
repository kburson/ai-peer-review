# Issue 102 Install Policy Design: Single Agent Review

## Scope And Provenance

- Issue: [#102](https://github.com/kburson/ai-peer-review/issues/102).
- Artifact: [install policy design](../specs/2026-09-26-102-aipr-install-policy-design.md).
- Method: one Codex agent performs critical review, source verification, revision, and another full pass. No subagent or external provider is used.
- Baseline: PR #104 design; source synchronized to trunk `b7fbf455125e92cc3bbe073fc7e585cb0c623bc9`, including PR #99, before revision.
- Design only: this record does not assert implementation, independent peer-review approval, human approval, or a reviewed implementation plan.

## Round 1: Contract And Source Fit

Source: config schema and loader, setup/removal, CLI parser and dispatcher, public API, doctor, provider hooks, MCP server, and startup runtime under `src/` and `schemas/`.

| ID    | Severity | Finding                                                                             | Revision                                                                   |
| ----- | -------- | ----------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| R1-01 | High     | Field names, exact/range semantics, and mismatch policy were unresolved.            | Closed two-field object, exact equality, no configurable bypass.           |
| R1-02 | High     | User/project merging could supply or partly override a project pin.                 | Raw project authority; user tool fields invalid.                           |
| R1-03 | High     | cwd and invitation routing could consult another worktree.                          | Physical-root validation, same-root consolidation, tracking requirements.  |
| R1-04 | High     | Setup was blocked on mismatch yet also the undefined recovery path.                 | Explicit policy-only mode with old-value expectation and target equality.  |
| R1-05 | High     | Legacy grace period had no determinate behavior.                                    | Explicit opt-in legacy warning and doctor health.                          |
| R1-06 | High     | Command list omitted request-grant, broker verbs, and non-CLI writers.              | Full parser coverage and common side-effect enforcement.                   |
| R1-07 | High     | Startup-only checks miss workers and asynchronous work.                             | Mutation-boundary revalidation and drift handling.                         |
| R1-08 | High     | Blanket refusal could strand processes; permissive cleanup could admit new work.    | Narrow owned cleanup exception.                                            |
| R1-09 | High     | Policy changes could race startup or strand active reviews.                         | Idle inspection and serialized cooperating admission.                      |
| R1-10 | Medium   | Removal and user setup policy ownership were undefined.                             | Scope-specific behavior and pin preservation.                              |
| R1-11 | Medium   | aipr alias and npm-script recommendations assumed unavailable commands.             | Existing aliases and verified invocation guidance with hook compatibility. |
| R1-12 | Medium   | Closed JSON, invalid config, missing identity, and exit semantics were unspecified. | Separate warnings, doctor row, stable errors, no-side-effect diagnosis.    |
| R1-13 | High     | Version equality implicitly promised runtime or review migration compatibility.     | Separate digest, Node, broker protocol, and format checks.                 |
| R1-14 | Medium   | Old binaries and same-version different builds defeated implied guarantees.         | Explicit release, provisioning, and enforcement limits.                    |

Result: revisions required; findings addressed in the first revision. Subsequent rounds below.

## Round 2: Lifecycle, Concurrency, And Counterexamples

Re-read the complete revised design and checked setup removal, startup journals, broker registry, review locks, and exported consolidation against source.

| ID    | Severity | Finding                                                                                                              | Revision                                                                                            |
| ----- | -------- | -------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| R2-01 | Medium   | Ordinary setup wording would pin an unconfigured project during removal.                                             | Removal never adopts policy or creates config; unchanged pins do not require adoption preflight.    |
| R2-02 | High     | Releasing admission exclusion before a durable reservation leaves an idle-check race.                                | Persist recognizable startup reservation before release; crash cases require tests.                 |
| R2-03 | High     | A scratch-based lock would precede first setup's ignore rule; vague lock location could serialize sibling worktrees. | Use per-worktree Git administrative directory and bounded owned locks; no native build requirement. |
| R2-04 | Medium   | Dry run and same-value updates could unnecessarily write locks or demand idle state.                                 | Snapshot-only dry run and validated idempotent no-op semantics.                                     |
| R2-05 | High     | Fencing broker startup could block cleanup or accidentally restore a provider during shutdown.                       | Authenticated cleanup remains reachable; cleanup-only restart cannot invoke launch/resume recovery. |
| R2-06 | Medium   | Policy observation did not distinguish tool drift from unrelated config edits.                                       | Defined semantic observation plus safety rechecks; update compares full raw bytes.                  |
| R2-07 | Medium   | Public service roots, non-Git doctor, and invalid-policy read-only output were ambiguous.                            | Bound-root API contract, compatibility notes, and explicit diagnostic-only outcomes.                |
| R2-08 | Medium   | Full-version grammar left normalization and leading-zero behavior implicit.                                          | Defined string grammar and positive/negative examples.                                              |
| R2-09 | High     | New lock cooperation was implicitly promised for old executables.                                                    | Adoption explicitly requires older runners to be quiescent.                                         |

Result: revisions required; all nine findings addressed. No implementation behavior was changed.

## Round 3: Recovery Reachability And Observable Results

Rechecked the revised state transitions and actual lock inspection/reclamation in `src/protocol/store.mjs`. The current forced-reclaim helper can retain a lock after digest confirmation without requiring a stale-owner result; it must not be treated as proof that policy-lock reclamation is safe.

| ID    | Severity | Finding                                                                                   | Revision                                                                                                                                         |
| ----- | -------- | ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| R3-01 | High     | Explicit lock recovery was named but had no reachable command or ownership contract.      | Added a separate setup recovery mode, exact-digest stale-owner proof, evidence retention, and replacement-lock race requirements; no force path. |
| R3-02 | Medium   | A blocked dry-run application had no defined exit status.                                 | Nonzero for blocked previews; zero for valid previews and no-ops; application rechecks.                                                          |
| R3-03 | Medium   | Lock evidence did not fit the restricted diagnostic fields.                               | Allowed only canonical path, digest, and bounded classification/reason.                                                                          |
| R3-04 | Medium   | Read-only health and Git probes could violate the promised no-write/no-provider behavior. | Skip provider execution when policy is not compatible and disable optional Git index writes.                                                     |

Result: revisions required; all four findings addressed. No implementation tests are claimed for these future requirements.

## Round 4: Final Adversarial Pass

Re-read the complete design after revisions and traced these scenarios through its requirements:

- Fresh project setup, untracked pin, Git tracking, then compatible first review.
- Legacy active review, attempted adoption refusal, settlement, shutdown, and adoption.
- Global mismatch with a verified local candidate, unknown install mode, and same-version different builds.
- User policy injection, subdirectory invocation, foreign workspace/invitation, malformed config, and conflicting index entries.
- Every current CLI command, setup mode, broker verb, hook, MCP path, and exported mutation boundary.
- Matching setup, removal without adoption, changed-pin setup refusal, dry run, expected-value conflict, and same-value no-op.
- Concurrent start/update, interrupted admission, stale-lock recovery, replacement locks, and older noncooperating binaries.
- Policy drift during provider work, cancellation, cleanup-only restart, and preserved historical evidence.
- Read-only diagnostics with missing identity, invalid config, future review formats, and unavailable selected packages.

Result: no further actionable design findings identified. Round 3's table wording was clarified to distinguish pin-update and lock-cleanup exceptions; no contract changed during this final pass.

## Outcome And Verification

- Four review passes; 27 findings addressed across the first three rounds (14, 9, and 4).
- Final design SHA-256: `8d658008c0b646aa3fb7c29fe330ed1a85a6bd74517991a0741d5e800d648ad4`.
- Structural audit: all 20 current parser commands appear in the classification section; 16 uniquely numbered acceptance criteria; local document links resolve; no unresolved placeholder or Open Questions section; no duplicate consecutive paragraphs.
- Prettier, Markdown lint, and Git whitespace validation are the document checks for this change. The repository spelling configuration excludes this documentation tree, so spelling-tool exclusion is not claimed as a passing check.
- No application source or production tests changed. The implementation plan must still choose and prove the coordination primitive, implement the listed contracts, and execute the acceptance coverage.
- This is single-agent review evidence. It neither guarantees that no undiscovered issue exists nor substitutes for human approval, independent peer review, or implementation validation.
