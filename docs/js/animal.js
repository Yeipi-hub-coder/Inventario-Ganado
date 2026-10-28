
'use strict';

/* Ficha: GET/PATCH /api/animales/{codigo3}
   Venta: POST …/venta
   Fallecimiento: POST …/muerte */

(function () {
    const root = $('#animal-root');
    const c3 = (new URLSearchParams(location.search).get('codigo') || '').trim();
    const base = '/api/animales/' + enc(c3);

    let animal = null;
    let busy = false;
    let progenitores = [];

    if (!c3) {
        root.innerHTML = `
            <div class="card empty">
                <h2>No se indicó ningún animal</h2>
                <p>Elija uno desde el inventario o búsquelo por código.</p>
                <a class="btn btn-primary" href="${pageUrl('buscar')}">
                    Buscar animal
                </a>
            </div>`;
        return;
    }

    async function load() {
        showLoading(root, 'Cargando ficha…');

        try {
            animal = normalizeAnimal(await Api.get(base));

            if (!animal) {
                throw new ApiError(
                    'No se encontró información del animal.',
                    { status: 404 }
                );
            }

            draw();
        } catch (e) {
            if (e.status === 404) {
                root.innerHTML = `
                    <div class="card empty">
                        <h2>No existe un animal con el código «${esc(c3)}»</h2>
                        <p>Revise el código e intente de nuevo.</p>
                        <a class="btn btn-primary" href="${pageUrl('buscar')}">
                            Buscar animal
                        </a>
                    </div>`;
            } else {
                showError(root, e, load);
            }
        }
    }

    function draw() {
        const e = estadoInfo(animal);
        const active = isActive(animal);

        root.innerHTML = `
            <section class="card ficha-head">
                <div>
                    <p class="muted">Código ${esc(c3)}</p>
                    <h1>${esc(val(animal, 'nombreAnimal') || 'Animal sin nombre')}</h1>
                    <span class="badge badge-${e.cls}">${esc(e.text)}</span>
                    <span class="muted">
                        · Versión actual: ${dash(val(animal, 'codigo1'))}
                    </span>
                </div>

                <div class="actions" id="acciones">
                    <button type="button" class="btn btn-primary" id="b-editar">
                        Editar información
                    </button>

                    <a class="btn btn-secondary"
                       href="${pageUrl('historial', { codigo: c3 })}">
                        Consultar historial
                    </a>

                    <button type="button" class="btn btn-venta" id="b-venta"${active ? '' : ' disabled'}>
                        Registrar venta
                    </button>

                    <button type="button" class="btn btn-danger" id="b-muerte"${active ? '' : ' disabled'}>
                        Registrar fallecimiento
                    </button>

                    <button type="button" class="btn btn-ghost" id="b-csv">
                        Exportar ficha CSV
                    </button>
                </div>
            </section>

            ${active ? '' : `
                <div class="alert alert-warn">
                    Este animal ya no está activo en el inventario (${esc(e.text)}).
                    No se pueden registrar ventas ni fallecimientos; la ficha y
                    el historial siguen disponibles.
                </div>
            `}

            <section class="card" id="panel-edicion" hidden>
                <h2>Editar información</h2>

                <p class="muted">
                    Solo se enviarán los campos que usted cambie. Al guardar
                    se crea una nueva versión; las anteriores se conservan
                    en el historial. La venta y el fallecimiento se registran
                    con sus propios botones.
                </p>

                <form id="form-edicion" novalidate>
                    <div id="campos-edicion"></div>
                    <p id="edit-msg" hidden></p>

                    <div class="form-actions">
                        <button type="button" class="btn btn-secondary" id="b-cancelar">
                            Cancelar
                        </button>

                        <button type="submit" class="btn btn-primary">
                            Guardar cambios
                        </button>
                    </div>
                </form>
            </section>

            ${renderDetail(animal)}
        `;

        $('#b-editar').onclick = openEdit;

        $('#b-cancelar').onclick = () => {
            $('#panel-edicion').hidden = true;
        };

        $('#form-edicion').addEventListener('submit', saveEdit);
        $('#b-venta').onclick = () => closeLife('venta');
        $('#b-muerte').onclick = () => closeLife('muerte');

        $('#b-csv').onclick = e => {
            exportCsv(e.currentTarget, base, {}, `ficha_${c3}.csv`);
        };
    }

    // Carga los animales disponibles como progenitores.
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

    // Configura el autocompletado de Padre o Madre.
    function configurarBusquedaProgenitor(campo, sexoPermitido) {
        const buscar = document.getElementById(`ed-${campo}-buscar`);
        const formulario = $('#form-edicion');
        const seleccionado = formulario.elements[campo];
        const sugerencias = document.getElementById(`ed-${campo}-sugerencias`);

        if (!buscar || !seleccionado || !sugerencias) {
            console.error(`No se encontraron los controles de ${campo}.`);
            return;
        }

        const disponibles = progenitores.filter(
            progenitor => progenitor.sexo === sexoPermitido
        );

        // Mostrar el progenitor que ya está guardado.
        const codigoActual = String(seleccionado.value ?? '').trim();
        const actual = disponibles.find(
            progenitor => progenitor.codigo === codigoActual
        );

        buscar.value = actual
            ? (actual.nombre
                ? `${actual.codigo} — ${actual.nombre}`
                : actual.codigo)
            : codigoActual;

        function mostrarSugerencias(limpiarSeleccion) {
            const texto = buscar.value.trim().toLocaleLowerCase('es');

            if (limpiarSeleccion) {
                seleccionado.value = '';
            }

            sugerencias.replaceChildren();

            if (!texto) {
                sugerencias.hidden = true;
                return;
            }

            const coincidencias = disponibles
                .filter(progenitor =>
                    `${progenitor.codigo} ${progenitor.nombre}`
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

            coincidencias.forEach(progenitor => {
                const opcion = document.createElement('button');
                opcion.type = 'button';
                opcion.className = 'autocomplete-opcion';

                const titulo = document.createElement('strong');
                titulo.textContent = progenitor.codigo;

                const detalle = document.createElement('span');
                detalle.textContent = progenitor.nombre
                    ? ` — ${progenitor.nombre}`
                    : '';

                opcion.append(titulo, detalle);

                opcion.addEventListener('click', () => {
                    seleccionado.value = progenitor.codigo;

                    buscar.value = progenitor.nombre
                        ? `${progenitor.codigo} — ${progenitor.nombre}`
                        : progenitor.codigo;

                    sugerencias.hidden = true;
                    sugerencias.replaceChildren();
                    buscar.setCustomValidity('');
                });

                sugerencias.append(opcion);
            });

            sugerencias.hidden = false;
        }

        // Al escribir se invalida la selección anterior.
        buscar.addEventListener('input', () => {
            mostrarSugerencias(true);
        });

        // Al enfocar se muestran coincidencias sin borrar el valor guardado.
        buscar.addEventListener('focus', () => {
            mostrarSugerencias(false);
        });

        buscar.addEventListener('keydown', event => {
            if (event.key === 'Escape') {
                sugerencias.hidden = true;
            }
        });

        document.addEventListener('click', event => {
            if (
                !buscar.contains(event.target) &&
                !sugerencias.contains(event.target)
            ) {
                sugerencias.hidden = true;
            }
        });
    }

    async function openEdit() {
        const panel = $('#panel-edicion');

        renderFormFields($('#campos-edicion'), {
            values: animal,
            edit: true,
            prefix: 'ed'
        });

        panel.hidden = false;
        panel.scrollIntoView({ behavior: 'smooth', block: 'start' });

        loadSuggestions().then(applySuggestions);

        try {
            await cargarProgenitores();

            configurarBusquedaProgenitor('padre', 'MACHO');
            configurarBusquedaProgenitor('madre', 'HEMBRA');
        } catch (error) {
            console.error('Error cargando progenitores:', error);
            toast('No se pudieron cargar los progenitores.', 'error');
        }
    }

    async function saveEdit(ev) {
        ev.preventDefault();

        if (busy) return;

        const form = ev.currentTarget;
        const msg = $('#edit-msg');

        formMessage(msg, 'error', '');

        const { payload, errors } = readForm(form, { original: animal });

        if (Object.keys(errors).length) {
            showErrors(form, errors);
            formMessage(msg, 'error', 'Revise los campos marcados.');
            return;
        }

        clearErrors(form);

        if (!Object.keys(payload).length) {
            formMessage(msg, 'info', 'No hay cambios para guardar.');
            return;
        }

        busy = true;

        await withBusy($('button[type=submit]', form), 'Guardando…', async () => {
            try {
                await Api.patch(base, payload);

                toast(
                    'Cambios guardados: se creó una nueva versión del animal.',
                    'ok'
                );

                await load();
            } catch (e) {
                formMessage(msg, 'error', errorMessage(e));
            }
        });

        busy = false;
    }

    async function closeLife(kind) {
        if (busy) return;

        const sale = kind === 'venta';
        const nombre = val(animal, 'nombreAnimal');

        const okc = await confirmDialog({
            title: sale ? 'Registrar venta' : 'Registrar fallecimiento',
            body: `
                <p>
                    Animal: <strong>${esc(nombre || 'Sin nombre')}</strong>
                    (código <strong>${esc(c3)}</strong>).
                </p>
                <p>
                    Se creará una nueva versión del animal con
                    ${sale ? 'la venta' : 'el fallecimiento'} registrado.
                    El animal dejará de aparecer en el inventario actual
                    y se conservará en el historial.
                </p>
                <p>Desde esta pantalla no podrá deshacer la operación.</p>
            `,
            confirmText: sale ? 'Registrar venta' : 'Registrar fallecimiento',
            cls: sale ? 'btn-venta' : 'btn-danger'
        });

        if (!okc) return;

        busy = true;
        $$('#acciones button').forEach(b => {
            b.disabled = true;
        });

        try {
            await Api.post(`${base}/${kind}`);

            toast(
                sale
                    ? 'Venta registrada. Se creó una nueva versión.'
                    : 'Fallecimiento registrado. Se creó una nueva versión.',
                'ok'
            );
        } catch (e) {
            toast(errorMessage(e), 'error');
        }

        busy = false;
        await load();
    }

    load();
})();
