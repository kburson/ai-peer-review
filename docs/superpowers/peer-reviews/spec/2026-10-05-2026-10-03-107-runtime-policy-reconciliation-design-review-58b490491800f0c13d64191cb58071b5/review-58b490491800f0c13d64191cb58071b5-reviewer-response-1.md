<!-- ai-peer-review-template version="1" digest="sha256:78e9a634af9d540baaf6790db82952eaf39cf7ab59a6cdc7938319ae07a4cbed" -->

<!-- protected-frontmatter -->

---
schema: "ai-peer-review.response/v1"
review_id: "review-58b490491800f0c13d64191cb58071b5"
role: "reviewer"
turn: 1
commit_mode: "normal"
authority_assurance: "unavailable"
artifact_path: "docs/superpowers/specs/2026-10-03-107-runtime-policy-reconciliation-design.md"
artifact_commit: "66b1a7a5fe061336bcf484d26fab3973a3b19c77"
artifact_blob: "1aca187b794be8562b9f6472b8b856ba5726a2b2"
artifact_digest: "sha256:7cc1b294ee454ec63ec337947477f17c5c15ee52ef4e68778702f3e9ba069e99"
agent:
  host: "claude-code"
  provider: "anthropic"
  model_id: "claude-opus-5-5"
  model_display: "claude-opus-5-5"
  session_fingerprint: "sha256:3a89e4dd2bc35ce46c13a43ae5588baea492f1a3b436b0ccdf85c333a45f82ed"
  identity_source: "runtime"
started_at: "2026-10-05T11:18:12.993Z"
submitted_at: "2026-10-05T11:20:23.555Z"
finding_ids: ["R1-F001","R1-F002","R1-F003","R1-F004","R1-F005","R1-F006","R1-F007","R1-F008"]
answered_finding_ids: []
acknowledged_supplement_ids: []
---

Mode: `normal`

## Summary

I read the full follow-up specification at artifact commit `66b1a7a`. I checked it against Task 5 of `docs/superpowers/plans/2026-10-03-107-agent-first-portable-runtime.md` (lines 429–472), the Task 4 release-gate bullet (line 384), and the current tree.

Verified against the current tree:

- **Launch triggers.** `src/broker/client.mjs:196-197` launches on `ENOENT`, `ECONNREFUSED`, `APR_BROKER_OWNED`, or `APR_BROKER_STALE` with `missingDiscovery(...)`. `src/broker/ipc.mjs:166-172` throws `APR_BROKER_STALE` when discovery metadata is unavailable or malformed, before any connect. This matches the tombstone analysis: missing discovery can lead to a launch without ever reaching a tombstone listener.
- **Endpoint roots.** `src/broker/paths.mjs:87-117` selects `XDG_CACHE_HOME` on Linux, `LOCALAPPDATA` for Windows authority storage, `AI_PEER_REVIEW_ENDPOINT_ROOT` as the configured POSIX endpoint root, and a fixed named pipe on Windows. The claim that a default-root tombstone cannot cover configured roots holds.
- **Schema identifiers.** `schemas/api-response-v1.json` already has `$id` `ai-peer-review.api-response/v1` with payload `const` `ai-peer-review.response/v1`. `schemas/response-v1.json` keeps `$id` `ai-peer-review.response/v1`. This matches the proposed bounded interpretation.
- **Checker domains.** `scripts/check-runtime-contract-adoption.mjs:389-394` reports `contractAdopted` and `activationAuthorized` separately, and `publicationAllowed` equals `activationAuthorized`. This matches the "Contract adoption versus activation proof" section.

The spec's direction is sound and appropriately fail-closed:

- it does not choose silently;
- it rejects the tombstone as sufficient exclusion;
- it separates contract adoption from activation proof;
- it refuses fixture authority;
- it refuses to promote draft or revision-requested owner material.

I could not verify the #102 field-ownership list ("Detailed shared configuration boundary") or the #102/#30/#34/#109 owner revisions. Those owner artifacts are not in this worktree, and this session cannot use Git. I am taking those claims as stated (see R1-F008).

Six gaps remain that an owner reviewer or implementer would have to guess at:

- how A/B choices are selected (R1-F001);
- a liveness hole for stranded unsupported journals under A (R1-F002);
- the minimum review-authority assurance the checker accepts (R1-F003);
- how activation proof bound to a later tag is added to a pinned record (R1-F004);
- #130 is missing from the acceptance set (R1-F005);
- a Task 4/Task 5 ordering statement that contradicts the plan (R1-F006).

## Findings

### R1-F001 — The A/B choice granularity is undefined, and some mixed combinations are incoherent

Location: "Choices submitted for joint review" table; "Required acceptance" item 1 ("#102/#107 accept A or B").

