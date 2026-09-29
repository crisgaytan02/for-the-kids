// Recibe una imagen (campo "imagen") y devuelve la URL con la que despues se
// crea/edita un evento o un punto de recoleccion (campo imagen_url).
async function subirImagen(req, res) {
  if (!req.file) {
    return res.status(400).json({ error: 'No se recibio ningun archivo (campo esperado: imagen)' });
  }
  return res.status(201).json({ url: `/uploads/${req.file.filename}` });
}

module.exports = { subirImagen };
