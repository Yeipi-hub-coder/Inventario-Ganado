package com.finca.HDVganado.service;

import com.finca.HDVganado.exception.AnimalNoEncontradoException;
import com.finca.HDVganado.model.HojaDeVidaAnimal;
import com.finca.HDVganado.repository.AnimalRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;

import java.time.LocalDate;
import java.util.List;
import java.util.Set;

@Service
public class AnimalService {
    private final AnimalRepository animalRepository;

    public AnimalService(AnimalRepository animalRepository) {
        this.animalRepository = animalRepository;
    }

    //Registrar un animal nuevo
    @Transactional
    public HojaDeVidaAnimal registrar(HojaDeVidaAnimal animal) {

        if (animal.getCodigo3() == null
                || animal.getCodigo3().isBlank()) {
            throw new IllegalArgumentException(
                    "El Codigo3 es obligatorio."
            );
        }

        if (animalRepository
                .findFirstByCodigo3OrderByCodigo1Desc(
                        animal.getCodigo3()
                ).isPresent()) {
            throw new IllegalArgumentException(
                    "Ya existe un animal con ese Codigo3."
            );
        }

        animal.setCodigo1(null);

        calcularProximoParto(animal);

        return animalRepository.save(animal);
    }

    // Consultar la última versión de un animal.
    @Transactional(readOnly = true)
    public HojaDeVidaAnimal obtenerActual(String codigo3) {

        return animalRepository
                .findFirstByCodigo3OrderByCodigo1Desc(codigo3)
                .orElseThrow(() -> new AnimalNoEncontradoException(
                        "No existe un animal con Codigo3: " + codigo3
                ));
    }

    // Consultar todas las versiones de un animal.
    @Transactional(readOnly = true)
    public List<HojaDeVidaAnimal> obtenerHistorial(String codigo3) {

        List<HojaDeVidaAnimal> historial =
                animalRepository.findByCodigo3OrderByCodigo1Desc(
                        codigo3
                );

        if (historial.isEmpty()) {
            throw new IllegalArgumentException(
                    "No existe un animal con ese Codigo3."
            );
        }

        return historial;
    }

    // Consultar el inventario actual.
    @Transactional(readOnly = true)
    public List<HojaDeVidaAnimal> obtenerInventario() {
        return animalRepository.inventarioActual();
    }

    // Buscar las últimas versiones por fecha de ingreso.
    @Transactional(readOnly = true)
    public List<HojaDeVidaAnimal> buscarPorIngreso(
            LocalDate inicio,
            LocalDate fin) {

        validarFechas(inicio, fin);

        return animalRepository.buscarUltimasVersionesPorIngreso(
                inicio, fin
        );
    }

    @Transactional(readOnly = true)
    public List<HojaDeVidaAnimal> buscarPorNacimiento(
            LocalDate inicio,
            LocalDate fin) {

        validarFechas(inicio, fin);

        return animalRepository.buscarUltimasVersionesPorNacimiento(
                inicio, fin
        );
    }

    // Editar creando una nueva versión del animal.
    // Los campos enviados como null permanecen sin cambios.

    public HojaDeVidaAnimal actualizar(
            String codigo3,
            HojaDeVidaAnimal cambios,
            Set<String> fechasBorradas) {

        HojaDeVidaAnimal actual = obtenerActual(codigo3);
        validarAnimalActivo(actual);

        if (cambios.getEstaEnFinca() != null
                || cambios.getVendido() != null) {
            throw new IllegalArgumentException(
                    "No puedes modificar estos campos directamente."
            );
        }

        HojaDeVidaAnimal nuevaVersion = copiarAnimal(actual);

        aplicarCambios(nuevaVersion, cambios);

        if (fechasBorradas.contains("fechaIngresoFinca")) {
            nuevaVersion.setFechaIngresoFinca(null);
        }

        if (fechasBorradas.contains("fechaNacidoEnFinca")) {
            nuevaVersion.setFechaNacidoEnFinca(null);
        }

        if (fechasBorradas.contains("fechaUltimoParto")) {
            nuevaVersion.setFechaUltimoParto(null);
        }

        if (fechasBorradas.contains("fechaPalpada")) {
            nuevaVersion.setFechaPalpada(null);
        }

        if (fechasBorradas.contains("aproximacionProximoParto")) {
            nuevaVersion.setAproximacionProximoParto(null);
        }

        nuevaVersion.setCodigo1(null);

        if (!fechasBorradas.contains("aproximacionProximoParto")) {
            calcularProximoParto(nuevaVersion);
        }

        return animalRepository.save(nuevaVersion);
    }


