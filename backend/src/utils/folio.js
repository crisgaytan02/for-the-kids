const { Cita } = require('../models');

const CARACTERES = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // sin 0, O, 1, I para evitar confusiones al leerlo

function generarCandidato() {
  let folio = '';
  for (let i = 0; i < 8; i++) {
    folio += CARACTERES[Math.floor(Math.random() * CARACTERES.length)];
  }
  return folio;
}

// RF-05: folio único de 8 caracteres. Reintenta si por alguna casualidad ya existe.
async function generarFolioUnico() {
  let folio = generarCandidato();
  let existe = await Cita.findOne({ where: { folio } });

  while (existe) {
    folio = generarCandidato();
    existe = await Cita.findOne({ where: { folio } });
  }

  return folio;
}

module.exports = { generarFolioUnico };
