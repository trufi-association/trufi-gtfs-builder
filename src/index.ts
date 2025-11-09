import * as path from 'path';
import * as fs from 'fs';
import gtfsDefaultBuilders from './geojson_to_gtfs/gtfsBuilders';
import writeGtfs from './geojson_to_gtfs/writeGtfs';
import { osmToGeojson, OSMOverpassDownloader, OSMPBFReader } from './osm_to_geojson';
import geojsonToGtfs from './geojson_to_gtfs';
import geojsonToTrufiTPData from './geojson_to_trufi_tp_data';
import type { OsmToGtfsConfig, GeojsonOptions, GTFSOptions, OutputFiles, GTFSBuilders } from './types';

const defaultGeojsonOptions: GeojsonOptions = {
  osmDataGetter: null,
  transformTypes: ['bus', 'share_taxi', 'aerialway', 'train', 'subway', 'monorail', 'tram', 'trolleybus', 'ferry', 'light_rail'],
  skipRoute: () => true,
};

const defaultGtfsOptions: GTFSOptions = {
  agencyTimezone: 'America/La_Paz',
  agencyUrl: 'https://www.example.com/',
  defaultCalendar: () => 'Mo-Su 06:00-23:00',
  frequencyHeadway: () => 300,
  vehicleSpeed: () => 50,
  fakeStops: () => false,
  skipStopsWithinDistance: 100,
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
  trufiTPData: false,
};

async function osmToGtfsFunc(config: OsmToGtfsConfig): Promise<void> {
  const outputFiles: OutputFiles = Object.assign({}, defaultOutFiles, config.outputFiles || {});
  const geojsonOptions: GeojsonOptions = Object.assign({}, defaultGeojsonOptions, config.geojsonOptions || {});
  const gtfsOptions: GTFSOptions = Object.assign({}, defaultGtfsOptions, config.gtfsOptions || {});
  const gtfsBuilders: GTFSBuilders = Object.assign({}, gtfsDefaultBuilders, config.gtfsBuilders || {});
  const { outputDir } = outputFiles;

  if (outputDir && !fs.existsSync(path.dirname(outputDir))) {
    throw new Error('Output directory does not exist');
  }

  const geojson = await osmToGeojson(geojsonOptions);
  const gtfs = outputFiles.gtfs
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
    if (outputFiles.readme) fs.writeFileSync(path.join(outputDir, 'README.md'), geojson.readme || '');
    if (outputFiles.gtfs && gtfs) {
      fs.mkdirSync(path.join(outputDir, `gtfs`));
      writeGtfs(gtfs, path.join(outputDir, 'gtfs'));
    }
    if (outputFiles.trufiTPData && trufiTPData) {
      fs.mkdirSync(path.join(outputDir, `trufiTPData`));
      fs.writeFileSync(path.join(outputDir, 'trufiTPData', 'routes.json'), JSON.stringify(trufiTPData.routes));
      fs.writeFileSync(path.join(outputDir, 'trufiTPData', 'stops.json'), JSON.stringify(trufiTPData.stops));
      fs.writeFileSync(path.join(outputDir, 'trufiTPData', 'search.json'), JSON.stringify(geojson.stops));
    }
  }
}

export { osmToGtfsFunc as osmToGtfs, OSMOverpassDownloader, OSMPBFReader };
export default { osmToGtfs: osmToGtfsFunc, OSMOverpassDownloader, OSMPBFReader };
