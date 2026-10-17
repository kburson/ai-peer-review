# #190 simple local author/reviewer handoff

## Current platform and execution boundary — 2026-10-16

The human now limits the remaining work to Linux and macOS. Windows is explicitly deferred: preserve historical Windows evidence; do not run, repair or wait for Windows work, and do not claim Windows completion. This narrower current acceptance overrides older platform lists without rewriting historical artifacts. #190 implementation remains paused during the #2020-only two-hour continuation. The companion plan defines future independently verifiable chunks of at most four elapsed hours including CI waits, with separate dependencies and stop conditions. No chunk authorizes automatic continuation or weakens original operation/provider budgets.

## Purpose and authority

The user's 2026-10-16 direction replaces the overextended storage/security design for this workflow. Automate the manual practice of passing a project-local filepath to the other agent for its turn. Both agents are trusted and already have OS permission to work in the project. No additional ACL challenge, protection-admission protocol or native binary is required.

This amendment governs the local two-agent path in #107, #141, #171 and #190. It supersedes conflicting requirements for repeated or initial application-level ACL proof, protected-storage sessions, source-class enrollment/capture as a prerequisite to local handoff, and persistent PowerShell workers. Those earlier documents and evidence remain historical. This does not declare their broader release, cross-account isolation or process-source claims complete; those claims are outside this local handoff's acceptance.

The user explicitly authorized updating the governing plans before implementation. Existing inline execution remains selected. This document and its companion plan receive normal independent review before runtime changes; old review approvals do not approve these new bytes.

## The complete role boundary

| Actor      | May read                                                  | May write directly                                                                                                           |
| ---------- | --------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Reviewer   | The artifact and project context needed for review        | Its exact response-notes file for the current turn                                                                           |
| Author     | The artifact, reviewer notes and relevant project context | The exact artifact under review and its own exact response-notes file                                                        |
| Automation | The declared review inputs and its own coordination state | Its fixed project-local coordination records and the designated response file when publishing a participant's returned notes |

Neither participant may write any path outside its exact role allowlist. This includes other tracked, untracked, ignored or new files, the coordination workspace, `.git` metadata, another participant's response, earlier sealed responses and anything outside the canonical local project. The reviewed artifact is the author's explicit exception to the other-tracked-file prohibition. Authorization to maintain this repository's implementation/plans is separate from a participant's permissions inside a running review.

Keep the existing author/reviewer roles and provider adapters. Do not add another participant, security service, trust mode, generalized policy engine or new review stage. A controller routes turns; it does not author a participant's review or approval.

## Handoff flow

1. The user selects one local project and artifact. Resolve the physical project root, artifact and exact response paths once for the review; refuse escapes or aliases that point outside the project.
2. Start the reviewer with the artifact filepath, current turn identity and its exact response destination. The reviewer produces notes without changing the artifact.
3. Record those notes and the reviewed artifact version. Hand their filepath to the author.
4. The author revises only the artifact and writes its own response. Hand those filepaths back to the reviewer.
5. Repeat under the existing turn/round limit until the actual reviewer accepts, the user stops, or an error leaves the turn pending. An agent exit or silence is never an approval.

Use the existing journal and provider handoff mechanisms where they satisfy this flow. Do not build a replacement orchestration framework, background security monitor or daemon for this amendment.

## Essential integrity only

- Bind each handoff/submission to its review, project, participant role, session, turn and expected artifact version. Retain the existing local authentication/grants needed to prevent a misrouted or duplicate turn. If the existing loopback transport is used, keep its request authentication and project/instance binding; adding a new transport is unnecessary.
- Permit one owner of a review's state transition at a time. Keep exclusive lock acquisition, expected-revision updates, atomic writes and idempotent exact retries. A stale or duplicate submission cannot advance the turn twice.
- Keep response authorship and sealed prior responses intact. A controller cannot fabricate a reviewer decision. Preserve the artifact digest/version needed to know what was reviewed; do not repeatedly inventory/hash the whole installation or project merely to pass the next filepath.
- Use existing provider/tool write restrictions where supported. An automatically launched reviewer gets only its exact response edit, or runs read-only with automation publishing its returned notes there. An automatically launched author requires existing exact artifact/current-response edit support. If that author scope is unavailable, hand the turn to an existing human-launched author session with the instructions below; do not add an artifact-publishing wrapper, grant a broader shell, or build a new permission subsystem.
- Existing human-launched author and reviewer sessions remain supported. They receive the same explicit role/path instructions, but their pre-existing host permissions are not controlled by this automation. Describe their write scope as instruction-bound, not provider-enforced. This is the trusted manual-session handoff the user wants automated; absence of a new sandbox is not an ACL challenge or a reason to prohibit that handoff. Where status/evidence reports provider enforcement, require actual provider support. Do not claim OS isolation or that instructions prevent every unauthorized write.
- For automation-performed writes, check physical containment at publication and reject `..`, outside-project destinations and symlink/reparse escapes. For provider/manual-session writes, use initial physical path binding and any supported exact-path tool restriction, then recheck target identity/containment before sealing or advancing. A mismatch refuses submission; the automation cannot promise to intercept an independent provider editor at write time or undo a write it already made. Deliberate hostile path swapping is outside the trusted-filesystem guarantee.

The local handoff performs no Git writes or automatic commits. Read-only Git inspection is permitted. In a linked worktree, the canonical project means the physical worktree root, not its outside Git common directory; neither participant nor this handoff writes that common directory. Legacy normal-mode audit commits are outside this amended handoff. Implement production journal-only handoff semantics; do not relabel the existing no-commit test mode as production evidence.

