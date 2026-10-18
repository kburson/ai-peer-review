# #216: Proposed journal proof for POSIX source approval

## Decision and scope

This is a proposal for the bounded #141/#30 decision, shared with #151. It becomes adopted only after the owner explicitly accepts the exact reviewed document revision and byte digest in the governed #216 decision record. An AI Plan approval, a successful validator, a checked box, or a proof produced by this proposed format cannot adopt it. Until adoption, #216's adoption AC remains unticked and #217 remains blocked. A rejection or unresolved trust decision returns this slice to planning.

The proposed policy admits one new approval transport for process-source registration and finite-class review. A completed ordinary local journal remains `accepted-uncommitted`, `no-commit`, with `final_commit: null` and `reviewer-consensus`. Publication is a later Git operation. No normal review, finalization commit, human approval, external signature or runtime activation is manufactured from those values.

The legacy normal-review checker and existing v1 approval paths remain unchanged. Existing signed registration/receipt formats, preregistration, host controls, restoration, producer freeze, finite class recomputation and current-source matching remain mandatory. #141 owns the broader POSIX and installed-recovery guarantees; #107 activation is excluded, #102 stays closed, and #30/#151's broader work is not a dependency.

Linux and macOS remain the supported runtime targets. The review producer profile is separate from each capture/runtime producer identity, which retains its own existing checks. The initial **review producer** profile below is macOS-specific; that does not claim a Linux review producer or weaken the independent Linux/macOS runtime obligations. #221 still proves one explicitly finite Linux capture/class, with no claim for other tuples or all of #141. Windows #213 remains indefinitely deferred, unscheduled and nonblocking, with no Windows worker or native build.

## Trust and assurance decision

The owner is being asked to accept **repository-attested local private verification** for this narrow approval purpose. The fixed verifier checks original private inputs locally, then publishes a closed projection and hash commitments. A fresh checkout verifies public Git bytes, policy/profile identity, subject binding and existing process-source controls. It does not replay private events or independently prove that a provider actually ran.

Git object IDs and hashes establish byte identity under the repository's accepted-history trust boundary. They are not an independent signature of a private reviewer or the verifier's execution. A fabricated assertion by a trusted publisher is outside the cryptographic assurance of this format; source inspection, independent review, the private verifier and governed publication are the detection controls. If this boundary is insufficient, do not adopt this proposal: return to planning for stronger attestation as a separately bounded decision.

Participant session fingerprints bind the recorded roles and events. Preserve the producer's declared/observed provenance exactly. In this producer, `provider-result` means observed; `official-runtime` is still labeled declared. No model selection or effort declaration becomes proof of the model/effort actually used. Model disagreements, missing identity or unknown provenance refuse. These limits do not weaken the separate legacy normal-review checker.

## One fixed producer profile

The initial profile ID is `posix-source-journal-040-node26-macos-arm64-v1`. These values are all mandatory and exact:

| Property                                  | Value                                                                     |
| ----------------------------------------- | ------------------------------------------------------------------------- |
| Package                                   | `@kburson/ai-peer-review`                                                 |
| Informational package version             | `0.4.0`                                                                   |
| Node                                      | `v26.8.1`                                                                 |
| Platform / architecture                   | `darwin` / `arm64`                                                        |
| Runtime-image schema                      | `ai-peer-review.runtime-image/v1`                                         |
| Complete image digest                     | `sha256:f1ab90b234750307c76f7925a4c1777c549cdb8712e7f24a7e9b5980f474a94d` |
| Manifest byte SHA-256                     | `c97cef4644daeda38329a5d7cab771162c8de96f057f40bb19195fbba4fdfa1c`        |
| Listed files, including Node/dependencies | `6053`                                                                    |
| Entrypoint within image                   | `package/bin/peer-review.mjs`                                             |
| Node within image                         | `node/node`                                                               |

