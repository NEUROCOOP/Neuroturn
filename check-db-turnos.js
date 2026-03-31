const sql = require('mssql');
const fs = require('fs');
const path = require('path');

// Load .env
const envP = path.join(__dirname, '.env');
if (fs.existsSync(envP)) {
  fs.readFileSync(envP, 'utf8').split(/\r?\n/).forEach(l => {
    l = l.trim();
    if (!l || l.startsWith('#')) return;
    const p = l.indexOf('=');
    if (p < 1) return;
    const k = l.slice(0, p).trim();
    const v = l.slice(p + 1).trim();
    if (k && !(k in process.env)) process.env[k] = v;
  });
}

let S = process.env.DB_SERVER || 'localhost';
if (S.startsWith('.\\')) S = 'localhost\\' + S.substring(2);
const D = process.env.DB_NAME || 'Neuroturn';
const U = process.env.DB_USER || '';
const P = process.env.DB_PASS || '';

async function main() {
  const cfg = {
    server: S, database: D, port: 1433,
    options: { trustServerCertificate: true, encrypt: false, enableArithAbort: true }
  };
  if (U) { cfg.user = U; cfg.password = P; } else { cfg.options.trustedConnection = true; }

  let pool;
  try {
    pool = await sql.connect(cfg);
    console.log('Conectado a:', S, '/', D);

    // Total turnos
    const r1 = await pool.request().query('SELECT COUNT(*) AS total FROM turnos');
    console.log('\nTotal turnos en BD:', r1.recordset[0].total);

    // Fechas distintas
    const r2 = await pool.request().query(`
      SELECT fecha_turno, COUNT(*) AS cantidad
      FROM turnos
      GROUP BY fecha_turno
      ORDER BY fecha_turno DESC
    `);
    console.log('\nFechas con turnos:');
    r2.recordset.forEach(r => console.log(' ', r.fecha_turno, '->', r.cantidad, 'turnos'));

    // Estados
    const r3 = await pool.request().query('SELECT estado, COUNT(*) AS c FROM turnos GROUP BY estado');
    console.log('\nEstados:');
    r3.recordset.forEach(r => console.log(' ', r.estado, '->', r.c));

    // Operadores
    const r4 = await pool.request().query('SELECT atendido_por, COUNT(*) AS c FROM turnos WHERE atendido_por IS NOT NULL GROUP BY atendido_por');
    console.log('\nOperadores:');
    r4.recordset.forEach(r => console.log(' ', r.atendido_por, '->', r.c));

    // Muestra 10 registros
    const r5 = await pool.request().query(`
      SELECT TOP 10 codigo, paciente, documento, servicio, modulo, estado, atendido_por, ts_creado, fecha_turno
      FROM turnos ORDER BY ts_creado DESC
    `);
    console.log('\nUltimos 10 turnos:');
    r5.recordset.forEach(r => {
      const ts = r.ts_creado ? new Date(Number(r.ts_creado)).toLocaleString('es-CO') : '';
      console.log(' ', r.codigo, '|', r.paciente, '|', r.servicio, '|', r.estado, '|', r.atendido_por || '-', '|', ts, '|', r.fecha_turno);
    });

    // Check historial_turnos
    try {
      const r6 = await pool.request().query('SELECT COUNT(*) AS total FROM historial_turnos');
      console.log('\nTotal historial_turnos:', r6.recordset[0].total);
    } catch (e) { console.log('\nhistorial_turnos no existe o error:', e.message); }

    // Check logs_turnos
    try {
      const r7 = await pool.request().query('SELECT COUNT(*) AS total FROM logs_turnos');
      console.log('Total logs_turnos:', r7.recordset[0].total);
    } catch (e) { console.log('logs_turnos no existe o error:', e.message); }

    await pool.close();
  } catch (e) {
    console.error('Error de conexion:', e.message);
    if (pool) try { await pool.close(); } catch (_) {}
  }
}
main();
