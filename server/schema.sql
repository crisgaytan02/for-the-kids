-- ===== Módulo: Limpieza =====
DROP TABLE IF EXISTS log_correos CASCADE;
DROP TABLE IF EXISTS notificaciones CASCADE;
DROP TABLE IF EXISTS donaciones CASCADE;
DROP TABLE IF EXISTS citas CASCADE;
DROP TABLE IF EXISTS eventos CASCADE;
DROP TABLE IF EXISTS puntos_recoleccion CASCADE;
DROP TABLE IF EXISTS usuarios CASCADE;

-- ===== Módulo: Usuarios =====
CREATE TABLE usuarios (
  id                SERIAL PRIMARY KEY,
  nombre            VARCHAR(80)  NOT NULL,
  apellido          VARCHAR(80)  NOT NULL,
  correo            VARCHAR(160) NOT NULL UNIQUE,
  telefono          VARCHAR(30)  NOT NULL,
  password_hash     VARCHAR(100) NOT NULL,
  rol               VARCHAR(15)  NOT NULL DEFAULT 'donante' CHECK (rol IN ('donante', 'administrador')),
  intentos_fallidos INT          NOT NULL DEFAULT 0,
  primer_intento_en TIMESTAMPTZ,
  bloqueado_hasta   TIMESTAMPTZ,
  es_demo           BOOLEAN      NOT NULL DEFAULT FALSE,
  creado_en         TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ===== Módulo: Puntos de recolección =====
CREATE TABLE puntos_recoleccion (
  id        SERIAL PRIMARY KEY,
  nombre    VARCHAR(120) NOT NULL,
  zona      VARCHAR(120),
  ciudad    VARCHAR(120) NOT NULL,
  direccion VARCHAR(200) NOT NULL,
  telefono  VARCHAR(30)  NOT NULL,
  horario   VARCHAR(120) NOT NULL,
  activo    BOOLEAN      NOT NULL DEFAULT TRUE,
  creado_en TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ===== Módulo: Eventos =====
CREATE TABLE eventos (
  id                    SERIAL PRIMARY KEY,
  nombre                VARCHAR(140) NOT NULL,
  descripcion           TEXT,
  fecha                 DATE         NOT NULL,
  hora_inicio           TIME         NOT NULL,
  hora_fin              TIME         NOT NULL,
  duracion_cita_min     INT          NOT NULL DEFAULT 30 CHECK (duracion_cita_min > 0),
  capacidad_por_horario INT          NOT NULL DEFAULT 4 CHECK (capacidad_por_horario > 0),
  cupo_total            INT          NOT NULL CHECK (cupo_total > 0),
  centro                VARCHAR(140) NOT NULL,
  direccion             VARCHAR(200) NOT NULL,
  ciudad                VARCHAR(120) NOT NULL,
  requisitos            TEXT[]       NOT NULL DEFAULT ARRAY['Cabello limpio y seco', 'Entre 20 y 35 cm de largo', 'No teñido recientemente'],
  imagen_url            VARCHAR(300),
  estado                VARCHAR(15)  NOT NULL DEFAULT 'borrador'
                        CHECK (estado IN ('borrador', 'programado', 'activo', 'finalizado', 'cancelado')),
  punto_id              INT REFERENCES puntos_recoleccion(id) ON DELETE SET NULL,
  creado_por            INT REFERENCES usuarios(id),
  creado_en             TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  CHECK (hora_fin > hora_inicio)
);

-- ===== Módulo: Citas =====
CREATE TABLE citas (
  id                   SERIAL PRIMARY KEY,
  folio                CHAR(8)     NOT NULL UNIQUE,
  usuario_id           INT         NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  evento_id            INT         NOT NULL REFERENCES eventos(id) ON DELETE CASCADE,
  hora                 TIME        NOT NULL,
  estado               VARCHAR(15) NOT NULL DEFAULT 'activa'
                       CHECK (estado IN ('activa', 'atendida', 'cancelada', 'no_asistio')),
  recordatorio_enviado BOOLEAN     NOT NULL DEFAULT FALSE,
  creado_en            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  cancelado_en         TIMESTAMPTZ
);

CREATE UNIQUE INDEX ux_cita_activa_por_evento ON citas (usuario_id, evento_id) WHERE estado = 'activa';
CREATE INDEX ix_citas_evento_hora ON citas (evento_id, hora) WHERE estado IN ('activa', 'atendida');

-- ===== Módulo: Donaciones de cabello =====
CREATE TABLE donaciones (
  id             SERIAL PRIMARY KEY,
  cita_id        INT          NOT NULL UNIQUE REFERENCES citas(id) ON DELETE CASCADE,
  usuario_id     INT          NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  evento_id      INT          NOT NULL REFERENCES eventos(id) ON DELETE CASCADE,
  largo_cm       NUMERIC(4,1) NOT NULL CHECK (largo_cm BETWEEN 20 AND 35),
  estado         VARCHAR(15)  NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'completada')),
  notas          TEXT,
  registrado_por INT REFERENCES usuarios(id),
  creado_en      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ===== Módulo: Notificaciones =====
CREATE TABLE notificaciones (
  id        SERIAL PRIMARY KEY,
  tipo      VARCHAR(30)  NOT NULL,
  mensaje   VARCHAR(200) NOT NULL,
  leida     BOOLEAN      NOT NULL DEFAULT FALSE,
  creado_en TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ===== Módulo: Bitácora de correos =====
CREATE TABLE log_correos (
  id           SERIAL PRIMARY KEY,
  destinatario VARCHAR(160) NOT NULL,
  asunto       VARCHAR(200) NOT NULL,
  tipo         VARCHAR(30)  NOT NULL,
  exito        BOOLEAN      NOT NULL,
  simulado     BOOLEAN      NOT NULL DEFAULT FALSE,
  error        TEXT,
  enviado_en   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
