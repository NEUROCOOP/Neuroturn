/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║   NeuroTurn — Servidor de Producción v2.1                       ║
 * ║   Neurocoop Healthcare                                           ║
 * ╠══════════════════════════════════════════════════════════════════╣
 * ║   Stack : Node.js · SQL Server · JWT · bcryptjs · SSE           ║
 * ║   BD    : (localdb)\PANACEA-DIDACTI  →  base "Neuroturn"        ║
 * ╠══════════════════════════════════════════════════════════════════╣
 * ║   INSTALACIÓN (una sola vez):                                    ║
 * ║     npm install                                                  ║
 * ║                                                                  ║
 * ║   INICIAR:                                                       ║
 * ║     node server.js                                               ║
 * ║                                                                  ║
 * ║   VARIABLES .env:                                                ║
 * ║     PORT=3000                                                    ║
 * ║     DB_SERVER=(localdb)\PANACEA-DIDACTI                         ║
 * ║     DB_NAME=Neuroturn                                            ║
 * ║     JWT_SECRET=<cadena aleatoria larga>                         ║
 * ╚══════════════════════════════════════════════════════════════════╝
 */

'use strict';

/* ═══════════════════════════════════════════════════════════════════
   1. IMPORTS ESTÁNDAR
═══════════════════════════════════════════════════════════════════ */
const http   = require('http');
const fs     = require('fs');
const path   = require('path');
const os     = require('os');
const url    = require('url');
const crypto = require('crypto');

/* ═══════════════════════════════════════════════════════════════════
   2. IMPORTS EXTERNOS  (npm install)
═══════════════════════════════════════════════════════════════════ */
let sql, bcrypt, jwt;
try {
  sql    = require('mssql');
  bcrypt = require('bcryptjs');
  jwt    = require('jsonwebtoken');
} catch (e) {
  console.error('\n❌  Dependencias faltantes. Ejecuta:\n\n    npm install\n');
  console.error('    Necesitas: mssql  bcryptjs  jsonwebtoken\n');
  process.exit(1);
}

/* ═══════════════════════════════════════════════════════════════════
   3. LEER .env  (sin dotenv — solo Node.js puro)
═══════════════════════════════════════════════════════════════════ */
(function cargarEnv() {
  const ruta = path.join(__dirname, '.env');
  if (!fs.existsSync(ruta)) return;
  fs.readFileSync(ruta, 'utf8')
    .split(/\r?\n/)
    .forEach(linea => {
      linea = linea.trim();
      if (!linea || linea.startsWith('#')) return;
      const pos = linea.indexOf('=');
      if (pos < 1) return;
      const k = linea.slice(0, pos).trim();
      const v = linea.slice(pos + 1).trim();
      if (k && !(k in process.env)) process.env[k] = v;
    });
})();

/* ═══════════════════════════════════════════════════════════════════
   4. CONSTANTES DE CONFIGURACIÓN
═══════════════════════════════════════════════════════════════════ */
const PORT       = parseInt(process.env.PORT || '3001', 10);
const HOST       = '0.0.0.0';   // acepta conexiones desde CUALQUIER PC de la red
let   DB_SERVER  = process.env.DB_SERVER || 'localhost';
const DB_PORT    = process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 1433;
const DB_USER    = process.env.DB_USER || '';
const DB_PASS    = process.env.DB_PASS || '';
const DB_NAME    = process.env.DB_NAME   || 'Neuroturn';

// Reemplazar notación Windows .\INSTANCIA a formato NodeJS compatible
if (DB_SERVER.startsWith('.\\')) {
  DB_SERVER = 'localhost\\' + DB_SERVER.substring(2);
}
const JWT_SECRET = process.env.JWT_SECRET
  || 'nt_dev_' + crypto.randomBytes(24).toString('hex');
const JWT_EXPIRY = '10h';
const ADMIN_REGISTER_KEY = process.env.ADMIN_REGISTER_KEY || '';

if (!process.env.JWT_SECRET) {
  console.warn('⚠️  JWT_SECRET no configurado en .env — se usa clave temporal. Las sesiones se invalidan al reiniciar.');
} else if (process.env.JWT_SECRET.length < 32) {
  console.warn('⚠️  JWT_SECRET demasiado corto (mínimo 32 caracteres recomendado).');
}

/* ═══════════════════════════════════════════════════════════════════
   5. SQL SERVER — CONFIGURACIÓN
   ─────────────────────────────────────────────────────────────────
   Soporta SQL authentication (user+pass) para SQL Server Express
═══════════════════════════════════════════════════════════════════ */
function construirConfigDB(driver) {
  const cfg = {
    server:      DB_SERVER,
    port:        DB_PORT,
    database:    DB_NAME,
    options: {
      trustServerCertificate: true,
      encrypt:                false,
      enableArithAbort:       true,
    },
    pool: { max: 10, min: 0, idleTimeoutMillis: 30000 },
    requestTimeout: 20000,
  };

  // Si hay credenciales, usar SQL authentication
  if (DB_USER && DB_PASS) {
    cfg.user     = DB_USER;
    cfg.password = DB_PASS;
    cfg.options.trustedConnection = false;
  } else {
    // Si no, usar Windows authentication
    cfg.options.trustedConnection = true;
  }

  return cfg;
}

/* ═══════════════════════════════════════════════════════════════════
   6. POOL GLOBAL Y FUNCIÓN DE CONEXIÓN
═══════════════════════════════════════════════════════════════════ */
let pool    = null;
let dbReady = false;

async function conectarDB() {
  /* Detectar si msnodesqlv8 está instalado */
  let tieneNativo = false;
  try { require('msnodesqlv8'); tieneNativo = true; } catch (_) {}

  const drivers = tieneNativo ? ['msnodesqlv8', 'tedious'] : ['tedious'];

  for (const driver of drivers) {
    try {
      console.log(`   Probando driver: ${driver}...`);
      const cfg = construirConfigDB(driver);
      pool    = await sql.connect(cfg);
      dbReady = true;
      console.log(`✅ SQL Server conectado [${driver}]  →  ${DB_SERVER} / ${DB_NAME}`);
      await inicializarEsquema();
      return;                       // éxito — salir del loop
    } catch (err) {
      console.warn(`   ✗ ${driver}: ${err.message}`);
      try { if (pool) await pool.close(); } catch (_) {}
      pool = null;
    }
  }

  /* Ningún driver conectó */
  dbReady = false;
  console.warn('\n⚠️  No se pudo conectar a SQL Server.');
  console.warn('   El servidor inicia en MODO MEMORIA (los datos NO persisten).\n');
  console.warn('   Diagnóstico (ejecutar en CMD):');
  console.warn(`     sqllocaldb info ${DB_SERVER.replace(/[()\\]/g, '').split('\\').pop() || 'PANACEA-DIDACTI'}`);
  console.warn(`     sqllocaldb start ${DB_SERVER.replace(/[()\\]/g, '').split('\\').pop() || 'PANACEA-DIDACTI'}\n`);
}

/* ═══════════════════════════════════════════════════════════════════
   7. INICIALIZAR ESQUEMA  (tablas + datos base)
═══════════════════════════════════════════════════════════════════ */
async function inicializarEsquema() {
  const r = pool.request();

  await r.query(`
    IF NOT EXISTS (SELECT 1 FROM sysobjects WHERE name='usuarios' AND xtype='U')
    CREATE TABLE usuarios (
      id            INT IDENTITY(1,1) PRIMARY KEY,
      nombre        NVARCHAR(120)  NOT NULL,
      username      NVARCHAR(60)   NOT NULL UNIQUE,
      password_hash NVARCHAR(120)  NOT NULL,
      rol           NVARCHAR(40)   NOT NULL DEFAULT 'Recepcionista',
      modulo        NVARCHAR(60)   NOT NULL DEFAULT 'Sin módulo',
      email         NVARCHAR(120)  NULL,
      activo        BIT            NOT NULL DEFAULT 1,
      color         NVARCHAR(12)   NOT NULL DEFAULT '#3B72F2',
      creado_en     DATETIME2      NOT NULL DEFAULT SYSDATETIME()
    );
  `);

  await r.query(`
    IF NOT EXISTS (SELECT 1 FROM sysobjects WHERE name='servicios' AND xtype='U')
    CREATE TABLE servicios (
      id      INT IDENTITY(1,1) PRIMARY KEY,
      nombre  NVARCHAR(80)  NOT NULL,
      prefijo NVARCHAR(5)   NOT NULL UNIQUE,
      color   NVARCHAR(12)  NOT NULL DEFAULT '#3B72F2',
      activo  BIT           NOT NULL DEFAULT 1
    );
  `);

  await r.query(`
    IF NOT EXISTS (SELECT 1 FROM sysobjects WHERE name='modulos' AND xtype='U')
    CREATE TABLE modulos (
      id       INT IDENTITY(1,1) PRIMARY KEY,
      nombre   NVARCHAR(80) NOT NULL UNIQUE,
      servicio NVARCHAR(80) NULL,
      activo   BIT          NOT NULL DEFAULT 1
    );
  `);

  await r.query(`
    IF NOT EXISTS (SELECT 1 FROM sysobjects WHERE name='turnos' AND xtype='U')
    CREATE TABLE turnos (
      id           INT IDENTITY(1,1) PRIMARY KEY,
      codigo       NVARCHAR(20)  NOT NULL,
      paciente     NVARCHAR(120) NOT NULL,
      documento    NVARCHAR(30)  NULL,
      servicio     NVARCHAR(80)  NULL,
      modulo       NVARCHAR(80)  NOT NULL DEFAULT '-',
      estado       NVARCHAR(30)  NOT NULL DEFAULT 'En fila',
      atendido_por NVARCHAR(120) NULL,
      nota         NVARCHAR(500) NULL,
      llamadas     INT           NOT NULL DEFAULT 0,
      ts_creado    BIGINT        NOT NULL,
      ts_llamado   BIGINT        NULL,
      ts_atendido  BIGINT        NULL,
      ts_fin       BIGINT        NULL
    );
  `);

  await r.query(`
    IF NOT EXISTS (SELECT 1 FROM sysobjects WHERE name='config' AND xtype='U')
    CREATE TABLE config (
      clave NVARCHAR(60)  PRIMARY KEY,
      valor NVARCHAR(500) NOT NULL
    );
  `);

  /* Migración: agregar columnas nuevas si no existen */
  await r.query(`
    IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('turnos') AND name='registrado_por')
      ALTER TABLE turnos ADD registrado_por NVARCHAR(120) NULL;
  `);

  await r.query(`
    IF NOT EXISTS (SELECT 1 FROM sysobjects WHERE name='historial_turnos' AND xtype='U')
    CREATE TABLE historial_turnos (
      id           INT IDENTITY(1,1) PRIMARY KEY,
      turno_id     INT           NOT NULL,
      turno_codigo NVARCHAR(20)  NOT NULL,
      accion       NVARCHAR(20)  NOT NULL,
      usuario      NVARCHAR(120) NULL,
      ts           BIGINT        NOT NULL
    );
  `);

  /* Datos iniciales */
  await r.query(`
    IF NOT EXISTS (SELECT 1 FROM servicios)
    INSERT INTO servicios (nombre, prefijo, color) VALUES
      (N'Neurología',   'N', '#3B72F2'),
      (N'Psiquiatría',  'P', '#8B5CF6'),
      (N'Kinesiología', 'K', '#22C55E'),
      (N'General',      'G', '#F59E0B'),
      (N'Laboratorio',  'L', '#EF4444');
  `);

  await r.query(`
    IF NOT EXISTS (SELECT 1 FROM modulos)
    INSERT INTO modulos (nombre, servicio) VALUES
      (N'Módulo 01', N'Neurología'),
      (N'Módulo 02', N'General'),
      (N'Módulo 03', N'Psiquiatría'),
      (N'Módulo 04', N'Neurología'),
      (N'Módulo 05', N'Kinesiología'),
      (N'Módulo 06', N'Laboratorio'),
      (N'Módulo 07', N'Psiquiatría'),
      (N'Módulo 08', N'General');
  `);

  await r.query(`
    IF NOT EXISTS (SELECT 1 FROM config WHERE clave='contador')
    INSERT INTO config VALUES ('contador', '100');
  `);

  console.log('✅ Esquema verificado/creado correctamente.');
}

