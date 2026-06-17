---
tags: [tfi, dengue, contexto-global, resumen, indice, sived]
proyecto: "SIVED-Perú — Sistema de Vigilancia y Dashboard Epidemiológico de Dengue"
curso: "Programación en Ciencia de Datos — Maestría UNAM Moquegua 2026-I"
created: 2026-06-10
parent: "[[00 - MOC Seleccion de Tema (Panel Mirofish)]]"
---

# 🌐 Contexto Global del Proyecto — SIVED-Perú

> [!abstract] Resumen ejecutivo
> Trabajo Final Integrador del curso de **Programación en Ciencia de Datos**. Tras un proceso de selección multi-agente, se eligió y consolidó el tema **Dashboard Epidemiológico de Dengue (SIVED-Perú)**: una app **POO + Flask + PostgreSQL** que gestiona casos, integra **clima vía API** y un **modelo de IA de forecasting**, con **datos reales** de OpenDengue y Open-Meteo. Esta nota recopila todo el progreso, los insights y el inventario de datos.

## 🧭 Estado actual
- ✅ **Tema confirmado:** Dengue (🥇 #1 del ponderado). Proyecto consolidado: se descartaron Educación y Vial.
- ✅ **Datos reales descargados y validados** (casos + clima + geografía).
- ✅ **Documento técnico:** Cap. II (Análisis), III (UML, 5 diagramas), IV (ER 17 tablas + Script SQL + Diccionario).
- ✅ **BD validada:** 17 tablas, 36 165 filas, **0 violaciones de integridad referencial**.
- ⏳ **Pendiente:** Cap. V (implementación Flask), Cap. VI (resultados/dashboard), entrenamiento del modelo de forecasting.

## 🕑 Línea de tiempo de decisiones clave
1. **Panel "Mirofish"** — 4 agentes evaluadores (DBA, Open-Data, Data Science/IA, PM) puntuaron 15 temas en criterios ponderados → [[01 - Matriz de Evaluacion Multi-Agente]].
2. **Criterio C8 (simplicidad/efectividad)** añadido después → reordenó el podio: **Transparencia cayó del #2 al #6**, Educación subió, Producción Agrícola entró.
3. **Top 4 final:** Dengue (4.52) · ECE (4.43) · Vial (4.33) · Producción Agrícola (4.22).
4. **Datasets reales** descargados para los 3 primeros; el portal estatal estaba **bloqueado por WAF**, se usaron mirrors abiertos.
5. **Confirmación de Dengue** y desarrollo del documento técnico.
6. **Reducción del modelo** de 21 → **17 tablas** (fusiones limpias) y **consolidación a solo Dengue**.

## 💡 Insights clave
- **El dengue es el tema con mejor relación datos-reales / simplicidad / impacto:** casos reales por provincia/semana + clima → forecasting con sentido. Problema-país vivo (peor brote de la historia 2023-24).
- **WAF estatal:** `datosabiertos.gob.pe` bloquea accesos externos → se recurre a **OpenDengue (OPS)** y **Open-Meteo**, fuentes abiertas equivalentes y verificables.
- **Honestidad de datos:** el núcleo es real; las notificaciones individuales (`caso_dengue`) se obtienen **expandiendo los conteos reales 2023**; `paciente`/`profesional`/`establecimiento` son sintéticos (la microdata MINSA no es pública). Se declara en el documento.
- **17 tablas > mínimo 15**, sin inflar: geografía real + vigilancia + clima + seguridad por rol + salida de IA.
- **Integración doble** que pide la rúbrica: **API REST (Open-Meteo)** + **modelo IA (SARIMA/Prophet)** con polimorfismo.
- **Validación real:** la carga se probó en una BD con FK activadas → 0 huérfanos; consulta de prueba coherente con el brote real (Piura/Lambayeque/Lima).

## 🔌 Fuentes de datos reales (con enlaces / API)
| Fuente | Tipo de acceso | Qué aporta | Enlace |
|---|---|---|---|
| **OpenDengue v1.3 (PAHO)** | GitHub raw (ZIP CSV) | Casos de dengue por provincia y semana (2014-2023) | https://opendengue.org · https://github.com/OpenDengue/master-repo |
| **Open-Meteo (ERA5)** | **API REST** | Clima semanal (temp., precipitación) por departamento | https://archive-api.open-meteo.com/v1/archive |
| **HDX — COD-AB Perú** | descarga XLSX | Geografía oficial (UBIGEO depto/prov/distrito) | https://data.humdata.org/dataset/cod-ab-per |
| *(no usadas en la BD final)* World Bank | API REST | Indicadores nacionales (contexto) | https://api.worldbank.org |

## 🗂️ Inventario de tablas (17) — origen, función y tipos

| # | Tabla | Origen de datos (fuente / link) | Descripción / funcionalidad | Tipos de datos (columnas clave) |
|---|---|---|---|---|
| 1 | `departamento` | ✅ Real — [COD-AB Perú](https://data.humdata.org/dataset/cod-ab-per) | Catálogo geográfico nivel 1 (25 deptos) | `id_departamento` VARCHAR(10) PK, `nombre` VARCHAR, `latitud/longitud` DECIMAL(9,5) |
| 2 | `provincia` | ✅ Real — COD-AB + nombres de [OpenDengue](https://github.com/OpenDengue/master-repo) | Catálogo geográfico nivel 2 | `id_provincia` VARCHAR(10) PK, `id_departamento` FK, `nombre` VARCHAR |
| 3 | `distrito` | ✅ Real — COD-AB | Catálogo geográfico nivel 3 | `id_distrito` VARCHAR(12) PK, `id_provincia` FK, `lat/lon` DECIMAL |
| 4 | `establecimiento_salud` | ⚙️ Sintético s/ distritos reales | EE.SS. que notifican casos | `id_establecimiento` INT PK, `categoria` VARCHAR, `id_distrito` FK |
| 5 | `profesional_salud` | ⚙️ Sintético | Personal que registra notificaciones | `id_profesional` INT PK, `colegiatura` VARCHAR, `id_establecimiento` FK |
| 6 | `paciente` | ⚙️ Sintético (anonimizado) | Personas afectadas | `id_paciente` INT PK, `fecha_nacimiento` DATE, `sexo` CHAR(1), `id_distrito` FK |
| 7 | `periodo_epidemiologico` | ✅ Real (derivado de fechas OpenDengue) | Semanas epidemiológicas (eje temporal) | `id_periodo` INT PK, `anio/numero_semana` INT, `fecha_inicio/fin` DATE |
| 8 | `serotipo` | ✅ Catálogo OMS | Serotipos DENV-1…4 | `id_serotipo` INT PK, `codigo` VARCHAR(10) |
| 9 | `clasificacion_caso` | ✅ Catálogo OMS | Clasificación clínica del caso | `id_clasificacion` INT PK, `nombre` VARCHAR(80) |
| 10 | `caso_dengue` | ✅/⚙️ Expansión de conteos reales [OpenDengue](https://github.com/OpenDengue/master-repo) 2023 | **Hecho central**: notificación individual | `id_caso` INT PK, 6× FK, `fecha_notificacion` DATE, `tipo_diagnostico/condicion` VARCHAR (CHECK) |
| 11 | `signo_sintoma` | ✅ Catálogo clínico | Síntomas posibles | `id_sintoma` INT PK, `nombre` VARCHAR(80) |
| 12 | `caso_signo` | ⚙️ Generado (relación) | Asociativa **N:M** caso↔síntoma | `id_caso` + `id_sintoma` (PK compuesta, FK) |
| 13 | `diagnostico_laboratorio` | ⚙️ Generado | Pruebas de laboratorio por caso | `id_diagnostico` INT PK, `tipo_prueba` VARCHAR(10) CHECK, `id_caso` FK |
| 14 | `medida_climatica` | ✅ **Real** — [Open-Meteo](https://archive-api.open-meteo.com/v1/archive) | Clima semanal (covariable del forecasting) | `id_medida` INT PK, `temp_media_c/temp_max_c` DECIMAL(5,2), `precip_total_mm` DECIMAL(7,2), 2× FK |
| 15 | `prediccion_alerta` | ⚙️ Salida del modelo IA | Pronóstico + alerta de brote | `id_prediccion` INT PK, `casos_predichos/esperados` INT, `nivel_alerta/modelo` VARCHAR, `mae` DECIMAL, `generado_en` TIMESTAMP |
| 16 | `rol` | ⚙️ Seed | Roles del sistema (permisos por rol) | `id_rol` INT PK, `nombre_rol` VARCHAR(40), `permisos` VARCHAR(200) |
| 17 | `usuario` | ⚙️ Seed | Cuentas de acceso (login) | `id_usuario` INT PK, `nombre_usuario` VARCHAR UNIQUE, `hash_contrasena` VARCHAR, `id_rol` FK, `activo` BOOLEAN |

> Leyenda: ✅ real · ⚙️ sintético/derivado · PK = clave primaria · FK = clave foránea · CHECK = restricción de dominio.

## 📚 Entregables y enlaces
| Documento | Nota |
|---|---|
| Selección de tema (índice) | [[00 - MOC Seleccion de Tema (Panel Mirofish)]] |
| Matriz multi-agente | [[01 - Matriz de Evaluacion Multi-Agente]] |
| Datos del proyecto | [[07 - Datasets (3 Ganadores)]] |
| Cap. II — Análisis | [[08 - Cap II - Analisis (Dengue)]] |
| Cap. III — UML (5 diagramas) | [[09 - Cap III - Modelamiento UML (Dengue)]] |
| Cap. IV — Modelo ER | [[10 - Cap IV - Diseno de Base de Datos (Dengue)]] |
| Cap. IV — Script SQL + Diccionario | [[12 - Cap IV - Script SQL y Diccionario de Datos (Dengue)]] |
| Contexto de resultados | [[11 - Contexto de Resultados (Dengue)]] |
| Diagramas PNG/SVG | `analisis/diagramas/` |
| Scripts y CSV de carga | `sql/01_esquema.sql` · `sql/02_carga.sql` · `sql/datos/` |

## ▶️ Próximos pasos
1. **Cap. V — Implementación:** esqueleto Flask por capas (modelos POO, repositorios, controladores, vistas).
2. **Modelo de forecasting:** entrenar SARIMA/Prophet con `caso_dengue` + `medida_climatica`, reportar **MAE/RMSE/MAPE**.
3. **Cap. VI — Resultados:** dashboard (curva epidémica, mapa, heatmap), consultas y reportes.
