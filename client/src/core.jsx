import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

// ===== Módulo: Cliente API =====
const TOKEN_KEY = 'ftk_token';

export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (t) => localStorage.setItem(TOKEN_KEY, t),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

export class ApiError extends Error {
  constructor(status, message, data) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

async function request(method, url, body, opts = {}) {
  const headers = {};
  const token = tokenStore.get();
  if (token) headers.Authorization = `Bearer ${token}`;
  const esForm = body instanceof FormData;
  if (body && !esForm) headers['Content-Type'] = 'application/json';
  const res = await fetch(`/api${url}`, {
    method,
    headers,
    body: body ? (esForm ? body : JSON.stringify(body)) : undefined,
  });
  if (opts.raw) {
    if (!res.ok) {
      const err = await res.json().catch(() => null);
      throw new ApiError(res.status, err?.error || 'No se pudo descargar el archivo.');
    }
    return res;
  }
  const data = res.status === 204 ? null : await res.json().catch(() => null);
  if (!res.ok) {
    if (res.status === 401 && token) {
      tokenStore.clear();
      window.dispatchEvent(new Event('ftk:logout'));
    }
    throw new ApiError(res.status, data?.error || 'No pudimos completar la acción.', data);
  }
  return data;
}

export const api = {
  get: (url, opts) => request('GET', url, null, opts),
  post: (url, body) => request('POST', url, body),
  put: (url, body) => request('PUT', url, body),
  patch: (url, body) => request('PATCH', url, body),
  del: (url) => request('DELETE', url),
};

// ===== Módulo: Sesión =====
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null);
  const [cargando, setCargando] = useState(Boolean(tokenStore.get()));
  useEffect(() => {
    if (!tokenStore.get()) return;
    api
      .get('/auth/yo')
      .then(({ usuario }) => setUsuario(usuario))
      .catch(() => tokenStore.clear())
      .finally(() => setCargando(false));
  }, []);
  useEffect(() => {
    const salir = () => setUsuario(null);
    window.addEventListener('ftk:logout', salir);
    return () => window.removeEventListener('ftk:logout', salir);
  }, []);
  const entrar = useCallback(({ token, usuario }) => {
    tokenStore.set(token);
    setUsuario(usuario);
  }, []);
  const login = useCallback(
    async (correo, password) => {
      const data = await api.post('/auth/login', {
        correo,
        password,
      });
      entrar(data);
      return data.usuario;
    },
    [entrar]
  );
  const registro = useCallback(
    async (datos) => {
      const data = await api.post('/auth/registro', datos);
      entrar(data);
      return data.usuario;
    },
    [entrar]
  );
  const logout = useCallback(() => {
    tokenStore.clear();
    setUsuario(null);
  }, []);
  const value = useMemo(
    () => ({
      usuario,
      cargando,
      login,
      registro,
      logout,
      esAdmin: usuario?.rol === 'administrador',
    }),
    [usuario, cargando, login, registro, logout]
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);

// ===== Módulo: Carga de datos =====
export function useFetch(url, { skip = false } = {}) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [cargando, setCargando] = useState(!skip);
  const recargar = useCallback(async () => {
    if (!url) return;
    setCargando(true);
    setError(null);
    try {
      setData(await api.get(url));
    } catch (e) {
      setError(e);
    } finally {
      setCargando(false);
    }
  }, [url]);
  useEffect(() => {
    if (!skip) recargar();
  }, [recargar, skip]);
  return {
    data,
    error,
    cargando,
    recargar,
    setData,
  };
}

// ===== Módulo: Formatos de fecha y número =====
const MESES_CORTOS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

const MESES_LARGOS = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
];

const DIAS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

export const parseFecha = (iso) => {
  const [y, m, d] = String(iso).slice(0, 10).split('-').map(Number);
  return new Date(y, m - 1, d);
};

export const hora12 = (hhmm) => {
  if (!hhmm) return '';
  const [h, m] = hhmm.split(':').map(Number);
  const sufijo = h >= 12 ? 'p. m.' : 'a. m.';
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${sufijo}`;
};

export const fechaEtiqueta = (iso, hhmm) => {
  const d = parseFecha(iso);
  const base = `${String(d.getDate()).padStart(2, '0')} ${MESES_CORTOS[d.getMonth()].toUpperCase()}`;
  return hhmm ? `${base} · ${hora12(hhmm)}` : base;
};

export const fechaCorta = (iso) => {
  const d = parseFecha(iso);
  return `${DIAS[d.getDay()]}, ${d.getDate()} ${MESES_CORTOS[d.getMonth()]}`;
};

export const fechaTabla = (iso) => {
  const d = parseFecha(iso);
  return `${String(d.getDate()).padStart(2, '0')} ${MESES_CORTOS[d.getMonth()]} ${d.getFullYear()}`;
};

export const fechaLarga = (date = new Date()) => {
  const txt = date.toLocaleDateString('es-MX', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  return txt.charAt(0).toUpperCase() + txt.slice(1);
};

export const mesLargo = (i) => MESES_LARGOS[i];

export const mesCorto = (i) => MESES_CORTOS[i];

export const haceCuanto = (ts) => {
  const s = Math.max(1, Math.round((Date.now() - new Date(ts).getTime()) / 1000));
  if (s < 60) return 'Hace un momento';
  const m = Math.round(s / 60);
  if (m < 60) return `Hace ${m} ${m === 1 ? 'minuto' : 'minutos'}`;
  const h = Math.round(m / 60);
  if (h < 24) return `Hace ${h} ${h === 1 ? 'hora' : 'horas'}`;
  const d = Math.round(h / 24);
  return `Hace ${d} ${d === 1 ? 'día' : 'días'}`;
};

export const numero = (n) => Number(n || 0).toLocaleString('es-MX');

export const iniciales = (nombre = '', apellido = '') => `${nombre.trim()[0] || ''}${apellido.trim()[0] || ''}`.toUpperCase();

export const cantidadDonacion = (d) => {
  const n = Number(d.largo_cm);
  return `${Number.isInteger(n) ? n : n.toFixed(1)} cm de cabello`;
};

export const diaRelativo = (iso, hhmm) => {
  const d = parseFecha(iso);
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const diff = Math.round((d - hoy) / 86400000);
  const pre = diff === 0 ? 'Hoy' : diff === 1 ? 'Mañana' : fechaTabla(iso).slice(0, 6);
  return `${pre} · ${hhmm}`;
};
