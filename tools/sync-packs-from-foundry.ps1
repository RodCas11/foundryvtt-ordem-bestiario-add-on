$ErrorActionPreference = 'Stop'

$projectRoot = 'D:\bestiario-ordem-paranormal\ordem-bestiario'
$foundryModulePacks = Join-Path $env:LOCALAPPDATA 'FoundryVTT\Data\modules\ordem-bestiario\packs'
$timestamp = Get-Date -Format 'yyyyMMdd-HHmmss'

$foundryProcess = Get-Process -Name 'Foundry Virtual Tabletop','FoundryVTT' -ErrorAction SilentlyContinue
if ($foundryProcess) {
  Write-Warning 'Feche o Foundry antes de sincronizar os packs.'
  exit 1
}

$packNames = @('ameacas', 'macros', 'tabelas')

foreach ($packName in $packNames) {
  $source = Join-Path $foundryModulePacks $packName
  $dest = Join-Path $projectRoot "packs\$packName"
  $backup = Join-Path $projectRoot "packs\$packName.backup-$timestamp"

  if (-not (Test-Path $source)) {
    throw "Origem não encontrada: $source"
  }

  $sourceFiles = Get-ChildItem -Path $source -Recurse -File
  if ($sourceFiles.Count -eq 0) {
    throw "Origem vazia: $source"
  }

  if (Test-Path $dest) {
    Copy-Item -Path $dest -Destination $backup -Recurse -Force
  }

  New-Item -ItemType Directory -Path $dest -Force | Out-Null
  if (Test-Path (Join-Path $dest '*')) {
    Remove-Item -Path (Join-Path $dest '*') -Recurse -Force
  }

  Copy-Item -Path (Join-Path $source '*') -Destination $dest -Recurse -Force

  $copiedCount = (Get-ChildItem -Path $dest -Recurse -File).Count
  Write-Host "Pack '$packName' sincronizado. Arquivos copiados: $copiedCount"
}

Write-Host 'Packs sincronizados com sucesso (ameacas + macros + tabelas).'
