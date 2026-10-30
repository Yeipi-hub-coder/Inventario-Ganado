
package com.finca.HDVganado.controller;

import com.finca.HDVganado.exception.AnimalNoEncontradoException;
import com.finca.HDVganado.model.HojaDeVidaAnimal;
import com.finca.HDVganado.service.AnimalService;
import com.finca.HDVganado.service.ExportacionCsvService;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.validation.annotation.Validated;
import com.finca.HDVganado.validation.Registro;
import org.springframework.web.bind.annotation.RequestParam;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import java.util.HashSet;
import java.util.Set;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/animales")
public class AnimalController {

    private final AnimalService animalService;
    private final ExportacionCsvService exportacionCsvService;
    private final ObjectMapper objectMapper;

    public AnimalController(AnimalService animalService, ExportacionCsvService exportacionCsvService, ObjectMapper objectMapper) {
        this.animalService = animalService;
        this.exportacionCsvService = exportacionCsvService;
        this.objectMapper = objectMapper;
    }

    // Consultar el inventario actual.
    @GetMapping
    public ResponseEntity<?> obtenerInventario(
            @RequestParam(defaultValue = "json") String formato) {

        return responderConsulta(
                animalService.obtenerInventario(),
                formato,
                "inventario_finca"
        );
    }

    // Registrar un animal nuevo.
    @PostMapping
    public ResponseEntity<HojaDeVidaAnimal> registrar(
            @Validated(Registro.class)
            @RequestBody HojaDeVidaAnimal animal) {

        HojaDeVidaAnimal registrado = animalService.registrar(animal);

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(registrado);
    }

    // Consultar la última versión de un animal.
    @GetMapping("/{codigo3}")
    public ResponseEntity<?> obtenerActual(
            @PathVariable String codigo3,
            @RequestParam(defaultValue = "json") String formato) {

        return responderConsulta(
                animalService.obtenerActual(codigo3),
                formato,
                "animal_" + codigo3
        );
    }

    // Consultar el historial completo de un animal.
    @GetMapping("/{codigo3}/historial")
    public ResponseEntity<?> obtenerHistorial(
            @PathVariable String codigo3,
            @RequestParam(defaultValue = "json") String formato) {

        return responderConsulta(
                animalService.obtenerHistorial(codigo3),
                formato,
                "historial_" + codigo3
        );
    }

    // Buscar animales por fecha de ingreso a la finca.
    @GetMapping("/buscar/ingreso")
    public ResponseEntity<?> buscarPorIngreso(
            @RequestParam LocalDate inicio,
            @RequestParam LocalDate fin,
            @RequestParam(defaultValue = "json") String formato) {

        return responderConsulta(
                animalService.buscarPorIngreso(inicio, fin),
                formato,
                "busqueda_por_ingreso"
        );
    }

    @GetMapping("/buscar/nacimiento")
    public ResponseEntity<?> buscarPorNacimiento(
            @RequestParam LocalDate inicio,
            @RequestParam LocalDate fin,
            @RequestParam(defaultValue = "json") String formato) {

        return responderConsulta(
                animalService.buscarPorNacimiento(inicio, fin),
                formato,
                "busqueda_por_nacimiento"
        );
    }

    // Modificar un animal creando una nueva versión.

    @PatchMapping("/{codigo3}")
    public ResponseEntity<HojaDeVidaAnimal> actualizar(
            @PathVariable String codigo3,
            @RequestBody JsonNode json) throws Exception {

        Set<String> fechasBorradas = new HashSet<>();

        String[] camposFecha = {
                "fechaIngresoFinca",
                "fechaNacidoEnFinca",
                "fechaUltimoParto",
                "fechaPalpada",
                "aproximacionProximoParto",
                "tiempoPrenhes"
        };

        for (String campo : camposFecha) {
            if (json.has(campo)) {
                JsonNode valor = json.get(campo);

                if (valor == null || valor.isNull()
                        || (valor.isTextual()
                        && valor.asText().isBlank())) {
                    fechasBorradas.add(campo);
                }
            }
        }

        HojaDeVidaAnimal cambios =
                objectMapper.treeToValue(json, HojaDeVidaAnimal.class);

        return ResponseEntity.ok(
                animalService.actualizar(
                        codigo3, cambios, fechasBorradas
                )
        );
    }


    // Registrar la venta de un animal.
    @PostMapping("/{codigo3}/venta")
    public ResponseEntity<HojaDeVidaAnimal> registrarVenta(
            @PathVariable String codigo3) {

        return ResponseEntity.ok(
                animalService.registrarVenta(codigo3)
        );
    }

    // Registrar la muerte de un animal.
    @PostMapping("/{codigo3}/muerte")
    public ResponseEntity<HojaDeVidaAnimal> registrarMuerte(
            @PathVariable String codigo3) {

        return ResponseEntity.ok(
                animalService.registrarMuerte(codigo3)
        );
    }

    // Convertir los errores de validación del servicio en HTTP 400.
    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<String> manejarError(
            IllegalArgumentException excepcion) {

        return ResponseEntity.badRequest()
                .body(excepcion.getMessage());
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<List<String>> manejarErroresValidacion(
            MethodArgumentNotValidException excepcion) {

        List<String> errores = excepcion.getBindingResult()
                .getFieldErrors()
                .stream()
                .map(error -> error.getDefaultMessage())
                .distinct()
                .toList();

        return ResponseEntity.badRequest().body(errores);
    }

    @ExceptionHandler(AnimalNoEncontradoException.class)
    public ResponseEntity<String> manejarAnimalNoEncontrado(
            AnimalNoEncontradoException excepcion) {

        return ResponseEntity
                .status(HttpStatus.NOT_FOUND)
                .body(excepcion.getMessage());
    }

    @GetMapping("/filtrar")
    public ResponseEntity<?> filtrarInventario(
            @RequestParam(required = false) String categoria,
            @RequestParam(required = false) String sexo,
            @RequestParam(required = false) String raza,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate inicio,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fin,
            @RequestParam(defaultValue = "json") String formato) {

        return responderConsulta(
                animalService.filtrarInventario(
                        categoria, sexo, raza, inicio, fin
                ),
                formato,
                "inventario_filtrado"
        );
    }



    private ResponseEntity<?> responderConsulta(
            Object datos,
            String formato,
            String nombreArchivo) {

        if ("xlsx".equalsIgnoreCase(formato)) {
            List<HojaDeVidaAnimal> animales;

            if (datos instanceof HojaDeVidaAnimal animal) {
                animales = List.of(animal);
            } else if (datos instanceof List<?> lista) {
                animales = lista.stream()
                        .map(HojaDeVidaAnimal.class::cast)
                        .toList();
            } else {
                throw new IllegalArgumentException(
                        "No se puede exportar este tipo de información."
                );
            }

            byte[] contenido =
                    exportacionCsvService.exportar(animales);

            return ResponseEntity.ok()
                    .header(
                            HttpHeaders.CONTENT_DISPOSITION,
                            "attachment; filename=\"" + nombreArchivo + ".xlsx\""
                    )
                    .contentType(MediaType.parseMediaType(
                            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                    ))
                    .body(contenido);
        }

        if ("json".equalsIgnoreCase(formato)) {
            return ResponseEntity.ok(datos);
        }

        throw new IllegalArgumentException(
                "El formato debe ser xlsx o json."
        );
    }


    @GetMapping("/progenitores")
    public ResponseEntity<List<HojaDeVidaAnimal>> obtenerProgenitores() {
        return ResponseEntity.ok(animalService.obtenerTodosLosAnimales());
    }

}