/* ═══════════════════════════════════════════════════════════════════
   8. HELPER DE CONSULTAS PARAMETRIZADAS
═══════════════════════════════════════════════════════════════════ */
async function dbQ(queryStr, params) {
  if (!dbReady || !pool) throw new Error('Base de datos no disponible');
  const req = pool.request();
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v === null || v === undefined)    req.input(k, sql.NVarChar,  null);
      else if (typeof v === 'bigint')       req.input(k, sql.BigInt,    v);
      else if (Number.isInteger(v)) {
        // Si el número excede el rango de INT, usar BigInt (para timestamps)
        if (v > 2147483647 || v < -2147483648) {
          req.input(k, sql.BigInt, v);
        } else {
          req.input(k, sql.Int, v);
        }
      }
      else if (typeof v === 'boolean')      req.input(k, sql.Bit,       v ? 1 : 0);
      else                                  req.input(k, sql.NVarChar,  String(v));
    }
  }
  return req.query(queryStr);
}

/* ═══════════════════════════════════════════════════════════════════
   9. MODO MEMORIA  (fallback sin BD)
═══════════════════════════════════════════════════════════════════ */
const mem = { usuarios: [], turnos: [], contador: 100 };

// Inicializar usuarios de prueba si no hay base de datos
async function inicializarMemoria() {
  if (mem.usuarios.length === 0 && bcrypt) {
    const usuariosPrueba = [
      { nombre: 'Administrador', username: 'admin', password: 'admin123', rol: 'Administrador', modulo: 'Módulo 01' },
      { nombre: 'Dr. Juan García', username: 'juangarcia', password: 'medico123', rol: 'Médico', modulo: 'Módulo 01' },
      { nombre: 'Enfermera María López', username: 'marialopez', password: 'enfermera123', rol: 'Enfermero', modulo: 'Módulo 02' },
      { nombre: 'Recepcionista Carlos', username: 'carlos', password: 'recepcion123', rol: 'Linea de Frente', modulo: 'Sin módulo' },
    ];
    
    for (let i = 0; i < usuariosPrueba.length; i++) {
      const u = usuariosPrueba[i];
      const hash = await bcrypt.hash(u.password, 12);
      const color = '#' + crypto.randomBytes(3).toString('hex');
      mem.usuarios.push({
        id: i + 1,
        nombre: u.nombre,
        username: u.username,
        password_hash: hash,
        rol: u.rol,
        modulo: u.modulo,
        activo: true,
        color
      });
    }
    console.log(`✅ ${mem.usuarios.length} usuarios de prueba creados en memoria`);
  }
}

/* ═══════════════════════════════════════════════════════════════════
   10. CONTADOR ATÓMICO DE TURNOS
═══════════════════════════════════════════════════════════════════ */
async function siguienteNumero() {
  if (dbReady) {
    const r = await dbQ(`
      UPDATE config
      SET    valor = CAST(CAST(valor AS INT) + 1 AS NVARCHAR(20))
      OUTPUT INSERTED.valor
      WHERE  clave = 'contador'
    `);
    return parseInt(r.recordset[0].valor, 10);
  }
  return ++mem.contador;
}

/* ═══════════════════════════════════════════════════════════════════
   11. SERVER-SENT EVENTS  (tiempo real para todos los navegadores)
═══════════════════════════════════════════════════════════════════ */
const clientesSSE = new Set();

/* Reemplazador para serializar BigInt (mssql v10 devuelve BIGINT como BigInt JS) */
const bigIntReplacer = (_, v) => typeof v === 'bigint' ? Number(v) : v;

function emitir(tipo, datos) {
  const msg = `data: ${JSON.stringify({ tipo, ...datos }, bigIntReplacer)}\n\n`;
  for (const res of clientesSSE) {
    try { res.write(msg); } catch (_) { clientesSSE.delete(res); }
  }
}

/* ═══════════════════════════════════════════════════════════════════
   12. JWT
═══════════════════════════════════════════════════════════════════ */
const firmarToken  = p  => jwt.sign(p, JWT_SECRET, { expiresIn: JWT_EXPIRY });
const verificarJWT = t  => { try { return jwt.verify(t, JWT_SECRET); } catch (_) { return null; } };
const extraerToken = req => {
  const auth = req.headers['authorization'] || '';
  return auth.startsWith('Bearer ') ? auth.slice(7) : null;
};
const autenticar   = req => verificarJWT(extraerToken(req));

/* ═══════════════════════════════════════════════════════════════════
   13. UTILIDADES HTTP
═══════════════════════════════════════════════════════════════════ */
function leerBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', c => { raw += c; if (raw.length > 2e6) reject(new Error('Payload muy grande')); });
    req.on('end',  () => { try { resolve(raw ? JSON.parse(raw) : {}); } catch (_) { resolve({}); } });
    req.on('error', reject);
  });
}

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

const json = (res, status, data) => {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-cache', ...CORS });
  res.end(JSON.stringify(data, bigIntReplacer));
};

/* MIME types para archivos estáticos */
const MIME = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8', '.json': 'application/json',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon', '.woff': 'font/woff', '.woff2': 'font/woff2',
};

function servirEstatico(res, pathname) {
  const bases = [path.join(__dirname, 'public'), __dirname];
  let fp = null;
  for (const base of bases) {
    const file    = (pathname === '/' ? 'index.html' : pathname).replace(/^[\/\\]+/, '');
    const resolved = path.resolve(path.join(base, file));
    const baseAbs  = path.resolve(base);
    // Security: resolved path must stay inside the base directory
    if (!resolved.startsWith(baseAbs + path.sep) && resolved !== baseAbs) continue;
    // Security: from __dirname root, only serve allowed files (never expose server code / .env / schema)
    if (base === __dirname) {
      const bname = path.basename(resolved);
      const relPath = path.relative(baseAbs, resolved);
      const topDir = relPath.split(path.sep)[0];
      if (!['index.html','pantalla-tv.html','usuarios-module.js'].includes(bname) && !['img','imagenes'].includes(topDir)) continue;
    }
    if (fs.existsSync(resolved) && fs.statSync(resolved).isFile()) { fp = resolved; break; }
  }
  if (!fp) {
    for (const base of bases) {
      const idx = path.resolve(path.join(base, 'index.html'));
      if (fs.existsSync(idx)) { fp = idx; break; }
    }
  }
  if (!fp) { res.writeHead(404); res.end('404 Not Found'); return; }

  const ext   = path.extname(fp).toLowerCase();
  const mime  = MIME[ext] || 'application/octet-stream';
  const cache = ext === '.html' ? 'no-cache, no-store, must-revalidate' : 'public, max-age=86400';
  fs.readFile(fp, (err, data) => {
    if (err) { res.writeHead(500); res.end('Error'); return; }
    res.writeHead(200, { 'Content-Type': mime, 'Cache-Control': cache });
    res.end(data);
  });
}

