// @story #166
// @story #168
// @story #175
// cspell:words notin DACL SID SIDFullControl Win32PowerShell fsync nlink ino lstat reparse ldne rwxst readattr writeattr readextattr writeextattr readsecurity writesecurity statfs hardlink readback
import { constants } from 'node:fs';
import {
  access,
  chmod,
  lstat,
  mkdir,
  open,
  realpath,
  rename,
  unlink,
  statfs,
} from 'node:fs/promises';
import { assertOwnerElectionLease, ownerElectionBudget } from './ownership-election.mjs';
import { opendir } from 'node:fs/promises';
import { createHash, randomUUID } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { performance } from 'node:perf_hooks';
import path from 'node:path';
import { portableOwnerRootOperation } from './portable-owner-lifecycle.mjs';
import { AprError } from '../errors.mjs';

const execute = promisify(execFile);
const receipts = new WeakMap();
const guards = new WeakMap();
const heldPublications = new WeakMap();
const credentialObservations = new WeakMap();
const quarantineReceipts = new WeakMap();
const SYSTEM = 'S-1-5-18';
const ADMIN = 'S-1-5-32-544';
const INSTALLER = 'S-1-5-80-956008885-3418522649-1831038044-1853292631-2271478464';
const FULL = 0x1f01ff;
const MAX_BYTES = 1048576;
const SID = /^S-1-(?:[0-9]+-)+[0-9]+$/;
const freeze = (value) => {
  if (value && typeof value === 'object') {
    for (const item of Object.values(value)) freeze(item);
    Object.freeze(value);
  }
  return value;
};
function failure(code, reason) {
  return new AprError(code, 'Private storage protection could not be established.', {
    recovery:
      'Provision owned private storage explicitly and retry with a fresh genuine observation.',
    details: { reason },
  });
}
function boundedReason(error) {
  const code =
    typeof error?.code === 'string' && /^[A-Z0-9_]{1,50}$/.test(error.code)
      ? error.code
      : 'UNAVAILABLE';
  return 'observation-' + code;
}
const identity = (stat) => [stat.dev, stat.ino].map(String).join(':');
const mode = (stat) => Number(stat.mode & 0o7777n);
function canonicalInput(value) {
  if (
    typeof value !== 'string' ||
    !path.isAbsolute(value) ||
    /[\u0000-\u001f\u007f]/.test(value) ||
    value !== path.normalize(value) ||
    value === path.parse(value).root ||
    (process.platform === 'win32' && !/^[A-Za-z]:\\/.test(value))
  )
    throw failure('APR_BROKER_PATH_INVALID', 'noncanonical-private-path');
  return value;
}
async function sameCanonical(value) {
  canonicalInput(value);
  const stat = await lstat(value, { bigint: true });
  if (stat.isSymbolicLink() || (await realpath(value)) !== value)
    throw failure('APR_BROKER_PATH_INVALID', 'path-alias');
  return stat;
}
function ancestors(value) {
  const result = [];
  for (let parent = path.dirname(value); ; parent = path.dirname(parent)) {
    result.push(parent);
    if (parent === path.parse(parent).root) break;
  }
  return result.reverse();
}

/** Read-only closed policy result; never an operational receipt or grant. */
export function assessWindowsProtection(value = {}) {
  const reasons = [],
    trusted = [];
  if (!SID.test(value.principalSid || '') || !SID.test(value.ownerSid || ''))
    reasons.push('principal-unproved');
  if (value.inheritanceProtected !== true) reasons.push('inheritance-unprotected');
  if (value.canonical !== true) reasons.push('acl-order-unproved');
  if (value.reparsePoint !== false) reasons.push('reparse-unproved');
  if (
    value.ownerSid !== value.principalSid &&
    !(value.ownerSid === ADMIN && value.administratorMember === true)
  )
    reasons.push('owner-unproved');
  let rights = 0;
  if (!Array.isArray(value.aces) || !value.aces.length || value.aces.length > 128)
    reasons.push('acl-unavailable');
  else
    for (const ace of value.aces) {
      if (
        !ace ||
        ace.type !== 'allow' ||
        !SID.test(ace.sid || '') ||
        !Number.isSafeInteger(ace.rights) ||
        ace.rights < 0 ||
        ace.rights > 0xffffffff ||
        typeof ace.inherited !== 'boolean' ||
        ace.inherited ||
        ace.inheritOnly !== false
      ) {
        reasons.push('acl-rule-unproved');
        continue;
      }
      if (ace.sid === value.principalSid) rights |= ace.rights;
      else if (ace.sid === SYSTEM) trusted.push(SYSTEM);
      else if (ace.sid === ADMIN && value.administratorMember === true) {
        trusted.push(ADMIN);
        if (value.administratorEffective === true) rights |= ace.rights;
      } else reasons.push('foreign-effective-grant');
    }
  if ((rights & FULL) !== FULL) reasons.push('effective-rights-unproved');
  return freeze({
    verified: reasons.length === 0,
    reasons: [...new Set(reasons)],
    trustedAllowances: [...new Set(trusted)],
  });
}

const windowsScript = String.raw`
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
$env:PSModulePath='C:\Windows\System32\WindowsPowerShell\v1.0\Modules'
try {
$stage='input'
[Console]::InputEncoding=[System.Text.UTF8Encoding]::new($false)
[Console]::OutputEncoding=[System.Text.UTF8Encoding]::new($false)
$OutputEncoding=[Console]::OutputEncoding
$inputRecord = [Console]::In.ReadToEnd() | ConvertFrom-Json
$identity = [System.Security.Principal.WindowsIdentity]::GetCurrent()
$user = $identity.User.Value
$adminSid = [System.Security.Principal.SecurityIdentifier]::new('S-1-5-32-544')
$member = @($identity.Groups | ForEach-Object { $_.Value }) -contains $adminSid.Value
$effective = [System.Security.Principal.WindowsPrincipal]::new($identity).IsInRole($adminSid)
$paths = @($inputRecord.paths)
foreach($candidate in $paths) {
  $drive=[System.IO.DriveInfo]::new([System.IO.Path]::GetPathRoot($candidate))
  if($drive.DriveType -ne [System.IO.DriveType]::Fixed -or $drive.DriveFormat -notin @('NTFS','ReFS')) {
    throw 'Local ACL filesystem unproved'
  }
}
if ($inputRecord.mode -eq 'provision') {
  if ($paths.Count -ne 1) { throw 'Invalid provision inventory' }
  $target = Get-Item -LiteralPath $paths[0] -Force -ErrorAction Stop
  if (($target.Attributes -band [System.IO.FileAttributes]::ReparsePoint) -ne 0) { throw 'Reparse refused' }
  $prior = Get-Acl -LiteralPath $paths[0] -ErrorAction Stop
  $owner = $prior.GetOwner([System.Security.Principal.SecurityIdentifier]).Value
  if ($owner -ne $user -and -not ($owner -eq $adminSid.Value -and $member)) { throw 'Foreign owner refused' }
  $descriptor = if ($target.PSIsContainer) {
    [System.Security.AccessControl.DirectorySecurity]::new()
  } else { [System.Security.AccessControl.FileSecurity]::new() }
  $descriptor.SetOwner($identity.User)
  $descriptor.SetAccessRuleProtection($true, $false)
  $inherit = if ($target.PSIsContainer) {
    [System.Security.AccessControl.InheritanceFlags]'ContainerInherit,ObjectInherit'
  } else { [System.Security.AccessControl.InheritanceFlags]::None }
  foreach ($sid in @($user,'S-1-5-18')) {
    $rule = [System.Security.AccessControl.FileSystemAccessRule]::new(
      [System.Security.Principal.SecurityIdentifier]::new($sid),
      [System.Security.AccessControl.FileSystemRights]::FullControl, $inherit,
      [System.Security.AccessControl.PropagationFlags]::None,
      [System.Security.AccessControl.AccessControlType]::Allow)
    $descriptor.AddAccessRule($rule)
  }
  Set-Acl -LiteralPath $paths[0] -AclObject $descriptor -ErrorAction Stop
}
$records = foreach ($entry in $paths) {
  $item = Get-Item -LiteralPath $entry -Force -ErrorAction Stop
  $acl = Get-Acl -LiteralPath $entry -ErrorAction Stop
  $raw = [System.Security.AccessControl.RawSecurityDescriptor]::new($acl.GetSecurityDescriptorBinaryForm(),0)
  $aces = @()
  foreach ($ace in $raw.DiscretionaryAcl) {
    $known = $ace -is [System.Security.AccessControl.CommonAce] -and -not $ace.IsCallback
    $type = if ($known -and $ace.AceType -eq [System.Security.AccessControl.AceType]::AccessAllowed) {
      'allow'
    } elseif ($known -and $ace.AceType -eq [System.Security.AccessControl.AceType]::AccessDenied) {
      'deny'
    } else { 'unknown' }
    $stage='ace-mask'
    $mask = if ($known) { [System.BitConverter]::ToUInt32([System.BitConverter]::GetBytes([int]$ace.AccessMask),0) } else { 0 }
    $stage='ace-sid'
    $aceSid = if ($known) { [string]$ace.SecurityIdentifier.Value } else { '' }
    $stage='ace-flags'
    $aceFlags=[int]$ace.AceFlags
    $stage='ace-record'
    $aces += [ordered]@{
      sid = $aceSid
      type = $type; rights = $mask
      inherited = ($aceFlags -band 16) -ne 0
      inheritOnly = ($aceFlags -band 8) -ne 0
    }
  }
  [ordered]@{ path = $entry; principalSid = $user
    ownerSid = $acl.GetOwner([System.Security.Principal.SecurityIdentifier]).Value
    administratorMember = [bool]$member; administratorEffective = [bool]$effective
    inheritanceProtected = [bool]$acl.AreAccessRulesProtected
    canonical = [bool]$acl.AreAccessRulesCanonical
    reparsePoint = ($item.Attributes -band [System.IO.FileAttributes]::ReparsePoint) -ne 0
    aces = @($aces)
  }
}
[ordered]@{schema='ai-peer-review.windows-protection-observation/v1'; records=@($records)} | ConvertTo-Json -Depth 8 -Compress
} catch {
  [ordered]@{schema='ai-peer-review.windows-protection-error/v1'; exception=$_.Exception.GetType().Name; line=$_.InvocationInfo.ScriptLineNumber; stage=$stage} | ConvertTo-Json -Compress
  exit 1
}
`;
function operationBudget(
  { signal, deadline = Infinity, clock = performance } = {},
  admitted = () => null
) {
  const now = typeof clock === 'function' ? clock : () => clock.now();
  function check() {
    const value = now();
    const current = admitted() || { signal, deadline };
    if (current.signal?.aborted) throw failure('APR_BROKER_STALE', 'operation-aborted');
    if (
      !Number.isFinite(value) ||
      !(current.deadline === Infinity || Number.isFinite(current.deadline))
    )
      throw failure('APR_BROKER_STALE', 'operation-clock-unproved');
    if (value >= current.deadline) throw failure('APR_BROKER_STALE', 'operation-deadline');
    return current.deadline - value;
  }
  return {
    check,
    options(maximum) {
      const remaining = check();
      return {
        signal: (admitted() || { signal }).signal,
        timeout: Math.max(1, Math.min(maximum, Math.floor(remaining))),
      };
    },
  };
}

