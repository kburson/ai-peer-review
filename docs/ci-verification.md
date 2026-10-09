# CI verification

This is a repository development workflow. Evidence scripts are excluded from the published package.

The CI matrix runs complete unit, golden, integration, MCP, packaging and smoke tests on Node 24, Node 26 and current Node across Linux, macOS and Windows. The separate Phase 2 boundary also runs every lane. Native offline build checks and npm compatibility jobs remain required.

Each test lane records its actual npm command, child exit status, execution times, runtime, source head, tested checkout, run attempt, committed test inventory and raw output hash. Each matrix worker publishes these records and raw logs, including available failure output. The recorder requires GitHub Actions and cannot launch full suites during normal host verification.

`node scripts/ci/verify-receipts.mjs` requires completed successful CI for the current clean source head. It freshly downloads all ten workers' artifacts and checks the full inventory and configuration, raw logs, successful test steps, platform and Node versions, and genuine source or PR merge provenance. Missing, duplicate, expired, failed or mismatched evidence is refused. Downloads and provenance remain in ignored `.scratch/ci-receipts/` storage. `--lane fast` selects unit and golden evidence; `--lane slow` selects integration, MCP, packaging and smoke evidence.

Local affected tests follow each active story's verification plan. The project verification provider verifies complete CI evidence for a committed iteration, retains lint and format for finalization, and records the real cloud verifier command at Test. Test reuses the exact-head Develop lint and format receipt; these classifications must not be repeated in the project Test steps. Issue-declared quality commands may still run as targeted checks. It does not hard-code one story's affected files into repository-wide settings. Issue verifiers must also point to the cloud verifier before canonical Test is invoked; older issues with local full-suite commands require a governed verifier update. CI lane records remain distinct from AITM's canonical Test receipt, which its registered workflow creates after executing the verifier.
