import { useEffect, useState } from 'react';
import { api } from '../api';

// Extensión de RF-07: cuando un donante pide cancelar con menos de 24h de
// anticipación, la cita no se cancela sola — queda aquí, esperando que un
// admin la apruebe (libera el cupo) o la rechace (la cita sigue agendada).
export default function SolicitudesCancelacion({ token }) {
  const [solicitudes, setSolicitudes] = useState([]);
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');

  async function cargar() {
    try {
      setSolicitudes(await api.listarSolicitudesCancelacion(token));
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    cargar();
  }, []);

  async function aprobar(folio) {
    setError('');
    setMensaje('');
    try {
      const respuesta = await api.aprobarCancelacion(folio, token);
      setMensaje(respuesta.mensaje);
      cargar();
    } catch (err) {
      setError(err.message);
    }
  }

  async function rechazar(folio) {
    setError('');
    setMensaje('');
    try {
      const respuesta = await api.rechazarCancelacion(folio, token);
      setMensaje(respuesta.mensaje);
      cargar();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div>
      <h2>Solicitudes de cancelación</h2>
      <p style={{ fontSize: '0.85rem', color: 'var(--color-ink-soft)' }}>
        Estas citas están a menos de 24 horas del evento, así que su cancelación necesita tu autorización.
      </p>
      {mensaje && <p className="exito">{mensaje}</p>}
      {error && <p className="error">{error}</p>}

      <div className="lista">
        {solicitudes.length === 0 && (
          <p className="vacio">No hay solicitudes de cancelación pendientes por ahora.</p>
        )}
        {solicitudes.map((s) => (
          <div key={s.id} className="tarjeta">
            <h3>Folio: {s.folio}</h3>
            <p>Donante: {s.Usuario?.nombre} — {s.Usuario?.correo}</p>
            <p>Evento: {s.Evento?.nombre}</p>
            <p>{s.Evento?.fecha} · {s.Evento?.hora_inicio}</p>
            <p>Solicitada el: {new Date(s.cancelacion_solicitada_en).toLocaleString()}</p>
            <div className="acciones">
              <button onClick={() => aprobar(s.folio)}>Aprobar cancelación</button>
              <button className="secundario" onClick={() => rechazar(s.folio)}>Rechazar</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
