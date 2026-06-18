# Ultraviolet frontend - website on port 3000
$ErrorActionPreference = "SilentlyContinue"

$pids = Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique
foreach ($p in $pids) { Stop-Process -Id $p -Force -ErrorAction SilentlyContinue }

Start-Sleep -Seconds 2
Set-Location "D:\projects\ultraviolet\frontend"

Write-Host ""
Write-Host "WEBSITE at http://localhost:3000"
Write-Host "Keep this window open."
Write-Host ""

npm run dev
