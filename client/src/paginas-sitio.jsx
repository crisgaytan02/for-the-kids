import { useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  CalendarDays,
  CalendarHeart,
  CalendarPlus,
  CheckCircle2,
  Clock,
  HandHeart,
  Heart,
  HeartHandshake,
  Info,
  LayoutDashboard,
  Lock,
  LogOut,
  Mail,
  MapPin,
  Navigation,
  PartyPopper,
  Phone,
  RefreshCw,
  Ruler,
  Search,
  Sparkles,
  Users,
  XCircle,
} from 'lucide-react';
import {
  api,
  cantidadDonacion,
  fechaCorta,
  fechaLarga,
  fechaTabla,
  hora12,
  iniciales,
  mesCorto,
  numero,
  parseFecha,
  useAuth,
  useFetch,
} from './core';
import {
  Alert,
  AuthShell,
  AvisoPrivacidad,
  Badge,
  BeeHeart,
  Button,
  Calendar,
  EmptyState,
  EventCard,
  EventRow,
  Field,
  imgEvento,
  ImpactIllustration,
  Metric,
  Modal,
  Skeleton,
  useToast,
} from './ui';

// ===== Módulo: Inicio =====
export function Landing() {
  const { data: eventos, cargando } = useFetch('/eventos');
  const { data: puntos } = useFetch('/puntos');
  return (
    <>
      <section className="hero">
        <img className="hero__movil" src="/img/hero-movil.jpg" alt="Ilustración de una niña sonriente con cabello largo y dorado" />
        <div className="container hero__inner">
          <div className="hero__copy">
            <span className="pill-tag">♡ Dona tu cabello</span>
            <h1 className="h-display">Tu cabello puede convertirse en esperanza</h1>
            <p>
              En For The Kids recolectamos cabello para la elaboración de pelucas oncológicas, ayudando a niñas y niños con cáncer a
              recuperar su sonrisa y su confianza.
            </p>
            <div className="row">
              <Link to="/eventos" className="btn btn--dark">
                <CalendarHeart size={17} /> Agendar mi donación
              </Link>
              <Link to="/eventos" className="btn btn--outline hide-mobile">
                Ver eventos
              </Link>
            </div>
          </div>
        </div>
      </section>

      <div
        className="container page"
        style={{
          paddingTop: 0,
        }}
      >
        <div className="landing-grid">
          <section aria-labelledby="proximos">
            <div className="card-head">
              <h2 className="h2" id="proximos">
                Próximos eventos
              </h2>
              <Link
                to="/eventos"
                className="link tiny"
                style={{
                  fontWeight: 600,
                }}
              >
                Ver todos
              </Link>
            </div>

            {cargando ? (
              <div className="grid-events">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} h={300} />
                ))}
              </div>
            ) : (
              <>
                <div className="grid-events hide-mobile">
                  {eventos?.slice(0, 3).map((e) => (
                    <EventCard key={e.id} evento={e} />
                  ))}
                </div>
                <div className="mobile-list only-mobile">
                  {eventos?.slice(0, 3).map((e) => (
                    <EventRow key={e.id} evento={e} />
                  ))}
                </div>
              </>
            )}
          </section>

          <aside className="card" aria-labelledby="donde">
            <div
              className="card-head"
              style={{
                marginBottom: 4,
              }}
            >
              <h2 className="h2" id="donde">
                ¿Dónde puedo donar?
              </h2>
            </div>
            {puntos?.slice(0, 3).map((p) => (
              <div className="point" key={p.id}>
                <span className="point__pin">
                  <MapPin size={18} />
                </span>
                <div className="grow">
                  <b
                    style={{
                      fontSize: '0.9rem',
                    }}
                  >
                    {p.nombre}
                  </b>
                  <div className="tiny">{p.ciudad}</div>
                  <div
                    className="tiny row"
                    style={{
                      '--gap': '4px',
                    }}
                  >
                    <Clock size={12} /> {p.horario}
                  </div>
                </div>
              </div>
            ))}
            <Link
              to="/puntos"
              className="btn btn--secondary btn--block btn--sm"
              style={{
                marginTop: 12,
              }}
            >
              <Phone size={14} /> Direcciones y teléfonos
            </Link>
          </aside>
        </div>
      </div>
    </>
  );
}

