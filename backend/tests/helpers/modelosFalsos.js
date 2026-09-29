// Reemplazo en memoria del modelo Usuario de Sequelize.
// Así las pruebas no necesitan PostgreSQL y corren igual en cualquier compu y en GitHub Actions.
const usuarios = [];
let siguienteId = 1;

function envolver(datos) {
  return {
    ...datos,
    async update(cambios) {
      Object.assign(this, cambios);
      return this;
    },
  };
}

const Usuario = {
  async findOne({ where }) {
    return usuarios.find((u) => u.correo === where.correo) || null;
  },
  async findByPk(id) {
    return usuarios.find((u) => u.id === id) || null;
  },
  async create(datos) {
    const usuario = envolver({
      id: siguienteId++,
      intentos_fallidos: 0,
      ultimo_intento_fallido: null,
      bloqueado_hasta: null,
      ...datos,
    });
    usuarios.push(usuario);
    return usuario;
  },
  // Solo para las pruebas
  _reiniciar() {
    usuarios.length = 0;
    siguienteId = 1;
  },
};

module.exports = { Usuario, sequelize: {} };
