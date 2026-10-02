# ai-peer-review

Two AI agents, one document, and a set of rules that keeps them honest.

`ai-peer-review` sets up a real peer review between two AI sessions: one wrote
the spec, the other pulls it apart. The reviewer can raise findings but cannot
touch the document or the Git history. The author makes every change and owns
every commit. What you get back is the review itself, committed next to the work
it reviewed.

It works with Claude Code, Codex, Grok, or any agent that can run a shell
command. It requires Node.js 24 or later, recommends Node.js 26 or later, and
uses exact-pinned dependencies for its MCP transport and closed validation
boundary. Its native broker-security helper has a separately audited,
build-only `node-gyp` dependency.

## Why bother

An agent asked to review its own spec will usually tell you it looks great. A
second session — one that did not write it and has nothing to defend — gives you
a genuinely different read.

Left alone, though, two agents in one repository get creative. The reviewer
starts "helpfully" editing the document it is supposed to be reviewing. Nobody
can say which version was actually agreed on. The reasoning lives in a chat log
that vanishes when the window closes.

So this package gives them lanes:

- The **reviewer** reads, and writes findings into one file. No edits to the
  artifact, no commits, no pushes.
- The **author** makes every change and creates every commit.
- Every step is appended to an event ledger, so the state of the review is
  something you can check rather than something an agent remembers.

Chat is the operational notification channel: a short status, a pointer to the
relevant review document, the exact next action, or a concise blocker. Generated
reviewer and author response documents are the authoritative communication
channel for complete findings, dispositions, revisions, rationale, decisions,
and verification evidence. Participants read those durable documents instead
of relying on chat summaries, and do not paste their contents back into chat
unless the human asks.

## The short version

Once your project is set up, the whole thing is three things you say out loud.

In your first agent session:

> Start a peer review of `docs/spec.md` and show me the reviewer invitation.

Open a second session — new terminal, new window, same repository — and hand it
the invitation path your first agent printed:

> Join the peer review at `<invitation path>` and review this spec properly.

Then, back in the first session, whenever the reviewer hands work back:

> Read the review findings, revise the spec, and submit the round.

The two agents pass the document back and forth until the reviewer accepts it.
Manual and resume-only modes keep you as the courier. New cross-provider reviews
(XPR) still register through the project-local broker, even when handoffs are
manual. Same-provider reviews (SPR) may use native orchestration only when the
provider can launch and resume the distinct reviewer session; otherwise they
need the broker. There is no automatic fallback to another reviewer or runtime.
You remain the tie-breaker when the agents cannot agree.

## Setting it up

Ask your agent to do it:

> Install `@kburson/ai-peer-review` globally, build its native helper, register the
> runtime and primary checkout, and run project setup for Claude Code.

Project setup writes the portable primary policy and current host integrations:

| File                                  | What it is for                  |
| ------------------------------------- | ------------------------------- |
| `.ai-peer-review/config.json`         | project configuration           |
| `.claude/skills/peer-review/SKILL.md` | the skill your agent reads      |
| `.claude/config.json`                 | a single `ai_peer_review` key   |
| `.git/info/exclude`                   | ignores `.scratch/peer-review/` |

Swap `.claude` for `.codex`, `.grok`, or `.agents` depending on the agent;
`--agent claude|codex|grok|generic` chooses. `--scope user` installs into your
home directory instead of the project.

Two things worth knowing before you run it:

- Editing `.git/info/exclude` needs your explicit go-ahead, so project setup
  asks for `--confirm-scratch-exclude`. Run it with `--dry-run` first and you
  will see the exact diff before a byte is written.
- `--remove` takes back everything the package installed, and leaves alone
  anything it did not.

That skill file is what makes the rest of this README work. Once it is in place,
your agent knows the commands, the role boundaries, and what it is not allowed
to do — so you can talk about reviews in plain language instead of quoting
flags at it.

