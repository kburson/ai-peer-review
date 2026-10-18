# Manual SAR verification

The checked artifact is plan revision `issue-222-plan-r5`, SHA-256 `139414a3851a2edc04d429805cc1c0cc656635745ee287409089e3acb1f3cee8`. The accepted specification remains SHA-256 `f67d8a5c22b8a36537876aee529fe9dbc0530b7137650c28f144d7b9960ad5be`.

## Executed checks

- `python3 docs/superpowers/peer-reviews/222-plan-sar-astra/verify-sar.py`: passed. Its [machine-readable result](verification.json) records graph, cost, table, critical dependency/shared-writer order, exact reconstruction, JSON and link checks. All 50 leaves sum to 131 provisional human hours; maximum 3.5 hours; 25 earliest waves.
- All three retained revision patches were applied forward and backward into separate temporary destinations, with raw-byte comparisons. The full r5 → r4 → r3 → r2 chain reconstructed the original input digest without any Git object lookup or retained full FUR copy.
- Eight plan JavaScript blocks passed `node --input-type=module --check`; this checks syntax, not proposed runtime behavior. Forty existing schema JSON files and all current SAR JSON data parsed successfully.
- Explicit Prettier check of the plan and `--ignore-path /dev/null` checks of every authored SAR Markdown file: passed. This avoids the repository-wide review-collateral ignore hiding new note formatting. Immutable patches and accepted specification bytes were not reformatted.
- Targeted `markdownlint-cli2` on the plan and authored SAR Markdown: zero issues. `git diff --check`: passed.
- Git status contained only the authorized plan modification and this new SAR directory; source implementation and historical adoption receipts remained untouched.

## Corrected verification failures

The first patch experiment ran `git apply` inside a repository child directory without disabling parent repository discovery. It exited zero while skipping the virtual path, and the required byte check correctly failed. The plan and verifier now scrub Git environment, set `GIT_CEILING_DIRECTORIES`, use `--no-index -p2 --unidiff-zero`, and require exact output bytes. All retained patches were sealed only after exact round trips passed.

An initial attempt to redirect the verification report directly to `verification.json` made that file empty while the checker enumerated JSON records. Parsing correctly failed. The report is now captured in memory, parsed, then written only after successful completion. This was a report harness error and required no plan change.

No production suite, provider launch, hosted CI, process-owner experiment, protected-session read or native workflow mutation was run. Prose verification does not establish future implementation behavior, independently inspected forecasts, runtime model attestation or owner approval.
