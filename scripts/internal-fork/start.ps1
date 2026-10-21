[CmdletBinding()]
param(
  [switch]$Bootstrap
)

$ErrorActionPreference = 'Stop'
$repositoryRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$environmentFile = Join-Path $repositoryRoot '.env.internal'

if ($PSVersionTable.PSVersion.Major -lt 7) {
  Write-Warning 'PowerShell 7 is recommended.'
}

$nodeVersion = [version]((node --version).TrimStart('v'))
if ($nodeVersion.Major -lt 22) {
  throw "Node.js 22 or newer is required; found $nodeVersion."
}

if (Test-Path -LiteralPath $environmentFile) {
  foreach ($line in Get-Content -LiteralPath $environmentFile) {
    $trimmed = $line.Trim()
    if (!$trimmed -or $trimmed.StartsWith('#')) { continue }
    $parts = $trimmed.Split('=', 2)
    if ($parts.Count -eq 2) {
      [Environment]::SetEnvironmentVariable($parts[0].Trim(), $parts[1].Trim(), 'Process')
    }
  }
}

$defaults = @{
  NC_INTERNAL_EXTENSIONS_ENABLED = 'true'
  NC_INTERNAL_ADMIN_ENABLED = 'true'
  NC_INTERNAL_FINE_GRAINED_API_TOKENS_ENABLED = 'true'
  NC_INTERNAL_BASE_PERMISSIONS_ENABLED = 'true'
  NC_INTERNAL_INPUT_VALIDATION_ENABLED = 'true'
  NC_INTERNAL_DOCUMENT_PERMISSIONS_ENABLED = 'true'
  NC_INTERNAL_FILE_PREVIEW_MODE_ENABLED = 'true'
  NC_INTERNAL_DISCUSSION_MODE_ENABLED = 'true'
  NC_INTERNAL_CELL_COLORING_ENABLED = 'true'
  NC_SECURE_ATTACHMENTS = 'true'
  NC_DISABLE_TELE = 'true'
}

foreach ($entry in $defaults.GetEnumerator()) {
  if (!(Get-Item -LiteralPath "Env:$($entry.Key)" -ErrorAction SilentlyContinue)) {
    [Environment]::SetEnvironmentVariable($entry.Key, $entry.Value, 'Process')
  }
}

Set-Location -LiteralPath $repositoryRoot
if ($Bootstrap -or !(Test-Path -LiteralPath (Join-Path $repositoryRoot 'node_modules'))) {
  corepack pnpm run bootstrap
}

node scripts/internal-fork/dev.mjs
