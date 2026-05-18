#requires -Version 7
#
# migrate-all.ps1 — Run goose up for every CampusFlow service DB.
#
# Usage:
#   .\scripts\migrate-all.ps1                  # use defaults
#   .\scripts\migrate-all.ps1 -Down            # rollback all (down 1)
#   $env:DB_HOST="localhost"; .\scripts\migrate-all.ps1
#
# Requirements:
#   - goose CLI on PATH:
#       go install github.com/pressly/goose/v3/cmd/goose@latest
#   - Postgres reachable with the credentials below.
#
# This script intentionally fails fast — first migration error stops the loop.

[CmdletBinding()]
param(
    [switch]$Down
)

$ErrorActionPreference = "Stop"

$DbUser     = $env:DB_USER     ?? "campusflow"
$DbPassword = $env:DB_PASSWORD ?? "campusflow_password"
$DbHost     = $env:DB_HOST     ?? "localhost"
$DbPort     = $env:DB_PORT     ?? "5432"
$SslMode    = $env:DB_SSLMODE  ?? "disable"

$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path

$Services = @(
    @{ Name = "auth";         Db = "auth_db" }
    @{ Name = "academic";     Db = "academic_db" }
    @{ Name = "file";         Db = "file_db" }
    @{ Name = "notification"; Db = "notification_db" }
    @{ Name = "reporting";    Db = "reporting_db" }
)

if (-not (Get-Command goose -ErrorAction SilentlyContinue)) {
    Write-Error "goose CLI not found on PATH. Install with: go install github.com/pressly/goose/v3/cmd/goose@latest"
}

$direction = if ($Down) { "down" } else { "up" }
Write-Host "CampusFlow migrate ($direction)" -ForegroundColor Cyan
Write-Host "Target: $DbUser@${DbHost}:$DbPort (sslmode=$SslMode)" -ForegroundColor DarkGray
Write-Host ""

foreach ($svc in $Services) {
    $name = $svc.Name
    $db   = $svc.Db
    $path = Join-Path $RepoRoot "db\$name\migrations"

    if (-not (Test-Path $path)) {
        Write-Warning "skip $name (no migrations at $path)"
        continue
    }

    $url = "postgres://${DbUser}:${DbPassword}@${DbHost}:${DbPort}/${db}?sslmode=${SslMode}"
    Write-Host ("[{0,-12}]" -f $name) -NoNewline -ForegroundColor Yellow
    Write-Host " $db ... " -NoNewline

    Push-Location $path
    try {
        if ($Down) {
            & goose postgres $url down 2>&1 | ForEach-Object { Write-Host "    $_" -ForegroundColor DarkGray }
        } else {
            & goose postgres $url up 2>&1 | ForEach-Object { Write-Host "    $_" -ForegroundColor DarkGray }
        }
    } finally {
        Pop-Location
    }

    if ($LASTEXITCODE -ne 0) {
        Write-Host ""
        Write-Error "migrate failed for $name (exit=$LASTEXITCODE)"
    }
    Write-Host "ok" -ForegroundColor Green
}

Write-Host ""
Write-Host "All migrations complete." -ForegroundColor Green
