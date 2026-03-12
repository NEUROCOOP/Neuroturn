# ═══════════════════════════════════════════════════════════════════
#  NeuroTurn — Script de Arranque Rápido
#  Ejecutar como Administrador
# ═══════════════════════════════════════════════════════════════════

Write-Host "`n" -ForegroundColor Green
Write-Host "═════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "   🚀 NeuroTurn v2.2 — Sistema de Gestión de Turnos" -ForegroundColor Green
Write-Host "═════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "`n" -ForegroundColor Green

# Verificar que está en el directorio correcto
$ruta = Get-Location
if (-not (Test-Path "server-mejorado.js")) {
    Write-Host "❌ Error: server-mejorado.js no encontrado en $ruta" -ForegroundColor Red
    Write-Host "Navega a la carpeta del proyecto: cd c:\Users\AuxSistemas\Desktop\Neuroturn_Sistema\Neuroturn\neuroturn-prod" -ForegroundColor Yellow
    exit 1
}

# Verificar Node.js
Write-Host "📋 Verificando requisitos..." -ForegroundColor Cyan
$node = node --version 2>$null
if (-not $node) {
    Write-Host "❌ Node.js no está instalado" -ForegroundColor Red
    Write-Host "Descargar desde: https://nodejs.org/" -ForegroundColor Yellow
    exit 1
}
Write-Host "✓ Node.js $node" -ForegroundColor Green

# Leer .env
$envPath = ".\.env"
if (-not (Test-Path $envPath)) {
    Write-Host "⚠️  Archivo .env no encontrado, creando..." -ForegroundColor Yellow
    @"
PORT=3000
DB_SERVER=.\SQLEXPRESS
DB_PORT=1433
DB_USER=sa
DB_PASS=Neurocoop2020*
DB_NAME=Neuroturn
JWT_SECRET=neuroturn_dev_key_2026_local_network
"@ | Out-File $envPath -Encoding UTF8
    Write-Host "✓ Archivo .env creado" -ForegroundColor Green
}

# Leer variables de .env
$env = @{}
Get-Content $envPath | Where-Object { $_ -match '^\w+=' } | ForEach-Object {
    $key, $value = $_ -split '=', 2
    $env[$key.Trim()] = $value.Trim().Trim('"')
}

$port = $env['PORT'] -or '3000'
$server = $env['DB_SERVER'] -or '.\SQLEXPRESS'
$db = $env['DB_NAME'] -or 'Neuroturn'

Write-Host "✓ Configuración cargada" -ForegroundColor Green
Write-Host "   Puerto:    $port" -ForegroundColor Gray
Write-Host "   SQL Server: $server / $db" -ForegroundColor Gray

# Verificar SQL Server
Write-Host "`nℹ️  Verificando SQL Server..." -ForegroundColor Cyan
$sqlCheck = (Get-Service "MSSQL`$SQLEXPRESS" -ErrorAction SilentlyContinue).Status
if ($sqlCheck -eq "Running") {
    Write-Host "✓ SQL Server (SQLEXPRESS) está en ejecución" -ForegroundColor Green
} else {
    Write-Host "⚠️  Advertencia: SQL Server (SQLEXPRESS) NO está en ejecución" -ForegroundColor Yellow
    Write-Host "   Intenta iniciar manualmente:" -ForegroundColor Gray
    Write-Host "   Services.msc → SQL Server (SQLEXPRESS) → Iniciar" -ForegroundColor Gray
    Write-Host "`n   ¿Continuar de todas formas? (S/N)" -ForegroundColor Yellow
    $resp = Read-Host
    if ($resp -ne "S" -and $resp -ne "s") { exit 1 }
}

# Verificar puerto disponible
Write-Host "`n🔌 Verificando puerto $port..." -ForegroundColor Cyan
$portCheck = netstat -ano 2>$null | Select-String ":$port\b"
if ($portCheck) {
    Write-Host "⚠️  Puerto $port ya está en uso" -ForegroundColor Yellow
    Write-Host "   Proceso: $($portCheck -replace '.*PID\s+(\d+).*', '$1')" -ForegroundColor Gray
    Write-Host "   Cambia PORT en .env o elimina el proceso anterior" -ForegroundColor Yellow
    exit 1
}
Write-Host "✓ Puerto $port disponible" -ForegroundColor Green

# Mostrar instrucciones
Write-Host "`n═════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "   SERVIDOR VA A INICIAR EN:" -ForegroundColor Green
Write-Host "═════════════════════════════════════════════════════════════════" -ForegroundColor Cyan

# Obtener IPs
$ips = (Get-NetIPAddress -AddressFamily IPv4 -InterfaceIndex (Get-NetRoute -DestinationPrefix "0.0.0.0/0" | Select-Object -First 1 InterfaceIndex).InterfaceIndex.Status -ErrorAction SilentlyContinue).IPAddress
if (-not $ips) {
    $ips = (Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue | Where-Object { -not $_.IPAddress.StartsWith("127.") }).IPAddress
}

Write-Host "`n   📱 NAVEGADOR LOCAL:" -ForegroundColor Green
Write-Host "      http://localhost:$port" -ForegroundColor White

Write-Host "`n   🌐 ACCESO EN RED (DESDE OTROS EQUIPOS):" -ForegroundColor Green
if ($ips) {
    foreach ($ip in $ips) {
        Write-Host "      http://$ip`:$port" -ForegroundColor White
    }
} else {
    Write-Host "      http://[IP_DEL_SERVIDOR]:$port" -ForegroundColor Gray
}

Write-Host "`n   📋 LOGS:" -ForegroundColor Green
Write-Host "      ./logs/neuroturn-*.log" -ForegroundColor Gray

Write-Host "`n═════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "   Presiona CTRL+C para detener el servidor" -ForegroundColor Yellow
Write-Host "═════════════════════════════════════════════════════════════════`n" -ForegroundColor Cyan

# Iniciar servidor
Write-Host "🚀 Iniciando NeuroTurn..." -ForegroundColor Green
Write-Host "" -ForegroundColor Green

$env:NODE_ENV = "production"
node server-mejorado.js

# Si llega aquí, el servidor se cerró
Write-Host "`n" -ForegroundColor Red
Write-Host "❌ Servidor detenido`n" -ForegroundColor Red
