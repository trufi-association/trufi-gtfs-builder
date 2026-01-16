# Peru - Trujillo (StopTimes Version)

Esta es una versión alternativa del proyecto Peru-Trujillo que genera GTFS con **stop_times.txt** expandidos en lugar de usar **frequencies.txt**.

## Diferencias con Peru-Trujillo original

| Característica | Peru-Trujillo | Peru-Trujillo-StopTimes |
|---|---|---|
| **frequencies.txt** | ✓ Generado | ✗ No generado |
| **stop_times.txt** | ✓ Generado (tiempos base) | ✓ Generado (horarios expandidos) |
| **trips.txt** | ~212 viajes (1 por ruta) | ~45,792 viajes (216 por ruta) |
| **Formato** | Frequency-based | Schedule-based |

## ¿Qué hace este proyecto?

Convierte las frecuencias (ej: "cada 5 minutos de 05:00 a 23:00") en viajes individuales con horarios específicos:

**Entrada:**
- Frecuencia: cada 5 minutos
- Horario: 05:00 - 23:00

**Salida:**
- Viaje 1: 05:00:00, 05:01:30, 05:03:45, ...
- Viaje 2: 05:05:00, 05:06:30, 05:08:45, ...
- Viaje 3: 05:10:00, 05:11:30, 05:13:45, ...
- ... (216 viajes por ruta)

## Archivos del proyecto

- **index.ts** - Script principal
- **customBuilders.ts** - Builders personalizados para generar horarios expandidos
- **trujillo.osm.pbf** - Datos OSM de Trujillo (2.3 MB)
- **all_stops.geojson** - Paradas personalizadas (1,432 paradas)
- **ignored_routes.txt** - Lista de rutas a ignorar (4 rutas)
- **out/** - Directorio de salida con archivos GTFS generados

### Proyecto independiente

Este proyecto es **completamente independiente** del proyecto Peru-Trujillo original. Contiene sus propias copias de todos los archivos de datos necesarios.

## Cómo ejecutar

```bash
# Desde la raíz del proyecto
npx ts-node examples/Peru-Trujillo-StopTimes/index.ts

# O desde este directorio
cd examples/Peru-Trujillo-StopTimes
npx ts-node index.ts
```

## Salida esperada

```
Output: examples/Peru-Trujillo-StopTimes/out/gtfs/
├── agency.txt
├── calendar.txt
├── routes.txt (~212 rutas)
├── trips.txt (~45,792 viajes expandidos)
├── stops.txt (1,432 paradas)
├── stop_times.txt (~824,256 entradas)
├── shapes.txt
├── fare_attributes.txt
└── fare_rules.txt

Note: frequencies.txt NO se genera
```

## Implementación técnica

### 1. scheduleExpander.ts
Utilidad para expandir horarios:
```typescript
expandSchedule("05:00", "23:00", 300)
// → ["05:00:00", "05:05:00", ..., "22:55:00"] (216 salidas)
```

### 2. scheduleBasedTripBuilder
Genera 216 viajes por ruta (1 por cada salida):
- trip_id único: `base_route_id * 1000000 + trip_index`
- Guarda info de salida en `service.expandedTrips[]`

### 3. scheduleBasedStopTimesBuilder
Para cada viaje:
- Calcula tiempos de viaje entre paradas (distancia / velocidad)
- Suma el tiempo de salida base
- Genera stop_times con horarios específicos

### 4. emptyFrequenciesBuilder
Retorna array vacío → no se genera frequencies.txt

## Comparación de salidas

### Peru-Trujillo (Frequency-based)
```csv
# trips.txt (212 líneas)
trip_id,route_id,service_id,...
1234567,1234567,Mo-Su,...

# frequencies.txt (212 líneas)
trip_id,start_time,end_time,headway_secs,exact_times
1234567,05:00:00,23:00:00,300,1

# stop_times.txt (3,774 líneas - tiempos relativos)
trip_id,stop_sequence,stop_id,arrival_time,...
1234567,0,9876543,00:00:00,...
1234567,1,9876544,00:01:30,...
```

### Peru-Trujillo-StopTimes (Schedule-based)
```csv
# trips.txt (~45,792 líneas)
trip_id,route_id,service_id,...
1234567000000,1234567,Mo-Su,...
1234567000001,1234567,Mo-Su,...
1234567000002,1234567,Mo-Su,...
...

# frequencies.txt - NO EXISTE

# stop_times.txt (~824,256 líneas - horarios absolutos)
trip_id,stop_sequence,stop_id,arrival_time,...
1234567000000,0,9876543,05:00:00,...
1234567000000,1,9876544,05:01:30,...
1234567000001,0,9876543,05:05:00,...
1234567000001,1,9876544,05:06:30,...
```

## Ventajas y desventajas

### Ventajas
- ✓ Compatible con más aplicaciones GTFS (algunas no soportan frequencies.txt)
- ✓ Horarios específicos más fáciles de leer
- ✓ Mejor para planificadores de rutas que necesitan horarios exactos

### Desventajas
- ✗ Archivos GTFS mucho más grandes (~220x más trips)
- ✗ Mayor tiempo de procesamiento
- ✗ Más difícil de actualizar frecuencias

## Validación

Para validar el GTFS generado:

```bash
# Google transitfeed validator
transitfeed-validate examples/Peru-Trujillo-StopTimes/out/gtfs/

# O verificar manualmente
wc -l examples/Peru-Trujillo-StopTimes/out/gtfs/trips.txt
# Esperado: ~45,792 líneas

ls examples/Peru-Trujillo-StopTimes/out/gtfs/frequencies.txt
# Esperado: archivo no existe
```

## Notas

- La frecuencia hardcodeada es **300 segundos (5 minutos)**
- Puedes modificarla en `customBuilders.ts` cambiando `DEFAULT_HEADWAY_SECS`
- Los horarios de servicio se toman del opening_hours de OSM (05:00-23:00)
