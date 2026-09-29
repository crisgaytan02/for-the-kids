-- Migración 003 — Módulo 4: Citas
-- Agrega la bandera para que el job de recordatorios no envíe el mismo
-- correo dos veces (RF-09).

ALTER TABLE citas
    ADD COLUMN IF NOT EXISTS recordatorio_enviado BOOLEAN NOT NULL DEFAULT false;
