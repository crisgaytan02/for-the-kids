// Simula el objeto "res" de Express para probar controladores sin levantar el servidor.
function crearRespuesta() {
  const res = {};
  res.statusCode = 200;
  res.body = undefined;
  res.status = jest.fn((codigo) => {
    res.statusCode = codigo;
    return res;
  });
  res.json = jest.fn((cuerpo) => {
    res.body = cuerpo;
    return res;
  });
  return res;
}

module.exports = { crearRespuesta };