The table has five independent rows: Runtime, Policy, Prior journals, Evidence, Telemetry. Acceptance item 1 says owners "accept A or B" without saying whether that means one whole column or a per-row choice. Several per-row mixes contradict each other:

- **Runtime A with Prior journals B.** Current-global selection cannot coexist with retained old-installation launcher recovery. B needs per-run pinned dispatch, which A rejects.
- **Runtime B with Prior journals A.** Per-run pinned dispatch with "no retained-image execution" leaves pinned runs unable to execute their pinned image.
- **Policy B with Runtime A.** Layered v1/v2 policy has no defined precedence against a single current package.

The Telemetry row's B column is a prohibition ("cannot substitute"), not an alternative. That suggests the columns are not uniform choices.

Without a defined granularity, a joint acceptance could record an incoherent mix. The checker's `unresolvedConflicts` would then be empty while the contract is self-contradictory.

### R1-F002 — Under A, an unsupported or fenced journal stranded by an in-place upgrade has no stated remediation, so activation can wedge permanently

Location: Operational outcomes rows "Unsupported active/fenced journals" and "Already-live native manual drain"; "Timing of legacy drain under recommendation A".

The spec requires drain "before replacing or re-registering the selected current installation". AIPR cannot enforce that ordering, because a user can run `npm install -g` (or an equivalent package-manager upgrade) at any time. The spec then says:

- an unsupported prior journal "stays preserved/fenced and cannot be settled by relaunching an old retained image";
- overlapping activation is refused;
- "no inferred cleanup ownership" is allowed.

Taken together, nothing settles the journal and nothing clears the refusal. The spec never says whether a preserved unsupported journal blocks activation forever, for that workspace only, or globally.

There is a plausible supported remedy under A: the operator re-selects the older package as the current-global runtime, lets it drain or abandon through its own compatible owner, then upgrades again. That is not "retained-image relaunch". The spec neither names it nor rules it out.

The scope of the refusal also matters for the production-activation proof. One user's stranded journal in one worktree should not plausibly block every other workspace on the account.

### R1-F003 — The minimum review-authority assurance the checker accepts is unspecified

Location: "Contract adoption versus activation proof" paragraph 3 ("caller JSON assertions … cannot prove review acceptance"); "Required acceptance" item 3 ("Authentic review references … preserving assurance limitations").

The spec requires "authentic" accepted review references but never says what assurance level counts. In practice every governed review here records `authority_assurance: "unavailable"`, including this one. Either the gate can never pass, or "authentic" includes `unavailable` assurance.

The prepared checker already makes this decision without a spec basis:

- `scripts/check-runtime-contract-adoption.mjs:15` accepts every enum value except `unverified-test`;
- lines 238–244 require manifest and member assurance to match;
- line 397 reports the observed assurance set.

That is a reasonable rule, but it is an adoption-authority policy. The reviewed spec should state it, so owners accept it knowingly rather than inherit it from implementation.

The spec should also say whether `unavailable` assurance is sufficient for `activationAuthorized`, or only for `contractAdopted`. Production activation and release publication are the higher-stakes consumers.

### R1-F004 — The lifecycle of the adoption record across contract adoption and later activation proof is undefined

Location: "Contract adoption versus activation proof" paragraphs 1–3; plan line 384 (the record "binds the tag/source/package digest").

The spec places the authoritative record "at a pinned reviewed evidence revision". It also requires `activationAuthorized` to bind a release tag, tarball, and installed conformance that do not exist when the contract is adopted.

So at least two reviewed record states must exist:

1. contract-adopted with activation pending;
2. activation-authorized for a specific tag and digest.

Each later release also needs a new binding. The spec does not say:

- whether activation proof is an immutable amendment (an append-only sibling record that references the contract-adoption digest) or a rewrite of the same file;
- who reviews the activation addendum, and under which owner;
- how the approved-ref selects among several pinned revisions;
- whether a superseded activation binding for an older tag stays valid for that tag.

A rewrite-in-place reading would invalidate the reviewed contract-adoption digest on every release. #30 also owns "immutable amendments" (Owners section), so this choice likely needs #30's acceptance too.

### R1-F005 — #130 is a dependency of the policy contract but is missing from the owners and the required-acceptance list

Location: "Immutable inputs and owners"; "Required acceptance" items 1–5; "Detailed shared configuration boundary" paragraph 1; Operational outcomes row "Mixed/dirty/unactivated policy" ("Partial schemas, assembled closed object…").

The spec says #102 delegates detailed portable shared policy, primary-workspace inheritance, and installation receipts to #130. It notes that #130 has no accepted schema. The policy-row proof then requires "partial schemas" and an "assembled closed object", which are #130-owned artifacts.

#130 does not appear in the owner list, in "Required acceptance", or in the contract-adoption blockers. The plan gates Task 7 (Config v2) on "Task5 adopted reconciliation" (plan line 539).

