# Capítulo VII: Conclusiones y Recomendaciones

El desarrollo e implementación del **Sistema de Vigilancia y Dashboard Epidemiológico de Dengue (SIVED-Perú)** ha permitido consolidar una plataforma técnica y metodológica robusta para abordar la gestión, el análisis y la predicción de brotes de dengue en el país. A continuación, se presentan las principales conclusiones derivadas del proyecto, así como las recomendaciones para su futura expansión y sostenibilidad.

---

## 7.1. Conclusiones

1. **Modularidad y Organización Arquitectónica (POO y Flask):**  
   La implementación de una arquitectura estructurada por capas (modelos, controladores, vistas, servicios y persistencia) bajo el paradigma de Programación Orientada a Objetos (POO) en Python y Flask demostró ser altamente eficiente. Esta organización garantiza una clara separación de responsabilidades, facilitando el mantenimiento independiente de la lógica de negocio, el backend web y los componentes de visualización e interacción del dashboard.

2. **Rendimiento e Integridad del Modelo de Datos Relacional:**  
   El diseño de base de datos relacional en PostgreSQL, consolidado en 17 tablas normalizadas, garantiza la integridad referencial y previene anomalías de inserción y actualización (0 registros huérfanos). Gracias a la creación de índices específicos sobre claves foráneas y campos temporales, se logró optimizar las consultas analíticas complejas del dashboard, respondiendo en tiempos inferiores a los 3 segundos, cumpliendo con los estándares de rendimiento no funcionales planteados.

3. **Consolidación de Datos Oficiales y Trazabilidad:**  
   La obtención de datos históricos directamente de la Plataforma de Datos Abiertos del Perú garantizó el uso de información epidemiológica oficial, fidedigna y contextualizada a la realidad sanitaria nacional. La integración de estos registros con la API de clima de Open-Meteo y la generación de datos operativos complementarios (pacientes y personal de salud estructurados bajo criterios éticos y de anonimización) permitió simular con alta precisión un entorno operativo real, asegurando la trazabilidad de las fuentes.

4. **Forecasting con Enfoque de Ciencia de Datos y Climatología:**  
   La incorporación de covariables climatológicas (temperatura media y precipitación semanal obtenidas a través de la API REST de Open-Meteo) demostró ser una variable crítica para estimar la tasa de transmisión del dengue. El modelo de pronóstico integrado no solo estima el número esperado de casos semanales, sino que incorpora bandas de predicción y métricas de rendimiento (como el MAE y RMSE), dotando al analista de herramientas con rigor científico para la planeación y la toma de decisiones preventivas.

5. **Automatización de Alertas Tempranas en Salud Pública:**  
   La unificación de visualizaciones descriptivas (incidencia por 100,000 habitantes, tasas de letalidad y distribución por serotipos) con la lógica predictiva de alertas tempranas proporciona una herramienta de control integral. SIVED-Perú capacita a las autoridades de salud (DIRESA/MINSA) para identificar desviaciones atípicas de casos sobre el canal endémico esperado, promoviendo una intervención oportuna que mitigue el impacto de los brotes vectoriales en las zonas de mayor vulnerabilidad geográfica.

---

## 7.2. Recomendaciones

1. **Automatización de Tuberías de Datos (ETL/ELT):**  
   Se recomienda migrar del modelo de carga estática basado en archivos CSV históricos a procesos automatizados de extracción y carga (pipelines de ETL). Esto facilitaría la conexión directa y programada a la Plataforma de Datos Abiertos del Perú o a los servicios web oficiales del MINSA, manteniendo la base de datos de SIVED-Perú actualizada de manera automática sin intervención manual.

2. **Enriquecimiento del Modelo Predictivo con Enfoque Espaciotemporal:**  
   Para elevar la precisión del pronóstico a nivel distrital y provincial, se sugiere integrar variables de conectividad terrestre, densidad poblacional, índices de acceso al agua y modelos de dispersión biológica del vector *Aedes aegypti*. Asimismo, se recomienda evaluar el rendimiento de modelos de aprendizaje de series temporales avanzados (como LSTM o arquitecturas Transformers) que capturen rezagos climáticos no lineales complejos de forma más fina.

3. **Transición a una Arquitectura de Microservicios:**  
   Con el fin de garantizar la escalabilidad y disponibilidad del sistema en periodos de crisis epidemiológicas (donde el volumen de usuarios concurrentes de múltiples regiones aumentará significativamente), se recomienda desacoplar la interfaz web del motor de cómputo del modelo de forecasting. Migrar a una arquitectura basada en contenedores (Docker y Kubernetes) permitirá escalar de forma independiente los servicios analíticos intensivos en CPU de los servicios CRUD básicos de persistencia de datos.

4. **Implementación de Auditoría, Seguridad Perimetral y Cumplimiento:**  
   Dado que el sistema gestiona datos de salud (que representan información altamente sensible según la normativa legal de datos personales), se recomienda robustecer la seguridad perimetral cifrando la base de datos en reposo y en tránsito (HTTPS/TLS). Adicionalmente, se sugiere añadir tablas de auditoría (`logs`) en PostgreSQL gestionadas por disparadores (*triggers*) para registrar cada acción de edición o eliminación de casos con su respectiva huella de usuario y fecha, garantizando la trazabilidad absoluta de la información clínica.
