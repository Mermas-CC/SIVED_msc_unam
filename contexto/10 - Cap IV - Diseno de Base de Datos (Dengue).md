---
tags: [tfi, dengue, documento-tecnico, capitulo-4, base-de-datos, modelo-er, mermaid]
created: 2026-06-10
parent: "[[00 - MOC Seleccion de Tema (Panel Mirofish)]]"
---

# 🗄️ Capítulo IV — Diseño de Base de Datos

> Sistema **SIVED-Perú**. Gestor objetivo: **PostgreSQL** (o MySQL). **17 tablas** relacionadas con integridad referencial (supera el mínimo de 15 del PDF).

## 4.1 Modelo Entidad-Relación

```mermaid
erDiagram
    DEPARTAMENTO ||--o{ PROVINCIA : contiene
    PROVINCIA ||--o{ DISTRITO : contiene
    DISTRITO ||--o{ ESTABLECIMIENTO_SALUD : ubica
    DISTRITO ||--o{ PACIENTE : reside
    ESTABLECIMIENTO_SALUD ||--o{ PROFESIONAL_SALUD : emplea
    ESTABLECIMIENTO_SALUD ||--o{ CASO_DENGUE : notifica
    PACIENTE ||--o{ CASO_DENGUE : presenta
    PROFESIONAL_SALUD ||--o{ CASO_DENGUE : registra
    PERIODO_EPIDEMIOLOGICO ||--o{ CASO_DENGUE : agrupa
    SEROTIPO ||--o{ CASO_DENGUE : identifica
    CLASIFICACION_CASO ||--o{ CASO_DENGUE : clasifica
    CASO_DENGUE ||--o{ DIAGNOSTICO_LABORATORIO : posee
    CASO_DENGUE ||--o{ CASO_SIGNO : detalla
    SIGNO_SINTOMA ||--o{ CASO_SIGNO : aparece_en
    DEPARTAMENTO ||--o{ MEDIDA_CLIMATICA : mide
    PERIODO_EPIDEMIOLOGICO ||--o{ MEDIDA_CLIMATICA : fecha
    DEPARTAMENTO ||--o{ PREDICCION_ALERTA : proyecta
    PERIODO_EPIDEMIOLOGICO ||--o{ PREDICCION_ALERTA : horizonte
    ROL ||--o{ USUARIO : asigna
    PROFESIONAL_SALUD ||--o| USUARIO : habilita

    DEPARTAMENTO {
        varchar id_departamento PK
        varchar nombre_departamento
        decimal latitud
        decimal longitud
        decimal area_km2
    }
    PROVINCIA {
        varchar id_provincia PK
        varchar nombre_provincia
        varchar id_departamento FK
        decimal latitud
        decimal longitud
    }
    DISTRITO {
        varchar id_distrito PK
        varchar nombre_distrito
        varchar id_provincia FK
        decimal latitud
        decimal longitud
    }
    ESTABLECIMIENTO_SALUD {
        int id_establecimiento PK
        varchar nombre_establecimiento
        varchar categoria
        varchar id_distrito FK
    }
    PROFESIONAL_SALUD {
        int id_profesional PK
        varchar nombres
        varchar apellidos
        varchar colegiatura
        varchar cargo
        int id_establecimiento FK
    }
    PACIENTE {
        int id_paciente PK
        varchar documento
        varchar nombres
        varchar apellidos
        date fecha_nacimiento
        char sexo
        varchar id_distrito FK
    }
    PERIODO_EPIDEMIOLOGICO {
        int id_periodo PK
        int anio
        int numero_semana
        date fecha_inicio
        date fecha_fin
    }
    SEROTIPO {
        int id_serotipo PK
        varchar codigo
        varchar descripcion
    }
    CLASIFICACION_CASO {
        int id_clasificacion PK
        varchar nombre
        varchar descripcion
    }
    CASO_DENGUE {
        int id_caso PK
        int id_paciente FK
        int id_establecimiento FK
        int id_profesional FK
        int id_periodo FK
        int id_serotipo FK
        int id_clasificacion FK
        date fecha_notificacion
        date fecha_inicio_sintomas
        varchar tipo_diagnostico
        varchar condicion
    }
    SIGNO_SINTOMA {
        int id_sintoma PK
        varchar nombre
    }
    CASO_SIGNO {
        int id_caso PK, FK
        int id_sintoma PK, FK
    }
    DIAGNOSTICO_LABORATORIO {
        int id_diagnostico PK
        int id_caso FK
        varchar tipo_prueba
        varchar resultado
        date fecha_resultado
    }
    MEDIDA_CLIMATICA {
        int id_medida PK
        varchar id_departamento FK
        int id_periodo FK
        decimal temp_media_c
        decimal temp_max_c
        decimal precip_total_mm
    }
    PREDICCION_ALERTA {
        int id_prediccion PK
        varchar id_departamento FK
        int id_periodo FK
        int casos_observados
        int casos_predichos
        int casos_esperados
        varchar nivel_alerta
        varchar modelo
        decimal mae
        timestamp generado_en
    }
    USUARIO {
        int id_usuario PK
        varchar nombre_usuario
        varchar hash_contrasena
        varchar correo
        int id_rol FK
        int id_profesional FK
        bool activo
    }
    ROL {
        int id_rol PK
        varchar nombre_rol
        varchar permisos
        varchar descripcion
    }
```

