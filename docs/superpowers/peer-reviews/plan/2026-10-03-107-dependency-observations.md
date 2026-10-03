# Dependency observations for the #107 plan review

The live #102 issue records accepted specification commit
`021bed7e9cc01782f0822e99fa2d3a58aadeb16e` and XPR
`review-a3927de204393c987234f146101239f9`, accepted at round 3. Its governing
specification is `docs/superpowers/specs/2026-09-29-102-primary-runtime-authority-design.md`
on `codex/102-primary-runtime-xpr`. Its plan is
`docs/superpowers/plans/2026-10-01-102-primary-runtime-authority.md`, recorded
plan commit `8ee1cbe`.

That design selects one current OS-account global runtime and activated
primary-checkout project policy. It forbids older-runtime/image fallback and
general user-to-project policy merging. Those contracts conflict with portions
of the accepted #107 specification. Plan acceptance cannot silently revise
either accepted design; the affected work needs specification reconciliation
and separate review before implementation.

The live inventory showed #132 through #136 closed, #137 open, and PR #139 open
against the #102 epic branch at head `84565bc16164d562a5d742987352db7f3a4e31d1`.
Its observed checks included a failed Node 26 Windows job and pending Windows
jobs. These are planning observations, not completion evidence.

Issue #30 owns the shared evidence contracts; #34 owns analytics. Existing #107
child #109 owns the telemetry defect and is Ready for Planning. Reuse it.

The source package doctor reported the native helper unavailable; the global
runtime reported copied-integration version mismatch. The requested review
sequence uses genuine dispatched Sol and Claude participants with explicitly
manual evidence. It does not claim package-protocol acceptance or installed
runtime conformance. Revalidate dependency observations before execution.
