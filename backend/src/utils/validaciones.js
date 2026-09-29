// RF-01: validaciones del registro de donantes.
// Se separaron del controlador para poder probarlas solas (UT-01 a UT-06).

const REGEX_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_CARACTERES_CONTRASENA = 8;
const DIGITOS_TELEFONO = 10;

/**
 * Revisa los datos de registro y regresa los errores encontrados por campo.
 * @param {{nombre?: string, correo?: string, telefono?: string, contrasena?: string}} datos
 * @return {{valido: boolean, errores: Object<string, string>}}
 */
function validarRegistro(datos = {}) {
  const { nombre, correo, telefono, contrasena } = datos;
  const errores = {};

  if (!nombre || !String(nombre).trim()) {
    errores.nombre = 'El nombre es obligatorio';
  }

  if (!correo || !String(correo).trim()) {
    errores.correo = 'El correo es obligatorio';
  } else if (!REGEX_CORREO.test(String(correo).trim())) {
    errores.correo = 'El correo no tiene un formato válido';
  }

  // Se aceptan espacios o guiones ("33 1234-5678"), pero deben ser 10 dígitos.
  const soloDigitos = String(telefono || '').replace(/\D/g, '');
  if (!telefono) {
    errores.telefono = 'El teléfono es obligatorio';
  } else if (soloDigitos.length !== DIGITOS_TELEFONO) {
    errores.telefono = 'El teléfono debe tener 10 dígitos';
  }

  if (!contrasena) {
    errores.contrasena = 'La contraseña es obligatoria';
  } else if (String(contrasena).length < MIN_CARACTERES_CONTRASENA) {
    errores.contrasena = 'La contraseña debe tener mínimo 8 caracteres';
  } else if (!/\d/.test(String(contrasena))) {
    errores.contrasena = 'La contraseña debe incluir al menos un número';
  }

  return { valido: Object.keys(errores).length === 0, errores };
}

module.exports = { validarRegistro };
