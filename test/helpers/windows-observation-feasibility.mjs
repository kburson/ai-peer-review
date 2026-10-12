// @story #190
// cspell:words SACL
// Independent unverified stock-script batch, never imported by production.
// Complete ACL/principal/path records stay in memory; only a closed report is written.
import { execFileSync, execFile } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir, release, arch } from 'node:os';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import { createHash } from 'node:crypto';
import {
  validateObservationFeasibilityReport,
  observationFeasibilityFailure,
} from './windows-observation-feasibility-report.mjs';
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
try {
$failureStage='batch-query'
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
$restoreParts=$null
function AclBytesEqual($first,$second) {
  if ($null -eq $first -or $null -eq $second) { return $null -eq $first -and $null -eq $second }
  $a=[byte[]]::new($first.BinaryLength); $first.GetBinaryForm($a,0)
  $b=[byte[]]::new($second.BinaryLength); $second.GetBinaryForm($b,0)
  return [Convert]::ToBase64String($a) -ceq [Convert]::ToBase64String($b)
}
try {
  $failureStage='acl-change'
  $rule=[Security.AccessControl.FileSystemAccessRule]::new([Security.Principal.SecurityIdentifier]::new('S-1-1-0'),[Security.AccessControl.FileSystemRights]::ReadAndExecute,[Security.AccessControl.InheritanceFlags]::None,[Security.AccessControl.PropagationFlags]::None,[Security.AccessControl.AccessControlType]::Allow)
  $prior.AddAccessRule($rule)
  Set-Acl -LiteralPath ([string]$p.directory) -AclObject $prior
  $changed=Observe ([string]$p.query)
  [Console]::Out.WriteLine((@{kind='changed';record=$changed} | ConvertTo-Json -Compress))
} finally {
  $failureStage='acl-restore'
  $prior.RemoveAccessRuleSpecific($rule)
  [IO.Directory]::SetAccessControl([string]$p.directory,$prior)
  $after=[IO.Directory]::GetAccessControl([string]$p.directory,$sections).GetSecurityDescriptorBinaryForm()
  $restored=[Convert]::ToBase64String($after) -ceq [Convert]::ToBase64String($bytes)
  $beforeRaw=[Security.AccessControl.RawSecurityDescriptor]::new($bytes,0)
  $afterRaw=[Security.AccessControl.RawSecurityDescriptor]::new($after,0)
  $restoreParts=@{
    ownerEqual=$beforeRaw.Owner.Value -ceq $afterRaw.Owner.Value
    groupEqual=$beforeRaw.Group.Value -ceq $afterRaw.Group.Value
    controlFlagsEqual=$beforeRaw.ControlFlags -eq $afterRaw.ControlFlags
    daclEqual=(AclBytesEqual $beforeRaw.DiscretionaryAcl $afterRaw.DiscretionaryAcl)
    saclEqual=(AclBytesEqual $beforeRaw.SystemAcl $afterRaw.SystemAcl)
  }
}
[Console]::Out.WriteLine((@{kind='restored';aclRestored=[bool]$restored;restoreParts=$restoreParts;record=(Observe ([string]$p.query))} | ConvertTo-Json -Compress))
} catch {
  $types=@(); $current=$_.Exception
  for($depth=0;$null -ne $current -and $depth -lt 3;$depth++) { $types+= $current.GetType().Name; $current=$current.InnerException }
  $privilege=$null
  foreach($name in @('SeSecurityPrivilege','SeRestorePrivilege','SeTakeOwnershipPrivilege')) {
    if($_.Exception.ToString().Contains($name)) { $privilege=$name }
  }
  [Console]::Out.WriteLine((@{kind='failure';stage=$failureStage;types=$types;privilege=$privilege} | ConvertTo-Json -Compress))
  exit 1
}
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
  cleanupProved = false,
  stage = 'setup',
  rows = null;
