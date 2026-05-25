@echo off
set "SCRIPT_DIR=%~dp0"
cd /d "%SCRIPT_DIR%"

if not exist ".venv\Scripts\pythonw.exe" (
    echo [ERROR] Virtual environment missing. Please run setup_startup.bat first.
    pause
    exit
)

echo [STARTED] dlp_server is starting in the background...
start "" ".venv\Scripts\pythonw.exe" server.py
exit
