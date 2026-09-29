const jwt = require('jsonwebtoken');

// RF-02: el token debe llevar el rol para que el resto del sistema
// (RF-14) pueda decidir a qué rutas tiene acceso cada usuario.
function generarToken(usuario) {
  return jwt.sign(
    { id: usuario.id, rol: usuario.rol, nombre: usuario.nombre },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
  );
}

module.exports = { generarToken };
