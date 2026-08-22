# Start Headroom's Cursor wrap (local proxy + printed base URLs).
# Leave this window open while using BYOK models through Headroom.
# MCP tools work without this script — see context/HEADROOM.md.

$ErrorActionPreference = "Stop"
$headroom = Join-Path $env:USERPROFILE ".local\bin\headroom.exe"

if (-not (Test-Path $headroom)) {
    Write-Error "Headroom CLI not found at $headroom. Install with: uv tool install --python 3.13 `"headroom-ai[all]`""
}

# --memory keeps a per-project SQLite store. Do not pass --learn here:
# live learning can write into AGENTS.md. Opt in with: --learn
& $headroom wrap cursor --memory @args
