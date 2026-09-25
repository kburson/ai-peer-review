<!-- ai-peer-review-template version="1" digest="sha256:78e9a634af9d540baaf6790db82952eaf39cf7ab59a6cdc7938319ae07a4cbed" -->

<!-- protected-frontmatter -->

---
schema: "ai-peer-review.response/v1"
review_id: "review-5c0fb5ab0be7bcb3fa7c01991792504a"
role: "reviewer"
turn: 2
commit_mode: "normal"
authority_assurance: "unavailable"
artifact_path: "docs/superpowers/plans/2026-09-24-90-claude-launch-identity.md"
artifact_commit: "1030ff655195a259f5d38f6c10f2b4d453f19a74"
artifact_blob: "0860856462a55afc64e8b80598c826c2e6924251"
artifact_digest: "sha256:330732a3ed1433dbfbd4112936264c58645193d2e41ce7730a67531e13bc94d8"
agent:
  host: "claude-code"
  provider: "anthropic"
  model_id: "claude-opus-5"
  model_display: "Claude Opus 5"
  session_fingerprint: "sha256:56da0d8987e20f4c7a104515d7a9da2f65372d15f7e51bd853eafee39d1f55cc"
  identity_source: "runtime"
started_at: "2026-09-24T23:32:43.276Z"
submitted_at: "2026-09-25T00:30:14.312Z"
finding_ids: ["R2-F001","R2-F002"]
answered_finding_ids: []
acknowledged_supplement_ids: []
---

Mode: `normal`

## Summary

Round 2 review of revision 1 (`1030ff655195a259f5d38f6c10f2b4d453f19a74`) against my sealed
round-1 findings and against the repository source. All four round-1 findings are addressed. I
verified each fix against the real files rather than accepting the author response's
characterization of them.

**R1-F001 — integration test ownership. Addressed, and the migration code is correct.**
`test/integration/claude-launch-permissions.test.mjs` now appears in the File Map (line 74)
owned by Task 3, in Task 3's **Files:** list (line 294), in Task 3's red command (line 322), in
Task 3's green command (line 433), and in Final Implementation Verification (line 526). Line 81
now assigns integration caller migration to Task 3 explicitly.

I checked the migration code at lines 353-390 against the actual test file and it works:

- `reviewer` is `identity('reviewer', 'same-claude-session')` at line 164 of the test file, and
  `identity()` returns `participantIdentity({...})`, so `reviewer.session_fingerprint` is a real
  field carrying `fingerprintSession('anthropic', 'same-claude-session')`. The existing passing
  assertion `corrected.session_fingerprint === provider.session` at test line 201 confirms the
  two values are the same, so `expectedSessionFingerprint: reviewer.session_fingerprint` is the
  correct expected evidence and keeps the submitted assertion true.
- The fields the normalization reads are real. The `conformantClaude` fixture returns
  `exit_code: 1` with `permission_denials: [{ tool: 'Edit', path: joined.paths.response }]` for
  the denied turn (test file lines 104-108) and `exit_code: 0` with `permission_denials: []` for
  the corrected turn (lines 125-129). Under the Task 3 step 5 precedence table the denied case
  resolves on the denial row to `permission-blocked` and the corrected case resolves on the
  matching-decision rule to `submitted`, preserving both original assertions.
- Passing `resumeAvailable: true` on the corrected call is harmless: the file asserts recovery
  only on the denied result (test line 188), and step 6 restricts the resume command to
  permission-blocked results.
- Line 392's instruction to preserve "the integration file's second, real CLI route test" is
  accurate — the file has exactly two tests, at lines 135 and 210.
- Step 2 is honest about the integration file being a baseline rather than a red, which is
  correct since the source reorder does not land until step 3.

**R1-F002 — published-API break. Addressed.** Global Constraints line 54 now names the break
explicitly in both directions (`outcome-unknown` instead of `submitted`, `recovery: null`
instead of a generated command) and forbids describing the unchanged export name as backward
compatible. Task 3 step 8 specifies the guide's content, and I confirmed its import example is
valid: `package.json` sets `name` to `@kburson/ai-peer-review` with `exports` as the string
`"./src/public-api.mjs"`, so the bare specifier resolves. `docs/claude-launch-api-migration.md`
is owned by Task 3, `README.md` by Task 4, and Task 4 step 5 verifies the target exists before
linking it — correct ordering. The step 8 compatibility assertions are consistent with steps 4
through 6, and they live in `test/unit/claude-launch-classifier.test.mjs`, which is in Task 3's
**Files:** list. Adding `npm run test:packaging` as an explicit gate (line 530, explained at
line 538) resolves the coverage hole I noted: it is genuinely in neither `npm test` nor
`npm run test:slow`.

