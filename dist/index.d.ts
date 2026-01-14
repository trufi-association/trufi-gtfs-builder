import { OSMOverpassDownloader, OSMPBFReader } from './osm_to_geojson';
import { loadCustomStops } from './utils/customStopsLoader';
import { findNearestStop, stopIdToNumber } from './utils/spatialMatcher';
import type { OsmToGtfsConfig, CustomStop, CustomStopsConfig, StopsMode } from './types';
declare function osmToGtfsFunc(config: OsmToGtfsConfig): Promise<void>;
export { osmToGtfsFunc as osmToGtfs, OSMOverpassDownloader, OSMPBFReader, loadCustomStops, findNearestStop, stopIdToNumber };
export type { CustomStop, CustomStopsConfig, StopsMode };
declare const _default: {
    osmToGtfs: typeof osmToGtfsFunc;
    OSMOverpassDownloader: typeof OSMOverpassDownloader;
    OSMPBFReader: typeof OSMPBFReader;
    loadCustomStops: typeof loadCustomStops;
    findNearestStop: typeof findNearestStop;
    stopIdToNumber: typeof stopIdToNumber;
};
export default _default;
//# sourceMappingURL=index.d.ts.map