@echo off
setlocal
set "PORT=3000"
title UH Student Center Room Booking
cd /d "%~dp0myapp"
if errorlevel 1 goto failed

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is required. Install Node.js, then open this file again.
  goto failed
)

if not exist "node_modules\express\package.json" (
  echo Installing project dependencies...
  call npm.cmd install
  if errorlevel 1 goto failed
)

echo.
echo Open http://localhost:3000 in your browser once the server starts.
echo Keep this window open while using the app.
echo Press Ctrl+C to stop the server when finished.
echo.
call npm.cmd start
if errorlevel 1 goto failed
exit /b 0

:failed
echo.
echo The server could not start. Check the message above.
echo If port 3000 is already in use, the app may already be running.
pause
exit /b 1
