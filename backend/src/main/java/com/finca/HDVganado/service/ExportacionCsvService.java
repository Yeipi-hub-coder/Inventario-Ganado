
package com.finca.HDVganado.service;

import com.finca.HDVganado.model.HojaDeVidaAnimal;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.lang.reflect.Field;
import java.lang.reflect.Modifier;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Service
public class ExportacionCsvService {

    public byte[] exportar(List<HojaDeVidaAnimal> animales) {
        Field[] campos = HojaDeVidaAnimal.class.getDeclaredFields();

        try (Workbook workbook = new XSSFWorkbook();
             ByteArrayOutputStream salida = new ByteArrayOutputStream()) {

            Sheet hoja = workbook.createSheet("Inventario");

            // Estilo de encabezados
            CellStyle estiloEncabezado = workbook.createCellStyle();
            Font fuente = workbook.createFont();
            fuente.setBold(true);
            estiloEncabezado.setFont(fuente);
            estiloEncabezado.setFillForegroundColor(
                    IndexedColors.LIGHT_BLUE.getIndex()
            );
            estiloEncabezado.setFillPattern(
                    FillPatternType.SOLID_FOREGROUND
            );

            // Crear encabezados
            Row encabezado = hoja.createRow(0);
            int columna = 0;

            for (Field campo : campos) {
                if (campo.isSynthetic()
                        || Modifier.isStatic(campo.getModifiers())) {
                    continue;
                }

                Cell celda = encabezado.createCell(columna++);
                celda.setCellValue(campo.getName());
                celda.setCellStyle(estiloEncabezado);
            }

            // Crear filas con los animales
            int numeroFila = 1;

            for (HojaDeVidaAnimal animal : animales) {
                Row fila = hoja.createRow(numeroFila++);
                columna = 0;

                for (Field campo : campos) {
                    if (campo.isSynthetic()
                            || Modifier.isStatic(campo.getModifiers())) {
                        continue;
                    }

                    campo.setAccessible(true);
                    Object valor = campo.get(animal);
                    Cell celda = fila.createCell(columna++);

                    if (valor == null) {
                        celda.setBlank();
                    } else if (valor instanceof Number numero) {
                        celda.setCellValue(numero.doubleValue());
                    } else if (valor instanceof Boolean booleano) {
                        celda.setCellValue(booleano);
                    } else if (valor instanceof LocalDate fecha) {
                        celda.setCellValue(fecha.toString());
                    } else if (valor instanceof LocalDateTime fechaHora) {
                        celda.setCellValue(fechaHora.toString());
                    } else {
                        celda.setCellValue(valor.toString());
                    }
                }
            }

            // Activar filtros en todas las columnas
            if (columna > 0) {
                hoja.setAutoFilter(
                        new org.apache.poi.ss.util.CellRangeAddress(
                                0,
                                animales.isEmpty() ? 0 : animales.size(),
                                0,
                                encabezado.getLastCellNum() - 1
                        )
                );
            }

            // Mantener los encabezados visibles al desplazarse
            hoja.createFreezePane(0, 1);

            // Ajustar el ancho de las columnas
            for (int i = 0; i < encabezado.getLastCellNum(); i++) {
                hoja.autoSizeColumn(i);
            }

            workbook.write(salida);
            return salida.toByteArray();

        } catch (IOException | IllegalAccessException e) {
            throw new IllegalStateException(
                    "No se pudo exportar el inventario a Excel.", e
            );
        }
    }
}
