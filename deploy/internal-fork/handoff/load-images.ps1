$ErrorActionPreference = 'Stop'
$bundleRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$imageDir = Join-Path $bundleRoot 'images'

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
  throw 'Docker is not installed or is not available on PATH.'
}

docker info *> $null
if ($LASTEXITCODE -ne 0) {
  throw 'Docker is installed, but its engine is not running.'
}

$archives = Get-ChildItem -LiteralPath $imageDir -Filter '*.tar' | Sort-Object Name
if (-not $archives) {
  throw "No image archives were found in $imageDir"
}

$manifestPath = Join-Path $bundleRoot 'MANIFEST.sha256'
if (-not (Test-Path -LiteralPath $manifestPath)) {
  throw 'MANIFEST.sha256 is missing.'
}

Write-Host 'Verifying image archive checksums...'
foreach ($line in Get-Content -LiteralPath $manifestPath) {
  if ($line -notmatch '^([a-fA-F0-9]{64})\s+\*?(.+)$') {
    throw "Invalid checksum manifest line: $line"
  }
  $expected = $Matches[1].ToLowerInvariant()
  $relativePath = $Matches[2].Replace('/', [IO.Path]::DirectorySeparatorChar)
  $archivePath = Join-Path $bundleRoot $relativePath
  $actual = (Get-FileHash -LiteralPath $archivePath -Algorithm SHA256).Hash.ToLowerInvariant()
  if ($actual -ne $expected) {
    throw "Checksum mismatch for $relativePath"
  }
}

foreach ($archive in $archives) {
  Write-Host "Loading $($archive.Name)..."
  docker load --input $archive.FullName
  if ($LASTEXITCODE -ne 0) {
    throw "Failed to load $($archive.Name)"
  }
}

Write-Host 'All images loaded successfully.' -ForegroundColor Green
