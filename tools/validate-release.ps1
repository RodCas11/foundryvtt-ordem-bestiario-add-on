$ErrorActionPreference = 'Stop'

$releaseDir = 'D:\bestiario-ordem-paranormal\release\ordem-bestiario'
$modulePath = Join-Path $releaseDir 'module.json'
$packAmeacasDir = Join-Path $releaseDir 'packs\ameacas'
$packMacrosDir = Join-Path $releaseDir 'packs\macros'
$packTabelasDir = Join-Path $releaseDir 'packs\tabelas'
$tokenDir = Join-Path $releaseDir 'assets\tokens-normalized'

$results = New-Object System.Collections.Generic.List[Object]

function Add-Check($name, $ok, $detail) {
  $results.Add([pscustomobject]@{ Check = $name; Status = if ($ok) { 'OK' } else { 'ERRO' }; Detail = $detail }) | Out-Null
}

Add-Check 'module.json existe' (Test-Path $modulePath) $modulePath
Add-Check 'packs/ameacas existe' (Test-Path $packAmeacasDir) $packAmeacasDir
Add-Check 'packs/ameacas não vazio' ((Test-Path $packAmeacasDir) -and ((Get-ChildItem -Path $packAmeacasDir -Recurse -File | Measure-Object).Count -gt 0)) $packAmeacasDir
Add-Check 'packs/macros existe' (Test-Path $packMacrosDir) $packMacrosDir
Add-Check 'packs/macros não vazio' ((Test-Path $packMacrosDir) -and ((Get-ChildItem -Path $packMacrosDir -Recurse -File | Measure-Object).Count -gt 0)) $packMacrosDir
Add-Check 'packs/tabelas existe' (Test-Path $packTabelasDir) $packTabelasDir
Add-Check 'packs/tabelas não vazio' ((Test-Path $packTabelasDir) -and ((Get-ChildItem -Path $packTabelasDir -Recurse -File | Measure-Object).Count -gt 0)) $packTabelasDir
Add-Check 'assets/tokens-normalized existe' (Test-Path $tokenDir) $tokenDir
Add-Check 'assets/tokens-normalized não vazio' ((Test-Path $tokenDir) -and ((Get-ChildItem -Path $tokenDir -Recurse -File | Measure-Object).Count -gt 0)) $tokenDir

$moduleJson = $null
$jsonValid = $false
if (Test-Path $modulePath) {
  try {
    $raw = Get-Content -Raw $modulePath
    $moduleJson = $raw | ConvertFrom-Json
    $jsonValid = $true
  } catch {
    $jsonValid = $false
  }
}
Add-Check 'module.json válido' $jsonValid $modulePath

if ($jsonValid) {
  Add-Check 'module.json id ordem-bestiario' ($moduleJson.id -eq 'ordem-bestiario') "id=$($moduleJson.id)"

  $pack = $moduleJson.packs | Where-Object { $_.name -eq 'ameacas' } | Select-Object -First 1
  Add-Check 'module.json pack name ameacas' ($null -ne $pack) 'packs[].name=ameacas'

  if ($null -ne $pack) {
    Add-Check 'module.json pack path packs/ameacas' ($pack.path -eq 'packs/ameacas') "path=$($pack.path)"
    Add-Check 'module.json pack type Actor' ($pack.type -eq 'Actor') "type=$($pack.type)"
  } else {
    Add-Check 'module.json pack path packs/ameacas' $false 'pack ameacas não encontrado'
    Add-Check 'module.json pack type Actor' $false 'pack ameacas não encontrado'
  }

  $macroPack = $moduleJson.packs | Where-Object { $_.name -eq 'macros' } | Select-Object -First 1
  Add-Check 'module.json pack name macros' ($null -ne $macroPack) 'packs[].name=macros'
  if ($null -ne $macroPack) {
    Add-Check 'module.json pack path packs/macros' ($macroPack.path -eq 'packs/macros') "path=$($macroPack.path)"
    Add-Check 'module.json pack type Macro' ($macroPack.type -eq 'Macro') "type=$($macroPack.type)"
  } else {
    Add-Check 'module.json pack path packs/macros' $false 'pack macros não encontrado'
    Add-Check 'module.json pack type Macro' $false 'pack macros não encontrado'
  }

  $tablePack = $moduleJson.packs | Where-Object { $_.name -eq 'tabelas' } | Select-Object -First 1
  Add-Check 'module.json pack name tabelas' ($null -ne $tablePack) 'packs[].name=tabelas'
  if ($null -ne $tablePack) {
    Add-Check 'module.json pack path packs/tabelas' ($tablePack.path -eq 'packs/tabelas') "path=$($tablePack.path)"
    Add-Check 'module.json pack type RollTable' ($tablePack.type -eq 'RollTable') "type=$($tablePack.type)"
  } else {
    Add-Check 'module.json pack path packs/tabelas' $false 'pack tabelas não encontrado'
    Add-Check 'module.json pack type RollTable' $false 'pack tabelas não encontrado'
  }
} else {
  Add-Check 'module.json id ordem-bestiario' $false 'JSON inválido'
  Add-Check 'module.json pack name ameacas' $false 'JSON inválido'
  Add-Check 'module.json pack path packs/ameacas' $false 'JSON inválido'
  Add-Check 'module.json pack type Actor' $false 'JSON inválido'
  Add-Check 'module.json pack name macros' $false 'JSON inválido'
  Add-Check 'module.json pack path packs/macros' $false 'JSON inválido'
  Add-Check 'module.json pack type Macro' $false 'JSON inválido'
  Add-Check 'module.json pack name tabelas' $false 'JSON inválido'
  Add-Check 'module.json pack path packs/tabelas' $false 'JSON inválido'
  Add-Check 'module.json pack type RollTable' $false 'JSON inválido'
}

$results | Format-Table -AutoSize

$hasError = $results | Where-Object { $_.Status -eq 'ERRO' }
if ($hasError) {
  exit 1
}
