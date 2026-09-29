import { useEffect, useMemo, useState } from 'react';
import { api } from '../api';

function tiempoRelativo(fechaIso) {
  const diffMs = Date.now() - new Date(fechaIso).getTime();
  const minutos = Math.round(diffMs / 60000);
  if (minutos < 1) return 'justo ahora';
  if (minutos < 60) return `hace ${minutos} min`;
  const horas = Math.round(minutos / 60);
  if (horas < 24) return `hace ${horas} h`;
  const dias = Math.round(horas / 24);
  return `hace ${dias} d`;
}

function primerDiaMes(fecha) {
  return new Date(fecha.getFullYear(), fecha.getMonth(), 1);
}

function ultimoDiaMes(fecha) {
  return new Date(fecha.getFullYear(), fecha.getMonth() + 1, 0);
}

function comoISO(fecha) {
  return fecha.toISOString().slice(0, 10);
}

function calcularTendencia(actual, anterior) {
  if (anterior === 0) return actual > 0 ? { texto: 'nuevo este mes', positivo: true } : null;
  const cambio = Math.round(((actual - anterior) / anterior) * 100);
  if (cambio === 0) return { texto: 'igual que el mes pasado', positivo: false };
  return {
    texto: `${cambio > 0 ? '↑' : '↓'} ${Math.abs(cambio)}% vs mes anterior`,
    positivo: cambio > 0,
  };
}

// ---------- Gráfica de línea (SVG dibujado a mano, sin librerías externas) ----------
function GraficaLineas({ datos }) {
  const ancho = 560;
  const alto = 170;
  const margen = { arriba: 10, abajo: 22, izquierda: 6, derecha: 6 };

  const maximo = Math.max(1, ...datos.map((d) => d.total));
  const pasoX = (ancho - margen.izquierda - margen.derecha) / Math.max(1, datos.length - 1);

  const puntos = datos.map((d, i) => {
    const x = margen.izquierda + i * pasoX;
    const y = margen.arriba + (1 - d.total / maximo) * (alto - margen.arriba - margen.abajo);
    return { x, y, ...d };
  });

  const linea = puntos.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const area = `${linea} L ${puntos[puntos.length - 1].x} ${alto - margen.abajo} L ${puntos[0].x} ${alto - margen.abajo} Z`;

  return (
    <svg className="chart-linea" viewBox={`0 0 ${ancho} ${alto}`} preserveAspectRatio="none">
      <defs>
        <linearGradient id="rellenoLinea" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f5a623" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#f5a623" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#rellenoLinea)" />
      <path d={linea} fill="none" stroke="#f5a623" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
      {puntos.map((p) => (
        <circle key={p.clave} cx={p.x} cy={p.y} r="3" fill="#f5a623" />
      ))}
      {puntos.map((p) => (
        <text key={`etq-${p.clave}`} x={p.x} y={alto - 4} textAnchor="middle" className="eje-label">
          {p.etiqueta}
        </text>
      ))}
    </svg>
  );
}