/* ═══════════════════════════════════════════════════════════════════
   14. ROUTER PRINCIPAL
═══════════════════════════════════════════════════════════════════ */
async function manejar(req, res) {
  const { pathname, query } = url.parse(req.url, true);
  const ruta   = (pathname || '/').replace(/\/+$/, '') || '/';
  const metodo = req.method.toUpperCase();

  /* CORS preflight */
  if (metodo === 'OPTIONS') { res.writeHead(204, CORS); res.end(); return; }

  /* SSE */
  if (ruta === '/events') {
    res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive', ...CORS });
    res.write(': conectado\n\n');
    res.write(`data: ${JSON.stringify({ tipo: 'conectado', ts: Date.now() })}\n\n`);
    clientesSSE.add(res);
    const hb = setInterval(() => {
      try { res.write(': ping\n\n'); } catch (_) { clearInterval(hb); clientesSSE.delete(res); }
    }, 25000);
    req.on('close', () => { clearInterval(hb); clientesSSE.delete(res); });
    return;
  }

  /* API */
  if (ruta.startsWith('/api/')) {
    try { await routerAPI(req, res, ruta, metodo, query); }
    catch (err) {
      console.error(`[API] ${metodo} ${ruta}:`, err.message);
      if (!res.headersSent) json(res, 500, { error: 'Error interno', detalle: err.message });
    }
    return;
  }

  /* Archivos estáticos — path traversal handled inside servirEstatico via path.resolve */
  servirEstatico(res, ruta);
}

/* ═══════════════════════════════════════════════════════════════════
   15. ROUTER DE API
═══════════════════════════════════════════════════════════════════ */
async function routerAPI(req, res, ruta, metodo, qp) {

  /* ── Rutas PÚBLICAS (sin token) ─────────────────────────────── */
  if (ruta === '/api/auth/login'    && metodo === 'POST') { await login(req, res);    return; }
  if (ruta === '/api/auth/registro' && metodo === 'POST') { await registro(req, res); return; }
  if (ruta === '/api/auth/validar-clave-admin' && metodo === 'POST') { await validarClaveAdmin(req, res); return; }
  if (ruta === '/api/estado'        && metodo === 'GET')  {
    json(res, 200, { ok: true, version: '2.1.0', db: dbReady ? 'ok' : 'sin_bd', uptime: Math.floor(process.uptime()), sse: clientesSSE.size });
    return;
  }
  if (ruta === '/api/turnos'         && metodo === 'GET')  { await getTurnos(res); return; }
  if (ruta === '/api/imagenes'       && metodo === 'GET')  { await obtenerImagenes(res); return; }

  /* ── Autenticación requerida ────────────────────────────────── */
  const usuario = autenticar(req);
  if (!usuario) { json(res, 401, { error: 'Token inválido o expirado. Inicia sesión nuevamente.' }); return; }

  /* /api/auth/me */
  if (ruta === '/api/auth/me' && metodo === 'GET') { json(res, 200, { ok: true, usuario }); return; }

  /* Turnos */
  if (ruta === '/api/turnos'           && metodo === 'POST') { await crearTurno(req, res, usuario);         return; }
  if (ruta === '/api/turnos/siguiente' && metodo === 'POST') { await siguienteTurno(res, usuario);          return; }

  const mTurno = ruta.match(/^\/api\/turnos\/(\d+)$/);
  if (mTurno && metodo === 'PATCH') { await actualizarTurno(req, res, parseInt(mTurno[1], 10), usuario); return; }

  /* Datos de referencia */
  if (ruta === '/api/servicios' && metodo === 'GET') { await getServicios(res); return; }
  if (ruta === '/api/modulos'   && metodo === 'GET') { await getModulos(res);   return; }
  if (ruta === '/api/usuarios'  && metodo === 'GET') { await getUsuarios(res);  return; }
  if (ruta === '/api/usuarios'  && metodo === 'POST') { await crearUsuario(req, res, usuario); return; }

  const mUsuario = ruta.match(/^\/api\/usuarios\/(\d+)$/);
  if (mUsuario && metodo === 'PATCH')  { await actualizarUsuario(req, res, parseInt(mUsuario[1], 10)); return; }
  if (mUsuario && metodo === 'DELETE') { await eliminarUsuario(res, parseInt(mUsuario[1], 10)); return; }

  const mUsuarioModulo = ruta.match(/^\/api\/usuarios\/(\d+)\/modulo$/);
  if (mUsuarioModulo && metodo === 'PATCH') { await cambiarModuloUsuario(req, res, parseInt(mUsuarioModulo[1], 10)); return; }

  if (ruta === '/api/dashboard'    && metodo === 'GET') { await getDashboard(res); return; }
  if (ruta === '/api/historial'     && metodo === 'GET') { await getHistorial(res, qp); return; }
  if (ruta === '/api/estadisticas'  && metodo === 'GET') { await getEstadisticas(res, qp); return; }
  if (ruta === '/api/estadisticas/detalle' && metodo === 'GET') { await getEstadisticasDetalle(res, qp); return; }
  if (ruta === '/api/estadisticas/dia' && metodo === 'GET') { await getEstadisticasDia(res, qp); return; }
  if (ruta === '/api/estadisticas/dias-disponibles' && metodo === 'GET') { await getDiasDisponibles(res, qp); return; }

  /* Registro de dispositivo TV (no-op, evita 404 en consola) */
  if (ruta === '/api/devices/register-tv' && metodo === 'POST') { json(res, 200, { ok: true }); return; }

  json(res, 404, { error: `Ruta no encontrada: ${metodo} ${ruta}` });
}

/* ═══════════════════════════════════════════════════════════════════
   16. AUTH — REGISTRO
═══════════════════════════════════════════════════════════════════ */
async function validarClaveAdmin(req, res) {
  const { clave } = await leerBody(req);
  if (!ADMIN_REGISTER_KEY) return json(res, 503, { error: 'Registro no disponible. Contacta al administrador.' });
  if (!clave || clave !== ADMIN_REGISTER_KEY) return json(res, 403, { error: 'Acceso no autorizado.' });
  return json(res, 200, { ok: true });
}

async function registro(req, res) {
  const b = await leerBody(req);
  const { nombre, username, password, rol, email, admin_key } = b;

  /* Validar clave de administrador antes de procesar */
  if (!ADMIN_REGISTER_KEY) return json(res, 503, { error: 'Registro no disponible. Contacta al administrador.' });
  if (!admin_key || admin_key !== ADMIN_REGISTER_KEY) return json(res, 403, { error: 'Acceso no autorizado.' });

  if (!nombre?.trim())     return json(res, 400, { error: 'El nombre es obligatorio.' });
  if (!username?.trim())   return json(res, 400, { error: 'El nombre de usuario es obligatorio.' });
  if (!password)           return json(res, 400, { error: 'La contraseña es obligatoria.' });
  if (password.length < 6) return json(res, 400, { error: 'Mínimo 6 caracteres en la contraseña.' });

  const nom  = nombre.trim().slice(0, 120);
  const user = username.trim().toLowerCase().slice(0, 60);
  const rolV = ['Administrador','Médico','Enfermero','Recepcionista','Administrativo','Linea de Frente'].includes(rol)
               ? rol : 'Recepcionista';
  const color = '#' + crypto.randomBytes(3).toString('hex');
  const hash  = await bcrypt.hash(password, 12);   // factor 12 = ~250ms, seguro

  if (dbReady) {
    const dup = await dbQ(`SELECT 1 FROM usuarios WHERE username = @u`, { u: user });
    if (dup.recordset.length) return json(res, 409, { error: 'El nombre de usuario ya está en uso.' });

    const ins = await dbQ(`
      INSERT INTO usuarios (nombre, username, password_hash, rol, email, color)
      OUTPUT INSERTED.id, INSERTED.nombre, INSERTED.username, INSERTED.rol,
             INSERTED.modulo, INSERTED.color
      VALUES (@nom, @user, @hash, @rol, @email, @color)
    `, { nom, user, hash, rol: rolV, email: email?.trim() || null, color });

    const u = ins.recordset[0];
    const token = firmarToken({ id: u.id, nombre: u.nombre, username: u.username, rol: u.rol, modulo: u.modulo, color: u.color });
    return json(res, 201, { ok: true, token, usuario: u });
  }

  if (mem.usuarios.find(u => u.username === user))
    return json(res, 409, { error: 'El nombre de usuario ya está en uso.' });

  const id = mem.usuarios.length + 1;
  const u  = { id, nombre: nom, username: user, password_hash: hash, rol: rolV, modulo: 'Sin módulo', email: email || null, activo: true, color };
  mem.usuarios.push(u);
  const token = firmarToken({ id, nombre: nom, username: user, rol: rolV, modulo: 'Sin módulo', color });
  return json(res, 201, { ok: true, token, usuario: { id, nombre: nom, username: user, rol: rolV, modulo: 'Sin módulo', color } });
}

/* ═══════════════════════════════════════════════════════════════════
   17. AUTH — LOGIN
═══════════════════════════════════════════════════════════════════ */
async function login(req, res) {
  const b = await leerBody(req);
  const { username, password } = b;

  if (!username || !password) return json(res, 400, { error: 'Usuario y contraseña son obligatorios.' });

  const user = username.trim().toLowerCase();
  let fila;

  if (dbReady) {
    const r = await dbQ(`
      SELECT id, nombre, username, password_hash, rol, modulo, activo, color
      FROM   usuarios WHERE username = @u
    `, { u: user });
    fila = r.recordset[0];
  } else {
    fila = mem.usuarios.find(u => u.username === user);
  }

  /* Mensaje genérico — no revelar si el usuario existe */
  if (!fila)        return json(res, 401, { error: 'Credenciales incorrectas.' });
  if (!fila.activo) return json(res, 403, { error: 'Cuenta desactivada. Contacta al administrador.' });

  const ok = await bcrypt.compare(password, fila.password_hash);
  if (!ok) return json(res, 401, { error: 'Credenciales incorrectas.' });

  const payload = { id: fila.id, nombre: fila.nombre, username: fila.username, rol: fila.rol, modulo: fila.modulo, color: fila.color };
  return json(res, 200, { ok: true, token: firmarToken(payload), usuario: payload });
}

