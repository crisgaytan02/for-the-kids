// Script de mantenimiento: borra TODOS los datos de la base y deja un único
// usuario admin para empezar a capturar información real desde cero.
//
// Usa el bcrypt y el Sequelize de la propia app (mismo costo de hash que
// auth.controller.js), así que el login del admin nuevo funciona garantizado.
//
// Uso:
//   cd backend
//   node src/scripts/resetear_bd.js
//
// Variables de entorno opcionales para elegir el correo/contraseña del admin
// (si no se dan, se usan los valores por defecto que se muestran al final):
//   ADMIN_CORREO=otra@correo.com ADMIN_CONTRASENA=OtraClave123 node src/scripts/resetear_bd.js

require('dotenv').config();
const bcrypt = require('bcrypt');
const { sequelize, Usuario } = require('../models');

const ADMIN_CORREO = process.env.ADMIN_CORREO || 'admin@forthekids.org';
const ADMIN_CONTRASENA = process.env.ADMIN_CONTRASENA || 'Admin123!';
const ADMIN_NOMBRE = process.env.ADMIN_NOMBRE || 'Administrador ForTheKids';
const ADMIN_TELEFONO = process.env.ADMIN_TELEFONO || '0000000000';

async function main() {
  console.log('Conectando a la base de datos...');
  await sequelize.authenticate();

  console.log('Borrando todos los datos (usuarios, eventos, puntos, citas, donaciones)...');
  // TRUNCATE ... CASCADE respeta las llaves foráneas entre las 5 tablas y
  // RESTART IDENTITY reinicia los contadores de id (vuelven a empezar en 1).
  await sequelize.query(
    'TRUNCATE TABLE donaciones, citas, eventos, puntos_recoleccion, usuarios RESTART IDENTITY CASCADE;'
  );

  console.log('Creando el usuario admin...');
  const contrasena_hash = await bcrypt.hash(ADMIN_CONTRASENA, 10);

  await Usuario.create({
    nombre: ADMIN_NOMBRE,
    correo: ADMIN_CORREO,
    telefono: ADMIN_TELEFONO,
    contrasena_hash,
    rol: 'admin',
  });

  console.log('\n✅ Base de datos reiniciada. Datos de acceso del admin:');
  console.log(`   Correo:      ${ADMIN_CORREO}`);
  console.log(`   Contraseña:  ${ADMIN_CONTRASENA}`);
  console.log('\nCambia esta contraseña después de tu primer inicio de sesión.\n');

  await sequelize.close();
  process.exit(0);
}

main().catch((error) => {
  console.error('❌ Error al reiniciar la base de datos:', error.message);
  process.exit(1);
});
