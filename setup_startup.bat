@echo off
setlocal enabledelayedexpansion
title DLP Server Setup & Startup

:: Force Current Directory
cd /d "%~dp0"
set "PROJECT_DIR=%~dp0"
set "BAT_PATH=%PROJECT_DIR%dlp_server.bat"
set "STARTUP_FOLDER=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"

echo [1/4] Checking Python installation...
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Python not found. Please install Python and try again.
    pause
    exit /b 1
)

echo [2/4] Setting up Virtual Environment...
if not exist ".venv" (
    python -m venv .venv
    echo Created new virtual environment.
) else (
    echo Virtual environment already exists.
)

echo [3/4] Installing / Updating libraries...
if exist "requirements.txt" (
    ".venv\Scripts\python.exe" -m pip install --upgrade pip
    ".venv\Scripts\pip.exe" install --upgrade -r requirements.txt
) else (
    echo [WARNING] requirements.txt not found. Skipping library installation.
)

echo [4/4] Adding to Windows Startup...
:: Use PowerShell to create a shortcut in the Startup folder
powershell -Command "$s=(New-Object -COM WScript.Shell).CreateShortcut('%STARTUP_FOLDER%\dlp_server.lnk');$s.TargetPath='%BAT_PATH%';$s.WorkingDirectory='%PROJECT_DIR%';$s.Save()"
if %errorlevel% equ 0 (
    echo SUCCESS: Added to Windows Startup.
) else (
    echo [ERROR] Failed to add to Startup. Please run this script as Administrator.
)

echo.
echo ============================================
echo Setup Complete! 
echo The server will now start automatically whenever your PC boots up.
echo You can also run 'dlp_server.bat' to start it manually.
echo ============================================
echo.
set /p START_NOW="Would you like to start the server now? (y/n): "
if /i "%START_NOW%"=="y" (
    start "" ".venv\Scripts\pythonw.exe" server.py
    echo [STARTED] dlp_server is running in the background.
)
pause

