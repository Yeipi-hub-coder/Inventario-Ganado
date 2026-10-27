'use strict';
/* Búsqueda por código y por fecha de ingreso: GET /api/animales/buscar/ingreso */
(function () {
  const out = $('#resultado'), card = $('#res-card'), msg = $('#fecha-msg'), csvBtn = $('#csv');
  let last = null;
  loadSuggestions().then(applySuggestions);

  $('#por-codigo').addEventListener('submit', e => {
    e.preventDefault();
    const c = $('#codigo').value.trim(), err = $('#codigo-err');
    err.hidden = !!c; err.textContent = c ? '' : 'Escriba el código del animal.';
    if (c) location.href = pageUrl('animal', { codigo: c });
  });

  $('#por-fecha').addEventListener('submit', async e => {
    e.preventDefault();
    const p = { inicio: $('#inicio').value, fin: $('#fin').value };
    const err = rangeError(p.inicio, p.fin, { required: true });
    if (err) { formMessage(msg, 'error', err); return; }
    formMessage(msg, 'error', '');
    card.hidden = false; showLoading(out, 'Buscando…'); $('#count').textContent = '';
    await withBusy($('button[type=submit]', e.target), 'Buscando…', async () => {
      try {
        const rows = asArray(await Api.get('/api/animales/buscar/ingreso', p));
        last = p; csvBtn.disabled = false;
        $('#count').textContent = String(rows.length);
        if (!rows.length) showEmpty(out, 'Sin resultados', 'No hay animales con fecha de ingreso en ese rango.');
        else out.innerHTML = animalTable(rows);
      } catch (ex) { csvBtn.disabled = true; showError(out, ex); }
    });
  });
  csvBtn.onclick = () => last && exportCsv(csvBtn, '/api/animales/buscar/ingreso', last, `animales_ingreso_${last.inicio}_${last.fin}.csv`);
})();
