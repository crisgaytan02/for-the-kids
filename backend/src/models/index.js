const sequelize = require('../config/db');
const Usuario = require('./Usuario');
const PuntoRecoleccion = require('./PuntoRecoleccion');
const Evento = require('./Evento');
const Cita = require('./Cita');
const Donacion = require('./Donacion');

// Un punto de recolección puede tener varios eventos asociados
PuntoRecoleccion.hasMany(Evento, { foreignKey: 'punto_recoleccion_id' });
Evento.belongsTo(PuntoRecoleccion, { foreignKey: 'punto_recoleccion_id' });

// Un usuario puede tener varias citas; una cita pertenece a un usuario y a un evento
Usuario.hasMany(Cita, { foreignKey: 'usuario_id' });
Cita.belongsTo(Usuario, { foreignKey: 'usuario_id' });

Evento.hasMany(Cita, { foreignKey: 'evento_id' });
Cita.belongsTo(Evento, { foreignKey: 'evento_id' });

// Una cita atendida da lugar a una única donación
Cita.hasOne(Donacion, { foreignKey: 'cita_id' });
Donacion.belongsTo(Cita, { foreignKey: 'cita_id' });

Usuario.hasMany(Donacion, { foreignKey: 'usuario_id' });
Donacion.belongsTo(Usuario, { foreignKey: 'usuario_id' });

module.exports = {
  sequelize,
  Usuario,
  PuntoRecoleccion,
  Evento,
  Cita,
  Donacion,
};