    // Registrar la venta de un animal.
    @Transactional
    public HojaDeVidaAnimal registrarVenta(String codigo3) {

        HojaDeVidaAnimal actual =
                obtenerUltimaVersion(codigo3);

        validarAnimalActivo(actual);

        HojaDeVidaAnimal nuevaVersion = copiarAnimal(actual);

        nuevaVersion.setCodigo1(null);
        nuevaVersion.setEstaEnFinca("NO");
        nuevaVersion.setVendido("Vendido");

        return animalRepository.save(nuevaVersion);
    }

    // Registrar la muerte de un animal.
    @Transactional
    public HojaDeVidaAnimal registrarMuerte(String codigo3) {

        HojaDeVidaAnimal actual =
                obtenerUltimaVersion(codigo3);

        validarAnimalActivo(actual);

        HojaDeVidaAnimal nuevaVersion = copiarAnimal(actual);

        nuevaVersion.setCodigo1(null);
        nuevaVersion.setEstaEnFinca("NO");
        nuevaVersion.setVendido("Por muerte");

        return animalRepository.save(nuevaVersion);
    }

    // Buscar la última versión de un Codigo3.
    private HojaDeVidaAnimal obtenerUltimaVersion(
            String codigo3) {

        return animalRepository
                .findFirstByCodigo3OrderByCodigo1Desc(codigo3)
                .orElseThrow(() -> new IllegalArgumentException(
                        "No existe un animal con Codigo3: " + codigo3
                ));
    }

    // Copiar los datos sin copiar el identificador de la versión.
    private HojaDeVidaAnimal copiarAnimal(
            HojaDeVidaAnimal origen) {

        HojaDeVidaAnimal copia = new HojaDeVidaAnimal();

        copia.setCodigo2(origen.getCodigo2());
        copia.setCodigo3(origen.getCodigo3());

        copia.setFechaIngresoFinca(origen.getFechaIngresoFinca());
        copia.setFechaNacidoEnFinca(origen.getFechaNacidoEnFinca());

        copia.setEstaEnFinca(origen.getEstaEnFinca());
        copia.setEstaEnOtrasFincas(origen.getEstaEnOtrasFincas());
        copia.setVendido(origen.getVendido());
        copia.setSexo(origen.getSexo());

        copia.setPesoAlNacerOEntrarKilos(
                origen.getPesoAlNacerOEntrarKilos()
        );

        copia.setPadre(origen.getPadre());
        copia.setMadre(origen.getMadre());

        copia.setCantidadLeche(origen.getCantidadLeche());
        copia.setEficiencia(origen.getEficiencia());
        copia.setDescripcion(origen.getDescripcion());
        copia.setNombreAnimal(origen.getNombreAnimal());
        copia.setEdad(origen.getEdad());
        copia.setRaza(origen.getRaza());

        copia.setNumeroPartos(origen.getNumeroPartos());
        copia.setFechaUltimoParto(origen.getFechaUltimoParto());
        copia.setSexoParto(origen.getSexoParto());
        copia.setDiasAbiertos(origen.getDiasAbiertos());
        copia.setFechaPalpada(origen.getFechaPalpada());
        copia.setTiempoPrenhes(origen.getTiempoPrenhes());

        copia.setAproximacionProximoParto(
                origen.getAproximacionProximoParto()
        );

        copia.setCarneOLeche(origen.getCarneOLeche());
        copia.setCategoria(origen.getCategoria());
        copia.setVacunas(origen.getVacunas());

        // FechaRegistroVersion la genera MySQL automáticamente.
        // Codigo1 también lo genera MySQL.

        return copia;
    }

