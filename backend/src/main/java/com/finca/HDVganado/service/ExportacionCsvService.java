package com.finca.HDVganado.service;

import com.finca.HDVganado.model.HojaDeVidaAnimal;
import org.springframework.stereotype.Service;

import java.lang.reflect.Field;
import java.lang.reflect.Modifier;
import java.util.List;

@Service
public class ExportacionCsvService {

    public String exportar(List<HojaDeVidaAnimal> animales) {
        StringBuilder csv = new StringBuilder();
        Field[] campos =
                HojaDeVidaAnimal.class.getDeclaredFields();

        // Encabezados
        boolean primero = true;

        for (Field campo : campos) {
            if (campo.isSynthetic()
                    || Modifier.isStatic(campo.getModifiers())) {
                continue;
            }

            if (!primero) {
                csv.append(';');
            }

            csv.append(escapar(campo.getName()));
            primero = false;
        }

        csv.append("\r\n");

        // Datos
        for (HojaDeVidaAnimal animal : animales) {
            primero = true;

            for (Field campo : campos) {
                if (campo.isSynthetic()
                        || Modifier.isStatic(campo.getModifiers())) {
                    continue;
                }

                if (!primero) {
                    csv.append(';');
                }

                try {
                    campo.setAccessible(true);
                    Object valor = campo.get(animal);

                    csv.append(escapar(
                            valor == null ? "" : valor.toString()
                    ));

                } catch (IllegalAccessException e) {
                    throw new IllegalStateException(
                            "No se pudo exportar el campo "
                                    + campo.getName(), e
                    );
                }

                primero = false;
            }

            csv.append("\r\n");
        }

        // BOM para mejorar la compatibilidad con Excel y tildes
        return "\uFEFF" + csv;
    }

    private String escapar(String valor) {
        return "\"" + valor.replace("\"", "\"\"") + "\"";
    }
}
