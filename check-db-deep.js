const sql = require('mssql');
const fs = require('fs');
const path = require('path');

const envP = path.join(__dirname, '.env');
if (fs.existsSync(envP)) {
  fs.readFileSync(envP, 'utf8').split(/\r?\n/).forEach(l => {
    l = l.trim(); if (!l || l.startsWith('#')) return;
    const p = l.indexOf('='); if (p < 1) return;
    const k = l.slice(0, p).trim(); const v = l.slice(p + 1).trim();
    if (k && !(k in process.env)) process.env[k] = v;
  });
}

let S = process.env.DB_SERVER || 'localhost';
if (S.startsWith('.\\')) S = 'localhost\\' + S.substring(2);
const D = process.env.DB_NAME || 'Neuroturn';
const U = process.env.DB_USER || '';
const P = process.env.DB_PASS || '';

async function main() {
  const cfg = { server: S, database: D, port: 1433, options: { trustServerCertificate: true, encrypt: false, enableArithAbort: true } };
  if (U) { cfg.user = U; cfg.password = P; } else { cfg.options.trustedConnection = true; }

  let pool;
  try {
    pool = await sql.connect(cfg);

    // Check historial_turnos structure
    console.log('=== ESTRUCTURA historial_turnos ===');
    const cols1 = await pool.request().query("SELECT COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='historial_turnos'");
    cols1.recordset.forEach(r => console.log(' ', r.COLUMN_NAME, r.DATA_TYPE));

    // Check dates in historial_turnos
    console.log('\n=== FECHAS en historial_turnos ===');
    const dates1 = await pool.request().query(`
      SELECT CAST(DATEADD(MILLISECOND, ts % 1000, DATEADD(SECOND, ts/1000, '19700101')) AS DATE) AS fecha, 
             COUNT(*) AS c
      FROM historial_turnos
      GROUP BY CAST(DATEADD(MILLISECOND, ts % 1000, DATEADD(SECOND, ts/1000, '19700101')) AS DATE)
      ORDER BY fecha DESC
    `);
    dates1.recordset.forEach(r => console.log(' ', r.fecha, '->', r.c));

    // Sample historial
    console.log('\n=== MUESTRA historial_turnos (ultimos 15) ===');
    const sample1 = await pool.request().query('SELECT TOP 15 * FROM historial_turnos ORDER BY ts DESC');
    sample1.recordset.forEach(r => {
      const ts = new Date(Number(r.ts)).toLocaleString('es-CO');
      console.log(' ', r.turno_codigo, '|', r.accion, '|', r.usuario || '-', '|', ts);
    });

    // Distinct acciones
    console.log('\n=== ACCIONES DISTINTAS ===');
    const acc = await pool.request().query('SELECT accion, COUNT(*) AS c FROM historial_turnos GROUP BY accion ORDER BY c DESC');
    acc.recordset.forEach(r => console.log(' ', r.accion, '->', r.c));

    // Check logs_turnos structure
    console.log('\n=== ESTRUCTURA logs_turnos ===');
    const cols2 = await pool.request().query("SELECT COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='logs_turnos'");
    cols2.recordset.forEach(r => console.log(' ', r.COLUMN_NAME, r.DATA_TYPE));

    // Sample logs
    console.log('\n=== MUESTRA logs_turnos (ultimos 10) ===');
    const sample2 = await pool.request().query('SELECT TOP 10 * FROM logs_turnos ORDER BY fecha_hora DESC');
    sample2.recordset.forEach(r => console.log(' ', r.id_turno, '|', r.accion, '|', r.usuario || '-', '|', r.fecha_hora, '|', r.descripcion || ''));

    // Check CSV files content
    console.log('\n=== EJEMPLO CSV ===');
    const csvPath = path.join(__dirname, 'turnos', '2026', '03', '2026-03-30.csv');
    if (fs.existsSync(csvPath)) {
      const content = fs.readFileSync(csvPath, 'utf8');
      const lines = content.split(/\r?\n/).slice(0, 5);
      lines.forEach(l => console.log(' ', l));
    }

    await pool.close();
  } catch (e) {
    console.error('Error:', e.message);
    if (pool) try { await pool.close(); } catch (_) {}
  }
}
main();
