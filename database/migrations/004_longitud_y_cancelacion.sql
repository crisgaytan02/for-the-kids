-- Migración 004
-- 1) RF-10: la donación debe registrar la longitud del cabello donado
--    (el SRS la pide explícitamente; solo las notas son opcionales).
-- 2) RF-07 (ampliado): si faltan menos de 24h para el evento, cancelar ya
--    no es automático — queda pendiente de aprobación del administrador.

ALTER TABLE donaciones
    ADD COLUMN IF NOT EXISTS longitud_cm NUMERIC(5,1);

-- Back-fill de seguridad por si ya había donaciones cargadas sin este dato
-- (no debería pasar en un ambiente nuevo, pero evita que el NOT NULL truene).
UPDATE donaciones SET longitud_cm = 0 WHERE longitud_cm IS NULL;

ALTER TABLE donaciones
    ALTER COLUMN longitud_cm SET NOT NULL;

ALTER TABLE citas
    ADD COLUMN IF NOT EXISTS cancelacion_solicitada BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS cancelacion_solicitada_en TIMESTAMP NULL;
