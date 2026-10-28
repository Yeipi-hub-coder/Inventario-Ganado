
'use strict';

/* Registro de animal: POST /api/animales */
(function () {
  const form = $('#form-animal');
  const msg = $('#form-msg');
  const ok = $('#exito');
  const submit = $('button[type=submit]', form);

  let sending = false;
  let progenitores = [];

  renderFormFields($('#campos'), { prefix: 'reg' });
  loadSuggestions().then(applySuggestions);

  cargarProgenitores().then(() => {
    configurarBusquedaProgenitor('padre', 'MACHO', 'reg', form);
    configurarBusquedaProgenitor('madre', 'HEMBRA', 'reg', form);
  });

  const fechaNacimiento = form.elements['fechaNacidoEnFinca'];
  const edad = form.elements['edad'];

  // Calcula los años cumplidos desde la fecha real de nacimiento.
  function calcularEdad(fecha) {
    if (!fecha || !isValidDate(fecha) || fecha > todayIso()) return '';

    const [anio, mes, dia] = fecha.split('-').map(Number);
    const hoy = new Date();
    let anios = hoy.getFullYear() - anio;

    if (
      hoy.getMonth() + 1 < mes ||
      (hoy.getMonth() + 1 === mes && hoy.getDate() < dia)
    ) {
      anios--;
    }

    return Math.max(0, anios);
  }

  function actualizarEdad() {
    if (!fechaNacimiento || !edad) return;

    const fecha = fechaNacimiento.value;

    if (fecha) {
      edad.value = calcularEdad(fecha);
      edad.readOnly = true;
      edad.title =
        'La edad se calcula automáticamente desde la fecha de nacimiento.';
    } else {
      edad.readOnly = false;
      edad.title =
        'Escriba la edad manualmente si no conoce la fecha de nacimiento.';
    }
  }

  fechaNacimiento?.addEventListener('input', actualizarEdad);
  fechaNacimiento?.addEventListener('change', actualizarEdad);

  form.addEventListener('reset', () => {
    setTimeout(() => {
      actualizarEdad();
      limpiarSeleccionProgenitores();
    }, 0);
  });

  actualizarEdad();

  // Carga los animales desde el backend.
  
async function cargarProgenitores() {
    const respuesta = await Api.get('/api/animales/progenitores');
    const animales = asArray(respuesta);

    progenitores = animales
        .map(animal => ({
            codigo: String(val(animal, 'codigo3') ?? '').trim(),
            nombre: String(val(animal, 'nombreAnimal') ?? '').trim(),
            sexo: String(val(animal, 'sexo') ?? '').trim().toUpperCase()
        }))
        .filter(animal => animal.codigo);
}


  // Configura la búsqueda para Padre o Madre.
function configurarBusquedaProgenitor(campo, sexoPermitido, prefijo = 'reg', formulario = null) {
    const buscar = document.getElementById(`${prefijo}-${campo}-buscar`);
    const seleccionado = formulario
        ? formulario.elements[campo]
        : document.getElementById(`${prefijo}-${campo}`);

    const sugerencias = document.getElementById(`${prefijo}-${campo}-sugerencias`);

    if (!buscar || !seleccionado || !sugerencias) {
        console.error(`No se encontraron los controles de ${campo} con prefijo ${prefijo}.`);
        return;
    }

    const disponibles = progenitores.filter(
        animal => animal.sexo === sexoPermitido
    );

    function mostrarSugerencias() {
        const texto = buscar.value.trim().toLocaleLowerCase('es');

        // Escribir de nuevo invalida la selección anterior.
        seleccionado.value = '';
        sugerencias.replaceChildren();

        if (!texto) {
            sugerencias.hidden = true;
            return;
        }

        const coincidencias = disponibles
            .filter(animal =>
                `${animal.codigo} ${animal.nombre}`
                    .toLocaleLowerCase('es')
                    .includes(texto)
            )
            .slice(0, 6);

        if (coincidencias.length === 0) {
            const vacio = document.createElement('div');
            vacio.className = 'autocomplete-vacio';
            vacio.textContent = 'No se encontraron animales coincidentes.';
            sugerencias.append(vacio);
            sugerencias.hidden = false;
            return;
        }

        coincidencias.forEach(animal => {
            const opcion = document.createElement('button');
            opcion.type = 'button';
            opcion.className = 'autocomplete-opcion';

            const titulo = document.createElement('strong');
            titulo.textContent = animal.codigo;

            const detalle = document.createElement('span');
            detalle.textContent = animal.nombre ? ` — ${animal.nombre}` : '';

            opcion.append(titulo, detalle);

            opcion.addEventListener('click', () => {
                seleccionado.value = animal.codigo;
                buscar.value = animal.nombre
                    ? `${animal.codigo} — ${animal.nombre}`
                    : animal.codigo;

                sugerencias.hidden = true;
                sugerencias.replaceChildren();
                buscar.setCustomValidity('');
            });

            sugerencias.append(opcion);
        });

        sugerencias.hidden = false;
    }

    buscar.addEventListener('input', mostrarSugerencias);
    buscar.addEventListener('focus', mostrarSugerencias);

    buscar.addEventListener('keydown', event => {
        if (event.key === 'Escape') {
            sugerencias.hidden = true;
        }
    });

    document.addEventListener('click', event => {
        if (!buscar.contains(event.target) && !sugerencias.contains(event.target)) {
            sugerencias.hidden = true;
        }
    });
}


  function limpiarSeleccionProgenitores() {
    ['padre', 'madre'].forEach(campo => {
      const buscar = document.getElementById(`reg-${campo}-buscar`);
      const sugerencias = document.getElementById(
        `reg-${campo}-sugerencias`
      );

      if (buscar) buscar.value = '';
      if (sugerencias) {
        sugerencias.hidden = true;
        sugerencias.replaceChildren();
      }
    });
  }

  // Los progenitores son opcionales, pero si se escribe una búsqueda
  // debe seleccionarse un animal válido de las sugerencias.
  function validarSeleccionProgenitores() {
    const errores = {};

    ['padre', 'madre'].forEach(campo => {
      const buscar = document.getElementById(`reg-${campo}-buscar`);
      const seleccionado = form.elements[campo];

      if (!buscar || !seleccionado) return;

      if (buscar.value.trim() && !seleccionado.value) {
        errores[campo] =
          'Seleccione un animal de las sugerencias.';
      }
    });

    return errores;
  }

  $('#limpiar').onclick = () => {
    form.reset();
    clearErrors(form);
    formMessage(msg, 'error', '');
  };

  form.addEventListener('submit', async event => {
    event.preventDefault();

    if (sending) return;

    actualizarEdad();

    ok.hidden = true;
    formMessage(msg, 'error', '');

    const { payload, errors } = readForm(form);
    Object.assign(errors, validarSeleccionProgenitores());

    if (Object.keys(errors).length) {
      showErrors(form, errors);
      formMessage(
        msg,
        'error',
        'Revise los campos marcados antes de continuar.'
      );
      return;
    }

    clearErrors(form);
    sending = true;

    try {
      await withBusy(submit, 'Registrando…', async () => {
        const res = await Api.post('/api/animales', payload);
        const codigo =
          (res && typeof res === 'object' && val(res, 'codigo3')) ||
          payload.codigo3;

        ok.innerHTML = `
          <span>Animal <strong>${esc(codigo)}</strong> registrado correctamente.</span>
          <span class="actions">
            <a class="btn btn-primary btn-sm"
               href="${pageUrl('animal', { codigo })}">Ver ficha</a>
            <a class="btn btn-secondary btn-sm"
               href="${pageUrl('inventario')}">Ir al inventario</a>
          </span>`;

        ok.hidden = false;
        ok.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        toast('Animal registrado correctamente.', 'ok');

        form.reset();
        clearErrors(form);
        _sugg = null;
        loadSuggestions().then(applySuggestions);
      });
    } catch (error) {
      formMessage(msg, 'error', errorMessage(error));
      toast(errorMessage(error), 'error');
    } finally {
      sending = false;
    }
  });

  // Carga las sugerencias después de crear los controles.
  cargarProgenitores();
})();