After installing a newer package, run `peer-review setup --update --dry-run`
then `peer-review setup --update` in each affected project. `--update` defaults
to project scope and refreshes every host recorded by the prior package-owned
setup. For a prior user-scope installation, add `--scope user`. Setup automatically replaces a
previous package-owned skill and backs up its bytes as `SKILL.md.bak`; a repeat
run is a no-op. The dry run clearly labels a preview and prints the diff; an
applied update prints a readable summary with changed files and backup paths.
For an agent or script, add `--json` to get the `setup-result/v1` result with
`applied` or `no-changes`, affected operations, and backup paths. A dry run with
`--json` returns the `setup-plan/v1` object. `peer-review setup --agent <host> --scope <user|project>
--remove` is the idempotent teardown for that scope. A pre-existing or foreign
skill is preserved and still causes a conflict instead of being overwritten.
Global npm installation updates the binary but does not refresh copied project
or user skills until setup runs again. Project setup records the current integration contract and owned content digests;
review commands compare those with the activated primary policy and installed
assets. An upgrade keeps the selected locator and requires no project version pin. A mismatch returns
`APR_SETUP_VERSION_MISMATCH` with setup recovery. Run `peer-review help setup`
and `peer-review explain APR_SETUP_VERSION_MISMATCH` for the exact procedure.

Worth doing once before you rely on it:

> Run the peer-review doctor and tell me whether anything needs fixing.

`doctor` only reads. It reports whether your agent host is exposing session
identity, whether the scratch directory is ignored, and whether the transport
you asked for is actually available. For `automatic-required`, it also checks
MCP connectivity, a current resident lease, the configured long timeout, and an
end-to-end transport probe. Anything it calls out, it also tells you how to fix.

From an ordinary terminal, run `peer-review doctor --mode installation` to
check the installed package, skill, repository, scratch setup, and native broker
helper without declaring a provider or model for the project. Plain `doctor`
checks current-session review readiness and may be unhealthy when its invoking
shell lacks current model metadata. Review startup captures the provider's
current operation instead of pinning a model or effort to the worktree; either
may change before a later review start in the same provider session.

Broker-dependent startup additionally requires the package-owned native
security helper. Building it is always explicit: provide a writable package
installation and a local Node development tree that exactly matches the
running Node version and architecture. The builder never downloads headers,
never runs as an install lifecycle hook, and fails if the compiler, Python,
headers, or Windows import library is unavailable.

From the package installation (including a global installation):

```bash
ai-peer-review build broker-security
```

The command derives the matching Node development root from the Node executable
that runs the CLI. The existing `npm run build:broker-security -- --nodedir`
script remains available for package maintainers who need an explicit root.

For a read-only installation, build the same installed package in a writable
location first. `doctor` reports the command for the installation it inspected.
An unjoined broker review whose launch is explicitly refused or otherwise
proven not submitted can be retired with `peer-review broker suspend <workspace>`
followed by `peer-review abandon <workspace> --reason <text>`. The fence and
terminal event preserve the workspace and broker evidence. If launch outcome is
unknown, keep the attempt for exact provider reconciliation; lack of a reviewer
join or lineage receipt does not prove the provider was never contacted.

A missing or incompatible helper keeps the broker-security row unhealthy and
broker-dependent startup fails with `APR_BROKER_START_FAILED`; legacy manual
review operations remain available and never trigger a build.

Claude Code must expose a genuine current session through
`CLAUDE_CODE_SESSION_ID` (or `CLAUDE_SESSION_ID`). Project setup installs a
provider hook that reads the model from the exact active Claude tool use and
supplies it to each CLI invocation. Codex setup does the same from its hook
event. Start and join also write private, token-named evidence for that exact
operation. The provider is fixed by the active session; its model and effort
can change between invocations without changing project configuration. Legacy
`hosts.<provider>.identity` model fields remain readable for old configuration
files but no longer select the current model. Rerun `peer-review setup --update`
after upgrading so the host hooks and skill match the installed CLI.

The session fingerprint derives from the genuine current provider session.
Legacy reviews with a declared Claude identity retain that sealed identity for
their own pending manual submission; new reviews use current provider evidence.

The compatibility `identity_source` field remains for legacy readers; it is not
an independent model-verification claim. Current manifests expose separate
session and model evidence. Environment, configuration, and launch-request
values remain `assurance: declared`; only an authoritative provider result may
be `assurance: observed`. Conflicting declared and observed model IDs are
retained together with `conflict: true`, while legacy v1 records render as
`legacy-unclassified` instead of being retroactively promoted.

Codex and Claude Code setup install package-owned versioned settings for the
`peer-review-mcp` server, an eight-hour tool timeout, and a lease heartbeat.
Grok and generic hosts remain manual unless a future official adapter implements
and passes the same contract. Setup does not install a Claude identity hook or
status-line bridge. Preview, apply, and removal preserve all foreign hooks,
status-line configuration, and other settings.

