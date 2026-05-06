/**
 * Peru - Trujillo
 * GTFS generation script
 * Filters routes with hash=* tag
 */

import { osmToGtfs, OSMOverpassDownloader } from '../../src';
import * as path from 'path';
import * as fs from 'fs';

// Trujillo metropolitan area bounding box
const BOUNDING_BOX = {
  south: -8.2240,
  west: -79.1233,
  north: -7.8528,
  east: -78.6850,
};

// Load ignored routes from file
function loadIgnoredRoutes(): Set<number> {
  const ignoredRoutesPath = path.join(__dirname, 'ignored_routes.txt');
  const ignoredRoutes = new Set<number>();

  if (fs.existsSync(ignoredRoutesPath)) {
    const content = fs.readFileSync(ignoredRoutesPath, 'utf-8');
    const lines = content.split('\n');

    for (const line of lines) {
      const trimmed = line.trim();
      // Skip empty lines and comments
      if (trimmed && !trimmed.startsWith('#')) {
        const routeId = parseInt(trimmed, 10);
        if (!isNaN(routeId)) {
          ignoredRoutes.add(routeId);
        }
      }
    }
    console.log(`Loaded ${ignoredRoutes.size} ignored routes from ${ignoredRoutesPath}`);
  }

  return ignoredRoutes;
}

async function main() {
  console.log('Starting GTFS generation for Trujillo, Peru...');
  console.log('Downloading data from Overpass API...');
  console.log('Filtering routes with hash=* tag only');

  const ignoredRoutes = loadIgnoredRoutes();
  const osmDataGetter = new OSMOverpassDownloader(BOUNDING_BOX);

  try {
    await osmToGtfs({
      outputFiles: {
        outputDir: path.join(__dirname, 'out'),
        gtfs: true,
        gtfsZip: true,
        gtfsExpandedZip: true,
        readme: true,
        routes: true,
        stops: true,
        log: true,
      },
      geojsonOptions: {
        osmDataGetter,
        transformTypes: ['bus', 'share_taxi', 'minibus'],
        skipRoute: (route: any) => {
          // Skip routes in the ignored list
          if (ignoredRoutes.has(route.id)) {
            console.log(`Skipping ignored route: ${route.id} - ${route.tags?.name || 'unnamed'}`);
            return false;
          }

          // skipRoute returns true to INCLUDE the route, false to SKIP it
          const hasHash = route.tags && route.tags.hash !== undefined;
          if (!hasHash) {
            console.log(`Skipping route without hash: ${route.id} - ref: ${route.tags?.ref || 'no-ref'} - name: ${route.tags?.name || 'unnamed'}`);
          }
          return hasHash;
        },
      },
      gtfsOptions: {
        agencyTimezone: 'America/Lima',
        agencyUrl: 'https://www.trujillo.gob.pe/',
        cityName: 'trujillo',
        defaultCalendar: () => 'Mo-Su 05:00-23:00',
        frequencyHeadway: () => 300, // 5 minutes
        vehicleSpeed: () => 24,
        stopNameBuilder: (stops: any) => {
          if (!stops || stops.length === 0) {
            stops = ['Sin nombre'];
          }
          return stops.join(' y ');
        },
        defaultFares: { currencyType: 'PEN' },
        feed: {
          publisherUrl: 'https://trufi-association.org',
          publisherName: 'Trufi Association',
          lang: 'es',
          version: new Date().toISOString().split('T')[0],
          contactEmail: 'contact@trufi-association.org',
          contactUrl: 'https://trufi-association.org',
          startDate: '20251222',
          endDate: '20261221',
          id: 'pe-trujillo',
        },

        // Stops configuration - use real OSM stop_position nodes only
        stopsConfig: () => ({ mode: 'osmStops', forceEndpointStops: true }),
      },
    });

    console.log('\nGTFS generation completed successfully!');
    console.log(`Output files are in: ${path.join(__dirname, 'out')}`);
  } catch (error) {
    console.error('Error generating GTFS:', error);
    process.exit(1);
  }
}

// Run the script
main();
