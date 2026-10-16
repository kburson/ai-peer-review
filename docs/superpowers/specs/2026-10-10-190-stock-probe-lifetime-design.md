# #190 bounded stock Windows probe lifetime

## Active simple local handoff amendment

The user's 2026-10-16 direction selects trusted agents already permitted to work
in one local project. The [simple handoff design](./2026-10-16-190-trusted-local-storage-design.md) and
[implementation plan](../plans/2026-10-16-190-trusted-local-storage.md) govern that workflow. Reviewer writes only its
current response notes; author may also revise the artifact; neither participant
modifies other tracked files, Git metadata or anything outside the project.
Use normal filesystem access with essential turn authentication, locking and
restart recovery. No initial/repeated ACL or SID challenge, protection-admission
scope, source-class enrollment/capture prerequisite, persistent query worker or
native binary is required for this local handoff.
Conflicting stronger requirements below are historical/broader capability scope,
not local handoff gates. Preserve their evidence and do not mark their broader
claims complete. Old accepted revisions do not approve this amendment; normally
review the revised documents and record the changed #190 scope before runtime
implementation.

## Historical conditional proposal — retired for this repair

Do not implement the guard-owned worker described below. Preserve its measurements
and review provenance; neither it nor the later unapproved operation-owned worker
is the selected solution. The active amendment uses ordinary filesystem permission and exact role write
boundaries, without application-level ACL challenges.

## Intent and evidence

Define a conditional Windows observation-worker protocol and its feasibility
gate for Task5. This document does not select or admit worker implementation
and does not claim complete installed recovery under the original budget. Current accepted 424f coverage is genuine: capture38106108578 completed
successfully across six workers; separate normal registration and class reviews
accepted eight signed controls and six finite classes. Commit40a3e27 preserves
fourteen historical classes and adds the six exact accepted classes.

Installed run38108838644 remains red. Windows ordinary and limited tokens spend
approximately30seconds in primary registration and refuse before completion.
Linux and macOS admit the current source but exceed the original startup budget.
The public Windows timings show repeated fresh stock PowerShell starts around
330–360milliseconds. The unchanged twenty-read regression passes; this narrower
result does not prove the complete operation.

The local submission guard also reaches its policy-change checkpoint but expires
before the expected policy-generation refusal. The latest passive profile records
millions of fresh filesystem checks. Removing one consecutive synchronous
inventory scan saves several seconds but does not clear that failure. A separate
real generation defect was reproduced: metadata or its ancestor can change just
after decoding without preventing renewal. Both regression tests fail on the old
code and pass with final fresh metadata, ancestor, link and manifest checks.
A diagnostic comparison over the same2683-entry installation reduces twenty
inventory revalidations from1421to1296milliseconds. It is diagnostic data only.

## Windows worker ownership

This design addresses Windows observation startup cost only. Linux/macOS startup
and the complete submission-guard budget remain separate unresolved gates.
Worker implementation is not admitted until a measured effect estimate shows
enough bounded saving; the present proposal has no such estimate yet.

Use a private stock PowerShell process owned by one genuine protected-root guard.
Share executable startup and fixed script loading only. Every request freshly
queries WindowsIdentity, attributes, owner, group, DACL, effective administrator
membership and every requested ancestor/leaf. Never cache those observations.
The existing policy, fingerprint, path, descriptor and generation checks remain.

The worker uses the fixed system executable and fixed package-owned script.
Caller paths are JSON data; no caller script, executable, port, provider adapter
or shell command is accepted. Its response is ordinary unverified observation
data. Only the existing private C1 receipt/guard machinery can validate it.

The worker is bound to the exact signal and absolute deadline observed from the
guard's current genuine operation. Each request remains limited to the lesser
of15000milliseconds and that original remaining budget. The worker expires at
the original deadline, terminates on abort, and refuses requests after expiry.
There is no idle extension, deadline renewal, TTL authority or principal cache.
Clock-injected or unscoped utility guards retain the existing one-shot stock
query; they cannot create a resident operational worker.

The mechanical eligibility predicate is: the original clock was not injected;
the current context is `admitted() || { signal, deadline }`; its signal is an
actual AbortSignal; and its finite deadline is still in the future and no more
than30000milliseconds from the actual monotonic clock. Compare signal identity
and the exact absolute deadline on every request before writing any frame.