/* ═══════════════════════════════════════════════════════════════════
   18. TURNOS — GET todos los del día
═══════════════════════════════════════════════════════════════════ */
async function getTurnos(res) {
  if (dbReady) {
    const r = await dbQ(`
      SELECT id, codigo, paciente, documento, servicio, modulo, estado,
             atendido_por, registrado_por, nota, llamadas, ts_creado, ts_llamado, ts_atendido, ts_fin
      FROM   turnos
      WHERE  CAST(DATEADD(SECOND, ts_creado/1000, '19700101') AS DATE) = CAST(GETDATE() AS DATE)
      ORDER  BY ts_creado ASC
    `);
    return json(res, 200, { ok: true, turnos: r.recordset });
  }
  json(res, 200, { ok: true, turnos: mem.turnos });
}

/* ═══════════════════════════════════════════════════════════════════
   19. TURNOS — CREAR
═══════════════════════════════════════════════════════════════════ */
async function crearTurno(req, res, usuario) {
  try {
    const b = await leerBody(req);
    const { paciente, documento, servicio } = b;

    if (!paciente?.trim()) return json(res, 400, { error: 'Nombre del paciente es obligatorio.' });
    if (!servicio?.trim()) return json(res, 400, { error: 'Servicio es obligatorio.' });

    let prefijo = 'T';
    if (dbReady) {
      const r = await dbQ(`SELECT prefijo FROM servicios WHERE nombre = @n`, { n: servicio });
      if (r.recordset.length) prefijo = r.recordset[0].prefijo;
    } else {
      const P = { Neurología:'N', Psiquiatría:'P', Kinesiología:'K', General:'G', Laboratorio:'L' };
      prefijo = P[servicio] || 'T';
    }

    const num    = await siguienteNumero();
    const codigo = `${prefijo}-${num}`;
    const ts     = Date.now();

    if (dbReady) {
      const ins = await dbQ(`
        INSERT INTO turnos (codigo, paciente, documento, servicio, registrado_por, ts_creado)
        OUTPUT INSERTED.id, INSERTED.codigo, INSERTED.paciente, INSERTED.documento,
               INSERTED.servicio, INSERTED.modulo, INSERTED.estado,
               INSERTED.registrado_por, INSERTED.atendido_por, INSERTED.ts_creado
        VALUES (@codigo, @paciente, @doc, @servicio, @regPor, @ts)
      `, { codigo, paciente: paciente.trim(), doc: documento?.trim() || null, servicio, regPor: usuario.nombre, ts });

      const t = ins.recordset[0];
      await registrarHistorial(t.id, t.codigo, 'CREADO', usuario.nombre);
      emitir('turno_nuevo', { turno: t });
      return json(res, 201, { ok: true, turno: t });
    }

    const t = { id: mem.turnos.length + 1, codigo, paciente: paciente.trim(), documento: documento || null,
                servicio, modulo: '-', estado: 'En fila', atendido_por: null, registrado_por: usuario.nombre, nota: null,
                llamadas: 0, ts_creado: ts, ts_llamado: null, ts_atendido: null, ts_fin: null };
    mem.turnos.push(t);
    emitir('turno_nuevo', { turno: t });
    return json(res, 201, { ok: true, turno: t });
  } catch(e) {
    console.error('[crearTurno]', e.message);
    return json(res, 500, { error: 'Error al crear turno: ' + e.message });
  }
}

/* ═══════════════════════════════════════════════════════════════════
   20. TURNOS — ACTUALIZAR ESTADO  PATCH /api/turnos/:id
═══════════════════════════════════════════════════════════════════ */
async function actualizarTurno(req, res, id, usuario) {
  const b = await leerBody(req);
  const { estado, nota, modulo } = b;
  const ahora = Date.now();

  const sets = [];
  const p    = { id };

  if (estado) {
    sets.push('estado = @estado'); p.estado = estado;
    if (estado === 'Llamando') {
      sets.push('ts_llamado = @ahora', 'llamadas = llamadas + 1', 'atendido_por = @op');
      p.ahora = ahora; p.op = usuario.nombre;
      if (modulo) { sets.push('modulo = @modulo'); p.modulo = modulo; }
    }
    if (estado === 'Atendiendo') {
      sets.push('ts_atendido = @ahora'); p.ahora = ahora;
      if (!p.op) { sets.push('atendido_por = @op'); p.op = usuario.nombre; }
      if (modulo) { sets.push('modulo = @modulo'); p.modulo = modulo; }
      else if (usuario.modulo && usuario.modulo !== 'Sin módulo') {
        sets.push('modulo = @modulo'); p.modulo = usuario.modulo;
      }
    }
    if (['Finalizado','Cancelado','No atendido'].includes(estado)) {
      sets.push('ts_fin = @ahora'); p.ahora = ahora;
    }
  }
  if (nota !== undefined) { sets.push('nota = @nota'); p.nota = nota; }

  if (!sets.length) return json(res, 400, { error: 'Sin cambios.' });

  if (dbReady) {
    /* Bloqueo optimista: evita que dos usuarios atiendan el mismo turno */
    let whereExtra = '';
    if (estado === 'Llamando')   whereExtra = ` AND estado = 'En fila'`;
    if (estado === 'Atendiendo') whereExtra = ` AND estado IN ('En fila','Llamando')`;

    const r = await dbQ(`
      UPDATE turnos SET ${sets.join(', ')}
      OUTPUT INSERTED.id, INSERTED.codigo, INSERTED.paciente, INSERTED.documento, INSERTED.servicio,
             INSERTED.estado, INSERTED.modulo, INSERTED.atendido_por, INSERTED.registrado_por,
             INSERTED.ts_creado, INSERTED.ts_llamado, INSERTED.ts_atendido, INSERTED.ts_fin, INSERTED.nota
      WHERE id = @id${whereExtra}
    `, p);
    if (!r.recordset.length) return json(res, 409, { error: 'El turno ya está siendo atendido o no existe.' });
    const t = r.recordset[0];
    if (estado) {
      const accionMap = { Llamando:'LLAMADO', Atendiendo:'ATENDIDO', Finalizado:'FINALIZADO', Cancelado:'CANCELADO', 'No atendido':'CANCELADO' };
      if (accionMap[estado]) await registrarHistorial(t.id, t.codigo, accionMap[estado], usuario.nombre);
    }
    emitir('turno_actualizado', { turno: t });
    return json(res, 200, { ok: true, turno: t });
  }

  const t = mem.turnos.find(x => x.id === id);
  if (!t) return json(res, 404, { error: 'Turno no encontrado.' });
  /* Bloqueo en memoria */
  if (estado === 'Llamando'   && t.estado !== 'En fila')                       return json(res, 409, { error: 'El turno ya está siendo atendido.' });
  if (estado === 'Atendiendo' && !['En fila','Llamando'].includes(t.estado))   return json(res, 409, { error: 'El turno ya está siendo atendido.' });
  if (estado) t.estado = estado;
  if (nota !== undefined) t.nota = nota;
  if (modulo) t.modulo = modulo;
  if (estado === 'Llamando')  { t.ts_llamado  = ahora; t.atendido_por = usuario.nombre; t.llamadas++; }
  if (estado === 'Atendiendo'){ t.ts_atendido = ahora; if (!t.atendido_por) t.atendido_por = usuario.nombre; }
  if (['Finalizado','Cancelado','No atendido'].includes(estado)) t.ts_fin = ahora;
  emitir('turno_actualizado', { turno: t });
  return json(res, 200, { ok: true, turno: t });
}

/* ═══════════════════════════════════════════════════════════════════
   21. TURNOS — LLAMAR SIGUIENTE  POST /api/turnos/siguiente
═══════════════════════════════════════════════════════════════════ */
async function siguienteTurno(res, usuario) {
  const modOp = (usuario.modulo && usuario.modulo !== 'Sin módulo') ? usuario.modulo : 'Módulo 01';
  const ahora = Date.now();

  if (dbReady) {
    const next = await dbQ(`
      SELECT TOP 1 id FROM turnos
      WHERE  estado = 'En fila'
        AND  CAST(DATEADD(SECOND, ts_creado/1000, '19700101') AS DATE) = CAST(GETDATE() AS DATE)
      ORDER  BY ts_creado ASC
    `);
    if (!next.recordset.length) return json(res, 200, { ok: false, mensaje: 'No hay turnos en espera.' });

    const { id } = next.recordset[0];
    const upd = await dbQ(`
      UPDATE turnos
      SET    estado='Llamando', ts_llamado=@ahora, modulo=@mod,
             atendido_por=@op, llamadas=llamadas+1
      OUTPUT INSERTED.id, INSERTED.codigo, INSERTED.paciente, INSERTED.documento, INSERTED.servicio,
             INSERTED.estado, INSERTED.modulo, INSERTED.atendido_por,
             INSERTED.ts_creado, INSERTED.ts_llamado
      WHERE  id = @id
    `, { ahora, mod: modOp, op: usuario.nombre, id });

    const t = upd.recordset[0];
    await registrarHistorial(t.id, t.codigo, 'LLAMADO', usuario.nombre);
    emitir('turno_llamado', { turno: t });
    return json(res, 200, { ok: true, turno: t });
  }

  const idx = mem.turnos.findIndex(t => t.estado === 'En fila');
  if (idx < 0) return json(res, 200, { ok: false, mensaje: 'No hay turnos en espera.' });

  const t = mem.turnos[idx];
  t.estado = 'Llamando'; t.ts_llamado = ahora;
  t.modulo = modOp; t.atendido_por = usuario.nombre; t.llamadas++;
  emitir('turno_llamado', { turno: t });
  return json(res, 200, { ok: true, turno: t });
}

/* ═══════════════════════════════════════════════════════════════════
   22. SERVICIOS  /  MÓDULOS  /  DASHBOARD  /  HISTORIAL
═══════════════════════════════════════════════════════════════════ */
/* ═══════════════════════════════════════════════════════════════════
   22b. HISTORIAL DE ACCIONES
═══════════════════════════════════════════════════════════════════ */
async function registrarHistorial(turnoId, turnoCodigo, accion, usuario) {
  if (!dbReady) return;
  try {
    await dbQ(`
      INSERT INTO historial_turnos (turno_id, turno_codigo, accion, usuario, ts)
      VALUES (@tid, @tcod, @accion, @usr, @ts)
    `, { tid: turnoId, tcod: turnoCodigo, accion, usr: usuario || null, ts: Date.now() });
  } catch (e) {
    console.warn('[historial]', e.message);
  }
}

