'use strict';
const sql = require('mssql');
sql.connect({
  server: 'localhost', port: 1433,
  user: 'sa', password: 'Neurocoop2020*',
  database: 'Neuroturn',
  options: { trustServerCertificate: true, encrypt: false }
}).then(p => p.request().query(
  "UPDATE turnos SET estado='Cancelado', ts_fin=CAST(DATEDIFF(SECOND,'19700101',GETUTCDATE()) AS BIGINT)*1000 WHERE paciente IN ('Prueba1','Prueba2','Prueba3') AND estado IN ('Llamando','En fila')"
)).then(r => {
  console.log('OK rowsAffected:', r.rowsAffected[0]);
  process.exit(0);
}).catch(e => { console.error('Error:', e.message); process.exit(1); });
