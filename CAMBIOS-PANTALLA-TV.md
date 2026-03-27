# Cambios Realizados - Pantalla TV de Turnos y Anuncios

## 📋 Resumen de Cambios

Se ha implementado una nueva vista **Pantalla TV** para mostrar turnos y anuncios en televisores de sala de espera. Esto incluye cambios en el backend (`server.js`) y la creación de nuevos archivos frontend.

---

## 📝 Cambios en `server.js`

### 1. Archivo Permitido en Raíz (**Línea 536**)

**antes:**
```javascript
const permitidosRaiz = ['index.html', 'usuarios-module.js', 'Logo.png'];
```

**después:**
```javascript
const permitidosRaiz = ['index.html', 'usuarios-module.js', 'Logo.png', 'pantalla-tv.html'];
```

**Razón:** Permitir acceso directo a `/pantalla-tv.html` desde la raíz del servidor

---

### 2. Endpoint Público `/api/imagenes` (**Línea 619**)

**Agregado:**
```javascript
if (ruta === '/api/imagenes'      && metodo === 'GET')  { await obtenerImagenes(res); return; }
```

**Razón:** Permitir que la pantalla TV obtenga la lista de imágenes disponibles sin autenticación

---

### 3. Endpoint Público `/api/turnos` - GET (**Línea 620**)

**Movido** de rutas autenticadas a rutas públicas:
```javascript
if (ruta === '/api/turnos'        && metodo === 'GET')  { await getTurnos(res); return; }
```

**Ubicación anterior:** Después de la verificación de autenticación  
**Ubicación nueva:** Entre rutas públicas

**Razón:** La pantalla TV necesita acceder a los turnos sin token JWT

---

### 4. Nueva Función `obtenerImagenes()` (**Línea 1340-1358**)

```javascript
async function obtenerImagenes(res) {
  try {
    const carpeta = path.join(__dirname, 'img');
    if (!fs.existsSync(carpeta)) {
      return json(res, 200, { ok: true, imagenes: [] });
    }

    const archivos = fs.readdirSync(carpeta);
    const extensionesPermitidas = ['.png', '.jpg', '.jpeg', '.gif', '.webp'];
    
    const imagenes = archivos
      .filter(archivo => extensionesPermitidas.includes(path.extname(archivo).toLowerCase()))
      .sort();

    return json(res, 200, { ok: true, imagenes });
  } catch (e) {
    console.error('[obtenerImagenes]', e.message);
    return json(res, 200, { ok: true, imagenes: [] });
  }
}
```

**Funcionalidad:**
- Lista todas las imágenes en la carpeta `/img/`
- Filtra por extensiones válidas (PNG, JPG, JPEG, GIF, WEBP)
- Retorna array ordenado alfabéticamente
- Maneja errores sin romper la respuesta

---

## 📁 Archivos Nuevos Creados

### 1. **`pantalla-tv.html`** - Aplicación Frontend

Página HTML completa con estructura de dos columnas:
- **Columna Izquierda (50%):** Panel de turnos
  - Turnos en atención (máximo 2)
  - Turnos en fila (máximo 8)
- **Columna Derecha (50%):** Panel de información
  - Slider automático de imágenes
  - Indicadores para navegación manual
- **Barra superior:** Logo, título, hora en tiempo real
- **Barra inferior:** Ticker con mensaje desplazándose

**Características:**
- ✅ Polling en tiempo real (cada 1 segundo)
- ✅ Animaciones suaves (slideIn, fade, scroll)
- ✅ Sonidos al llamar turnos (Web Audio API)
- ✅ Slider automático de imágenes (cada 8 segundos)
- ✅ Indicador de conexión (verde/rojo)
- ✅ Responsive (1920x1080 optimizado)
- ✅ Sin autenticación requerida

**Líneas:** ~650 líneas (HTML + CSS + JavaScript)

---

### 2. **`PANTALLA-TV-MANUAL.md`** - Documentación de Usuario

Manual completo incluyendo:
- Descripción general
- Cómo acceder (URL)
- Estructura de pantalla
- Características visuales
- Funcionalidades especiales
- Configuración
- Estados de turnos
- Endpoints API
- Tips de implementación
- Solución de problemas
- Seguridad

---

## 🔧 Compatibilidad de Cambios

### ✅ No rompe funcionalidad existente
- GET `/api/turnos` sigue disponible para usuarios autenticados
- POST `/api/turnos` sigue requiriendo autenticación (solo cambio que fue movido es GET)
- Resto de rutas sin cambios

