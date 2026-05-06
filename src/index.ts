import * as path from 'path';
import * as fs from 'fs';
import archiver from 'archiver';
import gtfsDefaultBuilders from './geojson_to_gtfs/gtfsBuilders';
import writeGtfs from './geojson_to_gtfs/writeGtfs';
import { osmToGeojson, OSMOverpassDownloader, OSMPBFReader } from './osm_to_geojson';
import geojsonToGtfs from './geojson_to_gtfs';
import geojsonToTrufiTPData from './geojson_to_trufi_tp_data';
import { loadCustomStops } from './utils/customStopsLoader';
import { findNearestStop, stopIdToNumber } from './utils/spatialMatcher';
import type {
  OsmToGtfsConfig,
  GeojsonOptions,
  GTFSOptions,
  OutputFiles,
  GTFSBuilders,
  CustomStop,
  StopsConfig,
  StopsConfigResolver,
  FakeStopsConfig,
  OsmStopsConfig,
  CustomStopsModeConfig,
} from './types';

const defaultGeojsonOptions: GeojsonOptions = {
  osmDataGetter: null,
  transformTypes: ['bus', 'share_taxi', 'aerialway', 'train', 'subway', 'monorail', 'tram', 'trolleybus', 'ferry', 'light_rail'],
  skipRoute: () => true,
};

// `stopsConfig` is required on GTFSOptions — there's no sensible default
// because each city has different physical-stop coverage. We seed the
// `Object.assign` target with everything else; the caller MUST supply
// `stopsConfig`. The cast keeps the type system happy at the assign call.
const defaultGtfsOptions: Partial<GTFSOptions> = {
  agencyTimezone: 'America/La_Paz',
  agencyUrl: 'https://www.example.com/',
  defaultCalendar: () => 'Mo-Su 06:00-23:00',
  frequencyHeadway: () => 300,
  vehicleSpeed: () => 50,
  stopNameBuilder: (stops) => {
    if (!stops) {
      stops = ['unnamed'];
    }
    return stops.join(' and ');
  },
};

const defaultOutFiles: OutputFiles = {
  outputDir: null,
  routes: false,
  log: false,
  stops: false,
  readme: true,
  gtfs: false,
  gtfsZip: false,
  gtfsExpandedZip: false,
  trufiTPData: false,
};

