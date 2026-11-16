@echo off
title Activar inicio de sesion con GitHub
cd /d "%~dp0"
echo Pega el Client ID de GitHub y presiona Enter:
call npx --yes wrangler@4 secret put GITHUB_CLIENT_ID
echo.
echo Pega el Client secret de GitHub y presiona Enter:
call npx --yes wrangler@4 secret put GITHUB_CLIENT_SECRET
echo.
echo Listo. Ya puedes iniciar sesion con GitHub en tu pagina.
pause
