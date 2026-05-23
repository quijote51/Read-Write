---
name: event-ops-pro
description: "Event management intelligence for hotel restaurant operations. Covers full event lifecycle: creation, marketing, staff, inventory, sales, workflows, and module integrations. Domains: eventos (creation/templates/checklists), marketing (email/WhatsApp/social/proposals), personal (roles/scheduling/briefing), inventario (stock/vajilla/purchasing), ventas (pricing/proposals/upsell), workflows (day-of/weekly/monthly), integraciones (module sync patterns). Actions: crear, diseñar, planificar, conectar, sincronizar, editar, actualizar, vender, marketing, organizar personal, inventario, propuesta, presupuesto, flujo, checklist."
---

# Event Ops Pro — Gestión Integral de Eventos Hoteleros

Sistema de conocimiento para la gestión completa del ciclo de vida de eventos en restaurante hotelero. Basado en las operaciones de Oído Cocina · Seda Club Hotel Granada.

## Cuándo Aplicar

Usar este skill cuando se trabaje en:
- **Crear o mejorar eventos**: formularios, validaciones, plantillas, duplicación
- **Marketing y comunicación**: emails, WhatsApp, propuestas PDF, redes sociales
- **Gestión de personal**: asignación, turnos, briefings, roles en la app
- **Inventario**: vajilla, ingredientes, bebidas, compras, alertas de stock
- **Ventas**: precios, propuestas, upsell, seguimiento de clientes
- **Flujos de trabajo**: checklists de evento, workflows diarios/semanales/mensuales
- **Integraciones**: cómo conectar módulos de la app entre sí y sincronizar datos

## Dominios de Conocimiento

| Dominio | Archivo | Contenido |
|---------|---------|-----------|
| `eventos` | eventos.csv | Tipos de evento, datos requeridos, checklists, alertas, validaciones |
| `marketing` | marketing.csv | Templates email/WhatsApp, propuestas, redes sociales, seguimiento |
| `personal` | personal.csv | Roles, asignación a eventos, briefings, turnos, comunicación |
| `inventario` | inventario.csv | Vajilla, ingredientes, bebidas, stock, compras, alertas |
| `ventas` | ventas.csv | Precios, propuestas, argumentos, upsell, cierre, fidelización |
| `workflows` | workflows.csv | Flujos completos: creación → ejecución → post-evento |
| `integraciones` | integraciones.csv | Conexiones entre módulos de la app, sincronización de datos |

## Cómo Usar Este Skill

### Paso 1: Búsqueda por dominio

```bash
python3 .claude/skills/event-ops-pro/scripts/search.py "<consulta>" --domain <dominio>
```

**Ejemplos:**
```bash
# Buscar patrones de creación de eventos
python3 .claude/skills/event-ops-pro/scripts/search.py "coctel 80 personas checklist" --domain eventos

# Templates de confirmación por email
python3 .claude/skills/event-ops-pro/scripts/search.py "confirmacion email cliente" --domain marketing

# Cálculo de personal para cóctel
python3 .claude/skills/event-ops-pro/scripts/search.py "chef sala bar coctel personal" --domain personal

# Stock vajilla para menú 60 pax
python3 .claude/skills/event-ops-pro/scripts/search.py "vajilla menu 60 pax calculo" --domain inventario

# Propuesta precio por persona menú
python3 .claude/skills/event-ops-pro/scripts/search.py "precio menu propuesta empresa" --domain ventas

# Flujo día del evento
python3 .claude/skills/event-ops-pro/scripts/search.py "dia evento workflow cocina sala" --domain workflows

# Cómo conectar eventos con producción
python3 .claude/skills/event-ops-pro/scripts/search.py "produccion platos sincronizar" --domain integraciones
```

### Paso 2: Búsqueda general (todos los dominios)

```bash
python3 .claude/skills/event-ops-pro/scripts/search.py "<consulta>"
```

### Paso 3: Resumen completo por situación

