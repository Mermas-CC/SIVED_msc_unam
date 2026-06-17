---
tags: [tfi, dengue, documento-tecnico, capitulo-3, uml, mermaid]
created: 2026-06-10
parent: "[[00 - MOC Seleccion de Tema (Panel Mirofish)]]"
---

# 🧩 Capítulo III — Modelamiento UML

> Diagramas en **Mermaid** (se renderizan en Obsidian con *Mermaid* activo). Sistema **SIVED-Perú**.
> Cubre los 5 diagramas obligatorios del PDF: Casos de Uso, Clases, Secuencia, Actividades, Paquetes.

## 3.1 Diagrama de Casos de Uso

```mermaid
flowchart LR
    ADM([👤 Administrador])
    EPI([👤 Epidemiólogo])
    NOT([👤 Notificador])
    AUT([👤 Autoridad de Salud])
    CLIMA([🌐 API Open-Meteo])

    subgraph SIVED["Sistema SIVED-Perú"]
        UC1(("Iniciar sesión"))
        UC2(("Gestionar usuarios y roles"))
        UC3(("Registrar caso de dengue"))
        UC4(("Validar / editar caso"))
        UC5(("Gestionar catálogos"))
        UC6(("Importar histórico CSV"))
        UC7(("Obtener clima semanal"))
        UC8(("Ver dashboard y mapas"))
        UC9(("Generar pronóstico"))
        UC10(("Generar alerta de brote"))
        UC11(("Exportar reportes"))
    end

    ADM --> UC1 & UC2 & UC5 & UC6
    NOT --> UC1 & UC3
    EPI --> UC1 & UC4 & UC8 & UC9 & UC11
    AUT --> UC1 & UC8 & UC11
    UC7 --> CLIMA
    UC9 -.->|«include»| UC7
    UC9 -.->|«include»| UC10
    UC3 -.->|«include»| UC1
```

## 3.2 Diagrama de Clases

> Demuestra los 7 requisitos POO del PDF. Mapa de conceptos al final.

```mermaid
classDiagram
    class Persona {
        <<abstract>>
        #int id
        #string nombres
        #string apellidos
        +getNombreCompleto() string
    }
    class Paciente {
        -string documento
        -date fechaNacimiento
        -char sexo
        +calcularEdad() int
    }
    class ProfesionalSalud {
        -string colegiatura
        -string cargo
        +registrarCaso() CasoDengue
    }
    Persona <|-- Paciente
    Persona <|-- ProfesionalSalud

    class Usuario {
        -string nombreUsuario
        -string hashContrasena
        -bool activo
        +autenticar(clave) bool
        +tienePermiso(codigo) bool
    }
    class Rol {
        -string nombreRol
        -string permisos
    }
    Usuario "*" --> "1" Rol : posee
    Usuario "1" --> "0..1" ProfesionalSalud : encarna

    class Departamento {
        -string nombre
    }
    class Provincia {
        -string nombre
    }
    class Distrito {
        -string nombre
    }
    Departamento "1" *-- "*" Provincia : compone
    Provincia "1" *-- "*" Distrito : compone

    class EstablecimientoSalud {
        -string nombre
        -string categoria
    }
    Distrito "1" --> "*" EstablecimientoSalud : ubica
    EstablecimientoSalud "1" o-- "*" ProfesionalSalud : agrupa

    class CasoDengue {
        -date fechaNotificacion
        -date fechaInicioSintomas
        -string tipoDiagnostico
        -string condicion
        +clasificar() ClasificacionCaso
        +esGrave() bool
    }
    class Serotipo
    class ClasificacionCaso
    class SignoSintoma
    class DiagnosticoLaboratorio {
        -string resultado
        -date fechaResultado
    }
    class PeriodoEpidemiologico {
        -int anio
        -int numeroSemana
    }
    CasoDengue "*" --> "1" Paciente : afecta
    CasoDengue "*" --> "1" EstablecimientoSalud : notificadoEn
    CasoDengue "*" --> "1" ProfesionalSalud : registradoPor
    CasoDengue "*" --> "1" PeriodoEpidemiologico : ocurreEn
    CasoDengue "*" --> "0..1" Serotipo : tiene
    CasoDengue "*" --> "1" ClasificacionCaso : se clasifica
    CasoDengue "*" --> "*" SignoSintoma : presenta
    CasoDengue "1" *-- "*" DiagnosticoLaboratorio : compone

    class MedidaClimatica {
        -float tempMedia
        -float precipTotal
    }
    Departamento "1" --> "*" MedidaClimatica : registra
    PeriodoEpidemiologico "1" --> "*" MedidaClimatica

    class PrediccionAlerta {
        -int casosPredichos
        -int casosObservados
        -string nivelAlerta
        -float mae
    }
    Departamento "1" --> "*" PrediccionAlerta : proyecta

    class ServicioPronostico {
        <<abstract>>
        +entrenar(serie) void
        +predecir(horizonte) Prediccion
    }
    class ModeloSARIMA {
        +predecir(horizonte) Prediccion
    }
    class ModeloProphet {
        +predecir(horizonte) Prediccion
    }
    ServicioPronostico <|-- ModeloSARIMA
    ServicioPronostico <|-- ModeloProphet

    class ServicioClimaAPI {
        +obtenerClima(depto, semana) MedidaClimatica
    }
    class RepositorioBase~T~ {
        <<abstract>>
        +guardar(entidad) void
        +buscarPorId(id) T
        +listar() List~T~
    }
    RepositorioBase <|-- RepositorioCaso
    ServicioPronostico ..> MedidaClimatica : usa
    ServicioClimaAPI ..> MedidaClimatica : produce
```

