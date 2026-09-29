-- Migracion 005
-- Permite que cada evento y cada punto de recoleccion tengan una foto propia
-- (URL a una imagen), para reemplazar el icono/degradado por una imagen real
-- en las tarjetas del sitio publico y del dashboard.

ALTER TABLE eventos
    ADD COLUMN IF NOT EXISTS imagen_url VARCHAR(500);

ALTER TABLE puntos_recoleccion
    ADD COLUMN IF NOT EXISTS imagen_url VARCHAR(500);
