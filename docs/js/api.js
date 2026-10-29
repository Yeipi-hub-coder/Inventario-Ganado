/* ==========================================================================
   HDVganado · Cliente de la API REST + autenticación HTTP Basic
   Este es el ÚNICO lugar donde se define la dirección del backend.
   No existe ningún campo en la interfaz para cambiarla.
   ========================================================================== */
const API_BASE_URL = 'https://inventario-ganado.onrender.com';
const API_TIMEOUT_MS = 50000;
/* Solo para desarrollo: si es true, permite entrar aunque el backend NO exija credenciales
   (en ese caso el login no protege nada). Déjelo en false. */
const AUTH_ALLOW_OPEN_BACKEND = false;

class ApiError extends Error {
  constructor(message, { status = 0, kind = 'http', detail = null } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;   // 0 si no hubo respuesta del servidor
    this.kind = kind;       // 'http' | 'network' | 'timeout' | 'open' | 'unsupported'
    this.detail = detail;   // cuerpo original (solo para depuración en consola)
  }
}

/* ---------- Sesión (solo en esta pestaña, sessionStorage; nunca localStorage) ----------
   Se guarda el encabezado "Authorization: Basic …", no la contraseña en texto plano.
   Sigue siendo reversible: por eso se borra al cerrar sesión o al cerrar la pestaña. */
const Auth = (() => {
  const KEY = 'hdv.auth', USER = 'hdv.user', LOGIN_PAGE = 'pages/login.html';
  const root = document.body.dataset.root || '';
  const isLoginPage = document.body.dataset.page === 'login';
  const read = k => { try { return sessionStorage.getItem(k); } catch { return null; } };
  const write = (k, v) => { try { sessionStorage.setItem(k, v); } catch { /* sin almacenamiento */ } };

  const encode = (user, pass) => {
    let bin = '';
    new TextEncoder().encode(`${user}:${pass}`).forEach(b => { bin += String.fromCharCode(b); });
    return 'Basic ' + btoa(bin);
  };
  function redirectToLogin(reason, keepNext = true) {
    const file = location.pathname.split('/').pop() || 'index.html';
    const q = new URLSearchParams();
    if (keepNext && !isLoginPage) q.set('next', (root ? 'pages/' : '') + file + location.search);
    if (reason) q.set('motivo', reason);
    location.replace(root + LOGIN_PAGE + (q.toString() ? '?' + q : ''));
  }
  return {
    isLoginPage,
    header: () => read(KEY),
    isAuthenticated: () => !!read(KEY),
    username: () => read(USER) || '',
    encode,
    save(user, header) { write(KEY, header); write(USER, user); },
    clear() { try { sessionStorage.removeItem(KEY); sessionStorage.removeItem(USER); } catch { /* nada */ } },
    redirectToLogin
  };
})();

/* Guardia de acceso: sin sesión no se muestra ninguna pantalla privada. */
if (!Auth.isLoginPage && !Auth.isAuthenticated()) {
  document.documentElement.style.visibility = 'hidden';
  Auth.redirectToLogin();
}

