# Remove legacy matchmaking files
# This PowerShell script removes files that are part of the old matchmaking system
# and are no longer needed with the new Arena invitation system

# Change to the project root directory
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location (Join-Path $scriptPath "..")

Write-Host "Removing legacy matchmaking files..." -ForegroundColor Cyan

# Legacy function file that is no longer needed
if (Test-Path "src\lib\functions\find_or_create_match.ts") {
    Remove-Item "src\lib\functions\find_or_create_match.ts" -Force
    Write-Host "Removed find_or_create_match.ts" -ForegroundColor Green
} else {
    Write-Host "find_or_create_match.ts not found, skipping" -ForegroundColor Yellow
}

# Legacy matchmaking page that has been replaced by the Arena system
if (Test-Path "src\redvsblue\pages\MatchmakingPage.tsx") {
    Remove-Item "src\redvsblue\pages\MatchmakingPage.tsx" -Force
    Write-Host "Removed MatchmakingPage.tsx" -ForegroundColor Green
} else {
    Write-Host "MatchmakingPage.tsx not found, skipping" -ForegroundColor Yellow
}

# Check if there are any old backup files to clean up
$backupFiles = Get-ChildItem -Path "src\hooks" -Filter "*backup*" -File
if ($backupFiles.Count -gt 0) {
    $backupFiles | ForEach-Object {
        Remove-Item $_.FullName -Force
        Write-Host "Removed $($_.Name)" -ForegroundColor Green
    }
} else {
    Write-Host "No backup hook files found, skipping" -ForegroundColor Yellow
}

Write-Host "Legacy matchmaking file cleanup complete!" -ForegroundColor Cyan
