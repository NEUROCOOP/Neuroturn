@echo off
title NeuroTurn v2.2 - Servidor
color 0A
cls

echo.
echo ================================================
echo   NEUROTURN v2.2 - SISTEMA DE TURNOS MEDICOS
echo ================================================
echo.

cd /d "%~dp0"

REM Verificar Node.js
node -v >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js no esta instalado.
    echo Descargalo desde: https://nodejs.org/
    echo.
    pause
    exit /b 1
)

REM Cerrar instancia previa si existe
taskkill /F /IM node.exe >nul 2>&1

echo [OK] Node.js detectado
echo [OK] Iniciando servidor...
echo.
echo Accede en: http://localhost:3001
echo Presiona Ctrl+C para detener el servidor.
echo.

node server.js

echo.
echo [INFO] Servidor detenido.
pause
