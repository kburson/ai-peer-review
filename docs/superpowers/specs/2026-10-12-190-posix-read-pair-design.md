# #190 fresh protected reads and final inventory validation

The installed journeys still expire before broker readiness on Linux and macOS.
The heavy submission regression reaches the intended policy mutation but expires
before reporting its generation refusal. Timing fixes must retain the original
30000 ms operation budget, fresh protection observations and exact cleanup.

The existing Windows protected read path already observes complete ancestry,
root and file together before reading, then independently observes them again
after reading. The POSIX path instead separately verifies the root and inspects
the file in each phase. Each inspection repeats shared ancestor checks; macOS
also starts a separate stock `/bin/ls -ldne` command for each inspection.

Extend the existing private read-pair helper to Linux and macOS. This is a
bounded change to the existing protected read flow. It adds no public port,
receipt type, authority cache or persistent process. Each before/after phase
performs its own complete fresh observation. The existing public guard verify,
provisioning, mutation, election and cleanup interfaces stay intact.

Each phase freshly checks the complete common ancestry, canonical root and file,
actual effective POSIX identity, exact owner/mode, single file link, access and
independently opened descriptor identities. Linux retains both existing stock
filesystem checks and the supported filesystem policy. macOS queries the entire
ancestor/root/file set with one stock command, applying the existing ancestor
and private-leaf ACL policies. The deferred ancestry flag is true, suppressing
an extra ancestor-only command. List each common ancestor once with
`ancestor: true`, the root once with `ancestor: false`, and the file once with
`ancestor: false`. The root receives the stricter private-leaf policy; this also
satisfies its role as the file's ancestor. Its one parsed rule list feeds the
root observation and the file ancestry root entry unchanged. No ACL, principal,
decoded bytes or source observation is retained between phases or calls.

Both Linux root and file receive a fresh `statfs` check with the existing
supported-type list in each phase. Both receive fresh access checks: R/W/X for
the root, R/W for the file. Linux common ancestry entries keep no ACL key, while
the root and file observation ACL arrays remain empty, preserving exact key
order/presence in the root fingerprint. Check the target's canonical identity
and type before the stock query so missing-file handling keeps ENOENT.

Construct the same root fingerprint and file generation observation as the
existing independent inspections. The file ancestry includes the root with its
actual identity, mode, owner and ACL. A mismatching root fingerprint or retained
directory descriptor refuses. The existing real file descriptor, bounded read,
identity/version comparisons and after-read checks remain. Missing file handling
still freshly verifies the root before preserving ENOENT. Failure retains the
existing descriptor cleanup obligation; no automatic retry is introduced.

The adoption check includes actual affected C1 tests on the local macOS host
and the hosted Linux Node24/26 runners, including
root/file/ancestor substitution, mode/ACL drift, byte-identical replacement,
retained close failure and twenty reads under one original budget. Record
before/after diagnostics and actual stock command counts; fixtures and timings
provide no installed authority. A successful read through a genuine guard bound
by the independent root inspection is the direct fingerprint equality control:
it must execute the private pair/binding equality check. Also test macOS root-only
foreign non-mutating allow grants at the pure parser/target-list level. Add an
exported pure, explicitly unverified POSIX target-list builder, following the
existing `parseMacAclBatchCore` precedent. Its exact flags are common ancestors
true, root false, file false. Feed its output and a root-only
`group:everyone allow read,list,search` record to the existing parser and require
`acl-positive-grant-unproved`. The genuine guard control separately requires
refusal; it does not claim to distinguish the discarded inner reason. The
builder supplies data only, never a receipt, guard or operational permission. Full suites remain hosted. Final changed
process-source bytes require new signed hosted controls, normal registration
approval and separate finite class approval before actual installed claims.

The expected reduction is four to two complete observations per protected read
on both POSIX platforms, and four to two stock ACL commands on macOS. The pinned
baseline is `evidence/portable-runtime/process-source/diagnostics/190-c46-startup-read-baseline.json`.
In the affected failing macOS fixture, 2136 of 3209 stock ACL commands came from
`readObserved`, consuming 7415 of 10978 ms of aggregate stock ACL time. The whole
child took 40844 ms, including prior selection and source observation, so this
is explicitly not an isolated 30000 ms operation forecast. The count projection
removes 1068 stock commands, approximately 3707 ms at this sample's average
latency. It predicts a component saving, not complete readiness. Obtain equivalent
hosted Linux/installed-journey attribution before production adoption; missing
measurements refuse a completion claim.

A separate private CPU profile found about 15861 ms inclusive inventory work,
11418 ms inclusive dependency closure work, and 20471 ms idle in a 41617 ms child.
These overlapping categories must not be added. Preserve all current checks;
coalesce the two complete inventory scans in `assertSelected` into one
final `installation` scan after the second fresh protected snapshot and all
awaited account/path checks. The earlier scan precedes further awaits and grants
no externally returned authority. The final scan freshly reads dependency
metadata, checks every authenticated file/directory/link generation and the
start manifest digest. Preserve the exact replay binding by allowing the
private final `installation` call to use
`previousObservation: processInventory ?? previousObservation?.inventory`.
The fallback must reach the same authenticated inventory replay check even in a
second store whose process inventory is still null. The discarded intermediate
observation is never returned or read by any consumer. The existing final
protected-snapshot integrity check,
process selection generation, scope witness and completion checks remain.
This retains one final current-source validation, not cached current observation.
The structural projection is two to one complete inventory scans per
`assertSelected`. Registration's three installation scans, the scoped witness
scan and the scope finalizer scan remain unchanged. Record the actual count of
`assertSelected` calls and so removed scans in the same failing workload before
adoption. This is a component count prediction, not a readiness forecast.
Require the existing late metadata/ancestor/link replacement controls and new
source mutation between the two selection snapshots to refuse before returning
selection authority. Both snapshots, principal checks and original contexts remain.

Keep the Windows read-pair helper name unchanged, add a separate private POSIX
helper, and extend the closed diagnostic name sets. Re-run precise coverage and
the real register/activate comparison: exact16 matching admissions,32 fresh
snapshots,16→1 acquisitions and unchanged15/30 deltas remain binding.

Measure and adopt the two changes separately on the unmerged diagnostic branch,
using distinct before/after command and inventory-scan counts. If either misses
its count prediction, discard that adoption and retain its failed evidence.
If the final admitted source still expires, retain the failed receipts and stop
expanding this pair change. Re-scope the remaining cost under a separate bounded
design and source-grounded measurement; do not silently extend pairing to other
verify/match sites, relax the clock, or mark the journey complete.

This proposal addresses repeated POSIX observations and duplicated inventory
validation only. Windows registration,
its complete conditional worker forecast, original PID absence, reclaim,
applicable manual input, full installed cleanup and final story delivery remain
separate gates. Historical failed evidence and the prior source classes remain.
The final whole-child review must assess this ruling with the complete branch.
