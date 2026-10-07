import React, { useEffect, useRef, useState } from 'react';
import { BrowserRouter, Link, Navigate, NavLink, Outlet, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import {
  Bell,
  CalendarClock,
  CalendarDays,
  CalendarHeart,
  ChevronDown,
  HandHeart,
  Home,
  LayoutDashboard,
  LogOut,
  MapPin,
  MoreHorizontal,
  Search,
  Settings,
  Sparkles,
  User,
  Users,
} from 'lucide-react';
import ReactDOM from 'react-dom/client';
import { api, AuthProvider, useAuth } from './core';
import { BeeHeart, EmptyState, Logo, ToastProvider } from './ui';
import { EventoDetalle, Eventos, Landing, Login, MisCitas, MisDonaciones, Perfil, Puntos, Registro } from './paginas-sitio';
import {
  Citas,
  Configuracion,
  Dashboard,
  Donaciones,
  Donantes,
  EventoForm,
  EventosAdmin,
  Notificaciones,
  PuntosAdmin,
} from './paginas-admin';
import './estilos.css';

// ===== Módulo: Layout público =====
const LINKS_PUBLICOS = [
  {
    to: '/',
    label: 'Inicio',
    end: true,
  },
  {
    to: '/eventos',
    label: 'Eventos',
  },
  {
    to: '/puntos',
    label: 'Puntos de recolección',
  },
  {
    to: '/mis-donaciones',
    label: 'Mi historial',
  },
];

const TABS_DONANTE = [
  {
    to: '/',
    label: 'Inicio',
    icon: Home,
    end: true,
  },
  {
    to: '/eventos',
    label: 'Eventos',
    icon: Sparkles,
  },
  {
    to: '/mis-citas',
    label: 'Mi cita',
    icon: CalendarHeart,
  },
  {
    to: '/mis-donaciones',
    label: 'Donaciones',
    icon: HandHeart,
  },
  {
    to: '/perfil',
    label: 'Perfil',
    icon: User,
  },
];

function UserMenu() {
  const { usuario, logout, esAdmin } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const navigate = useNavigate();
  useEffect(() => {
    const cerrar = (e) => !ref.current?.contains(e.target) && setOpen(false);
    document.addEventListener('mousedown', cerrar);
    return () => document.removeEventListener('mousedown', cerrar);
  }, []);
  return (
    <div className="user-menu" ref={ref}>
      <button className="btn btn--ghost btn--sm" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <span
          className="avatar"
          style={{
            width: 24,
            height: 24,
            fontSize: '0.65rem',
          }}
        >
          {usuario.nombre[0]}
        </span>
        {usuario.nombre}
        <ChevronDown size={14} />
      </button>
      {open && (
        <div className="user-menu__panel" onClick={() => setOpen(false)}>
          {esAdmin && (
            <Link to="/admin">
              <LayoutDashboard size={16} /> Panel admin
            </Link>
          )}
          <Link to="/mis-citas">
            <CalendarHeart size={16} /> Mis citas
          </Link>
          <Link to="/mis-donaciones">
            <HandHeart size={16} /> Mis donaciones
          </Link>
          <button
            onClick={() => {
              logout();
              navigate('/');
            }}
          >
            <LogOut size={16} /> Cerrar sesión
          </button>
        </div>
      )}
    </div>
  );
}

export function PublicLayout() {
  const { usuario } = useAuth();
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return (
    <>
      <a href="#contenido" className="sr-only">
        Saltar al contenido
      </a>
      <header className="topnav">
        <div className="container topnav__inner">
          <Link to="/" aria-label="For The Kids, inicio">
            <Logo height={46} />
          </Link>
          <nav className="topnav__links" aria-label="Principal">
            {LINKS_PUBLICOS.map((l) => (
              <NavLink key={l.to} to={l.to} end={l.end} className="topnav__link">
                {l.label}
              </NavLink>
            ))}
          </nav>
          <div
            className="topnav__actions"
            style={{
              marginLeft: 'auto',
            }}
          >
            {usuario ? (
              <span className="hide-mobile">
                <UserMenu />
              </span>
            ) : (
              <Link to="/login" className="btn btn--ghost btn--sm hide-mobile">
                Iniciar sesión
              </Link>
            )}
            <Link to="/eventos" className="btn btn--primary btn--sm">
              <CalendarHeart size={15} /> Agendar donación
            </Link>
          </div>
        </div>
      </header>

      <main id="contenido">
        <Outlet />
      </main>

      <footer className="footer">
        <div className="container row between">
          <Logo />
          <span>Proyecto académico · Equipo Tlaxcala · CUCEI {new Date().getFullYear()}</span>
        </div>
      </footer>

      <nav className="tabbar" aria-label="Navegación inferior">
        {TABS_DONANTE.map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end}>
            <Icon size={20} aria-hidden />
            {label}
          </NavLink>
        ))}
      </nav>
    </>
  );
}

