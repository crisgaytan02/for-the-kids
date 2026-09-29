import Marca from './Marca';

const NAV = [
  { id: 'inicio', etiqueta: 'Inicio', img: '/icons/home.png' },
  { id: 'eventos', etiqueta: 'Eventos', img: '/icons/calendar.png' },
  { id: 'puntos', etiqueta: 'Puntos de recolección', img: '/icons/pin.png' },
  { id: 'mis-citas', etiqueta: 'Mi historial', img: '/icons/history.png' },
];

export default function PublicLayout({ usuario, vista, setVista, cerrarSesion, children }) {
  return (
    <div className="public-shell">
      <header className="public-topbar">
        <div className="marca">
          <Marca variante="completo" alto={36} />
        </div>

        <nav className="public-nav">
          {NAV.map((item) => (
            <button
              key={item.id}
              className={vista === item.id ? 'activo' : ''}
              onClick={() => setVista(item.id)}
              style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <span className="icono-img" style={{ width: 15, height: 15, WebkitMaskImage: `url(${item.img})`, maskImage: `url(${item.img})` }} />
              {item.etiqueta}
            </button>
          ))}
        </nav>

        <div className="public-topbar-derecha">
          <button className="boton-amber" onClick={() => setVista('eventos')}>
            Agendar donación
          </button>
          <div className="admin-usuario">
            <div className="admin-avatar">{usuario.nombre?.[0]?.toUpperCase() || 'D'}</div>
            <div className="admin-usuario-info">
              <strong>{usuario.nombre}</strong>
              <button className="enlace" style={{ fontSize: '0.72rem' }} onClick={cerrarSesion}>
                Cerrar sesión
              </button>
            </div>
          </div>
        </div>
      </header>

      <main>{children}</main>
    </div>
  );
}