async function osmToGtfsFunc(config: OsmToGtfsConfig): Promise<void> {
  const outputFiles: OutputFiles = Object.assign({}, defaultOutFiles, config.outputFiles || {});
  const geojsonOptions: GeojsonOptions = Object.assign({}, defaultGeojsonOptions, config.geojsonOptions || {});
  const gtfsOptions: GTFSOptions = Object.assign({}, defaultGtfsOptions, config.gtfsOptions || {}) as GTFSOptions;
  if (typeof gtfsOptions.stopsConfig !== 'function') {
    throw new Error(
      'gtfsOptions.stopsConfig is required. Provide a function `(routeFeature) => StopsConfig`. ' +
        'For uniform fakeStops, return `{ mode: "fakeStops" }` for every route.',
    );
  }
  const gtfsBuilders: GTFSBuilders = Object.assign({}, gtfsDefaultBuilders, config.gtfsBuilders || {});
  const { outputDir } = outputFiles;

  // Validation: gtfsZip requires gtfs to be true
  if (outputFiles.gtfsZip && !outputFiles.gtfs) {
    throw new Error('gtfsZip option requires gtfs option to be true');
  }

  if (outputDir && !fs.existsSync(path.dirname(outputDir))) {
    throw new Error('Output directory does not exist');
  }

  const geojson = await osmToGeojson(geojsonOptions);
  const needsGtfs = outputFiles.gtfs || outputFiles.gtfsZip || outputFiles.gtfsExpandedZip;
  const gtfs = needsGtfs
    ? await geojsonToGtfs(geojson.geojsonFeatures, geojson.stops, gtfsOptions, gtfsBuilders)
    : null;
  const trufiTPData = outputFiles.trufiTPData
    ? await geojsonToTrufiTPData(geojson.geojsonFeatures, geojson.stops)
    : null;

  if (outputDir) {
    if (fs.existsSync(path.join(outputDir))) {
      fs.rmSync(path.join(outputDir), { recursive: true, force: true });
    }
    fs.mkdirSync(path.join(outputDir));
    if (outputFiles.routes) {
      fs.mkdirSync(path.join(outputDir, `routes`));
      for (const key in geojson.geojsonFeatures) {
        const feature = geojson.geojsonFeatures[key];
        fs.writeFileSync(path.join(outputDir, `/routes/${key}.geojson`), JSON.stringify(feature));
      }
    }
    if (outputFiles.log) fs.writeFileSync(path.join(outputDir, 'log.json'), JSON.stringify(geojson.log));
    if (outputFiles.stops) fs.writeFileSync(path.join(outputDir, 'stops.json'), JSON.stringify(geojson.stops));
    if (outputFiles.readme) {
      let readme = geojson.readme || '';
      // Append forced endpoint stops report if any exist
      if (gtfs) {
        const forcedStopsRows: { routeRef: string; routeName: string; stopName: string; position: string; stopId: number }[] = [];
        for (const key in geojson.geojsonFeatures) {
          const fc = geojson.geojsonFeatures[key];
          const routeFeature = fc.features[0];
          if (routeFeature?.gtfs?.forcedEndpointStops && routeFeature.gtfs.forcedEndpointStops.length > 0) {
            const tags = routeFeature.properties;
            for (const fStop of routeFeature.gtfs.forcedEndpointStops) {
              forcedStopsRows.push({
                routeRef: tags.ref || '',
                routeName: tags.name || '',
                stopName: fStop.stop_name,
                position: fStop.position === 'first' ? 'Inicio' : 'Final',
                stopId: fStop.stop_id,
              });
            }
          }
        }
        if (forcedStopsRows.length > 0) {
          readme += `\n\n### Paradas de extremo generadas artificialmente (forceEndpointStops)\n`;
          readme += `**Total**: ${forcedStopsRows.length}\n\n`;
          readme += `| Ruta | Nombre de ruta | Parada | Posición | Node ID |\n`;
          readme += `| ---- | -------------- | ------ | -------- | ------- |\n`;
          for (const row of forcedStopsRows) {
            readme += `| ${row.routeRef} | ${row.routeName} | ${row.stopName} | ${row.position} | ${row.stopId} |\n`;
          }
        }
      }
      fs.writeFileSync(path.join(outputDir, 'README.md'), readme);
    }
    if (outputFiles.gtfs && gtfs) {
      fs.mkdirSync(path.join(outputDir, `gtfs`));
      writeGtfs(gtfs, path.join(outputDir, 'gtfs'));
    }
    if (outputFiles.gtfsZip && gtfs) {
      const gtfsDir = path.join(outputDir, 'gtfs');
      if (!fs.existsSync(gtfsDir)) {
        fs.mkdirSync(gtfsDir);
        writeGtfs(gtfs, gtfsDir);
      }
      
      const cityName = gtfsOptions.cityName || 'city';
      const zipFileName = `${cityName}.gtfs.zip`;
      
      await new Promise<void>((resolve, reject) => {
        const output = fs.createWriteStream(path.join(outputDir, zipFileName));
        const archive = archiver('zip', { zlib: { level: 9 } });
        
        output.on('close', () => {
          console.log(`GTFS ZIP created: ${zipFileName} (${archive.pointer()} total bytes)`);
          resolve();
        });
        
        archive.on('error', (err) => {
          reject(err);
        });
        
        archive.pipe(output);
        archive.directory(gtfsDir, false);
        archive.finalize();
      });
    }
    if (outputFiles.gtfsExpandedZip) {
      // Generate schedule-based GTFS (expanded trips, no frequencies.txt)
      const expandedGtfsOptions = { ...gtfsOptions, useFrequencies: false };
      const expandedGtfs = await geojsonToGtfs(geojson.geojsonFeatures, geojson.stops, expandedGtfsOptions, gtfsBuilders);

      const expandedDir = path.join(outputDir, '_gtfs-expanded');
      fs.mkdirSync(expandedDir);
      writeGtfs(expandedGtfs, expandedDir);

      const cityName = gtfsOptions.cityName || 'city';
      const zipFileName = `${cityName}.expanded.gtfs.zip`;

      await new Promise<void>((resolve, reject) => {
        const output = fs.createWriteStream(path.join(outputDir, zipFileName));
        const archive = archiver('zip', { zlib: { level: 9 } });

        output.on('close', () => {
          console.log(`GTFS Expanded ZIP created: ${zipFileName} (${archive.pointer()} total bytes)`);
          resolve();
        });

        archive.on('error', (err) => {
          reject(err);
        });

        archive.pipe(output);
        archive.directory(expandedDir, false);
        archive.finalize();
      });

      // Clean up temporary directory
      fs.rmSync(expandedDir, { recursive: true, force: true });
    }
    if (outputFiles.trufiTPData && trufiTPData) {
      fs.mkdirSync(path.join(outputDir, `trufiTPData`));
      fs.writeFileSync(path.join(outputDir, 'trufiTPData', 'routes.json'), JSON.stringify(trufiTPData.routes));
      fs.writeFileSync(path.join(outputDir, 'trufiTPData', 'stops.json'), JSON.stringify(trufiTPData.stops));
      fs.writeFileSync(path.join(outputDir, 'trufiTPData', 'search.json'), JSON.stringify(geojson.stops));
    }
  }
}

export {
  osmToGtfsFunc as osmToGtfs,
  OSMOverpassDownloader,
  OSMPBFReader,
  loadCustomStops,
  findNearestStop,
  stopIdToNumber,
};
export type {
  CustomStop,
  StopsConfig,
  StopsConfigResolver,
  FakeStopsConfig,
  OsmStopsConfig,
  CustomStopsModeConfig,
};
export default { osmToGtfs: osmToGtfsFunc, OSMOverpassDownloader, OSMPBFReader, loadCustomStops, findNearestStop, stopIdToNumber };
