import { useEffect, useState } from 'react';
import { api } from '../api';

export default function Donaciones({ token, usuario }) {
  const [misDonaciones, setMisDonaciones] = useState([]);
  const [todas, setTodas] = useState([]);
  const [folio, setFolio] = useState('');
  const [longitud, setLongitud] = useState('');
  const [notas, setNotas] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');

  async function cargar() {
    try {
      if (usuario.rol === 'donante') {
        setMisDonaciones(await api.misDonaciones(token));
      } else {
        setTodas(await api.listarDonaciones(token));
      }
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    cargar();
  }, []);

  async function registrar(e) {
    e.preventDefault();
    setError('');
    setMensaje('');
    try {
      await api.registrarDonacion({ folio: folio.trim(), longitud_cm: longitud, notas }, token);
      setMensaje('Donación registrada correctamente');
      setFolio('');
      setLongitud('');
      setNotas('');
      cargar();
    } catch (err) {
      setError(err.message);
    }
  }

  if (usuario.rol === 'donante') {
    return (
      <div>
        <h2>Mis donaciones</h2>
        {error && <p className="error">{error}</p>}
        <div className="lista">
          {misDonaciones.length === 0 && <p className="vacio">Todavía no tienes donaciones registradas.</p>}
          {misDonaciones.map((d) => (
            <div key={d.id} className="tarjeta">
              <h3>{d.Cita?.Evento?.nombre}</h3>
              <p>Folio de cita: {d.Cita?.folio}</p>
              <p>Longitud donada: {d.longitud_cm} cm</p>
              <p>Registrada el: {new Date(d.registrada_en).toLocaleDateString()}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <h2>Donaciones (admin)</h2>
      {mensaje && <p className="exito">{mensaje}</p>}
      {error && <p className="error">{error}</p>}

      <p style={{ fontSize: '0.85rem', color: 'var(--color-ink-soft)' }}>
        ¿Todavía no marcaste la cita como "atendida"? Eso se hace ahora desde la pestaña <strong>Citas</strong>.
      </p>

      <div className="tarjeta">
        <h3>Registrar donación</h3>
        <form onSubmit={registrar}>
          <label>Folio de la cita (ya atendida)</label>
          <input
            value={folio}
            onChange={(e) => setFolio(e.target.value)}
            placeholder="Ej. 7ZFX4E3S"
            required
          />
          <label>Longitud del cabello donado (cm)</label>
          <input
            type="number"
            step="0.5"
            min="0.5"
            value={longitud}
            onChange={(e) => setLongitud(e.target.value)}
            placeholder="Ej. 25"
            required
          />
          <label>Notas (opcional)</label>
          <input value={notas} onChange={(e) => setNotas(e.target.value)} />
          <button type="submit">Registrar donación</button>
        </form>
      </div>

      <h3>Todas las donaciones</h3>
      <div className="lista">
        {todas.length === 0 && <p className="vacio">Aún no hay donaciones registradas.</p>}
        {todas.map((d) => (
          <div key={d.id} className="tarjeta">
            <p>{d.Usuario?.nombre} — {d.Usuario?.correo}</p>
            <p>Folio: {d.Cita?.folio} · {d.longitud_cm} cm</p>
            <p>{new Date(d.registrada_en).toLocaleString()}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
