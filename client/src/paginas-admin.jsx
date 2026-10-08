import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  Bell,
  CalendarCheck,
  CalendarClock,
  CalendarDays,
  CalendarPlus,
  Check,
  CheckCircle2,
  ClipboardCheck,
  FileBarChart,
  FileDown,
  HandHeart,
  Heart,
  ImagePlus,
  MapPin,
  Pencil,
  Plus,
  Ruler,
  Search,
  Send,
  ShieldCheck,
  Trash2,
  TrendingUp,
  UserPlus,
  Users,
  UserX,
  XCircle,
} from 'lucide-react';
import { api, diaRelativo, fechaEtiqueta, fechaLarga, fechaTabla, haceCuanto, iniciales, numero, useAuth, useFetch } from './core';
import {
  Alert,
  Badge,
  BarChart,
  Button,
  Calendar,
  EmptyState,
  EventRow,
  Field,
  LargosChart,
  Metric,
  Modal,
  Skeleton,
  useToast,
} from './ui';

// ===== Módulo: Reporte por periodo =====
const hoyIso = () => new Date().toISOString().slice(0, 10);

const haceDias = (n) => new Date(Date.now() - n * 86400000).toISOString().slice(0, 10);

function ReportePeriodo() {
  const [desde, setDesde] = useState(haceDias(30));
  const [hasta, setHasta] = useState(hoyIso());
  const [reporte, setReporte] = useState(null);
  const [error, setError] = useState('');
  const [descargando, setDescargando] = useState(false);
  const descargarPdf = async () => {
    setError('');
    setDescargando(true);
    try {
      const res = await api.get(`/reportes/pdf?desde=${desde}&hasta=${hasta}`, {
        raw: true,
      });
      const blob = await res.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `reporte-forthekids-${desde}_a_${hasta}.pdf`;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch (e) {
      setError(e.message);
    } finally {
      setDescargando(false);
    }
  };
  const generar = async () => {
    setError('');
    try {
      setReporte(await api.get(`/reportes?desde=${desde}&hasta=${hasta}`));
    } catch (e) {
      setReporte(null);
      setError(e.message);
    }
  };
  const est = reporte?.citas_por_estado || {};
  return (
    <section className="card">
      <div className="card-head">
        <h2 className="h2">Reporte por periodo</h2>
        <span className="tiny">Máximo 90 días</span>
      </div>
      <div
        className="row"
        style={{
          alignItems: 'flex-end',
        }}
      >
        <Field label="Desde">
          <input className="input" type="date" value={desde} onChange={(e) => setDesde(e.target.value)} />
        </Field>
        <Field label="Hasta">
          <input className="input" type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} />
        </Field>
        <Button icon={FileBarChart} onClick={generar}>
          Generar reporte
        </Button>
        <Button variant="dark" icon={FileDown} onClick={descargarPdf} disabled={descargando}>
          {descargando ? 'Preparando PDF…' : 'Descargar PDF'}
        </Button>
      </div>
      {error && (
        <div
          style={{
            marginTop: 14,
          }}
        >
          <Alert tipo="error">{error}</Alert>
        </div>
      )}
      {reporte && (
        <div
          className="metrics"
          style={{
            marginTop: 16,
          }}
        >
          <Metric
            icon={CalendarCheck}
            label="Citas en el periodo"
            value={reporte.citas_total}
            deltaLabel={`${est.atendida || 0} atendidas · ${est.activa || 0} activas · ${est.cancelada || 0} canceladas`}
          />
          <Metric
            icon={HandHeart}
            label="Donaciones registradas"
            value={reporte.donaciones_total}
            deltaLabel={`${numero(reporte.cabello_cm)} cm de cabello · promedio ${numero(reporte.largo_promedio)} cm`}
          />
          <Metric
            icon={CalendarDays}
            label="Eventos activos"
            value={reporte.eventos_activos}
            deltaLabel={`Generado ${new Date(reporte.generado_en).toLocaleString('es-MX')}`}
          />
        </div>
      )}
    </section>
  );
}

