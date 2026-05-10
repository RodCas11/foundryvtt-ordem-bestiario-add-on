$ErrorActionPreference = 'Stop'

$projectRoot = 'D:\bestiario-ordem-paranormal\ordem-bestiario'
$sourceDir = Join-Path $projectRoot 'assets\tokens'
$destDir = Join-Path $projectRoot 'assets\tokens-normalized'

if (-not (Test-Path $sourceDir)) {
  throw "Pasta de origem não encontrada: $sourceDir"
}

New-Item -ItemType Directory -Path $destDir -Force | Out-Null

function Remove-Accents([string]$value) {
  $norm = $value.Normalize([Text.NormalizationForm]::FormD)
  $sb = New-Object System.Text.StringBuilder
  foreach ($ch in $norm.ToCharArray()) {
    if ([Globalization.CharUnicodeInfo]::GetUnicodeCategory($ch) -ne [Globalization.UnicodeCategory]::NonSpacingMark) {
      [void]$sb.Append($ch)
    }
  }
  return $sb.ToString().Normalize([Text.NormalizationForm]::FormC)
}

function Normalize-TokenBaseName([string]$name) {
  $clean = Remove-Accents($name).ToLowerInvariant()
  $clean = $clean -replace '[\s_]+', '-'
  $clean = $clean -replace '[^a-z0-9-]', ''
  $clean = $clean -replace '-+', '-'
  $clean = $clean.Trim('-')
  return $clean
}

$preferredExtOrder = @('.webp', '.png', '.jpg', '.jpeg')
$files = Get-ChildItem -Path $sourceDir -File
$group = @{}

foreach ($file in $files) {
  $name = $file.Name
  $extMatch = [regex]::Matches($name.ToLowerInvariant(), '\.(webp|png|jpg|jpeg)$')
  if ($extMatch.Count -eq 0) { continue }

  $finalExt = '.' + $extMatch[$extMatch.Count - 1].Groups[1].Value
  $base = $name
  while ($base -match '\.(webp|png|jpg|jpeg)$') {
    $base = $base -replace '\.(webp|png|jpg|jpeg)$', ''
  }

  $normalizedBase = Normalize-TokenBaseName $base
  if ([string]::IsNullOrWhiteSpace($normalizedBase)) { continue }

  if (-not $group.ContainsKey($normalizedBase)) {
    $group[$normalizedBase] = @()
  }

  $group[$normalizedBase] += [pscustomobject]@{
    File = $file
    Ext = $finalExt
    Priority = [array]::IndexOf($preferredExtOrder, $finalExt)
  }
}

$copied = 0
foreach ($key in $group.Keys) {
  $candidates = $group[$key] | Sort-Object @{Expression={ if ($_.Priority -lt 0) { 999 } else { $_.Priority } }}, @{Expression={$_.File.Name}}
  $pick = $candidates | Select-Object -First 1
  $targetName = "$key$($pick.Ext)"
  $targetPath = Join-Path $destDir $targetName

  Copy-Item -LiteralPath $pick.File.FullName -Destination $targetPath -Force
  $copied++
}

Write-Host "Tokens normalizados gerados em: $destDir"
Write-Host "Arquivos gerados: $copied"
