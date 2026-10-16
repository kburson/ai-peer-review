# #190 simple local author/reviewer handoff

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

Neither participant may modify another tracked file, `.git` metadata, another participant's response, an earlier sealed response, or anything outside the canonical local project. The reviewed artifact is the author's explicit exception to the other-tracked-file prohibition. Authorization to maintain this repository's implementation/plans is separate from a participant's permissions inside a running review.

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
- Enforce the role write allowlist with supported provider/tool permissions. Prefer read-only reviewer execution with automation publishing its returned notes to the exact response path if the provider cannot allow only that file. For the author, allow only the artifact and its current response. Do not grant a general write-capable shell or repository-wide edit permission to work around an unsupported provider scope.
- If the selected provider cannot honor the required write boundary through its existing sandbox/tool controls or a narrow wrapper, refuse that automation capability with a clear explanation. Never claim instructions alone enforce it or that two processes sharing an OS account are OS-isolated. No custom OS security subsystem is introduced.
- Check containment at the write itself as well as initial path resolution. Reject `..`, absolute outside-project destinations, symlink/reparse escapes and a changed physical target. Ordinary bounded file/identity checks support the allowlist; they are not an ACL challenge or a new capability hierarchy.

The automation's coordination-write allowlist is separate from participant edit permission. Existing package-owned protocol commands may append the review journal and publish the exact response; they may not modify the artifact on the reviewer's behalf, touch unrelated tracked files, make arbitrary Git changes or write outside the project. Keep host installation/configuration outside a running participant turn.

## Normal filesystem access

Use ordinary Node filesystem operations and the OS permissions already granted to the user. Create private coordination files with normal restrictive creation modes where supported; do not change existing project permissions. A real read/write denial is reported as that operation's failure, without elevated retry, permission repair or a request to prove ACLs.

The local handoff does not query Windows DACLs, macOS extended ACLs, principal/SID membership, ancestor ACLs or protection receipts before starting or advancing a turn. It does not run a PowerShell query worker, call native broker-security, compile an addon, download a binary or ship a custom executable. No environment flag or caller-supplied `trusted:true` is needed: this is the explicitly selected local workflow.

The scope does not promise resistance to malicious same-user software, unrelated administrators or a hostile project filesystem. The supported provider write restrictions and ordinary path/identity checks prevent role mistakes within the trusted workflow; they are not claims of a hostile-process security boundary.

## Minimal recovery

Persist the last completed turn and pending handoff in the existing review journal. On restart, read that state and resume the pending turn without rerunning a completed submission. Preserve partially written notes and report incomplete delivery truthfully. An uncertain launch remains pending until the existing provider evidence or explicit operator recovery resolves it; do not blindly start a duplicate agent.

Keep ownership checks needed to avoid stealing a live review lock or killing an unrelated process. Directly owned child handles and available OS process identity can support cleanup; PID age, timeout or silence alone is not proof of death. If ownership cannot be established, retain the lock/state and offer explicit recovery instead of automatic takeover. The user does not need to enroll a host, supply a source-class receipt, change a clock or prove a finite process-source class merely to resume a local filepath handoff.

No process-tree, reboot, cross-account isolation, automatic provider-orphan discharge or machine-wide service guarantee is added. Existing unresolved provider/review evidence is preserved, not retroactively declared recovered.

## Governing changes and acceptance

The companion plan updates #107 Task2, #141's storage decomposition, #171's local consumers and #190's installed proof. Historical capture/class artifacts and accepted review blobs are not rewritten. They no longer gate this explicitly narrowed local handoff. Broader capabilities must keep their separate claims/evidence and must not be advertised as delivered by this simplification.

Keep original operation/query/portable/test budgets (30000/15000/5000/800000 ms), existing turn limits and portable concurrency cap four. No larger timeout hides a failure. An unused ACL-query budget does not require making ACL queries.

Success means an actual two-agent local review completes the filepath/notes/revision loop, preserves each write boundary, handles a duplicate submission and resumes a pending handoff after interruption, using ordinary project filesystem permission and no native component. Prove the actual two-agent/provider write boundaries on the available authorized local host. Exercise ordinary installed filesystem/turn/restart behavior across the supported Linux/macOS/Windows and Node CI matrix. Do not require live provider credentials on every CI host merely to test filepath handoff, and do not label a protocol fixture as proof of provider permission enforcement. Advertise provider/host write-scope support only where it has actual evidence. Preserve any existing user-excluded Linux manual input limitation explicitly.

Before delivery, run affected tests, lint/format, exact-head hosted full CI and the existing fresh whole-child review. Missing provider write-scope support or an incomplete actual handoff remains incomplete. Do not claim broad #107 release, protected-storage conformance, source-class acceptance or unrelated recovery work from this narrower result.

## Governing document set

- [#107 design](2026-09-27-107-agent-first-review-runtime-design.md) and [#107 implementation plan](../plans/2026-10-03-107-agent-first-portable-runtime.md).
- [#141 decomposition](../plans/2026-10-06-141-protected-storage-ownership-decomposition.md) and [#171 decomposition](../plans/2026-10-08-171-portable-consumer-decomposition.md).
- [#190 selection plan](../plans/2026-10-11-190-selection-read-scope.md), [selection design](2026-10-11-190-selection-read-scope-design.md), [read-pair design](2026-10-12-190-posix-read-pair-design.md) and [retired worker proposal](2026-10-10-190-stock-probe-lifetime-design.md) carry explicit supersession notices.
- [Companion implementation plan](../plans/2026-10-16-190-trusted-local-storage.md) defines the three remaining tasks. Review this amendment and the changed notices as one scope revision; historical paragraphs do not reinstate a superseded local gate.
