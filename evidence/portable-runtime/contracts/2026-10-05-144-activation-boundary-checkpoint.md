# #144 immutable activation boundary checkpoint — 2026-10-05

Status: bounded checker preparation. Real owners/record/source-lineage completion remains pending.

The immutable contract now rejects embedded release identity or operational conformance. A separate selected activation sibling must match the contract digest and carry the #102/#107/#30 accepted review roster. Generic synthetic conformance labels cannot authorize publication: the report remains blocked by activation-schema-owner-acceptance-pending because Task 18 owns the separately accepted activation/installed-conformance schema and actual operational verifier. Adoption-only always reports both operational domains false.

Genuine RED: .scratch/144/checker-activation-separation-red.stdout.txt, exit 1, 61 unit checks /55 pass /6 fail.
First GREEN attempt: .scratch/144/checker-activation-separation-green.stdout.txt, exit 1, 64 affected checks /63 pass /1 fail. Diagnosis: one formatted test still spread completeActivationFixture, putting release identity in the immutable contract. The working separateActivationFixture keeps the sibling outside; only that test setup was corrected. Failed receipts are preserved.
Corrected GREEN: .scratch/144/checker-activation-separation-green-corrected.stdout.txt, exit 0, 64 affected checks (61 unit/3 offline Git).

No future Task18 schema acceptance or real operational conformance is invented. The external pair inspection remains fail-closed while those independently owned artifacts are absent. Native owner transaction/source validation, actual producer/version-bound persisted event verification and retained reviewed public receipts still require implementation and genuine authority. Root owns applied canonical Plan review and native issue mapping. No CODE_COMPLETE or publication authority is claimed.