const Api = (() => {
  const base = API_BASE_URL.replace(/\/+$/, '');

  const STATUS_TEXT = {
    400: 'La solicitud no es válida. Revise los datos ingresados.',
    401: 'Su sesión no es válida o expiró. Inicie sesión de nuevo.',
    403: 'No tiene permiso para realizar esta operación.',
    404: 'No se encontró lo que buscaba.',
    405: 'El servidor no admite esta operación.',
    409: 'La operación entra en conflicto con el estado actual del registro.',
    422: 'Los datos enviados no pudieron procesarse. Revíselos e intente de nuevo.',
    500: 'El servidor tuvo un problema interno. Intente de nuevo en unos minutos.',
    502: 'El servicio no está disponible en este momento.',
    503: 'El servicio no está disponible en este momento.'
  };

  function buildUrl(path, query) {
    const url = new URL(base + path);
    Object.entries(query || {}).forEach(([k, v]) => {
      if (v === undefined || v === null) return;
      const s = String(v).trim();
      if (s !== '') url.searchParams.append(k, s);   // los parámetros vacíos se omiten
    });
    return url.toString();
  }

  function serverMessage(data) {
    if (!data) return '';
    if (typeof data === 'string') return data.trim();
    if (Array.isArray(data.errors)) return data.errors.map(e => e.defaultMessage || e.message || '').filter(Boolean).join(' ');
    return String(data.message || data.mensaje || data.detail || '').trim();
  }
  const looksTechnical = s => /exception|\bat [\w.$]+\(|stacktrace|<html|org\.springframework|java\.|no message available/i.test(s);

  function toApiError(status, data) {
    const generic = STATUS_TEXT[status] || `El servidor respondió con un error (${status}).`;
    const msg = serverMessage(data);
    const usable = status < 500 && msg && msg.length <= 300 && !looksTechnical(msg);
    return new ApiError(usable ? msg : generic, { status, detail: data });
  }

  async function parseBody(res) {
    const text = await res.text();
    if (!text) return null;
    const ct = res.headers.get('Content-Type') || '';
    if (ct.includes('json') || /^\s*[\[{]/.test(text)) {
      try { return JSON.parse(text); } catch { /* se devuelve como texto */ }
    }
    return text;
  }

  async function doFetch(url, options) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), API_TIMEOUT_MS);
    try {
      return await fetch(url, { ...options, signal: ctrl.signal });
    } catch (err) {
      console.error('[HDVganado] Fallo de conexión:', url, err);
      const timeout = err.name === 'AbortError';
      throw new ApiError(
        timeout ? 'El servidor tardó demasiado en responder. Intente nuevamente.'
                : 'No se pudo conectar con el servidor. Revise su conexión a internet y que el servicio esté disponible.',
        { kind: timeout ? 'timeout' : 'network' });
    } finally { clearTimeout(timer); }
  }

  /** Si el backend responde 401 con una sesión iniciada, las credenciales ya no sirven. */
  function handleUnauthorized(res) {
    if (res.status === 401 && !Auth.isLoginPage) { Auth.clear(); Auth.redirectToLogin('expirada'); }
  }
  function requireSession() {
    if (!Auth.isLoginPage && !Auth.isAuthenticated()) throw new ApiError(STATUS_TEXT[401], { status: 401 });
  }

  async function request(method, path, { query, body } = {}) {
    requireSession();
    const headers = { Accept: 'application/json, text/plain;q=0.9, */*;q=0.5' };
    if (Auth.header()) headers.Authorization = Auth.header();
    const init = { method, headers };
    if (body !== undefined) { headers['Content-Type'] = 'application/json'; init.body = JSON.stringify(body); }
    const res = await doFetch(buildUrl(path, query), init);
    const data = await parseBody(res);
    if (!res.ok) {
      console.error(`[HDVganado] ${method} ${path} → ${res.status}`, data);
      handleUnauthorized(res);
      throw toApiError(res.status, data);
    }
    return data;
  }

  function filenameFrom(header) {
    if (!header) return null;
    const m = /filename\*=UTF-8''([^;]+)/i.exec(header) || /filename="?([^";]+)"?/i.exec(header);
    if (!m) return null;
    let name = m[1];
    try { name = decodeURIComponent(name); } catch { /* se usa tal cual */ }
    return name.replace(/[\\/:*?"<>|]/g, '_');
  }

  /** Descarga el CSV generado por el backend (parámetro formato=xlsx). */
  async function downloadCsv(path, query, fallbackName = 'reporte.xlsx') {
    requireSession();
    const headers = { Accept: 'text/xlsx, application/octet-stream;q=0.9, */*;q=0.5' };
    if (Auth.header()) headers.Authorization = Auth.header();
    const res = await doFetch(buildUrl(path, { ...query, formato: 'xlsx' }), { method: 'GET', headers });
    if (!res.ok) { handleUnauthorized(res); throw toApiError(res.status, await parseBody(res)); }
    const ct = res.headers.get('Content-Type') || '';
    if (/json|html/i.test(ct)) {
      throw new ApiError('Esta consulta no está disponible en formato xlsx en el servidor.', { status: res.status });
    }
    const blob = await res.blob();
    if (!blob.size) throw new ApiError('El servidor devolvió un archivo vacío.', { status: res.status });
    const name = filenameFrom(res.headers.get('Content-Disposition')) || fallbackName;
    const objUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = objUrl; a.download = name;
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(objUrl), 1500);
    return name;
  }

  /** Comprueba si el backend responde (cualquier respuesta HTTP significa que está alcanzable). */
  async function ping() {
    if (!Auth.isAuthenticated()) return { reachable: false, status: 0 };
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 6000);
    try {
      const res = await fetch(buildUrl('/api/animales'), { method: 'HEAD', headers: { Authorization: Auth.header() }, signal: ctrl.signal });
      handleUnauthorized(res);
      return { reachable: true, status: res.status };
    } catch { return { reachable: false, status: 0 }; }
    finally { clearTimeout(timer); }
  }

  /* ---------- Inicio y cierre de sesión (HTTP Basic) ----------
     No existe un endpoint de login: se verifica el usuario y la contraseña pidiendo un
     recurso protegido que ya existe (HEAD /api/animales). Solo se guarda la sesión si el
     backend lo acepta; si responde 401, las credenciales son incorrectas. */
  async function login(user, pass) {
    const url = buildUrl('/api/animales');
    const isRedirect = r => r.type === 'opaqueredirect' || (r.status >= 300 && r.status < 400);
    const unsupported = () => new ApiError('El backend usa un formulario de inicio de sesión propio (redirige a una página de login). Este frontend solo admite HTTP Basic.', { kind: 'unsupported' });
    const attempt = async headers => {
      let res = await doFetch(url, { method: 'HEAD', headers, redirect: 'manual' });
      if (res.status === 405) res = await doFetch(url, { method: 'GET', headers: { ...headers, Accept: 'application/json' }, redirect: 'manual' });
      return res;
    };
    try {
      // 1) Sin credenciales: el backend debe exigirlas; si no, el login no protegería nada.
      const anon = await attempt({});
      if (isRedirect(anon)) throw unsupported();
      if (anon.ok && !AUTH_ALLOW_OPEN_BACKEND) {
        throw new ApiError('El backend respondió sin pedir usuario ni contraseña, así que no está protegido. Un inicio de sesión solo en el frontend no protegería nada: la autenticación debe exigirla el backend.', { status: anon.status, kind: 'open' });
      }
      if (!anon.ok && anon.status !== 401 && anon.status !== 403) throw toApiError(anon.status, null);
      // 2) Con credenciales.
      const header = Auth.encode(user, pass);
      const res = await attempt({ Authorization: header });
      if (isRedirect(res)) throw unsupported();
      if (res.status === 401) throw new ApiError('Usuario o contraseña incorrectos.', { status: 401 });
      if (res.status === 403) throw new ApiError('Este usuario no tiene permiso para usar la aplicación.', { status: 403 });
      if (!res.ok) throw toApiError(res.status, null);
      Auth.save(user, header);
    } catch (e) {
      if (e instanceof ApiError && e.kind === 'network') {
        throw new ApiError('No se pudo conectar con el servidor. Compruebe que el backend esté encendido y que su configuración CORS permita el origen de esta página y el encabezado Authorization.', { kind: 'network' });
      }
      throw e;
    }
  }
  function logout() { Auth.clear(); Auth.redirectToLogin('cerrada', false); }

  return {
    baseUrl: base,
    get: (path, query) => request('GET', path, { query }),
    post: (path, body) => request('POST', path, { body }),
    patch: (path, body) => request('PATCH', path, { body }),
    downloadCsv, ping, login, logout,
    isAuthenticated: Auth.isAuthenticated,
    username: Auth.username
  };
})();
