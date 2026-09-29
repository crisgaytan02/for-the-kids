import { useEffect, useState } from 'react';
import { api } from '../api';

export default function Puntos({ token, usuario }) {
  const [puntos, setPuntos] = useState([]);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ nombre: '', direccion: '', telefono: '', horario: '', imagen_url: '' });
  const [subiendoImagen, setSubiendoImagen] = useState(false);

  async function cargarPuntos() {
    try {
      const datos = await api.listarPuntos();
      setPuntos(datos);
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    cargarPuntos();
  }, []);

  async function elegirImagen(e) {
    const archivo = e.target.files[0];
    if (!archivo) return;
    setError('');
    setSubiendoImagen(true);
    try {
      const { url } = await api.subirImagen(archivo, token);
      setForm((f) => ({ ...f, imagen_url: url }));
    } catch (err) {
      setError(err.message);
    } finally {
      setSubiendoImagen(false);
    }
  }

  async function crearPunto(e) {
    e.preventDefault();
    setError('');
    try {
      await api.crearPunto(form, token);
      setForm({ nombre: '', direccion: '', telefono: '', horario: '', imagen_url: '' });
      cargarPuntos();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div>
      <h2>Puntos de recolección</h2>
      {error && <p className="error">{error}</p>}

      <div className="lista">
        {puntos.length === 0 && <p className="vacio">Aún no hay puntos de recolección registrados.</p>}
        {puntos.map((p) => (
          <div key={p.id} className="tarjeta">
            <h3>{p.nombre}</h3>
            <p>{p.direccion}</p>
            <p>Tel: {p.telefono}</p>
            <p>Horario: {p.horario}</p>
          </div>
        ))}
      </div>

      {usuario?.rol === 'admin' && (
        <div className="tarjeta">
          <h3>Crear punto de recolección (admin)</h3>
          <form onSubmit={crearPunto}>
            <label>Nombre</label>
            <input value={form.nombre} onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))} required />
            <label>Dirección</label>
            <input
              value={form.direccion}
              onChange={(e) => setForm((f) => ({ ...f, direccion: e.target.value }))}
              required
            />
            <label>Teléfono</label>
            <input
              value={form.telefono}
              onChange={(e) => setForm((f) => ({ ...f, telefono: e.target.value }))}
              required
            />
            <label>Horario</label>
            <input value={form.horario} onChange={(e) => setForm((f) => ({ ...f, horario: e.target.value }))} required />
            <label>Foto del punto (opcional)</label>
            <input type="file" accept="image/*" onChange={elegirImagen} />
            {subiendoImagen && <p style={{ fontSize: '0.82rem', color: 'var(--color-ink-soft)' }}>Subiendo imagen…</p>}
            {form.imagen_url && !subiendoImagen && (
              <div style={{ marginTop: 8 }}>
                <img
                  src={form.imagen_url}
                  alt="Vista previa"
                  style={{ width: 120, height: 80, objectFit: 'cover', borderRadius: 8, border: '1px solid var(--color-border)' }}
                />
                <div>
                  <button
                    type="button"
                    className="secundario"
                    style={{ marginTop: 6, padding: '4px 10px', fontSize: '0.78rem' }}
                    onClick={() => setForm((f) => ({ ...f, imagen_url: '' }))}
                  >
                    Quitar foto
                  </button>
                </div>
              </div>
            )}
            <button type="submit" disabled={subiendoImagen}>Crear punto</button>
          </form>
        </div>
      )}
    </div>
  );
}