// ===== Módulo: Eventos =====
export function Eventos() {
  const [filtro, setFiltro] = useState('todos');
  const [q, setQ] = useState('');
  const { data: ciudades } = useFetch('/eventos/ciudades');
  const url = useMemo(() => {
    const p = new URLSearchParams();
    if (filtro === 'proximos' || filtro === 'mes') p.set('filtro', filtro);
    else if (filtro !== 'todos') p.set('ciudad', filtro);
    if (q.trim()) p.set('q', q.trim());
    return `/eventos?${p}`;
  }, [filtro, q]);
  const { data: eventos, cargando } = useFetch(url);
  const chips = [['todos', 'Todos'], ['proximos', 'Próximos'], ['mes', 'Este mes'], ...(ciudades || []).map((c) => [c, c])];
  return (
    <div className="container page">
      <div className="page-head">
        <div
          className="stack"
          style={{
            '--gap': '6px',
          }}
        >
          <span className="kicker">Participa y transforma</span>
          <h1 className="h1">Eventos solidarios</h1>
          <p className="muted">Encuentra una campaña cerca de ti y agenda tu donación.</p>
        </div>
        <div
          className="input-icon"
          style={{
            width: 'min(340px, 100%)',
          }}
        >
          <Search size={17} />
          <input
            className="input"
            placeholder="Buscar por evento o ubicación"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            aria-label="Buscar eventos"
          />
        </div>
      </div>

      <div
        className="chips"
        role="group"
        aria-label="Filtrar eventos"
        style={{
          marginBottom: 22,
        }}
      >
        {chips.map(([k, label]) => (
          <button key={k} className="chip" aria-pressed={filtro === k} onClick={() => setFiltro(k)}>
            {label}
          </button>
        ))}
      </div>

      {cargando && !eventos ? (
        <div className="grid-events">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} h={300} />
          ))}
        </div>
      ) : eventos?.length ? (
        <>
          <div className="grid-events hide-mobile">
            {eventos.map((e) => (
              <EventCard key={e.id} evento={e} />
            ))}
          </div>
          <div className="mobile-list only-mobile">
            {eventos.map((e) => (
              <EventRow key={e.id} evento={e} />
            ))}
          </div>
        </>
      ) : (
        <EmptyState
          ilustracion={<BeeHeart />}
          titulo="No hay eventos con ese filtro"
          texto="Prueba con otra ciudad o quita la búsqueda. Publicamos campañas nuevas cada mes."
        >
          <button
            className="btn btn--secondary btn--sm"
            onClick={() => {
              setFiltro('todos');
              setQ('');
            }}
          >
            Ver todos los eventos
          </button>
        </EmptyState>
      )}
    </div>
  );
}

