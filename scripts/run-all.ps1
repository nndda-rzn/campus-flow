#requires -Version 7
#
# run-all.ps1 — Launch every CampusFlow service in its own pwsh window.
#
# Usage:
#   .\scripts\run-all.ps1                 # launch all services + frontend
#   .\scripts\run-all.ps1 -SkipFrontend   # only Go services
#
# Each service runs `go run ./apps/services/<name>/cmd/server`. The frontend
# runs `npm run dev` from apps/web.
#
# To stop everything, close the spawned windows or run scripts/stop-all.ps1.

[CmdletBinding()]
param(
    [switch]$SkipFrontend
)

$ErrorActionPreference = "Stop"

$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path

$Services = @(
    @{ Name = "auth-service";         Port = "50051"; Path = "apps\services\auth-service\cmd\server" }
    @{ Name = "academic-service";     Port = "50052"; Path = "apps\services\academic-service\cmd\server" }
    @{ Name = "file-service";         Port = "50053"; Path = "apps\services\file-service\cmd\server" }
    @{ Name = "notification-service"; Port = "50054"; Path = "apps\services\notification-service\cmd\server" }
    @{ Name = "reporting-service";    Port = "50055"; Path = "apps\services\reporting-service\cmd\server" }
    @{ Name = "api-gateway";          Port = "8080";  Path = "apps\services\api-gateway\cmd\server" }
)

function Start-ServiceWindow {
    param(
        [string]$Title,
        [string]$WorkingDir,
        [string]$Command
    )

    $args = @(
        "-NoExit",
        "-NoProfile",
        "-Command",
        "Set-Location -LiteralPath '$WorkingDir'; `$Host.UI.RawUI.WindowTitle = '$Title'; Write-Host '== $Title ==' -ForegroundColor Cyan; $Command"
    )
    Start-Process -FilePath "pwsh" -ArgumentList $args -WindowStyle Normal | Out-Null
}

Write-Host "CampusFlow run-all" -ForegroundColor Cyan
Write-Host "Repo: $RepoRoot" -ForegroundColor DarkGray
Write-Host ""

foreach ($svc in $Services) {
    $title = "$($svc.Name) (:$($svc.Port))"
    $cmd   = "go run .\$($svc.Path)"
    Write-Host ("[{0,-22}] launching..." -f $svc.Name)
    Start-ServiceWindow -Title $title -WorkingDir $RepoRoot -Command $cmd
    Start-Sleep -Milliseconds 250
}

if (-not $SkipFrontend) {
    $webDir = Join-Path $RepoRoot "apps\web"
    if (Test-Path $webDir) {
        Write-Host ("[{0,-22}] launching..." -f "web")
        Start-ServiceWindow -Title "web (:3000)" -WorkingDir $webDir -Command "npm run dev"
    } else {
        Write-Warning "apps/web not found, skipping frontend"
    }
}

Write-Host ""
Write-Host "All services launched. Each runs in its own window." -ForegroundColor Green
Write-Host "API Gateway: http://localhost:8080/health" -ForegroundColor DarkGray
Write-Host "Frontend:    http://localhost:3000" -ForegroundColor DarkGray
Write-Host "Stop with scripts\stop-all.ps1 or close each window." -ForegroundColor DarkGray
