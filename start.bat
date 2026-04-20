@echo off
REM ─────────────────────────────────────────────────────────────
REM  TORII  —  Japan Market Research Hub
REM  Launcher for Windows
REM ─────────────────────────────────────────────────────────────

cd /d "%~dp0"

REM Check Node is installed
where node >nul 2>&1
if %ERRORLEVEL% neq 0 (
  echo ERROR: Node.js not found. Please install from https://nodejs.org ^(v18 or newer^)
  pause
  exit /b 1
)

REM Install deps if needed
if not exist "node_modules" (
  echo Installing dependencies, please wait...
  call npm install
)

echo.
echo   TORII - Japan Market Research Hub
echo   -----------------------------------
echo   Opening at: http://localhost:5000
echo.

REM Open browser after short delay
timeout /t 2 /nobreak >nul
start "" "http://localhost:5000"

REM Start dev server
call npm run dev
