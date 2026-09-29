const BASE_URL = 'http://localhost:4000/api';

async function peticion(ruta, { metodo = 'GET', body, token } = {}) {
  const respuesta = await fetch(`${BASE_URL}${ruta}`, {
    method: metodo,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const datos = await respuesta.json().catch(() => ({}));

  if (!respuesta.ok) {
    throw new Error(datos.error || 'Ocurrió un error inesperado');
  }

  return datos;
}

// Aparte de `peticion`: aquí el cuerpo es un archivo (multipart/form-data),
// así que no se manda el header 'Content-Type: application/json' ni se
// serializa nada — el navegador arma el form-data solo.
async function subirArchivo(archivo, token) {
  const formulario = new FormData();
  formulario.append('imagen', archivo);

  const respuesta = await fetch(`${BASE_URL}/uploads`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formulario,
  });

  const datos = await respuesta.json().catch(() => ({}));

  if (!respuesta.ok) {
    throw new Error(datos.error || 'No se pudo subir la imagen');
  }

  // El backend devuelve una ruta relativa ("/uploads/xxxx.jpg"); como el
  // frontend corre en otro puerto, aquí se completa con el origen del
  // backend para que la imagen cargue bien sin importar quién la muestre.
  const origenBackend = BASE_URL.replace(/\/api$/, '');
  return { url: `${origenBackend}${datos.url}` };
}

export const api = {
  subirImagen: subirArchivo,

  registrar: (datos) => peticion('/auth/registro', { metodo: 'POST', body: datos }),
  login: (datos) => peticion('/auth/login', { metodo: 'POST', body: datos }),
  perfil: (token) => peticion('/auth/perfil', { token }),

  listarEventos: () => peticion('/eventos'),
  crearEvento: (datos, token) => peticion('/eventos', { metodo: 'POST', body: datos, token }),

  listarPuntos: () => peticion('/puntos'),
  crearPunto: (datos, token) => peticion('/puntos', { metodo: 'POST', body: datos, token }),

  agendarCita: (evento_id, token) => peticion('/citas', { metodo: 'POST', body: { evento_id }, token }),
  cancelarCita: (id, token) => peticion(`/citas/${id}`, { metodo: 'DELETE', token }),
  misCitas: (token) => peticion('/citas/mis-citas', { token }),
  listarTodasCitas: (token) => peticion('/citas/todas', { token }),
  marcarAtendida: (folio, token) => peticion(`/citas/${folio}/atender`, { metodo: 'PATCH', token }),

  listarSolicitudesCancelacion: (token) => peticion('/citas/solicitudes-cancelacion', { token }),
  aprobarCancelacion: (folio, token) => peticion(`/citas/${folio}/aprobar-cancelacion`, { metodo: 'PATCH', token }),
  rechazarCancelacion: (folio, token) => peticion(`/citas/${folio}/rechazar-cancelacion`, { metodo: 'PATCH', token }),

  registrarDonacion: (datos, token) => peticion('/donaciones', { metodo: 'POST', body: datos, token }),
  misDonaciones: (token) => peticion('/donaciones/mis-donaciones', { token }),
  listarDonaciones: (token) => peticion('/donaciones', { token }),

  listarUsuarios: (token) => peticion('/usuarios', { token }),

  reporte: (query, token) => peticion(`/reportes${query ? `?${query}` : ''}`, { token }),
  donacionesPorMes: (token, meses = 9) => peticion(`/reportes/donaciones-por-mes?meses=${meses}`, { token }),
  reportePublico: () => peticion('/reportes/publico'),
};
