const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

// RF-03 (consulta), RF-06 (validación de cupo), RF-12 (gestión administrativa)
const Evento = sequelize.define('Evento', {
  nombre: { type: DataTypes.STRING(150), allowNull: false },
  fecha: { type: DataTypes.DATEONLY, allowNull: false },
  hora_inicio: { type: DataTypes.TIME, allowNull: false },
  hora_fin: { type: DataTypes.TIME, allowNull: false },
  ubicacion: { type: DataTypes.STRING(255), allowNull: false },
  cupo_total: { type: DataTypes.INTEGER, allowNull: false, validate: { min: 1 } },
  cupo_disponible: { type: DataTypes.INTEGER, allowNull: false, validate: { min: 0 } },
  activo: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  imagen_url: { type: DataTypes.STRING(500), allowNull: true },
}, {
  tableName: 'eventos',
  createdAt: 'creado_en',
  updatedAt: false,
});

module.exports = Evento;
