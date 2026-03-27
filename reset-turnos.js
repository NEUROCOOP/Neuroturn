const sql = require('mssql');
(async () => {
  try {
    const cfg = {
      server: 'localhost',
      database: 'Neuroturn',
      driver: 'msnodesqlv8',
      options: { encrypt: false, trustServerCertificate: true, enableArithAbort: true, trustedConnection: true },
      pool: { max: 5, min: 0, idleTimeoutMillis: 10000 }
    };
    const p = await sql.connect(cfg);
    await p.query('DELETE FROM turnos');
    await p.query("UPDATE config SET valor = '0' WHERE clave = 'contador'");
    const r = await p.query("SELECT valor FROM config WHERE clave = 'contador'");
    console.log('Contador reset a:', r.recordset[0].valor);
    const t = await p.query('SELECT COUNT(*) as c FROM turnos');
    console.log('Turnos restantes:', t.recordset[0].c);
    await p.close();
    console.log('LISTO - Proximo turno sera G-001');
  } catch (e) {
    console.error('Error:', e.message);
  }
  process.exit(0);
})();
