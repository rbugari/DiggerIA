# Plan de Implementación: DiscoverAI v3.0 (Final - Deep Package Inspection)

Este plan incorpora la arquitectura v3.0 completa (Planner/Executor) y la capacidad de **Deep Package Inspection** solicitada para desglosar pasos internos de procesos ETL.

## 🚀 Fase 1: Fundamentos de Datos & Jerarquía
*Objetivo: Soporte de planes y jerarquías (Padre -> Hijo).*

1.  **Migración SQL (`migrations/07_v3_planning_tables.sql`)**:
    - **Jerarquía de Activos**: Agregar `parent_asset_id` a la tabla `asset` para modelar `Paquete (Padre) -> Paso (Hijo)`.
    - **Tablas de Planificación**:
        - `job_plan`: Cabecera del plan (estado, resumen).
        - `job_plan_area`: Agrupación (Foundation, Packages, Aux).
        - `job_plan_item`: Archivos individuales con estrategia y scores.
    - **Actualización Job**: Campos `plan_id` y `requires_approval` en `job_run`.

## 🧠 Fase 2: Motor de Planificación (Planner)
*Objetivo: Análisis rápido y económico.*

1.  **Servicio `PlannerService`**:
    - **Inventario**: Escaneo de archivos.
    - **Clasificador**: Heurísticas para detectar tipo (SQL, SSIS, Python) y asignar Área.
    - **Estimador**: Cálculo de tokens/costo aproximado.
2.  **API de Planificación**:
    - Endpoints para crear, ver, modificar y aprobar planes.

## 🖥️ Fase 3: Interfaz de Revisión (Frontend)
*Objetivo: Control de usuario.*

1.  **Dashboard de Planificación**:
    - Vista por áreas.
    - Toggle para activar/desactivar archivos.
    - Botón de aprobación final.

## ⚙️ Fase 4: Ejecución Estricta (Executor)
*Objetivo: Procesamiento guiado por el plan.*

1.  **Orquestador v3**:
    - Reemplazo del bucle "ciego" por un iterador de `job_plan_item` aprobados.
2.  **Action Profiles**:
    - Implementación de prompts especializados con esquemas JSON estrictos (Anexo 1).

## 🕵️ Fase 5: Deep Package Inspection (SSIS/DataStage)
*Objetivo: Extracción granular del Control Flow.*

1.  **Parser SSIS Avanzado**:
    - Extracción de la estructura interna del XML (`.dtsx`).
    - Identificación de **Sequence Containers** y **Tasks** (Execute SQL, Data Flow).
    - Persistencia de estos pasos como `Assets` hijos del paquete.
    - Vinculación de linaje (`Edges`) al paso específico, no al paquete general.

---
**Estado**: Listo para ejecución inmediata tras confirmación.
**Primer Paso**: Crear script de migración SQL.