The observation copied the existing installed package with existing `pinRuntimeImage`, then verified the complete resulting image with existing `verifyRuntimeImage`. It launched no review/provider, generated no review keys, activated no primary, read no private journal and built no native module. The retained local observation and image are evidence inputs, not public approval or authorization to execute a retained image.

Private verification must bind the original startup request, registration and selected runtime image to the journal's exact initial payload, review/workspace/record identity and runtime descriptor. Rechecking a currently installed version alone does not establish its use at startup. Verify the complete image, manifest bytes, inventory, modes, sizes and hashes, including dependency/Node closure. Refuse any missing or mismatched startup provenance. Never execute code selected by a proof, journal, profile string or retained image. The verifier uses its own committed, fixed parser/grammar; its semantics must match this image. Another image, platform, Node, grammar or recovery profile requires a new explicit adoption, not fallback.

## Primitive types and limits

Every object below is closed: all listed keys are required and no other keys are allowed. Reject duplicate JSON keys, non-finite numbers, unsafe prototypes and inconsistent representations before interpreting authority. All integers are safe integers; counts/turns/sequences are positive, revisions/ordinals are nonnegative. Digests are lowercase. Every digest-valued field uses Digest except explicit RawHash fields, including GitRef.sha256 and producer.manifestSha256.

- `Digest` is `sha256:` followed by 64 hexadecimal characters; `RawHash` is those 64 characters without the prefix.
- `GitRef` has exactly `revision`, `path`, `blob`, `sha256`. Revision and blob are full 40-character lowercase Git object IDs in this repository; `sha256` is a `RawHash` of the exact Git blob bytes. Require an ordinary file blob, exact revision/path/blob agreement and reachability from the consumed public revision. No mutable branch/tag selector, gitlink or symlink.
- Every referenced path is at most 512 characters and is a safe repository-relative path. Subject/proof/publication artifact paths are below `evidence/portable-runtime/process-source/`. The contract path is exactly this document path; verifier source paths are exclusively the checker-owned closed source/schema/package-lock inventory, never a caller-selected root. Reject absolute paths, traversal, empty components, backslashes, controls, URLs and alternate object selectors. Subject paths retain the existing registration-review or class-review Markdown allowlists. Proof/publication paths are JSON under `journal-proofs/` and `journal-publications/` respectively.
- Private event input is a bounded regular, singly linked, canonical file; refuse symlinks, aliases, changed identity/bytes and inputs over 16 MiB. At most 100000 events may be reduced. Use the producer's sequence/revision, schema and actor checks, not sorting, repairing, truncating or skipping records.
- Public proof/publication JSON is at most 1 MiB per blob. Verifier source inventories are unique, sorted and bounded to 4096 ordinary repository files; each reference is checked. A verifier-owned closed transitive source/schema/package-lock inventory determines membership. Input cannot add executable roots or omit a dependency. Reject an unsupported closure rather than dynamically importing it.

## Private proof: exact public projection

The schema is `ai-peer-review.source-class-journal-proof/v1`. The top-level keys are exactly:

