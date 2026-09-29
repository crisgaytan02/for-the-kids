import { useEffect, useState } from 'react';
import { api } from '../api';

export default function Eventos({ token, usuario, refrescarCitas }) {
  const [eventos, setEventos] = useState([]);
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');
  const [formEvento, setFormEvento] = useState({
    nombre: '',
    fecha: '',
    hora_inicio: '',
    hora_fin: '',
    ubicacion: '',
    cupo_total: '',
    imagen_url: '',
  });
  const [subiendoImagen, setSubiendoImagen] = useState(false);

  async function cargarEventos() {
    try {
      const datos = await api.listarEventos();
      setEventos(datos);
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    cargarEventos();
  }, []);

  async function agendar(evento_id) {
    setError('');
    setMensaje('');
    try {
      const cita = await api.agendarCita(evento_id, token);
      setMensaje(`¡Cita agendada! Tu folio es ${cita.folio}`);
      cargarEventos();
      refrescarCitas && refrescarCitas();
    } catch (err) {
      setError(err.message);
    }
  }

  async function elegirImagen(e) {
    const archivo = e.target.files[0];
    if (!archivo) return;
    setError('');
    setSubiendoImagen(true);
    try {
      const { url } = await api.subirImagen(archivo, token);
      setFormEvento((f) => ({ ...f, imagen_url: url }));
    } catch (err) {
      setError(err.message);
    } finally {
      setSubiendoImagen(false);
    }
  }

  async function crearEvento(e) {
    e.preventDefault();
    setError('');
    try {
      await api.crearEvento({ ...formEvento, cupo_total: Number(formEvento.cupo_total) }, token);
      setFormEvento({ nombre: '', fecha: '', hora_inicio: '', hora_fin: '', ubicacion: '', cupo_total: '', imagen_url: '' });
      cargarEventos();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div>
      <h2>Eventos vigentes</h2>
      {mensaje && <p className="exito">{mensaje}</p>}
      {error && <p className="error">{error}</p>}

      <div className="lista">
        {eventos.length === 0 && <p className="vacio">No hay eventos activos por el momento.</p>}
        {eventos.map((ev) => (
          <div key={ev.id} className="tarjeta">
            <h3>{ev.nombre}</h3>
            <p>{ev.fecha} · {ev.hora_inicio} - {ev.hora_fin}</p>
            <p>{ev.ubicacion}</p>
            <div className="barra-cupo">
              <div
                className="barra-cupo-relleno"
                style={{ width: `${Math.max(0, Math.round((ev.cupo_disponible / ev.cupo_total) * 100))}%` }}
              />
            </div>
            <p>Cupo disponible: {ev.cupo_disponible} / {ev.cupo_total}</p>
            {usuario?.rol === 'donante' && (
              <button disabled={ev.cupo_disponible <= 0} onClick={() => agendar(ev.id)}>
                {ev.cupo_disponible <= 0 ? 'Sin cupo' : 'Agendar cita'}
              </button>
            )}
          </div>
        ))}
      </div>

      {usuario?.rol === 'admin' && (
        <div className="tarjeta">
          <h3>Crear evento (admin)</h3>
          <form onSubmit={crearEvento}>
            <label>Nombre</label>
            <input
              value={formEvento.nombre}
              onChange={(e) => setFormEvento((f) => ({ ...f, nombre: e.target.value }))}
              required
            />
            <label>Fecha</label>
            <input
              type="date"
              value={formEvento.fecha}
              onChange={(e) => setFormEvento((f) => ({ ...f, fecha: e.target.value }))}
              required
            />
            <label>Hora inicio</label>
            <input
              type="time"
              value={formEvento.hora_inicio}
              onChange={(e) => setFormEvento((f) => ({ ...f, hora_inicio: e.target.value }))}
              required
            />
            <label>Hora fin</label>
            <input
              type="time"
              value={formEvento.hora_fin}
              onChange={(e) => setFormEvento((f) => ({ ...f, hora_fin: e.target.value }))}
              required
            />
            <label>Ubicación</label>
            <input
              value={formEvento.ubicacion}
              onChange={(e) => setFormEvento((f) => ({ ...f, ubicacion: e.target.value }))}
              required
            />
            <label>Cupo total</label>
            <input
              type="number"
              min="1"
              value={formEvento.cupo_total}
              onChange={(e) => setFormEvento((f) => ({ ...f, cupo_total: e.target.value }))}
              required
            />
            <label>Foto del evento (opcional)</label>
            <input type="file" accept="image/*" onChange={elegirImagen} />
            {subiendoImagen && <p style={{ fontSize: '0.82rem', color: 'var(--color-ink-soft)' }}>Subiendo imagen…</p>}
            {formEvento.imagen_url && !subiendoImagen && (
              <div style={{ marginTop: 8 }}>
                <img
                  src={formEvento.imagen_url}
                  alt="Vista previa"
                  style={{ width: 120, height: 80, objectFit: 'cover', borderRadius: 8, border: '1px solid var(--color-border)' }}
                />
                <div>
                  <button
                    type="button"
                    className="secundario"
                    style={{ marginTop: 6, padding: '4px 10px', fontSize: '0.78rem' }}
                    onClick={() => setFormEvento((f) => ({ ...f, imagen_url: '' }))}
                  >
                    Quitar foto
                  </button>
                </div>
              </div>
            )}
            <button type="submit" disabled={subiendoImagen}>Crear evento</button>
          </form>
        </div>
      )}
    </div>
  );
}
