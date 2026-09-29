import { useEffect, useState } from 'react';
import Login from './components/Login';
import Registro from './components/Registro';
import Eventos from './components/Eventos';
import Puntos from './components/Puntos';
import MisCitas from './components/MisCitas';
import Donaciones from './components/Donaciones';
import CitasAdmin from './components/CitasAdmin';
import Usuarios from './components/Usuarios';
import Reportes from './components/Reportes';
import Dashboard from './components/Dashboard';
import Landing from './components/Landing';
import Configuracion from './components/Configuracion';
import AdminLayout from './components/AdminLayout';
import PublicLayout from './components/PublicLayout';
import Marca from './components/Marca';
import { api } from './api';

export default function App() {
  const [token, setToken] = useState(() => localStorage.getItem('token') || '');
  const [usuario, setUsuario] = useState(() => {
    const guardado = localStorage.getItem('usuario');
    return guardado ? JSON.parse(guardado) : null;
  });
  const [vista, setVista] = useState('login');
  const [senalCitas, setSenalCitas] = useState(0);
  const [conteoNotificaciones, setConteoNotificaciones] = useState(0);

  useEffect(() => {
    if (token && usuario) setVista('inicio');
  }, []);

  // Solo para el admin: badge de la campanita con el número de solicitudes
  // de cancelación pendientes de revisar.
  useEffect(() => {
    if (!token || usuario?.rol !== 'admin') return;
    api.listarSolicitudesCancelacion(token)
      .then((datos) => setConteoNotificaciones(datos.length))
      .catch(() => {});
  }, [token, usuario, vista]);

  function iniciarSesion(nuevoToken, nuevoUsuario) {
    localStorage.setItem('token', nuevoToken);
    localStorage.setItem('usuario', JSON.stringify(nuevoUsuario));
    setToken(nuevoToken);
    setUsuario(nuevoUsuario);
    setVista('inicio');
  }

  function cerrarSesion() {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    setToken('');
    setUsuario(null);
    setVista('login');
  }

  if (!token || !usuario) {
    return (
      <div className="contenedor pantalla-acceso">
        <div className="marca" style={{ justifyContent: 'center' }}>
          <Marca variante="completo" alto={54} />
        </div>
        {vista === 'registro' ? (
          <Registro irALogin={() => setVista('login')} />
        ) : (
          <Login alIniciarSesion={iniciarSesion} irARegistro={() => setVista('registro')} />
        )}
      </div>
    );
  }

  if (usuario.rol === 'admin') {
    return (
      <AdminLayout
        usuario={usuario}
        vista={vista}
        setVista={setVista}
        cerrarSesion={cerrarSesion}
        conteoNotificaciones={conteoNotificaciones}
      >
        {vista === 'inicio' && <Dashboard token={token} irA={setVista} />}
        {vista === 'eventos' && <Eventos token={token} usuario={usuario} />}
        {vista === 'puntos' && <Puntos token={token} usuario={usuario} />}
        {vista === 'donantes' && <Usuarios token={token} soloDonantes />}
        {vista === 'citas' && <CitasAdmin token={token} />}
        {vista === 'donaciones' && <Donaciones token={token} usuario={usuario} />}
        {vista === 'reportes' && <Reportes token={token} />}
        {vista === 'usuarios' && <Usuarios token={token} />}
        {vista === 'configuracion' && <Configuracion usuario={usuario} />}
      </AdminLayout>
    );
  }

  return (
    <PublicLayout usuario={usuario} vista={vista} setVista={setVista} cerrarSesion={cerrarSesion}>
      {vista === 'inicio' && (
        <Landing token={token} irA={setVista} refrescarCitas={() => setSenalCitas((n) => n + 1)} />
      )}
      {vista === 'eventos' && (
        <div className="contenedor">
          <Eventos token={token} usuario={usuario} refrescarCitas={() => setSenalCitas((n) => n + 1)} />
        </div>
      )}
      {vista === 'puntos' && (
        <div className="contenedor">
          <Puntos token={token} usuario={usuario} />
        </div>
      )}
      {vista === 'mis-citas' && (
        <div className="contenedor">
          <MisCitas token={token} recargarSenal={senalCitas} />
          <Donaciones token={token} usuario={usuario} />
        </div>
      )}
    </PublicLayout>
  );
}
