@echo off
REM Script para habilitar TCP/IP en SQL Server
title Habilitar TCP/IP en SQL Server
echo.
echo ============================================
echo Habilitando TCP/IP en SQL Server...
echo ============================================
echo.

REM Habilitar TCP/IP en el registro
reg add "HKEY_LOCAL_MACHINE\SOFTWARE\Microsoft\Microsoft SQL Server\MSSQL16.MSSQLSERVER\MSSQLServer\SuperSocketNetLib\Tcp" /v Enabled /t REG_DWORD /d 1 /f
if errorlevel 1 (
    echo.
    echo [ERROR] No se pudo modificar el registro. Intenta ejecutar como administrador.
    pause
    exit /b 1
)

echo [OK] TCP/IP habilitado en el registro

REM Configurar puerto TCP
reg add "HKEY_LOCAL_MACHINE\SOFTWARE\Microsoft\Microsoft SQL Server\MSSQL16.MSSQLSERVER\MSSQLServer\SuperSocketNetLib\Tcp\IpAll" /v TcpPort /t REG_SZ /d 1433 /f

echo [OK] Puerto TCP configurado a 1433
echo.
echo Reiniciando servicio SQL Server...
net stop MSSQLSERVER
timeout /t 3 /nobreak
net start MSSQLSERVER

echo.
echo Verificando que SQL Server está escuchando en puerto 1433...
timeout /t 3 /nobreak
netstat -ano | findstr ":1433"

if errorlevel 0 (
    echo.
    echo ✓ SQL Server debe estar escuchando en puerto 1433 ahora
) else (
    echo.
    echo ✗ No se detectó SQL Server en puerto 1433
)

echo.
pause
