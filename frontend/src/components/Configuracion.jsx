export default function Configuracion({ usuario }) {
  return (
    <div>
      <h2>Configuración</h2>
      <div className="tarjeta">
        <h3>Cuenta</h3>
        <p><strong>Nombre:</strong> {usuario.nombre}</p>
        <p><strong>Correo:</strong> {usuario.correo}</p>
        <p><strong>Rol:</strong> {usuario.rol}</p>
        <p style={{ fontSize: '0.85rem', color: 'var(--color-ink-soft)', marginTop: 12 }}>
          Más opciones de configuración (notificaciones, permisos de otros administradores, marca) llegarán en una
          próxima entrega.
        </p>
      </div>
    </div>
  );
}
