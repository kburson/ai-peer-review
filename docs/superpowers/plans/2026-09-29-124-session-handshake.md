# #124 Session selection handshake

## User decision

Provider, model, and effort are requested qualities for the author and reviewer at startup or when procuring a replacement/resumed process. They establish expected depth, quality, and cost. They are not immutable participant identity. The package must not require current-model evidence on every later command or invalidate the review because a headless session changes model or effort. The registered session handle, role, issue, sealed intent, and review artifacts remain the durable authority.

## Protocol

1. `start` requires an issue and records the requested author and reviewer provider/model/effort, with run-scoped defaults if the user leaves a quality field unspecified. No project-wide model or effort pin is used.
2. On launch or resume, the orchestrator sends the exact requested triad to the provider adapter. The provider's explicit acceptance or an observed live session produces an ACK with the session handle and the strength/source of selection evidence. An explicit rejection produces a NAK with `APR_REVIEWER_SELECTION_REFUSED` and a useful recovery. Generic nonzero exit, missing output, and timeouts remain ambiguous and go through reconciliation.
3. Join binds the procured session to one role and refuses author/reviewer session collision. Later commands prove only continuity of that registered session and role. They do not require or refresh model evidence. A replacement process gets a resumptive handshake and a governed binding update.
4. Status, doctor, help, and the skill explain that an ACK confirms selection acceptance at procurement. It is not a guarantee that every later turn used that model or effort. Preserve the sealed selection request for audit and do not rewrite existing #1841 records.
5. New setup uses invitation-driven manual transport. Setup update removes package-owned automatic adapter settings coupled to the removed hook; user-owned transport settings and existing reviews remain intact. The session ID provides role attribution, not cryptographic proof of the calling process. Automatic transport still requires its own working provider observation and doctor gate when explicitly configured.

## Implementation order

- Add failing identity and CLI tests for a real session ID with no model environment, later model change, and refusal of a different session. Reproduce the existing #1841 author submit failure in a fixture.
- Extend startup grammar and sealed intent to carry author provider/model/effort as request fields. The adapter may report the actual model or may only acknowledge the request; record that distinction explicitly.
- Replace per-command model resolution with session-continuity resolution. Remove current-model hook tokens and hook trust from the required path; make package-owned hook teardown idempotent and preserve unrelated hooks.
- Verify explicit selection refusal versus ambiguous provider failure, startup/join/resume binding, and existing review compatibility. Update setup/doctor/help/skill text.
- Run focused tests, `npm test`, `npm run test:slow`, `npm run test:packaging`, lint, format, and the exact AITM verification commands. Commit under `[#124]`; make one PR/CI trip. After delivery, pack and globally install the local tarball, without publishing to npmjs.

## Non-goals

No AITM source changes. No rewriting #1841 review protocol/evidence files. No claim that a provider's model remains fixed after handshake when the provider does not expose trustworthy ongoing telemetry.
