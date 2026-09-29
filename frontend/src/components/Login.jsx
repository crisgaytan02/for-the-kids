import { useState } from 'react';
import { api } from '../api';

export default function Login({ alIniciarSesion, irARegistro }) {
  const [correo, setCorreo] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);

  async function manejarEnvio(e) {
    e.preventDefault();
    setError('');
    setCargando(true);
    try {
      const { token, usuario } = await api.login({ correo, contrasena });
      alIniciarSesion(token, usuario);
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="tarjeta">
      <h2>Iniciar sesión</h2>
      <form onSubmit={manejarEnvio}>
        <label>Correo</label>
        <input type="email" value={correo} onChange={(e) => setCorreo(e.target.value)} required />

        <label>Contraseña</label>
        <input type="password" value={contrasena} onChange={(e) => setContrasena(e.target.value)} required />

        {error && <p className="error">{error}</p>}

        <button type="submit" disabled={cargando}>
          {cargando ? 'Entrando...' : 'Entrar'}
        </button>
      </form>
      <p>
        ¿No tienes cuenta? <button className="enlace" onClick={irARegistro}>Regístrate</button>
      </p>
    </div>
  );
}
