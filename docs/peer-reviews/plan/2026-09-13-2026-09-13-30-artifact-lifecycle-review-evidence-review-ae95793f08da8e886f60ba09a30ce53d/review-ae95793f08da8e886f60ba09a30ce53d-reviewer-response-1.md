<!-- ai-peer-review-template version="1" digest="sha256:78e9a634af9d540baaf6790db82952eaf39cf7ab59a6cdc7938319ae07a4cbed" -->

<!-- protected-frontmatter -->

---
schema: "ai-peer-review.response/v1"
review_id: "review-ae95793f08da8e886f60ba09a30ce53d"
role: "reviewer"
turn: 1
commit_mode: "normal"
authority_assurance: "unavailable"
artifact_path: "docs/plans/2026-09-13-30-artifact-lifecycle-review-evidence.md"
artifact_commit: "a607b26b7471759fa58de63239e1113ab54641a3"
artifact_blob: "3d480e37a7665d13f43b188590fd47ca55fdfef8"
artifact_digest: "sha256:2d436e187e4ee2a0d22fda275d90801b67c82ad7ca8b4b688dcf105dd649ff6f"
agent:
  host: "codex"
  provider: "openai"
  model_id: "gpt-6-astra"
  model_display: "GPT-6 Astra"
  session_fingerprint: "sha256:e1d58e7ea513094120244cca24fd0f933f6a96ec0ca215cf317f2db9453cdc1e"
  identity_source: "runtime"
started_at: "2026-09-13T19:54:15.501Z"
submitted_at: "2026-09-13T19:58:04.332Z"
finding_ids: ["R1-F001","R1-F002","R1-F003","R1-F004","R1-F005","R1-F006","R1-F007","R1-F008"]
answered_finding_ids: []
acknowledged_supplement_ids: []
---

Mode: `normal`

## Summary

Decision: revisions-requested. The five-task sequence is appropriate for issue #30,
and the plan preserves the Phase 1 scope boundary, explicit opt-in, scratch-event
coordination, canonical FUR, and compact patch intent. However, several concrete
transition and transaction instructions conflict with governing authority or leave
required production behavior without an executable contract.

This is an independent planning review, not implementation validation. I read all
749 lines of the pinned plan, the entire child specification and umbrella design,
and the live issue #30 body, including its deep dive and five named probes. I
inspected the current configuration, collateral paths, response validation,
transaction, author submission, phased finalization, public API, and test-script
seams. No Git command or implementation/test suite was run by the reviewer. The
only reviewer-authored file is this exact package-generated response; protocol
transitions are package-owned.

Reviewed authority and provenance:

- Workspace root: `/Users/kpburson/projects/Vibe-Coding/ai-peer-review-worktrees/30-artifact-lifecycle`.
- Plan: `docs/plans/2026-09-13-30-artifact-lifecycle-review-evidence.md`,
  pinned commit `a607b26b7471759fa58de63239e1113ab54641a3`,
  blob `3d480e37a7665d13f43b188590fd47ca55fdfef8`, and verified file digest
  `sha256:2d436e187e4ee2a0d22fda275d90801b67c82ad7ca8b4b688dcf105dd649ff6f`.
- Child: `docs/design/2026-09-13-30-artifact-lifecycle-review-evidence-design.md`,
  verified digest `sha256:7323748682db6b92f8f6d7014b9acb16ffab09f65c73846a211f12873a42a0bb`.
- Umbrella: `docs/design/2026-09-12-project-local-review-lifecycle-and-learning-design.md`,
  verified digest `sha256:0b65a538437dc2ef2bb86533e991c90b945dacb9fbc7cbe16ad277f8f709fd27`,
  matching the child's source-authority digest.
- Issue: <https://github.com/kburson/ai-peer-review/issues/30>, read through
  `gh issue view 30 --repo kburson/ai-peer-review --json number,title,body,state,url`.
  It is open, in Plan, and explicitly requires five governed implementation children.
- Manual doctor passed with official runtime identity: Codex / OpenAI /
  `gpt-6-astra`, identity source `runtime`. Join registered the distinct reviewer
  represented in protected frontmatter. Mode is normal, authority assurance is
  `unavailable`; no stronger human-authority assurance is claimed.
