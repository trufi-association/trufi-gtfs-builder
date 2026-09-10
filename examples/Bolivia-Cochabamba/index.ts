/**
 * Example: Bolivia - Cochabamba
 *
 * This example demonstrates how to generate GTFS data for Cochabamba, Bolivia.
 * It supports two data sources:
 * - Overpass API: Downloads data from OpenStreetMap (requires internet)
 * - PBF file: Uses a local OSM PBF file (faster, works offline)
 */

import { osmToGtfs, OSMOverpassDownloader, OSMPBFReader } from '../../dist/index';
import type { RouteFare } from '../../dist/index';
import * as path from 'path';
import * as fs from 'fs';

// Set to 'overpass' to download from Overpass API, or 'pbf' to use local PBF file
const DATA_SOURCE: 'overpass' | 'pbf' = 'pbf';

// PBF file path (only used when DATA_SOURCE is 'pbf')
const PBF_FILE = path.join(__dirname, 'cochabamba.osm.pbf');

// Bounding box for Overpass API (only used when DATA_SOURCE is 'overpass')
const BOUNDING_BOX = {
  south: -17.709721,
  west: -66.440262,
  north: -17.261759,
  east: -65.577835,
};

// ── Fares ────────────────────────────────────────────────────────────────
// Official tariff of the Cercado (the Cochabamba municipality): Bs 3 general,
// issued by Movilidad Urbana — the same figure trufi-app shows on its fares
// screen. It only holds INSIDE the Cercado: the trufi-bus syndicates based in
// the neighbouring municipalities (Quillacollo, Sacaba, Vinto, Sipe Sipe,
// Tiquipaya, …) charge their own fares, which we don't know, so their lines
// get no fare row at all unless OSM carries `charge=*` on the relation (Mi
// Tren, the teleférico, Trufi 130 and the long-distance trufis already do).
// Never write 0 for "unknown": in GTFS a price of 0 means the ride is free.
//
// The exception rule (`isIntermunicipal` below) is NAME-BASED, not
// geographic: it reads the operator, the `network` tag and the `ref` series,
// never the shape. Lines of Cercado-based operators that do cross into
// Colcapirhua, Quillacollo or Sacaba (micros E/S/L, trufis 8/14/25/46/106/
// 150/W, Cotapachi, micro Q) therefore still get Bs 3, and refs 200/252,
// whose mapped shape stays inside the Cercado, get none.
const CERCADO_FARE: RouteFare = { price: 3, currency: 'BOB' };

// Municipalities of the metropolitan region other than Cochabamba itself.
const OTHER_MUNICIPALITIES = [
  'Sacaba', 'Quillacollo', 'Vinto', 'Sipe Sipe', 'Tiquipaya', 'Colcapirhua',
  'Itapaya', 'Punata', 'Santiváñez', 'Colomi',
];

/**
 * A line run by one of the intermunicipal syndicates, by any of three OSM
 * signals — all of them names, none of them geometry:
 *   1. `network=BO:C:<municipality>;…` lists a municipality other than
 *      Cochabamba (e.g. `BO:C:Cochabamba;BO:C:Sacaba`).
 *   2. `ref` 200-299 — the metropolitan trufi-bus series. Every 2xx ref in
 *      the data belongs to an operator based outside the Cercado (Urkupiña,
 *      1ro de mayo, 15 de agosto, El Paso, Santa Rosa de Lima, 3 de
 *      noviembre, Sacaba, Vinto, Sipe Sipe, Tiquipaya, Itapaya) or to an
 *      untagged variant of one of them (relation 20768907).
 *   3. The operator is named after another municipality
 *      ("Sindicato mixto de autotransporte Sacaba", "… trufibuses Vinto").
 */
function isIntermunicipal(tags: Record<string, any>): boolean {
  const network = String(tags.network || '');
  if (network.split(';').some((n) => n.startsWith('BO:C:') && n !== 'BO:C:Cochabamba')) {
    return true;
  }
  const refNumber = parseInt(String(tags.ref || ''), 10);
  if (refNumber >= 200 && refNumber <= 299) return true;
  const operator = String(tags.operator || '');
  return OTHER_MUNICIPALITIES.some((municipality) => operator.includes(municipality));
}

