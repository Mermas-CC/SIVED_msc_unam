---
tags: [tfi, dengue, documento-tecnico, capitulo-4, sql, diccionario-datos]
created: 2026-06-10
parent: "[[00 - MOC Seleccion de Tema (Panel Mirofish)]]"
---

# 🧱 Capítulo IV — Script SQL y Diccionario de Datos

> Complementa el [[10 - Cap IV - Diseno de Base de Datos (Dengue)|Modelo ER]]. Sistema **SIVED-Perú**, gestor **PostgreSQL 14+**.
> Archivos ejecutables: `sql/01_esquema.sql` (DDL) · `sql/02_carga.sql` (carga) · `sql/datos/*.csv` (17 CSV listos).

## ✅ Validación de la carga
Probado cargando los 17 CSV en una BD con **claves foráneas activadas**:

| Métrica | Resultado |
|---|---|
| Tablas creadas | **17 / 17** |
| Filas cargadas | **36 165** |
| Violaciones de integridad referencial | **0 ✅** |
| Consulta de prueba (top deptos por casos) | Piura (1 390), Lambayeque (633), Lima (594) — *coincide con el brote real 2023* |

**Volumen por tabla:** caso_dengue 3 896 · caso_signo 11 761 · diagnostico_laboratorio 2 354 · medida_climatica 13 075 (real) · periodo_epidemiologico 523 · paciente 3 896 · profesional_salud 240 · distrito 120 · establecimiento_salud 120 · provincia 69 · departamento 25 · prediccion_alerta 64 · rol 4 · usuario 4 · serotipo 4 · clasificacion_caso 3 · signo_sintoma 7.

> [!note] Procedencia
> `medida_climatica` y la geografía son **datos reales**; `caso_dengue` se obtuvo **expandiendo los conteos reales de OpenDengue (2023)** a notificaciones individuales (paciente/profesional sintéticos). Declarado en [[11 - Contexto de Resultados (Dengue)]].

## ▶️ Cómo ejecutar
```bash
createdb sived
psql -d sived -f sql/01_esquema.sql      # crea las 17 tablas
cd sql && psql -d sived -f 02_carga.sql   # carga los CSV (\copy usa rutas relativas a sql/)
```

## 📖 Diccionario de Datos

### 1. `departamento`  *(geografía — real)*
| Columna | Tipo | Nulo | Clave | Descripción |
|---|---|---|---|---|
| id_departamento | VARCHAR(10) | No | **PK** | Código UBIGEO del departamento (p. ej. PE20) |
| nombre_departamento | VARCHAR(120) | No | | Nombre del departamento |
| latitud / longitud | DECIMAL(9,5) | Sí | | Centroide |
| area_km2 | DECIMAL(12,1) | Sí | | Superficie |

### 2. `provincia`  *(geografía — real)*
| Columna | Tipo | Nulo | Clave | Descripción |
|---|---|---|---|---|
| id_provincia | VARCHAR(10) | No | **PK** | UBIGEO de la provincia |
| nombre_provincia | VARCHAR(120) | No | | Nombre |
| id_departamento | VARCHAR(10) | No | **FK** → departamento | Departamento al que pertenece |
| latitud / longitud | DECIMAL(9,5) | Sí | | Centroide |

### 3. `distrito`  *(geografía — real)*
| Columna | Tipo | Nulo | Clave | Descripción |
|---|---|---|---|---|
| id_distrito | VARCHAR(12) | No | **PK** | UBIGEO del distrito |
| nombre_distrito | VARCHAR(120) | No | | Nombre |
| id_provincia | VARCHAR(10) | No | **FK** → provincia | Provincia |
| latitud / longitud | DECIMAL(9,5) | Sí | | Centroide |

### 4. `establecimiento_salud`
| Columna | Tipo | Nulo | Clave | Descripción |
|---|---|---|---|---|
| id_establecimiento | INTEGER | No | **PK** | Identificador del EE.SS. |
| nombre_establecimiento | VARCHAR(160) | No | | Nombre |
| categoria | VARCHAR(60) | Sí | | Puesto / Centro / Hospital |
| id_distrito | VARCHAR(12) | No | **FK** → distrito | Ubicación |

