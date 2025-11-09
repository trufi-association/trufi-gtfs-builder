/**
 * Example: Mexico - Jilotepec
 * 
 * This example demonstrates how to generate GTFS data for Jilotepec, Mexico.
 * It includes both GTFS feed and Trufi Trip Planner data export.
 */

import { osmToGtfs, OSMOverpassDownloader } from '../../dist/index';
import * as path from 'path';

async function main() {
  console.log('Starting GTFS generation for Jilotepec, Mexico...');

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
        osmDataGetter: new OSMOverpassDownloader({
          south: 19.849161,
          west: -99.703615,
          north: 20.171306,
          east: -99.436664,
        }),
        transformTypes: ['bus', 'share_taxi', 'minibus'],
        skipRoute: (route) => {
          // Skip specific problematic routes
          return ![14205514, 14273777, 14273762, 14273843, 14273821, 14273746, 14273735, 14250435, 14250451, 14249884, 14249871, 14246048, 14245979, 18623160, 14245947, 14245927, 14269629, 14269496, 14273878, 14273862, 14226411, 14226337, 14277168, 14174933, 14174952, 14180518, 16301409, 16301410, 7437136, 7437124, 7437115, 7437135, 7437130, 7437123, 7437114, 7426599, 7437127, 7437121, 7437112, 16949951, 13498098, 7935435, 443191, 14277168, 14205514, 14273777, 14273762, 14273843, 14273821, 14273746, 14273735, 8900984, 6767597, 6744656, 13505345, 11038036, 11038035, 11038033, 11038032, 11038031, 6767598, 6744658, 8480335, 5872326, 7437134, 7437128, 7437122, 7437113, 12280792, 7437176, 7437165, 7437152, 7437175, 7437164, 7437151, 7437133, 7437120, 7437111, 7426663, 7426597, 7426284, 7426283, 7426218, 7426279, 9182135, 11038034, 18624076].includes(route.id);
        },
      },
      gtfsOptions: {
        agencyTimezone: 'America/Mexico_City',
        agencyUrl: 'https://example.com/',
        defaultCalendar: () => 'Mo-Su 06:00-22:00',
        frequencyHeadway: () => 300, // 5 minutes
        vehicleSpeed: (routeFeature) => {
          const coords = routeFeature?.geometry?.coordinates;
          const durationMin = Number(routeFeature?.properties?.duration);

          let kmh = 24;

          if (Array.isArray(coords) && coords.length >= 2 && durationMin > 0) {
            const toRad = (deg: number) => deg * Math.PI / 180;
            const R = 6371;

            const haversineKm = (a: number[], b: number[]) => {
              const [lon1, lat1] = a;
              const [lon2, lat2] = b;
              const dLat = toRad(lat2 - lat1);
              const dLon = toRad(lon2 - lon1);
              const sLat = Math.sin(dLat / 2);
              const sLon = Math.sin(dLon / 2);
              const h = sLat * sLat + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * sLon * sLon;
              const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
              return R * c;
            };

            let totalKm = 0;
            for (let i = 1; i < coords.length; i++) {
              totalKm += haversineKm(coords[i - 1], coords[i]);
            }

            const hours = durationMin / 60;
            const computed = totalKm / hours;

            if (Number.isFinite(computed) && computed > 0) kmh = computed;
          }

          return kmh;
        },
        skipStopsWithinDistance: 100, // 100 meters between stops
        fakeStops: (routeFeature) => {
          return false; // No fake stops needed for this city
        },
        stopNameBuilder: (stops) => {
          if (!stops || stops.length === 0) {
            stops = ['Innominada'];
          }
          return stops.join(' y ');
        },
        defaultFares: { currencyType: 'MXN' },
        feed: {
          publisherUrl: 'https://example.com',
          publisherName: 'jilotepec',
          lang: 'es',
          version: new Date().toUTCString(),
          contactEmail: 'email@example.com',
          contactUrl: 'http://support.example.com',
          startDate: '20000101',
          endDate: '21000101',
          id: 'jilotepec',
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
