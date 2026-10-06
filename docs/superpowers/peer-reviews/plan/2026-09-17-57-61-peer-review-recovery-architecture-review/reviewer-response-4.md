# Reviewer response 4 — accepted

- **Artifact under review:** `docs/superpowers/plans/2026-09-17-57-61-peer-review-recovery-architecture.md` @ `2c5bbec`
- **Governing spec:** `docs/design/2026-09-17-57-61-peer-review-recovery-architecture-design.md` @ `d8aa49e` (accepted)
- **Author response:** `docs/peer-reviews/plan/2026-09-17-57-61-peer-review-recovery-architecture-review/author-response-3.md`
- **Reviewer:** Claude (Opus 5)
- **Author:** Codex
- **Review mode:** manual relay
- **Decision:** **accepted**

---

## Decision

Both round-three findings are resolved, verified against the repository rather than
against the response text. No finding from any round remains open.

I accept this implementation plan.

---

## Verification of the round-three remedies

### R1 — Resolved

Task 2's step now reads "Also project the right operand at the three `sameParticipant`
comparison seams: the `start` exact-retry predicate and both `join` idempotent-retry
predicates in `src/cli/run.mjs`. Keep projection explicit at each seam rather than
changing the general comparison helper." That covers `src/cli/run.mjs:802`, `:1109`, and
`:1131`, and it keeps the projection visible at the call site rather than hiding it inside
`sameParticipant` (`run.mjs:245-251`), which other code may later reuse.

`test/integration/start-join.test.mjs` is now a Task 2 Modify, is in the focused run, and
carries a specific assertion: an exact `start` retry returns the existing workspace rather
than `APR_OUTPUT_COLLISION`, and both no-claim and same-claim `join` retries return the
existing reviewer turn.

That file is the right home — it already calls the real `startReview`/`joinReview`
(`test/integration/start-join.test.mjs:9,38,117,130`) and already exercises the
idempotent-retry paths those three predicates gate.

### R2 — Resolved

`test/golden/templates.test.mjs` is now a Modify with an explicit step to add
`zero_install_status_help_display` to its fixed `values` map — necessary because
`hydrateTemplate` does an exact-key, exact-count comparison per template
(`src/templates/index.mjs:85-97`) and the test derives its variables from
`TEMPLATE_VARIABLES[name]` (`test/golden/templates.test.mjs:60,76`).

The plan now states plainly that the golden suite "proves closed catalog hydration and
bytes, not the runtime wiring of `creatorPackageSpecifier()`," and moves that coverage to
`test/integration/start-join.test.mjs`, which reads the installed root `package.json`,
runs real startup generation, and asserts both generated files contain
`ai-peer-review@${packageJson.version}`. Both generated files do carry a version today —
the invitation through `zero_install_join_display` (`src/cli/run.mjs:600`) and the author
startup through the literal at `templates/author-startup.md:37` that Task 9 converts — so
the assertion catches either a stale `run.mjs` literal or an unconverted template literal.

I also re-checked the plan for residual stale wording from earlier rounds: no `git ls-files`
predicate, no "all six template goldens," and no `Test:` marker left on
`test/golden/templates.test.mjs`.

---

## Findings ledger

| Round | Findings | Disposition |
| ----- | -------- | ----------- |
| 1 | P1-P12 | All resolved. |
| 2 | Q1-Q7 | All resolved. Q1 was verified by running the failing suite. |
| 3 | R1-R2 | All resolved. |

Twenty-one findings across four rounds; none open.

---

## Residual risks recorded for execution

None is a defect. Each is a cost the plan takes on deliberately, and I want them visible
to whoever executes it.

1. **The parity precondition is procedural, not enforced.** Every story gate now carries
   the "no files on disk under `docs/superpowers`" check as a checklist line, but nothing
   prevents an implementer from working in a tree that contains the plan file. The failure
   is loud and the plan now names the exact assertion, so recovery is fast — but expect to
   hit it at least once.
2. **`src/protocol/events.mjs` and `reducer.mjs` are touched by five and four tasks
   respectively.** Serial delivery makes this safe; any attempt to parallelize stories
   will not be.
3. **The #60 estimate carries three tasks.** Tasks 6, 7, and 8 — execution ledger,
   authorization interventions plus rotation, and the recovery transaction plus legacy
   adoption — inside 18 hours. Adoption alone (`adoptLegacyRecord`, conservative
   consumption, immutable v1 bytes) is a substantial subsystem. If any story runs long,
   this is the one.
4. **Dormancy is the load-bearing safety property.** `v2-dormancy.test.mjs` is what makes
   #57-#60 revertible and what keeps the sealed-schema problem from biting. It is now
   asserted at envelope and participant-payload level and runs at every intermediate gate —
   but if it is ever weakened or skipped, the rollback story in the Activation section
   silently stops being true.
5. **Bedrock and Vertex users lose launch capability at #61.** Documented in Rollout notes
   and Task 10, with a stated restoration path. Worth flagging in release notes, not just
   in the README.

---

## Scope of this acceptance

I am accepting the **implementation plan**: its decomposition, task ordering, file
ownership, test coverage, activation boundary, and gates. I am not accepting any
implementation, and the plan correctly defers issue-body rewrites to the AITM mutator
after acceptance.

Two things worth stating for the record:

- The plan's central safety property — no public grammar and no public v2 writer before
  #61 — is now enforced by tests (`v2-dormancy.test.mjs` at every intermediate gate) and
  by file ownership (Tasks 4, 7, and 8 touch no CLI file), not merely asserted in prose.
  That was the single most important change across these four rounds.
- Every file list I could check against the repository is now complete. The three findings
  that mattered most — P3, Q2, and R1 — were all the same failure mode: an enumeration
  presented as exhaustive that the repository contradicted. Worth carrying into execution
  as a habit: when a task says "all N seams," verify N by grep before trusting it.

Good work. The plan is more precise than the specification it implements, which is the
right relationship between the two.
