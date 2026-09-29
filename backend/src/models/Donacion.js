const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

// RF-10 (registro), RF-11 (historial)
// El SRS pide explícitamente la longitud del cabello donado como dato de
// entrada de este requisito (solo las observaciones son opcionales), así
// que es un campo requerido y validado en centímetros.
const Donacion = sequelize.define('Donacion', {
  longitud_cm: { type: DataTypes.DECIMAL(5, 1), allowNull: false },
  notas: { type: DataTypes.STRING(255), allowNull: true },
}, {
  tableName: 'donaciones',
  createdAt: 'registrada_en',
  updatedAt: false,
});

module.exports = Donacion;
