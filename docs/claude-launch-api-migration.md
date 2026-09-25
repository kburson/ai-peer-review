# Claude launch classifier migration

<!-- cspell:ignore ENOENT EACCES -->

`classifyClaudeReviewerOutcome` still accepts `before`, `after`, `contract`, and `providerResult`, but the evidence required to prove submission or print a resume command has changed. The runner computes these fields for ordinary `peer-review launch-reviewer` users. Direct callers must supply independently validated session and private-state facts.

| Prior four-argument behavior                                                                 | Current behavior                                                                                                                          | Migrated call                                                                                                  |
| -------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| A new reviewer decision could return `submitted` using only the current reviewer projection. | Without an independently verified expected Claude session fingerprint, the decision returns `outcome-unknown` with `session-unavailable`. | Pass `expectedSessionFingerprint` derived from a valid returned Claude handle or validated prior resume state. |
| Exact response denial always included a resume command.                                      | Denial remains `permission-blocked`, but `recovery` is `null` unless usable private launch state is confirmed.                            | Pass `resumeAvailable: true` only after validating or successfully persisting that state.                      |
| Missing or unusable provider output could throw before authority was inspected.              | The runner inspects authority and returns a bounded diagnostic for a classified failure or uncertain outcome.                             | Supply normalized, bounded execution facts to direct classifier calls.                                         |

The caller-owned `normalizedEvidence` object has these exact fields from the internal normalization boundary:

| Field                | Meaning                                                                                    |
| -------------------- | ------------------------------------------------------------------------------------------ |
| `exit_code`          | Safe integer process exit code, or `null` when unknown.                                    |
| `spawn_code`         | `ENOENT`, `EACCES`, or `null` for a known executable-start failure.                        |
| `interrupted`        | Whether a signal, timeout, capture overflow, or ambiguous rejection interrupted execution. |
| `output_valid`       | Whether bounded stdout parsed as a JSON object.                                            |
| `output_issue`       | `none`, `capture-overflow`, `oversized`, `empty`, `invalid-json`, or `invalid-envelope`.   |
| `session_id_present` | Whether the structured output actually contained `session_id`.                             |
| `session_id`         | Private returned handle when present, otherwise `null`; never print it.                    |
| `permission_denials` | Safe `{tool, path}` pairs from structured output.                                          |
| `provider_failed`    | Whether structured output reported a provider error.                                       |
| `join_code`          | One of the supported identity error codes, or `null`.                                      |

For a direct caller, build that shape from bounded, caller-owned execution facts; the package normalization helper is internal and is not a public import. `verifiedSessionFingerprint` must identify the launched Claude provider session independently of the current review participant projection. Do not copy `after.state.participants.reviewer.session_fingerprint` as its source. `privateStateUsable` means a previously validated private launch state remains usable or a new private state write succeeded. A provider exit code or an attempted write does not establish it.

```js
import { classifyClaudeReviewerOutcome } from '@kburson/ai-peer-review';

const outcome = classifyClaudeReviewerOutcome({
  before,
  after,
  contract,
  providerResult: normalizedEvidence,
  expectedSessionFingerprint: verifiedSessionFingerprint,
  resumeAvailable: privateStateUsable,
});
```

The result retains `ai-peer-review.claude-launch-result/v1`. Its schema now permits a `null` `session_fingerprint` for outcomes before reviewer registration and an optional closed `diagnostic` object; submitted outcomes still require a digest fingerprint. Consumers using a copy of the older v1 validator should refresh that validator before accepting newly representable pre-join failures. Ordinary CLI users receive runner-computed evidence and do not set either new classifier argument.
