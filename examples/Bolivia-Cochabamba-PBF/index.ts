/**
 * Example: Bolivia - Cochabamba (PBF)
 *
 * This example demonstrates how to generate GTFS data for Cochabamba, Bolivia
 * using a local OSM PBF file instead of Overpass API.
 */

import { osmToGtfs, OSMPBFReader } from '../../dist/index';
import * as path from 'path';

async function main() {
  console.log('Starting GTFS generation for Cochabamba, Bolivia (from PBF)...');

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
      },
      geojsonOptions: {
        osmDataGetter: new OSMPBFReader(path.join(__dirname, 'cochabamba.osm.pbf')),
        transformTypes: ['bus', 'share_taxi', 'minibus'],
        skipRoute: (route) => {
          // Skip specific problematic routes
          return ![2084702].includes(route.id);
        },
      },
      gtfsOptions: {
        agencyTimezone: 'America/La_Paz',
        agencyUrl: 'https://www.cochabamba.bo/',
        defaultCalendar: () => 'Mo-Su 06:00-22:00',
        frequencyHeadway: () => 300, // 5 minutes
        vehicleSpeed: () => 40, // 40 km/h average speed in city
        skipStopsWithinDistance: 100, // 100 meters between stops
        fakeStops: (routeFeature) => {
          // Some routes need fake stops generated
          return [9083839, 14576927, 9074378, 14576926].includes(routeFeature.properties.id);
        },
        stopNameBuilder: (stops) => {
          if (!stops || stops.length === 0) {
            stops = ['Innominada'];
          }
          return stops.join(' y ');
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
