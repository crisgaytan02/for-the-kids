// RF-14: ningún usuario con rol "donante" debe poder acceder a rutas
// administrativas. Se usa después de verificarToken, así que req.usuario
// ya viene decodificado del JWT.
function requiereRol(...rolesPermitidos) {
  return (req, res, next) => {
    if (!req.usuario || !rolesPermitidos.includes(req.usuario.rol)) {
      return res.status(403).json({ error: 'No tienes permiso para acceder a este recurso' });
    }
    next();
  };
}

module.exports = requiereRol;
