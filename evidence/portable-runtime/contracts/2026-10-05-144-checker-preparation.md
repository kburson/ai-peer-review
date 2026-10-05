# Issue 144 checker preparation checkpoint

Status: draft preparation only. This note is not owner adoption, accepted review
evidence, production activation authority, or CODE_COMPLETE.

The fixed reconciliation subject is
docs/superpowers/specs/2026-10-03-107-runtime-policy-reconciliation-design.md,
committed at d30157198022bbbfa2083e0c65c9b69d2d0d7f8a.
Its SHA-256 is
7cc1b294ee454ec63ec337947477f17c5c15ee52ef4e68778702f3e9ba069e99.
Manual author SAR is recorded in 2026-10-05-144-author-sar.md; it is machine
author analysis, not human approval or an independent reviewer session.

The document-only checker draft reads immutable Git objects, verifies SHA-256
and Git blob identity, checks owner IDs and exact review subjects, requires
normal reviewer acceptance and complete lineage, and checks the finalization
message, sealed files and parent. It keeps contract adoption separate from
release and installed conformance proof. Publication requires both domains.
No public runtime interfaces are changed.

The illustrative conformance report shape used in tests is a proposal:
ai-peer-review.activation-conformance/v1 with case, owner, source revision,
release tag, tarball digest and Darwin/Linux/Windows process observations.
It is not an accepted owner schema or a claim that installed receipts exist.
Tests use explicit fixture identities and synthetic review collateral. Offline
Git fixtures prove immutable lookup and refusal behavior; they do not create
genuine peer review or adopt contracts.

## Verification receipts

All receipts remain under the local .scratch/144/ directory. They are
execution evidence, not adopted owner artifacts.

| Cycle                                  | RED receipt                                 | GREEN receipt                                                            |
| -------------------------------------- | ------------------------------------------- | ------------------------------------------------------------------------ |
| Initial checker                        | checker-red.stdout.txt: 18 failed           | checker-green-first.stdout.txt: 18 passed                                |
| Record and transaction binding         | checker-proof-red.stdout.txt: 2 failed      | checker-proof-green.stdout.txt: 21 passed                                |
| Release-bound installed conformance    | checker-activation-red.stdout.txt: 1 failed | checker-activation-green.stdout.txt: 23 passed                           |
| Receipt loader and selector validation | checker-loader-red.stdout.txt: 2 failed     | checker-loader-green.stdout.txt: 25 passed                               |
| Delivered assurance vocabulary         | checker-assurance-red.stdout.txt: 3 failed  | checker-assurance-green.stdout.txt: 29 passed                            |
| Finalization tree and parent           | checker-tree-red.stdout.txt: 1 failed       | checker-tree-green.stdout.txt: 33 passed, including 3 offline Git checks |

Fresh checker-final-tests.stdout.txt confirms 33 affected checks passing after
formatting. No full host suite, native Test, exact-head CI, PR, or delivery
receipt is claimed for this checkpoint.

## Pending dependencies and limits

The automatic approval reviewer rejected the proposed external XPR start
because explicit human authorization for the exact private payload and Claude
destination was missing. Root requested that authorization. No start or launch
retry is permitted until root relays new direct human authorization.

The independent selection remains exactly provider claude, model
claude-opus-5-5, effort high, manual transport. Author model and effort are
unavailable; no guessed author identity is substituted.

Actual independent XPR, joint owner adoption for issues 102/30/34/109,
affected plan amendments and repeat plan reviews, and the separately reviewed
authoritative adoption record remain pending. The broader issue 30 plan has
requested revisions, issue 34 has draft material, and issue 109 lacks accepted
plan metadata at the fixed proposal observation. None is promoted by tests.

The checker must still be reconciled with actual review collateral from the
authorized workflow, including full normal manifest grammar, complete
persisted attempt/event lineage and source identity evidence. Fixtures exercise
structural bindings; they cannot prove an external actor performed a review.
A successful genuine approved-record CLI transaction and negative publication
proof remain unperformed.

Later native-free package source/tag/tarball and genuine installed conformance
are unavailable at this rank. The default publication command remains blocked
without them. Any amendment to Task 5 verification or owner contracts must
follow actual acceptance; the immutable accepted issue 107 specification and
current accepted plan bytes remain unchanged at this checkpoint.