## Running a review

### 1. The author starts it

The document has to be tracked and committed first — the review binds to an
exact blob, so a dirty file is refused rather than quietly reviewed.

> Start a peer review of `docs/spec.md` as a spec, with Claude Opus 5 as the reviewer at medium effort.

From the author session, the equivalent explicit command is:

```bash
peer-review start docs/spec.md --artifact-kind spec --issue 117 --reviewer-provider claude --reviewer-model claude-opus-5 --reviewer-effort medium
```

Replace `117` with the tracked issue number. Every new SPR or XPR requires
`--issue`; the sealed ID prefixes package-generated review commits as `[#N]`.
`peer-review explain APR_ISSUE_REQUIRED` describes the missing-issue refusal.

Model and effort identifiers are passed through exactly after syntax validation.
The package does not maintain an availability catalog. Inspect the installed
provider app for choices: Claude has interactive `/model` and `/effort`
selectors, while Grok offers `grok models`. These are selection aids, not
authority for launch; a provider-coded rejection returns
`APR_REVIEWER_SELECTION_REFUSED`. An uncertain provider result remains
subject to reconciliation.

In a conversational request, name the reviewer app and, where possible, its
exact model ID: “Review `docs/spec.md` with Claude as reviewer, model
`<exact ID from Claude>`, effort `high`.” The invoking session is the author.
Shorthand such as “opus 5.5” or “astra 6” is a hint, not a sealed model ID;
the agent should consult the installed app's choices or ask when more than one
model fits. An omitted effort uses `medium`. The agent should show the resolved
provider, model ID, and effort before calling `start`. The CLI itself accepts
exact identifiers and does not resolve aliases.

Direct classifier callers can follow the [Claude launch API migration](docs/claude-launch-api-migration.md) guide for session evidence, conditional recovery, and the widened v1 result schema.

The invoking session is the author participant; a sponsoring human is not a
substitute for its identity. Normal mode creates the tracked review evidence
and author-owned commits when required. `--no-commit` is an explicit
non-durable test mode, not an equivalent assurance level. `peer-review help
start`, `peer-review help spr`, and `peer-review help xpr` work offline.

Your agent gets back a workspace, a brief of its own, and a reviewer invitation
containing every path the second agent needs.

For automatic Claude Code broker handoffs, install the package locally, build
its native broker helper, and add a `PreToolUse` Bash hook to the project
`.claude/settings.json` with command
`node node_modules/@kburson/ai-peer-review/bin/peer-review-claude-hook.mjs`.
Check `peer-review doctor --mode automatic-required`, then add
`--transport-mode automatic-required` to `peer-review start`. The broker
validates both exact sessions and can resume either role. Manual and
resume-only operation remain choices; requested effort is not claimed as
provider-verified.

### 2. The reviewer joins

Open a second session in the same worktree and give it the invitation path. It
has to be a genuinely distinct session — that is the whole point, and the
package enforces it rather than trusting anyone to remember.

> Join the peer review at `<invitation path>` and review this spec properly.

The reviewer reads the artifact, writes a structured response — summary,
findings, required changes, optional suggestions — and closes with a decision of
either `revisions-requested` or `accepted`.

### 3. They go back and forth

Each round, the author reads the findings, edits the artifact, writes its own
response, and submits. The reviewer response, the updated document, and the
author's reply are committed together as one triad, so every decision sits next
to the revision that answered it.

> Read the latest reviewer response, address the required changes, and submit
> the round.

If either agent loses the thread, `status` and `resume` reconstruct exactly
where things stand and what the one next action is:

> What is the current state of the peer review, and whose turn is it?

### 4. Acceptance

When the reviewer accepts, the author verifies the accepted content is still
current, generates a manifest, and commits:

> Finalize the peer review.

## What you end up with

Review collateral is written straight into your tracked tree, not copied out of
a scratch folder at the end:

```text
docs/peer-reviews/spec/2026-09-10-spec-record-554e80ec.../
├── review-7a1...-reviewer-invitation.md
├── review-7a1...-author-startup.md
├── review-7a1...-reviewer-response-1.md
├── review-7a1...-author-response-1.md
├── review-8b2...-reviewer-response-1.md   # replacement attempt
├── ...
└── review-8b2...-review-manifest.md       # terminal attempt authority
```

