import type { CustomStop } from '../types';
/**
 * Load custom stops from a GeoJSON file
 *
 * Expected format:
 * {
 *   "type": "FeatureCollection",
 *   "features": [
 *     {
 *       "type": "Feature",
 *       "properties": {
 *         "stop_id": "STOP001",
 *         "stop_name": "Station Name"
 *       },
 *       "geometry": {
 *         "type": "Point",
 *         "coordinates": [longitude, latitude]
 *       }
 *     }
 *   ]
 * }
 */
export declare function loadCustomStops(filePath: string): CustomStop[];
declare const _default: {
    loadCustomStops: typeof loadCustomStops;
};
export default _default;
//# sourceMappingURL=customStopsLoader.d.ts.map