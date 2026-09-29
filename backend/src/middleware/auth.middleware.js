const jwt = require('jsonwebtoken');

// RF-14: verifica el token antes de dejar pasar a cualquier ruta protegida.
// La verificación de JWT es en memoria, así que corre muy por debajo
// del límite de 500ms que pide el requerimiento medible.
function verificarToken(req, res, next) {
  const encabezado = req.headers.authorization;

  if (!encabezado || !encabezado.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token no proporcionado' });
  }

  const token = encabezado.split(' ')[1];

  try {
    const datos = jwt.verify(token, process.env.JWT_SECRET);
    req.usuario = datos; // { id, rol, nombre }
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }
}

module.exports = verificarToken;
