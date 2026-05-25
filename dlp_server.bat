@echo off
setlocal enabledelayedexpansion
chcp 65001 >nul 2>&1

set "SCRIPT_DIR=%~dp0"
cd /d "%SCRIPT_DIR%"

:: ── ANSI Color Codes ──
for /f %%A in ('echo prompt $E ^| cmd') do set "ESC=%%A"
set "RESET=%ESC%[0m"
set "BOLD=%ESC%[1m"
set "DIM=%ESC%[90m"
set "WHITE=%ESC%[97m"
set "CYAN=%ESC%[96m"
set "GREEN=%ESC%[92m"
set "YELLOW=%ESC%[93m"
set "RED=%ESC%[91m"
set "MAGENTA=%ESC%[95m"
set "BG_DARK=%ESC%[48;2;30;30;46m"
set "BLUE=%ESC%[94m"

:: ── Window Setup ──
title MediaDown Server
mode con cols=62 lines=32
color 0F

cls
echo.
echo   %CYAN%%BOLD%╔══════════════════════════════════════════════════════╗%RESET%
echo   %CYAN%%BOLD%║%RESET%                                                      %CYAN%%BOLD%║%RESET%
echo   %CYAN%%BOLD%║%RESET%   %MAGENTA%%BOLD%███╗   ███╗%CYAN%╔═╗%MAGENTA%╔╦╗%CYAN%╦╔═╗  %BLUE%%BOLD%╔╦╗╔═╗╦ ╦╔╗╔%RESET%        %CYAN%%BOLD%║%RESET%
echo   %CYAN%%BOLD%║%RESET%   %MAGENTA%%BOLD%████╗ ████║%CYAN%║╣ %MAGENTA% ║║%CYAN%║╠═╣  %BLUE%%BOLD% ║║║ ║║║║║║║%RESET%        %CYAN%%BOLD%║%RESET%
echo   %CYAN%%BOLD%║%RESET%   %MAGENTA%%BOLD%██╔████╔██║%CYAN%╚═╝%MAGENTA%═╩╝%CYAN%╩╩ ╩  %BLUE%%BOLD%═╩╝╚═╝╚╩╝╝╚╝%RESET%        %CYAN%%BOLD%║%RESET%
echo   %CYAN%%BOLD%║%RESET%                                                      %CYAN%%BOLD%║%RESET%
echo   %CYAN%%BOLD%║%RESET%          %DIM%── Video Download Server ──%RESET%               %CYAN%%BOLD%║%RESET%
echo   %CYAN%%BOLD%║%RESET%                                                      %CYAN%%BOLD%║%RESET%
echo   %CYAN%%BOLD%╚══════════════════════════════════════════════════════╝%RESET%
echo.

:: ── Preflight Check ──
if not exist ".venv\Scripts\pythonw.exe" (
    echo   %RED%%BOLD% ✘ ERROR%RESET%  Virtual environment not found.
    echo   %DIM%  Run setup_startup.bat first.%RESET%
    echo.
    pause
    exit
)

:: ══════════════════════════════════════════════════════════
::                    UPDATE CHECK
:: ══════════════════════════════════════════════════════════

echo   %WHITE%%BOLD%┌──────────────────────────────────────────────────┐%RESET%
echo   %WHITE%%BOLD%│%RESET%  %CYAN%⟳%RESET%  Checking for updates...                       %WHITE%%BOLD%│%RESET%
echo   %WHITE%%BOLD%└──────────────────────────────────────────────────┘%RESET%
echo.

:: ── Step 1: Fetch ──
echo   %DIM%  [1/3]%RESET% Contacting GitHub...

git fetch origin master >nul 2>&1
if %errorlevel% neq 0 (
    echo   %YELLOW%  ⚠  Could not reach GitHub.%RESET%
    echo   %DIM%     Starting with current version.%RESET%
    echo.
    timeout /t 2 /nobreak >nul
    goto :start_server
)
echo   %GREEN%  ✓%RESET%  Connected to repository.
echo.

:: ── Step 2: Compare Versions ──
echo   %DIM%  [2/3]%RESET% Comparing versions...

for /f %%A in ('git rev-parse HEAD') do set "LOCAL_HEAD=%%A"
for /f %%A in ('git rev-parse origin/master') do set "REMOTE_HEAD=%%A"

:: Get short hashes for display
set "LOCAL_SHORT=!LOCAL_HEAD:~0,7!"
set "REMOTE_SHORT=!REMOTE_HEAD:~0,7!"

if "!LOCAL_HEAD!"=="!REMOTE_HEAD!" (
    echo   %GREEN%  ✓%RESET%  Already on latest version %DIM%(%LOCAL_SHORT%)%RESET%
    echo.
    echo   %GREEN%%BOLD%┌──────────────────────────────────────────────────┐%RESET%
    echo   %GREEN%%BOLD%│%RESET%  %GREEN%✓  No updates needed.%RESET%                            %GREEN%%BOLD%│%RESET%
    echo   %GREEN%%BOLD%└──────────────────────────────────────────────────┘%RESET%
    echo.
    timeout /t 1 /nobreak >nul
    goto :start_server
)

:: ── Update Available! ──
echo   %YELLOW%  ⚠%RESET%  Update available!
echo   %DIM%     Local:  %LOCAL_SHORT%  →  Remote: %REMOTE_SHORT%%RESET%
echo.

echo   %CYAN%%BOLD%┌──────────────────────────────────────────────────┐%RESET%
echo   %CYAN%%BOLD%│%RESET%  %CYAN%↓  Downloading update...%RESET%                          %CYAN%%BOLD%│%RESET%
echo   %CYAN%%BOLD%└──────────────────────────────────────────────────┘%RESET%
echo.

