# #124 trunk integration review

The session-handshake implementation is integrated with trunk
`a3f05b8` (#102 primary-runtime authority), preserving the primary wrappers,
operation fences, runtime-only packaging, and paused native-broker lanes.
The previous #124 branch head was `392988150461b039f457eead85ba60da34e7c2bc`.

## Merge resolution

Selection, session continuity, Claude resume path handling, and optional Codex
hook compatibility now live in the corresponding internal core modules. Primary
setup does not install model hooks. It removes a legacy hook only with explicit
`hook_added` ownership metadata; old primary host lists cannot prove ownership.
Repeated setup preserves user-owned and unproven hooks. Owned legacy automatic
settings are retired; user-owned settings retain primary/account field ownership.

Integration contract v2 describes hook-free setup. Collateral compatibility still
reads v1. A matching ambient model declaration permits manual join without a
hook; a mismatched declaration or ambiguous provider handles refuse. An existing
Claude join observation takes the strict provider verification path, so a live
model mismatch cannot fall back to declared selection.

## Independent review

A read-only code reviewer found two issues in the first resolution: inferred hook
ownership and a manual join dependency on absent hooks. Both were reproduced and
fixed. Review of the final production snapshot passed with no unresolved findings.
The review did not judge live provider execution, installed-primary activation,
or the native broker lanes paused under #102/#107. This report does not record
AITM Agent Review Passed or human approval.

## Verification

Final focused regressions: 17 passed, no failures. Full local commands passed:

- `npm test`: 547 unit tests passed; 23 golden passed, 1 skipped.
- `npm run test:slow`: 375 integration passed, 19 skipped; 40 MCP passed,
  2 skipped; 3 smoke passed. The CLI smoke file is excluded by the suite runner.
- `npm run test:packaging`: 13 passed, 5 skipped.
- `npm run lint`, `npm run format:check`, and `git diff --check` passed.

The inherited #102/#107 suite runner excludes broker test files and native-related
cases. Skipped or excluded lanes are not passing native broker evidence.

## Local package

Built with `npm run pack:runtime -- --pack-destination .tmp/publish --json`.
The runtime-only archive contains 180 entries. SHA-256:
`820fc2eab08102e15cbd59f06d26adcf970983d099b9748af0541955f19b02d6`.
Offline deployment verification reports `verified`, with native `requires-build`
and runtime inventory `requires-bootstrap`. This is package-integrity evidence,
not live review readiness. No npmjs publication or global package replacement
occurred during this resume.

## Governed delivery boundary

AITM #1847 remains open in Develop. The installed AITM package still has no
supported criteria-revision operation. #124 retains its old unchecked hook
criteria and verifier declarations. Its governed Test preflight refuses with
four `code-complete-ac-evidence-incomplete` entries plus unclassified completion
and commit-trail refusals before the final merge commit. Refresh Explain and
Test after committing/tracing; never apply raw edits or mark obsolete criteria met.

No AITM source or #1841 review records were changed. No AITM setup was run.
The earlier handoff's `.scratch/gh/124-handshake-ac-operation.json` is absent in
this checkout; do not assume that historical input is still available.
