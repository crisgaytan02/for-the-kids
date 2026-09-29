const cron = require('node-cron');
const { sequelize, Cita } = require('../models');
const { enviarRecordatorioCita } = require('../utils/mailer');

// RF-09: revisa cada hora si hay citas cuyo evento cae entre 20 y 24 horas
// a partir de ahora, y les manda recordatorio si no se les ha mandado ya.
// Correr cada hora (en vez de una sola vez al día) da más precisión para
// caer dentro de la ventana de 20-24h que pide el requerimiento.
async function revisarYEnviarRecordatorios() {
  const [citasPorRecordar] = await sequelize.query(`
    SELECT c.id, c.folio, u.correo, u.nombre AS nombre_usuario,
           e.nombre AS nombre_evento, e.fecha, e.hora_inicio
    FROM citas c
    JOIN usuarios u ON u.id = c.usuario_id
    JOIN eventos e ON e.id = c.evento_id
    WHERE c.estado = 'agendada'
      AND c.recordatorio_enviado = false
      AND (e.fecha + e.hora_inicio) BETWEEN NOW() + INTERVAL '20 hours' AND NOW() + INTERVAL '24 hours'
  `);

  for (const cita of citasPorRecordar) {
    const enviado = await enviarRecordatorioCita(
      cita.correo,
      cita.nombre_usuario,
      cita.folio,
      cita.nombre_evento,
      cita.fecha,
      cita.hora_inicio
    );

    if (enviado) {
      await Cita.update({ recordatorio_enviado: true }, { where: { id: cita.id } });
    }
  }

  if (citasPorRecordar.length > 0) {
    console.log(`[Recordatorios] procesadas ${citasPorRecordar.length} cita(s)`);
  }
}

function iniciarJobDeRecordatorios() {
  // Corre al minuto 0 de cada hora
  cron.schedule('0 * * * *', revisarYEnviarRecordatorios);
  console.log('[Recordatorios] job programado cada hora');
}

module.exports = { iniciarJobDeRecordatorios, revisarYEnviarRecordatorios };
