import { createContext, useCallback, useContext, useEffect, useId, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, CheckCircle2, ChevronLeft, ChevronRight, Info, MapPin, TriangleAlert, X } from 'lucide-react';
import { fechaEtiqueta, mesLargo, numero } from './core';

// ===== Módulo: Componentes base =====
const ICONOS = {
  exito: CheckCircle2,
  error: AlertCircle,
  aviso: TriangleAlert,
  info: Info,
};

export function Alert({ tipo = 'info', titulo, children, className = '' }) {
  const Icono = ICONOS[tipo];
  return (
    <div className={`alert alert--${tipo} ${className}`} role={tipo === 'error' ? 'alert' : undefined}>
      <Icono size={18} aria-hidden />
      <div>
        {titulo && <strong>{titulo}</strong>}
        {children}
      </div>
    </div>
  );
}

export function Button({ variant = 'primary', size, block, icon: Icon, children, className = '', ...props }) {
  const cls = ['btn', `btn--${variant}`, size && `btn--${size}`, block && 'btn--block', className].filter(Boolean).join(' ');
  return (
    <button type="button" className={cls} {...props}>
      {Icon && <Icon size={size === 'sm' ? 15 : 17} aria-hidden />}
      {children}
    </button>
  );
}

export function Field({ label, error, hint, children, className = '' }) {
  return (
    <label className={`field ${className}`}>
      <span>{label}</span>
      {children}
      {hint && !error && <small className="tiny">{hint}</small>}
      {error && <small className="field-error">{error}</small>}
    </label>
  );
}

const ESTADOS = {
  activo: ['verde', 'Activo'],
  activa: ['verde', 'Activa'],
  completada: ['verde', 'Completada'],
  atendida: ['verde', 'Atendida'],
  pendiente: ['amarillo', 'Pendiente'],
  borrador: ['gris', 'Borrador'],
  programado: ['azul', 'Programado'],
  cancelado: ['rojo', 'Cancelado'],
  cancelada: ['rojo', 'Cancelada'],
  finalizado: ['gris', 'Finalizado'],
  no_asistio: ['rojo', 'No asistió'],
};

export function Badge({ estado, children }) {
  const [color, texto] = ESTADOS[estado] || ['gris', estado];
  return <span className={`badge badge--${color}`}>{children || texto}</span>;
}

export function Metric({ icon: Icon, label, value, delta, deltaLabel }) {
  const negativo = typeof delta === 'number' && delta < 0;
  return (
    <div className="metric">
      <div className="metric__top">
        <span className="metric__icon">{Icon && <Icon size={19} aria-hidden />}</span>
        {delta !== undefined && delta !== null && (
          <span className={`metric__delta ${negativo ? 'neg' : ''}`}>
            {typeof delta === 'number' ? `${delta > 0 ? '+' : ''}${delta}%` : delta}
          </span>
        )}
      </div>
      <span className="metric__label">{label}</span>
      <span className="metric__value">{value}</span>
      {deltaLabel && <span className="tiny">{deltaLabel}</span>}
    </div>
  );
}

