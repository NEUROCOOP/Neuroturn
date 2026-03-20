# Prueba - Gestión de Usuarios ✅

## Estado del Servidor
- ✅ **Servidor activo**: Puerto 3001 (PID 16016)
- ✅ **Stack**: Node.js + SQL Server

## Credenciales de Administrador (para pruebas)
```
Usuario:     admin
Contraseña:  admin123
Rol:         Administrador
```

---

## 🧪 Prueba 1: Crear Usuario Nuevo

1. Abre: http://localhost:3001
2. Inicia sesión con `admin / admin123`
3. Ve a: **Administración → Gestión De Usuarios**
4. Haz clic en: **+ Nuevo usuario**
5. Llena el formulario:
   - Nombre: `Juan Pérez`
   - Usuario: `jperez`
   - Contraseña: `password123`
   - Email: `juan@neuroturn.com`
   - Rol: `Médico`
   - Módulo: `Módulo 01`
   - Estado: `Activo`
6. Haz clic en: **Guardar**
7. ✅ Esperado: 
   - Toast: "Usuario creado: Juan Pérez"
   - Nuevo usuario aparece en la tabla
   - Datos persisten en BD (verificar con consulta SQL)

---

## 🧪 Prueba 2: Modificar Usuario

1. En la tabla de usuarios, busca el usuario creado
2. Haz clic en el ícono **✏️ (Editar)**
3. Modifica:
   - Email: `juan.perez@neuroturn.com`
   - Rol: `Administrador`
4. Haz clic en: **Guardar**
5. ✅ Esperado:
   - Toast: "Usuario actualizado"
   - Cambios aparecen en la tabla
   - BD actualizada

---

## 🧪 Prueba 3: Cambiar Estado del Usuario

1. En la tabla, busca un usuario **Activo**
2. Haz clic en el ícono **⭕ (Desactivar)**
3. ✅ Esperado:
   - Estado cambia a **Inactivo** (badge rojo)
   - Toast: "Usuario desactivado"
   - Cambio persiste en BD

4. Repite con un usuario **Inactivo**:
   - Haz clic en **✓ (Activar)**
   - ✅ Estado cambia a **Activo** (badge verde)

---

## 🧪 Prueba 4: Eliminar Usuario

### ⚠️ IMPORTANTE: Se requiere CONTRASEÑA del administrador

1. En la tabla, haz clic en **🗑️ (Eliminar)**
2. Aparece modal de confirmación (Paso 1):
   - Visualiza el usuario a eliminar
   - Haz clic en: **Continuar**
3. Aparece modal de confirmación (Paso 2):
   - Campo: "Confirmar nombre de usuario"
   - Campo: "Contraseña de administrador"
4. Ingresa:
   - Nombre del usuario a eliminar (ej: `jperez`)
   - Contraseña de admin: `admin123`
5. Haz clic en: **Eliminar usuario**
6. ✅ Esperado:
   - Toast: "Usuario [nombre] eliminado"
   - Usuario desaparece de la tabla
   - Es eliminado de la BD

---

## 🧪 Prueba 5: Exportar a Excel

1. En la tabla de usuarios, haz clic en: **📥 Excel**
2. ✅ Esperado:
   - Descarga automática de archvio `usuarios_YYYY-MM-DD.xlsx`
   - Archivo contiene todas las columnas: Nombre, Usuario, Email, Rol, Módulo, Estado
   - Abre en Excel y verifica datos

---

## 🔍 Verificación en Base de Datos

Ejecuta en SQL Server Management Studio:

```sql
-- Verificar usuarios en BD
SELECT id, nombre, username, rol, email, modulo, activo, creado_en
FROM usuarios
ORDER BY creado_en DESC;

-- Contar usuarios
SELECT COUNT(*) as 'Total de usuarios'
FROM usuarios;

-- Ver historial de cambios
SELECT id, usuario_id, username, accion, realizado_por, realizado_por_nombre, ts
FROM historial_usuarios
ORDER BY ts DESC;
```

---

## 📋 Checklist de Validación

### Crear Usuario
- [ ] Valida nombre obligatorio
- [ ] Valida usuario obligatorio
- [ ] Valida username único (no permite duplicados)
- [ ] Valida contraseña mínimo 6 caracteres
- [ ] Valida rol obligatorio
- [ ] Usuario aparece en tabla inmediatamente
- [ ] Datos se guardan en BD

### Editar Usuario
- [ ] Permite cambiar nombre
- [ ] Permite cambiar email
- [ ] Permite cambiar rol
- [ ] Permite cambiar módulo
- [ ] Permite cambiar estado (activo/inactivo)
- [ ] Cambios se guardan en BD

### Eliminar Usuario
- [ ] Requiere confirmación doble (seguridad)
- [ ] Requiere nombre de usuario correcto
- [ ] Requiere contraseña de administrador correcta
- [ ] Rechaza contraseña incorrecta
- [ ] Usuario es eliminado de BD
- [ ] Se registra en historial

### Exportar a Excel
- [ ] Descarga correctamente
- [ ] Archivo es un .xlsx válido
- [ ] Contiene todos los usuarios
- [ ] Contiene todas las columnas

---

## ⚠️ Errores Esperados (para probar validaciones)

### Intentar crear usuario sin nombre
- ✅ Toast: "Ingrese el nombre completo"

### Intentar crear usuario con username duplicado
- ✅ Error 409: "El usuario ya existe"

### Intentar crear usuario sin contraseña
- ✅ Toast: "Ingrese una contraseña"

### Intentar crear usuario sin permisos
- ✅ Error 403: "Solo administradores pueden crear usuarios"

### Intentar eliminar usuario sin contraseña
- ✅ Error 400: "Se requiere contraseña de administrador"

### Intentar eliminar con contraseña incorrecta
- ✅ Error 403: "Contraseña incorrecta. Eliminación cancelada"

---

## 📝 Notas

- La contraseña de admin es: **admin123**
- Usuarios test creados en el servidor:
  - admin / admin123 (Administrador)
  - juangarcia / medico123 (Médico)
  - marialopez / enfermera123 (Enfermero)
  - carlos / recepcion123 (Recepcionista)

- El servidor almacena usuarios en BD si `dbReady=true`, o en memoria si `dbReady=false`
- Los cambios se registran en `historial_usuarios` para auditoría
