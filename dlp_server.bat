@echo off
setlocal enabledelayedexpansion
chcp 65001 >nul 2>&1

set "SCRIPT_DIR=%~dp0"
cd /d "%SCRIPT_DIR%"

:: Enable ANSI via registry
reg add HKCU\Console /v VirtualTerminalLevel /t REG_DWORD /d 1 /f >nul 2>&1

:: Restore missing tracked files if deleted locally
if not exist "requirements.txt" git checkout -- requirements.txt >nul 2>&1
if not exist "server.py" git checkout -- server.py >nul 2>&1
if not exist "setup_startup.bat" git checkout -- setup_startup.bat >nul 2>&1
if not exist "Exten\manifest.json" git checkout -- Exten\manifest.json >nul 2>&1
if not exist "Exten\background.js" git checkout -- Exten\background.js >nul 2>&1
if not exist "Exten\content.js" git checkout -- Exten\content.js >nul 2>&1

:: Get ESC character for colors
for /f %%A in ('echo prompt $E ^| cmd') do set "ESC=%%A"
set "cyan=!ESC![96m"
set "bold=!ESC![1m"
set "magenta=!ESC![95m"
set "blue=!ESC![94m"
set "dim=!ESC![90m"
set "red=!ESC![91m"
set "green=!ESC![92m"
set "white=!ESC![97m"
set "yellow=!ESC![93m"
set "reset=!ESC![0m"

title MediaDown Server
mode con cols=62 lines=30

cls
echo.
echo   %cyan%%bold%+======================================================+%reset%
echo   %cyan%%bold%^|%reset%                                                      %cyan%%bold%^|%reset%
echo   %cyan%%bold%^|%reset%        %magenta%%bold%M E D I A   D O W N%reset%                        %cyan%%bold%^|%reset%
echo   %cyan%%bold%^|%reset%        %dim%---- Download Server ----%reset%                    %cyan%%bold%^|%reset%
echo   %cyan%%bold%^|%reset%                                                      %cyan%%bold%^|%reset%
echo   %cyan%%bold%+======================================================+%reset%
echo.

if not exist ".venv\Scripts\pythonw.exe" (
    echo.
    echo   %red%%bold%  X ERROR%reset%  Virtual environment not found.
    echo   %dim%  Run setup_startup.bat first to set up.%reset%
    echo.
    pause
    exit /b 1
)

echo   %white%%bold%+--------------------------------------------------+%reset%
echo   %white%%bold%^|%reset%  %cyan%~%reset%  Checking for updates...                       %white%%bold%^|%reset%
echo   %white%%bold%+--------------------------------------------------+%reset%
echo.

<nul set /p "=  %dim% [1/3]%reset% Contacting GitHub...  "
git fetch origin master >nul 2>&1
if %errorlevel% neq 0 (
    echo %yellow%FAILED%reset%
    echo.
    echo   %yellow%  ! Could not reach GitHub.%reset%
    echo   %dim%    Starting with current version.%reset%
    echo.
    >nul ping -n 3 127.0.0.1
    goto :start_server
)
echo %green%OK%reset%

<nul set /p "=  %dim% [2/3]%reset% Comparing versions...  "
for /f %%A in ('git rev-parse HEAD') do set "LOCAL_HEAD=%%A"
for /f %%A in ('git rev-parse origin/master') do set "REMOTE_HEAD=%%A"

set "LOCAL_SHORT=!LOCAL_HEAD:~0,7!"
set "REMOTE_SHORT=!REMOTE_HEAD:~0,7!"

if "!LOCAL_HEAD!"=="!REMOTE_HEAD!" (
    echo %green%OK%reset%
    echo.
    echo   %green%%bold%+--------------------------------------------------+%reset%
    echo   %green%%bold%^|%reset%  %green%%bold%V  Up to date!%reset%   %dim%version: !LOCAL_SHORT!%reset%              %green%%bold%^|%reset%
    echo   %green%%bold%+--------------------------------------------------+%reset%
    echo.
    >nul ping -n 2 127.0.0.1
    goto :start_server
)
echo %yellow%UPDATE AVAILABLE%reset%
echo.
echo   %yellow%    Local:   %white%!LOCAL_SHORT!%reset%
echo   %yellow%    Remote:  %white%!REMOTE_SHORT!%reset%
echo.

echo   %cyan%%bold%+--------------------------------------------------+%reset%
echo   %cyan%%bold%^|%reset%  %cyan%[1m↓  Downloading update...%reset%                        %cyan%%bold%^|%reset%
echo   %cyan%%bold%+--------------------------------------------------+%reset%
echo.

<nul set /p "=  %dim% [3/3]%reset% Pulling latest code... "
git pull origin master >nul 2>&1
if %errorlevel% neq 0 (
    echo %red%FAILED%reset%
    echo.
    echo   %red%  X  Pull failed.%reset% Starting with current version.
    echo.
    >nul ping -n 3 127.0.0.1
    goto :start_server
)
echo %green%OK%reset%

echo.
echo   %dim%  Updating dependencies...%reset%
echo.
<nul set /p "=   "
for /l %%B in (1,1,30) do (
    <nul set /p "=%cyan%=%reset%"
    >nul ping -n 1 -w 30 127.0.0.1
)
echo.
echo.

".venv\Scripts\pip.exe" install --upgrade -r requirements.txt --quiet >nul 2>&1
echo   %green%  V%reset%  Dependencies updated.
echo.

for /f "delims=" %%M in ('git log -1 --pretty^=format:"%%s"') do set "LAST_MSG=%%M"

echo   %green%%bold%+--------------------------------------------------+%reset%
echo   %green%%bold%^|%reset%  %green%%bold%V  Update complete!%reset%                              %green%%bold%^|%reset%
echo   %green%%bold%^|%reset%  %dim%!LAST_MSG:~0,44!%reset%  %green%%bold%^|%reset%
echo   %green%%bold%+--------------------------------------------------+%reset%
echo.
>nul ping -n 4 127.0.0.1

:start_server
cls
echo.
echo   %cyan%%bold%+======================================================+%reset%
echo   %cyan%%bold%^|%reset%                                                      %cyan%%bold%^|%reset%
echo   %cyan%%bold%^|%reset%        %magenta%%bold%M E D I A   D O W N%reset%                        %cyan%%bold%^|%reset%
echo   %cyan%%bold%^|%reset%        %dim%---- Download Server ----%reset%                    %cyan%%bold%^|%reset%
echo   %cyan%%bold%^|%reset%                                                      %cyan%%bold%^|%reset%
echo   %cyan%%bold%+======================================================+%reset%
echo.
echo.
echo   %green%%bold%  # SERVER RUNNING%reset%
echo.
echo   %white%  Port:%reset%     %cyan%8000%reset%
echo   %white%  Status:%reset%   %green%Active%reset%

for /f %%A in ('git rev-parse --short HEAD 2^>nul') do set "CUR_VER=%%A"
if defined CUR_VER (
    echo   %white%  Version:%reset%  %dim%!CUR_VER!%reset%
)

echo.
echo   %dim%--------------------------------------------------%reset%
echo   %dim%  Press Ctrl+C or close this window to stop.%reset%
echo   %dim%--------------------------------------------------%reset%
echo.

".venv\Scripts\python.exe" server.py
exit