The automation's coordination-write allowlist is separate from participant edit permission. Existing package-owned protocol commands may append the review journal and publish the exact response; they may not modify the artifact on the reviewer's behalf, touch unrelated tracked files, make arbitrary Git changes or write outside the project. Keep host installation/configuration outside a running participant turn.

## Normal filesystem access

Use ordinary Node filesystem operations and the OS permissions already granted to the user. Create private coordination files with normal restrictive creation modes where supported; do not change existing project permissions. A real read/write denial is reported as that operation's failure, without elevated retry, permission repair or a request to prove ACLs.

This includes startup and tool discovery for the existing local MCP handoff server. Use the same installed-package and physical-project admission as local turns; do not require primary activation, account selection or finite source-class enrollment merely to connect. Discovery grants no participant claim or review acceptance. Each wait retains its own bounded operation authority, project/review binding, sealed-journal and recipient/receipt checks; actual role claims and turn submissions retain their existing participant/session authentication. Legacy Git-bound reviews remain read-only in this local runtime. Primary-maintenance commands keep their separate existing guards and claims.

Passive MCP waiting performs no filesystem effect and holds no effect-authority context. Creating a delivery source, installing its watcher, reading a notification's journal/receipt and producing recovery guidance each use the existing bounded local operation boundary; nested effects keep that observation's original signal/deadline. A filesystem hint grants no authority and starts a fresh authenticated observation outside the completed watcher's creation context. No expired control context is extended or renewed to cover passive time. Keep cancellation, duplicate-wait sharing and canonical delivery checks. A configured long tool timeout does not enlarge any control/query budget.

The local handoff does not query Windows DACLs, macOS extended ACLs, principal/SID membership, ancestor ACLs or protection receipts before starting or advancing a turn. It does not run a PowerShell query worker, call native broker-security, compile an addon, download a binary or ship a custom executable. No environment flag or caller-supplied `trusted:true` is needed: this is the explicitly selected local workflow.

The scope does not promise resistance to malicious same-user software, unrelated administrators or a hostile project filesystem. The supported provider write restrictions and ordinary path/identity checks prevent role mistakes within the trusted workflow; they are not claims of a hostile-process security boundary.

## Minimal recovery

Persist the last completed turn and pending handoff in the existing review journal. On restart, read that state and resume the pending turn without rerunning a completed submission. Preserve partially written notes and report incomplete delivery truthfully. An uncertain launch remains pending until the existing provider evidence or explicit operator recovery resolves it; do not blindly start a duplicate agent.

Keep ownership checks needed to avoid stealing a live review lock or killing an unrelated process. Directly owned child handles and available OS process identity can support cleanup; PID age, timeout or silence alone is not proof of death. If ownership cannot be established, retain the lock/state and offer explicit recovery instead of automatic takeover. The user does not need to enroll a host, supply a source-class receipt, change a clock or prove a finite process-source class merely to resume a local filepath handoff.

No process-tree, reboot, cross-account isolation, automatic provider-orphan discharge or machine-wide service guarantee is added. Existing unresolved provider/review evidence is preserved, not retroactively declared recovered.

## Governing changes and acceptance

The companion plan updates #107 Task2, #141's storage decomposition, #171's local consumers and #190's installed proof. Historical capture/class artifacts and accepted review blobs are not rewritten. They no longer gate this explicitly narrowed local handoff. Broader capabilities must keep their separate claims/evidence and must not be advertised as delivered by this simplification.

Keep original operation/query/portable/test budgets (30000/15000/5000/800000 ms), existing turn limits and portable concurrency cap four. No larger timeout hides a failure. Unneeded queries are omitted; none of these budgets is increased.

Success means an actual two-agent local review completes the filepath/notes/revision loop, honors the role write contract with the actual enforcement level stated, handles a duplicate submission and resumes a pending handoff after interruption, using ordinary project filesystem permission and no native component. Prove the actual two-agent/provider write boundaries on the available authorized local host. Exercise ordinary installed filesystem/turn/restart behavior across the supported Linux/macOS and Node CI matrix. Do not require live provider credentials on every CI host merely to test filepath handoff, and do not label a protocol fixture as proof of provider permission enforcement. Advertise provider-enforced write-scope support only where it has actual evidence. Existing manual sessions may complete a real handoff with instruction-bound scope; their observed compliance is not proof of enforced denial. Test actual write denial only where provider enforcement is advertised, and verify refusal to seal an artifact/response with changed physical identity. Preserve any existing user-excluded Linux manual input limitation explicitly.

Before delivery, run affected tests, lint/format, exact-head hosted full CI and the existing fresh whole-child review. Missing provider write-scope support or an incomplete actual handoff remains incomplete. Do not claim broad #107 release, protected-storage conformance, source-class acceptance or unrelated recovery work from this narrower result.

## Governing document set

- [#107 design](2026-09-27-107-agent-first-review-runtime-design.md) and [#107 implementation plan](../plans/2026-10-03-107-agent-first-portable-runtime.md).
- [#141 decomposition](../plans/2026-10-06-141-protected-storage-ownership-decomposition.md) and [#171 decomposition](../plans/2026-10-08-171-portable-consumer-decomposition.md).
- [#190 selection plan](../plans/2026-10-11-190-selection-read-scope.md), [selection design](2026-10-11-190-selection-read-scope-design.md), [read-pair design](2026-10-12-190-posix-read-pair-design.md) and [retired worker proposal](2026-10-10-190-stock-probe-lifetime-design.md) carry explicit supersession notices.
- [Companion implementation plan](../plans/2026-10-16-190-trusted-local-storage.md) defines the three remaining tasks. Review this amendment and the changed notices as one scope revision; historical paragraphs do not reinstate a superseded local gate.
