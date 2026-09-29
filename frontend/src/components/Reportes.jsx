import { useState } from 'react';
import { api } from '../api';

export default function Reportes({ token }) {
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [reporte, setReporte] = useState(null);
  const [error, setError] = useState('');

  async function consultar(e) {
    e?.preventDefault();
    setError('');
    try {
      const params = new URLSearchParams();
      if (desde) params.set('desde', desde);
      if (hasta) params.set('hasta', hasta);
      const datos = await api.reporte(params.toString(), token);
      setReporte(datos);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div>
      <h2>Reportes y estadísticas</h2>
      <div className="tarjeta">
        <form onSubmit={consultar}>
          <label>Desde</label>
          <input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} />
          <label>Hasta</label>
          <input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} />
          <button type="submit">Generar reporte</button>
        </form>
      </div>

      {error && <p className="error">{error}</p>}

      {reporte && (
        <div className="tarjeta">
          <h3>Resultado</h3>
          <p>Número de citas: <strong>{reporte.numero_citas}</strong></p>
          <p>Donaciones realizadas: <strong>{reporte.numero_donaciones}</strong></p>
          <p>Eventos activos: <strong>{reporte.eventos_activos}</strong></p>
          <p style={{ fontSize: '0.8rem', color: '#777' }}>
            Generado: {new Date(reporte.generado_en).toLocaleString()}
          </p>
        </div>
      )}
    </div>
  );
}
