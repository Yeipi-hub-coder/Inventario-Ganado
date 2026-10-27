'use strict';
/* Inventario actual: GET /api/animales  ·  con filtros: GET /api/animales/filtrar */
(async function () {
  const form = $('#filtros'), out = $('#resultado'), msg = $('#filtro-msg'), count = $('#count'), csvBtn = $('#csv');
  const KEYS = ['categoria', 'sexo', 'raza', 'inicio', 'fin'];
  let rows = [], current = {};
  const norm = s => String(s ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const params = () => { const p = {}; KEYS.forEach(k => { const v = form.elements[k].value.trim(); if (v) p[k] = v; }); return p; };
  const pathFor = p => Object.keys(p).length ? '/api/animales/filtrar' : '/api/animales';

  function render() {
    const q = norm($('#q').value.trim());
    $('#q-note').hidden = !q;
    const shown = q ? rows.filter(a => norm(Object.values(a).join(' ')).includes(q)) : rows;
    count.textContent = q ? `${shown.length} de ${rows.length}` : String(rows.length);
    if (!rows.length) showEmpty(out, 'No hay animales para mostrar', 'Pruebe con otros filtros o registre un animal nuevo.');
    else if (!shown.length) showEmpty(out, 'Sin coincidencias', 'Ningún animal coincide con el texto buscado.');
    else out.innerHTML = animalTable(shown);
  }
  async function load() {
    const p = params(), err = rangeError(p.inicio, p.fin);
    if (err) { formMessage(msg, 'error', err); return; }
    formMessage(msg, 'error', '');
    current = p; showLoading(out, 'Cargando inventario…'); count.textContent = '';
    try { rows = asArray(await Api.get(pathFor(p), p)); }
    catch (e) { rows = []; showError(out, e, load); return; }
    render();
  }

  // Opciones de los filtros: valores reales presentes en el inventario
  const s = await loadSuggestions();
  const fill = (id, list, selected) => {
    const el = $('#' + id);
    if (selected && !list.includes(selected)) list = [...list, selected];
    list.forEach(x => el.insertAdjacentHTML('beforeend', `<option value="${esc(x)}">${esc(x)}</option>`));
    if (selected) el.value = selected;
  };
  const pre = new URLSearchParams(location.search);
  fill('categoria', s.categorias, pre.get('categoria'));
  fill('raza', s.razas, pre.get('raza'));

  form.addEventListener('submit', e => { e.preventDefault(); load(); });
  $('#limpiar').onclick = () => { form.reset(); load(); };
  $('#q').addEventListener('input', render);
  csvBtn.onclick = () => exportCsv(csvBtn, pathFor(current), current,
    Object.keys(current).length ? 'inventario_filtrado.csv' : 'inventario_actual.csv');
  load();
})();