**R1-F003 — orphaned parser. Addressed.** Task 3 step 3 now requires removing
`parseProviderResult`, checking for remaining references, and forbids suppressing
`no-unused-vars`. Step 9 adds targeted `./node_modules/.bin/eslint` over both provider modules;
that binary is present.

**R1-F004 — reclassification trigger. Addressed exactly as requested.** Step 6 now states the
condition once — usable private state for the validated session, newly written or preserved —
and adds "This condition is not whether a write happened: valid preserved prior state takes the
same branch," with the false branch retaining null recovery.

I also re-checked the per-task staging counts, since three of them changed: Task 1 states three
files and lists three; Task 2 four and four; Task 3 five and five; Task 4 eight and eight. All
consistent.

The plan is implementable as written. The two items below are documentation hygiene that do not
affect any implementation instruction, gate, or file list, so they do not warrant another round.

## Findings

None.

## Required changes

None.

## Optional suggestions

### R2-F001 — The traceability row now collides with this review's sealed finding IDs

Acceptance and Traceability line 516 still reads "External findings R1-F001, R1-F002, R1-F003"
mapped to tasks "3; 1/4; 2/4 respectively". That row predates this review and refers to the
prior external findings recorded in the spec's Internal SAR record (spec lines 187-189):
runner ordering, sanitization-as-sole-mechanism, and bounded diagnostics.

My round-1 findings are sealed under the same identifiers with different mappings. R1-F001 maps
to Task 3, R1-F002 to Task 3 plus Task 4, R1-F003 to Task 3, and R1-F004 to Task 3. So a reader
auditing sealed finding R1-F002 against the traceability table is sent to Tasks 1 and 4, finds
environment sanitization and CLI regression work, and sees nothing about the published-API
migration guide. R1-F004 has no row at all. The XPR Revision Record at line 542 describes the
round-1 outcome as "two required changes and two related suggestions" without IDs, so it does
not disambiguate either.

The table is the section a future implementer or auditor will use to confirm finding coverage,
and it currently contradicts protocol-sealed metadata. Suggested fix: relabel line 516 to name
its source unambiguously — for example "Spec SAR findings SAR-R1-F001..F003" or "prior external
review findings" with the spec reference — and add a separate row for this review's
`R1-F001`-`R1-F004` with their actual task mapping. Alternatively, cite the IDs directly in the
XPR Revision Record so each sealed ID traces to a task somewhere in the document.

### R2-F002 — The new tracked doc is in a cspell-checked path but has no cspell gate

`cspell.json` `ignorePaths` excludes `docs/superpowers/**` and the `docs/peer-reviews/**`
response files, but not top-level `docs/*.md`. The new `docs/claude-launch-api-migration.md`
will therefore be checked by the `cspell --no-progress "**/*.{md,mjs,js,json}"` leg of
`npm run lint`.

Task 3 step 8 requires the guide to document the normalized evidence fields and the behavior
contract, which per Task 2 step 3 includes the spawn-code allowlist `ENOENT` and `EACCES`, and
naturally involves the capture-overflow condition keyed on
`ERR_CHILD_PROCESS_STDIO_MAXBUFFER`. None of `ENOENT`, `EACCES`, or `MAXBUFFER` is in the
project dictionary — which is precisely why both this plan (line 5) and the pinned spec carry
an inline `<!-- cspell:words ENOENT EACCES MAXBUFFER -->` directive.

Task 3 step 9's targeted checks name Prettier and Markdown lint but not cspell, so the failure
surfaces only at `npm run lint` in Final Implementation Verification. This is the same class and
severity as R1-F003, which is why I am raising it as a suggestion rather than a required change.
Suggested fix: add cspell to step 9's targeted checks over the new guide, and require the guide
to carry its own inline `cspell:words` directive for the provider codes it documents, matching
how the plan and spec already handle the same terms.

## Decision

accepted
