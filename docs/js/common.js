'use strict';
/* ==========================================================================
   HDVganado · Utilidades compartidas: layout, formularios, tablas, avisos
   ========================================================================== */
const ROOT = document.body.dataset.root || '';
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const enc = encodeURIComponent;
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const isEmpty = v => v === undefined || v === null || String(v).trim() === '';
const dash = v => isEmpty(v) ? '—' : esc(v);
function pageUrl(name, params) {
  const q = params ? '?' + new URLSearchParams(params) : '';
  return `${ROOT}pages/${name}.html${q}`;
}

/* ---------- Datos: lectura tolerante a mayúsculas/minúsculas ---------- */
function val(a, k) {
  if (!a || typeof a !== 'object') return undefined;
  if (k in a) return a[k];
  const l = k.toLowerCase();
  for (const key in a) if (key.toLowerCase() === l) return a[key];
  return undefined;
}
function asArray(d) {
  if (Array.isArray(d)) return d;
  if (d && Array.isArray(d.content)) return d.content;
  return d ? [d] : [];
}
function normalizeAnimal(d) {
  if (Array.isArray(d)) {
    if (!d.length) return null;
    return d.reduce((a, b) => Number(val(b, 'codigo1')) > Number(val(a, 'codigo1')) ? b : a);
  }
  return d && typeof d === 'object' ? d : null;
}
const isActive = a => String(val(a, 'estaEnFinca') || '').toUpperCase() === 'SI' && isEmpty(val(a, 'vendido'));
function estadoInfo(a) {
  const v = val(a, 'vendido');
  if (!isEmpty(v)) return { text: String(v), cls: /muerte/i.test(v) ? 'danger' : 'warn' };
  if (String(val(a, 'estaEnFinca') || '').toUpperCase() === 'SI') return { text: 'En la finca', cls: 'ok' };
  return { text: 'Fuera de la finca', cls: 'muted' };
}

/* ---------- Fechas ---------- */
function isoFromArray(v) {
  if (!Array.isArray(v)) return v;
  const p = (n, l = 2) => String(n).padStart(l, '0');
  let s = `${p(v[0], 4)}-${p(v[1])}-${p(v[2])}`;
  if (v.length > 3) s += `T${p(v[3])}:${p(v[4] || 0)}:${p(v[5] || 0)}`;
  return s;
}
function fmtDate(v) {
  if (isEmpty(v)) return '—';
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(isoFromArray(v)));
  return m ? `${m[3]}/${m[2]}/${m[1]}` : String(v);
}
function fmtDateTime(v) {
  if (isEmpty(v)) return '—';
  const m = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}))?/.exec(String(isoFromArray(v)));
  return m ? `${m[3]}/${m[2]}/${m[1]}${m[4] ? ` ${m[4]}:${m[5]}` : ''}` : String(v);
}
function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function isValidDate(s) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || '');
  if (!m) return false;
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  return d.getUTCFullYear() === +m[1] && d.getUTCMonth() === +m[2] - 1 && d.getUTCDate() === +m[3];
}
function rangeError(ini, fin, { required = false } = {}) {
  if (required && (isEmpty(ini) || isEmpty(fin))) return 'Seleccione la fecha inicial y la fecha final.';
  if (!isEmpty(ini) && !isValidDate(ini)) return 'La fecha inicial no es válida (formato AAAA-MM-DD).';
  if (!isEmpty(fin) && !isValidDate(fin)) return 'La fecha final no es válida (formato AAAA-MM-DD).';
  if (!isEmpty(ini) && !isEmpty(fin) && ini > fin) return 'La fecha inicial no puede ser posterior a la fecha final.';
  return null;
}