Coordination state — the event ledger, claims, snapshots — stays in the ignored
`.scratch/peer-review/` directory. Only the human-readable record gets
committed.

`review_id` names one immutable protocol attempt and its scratch workspace.
`record_id` names the human review-of-record and its tracked collateral folder.
The first attempt defaults both IDs to the same value. A replacement gets a new
`review_id` and explicitly reuses the original `record_id`, so protocol authority
never overlaps while the human evidence stays together.

## Phased specification and plan reviews

One review can govern an immutable ordered artifact sequence. Phase authority
comes only from `events.jsonl`; provider transcripts are never consulted:

```bash
peer-review start docs/spec.md --artifact-kind spec --issue 117 --reviewer-provider claude --reviewer-model claude-opus-5 --reviewer-effort medium --phases spec,plan
# review and finalize the specification, then follow status --next:
peer-review advance .scratch/peer-review/<review-id> docs/plan.md
# review and finalize the plan normally
```

Non-final acceptance writes a phase manifest and returns control to the
registered author. `advance` derives the next kind and cursor from authority,
binds the exact artifact, and resumes the same reviewer with a fresh phase turn
budget. The final phase retains the ordinary terminal manifest and archive
contract. Omitting `--phases` preserves the single-artifact workflow.

## Recovering one review across attempts

If an attempt cannot finish, preserve it and start the replacement under the
same record identity:

```bash
peer-review start docs/spec.md --artifact-kind spec --issue 117 --reviewer-provider claude --reviewer-model claude-opus-5 --reviewer-effort medium --record-id record-554e80ec
peer-review supersede .scratch/peer-review/review-old \
  --reason "Replacement attempt started" --by review-new
```

`supersede` is a terminal, non-accepting disposition. It retains the failed
attempt's event authority and collateral; accepting prose in a draft with
`submitted_at: null` remains `not-submitted`, and an untouched generated draft
remains `incomplete`.

Repositories with older `<review-id>` directories can build one record bundle
without rewriting sealed bytes. Inspect every mapping, collision, and expected
SHA-256 digest first, then apply the exact same operation:

```bash
peer-review consolidate \
  .scratch/peer-review/review-old \
  .scratch/peer-review/review-new \
  --destination docs/peer-reviews/spec/record-554e80ec --dry-run

peer-review consolidate \
  .scratch/peer-review/review-old \
  .scratch/peer-review/review-new \
  --destination docs/peer-reviews/spec/record-554e80ec --apply
```

Apply publishes and verifies every destination before removing any source,
writes `review-history.md` plus `relocation-receipt.json`, and commits only the
tracked relocation delta in normal mode. Historical paths inside sealed
responses and manifests stay unchanged; the receipt is the additive path map.

## When they cannot agree

Reviews between two agents can loop, so they come with a budget: ten reviewer
responses by default, tunable with `--max-turns`. When it runs out, the review
stops and asks for you rather than grinding on.

From there you can extend the budget, optionally pointing the next round at one
specific sticking point (`continue --additional-turns 3 --focus <file>`), hand
in extra context both sides are missing (`supplement`), or accept the document
over the reviewer's remaining objections with a written rationale
(`finalize --good-enough`). All three take a signed human grant — an agent
cannot decide on its own that it has argued long enough. If the review is simply
not worth continuing, `abandon` ends it with a stated reason and keeps every
piece of evidence in place.

The same escape hatches cover the boring failures: a session that dies
mid-turn can be reclaimed, and a participant that is not coming back can be
replaced, both through `recover`.

## Try it without touching your Git history

If you want to watch the whole protocol run before you trust it with real work,
start a review with `--no-commit`. The conversation is identical, but nothing is
staged or committed — artifact snapshots and digests are kept in the ignored
workspace instead, and the review ends as `accepted-uncommitted`.

Every handoff in that mode is stamped `NO-COMMIT TEST MODE`, and both agents are
told to disclose it. It is a rehearsal, and it is labeled as one; it never
counts as acceptance evidence.

## The guardrails

The things that stop this quietly going wrong:

- Review state is derived from an append-only event ledger, not from whatever an
  agent believes.
- Reviewer code receives read-only observations of the repository, and cannot
  commit or push through the package API.
- Author commits use exact-path transactions and leave unrelated staged work
  untouched.
