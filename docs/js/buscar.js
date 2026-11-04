'use strict';
/* Búsqueda de animales por código. */
(function () {
  loadSuggestions().then(applySuggestions);

  $('#por-codigo').addEventListener('submit', e => {
    e.preventDefault();
    const c = $('#codigo').value.trim(), err = $('#codigo-err');
    err.hidden = !!c; err.textContent = c ? '' : 'Escriba el código del animal.';
    if (c) location.href = pageUrl('animal', { codigo: c });
  });
})();
