// Express no atrapa errores lanzados dentro de funciones async por sí solo.
// Esta envoltura los captura y se los pasa a next(), para que terminen en el
// manejador de errores en vez de crashear todo el proceso de Node.
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

module.exports = asyncHandler;
