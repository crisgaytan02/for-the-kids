import { useEffect, useState } from 'react';
import { api } from '../api';

export default function Landing({ token, irA, refrescarCitas }) {
  const [eventos, setEventos] = useState([]);
  const [puntos, setPuntos] = useState([]);
  const [stats, setStats] = useState(null);
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    async function cargar() {
      try {
        const [listaEventos, listaPuntos, statsPublicas] = await Promise.all([
          api.listarEventos(),
          api.listarPuntos(),
          api.reportePublico(),
        ]);
        setEventos(listaEventos);
        setPuntos(listaPuntos);
        setStats(statsPublicas);
      } catch (err) {
        setError(err.message);
      }
    }
    cargar();
  }, []);

  async function agendar(evento_id) {
    setError('');
    setMensaje('');
    try {
      const cita = await api.agendarCita(evento_id, token);
      setMensaje(`¡Cita agendada! Tu folio es ${cita.folio}`);
      refrescarCitas && refrescarCitas();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div>
      <section className="hero">
        <div className="hero-texto">
          <div className="hero-eyebrow">Dona tu cabello</div>
          <h1>
            Tu cabello puede convertirse en <em>esperanza</em>
          </h1>
          <p>
            En For The Kids recolectamos cabello para la elaboración de pelucas oncológicas, ayudando a
            niñas y niños con cáncer a recuperar su sonrisa y su confianza.
          </p>
          <div className="hero-botones">
            <button className="boton-amber" onClick={() => irA('eventos')}>Agendar mi donación</button>
            <button className="boton-outline" onClick={() => irA('eventos')}>Ver eventos</button>
          </div>
        </div>
      </section>

      {mensaje && <p className="exito" style={{ margin: '20px 40px 0' }}>{mensaje}</p>}
      {error && <p className="error" style={{ margin: '20px 40px 0' }}>{error}</p>}

      <div className="public-contenido">
        <section className="seccion-publica">
          <div className="seccion-publica-header">
            <h2>Próximos eventos</h2>
            <button className="ver-todas" onClick={() => irA('eventos')}>Ver todos →</button>
          </div>
          <div className="eventos-publicos-grid">
            {eventos.length === 0 && <p className="vacio">No hay eventos activos por el momento.</p>}
            {eventos.slice(0, 3).map((ev) => {
              const fecha = new Date(`${ev.fecha}T00:00:00`);
              return (
                <div className="evento-card-publico" key={ev.id}>
                  <div
                    className="imagen"
                    style={ev.imagen_url ? { backgroundImage: `url(${ev.imagen_url})` } : undefined}
                  >
                    {!ev.imagen_url && '🎗️'}
                    <div className="fecha-badge">
                      <div className="dia">{fecha.getDate()}</div>
                      <div className="mes">{fecha.toLocaleDateString('es-MX', { month: 'short' })}</div>
                    </div>
                  </div>
                  <div className="cuerpo">
                    <h4>{ev.nombre}</h4>
                    <p>
                      <span className="icono-img" style={{ width: 12, height: 12, marginRight: 5, WebkitMaskImage: 'url(/icons/clock.png)', maskImage: 'url(/icons/clock.png)', background: 'var(--color-ink-soft)' }} />
                      {ev.hora_inicio} – {ev.hora_fin}
                    </p>
                    <p>{ev.ubicacion}</p>
                    <p>{ev.cupo_disponible} de {ev.cupo_total} lugares disponibles</p>
                  </div>
                  <div className="acciones-card">
                    <button className="boton-outline" onClick={() => irA('eventos')} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                      <span className="icono-img" style={{ width: 13, height: 13, WebkitMaskImage: 'url(/icons/eye.png)', maskImage: 'url(/icons/eye.png)' }} />
                      Ver detalles
                    </button>
                    <button
                      className="boton-amber"
                      disabled={ev.cupo_disponible <= 0}
                      onClick={() => agendar(ev.id)}
                    >
                      {ev.cupo_disponible <= 0 ? 'Sin cupo' : 'Agendar'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="seccion-publica">
          <div className="seccion-publica-header">
            <h2>¿Dónde puedo donar?</h2>
            <button className="ver-todas" onClick={() => irA('puntos')}>Ver todos →</button>
          </div>
          <div className="puntos-publicos-lista">
            {puntos.length === 0 && <p className="vacio">Aún no hay puntos de recolección registrados.</p>}
            {puntos.slice(0, 3).map((p) => (
              <div className="punto-card-publico" key={p.id}>
                {p.imagen_url ? (
                  <div className="icono-mapa icono-mapa-foto" style={{ backgroundImage: `url(${p.imagen_url})` }} />
                ) : (
                  <div className="icono-mapa">
                    <span className="icono-img" style={{ width: 20, height: 20, WebkitMaskImage: 'url(/icons/pin.png)', maskImage: 'url(/icons/pin.png)' }} />
                  </div>
                )}
                <div>
                  <h4>{p.nombre}</h4>
                  <p>{p.direccion}</p>
                  <p>{p.horario}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {stats && (
        <div className="stats-footer">
          <div className="stat-item">
            <div className="numero">{stats.numero_donaciones}</div>
            <div className="etiqueta">Donaciones realizadas</div>
          </div>
          <div className="stat-item">
            <div className="numero">{stats.eventos_activos}</div>
            <div className="etiqueta">Eventos activos</div>
          </div>
          <div className="stat-item">
            <div className="numero">{stats.personas_participando}</div>
            <div className="etiqueta">Personas que han participado</div>
          </div>
        </div>
      )}

      <footer className="pie-publico">
        <div className="marca">
          <strong>FOR THE KIDS</strong>
        </div>
        <p style={{ margin: 0 }}>Más que cabello, es una nueva oportunidad de sonreír.</p>
        <p style={{ margin: 0, fontSize: '0.72rem' }}>© {new Date().getFullYear()} For The Kids · Equipo Tlaxcala</p>
      </footer>
    </div>
  );
}
