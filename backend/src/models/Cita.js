const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

// RF-05 (agendar), RF-06 (validación de cupo), RF-07 (cancelar)
const Cita = sequelize.define('Cita', {
  folio: { type: DataTypes.CHAR(8), allowNull: false, unique: true },
  estado: {
    type: DataTypes.ENUM('agendada', 'cancelada', 'atendida'),
    allowNull: false,
    defaultValue: 'agendada',
  },
  cancelada_en: { type: DataTypes.DATE, allowNull: true },
  recordatorio_enviado: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  // Cuando faltan menos de 24h para el evento, cancelar ya no es automático:
  // se marca como "solicitada" y un admin debe aprobarla o rechazarla.
  cancelacion_solicitada: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  cancelacion_solicitada_en: { type: DataTypes.DATE, allowNull: true },
}, {
  tableName: 'citas',
  createdAt: 'creada_en',
  updatedAt: false,
});

module.exports = Cita;
