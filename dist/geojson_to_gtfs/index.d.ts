import type { GeoJSONFeatureCollection, GTFSData, GTFSBuilders, GTFSOptions } from '../types';
import gtfsDefaultBuilders from './gtfsBuilders';
declare function geojsonToGtfs(features: {
    [key: string]: GeoJSONFeatureCollection;
}, inputStops: {
    [id: number]: string[];
}, gtfsConfig: GTFSOptions, gtfsBuilders: GTFSBuilders): GTFSData;
export default geojsonToGtfs;
export { gtfsDefaultBuilders };
//# sourceMappingURL=index.d.ts.map