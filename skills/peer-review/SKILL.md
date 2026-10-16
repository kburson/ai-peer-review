---
name: peer-review
description: Use when two agents review a local specification or plan and exchange artifact and response-note filepaths.
---

# Local peer review

Use the installed package's `peer-review` command from the actual project.
Existing ordinary project filesystem access is sufficient. New local reviews
need no ACL challenge, runtime enrollment, primary activation, source-class
capture, native helper or broker. Keep the real author and reviewer sessions
distinct. The invoking session is the author; a human sponsor is not its identity.

For installation outside a participant turn, use
`npm install --global @kburson/ai-peer-review`. Use the existing compatible
installation afterward; do not reinstall or upgrade during a pending review.
Consumer CI does not need AI peer review unless it invokes a review command.

## Start and hand off

1. Identify the tracked issue number, artifact filepath, reviewer provider,
   exact model ID and effort. Show those selections before starting. Preserve
   the user's exact model/effort identifiers; default omitted effort to medium.
   A model nickname is a hint: use the provider's available choices to resolve
   it or ask if ambiguous. Do not invent a package model alias list.
2. Run `peer-review start <artifact> --artifact-kind spec --issue <N>
--reviewer-provider <provider> --reviewer-model <exact-id>
--reviewer-effort <effort>`. Use `peer-review help <command>` for syntax.
3. Pass the generated absolute invitation filepath to the distinct reviewer.
   Read the full invitation and current response, not a chat summary. The
   reviewer joins, writes its notes and submits with the exact generated command.
4. Read the full reviewer notes. The author revises the artifact and its own
   current response, then submits. Pass the next response/artifact paths back
   to the same reviewer. Follow the event-derived next action and turn limit.
5. Only an actual reviewer acceptance allows author finalization. For ordered
   spec/plan work, start with `--phases spec,plan`, finalize the accepted phase,
   then use the exact `advance <workspace> <artifact>` action. Do not infer
   acceptance from silence, a process exit or a controller's own analysis.

## Exact role boundaries

- Reviewer: read review context; write only its exact current response notes.
- Author: write only the exact artifact and its own exact current response.
- Neither: modify another tracked, untracked, ignored or new path, another
  response, coordination files, `.git`, or anything outside the project.
- Automation: its fixed project-local coordination records and designated
  response publications only. The local handoff never stages, commits or pushes.

Existing sessions are instruction-bound; their host permissions are not an OS
sandbox. Use existing exact provider tool restrictions where supported. Current
authors use their existing manual session when exact automated artifact edits
are unavailable; do not add a broader shell, wrapper or security framework.
Do not handcraft Claude Edit/Write/Bash rules. Its existing package launcher
binds only the current response and exact join/submit commands.

New local state is durable journal-only `LOCAL JOURNAL MODE`; artifact snapshots
and decisions survive restarts. `--no-commit` is an idempotent spelling of the
same default, not a test flag. Explicit `--test-human-authority` records retain
`NO-COMMIT TEST MODE` and are never actual provider/human acceptance evidence.

## Pending turns and recovery

Use the exact workspace and event-derived pending action. Retry a completed
submission only with its original participant/session/version; exact retries
must not advance twice. Preserve notes and snapshots on failure. A busy or
unknown lock is not permission to take it over; never infer death from PID age.

For Claude, use `launch-reviewer` with the sealed invitation/model/effort and
its same-session `--resume` path when requested. A controller deadline does not
prove provider termination. If a completed submission left its launch reserved,
the registered author explicitly runs `peer-review recover <workspace>
--reconcile-launch` before `launch-reviewer --resume`. This separately bounded
recovery requires the exact bound session, official terminal transcript and sealed
submitted response; it never resumes an active/unknown provider. Preserve the original operation and verify the
same session's official terminal evidence before continuing; do not start a
replacement, extend a timeout or turn saved notes into an approval. An active or
unknown provider outcome remains pending. A stale reviewer claim must be
reclaimed from that actual reviewer session using the exact recovery command.

Keep essential role/session/project/turn/version authentication and locking.
Report ordinary I/O failures without ACL queries, elevation or permission repair.
Do not freeze unrelated human work between turns. Do not claim provider-enforced
denial from instruction-bound compliance or declared-session test fixtures.

## Communication policy (v1)

Apply this policy at startup and throughout all later turns, resumes, handoffs,
and finalization, in every transport and commit mode.

Keep all peer-review chat messages terse. Put complete review analysis,
findings, dispositions, revised prose, rationale, decisions, and verification
evidence in the generated durable review documents.

Chat may contain only:

- a short operational status;
- a pointer to the relevant durable document;
- the exact next action; or
- a concise blocker requiring human action.

Read the relevant durable reviewer or author response document; do not rely on
a chat summary. Do not paste findings, dispositions, revised prose,
verification output, or other durable document content into chat unless the
human explicitly requests it.

“Terse chat” does not mean terse review evidence. Durable reviewer and author
response documents remain complete, self-contained, and authoritative.

## Legacy maintenance

Existing Git-bound `normal` records remain readable history and cannot be
mutated or converted by the new local handoff. Preserve their original runtime,
private session evidence and unresolved operations; use their compatible
recovery procedure separately. Runtime registration, primary activation, setup,
broker/source-class/epoch and distribution operations retain their separate
legacy contracts. They are not prerequisites for starting or advancing this
trusted local workflow. Never invoke them merely to pass the next filepath.

For separately requested legacy maintenance, `peer-review register-runtime` and
primary registration/activation use their original compatible procedure. Never
run those commands as a prerequisite to the new local handoff.
