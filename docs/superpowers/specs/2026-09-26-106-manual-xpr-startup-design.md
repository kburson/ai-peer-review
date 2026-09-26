# Manual Claude XPR startup repair — #106

## Problem and scope

A Codex author selecting manual transport and Claude Opus 5 cannot complete
startup and join on the affected implementation. The broker registers authority
but then attempts an unsupported automatic launch; the explicit CLI launcher
omits the stream observation needed for runtime identity; inherited resume
configuration also causes declared manual participation to claim resume transport.

This repair covers that existing manual path. It does not change the #102
installation-policy design, provider authentication, the protocol decision model,
or automatic delivery requirements.

## Required behavior

1. Manual broker startup pins runtime and creates/registers authority, persists
   the manual journal stage, and returns the exact invitation. It never requests
   automatic launch. Resume-only and automatic-required retain validated dispatch.
2. The explicit Claude launcher and same-session resume use the existing stream
   recorder and streaming executor. The exact generated join command binds an
   observed Claude tool-use event to its actual provider session and model before
   join. A successful process exit alone never counts as reviewer submission.
3. Child environment removes inherited provider identity, preserves ordinary
   authentication environment, and supplies the selected Claude model metadata
   when no declared identity is configured. Runtime observation still validates
   the actual provider model. Existing declared reviewer identity is preserved
   when resuming; an explicit configured identity remains labeled declared.
4. CLI startup and join honor explicit/sealed manual transport even when an
   official resume command is inherited. Non-manual modes retain their identity
   and transport capability gates.
5. Exact generated Bash and response-edit permissions, independent author and
   reviewer sessions, malformed-stream refusal, and same-session resume remain
   enforced. No raw session handle or private stream is committed.

## Implementation and verification

The implementation is in `src/startup/runtime.mjs` and `src/cli/run.mjs`.
Production stream machinery lives in `src/providers/claude-stream.mjs`.
`test/integration/manual-xpr-startup.test.mjs` exercises the startup and actual
CLI paths using a controlled external process boundary. Existing launch identity,
permissions, provider, and broker integration tests retain wider regression coverage.
Broker tests that intentionally launch now explicitly select resume transport.

A live manual review of this document uses the installed candidate package,
a matched native helper, the current Codex author, and Claude Opus 5 at medium
effort. Its protocol reviewer response and finalized manifest provide durable
submission evidence. The evidence verifier checks linked artifact/response hashes
and participant/model/decision consistency; it does not independently authenticate
the provider or assert verified human authority.

The reviewer should inspect this contract and the referenced implementation for
correctness and missing cases, recording concrete findings in the generated
reviewer response. This live run proves manual startup through authoritative
submission; deterministic suites provide the broader behavioral coverage.
