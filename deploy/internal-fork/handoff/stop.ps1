$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot
docker compose down
if ($LASTEXITCODE -ne 0) { throw 'Stop failed' }
Write-Host 'Stopped. Persistent volumes were preserved.'
