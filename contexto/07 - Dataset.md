---
tags: [tfi, datasets, datos, dengue, entregable]
proyecto: "SIVED-Perú — Vigilancia y Dashboard Epidemiológico de Dengue"
created: 2026-06-10
updated: 2026-06-10
parent: "[[00 - MOC Seleccion de Tema (Panel Mirofish)]]"
---

# 📦 Datasets del Proyecto Dengue (SIVED-Perú)

> [!success] Qué hay aquí
> Datos **estructurados, en español y listos para compartir** entre los 4 integrantes, en `datasets/01_dengue/`. El proyecto quedó **consolidado solo en Dengue**. El núcleo es **100 % real** (casos + clima); las tablas operativas individuales se derivan por expansión de los conteos reales. Diccionario: [[12 - Cap IV - Script SQL y Diccionario de Datos (Dengue)|Cap IV — Diccionario]].

## 🔌 Fuentes reales usadas (con enlaces)
| Fuente | Acceso | Alimenta | Enlace |
|---|---|---|---|
| **OpenDengue v1.3 (PAHO)** | GitHub (ZIP CSV) | Casos reales de dengue por provincia y semana, 2014-2023 | https://opendengue.org · https://github.com/OpenDengue/master-repo |
| **Open-Meteo (ERA5)** | API REST | Clima semanal real por departamento | https://archive-api.open-meteo.com/v1/archive |
| **HDX — COD-AB Perú** | descarga XLSX | Geografía real (UBIGEO depto/prov/distrito) | https://data.humdata.org/dataset/cod-ab-per |

> [!warning] Por qué no se usó el portal estatal
> `datosabiertos.gob.pe` / `datos.gob.pe` están **bloqueados por WAF** desde fuera del Perú. OpenDengue (mirror oficial de la OPS) y HDX reemplazan la descarga directa del MINSA con datos reales equivalentes.

## 📊 Archivos en `01_dengue/`

### Datos fuente (analíticos)
| Archivo | Filas | Contenido | Origen |
|---|---|---|---|
| `hecho_casos_dengue.csv` | **18 618** | Casos por provincia y semana (574 635 casos) | ✅ OpenDengue real |
| `hecho_clima_semanal.csv` | **13 075** | Temp. y precipitación semanal por departamento | ✅ Open-Meteo real |
| `dim_periodo_epidemiologico.csv` | 521 | Semanas epidemiológicas | ✅ derivado real |
| `dim_serotipo / clasificacion_caso / signo_sintoma / tipo_prueba` | 4/3/7/3 | Catálogos clínicos (OMS) | catálogo real |
| `dim_establecimiento_salud.csv` | 120 | EE.SS. sobre distritos reales | ⚙️ sintético |

### Datos listos para la BD (`sql/datos/`)
Las **17 tablas** del modelo, alineadas al esquema y **validadas (0 violaciones FK)**. Detalle: [[12 - Cap IV - Script SQL y Diccionario de Datos (Dengue)]].

## ✅ Calidad verificada
- **Integridad referencial: 0 huérfanos / 0 violaciones FK** (probado en BD con FK activadas, 36 165 filas).
- Codificación **UTF-8**, columnas en **español sin espacios**, claves `id_*` consistentes.
- Consulta de prueba coherente con el brote real 2023: Piura, Lambayeque, Lima.

## 🔎 Trazabilidad (honestidad de datos)
- **Reales:** casos (OpenDengue 2014-2023), clima (Open-Meteo), geografía (COD-AB).
- **Derivado/sintético:** `caso_dengue` individual = expansión de los conteos reales 2023; `paciente`, `profesional_salud`, `establecimiento_salud` = sintéticos (la microdata individual del MINSA no es pública). Declarado en el documento.

🔗 [[00 - MOC Seleccion de Tema (Panel Mirofish)]] · [[02 - Dashboard Epidemiologico (Dengue)]] · [[10 - Cap IV - Diseno de Base de Datos (Dengue)]] · [[12 - Cap IV - Script SQL y Diccionario de Datos (Dengue)]]
