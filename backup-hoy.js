const fs = require('fs');
const path = require('path');
const sql = require('mssql');

(async () => {
  try {
    const cfg = {
      server: 'localhost',
      port: 1433,
      database: 'Neuroturn',
      options: { encrypt: false, trustServerCertificate: true, enableArithAbort: true, trustedConnection: true },
      pool: { max: 5, min: 0, idleTimeoutMillis: 10000 },
      requestTimeout: 20000,
    };
    // Try msnodesqlv8 first for Windows auth
    let p;
    try {
      require('msnodesqlv8');
      cfg.driver = 'msnodesqlv8';
      p = await sql.connect(cfg);
    } catch(_) {
      delete cfg.driver;
      p = await sql.connect(cfg);
    }
    const r = await p.query(`
      SELECT codigo, paciente, documento, servicio, atendido_por, modulo, estado,
             ts_creado, ts_llamado, ts_atendido, ts_fin, nota
      FROM turnos
      WHERE CAST(DATEADD(SECOND, ts_creado/1000, '1970-01-01') AS DATE) = '2026-03-25'
      ORDER BY ts_creado
    `);
    const rows = r.recordset;
    if (!rows.length) { console.log('No hay turnos hoy'); process.exit(0); }

    const dir = path.join(__dirname, 'turnos', '2026', '03');
    fs.mkdirSync(dir, { recursive: true });

    const tsToStr = v => {
      if (!v) return '';
      return new Date(Number(v)).toLocaleString('es-AR');
    };
    const espera = (a, b) => (a && b) ? Math.round((Number(b) - Number(a)) / 60000) : '';
    const atencion = (a, b) => (a && b) ? Math.round((Number(b) - Number(a)) / 60000) : '';

    const header = 'turno,paciente,documento,servicio,operador,modulo,hora_creacion,tiempo_espera_min,tiempo_atencion_min,estado';
    const csvRows = rows.map(t => {
      const e = v => '"' + String(v || '').replace(/"/g, '""') + '"';
      return [
        e(t.codigo), e(t.paciente), e(t.documento),
        e(t.servicio), e(t.atendido_por), e(t.modulo),
        e(tsToStr(t.ts_creado)),
        espera(t.ts_creado, t.ts_atendido || t.ts_llamado),
        atencion(t.ts_atendido, t.ts_fin),
        e(t.estado)
      ].join(',');
    });

    const csvPath = path.join(dir, '2026-03-25.csv');
    fs.writeFileSync(csvPath, header + '\n' + csvRows.join('\n'), 'utf8');
    console.log(`CSV guardado: ${csvPath} (${rows.length} turnos)`);
    await p.close();
  } catch (e) {
    console.error('Error:', e.message);
  }
  process.exit(0);
})();
