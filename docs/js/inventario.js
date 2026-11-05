'use strict';
/* Inventario general con filtros y paginación local de 25 animales. */
(async function () {
  const form = $('#filtros'), out = $('#resultado'), msg = $('#filtro-msg'), count = $('#count'), csvBtn = $('#csv');
  const KEYS = ['categoria', 'sexo', 'raza', 'inicio', 'fin', 'nacimientoDesde', 'nacimientoHasta'];
  const PAGE_SIZE = 25;
  let rows = [], current = {}, page = 1;
  const norm = s => String(s ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const params = () => {
    const p = {};
    KEYS.forEach(k => { const v = form.elements[k].value.trim(); if (v) p[k] = v; });
    if (form.elements.estado.value === 'VENDIDAS') p.estado = 'VENDIDAS';
    if (form.elements.ubicacion.value) p.ubicacion = form.elements.ubicacion.value;
    return p;
  };
  const pathFor = p => Object.keys(p).length ? '/api/animales/filtrar' : '/api/animales';

  function render() {
    const q = norm($('#q').value.trim());
    const shown = q ? rows.filter(a => norm(Object.values(a).join(' ')).includes(q)) : rows;
    const totalPages = Math.max(1, Math.ceil(shown.length / PAGE_SIZE));
    page = Math.min(page, totalPages);
    const start = (page - 1) * PAGE_SIZE;
    const pageRows = shown.slice(start, start + PAGE_SIZE);

    $('#q-note').hidden = !q;
    count.textContent = q ? `${shown.length} de ${rows.length}` : String(rows.length);
    if (!rows.length) {
      showEmpty(out, 'No hay animales para mostrar', 'Pruebe con otros filtros o registre un animal nuevo.');
    } else if (!shown.length) {
      showEmpty(out, 'Sin coincidencias', 'Ningún animal coincide con el texto buscado.');
    } else {
      out.innerHTML = animalTable(pageRows);
    }

    const pagination = $('#paginacion');
    if (shown.length <= PAGE_SIZE) {
      pagination.hidden = true;
      pagination.innerHTML = '';
      return;
    }
    pagination.hidden = false;
    pagination.innerHTML = `
      <button class="btn btn-secondary btn-sm" type="button" id="pagina-anterior" ${page === 1 ? 'disabled' : ''}>Anterior</button>
      <span class="muted">Página ${page} de ${totalPages} · ${shown.length} animales</span>
      <button class="btn btn-secondary btn-sm" type="button" id="pagina-siguiente" ${page === totalPages ? 'disabled' : ''}>Siguiente</button>`;
    $('#pagina-anterior').onclick = () => { page--; render(); };
    $('#pagina-siguiente').onclick = () => { page++; render(); };
  }

  async function load() {
    const p = params();
    const errIngreso = rangeError(p.inicio, p.fin);
    const errNacimiento = rangeError(p.nacimientoDesde, p.nacimientoHasta);
    const err = errIngreso || errNacimiento;
    if (err) { formMessage(msg, 'error', err); return; }
    formMessage(msg, 'error', '');
    current = p; page = 1;
    showLoading(out, 'Cargando inventario…'); count.textContent = '';
    try { rows = asArray(await Api.get(pathFor(p), p)); }
    catch (e) { rows = []; showError(out, e, load); return; }
    render();
  }

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
  $('#limpiar').onclick = () => { form.reset(); $('#q').value = ''; load(); };
  $('#q').addEventListener('input', () => { page = 1; render(); });
  csvBtn.onclick = () => exportXlsx(csvBtn, pathFor(current), current,
    Object.keys(current).length ? 'inventario_filtrado.xlsx' : 'inventario_general.xlsx');
  load();
})();
