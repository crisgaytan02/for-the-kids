// variante="icono": solo el circulo (para espacios chicos, como la barra lateral).
// variante="completo": el logo entero con el texto "FOR THE KIDS" ya integrado
// (no pongas un <h1> aparte al lado si usas esta variante).
export default function Marca({ tamano = 30, alto, variante = 'icono' }) {
  if (variante === 'completo') {
    return (
      <img
        src="/logo.png"
        alt="For The Kids"
        style={{ height: alto || tamano * 1.3, width: 'auto', display: 'block' }}
      />
    );
  }
  return (
    <img
      src="/logo-icono.png"
      alt="For The Kids"
      style={{ height: tamano, width: tamano, objectFit: 'contain', display: 'block' }}
    />
  );
}
