// ===== Módulo: Migración =====
import { migrar, pool } from './core.js';

migrar()
  .then(() => console.log('Base de datos actualizada sin borrar información.'))
  .catch((err) => {
    console.error('Error al migrar la base de datos:', err.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
