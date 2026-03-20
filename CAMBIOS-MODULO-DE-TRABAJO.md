# Cambios — Selector de Módulo de Trabajo en Panel De Atención

**Fecha:** 19 de Marzo, 2026  
**Versión:** v2.3  
**Descripción:** Se agregó la funcionalidad para que los operadores del Panel De Atención puedan seleccionar el módulo en el que están trabajando y asignes los pacientes a ese módulo.

---

## 📋 Cambios Realizados

### 1. HTML (index.html)

#### Selector de Módulo en Panel De Atención
- **Ubicación:** Panel De Atención, sección "Turno actual"
- **Cambio:** Agregué un dropdown selector de módulos donde antes solo estaba la etiqueta del módulo
- **Línea aproximada:** ~1510

```html
<!-- Antes -->
<div style="font-size:11px;color:var(--text-muted);margin-bottom:12px;display:flex;align-items:center;gap:6px" id="panel-modulo-badge">
  <svg ...></svg>
  <span id="panel-modulo-label">Sin módulo asignado</span>
</div>

<!-- Después -->
<div style="margin-bottom:12px">
  <div style="font-size:11px;color:var(--text-muted);margin-bottom:6px;display:flex;align-items:center;gap:6px">
    <svg ...></svg>
    <span id="panel-modulo-label">Sin módulo asignado</span>
  </div>
  <select id="panel-modulo-select" class="form-select" onchange="cambiarModuloPanel(this.value)" style="...">
    <option value="">— Seleccionar módulo de trabajo —</option>
  </select>
</div>
```

#### Nuevas Funciones JavaScript

1. **`cargarModulosEnPanel()`** - Llena el selector con los módulos disponibles
   - Obtiene los módulos de `state.modulos`
   - Si no hay módulos cargados, usa los módulos por defecto
   - Selecciona el módulo actual si existe

2. **`cambiarModuloPanel(nuevoModulo)`** - Cambia el módulo actual del usuario
   - Valida que se haya seleccionado un módulo
   - Hace un PATCH a `/api/usuarios/{id}/modulo-actual`
   - Actualiza `currentUser.moduloActual`
   - Renderiza el panel nuevamente

3. **`toggleModuloPause()`** - Pausa/reanuda el módulo actual
   - Cambia el estado de `moduloPaused`
   - Actualiza el visual del botón
   - Muestra notificación al usuario

#### Cambios en Funciones Existentes

1. **`renderPanel()`** - Actualizado para:
   - Llamar a `cargarModulosEnPanel()` al renderizar
   - Usar `currentUser.moduloActual` como módulo principal
   - Actualizar el selector con el módulo actual
   - Filtrar turnos prioritarios del módulo actual

2. **`siguienteTurno()`** - Actualizado para:
   - Usar `currentUser.moduloActual` para filtrar turnos
   - Mostrar advertencia si no hay módulo seleccionado
   - Validar que existan turnos en espera para el módulo seleccionado

---

### 2. Servidor (server.js)

#### Cambios en Estructura de Datos

1. **`mem.modulosActuales`** - Nuevo objeto para guardar módulos actuales
   ```javascript
   const mem = { 
     usuarios: [], 
     turnos: [], 
     contador: 100,
     modulosActuales: {}  // ← NUEVO
   };
   ```
   - Guarda el módulo actual de cada usuario durante la sesión
   - Estructura: `{ usuarioId: "Módulo 01", ... }`

#### Nuevos Endpoints

1. **`PATCH /api/usuarios/:id/modulo-actual`** - Cambiar módulo de trabajo
   - **Validación:** Solo el usuario puede cambiar su propio módulo
   - **Parámetros:** `{ moduloActual: "Módulo 01" }`
   - **Respuesta:** 
     ```json
     {
       "ok": true,
       "mensaje": "Módulo actualizado a Módulo 01",
       "moduloActual": "Módulo 01"
     }
     ```

#### Nuevas Funciones

1. **`cambiarModuloActual(req, res, id, usuario)`** - Manejador del endpoint PATCH
   - Valida que el usuario solo cambie su propio módulo
   - Guarda el módulo en `mem.modulosActuales`
   - Devuelve confirmación

#### Cambios en Funciones Existentes

1. **`login()`** - Actualizado para:
   - Devolver `moduloActual` en el payload del usuario
   - Leer el módulo actual desde `mem.modulosActuales` si existe

2. **`siguienteTurno()`** - Actualizado para:
   - Aceptar el módulo desde el request body (`b.modulo`)
   - Leer el módulo actual de `mem.modulosActuales[usuario.id]`
   - Filtrar turnos `WHERE modulo = @modulo`
   - Mostrar mensaje específico si no hay turnos para ese módulo

---

## 🎯 Flujo de Trabajo

### Detalles Técnicos

1. **Carga inicial:**
   - Usuario inicia sesión
   - `login()` devuelve `moduloActual: null` (si no existe)
   - Cliente establece `currentUser.moduloActual = null`

2. **Selección de módulo:**
   - Usuario abre Panel De Atención
   - `renderPanel()` llama a `cargarModulosEnPanel()`
   - Se llena el selector con opciones disponibles
   - Usuario selecciona un módulo

3. **Cambio de módulo:**
   - `cambiarModuloPanel("Módulo 01")` es llamada
   - Se envía PATCH a `/api/usuarios/123/modulo-actual`
   - Servidor guarda en `mem.modulosActuales[123] = "Módulo 01"`
   - Cliente actualiza `currentUser.moduloActual`
   - Se re-renderiza el panel

4. **Llamar siguiente turno:**
   - Usuario presiona "Siguiente"
   - `siguienteTurno()` obtiene la lista de turnos en espera
   - Filtra solo los que tienen `estado='En fila' AND modulo='Módulo 01'`
   - Si no hay, muestra: "No hay turnos en espera para Módulo 01"
   - Si hay, lo marca como "Llamando" y actualiza la vista

---

## 🔐 Seguridad

- ✅ Un usuario solo puede cambiar su propio módulo actual
- ✅ Solo se devuelven turnos del módulo seleccionado
- ✅ El cambio de módulo requiere autenticación válida

---

## 📊 Persistencia

- ✅ Módulo actual guardado en memoria (`mem.modulosActuales`) durante la sesión
- ⚠️ Se pierde al reiniciar el servidor
- ℹ️ Para persistencia duradera, se puede agregar una columna en la tabla `usuarios`

---

## 🧪 Pruebas Recomendadas

1. **Selector de módulos:**
   - [ ] Verificar que aparecen todos los módulos
   - [ ] Seleccionar un módulo diferente
   - [ ] Ver que se actualiza el badge

2. **Filtrado de turnos:**
   - [ ] Crear turnos para diferentes módulos
   - [ ] Cambiar módulo en el panel
   - [ ] Verificar que solo aparecen turnos del módulo actual

3. **Flujo completo:**
   - [ ] Login → Panel De Atención → Seleccionar módulo → Presionar Siguiente
   - [ ] Verificar que se llama un turno del módulo correcto
   - [ ] Completar la atención

---

## 🚀 Funcionalidades Futuras

- [ ] Guardar módulo actual en base de datos (persistir entre sesiones)
- [ ] Historial de cambios de módulo por usuario
- [ ] Estadísticas por módulo de trabajo del día
- [ ] Alertas si un módulo se queda sin operador
- [ ] Auto-asignación de módulo basado en especialidad del usuario
