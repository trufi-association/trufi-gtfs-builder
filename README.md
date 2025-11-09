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
