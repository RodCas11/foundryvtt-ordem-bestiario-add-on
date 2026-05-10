$ErrorActionPreference = 'Stop'

$projectRoot = 'D:\bestiario-ordem-paranormal\ordem-bestiario'
$releaseRoot = 'D:\bestiario-ordem-paranormal\release'
$releaseDir = Join-Path $releaseRoot 'ordem-bestiario'
$zipPath = Join-Path $releaseRoot 'ordem-bestiario.zip'

$required = @(
  (Join-Path $projectRoot 'module.json'),
  (Join-Path $projectRoot 'packs\ameacas'),
  (Join-Path $projectRoot 'packs\macros'),
  (Join-Path $projectRoot 'packs\tabelas'),
  (Join-Path $projectRoot 'assets\tokens-normalized')
)

foreach ($path in $required) {
  if (-not (Test-Path $path)) {
    throw "Caminho obrigatório ausente: $path"
  }
}

if ((Get-ChildItem -Path (Join-Path $projectRoot 'packs\ameacas') -Recurse -File).Count -eq 0) {
  throw 'packs/ameacas está vazio. Popule o compêndio antes de preparar release.'
}

if ((Get-ChildItem -Path (Join-Path $projectRoot 'packs\macros') -Recurse -File).Count -eq 0) {
  throw 'packs/macros está vazio. Popule o compêndio de macros antes de preparar release.'
}

if ((Get-ChildItem -Path (Join-Path $projectRoot 'packs\tabelas') -Recurse -File).Count -eq 0) {
  throw 'packs/tabelas está vazio. Popule o compêndio de tabelas antes de preparar release.'
}

if ((Get-ChildItem -Path (Join-Path $projectRoot 'assets\tokens-normalized') -Recurse -File).Count -eq 0) {
  throw 'assets/tokens-normalized está vazio. Gere os tokens normalizados antes de preparar release.'
}

New-Item -ItemType Directory -Path $releaseRoot -Force | Out-Null
if (Test-Path $releaseDir) {
  Remove-Item -Path $releaseDir -Recurse -Force
}
New-Item -ItemType Directory -Path $releaseDir -Force | Out-Null

Copy-Item -Path (Join-Path $projectRoot 'module.json') -Destination (Join-Path $releaseDir 'module.json') -Force
Copy-Item -Path (Join-Path $projectRoot 'README.md') -Destination (Join-Path $releaseDir 'README.md') -Force
Copy-Item -Path (Join-Path $projectRoot 'packs') -Destination (Join-Path $releaseDir 'packs') -Recurse -Force

$releaseAssets = Join-Path $releaseDir 'assets'
New-Item -ItemType Directory -Path $releaseAssets -Force | Out-Null
Copy-Item -Path (Join-Path $projectRoot 'assets\tokens-normalized') -Destination (Join-Path $releaseAssets 'tokens-normalized') -Recurse -Force

$optional = @('LICENSE', 'CHANGELOG.md')
foreach ($item in $optional) {
  $src = Join-Path $projectRoot $item
  if (Test-Path $src) {
    Copy-Item -Path $src -Destination (Join-Path $releaseDir $item) -Force
  }
}

if (Test-Path $zipPath) {
  Remove-Item -Path $zipPath -Force
}
Compress-Archive -Path (Join-Path $releaseDir '*') -DestinationPath $zipPath -Force

Write-Host 'Release pronta em D:\bestiario-ordem-paranormal\release\ordem-bestiario'
Write-Host 'Zip criado em D:\bestiario-ordem-paranormal\release\ordem-bestiario.zip'
