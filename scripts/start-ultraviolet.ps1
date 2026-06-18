# Opens backend + frontend in two windows
Write-Host "Starting Ultraviolet..."
Write-Host "Website will be at http://localhost:3000"
Write-Host ""

Start-Process powershell -ArgumentList "-NoExit", "-ExecutionPolicy", "Bypass", "-File", "D:\projects\ultraviolet\scripts\start-backend.ps1"
Start-Sleep -Seconds 4
Start-Process powershell -ArgumentList "-NoExit", "-ExecutionPolicy", "Bypass", "-File", "D:\projects\ultraviolet\scripts\start-frontend.ps1"

Write-Host "Two windows opened. Wait 10 seconds then open http://localhost:3000"
