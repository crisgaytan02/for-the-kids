import { useEffect, useState } from 'react';
import { api } from '../api';

export default function MisCitas({ token, recargarSenal }) {
  const [citas, setCitas] = useState([]);
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');

  async function cargar() {
    try {
      const datos = await api.misCitas(token);
      setCitas(datos);
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    cargar();
  }, [recargarSenal]);

  async function cancelar(id) {
    setError('');
    setMensaje('');
    try {
      const respuesta = await api.cancelarCita(id, token);
      setMensaje(respuesta.mensaje);
      cargar();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div>
      <h2>Mis citas</h2>
      {mensaje && <p className="exito">{mensaje}</p>}
      {error && <p className="error">{error}</p>}

      <div className="lista">
        {citas.length === 0 && <p className="vacio">Todavía no tienes citas agendadas — ve a "Eventos" para agendar la primera.</p>}
        {citas.map((c) => (
          <div key={c.id} className="tarjeta">
            <h3>Folio: {c.folio}</h3>
            <p>Evento: {c.Evento?.nombre}</p>
            <p>{c.Evento?.fecha} · {c.Evento?.hora_inicio}</p>
            <p>
              <span className={`distintivo ${c.estado}`}>{c.estado}</span>
              {c.cancelacion_solicitada && (
                <span className="distintivo agendada" style={{ marginLeft: 6 }}>
                  cancelación pendiente de aprobación
                </span>
              )}
            </p>
            {c.estado === 'agendada' && !c.cancelacion_solicitada && (
              <button onClick={() => cancelar(c.id)}>Cancelar cita</button>
            )}
            {c.cancelacion_solicitada && (
              <p style={{ fontSize: '0.85rem', color: 'var(--color-ink-soft)' }}>
                Tu cita está a menos de 24 horas, así que un administrador debe autorizar la cancelación.
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
