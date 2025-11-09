# Mexico - Jilotepec Example

This example demonstrates how to generate GTFS data for the public transportation system in Jilotepec, Mexico.

## Features

- Downloads route data from OpenStreetMap using Overpass API
- Generates standard GTFS feed
- Exports Trufi Trip Planner data format
- Includes custom stop naming in Spanish
- Dynamic vehicle speed calculation based on route duration

## Bounding Box

The example covers the metropolitan area of Jilotepec:
- North: 20.171306
- South: 19.849161
- East: -99.436664
- West: -99.703615

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
- Timezone: `America/Mexico_City`
- Service hours: Monday to Sunday, 6:00 AM - 10:00 PM
- Dynamic vehicle speed calculation or 24 km/h default

### Transport Types
- Bus
- Share taxi
- Minibus

### Output

The generated GTFS feed will be available in the `out/` directory, including:
- Standard GTFS files (routes.txt, stops.txt, trips.txt, etc.)
- Trufi Trip Planner data format
- README documentation
- GeoJSON route files

## Currency

Fares are specified in Mexican Pesos (MXN).