async function stockWindowsExecutable() {
  // A fixed stock probe; alternate system-root/probe classes stay unsupported.
  if ((process.env.SystemRoot || '').toLowerCase() !== 'c:\\windows')
    throw failure('APR_BROKER_START_FAILED', 'stock-system-root-unproved');
  const executable = 'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe';
  const stat = await lstat(executable);
  if (
    !stat.isFile() ||
    stat.isSymbolicLink() ||
    (await realpath(executable)).toLowerCase() !== executable.toLowerCase()
  )
    throw failure('APR_BROKER_START_FAILED', 'stock-probe-alias');
  return executable;
}
const windowsReplacementScript = String.raw`
$ErrorActionPreference='Stop'
$ProgressPreference='SilentlyContinue'
$env:PSModulePath='C:\Windows\System32\WindowsPowerShell\v1.0\Modules'
[Console]::InputEncoding=[System.Text.UTF8Encoding]::new($false)
[Console]::OutputEncoding=[System.Text.UTF8Encoding]::new($false)
try {
  $p=[Console]::In.ReadToEnd() | ConvertFrom-Json
  # PowerShell string binding converts ordinary $null to an empty backup path.
  [System.IO.File]::Replace([string]$p.source,[string]$p.target,[System.Management.Automation.Language.NullString]::Value,$false)
  [Console]::Out.Write('{"schema":"apr.windows-owner-replacement/v1","status":"replaced"}')
} catch {
  [Console]::Out.Write('{"schema":"apr.windows-owner-replacement/v1","status":"unconfirmed"}')
  exit 1
}
`;
async function windowsReplaceFile(source, target, budget) {
  budget.check();
  const executable = await stockWindowsExecutable();
  budget.check();
  const stdout = await new Promise((resolve, reject) => {
    const child = execFile(
      executable,
      [
        '-NoLogo',
        '-NoProfile',
        '-NonInteractive',
        '-EncodedCommand',
        Buffer.from(windowsReplacementScript, 'utf16le').toString('base64'),
      ],
      {
        encoding: 'utf8',
        maxBuffer: 65536,
        ...budget.options(15000),
        windowsHide: true,
        env: {
          ...process.env,
          PSModulePath: 'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\Modules',
        },
      },
      (error, output, stderr) => {
        if (error || stderr.trim())
          reject(failure('APR_BROKER_STALE', 'stock-replacement-unconfirmed'));
        else resolve(output);
      }
    );
    child.stdin.on('error', () =>
      reject(failure('APR_BROKER_STALE', 'stock-replacement-unconfirmed'))
    );
    child.stdin.end(JSON.stringify({ source, target }));
  });
  budget.check();
  let result;
  try {
    result = JSON.parse(stdout.replace(/^\uFEFF/, '').trim());
  } catch {
    throw failure('APR_BROKER_STALE', 'stock-replacement-unconfirmed');
  }
  if (result.schema !== 'apr.windows-owner-replacement/v1' || result.status !== 'replaced')
    throw failure('APR_BROKER_STALE', 'stock-replacement-unconfirmed');
}
async function windowsProbe(targets, provision = false, budget = operationBudget()) {
  budget.check();
  const executable = await stockWindowsExecutable();
  const payload = JSON.stringify({ mode: provision ? 'provision' : 'observe', paths: targets });
  const encoded = Buffer.from(windowsScript, 'utf16le').toString('base64');
  const result = await new Promise((resolve, reject) => {
    const child = execFile(
      executable,
      ['-NoLogo', '-NoProfile', '-NonInteractive', '-EncodedCommand', encoded],
      {
        encoding: 'utf8',
        maxBuffer: 1048576,
        ...budget.options(15000),
        windowsHide: true,
        env: {
          ...process.env,
          PSModulePath: 'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\Modules',
        },
      },
      (error, stdout, stderr) => {
        if (error || stderr.trim()) {
          let reason = 'stock-acl-probe-unavailable';
          try {
            const diagnostic = JSON.parse(stdout.replace(/^\uFEFF/, '').trim());
            if (
              diagnostic.schema === 'ai-peer-review.windows-protection-error/v1' &&
              /^[A-Za-z]{1,80}$/.test(diagnostic.exception) &&
              Number.isSafeInteger(diagnostic.line)
            )
              reason +=
                '-' +
                diagnostic.exception +
                '-line-' +
                diagnostic.line +
                (/^[a-z-]{1,40}$/.test(diagnostic.stage || '') ? '-stage-' + diagnostic.stage : '');
            else if (diagnostic.schema === 'ai-peer-review.windows-protection-observation/v1')
              reason += error ? '-error-after-result' : '-unexpected-stderr';
          } catch {
            /* Raw probe output can contain paths and is never exposed. */
          }
          reject(failure('APR_BROKER_START_FAILED', reason));
        } else resolve(stdout);
      }
    );
    child.stdin.on('error', reject);
    child.stdin.end(payload);
  });
  budget.check();
  const data = JSON.parse(result.replace(/^\uFEFF/, '').trim());
  if (
    data.schema !== 'ai-peer-review.windows-protection-observation/v1' ||
    !Array.isArray(data.records) ||
    data.records.length !== targets.length ||
    data.records.some((r, i) => r.path !== targets[i])
  )
    throw failure('APR_BROKER_START_FAILED', 'stock-acl-probe-malformed');
  return data.records;
}
async function macAcl(value, ancestor = false, budget = operationBudget()) {
  budget.check();
  const { stdout, stderr } = await execute('/bin/ls', ['-ldne', value], {
    encoding: 'utf8',
    maxBuffer: 65536,
    ...budget.options(5000),
    env: { ...process.env, LC_ALL: 'C' },
  });
  budget.check();
  if (stderr.trim()) throw failure('APR_BROKER_START_FAILED', 'acl-query-failed');
  const rows = stdout.trimEnd().split('\n');
  if (!/^[d-][rwxstST-]{9}[@+]?\s/.test(rows.shift() || ''))
    throw failure('APR_BROKER_START_FAILED', 'acl-output-unproved');
  const rules = [];
  const allRights = new Set([
    'read',
    'write',
    'append',
    'execute',
    'delete',
    'delete_child',
    'readattr',
    'writeattr',
    'readextattr',
    'writeextattr',
    'readsecurity',
    'writesecurity',
    'chown',
    'list',
    'search',
    'add_file',
    'add_subdirectory',
    'file_inherit',
    'directory_inherit',
    'limit_inherit',
    'only_inherit',
    'inherited',
  ]);
  for (const row of rows) {
    const match = row.match(/^\s*\d+:\s+(\S+)\s+(allow|deny)\s+([a-z_,]+)$/);
    if (!match || match[3].split(',').some((x) => !allRights.has(x)))
      throw failure('APR_BROKER_START_FAILED', 'acl-rule-unproved');
    const rights = match[3].split(',');
    // Deny rules cannot grant foreign access. Positive grants require an admitted subject.
    const grant = match[2] === 'allow' && !rights.includes('only_inherit');
    const dangerous = ancestor
      ? rights.some((x) =>
          [
            'write',
            'append',
            'delete',
            'delete_child',
            'writeattr',
            'writeextattr',
            'writesecurity',
            'chown',
            'add_file',
            'add_subdirectory',
          ].includes(x)
        )
      : rights.some(
          (x) => !['file_inherit', 'directory_inherit', 'limit_inherit', 'inherited'].includes(x)
        );
    if (grant && dangerous) throw failure('APR_BROKER_START_FAILED', 'acl-positive-grant-unproved');
    rules.push({ subject: match[1], kind: match[2], rights });
  }
  return rules;
}