// ===== Módulo: Detalle de evento =====
export function EventoDetalle() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { usuario, esAdmin } = useAuth();
  const { data: evento, cargando, error, recargar } = useFetch(`/eventos/${id}`);
  const [abierto, setAbierto] = useState(false);
  const [hora, setHora] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const [errorCita, setErrorCita] = useState('');
  const [cita, setCita] = useState(null);
  if (cargando) {
    return (
      <div className="container page detail">
        <Skeleton h={380} />
        <Skeleton h={380} />
      </div>
    );
  }
  if (error || !evento) {
    return (
      <div className="container page">
        <EmptyState titulo="No encontramos este evento" texto="Puede que ya haya terminado o que el enlace esté mal.">
          <Link to="/eventos" className="btn btn--primary btn--sm">
            Ver eventos
          </Link>
        </EmptyState>
      </div>
    );
  }
  const disponible = evento.estado === 'activo' && evento.cupo_restante > 0;
  const abrirAgenda = () => {
    if (!usuario) {
      navigate('/login', {
        state: {
          from: `/eventos/${id}`,
        },
      });
      return;
    }
    setErrorCita('');
    setHora(null);
    setAbierto(true);
  };
  const confirmar = async () => {
    setEnviando(true);
    setErrorCita('');
    try {
      const nueva = await api.post('/citas', {
        evento_id: evento.id,
        hora,
      });
      setCita(nueva);
      setAbierto(false);
      recargar();
    } catch (e) {
      setErrorCita(e.message);
      if (e.status === 409) recargar();
    } finally {
      setEnviando(false);
    }
  };
  return (
    <div className="container page">
      <Link
        to="/eventos"
        className="row tiny"
        style={{
          marginBottom: 16,
          fontWeight: 600,
          '--gap': '6px',
        }}
      >
        <ArrowLeft size={15} /> Volver a eventos
      </Link>

      <div className="detail">
        <div>
          <img className="detail__img" src={imgEvento(evento)} alt={`Imagen del evento ${evento.nombre}`} />
          <div className="banner-note hide-mobile">
            <HeartHandshake size={20} aria-hidden />
            Cada mechón cuenta. Tu donación ayudará a crear pelucas oncológicas llenas de esperanza.
          </div>
        </div>

        <div
          className="card stack"
          style={{
            '--gap': '18px',
            padding: 26,
          }}
        >
          <div
            className="stack"
            style={{
              '--gap': '10px',
            }}
          >
            <h1 className="h1">{evento.nombre}</h1>
            <div className="detail__meta">
              <div>
                <CalendarDays size={17} aria-hidden /> {fechaCorta(evento.fecha)} · {hora12(evento.hora_inicio)} a {hora12(evento.hora_fin)}
              </div>
              <div>
                <MapPin size={17} aria-hidden /> {evento.centro}, {evento.direccion}
              </div>
              <div>
                <HeartHandshake size={17} aria-hidden /> Donación de cabello
              </div>
              <div>
                <Users size={17} aria-hidden />
                {evento.cupo_restante > 0
                  ? `${evento.cupo_restante} de ${evento.cupo_total} lugares disponibles`
                  : 'Sin lugares disponibles'}
              </div>
            </div>
          </div>

          {evento.descripcion && (
            <section
              className="stack"
              style={{
                '--gap': '6px',
              }}
            >
              <h2 className="h3">Descripción</h2>
              <p className="muted">{evento.descripcion}</p>
            </section>
          )}

          <section>
            <h2 className="h3">Requisitos</h2>
            <ul className="clean req-list">
              {evento.requisitos.map((r) => (
                <li key={r}>
                  <CheckCircle2 size={17} aria-hidden /> {r}
                </li>
              ))}
            </ul>
          </section>

          {evento.estado !== 'activo' && (
            <Alert tipo="aviso" titulo="Este evento no está recibiendo citas">
              Su estado actual es <Badge estado={evento.estado} />.
            </Alert>
          )}

          {esAdmin ? (
            <Link to={`/admin/eventos/${evento.id}`} className="btn btn--dark">
              Editar en el panel
            </Link>
          ) : (
            <Button icon={CalendarHeart} onClick={abrirAgenda} disabled={!disponible} block>
              {disponible ? 'Agendar cita' : 'Evento lleno'}
            </Button>
          )}
        </div>
      </div>

      <Modal open={abierto} onClose={() => setAbierto(false)} titulo="Elige tu horario" wide>
        <p
          className="muted"
          style={{
            marginBottom: 16,
          }}
        >
          {fechaLarga(parseFecha(evento.fecha))} · {evento.centro}
        </p>
        <div className="slots" role="group" aria-label="Horarios disponibles">
          {evento.horarios.map((h) => (
            <button
              key={h.hora}
              className="slot"
              aria-pressed={hora === h.hora}
              disabled={h.disponibles === 0}
              onClick={() => setHora(h.hora)}
            >
              {h.hora}
              <small>{h.disponibles === 0 ? 'Lleno' : `${h.disponibles} lugares`}</small>
            </button>
          ))}
        </div>
        {errorCita && (
          <div
            style={{
              marginTop: 14,
            }}
          >
            <Alert tipo="error" titulo="No pudimos continuar">
              {errorCita}
            </Alert>
          </div>
        )}
        <div className="modal__actions">
          <Button variant="ghost" onClick={() => setAbierto(false)}>
            Cancelar
          </Button>
          <Button icon={Clock} onClick={confirmar} disabled={!hora || enviando}>
            {enviando ? 'Agendando…' : hora ? `Confirmar a las ${hora}` : 'Elige un horario'}
          </Button>
        </div>
      </Modal>

      <Modal open={Boolean(cita)} onClose={() => setCita(null)}>
        {cita && (
          <div
            style={{
              textAlign: 'center',
            }}
          >
            <div
              className="modal__icon"
              style={{
                margin: '0 auto 14px',
              }}
            >
              <PartyPopper size={26} />
            </div>
            <h2 className="h2">¡Cita agendada!</h2>
            <p
              className="muted"
              style={{
                marginTop: 8,
              }}
            >
              Te esperamos el {fechaCorta(cita.fecha).toLowerCase()} a las {hora12(cita.hora)} en {cita.centro}.
            </p>
            <p
              style={{
                marginTop: 12,
              }}
            >
              Tu folio es{' '}
              <b
                style={{
                  letterSpacing: '0.08em',
                }}
              >
                {cita.folio}
              </b>
            </p>
            <p
              className="tiny"
              style={{
                marginTop: 6,
              }}
            >
              Te mandamos la confirmación a tu correo.
            </p>
            <div
              className="modal__actions"
              style={{
                justifyContent: 'center',
              }}
            >
              <Button variant="ghost" onClick={() => setCita(null)}>
                Cerrar
              </Button>
              <Link to="/mis-citas" className="btn btn--primary">
                Ver mi cita
              </Link>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

// ===== Módulo: Puntos de recolección =====
export function Puntos() {
  const { data: puntos, cargando } = useFetch('/puntos');
  return (
    <div className="container page">
      <div className="page-head">
        <div
          className="stack"
          style={{
            '--gap': '6px',
          }}
        >
          <h1 className="h1">Puntos de recolección</h1>
          <p className="muted">Si no puedes ir a un evento, lleva tu donación a cualquiera de estos centros universitarios de la UdeG.</p>
        </div>
      </div>

      <div className="grid-events">
        {cargando && [1, 2, 3].map((i) => <Skeleton key={i} h={190} />)}
        {puntos?.map((p) => (
          <article
            key={p.id}
            className="card stack"
            style={{
              '--gap': '12px',
            }}
          >
            <div
              className="row"
              style={{
                '--gap': '12px',
                flexWrap: 'nowrap',
              }}
            >
              <span className="point__pin">
                <MapPin size={18} />
              </span>
              <div>
                <h2 className="h3">{p.nombre}</h2>
                <span className="tiny">{[p.zona, p.ciudad].filter(Boolean).join(', ')}</span>
              </div>
            </div>
            <div
              className="detail__meta"
              style={{
                fontSize: '0.87rem',
              }}
            >
              <div>
                <MapPin size={15} aria-hidden /> {p.direccion}
              </div>
              <div>
                <Phone size={15} aria-hidden /> <a href={`tel:${p.telefono.replace(/\s/g, '')}`}>{p.telefono}</a>
              </div>
              <div>
                <Clock size={15} aria-hidden /> {p.horario}
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

// ===== Módulo: Login =====
export function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({
    correo: '',
    password: '',
    recordar: true,
  });
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);
  const onChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((f) => ({
      ...f,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };
  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setEnviando(true);
    try {
      const u = await login(form.correo, form.password);
      const destino = location.state?.from;
      navigate(u.rol === 'administrador' ? '/admin' : destino || '/mis-citas', {
        replace: true,
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setEnviando(false);
    }
  };
  return (
    <AuthShell
      titulo="Cada donación comienza con un pequeño gran paso"
      texto="Ingresa para gestionar tus citas, consultar tu historial y descubrir nuevas formas de ayudar."
    >
      <div
        className="stack"
        style={{
          '--gap': '6px',
        }}
      >
        <h2 className="h1">¡Hola de nuevo!</h2>
        <p className="muted">Ingresa a tu cuenta para continuar ayudando.</p>
      </div>

      {error && (
        <Alert tipo="error" titulo="No pudimos continuar">
          {error}
        </Alert>
      )}

      <form className="stack" onSubmit={onSubmit} noValidate>
        <Field label="Correo electrónico">
          <div className="input-icon">
            <Mail size={17} />
            <input
              className="input"
              type="email"
              name="correo"
              placeholder="nombre@correo.com"
              autoComplete="email"
              value={form.correo}
              onChange={onChange}
              required
            />
          </div>
        </Field>
        <Field label="Contraseña">
          <div className="input-icon">
            <Lock size={17} />
            <input
              className="input"
              type="password"
              name="password"
              placeholder="••••••••"
              autoComplete="current-password"
              value={form.password}
              onChange={onChange}
              required
            />
          </div>
        </Field>
        <div className="row between">
          <label className="check">
            <input type="checkbox" name="recordar" checked={form.recordar} onChange={onChange} /> Recordarme
          </label>
          <span className="tiny" title="Escríbenos a soporte@forthekids.org">
            ¿Olvidaste tu contraseña?
          </span>
        </div>
        <Button type="submit" block disabled={enviando || !form.correo || !form.password}>
          {enviando ? 'Entrando…' : 'Iniciar sesión'}
        </Button>
      </form>

      <p
        className="muted"
        style={{
          textAlign: 'center',
          fontSize: '0.9rem',
        }}
      >
        ¿Aún no tienes una cuenta?{' '}
        <Link
          to="/registro"
          style={{
            fontWeight: 700,
            color: 'var(--tx)',
          }}
        >
          Regístrate
        </Link>
      </p>
    </AuthShell>
  );
}

// ===== Módulo: Registro =====
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function validar(f) {
  const e = {};
  if (!f.nombre.trim()) e.nombre = 'Escribe tu nombre.';
  if (!EMAIL_RE.test(f.correo)) e.correo = 'Revisa que el correo esté bien escrito.';
  if (f.telefono.replace(/\D/g, '').length !== 10) e.telefono = 'Escribe tu número a 10 dígitos, sin lada (ej. 33 1234 5678).';
  if (f.password.length < 8 || !/\d/.test(f.password)) e.password = 'Mínimo 8 caracteres y al menos un número.';
  if (!f.consentimientoDatos) e.consentimientoDatos = 'Para crear tu cuenta necesitamos tu autorización para tratar tus datos.';
  return e;
}

export function Registro() {
  const { registro } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({
    nombre: '',
    apellido: '',
    correo: '',
    telefono: '',
    password: '',
    consentimientoDatos: false,
  });
  const [aviso, setAviso] = useState(false);
  const [errores, setErrores] = useState({});
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);
  const onChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((f) => ({
      ...f,
      [name]: type === 'checkbox' ? checked : value,
    }));
    setErrores((x) => ({
      ...x,
      [name]: undefined,
    }));
  };
  const onSubmit = async (e) => {
    e.preventDefault();
    const v = validar(form);
    setErrores(v);
    if (Object.keys(v).length) return;
    setEnviando(true);
    setError('');
    try {
      await registro(form);
      navigate(location.state?.from || '/eventos', {
        replace: true,
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setEnviando(false);
    }
  };
  const input = (name, props = {}) => (
    <input className="input" name={name} value={form[name]} onChange={onChange} aria-invalid={Boolean(errores[name])} {...props} />
  );
  return (
    <AuthShell
      titulo="Súmate a una comunidad que transforma vidas"
      texto="Crea tu cuenta, encuentra una campaña y acompáñanos a llevar esperanza a más niñas y niños."
    >
      <div
        className="stack"
        style={{
          '--gap': '6px',
        }}
      >
        <h2 className="h1">Crea tu cuenta</h2>
        <p className="muted">Completa tus datos y comienza a formar parte de FOR THE KIDS.</p>
      </div>

      {error && (
        <Alert tipo="error" titulo="No pudimos crear tu cuenta">
          {error}
        </Alert>
      )}

      <form className="form-grid" onSubmit={onSubmit} noValidate>
        <Field label="Nombre" error={errores.nombre}>
          {input('nombre', {
            placeholder: 'María',
            autoComplete: 'given-name',
          })}
        </Field>
        <Field label="Apellido">
          {input('apellido', {
            placeholder: 'González',
            autoComplete: 'family-name',
          })}
        </Field>
        <Field label="Correo electrónico" error={errores.correo} className="span-2">
          {input('correo', {
            type: 'email',
            placeholder: 'nombre@correo.com',
            autoComplete: 'email',
          })}
        </Field>
        <Field label="Teléfono" error={errores.telefono} className="span-2">
          {input('telefono', {
            type: 'tel',
            placeholder: '33 1234 5678',
            inputMode: 'numeric',
            autoComplete: 'tel',
          })}
        </Field>
        <Field label="Contraseña" error={errores.password} className="span-2">
          {input('password', {
            type: 'password',
            placeholder: 'Mínimo 8 caracteres, con un número',
            autoComplete: 'new-password',
          })}
        </Field>
        <div
          className="span-2 stack"
          style={{
            '--gap': '4px',
          }}
        >
          <label className="check">
            <input type="checkbox" name="consentimientoDatos" checked={form.consentimientoDatos} onChange={onChange} />
            <span>
              Otorgo mi consentimiento para que For The Kids trate mis datos personales con el fin de gestionar mis citas y donaciones, de
              conformidad con el{' '}
              <button type="button" className="link-btn" onClick={() => setAviso(true)}>
                Aviso de privacidad
              </button>
              .
            </span>
          </label>
          {errores.consentimientoDatos && <small className="field-error">{errores.consentimientoDatos}</small>}
        </div>
        <Button type="submit" block className="span-2" disabled={enviando}>
          {enviando ? 'Creando cuenta…' : 'Crear cuenta'}
        </Button>
      </form>

      <p
        className="muted"
        style={{
          textAlign: 'center',
          fontSize: '0.9rem',
        }}
      >
        ¿Ya tienes una cuenta?{' '}
        <Link
          to="/login"
          style={{
            fontWeight: 700,
            color: 'var(--tx)',
          }}
        >
          Inicia sesión
        </Link>
      </p>

      <AvisoPrivacidad
        open={aviso}
        onClose={() => setAviso(false)}
        onAceptar={() => {
          setForm((f) => ({
            ...f,
            consentimientoDatos: true,
          }));
          setErrores((x) => ({
            ...x,
            consentimientoDatos: undefined,
          }));
          setAviso(false);
        }}
      />
    </AuthShell>
  );
}

// ===== Módulo: Mis citas =====
function ProximaCita({ cita, onIndicaciones, onReprogramar, onCancelar }) {
  const d = parseFecha(cita.fecha);
  return (
    <article className="appt">
      <div className="appt__date" aria-hidden>
        <small>{mesCorto(d.getMonth()).toUpperCase()}</small>
        <b>{d.getDate()}</b>
      </div>
      <div className="appt__body">
        <span
          className="tiny"
          style={{
            color: 'var(--amarillo)',
          }}
        >
          {hora12(cita.hora)} · Folio {cita.folio}
        </span>
        <h2
          className="h2"
          style={{
            color: '#fff',
          }}
        >
          {cita.evento_nombre}
        </h2>
        <span className="muted">
          {cita.direccion}, {cita.ciudad}
        </span>
        <div
          className="row"
          style={{
            marginTop: 10,
            '--gap': '8px',
          }}
        >
          <Button size="sm" icon={Navigation} onClick={() => onIndicaciones(cita)}>
            Ver indicaciones
          </Button>
          <Button variant="ghost" size="sm" icon={RefreshCw} onClick={() => onReprogramar(cita)}>
            Reprogramar
          </Button>
          <Button variant="ghost" size="sm" icon={XCircle} onClick={() => onCancelar(cita)}>
            Cancelar
          </Button>
        </div>
      </div>
    </article>
  );
}

export function MisCitas() {
  const toast = useToast();
  const { data: citas, cargando, recargar } = useFetch('/citas/mias');
  const [reprogramar, setReprogramar] = useState(null);
  const [nuevaHora, setNuevaHora] = useState(null);
  const [cancelar, setCancelar] = useState(null);
  const [indicaciones, setIndicaciones] = useState(null);
  const [error, setError] = useState('');
  const [trabajando, setTrabajando] = useState(false);
  const activas = useMemo(
    () => (citas || []).filter((c) => c.estado === 'activa').sort((a, b) => (a.fecha + a.hora).localeCompare(b.fecha + b.hora)),
    [citas]
  );
  const anteriores = useMemo(() => (citas || []).filter((c) => c.estado !== 'activa'), [citas]);
  const [principal, ...otras] = activas;
  const abrirReprogramar = async (cita) => {
    setError('');
    setNuevaHora(null);
    const ev = await api.get(`/eventos/${cita.evento_id}`);
    setReprogramar({
      cita,
      horarios: ev.horarios,
    });
  };
  const confirmarReprogramar = async () => {
    setTrabajando(true);
    setError('');
    try {
      await api.patch(`/citas/${reprogramar.cita.id}/reprogramar`, {
        hora: nuevaHora,
      });
      toast.exito('Cita reprogramada', `Ahora es a las ${hora12(nuevaHora)}. Te mandamos la confirmación por correo.`);
      setReprogramar(null);
      recargar();
    } catch (e) {
      setError(e.message);
    } finally {
      setTrabajando(false);
    }
  };
  const confirmarCancelar = async () => {
    setTrabajando(true);
    setError('');
    try {
      await api.patch(`/citas/${cancelar.id}/cancelar`);
      toast.exito('Cita cancelada', 'Liberamos tu lugar y te llegará un correo de confirmación.');
      setCancelar(null);
      recargar();
    } catch (e) {
      setError(e.message);
    } finally {
      setTrabajando(false);
    }
  };
  return (
    <div className="container page">
      <div className="page-head">
        <div
          className="stack"
          style={{
            '--gap': '6px',
          }}
        >
          <span className="kicker">Mi espacio</span>
          <h1 className="h1">Mis citas</h1>
          <p className="muted">Consulta y gestiona tus próximas visitas.</p>
        </div>
        <Link to="/eventos" className="btn btn--primary btn--sm">
          <CalendarPlus size={15} /> Agendar nueva cita
        </Link>
      </div>

      <div className="two-col">
        <div
          className="stack"
          style={{
            '--gap': '20px',
          }}
        >
          {cargando ? (
            <Skeleton h={150} />
          ) : principal ? (
            <ProximaCita
              cita={principal}
              onIndicaciones={setIndicaciones}
              onReprogramar={abrirReprogramar}
              onCancelar={(c) => {
                setError('');
                setCancelar(c);
              }}
            />
          ) : (
            <EmptyState
              ilustracion={<BeeHeart />}
              titulo="Aún no tienes citas"
              texto="Agenda tu primera donación y comienza a transformar vidas."
            >
              <Link to="/eventos" className="btn btn--primary btn--sm">
                Explorar eventos
              </Link>
            </EmptyState>
          )}

          {otras.length > 0 && (
            <section className="card">
              <h2
                className="h3"
                style={{
                  marginBottom: 8,
                }}
              >
                Otras citas próximas
              </h2>
              {otras.map((c) => (
                <div className="list-line" key={c.id}>
                  <div className="list-line__body">
                    <b>{c.evento_nombre}</b>
                    <span className="tiny">
                      {fechaTabla(c.fecha)} · {hora12(c.hora)} · {c.folio}
                    </span>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => abrirReprogramar(c)}>
                    Reprogramar
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setCancelar(c)}>
                    Cancelar
                  </Button>
                </div>
              ))}
            </section>
          )}

          <section className="card">
            <h2
              className="h3"
              style={{
                marginBottom: 8,
              }}
            >
              Citas anteriores
            </h2>
            {anteriores.length === 0 && <p className="tiny">Aquí vas a ver tus citas pasadas.</p>}
            {anteriores.slice(0, 8).map((c) => (
              <div className="list-line" key={c.id}>
                <span
                  className="point__pin"
                  style={{
                    width: 34,
                    height: 34,
                  }}
                >
                  ♡
                </span>
                <div className="list-line__body">
                  <b>{c.evento_nombre}</b>
                  <span className="tiny">{fechaTabla(c.fecha)}</span>
                </div>
                <Badge estado={c.donacion_id ? 'completada' : c.estado} />
              </div>
            ))}
          </section>
        </div>

        <aside
          className="stack"
          style={{
            '--gap': '20px',
          }}
        >
          <div className="card">
            <Calendar marcados={activas.map((c) => c.fecha)} mesInicial={principal?.fecha} />
          </div>
          <div className="impact">
            <b
              className="row"
              style={{
                '--gap': '8px',
              }}
            >
              <Info size={17} /> Prepárate para donar
            </b>
            <p
              className="muted"
              style={{
                fontSize: '0.9rem',
              }}
            >
              Lleva tu cabello limpio, seco y sin productos. Recuerda que debe medir entre 20 y 35 cm.
            </p>
            <p className="tiny">Puedes cancelar o reprogramar hasta 12 horas antes de tu cita.</p>
          </div>
        </aside>
      </div>

      <Modal open={Boolean(reprogramar)} onClose={() => setReprogramar(null)} titulo="Reprogramar cita" wide>
        {reprogramar && (
          <>
            <p
              className="muted"
              style={{
                marginBottom: 14,
              }}
            >
              {reprogramar.cita.evento_nombre} · {fechaTabla(reprogramar.cita.fecha)}. Tu horario actual es {hora12(reprogramar.cita.hora)}.
            </p>
            <div className="slots">
              {reprogramar.horarios.map((h) => {
                const actual = h.hora === reprogramar.cita.hora;
                return (
                  <button
                    key={h.hora}
                    className="slot"
                    aria-pressed={nuevaHora === h.hora}
                    disabled={actual || h.disponibles === 0}
                    onClick={() => setNuevaHora(h.hora)}
                  >
                    {h.hora}
                    <small>{actual ? 'Actual' : h.disponibles === 0 ? 'Lleno' : `${h.disponibles} lugares`}</small>
                  </button>
                );
              })}
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
            <div className="modal__actions">
              <Button variant="ghost" onClick={() => setReprogramar(null)}>
                Mantener horario
              </Button>
              <Button onClick={confirmarReprogramar} disabled={!nuevaHora || trabajando}>
                {trabajando ? 'Guardando…' : 'Reprogramar cita'}
              </Button>
            </div>
          </>
        )}
      </Modal>

      <Modal open={Boolean(indicaciones)} onClose={() => setIndicaciones(null)} titulo="Indicaciones para tu cita">
        {indicaciones && (
          <div
            className="stack"
            style={{
              '--gap': '14px',
            }}
          >
            <div className="detail__meta">
              <div>
                <CalendarPlus size={16} /> {fechaTabla(indicaciones.fecha)} · {hora12(indicaciones.hora)}
              </div>
              <div>
                <MapPin size={16} /> {indicaciones.centro}, {indicaciones.direccion}, {indicaciones.ciudad}
              </div>
              <div>
                <Info size={16} /> Folio <b>{indicaciones.folio}</b>: dilo al llegar al módulo de For The Kids.
              </div>
            </div>
            <ul className="clean req-list">
              <li>
                <CheckCircle2 size={16} /> Llega 10 minutos antes de tu horario.
              </li>
              <li>
                <CheckCircle2 size={16} /> Cabello limpio, seco y sin productos.
              </li>
              <li>
                <CheckCircle2 size={16} /> Entre 20 y 35 cm de largo, sin teñir recientemente.
              </li>
            </ul>
            <div
              className="modal__actions"
              style={{
                marginTop: 4,
              }}
            >
              <Button onClick={() => setIndicaciones(null)}>Entendido</Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal open={Boolean(cancelar)} onClose={() => setCancelar(null)} titulo="¿Cancelar esta cita?">
        {cancelar && (
          <>
            <p className="muted">
              Vas a cancelar tu cita en <b>{cancelar.evento_nombre}</b> el {fechaTabla(cancelar.fecha)} a las {hora12(cancelar.hora)}. Tu
              lugar quedará libre para otra persona.
            </p>
            {error && (
              <div
                style={{
                  marginTop: 14,
                }}
              >
                <Alert tipo="error">{error}</Alert>
              </div>
            )}
            <div className="modal__actions">
              <Button variant="ghost" onClick={() => setCancelar(null)}>
                Mantener cita
              </Button>
              <Button variant="danger" onClick={confirmarCancelar} disabled={trabajando}>
                {trabajando ? 'Cancelando…' : 'Cancelar cita'}
              </Button>
            </div>
          </>
        )}
      </Modal>
    </div>
  );
}

// ===== Módulo: Mis donaciones =====
export function MisDonaciones() {
  const { data, cargando } = useFetch('/donaciones/mias');
  const r = data?.resumen;
  const donaciones = data?.donaciones || [];
  return (
    <div className="container page">
      <div className="page-head">
        <div
          className="stack"
          style={{
            '--gap': '6px',
          }}
        >
          <span className="kicker">Mi historial</span>
          <h1 className="h1">Mis donaciones</h1>
          <p className="muted">Cada aporte cuenta una historia de esperanza.</p>
        </div>
      </div>

      {cargando ? (
        <div className="metrics">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} h={120} />
          ))}
        </div>
      ) : (
        <div className="metrics">
          <Metric
            icon={HandHeart}
            label="Donaciones realizadas"
            value={r.donaciones}
            delta={r.donaciones_anio ? `+${r.donaciones_anio} este año` : null}
          />
          <Metric
            icon={Ruler}
            label="Cabello donado"
            value={`${numero(r.cabello_cm)} cm`}
            delta={r.ultimo_cabello_cm ? `+${numero(r.ultimo_cabello_cm)} cm` : null}
          />
          <Metric icon={Sparkles} label="Campañas apoyadas" value={r.campanas} />
          <Metric icon={Heart} label="Familias alcanzadas" value={r.familias} delta={r.familias ? 'Gracias' : null} />
        </div>
      )}

      <div
        className="two-col"
        style={{
          marginTop: 24,
        }}
      >
        <section>
          <h2
            className="h2"
            style={{
              marginBottom: 14,
            }}
          >
            Historial de donaciones
          </h2>
          {!cargando && donaciones.length === 0 ? (
            <EmptyState
              ilustracion={<BeeHeart />}
              titulo="Todavía no hay donaciones registradas"
              texto="Cuando dones en un evento, el equipo la registra y aparece aquí."
            >
              <Link to="/eventos" className="btn btn--primary btn--sm">
                Explorar eventos
              </Link>
            </EmptyState>
          ) : (
            <>
              <div className="table-wrap hide-mobile">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Donación</th>
                      <th>Campaña</th>
                      <th>Fecha</th>
                      <th>Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {donaciones.map((d) => (
                      <tr key={d.id}>
                        <td className="cell-strong">{cantidadDonacion(d)}</td>
                        <td>{d.evento_nombre}</td>
                        <td>{fechaTabla(d.fecha)}</td>
                        <td>
                          <Badge estado={d.estado} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mobile-list only-mobile">
                {donaciones.map((d) => (
                  <div className="row-item" key={d.id}>
                    <span className="point__pin">
                      <HandHeart size={17} />
                    </span>
                    <div className="row-item__body">
                      <div className="row-item__title">{cantidadDonacion(d)}</div>
                      <span className="tiny">{fechaTabla(d.fecha)}</span>
                    </div>
                    <Badge estado={d.estado} />
                  </div>
                ))}
              </div>
            </>
          )}
        </section>

        <aside
          className="impact"
          style={{
            justifyItems: 'center',
            textAlign: 'center',
            padding: 28,
          }}
        >
          <span className="kicker">Tu impacto</span>
          <ImpactIllustration />
          <h2 className="h2">
            {r?.familias
              ? `Tus donaciones han llevado esperanza a ${r.familias} ${r.familias === 1 ? 'familia' : 'familias'}`
              : 'Tu primera donación puede cambiarlo todo'}
          </h2>
          <p
            className="muted"
            style={{
              fontSize: '0.9rem',
            }}
          >
            Gracias por ayudarnos a crear sonrisas y acompañar nuevos comienzos.
          </p>
        </aside>
      </div>
    </div>
  );
}

// ===== Módulo: Perfil =====
export function Perfil() {
  const { usuario, logout, esAdmin } = useAuth();
  const navigate = useNavigate();
  return (
    <div
      className="container page"
      style={{
        maxWidth: 620,
      }}
    >
      <div
        className="card stack"
        style={{
          '--gap': '18px',
          padding: 24,
        }}
      >
        <div
          className="row"
          style={{
            '--gap': '14px',
          }}
        >
          <span
            className="avatar"
            style={{
              width: 56,
              height: 56,
              fontSize: '1.1rem',
            }}
          >
            {iniciales(usuario.nombre, usuario.apellido)}
          </span>
          <div>
            <h1 className="h2">
              {usuario.nombre} {usuario.apellido}
            </h1>
            <span className="tiny">{esAdmin ? 'Administrador' : 'Donante'}</span>
          </div>
        </div>
        <div className="detail__meta">
          <div>
            <Mail size={16} /> {usuario.correo}
          </div>
          <div>
            <Phone size={16} /> {usuario.telefono}
          </div>
        </div>
      </div>

      <nav
        className="card"
        style={{
          marginTop: 16,
          padding: 8,
        }}
        aria-label="Accesos"
      >
        {esAdmin && (
          <Link
            className="list-line"
            style={{
              padding: 12,
            }}
            to="/admin"
          >
            <LayoutDashboard size={18} /> Panel administrativo
          </Link>
        )}
        <Link
          className="list-line"
          style={{
            padding: 12,
          }}
          to="/mis-citas"
        >
          <CalendarHeart size={18} /> Mis citas
        </Link>
        <Link
          className="list-line"
          style={{
            padding: 12,
          }}
          to="/mis-donaciones"
        >
          <HandHeart size={18} /> Mis donaciones
        </Link>
        <Link
          className="list-line"
          style={{
            padding: 12,
          }}
          to="/puntos"
        >
          <MapPin size={18} /> Puntos de recolección
        </Link>
      </nav>

      <Button
        variant="ghost"
        icon={LogOut}
        block
        style={{
          marginTop: 16,
        }}
        onClick={() => {
          logout();
          navigate('/');
        }}
      >
        Cerrar sesión
      </Button>
    </div>
  );
}
