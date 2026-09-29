import { useState } from 'react';
import { api } from '../api';

export default function Registro({ irALogin }) {
  const [form, setForm] = useState({ nombre: '', correo: '', telefono: '', contrasena: '' });
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);

  function actualizar(campo, valor) {
    setForm((f) => ({ ...f, [campo]: valor }));
  }

  async function manejarEnvio(e) {
    e.preventDefault();
    setError('');
    setMensaje('');
    setCargando(true);
    try {
      await api.registrar(form);
      setMensaje('¡Cuenta creada! Ya puedes iniciar sesión.');
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="tarjeta">
      <h2>Crear cuenta</h2>
      <form onSubmit={manejarEnvio}>
        <label>Nombre</label>
        <input value={form.nombre} onChange={(e) => actualizar('nombre', e.target.value)} required />

        <label>Correo</label>
        <input type="email" value={form.correo} onChange={(e) => actualizar('correo', e.target.value)} required />

        <label>Teléfono</label>
        <input value={form.telefono} onChange={(e) => actualizar('telefono', e.target.value)} required />

        <label>Contraseña</label>
        <input
          type="password"
          value={form.contrasena}
          onChange={(e) => actualizar('contrasena', e.target.value)}
          required
        />

        {error && <p className="error">{error}</p>}
        {mensaje && <p className="exito">{mensaje}</p>}

        <button type="submit" disabled={cargando}>
          {cargando ? 'Creando...' : 'Registrarme'}
        </button>
      </form>
      <p>
        ¿Ya tienes cuenta? <button className="enlace" onClick={irALogin}>Inicia sesión</button>
      </p>
    </div>
  );
}