/** Closed readonly ancestry policy; caller data cannot mint an operational receipt. */
export function assessWindowsAncestry(record = {}, { volumeRoot = false } = {}) {
  const reasons = [],
    allowed = [record.principalSid, SYSTEM, ADMIN];
  if (volumeRoot === true) allowed.push(INSTALLER);
  if (!SID.test(record.principalSid || '') || !SID.test(record.ownerSid || ''))
    reasons.push('ancestor-principal-unproved');
  if (record.reparsePoint !== false || record.canonical !== true)
    reasons.push('ancestor-acl-unproved');
  if (!allowed.includes(record.ownerSid)) reasons.push('ancestor-owner-unproved');
  if (!Array.isArray(record.aces) || !record.aces.length || record.aces.length > 128)
    reasons.push('ancestor-acl-unavailable');
  else
    for (const ace of record.aces) {
      if (
        !ace ||
        !['allow', 'deny'].includes(ace.type) ||
        !SID.test(ace.sid || '') ||
        !Number.isSafeInteger(ace.rights) ||
        ace.rights < 0 ||
        ace.rights > 0xffffffff ||
        typeof ace.inherited !== 'boolean' ||
        typeof ace.inheritOnly !== 'boolean'
      ) {
        reasons.push('ancestor-rule-unproved');
        continue;
      }
      if (ace.type === 'allow' && !ace.inheritOnly && !allowed.includes(ace.sid)) {
        const mutationMask = volumeRoot ? 0x500d0040 : 0x500d0156;
        if (ace.rights & mutationMask) reasons.push('foreign-ancestor-writer');
      }
    }
  return freeze({
    verified: reasons.length === 0,
    reasons: [...new Set(reasons)],
    trustedAllowances: allowed
      .slice(1)
      .filter(
        (sid) =>
          record.ownerSid === sid ||
          record.aces?.some(
            (ace) => ace?.type === 'allow' && ace.sid === sid && ace.inheritOnly === false
          )
      ),
  });
}
function windowsAncestor(record, volumeRoot) {
  const policy = assessWindowsAncestry(record, { volumeRoot });
  if (!policy.verified) {
    const reason = policy.reasons[0];
    throw failure(
      'APR_BROKER_START_FAILED',
      reason === 'ancestor-owner-unproved'
        ? reason +
            '-' +
            (SID.test(record.ownerSid || '') ? record.ownerSid : 'invalid') +
            (volumeRoot ? '-volume-root' : '-directory')
        : reason
    );
  }
  return { ...record, trustedAllowances: policy.trustedAllowances };
}
async function inspectAncestors(
  value,
  allowMissing = false,
  budget = operationBudget(),
  deferWindowsAcl = false
) {
  budget.check();
  canonicalInput(value);
  const uid = process.platform === 'win32' ? null : process.geteuid?.();
  if (process.platform !== 'win32' && (!Number.isInteger(uid) || uid !== process.getuid?.()))
    throw failure('APR_BROKER_START_FAILED', 'effective-principal-unproved');
  const chain = ancestors(value),
    stats = [];
  for (const parent of chain) {
    budget.check();
    let stat;
    try {
      stat = await lstat(parent, { bigint: true });
    } catch (error) {
      if (allowMissing && error.code === 'ENOENT') break;
      throw error;
    }
    if (!stat.isDirectory() || stat.isSymbolicLink() || (await realpath(parent)) !== parent)
      throw failure('APR_BROKER_START_FAILED', 'ancestor-alias');
    if (process.platform !== 'win32') {
      if (stat.uid !== BigInt(uid) && stat.uid !== 0n)
        throw failure('APR_BROKER_START_FAILED', 'ancestor-owner-unproved');
      if (mode(stat) & 0o022) {
        const child = chain[chain.indexOf(parent) + 1] || value;
        let childStat;
        try {
          childStat = await lstat(child, { bigint: true });
        } catch (error) {
          if (allowMissing && error.code === 'ENOENT') childStat = { uid: BigInt(uid) };
          else throw error;
        }
        if (!(mode(stat) & 0o1000) || ![0n, BigInt(uid)].includes(childStat.uid))
          throw failure('APR_BROKER_START_FAILED', 'foreign-ancestor-writer');
      }
    }
    stats.push({ path: parent, identity: identity(stat), mode: mode(stat), uid: String(stat.uid) });
  }

  if (process.platform === 'win32' && !deferWindowsAcl) {
    const records = await windowsProbe(
      stats.map((x) => x.path),
      false,
      budget
    );
    records.forEach((x, i) => {
      stats[i].acl = windowsAncestor(x, stats[i].path === path.parse(stats[i].path).root);
    });
  } else if (process.platform === 'darwin') {
    for (const item of stats) item.acl = await macAcl(item.path, true, budget);
  }
  return { uid, stats, chain: stats.map((x) => x.path) };
}

