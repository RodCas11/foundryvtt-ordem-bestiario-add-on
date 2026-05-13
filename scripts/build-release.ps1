$ErrorActionPreference = "Stop"

$Root = Resolve-Path (Join-Path $PSScriptRoot "..")
$ManifestPath = Join-Path $Root "module.json"

if (-not (Test-Path -LiteralPath $ManifestPath)) {
  throw "module.json not found at $ManifestPath"
}

$Manifest = Get-Content -Raw -LiteralPath $ManifestPath | ConvertFrom-Json
$ModuleId = $Manifest.id

if ([string]::IsNullOrWhiteSpace($ModuleId)) {
  throw "module.json must define an id."
}

$DistPath = Join-Path $Root "dist"
$PackagePath = Join-Path $DistPath $ModuleId
$ZipPath = Join-Path $DistPath "$ModuleId.zip"

if (Test-Path -LiteralPath $DistPath) {
  Remove-Item -LiteralPath $DistPath -Recurse -Force
}

New-Item -ItemType Directory -Path $PackagePath | Out-Null

$RequiredFiles = @("module.json", "README.md")
foreach ($File in $RequiredFiles) {
  $Source = Join-Path $Root $File
  if (-not (Test-Path -LiteralPath $Source)) {
    throw "$File not found."
  }

  Copy-Item -LiteralPath $Source -Destination $PackagePath
}

$OptionalDirectories = @("packs", "assets", "scripts", "styles", "lang", "templates")
foreach ($Directory in $OptionalDirectories) {
  $Source = Join-Path $Root $Directory
  if (Test-Path -LiteralPath $Source) {
    Copy-Item -LiteralPath $Source -Destination $PackagePath -Recurse
  }
}

$LicensePath = Join-Path $Root "LICENSE"
if (Test-Path -LiteralPath $LicensePath) {
  Copy-Item -LiteralPath $LicensePath -Destination $PackagePath
}

Compress-Archive -Path $PackagePath -DestinationPath $ZipPath -Force

Write-Host "Built $ZipPath"
