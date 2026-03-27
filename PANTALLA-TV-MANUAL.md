# Pantalla TV - Sistema de Turnos y Anuncios

## 📺 Descripción

La **Pantalla TV** es una nueva vista del sistema NeuroTurn diseñada específicamente para mostrarse en televisores de sala de espera en clínicas. Proporciona una visualización clara, con letras grandes, alto contraste y animaciones suaves, optimizada para verse desde varios metros de distancia.

**Resolución objetivo:** 1920x1080 (Full HD)

---

## 🚀 Acceder a la Pantalla TV

### URL
```
http://localhost:3001/pantalla-tv.html
```

O desde otra máquina en la red:
```
http://<IP_DEL_SERVIDOR>:3001/pantalla-tv.html
```

**Ejemplo:**
```
http://192.168.1.100:3001/pantalla-tv.html
```

---

## 📐 Estructura de Pantalla

### División Principal (50% - 50%)

#### **COLUMNA IZQUIERDA** - Turnos

1. **Turnos en Atención** (Parte Superior)
   - Mostrará máximo **2 turnos** siendo atendidos simultáneamente
   - Cada tarjeta muestra:
     - **CÓDIGO** del turno (ej: `A-002`) - en amarillo grande
     - **NOMBRE DEL PACIENTE** - en blanco grande
     - **FUNCIONARIO** que atiende (con icono 👤)
     - **MÓDULO** (ej: "Módulo 1") - en esquina inferior

2. **En Fila de Espera** (Parte Inferior)
   - Mostrará máximo **8 turnos** en espera
   - Cada elemento muestra:
     - **CÓDIGO** - color amarillo
     - **NOMBRE DEL PACIENTE**

#### **COLUMNA DERECHA** - Información y Anuncios

- **Slider Automático** con imágenes desde `/img/`
- **Cambio cada 8 segundos** con transición fade suave
- **Indicadores** (puntos) para navegar manualmente
- Imágenes se cargan automáticamente de la carpeta del servidor

#### **BARRA SUPERIOR** (80px altura)
- Logo de empresa (🏥)
- Título: "SISTEMA DE TURNOS"
- Hora en tiempo real (HH:MM:SS)

#### **BARRA INFERIOR** (70px altura)
- Ticker con mensaje deslizándose
- Mensaje por defecto: *"Bienvenido a Neurocoop. Espere su turno para ser atendido."*

---

## 🎨 Características Visuales

### Diseño
- **Colores:** Azul institucional, verde para secciones activas, amarillo para códigos
- **Tipografía:** Arial Grande (visible desde 5+ metros)
- **Bordes:** Redondeados para apariencia moderna

### Animaciones
- **Tarjetas de turno:** Deslizamiento suave al aparecer
- **Imágenes:** Transición fade al cambiar
- **Hover:** Efecto de elevación en elementos interactivos

### Contraste
- Alto contraste entre fondo y texto
- Fondos oscuros (azul marino) con texto blanco/amarillo
- Sombras para profundidad visual

---

## 🔊 Funcionalidades Especiales

### Sonidos
- **Reproducción automática** cuando un turno cambia a "Atendiendo"
- **Secuencia de 3 tonos** (800Hz, 1000Hz, 800Hz)
- Duración total: ~1 segundo
- No necesita archivos de audio (Web Audio API)

### Actualización en Tiempo Real
- **Polling cada 1 segundo** al servidor
- Sin necesidad de autenticación
- Detecta automáticamente cambios en turnos

### Estado de Conexión
- Indicador en esquina superior derecha
- Verde: "● Conectado"
- Rojo: "● Desconectado" (si hay problemas de conexión)

---

## 📁 Imágenes de Anuncios

### Ubicación
```
C:\Users\AuxSistemas\Desktop\Neuroturn_Sistema\Neuroturn\neuroturn-prod\img\
```

### Imágenes Incluidas
- `DerechoDeber.png` - Derechos y deberes del paciente
- `LavadoManos.png` - Instrucciones de higiene
- `Recomendaciones.png` - Recomendaciones de salud

### Cómo Agregar Nuevas Imágenes
1. Guardar la imagen en la carpeta `/img/`
2. Formatos soportados: PNG, JPG, JPEG, GIF, WEBP
3. Cambio automático cada 8 segundos
4. Se cargan sin necesidad de reiniciar el servidor

---

## 🔧 Configuración

### Archivo: `pantalla-tv.html` → Sección `CONFIG`

```javascript
const CONFIG = {
  URL_API: 'http://' + (window.location.hostname || 'localhost') + ':3001',
  INTERVALO_POLLING: 1000,      // Actualizar turnos cada 1 segundo
  INTERVALO_SLIDER: 8000,       // Cambiar imagen cada 8 segundos
  CARPETA_IMG: '/img/',          // Ruta de imágenes
};
```

