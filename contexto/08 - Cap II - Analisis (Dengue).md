---
tags: [tfi, dengue, documento-tecnico, capitulo-2, analisis, requerimientos]
proyecto: "Sistema de Vigilancia Epidemiológica de Dengue (SIVED-Perú)"
created: 2026-06-10
parent: "[[00 - MOC Seleccion de Tema (Panel Mirofish)]]"
---

# 📋 Capítulo II — Análisis

> Proyecto: **SIVED-Perú** — Sistema de Vigilancia y Dashboard Epidemiológico de Dengue.
> Datos reales: [[07 - Datasets (3 Ganadores)]] (OpenDengue + Open-Meteo). Tema: [[02 - Dashboard Epidemiologico (Dengue)]].

## 2.1 Actores

| Actor | Tipo | Descripción | Permisos principales |
|---|---|---|---|
| **Administrador del Sistema** | Primario | Gestiona usuarios, roles, permisos y catálogos maestros. | Total (CRUD usuarios/catálogos) |
| **Epidemiólogo / Analista de Vigilancia** | Primario | Valida casos, opera el dashboard, ejecuta el pronóstico y revisa alertas. | Validar casos, ver/generar análisis, reportes |
| **Personal de Salud (Notificador)** | Primario | Registra las notificaciones de casos desde su establecimiento. | CRUD de casos de su establecimiento |
| **Autoridad de Salud (DIRESA/MINSA)** | Primario | Consulta dashboards, mapas y alertas para tomar decisiones. | Solo lectura (consulta) |
| **API Open-Meteo** | Secundario (sistema) | Provee clima semanal por departamento (integración REST). | — |
| **Repositorio OpenDengue** | Secundario (sistema) | Provee la carga histórica real de casos (CSV). | — |

> [!note] Jerarquía de roles
> `Administrador` ⊃ `Epidemiólogo` ⊃ `Notificador` ⊃ `Autoridad (lectura)`. Cada rol se mapea a permisos en las tablas `rol`, `permiso`, `rol_permiso`.

## 2.2 Requerimientos Funcionales (RF)

### Seguridad y acceso
| ID | Requerimiento | Actor | Prioridad |
|---|---|---|---|
| RF-01 | Permitir **inicio de sesión** con usuario y contraseña (hash). | Todos | Alta |
| RF-02 | Gestionar **usuarios y roles** (control de acceso por rol). | Administrador | Alta |
| RF-03 | Restringir las operaciones según el **rol** del usuario autenticado. | Sistema | Alta |

### Gestión (CRUD)
| ID | Requerimiento | Actor | Prioridad |
|---|---|---|---|
| RF-04 | Registrar, consultar, editar y eliminar **casos de dengue** (notificaciones). | Notificador / Epidemiólogo | Alta |
| RF-05 | Gestionar **pacientes** (datos demográficos y distrito de residencia). | Notificador | Alta |
| RF-06 | Gestionar **establecimientos** y **profesionales de salud**. | Administrador | Media |
| RF-07 | Gestionar **catálogos**: serotipos, clasificación del caso, signos/síntomas. | Administrador | Media |
| RF-08 | Registrar **diagnósticos de laboratorio** (NS1/IgM/RT-PCR) por caso. | Notificador | Media |
| RF-09 | Asociar **múltiples síntomas** a un caso (relación N:M). | Notificador | Media |

### Búsqueda y validación
| ID | Requerimiento | Actor | Prioridad |
|---|---|---|---|
| RF-10 | **Buscar y filtrar** casos por departamento, provincia, distrito, semana, serotipo y clasificación. | Epidemiólogo / Autoridad | Alta |
| RF-11 | **Validar** formularios (campos obligatorios, fechas coherentes, documento válido). | Sistema | Alta |

### Ciencia de datos e integración
| ID | Requerimiento | Actor | Prioridad |
|---|---|---|---|
| RF-12 | **Importar** la carga histórica real de casos desde **CSV** (OpenDengue). | Administrador | Alta |
| RF-13 | **Consumir la API REST de Open-Meteo** para el clima semanal por departamento. | Sistema | Alta |
| RF-14 | Calcular **estadísticas descriptivas**: incidencia/100 000 hab., letalidad, distribución por serotipo. | Epidemiólogo | Alta |
| RF-15 | Mostrar un **dashboard**: serie temporal, mapa coroplético, barras, circular, histograma y heatmap. | Epidemiólogo / Autoridad | Alta |
| RF-16 | Ejecutar **forecasting** de casos por semana con covariables climáticas (banda de predicción). | Epidemiólogo | Alta |
| RF-17 | Generar **alertas de brote** cuando los casos observados superan el umbral esperado. | Sistema | Media |
| RF-18 | **Exportar reportes** (PDF/CSV) de casos, indicadores y pronósticos. | Epidemiólogo / Autoridad | Media |

## 2.3 Requerimientos No Funcionales (RNF)

| ID | Categoría | Requerimiento |
|---|---|---|
| **RNF-01** | Seguridad | Contraseñas con **hash** (bcrypt/werkzeug); sesiones autenticadas; control de acceso por rol. |
| **RNF-02** | Arquitectura | Aplicación **por capas** (modelos, controladores, vistas, servicios, persistencia, utilitarios) aplicando POO. |
| **RNF-03** | Rendimiento | Las consultas del dashboard deben responder en **< 3 s** con índices sobre FK y fechas. |
| **RNF-04** | Usabilidad | Interfaz web responsiva en **español**, con mensajes de validación claros. |
| **RNF-05** | Portabilidad | Ejecutable en Linux/Windows; BD **PostgreSQL/MySQL**; backend **Python 3 + Flask**. |
| **RNF-06** | Integridad | **Integridad referencial** (PK/FK) y restricciones de dominio en todas las tablas. |
| **RNF-07** | Mantenibilidad | Código **modular** y documentado; separación de responsabilidades; nombres en español. |
| **RNF-08** | Disponibilidad | Degradación elegante si la API de clima no responde (usar último valor cacheado). |
| **RNF-09** | Trazabilidad | Cada dato analítico debe indicar su **fuente** (real vs. derivado). |
| **RNF-10** | Escalabilidad | Diseño preparado para crecer a nivel distrital sin rediseñar el modelo. |

🔗 Siguiente: [[09 - Cap III - Modelamiento UML (Dengue)]] · [[10 - Cap IV - Diseno de Base de Datos (Dengue)]]
