package com.finca.HDVganado.repository;

import com.finca.HDVganado.model.HojaDeVidaAnimal;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface AnimalRepository
        extends JpaRepository<HojaDeVidaAnimal, Integer> {

    // Obtiene la última versión de un animal.
    Optional<HojaDeVidaAnimal>
    findFirstByCodigo3OrderByCodigo1Desc(String codigo3);

    // Obtiene todas las versiones del historial.
    List<HojaDeVidaAnimal>
    findByCodigo3OrderByCodigo1Desc(String codigo3);

    // Obtiene únicamente los animales que están actualmente en inventario.
    @Query(value = """
        SELECT a.*
        FROM HojaDeVidaAnimal a
        INNER JOIN (
            SELECT Codigo3, MAX(Codigo1) AS UltimoCodigo
            FROM HojaDeVidaAnimal
            GROUP BY Codigo3
        ) v ON a.Codigo1 = v.UltimoCodigo
        WHERE a.EstaEnFinca = 'SI'
          AND a.Vendido IS NULL
        ORDER BY a.Codigo3
        """, nativeQuery = true)
    List<HojaDeVidaAnimal> inventarioActual();

    // Obtiene las últimas versiones registradas dentro del rango de fechas.
    @Query(value = """
        SELECT a.*
        FROM HojaDeVidaAnimal a
        INNER JOIN (
            SELECT Codigo3, MAX(Codigo1) AS UltimoCodigo
            FROM HojaDeVidaAnimal
            GROUP BY Codigo3
        ) v ON a.Codigo1 = v.UltimoCodigo
        WHERE a.FechaIngresoFinca BETWEEN :inicio AND :fin
        ORDER BY a.Codigo3
        """, nativeQuery = true)
    List<HojaDeVidaAnimal> buscarUltimasVersionesPorIngreso(
            @Param("inicio") LocalDate inicio,
            @Param("fin") LocalDate fin
    );

    @Query(value = """
    SELECT a.*
    FROM HojaDeVidaAnimal a
    INNER JOIN (
        SELECT Codigo3, MAX(Codigo1) AS UltimoCodigo
        FROM HojaDeVidaAnimal
        GROUP BY Codigo3
    ) v ON a.Codigo1 = v.UltimoCodigo
    WHERE a.EstaEnFinca = 'SI'
      AND a.Vendido IS NULL
      AND (:categoria IS NULL OR a.Categoria = :categoria)
      AND (:sexo IS NULL OR a.Sexo = :sexo)
      AND (:raza IS NULL OR a.Raza = :raza)
      AND (:inicio IS NULL OR a.FechaIngresoFinca >= :inicio)
      AND (:fin IS NULL OR a.FechaIngresoFinca <= :fin)
    ORDER BY a.Codigo3
    """, nativeQuery = true)
    List<HojaDeVidaAnimal> filtrarInventario(
            @Param("categoria") String categoria,
            @Param("sexo") String sexo,
            @Param("raza") String raza,
            @Param("inicio") LocalDate inicio,
            @Param("fin") LocalDate fin
    );
}