| Key               | Closed value/type                                                                                                                                                                                         |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `schema`          | Literal schema above                                                                                                                                                                                      |
| `purpose`         | `process-source-approval`                                                                                                                                                                                 |
| `contract`        | `GitRef` to this exact adopted document                                                                                                                                                                   |
| `producerProfile` | Exact profile ID above                                                                                                                                                                                    |
| `producer`        | Keys `packageName`, `packageVersion`, `nodeVersion`, `platform`, `arch`, `imageDigest`, `manifestSha256`, `fileCount`; exact values above                                                                 |
| `review`          | Keys `reviewId`, `recordId`, `status`, `commitMode`, `acceptanceBasis`, `finalCommit`, `artifactKind`                                                                                                     |
| `subject`         | Keys `kind`, `artifactDigest`, `snapshotDigest`                                                                                                                                                           |
| `participants`    | Keys `author`, `reviewer`, each a `Participant` below                                                                                                                                                     |
| `response`        | Keys `turn`, `decision`, `digest`, `findingIds`                                                                                                                                                           |
| `manifestDigest`  | `Digest` of the exact final manifest bytes                                                                                                                                                                |
| `terminal`        | Keys `eventType`, `sequence`, `revision`, `actorFingerprint`, `manifestDigest`, `snapshotDigest`                                                                                                          |
| `journal`         | Keys `eventCount`, `rawEventsDigest`, `canonicalEventsDigest`, `startupDigest`, `registrationDigest`                                                                                                      |
| `lineage`         | Keys `recordId`, `rootReviewId`, `attemptCount`, `recoveryOrdinal`, `predecessorReviewId`, `successorReviewId`, `eventLogDigest`, `receiptDigest`                                                         |
| `verifier`        | Keys `profile`, `revision`, `sources`; profile is `source-class-journal-verifier/v1`, revision is its committed 40-hex source revision, sources is its complete fixed source inventory of `GitRef` values |
| `checks`          | The exact boolean keys listed below, all true                                                                                                                                                             |
| `assurance`       | Keys `private`, `public`, `privateReplay`, `originalAuthority`, `residualRisk`; first three literals `local-journal-verified`, `repository-attested`, `not-replayed-from-public`                          |
| `observedAt`      | UTC ISO timestamp of the actual local verification; not independent freshness authority or timing-accounting repair                                                                                       |

`reviewId` and `recordId` use the pinned producer's identifier grammar and must match the original journal, startup and lineage. Required review values are `accepted-uncommitted`, `no-commit`, `reviewer-consensus`, and null `finalCommit`. `artifactKind` preserves the actual producer's `spec` or `plan` kind; it is not relabeled to a new runtime mode.

`subject.kind` is exactly `registration-index` or `finite-classes`. `artifactDigest` binds the final reviewed public subject bytes; `snapshotDigest` binds its retained private snapshot under the fixed producer's snapshot rules. The kind must agree with the public subject's existing schema and allowlisted path. A generic document with the same hash does not gain source authority.

`response.turn` is the actual final accepted reviewer turn, within the producer's sealed turn budget. Decision is `accepted`, digest binds exact response bytes, and findingIds is empty. Validate all preceding turns, responses and finding transitions with the fixed grammar; a terminal label alone is insufficient.

`terminal.eventType` is `acceptance-sealed-no-commit`. Its actor must be the registered author fingerprint; its sequence/revision must identify the actual terminal authority transition. Its two digests must match both the final manifest and retained snapshot. Final reduced state is accepted-uncommitted with no pending action. Only recognized, non-state-advancing delivery records may follow that transition; an unknown or later authority transition refuses.

`journal.rawEventsDigest` covers the exact original event-file bytes. `canonicalEventsDigest` covers the complete ordered canonical event stream. The separate lineage eventLogDigest follows the pinned producer's exact preterminal-receipt rule; these digests are not interchangeable. Startup and registration digests bind their original private input bytes. lineage.receiptDigest binds the exact original receipt bytes, whose canonical form must match the pinned producer.

The initial profile is unphased and single-artifact; phase declarations or phase-transition events refuse. The singleton lineage must be complete, with attemptCount `1`, recoveryOrdinal `0`, rootReviewId equal to reviewId, recordId consistent everywhere, and null predecessor/successor. Refuse recovery, continuation, participant replacement, supersession, override, intervention, missing receipts or ambiguous lineage. No migration or reconstruction occurs.

### Participant object

Each Participant has exactly `host`, `provider`, `modelId`, `sessionFingerprint`, `identitySource`, `sessionEvidence`, `modelEvidence`.