/* ---------- Iconos y layout ---------- */
const ICONS = {
  panel: '<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>',
  inventario: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
  registrar: '<circle cx="12" cy="12" r="9"/><path d="M12 8v8M8 12h8"/>',
  buscar: '<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>',
  historial: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  reportes: '<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4M9 13h6M9 17h6"/>',
  configuracion: '<path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="18" r="2"/>',
  home: '<path d="M3 11l9-8 9 8M5 10v10h14V10"/>',
  menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
  download: '<path d="M12 4v11M7 11l5 5 5-5M5 20h14"/>'
};
const icon = n => `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true">${ICONS[n]}</svg>`;
const LOGO = '<svg class="logo" viewBox="0 0 40 40" aria-hidden="true"><rect width="40" height="40" rx="10" fill="#2f5d3f"/><path d="M6 12c2 6 5 8 8 8M34 12c-2 6-5 8-8 8" stroke="#e7f0e9" stroke-width="2.4" fill="none" stroke-linecap="round"/><path d="M13 18h14l-2 12a5 5 0 0 1-10 0z" fill="#e7f0e9"/><circle cx="17.5" cy="25" r="1.3" fill="#2f5d3f"/><circle cx="22.5" cy="25" r="1.3" fill="#2f5d3f"/></svg>';
const NAV = [
  { key: 'panel', label: 'Panel principal', href: 'index.html', icon: 'panel' },
  { key: 'inventario', label: 'Inventario', href: 'pages/inventario.html', icon: 'inventario' },
  { key: 'registrar', label: 'Registrar animal', href: 'pages/registrar.html', icon: 'registrar' },
  { key: 'buscar', label: 'Buscar animal', href: 'pages/buscar.html', icon: 'buscar' },
  { key: 'historial', label: 'Historial de animales', href: 'pages/historial.html', icon: 'historial' },
  { key: 'reportes', label: 'Reportes y exportaciones', href: 'pages/reportes.html', icon: 'reportes' },
  { key: 'configuracion', label: 'Configuración', href: 'pages/configuracion.html', icon: 'configuracion' }
];

function buildLayout() {
  const active = document.body.dataset.page, title = document.body.dataset.title;
  document.title = `${title} · HDVganado`;
  $('#sidebar').innerHTML = `
    <div class="brand">${LOGO}<div><strong>HDVganado</strong><span>Hojas de vida del ganado</span></div></div>
    <nav aria-label="Navegación principal">${NAV.map(n =>
      `<a class="nav-link" href="${ROOT}${n.href}" title="${n.label}" ${n.key === active ? 'aria-current="page"' : ''}>${icon(n.icon)}<span>${n.label}</span></a>`).join('')}</nav>
    <p class="sidebar-foot">HDVganado · versión 1.0</p>`;
  const fecha = new Date().toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  $('#topbar').innerHTML = `
    <button type="button" class="btn btn-secondary btn-sm icon-btn" id="nav-toggle" aria-label="Mostrar u ocultar el menú" aria-expanded="false" aria-controls="sidebar">${icon('menu')}</button>
    <div class="title"><span class="app-name">HDVganado</span><p class="top-title">${esc(title)}</p></div>
    <span class="today">${esc(fecha)}</span>
    <span id="conn" class="conn" role="status"><i></i><b>Comprobando…</b></span>
    <span class="user" title="Usuario con sesión iniciada">${esc(Api.username())}</span>
    <a class="btn btn-ghost btn-sm" href="${ROOT}index.html">${icon('home')} Panel principal</a>
    <button type="button" class="btn btn-secondary btn-sm" id="logout">Cerrar sesión</button>`;
  $('#logout').onclick = () => Api.logout();
  const overlay = document.createElement('div'); overlay.id = 'overlay'; document.body.append(overlay);
  const mobile = () => matchMedia('(max-width: 900px)').matches;
  const btn = $('#nav-toggle');
  btn.onclick = () => {
    const on = document.body.classList.toggle(mobile() ? 'nav-open' : 'nav-collapsed');
    btn.setAttribute('aria-expanded', String(mobile() ? on : !on));
  };
  overlay.onclick = () => document.body.classList.remove('nav-open');
  document.addEventListener('keydown', e => { if (e.key === 'Escape') document.body.classList.remove('nav-open'); });
  $('#sidebar').addEventListener('click', e => { if (e.target.closest('a')) document.body.classList.remove('nav-open'); });
}

async function refreshConn() {
  const el = $('#conn');
  const r = await Api.ping();
  const [cls, txt] = !r.reachable ? ['off', 'Sin conexión con el backend']
    : r.status >= 500 ? ['warn', 'Backend con errores'] : ['on', 'Backend conectado'];
  if (el) { el.className = 'conn conn-' + cls; $('b', el).textContent = txt; }
  return { ...r, cls, txt };
}

