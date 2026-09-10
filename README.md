# GTFS Builder (TypeScript)

## INTRODUCTION 

Trufi's General Transit Feed Specification (GTFS) tool allows you to create a map for your city. You can also send your route data to Google Maps, Open Trip Planner, OpenStreetMap, and other public atlases to keep navigation databases updated. 

This is the TypeScript version of the [trufi-gtfs-builder](https://github.com/trufi-association/trufi-gtfs-builder) project.

## Installation

### As a Library

```bash
npm install gtfs-builder
```

### For Development

```bash
# Clone the repository
git clone https://github.com/trufi-association/trufi-gtfs-builder.git
cd trufi-gtfs-builder

# Install dependencies
npm install

# Build the project
npm run build
```

## Quick Start

```typescript
import { osmToGtfs, OSMOverpassDownloader } from 'gtfs-builder';

const bounds = {
  north: -16.4897,
  south: -16.5348,
  east: -68.1193,
  west: -68.2007
};

const osmDataGetter = new OSMOverpassDownloader(bounds);

await osmToGtfs({
  geojsonOptions: {
    osmDataGetter,
    transformTypes: ['bus', 'train'],
    skipRoute: (route) => true
  },
  outputFiles: {
    outputDir: './output',
    gtfs: true,
    readme: true
  }
});
```

## 📚 Examples

The `examples/` directory contains real-world examples for different cities:

- **Bolivia-Cochabamba** - GTFS generation for Cochabamba, Bolivia
- **Mexico-Jilotepec** - GTFS generation for Jilotepec, Mexico

### Running Examples

To run any example:

```bash
# Navigate to the project root
cd trufi-gtfs-builder

# Build the main project
npm install
npm run build

# Navigate to an example
cd examples/Mexico-Jilotepec

# Install dependencies and run
npm install
npm start
```

The generated GTFS files will be in the `out/` directory of each example.

## Usage

### TypeScript

```typescript
import { osmToGtfs, OSMOverpassDownloader } from 'gtfs-builder';
import * as path from 'path';

async function generateGTFS() {
  const osmDataGetter = new OSMOverpassDownloader({
    north: -16.4897,
    south: -16.5348,
    east: -68.1193,
    west: -68.2007
  });

  await osmToGtfs({
    geojsonOptions: {
      osmDataGetter,
      transformTypes: ['bus', 'train', 'tram', 'subway'],
      skipRoute: (route) => true
    },
    gtfsOptions: {
      agencyTimezone: 'America/La_Paz',
      agencyUrl: 'https://www.example.com/',
      defaultCalendar: () => 'Mo-Su 06:00-23:00',
      frequencyHeadway: () => 300,
      vehicleSpeed: () => 20, // km/h, for routes without an OSM duration=*
      stopsConfig: () => ({ mode: 'fakeStops' }),
      stopNameBuilder: (stops) => {
        if (!stops || stops.length === 0) return 'Unnamed';
        return stops.join(' and ');
      }
    },
    outputFiles: {
      outputDir: path.join(__dirname, 'output'),
      gtfs: true,
      readme: true,
      routes: true,
      log: true,
      stops: true
    }
  });
}

generateGTFS().catch(console.error);
```

### JavaScript (CommonJS)

```javascript
const { osmToGtfs, OSMOverpassDownloader } = require('gtfs-builder');
const path = require('path');

const osmDataGetter = new OSMOverpassDownloader({
  north: -16.4897,
  south: -16.5348,
  east: -68.1193,
  west: -68.2007
});

osmToGtfs({
  geojsonOptions: {
    osmDataGetter,
    transformTypes: ['bus', 'train'],
    skipRoute: (route) => true
  },
  outputFiles: {
    outputDir: path.join(__dirname, 'output'),
    gtfs: true,
    readme: true
  }
}).then(() => {
  console.log('GTFS generation complete!');
}).catch(console.error);
```

## Development

### Building the Project

```bash
npm install
npm run build
```

This compiles TypeScript files to JavaScript in the `dist/` folder.

### Project Structure

```
src/                          # Source code
  ├── geojson_to_gtfs/       # GTFS generation logic
  ├── geojson_to_trufi_tp_data/  # Trufi trip planner data
  └── osm_to_geojson/        # OSM data extraction
examples/                     # Real-world examples
  ├── Bolivia-Cochabamba/
  └── Mexico-Jilotepec/
dist/                        # Compiled JavaScript (generated)
```

## Features

- **Type Safety**: Full TypeScript support with type definitions
- **OSM Data Import**: Support for Overpass API and PBF files
- **GTFS Export**: Generate standard GTFS feeds
- **GeoJSON Support**: Convert between OSM and GeoJSON formats
- **Trufi TP Data**: Export data for Trufi trip planner

## Configuration Options

### GeojsonOptions
- `osmDataGetter`: Instance of OSMOverpassDownloader or OSMPBFReader
- `transformTypes`: Array of transport types to include
- `skipRoute`: Function to filter routes

### GTFSOptions
- `agencyTimezone`: Timezone for the transit agency
- `agencyUrl`: URL of the transit agency
- `defaultCalendar`: Function to generate service calendar
- `frequencyHeadway`: Function to determine frequency
- `vehicleSpeed`: Function returning the average speed (km/h) of each route, used when its OSM relation has no `duration=*` (see [Travel times](#travel-times))
- `tripDuration`: Function to override the running time of each route (see [Travel times](#travel-times))
- `stopsConfig`: Function returning how stops are derived for each route (`fakeStops`, `osmStops` or `customStops`)
- `stopNameBuilder`: Function to build stop names
- `defaultFares`: Default currency and price for fares (see [Fares](#fares))
- `fare`: Function to resolve the fare of each route (see [Fares](#fares))

### Fares

The builder writes GTFS-Fares V1 (`fare_attributes.txt` + `fare_rules.txt`), one fare per `route_id`. The price of a route is resolved in this order:

1. **OSM.** `charge=*` on the route relation, in the wiki syntax `<amount> <ISO 4217 code>[/<unit>]` — e.g. `charge=3 BOB/person` or `3.50 BOB`. With several `;`-separated values (`3 BOB/person;1 BOB/student`) the first one is the fare; the others are kept by `parseChargeEntries()` for rider categories. Lenient variants are accepted too: `3,50 BOB`, `3BOB`, `BOB 3`, and a bare `3`, which takes `defaultFares.currencyType` (and is ignored, with a warning, when that is not set). The currency must be three upper-case letters — the ISO 4217 form; the code list itself is not checked — so currency signs, local abbreviations and lower-case codes (`$`, `Bs`, `bob`) are rejected with a warning. `fee=no` means the ride is free (price `0`); it also needs `defaultFares.currencyType`, since `currency_type` is required even for a free ride.
2. **`fare` resolver** (optional). Called per route with the feature and the OSM fare (if any); its return value is final — return a fare to emit it, or `undefined` to emit nothing for that route.
3. **`defaultFares.price`** (optional, only without a resolver).

When nobody knows the price, the route gets **no fare row**: `fare_attributes.txt` is optional in GTFS, while a `price` of `0` states that the ride is free. There is no implicit currency either: `defaultFares` is optional, and without `currencyType` only `charge=*` values that carry their own code produce a row.

A flat city-wide fare needs only the defaults — `charge=*` still wins where it is tagged:

```typescript
gtfsOptions: {
  defaultFares: { currencyType: 'BOB', price: 3 },
}
```

Exceptions go in a `fare` resolver, whose answer is final (`defaultFares.price` is then not applied for you):

```typescript
gtfsOptions: {
  // Currency for `charge=*` values without an ISO code.
  defaultFares: { currencyType: 'BOB' },
  fare: (route, osmFare) => {
    if (osmFare) return osmFare;                         // OSM knows best
    if (route.properties.operator === 'Sindicato mixto de autotransporte Sacaba') {
      return undefined;                                  // unknown → no fare row
    }
    return { price: 3, currency: 'BOB' };                // city default
  },
}
```

`payment_method` (default `0`, paid on board) and `transfers` (default `0`; `null` = unlimited) can be set in `defaultFares` or per fare. Both `defaultFares` and a resolver's fare must be valid GTFS — `price` a non-negative number, `currency` three upper-case letters, `paymentMethod` `0 | 1`, `transfers` `0 | 1 | 2 | null` — anything else throws, as a config bug. When the OSM relations that share a `route_id` (variants, directions) resolve to different fares, the OSM-tagged one wins, then the lowest price, and a warning lists the relations.

### Travel times

`stop_times.txt` carries estimates (`timepoint=0`); the builder has no timetable. The running time of each route is decided in this order:

1. **OSM.** `duration=*` on the route relation — "the running time of the bus route as stated in official documents" — in the wiki forms `hh:mm` (recommended), `hh:mm:ss`, plain minutes (`45`) or ISO 8601 (`PT45M`). The time is spread over the stops in proportion to the straight-line distance between them, so the last stop lands exactly on the tagged duration. A malformed value is ignored with a warning, and so is one that implies an implausible average speed for the mode — below 3 km/h, or above the gtfs-validator `fast_travel_between_consecutive_stops` threshold (150 km/h for buses, 100 for light rail, 50 for aerial lifts): Cochabamba's teleférico is tagged `duration=02:00` for a 760 m ride.
2. **`tripDuration` resolver** (optional). Called per route with the feature, the OSM duration in seconds (`undefined` when absent or malformed) and the route length in meters. Return the running time in seconds to use it, or `undefined` to fall back to the speed. Use it to plug in measured running times, or to accept or reject what OSM says per route. Anything other than a positive number or `undefined` throws, as a config bug.
3. **`vehicleSpeed`** (km/h, per route). Every segment between consecutive stops takes `distance / speed`, rounded up to whole seconds. The default is `() => 20`, a bus in mixed urban traffic (Cochabamba's traffic authority measured 10–11 km/h in congestion and calls 25 km/h satisfactory). A tram or a cable car does not move like a minibus, so vary it by route type — the callback receives the route feature:

```ts
gtfsOptions: {
  vehicleSpeed: (route) => {
    switch (route.properties.route) {
      case 'light_rail': return 32;   // what the line's own OSM duration implies
      default: return 20;             // bus, minibus, share_taxi
    }
  },
  // Optional: trust OSM only for rail, use measured times for two lines.
  tripDuration: (route, osmSeconds) => {
    if (route.properties.route === 'light_rail') return osmSeconds;
    return MEASURED_RUNNING_TIME[route.properties.ref];   // undefined → vehicleSpeed
  },
}
```

Only the planners that read `stop_times` (OpenTripPlanner, MOTIS/Transitous, Google) see these times; `frequencies.txt` (`frequencyHeadway`) is not affected.

### OutputFiles
- `outputDir`: Directory for output files
- `routes`: Export route GeoJSON files
- `log`: Export processing log
- `stops`: Export stops data
- `readme`: Generate README with route summary
- `gtfs`: Export GTFS feed
- `trufiTPData`: Export Trufi trip planner data

## Troubleshooting

### Common Issues

**TypeScript compilation errors**: Make sure you have TypeScript 5.0+ installed:
```bash
npm install -D typescript@^5.0.0
```

**Module not found errors in examples**: Ensure you've built the main project first:
```bash
# From project root
npm run build
```

**OSM data download fails**: Check your internet connection and that Overpass API is accessible. You can also use PBF files as an alternative.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

ISC
