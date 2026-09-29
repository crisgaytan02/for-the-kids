const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Carpeta fisica donde quedan las fotos subidas (fuera de src/, junto al backend).
const CARPETA_UPLOADS = path.join(__dirname, '..', '..', 'uploads');
if (!fs.existsSync(CARPETA_UPLOADS)) {
  fs.mkdirSync(CARPETA_UPLOADS, { recursive: true });
}

const almacenamiento = multer.diskStorage({
  destination: (req, file, cb) => cb(null, CARPETA_UPLOADS),
  filename: (req, file, cb) => {
    const extension = path.extname(file.originalname).toLowerCase();
    const nombreUnico = `${Date.now()}-${Math.round(Math.random() * 1e9)}${extension}`;
    cb(null, nombreUnico);
  },
});

// Solo se aceptan imagenes, y hasta 5MB (de sobra para una foto de evento).
function filtroDeArchivo(req, file, cb) {
  const tiposPermitidos = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  if (!tiposPermitidos.includes(file.mimetype)) {
    const error = new Error('Solo se permiten imagenes (jpg, png, webp o gif)');
    error.status = 400;
    return cb(error);
  }
  cb(null, true);
}

const subirImagen = multer({
  storage: almacenamiento,
  fileFilter: filtroDeArchivo,
  limits: { fileSize: 5 * 1024 * 1024 },
});

module.exports = { subirImagen, CARPETA_UPLOADS };
