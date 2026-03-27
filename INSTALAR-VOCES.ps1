# ============================================================
# INSTALAR VOCES EN ESPAÑOL PARA NEUROTURN
# ============================================================
# USO: Clic derecho → "Ejecutar con PowerShell" como Administrador
#      O abrir PowerShell como Admin y ejecutar: .\INSTALAR-VOCES.ps1
# ============================================================

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  INSTALADOR DE VOCES PARA NEUROTURN" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# Verificar que estamos como administrador
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "ERROR: Este script debe ejecutarse como ADMINISTRADOR." -ForegroundColor Red
    Write-Host "Haga clic derecho → 'Ejecutar como administrador'" -ForegroundColor Yellow
    Write-Host ""
    Read-Host "Presione Enter para salir"
    exit 1
}

Write-Host "Permisos de administrador: OK" -ForegroundColor Green
Write-Host ""

# Listar voces de español disponibles
Write-Host "Buscando paquetes de voz en español disponibles..." -ForegroundColor Yellow
$caps = Get-WindowsCapability -Online -Name "Language.Speech*es*" 2>$null
if ($caps) {
    Write-Host ""
    Write-Host "Paquetes encontrados:" -ForegroundColor Cyan
    $caps | Format-Table Name, State -AutoSize
} else {
    Write-Host "No se encontraron paquetes de Speech con el patron es-*" -ForegroundColor Yellow
    Write-Host "Buscando paquetes de texto a voz (TextToSpeech)..." -ForegroundColor Yellow
    $caps = Get-WindowsCapability -Online -Name "Language.TextToSpeech*es*" 2>$null
    if ($caps) {
        $caps | Format-Table Name, State -AutoSize
    }
}

# Intentar instalar voces de español
$voicesToInstall = @(
    "Language.Speech~~~es-CO~0.0.1.0",
    "Language.Speech~~~es-MX~0.0.1.0", 
    "Language.Speech~~~es-ES~0.0.1.0"
)

$installed = 0
foreach ($voice in $voicesToInstall) {
    Write-Host "Intentando instalar: $voice ..." -ForegroundColor Yellow
    try {
        $result = Add-WindowsCapability -Online -Name $voice -ErrorAction Stop
        if ($result.RestartNeeded -eq $false) {
            Write-Host "  INSTALADO correctamente!" -ForegroundColor Green
        } else {
            Write-Host "  INSTALADO - Se requiere reiniciar el PC" -ForegroundColor Yellow
        }
        $installed++
    } catch {
        $err = $_.Exception.Message
        if ($err -match "already installed" -or $err -match "ya está instalad") {
            Write-Host "  Ya estaba instalado" -ForegroundColor Green
            $installed++
        } elseif ($err -match "not found" -or $err -match "no se encontr") {
            Write-Host "  No disponible en este sistema" -ForegroundColor DarkYellow
        } else {
            Write-Host "  Error: $err" -ForegroundColor Red
        }
    }
}

# Método alternativo: instalar idioma completo si las voces individuales no funcionaron
if ($installed -eq 0) {
    Write-Host ""
    Write-Host "Los paquetes de voz individuales no están disponibles." -ForegroundColor Yellow
    Write-Host "Intentando instalar el idioma Español (Colombia) completo..." -ForegroundColor Yellow
    Write-Host "Esto puede tomar varios minutos..." -ForegroundColor Yellow
    
    try {
        # Intentar con Install-Language (Windows 11)
        if (Get-Command Install-Language -ErrorAction SilentlyContinue) {
            Install-Language es-CO -AsJob
            Write-Host "Instalación de idioma es-CO iniciada!" -ForegroundColor Green
        } else {
            # Windows 10: usar lpksetup o DISM
            Write-Host "Intentando con DISM..." -ForegroundColor Yellow
            $allCaps = Get-WindowsCapability -Online | Where-Object { $_.Name -like "*es-CO*" -or $_.Name -like "*es-MX*" }
            if ($allCaps) {
                Write-Host "Capacidades encontradas para español:" -ForegroundColor Cyan
                $allCaps | Format-Table Name, State -AutoSize
                foreach ($cap in $allCaps) {
                    if ($cap.State -ne "Installed") {
                        Write-Host "Instalando $($cap.Name)..." -ForegroundColor Yellow
                        Add-WindowsCapability -Online -Name $cap.Name -ErrorAction SilentlyContinue
                    }
                }
            } else {
                Write-Host "No se encontraron paquetes de idioma español." -ForegroundColor Red
                Write-Host ""
                Write-Host "SOLUCION MANUAL:" -ForegroundColor Cyan
                Write-Host "1. Abra Configuracion de Windows (Win + I)" -ForegroundColor White
                Write-Host "2. Vaya a: Hora e idioma → Idioma" -ForegroundColor White
                Write-Host "3. Clic en 'Agregar un idioma'" -ForegroundColor White
                Write-Host "4. Busque 'Español (Colombia)'" -ForegroundColor White
                Write-Host "5. Instalelo con la opcion de 'Texto a voz' marcada" -ForegroundColor White
            }
        }
    } catch {
        Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# Verificar voces instaladas después
Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  VOCES INSTALADAS EN EL SISTEMA" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan

Add-Type -AssemblyName System.Speech
$synth = New-Object System.Speech.Synthesis.SpeechSynthesizer
$voices = $synth.GetInstalledVoices() | ForEach-Object { $_.VoiceInfo }
if ($voices) {
    $voices | Format-Table Name, Culture, Gender -AutoSize
} else {
    Write-Host "(ninguna voz SAPI detectada)" -ForegroundColor DarkYellow
}

# Verificar OneCore
$onecore = Get-ChildItem "HKLM:\SOFTWARE\Microsoft\Speech_OneCore\Voices\Tokens" -ErrorAction SilentlyContinue
if ($onecore -and $onecore.Count -gt 0) {
    Write-Host "Voces OneCore: $($onecore.Count) encontradas" -ForegroundColor Green
} else {
    Write-Host "Voces OneCore: 0 (el navegador usara voces de Google online)" -ForegroundColor DarkYellow
}

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  PROCESO COMPLETADO" -ForegroundColor Cyan  
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Si se instalaron voces nuevas:" -ForegroundColor White
Write-Host "  1. Cierre TODOS los navegadores (Chrome/Edge)" -ForegroundColor White
Write-Host "  2. Vuelva a abrir el navegador" -ForegroundColor White
Write-Host "  3. Las voces nuevas apareceran en NeuroTurn" -ForegroundColor White
Write-Host ""
Read-Host "Presione Enter para salir"
