import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = '/Users/kpburson/.codex/worktrees/107-runtime-api-spec/ai-peer-review';
const folder = path.dirname(fileURLToPath(import.meta.url));
const relativeFolder = path.relative(root, folder);
const fur = 'docs/superpowers/specs/2026-09-27-107-agent-first-review-runtime-design.md';
const prior = 'docs/superpowers/peer-reviews/spec/2026-09-27-107-agent-first-review-runtime-cost-metrics-xpr';
assert.equal(fs.realpathSync(process.cwd()), fs.realpathSync(root));
assert.equal(path.basename(folder), '2026-09-27-107-145046-controller-worker-sar');
const hash = (bytes) => 'sha256:' + createHash('sha256').update(bytes).digest('hex');
const read = (name) => fs.readFileSync(path.join(folder, name));
const json = (name) => JSON.parse(read(name));
const write = (name, bytes) => fs.writeFileSync(path.join(folder, name), bytes, { flag: 'wx' });
const writeJSON = (name, value) => write(name, JSON.stringify(value, null, 2) + '\n');
const run = (exe, args, input) => {
  const result = spawnSync(exe, args, { cwd: root, input, encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 });
  if (result.error) throw result.error;
  return result;
};
const git = (args) => {
  const result = run('git', args);
  assert.equal(result.status, 0, result.stderr);
  return result.stdout;
};
function surroundingState() {
  const files = git(['ls-files', '--others', '--exclude-standard', '-z'])
    .split('\0').filter((p) => p && !p.startsWith(relativeFolder + '/')).sort();
  return {
    tracked_delta: hash(git(['diff', '--binary', '--', '.', ':(exclude)' + fur])),
    staged_delta: hash(git(['diff', '--cached', '--binary'])),
    untracked: files.map((p) => ({ path: p, digest: hash(fs.readFileSync(path.join(root, p))) })),
  };
}
function patch(before, after) {
  const result = run('diff', ['-u', '--label', 'a/fur.md', '--label', 'b/fur.md', before, after]);
  assert.ok(result.status === 0 || result.status === 1, result.stderr);
  return result.stdout;
}
function event(type, data = {}) {
  const eventPath = path.join(folder, 'events.jsonl');
  const sequence = fs.existsSync(eventPath) ? fs.readFileSync(eventPath, 'utf8').trim().split('\n').length + 1 : 1;
  fs.appendFileSync(eventPath, JSON.stringify({ sequence, at: new Date().toISOString(), type, ...data }) + '\n');
}
const mode = process.argv[2];
if (mode === 'init') {
  const initial = fs.readFileSync(path.join(root, fur));
  assert.equal(hash(initial), 'sha256:c262105281e099709d77a9595a4ba180b38eb391e6deac56e84013064f0edbed');
  write('initial-fur.md', initial);
  const previous = fs.readFileSync(path.join(root, prior, 'final-fur.md'));
  const previousManifest = JSON.parse(fs.readFileSync(path.join(root, prior, 'manifest.json')));
  assert.equal(hash(previous), previousManifest.final_digest);
  write('lineage.patch', patch(path.join(root, prior, 'final-fur.md'), path.join(folder, 'initial-fur.md')));
  writeJSON('baseline.json', {
    started_at: '2026-09-27T14:49:17.167Z', start_source: 'host-user-prompt-timestamp',
    captured_at: new Date().toISOString(), initial_digest: hash(initial),
    prior: { path: prior, manifest_digest: hash(fs.readFileSync(path.join(root, prior, 'manifest.json'))), final_digest: hash(previous) },
    surrounding: surroundingState(),
  });
  event('baseline-captured', { initial_digest: hash(initial), prior_digest: hash(previous) });
  event('round-review-recorded', { round: 1, findings: ['CWSAR-001', 'CWSAR-002', 'CWSAR-003'], timing: 'recorded-after-review' });
  console.log('Baseline and lineage captured.');
} else if (mode === 'close-round-1') {
  const current = fs.readFileSync(path.join(root, fur));
  write('rounds/01-after.md', current);
  write('rounds/01.patch', patch(path.join(folder, 'initial-fur.md'), path.join(folder, 'rounds/01-after.md')));
  writeJSON('rounds/01.json', { round: 1, verdict: 'changes-required', before_digest: hash(read('initial-fur.md')), after_digest: hash(current), ended_at: new Date().toISOString(), review: 'rounds/01-review.md', author_response: 'rounds/01-author-response.md', patch: 'rounds/01.patch', finding_ids: ['CWSAR-001', 'CWSAR-002', 'CWSAR-003'] });
  event('round-revision-recorded', { round: 1, digest: hash(current) });
  event('round-started', { round: 2, reviewed_digest: hash(current) });
  console.log('Round 1 patch captured; round 2 started.');
} else if (mode === 'close-round-2') {
  const current = fs.readFileSync(path.join(root, fur));
  write('rounds/02-after.md', current);
  write('rounds/02.patch', patch(path.join(folder, 'rounds/01-after.md'), path.join(folder, 'rounds/02-after.md')));
  writeJSON('rounds/02.json', { round: 2, verdict: 'changes-required', before_digest: hash(read('rounds/01-after.md')), after_digest: hash(current), ended_at: new Date().toISOString(), review: 'rounds/02-review.md', author_response: 'rounds/02-author-response.md', patch: 'rounds/02.patch', finding_ids: ['CWSAR-004'], resolved_ids: ['CWSAR-001', 'CWSAR-002', 'CWSAR-003'] });
  event('round-review-recorded', { round: 2, findings: ['CWSAR-004'] });
  event('round-revision-recorded', { round: 2, digest: hash(current) });
  event('round-started', { round: 3, reviewed_digest: hash(current) });
  console.log('Round 2 patch captured; round 3 started.');
} else if (mode === 'validate') {
  const before = json('rounds/02.json');
  const current = fs.readFileSync(path.join(root, fur));
  assert.equal(hash(current), before.after_digest, 'FUR changed during clean review');
  write('final-fur.md', current);
  write('rounds/03.patch', Buffer.alloc(0));
  writeJSON('rounds/03.json', {
    round: 3, verdict: 'clean', before_digest: hash(current), after_digest: hash(current),
    ended_at: new Date().toISOString(), review: 'rounds/03-review.md',
    author_response: 'rounds/03-author-response.md', patch: 'rounds/03.patch',
    supplemental_no_change_collateral: true, finding_ids: [],
    resolved_ids: ['CWSAR-001', 'CWSAR-002', 'CWSAR-003', 'CWSAR-004'],
  });
  event('clean-review-recorded', { round: 3, digest: hash(current), open_findings: 0 });
  const checks = [];
  const lint = run('/Users/kpburson/projects/Vibe-Coding/ai-peer-review/node_modules/.bin/markdownlint-cli2',
    [fur, relativeFolder + '/**/*.md']);
  assert.equal(lint.status, 0, lint.stdout + lint.stderr);
  checks.push({ check: 'markdownlint', status: 'passed', output: lint.stdout.trim() });
  const examples = [];
  const text = current.toString('utf8');
  const blocks = text.match(/(?:^ {4}.*(?:\n|$))+/gm) ?? [];
  for (const block of blocks) {
    const content = block.split('\n').map((line) => line.startsWith('    ') ? line.slice(4) : line).join('\n').trim();
    const inline = content.match(/'(\{[\s\S]*\})'/);
    if (!content.startsWith('{') && !inline) continue;
    const value = JSON.parse(content.startsWith('{') ? content : inline[1]);
    assert.equal(typeof value.schema, 'string');
    examples.push({ schema: value.schema, form: inline ? 'cli-inline' : 'standalone' });
  }
  assert.equal(examples.filter((v) => v.form === 'standalone').length, 4);
  assert.equal(examples.filter((v) => v.form === 'cli-inline').length, 2);
  checks.push({ check: 'embedded-json', status: 'passed', examples, assurance: 'JSON parsing and schema-label presence; target schemas are not implemented' });
  const whitespace = run('git', ['diff', '--check', '--', fur]);
  assert.equal(whitespace.status, 0, whitespace.stdout + whitespace.stderr);
  checks.push({ check: 'git-diff-check', status: 'passed' });
  assert.deepEqual(surroundingState(), json('baseline.json').surrounding);
  checks.push({ check: 'unrelated-files-and-index-preserved', status: 'passed' });
  const temp = fs.mkdtempSync(path.join(folder, '.verify-'));
  const created = [];
  const patchChecks = [];
  try {
    const edges = [
      { name: 'lineage', before: path.join(root, prior, 'final-fur.md'), after: path.join(folder, 'initial-fur.md'), patch: 'lineage.patch' },
      { name: 'round-1', before: path.join(folder, 'initial-fur.md'), after: path.join(folder, 'rounds/01-after.md'), patch: 'rounds/01.patch' },
      { name: 'round-2', before: path.join(folder, 'rounds/01-after.md'), after: path.join(folder, 'final-fur.md'), patch: 'rounds/02.patch' },
    ];
    for (const edge of edges) {
      for (const reverse of [false, true]) {
        const output = path.join(temp, edge.name + (reverse ? '-reverse.md' : '-forward.md'));
        created.push(output);
        const result = run('/usr/bin/patch', ['--batch', '-F', '0', ...(reverse ? ['-R'] : []), '-o', output, reverse ? edge.after : edge.before, path.join(folder, edge.patch)]);
        assert.equal(result.status, 0, result.stdout + result.stderr);
        assert.deepEqual(fs.readFileSync(output), fs.readFileSync(reverse ? edge.before : edge.after));
        patchChecks.push({ edge: edge.name, direction: reverse ? 'reverse' : 'forward', status: 'passed', result_digest: hash(fs.readFileSync(output)) });
      }
    }
  } finally {
    for (const file of created) if (fs.existsSync(file)) fs.unlinkSync(file);
    fs.rmdirSync(temp);
  }
  assert.equal(read('rounds/03.patch').length, 0);
  assert.deepEqual(current, read('rounds/02-after.md'));
  checks.push({ check: 'patch-reconstruction', status: 'passed', edges: patchChecks, clean_round: 'empty patch; equal bytes' });
  writeJSON('validation.json', { schema: 'manual-sar-validation/v1', at: new Date().toISOString(), fur_digest: hash(current), checks });
  event('validation-passed', { checks: checks.map((v) => v.check), digest: hash(current) });
  console.log(JSON.stringify({ validation: 'passed', json_examples: examples.length, patch_directions: patchChecks.length, final_digest: hash(current) }));
} else if (mode === 'finalize') {
  const baseline = json('baseline.json');
  const validation = json('validation.json');
  assert.equal(hash(fs.readFileSync(path.join(root, fur))), validation.fur_digest);
  assert.deepEqual(surroundingState(), baseline.surrounding);
  const rounds = [1, 2, 3].map((n) => json('rounds/0' + n + '.json'));
  const cutoff = new Date().toISOString();
  const unavailable = (unit, reason = 'not-exposed-to-worker', source = 'worker-facing-tool-interface') => ({ value: null, unit, provenance: 'unavailable', reason, source });
  const duration = (start, end) => ({ value: Date.parse(end) - Date.parse(start), unit: 'ms', provenance: 'derived', source: 'host-prompt-time-and-local-tool-UTC-clock', formula: 'end minus start', start, end, scope: 'worker review/evidence interval; includes tools and waits; excludes final return', clock_assurance: 'wall-clock difference; monotonic clock continuity not independently attested' });
  const usage = () => ({
    provider_duration: unavailable('ms'), api_duration: unavailable('ms'),
    input_tokens: unavailable('tokens'), output_tokens: unavailable('tokens'),
    reasoning_tokens: unavailable('tokens'), cache_read_tokens: unavailable('tokens'),
    cache_creation_tokens: unavailable('tokens'),
    reported_cost: unavailable('USD'), estimated_cost: unavailable('USD', 'no-token-counters-or-price-provenance'),
    actual_incremental_cost: unavailable('USD', 'billing-not-exposed'),
  });
  const identity = {
    requested_provider: 'codex', requested_model: 'gpt-6-astra', requested_effort: 'high',
    requested_source: 'controller-user-request',
    observed_provider: { value: 'openai-codex', provenance: 'reported', source: 'agent-instruction-context', assurance: 'not-provider-runtime-attestation' },
    instruction_model_family: { value: 'GPT-6', source: 'agent-instruction-context', assurance: 'not-exact-runtime-variant' },
    observed_model: unavailable('model-id'), observed_effort: unavailable('effort'),
    process_termination: unavailable('status', 'not-observable-before-worker-return'),
  };
  let start = baseline.started_at;
  const roundMetrics = rounds.map((r) => {
    const result = { round: r.round, participant_id: 'sar-worker-1', source_attempt_id: 'manual-worker-session-1', verdict: r.verdict, wall_duration: duration(start, r.ended_at), ...usage(), identity };
    start = r.ended_at;
    return result;
  });
  const metrics = {
    schema: 'manual-controller-worker-sar-metrics/v1', collection: 'worker-recorded tool observations; no supervisor billing attestation',
    evidence_cutoff: cutoff, identity,
    attempts: [{ id: 'manual-worker-session-1', accounting_owner: 'run', rounds: [1, 2, 3], continuous_session: true, ...usage() }],
    rounds: roundMetrics,
    agent: { id: 'sar-worker-1', roles: ['critique', 'revision'], wall_duration: duration(baseline.started_at, cutoff), ...usage() },
    run: { wall_duration: duration(baseline.started_at, cutoff), evidence_finalization_wall_duration: duration(rounds[2].ended_at, cutoff), worker_usage: usage(), controller_usage: { value: null, provenance: 'unavailable', reason: 'outside-worker-observation-boundary', source: 'controller-not-observed' }, complete_token_total: unavailable('tokens'), complete_cost_total: unavailable('USD'), coverage: 'incomplete' },
    review_chain: { included_current_run: path.basename(folder), predecessor: baseline.prior, totals: null, reason: 'historical-and-controller-usage-not-reconciled-by-this-worker', source: 'manual-sar-scope', coverage: 'incomplete' },
    aggregation: 'One continuous worker attempt; per-round unknown usage is coverage detail, not additive observations. Wall intervals are measured separately from provider usage.',
  };
  writeJSON('metrics.json', metrics);
  event('manual-sar-finalized', { verdict: 'clean', rounds_used: 3, package_protocol_acceptance: false, digest: validation.fur_digest, telemetry_cutoff: cutoff });
  const files = fs.readdirSync(folder, { recursive: true }).filter((p) => fs.statSync(path.join(folder, p)).isFile()).sort();
  const inventory = files.map((p) => ({ path: p, bytes: read(p).length, digest: hash(read(p)) }));
  writeJSON('manifest.json', {
    schema: 'manual-controller-worker-sar-evidence/v1', issue: 107, kind: 'sar', run_id: path.basename(folder),
    execution: 'manually orchestrated evidence, not package-protocol acceptance', package_protocol_acceptance: false,
    verdict: 'clean', rounds_used: 3, round_cap: 6, filepath: fur,
    controller: { role: 'non-participant', source: 'user-controller-instruction' },
    participants: [{ id: 'sar-worker-1', roles: ['critique', 'revision'], identity }],
    initial_digest: baseline.initial_digest, final_digest: validation.fur_digest,
    parent_review: baseline.prior, lineage_patch: 'lineage.patch', terminal_anchor: 'final-fur.md',
    started_at: baseline.started_at, evidence_cutoff: cutoff, rounds,
    findings: [1, 2, 3, 4].map((n) => ({ id: 'CWSAR-00' + n, severity: n === 3 ? 'low' : 'medium', originating_round: n === 4 ? 2 : 1, resolved_in_round: n === 4 ? 3 : 2, resolution: 'fixed' })),
    metrics: { path: 'metrics.json', digest: hash(read('metrics.json')), wall_duration: metrics.run.wall_duration, token_total: metrics.run.complete_token_total, cost_total: metrics.run.complete_cost_total, coverage: 'incomplete' },
    validation: { path: 'validation.json', digest: hash(read('validation.json')), status: 'passed' },
    limitations: [
      'Manual single-agent review; no independent peer or package authority.',
      'Exact model variant and effort are requested identities, not independently observed runtime facts.',
      'Worker cannot observe terminal provider usage or process termination before returning; controller may preserve a separate amendment.',
      'Clean-round author acknowledgment and empty patch are manual procedure collateral, not a target-runtime revision.',
      'Wall measurements end at evidence cutoff; final return is not included.',
    ], inventory,
  });
  console.log(JSON.stringify({ verdict: 'clean', rounds: 3, final_digest: validation.fur_digest, files: inventory.length + 1, wall_ms: metrics.run.wall_duration.value }));
} else if (mode === 'verify') {
  const manifest = json('manifest.json');
  for (const entry of manifest.inventory) {
    assert.equal(read(entry.path).length, entry.bytes, entry.path);
    assert.equal(hash(read(entry.path)), entry.digest, entry.path);
  }
  assert.equal(hash(fs.readFileSync(path.join(root, fur))), manifest.final_digest);
  assert.deepEqual(surroundingState(), json('baseline.json').surrounding);
  console.log(JSON.stringify({ inventory_verified: manifest.inventory.length, final_digest: manifest.final_digest, unrelated_state: 'unchanged' }));
} else {
  throw new Error('Unsupported evidence capture mode');
}
