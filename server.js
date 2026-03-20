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

  await r.query(`
    IF NOT EXISTS (SELECT 1 FROM sysobjects WHERE name='usuarios_historial' AND xtype='U')
    CREATE TABLE usuarios_historial (
      id           INT IDENTITY(1,1) PRIMARY KEY,
      usuario_id   INT           NOT NULL,
      username     NVARCHAR(60)  NOT NULL,
      accion       NVARCHAR(40)  NOT NULL,
      detalles     NVARCHAR(500) NULL,
      ip           NVARCHAR(45)  NULL,
      ts           DATETIME2     NOT NULL DEFAULT SYSDATETIME()
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
    INSERT INTO config VALUES ('contador', '0');
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
const mem = { usuarios: [], turnos: [], contador: 0, modulosActuales: {} };

// Inicializar usuarios de prueba si no hay base de datos
async function inicializarMemoria() {
  if (mem.usuarios.length === 0 && bcrypt) {
    const usuariosPrueba = [
      { nombre: 'Administrador', username: 'admin', password: 'admin123', rol: 'Administrador', modulo: 'Módulo 01' },
      { nombre: 'Dr. Juan García', username: 'juangarcia', password: 'medico123', rol: 'Médico', modulo: 'Módulo 01' },
      { nombre: 'Enfermera María López', username: 'marialopez', password: 'enfermera123', rol: 'Enfermero', modulo: 'Módulo 02' },
      { nombre: 'Recepcionista Carlos', username: 'carlos', password: 'recepcion123', rol: 'Recepcionista', modulo: 'Sin módulo' },
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
   9B. INSERTAR USUARIOS DE PRUEBA EN BD
═══════════════════════════════════════════════════════════════════ */
async function insertarUsuariosDePrueba() {
  if (!dbReady || !pool) return; // Solo si la BD está lista
  
  try {
    // Usuarios de prueba con contraseñas claras (se hashearán)
    const usuariosPrueba = [
      { nombre: 'Administrador', username: 'admin', password: 'admin123', rol: 'Administrador', modulo: 'Módulo 01' },
      { nombre: 'Dr. Juan García', username: 'juangarcia', password: 'medico123', rol: 'Médico', modulo: 'Módulo 01' },
      { nombre: 'Enfermera María López', username: 'marialopez', password: 'enfermera123', rol: 'Enfermero', modulo: 'Módulo 02' },
      { nombre: 'Recepcionista Carlos', username: 'carlos', password: 'recepcion123', rol: 'Recepcionista', modulo: 'Sin módulo' },
    ];
    
    // Asegurar que cada usuario de prueba existe con la contraseña correcta
    for (const u of usuariosPrueba) {
      try {
        // Verificar si el usuario ya existe
        const existe = await dbQ('SELECT id FROM usuarios WHERE username = @user', { user: u.username });
        const hash = await bcrypt.hash(u.password, 12);
        const color = '#' + crypto.randomBytes(3).toString('hex');
        
        if (existe.recordset && existe.recordset.length > 0) {
          // Usuario existe, actualizar si es necesario
          const usuarioActual = existe.recordset[0];
          const req = pool.request();
          req.input('id', sql.Int, usuarioActual.id);
          req.input('pass_hash', sql.NVarChar, hash);
          req.input('rol', sql.NVarChar, u.rol);
          req.input('nombre', sql.NVarChar, u.nombre);
          req.input('modulo', sql.NVarChar, u.modulo);
          
          await req.query(`
            UPDATE usuarios 
            SET password_hash = @pass_hash, rol = @rol, nombre = @nombre, modulo = @modulo, activo = 1
            WHERE id = @id
          `);
        } else {
          // Usuario no existe, crearlo
          const req = pool.request();
          req.input('nombre', sql.NVarChar, u.nombre);
          req.input('username', sql.NVarChar, u.username);
          req.input('pass_hash', sql.NVarChar, hash);
          req.input('rol', sql.NVarChar, u.rol);
          req.input('modulo', sql.NVarChar, u.modulo);
          req.input('color', sql.NVarChar, color);
          
          await req.query(`
            INSERT INTO usuarios (nombre, username, password_hash, rol, modulo, activo, color)
            VALUES (@nombre, @username, @pass_hash, @rol, @modulo, 1, @color)
          `);
        }
      } catch (err) {
        console.warn(`   ⚠️  Error procesando usuario ${u.username}: ${err.message}`);
      }
    }
    
    console.log('✅ Usuarios de prueba verificados/actualizados en la BD');
  } catch (err) {
    console.warn(`   ⚠️  Error en insertarUsuariosDePrueba: ${err.message}`);
  }
}

/* ═══════════════════════════════════════════════════════════════════
   9C. ASEGURAR USUARIO ADMIN (crea si no existe)
═══════════════════════════════════════════════════════════════════ */
async function asegurarUsuarioAdmin() {
  if (!dbReady || !pool) return;
  
  try {
    // Verificar si existe usuario admin
    const r = await dbQ(`SELECT id FROM usuarios WHERE username = 'admin'`);
    if (r.recordset && r.recordset.length > 0) {
      console.log('✅ Usuario admin ya existe');
      return;
    }

    // Admin no existe, crearlo
    const hash = await bcrypt.hash('admin123', 12);
    const color = '#' + crypto.randomBytes(3).toString('hex');
    
    const req = pool.request();
    req.input('nombre', sql.NVarChar, 'Administrador');
    req.input('username', sql.NVarChar, 'admin');
    req.input('pass_hash', sql.NVarChar, hash);
    req.input('rol', sql.NVarChar, 'Administrador');
    req.input('modulo', sql.NVarChar, 'Módulo 01');
    req.input('color', sql.NVarChar, color);
    
    await req.query(`
      INSERT INTO usuarios (nombre, username, password_hash, rol, modulo, activo, color)
      VALUES (@nombre, @username, @pass_hash, @rol, @modulo, 1, @color)
    `);
    
    console.log('✅ Usuario admin creado correctamente');
  } catch (err) {
    console.warn(`   ⚠️  Error al crear/verificar usuario admin: ${err.message}`);
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
  
  // Archivos permitidos desde la raíz (sin carpeta)
  const permitidosRaiz = ['index.html', 'usuarios-module.js', 'Logo.png'];
  
  for (const base of bases) {
    const file    = (pathname === '/' ? 'index.html' : pathname).replace(/^[\/\\]+/, '');
    const resolved = path.resolve(path.join(base, file));
    const baseAbs  = path.resolve(base);
    // Security: resolved path must stay inside the base directory
    if (!resolved.startsWith(baseAbs + path.sep) && resolved !== baseAbs) continue;
    // Security: from __dirname root, solo servir archivos permitidos (never expose server code / .env / schema)
    if (base === __dirname && !permitidosRaiz.includes(path.basename(resolved))) continue;
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

  /* ── Autenticación requerida ────────────────────────────────── */
  const usuario = autenticar(req);
  if (!usuario) { json(res, 401, { error: 'Token inválido o expirado. Inicia sesión nuevamente.' }); return; }

  /* /api/auth/me */
  if (ruta === '/api/auth/me' && metodo === 'GET') { json(res, 200, { ok: true, usuario }); return; }

  /* Turnos */
  if (ruta === '/api/turnos'           && metodo === 'GET')  { await getTurnos(res);                        return; }
  if (ruta === '/api/turnos'           && metodo === 'POST') { await crearTurno(req, res, usuario);         return; }
  if (ruta === '/api/turnos/siguiente' && metodo === 'POST') { await siguienteTurno(req, res, usuario);          return; }

  const mTurno = ruta.match(/^\/api\/turnos\/(\d+)$/);
  if (mTurno && metodo === 'PATCH') { await actualizarTurno(req, res, parseInt(mTurno[1], 10), usuario); return; }

  /* Datos de referencia */
  if (ruta === '/api/servicios' && metodo === 'GET') { await getServicios(res); return; }
  if (ruta === '/api/modulos'   && metodo === 'GET') { await getModulos(res);   return; }
  if (ruta === '/api/usuarios'  && metodo === 'GET')  { await getUsuarios(res);  return; }
  if (ruta === '/api/usuarios'  && metodo === 'POST') { await crearUsuario(req, res, usuario); return; }

  const mUsuarioId = ruta.match(/^\/api\/usuarios\/(\d+)$/);
  if (mUsuarioId && metodo === 'PATCH') { await actualizarUsuario(req, res, parseInt(mUsuarioId[1], 10), usuario); return; }
  if (mUsuarioId && metodo === 'DELETE') { await eliminarUsuario(req, res, parseInt(mUsuarioId[1], 10), usuario); return; }

  const mPasswordId = ruta.match(/^\/api\/usuarios\/(\d+)\/password$/);
  if (mPasswordId && metodo === 'PATCH') { await cambiarPassword(req, res, parseInt(mPasswordId[1], 10), usuario); return; }

  const mModuloActualId = ruta.match(/^\/api\/usuarios\/(\d+)\/modulo-actual$/);
  if (mModuloActualId && metodo === 'PATCH') { await cambiarModuloActual(req, res, parseInt(mModuloActualId[1], 10), usuario); return; }

  const mHistorialId = ruta.match(/^\/api\/usuarios\/(\d+)\/historial$/);
  if (mHistorialId && metodo === 'GET') { await getHistorialUsuario(res, parseInt(mHistorialId[1], 10)); return; }

  if (ruta === '/api/dashboard'    && metodo === 'GET') { await getDashboard(res); return; }
  if (ruta === '/api/historial'     && metodo === 'GET') { await getHistorial(res, qp); return; }
  if (ruta === '/api/estadisticas'  && metodo === 'GET') { await getEstadisticas(res, qp); return; }

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
  const rolV = ['Administrador','Médico','Enfermero','Recepcionista','Administrativo','Linea de frente'].includes(rol)
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

  const payload = { id: fila.id, nombre: fila.nombre, username: fila.username, rol: fila.rol, modulo: fila.modulo, color: fila.color, moduloActual: mem.modulosActuales[fila.id] || null };
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
      WHERE  CAST(DATEADD(SECOND, ts_creado/1000, '1970-01-01') AS DATE) >= CAST(DATEADD(DAY, -7, GETDATE()) AS DATE)
      ORDER  BY ts_creado ASC
    `);
    // Asegurar que los timestamps son números válidos
    const turnos = r.recordset.map(t => ({
      ...t,
      ts_creado: t.ts_creado ? Number(t.ts_creado) : null,
      ts_llamado: t.ts_llamado ? Number(t.ts_llamado) : null,
      ts_atendido: t.ts_atendido ? Number(t.ts_atendido) : null,
      ts_fin: t.ts_fin ? Number(t.ts_fin) : null,
    }));
    return json(res, 200, { ok: true, turnos });
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
    const codigo = `${prefijo}-${String(num).padStart(3, '0')}`;
    const ts     = Date.now();

    if (dbReady) {
      const ins = await dbQ(`
        INSERT INTO turnos (codigo, paciente, documento, servicio, registrado_por, ts_creado)
        OUTPUT INSERTED.id, INSERTED.codigo, INSERTED.paciente, INSERTED.documento,
               INSERTED.servicio, INSERTED.modulo, INSERTED.estado,
               INSERTED.registrado_por, INSERTED.atendido_por, INSERTED.ts_creado
        VALUES (@codigo, @paciente, @doc, @servicio, @regPor, @ts)
      `, { codigo, paciente: paciente.trim(), doc: documento?.trim() || null, servicio, regPor: usuario.nombre, ts });

      let t = ins.recordset[0];
      // Asegurar que ts_creado es un número válido
      t = { ...t, ts_creado: t.ts_creado ? Number(t.ts_creado) : null };
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
    let t = r.recordset[0];
    // Asegurar que los timestamps son números válidos
    t = {
      ...t,
      ts_creado: t.ts_creado ? Number(t.ts_creado) : null,
      ts_llamado: t.ts_llamado ? Number(t.ts_llamado) : null,
      ts_atendido: t.ts_atendido ? Number(t.ts_atendido) : null,
      ts_fin: t.ts_fin ? Number(t.ts_fin) : null,
    };
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
async function siguienteTurno(req, res, usuario) {
  const b = await leerBody(req);
  const moduloSolicitado = b?.modulo || mem.modulosActuales[usuario.id] || usuario.moduloActual || usuario.modulo;
  const modOp = (moduloSolicitado && moduloSolicitado !== 'Sin módulo') ? moduloSolicitado : 'Módulo 01';
  const ahora = Date.now();

  if (dbReady) {
    // Buscar el PRIMER turno en fila (sin filtrar por módulo) - en orden secuencial
    const next = await dbQ(`
      SELECT TOP 1 id FROM turnos
      WHERE  estado = 'En fila'
        AND  CAST(DATEADD(SECOND, ts_creado/1000, '1970-01-01') AS DATE) >= CAST(DATEADD(DAY, -7, GETDATE()) AS DATE)
      ORDER  BY ts_creado ASC
    `);
    if (!next.recordset.length) return json(res, 200, { ok: false, mensaje: 'No hay turnos en espera.' });

    const { id } = next.recordset[0];
    // Asignar el módulo del operador al turno que se llama
    const upd = await dbQ(`
      UPDATE turnos
      SET    estado='Llamando', ts_llamado=@ahora, modulo=@mod,
             atendido_por=@op, llamadas=llamadas+1
      OUTPUT INSERTED.id, INSERTED.codigo, INSERTED.paciente, INSERTED.documento, INSERTED.servicio,
             INSERTED.estado, INSERTED.modulo, INSERTED.atendido_por,
             INSERTED.ts_creado, INSERTED.ts_llamado
      WHERE  id = @id
    `, { ahora, mod: modOp, op: usuario.nombre, id });

    let t = upd.recordset[0];
    // Asegurar que los timestamps son números válidos
    t = {
      ...t,
      ts_creado: t.ts_creado ? Number(t.ts_creado) : null,
      ts_llamado: t.ts_llamado ? Number(t.ts_llamado) : null,
    };
    await registrarHistorial(t.id, t.codigo, 'LLAMADO', usuario.nombre);
    emitir('turno_llamado', { turno: t });
    return json(res, 200, { ok: true, turno: t });
  }

  // En memoria: buscar el PRIMER turno en fila (sin filtrar por módulo)
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
  if (dbReady) {
    const r = await dbQ(`SELECT id, nombre, username, rol, modulo, email, color, activo, creado_en FROM usuarios ORDER BY nombre`);
    return json(res, 200, { ok: true, usuarios: r.recordset });
  }
  const todos = mem.usuarios.map(u => ({
    id: u.id,
    nombre: u.nombre,
    username: u.username,
    rol: u.rol,
    modulo: u.modulo,
    email: u.email || null,
    color: u.color,
    activo: u.activo
  }));
  json(res, 200, { ok: true, usuarios: todos });
}

/* ═══════════════════════════════════════════════════════════════════
   22d. USUARIOS — CREAR
═══════════════════════════════════════════════════════════════════ */
async function crearUsuario(req, res, usuario) {
  try {
    /* Verificar permisos */
    if (usuario.rol !== 'Administrador') {
      return json(res, 403, { error: 'Solo administradores pueden crear usuarios.' });
    }

    const b = await leerBody(req);
    const { nombre, username, password, rol, email, modulos } = b;

    if (!nombre?.trim()) return json(res, 400, { error: 'El nombre es obligatorio.' });
    if (!username?.trim()) return json(res, 400, { error: 'El usuario es obligatorio.' });
    if (!password || password.length < 6) return json(res, 400, { error: 'Contraseña mínimo 6 caracteres.' });
    if (!rol?.trim()) return json(res, 400, { error: 'El rol es obligatorio.' });

    const nom = nombre.trim().slice(0, 120);
    const user = username.trim().toLowerCase().slice(0, 60);
    const rolesList = ['Administrador', 'Médico', 'Enfermero', 'Recepcionista', 'Operador', 'Linea de frente'];
    const rolVal = rolesList.includes(rol) ? rol : 'Recepcionista';
    const modulosVal = modulos ? JSON.stringify(Array.isArray(modulos) ? modulos : []) : '[]';
    const emailVal = email?.trim() || null;
    const hash = await bcrypt.hash(password, 12);
    const color = '#' + crypto.randomBytes(3).toString('hex');

    if (dbReady) {
      const dup = await dbQ(`SELECT 1 FROM usuarios WHERE username = @u`, { u: user });
      if (dup.recordset.length) return json(res, 409, { error: 'El usuario ya existe.' });

      const ins = await dbQ(`
        INSERT INTO usuarios (nombre, username, password_hash, rol, modulo, email, color, activo)
        OUTPUT INSERTED.id, INSERTED.nombre, INSERTED.username, INSERTED.rol,
               INSERTED.modulo, INSERTED.email, INSERTED.color, INSERTED.activo
        VALUES (@nom, @user, @hash, @rol, @mod, @email, @color, 1)
      `, { nom, user, hash, rol: rolVal, mod: modulosVal, email: emailVal, color });

      const u = ins.recordset[0];
      await registrarHistorialUsuario(u.id, u.username, 'CREADO', user, usuario.nombre);
      return json(res, 201, { ok: true, usuario: u });
    }

    if (mem.usuarios.find(u => u.username === user))
      return json(res, 409, { error: 'El usuario ya existe.' });

    const id = Math.max(...mem.usuarios.map(u => u.id), 0) + 1;
    const u = { id, nombre: nom, username: user, password_hash: hash, rol: rolVal, modulo: modulosVal, email: emailVal, activo: true, color };
    mem.usuarios.push(u);
    return json(res, 201, { ok: true, usuario: u });
  } catch (e) {
    console.error('[crearUsuario]', e.message);
    return json(res, 500, { error: 'Error al crear usuario: ' + e.message });
  }
}

/* ═══════════════════════════════════════════════════════════════════
   22e. USUARIOS — ACTUALIZAR
═══════════════════════════════════════════════════════════════════ */
async function actualizarUsuario(req, res, id, usuario) {
  try {
    if (usuario.rol !== 'Administrador') {
      return json(res, 403, { error: 'Solo administradores pueden editar usuarios.' });
    }

    const b = await leerBody(req);
    const { nombre, email, rol, modulos, activo } = b;

    const sets = [];
    const p = { id };

    if (nombre?.trim()) { sets.push('nombre = @nom'); p.nom = nombre.trim().slice(0, 120); }
    if (email !== undefined) { sets.push('email = @email'); p.email = email?.trim() || null; }
    if (rol) { sets.push('modulo = @mod'); p.mod = modulos ? JSON.stringify(Array.isArray(modulos) ? modulos : []) : '[]'; }
    if (activo !== undefined) { sets.push('activo = @act'); p.act = activo ? 1 : 0; }

    if (!sets.length) return json(res, 400, { error: 'Sin cambios.' });

    if (dbReady) {
      const upd = await dbQ(`
        UPDATE usuarios
        SET ${sets.join(', ')}
        OUTPUT INSERTED.id, INSERTED.nombre, INSERTED.username, INSERTED.rol,
               INSERTED.modulo, INSERTED.email, INSERTED.color, INSERTED.activo
        WHERE id = @id
      `, p);

      if (!upd.recordset.length) return json(res, 404, { error: 'Usuario no encontrado.' });

      const u = upd.recordset[0];
      await registrarHistorialUsuario(u.id, u.username, 'ACTUALIZADO', usuario.username, usuario.nombre);
      return json(res, 200, { ok: true, usuario: u });
    }

    const mem_u = mem.usuarios.find(u => u.id === id);
    if (!mem_u) return json(res, 404, { error: 'Usuario no encontrado.' });

    if (nombre?.trim()) mem_u.nombre = nombre.trim();
    if (email !== undefined) mem_u.email = email || null;
    if (rol) mem_u.modulo = modulos ? JSON.stringify(modulos) : '[]';
    if (activo !== undefined) mem_u.activo = activo;

    return json(res, 200, { ok: true, usuario: mem_u });
  } catch (e) {
    console.error('[actualizarUsuario]', e.message);
    return json(res, 500, { error: 'Error al actualizar usuario: ' + e.message });
  }
}

/* ═══════════════════════════════════════════════════════════════════
   22f. USUARIOS — ELIMINAR
═══════════════════════════════════════════════════════════════════ */
async function eliminarUsuario(req, res, id, usuario) {
  try {
    if (usuario.rol !== 'Administrador') {
      return json(res, 403, { error: 'Solo administradores pueden eliminar usuarios.' });
    }

    const b = await leerBody(req);
    const { password_confirmacion } = b;

    // Verificar contraseña del administrador actual
    if (!password_confirmacion) {
      return json(res, 400, { error: 'Se requiere contraseña de administrador para eliminar.' });
    }

    let adminActual;
    if (dbReady) {
      const r = await dbQ(`SELECT password_hash FROM usuarios WHERE id = @id`, { id: usuario.id });
      if (!r.recordset.length) return json(res, 401, { error: 'Error de autenticación.' });
      adminActual = r.recordset[0];
    } else {
      adminActual = mem.usuarios.find(u => u.id === usuario.id);
    }

    if (!adminActual) return json(res, 401, { error: 'Error de autenticación.' });

    const passwordValida = await bcrypt.compare(password_confirmacion, adminActual.password_hash);
    if (!passwordValida) {
      return json(res, 403, { error: 'Contraseña incorrecta. Eliminación cancelada.' });
    }

    if (dbReady) {
      const r = await dbQ(`SELECT username FROM usuarios WHERE id = @id`, { id });
      if (!r.recordset.length) return json(res, 404, { error: 'Usuario no encontrado.' });

      const username = r.recordset[0].username;
      
      await dbQ(`DELETE FROM usuarios WHERE id = @id`, { id });
      await registrarHistorialUsuario(id, username, 'ELIMINADO', usuario.username, usuario.nombre);
      return json(res, 200, { ok: true, mensaje: 'Usuario eliminado.' });
    }

    const idx = mem.usuarios.findIndex(u => u.id === id);
    if (idx < 0) return json(res, 404, { error: 'Usuario no encontrado.' });

    const username = mem.usuarios[idx].username;
    mem.usuarios.splice(idx, 1);
    return json(res, 200, { ok: true, mensaje: 'Usuario eliminado.' });
  } catch (e) {
    console.error('[eliminarUsuario]', e.message);
    return json(res, 500, { error: 'Error al eliminar usuario: ' + e.message });
  }
}

/* ═══════════════════════════════════════════════════════════════════
   22g. USUARIOS — CAMBIAR CONTRASEÑA
═══════════════════════════════════════════════════════════════════ */
async function cambiarPassword(req, res, id, usuario) {
  try {
    if (usuario.rol !== 'Administrador' && usuario.id !== id) {
      return json(res, 403, { error: 'No tienes permisos para cambiar la contraseña de este usuario.' });
    }

    const b = await leerBody(req);
    const { password } = b;

    if (!password || password.length < 6) {
      return json(res, 400, { error: 'Contraseña mínimo 6 caracteres.' });
    }

    const hash = await bcrypt.hash(password, 12);

    if (dbReady) {
      const upd = await dbQ(`
        UPDATE usuarios
        SET password_hash = @hash
        OUTPUT INSERTED.id, INSERTED.nombre, INSERTED.username
        WHERE id = @id
      `, { hash, id });

      if (!upd.recordset.length) return json(res, 404, { error: 'Usuario no encontrado.' });

      const u = upd.recordset[0];
      await registrarHistorialUsuario(u.id, u.username, 'PASSWORD_CAMBIADO', usuario.username, usuario.nombre);
      return json(res, 200, { ok: true, mensaje: 'Contraseña actualizada.' });
    }

    const mem_u = mem.usuarios.find(u => u.id === id);
    if (!mem_u) return json(res, 404, { error: 'Usuario no encontrado.' });

    mem_u.password_hash = hash;
    return json(res, 200, { ok: true, mensaje: 'Contraseña actualizada.' });
  } catch (e) {
    console.error('[cambiarPassword]', e.message);
    return json(res, 500, { error: 'Error al cambiar contraseña: ' + e.message });
  }
}

/* ═══════════════════════════════════════════════════════════════════
   22g. USUARIOS — CAMBIAR MÓDULO ACTUAL (para la sesión)
═══════════════════════════════════════════════════════════════════ */
async function cambiarModuloActual(req, res, id, usuario) {
  try {
    // El usuario solo puede cambiar su propio módulo actual
    if (usuario.id !== id) {
      return json(res, 403, { error: 'No tienes permisos para cambiar el módulo de otro usuario.' });
    }

    const b = await leerBody(req);
    const { moduloActual } = b;

    if (!moduloActual || !moduloActual.trim()) {
      return json(res, 400, { error: 'Debes especificar un módulo.' });
    }

    // Guardar en memoria el módulo actual del usuario (para esta sesión)
    mem.modulosActuales[usuario.id] = moduloActual.trim();

    return json(res, 200, { 
      ok: true, 
      mensaje: `Módulo actualizado a ${moduloActual}`,
      moduloActual: moduloActual.trim()
    });
  } catch (e) {
    console.error('[cambiarModuloActual]', e.message);
    return json(res, 500, { error: 'Error al cambiar módulo: ' + e.message });
  }
}

/* ═══════════════════════════════════════════════════════════════════
   22h. USUARIOS — HISTORIAL DE ACCESO
═══════════════════════════════════════════════════════════════════ */
async function getHistorialUsuario(res, id) {
  if (!dbReady) return json(res, 200, { ok: true, historial: [] });

  const r = await dbQ(`
    SELECT id, usuario_id, username, accion, detalles, ip, ts
    FROM usuarios_historial
    WHERE usuario_id = @id
    ORDER BY ts DESC
  `, { id });

  return json(res, 200, { ok: true, historial: r.recordset });
}

async function registrarHistorialUsuario(usuarioId, username, accion, realizadoPor, nombreOp) {
  if (!dbReady) return;
  try {
    await dbQ(`
      INSERT INTO usuarios_historial (usuario_id, username, accion, detalles, ts)
      VALUES (@uid, @user, @accion, @det, SYSDATETIME())
    `, {
      uid: usuarioId,
      user: username,
      accion,
      det: `Realizado por: ${nombreOp || realizadoPor}`
    });
  } catch (e) {
    console.warn('[usuarios_historial]', e.message);
  }
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

/* ═══════════════════════════════════════════════════════════════════
   LIMPIEZA — Eliminar turnos antiguos finalizados
═══════════════════════════════════════════════════════════════════ */
async function limpiarTurnosAntiguos() {
  if (!dbReady) return;
  try {
    const r = await dbQ(`
      DELETE FROM turnos
      WHERE estado IN ('Finalizado', 'Cancelado', 'No atendido')
        AND CAST(DATEADD(SECOND, ts_creado/1000, '1970-01-01') AS DATE) < CAST(GETDATE() AS DATE)
    `);
    if (r.rowsAffected[0] > 0) {
      console.log(`✅ Limpios ${r.rowsAffected[0]} turnos antiguos finalizados.`);
    }
  } catch (e) {
    console.warn('[Limpieza de turnos]', e.message);
  }
}

async function arrancar() {
  console.log('\n┌────────────────────────────────────────────────────────────┐');
  console.log('│         NeuroTurn v2.1 — iniciando servidor...             │');
  console.log('└────────────────────────────────────────────────────────────┘');

  await conectarDB();
  await limpiarTurnosAntiguos();
  await inicializarMemoria();
  await insertarUsuariosDePrueba();
  await asegurarUsuarioAdmin();

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