The spec does not say whether contract adoption can proceed on #102's field-ownership table alone. The alternative is that the policy row stays a declared pending obligation until #130 accepts, and Task 7 stays blocked. An implementer cannot tell whether `contractAdopted` may be true while #130 is absent.

### R1-F006 — The Task 4/Task 5 ordering statement contradicts the plan

Location: "Contract adoption versus activation proof" paragraph 1 ("Task 5 precedes the native-free release packaging tasks").

The plan orders the work the other way:

- Task 4 is the native-free packaging and release-wrapper task (plan line 384: "Task4 owns the wrapper and red release-workflow fixtures; Task5 later supplies accepted checker/record");
- plan line 427 says "Tasks1/2/4 deliver native-free candidate/CI independently of Tasks3/5".

The spec's argument (that adoption cannot claim a later tag or tarball exists) still holds. Contract adoption precedes the release tag and *publication*, not the packaging task. As written, though, the sentence misstates plan sequencing in a document owners will rely on to amend their own plan gates.

### R1-F007 — The "new" API response schema already exists in the tree; its status before adoption is unstated

Location: "API and historical participant response compatibility" paragraph 2 ("the new schemas/api-response-v1.json has distinct JSON Schema identifier…").

`schemas/api-response-v1.json` already exists with exactly this design, `$id` `ai-peer-review.api-response/v1` and payload `const` `ai-peer-review.response/v1`. Its description already says "choose the boundary-specific document, never the tag alone".

The spec presents this as a proposal that "requires explicit joint adoption". It does not say that these committed bytes are provisional, or whether adoption binds their exact digest.

Separately, host agents and MCP clients outside the repo are consumers too, and they may dispatch on the payload tag. The spec's "no consumer dispatches solely by the shared payload tag" can only govern in-repo consumers.

### R1-F008 — The #102 field-ownership list has no exact source binding

Location: "Detailed shared configuration boundary" paragraph 2.

The spec freezes "#102's accepted field ownership table", then restates the fields in prose:

- primary-owned: `hosts.<host>.reviewer_guard.enabled`, `automatic.adapter_version`, and `automatic.capability`;
- user-owned: `resume.command`, `reviewer_guard.command`, `automatic.server_command`, `tool_timeout_ms`, `heartbeat_interval_ms`, and `lease_ttl_ms`.

It cites no section or digest of the accepted #102 replacement spec (commit `021bed7…`), and the restated list is not checkable in this worktree.

The restatement may drift from the source table, which lists every field. If it does, owners cannot tell which version they are accepting.

## Required changes

1. (R1-F001) State the selection granularity: whole column, or per row. If per row, enumerate the permitted combinations and declare every other mix an unresolved conflict that blocks `contractAdopted`. Relabel the Telemetry row as a constraint common to both options rather than a B alternative.
2. (R1-F002) Under A, define the outcome for an unsupported or fenced journal stranded by an upgrade that happened before drain:
   - the supported remedy, for example temporarily re-selecting the compatible older package as the current-global runtime to drain or abandon through its own owner, or an explicit human abandonment receipt — or an explicit statement that none exists;
   - the scope of the activation refusal (workspace, account, or global);
   - whether it blocks only overlapping workspaces or all production activation.

   Add the matching proof row to the Operational outcomes table.
3. (R1-F003) State the minimum `authority_assurance` accepted for review references. For example: any value except `unverified-test`, reported in the checker output, with a matching manifest and members. State whether the same minimum applies to both `contractAdopted` and `activationAuthorized`.
4. (R1-F004) Define the adoption-record lifecycle. Cover:
   - immutable contract-adoption record vs append-only activation addenda per tag and digest;
   - which owner reviews each addendum;
   - how the approved-ref selects the record set;
   - validity of older-tag bindings.

   Name #30 as an acceptor if this uses #30's immutable-amendment mechanism.
5. (R1-F005) Add #130 to the owners and the required-acceptance list, or explicitly state that `contractAdopted` can rely on #102's ownership table alone. In either case, state what stays pending until #130 adopts versioned schemas, and whether Task 7 remains blocked.
6. (R1-F006) Correct the ordering sentence. Contract adoption precedes release tag and publication; Task 4 packaging and the wrapper are delivered independently and consume the checker later.

## Optional suggestions

1. (R1-F007) State that the existing `schemas/api-response-v1.json` bytes are provisional until adoption, and that adoption binds their exact digest. Note that "no consumer dispatches solely by the payload tag" governs in-repo consumers only. Consider asking #107 owners whether external host-agent consumers need a non-tag discriminator documented in help output.
2. (R1-F008) Cite the exact section and digest of the accepted #102 field-ownership table. Either replace the prose restatement with a pointer, or state that on any divergence the cited table governs.

## Decision

revisions-requested