// ===== Módulo: Layout administrativo =====
const NAV_ADMIN = [
  {
    to: '/admin',
    label: 'Inicio',
    icon: Home,
    end: true,
  },
  {
    to: '/admin/eventos',
    label: 'Eventos',
    icon: CalendarDays,
  },
  {
    to: '/admin/puntos',
    label: 'Puntos de recolección',
    icon: MapPin,
  },
  {
    to: '/admin/donantes',
    label: 'Donantes',
    icon: Users,
  },
  {
    to: '/admin/citas',
    label: 'Citas',
    icon: CalendarClock,
  },
  {
    to: '/admin/donaciones',
    label: 'Donaciones',
    icon: HandHeart,
  },
  {
    to: '/admin/notificaciones',
    label: 'Notificaciones',
    icon: Bell,
    badge: true,
  },
  {
    to: '/admin/configuracion',
    label: 'Configuración',
    icon: Settings,
  },
];

const TABS_ADMIN = [
  {
    to: '/admin',
    label: 'Inicio',
    icon: Home,
    end: true,
  },
  {
    to: '/admin/eventos',
    label: 'Eventos',
    icon: CalendarDays,
  },
  {
    to: '/admin/donantes',
    label: 'Donantes',
    icon: Users,
  },
  {
    to: '/admin/donaciones',
    label: 'Donaciones',
    icon: HandHeart,
  },
];

export function AdminLayout() {
  const { usuario, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [noLeidas, setNoLeidas] = useState(0);
  const [mas, setMas] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  useEffect(() => {
    setMas(false);
    window.scrollTo(0, 0);
    api
      .get('/reportes/notificaciones?limite=1')
      .then((r) => setNoLeidas(r.noLeidas))
      .catch(() => {});
  }, [pathname]);
  const buscar = (e) => {
    e.preventDefault();
    if (busqueda.trim()) navigate(`/admin/citas?q=${encodeURIComponent(busqueda.trim())}`);
  };
  const salir = () => {
    logout();
    navigate('/login');
  };
  return (
    <div className="admin">
      <aside className="sidebar">
        <Link to="/admin">
          <Logo dark />
        </Link>
        <nav aria-label="Panel">
          {NAV_ADMIN.map(({ to, label, icon: Icon, end, badge }) => (
            <NavLink key={to} to={to} end={end} className="side-link">
              <Icon size={18} aria-hidden /> {label}
              {badge && noLeidas > 0 && <span className="count">{noLeidas}</span>}
            </NavLink>
          ))}
        </nav>
        <button className="side-link side-link--salir" onClick={salir}>
          <LogOut size={18} aria-hidden /> Cerrar sesión
        </button>
      </aside>

      <div className="admin__main">
        <header className="admin__top">
          <form className="admin__search input-icon" onSubmit={buscar} role="search">
            <Search size={17} />
            <input
              className="input"
              placeholder="Buscar donantes, eventos, citas..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              aria-label="Buscar"
            />
          </form>
          <div
            className="row"
            style={{
              marginLeft: 'auto',
            }}
          >
            <Link to="/admin/notificaciones" className="icon-btn" aria-label="Notificaciones">
              <Bell size={18} />
              {noLeidas > 0 && <span className="dot" />}
            </Link>
            <div className="who">
              <span
                className="avatar"
                style={{
                  background: 'var(--noche)',
                  color: '#fff',
                }}
              >
                {usuario?.nombre?.[0]}
                {usuario?.apellido?.[0]}
              </span>
              <span
                className="hide-mobile"
                style={{
                  fontWeight: 600,
                  fontSize: '0.9rem',
                }}
              >
                {usuario?.nombre} {usuario?.apellido}
              </span>
            </div>
          </div>
        </header>

        <header className="admin-mtop">
          <Logo dark />
          <div
            className="row"
            style={{
              '--gap': '8px',
            }}
          >
            <Link to="/admin/citas" className="icon-btn" aria-label="Buscar">
              <Search size={18} />
            </Link>
            <Link to="/admin/notificaciones" className="icon-btn" aria-label="Notificaciones">
              <Bell size={18} />
              {noLeidas > 0 && <span className="dot" />}
            </Link>
          </div>
        </header>

        <main className="admin__content" id="contenido">
          <Outlet />
        </main>
      </div>

      {mas && (
        <div className="more-sheet" role="menu">
          {NAV_ADMIN.filter((n) => !TABS_ADMIN.some((t) => t.to === n.to)).map(({ to, label, icon: Icon }) => (
            <Link key={to} to={to} role="menuitem">
              <Icon size={18} /> {label}
            </Link>
          ))}
          <Link to="/" role="menuitem">
            <Home size={18} /> Ver sitio público
          </Link>
          <a
            href="#salir"
            role="menuitem"
            onClick={(e) => {
              e.preventDefault();
              salir();
            }}
          >
            <LogOut size={18} /> Cerrar sesión
          </a>
        </div>
      )}

      <nav className="tabbar" aria-label="Navegación inferior">
        {TABS_ADMIN.map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end}>
            <Icon size={20} aria-hidden /> {label}
          </NavLink>
        ))}
        <a
          href="#mas"
          className={mas ? 'active' : ''}
          onClick={(e) => {
            e.preventDefault();
            setMas((m) => !m);
          }}
          aria-expanded={mas}
        >
          <MoreHorizontal size={20} aria-hidden /> Más
        </a>
      </nav>
    </div>
  );
}