### 5. `profesional_salud`
| Columna | Tipo | Nulo | Clave | Descripción |
|---|---|---|---|---|
| id_profesional | INTEGER | No | **PK** | Identificador |
| nombres / apellidos | VARCHAR(80) | No | | Datos del profesional |
| colegiatura | VARCHAR(20) | Sí | | Nº de colegiatura (CMP) |
| cargo | VARCHAR(40) | Sí | | Médico / Enfermero / Técnico |
| id_establecimiento | INTEGER | No | **FK** → establecimiento_salud | EE.SS. donde labora |

### 6. `paciente`
| Columna | Tipo | Nulo | Clave | Descripción |
|---|---|---|---|---|
| id_paciente | INTEGER | No | **PK** | Identificador (anonimizado) |
| documento | VARCHAR(15) | Sí | | Documento de identidad |
| nombres / apellidos | VARCHAR(80) | Sí | | Datos demográficos |
| fecha_nacimiento | DATE | Sí | | Para calcular edad |
| sexo | CHAR(1) | Sí | CHECK ∈ {M,F} | Sexo |
| id_distrito | VARCHAR(12) | No | **FK** → distrito | Distrito de residencia |

### 7. `periodo_epidemiologico`  *(temporal — real)*
| Columna | Tipo | Nulo | Clave | Descripción |
|---|---|---|---|---|
| id_periodo | INTEGER | No | **PK** | Identificador de la semana |
| anio | INTEGER | No | | Año |
| numero_semana | INTEGER | No | | Semana epidemiológica (1–53) |
| fecha_inicio / fecha_fin | DATE | No | | Domingo a sábado |

### 8. `serotipo`  ·  ### 9. `clasificacion_caso`  ·  ### 11. `signo_sintoma`  *(catálogos)*
| Tabla | Columnas | Descripción |
|---|---|---|
| `serotipo` | id_serotipo **PK**, codigo, descripcion | DENV-1…DENV-4 |
| `clasificacion_caso` | id_clasificacion **PK**, nombre, descripcion | Sin/con señales de alarma, grave |
| `signo_sintoma` | id_sintoma **PK**, nombre | Fiebre, cefalea, mialgias… |

### 10. `caso_dengue`  *(hecho central)*
| Columna | Tipo | Nulo | Clave | Descripción |
|---|---|---|---|---|
| id_caso | INTEGER | No | **PK** | Identificador de la notificación |
| id_paciente | INTEGER | No | **FK** → paciente | Paciente afectado |
| id_establecimiento | INTEGER | No | **FK** → establecimiento_salud | EE.SS. notificante |
| id_profesional | INTEGER | No | **FK** → profesional_salud | Quien registra |
| id_periodo | INTEGER | No | **FK** → periodo_epidemiologico | Semana epidemiológica |
| id_serotipo | INTEGER | **Sí** | **FK** → serotipo | Serotipo (si se identificó) |
| id_clasificacion | INTEGER | No | **FK** → clasificacion_caso | Clasificación clínica |
| fecha_notificacion | DATE | No | | Fecha de notificación |
| fecha_inicio_sintomas | DATE | Sí | CHECK ≤ notificación | Inicio de síntomas |
| tipo_diagnostico | VARCHAR(15) | Sí | CHECK ∈ {Probable,Confirmado} | Tipo de diagnóstico |
| condicion | VARCHAR(12) | Sí | CHECK ∈ {Vivo,Fallecido} | Condición final |

### 12. `caso_signo`  *(asociativa N:M)*
| Columna | Tipo | Clave | Descripción |
|---|---|---|---|
| id_caso | INTEGER | **PK, FK** → caso_dengue (ON DELETE CASCADE) | Caso |
| id_sintoma | INTEGER | **PK, FK** → signo_sintoma | Síntoma presentado |

### 13. `diagnostico_laboratorio`
| Columna | Tipo | Nulo | Clave | Descripción |
|---|---|---|---|---|
| id_diagnostico | INTEGER | No | **PK** | Identificador |
| id_caso | INTEGER | No | **FK** → caso_dengue (CASCADE) | Caso asociado |
| tipo_prueba | VARCHAR(10) | Sí | CHECK ∈ {NS1,IgM,RT-PCR} | Tipo de prueba |
| resultado | VARCHAR(20) | Sí | | Positivo / Negativo |
| fecha_resultado | DATE | Sí | | Fecha del resultado |

