-- =========================================================
-- For The Kids — Sistema de Gestión de Campaña de Donación de Cabello
-- Módulo 1: Modelo de base de datos relacional (PostgreSQL)
-- Equipo Tlaxcala — Calidad de Software, ciclo 2026B
-- Cubre las entidades base para RF-01 a RF-14
-- =========================================================

CREATE TYPE rol_usuario AS ENUM ('donante', 'admin');
CREATE TYPE estado_cita AS ENUM ('agendada', 'cancelada', 'atendida');

-- RF-01, RF-02, RF-14: usuarios, login, control de intentos fallidos
CREATE TABLE usuarios (
    id                  SERIAL PRIMARY KEY,
    nombre              VARCHAR(150) NOT NULL,
    correo              VARCHAR(150) NOT NULL UNIQUE,
    telefono            VARCHAR(20)  NOT NULL,
    contrasena_hash     VARCHAR(255) NOT NULL,
    rol                 rol_usuario  NOT NULL DEFAULT 'donante',
    intentos_fallidos   INT          NOT NULL DEFAULT 0,
    bloqueado_hasta     TIMESTAMP    NULL,
    creado_en           TIMESTAMP    NOT NULL DEFAULT now()
);

-- RF-04, RF-12: puntos de recolección
CREATE TABLE puntos_recoleccion (
    id          SERIAL PRIMARY KEY,
    nombre      VARCHAR(150) NOT NULL,
    direccion   VARCHAR(255) NOT NULL,
    telefono    VARCHAR(20)  NOT NULL,
    horario     VARCHAR(100) NOT NULL,
    activo      BOOLEAN      NOT NULL DEFAULT true,
    creado_en   TIMESTAMP    NOT NULL DEFAULT now()
);

-- RF-03, RF-12: eventos de donación
CREATE TABLE eventos (
    id                      SERIAL PRIMARY KEY,
    nombre                  VARCHAR(150) NOT NULL,
    fecha                   DATE NOT NULL,
    hora_inicio             TIME NOT NULL,
    hora_fin                TIME NOT NULL,
    ubicacion               VARCHAR(255) NOT NULL,
    punto_recoleccion_id    INT REFERENCES puntos_recoleccion(id),
    cupo_total              INT NOT NULL CHECK (cupo_total > 0),
    cupo_disponible         INT NOT NULL CHECK (cupo_disponible >= 0),
    activo                  BOOLEAN NOT NULL DEFAULT true,
    creado_en               TIMESTAMP NOT NULL DEFAULT now()
);

-- RF-05, RF-06, RF-07, RF-08, RF-09: citas
CREATE TABLE citas (
    id              SERIAL PRIMARY KEY,
    folio           CHAR(8) NOT NULL UNIQUE,
    usuario_id      INT NOT NULL REFERENCES usuarios(id),
    evento_id       INT NOT NULL REFERENCES eventos(id),
    estado          estado_cita NOT NULL DEFAULT 'agendada',
    creada_en       TIMESTAMP NOT NULL DEFAULT now(),
    cancelada_en    TIMESTAMP NULL
);

-- Evita que un mismo donante tenga más de una cita ACTIVA en el mismo evento
-- (RF-05). Al ser un índice parcial, sí permite volver a agendar tras cancelar.
CREATE UNIQUE INDEX idx_cita_activa_unica
    ON citas(usuario_id, evento_id)
    WHERE estado = 'agendada';

-- RF-10, RF-11: donaciones e historial
CREATE TABLE donaciones (
    id              SERIAL PRIMARY KEY,
    cita_id         INT NOT NULL UNIQUE REFERENCES citas(id),
    usuario_id      INT NOT NULL REFERENCES usuarios(id),
    registrada_en   TIMESTAMP NOT NULL DEFAULT now(),
    notas           VARCHAR(255)
);

-- Índices de apoyo para las consultas más frecuentes (RF-03, RF-04, RF-11, RF-13)
CREATE INDEX idx_eventos_activos      ON eventos(activo, fecha);
CREATE INDEX idx_puntos_activos       ON puntos_recoleccion(activo);
CREATE INDEX idx_citas_usuario        ON citas(usuario_id);
CREATE INDEX idx_citas_evento         ON citas(evento_id);
CREATE INDEX idx_donaciones_usuario   ON donaciones(usuario_id);
