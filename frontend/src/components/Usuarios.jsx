import { useEffect, useState } from 'react';
import { api } from '../api';

// Se reutiliza para dos pantallas del sidebar: "Donantes" (soloDonantes=true)
// y "Usuarios" (todos, incluye administradores).
export default function Usuarios({ token, soloDonantes = false }) {
  const [usuarios, setUsuarios] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    api.listarUsuarios(token).then(setUsuarios).catch((err) => setError(err.message));
  }, [token]);

  const filtrados = soloDonantes ? usuarios.filter((u) => u.rol === 'donante') : usuarios;

  return (
    <div>
      <h2>{soloDonantes ? 'Donantes' : 'Usuarios'}</h2>
      {error && <p className="error">{error}</p>}

      <div className="panel">
        <div className="tabla-wrap">
          <table className="tabla">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Correo</th>
                <th>Teléfono</th>
                {!soloDonantes && <th>Rol</th>}
                <th>Registrado</th>
              </tr>
            </thead>
            <tbody>
              {filtrados.length === 0 && (
                <tr><td colSpan={soloDonantes ? 4 : 5} className="vacio">
                  {soloDonantes ? 'Todavía no hay donantes registrados.' : 'Todavía no hay usuarios registrados.'}
                </td></tr>
              )}
              {filtrados.map((u) => (
                <tr key={u.id}>
                  <td>{u.nombre}</td>
                  <td>{u.correo}</td>
                  <td>{u.telefono}</td>
                  {!soloDonantes && (
                    <td><span className={`distintivo ${u.rol === 'admin' ? 'atendida' : 'agendada'}`}>{u.rol}</span></td>
                  )}
                  <td>{new Date(u.creado_en).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
