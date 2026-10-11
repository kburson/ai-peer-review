// @story #190
// Read-only stock API comparison. Reports are unverified timing data, never authority.
import { execFileSync } from 'node:child_process';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
if (
  process.platform !== 'win32' ||
  process.argv.length !== 2 ||
  process.env.GITHUB_ACTIONS !== 'true' ||
  process.env.RUNNER_ENVIRONMENT !== 'github-hosted' ||
  process.env.GITHUB_REPOSITORY !== 'kburson/ai-peer-review' ||
  process.env.GITHUB_WORKFLOW !== 'Installed portable journeys' ||
  process.env.GITHUB_REF_NAME !== 'codex/190-installed-journeys' ||
  process.env.NODE_OPTIONS
)
  throw Error('benchmark-host-unavailable');
const base = await mkdtemp(path.join(tmpdir(), 'apr190-acl-api-'));
try {
  const directory = path.join(base, 'directory'),
    file = path.join(base, 'file.json');
  await mkdir(directory);
  await writeFile(file, '{}\n', { flag: 'wx' });
  const script = String.raw`
$ErrorActionPreference='Stop'
$ProgressPreference='SilentlyContinue'
$env:PSModulePath='C:\Windows\System32\WindowsPowerShell\v1.0\Modules'
[Console]::InputEncoding=[Text.UTF8Encoding]::new($false)
[Console]::OutputEncoding=[Text.UTF8Encoding]::new($false)
$p=[Console]::In.ReadToEnd() | ConvertFrom-Json
$sections=[Security.AccessControl.AccessControlSections]'Access,Owner,Group'
$same=$true
$provider=[Diagnostics.Stopwatch]::StartNew()
$observed=@()
for($i=0;$i -lt 20;$i++) {
  $observed+=@((Get-Acl -LiteralPath $p.directory).GetSecurityDescriptorBinaryForm(), (Get-Acl -LiteralPath $p.file).GetSecurityDescriptorBinaryForm())
}
$provider.Stop()
$framework=[Diagnostics.Stopwatch]::StartNew()
for($i=0;$i -lt 20;$i++) {
  $d=[IO.Directory]::GetAccessControl([string]$p.directory,$sections).GetSecurityDescriptorBinaryForm()
  $f=[IO.File]::GetAccessControl([string]$p.file,$sections).GetSecurityDescriptorBinaryForm()
  $same=$same -and [Convert]::ToBase64String($d) -ceq [Convert]::ToBase64String($observed[$i*2]) -and [Convert]::ToBase64String($f) -ceq [Convert]::ToBase64String($observed[$i*2+1])
}
$framework.Stop()
[Console]::Out.Write((@{ verified=$false; descriptorBytesEqual=[bool]$same; providerMs=$provider.ElapsedMilliseconds; frameworkMs=$framework.ElapsedMilliseconds; queriesPerMethod=40 } | ConvertTo-Json -Compress))
`;
  // Inputs are only owned disposable paths; no environment, identity or descriptor bytes are exported.
  const raw = execFileSync(
    'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe',
    [
      '-NoLogo',
      '-NoProfile',
      '-NonInteractive',
      '-EncodedCommand',
      Buffer.from(script, 'utf16le').toString('base64'),
    ],
    {
      input: JSON.stringify({ directory, file }),
      encoding: 'utf8',
      timeout: 15000,
      maxBuffer: 65536,
      env: {
        ...process.env,
        PSModulePath: 'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\Modules',
      },
    }
  );
  const value = JSON.parse(raw);
  if (
    value.verified !== false ||
    typeof value.descriptorBytesEqual !== 'boolean' ||
    !Number.isSafeInteger(value.providerMs) ||
    !Number.isSafeInteger(value.frameworkMs) ||
    value.queriesPerMethod !== 40
  )
    throw Error('benchmark-output-unavailable');
  const output = path.join(process.cwd(), '.scratch/190-acl-benchmark-public');
  await mkdir(output, { recursive: true });
  await writeFile(
    path.join(output, 'comparison.json'),
    JSON.stringify(
      {
        schema: 'ai-peer-review.acl-api-comparison/v1',
        operationalAuthority: 'unavailable',
        verified: false,
        descriptorBytesEqual: value.descriptorBytesEqual,
        providerMs: value.providerMs,
        frameworkMs: value.frameworkMs,
        queriesPerMethod: 40,
      },
      null,
      2
    ) + '\n',
    { flag: 'wx' }
  );
} finally {
  await rm(base, { recursive: true });
}
