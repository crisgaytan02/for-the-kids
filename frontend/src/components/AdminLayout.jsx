import Marca from './Marca';

const NAV = [
  { id: 'inicio', img: '/icons/home.png', etiqueta: 'Inicio' },
  { id: 'eventos', img: '/icons/calendar.png', etiqueta: 'Eventos' },
  { id: 'puntos', img: '/icons/pin.png', etiqueta: 'Puntos de recolección' },
  { id: 'donantes', icono: '🧑‍🤝‍🧑', etiqueta: 'Donantes' },
  { id: 'citas', img: '/icons/clock.png', etiqueta: 'Citas' },
  { id: 'donaciones', icono: '💛', etiqueta: 'Donaciones' },
  { id: 'reportes', img: '/icons/history.png', etiqueta: 'Reportes' },
  { id: 'usuarios', icono: '👤', etiqueta: 'Usuarios' },
  { id: 'configuracion', icono: '⚙️', etiqueta: 'Configuración' },
];

function iniciales(nombre = '') {
  return nombre
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');
}

export default function AdminLayout({ usuario, vista, setVista, cerrarSesion, conteoNotificaciones = 0, children }) {
  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <div className="marca-sidebar">
          <Marca tamano={30} />
          <div className="marca-sidebar-textos">
            <div className="marca-sidebar-titulo">FOR THE KIDS</div>
            <div className="marca-sidebar-sub">Sistema de Gestión · Campaña de Donación de Cabello</div>
          </div>
        </div>

        <nav className="admin-nav">
          {NAV.map((item) => (
            <button
              key={item.id}
              className={vista === item.id ? 'activo' : ''}
              onClick={() => setVista(item.id)}
            >
              {item.img ? (
                <span className="icono-img" style={{ WebkitMaskImage: `url(${item.img})`, maskImage: `url(${item.img})` }} />
              ) : (
                <span className="icono">{item.icono}</span>
              )}
              {item.etiqueta}
            </button>
          ))}
        </nav>

        <div className="admin-sidebar-pie">
          <button onClick={cerrarSesion}>↩ Cerrar sesión</button>
        </div>
      </aside>

      <div className="admin-main">
        <header className="admin-topbar">
          <div className="admin-buscador">
            🔍 <span>Buscar donantes, eventos, citas…</span>
          </div>
          <div className="admin-topbar-derecha">
            <button
              className="admin-campana"
              onClick={() => setVista('citas')}
              title="Solicitudes de cancelación pendientes"
            >
              🔔
              {conteoNotificaciones > 0 && <span className="conteo">{conteoNotificaciones}</span>}
            </button>
            <div className="admin-usuario">
              <div className="admin-avatar">{iniciales(usuario.nombre) || 'AD'}</div>
              <div className="admin-usuario-info">
                <strong>{usuario.nombre}</strong>
                <span>Administrador</span>
              </div>
            </div>
          </div>
        </header>

        <main className="admin-contenido">{children}</main>
      </div>
    </div>
  );
}