export function Modal({ open, onClose, titulo, children, wide, labelledBy }) {
  const ref = useRef(null);
  const id = useId();
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && onClose?.();
    document.addEventListener('keydown', onKey);
    ref.current?.focus();
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}>
      <div
        className={`modal ${wide ? 'modal--wide' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy || id}
        tabIndex={-1}
        ref={ref}
      >
        {titulo && (
          <div
            className="row between"
            style={{
              marginBottom: 14,
            }}
          >
            <h2 className="h2" id={id}>
              {titulo}
            </h2>
            <button className="icon-btn" onClick={onClose} aria-label="Cerrar">
              <X size={18} />
            </button>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}

export function EmptyState({ titulo, texto, children, ilustracion }) {
  return (
    <div className="empty">
      {ilustracion}
      <h3 className="h3">{titulo}</h3>
      {texto && <p className="muted">{texto}</p>}
      {children}
    </div>
  );
}

export function Skeleton({ h = 120, style }) {
  return (
    <div
      className="skeleton"
      style={{
        height: h,
        ...style,
      }}
      aria-hidden
    />
  );
}

export function SectionHead({ titulo, accion }) {
  return (
    <div className="card-head">
      <h2 className="h2">{titulo}</h2>
      {accion}
    </div>
  );
}

// ===== Módulo: Gráficas =====
export function BarChart({ data, labelKey = 'mes', valueKey = 'total' }) {
  const max = Math.max(1, ...data.map((d) => d[valueKey]));
  const ultimo = data.length - 1;
  return (
    <div className="bars" role="img" aria-label={`Gráfica de barras: ${data.map((d) => `${d[labelKey]} ${d[valueKey]}`).join(', ')}`}>
      {data.map((d, i) => (
        <div className="bars__col" key={d[labelKey]}>
          <div className="bars__track">
            <div
              className={`bars__bar ${i === ultimo ? 'is-current' : ''}`}
              style={{
                height: `${Math.max(4, (d[valueKey] / max) * 100)}%`,
              }}
            >
              <span className="bars__val">{d[valueKey]}</span>
            </div>
          </div>
          <span className="bars__label">{d[labelKey]}</span>
        </div>
      ))}
    </div>
  );
}

const COLORES_LARGO = ['#F9C62D', '#32B679', '#172033'];

export function LargosChart({ largos, totalCm, promedioCm, size = 150 }) {
  const r = 52;
  const c = 2 * Math.PI * r;
  const total = largos.reduce((acc, l) => acc + Number(l.total), 0);
  let acumulado = 0;
  return (
    <div className="donut">
      <svg viewBox="0 0 140 140" width={size} height={size} role="img" aria-label={`Total ${total} donaciones de cabello`}>
        <circle cx="70" cy="70" r={r} fill="none" stroke="#F3F0E6" strokeWidth="18" />
        {largos.map((l, i) => {
          const largo = total ? (Number(l.total) / total) * c : 0;
          const seg = (
            <circle
              key={l.rango}
              cx="70"
              cy="70"
              r={r}
              fill="none"
              stroke={COLORES_LARGO[i % 3]}
              strokeWidth="18"
              strokeDasharray={`${largo} ${c - largo}`}
              strokeDashoffset={-acumulado}
              transform="rotate(-90 70 70)"
            />
          );
          acumulado += largo;
          return seg;
        })}
        <text x="70" y="68" textAnchor="middle" fontSize="24" fontWeight="700" fill="#172033">
          {numero(total)}
        </text>
        <text x="70" y="86" textAnchor="middle" fontSize="10" fill="#8A8F9C">
          donaciones
        </text>
      </svg>
      <ul className="clean donut__legend">
        {largos.map((l, i) => (
          <li key={l.rango}>
            <i
              style={{
                background: COLORES_LARGO[i % 3],
              }}
            />
            {l.rango}
            <b>{total ? Math.round((Number(l.total) / total) * 100) : 0}%</b>
          </li>
        ))}
        {totalCm !== undefined && (
          <li className="donut__extra">
            {numero(totalCm)} cm recolectados · promedio {numero(promedioCm)} cm
          </li>
        )}
      </ul>
    </div>
  );
}

// ===== Módulo: Calendario =====
const DOW = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export function Calendar({ marcados = [], seleccionado, onSelect, mesInicial }) {
  const [mes, setMes] = useState(() => {
    const base = mesInicial ? new Date(`${mesInicial}T00:00:00`) : new Date();
    return new Date(base.getFullYear(), base.getMonth(), 1);
  });
  const set = new Set(marcados);
  const hoy = iso(new Date());
  const inicio = new Date(mes);
  inicio.setDate(1 - ((mes.getDay() + 6) % 7));
  const dias = Array.from(
    {
      length: 42,
    },
    (_, i) => {
      const d = new Date(inicio);
      d.setDate(inicio.getDate() + i);
      return d;
    }
  );
  const visibles = dias[35].getMonth() !== mes.getMonth() ? dias.slice(0, 35) : dias;
  const mover = (n) => setMes(new Date(mes.getFullYear(), mes.getMonth() + n, 1));
  return (
    <div className="cal">
      <div className="cal__head">
        <b
          style={{
            textTransform: 'capitalize',
          }}
        >
          {mesLargo(mes.getMonth())} {mes.getFullYear()}
        </b>
        <div
          className="row"
          style={{
            '--gap': '4px',
          }}
        >
          <button
            className="icon-btn"
            style={{
              width: 32,
              height: 32,
            }}
            onClick={() => mover(-1)}
            aria-label="Mes anterior"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            className="icon-btn"
            style={{
              width: 32,
              height: 32,
            }}
            onClick={() => mover(1)}
            aria-label="Mes siguiente"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
      <div className="cal__grid">
        {DOW.map((d) => (
          <span key={d} className="cal__dow">
            {d}
          </span>
        ))}
        {visibles.map((d) => {
          const k = iso(d);
          const cls = [
            'cal__day',
            d.getMonth() !== mes.getMonth() && 'is-out',
            k === hoy && 'is-today',
            set.has(k) && 'has-event',
            k === seleccionado && 'is-selected',
          ]
            .filter(Boolean)
            .join(' ');
          return onSelect ? (
            <button
              key={k}
              className={cls}
              style={{
                border: 0,
                background: k === seleccionado ? undefined : 'transparent',
                cursor: 'pointer',
              }}
              onClick={() => onSelect(k)}
              aria-label={`${d.getDate()} de ${mesLargo(d.getMonth())}${set.has(k) ? ', con evento' : ''}`}
            >
              {d.getDate()}
            </button>
          ) : (
            <span key={k} className={cls}>
              {d.getDate()}
            </span>
          );
        })}
      </div>
    </div>
  );
}

// ===== Módulo: Logo e ilustraciones =====
export function Logo({ compact = false, height = 40 }) {
  return compact ? (
    <img className="logo-img" src="/img/icono-64.png" alt="For The Kids" width={height} height={height} />
  ) : (
    <img
      className="logo-img"
      src="/img/logo.png"
      alt="For The Kids"
      style={{
        height,
        width: 'auto',
      }}
    />
  );
}

const Heart = ({ x, y, s = 1, c = '#E5484D', o = 1 }) => (
  <path
    transform={`translate(${x} ${y}) scale(${s})`}
    d="M0 6C0 2.7 2.4 0 5.4 0 7.4 0 9 1.1 10 2.6 11 1.1 12.6 0 14.6 0 17.6 0 20 2.7 20 6c0 6.4-10 12-10 12S0 12.4 0 6z"
    fill={c}
    opacity={o}
  />
);

const Bee = ({ x, y, s = 1 }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    <ellipse cx="-7" cy="-11" rx="8" ry="6" fill="#fff" opacity=".9" stroke="#172033" strokeWidth="1.5" />
    <ellipse cx="7" cy="-11" rx="8" ry="6" fill="#fff" opacity=".9" stroke="#172033" strokeWidth="1.5" />
    <ellipse cx="0" cy="0" rx="15" ry="11" fill="#F9C62D" stroke="#172033" strokeWidth="2.5" />
    <path d="M-5 -10v20M5 -10v20" stroke="#172033" strokeWidth="3.5" />
    <circle cx="11" cy="-2" r="1.6" fill="#172033" />
  </g>
);

export function BeeHeart({ size = 120 }) {
  return (
    <svg viewBox="0 0 140 120" width={size} height={size * 0.86} aria-hidden>
      <path
        d="M10 100 C 40 80, 60 115, 90 95 S 125 80, 135 90"
        fill="none"
        stroke="#172033"
        strokeOpacity=".3"
        strokeWidth="2.5"
        strokeDasharray="2 9"
        strokeLinecap="round"
      />
      <Heart x={44} y={20} s={2.6} c="#E5484D" />
      <Bee x={102} y={46} s={1.2} />
    </svg>
  );
}

export function ImpactIllustration() {
  return (
    <svg
      viewBox="0 0 160 150"
      style={{
        width: 130,
      }}
      aria-hidden
    >
      <circle cx="80" cy="80" r="62" fill="#FFFDF7" />
      <circle cx="50" cy="44" r="16" fill="#C98A3D" />
      <circle cx="110" cy="44" r="16" fill="#C98A3D" />
      <circle cx="50" cy="44" r="8" fill="#F2B43A" />
      <circle cx="110" cy="44" r="8" fill="#F2B43A" />
      <circle cx="80" cy="74" r="38" fill="#C98A3D" />
      <ellipse cx="80" cy="86" rx="16" ry="12" fill="#F2D3A6" />
      <circle cx="66" cy="68" r="4" fill="#172033" />
      <circle cx="94" cy="68" r="4" fill="#172033" />
      <circle cx="80" cy="82" r="4" fill="#172033" />
      <path d="M58 104c-10 26 54 26 44 0" fill="#C98A3D" />
      <Heart x={66} y={104} s={1.4} c="#E5484D" />
      <Heart x={128} y={16} s={0.9} c="#F9C62D" />
    </svg>
  );
}

// ===== Módulo: Tarjetas de eventos =====
export const imgEvento = (e) => e.imagen_url || '/eventos/cucei.jpg';

export function EventCard({ evento, mostrarEstado }) {
  const lleno = evento.cupo_restante === 0;
  return (
    <article className="event-card">
      <Link to={`/eventos/${evento.id}`} tabIndex={-1} aria-hidden>
        <img className="event-card__img" src={imgEvento(evento)} alt="" loading="lazy" />
      </Link>
      <div className="event-card__body">
        <span className="event-card__date">{fechaEtiqueta(evento.fecha, evento.hora_inicio)}</span>
        <Link to={`/eventos/${evento.id}`} className="event-card__title">
          {evento.nombre}
        </Link>
        <span className="event-card__place">
          <MapPin size={14} aria-hidden /> {evento.centro}
        </span>
        <div className="event-card__foot">
          {mostrarEstado ? (
            <Badge estado={evento.estado} />
          ) : (
            <span className="tiny">{lleno ? 'Sin lugares' : `${evento.cupo_restante} lugares`}</span>
          )}
          <Link to={`/eventos/${evento.id}`} className={`btn btn--sm ${lleno ? 'btn--ghost' : 'btn--primary'}`}>
            {lleno ? 'Ver evento' : 'Agendar cita'}
          </Link>
        </div>
      </div>
    </article>
  );
}

export function EventRow({ evento, to }) {
  return (
    <Link to={to || `/eventos/${evento.id}`} className="row-item">
      <img src={imgEvento(evento)} alt="" loading="lazy" />
      <div className="row-item__body">
        <span className="event-card__date">{fechaEtiqueta(evento.fecha, evento.hora_inicio)}</span>
        <div className="row-item__title">{evento.nombre}</div>
        <span className="tiny">{evento.centro}</span>
      </div>
      <Badge estado={evento.estado} />
    </Link>
  );
}

// ===== Módulo: Aviso de privacidad =====
export function AvisoPrivacidad({ open, onClose, onAceptar }) {
  return (
    <Modal open={open} onClose={onClose} titulo="Aviso de privacidad" wide>
      <div className="aviso">
        <p>
          <b>For The Kids</b>, campaña de recolección de cabello para la elaboración de pelucas oncológicas infantiles, es responsable del
          tratamiento de los datos personales que nos proporciones, los cuales serán protegidos conforme a la Ley Federal de Protección de
          Datos Personales en Posesión de los Particulares.
        </p>

        <h3>Datos que recabamos</h3>
        <p>
          Nombre y apellidos, correo electrónico, número telefónico y contraseña de acceso (almacenada cifrada). Al asistir a una cita
          también registramos el largo del cabello que donaste.
        </p>

        <h3>Finalidades del tratamiento</h3>
        <ul>
          <li>Crear y administrar tu cuenta de donante.</li>
          <li>Agendar, reprogramar y cancelar tus citas en los eventos y puntos de recolección.</li>
          <li>Enviarte confirmaciones y recordatorios de tus citas por correo electrónico.</li>
          <li>Registrar tus donaciones y mostrarte tu historial.</li>
          <li>Generar estadísticas de la campaña, siempre de forma agregada y sin identificarte.</li>
        </ul>

        <h3>Transferencia de datos</h3>
        <p>
          Tus datos no se venden ni se comparten con terceros. Solo podrán ser transferidos cuando lo requiera una autoridad competente
          conforme a la ley.
        </p>

        <h3>Derechos ARCO</h3>
        <p>
          Puedes solicitar el acceso, rectificación, cancelación u oposición al tratamiento de tus datos, así como revocar tu
          consentimiento, escribiendo a <b>privacidad@forthekids.org</b> con tu nombre completo y el correo con el que te registraste.
          Responderemos en un plazo máximo de 20 días hábiles.
        </p>

        <p className="tiny">Última actualización: 12 de septiembre de 2026.</p>
      </div>
      <div className="modal__actions">
        <Button variant="ghost" onClick={onClose}>
          Cerrar
        </Button>
        {onAceptar && <Button onClick={onAceptar}>Acepto el aviso</Button>}
      </div>
    </Modal>
  );
}

// ===== Módulo: Avisos emergentes =====
const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [items, setItems] = useState([]);
  const push = useCallback((tipo, titulo, texto) => {
    const id = Math.random().toString(36).slice(2);
    setItems((xs) => [
      ...xs,
      {
        id,
        tipo,
        titulo,
        texto,
      },
    ]);
    setTimeout(() => setItems((xs) => xs.filter((x) => x.id !== id)), 4200);
  }, []);
  const toast = useMemo(
    () => ({
      exito: (titulo, texto) => push('exito', titulo, texto),
      error: (titulo, texto) => push('error', titulo, texto),
      info: (titulo, texto) => push('info', titulo, texto),
    }),
    [push]
  );
  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {items.map((t) => (
          <Alert key={t.id} tipo={t.tipo} titulo={t.titulo} className="toast">
            {t.texto}
          </Alert>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);

// ===== Módulo: Marco de login y registro =====
export function AuthShell({ titulo, texto, children }) {
  return (
    <div className="auth">
      <aside className="auth__side">
        <Link to="/" className="auth__logo">
          <Logo height={44} />
        </Link>
        <div className="auth__copy">
          <h1
            className="h-display"
            style={{
              fontSize: 'clamp(1.9rem, 3vw, 2.6rem)',
            }}
          >
            {titulo}
          </h1>
          <p>{texto}</p>
        </div>
      </aside>
      <main className="auth__main" id="contenido">
        <div className="auth__card">
          <Link
            to="/"
            className="only-mobile"
            style={{
              marginBottom: 8,
            }}
          >
            <Logo height={40} />
          </Link>
          {children}
        </div>
      </main>
    </div>
  );
}
