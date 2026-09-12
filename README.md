# ai-peer-review

Two AI agents, one document, and a set of rules that keeps them honest.

`ai-peer-review` sets up a real peer review between two AI sessions: one wrote
the spec, the other pulls it apart. The reviewer can raise findings but cannot
touch the document or the Git history. The author makes every change and owns
every commit. What you get back is the review itself, committed next to the work
it reviewed.

It works with Claude Code, Codex, Grok, or any agent that can run a shell
command. It requires Node.js 22 or later and uses two exact-pinned runtime
dependencies for its MCP transport and closed validation boundary.

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
Manual and resume-only modes keep you as the courier. With two healthy resident
adapters, `automatic-required` lets each session block on `wait_for_handoff` and
resume without polling or idle model turns. You remain the tie-breaker when they
cannot agree.

## Setting it up

Ask your agent to do it:

> Install `ai-peer-review` as a dev dependency and run its project setup for
> Claude Code.

Setup is deliberately boring and fully reversible. It writes four things:

| File                                  | What it is for                  |
| ------------------------------------- | ------------------------------- |
| `.ai-peer-review.json`                | project configuration           |
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

Worth doing once before you rely on it:

> Run the peer-review doctor and tell me whether anything needs fixing.

`doctor` only reads. It reports whether your agent host is exposing session
identity, whether the scratch directory is ignored, and whether the transport
you asked for is actually available. For `automatic-required`, it also checks
MCP connectivity, a current resident lease, the configured long timeout, and an
end-to-end transport probe. Anything it calls out, it also tells you how to fix.

Codex and Claude Code setup install package-owned versioned settings for the
`peer-review-mcp` server, an eight-hour tool timeout, and a lease heartbeat.
Grok and generic hosts remain manual unless a future official adapter implements
and passes the same contract. Preview and removal preserve all foreign settings.

## Running a review

### 1. The author starts it

The document has to be tracked and committed first — the review binds to an
exact blob, so a dirty file is refused rather than quietly reviewed.

> Start a peer review of `docs/spec.md` as a spec.

Your agent gets back a workspace, a brief of its own, and a reviewer invitation
containing every path the second agent needs.

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
docs/peer-reviews/spec/2026-09-10-spec-review-554e80ec.../
├── reviewer-invitation.md    # what you hand the second agent
├── author-startup.md         # the author's brief
├── reviewer-response-1.md    # findings and decision
├── author-response-1.md      # what changed, and why
├── reviewer-response-2.md
├── ...
└── review-manifest.md        # written at acceptance
```

Coordination state — the event ledger, claims, snapshots — stays in the ignored
`.scratch/peer-review/` directory. Only the human-readable record gets
committed.

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
- Resident liveness comes from a process instance or official opaque handle plus
  a refreshed lease. A bare PID is never treated as authority.
- Manual recovery remains available after every transport failure.

Commands fail closed. When one refuses, it returns a stable `APR_` code, and
`peer-review explain <code>` says what to do about it — which is usually the
fastest way to unstick an agent:

> That failed with an APR error. Explain the code and recover.

## Driving it yourself

The agent-facing path above is the intended one, but everything is an ordinary
CLI and nothing is hidden from you.

After a confirmed local installation, the short binary name works:

```bash
npm install --save-dev ai-peer-review
npx peer-review --help
```

The bare `peer-review` name only resolves to this package once it is installed
locally. Before that — or if you would rather install nothing at all — call it
by its full registry name:

```bash
npx --yes ai-peer-review@0.2.1 --help
npx --yes ai-peer-review@0.2.1 setup --scope project --agent claude --dry-run
npx --yes ai-peer-review@0.2.1 start docs/spec.md --artifact-kind spec
npx --yes ai-peer-review@0.2.1 status .scratch/peer-review/<review-id> --next
```

| Command         | Role            | What it does                                   |
| --------------- | --------------- | ---------------------------------------------- |
| `setup`         | you             | install or remove the agent integration        |
| `doctor`        | anyone          | read-only readiness check                      |
| `start`         | author          | begin a review of a tracked artifact           |
| `join`          | reviewer        | join from an invitation                        |
| `status`        | anyone          | current state and the single next action       |
| `resume`        | anyone          | rebuild the current actor's instructions       |
| `submit`        | author/reviewer | seal and hand off the current response         |
| `finalize`      | author          | commit acceptance and the review manifest      |
| `continue`      | author/reviewer | extend the turn budget under a signed grant    |
| `supplement`    | author/reviewer | register human-authorized extra context        |
| `recover`       | author/reviewer | reclaim a stale turn or replace a participant  |
| `abandon`       | author/reviewer | end a stuck review, keeping the evidence       |
| `request-grant` | author/reviewer | raise a human authority challenge              |
| `help`          | anyone          | the complete offline command contract          |
| `explain`       | anyone          | what one `APR_` error means and how to recover |

`doctor`, `status`, `help`, and `explain` all take `--json`, and
`peer-review help --all` prints the full contract offline — roles, valid states,
flags, effects, and error codes for every command. Agents should query it rather
than guess; so can you.

Two habits are worth keeping either way: use the absolute paths the tool prints
rather than reconstructing them, and let `status --next` tell you the next
command instead of assuming. Argument quoting in generated commands is
POSIX-safe on macOS and Linux and PowerShell-safe on Windows.

## Public API

The supported programmatic surface keeps protocol mutation in the CLI while
exposing the adapter validation needed by official host integrations:

```js
import {
  createNativePushTransport,
  explainError,
  negotiateAutomaticRequired,
  residentHealth,
  statusReview,
  validateResidentLease,
} from 'ai-peer-review';
```

All workflow mutation is routed through the CLI, so every host — human or agent
— goes through the same validation and recovery contract.

## Verification

Releases run unit, golden, integration, MCP, packaging, installed-host smoke,
format, spelling, and lint gates on Node 22 across Ubuntu, macOS, and Windows,
plus later LTS and current Node releases on Ubuntu. Production dependencies are
exact-pinned and audited.

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
