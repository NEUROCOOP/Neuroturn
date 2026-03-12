# NeuroTurn v2.1

Sistema de turnos medicos — Node.js + SQL Server + JWT + SSE.

## Instalar

```
npm install
```

## Configurar .env

Copiar `.env.example` a `.env` y editar:

```
PORT=3001
DB_SERVER=(localdb)\PANACEA-DIDACTI
DB_PORT=1433
DB_NAME=Neuroturn
DB_USER=
DB_PASS=
JWT_SECRET=<cadena-aleatoria-minimo-32-chars>
```

Generar JWT_SECRET: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`

> Sin JWT_SECRET en .env las sesiones se invalidan al reiniciar.

## Iniciar

```
node server.js
```

O doble clic en `INICIAR.bat`. Escucha en 0.0.0.0:3001.

## Estructura

```
neuroturn-prod/
├── server.js         # Servidor principal
├── index.html        # SPA completa
├── schema.sql        # DDL de referencia
├── package.json
├── .env              # No subir a git
├── .env.example
├── INICIAR.bat
├── configurar-firewall.ps1
└── logs/
```

## API REST

Requiere `Authorization: Bearer <token>` excepto login/registro y /api/estado.

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | /api/auth/login | Login → JWT |
| POST | /api/auth/registro | Crear cuenta |
| GET | /api/auth/me | Usuario actual |
| GET | /api/estado | Estado del servidor |
| GET | /api/turnos | Turnos del día |
| POST | /api/turnos | Crear turno |
| POST | /api/turnos/siguiente | Llamar siguiente en fila |
| PATCH | /api/turnos/:id | Cambiar estado |
| GET | /api/servicios | Servicios |
| GET | /api/modulos | Modulos |
| GET | /api/usuarios | Usuarios activos |
| GET | /api/dashboard | Estadísticas del día |
| GET | /api/historial | Historial filtrado |

## SSE

`GET /events` — eventos emitidos: `turno_nuevo`, `turno_llamado`, `turno_actualizado`

## Usuarios de prueba (modo sin BD)

| Usuario | Contraseña | Rol |
|---------|------------|-----|
| admin | admin123 | Administrador |
| juangarcia | medico123 | Médico |
| marialopez | enfermera123 | Enfermero |
| carlos | recepcion123 | Recepcionista |

## Acceso desde la red local

Al iniciar, la consola muestra las IPs disponibles. Abrir en cualquier PC de la red:
`http://<ip>:3001`

Abrir puerto en Windows Firewall: `.\configurar-firewall.ps1`

## Troubleshooting

**SQL no conecta**
```
sqllocaldb info
sqllocaldb start PANACEA-DIDACTI
```

**Puerto en uso:** `PORT=3002 node server.js`

**Sesiones inválidas al reiniciar:** configurar JWT_SECRET en .env

**Verificar estado:**
```
GET http://localhost:3001/api/estado
Respuesta: { "ok": true, "version": "2.1.0", "db": "ok" }
```

## Seguridad

| Aspecto | Detalle |
|---------|---------|
| Contraseñas | bcrypt factor 12 |
| Sesiones | JWT HS256, expira 10h |
| Path traversal | path.resolve + contención de directorio |
| XSS | Datos de usuario escapados con esc() en innerHTML |
| Rutas protegidas | Token requerido en /api/* privadas |
| Login | Mensaje genérico — no revela si el usuario existe |