/* ═══════════════════════════════════════════════════════════════════
   22c. ESTADÍSTICAS POR FUNCIONARIO
═══════════════════════════════════════════════════════════════════ */
async function getEstadisticas(res, qp) {
  if (!dbReady) {
    /* Modo memoria: calcular desde mem.turnos */
    const byOp = {};
    for (const t of mem.turnos) {
      if (t.estado !== 'Finalizado' || !t.atendido_por) continue;
      const op = t.atendido_por;
      if (!byOp[op]) byOp[op] = { usuario: op, turnos_atendidos: 0, suma_atencion: 0, count_atencion: 0 };
      byOp[op].turnos_atendidos++;
      if (t.ts_atendido && t.ts_fin) {
        byOp[op].suma_atencion += (t.ts_fin - t.ts_atendido) / 60000;
        byOp[op].count_atencion++;
      }
    }
    const stats = Object.values(byOp).map(o => ({
      usuario: o.usuario,
      turnos_atendidos: o.turnos_atendidos,
      tiempo_promedio_atencion: o.count_atencion ? +(o.suma_atencion / o.count_atencion).toFixed(1) : null,
    }));
    return json(res, 200, { ok: true, estadisticas: stats });
  }

  const fechaFiltro = qp.fecha
    ? `CAST(DATEADD(SECOND, ts_creado/1000,'19700101') AS DATE) = CAST('${qp.fecha.replace(/[^\d\-]/g,'')}' AS DATE)`
    : `CAST(DATEADD(SECOND, ts_creado/1000,'19700101') AS DATE) = CAST(GETDATE() AS DATE)`;

  const r = await dbQ(`
    SELECT
      atendido_por                                                                   AS usuario,
      COUNT(*)                                                                       AS turnos_atendidos,
      AVG(CASE WHEN ts_atendido IS NOT NULL AND ts_fin IS NOT NULL
               THEN CAST(ts_fin - ts_atendido AS FLOAT)/60000.0 ELSE NULL END)      AS tiempo_promedio_atencion,
      MIN(modulo)                                                                    AS modulo_principal
    FROM turnos
    WHERE estado = 'Finalizado'
      AND atendido_por IS NOT NULL
      AND ${fechaFiltro}
    GROUP BY atendido_por
    ORDER BY turnos_atendidos DESC
  `);
  return json(res, 200, { ok: true, estadisticas: r.recordset });
}

/* ═══════════════════════════════════════════════════════════════════
   22d. ESTADÍSTICAS DETALLADAS POR FUNCIONARIO (rango de fechas)
═══════════════════════════════════════════════════════════════════ */
async function getEstadisticasDetalle(res, qp) {
  const fechaDesde = (qp.desde || '').replace(/[^\d-]/g, '');
  const fechaHasta = (qp.hasta || '').replace(/[^\d-]/g, '');
  if (!fechaDesde || !fechaHasta) return json(res, 400, { error: 'Parámetros desde y hasta son obligatorios (YYYY-MM-DD)' });

  let allTurnos = [];
  const hoy = fechaHoyStr();
  const fechas = generarRangoFechas(fechaDesde, fechaHasta);

  // 1. Leer desde archivos CSV para todas las fechas del rango
  for (const fecha of fechas) {
    const [y, m] = fecha.split('-');
    const csvPath = path.join(__dirname, 'turnos', y, m, `${fecha}.csv`);
    if (fs.existsSync(csvPath)) {
      try {
        const content = fs.readFileSync(csvPath, 'utf8');
        const lines = content.split(/\r?\n/).filter(l => l.trim());
        if (lines.length > 1) {
          const header = parseCSVLine(lines[0]);
          for (let i = 1; i < lines.length; i++) {
            const vals = parseCSVLine(lines[i]);
            if (!vals.length || (vals.length === 1 && !vals[0])) continue;
            const obj = {};
            header.forEach((h, idx) => { obj[h] = vals[idx] || ''; });
            allTurnos.push({
              codigo: obj.turno || '',
              paciente: obj.paciente || '',
              documento: obj.documento || '',
              servicio: obj.servicio || '',
              atendido_por: obj.operador || '',
              modulo: obj.modulo || '',
              estado: obj.estado || '',
              nota: obj.nota || null,
              hora_creacion: obj.hora_creacion || '',
              tiempo_espera_min: obj.tiempo_espera_min ? parseFloat(obj.tiempo_espera_min) : null,
              tiempo_atencion_min: obj.tiempo_atencion_min ? parseFloat(obj.tiempo_atencion_min) : null,
              ts_creado: null, ts_llamado: null, ts_atendido: null, ts_fin: null,
            });
          }
        }
      } catch (e) { console.warn(`[CSV] Error leyendo ${csvPath}:`, e.message); }
    }
  }

  // 2. Para hoy, si está en el rango y no existe CSV (turnos activos aún no archivados), leer de BD/memoria
  if (fechas.includes(hoy)) {
    const [yh, mh] = hoy.split('-');
    const csvHoy = path.join(__dirname, 'turnos', yh, mh, `${hoy}.csv`);
    if (!fs.existsSync(csvHoy)) {
      if (dbReady) {
        const r = await dbQ(`
          SELECT codigo, paciente, documento, servicio, modulo, estado,
                 atendido_por, registrado_por, nota, ts_creado, ts_llamado, ts_atendido, ts_fin
          FROM turnos
          WHERE CAST(DATEADD(SECOND, ts_creado/1000,'19700101') AS DATE) = CAST(GETDATE() AS DATE)
          ORDER BY ts_creado ASC
        `);
        for (const t of r.recordset) allTurnos.push(t);
      } else {
        for (const t of mem.turnos) allTurnos.push(t);
      }
    }
  }

  return json(res, 200, { ok: true, turnos: allTurnos });
}

