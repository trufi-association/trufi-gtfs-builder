import OSMOverpassDownloader from './osm_getter/overpass_downloader';
import OSMPBFReader from './osm_getter/pbf_reader';
import readmeGenerator from './readme_generator';
import convertGeoJSON from './OSM_dataTool';
import type { GeojsonOptions, GeojsonToGtfsResult, IOSMDataGetter, OSMRelation } from '../types';

async function osmToGeojson(options: GeojsonOptions): Promise<GeojsonToGtfsResult> {
  const { transformTypes, osmDataGetter, skipRoute } = options;

  if (options.osmDataGetter == null) {
    throw new Error('osmDataGetter missing');
  }

  const routes = await osmDataGetter.getRoutes(transformTypes);
  const ways = await osmDataGetter.getWays();
  const stops = await osmDataGetter.getStops();
  const data = convertGeoJSON({ routes, ways, stops, skipRoute });
  const readme = readmeGenerator(data);
  data['readme'] = readme;

  return data;
}

export { osmToGeojson, OSMOverpassDownloader, OSMPBFReader };
export default { osmToGeojson, OSMOverpassDownloader, OSMPBFReader };
