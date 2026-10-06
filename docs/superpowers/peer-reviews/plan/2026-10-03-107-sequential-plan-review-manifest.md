# #107 Sequential Plan Review Acceptance

SAR completed and accepted first. XPR then reviewed its exact accepted ancestor,
revised the plan through five actual patches, and accepted the final descendant
in its fresh sixth pass. Neither stage ran in parallel. These are manually
orchestrated document reviews, not package-protocol acceptance or implementation
conformance. Requested models/efforts and assurance limits are recorded below.

The [accepted plan](../../plans/2026-10-03-107-agent-first-portable-runtime.md)
is frozen at `c4e8564396d86e5f9413393e30975fc7c2639135dfbdff5d8ddcca769862d016`.
The [clean XPR response](2026-10-03-107-portable-runtime-xpr-reviewer-response-6.md)
has zero open actionable findings. Nonblocking advice remains preserved there.
[Controller verification](2026-10-03-107-controller-verification.md) binds the
actual patch lineage and document checks. Old raw filenames resolve through the
[relocation journal](2026-10-03-107-archive-relocation-journal.md).

```json
{
  "record_kind": "manually-orchestrated-sequential-SAR-then-XPR",
  "issue": 107,
  "status": "accepted",
  "package_protocol_acceptance": false,
  "artifact": "docs/superpowers/plans/2026-10-03-107-agent-first-portable-runtime.md",
  "final_sha256": "c4e8564396d86e5f9413393e30975fc7c2639135dfbdff5d8ddcca769862d016",
  "spec": {
    "path": "docs/superpowers/specs/2026-09-27-107-agent-first-review-runtime-design.md",
    "source_commit": "c75dacc7753f2e9f235e1b7ad00ae0696faaaa48",
    "sha256": "395bf5ce47617f827f362552d1839333a4e3964072cb4e6362e8bba3703a4c2e",
    "unchanged": true
  },
  "sar": {
    "requested": {
      "provider": "openai",
      "model": "gpt-6.1-sol",
      "effort": "high"
    },
    "observed_runtime_identity": null,
    "assurance": "requested dispatch known; native runtime identity and usage unavailable",
    "status": "accepted",
    "rounds_consumed": 4,
    "round_cap": 6,
    "accepted_ancestor_sha256": "ad4431df0c5d291a8fe909de1f9227aef165bb8964e3eb853296899e110a3c60",
    "manifest": "2026-10-03-107-portable-runtime-sar-manifest.md",
    "clean_response": "2026-10-03-107-portable-runtime-sar-round-4-review.md",
    "timestamp": "acceptance boundary not timestamped; verified accepted before XPR dispatch"
  },
  "xpr": {
    "author": "same dispatched gpt-6.1-sol/high worker",
    "reviewer": {
      "requested_provider": "anthropic",
      "requested_model": "claude-opus-5-5",
      "requested_effort": "high",
      "provider_observed_canonical_model": "claude-opus-5-5",
      "effort_assurance": "official CLI requested high; no separate runtime effort receipt"
    },
    "status": "accepted",
    "rounds_consumed": 6,
    "round_cap": 12,
    "resolved_findings": "PXPR-001 through PXPR-020",
    "open_findings": [],
    "same_reviewer_session_verified": true,
    "raw_handles": "private, omitted",
    "rounds": [
      {
        "round": 1,
        "reviewed_sha256": "ad4431df0c5d291a8fe909de1f9227aef165bb8964e3eb853296899e110a3c60",
        "verdict": "changes-required",
        "started_at": "2026-10-03 17:06:53 UTC",
        "completion_observed": "2026-10-03 17:12:04 UTC",
        "response": "2026-10-03-107-portable-runtime-xpr-reviewer-response-1.md",
        "provider_receipt": "2026-10-03-107-portable-runtime-xpr-round-1-provider-receipt.md"
      },
      {
        "round": 2,
        "reviewed_sha256": "771e011fb573853188bfb7965e73d4a29116ce3636e583344d298611eae9b409",
        "verdict": "changes-required",
        "started_at": "2026-10-03 17:35:17 UTC",
        "completion_observed": "2026-10-03 17:41:41 UTC",
        "response": "2026-10-03-107-portable-runtime-xpr-reviewer-response-2.md",
        "provider_receipt": "2026-10-03-107-portable-runtime-xpr-round-2-provider-receipt.md"
      },
      {
        "round": 3,
        "reviewed_sha256": "5064e977983f0f7447d66573a89f26cd93d07cde2242aa8e5a2a8d1759c7a898",
        "verdict": "changes-required",
        "started_at": "2026-10-03 18:03:10 UTC",
        "completion_observed": "2026-10-03 18:05:12 UTC",
        "response": "2026-10-03-107-portable-runtime-xpr-reviewer-response-3.md",
        "provider_receipt": "2026-10-03-107-portable-runtime-xpr-round-3-provider-receipt.md"
      },
      {
        "round": 4,
        "reviewed_sha256": "848eb608c5b57da625c0847041b236d24990dedb1c29ffb5669bb2d8eeb24d00",
        "verdict": "changes-required",
        "started_at": "2026-10-03 18:18:43 UTC",
        "completion_observed": "2026-10-03 18:19:54 UTC",
        "response": "2026-10-03-107-portable-runtime-xpr-reviewer-response-4.md",
        "provider_receipt": "2026-10-03-107-portable-runtime-xpr-round-4-provider-receipt.md"
      },
      {
        "round": 5,
        "reviewed_sha256": "582ce1bcb33c8c771e9c3df1563396f865d963ca301142bfb7be28e1c3ab68d5",
        "verdict": "changes-required",
        "started_at": "2026-10-03 18:44:18 UTC",
        "completion_observed": "2026-10-03 18:46:24 UTC",
        "response": "2026-10-03-107-portable-runtime-xpr-reviewer-response-5.md",
        "provider_receipt": "2026-10-03-107-portable-runtime-xpr-round-5-provider-receipt.md"
      },
      {
        "round": 6,
        "reviewed_sha256": "c4e8564396d86e5f9413393e30975fc7c2639135dfbdff5d8ddcca769862d016",
        "verdict": "accepted",
        "started_at": "2026-10-03 19:02:37 UTC",
        "completion_observed": "2026-10-03 19:03:55 UTC",
        "response": "2026-10-03-107-portable-runtime-xpr-reviewer-response-6.md",
        "provider_receipt": "2026-10-03-107-portable-runtime-xpr-round-6-provider-receipt.md"
      }
    ]
  },
  "lineage": {
    "ordered": true,
    "parallel_stages": false,
    "initial_xpr_digest_equals_sar_accepted": true,
    "exact_snapshot_and_patch_reconstruction": "three SAR plus five XPR patches independently reconstructed by controller",
    "acceptance_scope": "SAR accepted exact ancestor; XPR accepted final exact descendant, without asserting SAR reviewed later changes",
    "archive_relocation": "2026-10-03-107-archive-relocation-journal.md",
    "final_snapshot": "2026-10-03-107-portable-runtime-xpr-author-response-final-accepted-plan.md"
  },
  "usage": {
    "author_tokens": null,
    "author_cost": null,
    "reviewer": "exact provider-reported metrics in per-round receipts; resumed modelUsage cumulative, usage per call; no sums/deltas or marginal billing claims"
  },
  "verification": {
    "controller_record": "2026-10-03-107-controller-verification.md",
    "plan_prettier": "passed",
    "markdownlint": "passed under existing archive exclusions; final new receipts/index rechecked before commit",
    "parser": {
      "tasks": 18,
      "ok": true,
      "errors": [],
      "violations": []
    },
    "cspell": "not evaluated, repository excludes docs/superpowers",
    "product_tests": "not run, documentation-only"
  },
  "remaining_prerequisites": [
    "Governed Plan approval, planned forecast, deep dive and child decomposition/ready gates before Develop",
    "Targeted accepted #102/#107 installation/policy/migration reconciliation before conflicting activation",
    "Shared #30/#34 contract adoption; reuse existing #109 for Tasks13/14",
    "Real installed protection/source-class/containment/epoch/provider evidence and all15 release gates before replacement/publication"
  ],
  "hydration": {
    "authorized_after_acceptance": true,
    "scope": "parent-only #107; source plan/metadata/scope/AC/verifier alignment; no child creation or Plan→Develop"
  },
  "inventory_scope": "acceptance evidence; excludes this manifest and later hydration records",
  "inventory": [
    {
      "path": "docs/superpowers/peer-reviews/plan/2026-10-03-107-archive-relocation-journal.md",
      "sha256": "2344ae4c20b3e050c02c018a25f343d021f2f8c24d87b698ce5f5d1082407fcc"
    },
    {
      "path": "docs/superpowers/peer-reviews/plan/2026-10-03-107-controller-verification.md",
      "sha256": "007d5b05fbd45a0c66921097434248022ecf4741c77d5730a636626767463205"
    },
    {
      "path": "docs/superpowers/peer-reviews/plan/2026-10-03-107-dependency-observations.md",
      "sha256": "df4c909d1b634e9b4a007d389023908141707c190257577892a00744dee586f5"
    },
    {
      "path": "docs/superpowers/peer-reviews/plan/2026-10-03-107-dependency-refresh.md",
      "sha256": "87f60150c30296a2ddceaba5a34e1bd760ffbd6df18e0a4edf3580c6fa01e6dc"
    },
    {
      "path": "docs/superpowers/peer-reviews/plan/2026-10-03-107-portable-runtime-sar-author-response-patch-1.md",
      "sha256": "55bd89498fa67fc554d7d0135abd4714887ec4ab4f1b23a97d5fe5331005ccba"
    },
    {
      "path": "docs/superpowers/peer-reviews/plan/2026-10-03-107-portable-runtime-sar-author-response-patch-2.md",
      "sha256": "a5aedcb191a68b9611e7dd39217db1a5308ae23b9543a415aee58ddb966d4583"
    },
    {
      "path": "docs/superpowers/peer-reviews/plan/2026-10-03-107-portable-runtime-sar-author-response-patch-3.md",
      "sha256": "1c5bee372880afaa7847b4e19408a8eb43d7bd40577ddaae95b02d04cf00dce4"
    },
    {
      "path": "docs/superpowers/peer-reviews/plan/2026-10-03-107-portable-runtime-sar-author-response-snapshot-initial.md",
      "sha256": "a9756e643c4c0f2276de8f7256dec7c5a23812460ce7965ab0bc69b820c9b896"
    },
    {
      "path": "docs/superpowers/peer-reviews/plan/2026-10-03-107-portable-runtime-sar-final-accepted-plan.md",
      "sha256": "ad4431df0c5d291a8fe909de1f9227aef165bb8964e3eb853296899e110a3c60"
    },
    {
      "path": "docs/superpowers/peer-reviews/plan/2026-10-03-107-portable-runtime-sar-final-plan.md",
      "sha256": "44c41fb83e86a205d72cdd58ff62a8ebee46cae14a3b25631e95ce532bfc5c1c"
    },
    {
      "path": "docs/superpowers/peer-reviews/plan/2026-10-03-107-portable-runtime-sar-manifest.md",
      "sha256": "1f4d27f6a71c3daaa319db70be77497b0e280e84aaeaef341ca1c2c89048356f"
    },
    {
      "path": "docs/superpowers/peer-reviews/plan/2026-10-03-107-portable-runtime-sar-reviewer-response-1.md",
      "sha256": "d8ab95ffb8a74fdf285f2fc6b91ff18aaae45a030a747ed445dd42c32ad3c564"
    },
    {
      "path": "docs/superpowers/peer-reviews/plan/2026-10-03-107-portable-runtime-sar-reviewer-response-2.md",
      "sha256": "3cfdc816f2f16fb5733e99d630d1a53a22ae1f4f48c693756f663005e20d4b71"
    },
    {
      "path": "docs/superpowers/peer-reviews/plan/2026-10-03-107-portable-runtime-sar-round-1-after-plan.md",
      "sha256": "6e011dd12b644f6d4af377e92130fa51dd9a41d3c6f9e812193195f2884b9a90"
    },
    {
      "path": "docs/superpowers/peer-reviews/plan/2026-10-03-107-portable-runtime-sar-round-1-author-response.md",
      "sha256": "e07f169739403b48d0312242fa6fdbc44967f035a4b85c0a47ec001c109b8c75"
    },
    {
      "path": "docs/superpowers/peer-reviews/plan/2026-10-03-107-portable-runtime-sar-round-2-after-plan.md",
      "sha256": "44c41fb83e86a205d72cdd58ff62a8ebee46cae14a3b25631e95ce532bfc5c1c"
    },
    {
      "path": "docs/superpowers/peer-reviews/plan/2026-10-03-107-portable-runtime-sar-round-2-author-response.md",
      "sha256": "1e6be388cadad44e880058f6878a71c1483a35603062ae9b9634a9baf59a7ffc"
    },
    {
      "path": "docs/superpowers/peer-reviews/plan/2026-10-03-107-portable-runtime-sar-round-3-author-response.md",
      "sha256": "e48bcce471eb8e79123b3917f519f40c025a2b1af784f704994d1aa8458ca3a4"
    },
    {
      "path": "docs/superpowers/peer-reviews/plan/2026-10-03-107-portable-runtime-sar-round-3-review.md",
      "sha256": "09fc088d256a884343d6198901a6ed0c19a95dc1c5414ce3f5db0f02eab4984d"
    },
    {
      "path": "docs/superpowers/peer-reviews/plan/2026-10-03-107-portable-runtime-sar-round-4-review.md",
      "sha256": "e08114deee17c5892cf7c72b12061c1719774901c7021af78c44a9aea2686808"
    },
    {
      "path": "docs/superpowers/peer-reviews/plan/2026-10-03-107-portable-runtime-sar-verification.md",
      "sha256": "dbb375769e839d48d5dd400bc74df187f9f9dc944fdd821e3767023e89d0543e"
    },
    {
      "path": "docs/superpowers/peer-reviews/plan/2026-10-03-107-portable-runtime-xpr-author-response-1.md",
      "sha256": "f1ec4a73a62dd4c45554e795719db22b3d060631a3c5f5efe37bf67b2d815101"
    },
    {
      "path": "docs/superpowers/peer-reviews/plan/2026-10-03-107-portable-runtime-xpr-author-response-2.md",
      "sha256": "a3299c27d83b364761d21485505131c865405dd8cfb0385fe52ce50ece54d8b6"
    },
    {
      "path": "docs/superpowers/peer-reviews/plan/2026-10-03-107-portable-runtime-xpr-author-response-3.md",
      "sha256": "5eb4530611e837da6b17cc2824ed398b548817ab13171e591ffe8b281d6ae371"
    },
    {
      "path": "docs/superpowers/peer-reviews/plan/2026-10-03-107-portable-runtime-xpr-author-response-4.md",
      "sha256": "eb6b3f7087ea05d80f6cf281a18a575891d3b05813e120be06289ab57d82cdcd"
    },
    {
      "path": "docs/superpowers/peer-reviews/plan/2026-10-03-107-portable-runtime-xpr-author-response-5.md",
      "sha256": "33b57745bfa6fef8380f38ede4e068df25eae9733399c7d56fa44b2b4b9d213e"
    },
    {
      "path": "docs/superpowers/peer-reviews/plan/2026-10-03-107-portable-runtime-xpr-author-response-after-3.md",
      "sha256": "848eb608c5b57da625c0847041b236d24990dedb1c29ffb5669bb2d8eeb24d00"
    },
    {
      "path": "docs/superpowers/peer-reviews/plan/2026-10-03-107-portable-runtime-xpr-author-response-final-accepted-plan.md",
      "sha256": "c4e8564396d86e5f9413393e30975fc7c2639135dfbdff5d8ddcca769862d016"
    },
    {
      "path": "docs/superpowers/peer-reviews/plan/2026-10-03-107-portable-runtime-xpr-author-response-patch-1.md",
      "sha256": "5f3580cb0f06fbd6d4d2ec2b93a2f7a95f0363ae7f5efc3faec08e7f2e40d6a5"
    },
    {
      "path": "docs/superpowers/peer-reviews/plan/2026-10-03-107-portable-runtime-xpr-author-response-patch-2.md",
      "sha256": "480624172a3a6ec76aae03721acc5caeab2d482b93baba6ad7c98a3438776acf"
    },
    {
      "path": "docs/superpowers/peer-reviews/plan/2026-10-03-107-portable-runtime-xpr-author-response-patch-3.md",
      "sha256": "0f4b5fa5b169cbceb3df6c3448bb4d564ed0657bcf22dc54b7408fe938f7c343"
    },
    {
      "path": "docs/superpowers/peer-reviews/plan/2026-10-03-107-portable-runtime-xpr-author-response-patch-4.md",
      "sha256": "a26d242f1b5096fc38043ac2efccad92ceeae99dd9458b4003c38c4dd6895fe2"
    },
    {
      "path": "docs/superpowers/peer-reviews/plan/2026-10-03-107-portable-runtime-xpr-author-response-patch-5.md",
      "sha256": "568a1093aa81779b1a3e00935efa914703b9c6126384afd1dc9fc7d47f16de4c"
    },
    {
      "path": "docs/superpowers/peer-reviews/plan/2026-10-03-107-portable-runtime-xpr-author-response-patch-intermediate-4.md",
      "sha256": "ed79a111bf41a675d9663849ef5bc31ac35e720115210d41d6e258c6004249b6"
    },
    {
      "path": "docs/superpowers/peer-reviews/plan/2026-10-03-107-portable-runtime-xpr-author-response-snapshot-after-1.md",
      "sha256": "771e011fb573853188bfb7965e73d4a29116ce3636e583344d298611eae9b409"
    },
    {
      "path": "docs/superpowers/peer-reviews/plan/2026-10-03-107-portable-runtime-xpr-author-response-snapshot-after-4.md",
      "sha256": "582ce1bcb33c8c771e9c3df1563396f865d963ca301142bfb7be28e1c3ab68d5"
    },
    {
      "path": "docs/superpowers/peer-reviews/plan/2026-10-03-107-portable-runtime-xpr-author-response-snapshot-after-5.md",
      "sha256": "c4e8564396d86e5f9413393e30975fc7c2639135dfbdff5d8ddcca769862d016"
    },
    {
      "path": "docs/superpowers/peer-reviews/plan/2026-10-03-107-portable-runtime-xpr-author-response-snapshot-before-1.md",
      "sha256": "ad4431df0c5d291a8fe909de1f9227aef165bb8964e3eb853296899e110a3c60"
    },
    {
      "path": "docs/superpowers/peer-reviews/plan/2026-10-03-107-portable-runtime-xpr-author-response-snapshot-before-3.md",
      "sha256": "5064e977983f0f7447d66573a89f26cd93d07cde2242aa8e5a2a8d1759c7a898"
    },
    {
      "path": "docs/superpowers/peer-reviews/plan/2026-10-03-107-portable-runtime-xpr-author-response-snapshot-before-4.md",
      "sha256": "848eb608c5b57da625c0847041b236d24990dedb1c29ffb5669bb2d8eeb24d00"
    },
    {
      "path": "docs/superpowers/peer-reviews/plan/2026-10-03-107-portable-runtime-xpr-author-response-snapshot-before-5.md",
      "sha256": "582ce1bcb33c8c771e9c3df1563396f865d963ca301142bfb7be28e1c3ab68d5"
    },
    {
      "path": "docs/superpowers/peer-reviews/plan/2026-10-03-107-portable-runtime-xpr-author-response-snapshot-intermediate-4.md",
      "sha256": "427de9e2be75d49340b588cc83e1cfbd0dbb61081ad3f766538df99fb81f58f7"
    },
    {
      "path": "docs/superpowers/peer-reviews/plan/2026-10-03-107-portable-runtime-xpr-author-response-snapshots-after-2.md",
      "sha256": "5064e977983f0f7447d66573a89f26cd93d07cde2242aa8e5a2a8d1759c7a898"
    },
    {
      "path": "docs/superpowers/peer-reviews/plan/2026-10-03-107-portable-runtime-xpr-author-response-snapshots-before-2.md",
      "sha256": "771e011fb573853188bfb7965e73d4a29116ce3636e583344d298611eae9b409"
    },
    {
      "path": "docs/superpowers/peer-reviews/plan/2026-10-03-107-portable-runtime-xpr-author-response-verification-1.md",
      "sha256": "a912ef4df58b09b03986914fa6fc61ff96eb1cbdd24291e965dc2dd4e2cd7eb1"
    },
    {
      "path": "docs/superpowers/peer-reviews/plan/2026-10-03-107-portable-runtime-xpr-author-response-verification-2.md",
      "sha256": "6ebb1c49e5be3cc7ef16a0b05e6c307859f0a51a8ece080914231f0bcaeaf2ff"
    },
    {
      "path": "docs/superpowers/peer-reviews/plan/2026-10-03-107-portable-runtime-xpr-author-response-verification-3.md",
      "sha256": "2a128b507d2be2e69a71e0df1973a667623f2ca355d6abc4a52a9e54938f0bd6"
    },
    {
      "path": "docs/superpowers/peer-reviews/plan/2026-10-03-107-portable-runtime-xpr-author-response-verification-4.md",
      "sha256": "88cdbbe932305daeffec783bfaac7d98505a5d225edf4bb48611e8174d3ab6ad"
    },
    {
      "path": "docs/superpowers/peer-reviews/plan/2026-10-03-107-portable-runtime-xpr-author-response-verification-5.md",
      "sha256": "8951d9b30668df75eb98ca97eed0ca30e0cb0b2c684300dff577dcb52833f622"
    },
    {
      "path": "docs/superpowers/peer-reviews/plan/2026-10-03-107-portable-runtime-xpr-reviewer-response-1.md",
      "sha256": "0377990832b04d459b1b382a7cbd4e55a4e218e5270f75be3f5b45738744b565"
    },
    {
      "path": "docs/superpowers/peer-reviews/plan/2026-10-03-107-portable-runtime-xpr-reviewer-response-2.md",
      "sha256": "9152dceabdf698a878b5801a5fa7c154c849f86ee39b8750732d01f695d7dcc8"
    },
    {
      "path": "docs/superpowers/peer-reviews/plan/2026-10-03-107-portable-runtime-xpr-reviewer-response-3.md",
      "sha256": "3a3da8e37bbd71a806a07d7a18c773a46efe6c164f9299a7f7f71dc2eaac1417"
    },
    {
      "path": "docs/superpowers/peer-reviews/plan/2026-10-03-107-portable-runtime-xpr-reviewer-response-4.md",
      "sha256": "04cc9092f0e748a1ba8210fe395d1eaa677a3a09582766b2795a2d7abfa75492"
    },
    {
      "path": "docs/superpowers/peer-reviews/plan/2026-10-03-107-portable-runtime-xpr-reviewer-response-5.md",
      "sha256": "b573f26310a6a57e10073ccc3c53ef0c4b9b9606b73817f91ec1d22a88fb3f7c"
    },
    {
      "path": "docs/superpowers/peer-reviews/plan/2026-10-03-107-portable-runtime-xpr-reviewer-response-6.md",
      "sha256": "dd1dea90174223f57c07181a704adcfa422926b774ac4d2948b092d2e0ddda7b"
    },
    {
      "path": "docs/superpowers/peer-reviews/plan/2026-10-03-107-portable-runtime-xpr-round-1-launch.md",
      "sha256": "86fc708b924164d5a5344df4d4cf23c9e22febb266a064aea50505bb4798b5e8"
    },
    {
      "path": "docs/superpowers/peer-reviews/plan/2026-10-03-107-portable-runtime-xpr-round-1-provider-receipt.md",
      "sha256": "a9661d7e14f7e8b579a45f721705685ed397fff72d063410368d98cf2d9f57e0"
    },
    {
      "path": "docs/superpowers/peer-reviews/plan/2026-10-03-107-portable-runtime-xpr-round-2-launch.md",
      "sha256": "54a4c9899d6da61ef395f3027e47671ab849ea1a15a31bd664b51f0c29afe8a8"
    },
    {
      "path": "docs/superpowers/peer-reviews/plan/2026-10-03-107-portable-runtime-xpr-round-2-provider-receipt.md",
      "sha256": "d4d64ff666cc20bb046f5c66b56ad49a51302bdb1b27ad279c81d75675c9077b"
    },
    {
      "path": "docs/superpowers/peer-reviews/plan/2026-10-03-107-portable-runtime-xpr-round-3-launch.md",
      "sha256": "14f74d9a6940eedf27ef871b06accb2f2b5c4fc9b8490e820b43bec9d7768dc4"
    },
    {
      "path": "docs/superpowers/peer-reviews/plan/2026-10-03-107-portable-runtime-xpr-round-3-provider-receipt.md",
      "sha256": "6c175a7b99003c2260fa10ba2c8ecbb13033570d7f15379b2ea32413bbb09fc5"
    },
    {
      "path": "docs/superpowers/peer-reviews/plan/2026-10-03-107-portable-runtime-xpr-round-4-launch.md",
      "sha256": "3001816d81f48fe12bf2ac4b706a524ca532bf59e9b0e9ab0c7f97784914fb4f"
    },
    {
      "path": "docs/superpowers/peer-reviews/plan/2026-10-03-107-portable-runtime-xpr-round-4-provider-receipt.md",
      "sha256": "bf58bdf71184377abd395958cb908512104b1e2f4776dd77e557de0fa430df09"
    },
    {
      "path": "docs/superpowers/peer-reviews/plan/2026-10-03-107-portable-runtime-xpr-round-5-launch.md",
      "sha256": "ae320110c22270e783545f8c3e9ac57064bb04e4ed05f5ff2774cf343d71ea81"
    },
    {
      "path": "docs/superpowers/peer-reviews/plan/2026-10-03-107-portable-runtime-xpr-round-5-provider-receipt.md",
      "sha256": "60e0cfc069e0529068fca3828eec3a8a722bf0d3d6fa2113682a26cb92bdee65"
    },
    {
      "path": "docs/superpowers/peer-reviews/plan/2026-10-03-107-portable-runtime-xpr-round-6-launch.md",
      "sha256": "cba54d58f4b734c5e3eb107f7b711522ab80707ca1a8075d763e9b22e0090298"
    },
    {
      "path": "docs/superpowers/peer-reviews/plan/2026-10-03-107-portable-runtime-xpr-round-6-provider-receipt.md",
      "sha256": "0046cea4c54727bd5634406dfa3c00195e5fe4e1304c73f3ea26cc7480b6c909"
    },
    {
      "path": "docs/superpowers/peer-reviews/plan/2026-10-03-107-xpr-reviewer-brief.md",
      "sha256": "9ce7948a2a10d7315333564d98fc334b806c177c2be9e7f791cb23ef69367a6a"
    },
    {
      "path": "docs/superpowers/peer-reviews/plan/2026-10-03-107-xpr-round-2-reviewer-brief.md",
      "sha256": "86e62bf2c63891fb3ed6bd5433dac08b5a85d9c86eec38c6fd0c057e6d1be8cd"
    },
    {
      "path": "docs/superpowers/peer-reviews/plan/2026-10-03-107-xpr-round-3-reviewer-brief.md",
      "sha256": "ab77372782ed8bc005fafe8bec8069a697ec36ee66ff891013f62c34de43c071"
    },
    {
      "path": "docs/superpowers/peer-reviews/plan/2026-10-03-107-xpr-round-4-reviewer-brief.md",
      "sha256": "a9d87555794e7106864e27445caf0d476db3b69573f57a6e8e2d4abb6fcffdb4"
    },
    {
      "path": "docs/superpowers/peer-reviews/plan/2026-10-03-107-xpr-round-5-reviewer-brief.md",
      "sha256": "6e2f1a2e9a4d199e3bd9e29b24bc75c8a00ea581634a65bcb53d222f190e23ec"
    },
    {
      "path": "docs/superpowers/peer-reviews/plan/2026-10-03-107-xpr-round-6-reviewer-brief.md",
      "sha256": "3d50c83c90c82c1b141ba403b07c7ec79851b356973e1dae72a8fa7e906df611"
    }
  ]
}
```