async function inspect(value, type = 'directory', budget = operationBudget()) {
  budget.check();
  const { uid, stats, chain } = await inspectAncestors(value, false, budget, true);
  const stat = await sameCanonical(value);
  if (process.platform === 'linux') {
    const filesystem = await statfs(value, { bigint: true });
    const supported = [0xef53n, 0x58465342n, 0x9123683en, 0x01021994n, 0x794c7630n];
    if (!supported.includes(filesystem.type))
      throw failure('APR_BROKER_START_FAILED', 'filesystem-protection-unproved');
  }
  if (type === 'directory' ? !stat.isDirectory() : !stat.isFile())
    throw failure('APR_BROKER_START_FAILED', 'storage-type-unproved');
  if (type === 'file' && stat.nlink !== 1n)
    throw failure('APR_BROKER_START_FAILED', 'storage-hardlink');
  let principal,
    acl,
    allowances = [];
  if (process.platform === 'win32') {
    const records = await windowsProbe([...chain, value], false, budget);
    records.slice(0, -1).forEach((x, i) => {
      stats[i].acl = windowsAncestor(x, chain[i] === path.parse(chain[i]).root);
    });
    const r = records.at(-1);
    const result = assessWindowsProtection(r);
    if (!result.verified) throw failure('APR_BROKER_START_FAILED', result.reasons[0]);
    principal = r.principalSid;
    acl = r;
    allowances = result.trustedAllowances;
  } else {
    if (stat.uid !== BigInt(uid) || mode(stat) !== (type === 'directory' ? 0o700 : 0o600))
      throw failure('APR_BROKER_START_FAILED', 'owner-or-mode-unproved');
    principal = String(uid);
    if (process.platform === 'darwin') {
      acl = await macAcl(value, false, budget);
    } else if (process.platform === 'linux') acl = [];
    else throw failure('APR_BROKER_START_FAILED', 'os-protection-unsupported');
    await access(
      value,
      type === 'directory'
        ? constants.R_OK | constants.W_OK | constants.X_OK
        : constants.R_OK | constants.W_OK
    );
  }
  const handle = await open(value, constants.O_RDONLY | (constants.O_NOFOLLOW || 0));
  try {
    if (identity(await handle.stat({ bigint: true })) !== identity(stat))
      throw failure('APR_BROKER_START_FAILED', 'descriptor-substitution');
  } finally {
    await handle.close();
  }
  const observation = {
    root: value,
    kind: process.platform,
    type,
    ...(type === 'file'
      ? { fileVersion: [stat.size, stat.mtimeNs, stat.ctimeNs].map(String).join(':') }
      : {}),
    principal,
    identity: identity(stat),
    ancestry: stats,
    acl,
    trustedAllowances: allowances,
  };
  const fingerprint = createHash('sha256').update(JSON.stringify(observation)).digest('hex');
  return { observation, fingerprint };
}
function receipt(value, reasons, verified = false) {
  return freeze({
    schema: 'ai-peer-review.storage-protection/v1',
    root: value,
    verified,
    assurance: verified ? 'actual-stock-os' : 'unavailable',
    reasons,
  });
}
export async function observeStorageProtection({
  root,
  osAdapter = null,
  signal,
  deadline,
  clock,
} = {}) {
  const budget = operationBudget({ signal, deadline, clock });
  if (osAdapter !== null) return receipt(root, ['untrusted-os-observation']);
  try {
    const binding = await inspect(root, 'directory', budget);
    const r = freeze({
      ...receipt(root, [], true),
      ...binding.observation,
      protectionDigest: binding.fingerprint,
    });
    receipts.set(r, binding);
    return r;
  } catch (error) {
    return receipt(root, [error?.details?.reason || boundedReason(error)]);
  }
}
async function prepareParent(value, budget) {
  budget.check();
  const parent = path.dirname(canonicalInput(value));
  try {
    return await sameCanonical(parent);
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    await prepareParent(parent, budget);
    await inspectAncestors(parent, true, budget);
    budget.check();
    await mkdir(parent, { mode: 0o700 });
    if (process.platform === 'win32') await windowsProbe([parent], true, budget);
    else {
      await chmod(parent, 0o700);
      if (process.platform === 'darwin')
        await execute('/bin/chmod', ['-N', parent], budget.options(5000));
    }
    return sameCanonical(parent);
  }
}
export async function provisionProtectedRoot({
  root,
  osAdapter = null,
  signal,
  deadline,
  clock,
} = {}) {
  const budget = operationBudget({ signal, deadline, clock });
  budget.check();
  if (osAdapter !== null) throw failure('APR_BROKER_START_FAILED', 'untrusted-provision-adapter');
  canonicalInput(root);
  await inspectAncestors(root, true, budget);
  await prepareParent(root, budget);
  await inspectAncestors(root, false, budget);
  budget.check();
  try {
    await mkdir(root, { mode: 0o700 });
  } catch (error) {
    if (error.code !== 'EEXIST') throw error;
  }
  const stat = await sameCanonical(root);
  if (!stat.isDirectory()) throw failure('APR_BROKER_START_FAILED', 'storage-type-unproved');
  if (process.platform === 'win32') await windowsProbe([root], true, budget);
  else {
    if (stat.uid !== BigInt(process.geteuid()))
      throw failure('APR_BROKER_START_FAILED', 'foreign-owner');
    if (process.platform === 'darwin')
      await execute('/bin/chmod', ['-N', root], budget.options(5000));
    budget.check();
    await chmod(root, 0o700);
  }
  const r = await observeStorageProtection({ root, signal, deadline, clock });
  if (!r.verified) throw failure('APR_BROKER_START_FAILED', r.reasons[0]);
  return r;
}
function safeName(name) {
  if (
    typeof name !== 'string' ||
    !/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(name) ||
    name === '.' ||
    name === '..'
  )
    throw failure('APR_BROKER_PATH_INVALID', 'private-name-invalid');
  if (
    process.platform === 'win32' &&
    (/[. ]$/.test(name) || /^(?:CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(?:[.]|$)/i.test(name))
  )
    throw failure('APR_BROKER_PATH_INVALID', 'private-device-name');
  return name;
}
function safeBytes(value) {
  if (!Buffer.isBuffer(value) || value.length > MAX_BYTES)
    throw failure('APR_BROKER_PATH_INVALID', 'private-bytes-invalid');
  return Buffer.from(value);
}
export async function openProtectedRoot({ receipt: r, signal, deadline, clock } = {}) {
  const admitted = () => {
    const current = portableOwnerRootOperation(r?.root, { signal, deadline });
    if (current && clock !== undefined) throw failure('APR_BROKER_STALE', 'lease-budget-mismatch');
    return current;
  };
  const budget = operationBudget({ signal, deadline, clock }, admitted);
  budget.check();
  const binding = receipts.get(r);
  if (!binding || r.verified !== true)
    throw failure('APR_BROKER_START_FAILED', 'genuine-receipt-required');
  let current;
  try {
    current = await inspect(r.root, 'directory', budget);
  } catch {
    throw failure('APR_BROKER_STALE', 'root-protection-changed');
  }
  if (current.fingerprint !== binding.fingerprint)
    throw failure('APR_BROKER_STALE', 'root-protection-changed');
  const directory = await open(r.root, constants.O_RDONLY | (constants.O_NOFOLLOW || 0));
  if (identity(await directory.stat({ bigint: true })) !== r.identity) {
    await directory.close();
    throw failure('APR_BROKER_STALE', 'root-descriptor-changed');
  }
  let closed = false;
  async function verify() {
    budget.check();
    if (closed) throw failure('APR_BROKER_STALE', 'protected-root-closed');
    try {
      const fresh = await inspect(r.root, 'directory', budget);
      if (
        fresh.fingerprint !== binding.fingerprint ||
        identity(await directory.stat({ bigint: true })) !== r.identity
      )
        throw failure('APR_BROKER_STALE', 'root-protection-changed');
    } catch {
      throw failure('APR_BROKER_STALE', 'root-protection-changed');
    }
  }

  const heldFiles = new Map();
  let directoryClosed = false;
  const version = (stat) => [stat.size, stat.mtimeNs, stat.ctimeNs].map(String).join(':');
  const lockName = 'apr-mutation-lock';
  function resourceName(name) {
    if (safeName(name) === lockName)
      throw failure('APR_BROKER_PATH_INVALID', 'reserved-mutation-resource');
    return name;
  }
  function report(error, obligations = []) {
    const result = failure(
      error?.code?.startsWith('APR_') && error.code !== 'APR_BROKER_START_FAILED'
        ? error.code
        : 'APR_BROKER_STALE',
      error?.details?.reason || boundedReason(error)
    );
    result.details = freeze({
      ...result.details,
      mutationOccurred: obligations.length > 0 || error?.details?.mutationOccurred === true,
      retrySafe: false,
      obligations: [...(error?.details?.obligations || []), ...obligations],
    });
    return result;
  }
  function obligation(entry, outcome) {
    return {
      name: entry.name,
      identity: entry.identity,
      fileVersion: entry.fileVersion,
      rootIdentity: r.identity,
      outcome,
    };
  }
  async function closeFile(file) {
    await file.close();
    heldFiles.delete(file);
  }
  async function closeOwnedFile(entry) {
    try {
      await closeFile(entry.file);
    } catch (error) {
      throw report(error, [obligation(entry, 'descriptor-close-pending')]);
    }
  }
  async function matchFile(entry, file = null) {
    const fresh = await inspect(path.join(r.root, entry.name), 'file', budget);
    if (
      fresh.observation.identity !== entry.identity ||
      fresh.observation.fileVersion !== entry.fileVersion ||
      (file &&
        (identity(await file.stat({ bigint: true })) !== entry.identity ||
          version(await file.stat({ bigint: true })) !== entry.fileVersion))
    )
      throw failure('APR_BROKER_STALE', 'private-file-changed');
  }
  async function readObserved(name, writable = false) {
    const target = path.join(r.root, resourceName(name));
    await verify();
    let file;
    try {
      const before = await inspect(target, 'file', budget);
      file = await open(
        target,
        (writable ? constants.O_RDWR : constants.O_RDONLY) | (constants.O_NOFOLLOW || 0)
      );
      const stat = await file.stat({ bigint: true });
      const entry = {
        name,
        identity: before.observation.identity,
        fileVersion: before.observation.fileVersion,
        file,
      };
      heldFiles.set(file, entry);
      if (
        identity(stat) !== entry.identity ||
        version(stat) !== entry.fileVersion ||
        stat.size > BigInt(MAX_BYTES)
      )
        throw failure('APR_BROKER_STALE', 'private-file-changed');
      const bytes = await file.readFile();
      await verify();
      await matchFile(entry, file);
      return { ...entry, bytes };
    } catch (error) {
      if (file) {
        try {
          await closeFile(file);
        } catch {
          throw report(error, [obligation(heldFiles.get(file), 'descriptor-close-pending')]);
        }
      }
      if (error.code === 'ENOENT') throw error;
      throw report(failure('APR_BROKER_STALE', 'private-file-unproved'));
    }
  }
  async function flushMutation(file) {
    // Windows FlushFileBuffers requires a writable file handle. Stock Node
    // cannot flush this read-only directory handle. Exact namespace readback
    // proves the observed effect; it does not assert power-loss durability.
    budget.check();
    await file.sync();
    budget.check();
    if (process.platform !== 'win32') await directory.sync();
  }
  async function read(name) {
    const observed = await readObserved(name);
    try {
      return observed.bytes;
    } finally {
      try {
        await closeFile(observed.file);
      } catch (error) {
        throw report(error, [obligation(observed, 'descriptor-close-pending')]);
      }
    }
  }
  async function createFile(name, value, retain = false, effectCheck = verify) {
    const bytes = safeBytes(value),
      target = path.join(r.root, safeName(name));
    await effectCheck();
    budget.check();
    const file = await open(
      target,
      constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | (constants.O_NOFOLLOW || 0),
      0o600
    );
    const entry = { name, identity: null, fileVersion: null, file };
    heldFiles.set(file, entry);
    let caught;
    try {
      const created = await file.stat({ bigint: true });
      entry.identity = identity(created);
      entry.fileVersion = version(created);
      if (process.platform === 'win32') await windowsProbe([target], true, budget);
      const observation = await inspect(target, 'file', budget);
      if (entry.identity !== observation.observation.identity)
        throw failure('APR_BROKER_STALE', 'private-file-changed');
      budget.check();
      await effectCheck();
      await file.writeFile(bytes);
      budget.check();
      await effectCheck();
      await file.sync();
      const written = await file.stat({ bigint: true });
      entry.fileVersion = version(written);
      await verify();
      await matchFile(entry, file);
    } catch (error) {
      caught = error;
    }
    if (!retain || caught) {
      try {
        await closeFile(file);
      } catch (error) {
        throw report(caught || error, [
          obligation(entry, 'descriptor-close-pending'),
          obligation(entry, 'created-unconfirmed'),
        ]);
      }
    }
    if (caught) throw report(caught, [obligation(entry, 'created-unconfirmed')]);
    return entry;
  }
  // All cooperative mutations of this root acquire the same exclusive resource.
  // No abandoned lock is reclaimed here: ownership/recovery belongs to C3/C4.
  // An arbitrary same-user pathname writer cannot be made safe by lstat alone.
  async function mutate(action, resourceLease = null) {
    if (resourceLease) {
      const leaseCheck = async () => {
        await verify();
        await assertOwnerElectionLease(resourceLease, { root: r.root });
        budget.check();
      };
      await leaseCheck();
      try {
        const result = await action(leaseCheck);
        await leaseCheck();
        return result;
      } catch (error) {
        throw report(error);
      }
    }
    let lease;
    try {
      lease = await createFile(lockName, Buffer.from(randomUUID()), true);
    } catch (error) {
      if (error.code === 'EEXIST') throw failure('APR_BROKER_STALE', 'mutation-resource-busy');
      throw error;
    }
    let result,
      caught,
      released = false;
    try {
      const leaseCheck = async () => {
        await verify();
        await matchFile(lease, lease.file);
        budget.check();
      };
      await leaseCheck();
      result = await action(leaseCheck);
    } catch (error) {
      caught = report(error);
    }
    try {
      await verify();
      await matchFile(lease, lease.file);
      budget.check();
      await unlink(path.join(r.root, lockName));
      released = true;
    } catch (error) {
      caught = report(caught || error, [obligation(lease, 'mutation-lease-outstanding')]);
    }
    try {
      await closeFile(lease.file);
    } catch (error) {
      caught = report(caught || error, [obligation(lease, 'descriptor-close-pending')]);
    }
    if (caught) throw caught;
    if (!released) throw failure('APR_BROKER_STALE', 'mutation-release-unproved');
    return result;
  }
  async function writeExclusive(name, value, resourceLease = null) {
    ordinaryMutationName(name);
    if (resourceLease) await assertOwnerElectionLease(resourceLease, { root: r.root, name });
    return mutate(async (leaseCheck) => {
      const created = await createFile(name, value);
      try {
        await leaseCheck();
        await matchFile(created);
      } catch (error) {
        throw report(error, [obligation(created, 'created-unconfirmed')]);
      }
    }, resourceLease);
  }
  async function remove(name, expected, resourceLease = null) {
    const target = path.join(r.root, ordinaryMutationName(name)),
      old = safeBytes(expected);
    if (resourceLease) await assertOwnerElectionLease(resourceLease, { root: r.root, name });
    return mutate(async (leaseCheck) => {
      const observed = await readObserved(name);
      let caught;
      try {
        if (!observed.bytes.equals(old)) throw failure('APR_BROKER_STALE', 'private-bytes-changed');
        await closeFile(observed.file);
        await leaseCheck();
        await matchFile(observed);
        budget.check();
        await unlink(target);
        try {
          await verify();
        } catch (error) {
          throw report(error, [obligation(observed, 'removal-unconfirmed')]);
        }
      } catch (error) {
        caught = error;
      }
      try {
        await closeFile(observed.file);
      } catch (error) {
        caught = report(caught || error, [obligation(observed, 'descriptor-close-pending')]);
      }
      if (caught) throw caught;
    }, resourceLease);
  }
  async function replace(name, expected, value, resourceLease = null) {
    const target = path.join(r.root, ordinaryMutationName(name)),
      old = safeBytes(expected),
      bytes = safeBytes(value);
    if (resourceLease) await assertOwnerElectionLease(resourceLease, { root: r.root, name });
    return mutate(async (leaseCheck) => {
      const observed = await readObserved(name);
      let temporary,
        published = false,
        attempted = false,
        caught;
      try {
        if (!observed.bytes.equals(old)) throw failure('APR_BROKER_STALE', 'private-bytes-changed');
        temporary = await createFile('publish-' + randomUUID(), bytes, true);
        await closeFile(observed.file);
        await closeFile(temporary.file);
        await leaseCheck();
        await matchFile(observed);
        await matchFile(temporary);
        budget.check();
        attempted = true;
        await rename(path.join(r.root, temporary.name), target);
        published = true;
        temporary.name = name;
        const publishedRead = await readObserved(name);
        try {
          if (publishedRead.identity !== temporary.identity || !publishedRead.bytes.equals(bytes))
            throw failure('APR_BROKER_STALE', 'private-file-changed');
          temporary.fileVersion = publishedRead.fileVersion;
        } finally {
          await closeFile(publishedRead.file);
        }
      } catch (error) {
        if (temporary) {
          let unpublished = !attempted;
          if (attempted && !published) {
            try {
              await leaseCheck();
              await matchFile(temporary);
              await matchFile(observed);
              unpublished = true;
            } catch {
              /* No fresh budget or inferred outcome after an uncertain effect. */
            }
          }
          const outstanding = obligation(
            temporary,
            unpublished ? 'unpublished' : 'publication-unconfirmed'
          );
          if (!unpublished && !published) outstanding.alternateName = name;
          caught = report(error, [outstanding]);
        } else caught = error;
      }
      if (temporary) {
        try {
          await closeFile(temporary.file);
        } catch (error) {
          caught = report(caught || error, [obligation(temporary, 'descriptor-close-pending')]);
        }
      }
      try {
        await closeFile(observed.file);
      } catch (error) {
        caught = report(caught || error, [obligation(observed, 'descriptor-close-pending')]);
      }
      if (caught) throw caught;
    }, resourceLease);
  }

  async function readSnapshot(name) {
    const observed = await readObserved(name);
    try {
      return Object.freeze({
        name,
        identity: observed.identity,
        fileVersion: observed.fileVersion,
        rootIdentity: r.identity,
        bytes: Buffer.from(observed.bytes),
      });
    } finally {
      await closeOwnedFile(observed);
    }
  }
  const ownedPrefix = 'apr-election-';
  function ownedName(name) {
    resourceName(name);
    if (!/^apr-election-[a-f0-9]{64}-[a-f0-9-]{36}\.json$/u.test(name))
      throw failure('APR_BROKER_PATH_INVALID', 'owned-publication-name-invalid');
    return name;
  }
  function ordinaryMutationName(name) {
    resourceName(name);
    if (name.startsWith(ownedPrefix))
      throw failure('APR_BROKER_PATH_INVALID', 'owned-publication-requires-owner');
    return name;
  }
  async function listOwnedPublications(prefix) {
    if (typeof prefix !== 'string' || !/^apr-election-[a-f0-9]{64}-$/u.test(prefix))
      throw failure('APR_BROKER_PATH_INVALID', 'owned-publication-prefix-invalid');
    await verify();
    const names = [];
    let count = 0;
    const entries = await opendir(r.root);
    for await (const entry of entries) {
      budget.check();
      if (++count > 4096) throw failure('APR_BROKER_STALE', 'slot-count-unproved');
      if (entry.name.startsWith(prefix)) names.push(entry.name);
    }
    names.sort();
    for (const name of names) ownedName(name);
    await verify();
    return Object.freeze(names);
  }

  // The election and ordinary/private wrappers share this retained-generation engine.
  async function retainedPublication(
    name,
    value,
    retainAcrossRename = false,
    resourceLease = null
  ) {
    const effectCheck = async () => {
      if (resourceLease) await assertOwnerElectionLease(resourceLease, { root: r.root, name });
      await verify();
    };
    let entry = await createFile(name, value, true, effectCheck);
    const retained = new Set([entry]);
    let publishedBytes = safeBytes(value),
      retired = false,
      withdrawalConfirmed = false,
      fenced = false,
      busy = false,
      publicationClosed = false;
    function contextCheck(context) {
      const current = admitted() || { signal, deadline };
      if (
        context !== undefined &&
        (context?.signal !== current.signal || context?.deadline !== current.deadline)
      )
        throw failure('APR_BROKER_STALE', 'publication-budget-mismatch');
      budget.check();
    }
    const sameExpected = (expected) => {
      if (
        !expected ||
        expected.name !== name ||
        expected.rootIdentity !== r.identity ||
        expected.identity !== entry.identity ||
        expected.fileVersion !== entry.fileVersion ||
        !Buffer.isBuffer(expected.bytes) ||
        !expected.bytes.equals(publishedBytes)
      )
        throw failure('APR_BROKER_STALE', 'owned-publication-generation-changed');
    };
    async function current(context) {
      contextCheck(context);
      if (retired || publicationClosed)
        throw failure('APR_BROKER_STALE', 'owned-publication-retired');
      if (fenced) throw failure('APR_BROKER_STALE', 'owned-publication-fenced');
      await effectCheck();
      try {
        await matchFile(entry, retainAcrossRename ? entry.file : null);
      } catch (error) {
        throw failure('APR_BROKER_STALE', error.details?.reason || boundedReason(error));
      }
      const observed = await readSnapshot(name);
      if (
        observed.identity !== entry.identity ||
        observed.fileVersion !== entry.fileVersion ||
        !observed.bytes.equals(publishedBytes)
      )
        throw failure('APR_BROKER_STALE', 'owned-publication-generation-changed');
      return observed;
    }
    async function exclusive(operation, mutating = false) {
      if (busy) throw failure('APR_BROKER_STALE', 'owned-publication-busy');
      busy = true;
      try {
        return await (mutating && retainAcrossRename
          ? mutate(operation, resourceLease)
          : operation());
      } catch (error) {
        if (mutating && retainAcrossRename && error.details?.mutationOccurred) fenced = true;
        throw report(
          error,
          [...retained]
            .filter((item) => item.file.fd >= 0)
            .map((item) => obligation(item, 'descriptor-close-pending'))
        );
      } finally {
        busy = false;
      }
    }
    async function closeRetained() {
      let caught;
      for (const item of retained) {
        try {
          await closeOwnedFile(item);
          retained.delete(item);
        } catch (error) {
          caught = report(caught || error, error.details?.obligations || []);
        }
      }
      if (caught) throw caught;
    }
    const publication = Object.freeze({
      retainedGeneration: () =>
        Object.freeze({ ...obligation(entry, 'owned-publication-unconfirmed'), root: r.root }),
      snapshot: (context) => exclusive(() => current(context)),
      publish: (expected, value, context) =>
        exclusive(async () => {
          contextCheck(context);
          sameExpected(expected);
          await current(context);
          const bytes = safeBytes(value);
          const previous = entry;
          let temporary,
            published = false,
            attempted = false;
          try {
            temporary = await createFile('publish-' + randomUUID(), bytes, true, effectCheck);
            retained.add(temporary);
            if (!retainAcrossRename) {
              await closeOwnedFile(entry);
              await closeOwnedFile(temporary);
            }
            await effectCheck();
            await matchFile(entry, retainAcrossRename ? entry.file : null);
            await matchFile(temporary, retainAcrossRename ? temporary.file : null);
            const windowsRetained = retainAcrossRename && process.platform === 'win32';
            if (windowsRetained) {
              // ReplaceFileW requires exclusive access to the unpublished input.
              // The original owner descriptor remains held until new readback.
              await closeOwnedFile(temporary);
              retained.delete(temporary);
              await effectCheck();
              await matchFile(entry, entry.file);
              await matchFile(temporary);
            }
            budget.check();
            attempted = true;
            if (windowsRetained)
              await windowsReplaceFile(
                path.join(r.root, temporary.name),
                path.join(r.root, name),
                budget
              );
            else await rename(path.join(r.root, temporary.name), path.join(r.root, name));
            published = true;
            const oldTemporaryName = temporary.name;
            temporary.name = name;
            const readback = await readObserved(name, retainAcrossRename);
            retained.add(readback);
            if (
              readback.identity !== temporary.identity ||
              !readback.bytes.equals(bytes) ||
              (retainAcrossRename &&
                ((temporary.file.fd >= 0 &&
                  (identity(await temporary.file.stat({ bigint: true })) !== readback.identity ||
                    version(await temporary.file.stat({ bigint: true })) !==
                      readback.fileVersion)) ||
                  readback.fileVersion.split(':').slice(0, 2).join(':') !==
                    temporary.fileVersion.split(':').slice(0, 2).join(':')))
            ) {
              throw report(failure('APR_BROKER_STALE', 'owned-publication-changed'), [
                {
                  ...obligation(temporary, 'publication-unconfirmed'),
                  alternateName: oldTemporaryName,
                },
              ]);
            }
            entry = { ...readback, name };
            retained.delete(readback);
            retained.add(entry);
            publishedBytes = Buffer.from(bytes);
            await effectCheck();
            if (retainAcrossRename)
              await flushMutation(temporary.file.fd >= 0 ? temporary.file : entry.file);
            await closeOwnedFile(previous);
            retained.delete(previous);
            if (temporary.file.fd >= 0) await closeOwnedFile(temporary);
            retained.delete(temporary);
            return Object.freeze({
              name,
              identity: entry.identity,
              fileVersion: entry.fileVersion,
              rootIdentity: r.identity,
              bytes: Buffer.from(bytes),
            });
          } catch (error) {
            if (retainAcrossRename && (attempted || error.details?.mutationOccurred)) fenced = true;
            if (!temporary) throw error;
            let unpublished = !attempted;
            if (attempted && !published) {
              try {
                await effectCheck();
                await matchFile(previous, retainAcrossRename ? previous.file : null);
                await matchFile(temporary, retainAcrossRename ? temporary.file : null);
                unpublished = true;
              } catch {
                /* No retry or inferred outcome after uncertainty. */
              }
            }
            const pending = obligation(
              temporary,
              unpublished ? 'unpublished' : 'publication-unconfirmed'
            );
            if (!unpublished && !published) pending.alternateName = name;
            throw report(error, [
              pending,
              ...[...retained]
                .filter((item) => item.file.fd >= 0)
                .map((item) => obligation(item, 'descriptor-close-pending')),
            ]);
          }
        }, true),
      withdraw: (expected, context) =>
        exclusive(async () => {
          contextCheck(context);
          if (retired) {
            if (!withdrawalConfirmed)
              throw report(failure('APR_BROKER_STALE', 'owned-withdrawal-unproved'), [
                obligation(entry, 'owned-withdrawal-unproved'),
              ]);
            return Object.freeze({ status: 'withdrawn' });
          }
          await current(context);
          if (expected) sameExpected(expected);
          try {
            if (!retainAcrossRename) await closeOwnedFile(entry);
            await effectCheck();
            await matchFile(entry, retainAcrossRename ? entry.file : null);
            budget.check();
            await unlink(path.join(r.root, name));
            retired = true;
            await effectCheck();
            if (retainAcrossRename) await flushMutation(entry.file);
            await closeRetained();
            withdrawalConfirmed = true;
            return Object.freeze({ status: 'withdrawn' });
          } catch (error) {
            throw report(error, [obligation(entry, 'owned-withdrawal-unproved')]);
          }
        }, true),
      close: (context) =>
        exclusive(async () => {
          if (context !== undefined) contextCheck(context);
          publicationClosed = true;
          await closeRetained();
        }),
    });
    return publication;
  }
  async function createOwnedPublication(name, value) {
    ownedName(name);
    return retainedPublication(name, value);
  }
  function retainedOrdinaryName(name) {
    ordinaryMutationName(name);
    if (
      [
        'owner.json',
        'credential',
        'endpoint.json',
        'registry.json',
        'manual-suspension.json',
      ].includes(name) ||
      name.startsWith('apr-owner-quarantine-')
    )
      throw failure('APR_BROKER_PATH_INVALID', 'owner-publication-requires-lease');
    return name;
  }
  async function createRetainedPublication(name, value) {
    retainedOrdinaryName(name);
    let publication;
    try {
      return await mutate(async () => {
        publication = await retainedPublication(name, value, true);
        return publication;
      });
    } catch (error) {
      throw report(error, publication ? [publication.retainedGeneration()] : []);
    }
  }
  function exactSnapshot(expected, observed) {
    if (
      !expected ||
      expected.name !== observed.name ||
      expected.rootIdentity !== r.identity ||
      expected.identity !== observed.identity ||
      expected.fileVersion !== observed.fileVersion ||
      !Buffer.isBuffer(expected.bytes) ||
      !expected.bytes.equals(observed.bytes)
    )
      throw failure('APR_BROKER_STALE', 'owned-publication-generation-changed');
  }
  async function quarantine(name, expected, { destination } = {}, resourceLease = null) {
    if (resourceLease) {
      resourceName(name);
      resourceName(destination);
      await assertOwnerElectionLease(resourceLease, { root: r.root, name });
      await assertOwnerElectionLease(resourceLease, { root: r.root, name: destination });
    } else {
      retainedOrdinaryName(name);
      retainedOrdinaryName(destination);
    }
    if (name === destination) throw failure('APR_BROKER_PATH_INVALID', 'quarantine-name-invalid');
    let retainedSource = null,
      renameAttempted = false;
    try {
      return await mutate(async (leaseCheck) => {
        const observed = await readObserved(name, true);
        retainedSource = observed;
        heldFiles.set(observed.file, observed);
        let moved,
          attempted = false,
          exact = false;
        try {
          exactSnapshot(expected, observed);
          const ensureFresh = async () => {
            try {
              await lstat(path.join(r.root, destination));
            } catch (error) {
              if (error.code === 'ENOENT') return;
              throw error;
            }
            throw failure('APR_BROKER_STALE', 'quarantine-destination-occupied');
          };
          await ensureFresh();
          await leaseCheck();
          await matchFile(observed, observed.file);
          await ensureFresh();
          budget.check();
          attempted = true;
          renameAttempted = true;
          await rename(path.join(r.root, name), path.join(r.root, destination));
          // Rename changes ctime on real substrates. Bind the post-effect descriptor
          // to the moved path, allowing only that owned version transition.
          moved = await readObserved(destination, true);
          heldFiles.set(moved.file, moved);
          try {
            const stat = await observed.file.stat({ bigint: true });
            if (
              moved.identity !== observed.identity ||
              identity(stat) !== observed.identity ||
              version(stat) !== moved.fileVersion ||
              moved.fileVersion.split(':').slice(0, 2).join(':') !==
                observed.fileVersion.split(':').slice(0, 2).join(':') ||
              !moved.bytes.equals(observed.bytes)
            )
              throw failure('APR_BROKER_STALE', 'quarantine-generation-changed');
            await leaseCheck();
            await matchFile(moved, moved.file);
            await flushMutation(observed.file);
            exact = true;
            return Object.freeze({
              status: 'quarantined',
              originalName: name,
              name: destination,
              identity: moved.identity,
              fileVersion: moved.fileVersion,
              previousFileVersion: observed.fileVersion,
              rootIdentity: r.identity,
              bytes: Buffer.from(moved.bytes),
              obligations: Object.freeze([]),
            });
          } finally {
            if (exact) await closeOwnedFile(moved);
          }
        } catch (error) {
          if (attempted)
            throw report(error, [
              { ...obligation(observed, 'quarantine-unconfirmed'), alternateName: destination },
              obligation(observed, 'descriptor-close-pending'),
              ...(moved
                ? [
                    {
                      ...obligation(moved, 'displaced-generation-retained'),
                      alternateName: name,
                    },
                    obligation(moved, 'descriptor-close-pending'),
                  ]
                : []),
            ]);
          throw error;
        } finally {
          // On uncertain rename, retain the original descriptor for exact recovery.
          if (!attempted || exact) {
            try {
              await closeOwnedFile(observed);
            } catch (error) {
              throw report(error, [
                { ...obligation(observed, 'descriptor-close-pending'), alternateName: destination },
              ]);
            }
          }
        }
      }, resourceLease);
    } catch (error) {
      if (!renameAttempted) throw error;
      throw report(error, [
        { ...obligation(retainedSource, 'quarantine-unconfirmed'), alternateName: destination },
      ]);
    }
  }
  async function removeRetiredPublication(name, expected, lease) {
    ownedName(name);
    await assertOwnerElectionLease(lease, { root: r.root, name });
    const current = await readSnapshot(name);
    if (
      !expected ||
      current.identity !== expected.identity ||
      current.fileVersion !== expected.fileVersion ||
      current.rootIdentity !== expected.rootIdentity ||
      !current.bytes.equals(expected.bytes)
    )
      throw failure('APR_BROKER_STALE', 'retired-publication-generation-changed');
    await verify();
    await assertOwnerElectionLease(lease, { root: r.root, name });
    const observed = await readObserved(name);
    try {
      if (
        observed.identity !== expected.identity ||
        observed.fileVersion !== expected.fileVersion ||
        !observed.bytes.equals(expected.bytes)
      )
        throw failure('APR_BROKER_STALE', 'retired-publication-generation-changed');
      await closeFile(observed.file);
      await verify();
      await matchFile(observed);
      budget.check();
      await unlink(path.join(r.root, name));
      await verify();
    } catch (error) {
      throw report(error, [obligation(observed, 'retired-withdrawal-unproved')]);
    } finally {
      await closeFile(observed.file);
    }
  }
  async function withElectionLease(lease) {
    const original = await ownerElectionBudget(lease, { root: r.root });
    if (
      (!admitted() && signal !== undefined && signal !== original.signal) ||
      (!admitted() && deadline !== undefined && deadline !== original.deadline) ||
      clock !== undefined
    )
      throw failure('APR_BROKER_STALE', 'lease-budget-mismatch');
    const scoped = await openProtectedRoot({ receipt: r, ...original });
    return Object.freeze({
      read: scoped.read,
      readSnapshot: scoped.readSnapshot,
      verify: scoped.verify,
      close: scoped.close,
      writeExclusive: (name, value) => scoped.writeExclusive(name, value, lease),
      remove: (name, expected) => scoped.remove(name, expected, lease),
      replace: (name, expected, value) => scoped.replace(name, expected, value, lease),
    });
  }
  async function retainCredential() {
    const observed = await readObserved('credential');
    if (observed.bytes.length !== 32) {
      await closeOwnedFile(observed);
      throw failure('APR_BROKER_STALE', 'credential-publication-invalid');
    }
    let retired = false,
      fenced = false,
      busy = false;
    const generation = (outcome = retired ? 'closed' : fenced ? 'read-fenced' : 'held-read') => ({
      name: 'credential',
      root: r.root,
      rootIdentity: r.identity,
      identity: observed.identity,
      fileVersion: observed.fileVersion,
      outcome,
    });
    const checkContext = (context, expiry = true) => {
      if (
        !(context?.signal instanceof AbortSignal) ||
        context.signal !== signal ||
        context.deadline !== deadline
      )
        throw failure('APR_BROKER_STALE', 'credential-observation-budget-mismatch');
      if (expiry) budget.check();
    };
    const snapshot = async (context) => {
      checkContext(context);
      if (retired || fenced || busy)
        throw report(failure('APR_BROKER_STALE', 'credential-observation-unavailable'), [
          generation(),
        ]);
      busy = true;
      try {
        await verify();
        await matchFile(observed, observed.file);
        const bytes = Buffer.alloc(32);
        const read = await observed.file.read(bytes, 0, 32, 0);
        budget.check();
        if (read.bytesRead !== 32 || !bytes.equals(observed.bytes))
          throw failure('APR_BROKER_STALE', 'credential-observation-changed');
        await verify();
        await matchFile(observed, observed.file);
        budget.check();
        return Object.freeze({
          name: 'credential',
          root: r.root,
          rootIdentity: r.identity,
          identity: observed.identity,
          fileVersion: observed.fileVersion,
          bytes: Buffer.from(bytes),
        });
      } catch (error) {
        fenced = true;
        throw report(error, [generation()]);
      } finally {
        busy = false;
      }
    };
    const handle = Object.freeze({
      snapshot,
      verify: async (context) => {
        await snapshot(context);
        return true;
      },
      retainedGeneration: () => Object.freeze(generation()),
      async close(context) {
        checkContext(context, false);
        if (busy)
          throw report(failure('APR_BROKER_STALE', 'credential-observation-busy'), [generation()]);
        if (retired) return;
        busy = true;
        try {
          await closeOwnedFile(observed);
          retired = true;
        } catch (error) {
          fenced = true;
          throw report(error, [generation('descriptor-close-pending')]);
        } finally {
          busy = false;
        }
      },
    });
    credentialObservations.set(handle, {
      valid: () => !retired && !fenced && observed.file.fd >= 0,
    });
    return handle;
  }

  const guard = Object.freeze({
    read,
    readSnapshot,
    listOwnedPublications,
    createOwnedPublication,
    createRetainedPublication,
    quarantine,
    removeRetiredPublication,
    withElectionLease,
    writeExclusive,
    remove,
    replace,
    verify,
    async close() {
      admitted();
      closed = true;
      let caught;
      for (const [file, entry] of heldFiles) {
        try {
          await closeFile(file);
        } catch (error) {
          caught = report(caught || error, [obligation(entry, 'descriptor-close-pending')]);
        }
      }
      if (!directoryClosed) {
        try {
          await directory.close();
          directoryClosed = true;
        } catch (error) {
          caught = report(caught || error);
        }
      }
      if (caught) throw caught;
    },
  });
  guards.set(guard, {
    root: r.root,
    signal,
    deadline,
    clockInjected: clock !== undefined,
    outcomes: new Set(),
    retainCredential,
    create: (name, bytes, lease) => retainedPublication(name, bytes, true, lease),
    quarantine,
  });
  return guard;
}

const ownerNames = new Set([
  'owner.json',
  'credential',
  'endpoint.json',
  'registry.json',
  'manual-suspension.json',
]);
export function isHeldPrivatePublicationFor(value, { lease, name } = {}) {
  const record = heldPublications.get(value);
  return !!record && record.lease === lease && record.name === name;
}
export function isHeldPrivatePublication(value) {
  return heldPublications.has(value);
}
async function ownerGuard(guard, lease, name, context) {
  const record = guards.get(guard);
  if (!record) throw failure('APR_BROKER_STALE', 'genuine-protected-guard-required');
  if (record.clockInjected) throw failure('APR_BROKER_STALE', 'lease-budget-mismatch');
  await assertOwnerElectionLease(lease, { root: record.root, name });
  if (!ownerNames.has(name))
    throw failure('APR_BROKER_PATH_INVALID', 'owner-publication-name-invalid');
  const original = await ownerElectionBudget(lease, { root: record.root });
  if (
    !(context.signal instanceof AbortSignal) ||
    !Number.isFinite(context.deadline) ||
    context.signal !== original.signal ||
    context.deadline !== original.deadline ||
    (!portableOwnerRootOperation(record.root, record) && context.signal !== record.signal) ||
    (!portableOwnerRootOperation(record.root, record) && context.deadline !== record.deadline)
  )
    throw failure('APR_BROKER_STALE', 'lease-budget-mismatch');
  return record;
}
function retainedOutcomeError(error, obligations, mutationOccurred = false) {
  const result = failure(
    error?.code?.startsWith('APR_') ? error.code : 'APR_BROKER_STALE',
    error?.details?.reason || boundedReason(error)
  );
  result.details = freeze({
    ...result.details,
    mutationOccurred: mutationOccurred || error?.details?.mutationOccurred === true,
    retrySafe: false,
    obligations: [...(error?.details?.obligations || []), ...obligations],
  });
  return result;
}
export async function createHeldPrivatePublication({
  guard,
  name,
  bytes,
  lease,
  signal,
  deadline,
} = {}) {
  const context = { signal, deadline };
  const record = await ownerGuard(guard, lease, name, context);
  let engine;
  try {
    await lease.run(async () => {
      engine = await record.create(name, bytes, lease);
    });
  } catch (error) {
    if (engine) record.outcomes.add(engine);
    throw retainedOutcomeError(error, engine ? [engine.retainedGeneration()] : [], !!engine);
  }
  const run = async (context, effect, mutating = false) => {
    let completed = false;
    try {
      await ownerGuard(guard, lease, name, context || {});
      return await lease.run(async () => {
        const result = await effect();
        completed = true;
        return result;
      });
    } catch (error) {
      throw retainedOutcomeError(error, [engine.retainedGeneration()], completed && mutating);
    }
  };
  const handle = Object.freeze({
    snapshot: (context) => run(context, () => engine.snapshot(context)),
    verify: (context) =>
      run(context, async () => {
        await engine.snapshot(context);
        return true;
      }),
    replace: (expected, bytes, context) =>
      run(context, () => engine.publish(expected, bytes, context), true),
    withdraw: (expected, context) => run(context, () => engine.withdraw(expected, context), true),
    close: (context) => run(context, () => engine.close(context), true),
    retainedGeneration: engine.retainedGeneration,
  });
  heldPublications.set(handle, { guard, lease, name });
  return handle;
}
export async function quarantinePrivateFile({
  guard,
  name,
  expected,
  lease,
  signal,
  deadline,
} = {}) {
  const context = { signal, deadline };
  const record = await ownerGuard(guard, lease, name, context);
  const destination = 'apr-owner-quarantine-' + lease.resourceKey + '-' + randomUUID() + '.json';
  let receipt;
  try {
    await lease.run(async () => {
      receipt = await record.quarantine(name, expected, { destination }, lease);
    });
  } catch (error) {
    if (receipt) record.outcomes.add(receipt);
    throw retainedOutcomeError(
      error,
      receipt
        ? [
            {
              name: receipt.name,
              alternateName: receipt.originalName,
              identity: receipt.identity,
              fileVersion: receipt.fileVersion,
              rootIdentity: receipt.rootIdentity,
              outcome: 'quarantine-unconfirmed',
            },
          ]
        : [],
      !!receipt
    );
  }
  quarantineReceipts.set(receipt, { guard, lease, name, context });
  return receipt;
}
export async function assertQuarantineReceipt({ guard, receipt, lease, signal, deadline } = {}) {
  const held = quarantineReceipts.get(receipt);
  if (!held || held.guard !== guard || held.lease !== lease)
    throw failure('APR_BROKER_STALE', 'genuine-quarantine-receipt-required');
  await ownerGuard(guard, lease, held.name, { signal, deadline });
  return lease.run(async () => {
    const actual = await guard.readSnapshot(receipt.name);
    if (
      actual.identity !== receipt.identity ||
      actual.fileVersion !== receipt.fileVersion ||
      actual.rootIdentity !== receipt.rootIdentity ||
      !actual.bytes.equals(receipt.bytes)
    )
      throw failure('APR_BROKER_STALE', 'quarantine-generation-changed');
    await guard.verify();
    return true;
  });
}
export { createHeldPrivatePublicationCore } from './owner-publication-core.mjs';

export function isProtectedCredentialObservation(value) {
  return credentialObservations.get(value)?.valid() === true;
}
export async function observeProtectedCredential(input = {}) {
  if (!input || Object.keys(input).sort().join(',') !== 'deadline,guard,signal')
    throw failure('APR_BROKER_STALE', 'credential-observation-options-invalid');
  const record = guards.get(input.guard);
  if (!record || record.clockInjected || path.basename(record.root) !== 'private')
    throw failure('APR_BROKER_STALE', 'genuine-private-guard-required');
  if (
    !(input.signal instanceof AbortSignal) ||
    !Number.isFinite(input.deadline) ||
    input.signal.aborted ||
    input.deadline <= performance.now() ||
    input.deadline - performance.now() > 30000 ||
    input.signal !== record.signal ||
    input.deadline !== record.deadline
  )
    throw failure('APR_BROKER_STALE', 'credential-observation-budget-mismatch');
  return record.retainCredential();
}
