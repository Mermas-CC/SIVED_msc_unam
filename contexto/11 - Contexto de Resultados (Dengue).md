---
tags: [tfi, dengue, contexto, resumen, handoff]
proyecto: "SIVED-Perú — Vigilancia y Dashboard Epidemiológico de Dengue"
created: 2026-06-10
parent: "[[00 - MOC Seleccion de Tema (Panel Mirofish)]]"
---

# 🧾 Contexto de Resultados — Proyecto Dengue (SIVED-Perú)

> [!success] Estado
> **Tema confirmado: Dengue** (🥇 #1 del panel ponderado, 100 % datos reales). Producidos los **Capítulos II, III y IV** del documento técnico. Listo para pasar a Script SQL + implementación Flask.

## ✅ Qué se entregó en esta fase

| Capítulo | Nota | Contenido |
|---|---|---|
| **II — Análisis** | [[08 - Cap II - Analisis (Dengue)]] | 6 actores, **18 RF**, **10 RNF** |
| **III — UML** | [[09 - Cap III - Modelamiento UML (Dengue)]] | 5 diagramas Mermaid: casos de uso, **clases**, secuencia, actividades, paquetes |
| **IV — Diseño BD** | [[10 - Cap IV - Diseno de Base de Datos (Dengue)]] | **Modelo ER con 21 tablas** + integridad |
| Datos | [[07 - Datasets (3 Ganadores)]] | Casos reales + clima real ya descargados |

## 🎯 Decisiones de diseño clave
- **Nombre del sistema:** *SIVED-Perú* (Sistema de Vigilancia y Dashboard Epidemiológico de Dengue).
- **Arquitectura por capas** (modelos / controladores / vistas / servicios / persistencia / utilitarios) → exigida por la rúbrica y reflejada en el diagrama de paquetes.
- **17 tablas** (supera el mínimo de 15): geografía real (3) + vigilancia + clima real + seguridad (usuario/rol) + salida de IA/alerta (`prediccion_alerta`).
- **CRUD sobre notificaciones individuales** + **carga analítica del histórico real agregado** (OpenDengue) → cubre tanto el requisito de gestión como el de ciencia de datos.
- **Integración obligatoria doble:** API REST **Open-Meteo** (clima) + **modelo de IA** de forecasting (SARIMA/Prophet) con polimorfismo.

## 🧩 Cobertura de la rúbrica (proyección)
| Criterio | Cómo queda cubierto |
|---|---|
| POO (20) | Herencia (`Persona`, `ServicioPronostico`), encapsulamiento, composición/agregación, polimorfismo (`predecir()`) — ver mapa POO en Cap III |
| UML (15) | Los 5 diagramas obligatorios entregados |
| BD (15) | 17 tablas, PK/FK, integridad, clave compuesta (`caso_signo`) |
| Flask/Web (15) | Login + roles + CRUD + filtros (RF-01..RF-11) |
| CdD + Viz (15) | CSV + API + estadística + dashboard + forecasting (RF-12..RF-18) |
| Calidad/Doc/Sust. (20) | Arquitectura modular + notas de documentación |

## 🔎 Trazabilidad de datos (recordatorio honesto)
- **Reales:** casos (OpenDengue/PAHO 2014-2023, 574 635 casos), clima (Open-Meteo), geografía (COD-AB).
- **Operativo/sintético:** `paciente`, `profesional_salud`, `establecimiento_salud`, salidas de IA — porque la microdata individual del MINSA no es pública. Declarar en el documento.

## ▶️ Próximos pasos sugeridos (no ejecutados aún)
1. **Cap IV — Diccionario de Datos** (detalle por columna) y **Script SQL** (`CREATE TABLE` + `LOAD/COPY` de los CSV).
2. **Cap V — Implementación**: esqueleto Flask por capas + modelos POO.
3. **Cap VI — Resultados**: dashboard, consultas y gráficos.
4. Entrenar el modelo de forecasting con `hecho_casos_dengue` + `hecho_clima_semanal` y reportar **MAE/RMSE/MAPE**.

🔗 Índice: [[00 - MOC Seleccion de Tema (Panel Mirofish)]]