// ===== Módulo: Rutas protegidas =====
function Cargando() {
  return (
    <div
      style={{
        minHeight: '60vh',
        display: 'grid',
        placeItems: 'center',
      }}
    >
      <span className="muted">Cargando…</span>
    </div>
  );
}

export function RequireAuth() {
  const { usuario, cargando } = useAuth();
  const location = useLocation();
  if (cargando) return <Cargando />;
  if (!usuario)
    return (
      <Navigate
        to="/login"
        replace
        state={{
          from: location.pathname,
        }}
      />
    );
  return <Outlet />;
}

export function RequireAdmin() {
  const { usuario, cargando, esAdmin } = useAuth();
  if (cargando) return <Cargando />;
  if (!usuario)
    return (
      <Navigate
        to="/login"
        replace
        state={{
          from: '/admin',
        }}
      />
    );
  if (!esAdmin) return <Navigate to="/" replace />;
  return <Outlet />;
}

// ===== Módulo: Rutas =====
function NoEncontrado() {
  return (
    <div className="container page">
      <EmptyState ilustracion={<BeeHeart />} titulo="Esta página no existe" texto="Revisa el enlace o vuelve al inicio.">
        <Link to="/" className="btn btn--primary btn--sm">
          Ir al inicio
        </Link>
      </EmptyState>
    </div>
  );
}

function SoloInvitados({ children }) {
  const { usuario, cargando } = useAuth();
  if (cargando) return null;
  if (usuario) return <Navigate to={usuario.rol === 'administrador' ? '/admin' : '/mis-citas'} replace />;
  return children;
}

export function App() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route index element={<Landing />} />
        <Route path="eventos" element={<Eventos />} />
        <Route path="eventos/:id" element={<EventoDetalle />} />
        <Route path="puntos" element={<Puntos />} />
        <Route element={<RequireAuth />}>
          <Route path="mis-citas" element={<MisCitas />} />
          <Route path="mis-donaciones" element={<MisDonaciones />} />
          <Route path="perfil" element={<Perfil />} />
        </Route>
        <Route path="*" element={<NoEncontrado />} />
      </Route>

      <Route
        path="login"
        element={
          <SoloInvitados>
            <Login />
          </SoloInvitados>
        }
      />
      <Route
        path="registro"
        element={
          <SoloInvitados>
            <Registro />
          </SoloInvitados>
        }
      />

      <Route path="admin" element={<RequireAdmin />}>
        <Route element={<AdminLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="eventos" element={<EventosAdmin />} />
          <Route path="eventos/nuevo" element={<EventoForm />} />
          <Route path="eventos/:id" element={<EventoForm />} />
          <Route path="puntos" element={<PuntosAdmin />} />
          <Route path="donantes" element={<Donantes />} />
          <Route path="citas" element={<Citas />} />
          <Route path="donaciones" element={<Donaciones />} />
          <Route path="notificaciones" element={<Notificaciones />} />
          <Route path="configuracion" element={<Configuracion />} />
        </Route>
      </Route>
    </Routes>
  );
}

// ===== Módulo: Arranque =====
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <App />
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
