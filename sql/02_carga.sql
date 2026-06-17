-- ============================================================
--  SIVED-Perú — Sistema de Vigilancia y Dashboard de Dengue
--  Capítulo IV — Script de Carga de Datos  |  PostgreSQL
-- ============================================================

-- Nota: Ejecutar desde el directorio 'sql/' usando:
-- cd sql && psql -d sived -f 02_carga.sql

\echo Cargando tablas independientes y geográficas...

\copy departamento FROM 'datos/departamento.csv' DELIMITER ',' CSV HEADER;
\copy provincia FROM 'datos/provincia.csv' DELIMITER ',' CSV HEADER;
\copy distrito FROM 'datos/distrito.csv' DELIMITER ',' CSV HEADER;

\echo Cargando red de salud...

\copy establecimiento_salud FROM 'datos/establecimiento_salud.csv' DELIMITER ',' CSV HEADER;
\copy profesional_salud FROM 'datos/profesional_salud.csv' DELIMITER ',' CSV HEADER;
\copy paciente FROM 'datos/paciente.csv' DELIMITER ',' CSV HEADER;

\echo Cargando catálogos de vigilancia...

\copy periodo_epidemiologico FROM 'datos/periodo_epidemiologico.csv' DELIMITER ',' CSV HEADER;
\copy serotipo FROM 'datos/serotipo.csv' DELIMITER ',' CSV HEADER;
\copy clasificacion_caso FROM 'datos/clasificacion_caso.csv' DELIMITER ',' CSV HEADER;
\copy signo_sintoma FROM 'datos/signo_sintoma.csv' DELIMITER ',' CSV HEADER;

\echo Cargando hecho central y detalles (casos)...

\copy caso_dengue FROM 'datos/caso_dengue.csv' DELIMITER ',' CSV HEADER;
\copy caso_signo FROM 'datos/caso_signo.csv' DELIMITER ',' CSV HEADER;
\copy diagnostico_laboratorio FROM 'datos/diagnostico_laboratorio.csv' DELIMITER ',' CSV HEADER;

\echo Cargando clima y alertas...

\copy medida_climatica FROM 'datos/medida_climatica.csv' DELIMITER ',' CSV HEADER;
\copy prediccion_alerta FROM 'datos/prediccion_alerta.csv' DELIMITER ',' CSV HEADER;

\echo Cargando seguridad (roles y usuarios)...

\copy rol FROM 'datos/rol.csv' DELIMITER ',' CSV HEADER;
\copy usuario FROM 'datos/usuario.csv' DELIMITER ',' CSV HEADER;

\echo Carga de datos completada con éxito.
