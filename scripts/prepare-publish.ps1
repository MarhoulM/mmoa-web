# Build a deterministic GitHub Pages artifact into .publish/
# Allowlist-only. Does NOT deploy. Does NOT push. Does NOT change Pages source.
#
# IMPORTANT: If GitHub Pages is configured to publish from the repository root
# (branch/folder), generating .publish/ alone does NOT change what Pages serves.
# A separate Actions/manual deploy from .publish/ must be approved later.
#
# Usage (from mmoa-web root):
#   powershell -NoProfile -File scripts\prepare-publish.ps1

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$out = Join-Path $root '.publish'

# Explicit allowlist — relative paths from repo root (forward or back slash OK)
$Allowlist = @(
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

foreach ($rel in $Allowlist) {
  Copy-AllowlistedFile -Rel $rel
}

# Write manifest for reproducibility checks
$manifestPath = Join-Path $out 'PUBLISH_MANIFEST.txt'
$Allowlist | ForEach-Object { $_ -replace '\\', '/' } | Set-Content -Path $manifestPath -Encoding utf8

# --- Safety validation ---
$allFiles = Get-ChildItem -LiteralPath $out -Recurse -File
$relFiles = $allFiles | ForEach-Object {
  $_.FullName.Substring($out.Length).TrimStart('\', '/').Replace('\', '/')
}

foreach ($r in $relFiles) {
  if ($r -eq 'PUBLISH_MANIFEST.txt') { continue }
  if ($r -notmatch '^(index\.html|mathout/|sestava/)') {
    throw "Unexpected artifact path: $r"
  }
  if ($r -match '(?i)(^|/)(docs|scripts|_local)(/|$)' -or $r -match '(?i)README\.md$' -or $r -match '(?i)config\.(local\.)?example\.js$' -or $r -match '(?i)\.test\.mjs$' -or $r -match '(?i)mock') {
    throw "Excluded path present in artifact: $r"
  }
  if ($r -match '(?i)config\.local\.js$') {
    throw "Local config must not be in artifact: $r"
  }
}

foreach ($f in $allFiles) {
  if ($f.Name -eq 'PUBLISH_MANIFEST.txt') { continue }
  $text = Get-Content -LiteralPath $f.FullName -Raw -ErrorAction SilentlyContinue
  if ($null -eq $text) { continue }
  if ($text -match 'eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]+\.') {
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

# Expected exact public file count (allowlist only; manifest extra)
$expected = $Allowlist.Count
$publicCount = ($relFiles | Where-Object { $_ -ne 'PUBLISH_MANIFEST.txt' }).Count
if ($publicCount -ne $expected) {
  throw "Artifact file count $publicCount != allowlist $($expected)"
}

Write-Host "OK publish artifact at $out ($publicCount files + manifest)"
Write-Host "NOTE: Creating .publish does not change GitHub Pages source by itself."
Write-Host "Do not deploy without explicit human approval."
