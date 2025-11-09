# Bolivia - Cochabamba Example

This example demonstrates how to generate GTFS data for the public transportation system in Cochabamba, Bolivia.

## Features

- Downloads route data from OpenStreetMap using Overpass API
- Generates standard GTFS feed
- Exports Trufi Trip Planner data format
- Includes custom stop naming in Spanish
- Handles routes with missing stops by generating fake stops

## Bounding Box

The example covers the metropolitan area of Cochabamba:
- North: -17.261759
- South: -17.709721
- East: -65.577835
- West: -66.440262

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