- Author and reviewer must be distinct, nonempty fingerprints and different providers. This profile permits the closed host/provider pairs `codex`/`openai` and `claude-code`/`anthropic`, in either role. Both identities must remain consistent across startup, join, claims, responses, terminal event and manifest. No `other`, unavailable or unknown identity is admitted.
- identitySource is `runtime`. sessionEvidence has exactly `source`, `assurance`: source is `official-runtime` or `provider-result`, with declared or observed assurance respectively, exactly as emitted. Preserve this distinction; declared does not become observed.
- modelId is the nonempty model ID actually recorded, consistent with its provenance. modelEvidence has exactly `requestedId`, `declaredId`, `observedId`, `source`, `assurance`, `conflict`. These mirror the producer's sealed model evidence, with nullable IDs where the producer permits absence, conflict false, and source/assurance valid under its closed grammar. Allowed model sources are official-runtime, provider-result, environment-declaration, configuration, launch-request and explicit-declaration; legacy-unclassified refuses. Require at least one supported nonempty model claim and refuse conflicting or unknown provenance. An absent observedId remains null and is never filled from a launch request or declaration.

### Positive private checks

The checks keys are exactly `producerBytes`, `startupBinding`, `eventGrammar`, `distinctParticipants`, `reviewerConsensus`, `subjectSnapshot`, `responseBinding`, `manifestBinding`, `terminalAuthor`, `singleAttemptLineage`, `unchangedInputs`.

The private verifier emits a positive proof only after every check succeeds. It independently recomputes state, manifest, terminal and lineage from the original inputs. Re-read/identity checks must detect changed input membership, bytes or file identities across the operation. Failures produce a refusal, not a partially positive proof. It never initializes, resumes, finalizes, repairs, reconciles, locks, terminates, rewrites or exports a private review. Unknown source identity/provenance and test-only authority refuse, including `unverified-test`. A known absence of human-override authority may remain `unavailable` for real ordinary reviewer consensus. Preserve the original manifest authority value and residual-risk list in assurance.originalAuthority and assurance.residualRisk; never interpret either as stronger source-approval assurance or convert the outcome to human approval. The originalAuthority enum is the existing producer enum excluding unverified-test, and residualRisk is its existing unique, closed residual-risk enum; unknown values refuse.

The proof is a selected summary plus digest commitments. It contains no raw events, raw private manifest, provider result, raw session handle, startup registration, credentials, private filesystem paths, unrestricted extensions or copied free-text response. The exact response/manifest bytes are checked privately and represented publicly only by their digests and closed semantic fields. Do not publish a redacted replacement while claiming its hash is the original.

## Immutable publication

`ai-peer-review.process-source-journal-publication/v1` has exactly `schema`, `subject`, `proof`; the latter two are `GitRef` values. Subject points to the actual reviewed public Markdown bytes; proof points to the closed proof JSON. Their bytes must match the private verification's commitments and kind. Serialize proof deterministically as UTF-8 JSON with sorted object keys, preserved array order and one trailing newline; reject any export field outside the closed projection.

Publication is separate from review finalization. It may commit the reviewed public subject and proof after the local journal has completed. It must not alter that journal's status/mode, create a fictional final_commit, or replay private events. Require the subject revision to be an ancestor of or equal to the proof revision; proof must strictly precede publication, and publication must be reachable from the consumption head. This separates known Git references from the later record that names them. Verify exact Git object type, path, blob, SHA-256 and adopted contract identity. Every verifier source reference uses verifier.revision, with unique paths and the complete expected closure. Public consumers compare those refs to their own trusted fixed verifier closure and read those Git bytes; they never execute selector-provided source.

A fresh checkout must verify this publication without private journal access, provider launch, primary enrollment or mutable local state. Its successful result must explicitly say that private events were not replayed. This establishes public-byte and policy binding, not independent private execution provenance.

## Explicit reader dispatch

Only approval-reference envelopes gain v2. Existing capture/index/ledger/proposal schemas and their required checks stay unchanged.