/* ---------- Avisos, estados, diálogos ---------- */
function toast(msg, type = 'info') {
  let box = $('#toasts');
  if (!box) { box = document.createElement('div'); box.id = 'toasts'; box.className = 'toasts'; box.setAttribute('aria-live', 'polite'); document.body.append(box); }
  const t = document.createElement('div');
  t.className = `toast toast-${type}`; t.textContent = msg; box.append(t);
  setTimeout(() => t.remove(), type === 'error' ? 8000 : 4500);
}
function errorMessage(e) {
  if (e instanceof ApiError) return e.message;
  console.error(e);
  return 'Ocurrió un error inesperado en la aplicación.';
}
const showLoading = (el, msg = 'Cargando…') => { el.innerHTML = `<div class="loading" role="status"><span class="spinner"></span>${esc(msg)}</div>`; };
const showEmpty = (el, title, text = '') => { el.innerHTML = `<div class="empty"><h3>${esc(title)}</h3><p>${esc(text)}</p></div>`; };
function showError(el, e, retry) {
  el.innerHTML = `<div class="alert alert-error" role="alert"><span>${esc(errorMessage(e))}</span>${retry ? '<button type="button" class="btn btn-secondary btn-sm" data-retry>Reintentar</button>' : ''}</div>`;
  if (retry) $('[data-retry]', el).onclick = retry;
}
function formMessage(el, type, msg) {
  if (!msg) { el.hidden = true; el.textContent = ''; return; }
  el.className = `alert alert-${type}`; el.textContent = msg; el.hidden = false; el.setAttribute('role', 'alert');
}
async function withBusy(btn, busyText, fn) {
  if (btn.disabled) return;
  const old = btn.innerHTML;
  btn.disabled = true; btn.setAttribute('aria-busy', 'true'); btn.textContent = busyText;
  try { return await fn(); }
  finally { btn.disabled = false; btn.removeAttribute('aria-busy'); btn.innerHTML = old; }
}
function modal({ title, body, buttons = [{ label: 'Cerrar', value: 'true', cls: 'btn-secondary' }], wide = false }) {
  return new Promise(resolve => {
    const d = document.createElement('dialog');
    d.className = 'dlg' + (wide ? ' wide' : '');
    d.setAttribute('aria-label', title);
    d.innerHTML = `<header><h2>${esc(title)}</h2></header><div class="dlg-body"></div><footer></footer>`;
    $('.dlg-body', d).innerHTML = body;
    buttons.forEach(b => {
      const x = document.createElement('button');
      x.type = 'button'; x.className = 'btn ' + (b.cls || 'btn-secondary'); x.textContent = b.label;
      x.onclick = () => d.close(b.value); $('footer', d).append(x);
    });
    d.addEventListener('close', () => { d.remove(); resolve(d.returnValue); });
    document.body.append(d); d.showModal();
  });
}
async function confirmDialog({ title, body, confirmText = 'Confirmar', cls = 'btn-primary' }) {
  const r = await modal({ title, body, buttons: [
    { label: 'Cancelar', value: 'no', cls: 'btn-secondary' }, { label: confirmText, value: 'yes', cls }] });
  return r === 'yes';
}
async function exportCsv(btn, path, query, fallbackName) {
  await withBusy(btn, 'Descargando…', async () => {
    try { toast(`Archivo descargado: ${await Api.downloadCsv(path, query, fallbackName)}`, 'ok'); }
    catch (e) { toast(errorMessage(e), 'error'); }
  });
}

