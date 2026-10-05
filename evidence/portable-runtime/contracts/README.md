# Runtime contract adoption packet — #144

`runtime-contract-adoption.json` was accepted by normal review `review-6db86bd73e10967f9393c0a8403f9c12` at subject `9414ec7cf317ed8f147d34116104b5418323dcaf`, SHA-256 `cf697a60ad618ceac7caf2a6f46327cd57842f1582d890edcdd41d300d75c104`. It binds the accepted reconciliation design, bounded owner Plan, companion Plan, full canonical #107 Plan, four genuine native owner dispositions and the four prior retained lineage receipts. Its own fifth terminal receipt is separately committed. Root independently verified all five original local histories and retained source objects, then published the distinct [native evidence approval](https://github.com/kburson/ai-peer-review/issues/144#issuecomment-6001793829). Genuine adoption-only verification and hosted exact-head CI remain separate gates.

The reserved #30 and telemetry interfaces refer to exact normative sections of the immutable #107 specification. They do not imply acceptance of absent detailed production schemas. #102 interface modules are observed unmerged draft source; they supply no installed runtime authority. Release identity remains null and conformance remains empty. Before Task18 supplies its accepted activation and installed-conformance schema, the checker treats operational objects as unsupported and denies publication.

Historical receipts pin their committed generator closure as data. The record pins the supported fixed checker importer and three versioned schemas separately; unrelated later application or schema additions do not alter the historical proof. Relevant importer or versioned-schema evolution requires reviewed compatibility provenance. No selector executes historical or caller-selected JavaScript. Current checker files must match their actual committed source.

Original private journals remain in their original local workspaces. Git/CI verifies retained normally reviewed local-verification evidence; it cannot reproduce the original private event replay. Manual transport and unavailable authority assurance remain unchanged. Hosted credential transport conformance has passed on Ubuntu and Windows; that does not establish adopted-record conformance.

## Native approval and evidence commit

After normal record finalization, generate its actual terminal local-verification receipt and public data-only verifier inventory. Root independently inspects the complete original replay and source facts for all five reviews. Root then genuinely binds #144 as orchestrator and emits the scoped native owned comment with key `runtime-contract-approved-evidence.<record-review-id>`.

The closed payload uses `schemas/runtime-contract-evidence-approval-v1.json`. Its actor session fingerprint and binding generation come from that actual root #144 binding. Its observation describes pre-publication inspection and binding facts; it cannot claim its own future publication exit or read-back. It grants no task lifecycle approval, activation or publication authority.

Authenticate the actual published comment and retain its exact raw body, including the native owned marker, without normalizing its terminal newline. Evidence commit E stores that body and public read-back facts at `evidence/portable-runtime/contracts/approved-evidence-public-facts.json`. The public facts contain `record`, `approvalReview`, `lineageProofs` and `transaction`. The first three retain exact earlier immutable references. Transaction stores the descriptor fields listed below, except that `bodyPath` locates the retained body without embedding E's future revision. E contains neither its own resulting commit ID nor a derived selector. It descends from record finalization and the referenced proof revisions.

## Deterministic selector after E

Run this from the committed repository after E exists, passing its actual immutable commit as the sole argument. The recipe reads Git objects only and writes the data locator outside Git. It never supplies approval authority or accesses private journals.

```sh
node --input-type=module - <actual-E-commit> <<'NODE'
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { parseRawJson } from './src/api/canonical-json.mjs';
import {
  readRuntimeContractGitBlob,
  validateApprovedSelector,
} from './scripts/check-runtime-contract-adoption.mjs';
const evidenceRevision = process.argv[2];
if (!/^[a-f0-9]{40}([a-f0-9]{24})?$/.test(evidenceRevision))
  throw Error('Evidence must be an exact commit');
const git = (args) => execFileSync('git', args);
if (git(['cat-file', '-t', evidenceRevision]).toString().trim() !== 'commit')
  throw Error('Evidence must resolve to a commit');
const facts = parseRawJson(readRuntimeContractGitBlob(
  git, evidenceRevision,
  'evidence/portable-runtime/contracts/approved-evidence-public-facts.json',
).toString('utf8'));
const { bodyPath, ...transaction } = facts.transaction;
const bytes = readRuntimeContractGitBlob(git, evidenceRevision, bodyPath);
const body = {
  revision: evidenceRevision,
  path: bodyPath,
  blob: git(['rev-parse', '--verify', evidenceRevision + ':' + bodyPath])
    .toString().trim(),
  sha256: createHash('sha256').update(bytes).digest('hex'),
};
const selector = {
  schema: 'ai-peer-review.runtime-contract-approved-ref/v1',
  evidenceRevision,
  record: facts.record,
  approvalReview: facts.approvalReview,
  lineageProofs: facts.lineageProofs,
  approvedEvidenceTransaction: { ...transaction, body },
};
validateApprovedSelector(selector, selector.record.path);
mkdirSync('.scratch/144', { recursive: true });
writeFileSync('.scratch/144/runtime-contract-approved-ref.json',
  JSON.stringify(selector, null, 2) + '\n');
NODE
node scripts/check-runtime-contract-adoption.mjs \
  --record evidence/portable-runtime/contracts/runtime-contract-adoption.json \
  --approved-ref .scratch/144/runtime-contract-approved-ref.json \
  --mode adoption-only
```

The transaction descriptor has exactly `kind`, `repository`, `issue`, `ownedCommentKey`, `commentDatabaseId`, `commentNodeId`, `url`, `authoredBy`, `body`, `bodySha256`, `publishedAt` and `observedAt`. The recipe replaces only the public facts' `bodyPath` with the exact Git reference `body`. Descriptor identity and body bytes are rechecked through the fixed authenticated GitHub repository/comment/issue reader; reader authentication does not imply comment authorship.

VC1 uses adoption-only mode. A genuine positive requires actual accepted record collateral, all five retained proofs, the independently reviewed prior source inventories, the real root native comment and current stable Scope/PlanMetadata/VC1 fragments. CI needs its sanctioned read credential and issues-read permission. Before E exists, no approved selector or adopted-positive result is available. Default publication remains denied independently of adoption-only success.

## Accepted-record interpretation and errata

The accepted record defines `reviewedDigests` as its sorted unique inventory of every embedded complete Git reference. Inventory membership is provenance coverage only; it grants no prior acceptance, semantic approval of draft sources, registration, activation or publication. This record contains 89 reference occurrences and 51 unique digests, independently checked against actual Git objects. The checker enforces its declared subset and the exact normally accepted whole subject; it does not claim general full-set equality enforcement for a future successor record.

The accepted reviewer recorded one harmless typographic erratum: `broader152/153 implementation pending` means broader #152/#153 implementation pending. Accepted subject bytes remain unchanged. The PR #139 CI statement describes the owner observation at 2026-10-05T14:05:11.859Z, not perpetual current status.

The record pins the root author fingerprint for its native evidence approval. If that session is lost before approval, a genuinely reviewed successor record is required; substituting or relabeling a session is prohibited. The actual approval above was completed by the pinned root session. Manual transport and unavailable authority assurance remain unchanged.
