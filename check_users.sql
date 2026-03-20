USE Neuroturn;
SELECT TOP 5 id, nombre, username, CAST(LEN(password_hash) AS VARCHAR(10)) as hash_len
FROM usuarios
ORDER BY id;