function generarRangoFechas(desde, hasta) {
  const fechas = [];
  const d = new Date(desde + 'T12:00:00');
  const h = new Date(hasta + 'T12:00:00');
  while (d <= h) {
    fechas.push(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`);
    d.setDate(d.getDate() + 1);
  }
  return fechas;
}

/* ═══════════════════════════════════════════════════════════════════
   22d. ESTADÍSTICAS POR DÍA (CALENDARIO)
═══════════════════════════════════════════════════════════════════ */
async function getEstadisticasDia(res, qp) {
  const fecha = (qp.fecha || '').replace(/[^\d-]/g, '');
  if (!fecha) return json(res, 400, { error: 'Parámetro fecha es obligatorio (YYYY-MM-DD)' });

  const [y, m] = fecha.split('-');
  const csvPath = path.join(__dirname, 'turnos', y, m, `${fecha}.csv`);

  let turnos = [];
  let fuenteDatos = 'csv';

  // Intentar leer CSV
  if (fs.existsSync(csvPath)) {
    try {
      const content = fs.readFileSync(csvPath, 'utf8');
      const lines = content.split(/\r?\n/).filter(l => l.trim());
      if (lines.length > 1) {
        const header = parseCSVLine(lines[0]);
        for (let i = 1; i < lines.length; i++) {
          const vals = parseCSVLine(lines[i]);
          if (!vals.length || (vals.length === 1 && !vals[0])) continue;
          const obj = {};
          header.forEach((h, idx) => { obj[h] = vals[idx] || ''; });
          turnos.push(obj);
        }
      }
    } catch (e) { console.warn(`[CSV] Error leyendo ${csvPath}:`, e.message); }
  } else {
    // Si es hoy y no hay CSV, leer de BD/memoria
    const hoy = fechaHoyStr();
    if (fecha === hoy) {
      if (dbReady) {
        const r = await dbQ(`
          SELECT codigo, paciente, documento, servicio, modulo, estado,
                 atendido_por, ts_creado, ts_llamado, ts_atendido, ts_fin
          FROM turnos
          WHERE CAST(DATEADD(SECOND, ts_creado/1000,'19700101') AS DATE) = CAST(GETDATE() AS DATE)
          ORDER BY ts_creado ASC
        `);
        for (const t of r.recordset) {
          const horaCreacion = t.ts_creado ? new Date(Number(t.ts_creado)).toLocaleString('es-CO') : '';
          const tiempoEspera = (t.ts_creado && t.ts_atendido) ? Math.round((Number(t.ts_atendido) - Number(t.ts_creado)) / 60000) : '';
          const tiempoAtencion = (t.ts_atendido && t.ts_fin) ? Math.round((Number(t.ts_fin) - Number(t.ts_atendido)) / 60000) : '';
          turnos.push({
            turno: t.codigo, paciente: t.paciente, documento: t.documento || '',
            servicio: t.servicio || '', operador: t.atendido_por || '', modulo: t.modulo || '',
            hora_creacion: horaCreacion, tiempo_espera_min: String(tiempoEspera),
            tiempo_atencion_min: String(tiempoAtencion), estado: t.estado || ''
          });
        }
      } else {
        for (const t of mem.turnos) {
          const horaCreacion = t.ts_creado ? new Date(Number(t.ts_creado)).toLocaleString('es-CO') : '';
          const tiempoEspera = (t.ts_creado && t.ts_atendido) ? Math.round((Number(t.ts_atendido) - Number(t.ts_creado)) / 60000) : '';
          const tiempoAtencion = (t.ts_atendido && t.ts_fin) ? Math.round((Number(t.ts_fin) - Number(t.ts_atendido)) / 60000) : '';
          turnos.push({
            turno: t.codigo, paciente: t.paciente, documento: t.documento || '',
            servicio: t.servicio || '', operador: t.atendido_por || '', modulo: t.modulo || '',
            hora_creacion: horaCreacion, tiempo_espera_min: String(tiempoEspera),
            tiempo_atencion_min: String(tiempoAtencion), estado: t.estado || ''
          });
        }
      }
    }
  }

  // Si no hay turnos ni de CSV ni de BD, intentar reconstruir desde historial_turnos
  if (!turnos.length && dbReady) {
    try {
      const fechaSafe = fecha.replace(/[^\d-]/g, '');
      const r = await dbQ(`
        SELECT turno_codigo, accion, usuario, ts
        FROM historial_turnos
        WHERE CONVERT(VARCHAR(10), DATEADD(SECOND, ts/1000, '19700101'), 120) = '${fechaSafe}'
        ORDER BY ts ASC
      `);

      if (r.recordset.length > 0) {
        fuenteDatos = 'historial_bd';
        // Agrupar por turno_codigo para reconstruir datos
        const turnosMap = {};
        for (const h of r.recordset) {
          const cod = h.turno_codigo;
          if (!turnosMap[cod]) turnosMap[cod] = { turno: cod, acciones: [], ts_creado: null, ts_fin: null, operador: '', estado: '' };
          turnosMap[cod].acciones.push({ accion: h.accion, usuario: h.usuario, ts: Number(h.ts) });

          if (h.accion === 'CREADO') {
            turnosMap[cod].ts_creado = Number(h.ts);
            turnosMap[cod].registrado_por = h.usuario || '';
          }
          if (h.accion === 'FINALIZADO') {
            turnosMap[cod].ts_fin = Number(h.ts);
            turnosMap[cod].operador = h.usuario || '';
            turnosMap[cod].estado = 'Finalizado';
          }
          if (h.accion === 'CANCELADO') {
            turnosMap[cod].ts_fin = Number(h.ts);
            turnosMap[cod].estado = 'Cancelado';
          }
          if (h.accion === 'LLAMADO' && !turnosMap[cod].operador) {
            turnosMap[cod].operador = h.usuario || '';
          }
        }

        for (const cod of Object.keys(turnosMap)) {
          const t = turnosMap[cod];
          if (!t.estado) t.estado = 'Creado'; // solo fue creado, no hay acción final

          const horaCreacion = t.ts_creado ? new Date(t.ts_creado).toLocaleString('es-CO') : '';
          const tiempoTotal = (t.ts_creado && t.ts_fin) ? Math.round((t.ts_fin - t.ts_creado) / 60000) : '';

          turnos.push({
            turno: t.turno,
            paciente: '(auditoría BD)',
            documento: '',
            servicio: '',
            operador: t.operador,
            modulo: '',
            hora_creacion: horaCreacion,
            tiempo_espera_min: '',
            tiempo_atencion_min: String(tiempoTotal),
            estado: t.estado
          });
        }
      }
    } catch (e) { console.warn('[estadisticasDia] Error consultando historial:', e.message); }
  }

  if (!turnos.length) return json(res, 200, { ok: true, vacio: true, fecha, resumen: null, funcionarios: [], turnos: [] });

  // Calcular resumen
  const totalTurnos = turnos.length;
  const finalizados = turnos.filter(t => (t.estado || '').toLowerCase().includes('finalizado') || (t.estado || '').toLowerCase().includes('atendido')).length;
  const cancelados = turnos.filter(t => (t.estado || '').toLowerCase().includes('cancelado')).length;
  const noAtendidos = turnos.filter(t => {
    const e = (t.estado || '').toLowerCase();
    return e.includes('pendiente') || e.includes('en fila') || e.includes('no atendido');
  }).length;

  // Tiempos promedio
  const esperaVals = turnos.map(t => parseFloat(t.tiempo_espera_min)).filter(v => !isNaN(v) && v > 0);
  const atencionVals = turnos.map(t => parseFloat(t.tiempo_atencion_min)).filter(v => !isNaN(v) && v > 0);
  const promedioEspera = esperaVals.length ? Math.round(esperaVals.reduce((a, b) => a + b, 0) / esperaVals.length) : 0;
  const promedioAtencion = atencionVals.length ? Math.round(atencionVals.reduce((a, b) => a + b, 0) / atencionVals.length) : 0;

  // Hora pico
  const horasCount = {};
  turnos.forEach(t => {
    const hc = t.hora_creacion || '';
    // Extraer hora del formato "D/M/YYYY, HH:MM:SS" o "YYYY-MM-DD HH:MM:SS"
    let hora = '';
    const match = hc.match(/(\d{1,2}):(\d{2})/);
    if (match) hora = match[1].padStart(2, '0') + ':00';
    if (hora) horasCount[hora] = (horasCount[hora] || 0) + 1;
  });
  let horaPico = '', horaPicoCant = 0;
  for (const [h, c] of Object.entries(horasCount)) {
    if (c > horaPicoCant) { horaPico = h; horaPicoCant = c; }
  }

  const resumen = {
    total_turnos: totalTurnos,
    finalizados, cancelados, no_atendidos: noAtendidos,
    promedio_espera: promedioEspera, promedio_atencion: promedioAtencion,
    hora_pico: horaPico, hora_pico_cantidad: horaPicoCant
  };

  // Agrupar por operador
  const byOp = {};
  turnos.forEach(t => {
    const op = (t.operador || '').trim() || 'Sin asignar';
    if (!byOp[op]) byOp[op] = { nombre: op, turnos: [], modulos: {} };
    byOp[op].turnos.push(t);
    if (t.modulo) byOp[op].modulos[t.modulo] = (byOp[op].modulos[t.modulo] || 0) + 1;
  });

  const funcionarios = Object.values(byOp).map(f => {
    const moduloPrincipal = Object.entries(f.modulos).sort((a, b) => b[1] - a[1])[0];
    const atendidos = f.turnos.filter(t => {
      const e = (t.estado || '').toLowerCase();
      return e.includes('finalizado') || e.includes('atendido');
    }).length;
    return {
      nombre: f.nombre,
      total: f.turnos.length,
      atendidos,
      modulo_principal: moduloPrincipal ? moduloPrincipal[0] : ''
    };
  }).sort((a, b) => b.atendidos - a.atendidos);

  return json(res, 200, { ok: true, fecha, resumen, funcionarios, turnos, fuente: fuenteDatos });
}

async function getDiasDisponibles(res, qp) {
  const anio = (qp.anio || '').replace(/[^\d]/g, '');
  const mes = (qp.mes || '').replace(/[^\d]/g, '').padStart(2, '0');
  if (!anio || !mes) return json(res, 400, { error: 'Parámetros anio y mes obligatorios' });

  const dirPath = path.join(__dirname, 'turnos', anio, mes);
  let diasCSV = [];
  if (fs.existsSync(dirPath)) {
    const files = fs.readdirSync(dirPath).filter(f => f.endsWith('.csv'));
    diasCSV = files.map(f => f.replace('.csv', ''));
  }

  // Buscar fechas adicionales en historial_turnos (BD)
  let diasBD = [];
  if (dbReady) {
    try {
      const r = await dbQ(`
        SELECT DISTINCT
          CONVERT(VARCHAR(10), DATEADD(SECOND, ts/1000, '19700101'), 120) AS fecha
        FROM historial_turnos
        WHERE accion = 'CREADO'
          AND YEAR(DATEADD(SECOND, ts/1000, '19700101')) = ${parseInt(anio)}
          AND MONTH(DATEADD(SECOND, ts/1000, '19700101')) = ${parseInt(mes)}
        ORDER BY fecha
      `);
      diasBD = r.recordset.map(r => r.fecha);
    } catch (e) { console.warn('[diasDisponibles] Error consultando historial:', e.message); }
  }

  // Combinar: CSV + BD (sin duplicados)
  const allDias = [...new Set([...diasCSV, ...diasBD])];

  // Si es el mes actual, agregar hoy si hay turnos activos
  const hoy = fechaHoyStr();
  const [hy, hm] = hoy.split('-');
  if (hy === anio && hm === mes && !allDias.includes(hoy)) {
    const hayTurnos = dbReady
      ? (await dbQ(`SELECT COUNT(*) AS c FROM turnos WHERE CAST(DATEADD(SECOND, ts_creado/1000,'19700101') AS DATE) = CAST(GETDATE() AS DATE)`)).recordset[0].c > 0
      : mem.turnos.length > 0;
    if (hayTurnos) allDias.push(hoy);
  }

  return json(res, 200, { ok: true, dias: allDias.sort(), diasCSV, diasBD });
}

function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') { inQuotes = !inQuotes; continue; }
    if (c === ',' && !inQuotes) { result.push(current.trim()); current = ''; continue; }
    current += c;
  }
  result.push(current.trim());
  return result;
}

/* ═══════════════════════════════════════════════════════════════════
   GUARDADO AUTOMÁTICO DIARIO DE TURNOS A CSV
═══════════════════════════════════════════════════════════════════ */
let ultimaFechaGuardada = '';

function fechaHoyStr() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
}

function csvEscape(val) {
  if (val == null || val === '') return '""';
  const s = String(val);
  return `"${s.replace(/"/g, '""')}"`;
}