> [!check] Mapa de conceptos POO (rúbrica)
> | Concepto | Dónde |
> |---|---|
> | **Clases y objetos** | Todas las entidades (`CasoDengue`, `Paciente`, …) |
> | **Encapsulamiento** | Atributos `-private` / `#protected` con getters/métodos |
> | **Asociación** | `CasoDengue → Paciente`, `Usuario → Rol` |
> | **Agregación** | `EstablecimientoSalud o-- ProfesionalSalud` (el profesional existe sin el EE.SS.) |
> | **Composición** | `Departamento *-- Provincia *-- Distrito`; `CasoDengue *-- DiagnosticoLaboratorio` |
> | **Herencia** | `Persona → Paciente/ProfesionalSalud`; `ServicioPronostico → SARIMA/Prophet`; `RepositorioBase → RepositorioCaso` |
> | **Polimorfismo** | `predecir()` redefinido en `ModeloSARIMA`/`ModeloProphet`; repositorios genéricos |

## 3.3 Diagrama de Secuencia — *Generar pronóstico y alerta*

```mermaid
sequenceDiagram
    actor EPI as Epidemiólogo
    participant V as Vista (Flask)
    participant C as ControladorPronostico
    participant SC as ServicioClimaAPI
    participant API as Open-Meteo (REST)
    participant SP as ServicioPronostico
    participant SA as ServicioAlerta
    participant R as RepositorioCaso
    participant BD as Base de Datos

    EPI->>V: Solicita pronóstico (departamento)
    V->>C: generarPronostico(idDepto)
    C->>R: obtenerSerieCasos(idDepto)
    R->>BD: SELECT casos por semana
    BD-->>R: serie histórica
    R-->>C: serie de casos
    C->>SC: obtenerClima(idDepto, semanas)
    SC->>API: GET /archive (clima)
    API-->>SC: JSON clima
    SC-->>C: MedidaClimatica[]
    C->>SP: entrenar(serie + clima)
    C->>SP: predecir(horizonte=8)
    SP-->>C: Prediccion (casos + MAE)
    C->>SA: evaluarBrote(predicción, umbral)
    alt casos esperados > umbral
        SA->>BD: INSERT brote_alerta
        SA-->>C: Alerta generada
    end
    C-->>V: pronóstico + alerta
    V-->>EPI: Muestra curva + banda + alerta
```

## 3.4 Diagrama de Actividades — *Registrar notificación de caso*

```mermaid
flowchart TD
    A([Inicio]) --> B[Notificador inicia sesión]
    B --> C{¿Autenticado?}
    C -- No --> B
    C -- Sí --> D[Abrir formulario de caso]
    D --> E[Buscar/registrar paciente]
    E --> F[Ingresar datos del caso y síntomas]
    F --> G{¿Validación OK?}
    G -- No --> H[Mostrar errores] --> F
    G -- Sí --> I[Asignar semana epidemiológica]
    I --> J[Guardar caso y síntomas N:M]
    J --> K{¿Tiene prueba de laboratorio?}
    K -- Sí --> L[Registrar diagnóstico lab] --> M
    K -- No --> M[Clasificar caso]
    M --> N[Actualizar tablero de incidencia]
    N --> O([Fin])
```

## 3.5 Diagrama de Paquetes (arquitectura por capas)

```mermaid
flowchart TD
    subgraph main["main.py"]
    end
    subgraph vistas["📦 vistas (Flask templates + blueprints)"]
    end
    subgraph controladores["📦 controladores"]
    end
    subgraph servicios["📦 servicios (clima, pronóstico, alertas, estadística)"]
    end
    subgraph modelos["📦 modelos (entidades POO)"]
    end
    subgraph persistencia["📦 persistencia (repositorios + ORM)"]
    end
    subgraph utilitarios["📦 utilitarios (validación, CSV, seguridad)"]
    end

    main --> vistas
    vistas --> controladores
    controladores --> servicios
    controladores --> persistencia
    servicios --> modelos
    servicios --> utilitarios
    persistencia --> modelos
    persistencia --> utilitarios
```

> [!note] Diagramas opcionales
> Se pueden añadir **Componentes** y **Despliegue** (navegador → servidor Flask → PostgreSQL → API Open-Meteo) en la entrega final.

🔗 [[08 - Cap II - Analisis (Dengue)]] · [[10 - Cap IV - Diseno de Base de Datos (Dengue)]]
