/**
 * Example: Bolivia - Cochabamba
 *
 * This example demonstrates how to generate GTFS data for Cochabamba, Bolivia.
 * It supports two data sources:
 * - Overpass API: Downloads data from OpenStreetMap (requires internet)
 * - PBF file: Uses a local OSM PBF file (faster, works offline)
 */

import { osmToGtfs, OSMOverpassDownloader, OSMPBFReader } from '../../dist/index';
import * as path from 'path';
import * as fs from 'fs';

// Set to 'overpass' to download from Overpass API, or 'pbf' to use local PBF file
const DATA_SOURCE: 'overpass' | 'pbf' = 'overpass';

// PBF file path (only used when DATA_SOURCE is 'pbf')
const PBF_FILE = path.join(__dirname, 'cochabamba.osm.pbf');

// Bounding box for Overpass API (only used when DATA_SOURCE is 'overpass')
const BOUNDING_BOX = {
  south: -17.709721,
  west: -66.440262,
  north: -17.261759,
  east: -65.577835,
};

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
        vehicleSpeed: () => 40, // 40 km/h average speed in city
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
