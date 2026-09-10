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
- Travel times: OSM `duration=*` on the relation when present and plausible (Mi Tren's three lines); otherwise 20 km/h for micros and trufis (bus / minibus / share_taxi), 32 km/h for Mi Tren, 40 km/h for the teleférico (its `duration=02:00` tag — two hours for 760 m — is rejected with a warning)

### Fares
- `charge=*` on the OSM relation wins (Mi Tren, the teleférico, Trufi 130, long-distance trufis)
- Lines without a tag: Bs 3 (official Cercado tariff), unless `isIntermunicipal()` matches
- `isIntermunicipal()` is a name-based rule, not a geographic one: it matches when `network` lists a municipality other than Cochabamba, when `ref` is 200-299 (the metropolitan trufi-bus series, all run by syndicates based outside the Cercado), or when the operator is named after another municipality. Those lines get no fare row — their price is unknown and `0` would mean "free"
- Because the rule never looks at the shape, lines of Cercado-based operators that do cross into Colcapirhua, Quillacollo or Sacaba (micros E/S/L, trufis 8/14/25/46/106/150/W, Cotapachi, micro Q) still get Bs 3, and refs 200/252, whose mapped shape stays inside the Cercado, get none

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
