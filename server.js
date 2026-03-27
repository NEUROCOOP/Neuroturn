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

/* ExcelJS — opcional, para exportación XLSX. Si no está, se usa CSV */
let ExcelJS = null;
try { ExcelJS = require('exceljs'); } catch (_) {}

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
      console.log(`✅ SQL Server conectado [${driver}]  →  ${DB_SERVER} / ${DB_NAME}`);
      await inicializarEsquema();
      dbReady = true;
      return;                       // éxito — salir del loop
    } catch (err) {
      dbReady = false;
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
      ts_fin       BIGINT        NULL,
      registrado_por NVARCHAR(120) NULL,
      fecha_turno  DATE          NOT NULL DEFAULT CAST(GETDATE() AS DATE)
    );
  `);

  await r.query(`
    IF NOT EXISTS (SELECT 1 FROM sysobjects WHERE name='config' AND xtype='U')
    CREATE TABLE config (
      clave NVARCHAR(60)  PRIMARY KEY,
      valor NVARCHAR(500) NOT NULL
    );
  `);

  /* Migraciones: columnas nuevas — cada una aislada para no abortar si falla */
  try { await r.query(`
    IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('turnos') AND name='registrado_por')
      ALTER TABLE turnos ADD registrado_por NVARCHAR(120) NULL;
  `); } catch(e) { console.warn('[esquema] registrado_por:', e.message); }

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

  /* Migración: fecha_turno — pasos aislados para evitar error de compilación */
  try { await r.query(`
    IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('turnos') AND name='fecha_turno')
      ALTER TABLE turnos ADD fecha_turno DATE NULL;
  `); } catch(e) { console.warn('[esquema] fecha_turno col:', e.message); }

  try { await r.query(`
    EXEC('UPDATE turnos SET fecha_turno = CAST(DATEADD(SECOND, ts_creado/1000, ''19700101'') AS DATE) WHERE fecha_turno IS NULL AND ts_creado IS NOT NULL');
  `); } catch(e) { /* ignorar si columna no existe aún */ }

  try { await r.query(`
    IF NOT EXISTS (SELECT 1 FROM sys.default_constraints WHERE parent_object_id=OBJECT_ID('turnos') AND name='DF_turnos_fecha_turno')
      AND EXISTS (SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('turnos') AND name='fecha_turno')
    BEGIN
      ALTER TABLE turnos ADD CONSTRAINT DF_turnos_fecha_turno DEFAULT CAST(GETDATE() AS DATE) FOR fecha_turno;
    END
  `); } catch(e) { console.warn('[esquema] fecha_turno default:', e.message); }

  try { await r.query(`
    IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID('turnos') AND name='IX_turnos_fecha')
       AND EXISTS (SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('turnos') AND name='fecha_turno')
      CREATE INDEX IX_turnos_fecha ON turnos(fecha_turno);
  `); } catch(e) { console.warn('[esquema] IX_turnos_fecha:', e.message); }

  /* Audit: logs_turnos */
  await r.query(`
    IF NOT EXISTS (SELECT 1 FROM sysobjects WHERE name='logs_turnos' AND xtype='U')
    CREATE TABLE logs_turnos (
      id_log      INT IDENTITY(1,1) PRIMARY KEY,
      id_turno    INT           NOT NULL,
      usuario     NVARCHAR(120) NULL,
      accion      NVARCHAR(30)  NOT NULL,
      fecha_hora  DATETIME2     NOT NULL DEFAULT SYSDATETIME(),
      descripcion NVARCHAR(500) NULL
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
const mem = { usuarios: [], turnos: [], contador: 0, contadorFecha: '', modulosActuales: {} };
let contadorFechaActual = ''; // Para resetear el contador en BD al cambiar de día

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
   10. CONTADOR ATÓMICO DE TURNOS (se reinicia a 0 cada día)
═══════════════════════════════════════════════════════════════════ */
let ultimaFechaContador = ''; // para modo memoria

async function siguienteNumero() {
  const hoy = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

  if (dbReady) {
    // Verificar si cambió la fecha → reiniciar contador
    const f = await dbQ(`SELECT valor FROM config WHERE clave = 'contador_fecha'`);
    const fechaGuardada = f.recordset[0]?.valor || '';
    if (fechaGuardada !== hoy) {
      await dbQ(`UPDATE config SET valor = '0' WHERE clave = 'contador'`);
      if (f.recordset.length) {
        await dbQ(`UPDATE config SET valor = @v WHERE clave = 'contador_fecha'`, { v: hoy });
      } else {
        await dbQ(`INSERT INTO config (clave, valor) VALUES ('contador_fecha', @v)`, { v: hoy });
      }
      console.log(`[Contador] Nuevo día ${hoy} — contador reiniciado a 0`);
    }
    // Incremento atómico
    const r = await dbQ(`
      UPDATE config
      SET    valor = CAST(CAST(valor AS INT) + 1 AS NVARCHAR(20))
      OUTPUT INSERTED.valor
      WHERE  clave = 'contador'
    `);
    return parseInt(r.recordset[0].valor, 10);
  }

  // Modo memoria: reiniciar si cambió el día
  if (ultimaFechaContador !== hoy) {
    mem.contador = 0;
    ultimaFechaContador = hoy;
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
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.gif': 'image/gif', '.webp': 'image/webp', '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon', '.woff': 'font/woff', '.woff2': 'font/woff2',
};

function servirEstatico(res, pathname) {
  const bases = [path.join(__dirname, 'public'), __dirname];
  let fp = null;
  
  // Archivos permitidos desde la raíz (sin carpeta)
  const permitidosRaiz = ['index.html', 'usuarios-module.js', 'Logo.png', 'pantalla-tv.html'];
  
  for (const base of bases) {
    const file    = (pathname === '/' ? 'index.html' : pathname).replace(/^[\/\\]+/, '');
    const resolved = path.resolve(path.join(base, file));
    const baseAbs  = path.resolve(base);
    // Security: resolved path must stay inside the base directory
    if (!resolved.startsWith(baseAbs + path.sep) && resolved !== baseAbs) continue;
    // Security: from __dirname root, solo servir archivos permitidos (never expose server code / .env / schema)
    const imgDir = path.resolve(path.join(__dirname, 'img'));
    const isImgFile = resolved.startsWith(imgDir + path.sep) && /\.(png|jpg|jpeg|gif|webp|svg)$/i.test(resolved);
    if (base === __dirname && !permitidosRaiz.includes(path.basename(resolved)) && !isImgFile) continue;
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
  if (ruta === '/api/imagenes'      && metodo === 'GET')  { await obtenerImagenes(res); return; }
  if (ruta === '/api/turnos'        && metodo === 'GET')  { await getTurnos(res); return; }

  /* ── Autenticación requerida ────────────────────────────────── */
  const usuario = autenticar(req);
  if (!usuario) { json(res, 401, { error: 'Token inválido o expirado. Inicia sesión nuevamente.' }); return; }

  /* /api/auth/me */
  if (ruta === '/api/auth/me' && metodo === 'GET') { json(res, 200, { ok: true, usuario }); return; }

  /* Turnos */
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

  if (ruta === '/api/dashboard'    && metodo === 'GET') { await getDashboard(res, qp); return; }
  if (ruta === '/api/historial/exportar' && metodo === 'POST') { await handleExportarHistorico(req, res, qp, usuario); return; }
  if (ruta === '/api/historial'          && metodo === 'GET') { await getHistorial(res, qp); return; }
  if (ruta === '/api/estadisticas/mes'  && metodo === 'GET') { await getEstadisticasMes(res, qp); return; }
  if (ruta === '/api/estadisticas'      && metodo === 'GET') { await getEstadisticas(res, qp); return; }

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
    try {
      const r = await dbQ(`
        SELECT id, nombre, username, password_hash, rol, modulo, activo, color
        FROM   usuarios WHERE username = @u
      `, { u: user });
      fila = r.recordset[0];
    } catch (dbErr) {
      console.warn('[login] Fallo consulta BD, intentando memoria:', dbErr.message);
      fila = mem.usuarios.find(u => u.username === user);
    }
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
  try {
  if (dbReady) {
    const r = await dbQ(`
      SELECT id, codigo, paciente, documento, servicio, modulo, estado,
             atendido_por, registrado_por, nota, llamadas,
             ts_creado, ts_llamado, ts_atendido, ts_fin, fecha_turno
      FROM   turnos
      WHERE  fecha_turno = CAST(GETDATE() AS DATE)
      ORDER  BY ts_creado ASC
    `);
    const turnos = r.recordset.map(t => ({
      ...t,
      ts_creado:  t.ts_creado  ? Number(t.ts_creado)  : null,
      ts_llamado: t.ts_llamado ? Number(t.ts_llamado) : null,
      ts_atendido:t.ts_atendido? Number(t.ts_atendido): null,
      ts_fin:     t.ts_fin     ? Number(t.ts_fin)     : null,
    }));
    return json(res, 200, { ok: true, turnos });
  }
  // Memory mode: filter by today
  const hoy = new Date().toISOString().slice(0, 10);
  const turnosHoy = mem.turnos.filter(t => {
    if (t.fecha_turno) return t.fecha_turno === hoy;
    return t.ts_creado && new Date(t.ts_creado).toISOString().slice(0, 10) === hoy;
  });
  json(res, 200, { ok: true, turnos: turnosHoy });
  } catch(e) {
    console.error('[getTurnos]', e.message);
    return json(res, 500, { error: 'Error al obtener turnos: ' + e.message });
  }
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
        INSERT INTO turnos (codigo, paciente, documento, servicio, registrado_por, ts_creado, fecha_turno)
        OUTPUT INSERTED.id, INSERTED.codigo, INSERTED.paciente, INSERTED.documento,
               INSERTED.servicio, INSERTED.modulo, INSERTED.estado,
               INSERTED.registrado_por, INSERTED.atendido_por, INSERTED.ts_creado, INSERTED.fecha_turno
        VALUES (@codigo, @paciente, @doc, @servicio, @regPor, @ts, CAST(GETDATE() AS DATE))
      `, { codigo, paciente: paciente.trim(), doc: documento?.trim() || null, servicio, regPor: usuario.nombre, ts });

      let t = ins.recordset[0];
      // Asegurar que ts_creado es un número válido
      t = { ...t, ts_creado: t.ts_creado ? Number(t.ts_creado) : null };
      await registrarHistorial(t.id, t.codigo, 'CREADO', usuario.nombre);
      await registrarLog(t.id, usuario.nombre, 'CREADO', `Turno ${t.codigo} - ${t.paciente}`);
      emitir('turno_nuevo', { turno: t });
      return json(res, 201, { ok: true, turno: t });
    }

    const t = { id: mem.turnos.length + 1, codigo, paciente: paciente.trim(), documento: documento || null,
                servicio, modulo: '-', estado: 'En fila', atendido_por: null, registrado_por: usuario.nombre, nota: null,
                llamadas: 0, ts_creado: ts, ts_llamado: null, ts_atendido: null, ts_fin: null,
                fecha_turno: new Date().toISOString().slice(0, 10) };
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
  const { estado, nota, modulo, rellamar } = b;
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
      // Si nadie atendió aún, asignar al usuario que finaliza
      if (!p.op) { sets.push('atendido_por = COALESCE(atendido_por, @op)'); p.op = usuario.nombre; }
      // Si no hay modulo asignado, asignar el del usuario
      if (!p.modulo && usuario.modulo && usuario.modulo !== 'Sin módulo') {
        sets.push('modulo = CASE WHEN modulo = \'-\' OR modulo IS NULL THEN @modulo ELSE modulo END');
        p.modulo = usuario.modulo;
      }
    }
  }
  if (nota !== undefined) { sets.push('nota = @nota'); p.nota = nota; }

  if (!sets.length) return json(res, 400, { error: 'Sin cambios.' });

  if (dbReady) {
    /* Bloqueo optimista: evita que dos usuarios atiendan el mismo turno */
    let whereExtra = '';
    if (estado === 'Llamando' && !rellamar)  whereExtra = ` AND estado = 'En fila'`;
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
      if (accionMap[estado]) {
        await registrarHistorial(t.id, t.codigo, accionMap[estado], usuario.nombre);
        await registrarLog(t.id, usuario.nombre, accionMap[estado], `${estado}: ${t.codigo} → ${t.modulo || '-'}`);
      }
      // Guardar backup CSV al finalizar un turno
      if (['Finalizado','Cancelado','No atendido'].includes(estado)) {
        guardarBackupCSV().catch(() => {});
      }
    }
    emitir('turno_actualizado', { turno: t });
    return json(res, 200, { ok: true, turno: t });
  }

  const t = mem.turnos.find(x => x.id === id);
  if (!t) return json(res, 404, { error: 'Turno no encontrado.' });
  /* Bloqueo en memoria */
  if (estado === 'Llamando' && !rellamar && t.estado !== 'En fila')            return json(res, 409, { error: 'El turno ya está siendo atendido.' });
  if (estado === 'Atendiendo' && !['En fila','Llamando'].includes(t.estado))   return json(res, 409, { error: 'El turno ya está siendo atendido.' });
  if (estado) t.estado = estado;
  if (nota !== undefined) t.nota = nota;
  if (modulo) t.modulo = modulo;
  if (estado === 'Llamando')  { t.ts_llamado  = ahora; t.atendido_por = usuario.nombre; t.llamadas++; }
  if (estado === 'Atendiendo'){ t.ts_atendido = ahora; if (!t.atendido_por) t.atendido_por = usuario.nombre; }
  if (['Finalizado','Cancelado','No atendido'].includes(estado)) {
    t.ts_fin = ahora;
    if (!t.atendido_por) t.atendido_por = usuario.nombre;
    if (t.modulo === '-' && usuario.modulo && usuario.modulo !== 'Sin módulo') t.modulo = usuario.modulo;
  }
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
    // Auto-cerrar cualquier turno Llamando/Atendiendo previo del mismo módulo
    try {
      const previos = await dbQ(`
        SELECT id, codigo FROM turnos
        WHERE  modulo = @mod
          AND  estado IN ('Llamando','Atendiendo')
          AND  fecha_turno = CAST(GETDATE() AS DATE)
      `, { mod: modOp });
      for (const prev of previos.recordset) {
        await dbQ(`
          UPDATE turnos
          SET estado='Finalizado', ts_fin=@ahora, atendido_por=COALESCE(atendido_por, @op)
          WHERE id=@id AND estado IN ('Llamando','Atendiendo')
        `, { ahora, id: prev.id, op: usuario.nombre });
        await registrarHistorial(prev.id, prev.codigo, 'FINALIZADO', usuario.nombre);
        emitir('turno_actualizado', {
          turno: { id: prev.id, codigo: prev.codigo, estado: 'Finalizado', ts_fin: ahora }
        });
        guardarBackupCSV().catch(() => {});
      }
    } catch(e) { console.warn('[siguiente] Error cerrando previos:', e.message); }

    // Buscar el PRIMER turno en fila (sin filtrar por módulo) - en orden secuencial
    const next = await dbQ(`
      SELECT TOP 1 id FROM turnos
      WHERE  estado = 'En fila'
        AND  fecha_turno = CAST(GETDATE() AS DATE)
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
    await registrarLog(t.id, usuario.nombre, 'LLAMADO', `${t.codigo} llamado a ${modOp}`);
    emitir('turno_llamado', { turno: t });
    return json(res, 200, { ok: true, turno: t });
  }

  // En memoria: auto-cerrar turno previo del módulo
  mem.turnos.filter(t => t.modulo === modOp && (t.estado === 'Llamando' || t.estado === 'Atendiendo'))
    .forEach(prev => {
      prev.estado = 'Finalizado'; prev.ts_fin = ahora;
      if (!prev.atendido_por) prev.atendido_por = usuario.nombre;
      emitir('turno_actualizado', { turno: prev });
    });

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
   22b-2. AUDIT LOG — logs_turnos
═══════════════════════════════════════════════════════════════════ */
async function registrarLog(idTurno, usuario, accion, descripcion) {
  if (!dbReady) return;
  try {
    await dbQ(`
      INSERT INTO logs_turnos (id_turno, usuario, accion, descripcion)
      VALUES (@id, @usr, @accion, @desc)
    `, { id: idTurno, usr: usuario || null, accion, desc: descripcion || null });
  } catch (e) {
    console.warn('[logs_turnos]', e.message);
  }
}

/* ═══════════════════════════════════════════════════════════════════
   22c. ESTADÍSTICAS POR FUNCIONARIO
═══════════════════════════════════════════════════════════════════ */
async function getEstadisticasMes(res, qp) {
  // qp.mes = "YYYY-MM"
  const mesRaw = (qp.mes || '').replace(/[^\d\-]/g, '');
  const match  = mesRaw.match(/^(\d{4})-(\d{2})$/);
  if (!match) return json(res, 400, { error: 'Parámetro mes requerido (YYYY-MM)' });

  const anio = parseInt(match[1], 10);
  const mes  = parseInt(match[2], 10);

  if (!dbReady) {
    // Modo memoria: calcular desde mem.turnos
    const dias = {};
    for (const t of mem.turnos) {
      const d = new Date(t.ts_creado);
      if (d.getFullYear() !== anio || d.getMonth() + 1 !== mes) continue;
      const key = `${anio}-${String(mes).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
      if (!dias[key]) dias[key] = { fecha: key, finalizados: 0, cancelados: 0, operadores: new Set() };
      if (t.estado === 'Finalizado') { dias[key].finalizados++; if (t.atendido_por) dias[key].operadores.add(t.atendido_por); }
      if (t.estado === 'Cancelado' || t.estado === 'No atendido') dias[key].cancelados++;
    }
    const result = Object.values(dias).map(d => ({
      fecha: d.fecha, finalizados: d.finalizados, cancelados: d.cancelados, operadores_activos: d.operadores.size
    }));
    return json(res, 200, { ok: true, dias: result });
  }

  const r = await dbQ(`
    SELECT
      CONVERT(NVARCHAR(10), fecha_turno, 23)                                   AS fecha,
      SUM(CASE WHEN estado = 'Finalizado'  THEN 1 ELSE 0 END)                 AS finalizados,
      SUM(CASE WHEN estado IN ('Cancelado','No atendido') THEN 1 ELSE 0 END)  AS cancelados,
      COUNT(DISTINCT CASE WHEN estado = 'Finalizado' THEN atendido_por END)   AS operadores_activos
    FROM turnos
    WHERE YEAR(fecha_turno) = @anio
      AND MONTH(fecha_turno) = @mes
    GROUP BY CONVERT(NVARCHAR(10), fecha_turno, 23)
    ORDER BY fecha
  `, { anio, mes });
  return json(res, 200, { ok: true, dias: r.recordset });
}

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

  const useFecha = qp.fecha && /^\d{4}-\d{2}-\d{2}$/.test(qp.fecha.replace(/[^\d\-]/g,''));
  const fechaClean = useFecha ? qp.fecha.replace(/[^\d\-]/g,'') : null;

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
      AND fecha_turno = ${useFecha ? 'CAST(@fecha AS DATE)' : 'CAST(GETDATE() AS DATE)'}
    GROUP BY atendido_por
    ORDER BY turnos_atendidos DESC
  `, useFecha ? { fecha: fechaClean } : {});
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
    const r = await dbQ(`SELECT id, nombre, servicio, activo FROM modulos ORDER BY nombre`);
    return json(res, 200, { ok: true, modulos: r.recordset });
  }
  // Modo memoria: devolver los 8 módulos por defecto
  const modulosMem = [
    { id: 1, nombre: 'Módulo 01', servicio: 'Neurología', activo: true },
    { id: 2, nombre: 'Módulo 02', servicio: 'General', activo: true },
    { id: 3, nombre: 'Módulo 03', servicio: 'Psiquiatría', activo: true },
    { id: 4, nombre: 'Módulo 04', servicio: 'Neurología', activo: true },
    { id: 5, nombre: 'Módulo 05', servicio: 'Kinesiología', activo: true },
    { id: 6, nombre: 'Módulo 06', servicio: 'Laboratorio', activo: true },
    { id: 7, nombre: 'Módulo 07', servicio: 'Psiquiatría', activo: true },
    { id: 8, nombre: 'Módulo 08', servicio: 'General', activo: true },
  ];
  json(res, 200, { ok: true, modulos: modulosMem });
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
    if (rol) {
      sets.push('rol = @rol');
      p.rol = ['Administrador','Médico','Enfermero','Recepcionista','Operador','Linea de frente'].includes(rol) ? rol : 'Recepcionista';
      sets.push('modulo = @mod');
      p.mod = modulos ? JSON.stringify(Array.isArray(modulos) ? modulos : []) : '[]';
    }
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
    if (rol) {
      mem_u.rol = ['Administrador','Médico','Enfermero','Recepcionista','Operador','Linea de frente'].includes(rol) ? rol : mem_u.rol;
      mem_u.modulo = modulos ? JSON.stringify(modulos) : '[]';
    }
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

/* ═══════════════════════════════════════════════════════════════════
   22i. OBTENER IMÁGENES DISPONIBLES (para Pantalla TV)
═══════════════════════════════════════════════════════════════════ */
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

async function getDashboard(res, qp) {
  if (!dbReady) return json(res, 200, { ok: true, stats: {}, turnos: [] });

  // Construir filtro de fecha con parámetros seguros
  let filtroWhere = 'fecha_turno = CAST(GETDATE() AS DATE)';
  const p = {};
  let modo = 'hoy';

  if (qp) {
    const limpio = s => (s || '').replace(/[^\d\-]/g, '');
    if (qp.fecha && /^\d{4}-\d{2}-\d{2}$/.test(limpio(qp.fecha))) {
      filtroWhere = 'fecha_turno = CAST(@dashFecha AS DATE)';
      p.dashFecha = limpio(qp.fecha);
      modo = limpio(qp.fecha);
    } else if (qp.desde && qp.hasta &&
               /^\d{4}-\d{2}-\d{2}$/.test(limpio(qp.desde)) &&
               /^\d{4}-\d{2}-\d{2}$/.test(limpio(qp.hasta))) {
      filtroWhere = 'fecha_turno BETWEEN CAST(@dashDesde AS DATE) AND CAST(@dashHasta AS DATE)';
      p.dashDesde = limpio(qp.desde);
      p.dashHasta = limpio(qp.hasta);
      modo = `${limpio(qp.desde)} / ${limpio(qp.hasta)}`;
    } else if (qp.semana === '1') {
      filtroWhere = `fecha_turno >= CAST(DATEADD(DAY, 2-DATEPART(WEEKDAY,GETDATE()), GETDATE()) AS DATE)
                     AND fecha_turno <= CAST(GETDATE() AS DATE)`;
      modo = 'semana';
    } else if (qp.mes && /^\d{4}-\d{2}$/.test(limpio(qp.mes))) {
      const [y, m] = limpio(qp.mes).split('-');
      filtroWhere = 'YEAR(fecha_turno) = @dashAnio AND MONTH(fecha_turno) = @dashMes';
      p.dashAnio = parseInt(y, 10);
      p.dashMes  = parseInt(m, 10);
      modo = limpio(qp.mes);
    }
  }

  const params = Object.keys(p).length ? p : undefined;
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
      WHERE ${filtroWhere}
    `, params),
    dbQ(`
      SELECT TOP 50 codigo, paciente, servicio, estado, modulo, atendido_por,
                    ts_creado, ts_llamado, ts_atendido, ts_fin, fecha_turno
      FROM  turnos
      WHERE ${filtroWhere}
      ORDER BY ts_creado DESC
    `, params),
  ]);
  json(res, 200, { ok: true, stats: s.recordset[0], turnos: u.recordset, modo });
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
  // Filtros por fecha_turno (YYYY-MM-DD) — más precisos que timestamps
  const limpio = s => (s || '').replace(/[^\d\-]/g, '');
  if (qp.fecha_desde && /^\d{4}-\d{2}-\d{2}$/.test(limpio(qp.fecha_desde))) {
    conds.push(`fecha_turno >= CAST(@fd AS DATE)`);
    p.fd = limpio(qp.fecha_desde);
  }
  if (qp.fecha_hasta && /^\d{4}-\d{2}-\d{2}$/.test(limpio(qp.fecha_hasta))) {
    conds.push(`fecha_turno <= CAST(@fh AS DATE)`);
    p.fh = limpio(qp.fecha_hasta);
  }

  const r = await dbQ(`
    SELECT TOP 2000 id, codigo, paciente, documento, servicio, modulo, estado,
                    atendido_por, registrado_por, nota,
                    ts_creado, ts_llamado, ts_atendido, ts_fin, fecha_turno
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
   BACKUP DIARIO — Guardar turnos del día en CSV
═══════════════════════════════════════════════════════════════════ */
async function guardarBackupCSV(fecha) {
  try {
    const f = fecha || new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    const [anio, mes] = f.split('-');
    let turnos = [];

    if (dbReady) {
      const r = await dbQ(`
        SELECT codigo, paciente, documento, servicio, atendido_por, modulo, estado,
               ts_creado, ts_llamado, ts_atendido, ts_fin, nota
        FROM   turnos
        WHERE  CAST(DATEADD(SECOND, ts_creado/1000, '1970-01-01') AS DATE) = @fecha
        ORDER  BY ts_creado ASC
      `, { fecha: f });
      turnos = r.recordset;
    } else {
      const dayStart = new Date(f + 'T00:00:00').getTime();
      const dayEnd   = dayStart + 86400000;
      turnos = mem.turnos.filter(t => t.ts_creado >= dayStart && t.ts_creado < dayEnd);
    }

    if (!turnos.length) return;

    const dir = path.join(__dirname, 'turnos', anio, mes);
    fs.mkdirSync(dir, { recursive: true });

    const tsToStr = ts => {
      if (!ts) return '';
      const d = new Date(Number(ts));
      return d.toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' });
    };
    const espera = (tc, ta) => (tc && ta) ? Math.round((Number(ta) - Number(tc)) / 60000) : '';
    const atencion = (ta, tf) => (ta && tf) ? Math.round((Number(tf) - Number(ta)) / 60000) : '';

    const header = 'turno,paciente,documento,servicio,operador,modulo,hora_creacion,tiempo_espera_min,tiempo_atencion_min,estado';
    const rows = turnos.map(t => {
      const esc = v => `"${String(v || '').replace(/"/g, '""')}"`;  
      return [
        esc(t.codigo), esc(t.paciente), esc(t.documento),
        esc(t.servicio), esc(t.atendido_por), esc(t.modulo),
        esc(tsToStr(t.ts_creado)),
        espera(t.ts_creado, t.ts_atendido || t.ts_llamado),
        atencion(t.ts_atendido, t.ts_fin),
        esc(t.estado)
      ].join(',');
    });

    const csvPath = path.join(dir, `${f}.csv`);
    fs.writeFileSync(csvPath, header + '\n' + rows.join('\n'), 'utf8');
    console.log(`📁 Backup CSV guardado: ${csvPath} (${turnos.length} turnos)`);
  } catch (e) {
    console.warn('[guardarBackupCSV]', e.message);
  }
}

/* ═══════════════════════════════════════════════════════════════════
   PERSISTENCIA — Todos los turnos se conservan permanentemente.
   Los CSV se generan como backup redundante (no se borra nada de la BD).
═══════════════════════════════════════════════════════════════════ */

/* ═══════════════════════════════════════════════════════════════════
   CIERRE DIARIO — Expirar turnos activos de días anteriores
   Los turnos pasan a estado 'Expirado' y su código se prefija con la
   fecha (p.ej. G-001 → 2026-03-25-G-001) para liberar el código del día.
═══════════════════════════════════════════════════════════════════ */
async function vencerTurnosAntiguos() {
  const hoy      = new Date().toISOString().slice(0, 10);
  const hoyStart = new Date(hoy + 'T00:00:00').getTime();

  if (!dbReady) {
    // Modo memoria
    let count = 0;
    mem.turnos.forEach(t => {
      if ((t.ts_creado || 0) < hoyStart && ['En fila', 'Llamando', 'Atendiendo'].includes(t.estado)) {
        const fecha = new Date(t.ts_creado || hoyStart - 86400000).toISOString().slice(0, 10);
        t.codigo = `${fecha}-${t.codigo}`;
        t.estado = 'Expirado';
        if (!t.ts_fin) t.ts_fin = Date.now();
        count++;
      }
    });
    if (count) console.log(`[CierreDia] ${count} turno(s) de días anteriores marcados como Expirado (memoria)`);
    return;
  }

  try {
    // Guardar CSV de cada día afectado antes de expirar
    const diasR = await dbQ(`
      SELECT DISTINCT CONVERT(NVARCHAR(10), fecha_turno, 23) AS fecha
      FROM   turnos
      WHERE  fecha_turno < CAST(GETDATE() AS DATE)
        AND  estado IN ('En fila', 'Llamando', 'Atendiendo')
    `);
    for (const row of diasR.recordset || []) {
      await guardarBackupCSV(row.fecha).catch(() => {});
    }

    // Renombrar código + marcar Expirado en un solo UPDATE
    const r = await dbQ(`
      UPDATE turnos
      SET    estado  = 'Expirado',
             codigo  = CONVERT(NVARCHAR(10), fecha_turno, 23) + '-' + codigo,
             ts_fin  = CASE WHEN ts_fin IS NULL THEN @ahora ELSE ts_fin END
      OUTPUT INSERTED.id
      WHERE  fecha_turno < CAST(GETDATE() AS DATE)
        AND  estado IN ('En fila', 'Llamando', 'Atendiendo')
    `, { ahora: Date.now() });

    const count = r.recordset?.length || 0;
    if (count > 0) {
      console.log(`[CierreDia] ${count} turno(s) de días anteriores → Expirado (código prefijado con fecha)`);
      emitir('turnos_expirados', { count });
    }
  } catch (e) {
    console.warn('[vencerTurnosAntiguos]', e.message);
  }
}

/* Programa el cierre automático a las 00:00:05 de cada día */
function programarCierreDia() {
  const ahora   = Date.now();
  const mañana  = new Date();
  mañana.setDate(mañana.getDate() + 1);
  mañana.setHours(0, 0, 5, 0);
  const ms = mañana.getTime() - ahora;

  setTimeout(async () => {
    const ayer      = new Date(); ayer.setDate(ayer.getDate() - 1);
    const fechaAyer = ayer.toISOString().slice(0, 10);
    console.log(`\n[Medianoche] Iniciando cierre del día ${fechaAyer}...`);
    try { await guardarBackupCSV(fechaAyer); } catch (_) {}
    await vencerTurnosAntiguos();
    await sincronizarContador();
    console.log(`[Medianoche] Cierre de día ${fechaAyer} completado.`);
    programarCierreDia(); // re-programar para la siguiente medianoche
  }, ms);

  const minutos = Math.round(ms / 60000);
  console.log(`[CierreDia] Cierre diario automático programado en ${minutos} min`);
}

/* ═══════════════════════════════════════════════════════════════════
   EXPORTACIÓN HISTÓRICO XLSX / CSV
   /historico_turnos/AÑO/MES/turnos_FECHA.xlsx  (o .csv sin exceljs)
═══════════════════════════════════════════════════════════════════ */
async function exportarHistoricoXLSX(fecha) {
  try {
    const f = (fecha || new Date().toISOString().slice(0, 10)).replace(/[^\d\-]/g, '');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(f)) return;

    const [anio, mes] = f.split('-');
    let turnos = [];

    if (dbReady) {
      const r = await dbQ(`
        SELECT codigo AS turno, paciente, documento, servicio,
               registrado_por AS operador, modulo,
               ts_creado AS hora_llegada, ts_llamado,
               ts_atendido AS hora_inicio_atencion, ts_fin AS hora_finalizacion,
               estado, fecha_turno
        FROM   turnos
        WHERE  fecha_turno = CAST(@fecha AS DATE)
        ORDER  BY ts_creado ASC
      `, { fecha: f });
      turnos = r.recordset;
    } else {
      const dayStart = new Date(f + 'T00:00:00').getTime();
      const dayEnd   = dayStart + 86400000;
      turnos = mem.turnos.filter(t => t.ts_creado >= dayStart && t.ts_creado < dayEnd);
    }

    if (!turnos.length) { console.log(`[Histórico] Sin turnos para ${f}`); return; }

    const dir = path.join(__dirname, 'historico_turnos', anio, mes);
    fs.mkdirSync(dir, { recursive: true });

    const tsToStr = ts => {
      if (!ts) return '';
      return new Date(Number(ts)).toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' });
    };
    const espera   = (tc, ta) => (tc && ta) ? Math.round((Number(ta) - Number(tc)) / 60000) : '';
    const atencion = (ta, tf) => (ta && tf) ? Math.round((Number(tf) - Number(ta)) / 60000) : '';

    if (ExcelJS) {
      const wb    = new ExcelJS.Workbook();
      wb.creator  = 'NeuroTurn';
      const sheet = wb.addWorksheet(`Turnos ${f}`);

      sheet.columns = [
        { header: 'Turno',                  key: 'turno',                 width: 12 },
        { header: 'Paciente',               key: 'paciente',              width: 30 },
        { header: 'Documento',              key: 'documento',             width: 15 },
        { header: 'Servicio',               key: 'servicio',              width: 20 },
        { header: 'Operador',               key: 'operador',              width: 25 },
        { header: 'Módulo',                 key: 'modulo',                width: 15 },
        { header: 'Hora Llegada',           key: 'hora_llegada',          width: 22 },
        { header: 'Inicio Atención',        key: 'hora_inicio_atencion',  width: 22 },
        { header: 'Hora Finalización',      key: 'hora_finalizacion',     width: 22 },
        { header: 'Espera (min)',            key: 'tiempo_espera',         width: 14 },
        { header: 'Atención (min)',          key: 'tiempo_atencion',       width: 14 },
        { header: 'Estado',                 key: 'estado',                width: 15 },
        { header: 'Fecha',                  key: 'fecha_turno',           width: 12 },
      ];

      /* Estilo encabezado */
      const header = sheet.getRow(1);
      header.eachCell(cell => {
        cell.fill   = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E5F8E' } };
        cell.font   = { bold: true, color: { argb: 'FFFFFFFF' } };
        cell.border = { bottom: { style: 'medium', color: { argb: 'FF0A3D62' } } };
      });

      for (const t of turnos) {
        sheet.addRow({
          turno:                t.turno   || t.codigo,
          paciente:             t.paciente,
          documento:            t.documento    || '',
          servicio:             t.servicio     || '',
          operador:             t.operador     || t.atendido_por || '',
          modulo:               t.modulo       || '',
          hora_llegada:         tsToStr(t.hora_llegada   || t.ts_creado),
          hora_inicio_atencion: tsToStr(t.hora_inicio_atencion || t.ts_atendido),
          hora_finalizacion:    tsToStr(t.hora_finalizacion    || t.ts_fin),
          tiempo_espera:        espera(t.hora_llegada   || t.ts_creado,
                                       t.hora_inicio_atencion || t.ts_atendido || t.ts_llamado),
          tiempo_atencion:      atencion(t.hora_inicio_atencion || t.ts_atendido,
                                         t.hora_finalizacion    || t.ts_fin),
          estado:               t.estado,
          fecha_turno:          f,
        });
      }

      const xlsxPath = path.join(dir, `turnos_${f}.xlsx`);
      await wb.xlsx.writeFile(xlsxPath);
      console.log(`📊 Histórico XLSX: ${xlsxPath} (${turnos.length} turnos)`);
      return;
    }

    /* Fallback CSV sin exceljs */
    const esc = v => `"${String(v || '').replace(/"/g, '""')}"`;
    const hdr = 'turno,paciente,documento,servicio,operador,modulo,hora_llegada,hora_inicio_atencion,hora_finalizacion,tiempo_espera_min,tiempo_atencion_min,estado,fecha_turno';
    const rows = turnos.map(t => [
      esc(t.turno || t.codigo), esc(t.paciente), esc(t.documento), esc(t.servicio),
      esc(t.operador || t.atendido_por || ''), esc(t.modulo),
      esc(tsToStr(t.hora_llegada   || t.ts_creado)),
      esc(tsToStr(t.hora_inicio_atencion || t.ts_atendido)),
      esc(tsToStr(t.hora_finalizacion    || t.ts_fin)),
      espera(t.hora_llegada   || t.ts_creado, t.hora_inicio_atencion || t.ts_atendido || t.ts_llamado),
      atencion(t.hora_inicio_atencion || t.ts_atendido, t.hora_finalizacion || t.ts_fin),
      esc(t.estado), esc(f),
    ].join(','));
    const csvPath = path.join(dir, `turnos_${f}.csv`);
    fs.writeFileSync(csvPath, hdr + '\n' + rows.join('\n'), 'utf8');
    console.log(`📁 Histórico CSV: ${csvPath} (${turnos.length} turnos)`);
  } catch (e) {
    console.warn('[exportarHistoricoXLSX]', e.message);
  }
}

/* Exportación manual vía API POST /api/historial/exportar (admin) */
async function handleExportarHistorico(req, res, qp, usuario) {
  if (usuario.rol !== 'Administrador') return json(res, 403, { error: 'Solo administradores pueden exportar.' });
  const f = ((qp && qp.fecha) || new Date().toISOString().slice(0, 10)).replace(/[^\d\-]/g, '');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(f)) return json(res, 400, { error: 'Fecha inválida. Use YYYY-MM-DD.' });
  await exportarHistoricoXLSX(f);
  return json(res, 200, { ok: true, mensaje: `Histórico de ${f} exportado a /historico_turnos/` });
}

/* Programar exportación automática a las 23:59 cada día */
function programar23_59() {
  const ahora = Date.now();
  const obj   = new Date();
  obj.setHours(23, 59, 0, 0);
  if (obj.getTime() <= ahora) obj.setDate(obj.getDate() + 1);
  const ms = obj.getTime() - ahora;

  setTimeout(async () => {
    const hoyStr = new Date().toISOString().slice(0, 10);
    console.log(`\n[23:59] Exportando histórico del día ${hoyStr}...`);
    try { await exportarHistoricoXLSX(hoyStr); } catch (e) { console.warn('[23:59]', e.message); }
    programar23_59(); // re-programar para mañana
  }, ms);

  console.log(`[Histórico] Exportación automática programada en ${Math.round(ms / 60000)} min`);
}

async function sincronizarContador() {
  if (!dbReady) return;
  try {
    const hoy = new Date().toISOString().slice(0, 10);

    // Eliminar restricción UNIQUE sobre codigo si existe (los códigos se repiten entre días)
    try {
      await dbQ(`
        DECLARE @cname NVARCHAR(200);
        SELECT @cname = name FROM sys.key_constraints
        WHERE parent_object_id = OBJECT_ID('turnos') AND type = 'UQ'
          AND OBJECT_NAME(parent_object_id) = 'turnos'
          AND EXISTS (SELECT 1 FROM sys.index_columns ic
                      JOIN sys.columns c ON c.object_id = ic.object_id AND c.column_id = ic.column_id
                      WHERE ic.object_id = parent_object_id AND ic.index_id = unique_index_id AND c.name = 'codigo');
        IF @cname IS NOT NULL
          EXEC('ALTER TABLE turnos DROP CONSTRAINT ' + @cname);
      `);
    } catch(_) { /* puede no existir */ }

    // Máximo número usado HOY
    const r = await dbQ(`
      SELECT MAX(CAST(SUBSTRING(codigo, CHARINDEX('-', codigo) + 1, 10) AS INT)) AS max_num
      FROM   turnos
      WHERE  CHARINDEX('-', codigo) > 0
        AND  CAST(DATEADD(SECOND, ts_creado/1000, '19700101') AS DATE) = CAST(GETDATE() AS DATE)
    `);
    const maxUsed = r.recordset[0]?.max_num || 0;

    // Fijar contador al máximo de hoy
    await dbQ(`UPDATE config SET valor = @v WHERE clave = 'contador'`, { v: String(maxUsed) });

    // Guardar fecha del contador
    const f = await dbQ(`SELECT valor FROM config WHERE clave = 'contador_fecha'`);
    if (f.recordset.length) {
      await dbQ(`UPDATE config SET valor = @v WHERE clave = 'contador_fecha'`, { v: hoy });
    } else {
      await dbQ(`INSERT INTO config (clave, valor) VALUES ('contador_fecha', @v)`, { v: hoy });
    }

    console.log(`[Contador] Sincronizado para ${hoy}: máximo usado hoy = ${maxUsed}`);
  } catch (e) {
    console.warn('[sincronizarContador]', e.message);
  }
}

async function arrancar() {
  console.log('\n┌────────────────────────────────────────────────────────────┐');
  console.log('│         NeuroTurn v2.1 — iniciando servidor...             │');
  console.log('└────────────────────────────────────────────────────────────┘');

  await conectarDB();
  await vencerTurnosAntiguos();
  await sincronizarContador();
  await inicializarMemoria();
  await insertarUsuariosDePrueba();
  await asegurarUsuarioAdmin();

  programarCierreDia();
  programar23_59();

  // Backup CSV automático cada hora
  setInterval(() => guardarBackupCSV().catch(() => {}), 60 * 60 * 1000);

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
  try { await guardarBackupCSV(); } catch (_) {}
  try { if (pool) await pool.close(); } catch (_) {}
  process.exit(0);
}

process.on('unhandledRejection', reason => console.error('[UnhandledRejection]', reason));
