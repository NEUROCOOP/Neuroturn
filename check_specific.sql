USE Neuroturn;
SELECT id, nombre, username, activo, CAST(LEN(password_hash) AS INT) as hash_len, rol, modulo
FROM usuarios
WHERE username IN ('admin', 'juangarcia', 'marialopez', 'carlos', 'ddap')
ORDER BY id;
