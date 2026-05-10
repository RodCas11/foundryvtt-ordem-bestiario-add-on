$ErrorActionPreference = 'Stop'

$source = 'D:\bestiario-ordem-paranormal\ordem-bestiario'
$dest = Join-Path $env:LOCALAPPDATA 'FoundryVTT\Data\modules\ordem-bestiario'

New-Item -ItemType Directory -Path $dest -Force | Out-Null

$itemsToCopy = @(
  'module.json',
  'README.md',
  'scripts',
  'output',
  'packs',
  'assets'
)

foreach ($item in $itemsToCopy) {
  $srcPath = Join-Path $source $item
  if (-not (Test-Path $srcPath)) { continue }

  $dstPath = Join-Path $dest $item

  if ((Get-Item $srcPath) -is [System.IO.DirectoryInfo]) {
    New-Item -ItemType Directory -Path $dstPath -Force | Out-Null
    Copy-Item -Path (Join-Path $srcPath '*') -Destination $dstPath -Recurse -Force
  }
  else {
    Copy-Item -Path $srcPath -Destination $dstPath -Force
  }
}

$modulePath = Join-Path $dest 'module.json'
if (Test-Path $modulePath) {
  $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
  $moduleText = Get-Content -Raw $modulePath
  [System.IO.File]::WriteAllText($modulePath, $moduleText, $utf8NoBom)
}

Write-Host "Modulo copiado para: $dest"
Write-Host 'Reinicie o Foundry e ative o modulo Bestiario Ordem Paranormal.'
