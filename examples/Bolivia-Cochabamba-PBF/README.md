# Bolivia - Cochabamba Example (PBF)

This example demonstrates how to generate GTFS data for Cochabamba, Bolivia using a local OSM PBF file.

## Features

- Uses local PBF file instead of Overpass API (faster, works offline)
- Generates standard GTFS feed
- Exports Trufi Trip Planner data format
- Includes custom stop naming in Spanish
- Handles routes with missing stops by generating fake stops

## PBF File

The `cochabamba.osm.pbf` file should be placed in this directory. You can download it from:
- [Geofabrik](https://download.geofabrik.de/south-america/bolivia.html)
- [BBBike](https://extract.bbbike.org/)

## Usage

### TypeScript

```bash
npm install
npm start
```

### Compiled JavaScript

```bash
npm install
npm run build
npm run start:js
```

## Configuration

### Agency Settings
- Timezone: `America/La_Paz`
- Service hours: Monday to Sunday, 6:00 AM - 10:00 PM
- Average vehicle speed: 40 km/h

### Transport Types
- Bus
- Share taxi (micros)
- Minibus

### Output

The generated files will be in the `out/` directory:
- `gtfs/` - GTFS feed files (*.txt)
- `trufiTPData/` - Trufi Trip Planner data (JSON)
- `routes/` - Individual route GeoJSON files
- `README.md` - Summary of processed routes
- `log.json` - Processing log
- `stops.json` - Stop information

## Notes

- Route 2084702 is excluded due to data issues
- Routes 9083839, 14576927, 9074378, 14576926 use generated stops
- Stop names are joined with " y " (Spanish for "and")
