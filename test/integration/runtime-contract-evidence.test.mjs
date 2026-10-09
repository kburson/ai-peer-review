import { createHash } from 'node:crypto';
// @story #144
// Retained public facts only. Original private events are never replayed by these tests.
import test from 'node:test';
import assert from 'node:assert/strict';
import { cpSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { readRuntimeContractGitBlob } from '../../scripts/check-runtime-contract-adoption.mjs';
import { checkRetainedLineageProof } from '../../scripts/lib/runtime-contract-evidence.mjs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const immutableGitObjects = new Map();
const git = (args) => {
  const key = JSON.stringify(args);
  if (!immutableGitObjects.has(key))
    immutableGitObjects.set(
      key,
      execFileSync('git', args, {
        cwd: root,
        maxBuffer: 32 * 1024 * 1024,
        env: Object.fromEntries(Object.entries(process.env).filter(([k]) => !k.startsWith('GIT_'))),
      })
    );
  return Buffer.from(immutableGitObjects.get(key));
};
function actual() {
  const receipt = JSON.parse(
    readFileSync(
      path.join(
        root,
        'evidence/portable-runtime/contracts/review-lineage/review-6522bc912d65661298c2b1a072c32f0b.json'
      )
    )
  );
  const artifacts = new Map(),
    p = receipt.reviewReference;
  const refs = [
    p.subject,
    p.manifest,
    p.finalResponse,
    ...receipt.members,
    ...receipt.verifier.sources,
  ];
  for (const r of refs)
    artifacts.set(r.revision + ':' + r.path, readRuntimeContractGitBlob(git, r.revision, r.path));
  artifacts.set(
    'commit:' + p.finalization.revision,
    git(['show', '--no-patch', '--format=%B', p.finalization.revision])
  );
  artifacts.set(
    'parent:' + p.finalization.revision,
    git(['rev-list', '--parents', '-n', '1', p.finalization.revision])
      .toString()
      .trim()
      .split(' ')
      .slice(1)
      .join(' ')
  );
  for (const r of [p.manifest, p.finalResponse])
    artifacts.set(
      'tree:' + p.finalization.revision + ':' + r.path,
      readRuntimeContractGitBlob(git, p.finalization.revision, r.path)
    );
  return {
    receipt,
    reviewReference: p,
    artifacts,
    approvedVerifierReference: structuredClone(receipt.verifier),
  };
}
test('[#144] actual retained canonical receipt checks all public members without claiming CI original replay', () => {
  const result = checkRetainedLineageProof(actual());
  assert.equal(result.receiptCoherent, true, JSON.stringify(result.blockers));
  assert.equal(result.originalPrivateReplay, 'unavailable');
});
for (const [label, change, blocker] of [
  [
    'canonical digest',
    (x) => {
      x.receipt.attempt.canonicalEventDigest = 'sha256:' + 'f'.repeat(64);
    },
    'lineage-proof-canonical-receipt-mismatch',
  ],
  [
    'author fingerprint',
    (x) => {
      x.receipt.identities.authorFingerprint = 'sha256:' + 'f'.repeat(64);
    },
    'lineage-proof-identity-mismatch',
  ],
  [
    'original member bytes',
    (x) => {
      const r = x.receipt.members[0];
      x.artifacts.delete(r.revision + ':' + r.path);
    },
    'lineage-proof-member-bytes-invalid',
  ],
  [
    'missing historical member',
    (x) => {
      x.receipt.members.shift();
    },
    'lineage-proof-member-set-incomplete',
  ],
  [
    'verifier source bytes',
    (x) => {
      const r = x.receipt.verifier.sources[0];
      x.artifacts.delete(r.revision + ':' + r.path);
    },
    'lineage-proof-verifier-bytes-invalid',
  ],
]) {
  test('[#144] retained canonical public proof refuses altered ' + label, () => {
    const x = actual();
    change(x);
    const result = checkRetainedLineageProof(x);
    assert.equal(result.receiptCoherent, false);
    assert.ok(result.blockers.includes(blocker), JSON.stringify(result.blockers));
  });
}

for (const field of ['artifact_history', 'turns']) {
  test(
    '[#144] malformed actual retained ' + field + ' returns typed refusal without throwing',
    () => {
      const x = actual(),
        p = x.reviewReference;
      const old = x.artifacts.get(p.manifest.revision + ':' + p.manifest.path).toString();
      const match = old.match(/^`{3}json\r?\n([\s\S]*?)^`{3}\s*$/m);
      const model = JSON.parse(match[1]);
      model[field] = {};
      const bytes = Buffer.from(JSON.stringify(model));
      const sha = createHash('sha256').update(bytes).digest('hex');
      const blob = createHash('sha1')
        .update(Buffer.concat([Buffer.from('blob ' + bytes.length + '\0'), bytes]))
        .digest('hex');
      p.manifest = { ...p.manifest, sha256: sha, blob };
      x.artifacts.set(p.manifest.revision + ':' + p.manifest.path, bytes);
      const result = checkRetainedLineageProof(x);
      assert.equal(result.receiptCoherent, false);
      assert.ok(result.blockers.includes('lineage-proof-normal-collateral-incomplete'));
    }
  );
}

test('[#144] historical exact verifier proof remains coherent after unrelated later application and schema changes', (t) => {
  const x = actual();
  const fixture = mkdtempSync(path.join(tmpdir(), 'apr-historical-proof-'));
  t.after(() => rmSync(fixture, { recursive: true, force: true }));
  for (const name of ['src', 'schemas', 'scripts/lib', 'templates', 'provenance'])
    cpSync(path.join(root, name), path.join(fixture, name), { recursive: true });
  cpSync(
    path.join(root, 'scripts/check-runtime-contract-adoption.mjs'),
    path.join(fixture, 'scripts/check-runtime-contract-adoption.mjs')
  );
  for (const name of ['package.json', 'package-lock.json'])
    cpSync(path.join(root, name), path.join(fixture, name));
  symlinkSync(path.join(root, 'node_modules'), path.join(fixture, 'node_modules'), 'dir');
  const localGit = (args) => execFileSync('git', args, { cwd: fixture, stdio: 'ignore' });
  localGit(['init', '-b', 'trunk']);
  localGit(['config', 'user.name', 'Test']);
  localGit(['config', 'user.email', 'test@example.com']);
  localGit(['add', 'src', 'schemas', 'scripts', 'provenance', 'package.json', 'package-lock.json']);
  localGit(['commit', '-m', 'fixture']);
  writeFileSync(
    path.join(fixture, 'src/cli/help-data.mjs'),
    readFileSync(path.join(fixture, 'src/cli/help-data.mjs')) +
      '\n// Later unrelated application change.\n'
  );
  writeFileSync(path.join(fixture, 'schemas/later-configuration-v2.json'), '{}\n');
  localGit(['add', 'src', 'schemas']);
  localGit(['commit', '-m', 'later application and schema']);
  const input = {
    ...x,
    artifacts: [...x.artifacts].map(([k, v]) => [
      k,
      Buffer.isBuffer(v) ? { bytes: v.toString('base64') } : { text: v },
    ]),
  };
  writeFileSync(path.join(fixture, 'proof-input.json'), JSON.stringify(input));
  const result = JSON.parse(
    execFileSync(
      process.execPath,
      [
        '--input-type=module',
        '-e',
        "import fs from 'node:fs';import {checkRetainedLineageProof} from './scripts/lib/runtime-contract-evidence.mjs';const x=JSON.parse(fs.readFileSync('proof-input.json'));x.artifacts=new Map(x.artifacts.map(([k,v])=>[k,v.bytes?Buffer.from(v.bytes,'base64'):v.text]));console.log(JSON.stringify(checkRetainedLineageProof(x)));",
      ],
      { cwd: fixture, encoding: 'utf8' }
    )
  );
  assert.equal(result.receiptCoherent, true, JSON.stringify(result.blockers));
  assert.equal(result.verifierPinned, true, JSON.stringify(result.blockers));
  assert.equal(result.originalPrivateReplay, 'unavailable');
  assert.equal(result.adoptionAuthority, false);
});
for (const [label, change] of [
  ['missing approval', (x) => delete x.approvedVerifierReference],
  ['different approved revision', (x) => (x.approvedVerifierReference.revision = 'f'.repeat(40))],
  ['missing approved source', (x) => x.approvedVerifierReference.sources.pop()],
  [
    'historical source evolution',
    (x) => {
      const r = x.receipt.verifier.sources[0];
      x.artifacts.set(r.revision + ':' + r.path, Buffer.from('changed historical source'));
    },
  ],
  ['unsupported profile', (x) => (x.receipt.producerProfile = '0.5.0')],
  [
    'changed producer grammar',
    (x) => (x.receipt.producer.sources['src/protocol/events.mjs'] = 'f'.repeat(64)),
  ],
]) {
  test('[#144] historical proof refuses ' + label, () => {
    const x = actual();
    change(x);
    const result = checkRetainedLineageProof(x);
    assert.equal(result.verifierPinned, false, JSON.stringify(result.blockers));
    assert.equal(result.adoptionAuthority, false);
  });
}
