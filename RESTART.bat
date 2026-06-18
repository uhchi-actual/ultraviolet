@echo off
cd /d "%~dp0"
echo Stopping anything on ports 8000 and 3000...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":8000" ^| findstr LISTENING') do taskkill /F /PID %%a 2>nul
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3000" ^| findstr LISTENING') do taskkill /F /PID %%a 2>nul
timeout /t 2 /nobreak >nul
echo Starting Ultraviolet...
call npm run dev