async function guardarCSVDiario(fechaStr) {
  const [y, m] = fechaStr.split('-');
  const dirPath = path.join(__dirname, 'turnos', y, m);
  const csvPath = path.join(dirPath, `${fechaStr}.csv`);

  if (fs.existsSync(csvPath)) {
    console.log(`[CSV] Archivo ${fechaStr}.csv ya existe, omitiendo.`);
    return;
  }

  let turnosDelDia = [];

  if (dbReady) {
    const r = await dbQ(`
      SELECT codigo, paciente, documento, servicio, modulo, estado,
             atendido_por, nota, ts_creado, ts_llamado, ts_atendido, ts_fin
      FROM turnos
      WHERE CAST(DATEADD(SECOND, ts_creado/1000, '19700101') AS DATE) = CAST(@fecha AS DATE)
      ORDER BY ts_creado ASC
    `, { fecha: fechaStr });
    turnosDelDia = r.recordset;
  } else {
    turnosDelDia = mem.turnos.filter(t => {
      const d = new Date(t.ts_creado);
      const ds = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
      return ds === fechaStr;
    });
  }

  if (!turnosDelDia.length) {
    console.log(`[CSV] No hay turnos para ${fechaStr}, omitiendo.`);
    return;
  }

  fs.mkdirSync(dirPath, { recursive: true });

  const header = 'turno,paciente,documento,servicio,operador,modulo,hora_creacion,tiempo_espera_min,tiempo_atencion_min,estado';
  const lines = [header];

  for (const t of turnosDelDia) {
    const horaCreacion = t.ts_creado ? new Date(Number(t.ts_creado)).toLocaleString('es-CO') : '';
    const tiempoEspera = (t.ts_creado && t.ts_atendido)
      ? Math.round((Number(t.ts_atendido) - Number(t.ts_creado)) / 60000) : '';
    const tiempoAtencion = (t.ts_atendido && t.ts_fin)
      ? Math.round((Number(t.ts_fin) - Number(t.ts_atendido)) / 60000) : '';

    lines.push([
      csvEscape(t.codigo),
      csvEscape(t.paciente),
      csvEscape(t.documento || ''),
      csvEscape(t.servicio || ''),
      csvEscape(t.atendido_por || ''),
      csvEscape(t.modulo || ''),
      csvEscape(horaCreacion),
      tiempoEspera,
      tiempoAtencion,
      csvEscape(t.estado || '')
    ].join(','));
  }

  fs.writeFileSync(csvPath, lines.join('\n'), 'utf8');
  console.log(`✅ [CSV] Guardados ${turnosDelDia.length} turnos en ${csvPath}`);
}

async function limpiarTurnosDelDia(fechaStr) {
  if (dbReady) {
    await dbQ(`
      DELETE FROM turnos
      WHERE CAST(DATEADD(SECOND, ts_creado/1000, '19700101') AS DATE) = CAST(@fecha AS DATE)
    `, { fecha: fechaStr });
    console.log(`[CSV] Turnos del ${fechaStr} eliminados de la BD.`);
  } else {
    mem.turnos = mem.turnos.filter(t => {
      const d = new Date(t.ts_creado);
      const ds = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
      return ds !== fechaStr;
    });
    console.log(`[CSV] Turnos del ${fechaStr} eliminados de memoria.`);
  }
}

async function verificarCambioDia() {
  const hoy = fechaHoyStr();
  if (!ultimaFechaGuardada) {
    ultimaFechaGuardada = hoy;
    return;
  }
  if (hoy !== ultimaFechaGuardada) {
    console.log(`[CSV] Cambio de día detectado: ${ultimaFechaGuardada} → ${hoy}`);
    try {
      await guardarCSVDiario(ultimaFechaGuardada);
      await limpiarTurnosDelDia(ultimaFechaGuardada);
      if (dbReady) {
        await dbQ(`UPDATE config SET valor = '100' WHERE clave = 'contador'`);
      } else {
        mem.contador = 100;
      }
      console.log(`✅ [CSV] Contador de turnos reiniciado para nuevo día.`);
    } catch (e) {
      console.error(`[CSV] Error en cambio de día:`, e.message);
    }
    ultimaFechaGuardada = hoy;
  }
}

async function guardarTurnosPendientes() {
  const hoy = fechaHoyStr();
  if (dbReady) {
    try {
      const r = await dbQ(`
        SELECT DISTINCT CONVERT(VARCHAR(10), DATEADD(SECOND, ts_creado/1000, '19700101'), 120) AS fecha
        FROM turnos
        WHERE CAST(DATEADD(SECOND, ts_creado/1000, '19700101') AS DATE) < CAST(GETDATE() AS DATE)
      `);
      for (const row of r.recordset) {
        const fecha = row.fecha;
        if (fecha && fecha !== hoy) {
          await guardarCSVDiario(fecha);
          await limpiarTurnosDelDia(fecha);
        }
      }
    } catch (e) {
      console.warn(`[CSV] Error al guardar turnos pendientes:`, e.message);
    }
  }
}

async function obtenerImagenes(res) {
  const imgDir = path.join(__dirname, 'img');
  try {
    if (!fs.existsSync(imgDir)) return json(res, 200, { ok: true, imagenes: [] });
    const archivos = [];
    const leerDir = (dir, prefix) => {
      const items = fs.readdirSync(dir);
      for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) leerDir(fullPath, prefix ? `${prefix}/${item}` : item);
        else if (/\.(png|jpg|jpeg|gif|svg|webp)$/i.test(item)) archivos.push(prefix ? `${prefix}/${item}` : item);
      }
    };
    leerDir(imgDir, '');
    return json(res, 200, { ok: true, imagenes: archivos });
  } catch (e) { return json(res, 200, { ok: true, imagenes: [] }); }
}

async function getServicios(res) {
  if (dbReady) {
    const r = await dbQ(`SELECT id, nombre, prefijo, color FROM servicios WHERE activo=1 ORDER BY nombre`);
    return json(res, 200, { ok: true, servicios: r.recordset });
  }
  json(res, 200, { ok: true, servicios: [
    { nombre:'Neurología',prefijo:'N',color:'#3B72F2' },
    { nombre:'Psiquiatría',prefijo:'P',color:'#8B5CF6' },
    { nombre:'Kinesiología',prefijo:'K',color:'#22C55E' },
    { nombre:'General',prefijo:'G',color:'#F59E0B' },
    { nombre:'Laboratorio',prefijo:'L',color:'#EF4444' },
  ]});
}

async function getModulos(res) {
  if (dbReady) {
    const r = await dbQ(`SELECT id, nombre, servicio FROM modulos WHERE activo=1 ORDER BY nombre`);
    return json(res, 200, { ok: true, modulos: r.recordset });
  }
  json(res, 200, { ok: true, modulos: [] });
}

async function getUsuarios(res) {
  if (!dbReady) {
    const usuarios = mem.usuarios.map(u => ({
      id: u.id, nombre: u.nombre, username: u.username,
      rol: u.rol, modulo: u.modulo, color: u.color, activo: u.activo
    }));
    return json(res, 200, { ok: true, usuarios });
  }
  const r = await dbQ(`SELECT id, nombre, username, rol, modulo, color, activo FROM usuarios WHERE activo=1 ORDER BY nombre`);
  return json(res, 200, { ok: true, usuarios: r.recordset });
}

/* ═══════════════════════════════════════════════════════════════════
   21b. USUARIOS — CRUD
═══════════════════════════════════════════════════════════════════ */
async function crearUsuario(req, res, usuarioAuth) {
  const b = await leerBody(req);
  const { nombre, username, password, rol, email, modulo } = b;

  if (!nombre?.trim())     return json(res, 400, { error: 'El nombre es obligatorio.' });
  if (!username?.trim())   return json(res, 400, { error: 'El nombre de usuario es obligatorio.' });
  if (!password)           return json(res, 400, { error: 'La contraseña es obligatoria.' });
  if (password.length < 6) return json(res, 400, { error: 'Mínimo 6 caracteres en la contraseña.' });

  const nom  = nombre.trim().slice(0, 120);
  const user = username.trim().toLowerCase().slice(0, 60);
  const rolV = ['Administrador','Médico','Enfermero','Recepcionista','Administrativo','Linea de Frente'].includes(rol)
               ? rol : 'Recepcionista';
  const color = '#' + crypto.randomBytes(3).toString('hex');
  const hash  = await bcrypt.hash(password, 12);

  if (dbReady) {
    const dup = await dbQ(`SELECT 1 FROM usuarios WHERE username = @u`, { u: user });
    if (dup.recordset.length) return json(res, 409, { error: 'El nombre de usuario ya está en uso.' });

    const ins = await dbQ(`
      INSERT INTO usuarios (nombre, username, password_hash, rol, email, color, modulo, activo)
      OUTPUT INSERTED.id, INSERTED.nombre, INSERTED.username, INSERTED.rol, INSERTED.email, INSERTED.color, INSERTED.modulo, INSERTED.activo
      VALUES (@nom, @user, @hash, @rol, @email, @color, @mod, 1)
    `, { nom, user, hash, rol: rolV, email: (email || '').trim(), color, mod: modulo || 'Sin módulo' });
    const nuevo = ins.recordset[0];
    emitir('usuario_creado', { usuario: nuevo });
    return json(res, 201, { ok: true, usuario: nuevo });
  }
  // Modo memoria
  const dupMem = mem.usuarios.find(u => u.username === user);
  if (dupMem) return json(res, 409, { error: 'El nombre de usuario ya está en uso.' });
  const nuevo = { id: Date.now(), nombre: nom, username: user, password_hash: hash, rol: rolV, email: (email || '').trim(), color, modulo: modulo || 'Sin módulo', activo: true };
  mem.usuarios.push(nuevo);
  emitir('usuario_creado', { usuario: { id: nuevo.id, nombre: nuevo.nombre, username: nuevo.username, rol: nuevo.rol, email: nuevo.email, color: nuevo.color, modulo: nuevo.modulo, activo: nuevo.activo } });
  return json(res, 201, { ok: true, usuario: { id: nuevo.id, nombre: nuevo.nombre, username: nuevo.username, rol: nuevo.rol, email: nuevo.email, color: nuevo.color, modulo: nuevo.modulo, activo: nuevo.activo } });
}

