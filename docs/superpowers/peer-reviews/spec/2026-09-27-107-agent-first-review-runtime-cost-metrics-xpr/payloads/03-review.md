# XPR Review — Round 3

- **Artifact under review:** `FROZEN_SPEC.md` ("Agent-First Review API and Portable Runtime Design", issue #107, dated 2026-09-27)
- **Expected current SHA-256 (orchestrator-asserted, independently checked by the orchestrator):** `0d28f135e5f640c653a15bd0706c2d3ea077043e3cb958e01f932b494d4c6106`
- **Prior revision digest (orchestrator/author-asserted):** `88cd3d9c13d37ae7ef23b5c5b95c41b5ee902e0133036216f7f8c7c5605e2048`
- **Reviewer identity:** Claude Opus 5, high effort
- **Author identity:** GPT-6 Astra, high effort
- **Round:** 3
- **Prior evidence read in full:** `ROUND_02_REVIEW.md`, `ROUND_02_AUTHOR_RESPONSE.md`, `ROUND_02.patch`

## Artifact Binding and Digest Limitation

I read `FROZEN_SPEC.md` directly from this review directory in full (1813 lines), and this review
is bound to exactly those bytes as read.

**I could not independently compute SHA-256 over the file.** This role is confined to the
read/write file tools; shell execution, code execution, repository access and parent-directory
access are prohibited. The expected current digest above is therefore recorded as
orchestrator-asserted and orchestrator-verified, not reviewer-verified. This is the same
limitation stated in rounds 1 and 2 and it is unchanged: direct reading establishes *content
identity*, not *byte identity*.

What I can state positively from direct reading:

- The file is the revised #107 specification, is a single coherent document, and contains no
  truncation, conflict markers, or placeholder gaps.
- The document embeds no self-declared digest, so no in-band contradiction with the asserted
  digest was detectable.
- `ROUND_02_AUTHOR_RESPONSE.md` asserts the before/after pair `88cd3d9c…` → `0d28f135…`, and the
  round-2 review asserts `88cd3d9c…` as its own binding. Those assertions are mutually consistent
  with the orchestrator's. That is corroboration among asserted values, not reviewer verification.
- I reconciled `ROUND_02.patch` against the current file hunk by hunk. Every change the patch
  claims is present in the current text at the expected locations (Storage Layout table and
  following paragraph, the Evidence no-response sentence, the Review Series sidecar paragraphs,
  gate 3, and the Resolved Decisions lineage bullet), and I found no change in the current text
  that the patch does not account for.

## Method and Scope

Scope of this round, as instructed: reassess XPR-029 and XPR-030 against the current spec; verify
the revisions resolve the underlying issues without introducing contradictions; and inspect the
current spec for any other actionable defect that remains or was introduced. Existing finding IDs
are preserved. The round-1/round-2 limitations still apply and still affect no finding below: no
repository grounding (the `ai-peer-review` sources are not readable from here, so **Current-State
Gap Assessment** claims are reviewed as written) and no backlog access (issue bodies were not
readable, so ownership findings rest on what the document asserts). No web research was needed;
none was performed. No input file was edited.

## Overall Round-3 Assessment

The round-2 revision is narrow and disciplined: it changes exactly the two surfaces the round-2
findings named, and I found no regression on any previously resolved finding. XPR-030 is cleanly
resolved. XPR-029's central defect — lineage held only in ignored, worktree-local scratch storage
— is genuinely fixed, and the author chose the stronger of the two offered options, with the
portability promise honestly scoped rather than overclaimed.

One actionable defect remains in the area the fix touches. The new discovery rule that closes the
silent-new-chain path is written under the heading "For sidecar mode," and nothing extends it to a
start that resolves to `lineage_mode=frontmatter` against a FUR that carries no pointer. That
leaves the original silent-new-chain outcome open for one of the two populations XPR-029 named:
Markdown users who chose sidecar for the first review. This is XPR-031 below. It is a scoping
omission in new text, not a re-litigation of XPR-029's disposition.

## Reassessment of Round-2 Findings

### XPR-029 — Resolved

The author selected option (a), portable lineage, and implemented it consistently across both
sections the finding required.

**Storage Layout.** The table row is now "Series index and portable sidecar" at
`docs/superpowers/peer-reviews/S/index.json`, Git policy `Trackable`, with write authority
"Package publishes under the series lock; participants read subject to visibility, never write."
That is exactly the row the finding asked for: path, Git policy, and write authority. The
following paragraph states that sidecar lineage is published in the trackable series index using
the shared `series-index/v1` contract; that each binding records `lineage_mode`, `series_id`, the
canonical repository-relative `artifact_path` and record path, the selected terminal run ID and
manifest SHA-256; that the sealed run manifest records the same artifact/series binding so the
published entry is verifiable; and that no absolute worktree path, credential or private handle is
exported. `authority/series-index.json` is demoted to "only a derived local lookup cache" whose
absence "cannot imply that a FUR has no prior lineage," rebuilt from validated portable records
after reservation and never during read-only preview. The finding's option (a) requirement to keep
only derived/cached lookup state in ignored authority is met.

**Review Series and Follow-Ups.** The finding's second half — the undefined recovery route — is
addressed by three new paragraphs. Discovery is confined to series indexes and retained run
manifests under the canonical `docs/superpowers/peer-reviews/` tree in the current physical
repository, with `artifact_path` resolved relative to that repository under the existing
physical-path, alias and containment checks. That reconciles the new lookup with the pre-existing
rule "Never search outside the physical repository by trusting frontmatter paths," which the
finding explicitly asked the author to address; the text calls it "repository-local discovery, not
permission to follow arbitrary external paths" and directs the runtime to ignore cached absolute
paths from another checkout. Linking requires a unique valid binding plus validation of the
selected terminal manifest, reconstruction anchor and digest chain, and path matching is stated not
to substitute for that validation nor to confer participant or controller authority — a
strengthening the finding did not ask for and which correctly prevents path-based authority
escalation. A content digest alone never joins two differently named artifacts.

The silent-new-chain path is closed for the covered case: a retained manifest that identifies the
artifact path with a missing, malformed or inconsistent binding, conflicting candidate series or
predecessor tips, and missing referenced records all return `APR_LINEAGE_UNRESOLVED` before new
reservation, naming `reconcile_review_series` with `repair-pointer`, `repoint` or `new-lineage`.
The runtime may neither silently allocate a new chain nor select by newest timestamp. That error
code and action set match the existing `reconcile_review_series` contract in **Disconnect and
Recovery**, including its `(or absent)` pointer-digest allowance, which is what a sidecar-mode
reconciliation needs.

Publication ordering is specified (terminal run record sealed and published first, then the
derivative index updated atomically under its lock), and "Publication or reconciliation never
edits the sidecar-mode FUR" preserves the opt-out the finding was protecting.

The portability scope is stated honestly rather than overclaimed: portable follow-up needs the
FUR, series index and referenced evidence to travel together through an ordinary commit/checkout
or verified export/import; it does not require ignored authority, credentials, old sessions or the
originating absolute directory; it cannot resume an active run from exported history; and evidence
not yet exported remains local. Given that the runtime never stages or commits, that is the
accurate boundary, and the **Resolved Decisions** bullet is qualified to match ("when the
pointer/index and referenced evidence are present in the checkout; ignored lookup caches are not
required"), which is the qualification the finding required.

Gate 3 now carries the fixture the finding asked for — non-Markdown and opted-out Markdown
follow-ups in a fresh clone and a linked worktree with no pre-existing authority/cache — plus
missing-binding, conflicting-series/tip, corrupt-anchor and escaping-path cases, and asserts that
neither lookup nor cache reconstruction mutates the FUR or imports old role authority.

I checked the revision against the surfaces it could have contradicted and found no conflict:
performing discovery in preview while rebuilding the cache only after reservation is consistent,
not contradictory; per-series `index.json` files are compatible with the plural "series indexes"
the discovery rule enumerates; publishing a binding only after a terminal record does not strand a
concurrent second start, because the artifact-scoped write lease already excludes one; and the
`series-index/v1` contract ownership declared for #30 is unchanged, so no second index format was
introduced.

### XPR-030 — Resolved

The stale sentence is gone. **Evidence** now reads: "When no response exists, the attempt is
represented by `attempts/T/attempt-evidence.json` at run scope, never by a reviewer or author
response filename. A round references it through `round.json`'s attempt IDs rather than containing
the file. Pre-round attempts have null round and are referenced by their stage/run accounting owner
in the manifest."

That matches the normative record tree (`attempts/T/attempt-evidence.json` at run scope, sibling to
`stages/…/rounds/ROUND/`), matches the earlier tree-adjacent prose ("a no-response attempt
additionally has the clearly typed `attempts/T/attempt-evidence.json`, never a response filename"),
and keeps the mislabelling prohibition the finding asked to preserve. The impossible case the
finding identified — a pre-round attempt with null round having no round directory to live in — is
now explicitly handled by the null-round/accounting-owner sentence. Gate 3 was extended beyond the
collision-free-path assertion to check the location itself and both reference cases, which closes
the detection gap the finding noted. I found no remaining sentence in the document that places
no-response evidence anywhere else.

---

# New Actionable Finding

## XPR-031 — The new lineage discovery rule is scoped to sidecar mode, leaving a silent new chain for a frontmatter-mode start against a FUR with no pointer

- **Severity:** Moderate (blocking)
- **Exact sections:** **Review Series and Follow-Ups** — the paragraph beginning "For sidecar
  mode, discover candidate bindings from series indexes and retained run manifests only under the
  canonical docs/superpowers/peer-reviews/ tree…"; the following paragraph beginning "Before
  allocating a new series, start and preview perform this discovery even when local authority/cache
  is absent…"; the earlier frontmatter paragraph "A new review validates the pointer, previous
  terminal record, prior final digest, current digest, and intervening delta, then links
  automatically"; and the sentence "Malformed/conflicting pointers, ambiguous copied series IDs and
  missing records require reconciliation rather than silently starting a new chain." Related: the
  start-request rule "defaulting to frontmatter for Markdown and sidecar otherwise"; **Required
  Verification Themes** gate 3 ("Sidecar fixtures cover non-Markdown and opted-out Markdown FURs…").

**Problem.** The revision closes the silent-new-chain path by introducing repository-local
discovery, but introduces it under an explicit mode qualifier: "*For sidecar mode*, discover
candidate bindings…". The next paragraph's "Before allocating a new series, start and preview
perform *this* discovery" takes its antecedent from that qualifier, so on the plain reading the
whole discovery-and-`APR_LINEAGE_UNRESOLVED` mechanism applies only when the resolved
`lineage_mode` is `sidecar`.

Now take the population XPR-029 named in its consequence paragraph: "Markdown users who choose
sidecar precisely to avoid FUR mutation." Such a user's first review is sidecar mode, so — per the
new rule that publication never edits the sidecar-mode FUR — the Markdown FUR carries no
frontmatter pointer. `lineage_mode` is an optional start option that "defaults to frontmatter for
Markdown," and the host agent constructs the request from natural language, so a follow-up review
that does not restate the mode resolves to **frontmatter**. In frontmatter mode the document
specifies only the pointer path: "A new review validates the pointer, previous terminal record,
prior final digest, current digest, and intervening delta, then links automatically." There is no
pointer. As the round-2 finding already established for the analogous case, an absent pointer is
not a "malformed/conflicting pointer," an "ambiguous copied series ID," or a "missing record," so
the reconciliation sentence does not fire either. Nothing in the document directs a frontmatter-mode
start to consult the trackable series index before allocating.

The symmetric case is handled — "an existing conflicting frontmatter pointer still requires
explicit reconciliation and is not silently ignored" covers a sidecar-mode start meeting a
frontmatter pointer — which makes the unhandled direction look like an omission rather than a
deliberate asymmetry.

At minimum the applicability is ambiguous: "Before allocating a new series" reads as a general
precondition, while the governing sentence reads as sidecar-only. For a section whose declared
purpose is to prevent silent new chains, and in a document that elsewhere states its path rules as
closed normative contracts, an unstated scope for the rule that closes that path is itself a
contract defect.

**Consequence.** For a Markdown FUR whose prior lineage is sidecar, a follow-up review that omits
`lineage_mode` allocates a fresh series with no error, no reconciliation prompt and no recorded
predecessor — the exact outcome XPR-029 was raised to eliminate, for one of the two populations
XPR-029 named. Two unlinked series for the same artifact then coexist in the same tracked evidence
tree, and because sidecar and frontmatter bindings both live in that tree, a later discovery pass
sees "conflicting candidate series" and must return `APR_LINEAGE_UNRESOLVED`, converting an
avoidable omission into mandatory operator reconciliation. The run additionally performs the
bounded initialization merge and writes a frontmatter pointer into a FUR whose owner chose sidecar
specifically to avoid that mutation; the merge is disclosed in preview and the receipt, so it is
not unauthorized, but it is disclosed as a *new* lineage rather than as an unresolved-lineage
condition, so the disclosure does not inform the user of the real situation. Gate 3 will not catch
this: its new lineage fixtures are described as "Sidecar fixtures," so the follow-up leg runs in
sidecar mode.

**Required change.** In **Review Series and Follow-Ups**, state the discovery rule's scope
explicitly rather than leaving it to the "For sidecar mode" qualifier. Specifically:

1. Make the pre-allocation discovery mode-independent: before allocating a new series, a start or
   preview performs the repository-local discovery described in that paragraph regardless of the
   resolved `lineage_mode`, and in frontmatter mode it does so whenever the FUR carries no valid
   pointer. Keep every existing constraint — canonical-tree-only lookup, repository-relative
   `artifact_path`, manifest/anchor/chain validation, no authority conferred by path matching.
2. State the outcome for a frontmatter-mode start that discovers a valid prior binding: either it
   links to that series and the initialization merge writes the *existing* `series_id`/record
   pointer (not a fresh one), or it returns `APR_LINEAGE_UNRESOLVED` naming
   `reconcile_review_series` with `repair-pointer` or `new-lineage`. Pick one and say which; do not
   leave "allocate a new chain" reachable.
3. Confirm in the same place that a discovered binding recorded with `lineage_mode=sidecar` is a
   valid link target for a frontmatter-mode start and vice versa, since bindings carry
   `lineage_mode` and both modes publish into the same trackable index.

Extend gate 3's lineage coverage with a fixture that performs the follow-up review in **default
(frontmatter) mode** against a Markdown FUR whose prior lineage is sidecar and which therefore has
no frontmatter pointer, asserting that it does not allocate a new chain silently.

---

# Non-Actionable Observations

Recorded so they are neither lost nor mistaken for findings. None requires a change and none should
be treated as a finding in a later round.

- **User-Requested Sequences** still says, unqualified, "A later review of the same FUR is a new
  immutable run linked automatically to the prior terminal run." The dedicated section now states
  the precise conditions and failure modes; this is an introductory prose summary of the same kind
  as the Summary sentence recorded as non-actionable in round 2, and it creates no competing rule.
- The revised sentence "Sidecar mode uses the package-published binding in the trackable series
  index instead of inserting YAML; an existing conflicting frontmatter pointer" runs well past the
  document's prevailing wrap width. Purely cosmetic; the document already contains several such
  lines.
- The `authority/series-index.json` cache is now normatively non-authoritative in every path
  (discovery reads portable records; cached absolute paths are ignored; its absence implies
  nothing), which makes it close to inert in this release. That is the correct direction for the
  finding it resolves and is not a defect.
- The four round-2 non-actionable observations (the `--request` example path, the single-valued
  `monitoring.on_missing_surface`, the `max_rounds_limit` validation-not-clamp behaviour, and the
  Summary's round-binding sentence) are unchanged by this revision and remain non-actionable.

# Checked and Found Sound (Round 3)

Beyond the round-1 and round-2 lists, which I do not re-litigate: the record-tree placement of
`attempts/T/`, `changes/C.patch`, `payloads/P.bin` and `receipts/T.json` remains collision-free
under the revised no-response rule; `APR_LINEAGE_UNRESOLVED` and its action set are consistent with
the `reconcile_review_series` contract, including its absent-pointer-digest allowance and its
"bounded pointer or sidecar change" write authority; the Storage Layout non-aliasing invariant and
the authority/private exclusions are untouched by the new trackable row; the sealed manifest's
artifact/series binding gives the published index entry an independent verification source rather
than trusting the index alone; the ordering of terminal-record publication before atomic index
update cannot publish a binding that points at unsealed evidence; and the series lock plus
artifact lease together prevent a concurrent second start from racing the new discovery path.

---

# Verdict

**CHANGES REQUIRED** — XPR-029 and XPR-030 are resolved and introduce no contradiction with the
surrounding design. One new actionable finding, XPR-031 (Moderate, blocking), remains: the new
pre-allocation lineage discovery is scoped to sidecar mode, leaving a frontmatter-mode start
against a pointerless FUR able to allocate a new chain silently for exactly the Markdown-opt-out
population XPR-029 identified.
