package com.finca.HDVganado.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.groups.Default;
import com.finca.HDVganado.validation.Registro;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import com.fasterxml.jackson.annotation.JsonPropertyOrder;

@JsonPropertyOrder({
        "codigo1",
        "codigo2",
        "codigo3",
        "fechaIngresoFinca",
        "fechaNacidoEnFinca",
        "estaEnFinca",
        "estaEnOtrasFincas",
        "vendido",
        "sexo",
        "pesoAlNacerOEntrarKilos",
        "padre",
        "madre",
        "cantidadLeche",
        "eficiencia",
        "descripcion",
        "nombreAnimal",
        "edad",
        "raza",
        "numeroPartos",
        "fechaUltimoParto",
        "sexoParto",
        "diasAbiertos",
        "fechaPalpada",
        "tiempoPrenhes",
        "aproximacionProximoParto",
        "carneOLeche",
        "fechaRegistroVersion",
        "categoria"
})
@Entity
@Table(name = "HojaDeVidaAnimal")
@Getter
@Setter
@NoArgsConstructor
public class HojaDeVidaAnimal {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "Codigo1")
    private Integer codigo1;

    @Column(name = "Codigo2", unique = true)
    private String codigo2;

    @NotBlank(
            message = "El Codigo3 es obligatorio.",
            groups = {Registro.class, Default.class}
    )
    private String codigo3;

    @Column(name = "FechaIngresoFinca")
    private LocalDate fechaIngresoFinca;

    @Column(name = "FechaNacidoEnFinca")
    private LocalDate fechaNacidoEnFinca;

    @NotNull(
            message = "Debes indicar si está en esta finca.",
            groups = {Registro.class, Default.class}
    )
    @Pattern(
            regexp = "SI|NO",
            message = "EstaEnFinca debe ser SI o NO.",
            groups = {Registro.class, Default.class}
    )
    private String estaEnFinca;

    @NotNull(
            message = "Debes indicar si está en otras fincas.",
            groups = {Registro.class, Default.class}
    )
    @Pattern(
            regexp = "SI|NO",
            message = "EstaEnOtrasFincas debe ser SI o NO.",
            groups = {Registro.class, Default.class}
    )
    private String estaEnOtrasFincas;

    @Column(name = "Vendido")
    private String vendido;

    @NotNull(
            message = "El sexo es obligatorio.",
            groups = {Registro.class, Default.class}
    )
    @Pattern(
            regexp = "HEMBRA|MACHO",
            message = "El sexo debe ser HEMBRA o MACHO.",
            groups = {Registro.class, Default.class}
    )
    private String sexo;

    @Column(name = "PesoAlNacerOEntrar_kilos")
    @DecimalMin(value = "0.0",
            message = "El peso no puede ser negativo.")
    private BigDecimal pesoAlNacerOEntrarKilos;

    @Column(name = "Padre")
    private String padre;

    @Column(name = "Madre")
    private String madre;

    @Column(name = "CantidadLeche")
    private String cantidadLeche;

    @Column(name = "Eficiencia")
    private String eficiencia;

    @Column(name = "Descripcion", columnDefinition = "TEXT")
    private String descripcion;

    @Column(name = "NombreAnimal")
    private String nombreAnimal;

    @Min(value = 0, message = "La edad no puede ser negativa.")
    private Integer edad;

    @Column(name = "Raza")
    private String raza;

    @Min(value = 0, message = "El número de partos no puede ser negativo.")
    private Integer numeroPartos;

    @Column(name = "FechaUltimoParto")
    private LocalDate fechaUltimoParto;

    @Column(name = "SexoParto")
    private String sexoParto;

    @Column(name = "DiasAbiertos")
    private Integer diasAbiertos;

    @Column(name = "FechaPalpada")
    private LocalDate fechaPalpada;

    @Column(name = "TiempoPrenhes")
    private Integer tiempoPrenhes;

    @Column(name = "AproximacionProximoParto")
    private LocalDate aproximacionProximoParto;

    @Column(name = "CarneOLeche")
    private String carneOLeche;

    @Column(name = "FechaRegistroVersion",
            insertable = false, updatable = false)
    private LocalDateTime fechaRegistroVersion;

    @Column(name = "Categoria")
    private String categoria;
}
