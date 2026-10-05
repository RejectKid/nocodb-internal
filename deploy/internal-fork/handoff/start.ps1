$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot
if (-not (Test-Path -LiteralPath '.env')) { throw 'Run setup.ps1 first.' }
docker compose up -d --wait --wait-timeout 240
if ($LASTEXITCODE -ne 0) { throw 'Startup failed. Run: docker compose logs --tail 100 nocodb worker' }
Write-Host 'Services are ready. Default URL: http://localhost:8080 (or the NC_SITE_URL in .env). Create the first administrator account.'