function getOsmDataGetter() {
  if (DATA_SOURCE === 'pbf') {
    if (!fs.existsSync(PBF_FILE)) {
      throw new Error(`PBF file not found: ${PBF_FILE}\nDownload it from https://download.geofabrik.de/ or switch to 'overpass' mode.`);
    }
    return new OSMPBFReader(PBF_FILE);
  }
  return new OSMOverpassDownloader(BOUNDING_BOX);
}

async function main() {
  console.log(`Starting GTFS generation for Cochabamba, Bolivia (${DATA_SOURCE})...`);

  try {
    await osmToGtfs({
      outputFiles: {
        outputDir: path.join(__dirname, 'out'),
        trufiTPData: true,
        gtfs: true,
        readme: true,
        routes: true,
        log: true,
        stops: true,
        gtfsZip: true,
      },
      geojsonOptions: {
        osmDataGetter: getOsmDataGetter(),
        transformTypes: ['bus', 'share_taxi', 'minibus','aerialway','light_rail'],
        skipRoute: (route) => {
          // Skip specific problematic routes
          return ![2084702,16533147, 17193322, 16648003,17193322].includes(route.id);
        },
      },
      gtfsOptions: {
        agencyTimezone: 'America/La_Paz',
        agencyUrl: 'https://www.cochabamba.bo/',
        cityName: 'cochabamba',
        defaultCalendar: () => 'Mo-Su 06:00-22:00',
        frequencyHeadway: () => 300, // 5 minutes
        // Travel times. `stop_times` are estimates (timepoint=0). Where the
        // OSM relation carries `duration=*` — Mi Tren's three lines do — the
        // builder spreads that running time over the stops; the speed below
        // applies to everything else:
        //  - bus / minibus / share_taxi (micros and trufis): 20 km/h. The
        //    municipal Dirección de Tráfico y Vialidad measured 10–11 km/h in
        //    congestion and calls 25 km/h "satisfactory" (Opinión, 2017-03-09);
        //    the former 40 km/h placeholder gave 17-minute estimates for rides
        //    that take an hour through La Cancha (#9).
        //  - light_rail (Mi Tren): 32 km/h, what its own `duration=00:51` for
        //    the 27 km Línea Verde implies — only used if a line lacks the tag.
        //  - aerialway (Teleférico): unchanged. Its OSM `duration=02:00` (two
        //    hours for 760 m) fails the plausibility check and is ignored.
        vehicleSpeed: (route) => {
          switch (route.properties.route) {
            case 'light_rail':
              return 32;
            case 'aerialway':
              return 40;
            default:
              return 20;
          }
        },
        // Cochabamba: most minibus lines have no physical stops mapped
        // in OSM, so they get `fakeStops` (a stop per shape node, then
        // segment-merge + gap-fill collapse them to `fakeStopsGapThreshold`
        // density). The handful of routes listed below DO have proper
        // stops mapped in OSM and should use them as-is.
        stopsConfig: (route) => {
          const ROUTES_WITH_OSM_STOPS = [
            11678428,
            19604339,
            9083839,
            14576927,
            9074378,
            14576926,
            6925236,
            6925237,
          ];
          if (ROUTES_WITH_OSM_STOPS.includes(route.properties.id)) {
            return { mode: 'osmStops', forceEndpointStops: true };
          }
          return { mode: 'fakeStops' };
        },
        fakeStopsGapThreshold: 100,
        // Currency assumed when a `charge=*` value has no ISO code. The
        // price itself comes from `fare` below (OSM first, then Bs 3 unless
        // the line belongs to an intermunicipal syndicate, then nothing).
        defaultFares: { currencyType: 'BOB' },
        fare: (route, osmFare) => {
          if (osmFare) return osmFare;
          if (isIntermunicipal(route.properties)) return undefined;
          return CERCADO_FARE;
        },
        stopNameBuilder: (stops) => {
          if (!stops || stops.length === 0) {
            stops = ['Innominada'];
          }
          return stops.join(' y ');
        },
        feed: {
          publisherName: 'Trufi Association',
          publisherUrl: 'https://www.trufi-association.org/',
          lang: 'es',
          version: '1.0',
          contactEmail: 'info@trufi-association.org',
          contactUrl: 'https://www.trufi-association.org/',
          startDate: '20240101',
          endDate: '20261231',
          id: 'cochabamba',
        },
      },
    });

    console.log('✅ GTFS generation completed successfully!');
    console.log(`📁 Output files are in: ${path.join(__dirname, 'out')}`);
  } catch (error) {
    console.error('❌ Error generating GTFS:', error);
    process.exit(1);
  }
}

// Run the example
main();
