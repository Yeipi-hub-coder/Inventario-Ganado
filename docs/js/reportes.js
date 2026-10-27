'use strict';
/* Reportes: consulta en pantalla y exportación CSV (formato=csv) de exactamente la última consulta */
(function () {
  const tipo = $('#tipo'), form = $('#rep-form'), box = $('#rep-params'), msg = $('#rep-msg'), csvBtn = $('#rep-csv');
  const PARAMS = {
    categoria: { label: 'Categoría', type: 'text', list: 'dl-categorias' },
    sexo: { label: 'Sexo', type: 'select', options: ['HEMBRA', 'MACHO'] },
    raza: { label: 'Raza', type: 'text', list: 'dl-razas' },
    inicio: { label: 'Fecha inicial', type: 'date' },
    fin: { label: 'Fecha final', type: 'date' },
    codigo: { label: 'Código del animal (Codigo3)', type: 'text', list: 'dl-codigos' }
  };
  const REPORTS = {
    inventario: { label: 'Inventario completo', fields: [], path: () => '/api/animales', kind: 'lista', file: () => 'inventario_completo.csv' },
    filtrado: { label: 'Inventario filtrado', fields: ['categoria', 'sexo', 'raza', 'inicio', 'fin'], path: () => '/api/animales/filtrar', kind: 'lista',
      validate: p => Object.keys(p).length ? rangeError(p.inicio, p.fin) : 'Indique al menos un filtro (o use «Inventario completo»).', file: () => 'inventario_filtrado.csv' },
    historial: { label: 'Historial de un animal', fields: ['codigo'], path: p => `/api/animales/${enc(p.codigo)}/historial`, kind: 'historial',
      validate: p => p.codigo ? null : 'Indique el código del animal.', file: p => `historial_${p.codigo}.csv` },
    ingreso: { label: 'Búsqueda por fecha de ingreso', fields: ['inicio', 'fin'], path: () => '/api/animales/buscar/ingreso', kind: 'lista',
      validate: p => rangeError(p.inicio, p.fin, { required: true }), file: p => `animales_ingreso_${p.inicio}_${p.fin}.csv` },
    ficha: { label: 'Ficha individual de un animal', fields: ['codigo'], path: p => `/api/animales/${enc(p.codigo)}`, kind: 'ficha',
      validate: p => p.codigo ? null : 'Indique el código del animal.', file: p => `ficha_${p.codigo}.csv` }
  };
  let lastRun = null;
  loadSuggestions().then(applySuggestions);
  tipo.innerHTML = Object.entries(REPORTS).map(([k, r]) => `<option value="${k}">${r.label}</option>`).join('');

  function drawParams() {
    const r = REPORTS[tipo.value];
    box.innerHTML = r.fields.map(k => { const p = PARAMS[k], id = 'p-' + k;
      const ctl = p.type === 'select' ? `<select id="${id}"><option value="">Todos</option>${p.options.map(o => `<option>${o}</option>`).join('')}</select>`
        : `<input id="${id}" type="${p.type}"${p.list ? ` list="${p.list}" autocomplete="off"` : ''}>`;
      return `<div class="field"><label for="${id}">${p.label}</label>${ctl}</div>`; }).join('');
    csvBtn.disabled = true; lastRun = null; $('#rep-card').hidden = true; formMessage(msg, 'error', '');
  }
  tipo.addEventListener('change', drawParams);
  drawParams();

  form.addEventListener('submit', async e => {
    e.preventDefault();
    const r = REPORTS[tipo.value], p = {};
    r.fields.forEach(k => { const v = $('#p-' + k).value.trim(); if (v) p[k] = v; });
    const err = r.validate ? r.validate(p) : null;
    if (err) { formMessage(msg, 'error', err); return; }
    formMessage(msg, 'error', '');
    const query = { ...p }; delete query.codigo;
    const card = $('#rep-card'), out = $('#rep-result');
    card.hidden = false; $('#rep-title').textContent = r.label; $('#rep-count').textContent = '';
    showLoading(out, 'Consultando…');
    await withBusy($('button[type=submit]', form), 'Consultando…', async () => {
      try {
        const path = r.path(p), data = await Api.get(path, query);
        lastRun = { path, query, file: r.file(p) }; csvBtn.disabled = false;
        if (r.kind === 'ficha') {
          const a = normalizeAnimal(data);
          if (!a) { showEmpty(out, 'Sin resultados', 'No se encontró el animal.'); return; }
          out.innerHTML = `<div class="detail-flat">${renderDetail(a)}</div>`;
        } else {
          const rows = asArray(data); $('#rep-count').textContent = String(rows.length);
          if (!rows.length) showEmpty(out, 'Sin resultados', 'La consulta no devolvió registros.');
          else out.innerHTML = animalTable(rows, r.kind === 'historial'
            ? { extra: [['Versión', a => dash(val(a, 'codigo1'))], ['Registro', a => esc(fmtDateTime(val(a, 'fechaRegistroVersion')))]] } : {});
        }
      } catch (ex) {
        csvBtn.disabled = true; lastRun = null;
        if (ex.status === 404) showEmpty(out, 'No se encontró el animal', 'Revise el código e intente de nuevo.');
        else showError(out, ex);
      }
    });
  });
  csvBtn.onclick = () => lastRun && exportCsv(csvBtn, lastRun.path, lastRun.query, lastRun.file);
})();
