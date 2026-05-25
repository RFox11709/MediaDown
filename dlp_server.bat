@echo off
setlocal enabledelayedexpansion
set "SCRIPT_DIR=%~dp0"
cd /d "%SCRIPT_DIR%"

if not exist ".venv\Scripts\pythonw.exe" (
    echo [ERROR] Virtual environment missing. Please run setup_startup.bat first.
    pause
    exit
)

:: --- Auto-Update from GitHub ---
echo [UPDATE] Checking for updates...
git fetch origin master >nul 2>&1
if %errorlevel% neq 0 (
    echo [UPDATE] Could not reach GitHub. Starting with current version.
    goto :start_server
)

:: Compare local HEAD with remote
for /f %%A in ('git rev-parse HEAD') do set "LOCAL_HEAD=%%A"
for /f %%A in ('git rev-parse origin/master') do set "REMOTE_HEAD=%%A"

if "!LOCAL_HEAD!"=="!REMOTE_HEAD!" (
    echo [UPDATE] Already up to date.
    goto :start_server
)

echo [UPDATE] New version found! Updating...
git pull origin master
if %errorlevel% neq 0 (
    echo [UPDATE] Pull failed. Starting with current version.
    goto :start_server
)

:: Re-install dependencies in case requirements.txt changed
echo [UPDATE] Updating dependencies...
".venv\Scripts\pip.exe" install --upgrade -r requirements.txt --quiet
echo [UPDATE] Updated successfully.

:start_server
echo [STARTED] dlp_server is starting in the background...
start "" ".venv\Scripts\pythonw.exe" server.py
exit

