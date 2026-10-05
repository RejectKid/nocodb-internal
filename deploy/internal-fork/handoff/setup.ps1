$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot
if (Test-Path -LiteralPath '.env') { Write-Host '.env already exists; preserved.'; exit 0 }
function New-RandomHex {
  $bytes = New-Object byte[] 32
  $rng = [Security.Cryptography.RandomNumberGenerator]::Create()
  try { $rng.GetBytes($bytes) } finally { $rng.Dispose() }
  return ([BitConverter]::ToString($bytes)).Replace('-', '').ToLowerInvariant()
}
$lines = @('NC_PORT=8080', 'NC_BIND_IP=127.0.0.1', 'NC_SITE_URL=http://localhost:8080', ('POSTGRES_PASSWORD=' + (New-RandomHex)), ('NC_AUTH_JWT_SECRET=' + (New-RandomHex)))
[IO.File]::WriteAllLines((Join-Path $PSScriptRoot '.env'), $lines, (New-Object Text.UTF8Encoding($false)))
Write-Host 'Created local .env with unique secrets. Keep it private and backed up. No shared default login: create the first administrator in the browser.'
