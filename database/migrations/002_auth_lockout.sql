-- Migración 002 — Módulo 2: Usuarios y autenticación
-- Agrega la columna necesaria para calcular la ventana de 10 minutos
-- de intentos fallidos (RF-02). Ejecutar sobre una BD que ya tenga schema.sql cargado.

ALTER TABLE usuarios
    ADD COLUMN IF NOT EXISTS ultimo_intento_fallido TIMESTAMP NULL;