**Modificables:**
- `INTERVALO_POLLING` - Frecuencia de actualización (milisegundos)
- `INTERVALO_SLIDER` - Duración de cada imagen (milisegundos)

---

## 📊 Estados de Turnos Mostrados

| Estado | Ubicación | Descripción |
|--------|-----------|-------------|
| `Atendiendo` | **Columna Izquierda - Superior** | Turnos en atención AHORA |
| `En fila` | **Columna Izquierda - Inferior** | Esperando ser llamados |
| `Llamando` | No mostrado separadamente | Se transiciona a "Atendiendo" |
| `Finalizado` | No mostrado | Removido de la pantalla |
| `Cancelado` | No mostrado | Removido de la pantalla |

---

## 🔗 Endpoints API Utilizados

### Públicos (sin autenticación)

#### 1. **GET /api/turnos**
Obtiene todos los turnos del sistema

**Respuesta:**
```json
{
  "ok": true,
  "turnos": [
    {
      "id": 1,
      "codigo": "A-002",
      "paciente": "MARÍA GÓMEZ",
      "estado": "Atendiendo",
      "atendido_por": "JENNYFER SUAREZ",
      "modulo": "1",
      "documento": "1234567890",
      "servicio": "Neurología",
      "ts_creado": 1711000000000,
      "ts_llamado": 1711000060000,
      "ts_atendido": 1711000090000,
      "ts_fin": null
    }
  ]
}
```

#### 2. **GET /api/imagenes**
Lista todas las imágenes disponibles en `/img/`

**Respuesta:**
```json
{
  "ok": true,
  "imagenes": [
    "DerechoDeber.png",
    "LavadoManos.png",
    "Recomendaciones.png"
  ]
}
```

---

## 💡 Tips de Implementación

### Para Clínicas
1. **Configurar TV:** Acceder a la URL y maximizar navegador (F11)
2. **Visualización:** Colocar a 2-3 metros de altura, frente a sala de espera
3. **Rotación de Imágenes:** Cambiar imágenes en `/img/` según necesidades

### Para Desarrolladores
1. **Debugging:** Abrir DevTools (F12) para ver logs de conexión
2. **Pruebas:** Cambiar `INTERVALO_POLLING` a 500ms para ver cambios más rápido
3. **Sonidos:** Desactivar reproducción de sonido comentando `reproducirSonidoLlamado()`

---

## 🐛 Solución de Problemas

### No aparecen los turnos
- Verificar que `/api/turnos` retorna datos (abrir en navegador)
- Revisar console (F12) para errores de conexión
- Verificar que el servidor está corriendo en el puerto correcto (3001)

### Imágenes no cargan
- Asegurar que las imágenes están en `/img/` con extensión correcta
- Verificar permisos de lectura en la carpeta
- Revisar console para errores 404

### Sonidos no se reproducen
- Algunos navegadores requieren interacción del usuario primero
- Hacer click en la pantalla para habilitar audio
- Chrome en modo silencioso requiere HTTPS para audio

### Pantalla desconectada (indicador rojo)
- Verificar conexión a internet/red
- Revisar IP del servidor en el archivo .env
- Intentar acceder a `http://SERVER_IP:3001/api/estado` directamente

---

## 📝 Campos de Turno

Cada turno contiene:
- `id` - Identificador único
- `codigo` - Código del turno (ej: "A-002")
- `paciente` - Nombre del paciente
- `documento` - Documento de identidad (opcional)
- `servicio` - Servicio/especialidad
- `modulo` - Módulo/consultorio donde se atiende
- `estado` - Estado actual (En fila, Llamando, Atendiendo, etc.)
- `atendido_por` - Nombre del funcionario
- `registrado_por` - Quién registró el turno
- `nota` - Notas adicionales
- `llamadas` - Cantidad de veces llamado
- `ts_creado` - Timestamp creación
- `ts_llamado` - Timestamp primer llamado
- `ts_atendido` - Timestamp inicio atención
- `ts_fin` - Timestamp fin/cancelación

---

## 📱 Responsive

Aunque optimizada para 1920x1080 (Full HD), la pantalla se adapta automáticamente a otras resoluciones:
- **4K (3840x2160):** Funciona perfectamente, texto más grande
- **HD (1280x720):** Funciona, pero menos espacio
- **Tablets:** Funciona en modo horizontal

---

## 🔐 Seguridad

- ✅ No requiere token JWT
- ✅ Solo lectura de datos (GET requests)
- ✅ Sin acceso a datos sensibles de usuarios
- ✅ Cliente puede acceder por IP local
- ❌ NO expone información de contraseñas o datos médicos detallados

---

## 📞 Contacto / Soporte

Para problemas o sugerencias sobre la Pantalla TV, contactar al equipo de NeuroTurn.

---

**Versión:** 1.0  
**Última actualización:** Marzo 2026  
**Compatibilidad:** Chrome, Firefox, Edge, Safari (navegadores modernos)