### 14. `medida_climatica`  *(real — Open-Meteo)*
| Columna | Tipo | Nulo | Clave | Descripción |
|---|---|---|---|---|
| id_medida | INTEGER | No | **PK** | Identificador |
| id_departamento | VARCHAR(10) | No | **FK** → departamento | Departamento medido |
| id_periodo | INTEGER | No | **FK** → periodo_epidemiologico | Semana |
| temp_media_c / temp_max_c | DECIMAL(5,2) | Sí | | Temperatura (°C) |
| precip_total_mm | DECIMAL(7,2) | Sí | | Precipitación semanal (mm) |

### 15. `prediccion_alerta`  *(salida IA + alerta de brote)*
| Columna | Tipo | Nulo | Clave | Descripción |
|---|---|---|---|---|
| id_prediccion | INTEGER | No | **PK** | Identificador |
| id_departamento | VARCHAR(10) | No | **FK** → departamento | Departamento |
| id_periodo | INTEGER | No | **FK** → periodo_epidemiologico | Semana proyectada |
| casos_observados / casos_predichos / casos_esperados | INTEGER | Sí | | Observado, pronóstico y umbral |
| nivel_alerta | VARCHAR(20) | Sí | | Normal / Vigilancia / Alerta |
| modelo | VARCHAR(30) | Sí | | SARIMA / Prophet |
| mae | DECIMAL(8,2) | Sí | | Error del modelo |
| generado_en | TIMESTAMP | Sí | | Fecha de generación |

### 16. `rol`  ·  ### 17. `usuario`  *(seguridad)*
| Tabla | Columnas | Descripción |
|---|---|---|
| `rol` | id_rol **PK**, nombre_rol, permisos, descripcion | Administrador / Epidemiólogo / Notificador / Autoridad |
| `usuario` | id_usuario **PK**, nombre_usuario (UNIQUE), hash_contrasena, correo, id_rol **FK**→rol, id_profesional **FK**→profesional_salud (nullable), activo | Cuentas con acceso por rol |

## 🔎 Consultas SQL de ejemplo (para el Cap. VI)
```sql
-- Curva epidémica: casos por semana epidemiológica
SELECT pe.anio, pe.numero_semana, COUNT(*) AS casos
FROM caso_dengue c JOIN periodo_epidemiologico pe ON c.id_periodo = pe.id_periodo
GROUP BY pe.anio, pe.numero_semana ORDER BY pe.anio, pe.numero_semana;

-- Letalidad por departamento
SELECT d.nombre_departamento,
       COUNT(*) AS casos,
       SUM(CASE WHEN c.condicion='Fallecido' THEN 1 ELSE 0 END) AS fallecidos,
       ROUND(100.0*SUM(CASE WHEN c.condicion='Fallecido' THEN 1 ELSE 0 END)/COUNT(*),2) AS letalidad_pct
FROM caso_dengue c
JOIN establecimiento_salud e ON c.id_establecimiento=e.id_establecimiento
JOIN distrito di ON e.id_distrito=di.id_distrito
JOIN provincia p ON di.id_provincia=p.id_provincia
JOIN departamento d ON p.id_departamento=d.id_departamento
GROUP BY d.nombre_departamento ORDER BY casos DESC;

-- Casos vs. clima (insumo del forecasting)
SELECT pe.anio, pe.numero_semana, COUNT(c.id_caso) AS casos,
       AVG(m.temp_media_c) AS temp, SUM(m.precip_total_mm) AS lluvia
FROM periodo_epidemiologico pe
LEFT JOIN caso_dengue c ON c.id_periodo=pe.id_periodo
LEFT JOIN medida_climatica m ON m.id_periodo=pe.id_periodo
GROUP BY pe.anio, pe.numero_semana ORDER BY pe.anio, pe.numero_semana;
```

🔗 [[10 - Cap IV - Diseno de Base de Datos (Dengue)]] · [[11 - Contexto de Resultados (Dengue)]] · [[00 - MOC Seleccion de Tema (Panel Mirofish)]]
