const sql = require('mssql');
(async () => {
  try {
    const cfg = {
      server: 'localhost',
      port: 1433,
      user: 'sa',
      password: 'Neurocoop2020*',
      database: 'Neuroturn',
      options: { encrypt: false, trustServerCertificate: true, enableArithAbort: true },
      pool: { max: 5, min: 0, idleTimeoutMillis: 10000 }
    };
    const p = await sql.connect(cfg);
    const r = await p.query(`
      UPDATE turnos
      SET estado       = 'En fila',
          modulo       = '-',
          atendido_por = NULL,
          ts_llamado   = NULL,
          ts_atendido  = NULL,
          ts_fin       = NULL,
          llamadas     = 0
      WHERE estado IN ('Llamando', 'Atendiendo')
    `);
    console.log('Turnos actualizados a En fila:', r.rowsAffected[0]);
    const check = await p.query("SELECT estado, COUNT(*) as total FROM turnos GROUP BY estado");
    console.table(check.recordset);
    await p.close();
  } catch (e) {
    console.error('Error:', e.message);
  }
  process.exit(0);
})();
