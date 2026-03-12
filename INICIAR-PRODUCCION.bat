@echo off
REM NeuroTurn v2.2 — Startup Script
REM Windows Server Edition

title NeuroTurn - Sistema de Gestion de Turnos
cls

echo.
echo ╔════════════════════════════════════════════════════════════╗
echo ║          NeuroTurn v2.2 - Healthcare Management            ║
echo ║                     Neurocoop Healthcare                    ║
echo ╚════════════════════════════════════════════════════════════╝
echo.

REM Verificar si Node.js está instalado
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js no está instalado o no está en PATH
    echo.
    echo Descargar desde: https://nodejs.org/
    pause
    exit /b 1
)

echo [OK] Node.js instalado: 
node --version
echo.

REM Verificar SQL Server
echo Verificando SQL Server...
timeout /t 1 /nobreak >nul

REM Cambiar a directorio del proyecto
cd /d "%~dp0"
if errorlevel 1 (
    echo [ERROR] No se puede acceder al directorio del proyecto
    pause
    exit /b 1
)

echo [OK] Directorio actual: %CD%
echo.

REM Detener proceso anterior si existe
echo Limpiando procesos anteriores...
taskkill /F /IM node.exe >nul 2>&1
timeout /t 2 /nobreak >nul

echo.
echo ════════════════════════════════════════════════════════════
echo  INICIANDO SERVIDOR...
echo ════════════════════════════════════════════════════════════
echo.

REM Iniciar Node.js
node server-mejorado.js

if errorlevel 1 (
    echo.
    echo [ERROR] El servidor se cerro inesperadamente
    echo.
    pause
)
