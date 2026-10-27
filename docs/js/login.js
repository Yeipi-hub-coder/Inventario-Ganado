'use strict';
/* Pantalla de inicio de sesión (HTTP Basic verificado contra el backend, ver Api.login) */
(function () {
  const $ = s => document.querySelector(s);
  const form = $('#login-form'), msg = $('#login-msg'), user = $('#usuario'), pass = $('#clave'), btn = $('button[type=submit]', form);
  const NEXT_OK = /^(pages\/)?[a-z]+\.html(\?[A-Za-z0-9_=&%.\-]*)?$/;   // solo páginas internas
  let sending = false;

  function destination() {
    const next = new URLSearchParams(location.search).get('next') || '';
    return NEXT_OK.test(next) && !/^(pages\/)?login\.html/.test(next) ? '../' + next : '../index.html';
  }
  function show(type, text) {
    msg.className = 'alert alert-' + type; msg.textContent = text; msg.hidden = !text; msg.setAttribute('role', 'alert');
  }
  function fieldError(input, text) {
    const p = $('#' + input.id + '-err');
    p.textContent = text; p.hidden = !text;
    if (text) input.setAttribute('aria-invalid', 'true'); else input.removeAttribute('aria-invalid');
  }

  if (Api.isAuthenticated()) { location.replace(destination()); return; }

  const motivo = new URLSearchParams(location.search).get('motivo');
  if (motivo === 'expirada') show('warn', 'Su sesión expiró o las credenciales ya no son válidas. Inicie sesión de nuevo.');
  if (motivo === 'cerrada') show('ok', 'Sesión cerrada correctamente.');

  $('#ver-clave').addEventListener('change', e => { pass.type = e.target.checked ? 'text' : 'password'; });

  form.addEventListener('submit', async e => {
    e.preventDefault();
    if (sending) return;
    const u = user.value.trim(), p = pass.value;
    fieldError(user, !u ? 'Escriba su usuario.' : u.includes(':') ? 'El usuario no puede contener dos puntos (:).' : '');
    fieldError(pass, p ? '' : 'Escriba su contraseña.');
    if (!u || u.includes(':') || !p) { (!u || u.includes(':') ? user : pass).focus(); return; }
    show('', '');
    sending = true; btn.disabled = true; btn.setAttribute('aria-busy', 'true'); btn.textContent = 'Verificando…';
    try {
      await Api.login(u, p);
      pass.value = '';
      location.replace(destination());
    } catch (err) {
      console.error('[HDVganado] Inicio de sesión fallido:', err.kind || '', err.status || '');
      show('error', err instanceof ApiError ? err.message : 'Ocurrió un error inesperado.');
      pass.value = ''; pass.focus();
      sending = false; btn.disabled = false; btn.removeAttribute('aria-busy'); btn.textContent = 'Entrar';
    }
  });
})();
