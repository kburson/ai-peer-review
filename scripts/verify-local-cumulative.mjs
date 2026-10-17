// @story #191
// Development evidence integrity only; no runtime or participant authority.
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { lstatSync, readFileSync, readdirSync, realpathSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DELIVERED = '67a5dd5463f51d29c2711469b2c7b2814ed982f4';
const GRAPH_HASH = 'af68d1380c0dfbcae54ca431bfb881aa94e752250e9b9473d9353b2acc3ceafe';
const DIRECTORY = 'evidence/local-handoff/191/';
const OBSERVATIONS = [
  'evidence/local-handoff/190/2026-10-16-host-observation.json',
  'evidence/local-handoff/190/2026-10-16-provider-scope-observation.json',
];
const LOCAL = ['paths', 'roles', 'turns', 'locking', 'restart', 'installed', 'limits'];
const LOCAL_EVIDENCE = {
  paths: ['test/unit/paths.test.mjs', 'test/integration/submission.test.mjs'],
  roles: [
    'test/unit/claude-launch-permissions.test.mjs',
    'test/integration/claude-launch-permissions.test.mjs',
    OBSERVATIONS[1],
  ],
  turns: ['test/integration/submission.test.mjs', OBSERVATIONS[0]],
  locking: [
    'test/integration/submission.test.mjs',
    'test/unit/installed-handoff-evidence.test.mjs',
  ],
  restart: [
    'test/unit/installed-handoff-lifecycle.test.mjs',
    'test/unit/installed-handoff-evidence.test.mjs',
    OBSERVATIONS[0],
  ],
  installed: ['test/helpers/installed-local-ci.mjs', 'evidence/local-handoff/190/README.md'],
  limits: [
    'test/integration/claude-launch-lifetime.test.mjs',
    'evidence/local-handoff/190/README.md',
  ],
};
const COUNTS = {
  'reachable-native-operation': 3,
  'external-implementation-dependency': 5,
  'unknown-handle-origin': 6886,
  'unresolved-process-entry': 24,
  'unawaited-resource-lease': 11,
  'reachable-native-load': 5,
  'observed-graph-mismatch': 1,
};
const invalid = () => {
  throw new Error('cumulative-invalid: evidence integrity or scope mismatch');
};
const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');
const blob = (bytes) =>
  createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex');
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
function keys(value, names) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) invalid();
  if (!same(Object.keys(value).sort(), [...names].sort())) invalid();
}
function git(root, args) {
  return execFileSync('git', args, {
    cwd: root,
    encoding: 'utf8',
    timeout: 15000,
    maxBuffer: 4 * 1024 * 1024,
    env: { ...process.env, GIT_OPTIONAL_LOCKS: '0', GIT_NO_REPLACE_OBJECTS: '1' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}
function ordinary(root, relative) {
  const file = path.join(root, relative);
  const stat = lstatSync(file);
  if (!stat.isFile() || stat.isSymbolicLink() || stat.size > 2 * 1024 * 1024) invalid();
  if (realpathSync(file) !== file) invalid();
  return readFileSync(file);
}
function currentSources(root) {
  const files = [];
  function walk(relative) {
    const file = path.join(root, relative);
    const stat = lstatSync(file);
    if (stat.isSymbolicLink()) invalid();
    if (stat.isDirectory()) {
      for (const name of readdirSync(file).sort()) walk(relative + '/' + name);
    } else files.push({ path: relative, blob: blob(ordinary(root, relative)) });
    if (files.length > 512) invalid();
  }
  walk('src');
  walk('bin');
  return files.sort((a, b) => a.path.localeCompare(b.path, 'en'));
}
function originalObligations(root) {
  const definitions = [
    {
      issue: 171,
      commit: 'dd1e1fc70b19c8830be086bf7b2b32c42096e8b2',
      file: 'docs/superpowers/plans/2026-10-06-141-protected-storage-ownership-decomposition.md',
      title: '### Task 6: Migrate portable consumers and verify fresh installations',
      owners: [186, 186, 187, 188, 189, 190, 190, 141],
    },
    {
      issue: 191,
      commit: 'c11a4987c0cd0ff0270885d3ec97f30fa26273a1',
      file: 'docs/superpowers/plans/2026-10-08-171-portable-consumer-decomposition.md',
      title: '### Task 6: Enforce Whole Consumer Inventory and Cumulative Acceptance',
      owners: [191, 191, 191, 191],
    },
  ];
  return definitions.flatMap((definition) => {
    const source = git(root, ['show', `${definition.commit}:${definition.file}`]);
    const start = source.indexOf(definition.title + '\n');
    if (start < 0) invalid();
    const rest = source.slice(start + definition.title.length);
    const end = rest.search(/^#{1,3} /m);
    const section = end < 0 ? rest : rest.slice(0, end);
    const rows = [...section.matchAll(/^- \[ \] (.+)$/gm)].map((match) => match[1]);
    if (rows.length !== definition.owners.length) invalid();
    return rows.map((text, index) => ({
      id: `${definition.issue}:${index + 1}`,
      text,
      source: `${definition.commit}:${definition.file}`,
      originalOwner: definition.owners[index],
      status: 'broader-unverified',
      remainingOwners: definition.issue === 171 && index === 1 ? [141, 143] : [141],
    }));
  });
}
export function collectCumulativeEvidence({ root } = {}) {
  root = realpathSync(root);
  for (const file of new Set(Object.values(LOCAL_EVIDENCE).flat())) ordinary(root, file);
  const graphBytes = ordinary(root, DIRECTORY + 'failed-broad-graph.json');
  const deliveredSources = git(root, [
    'ls-tree',
    '-r',
    '--format=%(objectname)%x09%(path)',
    DELIVERED,
    '--',
    'src',
    'bin',
  ])
    .trim()
    .split('\n')
    .map((line) => {
      const [hash, file] = line.split('\t');
      return { path: file, blob: hash };
    })
    .sort((a, b) => a.path.localeCompare(b.path, 'en'));
  return {
    map: JSON.parse(ordinary(root, DIRECTORY + 'cumulative.json')),
    originalObligations: originalObligations(root),
    deliveredSources,
    currentSources: currentSources(root),
    graph: JSON.parse(graphBytes),
    graphSha256: sha256(graphBytes),
    observations: OBSERVATIONS.map((file) => ({
      path: file,
      sha256: sha256(ordinary(root, file)),
    })),
    deliveredObservations: OBSERVATIONS.map((file) => ({
      path: file,
      sha256: sha256(Buffer.from(git(root, ['show', `${DELIVERED}:${file}`]))),
    })),
  };
}
export function validateCumulativeEvidence(input) {
  const { map, graph } = input;
  keys(map, [
    'schema',
    'deliveredHead',
    'scope',
    'windows',
    'currentProviderProof',
    'originalObligations',
    'localRequirements',
    'failedBroadGraph',
    'observations',
  ]);
  if (
    map.schema !== 'ai-peer-review.local-cumulative/v1' ||
    map.deliveredHead !== DELIVERED ||
    map.scope !== 'local-evidence-integrity' ||
    map.windows !== 'deferred under #213; unverified' ||
    map.currentProviderProof !== false
  )
    invalid();
  if (
    !same(map.originalObligations, input.originalObligations) ||
    input.originalObligations.length !== 12
  )
    invalid();
  if (!same(input.currentSources, input.deliveredSources) || input.currentSources.length !== 188)
    invalid();
  if (
    !same(map.observations, input.observations) ||
    !same(input.observations, input.deliveredObservations)
  )
    invalid();
  keys(graph, [
    'schema',
    'verified',
    'coverageComplete',
    'passed',
    'moduleCount',
    'edgeCount',
    'blockers',
  ]);
  if (
    graph.schema !== 'ai-peer-review.portable-consumer-report/v1' ||
    graph.verified !== false ||
    graph.coverageComplete !== false ||
    graph.passed !== false ||
    graph.moduleCount !== 186 ||
    graph.edgeCount !== 28908 ||
    graph.blockers.length !== 6935 ||
    input.graphSha256 !== GRAPH_HASH
  )
    invalid();
  const counts = {};
  for (const blocker of graph.blockers) counts[blocker.code] = (counts[blocker.code] ?? 0) + 1;
  if (
    !same(counts, COUNTS) ||
    !same(map.failedBroadGraph, {
      sha256: GRAPH_HASH,
      blockers: 6935,
      moduleCount: 186,
      edgeCount: 28908,
      counts: COUNTS,
    })
  )
    invalid();
  if (!Array.isArray(map.localRequirements) || map.localRequirements.length !== LOCAL.length)
    invalid();
  for (const [index, row] of map.localRequirements.entries()) {
    keys(row, ['id', 'status', 'evidence', 'limitation']);
    if (
      row.id !== LOCAL[index] ||
      row.status !== 'requires-behavioral-verification' ||
      !same(row.evidence, LOCAL_EVIDENCE[row.id]) ||
      typeof row.limitation !== 'string' ||
      !row.limitation.trim()
    )
      invalid();
  }
  return {
    scope: 'local-evidence-integrity',
    passed: true,
    deliveredHead: DELIVERED,
    sourceFiles: input.currentSources.length,
    originalObligations: 12,
    localRequirements: 7,
    broaderGraphPassed: false,
    broaderBlockers: 6935,
    currentProviderProof: false,
    windows: 'deferred under #213; unverified',
    behavioralAcceptance: 'requires current behavioral, hosted and native verification',
  };
}
export function verifyLocalCumulative(options) {
  return validateCumulativeEvidence(collectCumulativeEvidence(options));
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    console.log(
      JSON.stringify(
        verifyLocalCumulative({ root: fileURLToPath(new URL('../', import.meta.url)) }),
        null,
        2
      )
    );
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