- Nothing is ever pushed for you.
- Human authority is graded as the weaker of signer isolation and verifier
  binding — it will not flatter itself.
- `--no-commit` is explicitly non-durable and never implies Git evidence.
- Automatic handoff blocks inside the local MCP tool, not in model turns; there
  is no background prompt polling while it waits.
- Durable coordination runs outside participant context, persists one immutable
  wake operation per revision and recipient, and never treats delivery as review
  authority.
- Resident liveness comes from a process instance or official opaque handle plus
  a refreshed lease. A bare PID is never treated as authority.
- Manual recovery remains available after every transport failure.

### Reviewer Git ref policy

The reviewer boundary retains every Git ref except the exact package-defined
namespaces `refs/codex/turn-diffs/checkpoints/**` and
`refs/codex/turn-diffs/captures/**`. Codex creates those private refs as
author-session bookkeeping; they cannot change the reviewed artifact,
checked-out `HEAD`, branch, index, or worktree. Creating or advancing one
therefore does not invalidate an otherwise unchanged reviewer turn.

Every other ref remains part of the sealed digest, including branches, remote
tracking refs, tags, replacement refs, notes, stash refs, worktree refs, and
lookalikes such as `refs/codex/turn-diffs/checkpoints-evil/**` and
`refs/codex/turn-diffs/captures-evil/**`. The exclusions are frozen package
constants. Repository configuration, environment variables, command flags,
and ref contents cannot widen them.

Reviews joined with 0.2.1 may have sealed the former all-ref aggregate digest.
That digest does not retain enough evidence to prove that only a Codex private
ref changed, so it cannot be migrated safely. For a ref-only failure, preserve
the existing review workspace and its not-yet-submitted response, upgrade, and
start a replacement attempt under the same `record_id`. The old response
remains draft evidence, not accepted review authority: recreate or copy its text
only into the new protocol-authorized reviewer response, then submit normally
from the distinct reviewer session.

Commands fail closed. When one refuses, it returns a stable `APR_` code, and
`peer-review explain <code>` says what to do about it — which is usually the
fastest way to unstick an agent:

> That failed with an APR error. Explain the code and recover.

## Driving it yourself

The agent-facing path above is the intended one, but everything is an ordinary
CLI and nothing is hidden from you.

After a confirmed local installation, the short binary name works:

```bash
npm install --save-dev @kburson/ai-peer-review
npx peer-review --help
```

The bare `peer-review` name only resolves to this package once it is installed
locally. Before that — or if you would rather install nothing at all — call it
by its full registry name:

```bash
npx --no-install ai-peer-review --help
npx --no-install ai-peer-review setup --scope project --agent claude --dry-run
npx --no-install ai-peer-review start docs/spec.md --artifact-kind spec --issue 117 --reviewer-provider claude --reviewer-model claude-opus-5 --reviewer-effort medium
npx --no-install ai-peer-review status .scratch/peer-review/<review-id> --next
```

Existing consumers should replace the unscoped package without changing commands or state paths:

```bash
npm uninstall ai-peer-review
npm install --save-dev @kburson/ai-peer-review
```

The `ai-peer-review`, `peer-review`, and `peer-review-mcp` binaries, `.ai-peer-review.json`, and
`.scratch/peer-review/` remain unchanged.

| Command         | Role            | What it does                                      |
| --------------- | --------------- | ------------------------------------------------- |
| `setup`         | you             | install or remove the agent integration           |
| `doctor`        | anyone          | read-only readiness check                         |
| `start`         | author          | begin a review of a tracked artifact              |
| `advance`       | author          | bind the next phased artifact and resume review   |
| `join`          | reviewer        | join from an invitation                           |
| `status`        | anyone          | current state and the single next action          |
| `resume`        | anyone          | rebuild the current actor's instructions          |
| `submit`        | author/reviewer | seal and hand off the current response            |
| `finalize`      | author          | commit acceptance and the review manifest         |
| `continue`      | author/reviewer | extend the turn budget under a signed grant       |
| `supplement`    | author/reviewer | register human-authorized extra context           |
| `recover`       | author/reviewer | reclaim a stale turn or replace a participant     |
| `abandon`       | author/reviewer | end a stuck review, keeping the evidence          |
| `supersede`     | author/reviewer | terminate a replaced attempt without acceptance   |
| `consolidate`   | anyone          | verify and relocate one multi-attempt record      |
| `request-grant` | author/reviewer | raise a human authority challenge                 |
| `broker`        | anyone          | inspect or recover the authenticated local broker |
| `help`          | anyone          | the complete offline command contract             |
| `explain`       | anyone          | what one `APR_` error means and how to recover    |

