# @story #190
# Disposable hosted worker only. S4U supplies an actual limited OS token, never a reported SID grant.
$ErrorActionPreference = 'Stop'
if ($env:GITHUB_ACTIONS -ne 'true' -or $env:RUNNER_ENVIRONMENT -ne 'github-hosted' -or $env:GITHUB_REPOSITORY -ne 'kburson/ai-peer-review' -or $env:GITHUB_WORKFLOW -ne 'Installed portable journeys' -or $env:GITHUB_REF_NAME -ne 'codex/190-installed-journeys') { throw 'journey-host-unavailable' }
$root = (Get-Location).ProviderPath
$private = Join-Path $root '.scratch/190-installed-private'
$public = Join-Path $root '.scratch/190-installed-public'
New-Item -ItemType Directory -Path $private, $public -Force | Out-Null
$node = (Get-Command node -CommandType Application).Source
$script = Join-Path $private 'limited.ps1'
$result = Join-Path $private 'limited-exit.json'
$metadata = Join-Path $private 'environment.json'
$names = @('PATH','HOME','USERPROFILE','APPDATA','LOCALAPPDATA','SystemRoot','TEMP','TMP','npm_config_cache','GITHUB_ACTIONS','RUNNER_ENVIRONMENT','GITHUB_REPOSITORY','GITHUB_WORKFLOW','GITHUB_REF_NAME','GITHUB_RUN_ID','GITHUB_RUN_ATTEMPT','RUNNER_OS')
$environment = @{}
foreach ($name in $names) { $value = [Environment]::GetEnvironmentVariable($name); if ($null -ne $value) { $environment[$name] = $value } }
$environment | ConvertTo-Json -Compress | Set-Content -Path $metadata -Encoding UTF8
function Literal([string]$value) { return "'" + $value.Replace("'", "''") + "'" }
$body = @'
$ErrorActionPreference = 'Stop'
$metadata = __METADATA__
$values = Get-Content -LiteralPath $metadata -Raw | ConvertFrom-Json
foreach ($property in $values.PSObject.Properties) { [Environment]::SetEnvironmentVariable($property.Name, [string]$property.Value, 'Process') }
$env:NODE_OPTIONS = $null
$identity = [Security.Principal.WindowsIdentity]::GetCurrent()
$principal = [Security.Principal.WindowsPrincipal]::new($identity)
$code = 1
try {
  if ($principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) { throw 'journey-limited-token-unavailable' }
  Set-Location -LiteralPath __ROOT__
  & __NODE__ 'test/helpers/installed-portable-ci.mjs' *> __LOG__
  $code = $LASTEXITCODE
} catch { $_.Exception.Message | Set-Content -LiteralPath __ERROR__ -Encoding UTF8 }
@{ code=$code; sid=$identity.User.Value; elevated=$principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator) } | ConvertTo-Json -Compress | Set-Content -LiteralPath __RESULT__ -Encoding UTF8
exit $code
'@
$body = $body.Replace('__METADATA__', (Literal $metadata)).Replace('__ROOT__', (Literal $root)).Replace('__NODE__', (Literal $node)).Replace('__LOG__', (Literal (Join-Path $public 'limited-command.log'))).Replace('__ERROR__', (Literal (Join-Path $public 'limited-error.log'))).Replace('__RESULT__', (Literal $result))
Set-Content -LiteralPath $script -Value $body -Encoding UTF8
$id = [Security.Principal.WindowsIdentity]::GetCurrent()
$name = 'apr-installed-' + [guid]::NewGuid().ToString()
$action = New-ScheduledTaskAction -Execute "$env:SystemRoot\System32\WindowsPowerShell\v1.0\powershell.exe" -Argument ('-NoLogo -NoProfile -NonInteractive -File "' + $script + '"') -WorkingDirectory $root
$principal = New-ScheduledTaskPrincipal -UserId $id.User.Value -LogonType S4U -RunLevel Limited
$settings = New-ScheduledTaskSettingsSet -ExecutionTimeLimit (New-TimeSpan -Minutes 10) -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries
$registered = $false
try {
  Register-ScheduledTask -TaskName $name -Action $action -Principal $principal -Settings $settings | Out-Null
  $registered = $true
  Start-ScheduledTask -TaskName $name
  $deadline = [Diagnostics.Stopwatch]::StartNew()
  while (-not (Test-Path -LiteralPath $result)) {
    if ($deadline.Elapsed.TotalSeconds -ge 600) { throw 'journey-limited-execution-incomplete' }
    Start-Sleep -Milliseconds 250
  }
  $observed = Get-Content -LiteralPath $result -Raw | ConvertFrom-Json
  if ($observed.sid -ne $id.User.Value -or $observed.elevated -ne $false) { throw 'journey-limited-token-unavailable' }
  $observed | ConvertTo-Json -Compress | Set-Content -LiteralPath (Join-Path $public 'limited-token.json') -Encoding UTF8
  while ((Get-ScheduledTask -TaskName $name).State -eq 'Running') {
    if ($deadline.Elapsed.TotalSeconds -ge 600) { throw 'journey-limited-exit-incomplete' }
    Start-Sleep -Milliseconds 100
  }
  if ($observed.code -ne 0) { throw 'journey-limited-install-incomplete' }
} finally {
  if ($registered) {
    $task = Get-ScheduledTask -TaskName $name
    if ($task.State -eq 'Running') {
      'limited-task-running; exact broker/provider cleanup remains unproved' | Set-Content -LiteralPath (Join-Path $public 'limited-cleanup-obligation.txt')
      Stop-ScheduledTask -TaskName $name
    }
    Unregister-ScheduledTask -TaskName $name -Confirm:$false
  }
}
