/**
 * Peru - Trujillo
 * GTFS generation script
 * Filters routes with hash=* tag
 */

import { osmToGtfs, OSMPBFReader, loadCustomStops } from '../../src';
import type { CustomStop } from '../../src/types';
import * as path from 'path';
import * as fs from 'fs';

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

// Load custom stops from GeoJSON file
function loadStopsFromGeoJSON(filePath: string): CustomStop[] | null {
  if (!fs.existsSync(filePath)) {
    return null;
  }

  try {
    // Use the library's loader
    return loadCustomStops(filePath);
  } catch (error) {
    console.error(`Error loading custom stops: ${error}`);
    return null;
  }
}

async function main() {
  console.log('Starting GTFS generation for Trujillo, Peru...');

  const pbfPath = path.join(__dirname, 'trujillo.osm.pbf');
  const customStopsPath = path.join(__dirname, 'all_stops.geojson');

  console.log(`Using PBF file: ${pbfPath}`);
  console.log('Filtering routes with hash=* tag only');

  const ignoredRoutes = loadIgnoredRoutes();

  // Check if PBF file exists
  if (!fs.existsSync(pbfPath)) {
    throw new Error(`PBF file not found: ${pbfPath}`);
  }

  // Load custom stops (if file exists)
  const customStops = loadStopsFromGeoJSON(customStopsPath);
  if (customStops) {
    console.log(`Loaded ${customStops.length} custom stops from ${customStopsPath}`);
  } else {
    console.log('No custom stops file found, using auto-generated stops from OSM');
  }

  // Create a custom reader to log what's being loaded
  const reader = new OSMPBFReader(pbfPath);
  console.log('\nLoading data from PBF...');

  // Test loading to see what we have
  const testRoutes = await reader.getRoutes(['bus', 'share_taxi', 'minibus']);
  const testWays = await reader.getWays();
  const testStops = await reader.getStops();

  console.log(`Found in PBF: ${Object.keys(testRoutes).length} routes, ${Object.keys(testWays).length} ways, ${Object.keys(testStops).length} stops`);

  // Count routes with hash
  let routesWithHash = 0;
  for (const routeId in testRoutes) {
    const route = testRoutes[routeId];
    if (route.tags && route.tags.hash !== undefined) {
      routesWithHash++;
    }
  }
  console.log(`Routes with hash tag: ${routesWithHash}\n`);

  try {
    await osmToGtfs({
      outputFiles: {
        outputDir: path.join(__dirname, 'out'),
        gtfs: true,
        gtfsZip: true,
        readme: true,
        routes: true,
        stops: true,
        log: true,
      },
      geojsonOptions: {
        osmDataGetter: new OSMPBFReader(pbfPath),
        transformTypes: ['bus', 'share_taxi', 'minibus'],
        skipRoute: (route: any) => {
          // Skip routes in the ignored list
          if (ignoredRoutes.has(route.id)) {
            console.log(`Skipping ignored route: ${route.id} - ${route.tags?.name || 'unnamed'}`);
            return false; // Return false to skip this route
          }

          // skipRoute returns true to INCLUDE the route, false to SKIP it
          // We want to process routes WITH hash tag
          const hasHash = route.tags && route.tags.hash !== undefined;
          return hasHash; // Return true when hash exists to process the route
        },
      },
      gtfsOptions: {
        agencyTimezone: 'America/Lima',
        agencyUrl: 'https://www.trujillo.gob.pe/',
        cityName: 'trujillo',
        defaultCalendar: () => 'Mo-Su 05:00-23:00',
        frequencyHeadway: () => 300, // 5 minutes
        vehicleSpeed: () => 24,
        skipStopsWithinDistance: 100,
        fakeStops: () => false,
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
          id: 'trujillo-peru',
        },

        // Stops configuration - uses custom stops from GeoJSON
        stopsConfig: customStops
          ? {
            mode: 'customStops', // Use ONLY custom stops from GeoJSON
            stops: customStops,
            maxMatchDistance: 20, // Max distance from route point to custom stop (meters)
            minDistanceBetweenStops: 0, // Min distance between consecutive stops (meters)
            fallbackBehavior: 'warning',
            rightSideOnly: true
          }
          : { mode: 'fakeStops' }, // Default: generate stops from route nodes
      },
    });

    console.log('\n✅ GTFS generation completed successfully!');
    console.log(`📁 Output files are in: ${path.join(__dirname, 'out')}`);
  } catch (error) {
    console.error('❌ Error generating GTFS:', error);
    process.exit(1);
  }
}

// Run the script
main();