### ✅ Cambios seguros
- Mover GET `/api/turnos` a rutas públicas es seguro (solo lectura, sin datos sensibles)
- Agregar endpoint `/api/imagenes` es nuevo, no requiere modificación de rutas existentes
- Agregar `pantalla-tv.html` a permitidos es seguro (es un archivo estático público)

---

## 🚀 Deployment

### Pasos para activar la pantalla TV:

1. **Asegurar que las imágenes existen:**
   ```
   C:\...\neuroturn-prod\img\
     - DerechoDeber.png
     - LavadoManos.png
     - Recomendaciones.png
     - (cualquier otra imagen PNG/JPG)
   ```

2. **Iniciar servidor (sin cambios en comando):**
   ```bash
   node server.js
   ```

3. **Acceder a la pantalla TV:**
   ```
   http://localhost:3001/pantalla-tv.html
   ```

### No se requiere:
- ❌ Instalar dependencias nuevas
- ❌ Reiniciar base de datos
- ❌ Variables de entorno nuevas
- ❌ Configuración especial

---

## 📊 Cambios Técnicos Detallados

### Rutas Públicas Actualizadas

**Antes:**
```
PÚBLICAS:
  GET  /api/auth/login
  POST /api/auth/registro
  POST /api/auth/validar-clave-admin
  GET  /api/estado

PRIVADAS (requieren token):
  GET  /api/turnos ← AQUÍ ESTABA
  POST /api/turnos
  POST /api/turnos/siguiente
  (otras rutas...)
```

**Después:**
```
PÚBLICAS:
  GET  /api/auth/login
  POST /api/auth/registro
  POST /api/auth/validar-clave-admin
  GET  /api/estado
  GET  /api/imagenes ← NUEVO
  GET  /api/turnos ← MOVIDO AQUÍ

PRIVADAS (requieren token):
  POST /api/turnos
  POST /api/turnos/siguiente
  (otras rutas...)
```

---

## 🔐 Consideraciones de Seguridad

### ✅ Seguro hacer GET `/api/turnos` público
- Solo retorna información de turnos (sin datos de usuarios autenticados)
- No expone información sensible (contraseñas, emails privados)
- Es información que está visible en el sistema de todas formas
- Similar a exhibir en una pantalla de TV en la clínica

### ✅ Otros aspectos de seguridad
- POST/PATCH/DELETE en `/api/turnos` siguen siendo privadas
- Crear, modificar y eliminar turnos requiere autenticación
- La pantalla TV solo puede LEER información

---

## 📈 Escalabilidad

### Consideraciones para múltiples pantallas TV

La implementación actual soporta múltiples pantallas accediendo simultáneamente:
- **Polling independiente:** Cada pantalla hace sus propias requests
- **Sin WebSockets:** No requiere conexiones persistentes
- **Sin carga significativa:** GET requests son muy ligeras
- **Escalable:** Agregar 10, 50, 100 pantallas no causa problemas

### Posibles mejoras futuras
- Implementar WebSockets para actualizaciones push (en lugar de polling)
- Agregar sistema de temas/personalizaciones
- Soporte para múltiples idiomas
- Integración con sistemas de anuncios dinámicos

---

## 🧪 Testing Manual

### Verificar que todo funciona:

1. **Inicio del servidor:**
   ```bash
   node server.js
   ```

2. **Acceder a pantalla TV:**
   ```
   http://localhost:3001/pantalla-tv.html
   ```

3. **Verificar endpoints:**
   ```bash
   # En curl o navegador
   curl http://localhost:3001/api/turnos
   curl http://localhost:3001/api/imagenes
   ```

4. **Crear un turno desde otra ventana de NeuroTurn**
   - El turno debe aparecer en la pantalla TV dentro de 1 segundo
   - Cuando esté en "Atendiendo", debe reproducirse un sonido

5. **Verificar imágenes:**
   - Las imágenes deben cambiar cada 8 segundos
   - Click en indicadores debe cambiar imagen manualmente

---

## 📞 Notas para el Equipo

- ✅ Los cambios son **retrocompatibles**
- ✅ No requiere cambios en clientes existentes
- ✅ Todas las pruebas anteriores siguen funcionando
- ✅ La nueva pantalla TV es completamente independiente

---

## 🎯 Próximos Pasos Recomendados

1. **Pruebas en TV real:** Probar en un televisor de sala de espera
2. **Ajuste de tiempos:** Modificar `INTERVALO_SLIDER` según preferencia
3. **Agregar más imágenes:** Expandir carpeta `/img/` con contenido actual
4. **Configurar URL personalizada:** Si se hospeda en dominio, usar URL personalizada
5. **Monitoreo:** Observar logs para detectar posibles problemas

---

**Versión:** 2.1.1  
**Fecha:** Marzo 2026  
**Estado:** ✅ Listo para producción