    // Aplicar únicamente los campos que se enviaron.
    private void aplicarCambios(
            HojaDeVidaAnimal destino,
            HojaDeVidaAnimal cambios) {

        if (cambios.getCodigo2() != null) {
            destino.setCodigo2(cambios.getCodigo2());
        }

        if (cambios.getFechaIngresoFinca() != null) {
            destino.setFechaIngresoFinca(
                    cambios.getFechaIngresoFinca()
            );
        }

        if (cambios.getFechaNacidoEnFinca() != null) {
            destino.setFechaNacidoEnFinca(
                    cambios.getFechaNacidoEnFinca()
            );
        }

        if (cambios.getEstaEnOtrasFincas() != null) {
            destino.setEstaEnOtrasFincas(
                    cambios.getEstaEnOtrasFincas()
            );
        }

        if (cambios.getSexo() != null) {
            destino.setSexo(cambios.getSexo());
        }

        if (cambios.getPesoAlNacerOEntrarKilos() != null) {
            destino.setPesoAlNacerOEntrarKilos(
                    cambios.getPesoAlNacerOEntrarKilos()
            );
        }

        if (cambios.getPadre() != null) {
            destino.setPadre(cambios.getPadre());
        }

        if (cambios.getMadre() != null) {
            destino.setMadre(cambios.getMadre());
        }

        if (cambios.getCantidadLeche() != null) {
            destino.setCantidadLeche(cambios.getCantidadLeche());
        }

        if (cambios.getEficiencia() != null) {
            destino.setEficiencia(cambios.getEficiencia());
        }

        if (cambios.getDescripcion() != null) {
            destino.setDescripcion(cambios.getDescripcion());
        }

        if (cambios.getNombreAnimal() != null) {
            destino.setNombreAnimal(cambios.getNombreAnimal());
        }

        if (cambios.getEdad() != null) {
            destino.setEdad(cambios.getEdad());
        }

        if (cambios.getRaza() != null) {
            destino.setRaza(cambios.getRaza());
        }

        // Registrar un nuevo parto cuando cambia la fecha.
        if (cambios.getFechaUltimoParto() != null) {
            LocalDate fechaAnterior = destino.getFechaUltimoParto();
            LocalDate fechaNueva = cambios.getFechaUltimoParto();

            if (fechaAnterior == null) {
                destino.setFechaUltimoParto(fechaNueva);

                int partosActuales = destino.getNumeroPartos() == null
                        ? 0
                        : destino.getNumeroPartos();

                destino.setNumeroPartos(partosActuales + 1);
            } else if (fechaNueva.isAfter(fechaAnterior)) {
                // Una fecha posterior representa un nuevo parto.
                destino.setFechaUltimoParto(fechaNueva);

                int partosActuales = destino.getNumeroPartos() == null
                        ? 0
                        : destino.getNumeroPartos();

                destino.setNumeroPartos(partosActuales + 1);

                // Días transcurridos entre el parto anterior y el nuevo.
                int dias = (int) java.time.temporal.ChronoUnit.DAYS
                        .between(fechaAnterior, fechaNueva);

                destino.setDiasAbiertos(dias);
            } else if (fechaNueva.equals(fechaAnterior)) {
                // No cambia la fecha: no se suma otro parto.
                destino.setFechaUltimoParto(fechaNueva);
            } else {
                throw new IllegalArgumentException(
                        "La nueva fecha del último parto no puede ser anterior a la fecha registrada."
                );
            }
        }

        // Permitir cambios manuales de estos campos solo cuando no se
        // haya cambiado la fecha del último parto.
        if (cambios.getFechaUltimoParto() == null) {
            if (cambios.getNumeroPartos() != null) {
                destino.setNumeroPartos(cambios.getNumeroPartos());
            }

            if (cambios.getDiasAbiertos() != null) {
                destino.setDiasAbiertos(cambios.getDiasAbiertos());
            }
        }

        if (cambios.getSexoParto() != null) {
            destino.setSexoParto(cambios.getSexoParto());
        }

        if (cambios.getFechaPalpada() != null) {
            destino.setFechaPalpada(cambios.getFechaPalpada());
        }

        if (cambios.getTiempoPrenhes() != null) {
            destino.setTiempoPrenhes(cambios.getTiempoPrenhes());
        }

        if (cambios.getAproximacionProximoParto() != null) {
            destino.setAproximacionProximoParto(
                    cambios.getAproximacionProximoParto()
            );
        }

        if (cambios.getCarneOLeche() != null) {
            destino.setCarneOLeche(cambios.getCarneOLeche());
        }

        if (cambios.getCategoria() != null) {
            destino.setCategoria(cambios.getCategoria());
        }
    }

