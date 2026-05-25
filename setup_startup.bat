@echo off
setlocal enabledelayedexpansion
title DLP Server Setup ^& Startup

:: Force Current Directory
cd /d "%~dp0"
set "PROJECT_DIR=%~dp0"
set "BAT_PATH=%PROJECT_DIR%dlp_server.bat"
set "STARTUP_FOLDER=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"

:: Restore missing tracked files if deleted locally
if not exist "%PROJECT_DIR%requirements.txt" git checkout -- "%PROJECT_DIR%requirements.txt" >nul 2>&1
if not exist "%PROJECT_DIR%server.py" git checkout -- "%PROJECT_DIR%server.py" >nul 2>&1
if not exist "%PROJECT_DIR%dlp_server.bat" git checkout -- "%PROJECT_DIR%dlp_server.bat" >nul 2>&1

echo ============================================
echo        DLP Server - First Time Setup
echo ============================================
echo.

echo [1/5] Checking Python installation...
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Python not found. Please install Python and try again.
    pause
    exit /b 1
)
echo        OK

echo [2/5] Checking FFmpeg ^& FFprobe...
set "FFMPEG_FOUND=0"

:: Check if ffmpeg and ffprobe exist in the project directory
if exist "%PROJECT_DIR%ffmpeg.exe" if exist "%PROJECT_DIR%ffprobe.exe" (
    echo        Found in project directory.
    set "FFMPEG_FOUND=1"
)

:: If not in project dir, check system PATH
if "!FFMPEG_FOUND!"=="0" (
    where ffmpeg >nul 2>&1
    if !errorlevel! equ 0 (
        where ffprobe >nul 2>&1
        if !errorlevel! equ 0 (
            echo        Found on system PATH.
            set "FFMPEG_FOUND=1"
        )
    )
)

:: If still not found, download it
if "!FFMPEG_FOUND!"=="0" (
    echo        FFmpeg not found. Downloading...
    set "FFMPEG_URL=https://www.gyan.dev/ffmpeg/builds/ffmpeg-release-essentials.zip"
    set "FFMPEG_ZIP=%PROJECT_DIR%ffmpeg_temp.zip"
    set "FFMPEG_EXTRACT=%PROJECT_DIR%ffmpeg_temp"

    echo        Downloading from gyan.dev ^(this may take a minute^)...
    powershell -Command "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; Invoke-WebRequest -Uri '!FFMPEG_URL!' -OutFile '!FFMPEG_ZIP!'"
    if !errorlevel! neq 0 (
        echo [ERROR] Failed to download FFmpeg. Please download manually:
        echo         !FFMPEG_URL!
        echo         Place ffmpeg.exe and ffprobe.exe in: %PROJECT_DIR%
        pause
        exit /b 1
    )

    echo        Extracting...
    powershell -Command "Expand-Archive -Path '!FFMPEG_ZIP!' -DestinationPath '!FFMPEG_EXTRACT!' -Force"
    if !errorlevel! neq 0 (
        echo [ERROR] Failed to extract FFmpeg archive.
        del /q "!FFMPEG_ZIP!" 2>nul
        pause
        exit /b 1
    )

    :: Find and copy ffmpeg.exe and ffprobe.exe from the extracted folder
    for /r "!FFMPEG_EXTRACT!" %%F in (ffmpeg.exe) do (
        copy /y "%%F" "%PROJECT_DIR%ffmpeg.exe" >nul
    )
    for /r "!FFMPEG_EXTRACT!" %%F in (ffprobe.exe) do (
        copy /y "%%F" "%PROJECT_DIR%ffprobe.exe" >nul
    )

    :: Clean up temp files
    del /q "!FFMPEG_ZIP!" 2>nul
    rmdir /s /q "!FFMPEG_EXTRACT!" 2>nul

    :: Verify extraction succeeded
    if exist "%PROJECT_DIR%ffmpeg.exe" if exist "%PROJECT_DIR%ffprobe.exe" (
        echo        SUCCESS: FFmpeg installed to project directory.
    ) else (
        echo [ERROR] FFmpeg extraction failed. Please download manually:
        echo         https://www.gyan.dev/ffmpeg/builds/
        echo         Place ffmpeg.exe and ffprobe.exe in: %PROJECT_DIR%
        pause
        exit /b 1
    )
)

echo [3/5] Setting up Virtual Environment...
if not exist ".venv" (
    python -m venv .venv
    echo        Created new virtual environment.
) else (
    echo        Virtual environment already exists.
)

echo [4/5] Installing / Updating libraries...
if exist "%PROJECT_DIR%requirements.txt" (
    "%PROJECT_DIR%.venv\Scripts\python.exe" -m pip install --upgrade pip >nul 2>&1
    "%PROJECT_DIR%.venv\Scripts\pip.exe" install --upgrade -r "%PROJECT_DIR%requirements.txt"
) else (
    echo [WARNING] requirements.txt not found at %PROJECT_DIR%requirements.txt. Skipping library installation.
)

echo [5/5] Adding to Windows Startup...
:: Use PowerShell to create a shortcut in the Startup folder
powershell -Command "$s=(New-Object -COM WScript.Shell).CreateShortcut('%STARTUP_FOLDER%\dlp_server.lnk');$s.TargetPath='%BAT_PATH%';$s.WorkingDirectory='%PROJECT_DIR%';$s.Save()"
if %errorlevel% equ 0 (
    echo        SUCCESS: Added to Windows Startup.
) else (
    echo [ERROR] Failed to add to Startup. Please run this script as Administrator.
)

echo.
echo ============================================
echo   Setup Complete!
echo   The server will now start automatically
echo   whenever your PC boots up.
echo   Run 'dlp_server.bat' to start manually.
echo ============================================
echo.
set /p START_NOW="Would you like to start the server now? (y/n): "
if /i "%START_NOW%"=="y" (
    start "" ".venv\Scripts\pythonw.exe" server.py
    echo [STARTED] dlp_server is running in the background.
)
pause

