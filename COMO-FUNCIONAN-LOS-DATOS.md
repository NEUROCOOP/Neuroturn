# 📊 NeuroTurn — Cómo Funcionan los Datos

## 1. ¿DÓNDE SE GUARDAN LOS DATOS?

### 📁 **Base de Datos: SQL Server**
Todos los datos se guardan permanentemente en **SQL Server** de Microsoft:
- **Servidor**: `localhost` (tu máquina)
- **Puerto**: `1433` (SQL Server Standard)
- **Base de Datos**: `Neuroturn` 
- **Credenciales**: 
  - User: `sa`
  - Contraseña: `Neurocoop2020*`

### 📋 **Principales Tablas**
```
┌─────────────────────┐
│  turnos             │  ← IDs de turnos, pacientes, servicios, estados
├────────────────────┤
│  usuarios           │  ← Cuentas de admin, médicos, enfermeros
├────────────────────┤
│  config             │  ← Configuración (incluido contador de turnos)
├────────────────────┤
│  servicios          │  ← Tipos de servicios (Ginecología, Cardiología, etc.)
├────────────────────┤
│  modulos            │  ← Módulos de atención (Módulo 01, 02, etc.)
├────────────────────┤
│  historial_turnos   │  ← Log completo de cambios en cada turno
└─────────────────────┘
```

### 💾 **Persistencia**
- ✅ Los datos **persisten** incluso después de reiniciar el servidor
- ✅ Los datos **persisten** incluso después de reiniciar tu computadora
- Los datos solo se pierden si **eliminas la BD** manualmente

---

## 2. ¿CÓMO SE GENERA EL NÚMERO DE TURNO?

### 🔢 **Flujo del Contador**

```
┌─────────────────────────────────────┐
│  1. Usuario crea turno (POST)       │
│     paciente="Juan", servicio="GIN" │
└────────┬────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│  2. Servidor consulta CONTADOR      │
│     FROM config WHERE clave='contador' │
│     Valor actual: 123               │
└────────┬────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│  3. Incrementar contador            │
│     contador = 123 + 1 = 124        │
│     UPDATE config SET valor=124     │
└────────┬────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│  4. Formatear con ceros             │
│     prefijo = "T" (de servicio)     │
│     número = 124 → "124"            │
│     código = "T-124"                │
└────────┬────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│  5. Guardar turno en BD             │
│     INSERT INTO turnos              │
│     VALUES ('T-124', 'Juan', ...)   │
└─────────────────────────────────────┘
```

### 📌 **Prefijos según Servicio**
```
Servicio          Prefijo
─────────────────────────
Ginecología       G
Cardiología       C
Pediatría         P
Odontología       O
Otros             T (default)
```

---

## 3. CAMBIOS REALIZADOS — Turnos desde 001

### ❌ **Antes (Números altos: 100, 101, 102...)**
```javascript
// server.js línea 292
INSERT INTO config VALUES ('contador', '100');  ← Empezaba en 100

// server.js línea 794
const codigo = `${prefijo}-${num}`;             ← G-100, C-101...
```

### ✅ **Ahora (Números desde 001: 001, 002, 003...)**

**Cambio 1: Inicializar contador a 0**
```javascript
// server.js línea 292
INSERT INTO config VALUES ('contador', '0');    ← Empieza en 0
```

**Cambio 2: Formatear con ceros a la izquierda**
```javascript
// server.js línea 794
const codigo = `${prefijo}-${String(num).padStart(3, '0')}`;
↓
G-001, G-002, ..., G-009, G-010, ..., G-099, G-100, ...
```

**Cambio 3: Resetear memoria en inicio**
```javascript
// server.js línea 326
const mem = { usuarios: [], turnos: [], contador: 0, ... };  ← Ahora 0
```

### 🔄 **Lo que pasó el 20 de Marzo**
1. ✅ Se reseteó la fila de `contador` en tabla `config`
2. ✅ Se cambió el valor de `contador` de 100 a 0
3. ✅ Se actualizó código de servidor para format `padStart(3, '0')`
4. ✅ Se reinició el servidor
5. ✅ PróXimos turnos: `001`, `002`, `003`, ...

---

## 4. FLUJO COMPLETO DE UN TURNO (Paso a Paso)

### 📝 **Crear Turno**
```
Terminal/Frontend
       │
       ├→ POST /api/turnos
       │  Body: {paciente: "Juan", documento: "12345678", servicio: "Ginecologia"}
       │  Header: Authorization: Bearer <JWT_TOKEN>
       │
       ▼
   Servidor (server.js)
       │
       ├→ Validar JWT token
       ├→ Leer contador de config table: contador=1
       ├→ Incrementar: contador=2 → Guardar en BD
       ├→ Formatear: "G-002"
       ├→ Insertar turno:
       │  INSERT INTO turnos (codigo, paciente, documento, servicio, ts_creado)
       │  VALUES ('G-002', 'Juan', '12345678', 'Ginecologia', 1774010848420)
       │
       ▼
  Base de Datos (SQL Server)
       │
       ├→ Nueva fila en tabla turnos:
       │  id=296, codigo='G-002', paciente='Juan', estado='En fila', ...
       │
       ├→ Nueva fila en tabla historial_turnos:
       │  turno_id=296, accion='CREADO', usuario='admin', ts=...
       │
       ▼
   Servidor responde (JSON)
       │
       └→ {"ok": true, "turno": {id: 296, codigo: "G-002", ...}}
```