## 4.2 Inventario de tablas (17)

| # | Tabla | Tipo | Origen de datos |
|---|---|---|---|
| 1 | `departamento` | Dimensión geográfica | ✅ real (COD-AB) |
| 2 | `provincia` | Dimensión geográfica | ✅ real |
| 3 | `distrito` | Dimensión geográfica | ✅ real |
| 4 | `establecimiento_salud` | Dimensión | ⚙️ sintético s/ distritos reales |
| 5 | `profesional_salud` | Dimensión | operativo |
| 6 | `paciente` | Dimensión | operativo (anonimizado) |
| 7 | `periodo_epidemiologico` | Dimensión temporal | ✅ real (derivado) |
| 8 | `serotipo` | Catálogo | catálogo OMS |
| 9 | `clasificacion_caso` | Catálogo | catálogo OMS |
| 10 | `caso_dengue` | **Hecho central** | operativo (+ histórico real) |
| 11 | `signo_sintoma` | Catálogo | clínico |
| 12 | `caso_signo` | Asociativa N:M | operativo |
| 13 | `diagnostico_laboratorio` | Detalle/composición (incluye `tipo_prueba`) | operativo |
| 14 | `medida_climatica` | Hecho | ✅ real (Open-Meteo) |
| 15 | `prediccion_alerta` | Hecho (salida IA + alerta de brote) | generado por el modelo |
| 16 | `usuario` | Seguridad | operativo |
| 17 | `rol` | Seguridad (permisos por rol) | operativo |

## 4.3 Reglas de integridad
- **PK** en todas las tablas; **clave compuesta** en `caso_signo` (`id_caso`, `id_sintoma`).
- **FK** con `ON DELETE RESTRICT` en catálogos y `ON DELETE CASCADE` en `diagnostico_laboratorio` y `caso_signo` respecto a `caso_dengue`.
- **Dominios**: `sexo ∈ {M,F}`, `condicion ∈ {Vivo, Fallecido}`, `tipo_diagnostico ∈ {Probable, Confirmado}`, `tipo_prueba ∈ {NS1, IgM, RT-PCR}`, fechas con `fecha_inicio_sintomas ≤ fecha_notificacion`.
- **Índices** sobre FK y sobre (`id_periodo`, `id_departamento`) para acelerar el dashboard.
- **Seguridad por rol**: los permisos se modelan como atributo `permisos` de `rol` (no requiere tablas extra).

> [!note] Relación con los datasets reales
> El histórico real de OpenDengue está **agregado por provincia/semana** → se carga en una vista/tabla analítica derivada de `caso_dengue` (o directamente en el dashboard). El CRUD opera sobre **notificaciones individuales**; el clima real (`medida_climatica`) y la geografía son cargas directas de los CSV de [[07 - Datasets (3 Ganadores)]].

🔗 [[08 - Cap II - Analisis (Dengue)]] · [[09 - Cap III - Modelamiento UML (Dengue)]] · [[11 - Contexto de Resultados (Dengue)]]