// ---------- Donut (estado de citas) ----------
function GraficaDonut({ segmentos }) {
  const total = segmentos.reduce((acc, s) => acc + s.valor, 0) || 1;
  const radio = 42;
  const circunferencia = 2 * Math.PI * radio;
  let acumulado = 0;

  return (
    <div className="chart-donut-wrap">
      <svg width="120" height="120" viewBox="0 0 120 120">
        <g transform="translate(60,60) rotate(-90)">
          <circle r={radio} fill="none" stroke="#f1f1ec" strokeWidth="16" />
          {segmentos.map((s) => {
            const fraccion = s.valor / total;
            const largo = fraccion * circunferencia;
            const offset = acumulado;
            acumulado += largo;
            return (
              <circle
                key={s.nombre}
                r={radio}
                fill="none"
                stroke={s.color}
                strokeWidth="16"
                strokeDasharray={`${largo} ${circunferencia - largo}`}
                strokeDashoffset={-offset}
              />
            );
          })}
        </g>
        <text x="60" y="56" textAnchor="middle" fontSize="18" fontWeight="700" fill="#201f18">
          {total}
        </text>
        <text x="60" y="72" textAnchor="middle" fontSize="9" fill="#706f63">
          total
        </text>
      </svg>
      <div className="leyenda-donut">
        {segmentos.map((s) => (
          <div className="fila" key={s.nombre}>
            <span className="nombre">
              <span className="punto" style={{ background: s.color }} />
              {s.nombre}
            </span>
            <span className="valor">{total ? Math.round((s.valor / total) * 100) : 0}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------- Mini calendario ----------
function MiniCalendario({ fechasConEvento }) {
  const [mesVisible, setMesVisible] = useState(() => primerDiaMes(new Date()));
  const hoy = new Date();

  const dias = useMemo(() => {
    const inicio = primerDiaMes(mesVisible);
    const fin = ultimoDiaMes(mesVisible);
    const offsetInicial = (inicio.getDay() + 6) % 7; // semana empieza en lunes
    const celdas = [];
    for (let i = 0; i < offsetInicial; i += 1) celdas.push(null);
    for (let d = 1; d <= fin.getDate(); d += 1) {
      celdas.push(new Date(mesVisible.getFullYear(), mesVisible.getMonth(), d));
    }
    return celdas;
  }, [mesVisible]);

  function cambiarMes(delta) {
    setMesVisible((m) => new Date(m.getFullYear(), m.getMonth() + delta, 1));
  }

  return (
    <div>
      <div className="mini-calendario-header">
        <button onClick={() => cambiarMes(-1)}>‹</button>
        <span>{mesVisible.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' })}</span>
        <button onClick={() => cambiarMes(1)}>›</button>
      </div>
      <div className="mini-calendario-grid">
        {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((d, i) => (
          <div className="dow" key={`${d}-${i}`}>{d}</div>
        ))}
        {dias.map((dia, i) => {
          if (!dia) return <div key={`vacio-${i}`} className="mini-calendario-dia vacio" />;
          const iso = comoISO(dia);
          const esHoy = iso === comoISO(hoy);
          const tieneEvento = fechasConEvento.has(iso);
          return (
            <div
              key={iso}
              className={`mini-calendario-dia ${esHoy ? 'hoy' : ''} ${tieneEvento ? 'evento' : ''}`}
            >
              {dia.getDate()}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function Dashboard({ token, irA }) {
  const [resumen, setResumen] = useState(null);
  const [tendenciaCitas, setTendenciaCitas] = useState(null);
  const [tendenciaDonaciones, setTendenciaDonaciones] = useState(null);
  const [porMes, setPorMes] = useState([]);
  const [citas, setCitas] = useState([]);
  const [eventos, setEventos] = useState([]);
  const [solicitudes, setSolicitudes] = useState([]);
  const [donaciones, setDonaciones] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    async function cargar() {
      try {
        const hoy = new Date();
        const inicioMesActual = comoISO(primerDiaMes(hoy));
        const inicioMesAnterior = comoISO(new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1));
        const finMesAnterior = comoISO(new Date(hoy.getFullYear(), hoy.getMonth(), 0));

        const [
          total,
          mesActual,
          mesAnterior,
          serieDonaciones,
          todasCitas,
          todosEventos,
          solicitudesPendientes,
          todasDonaciones,
        ] = await Promise.all([
          api.reporte('', token),
          api.reporte(`desde=${inicioMesActual}&hasta=${comoISO(hoy)}`, token),
          api.reporte(`desde=${inicioMesAnterior}&hasta=${finMesAnterior}`, token),
          api.donacionesPorMes(token, 9),
          api.listarTodasCitas(token),
          api.listarEventos(),
          api.listarSolicitudesCancelacion(token),
          api.listarDonaciones(token),
        ]);

        setResumen(total);
        setTendenciaCitas(calcularTendencia(mesActual.numero_citas, mesAnterior.numero_citas));
        setTendenciaDonaciones(calcularTendencia(mesActual.numero_donaciones, mesAnterior.numero_donaciones));
        setPorMes(serieDonaciones);
        setCitas(todasCitas);
        setEventos(todosEventos);
        setSolicitudes(solicitudesPendientes);
        setDonaciones(todasDonaciones);
      } catch (err) {
        setError(err.message);
      }
    }
    cargar();
  }, [token]);

  const proximasCitas = useMemo(() => {
    const ahora = new Date();
    return citas
      .filter((c) => c.estado === 'agendada' && new Date(`${c.Evento?.fecha}T${c.Evento?.hora_inicio}`) >= ahora)
      .sort((a, b) => new Date(`${a.Evento?.fecha}T${a.Evento?.hora_inicio}`) - new Date(`${b.Evento?.fecha}T${b.Evento?.hora_inicio}`))
      .slice(0, 5);
  }, [citas]);

  const eventosRecientes = useMemo(
    () =>
      [...eventos]
        .sort((a, b) => new Date(b.creado_en || b.fecha) - new Date(a.creado_en || a.fecha))
        .slice(0, 3),
    [eventos]
  );

  const fechasConEvento = useMemo(() => new Set(eventos.map((e) => e.fecha)), [eventos]);

  const segmentosDonut = useMemo(() => {
    const conteo = { agendada: 0, atendida: 0, cancelada: 0 };
    citas.forEach((c) => {
      if (conteo[c.estado] !== undefined) conteo[c.estado] += 1;
    });
    return [
      { nombre: 'Agendadas', valor: conteo.agendada, color: '#f5a623' },
      { nombre: 'Atendidas', valor: conteo.atendida, color: '#22a559' },
      { nombre: 'Canceladas', valor: conteo.cancelada, color: '#c9c9bd' },
    ];
  }, [citas]);

  const notificaciones = useMemo(() => {
    const deSolicitudes = solicitudes.map((s) => ({
      tipo: 'amber',
      icono: '⚠️',
      titulo: 'Solicitud de cancelación',
      texto: `${s.Usuario?.nombre} pidió cancelar su cita (folio ${s.folio})`,
      fecha: s.cancelacion_solicitada_en,
    }));
    const deDonaciones = donaciones.slice(0, 3).map((d) => ({
      tipo: 'verde',
      icono: '✅',
      titulo: 'Nueva donación registrada',
      texto: `${d.Usuario?.nombre} donó ${d.longitud_cm} cm de cabello`,
      fecha: d.registrada_en,
    }));
    return [...deSolicitudes, ...deDonaciones]
      .sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
      .slice(0, 5);
  }, [solicitudes, donaciones]);

  if (error) return <p className="error">{error}</p>;
  if (!resumen) return <p className="vacio">Cargando resumen…</p>;

  return (
    <div>
      <h1>Hola 👋</h1>
      <p style={{ marginBottom: 24, color: 'var(--color-ink-soft)' }}>
        Aquí tienes un resumen de la campaña de donación de cabello.
      </p>

      <div className="stats-grid">
        <div className="stat-card tono-amber">
          <div className="stat-icono">🧑‍🤝‍🧑</div>
          <h3>Donantes registrados</h3>
          <div className="stat-numero">{resumen.numero_donantes}</div>
        </div>
        <div className="stat-card tono-azul">
          <div className="stat-icono">
            <span className="icono-img" style={{ width: 20, height: 20, WebkitMaskImage: "url(/icons/clock.png)", maskImage: "url(/icons/clock.png)" }} />
          </div>
          <h3>Citas agendadas</h3>
          <div className="stat-numero">{resumen.numero_citas}</div>
          {tendenciaCitas && (
            <div className={`stat-trend ${tendenciaCitas.positivo ? 'positivo' : ''}`}>{tendenciaCitas.texto}</div>
          )}
        </div>
        <div className="stat-card tono-verde">
          <div className="stat-icono">💛</div>
          <h3>Donaciones realizadas</h3>
          <div className="stat-numero">{resumen.numero_donaciones}</div>
          {tendenciaDonaciones && (
            <div className={`stat-trend ${tendenciaDonaciones.positivo ? 'positivo' : ''}`}>{tendenciaDonaciones.texto}</div>
          )}
        </div>
        <div className="stat-card tono-morado">
          <div className="stat-icono">
            <span className="icono-img" style={{ width: 20, height: 20, WebkitMaskImage: "url(/icons/calendar.png)", maskImage: "url(/icons/calendar.png)" }} />
          </div>
          <h3>Eventos activos</h3>
          <div className="stat-numero">{resumen.eventos_activos}</div>
        </div>
      </div>

      <div className="panel-grid-3">
        <div className="panel">
          <div className="panel-header">
            <h3>Donaciones por mes</h3>
          </div>
          <GraficaLineas datos={porMes} />
        </div>
        <div className="panel">
          <div className="panel-header">
            <h3>Estado de citas</h3>
          </div>
          <GraficaDonut segmentos={segmentosDonut} />
        </div>
        <div className="panel">
          <div className="panel-header">
            <h3>Calendario de eventos</h3>
          </div>
          <MiniCalendario fechasConEvento={fechasConEvento} />
          <button className="boton-amber" style={{ width: '100%', marginTop: 14 }} onClick={() => irA('eventos')}>
            + Crear nuevo evento
          </button>
        </div>
      </div>

      <div className="panel-grid-3-b">
        <div className="panel">
          <div className="panel-header">
            <h3>Próximas citas</h3>
            <button className="ver-todas" onClick={() => irA('citas')}>Ver todas →</button>
          </div>
          <div className="tabla-wrap">
            <table className="tabla">
              <thead>
                <tr>
                  <th>Fecha y hora</th>
                  <th>Donante</th>
                  <th>Evento</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {proximasCitas.length === 0 && (
                  <tr><td colSpan={4} className="vacio">No hay citas próximas agendadas.</td></tr>
                )}
                {proximasCitas.map((c) => (
                  <tr key={c.id}>
                    <td>{c.Evento?.fecha} · {c.Evento?.hora_inicio}</td>
                    <td>{c.Usuario?.nombre}</td>
                    <td>{c.Evento?.nombre}</td>
                    <td><span className="distintivo agendada">agendada</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="panel">
          <div className="panel-header">
            <h3>Eventos recientes</h3>
            <button className="ver-todas" onClick={() => irA('eventos')}>Ver todas →</button>
          </div>
          {eventosRecientes.length === 0 && <p className="notificacion-vacia">Aún no hay eventos creados.</p>}
          {eventosRecientes.map((ev) => (
            <div className="eventos-recientes-item" key={ev.id}>
              <div
                className="evento-miniatura"
                style={ev.imagen_url ? { backgroundImage: `url(${ev.imagen_url})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}
              >
                {!ev.imagen_url && '🎗️'}
              </div>
              <div>
                <h4>{ev.nombre}</h4>
                <p>{ev.fecha} · {ev.ubicacion}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="panel">
          <div className="panel-header">
            <h3>Notificaciones</h3>
            <button className="ver-todas" onClick={() => irA('citas')}>Ver todas →</button>
          </div>
          {notificaciones.length === 0 && <p className="notificacion-vacia">No hay novedades por ahora.</p>}
          {notificaciones.map((n, i) => (
            <div className="notificacion-item" key={i}>
              <div className={`notificacion-icono ${n.tipo}`}>{n.icono}</div>
              <div className="notificacion-fila">
                <div>
                  <h4>{n.titulo}</h4>
                  <p>{n.texto}</p>
                </div>
                <span className="tiempo">{tiempoRelativo(n.fecha)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