Route observe mode only through the worker. Provision mode, Windows replacement
and all observations before a genuine guard exists stay one-shot. A nested
withElectionLease scoped guard owns a separate worker under its own exact
context. Closing that scoped guard must prove that particular child's exit.
No outer worker serves a nested guard merely because their root paths match.

An already retained guard may enter a separately authenticated later operation.
It must close and prove exit of the earlier owned worker before constructing a
new worker for that different original context. An uncertain close refuses;
it never replays the old request or treats the new context as its continuation.

Serialise concurrent requests in a bounded queue of at most64pending requests.
Queued time counts against each request's original deadline; no timeout begins
anew on dequeue. Abort or expiry rejects queued requests for that context. A
different context cannot displace an in-flight request, and the former worker
must be idle and its exit proved before a new context's worker is constructed.
These transitions do not retry an earlier request.

## Framing and refusal

Requests and responses use bounded newline-delimited JSON, a closed schema,
and an unpredictable exact request identifier. Permit one request in flight.
Reject unexpected identifiers, duplicate or unsolicited frames, excess output,
stderr, EOF before a response, malformed data, process exit and expired contexts.
Raw output, private paths, SIDs and original exceptions never enter public
diagnostics. Existing bounded stock error categories remain available.

Keep each response within the current1MiBbound, explicitly flush each frame and
strip at most one leading BOM before validating its closed schema. Preserve the
exact records count and target-path order checks. Dispose each freshly queried
WindowsIdentity object after its response; retain no token or observation object
between requests. Remove the abort listener when the child exits.

Any non-success outcome poisons the worker's exact original context: request
timeout, script error frame, invalid identifier, malformed or unsolicited frame,
stderr, EOF or process failure. Terminate the owned child and prove its exit.
No replacement or one-shot retry is permitted in that poisoned context, even
after a proved exit. A script exception emits its bounded error frame and exits
non-zero. Late frames cannot be consumed by a later request.

The fixed script decodes one request, queries the actual current OS state, emits
one frame and returns to its input loop. Closing stdin requests orderly exit.
Abort or expiry terminates only the directly owned ChildProcess handle. A guard
close succeeds only when that child's actual exit is observed. Failure retains
the worker/guard and a bounded cleanup obligation; no completed cleanup is
invented. No replacement worker starts while an earlier close is unproved.

Termination must run even if admitted-context lookup throws or the original
signal/deadline has expired. It cannot depend on budget.check succeeding.
Cleanup after expiry supplies no renewed query or effect authority. Retain the
worker until actual exit is observed and expose an unresolved close as an
obligation. Preserve existing directory/file close and withdrawal rules.

Keep the child and original expiry timer referenced. Do not unref them or allow
an unclosed guard to become an orphan; callers must close on every success and
error path. A leaked guard is a defect, with at most the remaining original
deadline until termination, never an extended CLI lifetime. Stdin EOF must end
the script. Parent-loss testing must kill the parent both while waiting for input
and during a query, then independently observe child exit within the original
bound. If a stock-only mechanism cannot meet that test, this design is infeasible
and cannot enter production. No native build or unproved descendant backstop is
introduced to conceal that failure.

## Quantified admission gate