- Project setup was attempted with `--dry-run` only. It returned
  `APR_SETUP_CONFLICT` for the existing skill; that file was preserved. Doctor
  subsequently reported the required manual-readiness rows healthy and join succeeded.

Locations below refer to the reviewed plan unless prefixed with another source.
Memory was used only to locate the relevant lifecycle context; current files and
issue content were independently checked and govern this decision.

## Findings

### R1-F001 — Define the transaction extension before relying on moves and C1/C2

Severity: high. Locations: Task 2 steps 7–8 (lines 287–319), Task 3 steps 5–8
(lines 424–467), and Task 4 step 3 (lines 547–554).

The plan repeatedly calls `commitExactPaths` for deletions/moves and two commits
in one review revision without defining the required extension. The current
`src/git/transaction.mjs` validates every sealed entry as existing Buffer bytes
and a regular-file mode; `assertIndexAndWorktreeBytes` and `assertCommit` require
the file to exist. Its durable journal is keyed only by `Peer-Review-ID` and
`Peer-Review-Turn`; a second different request under that key fails
`APR_GIT_RECOVERY_INVALID`. Consequently a proposed-path deletion cannot be
expressed by the current seal, and C2 cannot share C1's turn journal unchanged.
Listing the module under Task 2 files does not specify either new contract.

C1's explicit contents also omit the changed FUR and catalog digest transition
(lines 451–455). The umbrella's Patch evidence section requires C1 to contain the
verified FUR transition and both responses. Without the corresponding catalog
transition, Task 2's digest-drift check would reject the legitimate revised file
at the next catalog-dependent operation. The existing author submit transaction
in `src/cli/run.mjs` lines 2927–2961 explicitly seals the FUR and both responses.

Required change: define sealed create/update/delete entries, operation-scoped
journal identity for intake/C1/C2/finalization/migration, compatibility with old
journals, and exact ancestry/tree/mode verification. Enumerate C1's FUR, reviewer
response, author response, patch, receipt, and catalog authority; define where
indexes advance. C2 must be a separately reserved exact checkpoint operation.
Add failing tests for source absence, mode preservation, unrelated staged bytes,
both commit journals, unchanged FUR, and crashes before/after both commits and
protocol event publication. Recovery must preserve partial evidence.

### R1-F002 — Keep the predecessor current until its successor is approved

Severity: high. Location: Task 4 step 4 (lines 556–563), with Task 2's inactive
index grouping at lines 253–258.

`createSuccessor` immediately marks the predecessor `superseded`. The umbrella's
Post-approval changes section explicitly says the predecessor remains current
until successor approval. Since superseded records belong in Inactive, the
planned operation can remove a valid approved specification or plan from current
readiness as soon as a draft successor is created. An abandoned successor then
leaves no current approved readiness despite unchanged approved bytes.

Required change: create the proposed successor and lineage link without retiring
the predecessor's current readiness. Atomically switch current readiness and
record effective supersession upon successor approval. Define abandoned and
competing successors and reject ambiguous current selection. Test that draft,
revision-requested, and abandoned successors preserve predecessor readiness;
only accepted/finalized successor bytes replace it. Preserve exact plan-to-source
binding and historical delivery receipts through the switch.

### R1-F003 — Separate per-artifact approval from final phased-review completion

Severity: high. Locations: Task 3 lines 457–459 and Task 4 lines 528–554.

The plan correctly avoids terminal agreement for a non-final spec phase, but the
only promotion algorithm requires final-phase consensus. It never specifies the
non-final spec's proposed-to-approved movement or how the subsequent plan binds
to that approved spec. The existing non-final branch in `finalizeReview`
(`src/cli/run.mjs` lines 3442–3533) records a phase manifest; merely preserving it
does not add lifecycle promotion. Issue #30's deep dive expressly requires
per-artifact approval to remain distinct from whole-review completion.

Required change: specify per-phase finalization and intake on phase advance,
including an immutable accepted artifact receipt/path/digest for each phase,
its catalog/index update, and the plan's exact source artifact. Seal the overall
review only at the final phase. Add a configured spec-to-plan dialogue that
asserts the spec is approved after its phase, the review is still nonterminal,
the plan is bound to that spec, and final completion retains both approvals.
Include interruption/retry at the phase-finalization and advance boundary.

