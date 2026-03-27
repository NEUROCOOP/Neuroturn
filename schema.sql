/* ═══════════════════════════════════════════════════════════════
   NEUROTURN — Schema SQL Server
   ═══════════════════════════════════════════════════════════════ */

-- Tabla usuarios
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

-- Tabla servicios
IF NOT EXISTS (SELECT 1 FROM sysobjects WHERE name='servicios' AND xtype='U')
CREATE TABLE servicios (
  id      INT IDENTITY(1,1) PRIMARY KEY,
  nombre  NVARCHAR(80)  NOT NULL,
  prefijo NVARCHAR(5)   NOT NULL UNIQUE,
  color   NVARCHAR(12)  NOT NULL DEFAULT '#3B72F2',
  activo  BIT           NOT NULL DEFAULT 1
);

-- Tabla modulos
IF NOT EXISTS (SELECT 1 FROM sysobjects WHERE name='modulos' AND xtype='U')
CREATE TABLE modulos (
  id       INT IDENTITY(1,1) PRIMARY KEY,
  nombre   NVARCHAR(80) NOT NULL UNIQUE,
  servicio NVARCHAR(80) NULL,
  activo   BIT          NOT NULL DEFAULT 1
);

-- Tabla turnos
IF NOT EXISTS (SELECT 1 FROM sysobjects WHERE name='turnos' AND xtype='U')
CREATE TABLE turnos (
  id             INT IDENTITY(1,1) PRIMARY KEY,
  codigo         NVARCHAR(20)  NOT NULL,
  paciente       NVARCHAR(120) NOT NULL,
  documento      NVARCHAR(30)  NULL,
  servicio       NVARCHAR(80)  NULL,
  modulo         NVARCHAR(80)  NOT NULL DEFAULT '-',
  estado         NVARCHAR(30)  NOT NULL DEFAULT 'En fila',
  atendido_por   NVARCHAR(120) NULL,
  registrado_por NVARCHAR(120) NULL,
  nota           NVARCHAR(500) NULL,
  llamadas       INT           NOT NULL DEFAULT 0,
  ts_creado      BIGINT        NOT NULL,
  ts_llamado     BIGINT        NULL,
  ts_atendido    BIGINT        NULL,
  ts_fin         BIGINT        NULL,
  fecha_turno    DATE          NOT NULL DEFAULT CAST(GETDATE() AS DATE)
);

-- Índice de rendimiento por fecha
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID('turnos') AND name='IX_turnos_fecha')
  CREATE INDEX IX_turnos_fecha ON turnos(fecha_turno);

-- Tabla config
IF NOT EXISTS (SELECT 1 FROM sysobjects WHERE name='config' AND xtype='U')
CREATE TABLE config (
  clave NVARCHAR(60)  PRIMARY KEY,
  valor NVARCHAR(500) NOT NULL
);

-- Datos iniciales — Servicios
IF NOT EXISTS (SELECT 1 FROM servicios)
INSERT INTO servicios (nombre, prefijo, color) VALUES
  (N'Neurología',   'N', '#3B72F2'),
  (N'Psiquiatría',  'P', '#8B5CF6'),
  (N'Kinesiología', 'K', '#22C55E'),
  (N'General',      'G', '#F59E0B'),
  (N'Laboratorio',  'L', '#EF4444');

-- Datos iniciales — Módulos
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

-- Contador de turnos
IF NOT EXISTS (SELECT 1 FROM config WHERE clave='contador')
INSERT INTO config VALUES ('contador', '100');

-- Tabla historial_turnos (auditoría de acciones)
IF NOT EXISTS (SELECT 1 FROM sysobjects WHERE name='historial_turnos' AND xtype='U')
CREATE TABLE historial_turnos (
  id           INT IDENTITY(1,1) PRIMARY KEY,
  turno_id     INT           NOT NULL,
  turno_codigo NVARCHAR(20)  NOT NULL,
  accion       NVARCHAR(20)  NOT NULL,   -- CREADO | LLAMADO | ATENDIDO | FINALIZADO | CANCELADO
  usuario      NVARCHAR(120) NULL,
  ts           BIGINT        NOT NULL
);

-- Tabla logs_turnos (auditoría detallada por turno)
IF NOT EXISTS (SELECT 1 FROM sysobjects WHERE name='logs_turnos' AND xtype='U')
CREATE TABLE logs_turnos (
  id_log      INT IDENTITY(1,1) PRIMARY KEY,
  id_turno    INT           NOT NULL,
  usuario     NVARCHAR(120) NULL,
  accion      NVARCHAR(30)  NOT NULL,   -- CREADO | LLAMADO | RELLAMADO | ATENDIDO | FINALIZADO | CANCELADO
  fecha_hora  DATETIME2     NOT NULL DEFAULT SYSDATETIME(),
  descripcion NVARCHAR(500) NULL
);

-- Migración: agregar fecha_turno si la tabla ya existe
IF EXISTS (SELECT 1 FROM sysobjects WHERE name='turnos' AND xtype='U')
AND NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('turnos') AND name='fecha_turno')
BEGIN
  ALTER TABLE turnos ADD fecha_turno DATE NULL;
  UPDATE turnos SET fecha_turno = CAST(DATEADD(SECOND, ts_creado/1000, '19700101') AS DATE) WHERE fecha_turno IS NULL;
  ALTER TABLE turnos ADD CONSTRAINT DF_turnos_fecha_turno DEFAULT CAST(GETDATE() AS DATE) FOR fecha_turno;
END;
