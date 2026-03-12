@ECHO OFF
REM === NeuroTurn v2.2 === Arranque R?pido
COLOR 0A
TITLE NeuroTurn v2.2 - Puerto 3000
CLS

ECHO.
ECHO ===============================================================
ECHO   NeuroTurn v2.2 - Sistema de Gestion de Turnos
ECHO ===============================================================
ECHO.

IF NOT EXIST "server-mejorado.js" (
    ECHO [ERROR] server-mejorado.js no encontrado
    PAUSE
    EXIT /B 1
)

ECHO [OK] Aplicacion encontrada
node --version >NUL 2>&1
IF ERRORLEVEL 1 (
    ECHO [ERROR] Node.js no esta instalado
    PAUSE
    EXIT /B 1
)

ECHO [OK] Node.js verificado
ECHO [OK] Iniciando servidor...
ECHO.

node server-mejorado.js
PAUSE