// ===== Módulo: Dashboard =====
export function Dashboard() {
  const { usuario } = useAuth();
  const { data, cargando } = useFetch('/reportes/dashboard');
  const { data: citas } = useFetch('/citas/admin?estado=activa&proximas=1');
  const { data: eventosData } = useFetch('/eventos/admin/todos');
  const { data: notis } = useFetch('/reportes/notificaciones?limite=4');
  const m = data?.metricas;
  const proximosEventos = (eventosData?.eventos || []).filter((e) => e.fecha >= hoyIso() && e.estado !== 'cancelado').slice(0, 4);
  return (
    <>
      <div
        className="page-head"
        style={{
          marginBottom: 0,
        }}
      >
        <div
          className="stack"
          style={{
            '--gap': '4px',
          }}
        >
          <h1 className="h1">Hola, {usuario.nombre} 👋</h1>
          <p className="muted">Aquí tienes un resumen de la campaña · {fechaLarga()}</p>
        </div>
        <Link to="/admin/eventos/nuevo" className="btn btn--primary btn--sm">
          Crear evento
        </Link>
      </div>

      {cargando ? (
        <div className="metrics">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} h={130} />
          ))}
        </div>
      ) : (
        <div className="metrics">
          <Metric icon={Heart} label="Personas beneficiadas" value={numero(m.beneficiadas.valor)} />
          <Metric icon={CalendarCheck} label="Citas agendadas" value={numero(m.citas.valor)} />
          <Metric icon={HandHeart} label="Donaciones realizadas" value={numero(m.donaciones.valor)} />
          <Metric
            icon={CalendarDays}
            label="Eventos activos"
            value={m.eventos.valor}
          />
        </div>
      )}

      <div className="dash-grid">
        <section className="card">
          <div className="card-head">
            <h2 className="h2">Donaciones por mes</h2>
            <span className="tiny">
              {data?.donacionesPorMes?.[0]?.mes} – {data?.donacionesPorMes?.at(-1)?.mes} {new Date().getFullYear()}
            </span>
          </div>
          {data ? <BarChart data={data.donacionesPorMes} /> : <Skeleton h={180} />}
        </section>
        <section className="card">
          <div className="card-head">
            <h2 className="h2">Largo del cabello donado</h2>
          </div>
          {data ? (
            <LargosChart largos={data.largos} totalCm={data.cabello.total_cm} promedioCm={data.cabello.promedio_cm} />
          ) : (
            <Skeleton h={150} />
          )}
        </section>
      </div>

      <div className="dash-grid-3">
        <section className="card">
          <div className="card-head">
            <h2 className="h2">Próximas citas</h2>
            <Link to="/admin/citas" className="link">
              Ver todas
            </Link>
          </div>
          {(citas || []).slice(0, 4).map((c) => (
            <div className="list-line" key={c.id}>
              <span className="avatar">{iniciales(c.usuario_nombre, c.usuario_apellido)}</span>
              <div className="list-line__body">
                <b>
                  {c.usuario_nombre} {c.usuario_apellido}
                </b>
                <span className="tiny">{c.evento_nombre}</span>
              </div>
              <span
                className="tiny"
                style={{
                  whiteSpace: 'nowrap',
                }}
              >
                {diaRelativo(c.fecha, c.hora)}
              </span>
            </div>
          ))}
          {citas?.length === 0 && <p className="tiny">No hay citas próximas.</p>}
        </section>

        <section className="card">
          <div className="card-head">
            <h2 className="h2">Eventos próximos</h2>
            <Link to="/admin/eventos" className="link">
              Ver todos
            </Link>
          </div>
          {proximosEventos.map((e) => (
            <Link to={`/admin/eventos/${e.id}`} className="list-line" key={e.id}>
              <span
                className="point__pin"
                style={{
                  width: 34,
                  height: 34,
                }}
              >
                <CalendarDays size={16} />
              </span>
              <div className="list-line__body">
                <b>{e.nombre}</b>
                <span className="tiny">
                  {fechaEtiqueta(e.fecha, e.hora_inicio)} · {e.inscritos} inscritos
                </span>
              </div>
              <Badge estado={e.estado} />
            </Link>
          ))}
        </section>

        <section className="card stack">
          <Calendar marcados={(eventosData?.eventos || []).map((e) => e.fecha)} />
          <div>
            <div
              className="card-head"
              style={{
                marginBottom: 4,
              }}
            >
              <h2 className="h3">Notificaciones</h2>
              <Link to="/admin/notificaciones" className="link">
                Ver todas
              </Link>
            </div>
            {notis?.notificaciones.map((n) => (
              <div className="list-line" key={n.id}>
                <Bell
                  size={15}
                  style={{
                    color: 'var(--tx-3)',
                  }}
                />
                <div className="list-line__body">
                  <b
                    style={{
                      fontWeight: n.leida ? 500 : 600,
                    }}
                  >
                    {n.mensaje}
                  </b>
                  <span className="tiny">{haceCuanto(n.creado_en)}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <ReportePeriodo />
    </>
  );
}

// ===== Módulo: Eventos =====
const FILTROS = [
  ['', 'Todos'],
  ['activo', 'Activos'],
  ['programado', 'Programados'],
  ['borrador', 'Borradores'],
  ['finalizado', 'Finalizados'],
  ['cancelado', 'Cancelados'],
];

export function EventosAdmin() {
  const toast = useToast();
  const navigate = useNavigate();
  const [estado, setEstado] = useState('');
  const [q, setQ] = useState('');
  const { data, cargando, recargar } = useFetch(`/eventos/admin/todos?estado=${estado}&q=${encodeURIComponent(q)}`);
  const [baja, setBaja] = useState(null);
  const darDeBaja = async () => {
    try {
      const r = await api.del(`/eventos/${baja.id}`);
      toast.exito(
        r.accion === 'cancelado' ? 'Evento cancelado' : 'Evento eliminado',
        r.accion === 'cancelado'
          ? `Tenía citas, así que quedó cancelado. Avisamos por correo a ${r.avisados} donante${r.avisados === 1 ? '' : 's'}.`
          : undefined
      );
      setBaja(null);
      recargar();
    } catch (e) {
      toast.error('No se pudo dar de baja', e.message);
    }
  };
  const s = data?.stats;
  return (
    <>
      <div
        className="page-head"
        style={{
          marginBottom: 0,
        }}
      >
        <div
          className="stack"
          style={{
            '--gap': '4px',
          }}
        >
          <h1 className="h1">Eventos</h1>
          <p className="muted">Gestiona las campañas y jornadas de donación.</p>
        </div>
        <Link to="/admin/eventos/nuevo" className="btn btn--primary btn--sm">
          <CalendarPlus size={15} /> Crear evento
        </Link>
      </div>

      {s && (
        <div className="metrics">
          <Metric
            icon={CalendarDays}
            label="Eventos activos"
            value={s.activos}
          />
          <Metric icon={CalendarPlus} label="Próximos" value={s.proximos} deltaLabel="Activos, programados y borradores" />
          <Metric icon={Users} label="Inscripciones" value={s.inscripciones} deltaLabel="Citas activas y atendidas" />
        </div>
      )}

      <div className="toolbar">
        <div className="input-icon">
          <Search size={16} />
          <input
            className="input"
            placeholder="Buscar eventos"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            aria-label="Buscar eventos"
          />
        </div>
        <select className="select" value={estado} onChange={(e) => setEstado(e.target.value)} aria-label="Filtrar por estado">
          {FILTROS.map(([k, l]) => (
            <option key={k} value={k}>
              Estado: {l}
            </option>
          ))}
        </select>
      </div>

      {cargando && !data ? (
        <Skeleton h={320} />
      ) : data.eventos.length === 0 ? (
        <EmptyState titulo="No hay eventos con ese filtro" texto="Crea uno nuevo o cambia el filtro de estado.">
          <Link to="/admin/eventos/nuevo" className="btn btn--primary btn--sm">
            Crear evento
          </Link>
        </EmptyState>
      ) : (
        <>
          <div className="table-wrap hide-mobile">
            <table className="table">
              <thead>
                <tr>
                  <th>Evento</th>
                  <th>Fecha</th>
                  <th>Ubicación</th>
                  <th>Inscritos</th>
                  <th>Estado</th>
                  <th>
                    <span className="sr-only">Acciones</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.eventos.map((e) => (
                  <tr key={e.id}>
                    <td className="cell-strong">{e.nombre}</td>
                    <td>{fechaTabla(e.fecha)}</td>
                    <td>{e.centro}</td>
                    <td>
                      {e.inscritos} / {e.cupo_total}
                    </td>
                    <td>
                      <Badge estado={e.estado} />
                    </td>
                    <td>
                      <div
                        className="row"
                        style={{
                          '--gap': '6px',
                          flexWrap: 'nowrap',
                        }}
                      >
                        <button
                          className="icon-btn"
                          style={{
                            width: 34,
                            height: 34,
                          }}
                          onClick={() => navigate(`/admin/eventos/${e.id}`)}
                          aria-label={`Editar ${e.nombre}`}
                        >
                          <Pencil size={15} />
                        </button>
                        {e.estado !== 'cancelado' && (
                          <button
                            className="icon-btn"
                            style={{
                              width: 34,
                              height: 34,
                            }}
                            onClick={() => setBaja(e)}
                            aria-label={`Dar de baja ${e.nombre}`}
                          >
                            <Trash2 size={15} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mobile-list only-mobile">
            {data.eventos.map((e) => (
              <EventRow key={e.id} evento={e} to={`/admin/eventos/${e.id}`} />
            ))}
          </div>
        </>
      )}

      <Modal open={Boolean(baja)} onClose={() => setBaja(null)} titulo="¿Dar de baja este evento?">
        {baja && (
          <>
            <p className="muted">
              <b>{baja.nombre}</b> tiene {baja.inscritos} inscritos.{' '}
              {baja.inscritos > 0
                ? 'Lo vamos a marcar como cancelado, sus citas activas se cancelan y cada donante recibe un correo avisándole.'
                : 'Como no tiene citas, se elimina por completo.'}
            </p>
            <div className="modal__actions">
              <Button variant="ghost" onClick={() => setBaja(null)}>
                Conservar evento
              </Button>
              <Button variant="danger" icon={Trash2} onClick={darDeBaja}>
                Dar de baja
              </Button>
            </div>
          </>
        )}
      </Modal>
    </>
  );
}

// ===== Módulo: Crear y editar evento =====
const VACIO = {
  nombre: '',
  descripcion: '',
  fecha: '',
  hora_inicio: '08:00',
  hora_fin: '14:00',
  duracion_cita_min: 30,
  capacidad_por_horario: 4,
  cupo_total: 100,
  centro: '',
  direccion: '',
  ciudad: '',
  requisitos: 'Cabello limpio y seco\nEntre 20 y 35 cm de largo\nNo teñido recientemente',
  imagen_url: '',
  estado: 'borrador',
  punto_id: '',
};

export function EventoForm() {
  const { id } = useParams();
  const editando = Boolean(id);
  const navigate = useNavigate();
  const toast = useToast();
  const fileRef = useRef(null);
  const { data: puntos } = useFetch('/puntos');
  const [form, setForm] = useState(VACIO);
  const [cargando, setCargando] = useState(editando);
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [subiendo, setSubiendo] = useState(false);
  useEffect(() => {
    if (!editando) return;
    api
      .get(`/eventos/${id}`)
      .then((e) => {
        setForm({
          ...VACIO,
          ...e,
          requisitos: e.requisitos.join('\n'),
          punto_id: e.punto_id || '',
          descripcion: e.descripcion || '',
          imagen_url: e.imagen_url || '',
        });
        setCargando(false);
      })
      .catch((e) => {
        setError(e.message);
        setCargando(false);
      });
  }, [editando, id]);
  const set = (k) => (e) =>
    setForm((f) => ({
      ...f,
      [k]: e.target.value,
    }));
  const elegirPunto = (e) => {
    const p = puntos?.find((x) => String(x.id) === e.target.value);
    setForm((f) => ({
      ...f,
      punto_id: e.target.value,
      ...(p
        ? {
            centro: p.nombre,
            direccion: p.direccion,
            ciudad: p.ciudad,
          }
        : {}),
    }));
  };
  const subirImagen = async (archivo) => {
    if (!archivo) return;
    if (archivo.size > 5 * 1024 * 1024) return setError('La imagen pesa más de 5 MB.');
    setSubiendo(true);
    try {
      const fd = new FormData();
      fd.append('imagen', archivo);
      const { url } = await api.post('/eventos/imagen', fd);
      setForm((f) => ({
        ...f,
        imagen_url: url,
      }));
    } catch (e) {
      setError(e.message);
    } finally {
      setSubiendo(false);
    }
  };
  const guardar = async (estado) => {
    setError('');
    setGuardando(true);
    const datos = {
      ...form,
      estado,
      requisitos: form.requisitos
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean),
      punto_id: form.punto_id || null,
      imagen_url: form.imagen_url || null,
    };
    for (const k of ['id', 'inscritos', 'cupo_restante', 'horarios', 'creado_en', 'creado_por']) delete datos[k];
    try {
      if (editando) await api.put(`/eventos/${id}`, datos);
      else await api.post('/eventos', datos);
      toast.exito(estado === 'activo' ? 'Evento publicado' : 'Evento guardado', `"${form.nombre}" quedó como ${estado}.`);
      navigate('/admin/eventos');
    } catch (e) {
      setError(e.message);
      window.scrollTo({
        top: 0,
        behavior: 'smooth',
      });
    } finally {
      setGuardando(false);
    }
  };
  if (cargando) return <Skeleton h={500} />;
  return (
    <>
      <div
        className="page-head"
        style={{
          marginBottom: 0,
        }}
      >
        <div
          className="stack"
          style={{
            '--gap': '4px',
          }}
        >
          <Link
            to="/admin/eventos"
            className="row tiny"
            style={{
              '--gap': '6px',
              fontWeight: 600,
            }}
          >
            <ArrowLeft size={14} /> Eventos
          </Link>
          <h1 className="h1">{editando ? 'Editar evento' : 'Crear evento'}</h1>
          <p className="muted">Completa la información para publicar una nueva campaña.</p>
        </div>
      </div>

      {error && (
        <Alert tipo="error" titulo="No pudimos continuar">
          {error}
        </Alert>
      )}

      <form
        className="form-layout"
        onSubmit={(e) => {
          e.preventDefault();
          guardar('activo');
        }}
      >
        <div
          className="stack"
          style={{
            '--gap': '20px',
          }}
        >
          <section className="card stack">
            <h2 className="h3">Información general</h2>
            <div className="form-grid">
              <Field label="Nombre del evento" className="span-2">
                <input className="input" required placeholder="Ej. Jornada del corazón" value={form.nombre} onChange={set('nombre')} />
              </Field>
              <Field label="Fecha">
                <input className="input" type="date" required value={form.fecha} onChange={set('fecha')} />
              </Field>
              <Field label="Descripción" className="span-2">
                <textarea
                  className="textarea"
                  placeholder="Cuéntale a la gente de qué va la campaña"
                  value={form.descripcion}
                  onChange={set('descripcion')}
                />
              </Field>
            </div>
          </section>

          <section className="card stack">
            <h2 className="h3">Ubicación y capacidad</h2>
            <div className="form-grid">
              <Field label="Punto de recolección (opcional)" className="span-2" hint="Si eliges uno, rellenamos la dirección por ti.">
                <select className="select" value={form.punto_id} onChange={elegirPunto}>
                  <option value="">Otro lugar</option>
                  {puntos?.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nombre} · {p.ciudad}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Centro o institución">
                <input
                  className="input"
                  required
                  value={form.centro}
                  onChange={set('centro')}
                  placeholder="CUCEI · Universidad de Guadalajara"
                />
              </Field>
              <Field label="Ciudad">
                <input className="input" required value={form.ciudad} onChange={set('ciudad')} placeholder="Guadalajara" />
              </Field>
              <Field label="Dirección" className="span-2">
                <input
                  className="input"
                  required
                  value={form.direccion}
                  onChange={set('direccion')}
                  placeholder="Blvd. Marcelino García Barragán 1421, Olímpica"
                />
              </Field>
              <Field label="Hora de inicio">
                <input className="input" type="time" required value={form.hora_inicio} onChange={set('hora_inicio')} />
              </Field>
              <Field label="Hora de fin">
                <input className="input" type="time" required value={form.hora_fin} onChange={set('hora_fin')} />
              </Field>
              <Field label="Cupos disponibles">
                <input className="input" type="number" min="1" required value={form.cupo_total} onChange={set('cupo_total')} />
              </Field>
              <Field label="Duración por cita">
                <select className="select" value={form.duracion_cita_min} onChange={set('duracion_cita_min')}>
                  {[15, 20, 30, 45, 60].map((m) => (
                    <option key={m} value={m}>
                      {m} minutos
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Personas por horario" hint="Cuántos donantes atienden al mismo tiempo.">
                <input
                  className="input"
                  type="number"
                  min="1"
                  required
                  value={form.capacidad_por_horario}
                  onChange={set('capacidad_por_horario')}
                />
              </Field>
              <Field label="Requisitos (uno por línea)" className="span-2">
                <textarea className="textarea" value={form.requisitos} onChange={set('requisitos')} />
              </Field>
            </div>
          </section>
        </div>

        <aside
          className="stack"
          style={{
            '--gap': '20px',
          }}
        >
          <section className="card stack">
            <h2 className="h3">Imagen del evento</h2>
            <div
              className="upload"
              role="button"
              tabIndex={0}
              onClick={() => fileRef.current?.click()}
              onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && fileRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                subirImagen(e.dataTransfer.files[0]);
              }}
            >
              {form.imagen_url ? (
                <img src={form.imagen_url} alt="Vista previa" />
              ) : (
                <>
                  <ImagePlus size={28} aria-hidden />
                  <b>{subiendo ? 'Subiendo…' : 'Sube una imagen'}</b>
                  <span className="tiny">PNG o JPG · Máx. 5 MB</span>
                </>
              )}
            </div>
            <input ref={fileRef} type="file" accept="image/png,image/jpeg" hidden onChange={(e) => subirImagen(e.target.files[0])} />
            {form.imagen_url && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  setForm((f) => ({
                    ...f,
                    imagen_url: '',
                  }))
                }
              >
                Quitar imagen
              </Button>
            )}
          </section>

          <section className="card stack">
            <h2 className="h3">Publicación</h2>
            <Field label="Estado actual">
              <select className="select" value={form.estado} onChange={set('estado')}>
                <option value="borrador">Borrador</option>
                <option value="programado">Programado (visible solo en el panel)</option>
                <option value="activo">Activo (recibe citas)</option>
                <option value="finalizado">Finalizado</option>
              </select>
            </Field>
            <Button variant="ghost" block disabled={guardando} onClick={() => guardar(form.estado)}>
              Guardar como {form.estado}
            </Button>
            <Button type="submit" icon={Send} block disabled={guardando}>
              {guardando ? 'Guardando…' : 'Publicar evento'}
            </Button>
          </section>
        </aside>
      </form>
    </>
  );
}

// ===== Módulo: Citas =====
export function Citas() {
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const [estado, setEstado] = useState(params.get('estado') || 'activa');
  const [q, setQ] = useState(params.get('q') || '');
  const [eventoId, setEventoId] = useState(params.get('evento') || '');
  const { data: eventosData } = useFetch('/eventos/admin/todos');
  const {
    data: citas,
    cargando,
    recargar,
  } = useFetch(`/citas/admin?estado=${estado}&q=${encodeURIComponent(q)}&evento_id=${eventoId}${estado === 'activa' ? '&proximas=1' : ''}`);
  const [registrar, setRegistrar] = useState(null);
  const [donacion, setDonacion] = useState({
    largo_cm: '',
    estado: 'completada',
    notas: '',
  });
  const [error, setError] = useState('');
  useEffect(() => {
    const p = {};
    if (q) p.q = q;
    if (estado !== 'activa') p.estado = estado;
    if (eventoId) p.evento = eventoId;
    setParams(p, {
      replace: true,
    });
  }, [q, estado, eventoId, setParams]);
  const cambiarEstado = async (cita, nuevo) => {
    try {
      await api.patch(`/citas/${cita.id}/estado`, {
        estado: nuevo,
      });
      toast.exito(nuevo === 'atendida' ? 'Asistencia registrada' : 'Marcada como no asistió');
      recargar();
      if (nuevo === 'atendida')
        abrirRegistro({
          ...cita,
          estado: 'atendida',
        });
    } catch (e) {
      toast.error('No se pudo actualizar', e.message);
    }
  };
  const cancelar = async (cita) => {
    try {
      await api.patch(`/citas/${cita.id}/cancelar`);
      toast.exito('Cita cancelada', 'Se notificó al donante por correo.');
      recargar();
    } catch (e) {
      toast.error('No se pudo cancelar', e.message);
    }
  };
  const abrirRegistro = (cita) => {
    setError('');
    setDonacion({
      largo_cm: '',
      estado: 'completada',
      notas: '',
    });
    setRegistrar(cita);
  };
  const guardarDonacion = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api.post('/donaciones', {
        cita_id: registrar.id,
        ...donacion,
      });
      toast.exito('Donación registrada', `Quedó vinculada al folio ${registrar.folio}.`);
      setRegistrar(null);
      recargar();
    } catch (err) {
      setError(err.message);
    }
  };
  return (
    <>
      <div
        className="page-head"
        style={{
          marginBottom: 0,
        }}
      >
        <div
          className="stack"
          style={{
            '--gap': '4px',
          }}
        >
          <h1 className="h1">Citas</h1>
          <p className="muted">Registra la asistencia y la donación de cada persona el día del evento.</p>
        </div>
      </div>

      <div className="toolbar">
        <div className="input-icon">
          <Search size={16} />
          <input
            className="input"
            placeholder="Nombre, folio o evento"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            aria-label="Buscar citas"
          />
        </div>
        <select className="select" value={eventoId} onChange={(e) => setEventoId(e.target.value)} aria-label="Filtrar por evento">
          <option value="">Todos los eventos</option>
          {(eventosData?.eventos || []).map((ev) => (
            <option key={ev.id} value={ev.id}>
              {ev.nombre} · {fechaTabla(ev.fecha)}
            </option>
          ))}
        </select>
        <div className="chips" role="group" aria-label="Estado de la cita">
          {[
            ['activa', 'Activas'],
            ['atendida', 'Atendidas'],
            ['cancelada', 'Canceladas'],
            ['no_asistio', 'No asistió'],
            ['', 'Todas'],
          ].map(([k, l]) => (
            <button key={k} className="chip" aria-pressed={estado === k} onClick={() => setEstado(k)}>
              {l}
            </button>
          ))}
        </div>
      </div>

      {cargando && !citas ? (
        <Skeleton h={300} />
      ) : citas.length === 0 ? (
        <EmptyState titulo="No hay citas aquí" texto="Prueba con otro estado o búsqueda." />
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Donante</th>
                <th>Folio</th>
                <th>Evento</th>
                <th>Fecha</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {citas.map((c) => (
                <tr key={c.id}>
                  <td>
                    <div className="who">
                      <span className="avatar">{iniciales(c.usuario_nombre, c.usuario_apellido)}</span>
                      <div>
                        <div className="cell-strong">
                          {c.usuario_nombre} {c.usuario_apellido}
                        </div>
                        <span className="tiny">{c.usuario_correo}</span>
                      </div>
                    </div>
                  </td>
                  <td
                    style={{
                      fontFamily: 'ui-monospace, monospace',
                      letterSpacing: '0.05em',
                    }}
                  >
                    {c.folio}
                  </td>
                  <td>{c.evento_nombre}</td>
                  <td
                    style={{
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {fechaTabla(c.fecha)} · {c.hora}
                  </td>
                  <td>
                    <Badge estado={c.donacion_id ? 'completada' : c.estado}>{c.donacion_id ? 'Donó' : undefined}</Badge>
                  </td>
                  <td>
                    <div
                      className="row"
                      style={{
                        '--gap': '6px',
                        flexWrap: 'nowrap',
                      }}
                    >
                      {c.estado === 'activa' && (
                        <>
                          <Button size="sm" icon={Check} onClick={() => cambiarEstado(c, 'atendida')}>
                            Asistió
                          </Button>
                          <button
                            className="icon-btn"
                            style={{
                              width: 34,
                              height: 34,
                            }}
                            title="No asistió"
                            aria-label="Marcar no asistió"
                            onClick={() => cambiarEstado(c, 'no_asistio')}
                          >
                            <UserX size={15} />
                          </button>
                          <button
                            className="icon-btn"
                            style={{
                              width: 34,
                              height: 34,
                            }}
                            title="Cancelar cita"
                            aria-label="Cancelar cita"
                            onClick={() => cancelar(c)}
                          >
                            <XCircle size={15} />
                          </button>
                        </>
                      )}
                      {c.estado === 'atendida' && !c.donacion_id && (
                        <Button size="sm" variant="secondary" icon={HandHeart} onClick={() => abrirRegistro(c)}>
                          Registrar donación
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={Boolean(registrar)} onClose={() => setRegistrar(null)} titulo="Registrar donación">
        {registrar && (
          <form className="stack" onSubmit={guardarDonacion}>
            <p className="muted">
              {registrar.usuario_nombre} {registrar.usuario_apellido} · folio <b>{registrar.folio}</b> · {registrar.evento_nombre}
            </p>
            <div className="form-grid">
              <Field label="Largo del cabello (cm)" hint="Entre 20 y 35 cm">
                <input
                  className="input"
                  type="number"
                  step="0.5"
                  min={20}
                  max={35}
                  required
                  autoFocus
                  value={donacion.largo_cm}
                  onChange={(e) =>
                    setDonacion((d) => ({
                      ...d,
                      largo_cm: e.target.value,
                    }))
                  }
                />
              </Field>
              <Field label="Estado">
                <select
                  className="select"
                  value={donacion.estado}
                  onChange={(e) =>
                    setDonacion((d) => ({
                      ...d,
                      estado: e.target.value,
                    }))
                  }
                >
                  <option value="completada">Completada</option>
                  <option value="pendiente">Pendiente</option>
                </select>
              </Field>
              <Field label="Notas (opcional)" className="span-2">
                <textarea
                  className="textarea"
                  style={{
                    minHeight: 70,
                  }}
                  value={donacion.notas}
                  onChange={(e) =>
                    setDonacion((d) => ({
                      ...d,
                      notas: e.target.value,
                    }))
                  }
                />
              </Field>
            </div>
            {error && <Alert tipo="error">{error}</Alert>}
            <div className="modal__actions">
              <Button variant="ghost" onClick={() => setRegistrar(null)}>
                Después
              </Button>
              <Button type="submit" icon={HandHeart}>
                Registrar donación
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </>
  );
}

// ===== Módulo: Donaciones =====
export function Donaciones() {
  const toast = useToast();
  const [filtros, setFiltros] = useState({
    estado: '',
    q: '',
  });
  const qs = new URLSearchParams(Object.entries(filtros).filter(([, v]) => v)).toString();
  const { data: donaciones, cargando, recargar } = useFetch(`/donaciones?${qs}`);
  const { data: r, recargar: recargarResumen } = useFetch('/reportes/donaciones-resumen');
  const { data: dash } = useFetch('/reportes/dashboard');
  const set = (k) => (e) =>
    setFiltros((f) => ({
      ...f,
      [k]: e.target.value,
    }));
  const completar = async (d) => {
    try {
      await api.patch(`/donaciones/${d.id}`, {
        estado: 'completada',
      });
      toast.exito('Donación completada');
      recargar();
      recargarResumen();
    } catch (e) {
      toast.error('No se pudo actualizar', e.message);
    }
  };
  return (
    <>
      <div
        className="page-head"
        style={{
          marginBottom: 0,
        }}
      >
        <div
          className="stack"
          style={{
            '--gap': '4px',
          }}
        >
          <h1 className="h1">Donaciones</h1>
          <p className="muted">Consulta y verifica el cabello recibido en cada evento.</p>
        </div>
        <Link to="/admin/citas" className="btn btn--primary btn--sm">
          <ClipboardCheck size={15} /> Registrar donación
        </Link>
      </div>

      {r ? (
        <div className="metrics">
          <Metric icon={HandHeart} label="Donaciones totales" value={numero(r.total)} />
          <Metric icon={TrendingUp} label="Últimos 30 días" value={numero(r.este_mes)} />
          <Metric
            icon={Ruler}
            label="Cabello recolectado"
            value={`${numero(r.cabello_cm)} cm`}
          />
          <Metric icon={CheckCircle2} label="Pendientes" value={r.pendientes} />
        </div>
      ) : (
        <div className="metrics">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} h={120} />
          ))}
        </div>
      )}

      <div className="dash-grid">
        <section className="card">
          <div className="card-head">
            <h2 className="h2">Donaciones por mes</h2>
          </div>
          {dash ? <BarChart data={dash.donacionesPorMes} /> : <Skeleton h={180} />}
        </section>
        <section className="card">
          <div className="card-head">
            <h2 className="h2">Largo del cabello donado</h2>
          </div>
          {dash ? (
            <LargosChart largos={dash.largos} totalCm={dash.cabello.total_cm} promedioCm={dash.cabello.promedio_cm} />
          ) : (
            <Skeleton h={150} />
          )}
        </section>
      </div>

      <section className="stack">
        <div className="row between">
          <h2 className="h2">Registro de donaciones</h2>
          <div className="toolbar">
            <div className="input-icon">
              <Search size={16} />
              <input className="input" placeholder="Buscar donante o evento" value={filtros.q} onChange={set('q')} aria-label="Buscar" />
            </div>
            <select className="select" value={filtros.estado} onChange={set('estado')} aria-label="Estado">
              <option value="">Todos los estados</option>
              <option value="completada">Completadas</option>
              <option value="pendiente">Pendientes</option>
            </select>
          </div>
        </div>

        {cargando && !donaciones ? (
          <Skeleton h={300} />
        ) : donaciones.length === 0 ? (
          <EmptyState titulo="Sin donaciones con esos filtros" texto="Cambia los filtros o registra una desde la sección de citas." />
        ) : (
          <>
            <div className="table-wrap hide-mobile">
              <table className="table">
                <thead>
                  <tr>
                    <th>Donante</th>
                    <th>Largo</th>
                    <th>Evento</th>
                    <th>Fecha</th>
                    <th>Estado</th>
                    <th>
                      <span className="sr-only">Acciones</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {donaciones.map((d) => (
                    <tr key={d.id}>
                      <td>
                        <div className="who">
                          <span className="avatar">{iniciales(d.donante_nombre, d.donante_apellido)}</span>
                          <span className="cell-strong">
                            {d.donante_nombre} {d.donante_apellido}
                          </span>
                        </div>
                      </td>
                      <td style={{ whiteSpace: 'nowrap' }}>{numero(d.largo_cm)} cm</td>
                      <td>{d.evento_nombre}</td>
                      <td>{fechaTabla(d.fecha)}</td>
                      <td>
                        <Badge estado={d.estado} />
                      </td>
                      <td>
                        {d.estado === 'pendiente' && (
                          <Button size="sm" variant="secondary" onClick={() => completar(d)}>
                            Marcar completada
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mobile-list only-mobile">
              {donaciones.slice(0, 40).map((d) => (
                <div className="row-item" key={d.id}>
                  <span className="avatar">{iniciales(d.donante_nombre, d.donante_apellido)}</span>
                  <div className="row-item__body">
                    <div className="row-item__title">
                      {d.donante_nombre} {d.donante_apellido}
                    </div>
                    <span className="tiny">
                      {numero(d.largo_cm)} cm de cabello · {fechaTabla(d.fecha)}
                    </span>
                  </div>
                  <Badge estado={d.estado} />
                </div>
              ))}
            </div>
          </>
        )}
      </section>
    </>
  );
}

// ===== Módulo: Donantes =====
function Head({ titulo, texto, children }) {
  return (
    <div
      className="page-head"
      style={{
        marginBottom: 0,
      }}
    >
      <div
        className="stack"
        style={{
          '--gap': '4px',
        }}
      >
        <h1 className="h1">{titulo}</h1>
        {texto && <p className="muted">{texto}</p>}
      </div>
      {children}
    </div>
  );
}

export function Donantes() {
  const [q, setQ] = useState('');
  const { data, cargando } = useFetch(`/reportes/donantes?q=${encodeURIComponent(q)}`);
  return (
    <>
      <Head titulo="Donantes" texto={data ? `${data.length} personas registradas como donantes.` : ' '} />
      <div className="toolbar">
        <div className="input-icon">
          <Search size={16} />
          <input
            className="input"
            placeholder="Buscar por nombre o correo"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            aria-label="Buscar donantes"
          />
        </div>
      </div>
      {cargando && !data ? (
        <Skeleton h={300} />
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Donante</th>
                <th>Teléfono</th>
                <th>Citas</th>
                <th>Donaciones</th>
                <th>Registro</th>
              </tr>
            </thead>
            <tbody>
              {data.map((d) => (
                <tr key={d.id}>
                  <td>
                    <div className="who">
                      <span className="avatar">{iniciales(d.nombre, d.apellido)}</span>
                      <div>
                        <div className="cell-strong">
                          {d.nombre} {d.apellido}
                        </div>
                        <span className="tiny">{d.correo}</span>
                      </div>
                    </div>
                  </td>
                  <td>{d.telefono}</td>
                  <td>{d.citas}</td>
                  <td>{d.donaciones}</td>
                  <td>{fechaTabla(String(d.creado_en))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

// ===== Módulo: Puntos de recolección =====
const PUNTO_VACIO = {
  nombre: '',
  zona: '',
  ciudad: '',
  direccion: '',
  telefono: '',
  horario: '',
};

export function PuntosAdmin() {
  const toast = useToast();
  const { data, cargando, recargar } = useFetch('/puntos/admin/todos');
  const [editando, setEditando] = useState(null);
  const [error, setError] = useState('');
  const guardar = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const { id, activo, creado_en, ...datos } = editando;
      if (id)
        await api.put(`/puntos/${id}`, {
          ...datos,
          activo,
        });
      else await api.post('/puntos', datos);
      toast.exito(id ? 'Punto actualizado' : 'Punto agregado');
      setEditando(null);
      recargar();
    } catch (err) {
      setError(err.message);
    }
  };
  const toggle = async (p) => {
    try {
      if (p.activo) await api.del(`/puntos/${p.id}`);
      else
        await api.put(`/puntos/${p.id}`, {
          activo: true,
        });
      toast.exito(p.activo ? 'Punto dado de baja' : 'Punto reactivado');
      recargar();
    } catch (err) {
      toast.error('No se pudo actualizar', err.message);
    }
  };
  const campo = (k, label, props = {}) => (
    <Field label={label} className={props.span ? 'span-2' : ''}>
      <input
        className="input"
        value={editando[k] || ''}
        onChange={(e) =>
          setEditando((x) => ({
            ...x,
            [k]: e.target.value,
          }))
        }
        required={props.required}
        placeholder={props.placeholder}
      />
    </Field>
  );
  return (
    <>
      <Head titulo="Puntos de recolección" texto="Lugares fijos donde la gente puede llevar su donación.">
        <Button
          size="sm"
          icon={Plus}
          onClick={() => {
            setError('');
            setEditando(PUNTO_VACIO);
          }}
        >
          Agregar punto
        </Button>
      </Head>
      {cargando && !data ? (
        <Skeleton h={260} />
      ) : (
        <div className="grid-events">
          {data.map((p) => (
            <article
              key={p.id}
              className="card stack"
              style={{
                '--gap': '10px',
                opacity: p.activo ? 1 : 0.6,
              }}
            >
              <div className="row between">
                <span className="point__pin">
                  <MapPin size={18} />
                </span>
                <Badge estado={p.activo ? 'activo' : 'cancelado'}>{p.activo ? 'Activo' : 'Inactivo'}</Badge>
              </div>
              <h2 className="h3">{p.nombre}</h2>
              <span className="tiny">
                {p.direccion} · {p.ciudad}
              </span>
              <span className="tiny">
                {p.telefono} · {p.horario}
              </span>
              <div
                className="row"
                style={{
                  '--gap': '8px',
                }}
              >
                <Button
                  size="sm"
                  variant="ghost"
                  icon={Pencil}
                  onClick={() => {
                    setError('');
                    setEditando(p);
                  }}
                >
                  Editar
                </Button>
                <Button size="sm" variant="ghost" icon={p.activo ? Trash2 : Plus} onClick={() => toggle(p)}>
                  {p.activo ? 'Dar de baja' : 'Reactivar'}
                </Button>
              </div>
            </article>
          ))}
        </div>
      )}
      <Modal open={Boolean(editando)} onClose={() => setEditando(null)} titulo={editando?.id ? 'Editar punto' : 'Nuevo punto'} wide>
        {editando && (
          <form className="stack" onSubmit={guardar}>
            <div className="form-grid">
              {campo('nombre', 'Nombre', {
                required: true,
                placeholder: 'CUCEI',
              })}
              {campo('zona', 'Zona o colonia', {
                placeholder: 'Olímpica',
              })}
              {campo('ciudad', 'Ciudad', {
                required: true,
                placeholder: 'Guadalajara',
              })}
              {campo('telefono', 'Teléfono', {
                required: true,
                placeholder: '33 1234 5678',
              })}
              {campo('direccion', 'Dirección', {
                required: true,
                span: true,
              })}
              {campo('horario', 'Horario de atención', {
                required: true,
                span: true,
                placeholder: 'Lun a Vie · 8:00 a 16:00',
              })}
            </div>
            {error && <Alert tipo="error">{error}</Alert>}
            <div className="modal__actions">
              <Button variant="ghost" onClick={() => setEditando(null)}>
                Cancelar
              </Button>
              <Button type="submit">Guardar punto</Button>
            </div>
          </form>
        )}
      </Modal>
    </>
  );
}

// ===== Módulo: Notificaciones =====
const ICONO_NOTI = {
  donacion: HandHeart,
  cita: CalendarClock,
  donante: UserPlus,
};

export function Notificaciones() {
  const { data, cargando, recargar } = useFetch('/reportes/notificaciones?limite=50');
  const marcar = async () => {
    await api.patch('/reportes/notificaciones/leer');
    recargar();
  };
  return (
    <>
      <Head titulo="Notificaciones" texto="Lo que ha pasado recientemente en la campaña.">
        {data?.noLeidas > 0 && (
          <Button size="sm" variant="ghost" onClick={marcar}>
            Marcar todas como leídas
          </Button>
        )}
      </Head>
      {cargando && !data ? (
        <Skeleton h={300} />
      ) : data.notificaciones.length === 0 ? (
        <EmptyState titulo="Todo tranquilo por aquí" texto="Cuando alguien agende, cancele o done, lo verás en esta lista." />
      ) : (
        <section className="card">
          {data.notificaciones.map((n) => {
            const Icono = ICONO_NOTI[n.tipo] || Bell;
            return (
              <div className="list-line" key={n.id}>
                <span
                  className="point__pin"
                  style={{
                    width: 36,
                    height: 36,
                  }}
                >
                  <Icono size={16} />
                </span>
                <div className="list-line__body">
                  <b
                    style={{
                      fontWeight: n.leida ? 500 : 700,
                    }}
                  >
                    {n.mensaje}
                  </b>
                  <span className="tiny">{haceCuanto(n.creado_en)}</span>
                </div>
                {!n.leida && <Badge estado="pendiente">Nueva</Badge>}
              </div>
            );
          })}
        </section>
      )}
    </>
  );
}

// ===== Módulo: Correo =====
const TIPO_CORREO = {
  confirmacion: 'Confirmación',
  reprogramacion: 'Reprogramación',
  cancelacion: 'Cancelación',
  recordatorio: 'Recordatorio',
  prueba: 'Prueba',
};

function CorreoCard() {
  const toast = useToast();
  const { usuario } = useAuth();
  const { data, cargando, recargar } = useFetch('/correo/estado');
  const [para, setPara] = useState(usuario.correo);
  const [enviando, setEnviando] = useState(false);
  const enviarPrueba = async (e) => {
    e.preventDefault();
    setEnviando(true);
    try {
      const r = await api.post('/correo/prueba', {
        para,
      });
      if (r.simulado) toast.info('Correo simulado', 'Configura SMTP en el .env para que salga de verdad.');
      else toast.exito('Correo enviado', `Revisa la bandeja de ${r.destino || para}.`);
      recargar();
    } catch (err) {
      toast.error('No salió el correo', err.message);
    } finally {
      setEnviando(false);
    }
  };
  const estado = !data
    ? null
    : !data.configurado
      ? ['amarillo', 'Sin configurar']
      : data.conectado
        ? ['verde', 'Conectado']
        : ['rojo', 'Error de conexión'];
  return (
    <section className="card stack span-all">
      <div className="card-head">
        <h2 className="h3">Correo</h2>
        {estado && <span className={`badge badge--${estado[0]}`}>{estado[1]}</span>}
      </div>
      {cargando && !data ? (
        <Skeleton h={120} />
      ) : (
        <>
          {!data.configurado && (
            <Alert tipo="aviso" titulo="Los correos se están simulando">
              Llena SMTP_HOST, SMTP_USER y SMTP_PASS en el archivo .env y reinicia el servidor para que se envíen de verdad.
            </Alert>
          )}
          {data.configurado && !data.conectado && (
            <Alert tipo="error" titulo="No pudimos conectar con el servidor de correo">
              {data.error}
            </Alert>
          )}
          <p className="tiny">
            Servidor: <b>{data.servidor || '—'}</b> · Remitente: <b>{data.remitente || '—'}</b>
          </p>
          <div
            className="row"
            style={{
              flexWrap: 'wrap',
              gap: 8,
            }}
          >
            {Object.entries(TIPO_CORREO).map(([k, label]) => {
              const r = data.resumen.find((x) => x.tipo === k);
              return (
                <span key={k} className="badge badge--gris">
                  {label}: {r ? r.enviados : 0}
                  {r && Number(r.fallidos) ? ` · ${r.fallidos} fallidos` : ''}
                </span>
              );
            })}
          </div>
          <form
            className="row"
            style={{
              alignItems: 'flex-end',
            }}
            onSubmit={enviarPrueba}
          >
            <Field label="Enviar correo de prueba a">
              <input className="input" type="email" required value={para} onChange={(e) => setPara(e.target.value)} />
            </Field>
            <Button type="submit" icon={Send} disabled={enviando}>
              {enviando ? 'Enviando…' : 'Enviar prueba'}
            </Button>
          </form>
          {data.ultimos.length > 0 && (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Tipo</th>
                    <th>Para</th>
                    <th>Asunto</th>
                    <th>Fecha</th>
                    <th>Resultado</th>
                  </tr>
                </thead>
                <tbody>
                  {data.ultimos.map((c, i) => (
                    <tr key={i}>
                      <td>{TIPO_CORREO[c.tipo] || c.tipo}</td>
                      <td>{c.destinatario}</td>
                      <td>{c.asunto}</td>
                      <td>
                        {new Date(c.enviado_en).toLocaleString('es-MX', {
                          dateStyle: 'short',
                          timeStyle: 'short',
                        })}
                      </td>
                      <td>
                        {!c.exito ? (
                          <span className="badge badge--rojo" title={c.error}>
                            Falló
                          </span>
                        ) : c.simulado ? (
                          <span className="badge badge--amarillo">Simulado</span>
                        ) : (
                          <span className="badge badge--verde">Enviado</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </section>
  );
}

// ===== Módulo: Configuración =====
export function Configuracion() {
  const { usuario } = useAuth();
  const reglas = [
    ['Sesión', 'El inicio de sesión dura 24 horas.'],
    ['Seguridad', 'Tras 5 intentos fallidos en 10 minutos, la cuenta se bloquea 15 minutos.'],
    ['Cancelaciones', 'Los donantes pueden cancelar o reprogramar hasta 12 horas antes.'],
    ['Folios', 'Cada cita genera un folio único de 8 caracteres.'],
    ['Recordatorios', 'Se envía un correo entre 20 y 24 horas antes de cada cita.'],
    ['Reportes', 'El reporte por periodo acepta rangos de hasta 90 días.'],
  ];
  return (
    <>
      <Head titulo="Configuración" texto="Tu cuenta y las reglas con las que funciona el sistema." />
      <div className="dash-grid">
        <section className="card stack">
          <h2 className="h3">Reglas del sistema</h2>
          {reglas.map(([t, d]) => (
            <div className="list-line" key={t}>
              <ShieldCheck
                size={17}
                style={{
                  color: 'var(--verde)',
                }}
              />
              <div className="list-line__body">
                <b>{t}</b>
                <span className="tiny">{d}</span>
              </div>
            </div>
          ))}
        </section>
        <section className="card stack">
          <h2 className="h3">Tu cuenta</h2>
          <div className="who">
            <span
              className="avatar"
              style={{
                width: 48,
                height: 48,
                background: 'var(--noche)',
                color: '#fff',
              }}
            >
              {iniciales(usuario.nombre, usuario.apellido)}
            </span>
            <div>
              <b>
                {usuario.nombre} {usuario.apellido}
              </b>
              <div className="tiny">{usuario.correo}</div>
            </div>
          </div>
          <Badge estado="programado">Administrador</Badge>
        </section>
        <CorreoCard />
      </div>
    </>
  );
}