const baseline = [];
let privatePartialOutput = '';
let scriptFailure = null;
try {
  const directory = path.join(base, 'directory'),
    file = path.join(base, 'record.json');
  await mkdir(directory);
  await writeFile(file, '{}\n', { flag: 'wx' });
  // Independent fixture preparation uses the unchanged fixed stock provision
  // body. Measure protected ACLs like the real guard rather than inherited ACL
  // normalization; every timed observation below still freshly executes.
  for (const target of [directory, file]) {
    execFileSync(executable, args(original), {
      ...options,
      input: JSON.stringify({ mode: 'provision', paths: [target] }),
    });
  }
  const query = JSON.stringify({ mode: 'observe', paths: [directory, file] });
  const oneShotMs = [];
  stage = 'one-shot';
  for (let i = 0; i < 10; i++) {
    const started = performance.now();
    const raw = execFileSync(executable, args(original), { ...options, input: query });
    oneShotMs.push(Math.round(performance.now() - started));
    baseline.push(parseRecord(raw));
  }
  stage = 'batch';
  const started = performance.now();
  let coldFirstQueryMs = null,
    seen = '';
  const output = await new Promise((resolve, reject) => {
    let result,
      completed = false;
    const child = execFile(executable, args(batch), options, (error, stdout, stderr) => {
      privatePartialOutput = stdout;
      if (error || stderr.trim()) {
        reject(Error('observation-feasibility-batch-refused'));
        return;
      }
      result = stdout;
      completed = true;
    });
    child.once('close', (code, signal) => {
      childExitObserved = Number.isInteger(code) && signal === null;
      if (completed && childExitObserved && code === 0) resolve(result);
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
  stage = 'decode';
  rows = output
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
  stage = 'validate';
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
  stage = 'restore';
  if (!report.aclRestored) throw Error('observation-feasibility-restoration-unproved');
  cleanupProved = report.aclRestored && report.childExitObserved;
  stage = 'publish';
  const out = path.join(process.cwd(), '.scratch/190-feasibility-public');
  await mkdir(out, { recursive: true });
  await writeFile(path.join(out, 'report.json'), JSON.stringify(report, null, 2) + '\n', {
    flag: 'wx',
  });
} catch (error) {
  if (!rows && privatePartialOutput) {
    rows = privatePartialOutput
      .trim()
      .split(/\r?\n/)
      .flatMap((line) => {
        try {
          return [JSON.parse(line)];
        } catch {
          return [];
        }
      });
    const failure = rows.find((row) => row.kind === 'failure');
    if (
      failure &&
      ['batch-query', 'acl-change', 'acl-restore'].includes(failure.stage) &&
      Array.isArray(failure.types) &&
      failure.types.length <= 3 &&
      failure.types.every((value) => typeof value === 'string' && /^[A-Za-z]{1,80}$/.test(value)) &&
      [null, 'SeSecurityPrivilege', 'SeRestorePrivilege', 'SeTakeOwnershipPrivilege'].includes(
        failure.privilege
      )
    )
      scriptFailure = {
        stage: failure.stage,
        exceptionTypes: failure.types,
        privilege: failure.privilege,
      };
  }
  let restoredRecordsEqual = null;
  try {
    if (typeof rows?.[11]?.record === 'string' && baseline.length === 10)
      restoredRecordsEqual = parseRecord(rows[11].record) === baseline[9];
  } catch {
    /* Malformed private record details remain unavailable. */
  }
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
        ...observationFeasibilityFailure(error, stage),
        frameCount: rows?.length ?? null,
        scriptFailure,
        recordTypes:
          rows
            ?.slice(0, 10)
            .map((row) => (Array.isArray(row.record) ? 'array' : typeof row.record)) ?? null,
        restoredRecordsEqual,
        restorationParts:
          rows?.[11]?.restoreParts &&
          ['ownerEqual', 'groupEqual', 'controlFlagsEqual', 'daclEqual', 'saclEqual'].every(
            (key) => typeof rows[11].restoreParts[key] === 'boolean'
          )
            ? Object.fromEntries(
                ['ownerEqual', 'groupEqual', 'controlFlagsEqual', 'daclEqual', 'saclEqual'].map(
                  (key) => [key, rows[11].restoreParts[key]]
                )
              )
            : null,
        aclRestoreReported:
          typeof rows?.[11]?.aclRestored === 'boolean' ? rows[11].aclRestored : null,
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
