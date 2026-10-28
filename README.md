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
      vehicleSpeed: () => 50, // km/h; set your city's own value(s), see Travel times
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
- `continuousStops`: `true`, or a function of the route feature, to write `continuous_pickup` / `continuous_drop_off` in `routes.txt` (see [Continuous stops](#continuous-stops))
- `stopsConfig`: Function returning how stops are derived for each route (`fakeStops`, `osmStops` or `customStops`)
- `stopNameBuilder`: Function to build stop names
- `defaultFares`: Default currency and price for fares (see [Fares](#fares))
- `fare`: Function to resolve the fare of each route (see [Fares](#fares))
- `faresV2`: `true` to also write the GTFS-Fares V2 files next to the V1 ones (see [Fares V2](#fares-v2))
- `attributions`: Extra rows of `attributions.txt`, after the OpenStreetMap one (see [Licensing of the output](#licensing-of-the-output))
- `license`: License written as a `LICENSE` file with the feed — `'ODbL-1.0'` (default) or `false` (see [Licensing of the output](#licensing-of-the-output))

### Continuous stops

`continuousStops: true`, or a function of the route feature, writes `continuous_pickup` / `continuous_drop_off` = 0 in `routes.txt`: the GTFS way to say that riders board and alight anywhere along the route, which `fakeStops` approximates with a stop every ~100 m (issue #11). Routes for which the function returns `false` get 1 ("only at stops"); when the option is absent or `false` the columns are not written at all, so existing feeds do not change. With routes grouped by agency + ref (the default) the function sees every relation of the group: one `true` marks the route, and a disagreement between variants is logged.

Declarative only. No consumer routes with these columns yet: OpenTripPlanner 2.x drops them from `routes.txt` (its route model has no such field; the `stop_times.txt` ones it reads only to flag an invalid Flex combination, and continuous-stops routing itself is an unmerged draft, [opentripplanner/OpenTripPlanner#3457](https://github.com/opentripplanner/OpenTripPlanner/pull/3457)), and trufi-core's offline planner boards at `stops.txt` only. Keep `fakeStops` for routing and add this for correctness and for consumers that read it.

### Fares

The builder writes GTFS-Fares V1 (`fare_attributes.txt` + `fare_rules.txt`), one fare per `route_id`. The price of a route is resolved in this order:

1. **OSM.** `charge=*` on the route relation, in the wiki syntax `<amount> <ISO 4217 code>[/<unit>]` — e.g. `charge=3 BOB/person` or `3.50 BOB`. With several `;`-separated values (`3 BOB/person;1 BOB/student`) the first one is the fare; the others are ignored by V1 and become rider categories in the [Fares V2](#fares-v2) output. Lenient variants are accepted too: `3,50 BOB`, `3BOB`, `BOB 3`, and a bare `3`, which takes `defaultFares.currencyType` (and is ignored, with a warning, when that is not set). The currency must be three upper-case letters — the ISO 4217 form; the code list itself is not checked — so currency signs, local abbreviations and lower-case codes (`$`, `Bs`, `bob`) are rejected with a warning. `fee=no` means the ride is free (price `0`); it also needs `defaultFares.currencyType`, since `currency_type` is required even for a free ride.
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

### Fares V2

`faresV2: true` also writes the [GTFS-Fares V2](https://gtfs.org/documentation/schedule/reference/#fare_attributestxt) files, derived from the same resolved fares (issue #12). The reference allows both versions in one dataset and recommends that consumers prefer V2; the V1 files stay byte for byte what they were (`test/fares_v2.test.ts` checks the whole feed against the output of the previous release), so a city can turn this on without changing anything for its current readers. Off by default: nothing in the Trufi stack reads V2 yet — see *Who reads it* below — so this is an output being enabled, not a switch.

```typescript
gtfsOptions: {
  defaultFares: { currencyType: 'BOB' },
  fare: (route, osmFare) => osmFare ?? { price: 3, currency: 'BOB' },
  faresV2: true,
}
```

What is written, and how the V1 data maps onto it:

| File | Rows | Reference |
|---|---|---|
| `fare_products.txt` | one product per distinct amount, currency and rider category: `BOB_3.00` for a general fare (`rider_category_id` empty = any rider), `BOB_1.00_estudiante` for a category. `amount` carries the currency's ISO 4217 decimals (`3.00`; `200` for JPY). `fare_product_name` is the amount text (`3.00 BOB`, `1.00 BOB (estudiante)`): OSM has no product names, and OpenTripPlanner requires one. No `fare_media_id` column: empty means the media is unknown. | [fare_products.txt](https://gtfs.org/documentation/schedule/reference/#fare_productstxt) |
| `rider_categories.txt` | only when some fare has rider categories: one row per category, `rider_category_name` as written in OSM, `is_default_fare_category` `0` — the general fare is the product without a category, so no product has several eligible categories to choose a default from. | [rider_categories.txt](https://gtfs.org/documentation/schedule/reference/#rider_categoriestxt) |
| `networks.txt` + `route_networks.txt` | one network per distinct fare (general product plus categories), `fare_0`, `fare_1`… in order of first appearance; every route with a known fare is assigned to one, whatever its agency, so routes with the same fare share the network. Allowed because `routes.txt` has no `network_id` column. | [networks.txt](https://gtfs.org/documentation/schedule/reference/#networkstxt), [route_networks.txt](https://gtfs.org/documentation/schedule/reference/#route_networkstxt) |
| `fare_leg_rules.txt` | one row per network and product: a leg on a route of the network is paid with the general product, or with the product of the rider's category. | [fare_leg_rules.txt](https://gtfs.org/documentation/schedule/reference/#fare_leg_rulestxt) |

Rider categories come from the further `;`-separated values of `charge=*` (the OSM wiki form is `<amount> <currency>[/<unit>]`): in `3.50 BOB/persona;2 BOB/preferencial;1 BOB/estudiante` the first value is the general fare and each further value with a `/<unit>` becomes a category — `rider_category_id` is the unit text as printable ASCII (`estudiante primaria` → `estudiante_primaria`), shared by every route that writes the same text; `rider_category_name` is the text as written, from the first route that uses it. OSM does not say what a unit means, so `interparadas` (a short-hop price on Mi Tren) becomes a "category" exactly like `estudiante` does; a `fare` resolver gets them in `osmFare.riderCategories` and can drop or rename them (`{ ...osmFare, riderCategories: osmFare.riderCategories?.filter(c => c.id !== 'interparadas') }`). A value without a unit, in another currency, or repeating a unit is skipped with a warning. Routes whose price nobody knows are in no network and match no leg rule — the V2 way of saying "fare unknown", like the missing V1 row.

Not written, because the data has nothing to put in them: `fare_media.txt` (V1's `payment_method` has no V2 field; an empty `fare_media_id` is the reference's "unknown"), `fare_transfer_rules.txt` (the builder knows no transfer pricing, so every leg is paid — what V1 `transfers` `0` says; `transfers` `1`, `2` or `null` and `payment_method` `1` are warned about and not translated), `timeframes.txt`, `areas.txt` and `stop_areas.txt` (no time- or zone-based prices). Checked with [gtfs-validator](https://gtfs-validator.mobilitydata.org/) 8.0.1 on the Cochabamba example: the feed with the Fares V2 files gets exactly the notices of the feed without them, none on the new files.

**Who reads it (October 2026).** Nobody in the Trufi stack yet:

- **trufi-core** reads neither V1 nor V2. The fares screen (`trufi_core_fares`) shows categories and prices that each app configures by hand; the offline planner (`trufi_core_planner`) reads `agency_fare_url` only, and the OpenTripPlanner client asks for no fare field.
- **OpenTripPlanner 2.x** reads V1 completely. V2 is experimental and opt-in — `"fares": "gtfs"` in `build-config.json` plus `"otpFeatures": { "FaresV2": true }` in `otp-config.json` ([Fares sandbox docs](https://docs.opentripplanner.org/en/latest/sandbox/Fares/)). Its GTFS import maps `fare_products` (with rider category and media), `fare_leg_rules`, `fare_transfer_rules` and `route_networks` (2.10.0: `application/src/main/java/org/opentripplanner/gtfs/mapping/Fare*Mapper.java`, `RouteNetworkAssignmentMapper.java`); support arrived in 2.2.0 (#4338), was extended in 2.4.0 (#4917, #5227) and tightened in 2.8.0 (#6586), per the [changelog](https://docs.opentripplanner.org/en/latest/Changelog/). The matching products are listed per leg in the GraphQL API; no Trufi app queries them.
- The **offline planner** of trufi-core computes no fares at all.

### Travel times

`stop_times.txt` carries estimates (`timepoint=0`); the builder has no timetable. The running time of each route is decided in this order:

1. **OSM.** `duration=*` on the route relation — "the running time of the bus route as stated in official documents" — in the wiki forms `hh:mm` (recommended), `hh:mm:ss`, plain minutes (`45`) or ISO 8601 (`PT45M`). The time is spread over the stops in proportion to the straight-line distance between them, so the last stop lands exactly on the tagged duration. A malformed value is ignored with a warning, and so is one that implies an implausible average speed for the mode — below 3 km/h, or above the gtfs-validator `fast_travel_between_consecutive_stops` threshold (150 km/h for buses, 100 for light rail, 50 for aerial lifts): Cochabamba's teleférico is tagged `duration=02:00` for a 760 m ride.
2. **`tripDuration` resolver** (optional). Called per route with the feature, the OSM duration in seconds (`undefined` when absent or malformed) and the route length in meters. Return the running time in seconds to use it, or `undefined` to fall back to the speed. Use it to plug in measured running times, or to accept or reject what OSM says per route. Anything other than a positive number or `undefined` throws, as a config bug.
3. **`vehicleSpeed`** (km/h, per route). Every segment between consecutive stops takes `distance / speed`, rounded up to whole seconds. **The speed is city configuration**: the library default, `() => 50`, is a placeholder that has never been calibrated against any city, so every config should set its own value — and, since a tram or a cable car does not move like a minibus, vary it by route type (the callback receives the route feature). As a starting point for a Latin American bus network, 20 km/h for buses, minibuses and shared taxis and ~32 km/h for light rail are defensible: Cochabamba's Dirección de Tráfico y Vialidad measured 10–11 km/h for buses in congestion and calls 25 km/h satisfactory (2017), and Mi Tren's own OSM `duration=*` implies ~30 km/h. Whatever the callback returns, an OSM `duration=*` on the relation (step 1) or a `tripDuration` answer (step 2) takes precedence when present:

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

### Licensing of the output

Every feed this tool builds is a derivative database of [OpenStreetMap](https://www.openstreetmap.org/copyright), whose data the OpenStreetMap Foundation licenses under the [Open Data Commons Open Database License (ODbL) v1.0](https://opendatacommons.org/licenses/odbl/1-0/). The ODbL asks two things of a derivative that is used publicly: credit OpenStreetMap, and release the derivative under the ODbL as well (share-alike). The builder writes both into the output, so the license chain travels with the feed instead of living in a repository README that the zip never sees:

- **`attributions.txt`** — the GTFS file for exactly this ([reference](https://gtfs.org/documentation/schedule/reference/#attributionstxt)). Always written, with one row for `OpenStreetMap contributors` (`attribution_id` `osm`, `is_producer` `1`, `attribution_url` `https://www.openstreetmap.org/copyright`) followed by the rows of `gtfsOptions.attributions`. It sits with the other `.txt` files, so it is in `<city>.gtfs.zip` and `<city>.expanded.gtfs.zip` too.
- **`LICENSE`** — the full ODbL 1.0 text, written next to the `.txt` files of every GTFS directory and therefore inside both zips. `gtfsOptions.license` selects it: `'ODbL-1.0'` (the default) or `false`.
- **`README.md`** (the generated one) — a *License* section with the chain above and a table of the attributions.

```ts
gtfsOptions: {
  // Rows of attributions.txt after the OpenStreetMap one: who publishes
  // the feed, who operates a line… Fields as in the GTFS reference.
  attributions: [
    {
      attribution_id: 'trufi',
      organization_name: 'Trufi Association',
      is_producer: 1,
      attribution_url: 'https://www.trufi-association.org/',
      attribution_email: 'info@trufi-association.org',
    },
    { organization_name: 'Mi Teleférico', is_operator: 1, route_id: 'teleferico' },
  ],
  // license: false,   // write no LICENSE file (see below)
}
```

Each row is checked against the reference before any OSM data is read, and a bad one throws, as a config bug: `organization_name` is required; at least one of `is_producer`, `is_operator`, `is_authority` must be `1`; at most one of `agency_id`, `route_id`, `trip_id` may be set (none = the whole feed); `attribution_id` must be unique, and `osm` is reserved. Whether a referenced `route_id` exists is not checked here — the [gtfs-validator](https://gtfs-validator.mobilitydata.org/) does that.

`license: false` does not change what the feed is: a publicly used derivative of OSM still has to be ODbL, and the OpenStreetMap row is still written because the attribution is required however the derivative is licensed. Use it only when the license is stated somewhere the feed's users will see it (a `LICENSE` at the root of the repository that publishes the zip, a page behind `feed_publisher_url`), and say so there.

When the feed is listed in a catalog, point the catalog's license field at the ODbL as well: the [Mobility Database](https://github.com/MobilityData/mobility-database-catalogs) entry has `urls.license`, a [Transitland](https://github.com/transitland/distributed-mobility-feed-registry) feed record has a `license` object (`spdx_identifier: "ODbL-1.0"`, `url`, `attribution_text`), and the OSM wiki's [List of GTFS feeds](https://wiki.openstreetmap.org/wiki/List_of_GTFS_feeds) has a license column. `feed_info.txt` has no license field: make `feed_publisher_url` lead to a page that states it (see issue #13 for how the Cochabamba feed was listed).

### OutputFiles
- `outputDir`: Directory for output files
- `routes`: Export route GeoJSON files
- `log`: Export processing log
- `stops`: Export stops data
- `readme`: Generate README with route summary (and the *License* section)
- `gtfs`: Export GTFS feed (`gtfs/` directory, with `attributions.txt` and `LICENSE`)
- `gtfsZip`: Also zip it as `<cityName>.gtfs.zip`
- `gtfsExpandedZip`: Also build the schedule-based variant (expanded trips, no `frequencies.txt`) as `<cityName>.expanded.gtfs.zip`
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

The code of this library is ISC. The feeds it produces are derivative databases of OpenStreetMap and are licensed under the ODbL 1.0 — see [Licensing of the output](#licensing-of-the-output).