`doctor`, `status`, `help`, `explain`, and bounded broker operations take
`--json`, and
`peer-review help --all` prints the full contract offline — roles, valid states,
flags, effects, and error codes for every command. Agents should query it rather
than guess; so can you.

Two habits are worth keeping either way: use the absolute paths the tool prints
rather than reconstructing them, and let `status --next` tell you the next
command instead of assuming. Argument quoting in generated commands is
POSIX-safe on macOS and Linux and PowerShell-safe on Windows.

### Project-local broker recovery

The broker is scoped to one canonical project root. Read authenticated status
before attempting recovery; use the exact absolute workspace path from the
generated startup artifact:

```bash
peer-review broker status --json
peer-review broker reconcile /absolute/review/workspace --json
```

Suspend one review or stop an idle, reconciled broker only when the reported
state calls for it:

```bash
peer-review broker suspend /absolute/review/workspace --json
peer-review broker stop --json
```

`stop` refuses runnable or unreconciled work. Ambiguous provider actions are
never replayed automatically. Preserve receipts and follow the printed
reconciliation instructions. Existing manual reviews can use bounded
`peer-review status /absolute/review/workspace --next` recovery; new XPR startup
does not silently fall back when its broker is unavailable.

## Public API

Public calls with effects require the current selected global installation and the
activated primary policy for their repository. Await `applyReviewRecord`,
native transport delivery/reconciliation, and `runClaudeReviewerLaunch`;
admission and post-wait validation can reject before their next owned effect.
Internal protocol snapshot and delivery-receipt writers also return admission
promises. Pure calculations and status inspection keep their synchronous shape.

The supported programmatic surface keeps protocol mutation in the CLI while
exposing the adapter validation needed by official host integrations:

```js
import {
  applyReviewRecord,
  createNativePushTransport,
  explainError,
  negotiateAutomaticRequired,
  planReviewRecord,
  renderReviewHistory,
  residentHealth,
  statusReview,
  validateResidentLease,
} from '@kburson/ai-peer-review';
```

Protocol mutation is routed through the CLI. The record helpers expose the same
frozen plan, deterministic index, and verified relocation transaction used by
`consolidate`, so official integrations do not need to recreate those safety
checks.

## Verification

Releases run unit, golden, integration, MCP, packaging, installed-host smoke,
format, spelling, and lint gates on the minimum supported Node 24 across Ubuntu,
macOS, and Windows, plus the preferred Node 26 and current Node releases on
Ubuntu. Release publication and Phase 2 boundary checks use Node 26. Production
dependencies are exact-pinned and audited.

Locally:

```bash
npm test
npm run test:integration
npm run test:mcp
npm run test:packaging
npm run test:smoke
npm run lint
npm run format:check
```

Contributions are welcome under Apache-2.0; see `CONTRIBUTING.md`. Security
reports should go through the private vulnerability-reporting surface on the
GitHub repository rather than a public issue.

## Provenance and licensing

This repository was extracted from `kburson/ai-task-manager`. Its retained
history ends at filtered tip
`bfc6f9ffabd8281a815c7bd0e0824f3bacb84d9d`, derived from AITM source commit
`4b3bcd43cba141a611da4a2b861433b915462806`. The first standalone bootstrap
commit is `fd2e636356b6b8049930d5dc6bddf383c6d56c8d`.

Ancestors through the filtered history tip retain the AGPL-3.0-or-later and
commercial terms that applied in AITM. The standalone bootstrap commit and its
descendants are Apache-2.0 under the independently verified declaration in
`provenance/relicensing-declaration.json`. See `NOTICE`, `LICENSE`, and
`docs/spdx-policy.md` for the exact boundary.

## Installed runtime and release artifact

See [installation and migration](docs/installation-runtime.md) for native bootstrap,
current global selection, read-only deployment checks, upgrades, and the source-only
release workflow. `peer-review-verify-deployment --json` checks package integrity and reports
native and runtime-inventory readiness independently. `peer-review doctor --mode installation`
checks selection and project/provider configuration. Consumer builds and CI require
neither command unless they explicitly opt into ai-peer-review.
