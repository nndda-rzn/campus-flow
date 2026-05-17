#requires -Version 7
#
# stop-all.ps1 — Best-effort kill of CampusFlow processes spawned by run-all.
#
# Strategy: kill any process whose CommandLine contains the cmd/server entry
# of one of our services, plus the next dev server (port 3000) and go-build
# children. Falls back to port-based kill if CommandLine isn't available.

$ErrorActionPreference = "SilentlyContinue"

$Markers = @(
    "apps/services/auth-service/cmd/server",
    "apps\services\auth-service\cmd\server",
    "apps/services/academic-service/cmd/server",
    "apps\services\academic-service\cmd\server",
    "apps/services/file-service/cmd/server",
    "apps\services\file-service\cmd\server",
    "apps/services/notification-service/cmd/server",
    "apps\services\notification-service\cmd\server",
    "apps/services/reporting-service/cmd/server",
    "apps\services\reporting-service\cmd\server",
    "apps/services/api-gateway/cmd/server",
    "apps\services\api-gateway\cmd\server"
)

$Killed = 0

# Find by command line (works when WMI / CIM available, requires admin on some
# Windows versions but usually fine for user-spawned processes).
$processes = Get-CimInstance Win32_Process -ErrorAction SilentlyContinue
if ($processes) {
    foreach ($p in $processes) {
        $cmd = $p.CommandLine
        if (-not $cmd) { continue }
        foreach ($m in $Markers) {
            if ($cmd -like "*$m*") {
                Write-Host "stopping pid=$($p.ProcessId) ($($p.Name))"
                Stop-Process -Id $p.ProcessId -Force -ErrorAction SilentlyContinue
                $Killed++
                break
            }
        }
    }
}

# Also kill anything listening on the campusflow ports.
$ports = @(8080, 50051, 50052, 50053, 50054, 50055, 3000)
foreach ($port in $ports) {
    try {
        $owners = (Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue).OwningProcess |
            Where-Object { $_ -ne $null } | Select-Object -Unique
        foreach ($owner in $owners) {
            Write-Host "stopping pid=$owner (port $port)"
            Stop-Process -Id $owner -Force -ErrorAction SilentlyContinue
            $Killed++
        }
    } catch {}
}

if ($Killed -eq 0) {
    Write-Host "No CampusFlow processes found." -ForegroundColor DarkGray
} else {
    Write-Host "Stopped $Killed process(es)." -ForegroundColor Green
}
