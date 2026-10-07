// @story #166
// cspell:words notin DACL SID SIDFullControl Win32PowerShell fsync nlink ino lstat reparse ldne rwxst readattr writeattr readextattr writeextattr readsecurity writesecurity statfs hardlink
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
import { createHash, randomUUID } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { performance } from 'node:perf_hooks';
import path from 'node:path';
import { AprError } from '../errors.mjs';

const execute = promisify(execFile);
const receipts = new WeakMap();
const SYSTEM = 'S-1-5-18';
const ADMIN = 'S-1-5-32-544';
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
function operationBudget({ signal, deadline = Infinity, clock = performance } = {}) {
  const now = typeof clock === 'function' ? clock : () => clock.now();
  function check() {
    const value = now();
    if (signal?.aborted) throw failure('APR_BROKER_STALE', 'operation-aborted');
    if (!Number.isFinite(value) || !(deadline === Infinity || Number.isFinite(deadline)))
      throw failure('APR_BROKER_STALE', 'operation-clock-unproved');
    if (value >= deadline) throw failure('APR_BROKER_STALE', 'operation-deadline');
    return deadline - value;
  }
  return {
    check,
    options(maximum) {
      const remaining = check();
      return { signal, timeout: Math.max(1, Math.min(maximum, Math.floor(remaining))) };
    },
  };
}

async function windowsProbe(targets, provision = false, budget = operationBudget()) {
  budget.check();
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
function windowsAncestor(record, volumeRoot) {
  if (record.reparsePoint !== false || record.canonical !== true || !Array.isArray(record.aces))
    throw failure('APR_BROKER_START_FAILED', 'ancestor-acl-unproved');
  const allowed = [record.principalSid, SYSTEM, ADMIN];
  if (!allowed.includes(record.ownerSid))
    throw failure('APR_BROKER_START_FAILED', 'ancestor-owner-unproved');
  for (const ace of record.aces) {
    if (
      !['allow', 'deny'].includes(ace.type) ||
      !SID.test(ace.sid) ||
      !Number.isSafeInteger(ace.rights)
    )
      throw failure('APR_BROKER_START_FAILED', 'ancestor-rule-unproved');
    if (ace.type === 'allow' && !ace.inheritOnly && !allowed.includes(ace.sid)) {
      // Volume roots permit creation of unrelated children; existing protected ancestry stays immutable.
      const mutationMask = volumeRoot ? 0xd0040 : 0xd0156;
      if (ace.rights & mutationMask)
        throw failure('APR_BROKER_START_FAILED', 'foreign-ancestor-writer');
    }
  }
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
    records.forEach((x, i) => windowsAncestor(x, stats[i].path === path.parse(stats[i].path).root));
  } else if (process.platform === 'darwin') {
    for (const item of stats) await macAcl(item.path, true, budget);
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
    records
      .slice(0, -1)
      .forEach((x, i) => windowsAncestor(x, chain[i] === path.parse(chain[i]).root));
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
  const budget = operationBudget({ signal, deadline, clock });
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
      error?.code?.startsWith('APR_') ? error.code : 'APR_BROKER_STALE',
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
  async function readObserved(name) {
    const target = path.join(r.root, resourceName(name));
    await verify();
    let file;
    try {
      const before = await inspect(target, 'file', budget);
      file = await open(target, constants.O_RDONLY | (constants.O_NOFOLLOW || 0));
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
  async function createFile(name, value, retain = false) {
    const bytes = safeBytes(value),
      target = path.join(r.root, safeName(name));
    await verify();
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
      await file.writeFile(bytes);
      budget.check();
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
  async function mutate(action) {
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
      caught = error;
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
  async function writeExclusive(name, value) {
    resourceName(name);
    return mutate(async (leaseCheck) => {
      const created = await createFile(name, value);
      try {
        await leaseCheck();
        await matchFile(created);
      } catch (error) {
        throw report(error, [obligation(created, 'created-unconfirmed')]);
      }
    });
  }
  async function remove(name, expected) {
    const target = path.join(r.root, resourceName(name)),
      old = safeBytes(expected);
    return mutate(async (leaseCheck) => {
      const observed = await readObserved(name);
      let caught;
      try {
        if (!observed.bytes.equals(old)) throw failure('APR_BROKER_STALE', 'private-bytes-changed');
        await leaseCheck();
        await matchFile(observed, observed.file);
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
    });
  }
  async function replace(name, expected, value) {
    const target = path.join(r.root, resourceName(name)),
      old = safeBytes(expected),
      bytes = safeBytes(value);
    return mutate(async (leaseCheck) => {
      const observed = await readObserved(name);
      let temporary,
        published = false,
        caught;
      try {
        if (!observed.bytes.equals(old)) throw failure('APR_BROKER_STALE', 'private-bytes-changed');
        temporary = await createFile('publish-' + randomUUID(), bytes, true);
        await leaseCheck();
        await matchFile(observed, observed.file);
        await matchFile(temporary, temporary.file);
        budget.check();
        await rename(path.join(r.root, temporary.name), target);
        published = true;
        temporary.fileVersion = version(await temporary.file.stat({ bigint: true }));
        await verify();
        await matchFile({ ...temporary, name }, temporary.file);
      } catch (error) {
        caught = temporary
          ? report(error, [
              obligation(
                published ? { ...temporary, name } : temporary,
                published ? 'publication-unconfirmed' : 'unpublished'
              ),
            ])
          : error;
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
    });
  }
  return Object.freeze({
    read,
    writeExclusive,
    remove,
    replace,
    verify,
    async close() {
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
}
