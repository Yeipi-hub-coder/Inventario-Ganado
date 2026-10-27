'use strict';
/* Registro de animal: POST /api/animales */
(function () {
  const form = $('#form-animal'), msg = $('#form-msg'), ok = $('#exito'), submit = $('button[type=submit]', form);
  let sending = false;
  renderFormFields($('#campos'), { prefix: 'reg' });
  loadSuggestions().then(applySuggestions);

  $('#limpiar').onclick = () => { form.reset(); clearErrors(form); formMessage(msg, 'error', ''); };
  form.addEventListener('submit', async e => {
    e.preventDefault();
    if (sending) return;
    ok.hidden = true; formMessage(msg, 'error', '');
    const { payload, errors } = readForm(form);
    if (Object.keys(errors).length) { showErrors(form, errors); formMessage(msg, 'error', 'Revise los campos marcados antes de continuar.'); return; }
    clearErrors(form);
    sending = true;
    await withBusy(submit, 'Registrando…', async () => {
      try {
        const res = await Api.post('/api/animales', payload);
        const c3 = (res && typeof res === 'object' && val(res, 'codigo3')) || payload.codigo3;
        ok.innerHTML = `<span>Animal <strong>${esc(c3)}</strong> registrado correctamente.</span><span class="actions"><a class="btn btn-primary btn-sm" href="${pageUrl('animal', { codigo: c3 })}">Ver ficha</a><a class="btn btn-secondary btn-sm" href="${pageUrl('inventario')}">Ir al inventario</a></span>`;
        ok.hidden = false; ok.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        toast('Animal registrado correctamente.', 'ok');
        form.reset();
        _sugg = null; loadSuggestions().then(applySuggestions);
      } catch (err) { formMessage(msg, 'error', errorMessage(err)); toast(errorMessage(err), 'error'); }
    });
    sending = false;
  });
})();
