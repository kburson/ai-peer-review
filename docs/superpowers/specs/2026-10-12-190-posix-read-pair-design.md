# #190 fresh POSIX protected read pairs

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
and private-leaf ACL policies. No ACL, principal, decoded bytes or source
observation is retained between phases or calls.

Construct the same root fingerprint and file generation observation as the
existing independent inspections. The file ancestry includes the root with its
actual identity, mode, owner and ACL. A mismatching root fingerprint or retained
directory descriptor refuses. The existing real file descriptor, bounded read,
identity/version comparisons and after-read checks remain. Missing file handling
still freshly verifies the root before preserving ENOENT. Failure retains the
existing descriptor cleanup obligation; no automatic retry is introduced.

The adoption check is actual affected C1 tests on the local macOS host, including
root/file/ancestor substitution, mode/ACL drift, byte-identical replacement,
retained close failure and twenty reads under one original budget. Record
before/after diagnostics and actual stock command counts; fixtures and timings
provide no installed authority. Full suites remain hosted. Final changed
process-source bytes require new signed hosted controls, normal registration
approval and separate finite class approval before actual installed claims.

This proposal addresses repeated POSIX observations only. Windows registration,
its complete conditional worker forecast, original PID absence, reclaim,
applicable manual input, full installed cleanup and final story delivery remain
separate gates. Historical failed evidence and the prior source classes remain.
The final whole-child review must assess this ruling with the complete branch.
