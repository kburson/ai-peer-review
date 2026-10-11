// @story #190
// Independent unverified stock-script batch, never imported by production.
// Complete ACL/principal/path records stay in memory; only a closed report is written.
import { execFileSync, execFile } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir, release, arch } from 'node:os';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import { createHash } from 'node:crypto';
import { validateObservationFeasibilityReport } from './windows-observation-feasibility-report.mjs';
const token = process.argv[2];
if (
  process.platform !== 'win32' ||
  process.argv.length !== 3 ||
  !['ordinary', 'limited'].includes(token) ||
  process.env.GITHUB_ACTIONS !== 'true' ||
  process.env.RUNNER_ENVIRONMENT !== 'github-hosted' ||
  process.env.GITHUB_REPOSITORY !== 'kburson/ai-peer-review' ||
  process.env.GITHUB_WORKFLOW !== 'Windows observation feasibility' ||
  process.env.GITHUB_REF_NAME !== 'codex/190-installed-journeys' ||
  process.env.NODE_OPTIONS
)
  throw Error('observation-feasibility-host-unavailable');
const producer = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
if (producer !== process.env.GITHUB_SHA)
  throw Error('observation-feasibility-producer-unavailable');
const source = readFileSync('src/broker/storage-protection.mjs', 'utf8');
const matches = [...source.matchAll(/const windowsScript = String\.raw`([\s\S]*?)`;/gu)];
if (matches.length !== 1) throw Error('observation-feasibility-script-unavailable');
const original = matches[0][1];
const inputExpression = '[Console]::In.ReadToEnd()';
const outputExpression =
  "[Console]::Out.Write($json.Serialize([ordered]@{schema='ai-peer-review.windows-protection-observation/v1'; records=@($records)}))";
if (original.split(inputExpression).length !== 2 || original.split(outputExpression).length !== 2)
  throw Error('observation-feasibility-script-shape');
// Only this independent diagnostic's I/O routing differs. Token and ACL queries
// execute the complete original observation body again on every invocation.
const observation = original
  .replace(inputExpression, '$requestText')
  .replace(
    outputExpression,
    "return $json.Serialize([ordered]@{schema='ai-peer-review.windows-protection-observation/v1'; records=@($records)})"
  );
const batch =
  String.raw`
$ErrorActionPreference='Stop'
$ProgressPreference='SilentlyContinue'
[Console]::InputEncoding=[Text.UTF8Encoding]::new($false)
[Console]::OutputEncoding=[Text.UTF8Encoding]::new($false)
$p=[Console]::In.ReadToEnd() | ConvertFrom-Json
function Observe([string]$requestText) {
` +
  observation +
  String.raw`
}
for($i=0;$i -lt 10;$i++) {
  $watch=[Diagnostics.Stopwatch]::StartNew()
  $record=Observe ([string]$p.query)
  $watch.Stop()
  [Console]::Out.WriteLine((@{kind='query';index=$i;elapsedMs=$watch.Elapsed.TotalMilliseconds;record=$record} | ConvertTo-Json -Compress))
  [Console]::Out.Flush()
}
$sections=[Security.AccessControl.AccessControlSections]'Access,Owner,Group'
$prior=[IO.Directory]::GetAccessControl([string]$p.directory,$sections)
$bytes=$prior.GetSecurityDescriptorBinaryForm()
$restored=$false
try {
  $rule=[Security.AccessControl.FileSystemAccessRule]::new([Security.Principal.SecurityIdentifier]::new('S-1-1-0'),[Security.AccessControl.FileSystemRights]::ReadAndExecute,[Security.AccessControl.InheritanceFlags]::None,[Security.AccessControl.PropagationFlags]::None,[Security.AccessControl.AccessControlType]::Allow)
  $prior.AddAccessRule($rule)
  Set-Acl -LiteralPath ([string]$p.directory) -AclObject $prior
  $changed=Observe ([string]$p.query)
  [Console]::Out.WriteLine((@{kind='changed';record=$changed} | ConvertTo-Json -Compress))
} finally {
  $restore=[Security.AccessControl.DirectorySecurity]::new()
  $restore.SetSecurityDescriptorBinaryForm($bytes)
  Set-Acl -LiteralPath ([string]$p.directory) -AclObject $restore
  $restored=[Convert]::ToBase64String([IO.Directory]::GetAccessControl([string]$p.directory,$sections).GetSecurityDescriptorBinaryForm()) -ceq [Convert]::ToBase64String($bytes)
}
[Console]::Out.WriteLine((@{kind='restored';aclRestored=[bool]$restored;record=(Observe ([string]$p.query))} | ConvertTo-Json -Compress))
`;
const executable = 'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe';
const args = (script) => [
  '-NoLogo',
  '-NoProfile',
  '-NonInteractive',
  '-EncodedCommand',
  Buffer.from(script, 'utf16le').toString('base64'),
];
const options = {
  encoding: 'utf8',
  timeout: 15000,
  maxBuffer: 1048576,
  windowsHide: true,
  env: { ...process.env, PSModulePath: 'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\Modules' },
};
const canonical = (value) =>
  JSON.stringify(value, (_, entry) =>
    entry && typeof entry === 'object' && !Array.isArray(entry)
      ? Object.fromEntries(
          Object.keys(entry)
            .sort()
            .map((key) => [key, entry[key]])
        )
      : entry
  );
