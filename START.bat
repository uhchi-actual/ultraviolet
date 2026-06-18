@echo off
cd /d "%~dp0"
title Ultraviolet
echo.
echo  Starting Ultraviolet (backend + website)...
echo  Open http://localhost:3000 when ready
echo  Press Ctrl+C to stop both servers
echo.
call npm run dev
pause
