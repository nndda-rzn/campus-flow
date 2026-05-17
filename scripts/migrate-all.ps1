#requires -Version 7
#
# migrate-all.ps1 — Run golang-migrate up for every CampusFlow service DB.
#
# Usage:
#   .\scripts\migrate-all.ps1                  # use defaults
#   .\scripts\migrate-all.ps1 -Down            # rollback all (down 1)
#   $env:DB_HOST="localhost"; .\scripts\migrate-all.ps1
#
# Requirements:
#   - migrate CLI on PATH:
#       go install -tags 'postgres' github.com/golang-migrate/migrate/v4/cmd/migrate@latest
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

if (-not (Get-Command migrate -ErrorAction SilentlyContinue)) {
    Write-Error "migrate CLI not found on PATH. Install with: go install -tags 'postgres' github.com/golang-migrate/migrate/v4/cmd/migrate@latest"
}

$direction = if ($Down) { "down 1" } else { "up" }
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

    if ($Down) {
        & migrate -path $path -database $url down 1 2>&1 | ForEach-Object { Write-Host "    $_" -ForegroundColor DarkGray }
    } else {
        & migrate -path $path -database $url up 2>&1 | ForEach-Object { Write-Host "    $_" -ForegroundColor DarkGray }
    }

    if ($LASTEXITCODE -ne 0) {
        Write-Host ""
        Write-Error "migrate failed for $name (exit=$LASTEXITCODE)"
    }
    Write-Host "ok" -ForegroundColor Green
}

Write-Host ""
Write-Host "All migrations complete." -ForegroundColor Green
