$ErrorActionPreference = 'Stop'

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$newScript = Join-Path $scriptDir 'sync-packs-from-foundry.ps1'

if (-not (Test-Path $newScript)) {
  throw "Script não encontrado: $newScript"
}

Write-Host 'sync-pack-from-foundry.ps1 foi substituído por sync-packs-from-foundry.ps1'
Write-Host 'Sincronizando packs: ameacas + macros'

powershell -ExecutionPolicy Bypass -File $newScript
