# 📋 MANUAL DE CAPACITACIÓN — NeuroTurn
### Sistema de Gestión de Turnos — Neurocoop Healthcare
**Versión 2.2 · Marzo 2026**

---

## ÍNDICE

1. [¿Qué es NeuroTurn?](#1-qué-es-neuroturn)
2. [Roles del sistema](#2-roles-del-sistema)
3. [Cómo iniciar el sistema (Servidor)](#3-cómo-iniciar-el-sistema-servidor)
4. [Pantalla de inicio de sesión (Login)](#4-pantalla-de-inicio-de-sesión-login)
5. [Registro de nuevo usuario](#5-registro-de-nuevo-usuario)
6. [Pantalla de Inicio — Vista general](#6-pantalla-de-inicio--vista-general)
7. [Dashboard — Estadísticas del día](#7-dashboard--estadísticas-del-día)
8. [Gestión de Turnos — Crear y administrar](#8-gestión-de-turnos--crear-y-administrar)
9. [Panel de Atención — Llamar pacientes](#9-panel-de-atención--llamar-pacientes)
10. [Historial de Turnos](#10-historial-de-turnos)
11. [Estadísticas por Funcionario](#11-estadísticas-por-funcionario)
12. [Ventana Televisor — Pantalla de sala de espera](#12-ventana-televisor--pantalla-de-sala-de-espera)
13. [Configuración personal y del sistema](#13-configuración-personal-y-del-sistema)
14. [Cerrar sesión](#14-cerrar-sesión)
15. [Preguntas frecuentes y errores comunes](#15-preguntas-frecuentes-y-errores-comunes)

---

## 1. ¿Qué es NeuroTurn?

**NeuroTurn** es el sistema de gestión de turnos de Neurocoop Healthcare. Permite:

- Registrar pacientes en una cola de atención
- Llamar turnos por módulo (box de atención)
- Anunciar el turno por voz automáticamente
- Mostrar la fila en una pantalla de televisor en la sala de espera
- Consultar el historial y estadísticas de atención del día

**Tecnología:** El sistema funciona a través del navegador web. El servidor se instala en una PC de la institución y el resto del personal accede desde sus propios computadores usando la red local.

---

## 2. Roles del sistema

Cada usuario tiene un **rol** que define qué puede hacer:

| Rol | Descripción |
|-----|-------------|
| **Administrador** | Acceso completo. Puede registrar usuarios, configurar el sistema y ver todo. |
| **Médico** | Atiende turnos desde el Panel de Atención. Ve su módulo asignado. |
| **Enfermero** | Igual que el médico, atiende turnos en su módulo. |
| **Recepcionista** | Crea turnos nuevos para los pacientes que llegan. |
| **Administrativo** | Consulta historial, estadísticas y reportes. |

> ✅ **Recomendación:** La recepción usa el módulo de **Turnos** para registrar pacientes. Los médicos/enfermeros usan el **Panel de Atención** para llamarlos.

---

## 3. Cómo iniciar el sistema (Servidor)

> Esta sección es para el **técnico o administrador** que arranca el sistema cada día.

### Opción A — Doble clic en el archivo BAT (recomendado)
1. Ir a la carpeta de instalación:  
   `C:\...\neuroturn-prod\`
2. Hacer **doble clic** en `INICIAR-SERVIDOR.bat`
3. Aparecerá una ventana negra (consola). Cuando vea:
   ```
   ✅ Servidor listo en http://0.0.0.0:3001
   ```
   El sistema está funcionando.

### Opción B — PowerShell
```powershell
cd C:\...\neuroturn-prod
node server.js
```

### Acceder desde el navegador
- **En la PC del servidor:** `http://localhost:3001`
- **Desde otra PC en la red:** `http://[IP del servidor]:3001`  
  *(Ejemplo: `http://192.168.1.10:3001`)*

> ⚠️ **Importante:** Mientras el sistema esté en uso, la ventana de consola debe permanecer abierta. Si se cierra, el sistema se detiene.

---

## 4. Pantalla de inicio de sesión (Login)

Al abrir el sistema en el navegador, aparece la pantalla de login.

### Paso a paso para ingresar:

```
┌─────────────────────────────────┐
│         🏥 NeuroTurn            │
│                                 │
│  Usuario: [________________]   │
│  Contraseña: [_____________]   │
│                                 │
│  [ Iniciar sesión ] (azul)      │
│  ─────── o ───────              │
│  [ Registrar nuevo usuario ]    │
│        (verde, borde)           │
└─────────────────────────────────┘
```

1. **Escribir el nombre de usuario** (por ejemplo: `jmendez`)
2. **Escribir la contraseña** asignada
3. Hacer clic en **"Iniciar sesión"**

Si los datos son correctos, el sistema carga automáticamente y lo lleva a la pantalla de **Inicio**.

> ❌ Si aparece un mensaje de error en rojo:
> - Verifique que el usuario y contraseña estén correctos (sin espacios extra)
> - Si olvidó su contraseña, contacte al administrador del sistema

---

## 5. Registro de nuevo usuario

Solo el **Administrador** puede registrar nuevos usuarios, usando la **Clave de Administrador**.

### Paso a paso:

1. En la pantalla de login, hacer clic en **"Registrar nuevo usuario"** (botón verde)
2. Se abre un formulario. Completar los campos:

| Campo | Descripción |
|-------|-------------|
| **Nombre completo** | Nombre real del usuario (Ej: `María González`) |
| **Usuario** | Nombre de acceso, sin espacios (Ej: `magonzalez`) |
| **Contraseña** | Mínimo 6 caracteres |
| **Rol** | Seleccionar: Recepcionista, Médico, Enfermero, Administrativo o Administrador |
| **Módulo asignado** | El módulo/box donde trabajará (Módulo 01 al 08, o "Sin módulo") |
| **Email** | Opcional |
| **Clave de administrador** | La clave especial que solo tiene el administrador (**campo obligatorio**) |

3. Hacer clic en **"Crear cuenta"** (verde)
4. Aparecerá un mensaje verde de confirmación: *"¡Listo! [usuario] puede iniciar sesión ahora."*
5. Cerrar el formulario con **"Cancelar"** o tecla `Esc`

> 🔑 **Nota:** La "Clave de administrador" no es la contraseña del usuario admin. Es una clave especial configurada en el servidor para controlar quién puede registrar usuarios. Solicítela al responsable técnico.

---

## 6. Pantalla de Inicio — Vista general

Después de iniciar sesión, el sistema muestra la pantalla de **Inicio** con:

```
┌──────────────────────────────────────────────────────┐
│  Sidebar (izquierda)  │  Contenido principal         │
│  ────────────────     │  ──────────────────          │
│  🏠 Inicio            │  Bienvenido 👋  [fecha hoy]  │
│  📊 Dashboard         │                              │
│  ─ Atención ─         │  [📋 Turnos hoy] [En fila]  │
│  📅 Turnos            │  [✅ Atendidos]  [⏱ Espera] │
│  ⚡ Panel Atención     │                              │
│  🕐 Historial         │  [Últimas actividades]       │
│  📈 Estadísticas      │  [Turnos con espera larga]   │
│  📺 Televisor         │                              │
│  ─ Admin ─            │  [Panel] [Turnos] [TV]       │
│  👥 Usuarios (pronto) │                              │
│  ⚙️ Configuración     │  [Estado de Módulos]         │
│  ─────────────        │                              │
│  [DR] Dr. Rossi       │                              │
│  Administrador        │                              │
└──────────────────────────────────────────────────────┘
```

### Elementos de la pantalla de Inicio:

- **Tarjetas de estadísticas:** Muestran cuántos turnos hay en fila, cuántos fueron atendidos, cancelados y el tiempo promedio de espera del día.
- **Últimas actividades:** Lista de acciones recientes (turnos creados, llamados, finalizados).
- **Turnos en espera prolongada:** Alerta si algún paciente lleva mucho tiempo esperando.
- **Accesos rápidos:** Botones para ir al Panel de Atención, Gestión de Turnos y Televisor.
- **Estado de Módulos:** Muestra en tiempo real qué módulos están activos y qué turno están atendiendo.

### Barra superior (Topbar):
- 🔍 **Buscar paciente:** Buscador rápido por nombre
- ➕ **Nuevo Turno:** Botón azul para registrar un turno rápidamente desde cualquier pantalla
- 🔔 **Notificaciones:** Campana con alertas en tiempo real
- **Salir:** Cerrar sesión

---

## 7. Dashboard — Estadísticas del día

En el menú lateral, hacer clic en **"Dashboard"**.

### Qué muestra:

- **Turnos atendidos hoy** — Total de turnos finalizados
- **En espera** — Cuántos pacientes están esperando ahora
- **Tiempo promedio de espera** — Promedio en minutos
- **Módulos activos** — Cuántos módulos están operando

### Tabla de Gestión de Turnos:

Debajo de las estadísticas, hay una tabla con **todos los turnos del día**, con columnas:

| Columna | Descripción |
|---------|-------------|
| **TURNO** | Código del turno (Ej: `A-104`) |
| **PACIENTE** | Nombre del paciente |
| **REGISTRADO POR** | Quién creó el turno |
| **ATENDIDO POR** | Qué operador lo llamó/atendió |
| **ESTADO** | En fila / Llamando / Atendiendo / Finalizado / Cancelado |
| **T. ESPERA** | Tiempo que lleva o llevó esperando |
| **HORA** | Hora de creación del turno |
| **ACCIONES** | Botones para llamar, atender, finalizar, cancelar o ver detalle |

> 💡 Puede buscar un turno específico usando el buscador "Buscar turno o paciente..." que aparece arriba de la tabla.

---

## 8. Gestión de Turnos — Crear y administrar

### ¿Cómo crear un nuevo turno?

**Principalmente para Recepcionistas.**

1. Hacer clic en el botón **"+ Nuevo Turno"** (azul, arriba a la derecha o en Dashboard)
2. Aparece un formulario:

```
┌──────────────────────────────────┐
│  📅 Nuevo Turno                  │
│                                  │
│  Nombre del paciente *           │
│  [_____________________________] │
│                                  │
│  Documento (4 últimos dígitos)   │
│  [______]    Módulo: [▼ Módulo 1]│
│                                  │
│  Código asignado: A-101          │
│                                  │
│  [Cancelar]     [Crear Turno ✓]  │
└──────────────────────────────────┘
```

3. Completar:
   - **Nombre del paciente:** Nombre completo (obligatorio)
   - **Documento (últimos 4 dígitos):** Opcional, para identificación rápida
   - **Módulo:** Seleccionar a qué módulo/servicio corresponde

4. El sistema muestra automáticamente el **código que se asignará** (Ej: `A-101`)
5. Hacer clic en **"Crear Turno"**

> ✅ El turno aparece inmediatamente en la cola. La pantalla del televisor se actualiza en tiempo real.

---

### Estados de un turno:

```
[En fila] → [Llamando] → [Atendiendo] → [Finalizado]
                              ↓
                         [Cancelado]
```

| Estado | Color | Significado |
|--------|-------|-------------|
| **En fila** | Gris | El paciente está esperando, aún no fue llamado |
| **Llamando** | Azul | Se está anunciando por voz ahora mismo |
| **Atendiendo** | Verde | El paciente está siendo atendido en el módulo |
| **Finalizado** | Verde claro | La atención terminó correctamente |
| **Cancelado** | Rojo | El turno fue cancelado (paciente no se presentó u otro motivo) |

---

### Acciones desde la tabla de turnos:

En cada fila hay iconos de acción:

| Ícono | Acción |
|-------|--------|
| 📢 (altavoz) | **Llamar** — Anuncia el turno por voz y lo marca como "Llamando" |
| ▶ (siguiente) | **Atender** — Pasa el turno a estado "Atendiendo" |
| ✓ (check) | **Finalizar** — Marca el turno como terminado |
| ✕ (cruz roja) | **Cancelar** — Cancela el turno |
| 🔍 (lupa) | **Ver detalle** — Muestra información completa del turno |

---

## 9. Panel de Atención — Llamar pacientes

**Para médicos, enfermeros y cualquier operador de módulo.**

En el menú lateral, hacer clic en **"Panel de Atención"**.

```
┌─────────────────────────────────────────────────┐
│  [Config. de voz] Idioma: Español  [Probar voz] │
├─────────────────────────┬───────────────────────┤
│    TURNO ACTUAL         │   TURNOS EN ESPERA    │
│                         │   ─────────────────   │
│  Dr. Rossi · Módulo 01  │   A-106 · Juan P.     │
│                         │   Espera: 12:34        │
│      A-104              │                        │
│  Ricardo M. Valdivia    │   B-201 · Elena R.    │
│  Módulo 05 ● LLAMANDO   │   Espera: 08:11        │
│                         │                        │
│  [📢 Re-llamar]         │   L-054 · Carlos M.   │
│  [▶ Siguiente]          │   Espera: 05:22        │
│  [✓ Finalizar]          │                        │
│  [✕ Cancelar]           │   [Ver todos ›]        │
│                         │                        │
│  [⏸ Pausar módulo]      │                        │
│                         │                        │
│  Tiempo espera: 42:00   │                        │
│  Tiempo atención: 03:20 │                        │
└─────────────────────────┴───────────────────────┘
```

### Cómo usar el Panel de Atención:

#### Paso 1: Verificar su módulo
- Arriba del panel aparece su nombre y módulo asignado (Ej: `Dr. Rossi · Módulo 01`)
- Si no tiene módulo o quiere cambiarlo, vaya a **Configuración** → "Mi módulo de trabajo"

#### Paso 2: Llamar al siguiente turno
- Hacer clic en **"▶ Siguiente"**
- El sistema toma automáticamente el siguiente turno en fila de su módulo
- El turno pasa a estado **"Llamando"** y se anuncia por voz: *"Turno A ciento cuatro. Paciente Ricardo Valdivia. Por favor diríjase al Módulo uno."*
- La pantalla del televisor muestra el llamado en grande

#### Paso 3: Confirmar atención
- Cuando el paciente llega al módulo, la atención comienza automáticamente al presionar **"▶ Siguiente"** de nuevo, o el turno resta en "Llamando"

#### Paso 4: Finalizar el turno
- Al terminar la atención, hacer clic en **"✓ Finalizar"**
- El sistema pide opcionalmente una **nota clínica** (texto breve)
- Confirmar con **"Finalizar turno"**

#### Otras acciones:
- **📢 Re-llamar:** Si el paciente no respondió, vuelve a anunciar por voz
- **✕ Cancelar:** Si el paciente no se presentó
- **⏸ Pausar módulo:** Para indicar que el módulo está temporalmente inactivo (pausa, almuerzo)

---

### Configuración de voz:

En la barra superior del panel hay opciones de voz:
- **Tono/Velocidad/Volumen:** Ajustables con los controles deslizantes
- **Probar voz:** Reproduce un anuncio de ejemplo para verificar que el audio funciona

---

## 10. Historial de Turnos

En el menú lateral, hacer clic en **"Historial de Turnos"**.

Muestra todos los turnos **finalizados, cancelados o no atendidos**.

### Filtros disponibles:

| Filtro | Opciones |
|--------|----------|
| **Búsqueda** | Por nombre, código de turno o documento |
| **Período** | Hoy / Últimos 7 días / Últimos 30 días / Todos |
| **Servicio/Módulo** | Filtrar por módulo específico |
| **Estado** | Finalizado / Cancelado / No atendido |
| **Operador** | Ver solo los turnos de un funcionario |

### Barra de resumen:
Encima de la tabla aparecen pastillas con estadísticas de lo filtrado:
- Total de registros
- Finalizados / Cancelados
- Tiempo promedio de espera
- Tiempo promedio de atención

### Exportar datos:
En la parte superior derecha hay botones:
- **PDF** — Exporta la tabla visible como archivo PDF
- **Excel** — Exporta todos los datos filtrados en formato `.xlsx`

### Información de cada registro:

| Columna | Descripción |
|---------|-------------|
| TURNO | Código (clic para ver detalle) |
| PACIENTE | Nombre |
| SERVICIO | Módulo o servicio asignado |
| OPERADOR | Quién atendió |
| HORA CREACIÓN | Cuándo se registró el turno |
| T. ESPERA | Tiempo desde creación hasta que fue llamado |
| T. ATENCIÓN | Tiempo desde que inició la atención hasta finalizar |
| ESTADO | Color según estado |
| NOTA | Ícono 📝 si se dejó una nota clínica al finalizar |

---

## 11. Estadísticas por Funcionario

En el menú lateral, hacer clic en **"Estadísticas"**.

Muestra una tabla con el rendimiento de cada operador **en el día actual**:

| Columna | Descripción |
|---------|-------------|
| FUNCIONARIO | Nombre del operador |
| TURNOS ATENDIDOS | Cuántos turnos finalizó ese día |
| T. PROM. ATENCIÓN | Tiempo promedio que tardó en cada turno |
| MÓDULO PRINCIPAL | En qué módulo trabajó más |

Hacer clic en **"Actualizar"** para refrescar los datos.

---

## 12. Ventana Televisor — Pantalla de sala de espera

En el menú lateral, hacer clic en **"Ventana Televisor"**.

Esta pantalla está diseñada para conectarse a un **televisor en la sala de espera** y mostrar la cola de turnos.

```
┌──────────────────────────────────────────────────────┐
│ 🏥 NeuroTurn · Neurocoop         15:42 · Viernes 15  │
├──────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────┐    │
│  │ 📢 LLAMANDO AHORA                            │    │
│  │  A-104  Ricardo M. Valdivia  → MÓDULO 05    │    │
│  └──────────────────────────────────────────────┘    │
│                                                      │
│  TURNOS EN FILA          │  SIENDO ATENDIDOS         │
│  ─────────────           │  ────────────────         │
│  B-201 · Elena R.        │  K-115 · Laura G.         │
│  L-054 · Carlos M.       │  G-012 · Juan D.          │
│  A-108 · Marina T.       │                           │
│                                                      │
│  Por favor, tenga su documento a mano.               │
└──────────────────────────────────────────────────────┘
```

### Cómo usar:

1. Abrir la pantalla **"Ventana Televisor"** en el sistema
2. Hacer clic en **"Pantalla completa"** (botón arriba a la derecha)
3. Conectar el equipo al televisor (cable HDMI o similar)
4. El televisor mostrará la pantalla automáticamente

### Botones de control:
- **Modo claro/oscuro:** Cambia el tema de la pantalla del televisor
- **Pantalla completa:** Expande la vista para el televisor

> 📺 **Recomendación:** Dejar esta pantalla abierta todo el día en modo pantalla completa en la PC conectada al televisor.

---

## 13. Configuración personal y del sistema

En el menú lateral, hacer clic en **"Configuración"** (ícono engranaje, al final).

### Mi módulo de trabajo (Personal)

Esta es la sección más importante para el personal operativo:

1. En el selector **"Módulo actual"**, elegir el módulo/box donde trabaja ese día
   - Módulo 01 al Módulo 08
   - "Sin módulo asignado" si no corresponde
2. Hacer clic en **"Guardar mi módulo"**
3. El sistema confirmará con un mensaje verde ✓

> ✅ **Importante:** Esto solo le afecta a usted. Cada operador debe configurar su propio módulo al comenzar el día. El sistema usará este módulo al llamar turnos desde el Panel de Atención.

---

### Configuración del sistema (solo Administrador)

Solo el administrador debería modificar estas opciones:

| Sección | Qué configura |
|---------|---------------|
| **Información de la institución** | Nombre, dirección, teléfono, email |
| **Parámetros del sistema** | Tiempo máximo de espera/atención, prefijo de turnos, número inicial |
| **Anuncios de voz** | Idioma, repeticiones, mensaje de espera personalizado |
| **Pantalla Televisor** | Mensaje de aviso, cantidad de turnos visibles |
| **Respaldo de datos** | Descargar backup JSON o restaurar desde backup |
| **Archivo Mensual** | Ver y exportar los registros guardados por mes |

---

### Respaldo de datos:

- **Descargar backup:** Guarda todos los datos en un archivo `.json` — hacerlo al final de cada jornada
- **Restaurar backup:** Carga datos desde un backup anterior (solo en caso de emergencia)

---

## 14. Cerrar sesión

Para salir del sistema:

1. Hacer clic en el botón **"Salir"** en la esquina superior derecha de la pantalla
2. El sistema vuelve a la pantalla de login automáticamente

> ⚠️ **Importante:** Siempre cerrar sesión al terminar el turno de trabajo para evitar que otra persona use su cuenta.

---

## 15. Preguntas frecuentes y errores comunes

### ❓ "No puedo iniciar sesión, aparece error rojo"
- Verificar usuario y contraseña (sin mayúsculas si no corresponde)
- Asegurarse que el servidor esté iniciado (la consola negra debe estar abierta)
- Contactar al administrador para resetear la contraseña

### ❓ "La pantalla se queda cargando indefinidamente"
- Verificar que el servidor está encendido
- Verificar que está conectado a la red de la institución
- Refrescar la página (F5)

### ❓ "El anuncio de voz no suena"
- Verificar que el volumen del computador no esté en silencio
- Ir al Panel de Atención y hacer clic en **"Probar voz"**
- Verificar que el navegador tenga permisos de audio habilitados

### ❓ "Creé un turno pero no aparece en la lista"
- Refrescar la página (F5)
- Verificar en la sección Historial si fue marcado como cancelado accidentalmente
- Si el problema persiste, contactar al administrador

### ❓ "El televisor no muestra el turno llamado"
- Verificar que la pantalla Televisor esté abierta y en pantalla completa
- Refrescar esa página
- Si el televisor está en otro equipo, verificar la conexión de red

### ❓ "Olvidé mi contraseña"
- Solo el administrador puede crear una nueva cuenta
- No hay recuperación automática de contraseña

### ❓ "¿Qué pasa con los datos si se apaga el servidor?"
- Los datos de turnos del día **se guardan en la base de datos**
- Si no hay base de datos conectada, los datos se pierden al reiniciar
- Hacer el **respaldo diario** desde Configuración antes de finalizar la jornada

---

## RESUMEN RÁPIDO POR ROL

### 🗂️ Recepcionista — Rutina diaria
1. Iniciar sesión
2. Ir a **Configuración** → Asignar mi módulo (si aplica)
3. Para cada paciente que llega: hacer clic en **"+ Nuevo Turno"**, completar nombre y módulo, guardar
4. Al finalizar el día: hacer clic en **Salir**

### 👨‍⚕️ Médico / Enfermero — Rutina diaria
1. Iniciar sesión
2. Ir a **Configuración** → Asignar mi módulo (Ej: Módulo 03)
3. Abrir **Panel de Atención**
4. Hacer clic en **"▶ Siguiente"** para llamar al próximo paciente
5. Al terminar cada atención: clic en **"✓ Finalizar"**
6. Al finalizar el día: hacer clic en **Salir**

### 🔧 Administrador — Rutina diaria
1. Iniciar el servidor (doble clic en `INICIAR-SERVIDOR.bat`)
2. Al finalizar la jornada: ir a **Configuración** → **Descargar backup**
3. Si hay personal nuevo: registrarlo con el formulario de **Registro**
4. Cerrar la ventana de consola solo cuando todo el personal ya no usará el sistema

---

*Manual preparado para el personal de Neurocoop Healthcare · NeuroTurn v2.2 · 2026*
