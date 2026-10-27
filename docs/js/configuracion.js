'use strict';
/* Configuración: solo lectura (la URL de la API se define en js/api.js) */
(function () {
  $('#api-url').textContent = Api.baseUrl;
  if (location.protocol === 'https:' && Api.baseUrl.startsWith('http:')) $('#https-aviso').hidden = false;
  async function probar() {
    const r = await refreshConn();
    $('#api-estado').textContent = r.txt + (r.reachable ? ` (HTTP ${r.status})` : '');
  }
  $('#probar').onclick = e => withBusy(e.currentTarget, 'Probando…', probar);
  probar();
})();