    private void validarAnimalActivo(HojaDeVidaAnimal animal) {

        if (!"SI".equals(animal.getEstaEnFinca())
                || animal.getVendido() != null) {
            throw new IllegalArgumentException(
                    "El animal no está disponible en el inventario."
            );
        }
    }

    private void validarFechas(
            LocalDate inicio,
            LocalDate fin) {

        if (inicio == null || fin == null) {
            throw new IllegalArgumentException(
                    "Las fechas de inicio y fin son obligatorias."
            );
        }

        if (inicio.isAfter(fin)) {
            throw new IllegalArgumentException(
                    "La fecha inicial no puede ser posterior a la final."
            );
        }
    }

    public List<HojaDeVidaAnimal> filtrarInventario(
            String categoria,
            String sexo,
            String raza,
            LocalDate inicio,
            LocalDate fin) {

        if (inicio != null && fin != null && inicio.isAfter(fin)) {
            throw new IllegalArgumentException(
                    "La fecha inicial no puede ser posterior a la fecha final."
            );
        }

        return animalRepository.filtrarInventario(
                categoria, sexo, raza, inicio, fin
        );
    }

    private void validarProgenitores(HojaDeVidaAnimal animal) {
        validarProgenitor(animal.getPadre(), animal.getCodigo3(), "Padre");
        validarProgenitor(animal.getMadre(), animal.getCodigo3(), "Madre");
    }

    private void validarProgenitor(
            String codigoProgenitor,
            String codigoAnimal,
            String campo) {

        if (codigoProgenitor == null || codigoProgenitor.isBlank()) {
            return;
        }

        codigoProgenitor = codigoProgenitor.trim();

        if (codigoProgenitor.equalsIgnoreCase(codigoAnimal)) {
            throw new IllegalArgumentException(
                    campo + ": un animal no puede ser su propio progenitor."
            );
        }

        final String codigo = codigoProgenitor;

        HojaDeVidaAnimal progenitor = animalRepository
                .findFirstByCodigo3OrderByCodigo1Desc(codigo)
                .orElseThrow(() -> new IllegalArgumentException(
                        campo + ": no existe un animal con Codigo3 " + codigo
                ));

        if ("Padre".equals(campo)
                && !"MACHO".equalsIgnoreCase(progenitor.getSexo())) {
            throw new IllegalArgumentException(
                    "El animal seleccionado como padre debe ser MACHO."
            );
        }

        if ("Madre".equals(campo)
                && !"HEMBRA".equalsIgnoreCase(progenitor.getSexo())) {
            throw new IllegalArgumentException(
                    "El animal seleccionado como madre debe ser HEMBRA."
            );
        }
    }

    @Transactional(readOnly = true)
    public List<HojaDeVidaAnimal> obtenerTodosLosAnimales() {
        return animalRepository.todasLasUltimasVersiones();
    }

    private void calcularProximoParto(HojaDeVidaAnimal animal) {
        LocalDate fechaPalpada = animal.getFechaPalpada();
        Integer tiempoPrenhes = animal.getTiempoPrenhes();

        if (fechaPalpada == null || tiempoPrenhes == null) {
            return;
        }

        int mesesRestantes = 9 - tiempoPrenhes;

        if (mesesRestantes < 0) {
            throw new IllegalArgumentException(
                    "El tiempo de preñez no puede superar los 9 meses."
            );
        }

        animal.setAproximacionProximoParto(
                fechaPalpada.plusMonths(mesesRestantes)
        );
    }
}
