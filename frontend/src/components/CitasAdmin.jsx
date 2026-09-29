import { useEffect, useState } from 'react';
import { api } from '../api';
import SolicitudesCancelacion from './SolicitudesCancelacion';

export default function CitasAdmin({ token }) {
  const [citas, setCitas] = useState([]);
  const [folio, setFolio] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');

  async function cargar() {
    try {
      setCitas(await api.listarTodasCitas(token));
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    cargar();
  }, []);

  async function marcarAtendida(e) {
    e.preventDefault();
    setError('');
    setMensaje('');
    try {
      await api.marcarAtendida(folio.trim(), token);
      setMensaje(`Cita con folio ${folio.trim().toUpperCase()} marcada como atendida. Ya puedes registrar su donación desde "Donaciones".`);
      setFolio('');
      cargar();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div>
      <h2>Citas</h2>

      <SolicitudesCancelacion token={token} />

      <div className="tarjeta">
        <h3>Marcar cita como atendida</h3>
        <p style={{ fontSize: '0.85rem', color: 'var(--color-ink-soft)' }}>
          Usa el folio de 8 caracteres de la cita (se ve abajo, en "Mis citas" del donante y en los correos).
        </p>
        {mensaje && <p className="exito">{mensaje}</p>}
        {error && <p className="error">{error}</p>}
        <form onSubmit={marcarAtendida}>
          <label>Folio de la cita</label>
          <input value={folio} onChange={(e) => setFolio(e.target.value)} placeholder="Ej. 7ZFX4E3S" required />
          <button type="submit">Marcar atendida</button>
        </form>
      </div>

      <div className="panel">
        <div className="panel-header">
          <h3>Todas las citas</h3>
        </div>
        <div className="tabla-wrap">
          <table className="tabla">
            <thead>
              <tr>
                <th>Folio</th>
                <th>Donante</th>
                <th>Evento</th>
                <th>Fecha y hora</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {citas.length === 0 && (
                <tr><td colSpan={5} className="vacio">Todavía no hay citas agendadas.</td></tr>
              )}
              {citas.map((c) => (
                <tr key={c.id}>
                  <td>{c.folio}</td>
                  <td>{c.Usuario?.nombre}</td>
                  <td>{c.Evento?.nombre}</td>
                  <td>{c.Evento?.fecha} · {c.Evento?.hora_inicio}</td>
                  <td>
                    <span className={`distintivo ${c.estado}`}>{c.estado}</span>
                    {c.cancelacion_solicitada && (
                      <span className="distintivo agendada" style={{ marginLeft: 6 }}>pendiente de aprobar</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
