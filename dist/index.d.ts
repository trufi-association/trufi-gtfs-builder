import { OSMOverpassDownloader, OSMPBFReader } from './osm_to_geojson';
import type { OsmToGtfsConfig } from './types';
declare function osmToGtfsFunc(config: OsmToGtfsConfig): Promise<void>;
export { osmToGtfsFunc as osmToGtfs, OSMOverpassDownloader, OSMPBFReader };
declare const _default: {
    osmToGtfs: typeof osmToGtfsFunc;
    OSMOverpassDownloader: typeof OSMOverpassDownloader;
    OSMPBFReader: typeof OSMPBFReader;
};
export default _default;
//# sourceMappingURL=index.d.ts.map