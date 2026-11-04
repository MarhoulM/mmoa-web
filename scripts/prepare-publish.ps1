# Build a deterministic GitHub Pages artifact into .publish/
# Allowlist files + demo/ tree. Does NOT deploy. Does NOT push.
#
# Requires demo/ synced from Sestava (tool/sync_demo_to_mmoa_web.ps1).
#
# Usage (from mmoa-web root):
#   powershell -NoProfile -File scripts\prepare-publish.ps1

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$out = Join-Path $root '.publish'

$AllowlistFiles = @(
  'index.html',
  'mathout/privacy/index.html',
  'sestava/index.html',
  'sestava/privacy/index.html',
  'sestava/support/index.html',
  'sestava/delete-account/index.html',
  'sestava/assets/config.js',
  'sestava/assets/delete-account.js',
  'sestava/assets/sestava.css'
)

function Copy-AllowlistedFile {
  param([string]$Rel)
  $src = Join-Path $root ($Rel -replace '/', [IO.Path]::DirectorySeparatorChar)
  if (-not (Test-Path -LiteralPath $src)) {
    throw "Allowlist source missing: $Rel"
  }
  $dest = Join-Path $out ($Rel -replace '/', [IO.Path]::DirectorySeparatorChar)
  $destDir = Split-Path -Parent $dest
  if (-not (Test-Path -LiteralPath $destDir)) {
    New-Item -ItemType Directory -Path $destDir -Force | Out-Null
  }
  Copy-Item -LiteralPath $src -Destination $dest -Force
}

if (Test-Path -LiteralPath $out) {
  Remove-Item -LiteralPath $out -Recurse -Force
}
New-Item -ItemType Directory -Path $out | Out-Null

foreach ($rel in $AllowlistFiles) {
  Copy-AllowlistedFile -Rel $rel
}

$demoSrc = Join-Path $root 'demo'
if (-not (Test-Path -LiteralPath $demoSrc)) {
  throw 'demo/ missing — run Sestava tool/sync_demo_to_mmoa_web.ps1 first'
}
if (-not (Test-Path -LiteralPath (Join-Path $demoSrc 'index.html'))) {
  throw 'demo/index.html missing'
}
if (-not (Test-Path -LiteralPath (Join-Path $demoSrc 'main.dart.js'))) {
  throw 'demo/main.dart.js missing'
}
$demoIndex = Get-Content -LiteralPath (Join-Path $demoSrc 'index.html') -Raw
if ($demoIndex -notmatch 'base href="[^"]*demo/"') {
  throw 'demo/index.html must use a .../demo/ base href'
}
$demoMain = Get-Content -LiteralPath (Join-Path $demoSrc 'main.dart.js') -Raw
if ($demoMain -notmatch 'demo@sestava\.local') {
  throw 'demo build missing demo identity marker'
}
if ($demoMain -match 'https://[a-z0-9]{10,40}\.supabase\.(co|in)') {
  throw 'demo build contains live Supabase project URL'
}
if ($demoMain -match '(?i)sb_secret_[A-Za-z0-9]') {
  throw 'demo build contains sb_secret_ marker'
}
if ($demoMain -match '(?i)SUPABASE_SERVICE_ROLE\s*=') {
  throw 'demo build contains SUPABASE_SERVICE_ROLE assignment'
}

Copy-Item -LiteralPath $demoSrc -Destination (Join-Path $out 'demo') -Recurse -Force

$manifest = New-Object System.Collections.Generic.List[string]
foreach ($f in $AllowlistFiles) { [void]$manifest.Add(($f -replace '\\', '/')) }
Get-ChildItem -LiteralPath (Join-Path $out 'demo') -Recurse -File | ForEach-Object {
  $rel = $_.FullName.Substring($out.Length).TrimStart('\', '/').Replace('\', '/')
  [void]$manifest.Add($rel)
}
$manifestPath = Join-Path $out 'PUBLISH_MANIFEST.txt'
$manifest | Set-Content -Path $manifestPath -Encoding utf8

$allFiles = Get-ChildItem -LiteralPath $out -Recurse -File
$relFiles = $allFiles | ForEach-Object {
  $_.FullName.Substring($out.Length).TrimStart('\', '/').Replace('\', '/')
}

foreach ($r in $relFiles) {
  if ($r -eq 'PUBLISH_MANIFEST.txt') { continue }
  $ok = ($r -match '^(index\.html|mathout/|sestava/|demo/)')
  if (-not $ok) { throw "Unexpected artifact path: $r" }
  if ($r -match '(?i)(^|/)(docs|scripts|_local)(/|$)' -or $r -match '(?i)config\.local' -or $r -match '(?i)mock' -or $r -match '(?i)\.env$') {
    throw "Excluded path present in artifact: $r"
  }
}

foreach ($f in $allFiles) {
  if ($f.Name -eq 'PUBLISH_MANIFEST.txt') { continue }
  if ($f.Name -eq 'main.dart.js') { continue }
  if ($f.Length -gt 15MB) { continue }
  if ($f.Extension -notin '.html', '.js', '.css', '.json', '.txt') { continue }
  $text = Get-Content -LiteralPath $f.FullName -Raw -ErrorAction SilentlyContinue
  if ($null -eq $text) { continue }
  if ($text -match 'eyJ[A-Za-z0-9_-]{30,}\.[A-Za-z0-9_-]{30,}\.[A-Za-z0-9_-]{30,}') {
    throw "JWT-like content in $($f.FullName)"
  }
  if ($text -match '(?i)service_role\s*[:=]') {
    throw "service_role assignment in $($f.FullName)"
  }
  if ($text -match '(?i)sb_secret|SUPABASE_SERVICE_ROLE') {
    throw "Privileged key marker in $($f.FullName)"
  }
}

$config = Get-Content -LiteralPath (Join-Path $out 'sestava\assets\config.js') -Raw
if ($config -notmatch 'deletionEnabled:\s*false') {
  throw 'Artifact config.js must keep deletionEnabled: false'
}
if ($config -notmatch 'productionEnabled:\s*false') {
  throw 'Artifact config.js must keep productionEnabled: false'
}
if ($config -notmatch 'environment:\s*"disabled"') {
  throw 'Artifact config.js must keep environment disabled'
}
if ($config -match 'supabaseUrl:\s*"https://') {
  throw 'Artifact config.js must not hardcode a live supabaseUrl'
}

$publicCount = ($relFiles | Where-Object { $_ -ne 'PUBLISH_MANIFEST.txt' }).Count
Write-Host "OK publish artifact at $out ($publicCount files + manifest, incl. demo/)"
Write-Host "NOTE: Creating .publish does not change GitHub Pages source by itself."
Write-Host "Do not deploy without explicit human approval."
