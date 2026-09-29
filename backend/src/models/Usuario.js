const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

// RF-01 (registro), RF-02 (login), RF-14 (restricción por rol)
const Usuario = sequelize.define('Usuario', {
  nombre: { type: DataTypes.STRING(150), allowNull: false },
  correo: { type: DataTypes.STRING(150), allowNull: false, unique: true },
  telefono: { type: DataTypes.STRING(20), allowNull: false },
  contrasena_hash: { type: DataTypes.STRING(255), allowNull: false },
  rol: { type: DataTypes.ENUM('donante', 'admin'), allowNull: false, defaultValue: 'donante' },
  intentos_fallidos: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  bloqueado_hasta: { type: DataTypes.DATE, allowNull: true },
  ultimo_intento_fallido: { type: DataTypes.DATE, allowNull: true },
}, {
  tableName: 'usuarios',
  createdAt: 'creado_en',
  updatedAt: false,
});

module.exports = Usuario;
