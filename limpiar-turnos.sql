-- Limpieza de turnos de prueba
-- Este script elimina todos los turnos finalizados/cancelados que no sean de hoy

USE Neuroturn;

-- Ver cuántos turnos se van a eliminar
SELECT COUNT(*) as turnos_a_eliminar 
FROM turnos 
WHERE estado IN ('Finalizado', 'Cancelado', 'No atendido')
  AND CAST(DATEADD(SECOND, ts_creado/1000, '1970-01-01') AS DATE) < CAST(GETDATE() AS DATE);

-- Eliminar turnos finalizados de días anteriores
DELETE FROM turnos
WHERE estado IN ('Finalizado', 'Cancelado', 'No atendido')
  AND CAST(DATEADD(SECOND, ts_creado/1000, '1970-01-01') AS DATE) < CAST(GETDATE() AS DATE);

-- O si prefieres, elimina TODOS los turnos (limpieza total):
-- DELETE FROM turnos;
-- DELETE FROM historial_turnos;

-- Verificar resultado
SELECT COUNT(*) as turnos_restantes FROM turnos;
SELECT COUNT(*) as turnos_en_espera FROM turnos WHERE estado = 'En fila';
SELECT COUNT(*) as turnos_atendiendo FROM turnos WHERE estado = 'Atendiendo';
