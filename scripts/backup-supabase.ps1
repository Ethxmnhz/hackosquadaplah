# Requires: Windows PowerShell 5+ | Uses bundled PostgreSQL tools in postgresql-tools/pgsql/bin
# Purpose: Create a full Supabase Postgres backup (schema + data) into a timestamped folder
# Usage:
#   - Preferred: Set SUPABASE_DB_URL env var to your Supabase connection string (postgresql://...)
#     then run: npm run backup:db
#   - Or run directly: powershell -ExecutionPolicy Bypass -File ./scripts/backup-supabase.ps1
#   - If no env var is set, you will be prompted to paste the DB URL.
#
# Notes:
# - You can find the connection string in Supabase Dashboard → Project Settings → Database → Connection string
#   Example: postgresql://postgres:<YOUR_DB_PASSWORD>@db.<ref>.supabase.co:5432/postgres?sslmode=require
# - The script saves: a plain SQL dump, a custom-format dump (.dump), and global objects (roles) if available.

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Get-RepoRoot {
  param()
  # This script lives in <repo>/scripts; repo root is one directory up
  return (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
}

function Get-PgTool {
  param(
    [Parameter(Mandatory=$true)][string]$ToolName
  )
  $repoRoot = Get-RepoRoot
  $candidate = Join-Path $repoRoot (Join-Path 'postgresql-tools/pgsql/bin' $ToolName)
  if (Test-Path $candidate) { return $candidate }
  # Fallback to PATH
  return $ToolName
}

function Ensure-Dir {
  param([Parameter(Mandatory=$true)][string]$Path)
  if (-not (Test-Path $Path)) { [void](New-Item -ItemType Directory -Path $Path) }
}

function With-SSLModeRequired {
  param([Parameter(Mandatory=$true)][string]$Url)
  if ($Url -match 'sslmode=') { return $Url }
  if ($Url -match '\?') { return ($Url + '&sslmode=require') } else { return ($Url + '?sslmode=require') }
}

Write-Host "=== Supabase Postgres Backup ===" -ForegroundColor Cyan

$repoRoot = Get-RepoRoot
$timestamp = Get-Date -Format 'yyyyMMdd_HHmmss'
$outDir = Join-Path $repoRoot (Join-Path 'supabase/backups' $timestamp)
Ensure-Dir $outDir

# 1) Resolve DB URL
$dbUrl = $env:SUPABASE_DB_URL
if (-not $dbUrl -or [string]::IsNullOrWhiteSpace($dbUrl)) {
  $dbUrl = $env:DATABASE_URL
}
if (-not $dbUrl -or [string]::IsNullOrWhiteSpace($dbUrl)) {
  Write-Host "Enter your Supabase Postgres connection string (postgresql://...):" -ForegroundColor Yellow
  $dbUrl = Read-Host
}
if (-not $dbUrl -or [string]::IsNullOrWhiteSpace($dbUrl)) {
  throw "No database URL provided. Set SUPABASE_DB_URL or paste the connection string when prompted."
}

$dbUrl = With-SSLModeRequired -Url $dbUrl

# 2) Locate tools
$pgDump = Get-PgTool -ToolName 'pg_dump.exe'
$pgDumpAll = Get-PgTool -ToolName 'pg_dumpall.exe'

Write-Host "Using pg_dump: $pgDump" -ForegroundColor DarkGray
Write-Host "Using pg_dumpall: $pgDumpAll" -ForegroundColor DarkGray

# 3) Output file paths
$plainSql = Join-Path $outDir 'dump.sql'
$customDump = Join-Path $outDir 'dump.dump'
$globalsSql = Join-Path $outDir 'globals_roles.sql'
$metaJson = Join-Path $outDir 'backup_meta.json'

# 4) Capture environment (mask password)
function Mask-Password([string]$url) {
  try {
    $u = [System.Uri]$url
    if ($u.UserInfo -and $u.UserInfo.Contains(':')) {
      $user = $u.UserInfo.Split(':')[0]
      $masked = "${user}:****"
      return $url.Replace($u.UserInfo, $masked)
    }
  } catch {}
  return $url
}

# 5) Run backups
Write-Host "Creating plain SQL backup..." -ForegroundColor Cyan
& $pgDump `
  --file "$plainSql" `
  --format=plain `
  --verbose `
  --no-owner `
  --no-privileges `
  "$dbUrl"

Write-Host "Creating custom-format backup (.dump)..." -ForegroundColor Cyan
& $pgDump `
  --file "$customDump" `
  --format=custom `
  --verbose `
  --no-owner `
  --no-privileges `
  "$dbUrl"

Write-Host "Dumping global objects (roles) if permitted..." -ForegroundColor Cyan
try {
  & $pgDumpAll -g --verbose "$dbUrl" | Out-File -Encoding UTF8 -FilePath $globalsSql
} catch {
  Write-Warning "pg_dumpall -g failed or not permitted. Skipping roles dump. ($_ )"
}

# 6) Save metadata
$meta = [ordered]@{
  created_at = (Get-Date).ToString('o')
  tool       = 'pg_dump/pg_dumpall'
  host_os    = (Get-CimInstance -ClassName Win32_OperatingSystem).Caption
  db_url     = (Mask-Password $dbUrl)
  files      = @{}
}
$meta.files.plain_sql = $plainSql
$meta.files.custom = $customDump
if (Test-Path $globalsSql) { $meta.files.globals = $globalsSql } else { $meta.files.globals = $null }
$meta | ConvertTo-Json -Depth 5 | Out-File -Encoding UTF8 -FilePath $metaJson

Write-Host "";
Write-Host "Backup complete! Files saved in:" -ForegroundColor Green
Write-Host "  $outDir" -ForegroundColor Green
Write-Host "Artifacts:" -ForegroundColor Green
Write-Host "  - $(Split-Path -Leaf $plainSql) (plain SQL)"
Write-Host "  - $(Split-Path -Leaf $customDump) (custom format)"
if (Test-Path $globalsSql) { Write-Host "  - $(Split-Path -Leaf $globalsSql) (roles)" }
Write-Host "  - $(Split-Path -Leaf $metaJson) (metadata)"

Write-Host "";
Write-Host "Restore tips:" -ForegroundColor Yellow
Write-Host "  - Plain SQL:   psql < dump.sql"
Write-Host "  - Custom dump: pg_restore -d <db> dump.dump"
Write-Host "  - Globals:     psql -f globals_roles.sql (requires privileges)"
