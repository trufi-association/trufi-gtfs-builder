# GTFS Builder (TypeScript)

## INTRODUCTION 

Trufi's General Transit Feed Specification (GTFS) tool allows you to create a map for your city. You can also send your route data to Google Maps, Open Trip Planner, OpenStreetMap, and other public atlases to keep navigation databases updated. 

This is the TypeScript version of the [trufi-gtfs-builder](https://github.com/trufi-association/trufi-gtfs-builder) project.

## Installation

```bash
npm install gtfs-builder
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

The `examples/` directory contains several detailed examples:

1. **Basic Usage** (`01-basic-usage.ts`) - Simple getting started example
2. **Advanced Configuration** (`02-advanced-configuration.ts`) - Custom settings and filters
3. **PBF File Usage** (`03-pbf-file-usage.ts`) - Using local PBF files
4. **Multiple Cities** (`04-multiple-cities.ts`) - Processing multiple areas
5. **Bolivia-Cochabamba** - Real-world complete example

Run examples:
```bash
cd examples
npm install
npm run example:basic
npm run example:advanced
```

See [examples/README.md](examples/README.md) for detailed documentation.

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
      vehicleSpeed: () => 50,
      fakeStops: () => false,
      skipStopsWithinDistance: 100,
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

## Building

To build the TypeScript project:

```bash
npm install
npm run build
```

This will compile the TypeScript files to JavaScript in the `dist` folder.

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
- `vehicleSpeed`: Function to calculate vehicle speed
- `fakeStops`: Function to determine if fake stops should be created
- `skipStopsWithinDistance`: Minimum distance between stops (meters)
- `stopNameBuilder`: Function to build stop names

### OutputFiles
- `outputDir`: Directory for output files
- `routes`: Export route GeoJSON files
- `log`: Export processing log
- `stops`: Export stops data
- `readme`: Generate README with route summary
- `gtfs`: Export GTFS feed
- `trufiTPData`: Export Trufi trip planner data

## License

ISC

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
