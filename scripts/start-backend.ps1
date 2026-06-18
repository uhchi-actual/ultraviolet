# Ultraviolet backend - API on port 8000
$ErrorActionPreference = "SilentlyContinue"
$backend = "D:\projects\ultraviolet\backend"

$env:TORCH_HOME = "D:\ultraviolet-data\torch"
$env:HF_HOME = "D:\ultraviolet-data\huggingface"
$env:STEM_CACHE_DIR = "D:\ultraviolet-data\stems"
$env:CATALOG_DIR = "D:\ultraviolet-data\catalog"
$env:SESSION_DIR = "D:\ultraviolet-data\sessions"

$pids = Get-NetTCPConnection -LocalPort 8000 -State Listen -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique
foreach ($p in $pids) { Stop-Process -Id $p -Force -ErrorAction SilentlyContinue }

Start-Sleep -Seconds 2
Set-Location $backend

Write-Host ""
Write-Host "BACKEND running at http://127.0.0.1:8000"
Write-Host "Website is at http://localhost:3000 (run start-frontend.ps1 in another window)"
Write-Host "Keep this window open."
Write-Host ""

& "$backend\.venv\Scripts\uvicorn.exe" src.main:app --host 127.0.0.1 --port 8000