/* ---------- Esquema de HojaDeVidaAnimal (propiedades Java) ---------- */
const SECTIONS = ['Identificación', 'Ingreso y estado', 'Características', 'Producción y reproducción'];
const SI_NO = ['SI', 'NO'];
const SEXOS = ['HEMBRA', 'MACHO'];
/* required: obligatorio en el cliente · noEdit: no se puede cambiar con PATCH · noForm: solo se muestra */
const FIELDS = [
  { key: 'codigo3', label: 'Código del animal (Codigo3)', type: 'text', section: 0, required: true, noEdit: true },
  { key: 'codigo2', label: 'Código secundario', type: 'text', section: 0 },
  { key: 'nombreAnimal', label: 'Nombre', type: 'text', section: 0 },
  { key: 'sexo', label: 'Sexo', type: 'select', options: SEXOS, section: 0, required: true },
  { key: 'raza', label: 'Raza', type: 'text', list: 'dl-razas', section: 0 },
  { key: 'categoria', label: 'Categoría', type: 'text', list: 'dl-categorias', section: 0 },
  { key: 'fechaIngresoFinca', label: 'Fecha de ingreso a la finca', type: 'date', past: true, section: 1 },
  { key: 'fechaNacidoEnFinca', label: 'Fecha de nacimiento (nacido en la finca)', type: 'date', past: true, section: 1 },
  { key: 'estaEnFinca', label: '¿Está en la finca?', type: 'select', options: SI_NO, def: 'SI', section: 1, required: true, noEdit: true },
  { key: 'estaEnOtrasFincas', label: '¿Está en otras fincas?', type: 'select', options: SI_NO, def: 'NO', section: 1 },
  { key: 'carneOLeche', label: 'Tipo de producción', type: 'select', options: [['CARNE', 'Carne'], ['LECHE', 'Leche'], ['DOBLE PROPOSITO', 'Doble propósito']], section: 1 },
  { key: 'vendido', label: 'Salida (campo Vendido)', type: 'text', section: 1, noForm: true, noEdit: true },
  { key: 'pesoAlNacerOEntrarKilos', label: 'Peso al nacer o entrar (kg)', type: 'number', unit: 'kg', section: 2 },
  { key: 'edad', label: 'Edad', type: 'number', section: 2 },
  { key: 'padre', label: 'Padre', type: 'text', section: 2 },
  { key: 'madre', label: 'Madre', type: 'text', section: 2 },
  { key: 'descripcion', label: 'Descripción', type: 'textarea', section: 2 },
  { key: 'cantidadLeche', label: 'Cantidad de leche', type: 'number', section: 3 },
  { key: 'eficiencia', label: 'Eficiencia', type: 'number', section: 3 },
  { key: 'numeroPartos', label: 'Número de partos', type: 'number', int: true, section: 3 },
  { key: 'fechaUltimoParto', label: 'Fecha del último parto', type: 'date', past: true, section: 3 },
  { key: 'sexoParto', label: 'Sexo del último parto', type: 'select', options: SEXOS, section: 3 },
  { key: 'diasAbiertos', label: 'Días abiertos', type: 'number', int: true, section: 3 },
  { key: 'fechaPalpada', label: 'Fecha de palpación', type: 'date', past: true, section: 3 },
  { key: 'tiempoPrenhes', label: 'Tiempo de preñez', type: 'number', section: 3 },
  { key: 'aproximacionProximoParto', label: 'Aproximación del próximo parto', type: 'date', section: 3 }
];
const SYS_LABELS = { codigo1: 'Identificador de versión (Codigo1)', fecharegistroversion: 'Fecha de registro de la versión' };
const fieldLabel = k => (FIELDS.find(f => f.key.toLowerCase() === k.toLowerCase()) || {}).label || SYS_LABELS[k.toLowerCase()] || k;

