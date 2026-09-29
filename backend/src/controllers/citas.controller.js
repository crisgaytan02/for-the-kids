const { sequelize, Cita, Evento, Usuario } = require('../models');
const { generarFolioUnico } = require('../utils/folio');
const {
  enviarConfirmacionCita,
  enviarCancelacionCita,
  enviarSolicitudCancelacionRecibida,
  enviarCancelacionAprobada,
  enviarCancelacionRechazada,
} = require('../utils/mailer');

const HORAS_APROBACION_ADMIN = 24; // por debajo de esto, cancelar ya no es automático

// RF-05, RF-06: agendar una cita validando cupo de forma segura ante concurrencia.
// Se usa una transacción con bloqueo de fila (SELECT ... FOR UPDATE) para que, si dos
// donantes intentan tomar el último lugar al mismo tiempo, solo uno de los dos gane.
async function agendarCita(req, res) {
  const { evento_id } = req.body;
  const usuario_id = req.usuario.id;

  if (!evento_id) {
    return res.status(400).json({ error: 'Debes indicar el evento' });
  }

  try {
    const cita = await sequelize.transaction(async (t) => {
      const evento = await Evento.findByPk(evento_id, {
        transaction: t,
        lock: t.LOCK.UPDATE,
      });

      if (!evento || !evento.activo) {
        const error = new Error('El evento no existe o ya no está vigente');
        error.status = 404;
        throw error;
      }

      if (evento.cupo_disponible <= 0) {
        const error = new Error('Ya no hay cupo disponible para este evento');
        error.status = 409;
        throw error;
      }

      const folio = await generarFolioUnico();

      // El índice parcial único (usuario_id, evento_id) WHERE estado='agendada'
      // es la última línea de defensa contra citas duplicadas; aquí lo capturamos
      // como error controlado si llega a dispararse.
      const nuevaCita = await Cita.create(
        { folio, usuario_id, evento_id },
        { transaction: t }
      );

      evento.cupo_disponible -= 1;
      await evento.save({ transaction: t });

      return nuevaCita;
    });

    const usuario = await Usuario.findByPk(usuario_id);
    const evento = await Evento.findByPk(evento_id);
    enviarConfirmacionCita(usuario, cita, evento); // no se espera (await) para no retrasar la respuesta al donante

    return res.status(201).json(cita);
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({ error: 'Ya tienes una cita activa para este evento' });
    }
    const status = error.status || 500;
    return res.status(status).json({ error: error.message || 'No se pudo agendar la cita' });
  }
}

function horasHastaElEvento(evento) {
  const fechaHoraEvento = new Date(`${evento.fecha}T${evento.hora_inicio}`);
  return (fechaHoraEvento - new Date()) / 3600000;
}

// RF-07 (ampliado): cancelar una cita.
// - Si faltan 24 horas o más para el evento: se cancela de inmediato y se libera el cupo,
//   como antes.
// - Si faltan menos de 24 horas: ya no se cancela sola. Queda marcada como
//   "solicitud de cancelación pendiente" y un administrador debe aprobarla o
//   rechazarla (aprobarCancelacion / rechazarCancelacion, abajo). El cupo NO se
//   libera hasta que el admin aprueba.
async function cancelarCita(req, res) {
  const { id } = req.params;
  const usuario_id = req.usuario.id;

  try {
    const resultado = await sequelize.transaction(async (t) => {
      const cita = await Cita.findByPk(id, { transaction: t });

      if (!cita) {
        const error = new Error('Cita no encontrada');
        error.status = 404;
        throw error;
      }

      // Un donante solo puede cancelar su propia cita; un admin puede cancelar cualquiera.
      if (cita.usuario_id !== usuario_id && req.usuario.rol !== 'admin') {
        const error = new Error('No puedes cancelar una cita que no es tuya');
        error.status = 403;
        throw error;
      }

      if (cita.estado !== 'agendada') {
        const error = new Error('Esta cita ya no está activa');
        error.status = 400;
        throw error;
      }

      if (cita.cancelacion_solicitada) {
        const error = new Error('Ya tienes una solicitud de cancelación pendiente de revisión');
        error.status = 400;
        throw error;
      }

      const evento = await Evento.findByPk(cita.evento_id, { transaction: t, lock: t.LOCK.UPDATE });
      const horasParaElEvento = horasHastaElEvento(evento);

      // Un admin cancelando en nombre del donante nunca necesita autoaprobarse:
      // el bloqueo de 24h solo aplica a la autocancelación del propio donante.
      const requiereAprobacion = horasParaElEvento < HORAS_APROBACION_ADMIN && req.usuario.rol !== 'admin';

      if (requiereAprobacion) {
        await cita.update(
          { cancelacion_solicitada: true, cancelacion_solicitada_en: new Date() },
          { transaction: t }
        );
        return { tipo: 'pendiente', cita, evento };
      }

      await cita.update({ estado: 'cancelada', cancelada_en: new Date() }, { transaction: t });
      evento.cupo_disponible += 1;
      await evento.save({ transaction: t });

      return { tipo: 'cancelada', cita, evento };
    });

    const usuario = await Usuario.findByPk(resultado.cita.usuario_id);

    if (resultado.tipo === 'pendiente') {
      enviarSolicitudCancelacionRecibida(usuario, resultado.cita, resultado.evento);
      return res.json({
        mensaje: 'Tu cita está a menos de 24 horas: la solicitud de cancelación quedó pendiente de aprobación del administrador.',
        cita: resultado.cita,
      });
    }

    enviarCancelacionCita(usuario, resultado.cita, resultado.evento);
    return res.json({ mensaje: 'Cita cancelada correctamente', cita: resultado.cita });
  } catch (error) {
    const status = error.status || 500;
    return res.status(status).json({ error: error.message || 'No se pudo cancelar la cita' });
  }
}

