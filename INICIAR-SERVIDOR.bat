@echo off
REM NeuroTurn v2.2 - Script para iniciar el servidor
REM Presiona Ctrl+C para detener el servidor

title NeuroTurn v2.2 - Servidor Local
color 0A

echo.
echo ================================================
echo   NEUROTURN v2.2 - SISTEMA DE TURNOS MEDICOS
echo ================================================
echo.
echo Iniciando servidor...
echo.

REM Cambiar a la carpeta del proyecto
cd /d "%~dp0"

REM Verificar si Node.js está instalado
node -v >nul 2>&1
if errorlevel 1 (
    echo ERROR: Node.js no está instalado.
    echo.
    echo Descárgalo desde: https://nodejs.org/
    echo.
    pause
    exit /b 1
)

echo [OK] Node.js detectado
echo.

REM Iniciar el servidor
echo Iniciando servidor en: http://localhost:3001
echo.
echo Esperando a que se inicie...
echo.

timeout /t 2 /nobreak

REM Iniciar el servidor
node server-mejorado.js

if errorlevel 1 (
    echo.
    echo ERROR al iniciar el servidor.
    echo.
    pause
    exit /b 1
)
