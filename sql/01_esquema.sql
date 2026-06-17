-- ============================================================
--  SIVED-Perú — Sistema de Vigilancia y Dashboard de Dengue
--  Capítulo IV — Script SQL (DDL)  |  Gestor: PostgreSQL 14+
--  17 tablas con integridad referencial.
-- ============================================================

DROP TABLE IF EXISTS usuario, rol, prediccion_alerta, medida_climatica,
  diagnostico_laboratorio, caso_signo, signo_sintoma, caso_dengue,
  clasificacion_caso, serotipo, periodo_epidemiologico, paciente,
  profesional_salud, establecimiento_salud, distrito, provincia, departamento CASCADE;

-- ---------- 1. Geografía (real, COD-AB / UBIGEO) ----------
CREATE TABLE departamento (
    id_departamento     VARCHAR(10)  PRIMARY KEY,
    nombre_departamento VARCHAR(120) NOT NULL,
    latitud             DECIMAL(9,5),
    longitud            DECIMAL(9,5),
    area_km2            DECIMAL(12,1)
);

CREATE TABLE provincia (
    id_provincia     VARCHAR(10)  PRIMARY KEY,
    nombre_provincia VARCHAR(120) NOT NULL,
    id_departamento  VARCHAR(10)  NOT NULL REFERENCES departamento(id_departamento),
    latitud          DECIMAL(9,5),
    longitud         DECIMAL(9,5)
);

CREATE TABLE distrito (
    id_distrito     VARCHAR(12)  PRIMARY KEY,
    nombre_distrito VARCHAR(120) NOT NULL,
    id_provincia    VARCHAR(10)  NOT NULL REFERENCES provincia(id_provincia),
    latitud         DECIMAL(9,5),
    longitud        DECIMAL(9,5)
);

-- ---------- 2. Red de salud ----------
CREATE TABLE establecimiento_salud (
    id_establecimiento     INTEGER      PRIMARY KEY,
    nombre_establecimiento VARCHAR(160) NOT NULL,
    categoria              VARCHAR(60),
    id_distrito            VARCHAR(12)  NOT NULL REFERENCES distrito(id_distrito)
);

CREATE TABLE profesional_salud (
    id_profesional     INTEGER     PRIMARY KEY,
    nombres            VARCHAR(80) NOT NULL,
    apellidos          VARCHAR(80) NOT NULL,
    colegiatura        VARCHAR(20),
    cargo              VARCHAR(40),
    id_establecimiento INTEGER     NOT NULL REFERENCES establecimiento_salud(id_establecimiento)
);

CREATE TABLE paciente (
    id_paciente      INTEGER PRIMARY KEY,
    documento        VARCHAR(15),
    nombres          VARCHAR(80),
    apellidos        VARCHAR(80),
    fecha_nacimiento DATE,
    sexo             CHAR(1) CHECK (sexo IN ('M','F')),
    id_distrito      VARCHAR(12) NOT NULL REFERENCES distrito(id_distrito)
);

-- ---------- 3. Catálogos de vigilancia ----------
CREATE TABLE periodo_epidemiologico (
    id_periodo    INTEGER PRIMARY KEY,
    anio          INTEGER NOT NULL,
    numero_semana INTEGER NOT NULL,
    fecha_inicio  DATE    NOT NULL,
    fecha_fin     DATE    NOT NULL
);

CREATE TABLE serotipo (
    id_serotipo INTEGER     PRIMARY KEY,
    codigo      VARCHAR(10) NOT NULL,
    descripcion VARCHAR(60)
);

CREATE TABLE clasificacion_caso (
    id_clasificacion INTEGER     PRIMARY KEY,
    nombre           VARCHAR(80) NOT NULL,
    descripcion      VARCHAR(160)
);

CREATE TABLE signo_sintoma (
    id_sintoma INTEGER     PRIMARY KEY,
    nombre     VARCHAR(80) NOT NULL
);