```bash
python3 .claude/skills/event-ops-pro/scripts/search.py "<consulta>" --full-brief
```

## Principios Fundamentales

### Ciclo de Vida de un Evento (Oído Cocina)

```
COMERCIAL          PLANIFICACIÓN        EJECUCIÓN         POST-EVENTO
   │                    │                   │                  │
Consulta          Crear en app         Briefing 48h        Historial
   │              Confirmar             Producción          Margen
Propuesta         Asignar personal      Pantalla KDS        Feedback
   │              Vajilla check         Bump sistema        Factura
Cierre            Compras               Sala briefing       CRM
```

### Tipos de Evento (Oído Cocina)

| Tipo | Factor Prod. | Personal Mín. | Vajilla Factor | Precio Base |
|------|-------------|---------------|----------------|-------------|
| Cóctel | 1.5× | 1 chef + 2 sala | 1.5× pax | 45–65 €/pax |
| Menú completo | 1.0× | 1 chef + 1 sala/20 | 1.0× pax | 55–85 €/pax |
| Desayuno | 0.8× | 1 chef + 1 sala | 0.8× pax | 20–35 €/pax |

### Reglas de Validación al Crear Eventos

- `pax` > 0 y ≤ capacidad del espacio (azotea: 120, salón: 80, jardín: 200)
- `fecha` ≥ hoy + 1 día (no se crean eventos pasados)
- Al menos 1 plato de cada categoría principal (F/C) para cócteles
- Al menos 3 platos (F+C+P o F+M+P) para menús
- `precio_venta` si el evento tiene cliente con presupuesto asignado
- `alergias_txt` siempre rellenado aunque sea "Sin alergias declaradas"

### Integraciones Clave (Módulos de la App)

```
Evento creado
  ├── → Calendario (aparece en vista mensual)
  ├── → Dashboard (aparece en "Hoy" / "Próximos 7 días")
  ├── → Producción (ficha de producción generada automáticamente)
  ├── → Pantalla Cocina KDS (platos visibles con cantidades)
  ├── → Vajilla (calcula necesidades por tipo y pax)
  ├── → Bebidas (planificación de bar vinculada al evento)
  └── → Historial (después del evento, aparece en analytics)
```

### Alertas que Debe Generar la App

| Alerta | Trigger | Acción Sugerida |
|--------|---------|-----------------|
| Vajilla insuficiente | stock < pax × factor | Ver módulo Vajilla, pedir préstamo/alquiler |
| Evento sin confirmar | evento en <48h sin confirmación | Enviar recordatorio al cliente |
| Platos sin receta | plato en evento sin receta en recetario | Crear receta o asignar receta existente |
| Sin precio asignado | evento con pax > 0 y precio_venta vacío | Asignar precio antes de confirmación |
| Personal no asignado | evento en <72h sin chef asignado | Asignar desde módulo Personal |
| Stock ingrediente bajo | stock < umbral mínimo | Generar pedido en módulo Compras |

## Plantillas Rápidas

### Evento de Cóctel Estándar
```
Nombre: [Empresa/Grupo] Cóctel [Mes YYYY]
Tipo: coctel
Factor: 1.5
Platos mín.: 3F + 3C
Bebidas: Open bar básico
Precio base: 52€/pax
```

### Evento de Menú Completo
```
Nombre: [Empresa/Grupo] Menú [Ocasión]
Tipo: menu
Factor: 1.0
Platos: 2F + 1C + 1M + 1P
Bebidas: Vino + agua incluido
Precio base: 68€/pax
```

### Confirmación 48h Antes
```
Checklist:
☐ Chef asignado y briefado
☐ Ficha de producción impresa
☐ Vajilla contada y preparada
☐ Bebidas solicitadas a barra
☐ Menú infantil confirmado
☐ Alérgenos revisados con sala
```

## Prerrequisitos

```bash
python3 --version  # Python 3.7+
```

---

*Skill diseñado para Oído Cocina · Seda Club Hotel · Granada*
