# Local dev server for DSA Mastery Tracker
# Node server: static files + POST /api/teach Gemini proxy
# Fallback: Python static-only (no API proxy)

$port = if ($env:PORT) { [int]$env:PORT } else { 8080 }
$root = $PSScriptRoot
$nodeDir = "C:\Program Files\nodejs"

function Import-DotEnv {
    param([string]$Path)
    if (-not (Test-Path $Path)) { return }
    Get-Content $Path | ForEach-Object {
        $line = $_.Trim()
        if (-not $line -or $line.StartsWith("#")) { return }
        if ($line -match "^([^=]+)=(.*)$") {
            $name = $Matches[1].Trim()
            $value = $Matches[2].Trim().Trim('"').Trim("'")
            if (-not [string]::IsNullOrWhiteSpace($name)) {
                Set-Item -Path "env:$name" -Value $value
            }
        }
    }
}

function Get-PortOwnerPids {
    param([int]$Port)
    $pids = @()
    $lines = netstat -ano | Select-String ":$Port\s" | Select-String "LISTENING"
    foreach ($line in $lines) {
        if ($line -match "\s+(\d+)\s*$") {
            $pids += [int]$Matches[1]
        }
    }
    return $pids | Select-Object -Unique
}

function Stop-PortListeners {
    param([int]$Port)
    $pids = Get-PortOwnerPids -Port $Port
    foreach ($pid in $pids) {
        if ($pid -le 0) { continue }
        try {
            $proc = Get-Process -Id $pid -ErrorAction Stop
            Write-Host "  Stopping $($proc.ProcessName) (PID $pid) on port $Port..." -ForegroundColor DarkGray
            Stop-Process -Id $pid -Force -ErrorAction Stop
        } catch {
            # Process may have already exited
        }
    }
    if ($pids.Count -gt 0) {
        Start-Sleep -Milliseconds 500
    }
}

Write-Host ""
Write-Host "  DSA Mastery Tracker" -ForegroundColor Cyan

Set-Location $root

Import-DotEnv -Path (Join-Path $root ".env")

$existing = Get-PortOwnerPids -Port $port
if ($existing.Count -gt 0) {
    Write-Host "  Port $port is in use - stopping old dev server(s)..." -ForegroundColor Yellow
    Stop-PortListeners -Port $port
}

$nodeExe = $null
$npmCmd = $null

$nodeCmd = Get-Command node -ErrorAction SilentlyContinue
if ($nodeCmd) {
    $nodeExe = $nodeCmd.Source
    $npmCmd = (Get-Command npm -ErrorAction SilentlyContinue).Source
}
elseif (Test-Path "$nodeDir\node.exe") {
    $nodeExe = "$nodeDir\node.exe"
    $npmCmd = "$nodeDir\npm.cmd"
}

if ($null -ne $nodeExe) {
    if (-not (Test-Path "$root\node_modules\express")) {
        Write-Host "  Installing dependencies..." -ForegroundColor DarkGray
        if ($npmCmd) {
            & $npmCmd install
        } else {
            npm install
        }
    }

    if ($env:GEMINI_API_KEY) {
        Write-Host "  Gemini API: configured (from .env or environment)" -ForegroundColor Green
    } else {
        Write-Host "  Warning: GEMINI_API_KEY is not set - /api/teach will fail until you set it." -ForegroundColor Yellow
        Write-Host '  Add it to .env or run: $env:GEMINI_API_KEY = "your-key"' -ForegroundColor DarkGray
    }

    Write-Host "  Serving at: http://localhost:$port" -ForegroundColor Green
    Write-Host "  API proxy:  POST /api/teach" -ForegroundColor Green
    Write-Host "  Press Ctrl+C to stop" -ForegroundColor DarkGray
    Write-Host ""

    $env:PORT = $port
    & $nodeExe server/index.js
}
else {
    Write-Host "  Node.js not found - falling back to Python static server." -ForegroundColor Yellow
    Write-Host "  /api/teach unavailable. Install Node.js 18+ for the AI tutor." -ForegroundColor Yellow
    Write-Host "  Serving at: http://localhost:$port" -ForegroundColor Green
    Write-Host "  Press Ctrl+C to stop" -ForegroundColor DarkGray
    Write-Host ""

    py -m http.server $port
}