const nodemailer = require('nodemailer');

const transportador = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

// RF-08: registrar en log el 100% de los fallos de envío, sin tronar el flujo principal
// (si el correo falla, la cita ya quedó registrada; no debe perderse por un problema de SMTP).
async function enviarCorreo({ para, asunto, texto }) {
  try {
    await transportador.sendMail({
      from: process.env.EMAIL_USER,
      to: para,
      subject: asunto,
      text: texto,
    });
    return true;
  } catch (error) {
    console.error(`[FALLO DE ENVÍO DE CORREO] destinatario=${para} asunto="${asunto}" error=${error.message}`);
    return false;
  }
}

// RF-08: confirmación al crear o cancelar una cita
function enviarConfirmacionCita(usuario, cita, evento) {
  return enviarCorreo({
    para: usuario.correo,
    asunto: 'Confirmación de tu cita — For The Kids',
    texto: `Hola ${usuario.nombre}, tu cita para el evento "${evento.nombre}" quedó agendada. Folio: ${cita.folio}. Fecha: ${evento.fecha} ${evento.hora_inicio}. ¡Gracias por donar!`,
  });
}

function enviarCancelacionCita(usuario, cita, evento) {
  return enviarCorreo({
    para: usuario.correo,
    asunto: 'Cancelación de tu cita — For The Kids',
    texto: `Hola ${usuario.nombre}, tu cita con folio ${cita.folio} para el evento "${evento.nombre}" fue cancelada correctamente.`,
  });
}

// RF-09: recordatorio automático entre 20 y 24 horas antes de la cita
function enviarRecordatorioCita(correo, nombre, folio, nombreEvento, fecha, hora) {
  return enviarCorreo({
    para: correo,
    asunto: 'Recordatorio de tu cita — For The Kids',
    texto: `Hola ${nombre}, te recordamos tu cita (folio ${folio}) para el evento "${nombreEvento}" mañana ${fecha} a las ${hora}. ¡Te esperamos!`,
  });
}

// Extensión de RF-07: la solicitud de cancelación tardía (menos de 24h antes
// del evento) queda pendiente de revisión — se avisa al donante que se recibió.
function enviarSolicitudCancelacionRecibida(usuario, cita, evento) {
  return enviarCorreo({
    para: usuario.correo,
    asunto: 'Solicitud de cancelación recibida — For The Kids',
    texto: `Hola ${usuario.nombre}, recibimos tu solicitud para cancelar la cita con folio ${cita.folio} del evento "${evento.nombre}". Como faltan menos de 24 horas, un administrador debe autorizarla. Te avisaremos en cuanto se resuelva.`,
  });
}

function enviarCancelacionAprobada(usuario, cita, evento) {
  return enviarCorreo({
    para: usuario.correo,
    asunto: 'Tu cancelación fue aprobada — For The Kids',
    texto: `Hola ${usuario.nombre}, tu solicitud de cancelación de la cita con folio ${cita.folio} (evento "${evento.nombre}") fue aprobada. El lugar ya quedó liberado.`,
  });
}

function enviarCancelacionRechazada(usuario, cita, evento) {
  return enviarCorreo({
    para: usuario.correo,
    asunto: 'Tu solicitud de cancelación fue rechazada — For The Kids',
    texto: `Hola ${usuario.nombre}, tu solicitud de cancelación de la cita con folio ${cita.folio} (evento "${evento.nombre}") fue rechazada por el administrador. Tu cita sigue agendada normalmente.`,
  });
}

module.exports = {
  enviarConfirmacionCita,
  enviarCancelacionCita,
  enviarRecordatorioCita,
  enviarSolicitudCancelacionRecibida,
  enviarCancelacionAprobada,
  enviarCancelacionRechazada,
};