const parseRecord = (raw) => {
  const record = JSON.parse(raw.replace(/^\uFEFF/, '').trim());
  if (
    record.schema !== 'ai-peer-review.windows-protection-observation/v1' ||
    !Array.isArray(record.records) ||
    record.records.length !== 2
  )
    throw Error('observation-feasibility-record-unavailable');
  return canonical(record);
};
const base = await mkdtemp(path.join(tmpdir(), 'apr190-observation-'));
let childExitObserved = false,
  cleanupProved = false;
try {
  const directory = path.join(base, 'directory'),
    file = path.join(base, 'record.json');
  await mkdir(directory);
  await writeFile(file, '{}\n', { flag: 'wx' });
  const query = JSON.stringify({ mode: 'observe', paths: [directory, file] });
  const oneShotMs = [],
    baseline = [];
  for (let i = 0; i < 10; i++) {
    const started = performance.now();
    const raw = execFileSync(executable, args(original), { ...options, input: query });
    oneShotMs.push(Math.round(performance.now() - started));
    baseline.push(parseRecord(raw));
  }
  const started = performance.now();
  let coldFirstQueryMs = null,
    seen = '';
  const output = await new Promise((resolve, reject) => {
    let result,
      completed = false;
    const child = execFile(executable, args(batch), options, (error, stdout, stderr) => {
      if (error || stderr.trim()) {
        reject(Error('observation-feasibility-batch-refused'));
        return;
      }
      result = stdout;
      completed = true;
    });
    child.once('close', (code, signal) => {
      childExitObserved = code === 0 && signal === null;
      if (completed && childExitObserved) resolve(result);
      else reject(Error('observation-feasibility-exit-unproved'));
    });
    child.stdout.on('data', (chunk) => {
      seen += chunk;
      if (Buffer.byteLength(seen) > 1048576) {
        child.kill();
        reject(Error('observation-feasibility-output-bound'));
      }
      if (coldFirstQueryMs === null && seen.includes('\n'))
        coldFirstQueryMs = Math.round(performance.now() - started);
    });
    child.stdin.on('error', () => reject(Error('observation-feasibility-input-refused')));
    child.stdin.end(JSON.stringify({ query, directory }));
  });
  const rows = output
    .trim()
    .split(/\r?\n/)
    .map((line) => JSON.parse(line));
  if (
    rows.length !== 12 ||
    rows.slice(0, 10).some((r, i) => r.kind !== 'query' || r.index !== i) ||
    rows[10].kind !== 'changed' ||
    rows[11].kind !== 'restored'
  )
    throw Error('observation-feasibility-output-shape');
  const report = validateObservationFeasibilityReport({
    schema: 'ai-peer-review.windows-observation-feasibility/v1',
    verified: false,
    operationalAuthority: 'unavailable',
    producer,
    sourceScriptSha256: createHash('sha256').update(original).digest('hex'),
    node: process.versions.node,
    platform: process.platform,
    arch: arch(),
    osRelease: release(),
    administratorMember: JSON.parse(baseline[0]).records[0].administratorMember,
    administratorEffective: JSON.parse(baseline[0]).records[0].administratorEffective,
    token,
    samples: 10,
    coldFirstQueryMs,
    oneShotMs,
    batchQueryMs: rows.slice(0, 10).map((r) => Math.round(r.elapsedMs)),
    completeRecordsEqual: rows.slice(0, 10).every((r, i) => parseRecord(r.record) === baseline[i]),
    aclChangeObserved: parseRecord(rows[10].record) !== baseline[9],
    aclRestored: rows[11].aclRestored === true && parseRecord(rows[11].record) === baseline[9],
    childExitObserved,
    completeRegistrationObserved: false,
    parentLossProved: false,
    guaranteedStartupSavingMs: 0,
  });
  if (!report.aclRestored) throw Error('observation-feasibility-restoration-unproved');
  cleanupProved = report.aclRestored && report.childExitObserved;
  const out = path.join(process.cwd(), '.scratch/190-feasibility-public');
  await mkdir(out, { recursive: true });
  await writeFile(path.join(out, 'report.json'), JSON.stringify(report, null, 2) + '\n', {
    flag: 'wx',
  });
} catch {
  const out = path.join(process.cwd(), '.scratch/190-feasibility-public');
  await mkdir(out, { recursive: true });
  await writeFile(
    path.join(out, 'incomplete.json'),
    JSON.stringify(
      {
        schema: 'ai-peer-review.windows-observation-feasibility-incomplete/v1',
        verified: false,
        operationalAuthority: 'unavailable',
        producer,
        node: process.versions.node,
        token,
        childExitObserved,
        cleanup: cleanupProved ? 'proved' : 'unproved',
      },
      null,
      2
    ) + '\n',
    { flag: 'wx' }
  );
  // Retain the owned fixture on uncertain ACL/child cleanup; do not export paths.
  throw Error('observation-feasibility-incomplete');
} finally {
  if (cleanupProved) await rm(base, { recursive: true, force: true });
}
