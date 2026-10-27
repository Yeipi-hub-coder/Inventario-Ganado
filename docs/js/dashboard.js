'use strict';
/* Panel principal: cifras calculadas a partir de GET /api/animales (inventario actual) */
(async function () {
  const stats = $('#stats'), cats = $('#categorias');
  async function load() {
    showLoading(stats, 'Cargando resumen…'); showLoading(cats, '');
    let rows;
    try { rows = asArray(await Api.get('/api/animales')); }
    catch (e) { showError(stats, e, load); cats.innerHTML = '<p class="muted">Información no disponible.</p>'; return; }
    const sexo = s => rows.filter(a => String(val(a, 'sexo') || '').toUpperCase() === s).length;
    const hembras = sexo('HEMBRA'), machos = sexo('MACHO'), otros = rows.length - hembras - machos;
    const card = (t, n) => `<div class="stat"><span>${t}</span><strong>${n}</strong></div>`;
    stats.innerHTML = card('Animales en inventario', rows.length) + card('Hembras', hembras) + card('Machos', machos) + (otros > 0 ? card('Sin sexo registrado', otros) : '');

    const groups = {};
    rows.forEach(a => { const c = isEmpty(val(a, 'categoria')) ? null : String(val(a, 'categoria')).trim(); if (c) groups[c] = (groups[c] || 0) + 1; });
    const list = Object.entries(groups).sort((a, b) => b[1] - a[1]);
    if (!rows.length) cats.innerHTML = '<p class="muted">Todavía no hay animales en el inventario.</p>';
    else if (!list.length) cats.innerHTML = '<p class="muted">Los animales del inventario no tienen categoría registrada, por eso no se puede calcular esta distribución.</p>';
    else {
      const sin = rows.length - list.reduce((s, x) => s + x[1], 0);
      cats.innerHTML = `<div class="bars">${list.map(([c, n]) => `<a class="bar-row" href="${pageUrl('inventario', { categoria: c })}" title="Ver ${esc(c)} en el inventario"><span>${esc(c)}</span><span class="bar-track"><span class="bar-fill" style="display:block;width:${Math.round(n / rows.length * 100)}%"></span></span><strong>${n}</strong></a>`).join('')}</div>${sin ? `<p class="muted" style="margin-top:.8rem">${sin} animal(es) sin categoría registrada.</p>` : ''}`;
    }
  }
  load();
})();
