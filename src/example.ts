/**
 * Example usage of GTFS Builder
 * 
 * This example demonstrates how to use the GTFS Builder to convert
 * OpenStreetMap data to GTFS format.
 */

import { osmToGtfs, OSMOverpassDownloader } from './index';

async function main() {
  // Define the bounding box for the area you want to process
  // Example: La Paz, Bolivia
  const bounds = {
    north: -16.4897,
    south: -16.5348,
    east: -68.1193,
    west: -68.2007
  };

  // Create an OSM data getter using the Overpass API
  const osmDataGetter = new OSMOverpassDownloader(bounds);

  try {
    await osmToGtfs({
      // Configure GeoJSON options
      geojsonOptions: {
        osmDataGetter,
        transformTypes: ['bus', 'share_taxi', 'train', 'subway', 'tram'],
        skipRoute: (route) => {
          // Filter routes based on your criteria
          // Return true to include the route, false to skip it
          return true;
        }
      },
      
      // Configure GTFS options
      gtfsOptions: {
        agencyTimezone: 'America/La_Paz',
        agencyUrl: 'https://www.example.com/',
        defaultCalendar: () => 'Mo-Su 06:00-23:00',
        frequencyHeadway: () => 300, // 5 minutes in seconds
        vehicleSpeed: () => 50, // km/h
        fakeStops: () => false,
        skipStopsWithinDistance: 100, // meters
        stopNameBuilder: (stops) => {
          if (!stops || stops.length === 0) {
            return 'unnamed';
          }
          return stops.join(' and ');
        }
      },
      
      // Configure output files
      outputFiles: {
        outputDir: './output',
        routes: true,
        log: true,
        stops: true,
        readme: true,
        gtfs: true,
        trufiTPData: false
      }
    });

    console.log('GTFS generation complete! Check the ./output directory.');
  } catch (error) {
    console.error('Error generating GTFS:', error);
  }
}

// Run the example
main();