:: ── Progress Bar: Git Pull ──
echo   %DIM%  [3/3]%RESET% Pulling latest changes...
echo.
call :progress_bar 20 "Downloading code"

git pull origin master >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo   %RED%  ✘  Pull failed.%RESET% Starting with current version.
    echo.
    timeout /t 2 /nobreak >nul
    goto :start_server
)

call :progress_bar_finish
echo   %GREEN%  ✓%RESET%  Code updated successfully.
echo.

:: ── Update Dependencies ──
echo   %DIM%     %RESET%Updating dependencies...
echo.
call :progress_bar 30 "Installing packages"

".venv\Scripts\pip.exe" install --upgrade -r requirements.txt --quiet >nul 2>&1

call :progress_bar_finish
echo   %GREEN%  ✓%RESET%  Dependencies updated.
echo.

:: Get the latest commit message for display
for /f "delims=" %%M in ('git log -1 --pretty^=format:"%%s"') do set "LAST_MSG=%%M"

echo   %GREEN%%BOLD%┌──────────────────────────────────────────────────┐%RESET%
echo   %GREEN%%BOLD%│%RESET%  %GREEN%✓  Update complete!%RESET%                                %GREEN%%BOLD%│%RESET%
echo   %GREEN%%BOLD%│%RESET%  %DIM%Latest: !LAST_MSG:~0,44!%RESET%  %GREEN%%BOLD%│%RESET%
echo   %GREEN%%BOLD%└──────────────────────────────────────────────────┘%RESET%
echo.
timeout /t 2 /nobreak >nul

:: ══════════════════════════════════════════════════════════
::                   START SERVER
:: ══════════════════════════════════════════════════════════

:start_server
cls
echo.
echo   %CYAN%%BOLD%╔══════════════════════════════════════════════════════╗%RESET%
echo   %CYAN%%BOLD%║%RESET%                                                      %CYAN%%BOLD%║%RESET%
echo   %CYAN%%BOLD%║%RESET%   %MAGENTA%%BOLD%███╗   ███╗%CYAN%╔═╗%MAGENTA%╔╦╗%CYAN%╦╔═╗  %BLUE%%BOLD%╔╦╗╔═╗╦ ╦╔╗╔%RESET%        %CYAN%%BOLD%║%RESET%
echo   %CYAN%%BOLD%║%RESET%   %MAGENTA%%BOLD%████╗ ████║%CYAN%║╣ %MAGENTA% ║║%CYAN%║╠═╣  %BLUE%%BOLD% ║║║ ║║║║║║║%RESET%        %CYAN%%BOLD%║%RESET%
echo   %CYAN%%BOLD%║%RESET%   %MAGENTA%%BOLD%██╔████╔██║%CYAN%╚═╝%MAGENTA%═╩╝%CYAN%╩╩ ╩  %BLUE%%BOLD%═╩╝╚═╝╚╩╝╝╚╝%RESET%        %CYAN%%BOLD%║%RESET%
echo   %CYAN%%BOLD%║%RESET%                                                      %CYAN%%BOLD%║%RESET%
echo   %CYAN%%BOLD%╚══════════════════════════════════════════════════════╝%RESET%
echo.
echo.
echo   %GREEN%%BOLD%  ● SERVER RUNNING%RESET%
echo.
echo   %WHITE%  Port:%RESET%     %CYAN%8000%RESET%
echo   %WHITE%  Status:%RESET%   %GREEN%Active%RESET%

:: Get current version hash
for /f %%A in ('git rev-parse --short HEAD 2^>nul') do set "CUR_VER=%%A"
if defined CUR_VER (
    echo   %WHITE%  Version:%RESET%  %DIM%!CUR_VER!%RESET%
)

echo.
echo   %DIM%──────────────────────────────────────────────────%RESET%
echo   %DIM%  Press Ctrl+C or close this window to stop.%RESET%
echo   %DIM%──────────────────────────────────────────────────%RESET%
echo.

:: Start server in foreground so window stays open with status
".venv\Scripts\python.exe" server.py
exit

:: ══════════════════════════════════════════════════════════
::                   HELPER FUNCTIONS
:: ══════════════════════════════════════════════════════════

:progress_bar
:: Usage: call :progress_bar <steps> "label"
set "PB_STEPS=%~1"
set "PB_LABEL=%~2"
set "PB_FILL="
set "PB_EMPTY="

:: Build empty bar
set "PB_BAR=░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░"
set "PB_DONE=██████████████████████████████"

set /a "PB_I=0"
:pb_loop
if !PB_I! geq 30 goto :pb_done_loop

set /a "PB_FILLED=(!PB_I! * 30) / 30"
set "PB_CUR_FILL=!PB_DONE:~0,%PB_I%!"
set /a "PB_REM=30 - !PB_I!"
set "PB_CUR_EMPTY=!PB_BAR:~0,%PB_REM%!"
set /a "PB_PCT=(!PB_I! * 100) / 30"

<nul set /p "=   %CYAN%  !PB_CUR_FILL!!DIM!!PB_CUR_EMPTY!%RESET%  !PB_PCT!%%  %DIM%!PB_LABEL!%RESET%    %ESC%[0G"

set /a "PB_DELAY=%~1"
if !PB_DELAY! gtr 50 set "PB_DELAY=50"

:: Tiny delay for animation
ping -n 1 -w !PB_DELAY! 127.0.0.1 >nul 2>&1

set /a "PB_I+=1"
goto :pb_loop

:pb_done_loop
goto :eof

:progress_bar_finish
<nul set /p "=   %GREEN%  ██████████████████████████████%RESET%  100%%  %GREEN%Done%RESET%              %ESC%[0G"
echo.
goto :eof
