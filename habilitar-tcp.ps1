# Script para habilitar TCP/IP en SQL Server
if (-NOT ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    Write-Host "❌ Este script requiere privilegios de administrador" -ForegroundColor Red
    exit
}

Write-Host "🔧 Habilitando TCP/IP en SQL Server..." -ForegroundColor Cyan

# Habilitar TCP/IP
Set-ItemProperty -Path 'HKLM:\SOFTWARE\Microsoft\Microsoft SQL Server\MSSQL16.MSSQLSERVER\MSSQLServer\SuperSocketNetLib\Tcp' -Name 'Enabled' -Value 1
Set-ItemProperty -Path 'HKLM:\SOFTWARE\Microsoft\Microsoft SQL Server\MSSQL16.MSSQLSERVER\MSSQLServer\SuperSocketNetLib\Tcp\IpAll' -Name 'TcpPort' -Value '1433'

Write-Host "✅ TCP/IP habilitado. Puerto: 1433" -ForegroundColor Green
Write-Host "🔄 Reiniciando SQL Server..." -ForegroundColor Cyan

# Reiniciar SQL Server
Restart-Service -Name MSSQLSERVER -Force

Write-Host "✅ SQL Server reiniciado" -ForegroundColor Green
Start-Sleep -Seconds 3

# Verificar que está escuchando
$resultado = netstat -ano | findstr ":1433"
if ($resultado) {
    Write-Host "✅ SQL Server está escuchando en puerto 1433" -ForegroundColor Green
    Write-Host $resultado
} else {
    Write-Host "⚠️  SQL Server aún no está escuchando en 1433" -ForegroundColor Yellow
}