-- ---------- 4. Hecho central + detalle ----------
CREATE TABLE caso_dengue (
    id_caso               INTEGER PRIMARY KEY,
    id_paciente           INTEGER NOT NULL REFERENCES paciente(id_paciente),
    id_establecimiento    INTEGER NOT NULL REFERENCES establecimiento_salud(id_establecimiento),
    id_profesional        INTEGER NOT NULL REFERENCES profesional_salud(id_profesional),
    id_periodo            INTEGER NOT NULL REFERENCES periodo_epidemiologico(id_periodo),
    id_serotipo           INTEGER          REFERENCES serotipo(id_serotipo),
    id_clasificacion      INTEGER NOT NULL REFERENCES clasificacion_caso(id_clasificacion),
    fecha_notificacion    DATE    NOT NULL,
    fecha_inicio_sintomas DATE,
    tipo_diagnostico      VARCHAR(15) CHECK (tipo_diagnostico IN ('Probable','Confirmado')),
    condicion             VARCHAR(12) CHECK (condicion IN ('Vivo','Fallecido')),
    CHECK (fecha_inicio_sintomas <= fecha_notificacion)
);

CREATE TABLE caso_signo (
    id_caso    INTEGER NOT NULL REFERENCES caso_dengue(id_caso) ON DELETE CASCADE,
    id_sintoma INTEGER NOT NULL REFERENCES signo_sintoma(id_sintoma),
    PRIMARY KEY (id_caso, id_sintoma)
);

CREATE TABLE diagnostico_laboratorio (
    id_diagnostico  INTEGER PRIMARY KEY,
    id_caso         INTEGER NOT NULL REFERENCES caso_dengue(id_caso) ON DELETE CASCADE,
    tipo_prueba     VARCHAR(10) CHECK (tipo_prueba IN ('NS1','IgM','RT-PCR')),
    resultado       VARCHAR(20),
    fecha_resultado DATE
);

-- ---------- 5. Clima (real, Open-Meteo) y salida de IA ----------
CREATE TABLE medida_climatica (
    id_medida       INTEGER PRIMARY KEY,
    id_departamento VARCHAR(10) NOT NULL REFERENCES departamento(id_departamento),
    id_periodo      INTEGER     NOT NULL REFERENCES periodo_epidemiologico(id_periodo),
    temp_media_c    DECIMAL(5,2),
    temp_max_c      DECIMAL(5,2),
    precip_total_mm DECIMAL(7,2)
);

CREATE TABLE prediccion_alerta (
    id_prediccion    INTEGER PRIMARY KEY,
    id_departamento  VARCHAR(10) NOT NULL REFERENCES departamento(id_departamento),
    id_periodo       INTEGER     NOT NULL REFERENCES periodo_epidemiologico(id_periodo),
    casos_observados INTEGER,
    casos_predichos  INTEGER,
    casos_esperados  INTEGER,
    nivel_alerta     VARCHAR(20),
    modelo           VARCHAR(30),
    mae              DECIMAL(8,2),
    generado_en      TIMESTAMP
);

-- ---------- 6. Seguridad (roles y permisos) ----------
CREATE TABLE rol (
    id_rol      INTEGER     PRIMARY KEY,
    nombre_rol  VARCHAR(40) NOT NULL,
    permisos    VARCHAR(200),
    descripcion VARCHAR(160)
);

CREATE TABLE usuario (
    id_usuario      INTEGER     PRIMARY KEY,
    nombre_usuario  VARCHAR(40) NOT NULL UNIQUE,
    hash_contrasena VARCHAR(200) NOT NULL,
    correo          VARCHAR(120),
    id_rol          INTEGER     NOT NULL REFERENCES rol(id_rol),
    id_profesional  INTEGER              REFERENCES profesional_salud(id_profesional),
    activo          BOOLEAN DEFAULT TRUE
);

-- ---------- Índices para el dashboard ----------
CREATE INDEX idx_caso_periodo        ON caso_dengue(id_periodo);
CREATE INDEX idx_caso_establecimiento ON caso_dengue(id_establecimiento);
CREATE INDEX idx_caso_clasificacion  ON caso_dengue(id_clasificacion);
CREATE INDEX idx_clima_depto_periodo ON medida_climatica(id_departamento, id_periodo);
CREATE INDEX idx_prov_depto          ON provincia(id_departamento);
CREATE INDEX idx_dist_prov           ON distrito(id_provincia);
