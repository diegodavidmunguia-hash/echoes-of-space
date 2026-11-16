@echo off
title Respaldar Echoes of Space
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Falta Node.js. Se abrira la pagina para instalarlo: descarga la version LTS, instalala y vuelve a abrir este archivo.
  start https://nodejs.org
  pause
  exit /b
)
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0cloudflare\respaldar.ps1"
echo.
pause