### ☎️ **Llamar Turno**
```
PATCH /api/turnos/296
Body: {estado: "Llamando", modulo: "Modulo 01", atendido_por: "Dr. Carlos"}

→ UPDATE turnos SET estado='Llamando', modulo='Modulo 01', atendido_por='Dr. Carlos', ts_llamado=<now>
→ INSERT INTO historial_turnos log this change
→ Broadcast via SSE (real-time notification)
```

### ✅ **Finalizar Turno**
```
PATCH /api/turnos/296
Body: {estado: "Atendido"}

→ UPDATE turnos SET estado='Atendido', ts_atendido=<now>, ts_fin=<now>
→ INSERT historial
→ Broadcast via SSE
→ Turno aparece en "Pacientes Atendidos" del dashboard
```

---

## 5. VISTAS EN DASHBOARD (Dónde Ver los Datos)

### 📊 **Sección 1: Últimos Turnos Llamados**
```
┌─────────────────────────────────────┐
│  Turno  │ Servicio  │ Módulo │ ... │
├─────────────────────────────────────┤
│  G-002  │ Ginecol.  │ 01     │ ... │
│  C-001  │ Cardiología│ 02    │ ... │
│  ...                            │
│ (Últimos 8 turnos de hoy)    │
└─────────────────────────────────────┘

Datos desde: /api/turnos (últimas 7 días actualizadas)
```

### 📋 **Sección 2: Pacientes Atendidos (Historial Completo)**
```
┌─────────────────────────────────────┐
│ Filtrar por: [Año] [Mes] [Día]      │
├─────────────────────────────────────┤
│  G-001  │ Juan  │ Ginecol.  │ ... │
│  G-002  │ María │ Ginecol.  │ ... │
│  C-001  │ Pedro │ Cardiología│ ... │
│  ...                            │
│ (TODOS los pacientes atendidos)  │
└─────────────────────────────────────┘

Datos desde: /api/historial (base de datos SIN límite de fecha)
Exportar: CSV
```

---

## 6. SINCRONIZACIÓN EN RED

El servidor escucha en **todos los interfaces** de red:
- ✅ **Localhost**: `127.0.0.1:3001` (tu computadora)
- ✅ **Red Local**: `192.168.2.3:3001` (otros PCs de la red)
- ✅ **Todos los adaptadores**: `0.0.0.0:3001` (cualquier IP)

### 📡 **Conexiones Activas Ahora**
```
TCP    0.0.0.0:3001           LISTENING       (servidor)
TCP    192.168.2.3:3001       (tu máquina)
TCP    192.168.2.22:3001      (otro PC en la red)
TCP    192.168.2.176:3001     (otro PC en la red)
```

Significa que otros 2 PCs de la red están conectados en tiempo real.

---

## 7. SEGURIDAD Y PERSISTENCIA

### 🔐 **JWT Authentication**
Cada turno creado requiere token JWT válido. El token expira en 10 horas.

### 📊 **Auditoría Completa**
Cada cambio en cualquier turno se registra en `historial_turnos`:
- Quién lo creó
- Cuándo se llamó
- Quién lo atendió  
- Cuándo finalizó

### 💾 **Backup Automático**
```
backups/2026/03/  ← Carpeta de respaldos
```

---

## 8. PREGUNTAS FRECUENTES

**Q: ¿Si reinicio el servidor, ¿empiezan los turnos desde 001 de nuevo?**
R: ❌ No. El contador se guarda en la BD. Continuarán desde donde se quedó.

**Q: ¿Puedo cambiar el contador manualmente?**
R: ✅ Sí. Ejecuta:
```sql
UPDATE config SET valor='50' WHERE clave='contador';
```
El próximo turno será `G-051`.

**Q: ¿Puedo cambiar el prefijo?**
R: ✅ Sí. Edita la tabla `servicios` en la BD. Columna `prefijo`.

**Q: ¿Qué pasa si dos usuarios crean turnos al mismo tiempo?**
R: ✅ SQL Server usa transacciones atómicas. Cada turno recibe número único.

**Q: ¿Se pierden los datos si falla la red?**
R: 📊 Los datos ya guardados persisten. Los que estaban en proceso pueden perderse.

---

**📅 Última actualización**: 20 de Marzo, 2026 — Turnos ahora empiezan desde 001
