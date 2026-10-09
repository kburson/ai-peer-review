# @story #190
# Disposable authorized hosted worker: a real non-admin account and loaded OS profile.
# Password stays in memory; no reported SID, substituted home, or elevated token grants authority.
$ErrorActionPreference = 'Stop'
if ($env:GITHUB_ACTIONS -ne 'true' -or $env:RUNNER_ENVIRONMENT -ne 'github-hosted' -or $env:GITHUB_REPOSITORY -ne 'kburson/ai-peer-review' -or $env:GITHUB_WORKFLOW -ne 'Installed portable journeys' -or $env:GITHUB_REF_NAME -ne 'codex/190-installed-journeys') { throw 'journey-host-unavailable' }
$parentIdentity = [Security.Principal.WindowsIdentity]::GetCurrent()
if (-not ([Security.Principal.WindowsPrincipal]::new($parentIdentity)).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) { throw 'journey-account-provisioning-unavailable' }
$root = (Get-Location).ProviderPath
$private = Join-Path $root '.scratch/190-installed-private'
$public = Join-Path $root '.scratch/190-installed-public'
New-Item -ItemType Directory -Path $private, $public -Force | Out-Null
$node = (Get-Command node -CommandType Application).Source
$script = Join-Path $private 'limited.ps1'
$result = Join-Path $public 'limited-token.json'
$metadata = Join-Path $private 'environment.json'
$cache = Join-Path $private 'public-npm-cache'
$npm = Join-Path (Split-Path $node) 'node_modules/npm/bin/npm-cli.js'
$existingCache = & $node $npm config get cache
if ($LASTEXITCODE -ne 0) { throw 'journey-cache-unavailable' }
$cacheInput = Join-Path $existingCache '_cacache'
if (-not (Test-Path -LiteralPath $cacheInput -PathType Container)) { throw 'journey-cache-unavailable' }
New-Item -ItemType Directory -Path $cache | Out-Null
# Only public npm package content enters the new account, never .npmrc or credentials/logs.
Copy-Item -LiteralPath $cacheInput -Destination $cache -Recurse
$environment = @{}
foreach ($name in @('PATH','SystemRoot','GITHUB_ACTIONS','RUNNER_ENVIRONMENT','GITHUB_REPOSITORY','GITHUB_WORKFLOW','GITHUB_REF_NAME','GITHUB_RUN_ID','GITHUB_RUN_ATTEMPT','RUNNER_OS')) {
  $value = [Environment]::GetEnvironmentVariable($name)
  if ($null -ne $value) { $environment[$name] = $value }
}
$environment | ConvertTo-Json -Compress | Set-Content -LiteralPath $metadata -Encoding UTF8
function Literal([string]$value) { return "'" + $value.Replace("'", "''") + "'" }
$account = $null
$process = $null
$password = $null
$cleanupProved = $false
try {
  $random = New-Object byte[] 32
  $rng = [Security.Cryptography.RandomNumberGenerator]::Create()
  try { $rng.GetBytes($random) } finally { $rng.Dispose() }
  $password = ConvertTo-SecureString ([Convert]::ToBase64String($random) + 'aA1!') -AsPlainText -Force
  [Array]::Clear($random, 0, $random.Length)
  $name = 'apr190' + [guid]::NewGuid().ToString('N').Substring(0, 12)
  $account = New-LocalUser -Name $name -Password $password -Description 'Disposable story 190 installed runtime proof'
  $users = Get-LocalGroup -SID 'S-1-5-32-545'
  Add-LocalGroupMember -Group $users -Member $account
  $sid = $account.SID.Value
  $body = @'
$ErrorActionPreference = 'Stop'
$code = 1
$identity = [Security.Principal.WindowsIdentity]::GetCurrent()
$principal = [Security.Principal.WindowsPrincipal]::new($identity)
try {
  if ($identity.User.Value -ne __SID__ -or $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) { throw 'journey-limited-token-unavailable' }
  # Use the genuine profile registered by Windows for this actual logged-on SID.
  $profileKey = 'HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\ProfileList\' + $identity.User.Value
  $profile = [Environment]::ExpandEnvironmentVariables((Get-ItemProperty -LiteralPath $profileKey -Name ProfileImagePath).ProfileImagePath)
  if (-not (Test-Path -LiteralPath $profile -PathType Container)) { throw 'journey-account-profile-unavailable' }
  $values = Get-Content -LiteralPath __METADATA__ -Raw | ConvertFrom-Json
  foreach ($property in $values.PSObject.Properties) { [Environment]::SetEnvironmentVariable($property.Name, [string]$property.Value, 'Process') }
  foreach ($variable in Get-ChildItem Env:) {
    if ($variable.Name -match '^(GIT_|APR_FIXTURE_)' -or $variable.Name -in @('GH_TOKEN','GITHUB_TOKEN','NODE_OPTIONS','HOME','npm_config_userconfig')) { [Environment]::SetEnvironmentVariable($variable.Name, $null, 'Process') }
  }
  $env:USERPROFILE = $profile
  $env:LOCALAPPDATA = Join-Path $profile 'AppData/Local'
  $env:APPDATA = Join-Path $profile 'AppData/Roaming'
  $env:TEMP = Join-Path $env:LOCALAPPDATA 'Temp'
  $env:TMP = $env:TEMP
  $env:npm_config_cache = Join-Path $env:LOCALAPPDATA 'npm-cache'
  New-Item -ItemType Directory -Path $env:TEMP, $env:APPDATA, $env:npm_config_cache -Force | Out-Null
  Copy-Item -LiteralPath (Join-Path __CACHE__ '_cacache') -Destination $env:npm_config_cache -Recurse
  & 'C:\Program Files\Git\cmd\git.exe' config --global --add safe.directory __ROOT__
  if ($LASTEXITCODE -ne 0) { throw 'journey-source-checkout-unavailable' }
  Set-Location -LiteralPath __ROOT__
  & __NODE__ 'test/helpers/installed-portable-ci.mjs' *> __LOG__
  $code = $LASTEXITCODE
} catch { 'limited-journey-incomplete' | Set-Content -LiteralPath __ERROR__ -Encoding UTF8 }
@{ code=$code; sid=$identity.User.Value; elevated=$principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator) } | ConvertTo-Json -Compress | Set-Content -LiteralPath __RESULT__ -Encoding UTF8
exit $code
'@
  $body = $body.Replace('__SID__', (Literal $sid)).Replace('__METADATA__', (Literal $metadata)).Replace('__CACHE__', (Literal $cache)).Replace('__ROOT__', (Literal $root)).Replace('__NODE__', (Literal $node)).Replace('__LOG__', (Literal (Join-Path $public 'limited-command.log'))).Replace('__ERROR__', (Literal (Join-Path $public 'limited-error.log'))).Replace('__RESULT__', (Literal $result))
  Set-Content -LiteralPath $script -Value $body -Encoding UTF8
  & "$env:SystemRoot\System32\icacls.exe" $root /grant "*$($sid):(OI)(CI)RX" /T /Q | Out-Null
  if ($LASTEXITCODE -ne 0) { throw 'journey-source-read-permission-unavailable' }
  & "$env:SystemRoot\System32\icacls.exe" $public /grant "*$($sid):(OI)(CI)M" /T /Q | Out-Null
  if ($LASTEXITCODE -ne 0) { throw 'journey-report-permission-unavailable' }
  $credential = [Management.Automation.PSCredential]::new(".\$name", $password)
  $process = Start-Process -FilePath "$env:SystemRoot\System32\WindowsPowerShell\v1.0\powershell.exe" -ArgumentList ('-NoLogo -NoProfile -NonInteractive -File "' + $script + '"') -Credential $credential -LoadUserProfile -WorkingDirectory $root -PassThru
  if (-not $process.WaitForExit(600000)) { throw 'journey-limited-execution-incomplete' }
  $observed = Get-Content -LiteralPath $result -Raw | ConvertFrom-Json
  if ($observed.sid -ne $sid -or $observed.sid -eq $parentIdentity.User.Value -or $observed.elevated -ne $false) { throw 'journey-limited-token-unavailable' }
  $journey = Get-Content -LiteralPath (Join-Path $public 'journey.json') -Raw | ConvertFrom-Json
  $cleanupProved = $journey.cleanup -eq 'complete' -and @($journey.obligations).Count -eq 0
  if ($observed.code -ne 0) { throw 'journey-limited-install-incomplete' }
} finally {
  if ($null -ne $account) {
    if ($null -ne $process -and $process.HasExited -and $cleanupProved) {
      Remove-LocalUser -SID $account.SID
    } else {
      'Disposable account retained; exact broker/provider/publication cleanup remains unproved.' | Set-Content -LiteralPath (Join-Path $public 'limited-cleanup-obligation.txt')
    }
  }
  if ($null -ne $password) { $password.Dispose() }
}