// Panel de admin: lista las solicitudes de cancelación tardía pendientes de revisar.
async function listarSolicitudesCancelacion(req, res) {
  const solicitudes = await Cita.findAll({
    where: { cancelacion_solicitada: true, estado: 'agendada' },
    include: [
      { model: Usuario, attributes: ['nombre', 'correo'] },
      { model: Evento, attributes: ['nombre', 'fecha', 'hora_inicio'] },
    ],
    order: [['cancelacion_solicitada_en', 'ASC']],
  });
  return res.json(solicitudes);
}

// El admin aprueba: ahora sí se cancela la cita y se libera el cupo.
async function aprobarCancelacion(req, res) {
  const { folio } = req.params;

  try {
    const resultado = await sequelize.transaction(async (t) => {
      const cita = await Cita.findOne({ where: { folio: folio.toUpperCase() }, transaction: t });

      if (!cita) {
        const error = new Error(`No existe ninguna cita con el folio ${folio}`);
        error.status = 404;
        throw error;
      }

      if (!cita.cancelacion_solicitada) {
        const error = new Error('Esta cita no tiene una solicitud de cancelación pendiente');
        error.status = 400;
        throw error;
      }

      const evento = await Evento.findByPk(cita.evento_id, { transaction: t, lock: t.LOCK.UPDATE });

      await cita.update(
        { estado: 'cancelada', cancelada_en: new Date(), cancelacion_solicitada: false },
        { transaction: t }
      );

      evento.cupo_disponible += 1;
      await evento.save({ transaction: t });

      return { cita, evento };
    });

    const usuario = await Usuario.findByPk(resultado.cita.usuario_id);
    enviarCancelacionAprobada(usuario, resultado.cita, resultado.evento);

    return res.json({ mensaje: 'Cancelación aprobada, el cupo quedó liberado', cita: resultado.cita });
  } catch (error) {
    const status = error.status || 500;
    return res.status(status).json({ error: error.message || 'No se pudo aprobar la cancelación' });
  }
}

// El admin rechaza: la cita se queda agendada tal cual, no se libera cupo.
async function rechazarCancelacion(req, res) {
  const { folio } = req.params;
  const cita = await Cita.findOne({ where: { folio: folio.toUpperCase() } });

  if (!cita) {
    return res.status(404).json({ error: `No existe ninguna cita con el folio ${folio}` });
  }

  if (!cita.cancelacion_solicitada) {
    return res.status(400).json({ error: 'Esta cita no tiene una solicitud de cancelación pendiente' });
  }

  await cita.update({ cancelacion_solicitada: false, cancelacion_solicitada_en: null });

  const usuario = await Usuario.findByPk(cita.usuario_id);
  const evento = await Evento.findByPk(cita.evento_id);
  enviarCancelacionRechazada(usuario, cita, evento);

  return res.json({ mensaje: 'Solicitud de cancelación rechazada, la cita sigue agendada', cita });
}

// Panel de admin: todas las citas de todos los donantes (cualquier estado),
// para la pantalla "Citas" y para la tarjeta "Próximas citas" del dashboard.
async function listarTodasCitas(req, res) {
  const citas = await Cita.findAll({
    include: [
      { model: Usuario, attributes: ['nombre', 'correo'] },
      { model: Evento, attributes: ['nombre', 'fecha', 'hora_inicio'] },
    ],
    order: [[Evento, 'fecha', 'ASC']],
  });
  return res.json(citas);
}

// Conveniencia: que un donante vea sus propias citas (se reutiliza en el Módulo 5)
async function misCitas(req, res) {
  const citas = await Cita.findAll({
    where: { usuario_id: req.usuario.id },
    include: [{ model: Evento, attributes: ['nombre', 'fecha', 'hora_inicio', 'ubicacion'] }],
    order: [['creada_en', 'DESC']],
  });
  return res.json(citas);
}

// Paso previo a RF-10: el admin marca la cita como atendida el día del evento.
// Una donación solo puede registrarse sobre una cita en este estado.
// Se busca por FOLIO (no por id numérico): es lo único que el admin ve en
// pantalla (en la lista de citas y en los correos), así que es lo que va a
// escribir. Buscar por id interno provocaba el error "sintaxis de entrada
// no válida para tipo integer" cuando el admin pegaba el folio ahí.
async function marcarAtendida(req, res) {
  const { folio } = req.params;
  const cita = await Cita.findOne({ where: { folio: folio.toUpperCase() } });

  if (!cita) {
    return res.status(404).json({ error: `No existe ninguna cita con el folio ${folio}` });
  }

  if (cita.estado !== 'agendada') {
    return res.status(400).json({ error: 'Solo se puede marcar como atendida una cita que esté agendada' });
  }

  await cita.update({ estado: 'atendida' });
  return res.json(cita);
}

module.exports = {
  agendarCita,
  cancelarCita,
  misCitas,
  listarTodasCitas,
  marcarAtendida,
  listarSolicitudesCancelacion,
  aprobarCancelacion,
  rechazarCancelacion,
};