function toInput(v, f) {
  if (isEmpty(v)) return '';
  if (f.type === 'date') return String(isoFromArray(v)).slice(0, 10);
  return String(v);
}
function fieldHtml(f, values, prefix) {
  const id = `${prefix}-${f.key}`;
  const v = values ? toInput(val(values, f.key), f) : (f.def ?? '');
  const common = `id="${id}" name="${f.key}" aria-describedby="${id}-err"${f.required ? ' aria-required="true"' : ''}`;
  let ctl;
  if (f.type === 'select') {
    ctl = `<select ${common}><option value="">— Seleccione —</option>${f.options.map(o => {
      const [ov, ol] = Array.isArray(o) ? o : [o, o];
      return `<option value="${esc(ov)}"${String(v) === ov ? ' selected' : ''}>${esc(ol)}</option>`; }).join('')}</select>`;
  } else if (f.type === 'textarea') ctl = `<textarea ${common} rows="3">${esc(v)}</textarea>`;
  else if (f.type === 'number') ctl = `<input ${common} type="number" inputmode="decimal" min="0" step="${f.int ? 1 : 'any'}" value="${esc(v)}">`;
  else if (f.type === 'date') ctl = `<input ${common} type="date"${f.past ? ` max="${todayIso()}"` : ''} value="${esc(v)}">`;
  else ctl = `<input ${common} type="text"${f.list ? ` list="${f.list}" autocomplete="off"` : ''} value="${esc(v)}">`;
  return `<div class="field${f.type === 'textarea' ? ' wide' : ''}"><label for="${id}">${esc(f.label)}${f.required ? ' <span class="req" aria-hidden="true">*</span>' : ''}</label>${ctl}<p class="field-error" id="${id}-err" hidden></p></div>`;
}
function renderFormFields(container, { values = null, edit = false, prefix = 'f' } = {}) {
  container.innerHTML = SECTIONS.map((title, i) => {
    const fs = FIELDS.filter(f => f.section === i && !f.noForm && !(edit && f.noEdit));
    return `<fieldset class="section"><legend>${title}</legend><div class="grid">${fs.map(f => fieldHtml(f, values, prefix)).join('')}</div></fieldset>`;
  }).join('');
}
/** Lee y valida el formulario. Con `original` (edición) solo devuelve los campos modificados. */
function readForm(form, { original = null } = {}) {
  const payload = {}, errors = {};
  FIELDS.forEach(f => {
    if (f.noForm || (original && f.noEdit)) return;
    const el = form.elements[f.key]; if (!el) return;
    const raw = String(el.value).trim();
    if (raw === '') { if (f.required) errors[f.key] = original ? 'Este campo no puede quedar vacío.' : 'Este campo es obligatorio.'; return; }
    let v = raw;
    if (f.type === 'number') {
      v = Number(raw.replace(',', '.'));
      if (!Number.isFinite(v) || v < 0) { errors[f.key] = 'Ingrese un número válido (0 o mayor).'; return; }
      if (f.int && !Number.isInteger(v)) { errors[f.key] = 'Debe ser un número entero.'; return; }
    } else if (f.type === 'date') {
      if (!isValidDate(raw)) { errors[f.key] = 'Fecha no válida (formato AAAA-MM-DD).'; return; }
      if (f.past && raw > todayIso()) { errors[f.key] = 'La fecha no puede ser futura.'; return; }
    } else if (f.type === 'select' && !f.options.some(o => (Array.isArray(o) ? o[0] : o) === raw)) {
      errors[f.key] = 'Seleccione una opción de la lista.'; return;
    }
    if (original) {
      const prev = toInput(val(original, f.key), f);
      if (f.type === 'number' ? (prev !== '' && Number(prev) === v) : prev === raw) return;   // sin cambios
    }
    payload[f.key] = v;
  });
  return { payload, errors };
}
function clearErrors(form) {
  $$('[aria-invalid]', form).forEach(e => e.removeAttribute('aria-invalid'));
  $$('.field-error', form).forEach(p => { p.hidden = true; p.textContent = ''; });
}
function showErrors(form, errors) {
  clearErrors(form);
  let first = null;
  Object.entries(errors).forEach(([k, m]) => {
    const el = form.elements[k]; if (!el) return;
    el.setAttribute('aria-invalid', 'true');
    const p = document.getElementById(el.id + '-err'); if (p) { p.textContent = m; p.hidden = false; }
    first = first || el;
  });
  if (first) first.focus();
}