Prerequisite198 is delivered through PR199 at trunk
`849ab91d585170b9f634f05a28ce41b8663ba910`. The actual collector producer is
`89f87ac5e5c7134881560c97b584b450bc34e52b`; its immutable installed candidate is
`40a3e279d551719416eb750974fe30d011d6a37a`. Authenticated hosted
[run38141012308](https://github.com/kburson/ai-peer-review/actions/runs/38141012308)
completed all four actual Windows10.0.26100/x64 ordinary/limited workers. The
closed artifact reports are unverified diagnostics, not installed authority.
Every start is classified; ambiguous activity, pre-guard observations,
provisioning and replacement receive no savings. First starts remain per actual
retained guard and original AbortSignal. The observer binds its exact query token
when the directory check begins and excludes the entire overlapping interval.
Distinct handles or signals never merge by equal path or descriptor number.

| Node    | Token    | Starts | First | Repeat | Outside/uncertain | Predicted residual starts | Refusal elapsed ms | Prefix-only minimum saving per repeat ms |
| ------- | -------- | -----: | ----: | -----: | ----------------: | ------------------------: | -----------------: | ---------------------------------------: |
| 24.21.0 | ordinary |     66 |     7 |     23 |                36 |                        43 |              30266 |                                       12 |
| 24.21.0 | limited  |     68 |     7 |     24 |                37 |                        44 |              30253 |                                       11 |
| 26.11.1 | ordinary |     68 |     7 |     24 |                37 |                        44 |              30249 |                                       11 |
| 26.11.1 | limited  |     57 |     7 |     18 |                32 |                        39 |              30278 |                                       16 |

These are counts through the failing operation's original deadline. Every run
refused; any remaining registration work was unobserved. Predicted residual
starts for that observed prefix are `first + outside/uncertain`; they preserve
first-start, provision and replacement costs. For the same observed prefix,
`predictedTime = observedElapsed - repeatCount * startupSavingLowerBound`.
The only justified startup-saving lower bound is currently zero, so the
conservative predictions are respectively30266,30253,30249and30278ms and all
fail30000ms. Whole query duration includes necessary fresh observation work;
subtracting that full duration would invent a saving. The final table column is
only `ceil((observedElapsed - 30000) / repeatCount)`: a necessary lower bound to
remove that refusal-prefix overrun. It is not a complete-registration forecast.

The selected intent is therefore conditional protocol feasibility, not a
Windows budget repair. Before worker implementation, an additional explicitly
unverified read-only timing/equivalence probe must measure cold first-query and
warm per-request latency, compare complete fresh records and detect a real ACL
change. It operates separately from the fixed failing candidate; no loaded
candidate code, executing script, command arguments or original operation
budget is transformed. It provides neither a C1 receipt nor a production worker.
A positive startup component must have a conservative independently measured
lower bound; zero remains the default for ambiguity or failed equivalence.

The falsifiable implementation admission threshold is a predicted _complete_
registration, including previously unobserved work, strictly below30000ms on
both ordinary and real limited tokens for Node24/26 with a documented margin
above measured variability and retained cleanup cost. A partial prefix or warm
microbenchmark alone cannot satisfy it. After source/class recapture, the
actual complete replacement registration must also finish strictly below the
same original30000ms without renewal, retry, source-unavailable exemption or
cache. Current evidence fails this gate; worker implementation is not admitted.
Linux/macOS startup and the complete submission-guard budget are separate
unresolved Task5 requirements and are not represented as Windows completion.

## Source and acceptance boundaries

Move the fixed Windows observation script into a package-owned source module and
add the complete new static producer dependencies to the mechanically checked
process-source closure. Preserve all historical review blobs and classes.
Recapture the final changed contract after executing producer inputs settle.
New signed controls require their own normal registration and separate finite
class reviews before ledger adoption.

No source-unavailable test branch, serializer benchmark, protocol fixture or
class proposal is positive installed authority. Acceptance still requires fresh
exact package/binding, real OS/token journeys, startup/crash/original-PID absence,
reclaim, applicable manual input and actual cleanup, exact complete hosted
receipts, fresh whole-child review and native lifecycle completion. Linux manual
review stays excluded by explicit user direction. macOS/Windows missing genuine
manual input stays incomplete. Production30000, stock15000, portable5000 and
test800000millisecond limits stay unchanged.

## Verification

- RED/GREEN tests for both late metadata/ancestor replacement races.
- Closed framing tests with deliberately unverified test transports: mismatched
  identifier, fragmented/duplicate frames, stderr, EOF, expiry, abort, parallel
  requests and uncertain close. They mint no operational authority.
- Actual hosted Windows requests compare complete fresh records with the
  existing one-shot query and detect a real ACL change between requests.
- Original twenty-read budget and full primary registration on ordinary and
  genuinely limited Windows tokens, without native build or synthetic profile.
- Actual Linux/macOS startup results determine the remaining fresh verification
  cost; do not infer their completion from the Windows worker change.
- Host affected tests only; full suites use genuine downloaded hosted receipts.

## Alternatives assessed

Continuing only one-shot startup optimizations preserves the current architecture
but has already left full operations red. The guard-owned worker preserves fresh
queries while removing repeated executable startup and has an explicit ownership
and disposal boundary. Permission/principal caches and higher or renewed budgets
are outside the authorized constraints.