async function actualizarUsuario(req, res, id) {
  const b = await leerBody(req);
  const { nombre, username, password, rol, email, modulo, activo } = b;

  if (dbReady) {
    const sets = [];
    const params = { id };
    if (nombre !== undefined)   { sets.push('nombre = @nom');   params.nom  = nombre.trim().slice(0, 120); }
    if (username !== undefined) { sets.push('username = @user'); params.user = username.trim().toLowerCase().slice(0, 60); }
    if (rol !== undefined)      { sets.push('rol = @rol');      params.rol  = rol; }
    if (email !== undefined)    { sets.push('email = @email');  params.email = email.trim(); }
    if (modulo !== undefined)   { sets.push('modulo = @mod');   params.mod  = modulo; }
    if (activo !== undefined)   { sets.push('activo = @act');   params.act  = activo ? 1 : 0; }
    if (password) {
      const hash = await bcrypt.hash(password, 12);
      sets.push('password_hash = @hash'); params.hash = hash;
    }
    if (!sets.length) return json(res, 400, { error: 'No hay campos para actualizar.' });

    await dbQ(`UPDATE usuarios SET ${sets.join(', ')} WHERE id = @id`, params);
    const r = await dbQ(`SELECT id, nombre, username, rol, email, color, modulo, activo FROM usuarios WHERE id = @id`, { id });
    const updated = r.recordset[0];
    if (!updated) return json(res, 404, { error: 'Usuario no encontrado.' });
    emitir('usuario_actualizado', { usuario: updated });
    return json(res, 200, { ok: true, usuario: updated });
  }
  // Modo memoria
  const u = mem.usuarios.find(x => x.id === id);
  if (!u) return json(res, 404, { error: 'Usuario no encontrado.' });
  if (nombre !== undefined)   u.nombre   = nombre.trim().slice(0, 120);
  if (username !== undefined) u.username = username.trim().toLowerCase().slice(0, 60);
  if (rol !== undefined)      u.rol      = rol;
  if (email !== undefined)    u.email    = email.trim();
  if (modulo !== undefined)   u.modulo   = modulo;
  if (activo !== undefined)   u.activo   = !!activo;
  if (password) u.password_hash = await bcrypt.hash(password, 12);
  const safe = { id: u.id, nombre: u.nombre, username: u.username, rol: u.rol, email: u.email, color: u.color, modulo: u.modulo, activo: u.activo };
  emitir('usuario_actualizado', { usuario: safe });
  return json(res, 200, { ok: true, usuario: safe });
}

async function eliminarUsuario(res, id) {
  if (dbReady) {
    const r = await dbQ(`SELECT id, nombre FROM usuarios WHERE id = @id`, { id });
    if (!r.recordset.length) return json(res, 404, { error: 'Usuario no encontrado.' });
    await dbQ(`UPDATE usuarios SET activo = 0 WHERE id = @id`, { id });
    emitir('usuario_eliminado', { id });
    return json(res, 200, { ok: true, mensaje: 'Usuario desactivado.' });
  }
  // Modo memoria
  const idx = mem.usuarios.findIndex(x => x.id === id);
  if (idx < 0) return json(res, 404, { error: 'Usuario no encontrado.' });
  mem.usuarios[idx].activo = false;
  emitir('usuario_eliminado', { id });
  return json(res, 200, { ok: true, mensaje: 'Usuario desactivado.' });
}

async function cambiarModuloUsuario(req, res, id) {
  const { modulo } = await leerBody(req);
  if (!modulo) return json(res, 400, { error: 'Módulo es obligatorio.' });

  if (dbReady) {
    await dbQ(`UPDATE usuarios SET modulo = @mod WHERE id = @id`, { id, mod: modulo });
    const r = await dbQ(`SELECT id, nombre, username, rol, email, color, modulo, activo FROM usuarios WHERE id = @id`, { id });
    if (!r.recordset.length) return json(res, 404, { error: 'Usuario no encontrado.' });
    emitir('usuario_actualizado', { usuario: r.recordset[0] });
    return json(res, 200, { ok: true, usuario: r.recordset[0] });
  }
  // Modo memoria
  const u = mem.usuarios.find(x => x.id === id);
  if (!u) return json(res, 404, { error: 'Usuario no encontrado.' });
  u.modulo = modulo;
  const safe = { id: u.id, nombre: u.nombre, username: u.username, rol: u.rol, email: u.email, color: u.color, modulo: u.modulo, activo: u.activo };
  emitir('usuario_actualizado', { usuario: safe });
  return json(res, 200, { ok: true, usuario: safe });
}

async function getDashboard(res) {
  if (!dbReady) return json(res, 200, { ok: true, stats: {}, turnos: [] });
  const [s, u] = await Promise.all([
    dbQ(`
      SELECT
        COUNT(*) AS total,
        SUM(CASE WHEN estado='En fila'      THEN 1 ELSE 0 END) AS en_fila,
        SUM(CASE WHEN estado IN ('Atendiendo','Llamando') THEN 1 ELSE 0 END) AS atendiendo,
        SUM(CASE WHEN estado='Finalizado'   THEN 1 ELSE 0 END) AS finalizados,
        SUM(CASE WHEN estado='Cancelado'    THEN 1 ELSE 0 END) AS cancelados,
        AVG(CASE WHEN ts_atendido IS NOT NULL
                 THEN CAST(ts_atendido - ts_creado AS FLOAT)/60000.0 ELSE NULL END) AS promedio_espera_min
      FROM turnos
      WHERE CAST(DATEADD(SECOND, ts_creado/1000,'19700101') AS DATE) = CAST(GETDATE() AS DATE)
    `),
    dbQ(`
      SELECT TOP 10 codigo, paciente, servicio, estado, modulo, atendido_por,
                    ts_creado, ts_llamado, ts_atendido, ts_fin
      FROM  turnos
      WHERE CAST(DATEADD(SECOND, ts_creado/1000,'19700101') AS DATE) = CAST(GETDATE() AS DATE)
      ORDER BY ts_creado DESC
    `),
  ]);
  json(res, 200, { ok: true, stats: s.recordset[0], turnos: u.recordset });
}

async function getHistorial(res, qp) {
  if (!dbReady) return json(res, 200, { ok: true, turnos: [] });
  const conds = [`estado IN ('Finalizado','Cancelado','No atendido')`];
  const p     = {};
  if (qp.servicio) { conds.push(`servicio     =  @srv`);    p.srv    = qp.servicio; }
  if (qp.estado)   { conds.push(`estado       =  @est`);    p.est    = qp.estado; }
  if (qp.operador) { conds.push(`atendido_por LIKE @op`);   p.op     = `%${qp.operador}%`; }
  if (qp.buscar)   { conds.push(`(paciente LIKE @q OR codigo LIKE @q OR documento LIKE @q)`); p.q = `%${qp.buscar}%`; }
  if (qp.desde)    { conds.push(`ts_creado >= @desde`);     p.desde  = parseInt(qp.desde, 10); }
  if (qp.hasta)    { conds.push(`ts_creado <= @hasta`);     p.hasta  = parseInt(qp.hasta, 10); }

  const r = await dbQ(`
    SELECT TOP 200 id, codigo, paciente, documento, servicio, modulo, estado,
                   atendido_por, nota, ts_creado, ts_llamado, ts_atendido, ts_fin
    FROM  turnos WHERE ${conds.join(' AND ')}
    ORDER BY ts_creado DESC
  `, p);
  json(res, 200, { ok: true, turnos: r.recordset });
}

/* ═══════════════════════════════════════════════════════════════════
   23. SERVIDOR HTTP Y ARRANQUE
═══════════════════════════════════════════════════════════════════ */
const servidor = http.createServer((req, res) => {
  manejar(req, res).catch(err => {
    console.error('[FATAL]', err);
    if (!res.headersSent) json(res, 500, { error: 'Error interno' });
  });
});

function ipsLocales() {
  const ips = [];
  for (const iface of Object.values(os.networkInterfaces()))
    for (const a of iface)
      if (a.family === 'IPv4' && !a.internal) ips.push(a.address);
  return ips;
}

async function arrancar() {
  console.log('\n┌────────────────────────────────────────────────────────────┐');
  console.log('│         NeuroTurn v2.1 — iniciando servidor...             │');
  console.log('└────────────────────────────────────────────────────────────┘');

  await conectarDB();
  await inicializarMemoria();

  // Guardar turnos de días anteriores pendientes y arrancar verificación diaria
  ultimaFechaGuardada = fechaHoyStr();
  await guardarTurnosPendientes();
  setInterval(() => verificarCambioDia().catch(e => console.error('[CSV interval]', e.message)), 60000);

  servidor.listen(PORT, HOST, () => {
    const ips      = ipsLocales();
    const estadoDB = dbReady
      ? `✅  SQL Server  →  ${DB_SERVER} / ${DB_NAME}`
      : '⚠️   Sin BD (modo memoria — datos no persisten)';

    const L = txt => `║  ${txt.padEnd(60)}║`;

    console.log('\n╔═══════════════════════════════════════════════════════════════╗');
    console.log('║          NeuroTurn v2.1 — Servidor de Producción             ║');
    console.log('╠═══════════════════════════════════════════════════════════════╣');
    console.log(L(`BD:    ${estadoDB}`));
    console.log('║                                                               ║');
    console.log(L(`Local: http://localhost:${PORT}`));
    for (const ip of ips)
      console.log(L(`Red:   http://${ip}:${PORT}   ← compartir con clientes`));
    console.log('║                                                               ║');
    console.log(L('API REST:  /api/*'));
    console.log(L('Tiempo real (SSE):  GET /events'));
    console.log(L('Estado:   GET /api/estado'));
    console.log('║                                                               ║');
    console.log(L('Ctrl+C para detener'));
    console.log('╚═══════════════════════════════════════════════════════════════╝\n');
  });
}

arrancar();

servidor.on('error', err => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\n❌  Puerto ${PORT} en uso. Usa: PORT=3001 node server.js\n`);
  } else console.error('Error del servidor:', err);
  process.exit(1);
});

process.on('SIGINT',  cerrar);
process.on('SIGTERM', cerrar);

async function cerrar() {
  console.log('\n🛑  Cerrando...');
  try { if (pool) await pool.close(); } catch (_) {}
  process.exit(0);
}

process.on('unhandledRejection', reason => console.error('[UnhandledRejection]', reason));
