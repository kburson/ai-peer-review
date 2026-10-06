param(
  [Parameter(Mandatory)][ValidateSet('start', 'block', 'stop')][string]$Mode,
  [Parameter(Mandatory)][ValidatePattern('^APR-offline-release-[a-f0-9-]+$')][string]$Group,
  [string]$Program
)
$ErrorActionPreference = 'Stop'
if ($Mode -eq 'stop') {
  Get-NetFirewallRule -Group $Group -ErrorAction SilentlyContinue | Remove-NetFirewallRule
  exit 0
}
function Block-Program([string]$Executable) {
  $Resolved = (Resolve-Path -LiteralPath $Executable).Path
  New-NetFirewallRule -DisplayName "$Group $Resolved" -Group $Group -Program $Resolved -Direction Outbound -Action Block -Profile Any | Out-Null
}
if ($Mode -eq 'block') {
  Block-Program $Program
} else {
  # Application rules preserve Runner.Worker/Runner.Listener connectivity.
  # npm/node-gyp use node; include the selected compiler and helper programs.
  $Commands = @('node', 'python', 'git', 'cl', 'link', 'msbuild', 'curl', 'pwsh')
  foreach ($Command in $Commands) {
    $Found = Get-Command $Command -CommandType Application -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($Found) { Block-Program $Found.Source }
  }
}
