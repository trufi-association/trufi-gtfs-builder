import OSMOverpassDownloader from './osm_getter/overpass_downloader';
import OSMPBFReader from './osm_getter/pbf_reader';
import type { GeojsonOptions, GeojsonToGtfsResult } from '../types';
declare function osmToGeojson(options: GeojsonOptions): Promise<GeojsonToGtfsResult>;
export { osmToGeojson, OSMOverpassDownloader, OSMPBFReader };
declare const _default: {
    osmToGeojson: typeof osmToGeojson;
    OSMOverpassDownloader: typeof OSMOverpassDownloader;
    OSMPBFReader: typeof OSMPBFReader;
};
export default _default;
//# sourceMappingURL=index.d.ts.map