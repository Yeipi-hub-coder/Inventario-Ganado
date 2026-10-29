'use strict';
/* Historial de versiones: GET /api/animales/{codigo3}/historial */
(function () {
  const form = $('#hist-form'), input = $('#codigo'), out = $('#resultado'), csvBtn = $('#csv'), err = $('#codigo-err');
  let last = null, asc = [];
  loadSuggestions().then(applySuggestions);

  const verKey = v => Number(val(v, 'codigo1'));
  const sortAsc = list => [...list].sort((a, b) => {
    const x = verKey(a), y = verKey(b);
    if (Number.isFinite(x) && Number.isFinite(y) && x !== y) return x - y;
    return String(val(a, 'fechaRegistroVersion') || '').localeCompare(String(val(b, 'fechaRegistroVersion') || ''));
  });
  const SKIP = new Set(['codigo1', 'fecharegistroversion']);
  function changes(prev, cur) {
    const keys = new Map();
    [...Object.keys(prev), ...Object.keys(cur)].forEach(k => { if (!SKIP.has(k.toLowerCase())) keys.set(k.toLowerCase(), k); });
    return [...keys.values()].filter(k => JSON.stringify(val(prev, k) ?? null) !== JSON.stringify(val(cur, k) ?? null)).map(fieldLabel);
  }

  async function load(codigo) {
    err.hidden = true;
    if (!codigo) { err.textContent = 'Escriba el código del animal.'; err.hidden = false; input.focus(); return; }
    csvBtn.disabled = true; last = null;
    showLoading(out, 'Consultando historial…');
    try {
      const list = asArray(await Api.get(`/api/animales/${enc(codigo)}/historial`));
      if (!list.length) { showEmpty(out, 'Sin historial', `No hay versiones registradas para «${codigo}».`); return; }
      asc = sortAsc(list); last = { codigo };
      csvBtn.disabled = false;
      const items = asc.map((v, i) => ({ v, i, prev: asc[i - 1] })).reverse().map(({ v, i, prev }) => {
        const e = estadoInfo(v), latest = i === asc.length - 1, ch = prev ? changes(prev, v) : null;
        return `<li class="tl-item${latest ? ' latest' : ''}"><div class="card tl-card">
          <div class="tl-top"><strong>Versión ${dash(val(v, 'codigo1'))}</strong>${latest ? '<span class="badge badge-ok">Más reciente</span>' : ''}<span class="badge badge-${e.cls}">${esc(e.text)}</span><time>${esc(fmtDateTime(val(v, 'fechaRegistroVersion')))}</time></div>
          <p>${[['Nombre', val(v, 'nombreAnimal')], ['Raza', val(v, 'raza')], ['Categoría', val(v, 'categoria')], ['Edad', val(v, 'edad')], ['Peso', val(v, 'pesoAlNacerOEntrarKilos')]].filter(x => !isEmpty(x[1])).map(x => `${x[0]}: <strong>${esc(x[1])}</strong>`).join(' · ') || '<span class="muted">Sin datos principales.</span>'}</p>
          <div class="chips">${ch === null ? '<span class="muted">Versión inicial</span>' : ch.length ? ch.map(c => `<span class="chip">Cambió: ${esc(c)}</span>`).join('') : '<span class="muted">Sin cambios en los datos</span>'}</div>
          <button type="button" class="btn btn-secondary btn-sm" data-i="${i}">Ver detalle de esta versión</button></div></li>`;
      }).join('');
      out.innerHTML = `<p class="muted">${asc.length} versión(es) de <strong>${esc(codigo)}</strong>, de la más reciente a la más antigua.</p><ol class="timeline">${items}</ol>`;
    } catch (e) {
      if (e.status === 404) showEmpty(out, 'No se encontró el animal', `No existe historial para el código «${codigo}».`);
      else showError(out, e, () => load(codigo));
    }
  }

  out.addEventListener('click', e => {
    const b = e.target.closest('[data-i]'); if (!b) return;
    const v = asc[+b.dataset.i];
    modal({ title: `Versión ${val(v, 'codigo1') ?? ''} de ${last.codigo}`, wide: true, body: `<div class="detail-flat">${renderDetail(v)}</div>` });
  });
  form.addEventListener('submit', e => { e.preventDefault(); load(input.value.trim()); });
  csvBtn.onclick = () => last && exportXlsx(csvBtn, `/api/animales/${enc(last.codigo)}/historial`, {}, `historial_${last.codigo}.xlsx`);

  const pre = new URLSearchParams(location.search).get('codigo');
  if (pre) { input.value = pre; load(pre.trim()); }
  else showEmpty(out, 'Elija un animal', 'Escriba su código para ver todas sus versiones.');
})();