### R1-F004 — Implement and pin the new review-evidence layout, not only artifact intake

Severity: high. Locations: Task 1 lines 104–120; Task 2 files and steps 7–9;
Task 3 checkpoint creation.

The plan defines `reviews_root` and lists `src/collateral/paths.mjs`, but no step
actually routes new review creation to `.peer-review/reviews/YYYY/MM/<review-id>`
or creates the JSON manifest at intake. The current resolver still defaults to
`docs/peer-reviews`, emits Markdown manifests and unpadded numbered responses,
and names `author-startup.md` (`src/collateral/paths.mjs`, `resolveReviewPaths`).
The new JSON checkpoint schema alone cannot switch those paths or initialize
zero-revision reviews. The child Required repository layout and Review manifest
checkpoints sections require these outputs from review intake onward.

The plan also does not define whether layout/version/config selection is pinned
at review creation. Reading today's enabled config during every submit would
risk switching an already-active legacy review to the new contract, contrary to
the child's Legacy migration and umbrella's Existing reviews requirements.

Required change: add an explicit layout resolver and closed durable review
manifest initialization, including exact file names, receipts, and canonical
serialization. Record the selected layout/version with startup authority and
reuse its exact paths at join, submit, finalize, resume, and recovery. Define
coexistence/precedence with `.ai-peer-review.json` and its current review-path
settings. Test a new configured review with zero author revisions, custom roots,
an active legacy review spanning setup enablement, and a configured review
spanning later config changes. Do not migrate active evidence implicitly.

### R1-F005 — Prove production eligibility and no-commit isolation across the entire lifecycle

Severity: high. Locations: Task 1 catalog interfaces (lines 70–77), Task 2
no-commit test (lines 266–277), Task 4 tests and delivery, Task 5 compatibility.

The intake-only snapshot assertion is useful, but no step adds a configured
no-commit dialogue through revision, acceptance, finalization, and delivery
refusal. Existing no-commit regressions have no new lifecycle configuration and
cannot prove those branches are isolated. `materializeCatalog(records)` and
`recordDelivery(input)` also have no stated committed-normal-mode eligibility
boundary. The umbrella Approval section explicitly limits production readers
to committed normal-mode lifecycle events; a valid-shaped uncommitted record or
accepted-uncommitted output must never become readiness or delivery authority.

Required change: distinguish pure rendering of a planned transaction from
production catalog loading. Define how production readers establish committed
normal-mode provenance, handle dirty/untracked records, and reject test evidence.
Add a complete configured no-commit review from a root Superpowers path through
accepted-uncommitted, including an author revision and finalization retry.
Snapshot HEAD, Git index, FUR path, catalog, production evidence, and generated
indexes at each transition; allow only the existing labeled test outputs and
transient snapshots. Attempt delivery and production catalog ingestion from that
result and require refusal. Keep unconfigured normal/no-commit golden parity.

### R1-F006 — Seal every terminal outcome and constrain amendments

Severity: high. Locations: Task 4 steps 1, 3, and 5 (lines 526–571).

The implemented terminal path is reviewer-consensus acceptance. Abandonment is
specified only as an artifact event; override is absent. Neither has a planned
operation that seals every existing review file. The child Terminal amendments
and umbrella Terminal immutability sections explicitly cover acceptance,
override, and abandonment. Current protocol commands have separate abandon and
human-decision finalization paths, so accepted-finalization tests alone do not
exercise them.

`appendAmendment` accepts a replacement field/value but does not delimit which
facts can be corrected or how authority evidence is validated. An unrestricted
overlay could replace accepted artifact identity/digest or confer approval,
contradicting immutable approved bytes and successor requirements.

Required change: specify terminal sealing and durable outcome receipts for all
three outcomes, preserving existing human-authority/grant semantics and deciding
approval eligibility explicitly. Define amendment target resolution, permitted
fields, authority checks, and overlay ordering without changing accepted content
or fabricating consensus. Add red-green integration cases for override,
abandonment, each terminal-file mutation, unauthorized amendment, conflicting
amendments, and an allowed correction preserving all original bytes.

### R1-F007 — Remove the migration receipt's self-reference and define post-move retry

Severity: high. Location: Task 5 steps 4–5 (lines 663–678).