/* ---------- Sugerencias reales (razas, categorías, códigos) tomadas del inventario ---------- */
let _sugg = null;
async function loadSuggestions() {
  if (_sugg) return _sugg;
  try {
    const rows = asArray(await Api.get('/api/animales'));
    const uniq = k => [...new Set(rows.map(r => val(r, k)).filter(x => !isEmpty(x)).map(x => String(x).trim()))].sort((a, b) => a.localeCompare(b, 'es'));
    _sugg = { razas: uniq('raza'), categorias: uniq('categoria'), codigos: uniq('codigo3') };
    return _sugg;
  } catch { return { razas: [], categorias: [], codigos: [] }; }
}
function applySuggestions(s) {
  ['razas', 'categorias', 'codigos'].forEach(k => {
    let dl = document.getElementById('dl-' + k);
    if (!dl) { dl = document.createElement('datalist'); dl.id = 'dl-' + k; document.body.append(dl); }
    dl.innerHTML = s[k].map(x => `<option value="${esc(x)}"></option>`).join('');
  });
}

/* ---------- Tabla de animales y ficha ---------- */
const BASE_COLS = [
  ['Código', a => `<a href="${pageUrl('animal', { codigo: val(a, 'codigo3') ?? '' })}"><strong>${dash(val(a, 'codigo3'))}</strong></a>`],
  ['Nombre', a => dash(val(a, 'nombreAnimal'))],
  ['Sexo', a => dash(val(a, 'sexo'))],
  ['Raza', a => dash(val(a, 'raza'))],
  ['Categoría', a => dash(val(a, 'categoria'))],
  ['Ingreso', a => fmtDate(val(a, 'fechaIngresoFinca'))],
  ['Edad', a => dash(val(a, 'edad'))],
  ['Peso', a => isEmpty(val(a, 'pesoAlNacerOEntrarKilos')) ? '—' : `${esc(val(a, 'pesoAlNacerOEntrarKilos'))} kg`],
  ['Estado', a => { const e = estadoInfo(a); return `<span class="badge badge-${e.cls}">${esc(e.text)}</span>`; }]
];
function animalTable(rows, { extra = [] } = {}) {
  const cols = [...extra, ...BASE_COLS];
  return `<div class="table-wrap"><table><thead><tr>${cols.map(c => `<th scope="col">${c[0]}</th>`).join('')}<th scope="col">Acciones</th></tr></thead><tbody>${
    rows.map(a => { const c = val(a, 'codigo3') ?? ''; return `<tr>${cols.map(col => `<td>${col[1](a)}</td>`).join('')}<td class="row-actions"><a class="btn btn-secondary btn-sm" href="${pageUrl('animal', { codigo: c })}">Ficha</a><a class="btn btn-ghost btn-sm" href="${pageUrl('historial', { codigo: c })}">Historial</a></td></tr>`; }).join('')
  }</tbody></table></div>`;
}
function fmtField(v, f) {
  if (isEmpty(v)) return '<span class="muted">—</span>';
  if (f.type === 'date') return esc(fmtDate(v));
  if (f.type === 'select') { const o = f.options.find(o => (Array.isArray(o) ? o[0] : o) === String(v)); if (Array.isArray(o)) return esc(o[1]); }
  return esc(v) + (f.unit ? ' ' + f.unit : '');
}
/** Todos los datos de la respuesta, por secciones (incluye campos que el esquema no conoce). */
function renderDetail(a) {
  const known = new Set(FIELDS.map(f => f.key.toLowerCase()));
  const cards = SECTIONS.map((t, i) => `<section class="card"><h2>${t}</h2><dl class="dl">${
    FIELDS.filter(f => f.section === i).map(f => `<div><dt>${esc(f.label)}</dt><dd>${fmtField(val(a, f.key), f)}</dd></div>`).join('')}</dl></section>`);
  const extra = Object.keys(a).filter(k => !known.has(k.toLowerCase()));
  if (extra.length) cards.push(`<section class="card"><h2>Datos del sistema</h2><dl class="dl">${extra.map(k => {
    const v = a[k]; const lk = k.toLowerCase();
    const shown = isEmpty(v) ? '<span class="muted">—</span>' : lk.includes('fecha') ? esc(fmtDateTime(v)) : esc(typeof v === 'object' ? JSON.stringify(v) : v);
    return `<div><dt>${esc(fieldLabel(k))}</dt><dd>${shown}</dd></div>`; }).join('')}</dl></section>`);
  return cards.join('');
}

/* ---------- Arranque del layout ---------- */
buildLayout();
refreshConn();
setInterval(() => { if (!document.hidden) refreshConn(); }, 60000);
