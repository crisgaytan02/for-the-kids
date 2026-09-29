const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

// RF-04 (consulta), RF-12 (gestión administrativa)
const PuntoRecoleccion = sequelize.define('PuntoRecoleccion', {
  nombre: { type: DataTypes.STRING(150), allowNull: false },
  direccion: { type: DataTypes.STRING(255), allowNull: false },
  telefono: { type: DataTypes.STRING(20), allowNull: false },
  horario: { type: DataTypes.STRING(100), allowNull: false },
  activo: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  imagen_url: { type: DataTypes.STRING(500), allowNull: true },
}, {
  tableName: 'puntos_recoleccion',
  createdAt: 'creado_en',
  updatedAt: false,
});

module.exports = PuntoRecoleccion;
