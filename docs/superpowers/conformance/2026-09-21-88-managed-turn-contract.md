# Issue #88 managed Claude turn contract

This recovery contract preserves Claude Code 2.1.278, the registered exact sessions, subscription authentication, ordinary skills/settings, the identity hook, and the accepted #88 authority requirements. It does not claim that local fixtures prove the provider permission engine or live delivery.

| Operation            | Command authority                                                                | File authority                                  | Required progress                                                |
| -------------------- | -------------------------------------------------------------------------------- | ----------------------------------------------- | ---------------------------------------------------------------- |
| Reviewer launch/join | Sealed invitation; exact join and submit grants                                  | Read artifact; edit pending reviewer response   | Exact-session join, then reviewer decision                       |
| Author wake          | Current event authority; resume, submit, explicit no-artifact-change alternative | Edit pending author response and bound artifact | Author revision committed                                        |
| Reviewer return wake | Current event authority; resume and submit                                       | Edit pending reviewer response only             | Reviewer decision following author revision                      |
| Author acceptance    | Resume and finalize                                                              | Read only                                       | Finalization started, then acceptance committed                  |
| Unbound next phase   | Resume only                                                                      | Read only                                       | Explicit scope/next-artifact decision; no invented advance grant |

The wake command builder generates prompt commands and exact Bash grants from the same argument vectors. Canonical commands use the broker's pinned Node and package entrypoint. Exact legacy plain commands remain supported. An npx alias is granted only when the project-local package manifest/entrypoint and npm executable link match; absent or stale links fail closed. Managed wake npm resolution is offline with installation confirmation disabled. No arbitrary shell prefix, workspace wildcard, or unrestricted file-write permission is added.

Provider terminal completion and protocol progress remain separate. A wake marker must belong to the bound session/model. Tool results must match pending calls. Skill metadata must reference a completed Skill call in that wake; unrelated user messages interrupt correlation. Duplicate markers, missing terminal turns, and ambiguous outcomes cannot authorize retry. A terminal refusal can acknowledge transport while failing the release handoff gate.

The installed hermetic fixture checks exact emitted commands against grants, executes actual local npx aliases for author turns, and includes Skill expansion messages. It verifies production package/IPC/protocol integration with a modeled permission boundary. Only the separately bounded real installed-provider run can prove Claude executes that contract.

The release harness fails promptly on terminal unknown/refused wakes or acknowledged turns without protocol progress. Successful evidence must include both exact-session role wakes and corresponding committed submissions. Raw provider handles and logs remain private; the issue receipt records sanitized evidence and the tested source SHA.
