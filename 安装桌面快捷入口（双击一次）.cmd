@echo off
chcp 65001 >nul
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0install-desktop-shortcut.ps1"
set "INSTALL_EXIT=%ERRORLEVEL%"

if not "%INSTALL_EXIT%"=="0" (
  echo.
  echo Installation failed. Please send this window to Codex.
) else (
  echo.
  echo Installed successfully. Open "Echo English" from your desktop.
)

if defined ECHO_ENGLISH_NO_PAUSE exit /b %INSTALL_EXIT%
pause
exit /b %INSTALL_EXIT%