The plan commits the migration receipt in the same exact bundle whose resulting
commit the receipt is required to contain (`predecessor/result commits`). If
`result` means that bundle's commit, this is self-referential and impossible to
compute truthfully. No later receipt/checkpoint is specified. The umbrella's
predecessor-ordered evidence rule applies here as well.

Apply also says to re-plan from current source bytes before checking the plan
digest, while exact retry occurs after those source files have been removed.
Re-planning the now-empty legacy root cannot reproduce the original operation
list. Reusing exact completed work is stated as an outcome but the ordered
algorithm does not explain how it can reach that outcome.

Required change: make the tracked receipt refer only to already-known commits
and digests, return the containing commit outside its own bytes, or define a
separate later checkpoint. Resolve and verify an existing operation/receipt
before requiring original sources on retry. Reserve the original plan and
operation identity before mutation, with exact recovery behavior for crashes
before source removal, after removal, after commit, and before receipt return.
Keep identical-destination ambiguity distinct from a verified completed retry;
assert byte preservation and unchanged historical internal path values.

### R1-F008 — Specify source binding and verified delivery at the public service boundary

Severity: medium. Locations: Task 1 interfaces/example (lines 70–77, 134–146),
Task 2 intake (lines 289–298), Task 4 interfaces and delivery (lines 515–578).

Task 1 can create a plan record from arbitrary caller-supplied `chainId` and
`sourceArtifactId`, while intake says it computes opaque IDs without stating
how a submitted plan supplies/resolves its source. The CLI has no explicit
source-binding argument. Task 4 requires approved bytes for delivery but does
not define how a planning/hydration receipt is verified. Requiring approved
source bytes alone does not prove the receipt's source commit/digest, downstream
plan identity, or lineage. Opaque host IDs must remain opaque, but that does not
make all receipt claims authoritative.

Several advertised interfaces return `SuccessorPlan`, `DeliveryPlan`,
`DispositionPlan`, or `AmendmentPlan`, while their implementation steps describe
writing files and CLI handlers printing a receipt. Unlike intake/finalization,
there is no explicit apply/commit contract for these operations.

Required change: define closed input/output types and plan-versus-apply APIs,
including their module ownership, transaction receipt, authority checks, and
CLI syntax. Specify explicit source-artifact binding for plan intake, inherited
chain validation, missing/wrong-kind/wrong-chain refusal, and exact source
commit/digest verification. Define the minimum verifiable host receipt contract
without taking over AITM workflow authority. Add failing service/CLI tests for
wrong-source plans, forged/stale delivery references, arbitrary opaque host IDs,
repeat delivery, and interrupted application before implementing these services.

## Required changes

Address R1-F001 through R1-F008 in the plan, then return the revised pinned
artifact through the author response workflow. Each response should state the
exact plan sections changed and identify the behavioral tests that cover the
finding. No implementation is requested or authorized by this review.

Retain the five-child ordering required by issue #30. Allocate the transaction
contract and layout initialization explicitly to the earliest consuming child;
allocate per-phase approval, eligibility checks, and terminal outcomes to the
appropriate lifecycle children. Require governed child creation/binding before
execution; the five illustrative commits naming #30 do not themselves establish
child issue authority or epic-trail evidence.

For TDD, add explicit fail/run/implement/pass steps for the Task 4 successor,
delivery, disposition, and amendment services, and a failing run between Task 5's
apply tests and implementation. A missing-module error demonstrates scaffolding
is absent; verify that the actual behavioral assertion fails before making it
green. Integration examples must either use defined public APIs or explicitly
specified test helpers; examples such as `startLifecycleReview`,
`finalizeLifecycleReview`, and `applySetupPlan` currently have no declared
implementation/export contract in this plan.

## Optional suggestions

- Add a small requirement-to-child-to-test matrix with the five exact issue
  probe names and their nested behavioral coverage. This makes XL decomposition
  reviewable without enlarging scope or collapsing the five children.
- Define the six readiness predicates and the command/check that regenerates
  indexes for CI byte comparison; current tests establish renderer determinism
  but do not identify the consumer-project CI drift-check entry point.
- Use one consistent setup grammar and distinguish repository-relative persisted
  paths from absolute runtime paths; “absolute repository-relative” is ambiguous.

## Decision

revisions-requested