- Registration envelope `ai-peer-review.process-source-approved-ref/v2` has exactly `schema`, `revision`, `indexDigest`, `approval`. Revision and indexDigest retain existing meanings. Approval has exactly `format`, `publication`; format is `source-class-journal/v1`, publication is a `GitRef` to the publication record above.
- Class envelope `ai-peer-review.process-source-class-approved-ref/v2` has exactly `schema`, `approval`, with the same closed approval object.
- Existing v1 envelopes continue exclusively through the unchanged normal-review checker. An explicit v2 envelope goes exclusively through the adopted journal-proof reader. Unknown versions/formats, unknown keys, malformed new proofs and relabeled v1 journal input refuse. No field-sniffing, fallback to another checker or generic pass flag.
- After approval transport validates, retain every existing subject JSON declaration check, exact registration/index digest binding, signed receipt verification, preregistration ordering, producer/package/source identity, host-control/restoration verification, CI provenance, complete executable producer freeze, proposal recomputation, finite tuple scope and current source digest check.
- Mixed historical/new approvals are allowed only as explicitly versioned, independently validated records for non-conflicting scopes. Overlap means the same complete finite authority key, including platform/build/Node, source-contract and capture-producer identity, not merely the same OS name across historical source versions. Duplicate IDs, conflicting captures, overlapping finite authority or incompatible producer/source tuples refuse. Retain the 16 historical proofs as historical; do not reclassify them as current source matches.

## Refusal matrix

Each row is an implementation obligation for the owning child, not an assertion that the future code already passes.

| Input or condition                                                               | Required result / owner                            |
| -------------------------------------------------------------------------------- | -------------------------------------------------- |
| Exact fresh ordinary singleton journal and fixed producer                        | Private positive proof only after all checks; #217 |
| Different package/image/dependency/Node bytes or unbound startup                 | Refuse unsupported/mismatched producer; #217       |
| Unknown schema/key, duplicate JSON key, truncated/out-of-order stream            | Refuse before positive proof; #217                 |
| Pending, unsettled, intervention, recovery, replaced actor or override           | Refuse without mutation; #217                      |
| Test authority, missing identity or same actor/provider in both roles            | Refuse; #217                                       |
| Declared identity/model represented as observed, or conflicting model claims     | Refuse; #217                                       |
| Accepted reviewer response without bound author terminal event                   | Refuse; #217                                       |
| Changed subject, snapshot, response, manifest, lineage or input identity         | Refuse; #217                                       |
| Private path/handle/free text or other unapproved export field                   | Refuse publication; #218                           |
| Git ref points to wrong bytes, path, object type or unreachable revision         | Refuse; #218/#219/#220                             |
| v1 journal relabeled accepted/normal, unknown v2 format or fallback              | Refuse; #219/#220; legacy normal controls retained |
| Invalid signed capture, preregistration, control, restoration or producer freeze | Refuse under existing controls; #219/#220/#221     |
| Stale/wrong finite source tuple, overlap or altered proposal                     | Refuse; #220/#221                                  |
| Fixture-only positive result offered as a genuine class approval                 | No genuine-evidence claim; #221                    |
| Unadopted contract or a validator used to adopt itself                           | Stop/return to planning; #216                      |

## Delivery, decision record and limits

This child delivers this reviewed policy and an explicit decision naming its exact Git revision and byte digest, the fixed producer profile, narrow source-approval purpose, identity provenance and private/public assurance boundary. Record the owner's actual statement through governed issue records. No AI-generated claim may stand in for that statement. Refusal or requested changes leave adoption unsettled, preserve all work/evidence and return to planning. Later implementation remains governed by each child's own Plan and registered dependencies.

Human estimates are distinct from agent engagement. Each child has a hard four-hour cumulative agent cap across every session and reviewer. Count preparation, debugging, verification and review; pause passive waits. Stop at the boundary, or when safe remaining allowance cannot be established. A proven overrun fails/scraps the plan and returns to planning without deleting work/evidence. Historical timing rows and every Unknown value remain unchanged; bounds used for enforcement do not repair accounting.

Preserve the uncertain review and Claude session named in #214/#216 unchanged and unsettled. They are never an input, fixture, recovery target or acceptance source. Retain runtime budgets 30000/15000/5000/800000 ms and portable cap four. No broad analyzer rewrite, primary maintenance activation, extra enrollment requirement on ordinary handoffs or #107 activation follows from this contract.
